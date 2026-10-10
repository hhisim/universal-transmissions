# Batch 13 — Membership database access repair

Migration: `supabase/migrations/20261010_membership_access_hardening.sql`
Baseline: `3d86846dfb474dbb664cc695d936f7c25b50a048`
Database: Supabase project `opixpkquyapeqdceyczs` (Universal Transmissions)
Status: **prepared and tested against an isolated local reproduction — not applied to production**

---

## 1. Access trace: who actually reads and writes these tables

Every access path in the application was traced by grepping the tree for the two table
names and for the supabase client factories, then classifying each hit as a browser
module or a server module and identifying its key.

| Caller | File | Operation | Columns | Client | Role |
|---|---|---|---|---|---|
| Billing session | `src/app/api/billing/session/route.ts` | SELECT | `profiles.plan,stripe_customer_id`; `ut_members.plan,subscription_status,current_period_end` | `supabaseAdmin` | service_role |
| Billing portal | `src/app/api/billing/portal/route.ts` | SELECT | `stripe_customer_id` from both | `supabaseAdmin` | service_role |
| Plan status | `src/app/api/billing/plan-status/route.ts` | SELECT | `plan` from both | `supabaseAdmin` | service_role |
| Ask Hakan | `src/app/api/member/message/route.ts` | SELECT | `plan` from both | `supabaseAdmin` | service_role |
| Member record | `src/app/api/member/route.ts` | SELECT, INSERT, UPDATE | `*`; `insert(email,oracle_access)`; `update(last_login)` | `supabaseAdmin` | service_role |
| Checkout | `src/app/api/billing/checkout/route.ts` | SELECT, UPSERT | `ut_members.stripe_customer_id`; upsert `email,stripe_customer_id,plan` in both | `supabaseAdmin` + explicit service client | service_role |
| Free activation | `src/app/api/billing/activate-free/route.ts` | UPSERT | `profiles(email,plan)` | `supabaseAdmin` | service_role |
| Stripe webhook | `src/app/api/stripe-webhook/route.ts` | SELECT, UPDATE, UPSERT | `ut_members.plan,subscription_status,stripe_subscription_id,current_period_end`; `profiles.plan,email,stripe_customer_id` | explicit service client (`UT_SUPABASE_SERVICE_ROLE_KEY`) | service_role |
| Integration | `src/app/api/integration/plan/route.ts` | SELECT | `ut_members.plan,subscription_status`; `profiles.plan` | `supabaseAdmin` | service_role |
| Oracle usage | `src/app/api/oracle/usage/route.ts`, `oracle-v2/usage/route.ts`, `experience/usage/route.ts` | SELECT | `profiles.plan` | `supabaseAdmin` | service_role |
| Member pages | `src/app/sanctum/member/codex-ii/{page,gallery,exclusive}/page.tsx` | SELECT | `profiles.plan,subscription_status`; `ut_members.plan` | `supabaseAdmin` (server components) | service_role |
| **Browser** | `src/lib/supabase-client.ts` (anon key) | **no table access** — used only for Supabase Auth (`getSession`, `onAuthStateChange`) | — | supabase-js anon | anon |

**Conclusion: every legitimate membership access is server-mediated.** There is no
`supabase.from(...)` call on the browser client anywhere in `src/`. The anon browser
client exists for authentication only.

Two further identity consumers were checked and are unaffected:

* **NextAuth** (`src/lib/auth.ts`) installs `SupabaseAdapter` from
  `@auth/supabase-adapter` with the service-role secret. It reads and writes the
  `next_auth` schema, not `public.profiles` / `public.ut_members`.
* **RPCs** `increment_oracle_usage` and `increment_guest_usage` are `SECURITY DEFINER`
  and touch `ut_oracle_usage` / `ut_guest_usage`. `pg_proc.prosrc` contains no
  reference to either membership table.

---

## 2. Access matrix: role → required operations → enforcement

| Role | Operations required on `profiles` | Operations required on `ut_members` | Enforcement after this migration |
|---|---|---|---|
| `service_role` | SELECT, INSERT, UPDATE, DELETE, UPSERT | SELECT, INSERT, UPDATE, DELETE, UPSERT | Table grants **retained** (all 7 privileges). Also `BYPASSRLS`, so the `srv_*` policies are documentation, not the control. |
| `postgres` (owner) | full | full | Ownership. Untouched. |
| `authenticated` | **none** | **none** | Privileges **revoked**; the `allow_authenticated_read` policy is **dropped**. |
| `anon` | **none** | **none** | Privileges **revoked**. |
| `PUBLIC` | none | none | No grant existed; `REVOKE ... FROM public` applied to make the invariant explicit. |

