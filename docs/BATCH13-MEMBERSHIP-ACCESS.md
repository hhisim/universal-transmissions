# Batch 13 — Membership database access repair

Migration: `supabase/migrations/20261010_membership_access_hardening.sql`
Read-only production verification: `scripts/batch13-membership-access-verify-production.sql`
Isolated (destructive) fixture runner: `scripts/batch13-membership-access-verify.sh`
Baseline: `3d86846dfb474dbb664cc695d936f7c25b50a048`
Database: Supabase project `opixpkquyapeqdceyczs` — **PostgreSQL 17.6** (confirmed by read-only query)
Status: **prepared and tested against an isolated reproduction — not applied to production**

---

## 1. Access trace: who actually reads and writes these tables

| Caller | File | Operation | Columns | Client | Role |
|---|---|---|---|---|---|
| Billing session | `src/app/api/billing/session/route.ts` | SELECT | `profiles.plan,stripe_customer_id`; `ut_members.plan,subscription_status,current_period_end` | `supabaseAdmin` | service_role |
| Billing portal | `src/app/api/billing/portal/route.ts` | SELECT | `stripe_customer_id` from both | `supabaseAdmin` | service_role |
| Plan status | `src/app/api/billing/plan-status/route.ts` | SELECT | `plan` from both | `supabaseAdmin` | service_role |
| Ask Hakan | `src/app/api/member/message/route.ts` | SELECT | `plan` from both | `supabaseAdmin` | service_role |
| Member record | `src/app/api/member/route.ts` | SELECT, INSERT, UPDATE | `*`; `insert(email,oracle_access)`; `update(last_login)` | `supabaseAdmin` | service_role |
| Checkout | `src/app/api/billing/checkout/route.ts` | SELECT, UPSERT | `ut_members.stripe_customer_id`; upsert `email,stripe_customer_id,plan` in both | `supabaseAdmin` + explicit service client | service_role |
| Free activation | `src/app/api/billing/activate-free/route.ts` | UPSERT | `profiles(email,plan)` | `supabaseAdmin` | service_role |
| Stripe webhook | `src/app/api/stripe-webhook/route.ts` | SELECT, UPDATE, UPSERT | `ut_members.plan,subscription_status,stripe_subscription_id,current_period_end`; `profiles.plan,email,stripe_customer_id` | explicit service client | service_role |
| Integration | `src/app/api/integration/plan/route.ts` | SELECT | `ut_members.plan,subscription_status`; `profiles.plan` | `supabaseAdmin` | service_role |
| Oracle usage | `api/oracle/usage`, `api/oracle-v2/usage`, `api/experience/usage` | SELECT | `profiles.plan` | `supabaseAdmin` | service_role |
| Member pages | `src/app/sanctum/member/codex-ii/{page,gallery,exclusive}/page.tsx` | SELECT | `profiles.plan,subscription_status`; `ut_members.plan` | `supabaseAdmin` (server components) | service_role |
| **Browser** | `src/lib/supabase-client.ts` (anon key) | **no table access** — Supabase Auth only | — | supabase-js anon | anon |

**Every legitimate membership access is server-mediated.** There is no `supabase.from(...)` on the browser client anywhere in `src/`.

Unaffected identity consumers: the NextAuth `SupabaseAdapter` (`next_auth` schema, service-role secret), and the `SECURITY DEFINER` `increment_*_usage` RPCs (`ut_oracle_usage` / `ut_guest_usage`; `pg_proc.prosrc` contains no reference to either membership table).

UT production was confirmed to point at this project: `NEXT_PUBLIC_SUPABASE_URL` and `UT_SUPABASE_URL` in the Vercel production environment both resolve to `opixpkquyapeqdceyczs`. (A stale `.vercel/.env.production.local` inside the UT working directory names the *sibling* project; it is a leftover local artifact, not the deployed configuration. Worth cleaning up separately.)

---

## 2. Access matrix: role → required operations → enforcement

| Role | Required on `profiles` | Required on `ut_members` | Enforcement after this migration |
|---|---|---|---|
| `service_role` | SELECT, INSERT, UPDATE, DELETE, UPSERT | same | Table grants **retained** (all privileges). Also `BYPASSRLS`, so the `srv_*` policies are documentation rather than the control. |
| `postgres` (owner) | full | full | Ownership. Untouched. |
| `authenticated` | **none** | **none** | Privileges **revoked**; the `allow_authenticated_read` policy is **dropped**. |
| `anon` | **none** | **none** | Privileges **revoked**. |
| `PUBLIC` | none | none | No grant existed; `REVOKE ... FROM public` applied to make the invariant explicit. |

---

## 3. Corrected threat assessment for the TRUNCATE privilege

