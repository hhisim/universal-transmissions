# Batch 14ay — read-only production preflight

**No migration was applied, no database write was made, no `main` push, no deployment and no
alias change.** Every production statement below is a `SELECT`; the runner refuses anything that
is not one, before it is sent.

* **Target:** project ref `opixpkquyapeqdceyczs` (the database behind
  `universal-transmissions.com`), reached through the Supabase Management API
  `POST /v1/projects/{ref}/database/query`.
* **Server:** **PostgreSQL 17.6** (`server_version_num = 170006`), session role `postgres`.
* **Bytes executed:** `git show 5bc511e:scripts/batch14ax-preflight-production.sql`, blob
  `2749f08f5baea187d9abe76c3b53dfa1c387294c` — checked **before** the run against the hash in the
  release record. The worktree copy was not used.
* **Method:** every statement was extracted and sent **individually**
  (`scripts/batch14ay-preflight-production-run.py`), so each has its own HTTP status and its own
  result. psql's exit code for a multi-statement file reflects the whole file; a statement that
  fails while a later one succeeds is invisible that way.
* **Output safety:** every result cell is scanned for an email address or a UUID and would be
  redacted before it reached the report; **0 statements were redacted** because the preflight
  projects counts and catalog facts only. No member identifier was retrieved.

## 1. Statement-by-statement outcome

**20 statements, 20 returned rows, 0 failed.**

| # | What it asserts | Status | Rows |
|---|---|---|---|
| P01 | server version and session | `201` | 1 | — |
| P02 | the two tables exist; column count; authority column absent | `201` | 2 | — |
| P03 | row counts | `201` | 2 | — |
| P04 | index compatibility (the name/expression the migration will take) | `201` | 1 | — |
| P05 | canonical addresses and duplicates | `201` | 1 | — |
| P06 | existing functions in public (bundle surface) | `201` | 0 |  |
| P07 | existing triggers on the two tables | `201` | 0 |  |
| P08 | table privileges held, per role | `201` | 6 | — |
| P09 | PUBLIC grants and policy count | `201` | 2 | — |
| P10 | legacy exposure per table | `201` | 2 | — |
| P11 | cross-table address/authority contradictions | `201` | 1 | — |
| P12 | existing b14 statement triggers | `201` | 1 | — |
| P13 | the release's functions present? | `201` | 1 | — |
| P14 | EFFECTIVE table access, per role | `201` | 6 | — |
| P15 | EFFECTIVE column access, per role | `201` | 2 | — |
| P16 | PUBLIC ACLs (tables, columns, functions) | `201` | 4 | — |
| P17 | object ownership | `201` | 2 | — |
| P18 | RLS flags | `201` | 2 | — |
| P19 | the deployed policy set | `201` | 3 | — |
| P20 | version-dependent privilege self-test | `201` | 1 | — |

## 2. What the database actually says

| Fact | Observed |
|---|---|
| Server / privilege branch | PostgreSQL **17.6**; the 8-privilege (incl. `MAINTAIN`) branch is the live one, self-test `count_expected_met = true` |
| Tables | `ut_members` (9 columns) and `profiles` (14) exist; **authority column absent** on both |
| Rows | `ut_members` 2, `profiles` 19 |
| Index compatibility | **0** indexes matching the migration's name or expression → the name is free, nothing to collide with. The two tables carry only their primary-key indexes |
| Canonical addresses | **0** null, **0** empty, **0** non-canonical, **0** case-duplicate groups, **0** case-duplicate rows → the unique functional index can be built without refusing on existing data |
| Existing bundle objects | **0** functions, **0** triggers, **0** b14 statement triggers; none of the four release functions present → clean-install path |
| Batch 13 boundary | `anon` and `authenticated` hold **0** table privileges and **0** of 92 column checks on both tables; `service_role` holds 8 table privileges; **0** PUBLIC grants on tables, columns or the guarded functions |
| Ownership / RLS | both tables owned by `postgres`; RLS **enabled** on both (`relforcerowsecurity = false`) |
| Policies | 3 policies, all `PERMISSIVE`, `cmd = ALL`, `roles = {public}`, with `auth.role() = 'service_role'` in **both** `USING` and `WITH CHECK` |
| Legacy exposure | `ut_members`: 2 rows, 2 unattested, 1 checkout-style (customer only), 1 with no Stripe linkage. `profiles`: 19 rows, 19 unattested, 4 checkout-style, 14 with no linkage, 9 with an unrecognised plan |
| Cross-table | 2 addresses present in both tables; **0** attested contradictions (nothing is attested yet) |
| Unrelated functions with PUBLIC EXECUTE | **7** — all pre-existing application helpers (`increment_oracle_usage`, `increment_guest_usage`, `update_updated_at`, …), reported informationally, **not touched** by this release |