### Why privileges, not just RLS

`anon` and `authenticated` held **all** table privileges (`arwdDxtm`) on both tables.
Row level security is not the only control that matters here:

* **TRUNCATE is not subject to row level security.** A role holding the TRUNCATE
  privilege can empty the table regardless of any policy. Measured on the
  reproduction: as `anon`, `TRUNCATE public.ut_members` succeeded and the row count
  went 2 → 0. That was reachable with the public anon key alone.
* **REFERENCES and TRIGGER** are likewise grant-controlled, not policy-controlled.

So the defect had two independent halves, and fixing only the policy would have left
the destructive half open. Both are closed.

### The policies involved (deployed, verbatim)

```
profiles   srv_profiles               ALL    TO public  USING (auth.role() = 'service_role')
ut_members Service role full access   ALL    TO public  USING (auth.role() = 'service_role')
ut_members srv_ut_members             ALL    TO public  USING (auth.role() = 'service_role')
ut_members allow_authenticated_read   SELECT TO public  USING (auth.uid() IS NOT NULL)   <-- dropped
```

`ut_members.id` is `gen_random_uuid()` and is **not** `auth.uid()`; the table has no
`user_id` column at all. An ownership policy for it would therefore have to key on
`email`, whose trust assumptions are not sound: `email` has no unique constraint, and
a policy comparing it to a JWT claim would make entitlement depend on an unverified,
non-unique string. The server-mediated route is the correct enforcement point, so no
replacement policy is introduced.

---

## 3. Compatibility findings

Checked read-only against the deployed database before writing the migration.

| Dependency | Finding | Impact of this migration |
|---|---|---|
| **Realtime** | Neither table is a member of the `supabase_realtime` publication (`puballtables = false`). | None. Realtime subscribers would have broken had they existed; they do not. |
| **Foreign keys** | `conversations.user_id` → `profiles.user_id`, `ON DELETE CASCADE`. | **Verified unaffected** — see below. |
| **Views / matviews** | None depend on either table. | None. |
| **Functions** | No `public` function references either table. | None. |
| **Policies on other tables** | No policy elsewhere references these tables. | None. |
| **Other grantees** | Only `anon`, `authenticated`, `postgres`, `service_role`. No `PUBLIC` grant. | None. |
| **NextAuth adapter** | Uses the `next_auth` schema with the service role. | None. |
| **PostgREST** | `public` is exposed. Requests from the anon/authenticated roles to these two tables will now return a permission error instead of data. | Intended. No shipped caller makes such a request. |

### The `conversations` foreign key, explicitly

`public.conversations` belongs to a sibling application on the same project — the
Universal Transmissions app never touches it (no `.from("conversations")` in `src/`).
It holds a `FOR ALL` policy `auth.uid() = user_id` and broad grants of its own. Because
it references `profiles`, withdrawing privileges on `profiles` had to be proven safe
for it. Tested on the reproduction, both before and after the revoke:

* `authenticated` can still insert its **own** conversation row — PASS both states.
* `authenticated` still cannot insert a row for another user — PASS both states.
* The FK still rejects a non-existent profile — PASS both states.
* `service_role` can still insert — PASS both states.
* `ON DELETE CASCADE` from `profiles` still fires — PASS both states.

PostgreSQL performs referential-integrity checks without requiring the referencing
role to hold privileges on the referenced table, which is what these probes confirm.
`conversations` was **not modified** by this migration.

### Deferred, recorded separately

The broad grants are not a one-off mistake: the project's default privileges for
schema `public` grant all privileges on new tables to `anon` and `authenticated`
(`pg_default_acl`). Every newly created table inherits this. Changing default
privileges is a project-wide decision beyond this migration and is **not** done here.
The same pattern is visible on `conversations` and other tables.

---

## 4. Applying to production

The change is **SQL only**. A Vercel preview cannot prove database enforcement — there
is no application code change to deploy, and the migration's effect is entirely inside
PostgreSQL. Verification must be performed against the database itself.

### Steps

1. Confirm the baseline deployment is unchanged (`dpl_DYVBSEF14NUiv4tvkSEasuwst4nh` /
   `3d86846d`) — this change does not depend on it.