These are three different claims and they must not be merged.

**(a) Demonstrated database privilege.** In an isolated database reproduction, a session executing as `anon` successfully ran `TRUNCATE public.ut_members` and the row count went 2 → 0. The same held for `profiles` and for `authenticated`. This is a measured fact about grants: **RLS does not apply to TRUNCATE**, so the privilege is the only control. `anon` and `authenticated` held `arwdDxtm` — every privilege.

**(b) Proven HTTP/RPC reachability: none found.** The earlier phrasing "reachable with the public anon key alone" **is withdrawn** — it was an inference, not a demonstrated path. What was checked:

* `anon` and `authenticated` have `rolcanlogin = false`. They cannot open a SQL session; they are only reachable by `SET ROLE` from `authenticator`, i.e. through PostgREST.
* PostgREST maps HTTP verbs to SELECT / INSERT / UPDATE / DELETE. It exposes **no TRUNCATE operation**, so the anon key cannot reach TRUNCATE through the REST API.
* Every function `anon` or `authenticated` may `EXECUTE` was enumerated: `increment_guest_usage`, `increment_oracle_usage`, `increment_view_count`, `update_post_reply_stats`, `freeze_hh_pinterest_pin_identity`, `set_hh_pinterest_pin_dedupe_key`, `update_updated_at`, plus `graphql_public.graphql`. **None contains `TRUNCATE`, and none builds dynamic SQL** (`EXECUTE format(...)` etc.), so no RPC reaches a utility statement. `pg_graphql` exposes select/insert/update/delete only.

**(c) Potential exposure if an execution path is introduced later.** The privilege is a latent capability. Any future function that executes a utility statement, any additional connection path, or any leaked credential for a login-capable role would turn it into direct, unpoliced data destruction. The same reasoning applies to `REFERENCES` and `TRIGGER` — grant-controlled, not policy-controlled, and unnecessary here.

**Conclusion.** The privilege is real and unnecessary and is removed on least-privilege grounds. It was **not** shown to be reachable over HTTP, and the migration's justification does not depend on it being so.

---

## 4. What the migration does, and why each part is there

| Concern | Handling |
|---|---|
| Removes the unrestricted policy | `drop policy if exists "allow_authenticated_read"` on `ut_members`. |
| Revokes **table** privileges | `revoke all privileges ... from anon, authenticated, public`, plus an explicit named list. `REVOKE ALL` covers `MAINTAIN` where it exists (PG 17+). |
| Revokes **column** privileges | A plpgsql block walks `pg_attribute.attacl` and revokes any column-level grant to `anon`/`authenticated`/`PUBLIC`. PostgreSQL does **not** remove column grants with a table-level REVOKE, so this is handled explicitly rather than assumed. None exist today. |
| PUBLIC / inherited | `REVOKE ... FROM public`; role membership is inspected and verified to add no path. |
| Preserves service-role access | `service_role` grants untouched, and asserted in the post-conditions as an 8-privilege set across both tables. |
| No rows, ownership, columns, indexes, default privileges | The migration contains only `DROP POLICY` and `REVOKE`. No DML, no DDL beyond the policy. |
| Atomic | Wrapped in `BEGIN`/`COMMIT`; any error or failed post-condition rolls the whole thing back. |
| Bounded lock waits | `SET LOCAL lock_timeout = '10s'`, `statement_timeout = '60s'`. `DROP POLICY`/`REVOKE` take ACCESS EXCLUSIVE locks, so a contended run aborts cleanly instead of queueing behind production traffic. |
| Catalog drift | Preconditions assert both tables exist as tables with RLS enabled, and that if `allow_authenticated_read` is present it has exactly the expected predicate. A differently-defined policy of the same name aborts the migration rather than removing something unexpected. |

---

## 5. Compatibility

### This project (Universal Transmissions)

| Dependency | Finding | Impact |
|---|---|---|
| Realtime | Neither table is in `supabase_realtime` (`puballtables = false`). | None. |
| Foreign keys | `conversations.user_id` → `profiles.user_id`, `ON DELETE CASCADE`. | **Verified unaffected** — see §6. |
| Views / matviews | None depend on either table. | None. |
| Functions | No `public` function references either table. | None. |
| Policies on other tables | None reference these tables. | None. |
| Other grantees | Only `anon`, `authenticated`, `postgres`, `service_role`. No `PUBLIC` grant. | None. |
| Column ACLs | None anywhere in `public`. | None. |
| PostgREST | Requests from anon/authenticated to these two tables will return a permission error instead of data. | Intended; no shipped caller makes such a request. |

### The sibling application — corrected

The previous report said `conversations` "belongs to a sibling application on the same project". That was directionally right but imprecise. What the evidence actually shows:

* The account holds **two separate Supabase projects**: `universal-transmissions` = `opixpkquyapeqdceyczs` (ap-northeast-1) and `arcana-vault` = `mqixjzolgrdzbwzkrzxz` (eu-west-1).
* **Vault of Arcana (`arcana-vault`, repo `hhisim/arcana-vault`) is the sibling whose schema `conversations` matches** — its `Conversation` type is an exact column-for-column match with the table in the UT project.
* **But the current `arcana-vault` source no longer points at the UT project.** 82 references in its source, and its `.env`, resolve to `mqixjzolgrdzbwzkrzxz`; the repository never references the UT project ref. Its own project contains its own `conversations`, `messages`, `profiles` and `ut_members`.
* Within the UT project, `conversations` holds **11 rows, last written 2026-05-11** (~5 months before this review); `messages` holds 27 rows from the same date; `forum_posts` is empty; `agora_threads` holds 5 rows from 2026-04-05. So the VOA-shaped tables in the UT project are best described as a **dormant remnant of an earlier shared-project arrangement**, not an actively written set.
* The UT application never touches them (no `.from("conversations")` anywhere in `src/`), and no local ops script was found that references them.

**Which revocations could affect a consumer of those tables.** The migration touches `profiles` and `ut_members` only. `conversations` keeps its own policy and grants untouched. The single coupling is the foreign key from `conversations.user_id` to `profiles.user_id`.

Traced consumers of the sibling project's *own* `profiles` (i.e. the same code paths, in its own database): `lib/account.ts` (SELECT/UPDATE by `user_id`), `app/api/billing/{activate-free,checkout,activate-trial,webhook}`, `app/api/auth/callback` — **all via `getAdminSupabase()`, the service role**. Its browser client reaches `conversations` and forum tables directly, not `profiles`/`ut_members`.

Note also that the sibling project is configured differently: its `profiles` carries genuine ownership policies — `Users can view own profile` and `Users can update own profile`, both `auth.uid() = user_id` — and its `ut_members` carries only a service-role policy with no unrestricted read. That pattern is the correct one, and it is what the UT project's `ut_members` was missing.

### Remaining uncertainty — stated plainly

1. The deployed `arcana-vault` Vercel environment variables are returned **encrypted** (`decrypt=false`), so the live value of `NEXT_PUBLIC_SUPABASE_URL` for that project was **not read**. The repository and its local `.env` both say `mqixjzolgrdzbwzkrzxz`, and the repo never references the UT project, but I cannot fully exclude a stale *deployment* still configured against the UT project.
2. If such a deployment existed, its browser code issues `SELECT`/`UPDATE` on `conversations` as `authenticated` — **which this migration does not touch**. The only exposure would be through the FK, which is verified unaffected.
3. I make **no claim of project-wide compatibility**. The statement supported by evidence is narrower: no consumer of `profiles` or `ut_members` in the UT project requires direct anon/authenticated access, and the one cross-table dependency in the shared project (the `conversations` FK) survives the change.
4. Separately noted, **not touched**: the sibling project `mqixjzolgrdzbwzkrzxz` carries the same broad-grant pattern (its `profiles` and `ut_members` grant to `anon` and `authenticated`). Its ownership policies on `profiles` mean the browser reads there are legitimately intended, so any hardening there is a different piece of work.

---

## 6. Foreign-key compatibility evidence

Tested on the isolated reproduction in both states (before and after the revoke), 5/5 passing each time:

* `authenticated` can still insert its **own** conversation row.
* `authenticated` still cannot insert a row for another user (ownership policy holds).
* The FK still rejects a non-existent profile.
* `service_role` can still insert.
* `ON DELETE CASCADE` from `profiles` still fires.

PostgreSQL performs referential-integrity checks without requiring the referencing role to hold privileges on the referenced table, which is what these probes establish. `conversations` is not modified by this migration.

---

## 7. Verification — two separate procedures

**Do not mix them.** The fixture runner deliberately destroys data inside a rolled-back transaction; it must never be pointed at production.

### 7a. Isolated fixture (destructive probes, throw-away database)

```bash
scripts/batch13-membership-access-verify.sh
```

Builds a temporary PostgreSQL database reproducing the deployed schema, ACLs, policies and `auth.*` shims, then runs `scripts/batch13-membership-access-tests.py` in three states plus the FK compatibility suite. Synthetic rows only; every destructive probe is rolled back. This is the procedure that demonstrates the defect and proves the migration closes it.

### 7b. Production (read-only, catalog only)

```bash
psql "$PROD_URL" -f scripts/batch13-membership-access-verify-production.sql
```