## 3. Comparison with the installation prerequisites — every mismatch named

### Matches

1. **Batch 13 access boundary holds.** Effective table access for `anon`/`authenticated` is zero,
   effective column access is zero, PUBLIC holds nothing, RLS is enabled on both tables. The
   bundle abstains from all grants and policies on the two tables, and the postflight re-asserts
   the boundary.
2. **Schema is compatible.** Both tables exist; the only column the bundle adds
   (`entitlement_authority_at`) is absent, as the pre-install state requires.
3. **Index compatibility.** The unique functional index's name and expression are free, and the
   predicate the migration requires is satisfiable: no nulls, no empties, no case-duplicates.
4. **Existing functions/triggers.** None of the bundle's objects exist: no name collision, and the
   install is a clean path rather than a repair.
5. **Ownership and version.** Both tables are owned by `postgres`; the server is 17.6, matching the
   branch the gate's privilege lists are written for.

### Mismatch 1 — the deployed policies are addressed `TO public` (gate corrected, production untouched)

All three deployed policies are `roles = {public}`. The postflight's condition as written
counted **any** policy whose role list includes `anon`, `authenticated` or `public` — so it read
those three as violations and the verdict would have returned **false on a database whose
boundary is correct**. The role list is not the gate: each of these policies constrains on
`auth.role() = 'service_role'` in both `USING` and `WITH CHECK`, and the effective-privilege
checks already prove `anon`/`authenticated` reach nothing.

Corrected in the package (not in production): the condition now counts a policy only when it is
addressed to those roles **and** does not constrain them out. Two new controls pin it — an open
`TO public USING (true)` policy must still be **rejected**, and a service-role policy addressed
`TO public` must read **green**. The withdrawn `allow_authenticated_read` shape is still caught.

### Mismatch 2 — 10 rows carry plan values outside the application's vocabulary (no action)

`profiles`: `full` 7 (active), `master` 1, `seeker` 1; `ut_members`: `master` 1. The application's
vocabulary is exactly `'guest' | 'free' | 'initiate'` and its normaliser is
`default: return 'guest'` — **byte-identical between the deployed `ac49ce06` and the candidate
`b4f8ce7`**, so these rows already rank 0 today and the release changes nothing for them. The
literals appear **nowhere** in `src/` at either commit, so the application never writes them; the
primitive's `PLAN_VOCABULARY` refusal therefore never fires on a legitimate write.

Named and left alone: they are ambiguous legacy data, not a release defect, and repairing them is
outside this step.

## 4. Vercel, Git and the candidate — reconfirmed read-only

| | |
|---|---|
| `universal-transmissions.com` → | `dpl_F54o7a73ehL1ouHwMXzqhZ8ZNgRa` |
| `www.universal-transmissions.com` → | `dpl_F54o7a73ehL1ouHwMXzqhZ8ZNgRa` (same deployment; `.net` pair identical) |
| State | `READY`, `target: production`, `aliasAssigned: true` |
| Source SHA | `ac49ce062d66a49b0e4202a5e15755b930667bc3` |
| Git baseline | repo `hhisim/universal-transmissions`, ref `main` |
| Newest production deployment | the same `dpl_F54o7a73…` (2026-10-10T23:13:52Z) — nothing newer is serving |
| Live probe | both `.com` aliases HTTP 200, identical `etag: "3bd84e80dacd12e3008b94bb08761f69"` |
| Branch | `omni/batch14-membership-write-contract`; `main` locally = `605aabe` (58 commits **behind** the deployed commit) |

The record's stale identifiers are corrected in `docs/BATCH14AX-RELEASE-PREPARATION.md`: the §1c
rows for the preflight and gate-negatives still carried the **pre-boundary** blob hashes, and §1b
now names this batch's candidate.

## 5. Limits

* Read-only **catalog** evidence, not an end-to-end authenticated test: no JWT was minted and
  PostgREST was not in the path.
* The preflight proves the prerequisites hold **now**; it does not reserve them against drift
  between this run and the application of the SQL.
* The gate correction is validated in isolated clusters (16.15 and 17), not against production —
  production is read-only for this step.
