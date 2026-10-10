# Batch 13 — Membership database access repair

Migration: `supabase/migrations/20261010_membership_access_hardening.sql`
Read-only production verification: `scripts/batch13-membership-access-verify-production.sql`
Isolated (destructive) fixture runner: `scripts/batch13-membership-access-verify.sh`
Per-statement verification driver: `scripts/batch13-membership-access-run-verify.py`
Column-path direct test: `scripts/batch13-membership-access-column-revoke-test.py`
Baseline: `3d86846dfb474dbb664cc695d936f7c25b50a048`
Database: Supabase project `opixpkquyapeqdceyczs` — **PostgreSQL 17.6** (read-only query)
Status: **prepared and tested on both PostgreSQL 16.15 and 17.11 — not applied to production**

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

**Every legitimate membership access is server-mediated.** No `supabase.from(...)` on the browser client anywhere in `src/`.

Unaffected identity consumers: the NextAuth `SupabaseAdapter` (`next_auth` schema, service-role secret), and the `SECURITY DEFINER` `increment_*_usage` RPCs.

UT production is confirmed on this project: `NEXT_PUBLIC_SUPABASE_URL` and `UT_SUPABASE_URL` in the Vercel production environment both resolve to `opixpkquyapeqdceyczs`.

---

## 2. Access matrix

| Role | Required on `profiles` | Required on `ut_members` | Enforcement after this migration |
|---|---|---|---|
| `service_role` | SELECT, INSERT, UPDATE, DELETE, UPSERT | same | Grants **retained** — all 8 privileges on both tables on PG17 (16 checks), covered by the post-condition. Also `BYPASSRLS`, so the `srv_*` policies are documentation. |
| `postgres` (owner) | full | full | Ownership. Untouched. |
| `authenticated` | **none** | **none** | Privileges **revoked**; `allow_authenticated_read` **dropped**. |
| `anon` | **none** | **none** | Privileges **revoked**. |
| `PUBLIC` | none | none | No grant existed; `REVOKE ... FROM public` makes the invariant explicit. |

---

## 3. Corrected threat assessment for the TRUNCATE privilege

Three separate claims.

**(a) Demonstrated database privilege.** In an isolated reproduction a session executing as `anon` ran `TRUNCATE public.ut_members`; the row count went 2 → 0. Same for `profiles` and `authenticated`. Measured fact: **RLS does not restrict TRUNCATE**, so the grant was the only control.

**(b) Proven HTTP/RPC reachability: none found.** The earlier phrase *"reachable with the public anon key alone"* **is withdrawn**. Checked: `anon`/`authenticated` have `rolcanlogin = false` (no SQL session; reachable only by `SET ROLE` from `authenticator`, i.e. PostgREST); PostgREST maps verbs to SELECT/INSERT/UPDATE/DELETE and exposes **no TRUNCATE**; and every function those roles may `EXECUTE` was enumerated — `increment_guest_usage`, `increment_oracle_usage`, `increment_view_count`, `update_post_reply_stats`, `freeze_hh_pinterest_pin_identity`, `set_hh_pinterest_pin_dedupe_key`, `update_updated_at`, `graphql_public.graphql` — **none contains `TRUNCATE` and none builds dynamic SQL**.

**(c) Latent exposure.** Any future function, connection path or leaked login credential turns the privilege into direct unpoliced destruction. Same for `REFERENCES`/`TRIGGER`. **Removed on least-privilege grounds; the migration's justification does not depend on exploitability.**

---

## 4. What the migration does