Only SELECTs against `pg_catalog`, `pg_policies` and the `has_*_privilege()` functions. It reads no member rows, changes nothing, and takes no lock that blocks writers. It is version-aware, covering all eight table privileges — `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` — adding `MAINTAIN` only when `server_version_num >= 170000`.

Expectations: V1, V2, V3 and V5 return no rows; V4 shows `service_role` holding everything (16 rows on PG 17, 14 on PG 16); V4b lists only `postgres` and `service_role`; V6/V7 show no inheritance or login path for `anon`/`authenticated`. Any other result means the migration did not take effect as intended.

### Version note

The isolated fixture runs on **PostgreSQL 16.15** (the newest available to this environment); production is **PostgreSQL 17.6**. `MAINTAIN` does not exist before 17, so **the fixture could not test it, and no claim is made that it did**. The fixture's privilege inventory covers the seven privileges that exist on 16. `MAINTAIN` is revoked on production by `REVOKE ALL` (which covers every applicable privilege) and is asserted there by the read-only verification, which includes it on 17.

### Results (isolated fixture, PostgreSQL 16.15)

| State | Membership probes | Meaning |
|---|---|---|
| As deployed | FAIL — cross-member read reproduces; TRUNCATE succeeds for `anon` and `authenticated` on both tables | defect confirmed |
| After the migration | PASS, 0 failures | repaired |
| After the reversal | FAIL again on the same probes | the suite detects the regression |

Measured as deployed: authenticated user A saw 2 rows of `ut_members` (its own and user B's) and read both stored `stripe_customer_id` values; `anon` `TRUNCATE public.ut_members` succeeded, row count 2 → 0.

**Scope of the evidence: database-role simulation.** The probes `SET ROLE` to `anon`/`authenticated`/`service_role` and supply `request.jwt.claim.*` so `auth.uid()`/`auth.role()` behave as under PostgREST. No Supabase JWT is minted and PostgREST is not in the path. It establishes RLS semantics and effective privileges; it is **not** a real authenticated end-to-end integration test.

---

## 8. Applying to production

This is **SQL only**. A Vercel preview cannot prove database enforcement: there is no application code change to deploy, and the migration's effect lives entirely inside PostgreSQL.

1. Confirm the baseline deployment is unchanged (`dpl_DYVBSEF14NUiv4tvkSEasuwst4nh` / `3d86846d`). This change does not depend on it.
2. Record the pre-state by running §7b once and keeping the output.
3. Apply `20261010_membership_access_hardening.sql` — it is already wrapped in `BEGIN`/`COMMIT` and will roll back entirely on any failed precondition or post-condition.
4. Run §7b again and compare.
5. Exercise the service-role paths, which must be unaffected: `/api/billing/session`, `/api/billing/plan-status`, `/api/member/message`, `/account`, `/oracle/plans`, `/sanctum/member`, and the three `codex-ii` pages.

---

## 9. Recovery plan

The migration is a single transaction, so a failure mid-apply leaves the database untouched.

**The inverse is not a safe rollback.** `scripts/batch13-membership-access-reversal.sql` restores the previous grants and the read policy, and thereby reintroduces **both** defects: cross-member disclosure of every `ut_members` row including stored billing identifiers, and the TRUNCATE privilege on both tables. It exists to prove the test suite detects the regression, and as the literal inverse if prior behaviour is deliberately chosen over the fix.

If a legitimate caller turns out to need direct access, do **not** re-apply the broad grants. Bring the caller behind the existing verified server contract (`src/lib/verified-identity.ts` and the service-role routes) and leave the grants withdrawn.

Supabase automated backups and PITR for `opixpkquyapeqdceyczs` are unaffected: this change alters privileges and one policy, no rows, columns or indexes.

---

## 10. Deferred, recorded separately

* **Email uniqueness** — no unique index on `email` in either table, so the `onConflict: "email"` upserts in checkout and activate-free fail. Needs its own change; deliberately not touched here.
* **Project-wide default privileges** — schema `public` grants all privileges on new tables to `anon` and `authenticated`, so every newly created table starts with this pattern. Visible on `conversations` and others. A project-wide decision, not part of this migration.
* **Sibling project `mqixjzolgrdzbwzkrzxz`** — same broad-grant pattern on its `profiles`/`ut_members`; its ownership policies make the browser reads legitimate, so hardening it is separate work.
* **Dormant VOA-era tables in this project** (`conversations`, `messages`, `agora_*`, `forum_*`) — unmaintained since May 2026; whether to drop or archive them is a product decision.
* **Stale `.vercel/.env.production.local`** in the UT working directory naming the sibling project — a local artifact that could mislead a local build; worth deleting.
* Webhook price mapping.