2. Record the pre-state for the record:
   ```sql
   select c.relname, coalesce(r.rolname,'PUBLIC') grantee, a.privilege_type
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   cross join lateral aclexplode(c.relacl) a
   left join pg_roles r on r.oid=a.grantee
   where n.nspname='public' and c.relname in ('profiles','ut_members') order by 1,2,3;
   ```
3. Apply `20261010_membership_access_hardening.sql` in a single transaction (the file
   is already wrapped in `BEGIN`/`COMMIT`).
4. Run the verification below.

### Verification (read-only, no member rows returned)

```sql
-- V1: anon and authenticated must hold nothing on either table  -> expect 0 rows
select r.rolname, t.tablename, p.priv
from (values ('anon'),('authenticated')) r(rolname)
cross join (values ('profiles'),('ut_members')) t(tablename)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),
                    ('REFERENCES'),('TRIGGER')) p(priv)
where has_table_privilege(r.rolname, 'public.'||t.tablename, p.priv);

-- V2: the unrestricted read policy must be gone                  -> expect 0 rows
select policyname from pg_policies
where schemaname='public' and tablename='ut_members'
  and policyname = 'allow_authenticated_read';

-- V3: service_role must still hold everything                    -> expect 14 rows
select r.rolname, t.tablename, p.priv
from (values ('service_role')) r(rolname)
cross join (values ('profiles'),('ut_members')) t(tablename)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),
                    ('REFERENCES'),('TRIGGER')) p(priv)
where has_table_privilege(r.rolname, 'public.'||t.tablename, p.priv);

-- V4: no PUBLIC grant                                             -> expect 0 rows
select t.tablename, p.priv
from (values ('profiles'),('ut_members')) t(tablename)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE')) p(priv)
where has_table_privilege('public', 'public.'||t.tablename, p.priv);
```

Then exercise the application read paths, which all use the service role and must be
unaffected: `/api/billing/session`, `/api/billing/plan-status`, `/api/member/message`,
`/account`, `/oracle/plans`, `/sanctum/member` and the three `codex-ii` pages. These
must behave exactly as before; no member-visible behaviour changes.

---

## 5. Reproducing the tests

```bash
scripts/batch13-membership-access-verify.sh
```

The script builds a throw-away PostgreSQL database, reproduces the deployed schema,
ACLs, policies and `auth.*` shims, then runs `scripts/batch13-membership-access-tests.py`
against it in three states: as deployed, after the migration, and after the reversal.
Synthetic rows only; destructive probes run in a transaction that is rolled back.

**Scope of the evidence: database-role simulation.** The probes `SET ROLE` to
`anon`/`authenticated`/`service_role` and supply `request.jwt.claim.*` so that
`auth.uid()`/`auth.role()` behave as under PostgREST. No Supabase JWT is minted and
PostgREST is not in the path. This is what establishes RLS semantics and effective
privileges. It is **not** a real authenticated end-to-end integration test, and the
authenticated success paths of the application routes remain mocked-boundary evidence
from Batches 11 and 12.

### Results

| State | Membership probes | Meaning |
|---|---|---|
| As deployed | FAIL — cross-member read and anonymous TRUNCATE reproduce | defect confirmed |
| After the migration | PASS, 0 failures | repaired |
| After the reversal | FAIL again on the same probes | the suite detects the regression |

Measured on the reproduction, as deployed:

* `authenticated` user A saw **2 rows** of `ut_members` — its own and user B's — and
  read both stored `stripe_customer_id` values.
* `anon` `TRUNCATE public.ut_members` **succeeded**, row count 2 → 0.

---

## 6. Recovery plan

The migration is a single transaction, so a failure mid-apply leaves the database
untouched.

**Do not treat the inverse as a safe rollback.** `scripts/batch13-membership-access-reversal.sql`
restores the previous grants and the `allow_authenticated_read` policy, and doing so
reintroduces **both** defects: cross-member disclosure of every row of `ut_members`
including billing identifiers, and anonymous TRUNCATE of both tables. Reverting to it
trades a closed hole for an open one and is only appropriate if prior behaviour is
deliberately chosen over the fix, e.g. to unblock a caller that unexpectedly depended
on direct access.

If a legitimate caller is discovered to need access after the migration, do **not**
re-apply the broad grants. Bring the caller behind the existing verified server
contract (`src/lib/verified-identity.ts` and the service-role routes) and leave the
grants withdrawn.

A schema-level recovery point exists regardless: Supabase automated backups and PITR
for project `opixpkquyapeqdceyczs` are unaffected by this change, since it alters
privileges and one policy — no rows, columns or indexes.