| Concern | Handling |
|---|---|
| Removes the unrestricted policy | `drop policy if exists "allow_authenticated_read"` on `ut_members`. |
| Revokes **table** privileges | `revoke all privileges ... from anon, authenticated, public`, plus a named list. `REVOKE ALL` covers `MAINTAIN` on PG 17+. |
| Revokes **column** privileges | A plpgsql block walking `pg_attribute.attacl`, using `REVOKE ALL PRIVILEGES (col) ON TABLE ... FROM ...`. |
| PUBLIC / inherited | `REVOKE ... FROM public`; role membership inspected and verified to add no path. |
| Preserves service-role access | Asserted in the post-conditions against the **complete** version-aware set: **16 privileges on PG17, 14 on PG16**. |
| No rows, ownership, columns, indexes, default privileges | Only `DROP POLICY` and `REVOKE`. No DML, no other DDL. |
| Atomic | `BEGIN`/`COMMIT`; any error or failed post-condition rolls back. |
| Bounded lock waits | `lock_timeout = '10s'`, `statement_timeout = '60s'`. |
| Catalog drift | Preconditions assert both tables exist with RLS enabled, and that `allow_authenticated_read`, if present, has exactly the expected predicate. |
| **PG17 array expression** | Privilege lists are extended with `array_append`, never `\|\|`. See §5. |

### Post-conditions (all must pass or nothing commits)

1. no `anon`/`authenticated` **table** privilege of any kind, across the version-aware list;
2. no `anon`/`authenticated` **column** privilege, checked with `has_any_column_privilege`, which also returns true for access held through a table-level grant;
3. raw `attacl` clean for both tables;
4. the `allow_authenticated_read` policy gone;
5. `service_role` holds the complete expected set on both tables — **16 on PG17, 14 on PG16**.

---

## 5. The PostgreSQL 17 array expression — reproduced and fixed

The previous revision extended the privilege list with:

```sql
privs := privs || 'MAINTAIN';
```

Reproduced in isolation on both servers:

```
ERROR:  malformed array literal: "MAINTAIN"
DETAIL:  Array value must start with "{" or dimension information.
```

PostgreSQL parses `text[] || unknown-literal` as `anyarray || anyarray` and tries to read the literal as an array. On PostgreSQL 17 this would have raised inside the post-condition block and **aborted the whole migration**. On PostgreSQL 16 the branch is skipped, so the fixture's passing result could never have exposed it — which is exactly why a 16-only test run proves nothing about the 17 path.

Fixed to:

```sql
privs := array_append(privs, 'MAINTAIN');
```

now measured working on 17.11 (`asserting 16 table privileges on PostgreSQL 17.11`), and skipped by design on 16.15 (`asserting 14 …`).

---

## 6. Column-level revocation — measured, not assumed

PostgreSQL's documentation states that a table-level revocation also removes the corresponding column privileges. That was verified rather than taken on trust, and it changed the design.

**Measurement 1 — table-level REVOKE does remove column grants.** With four independent column grants seeded on `profiles.email` for `anon` (SELECT, INSERT, UPDATE, REFERENCES) and one on `profiles.plan` for `authenticated`, running `REVOKE ALL ON TABLE` left nothing behind: `has_column_privilege` returned no rows and `attacl` was empty.

**Measurement 2 — the dynamic block therefore never fires.** The migration revokes table privileges *before* the column block. Seeding 8 column grants and then running the migration reports **`column-level revocations performed: 0`** on both 16 and 17, with all 8 gone afterwards. The block is unreachable in practice. It is retained as defence in depth, but it must not be relied on — so **its generated statement is tested directly** (`batch13-membership-access-column-revoke-test.py`, 9 assertions, all passing on PG17).

**Measurement 3 — the previous statement's column list binds to `REFERENCES` only.** The block previously generated:

```sql
REVOKE SELECT, INSERT, UPDATE, REFERENCES (email) ON TABLE ... FROM ...;
```

The grammar attaches a column list to the single privilege it follows, so SELECT/INSERT/UPDATE are revoked **at table level**, which cascades to their grants on **every** column. Two consequences, both measured:

* it removes *more* than it reads as removing — a `SELECT` grant on a different column (`plan`) did **not** survive it (C7);
* it was correct in the migration only by that cascade, not by its own column list.

Isolated grammar check (C9): `REVOKE REFERENCES (email)` leaves a `SELECT` grant on another column untouched — the column list does not reach a privilege it is not attached to.

The corrected form is column-precise (C4, C5) and does not depend on cascade behaviour. This is a legibility and precision fix, not a fix for a security hole: the previous form did not leave a privilege behind for the privileges it named.

---

## 7. Compatibility

### This project

No Realtime membership; no dependent views/matviews/functions/policies; only the four known grantees; no PUBLIC grant.

### The sibling application

The account holds **two separate Supabase projects**: UT = `opixpkquyapeqdceyczs` (ap-northeast-1) and **arcana-vault / Vault of Arcana = `mqixjzolgrdzbwzkrzxz`** (eu-west-1). `conversations` is VOA-shaped (exact column match with `arcana-vault`'s `Conversation` type), but the current `arcana-vault` source no longer points here — 82 references and its `.env` resolve to its own project, and its repo never references the UT ref.

Its `profiles`/`ut_members` consumers (`lib/account.ts`, the four `app/api/billing/*` routes, `app/api/auth/callback`) all run through `getAdminSupabase()` — **service role**. Its browser client reaches `conversations` and forum tables, not membership tables.

Within this project, `conversations` holds **11 rows, last written 2026-05-11**; `messages` 27 rows from the same date; `forum_posts` empty; `agora_threads` 5 rows from 2026-04-05 — a **dormant remnant**, not an actively written set. The UT app never touches them.

The single coupling is the foreign key from `conversations.user_id` to `profiles.user_id`.

### Foreign-key evidence

Tested in both states (before and after the revoke), 5/5 passing each: `authenticated` can still insert its own conversation row; still cannot insert one for another user; the FK still rejects a non-existent profile; `service_role` still inserts; `ON DELETE CASCADE` still fires. PostgreSQL performs referential-integrity checks without requiring the referencing role to hold privileges on the referenced table.

### Remaining uncertainty

The deployed `arcana-vault` Vercel environment variables are returned **encrypted**, so the live `NEXT_PUBLIC_SUPABASE_URL` for that project was not read. Repo and local `.env` both say its own project, but a stale deployment configured against the UT project cannot be entirely excluded. Even then it would touch `conversations`, not `profiles`/`ut_members`, and only through the FK. **No project-wide compatibility claim is made from this repository alone.**

---

## 8. Verification — two procedures, deliberately separate

### 8a. Isolated fixture (destructive, throw-away database)

```bash
# PostgreSQL 16 (system cluster)
scripts/batch13-membership-access-verify.sh

# isolated PostgreSQL 17
B13_PGHOST=/var/tmp/pg17sock B13_PGPORT=55433 scripts/batch13-membership-access-verify.sh
```

Builds a temporary database reproducing the deployed schema, ACLs and policies, then runs: the probe suite as-deployed / after-migration / after-reversal, the FK compatibility suite, the per-statement verification driver, and the column-path direct test. Synthetic rows only; destructive probes rolled back. **Never point this at production.**

### 8b. Production (read-only, catalog only)

```bash
psql "$PROD_URL" -f scripts/batch13-membership-access-verify-production.sql
```

Pure SQL: **no `CREATE`, no `DROP`, no temporary object, no psql meta-command**. Every statement is a single SELECT against `pg_catalog`/`pg_policies` and the `has_*_privilege()` functions, so the file runs through any SQL interface including the Supabase management query endpoint. Each query carries its own privilege-list CTE; there is no shared temporary object.

It covers all eight table privileges — `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` — adding `MAINTAIN` only when `server_version_num >= 170000`, and includes an inheritance-aware column check via `has_any_column_privilege`.

**Every statement is executed individually with its own exit status** (`batch13-membership-access-run-verify.py`), because psql's exit code for a multi-statement file reflects only the file as a whole, and a success marker is not a substitute for each statement running.

---

## 9. Results

### On PostgreSQL 17.11 (isolated instance)

| Check | Result |
|---|---|
| Defective baseline detected | **19 PASS / 8 FAIL** — cross-member read, billing identifiers, TRUNCATE for both roles |
| Corrected migration | applies, `asserting 16 table privileges on PostgreSQL 17.11`, all post-conditions satisfied |
| MAINTAIN | revoked from `anon` and `authenticated`; **retained for `service_role`** on both tables |
| Seeded column grants (8) | all removed; `has_any_column_privilege` leftovers: none |
| Post-migration probes | **27 PASS / 0 FAIL** |
| Production verification statements | **12 executed, 12 succeeded, 0 failed** |
| Column-path direct test | **9 PASS / 0 FAIL** |
| Reapplication | exit 0 (idempotent) |
| Reversal | **19 PASS / 8 FAIL** — the suite detects the restored defects |
| FK compatibility | **5 PASS / 0 FAIL**, before and after |

### On PostgreSQL 16.15 (system cluster)

Same suite, same results for every check that exists on 16. `MAINTAIN` is not defined before 17, so the fixture **did not test it** and no claim is made that it did; the post-condition asserts 14 privileges there, 16 on 17. The `array_append` fix removes the version-dependent failure that previously existed on the 17 path only.

### Scope of the evidence

**Database-role simulation.** The probes `SET ROLE` to `anon`/`authenticated`/`service_role` and supply `request.jwt.claim.*` so `auth.uid()`/`auth.role()` behave as under PostgREST. No Supabase JWT is minted and PostgREST is not in the path. It establishes RLS semantics and effective privileges; it is **not** real authenticated end-to-end integration.

---

## 10. Applying to production

SQL only. A Vercel preview cannot prove database enforcement — there is no application code change, and the effect lives entirely inside PostgreSQL.

1. Confirm the baseline deployment is unchanged (`dpl_DYVBSEF14NUiv4tvkSEasuwst4nh` / `3d86846d`).
2. Run §8b once and keep the output as the pre-state.
3. Apply the migration — already `BEGIN`/`COMMIT`, rolling back entirely on any failed precondition or post-condition.
4. Run §8b again and compare against §8b's expectations.
5. Exercise the service-role paths: `/api/billing/session`, `/api/billing/plan-status`, `/api/member/message`, `/account`, `/oracle/plans`, `/sanctum/member`, the three `codex-ii` pages.

Expected after applying: V1, V2, V2b, V3, V5, V6 return no rows; V4 returns 16 rows on PG17; V4b shows only `postgres` and `service_role` non-zero; V7 shows `anon`/`authenticated` with `rolcanlogin = false`.

---

## 11. Recovery plan

The migration is one transaction; a failure mid-apply leaves the database untouched.

**The inverse is not a safe rollback.** `batch13-membership-access-reversal.sql` restores the previous grants and the read policy, reintroducing **both** defects: cross-member disclosure of every `ut_members` row including stored billing identifiers, and the TRUNCATE privilege on both tables. It exists to prove the suite detects the regression, and as the literal inverse if prior behaviour is deliberately chosen.

If a legitimate caller needs direct access, do **not** re-apply the broad grants — bring the caller behind the verified server contract (`src/lib/verified-identity.ts` and the service-role routes).

Supabase backups and PITR for `opixpkquyapeqdceyczs` are unaffected: privileges and one policy change; no rows, columns or indexes.

---

## 12. Deferred, recorded separately

* **Email uniqueness** — no unique index on `email` in either table, so the `onConflict: "email"` upserts in checkout and activate-free fail.
* **Project-wide default privileges** — schema `public` grants all privileges on new tables to `anon` and `authenticated`, so every new table starts with this pattern.
* **Sibling project `mqixjzolgrdzbwzkrzxz`** — same broad-grant pattern; its ownership policies make its browser reads legitimate, so hardening it is separate work.
* **Dormant VOA-era tables** here (`conversations`, `messages`, `agora_*`, `forum_*`) — unmaintained since May 2026; drop or archive is a product decision.
* **Stale `.vercel/.env.production.local`** in the UT working directory naming the sibling project.
* Webhook price mapping.
