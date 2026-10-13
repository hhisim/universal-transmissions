# Batch 14ay — rollout decision

**Decision: APPLY the SQL now, with the application release held back to a separate window.**
Nothing in this document has been executed: it is the decision the read-only preflight supports,
with the evidence behind it and the consequences if it is reversed.

*Prepared after the candidate. It changes no SQL, no harness and no application file.*

**The two candidates, kept separate:**

| | candidate | what it is |
|---|---|---|
| SQL / gate / smoke | **`44c5a0f62ddae613fd10e13e0312ea612da5c398`** | the reviewed migration, harnesses, smoke script and records this document authorises applying |
| Application | **`b4f8ce7149f625f3183507ffc9743e75528e742d`** | the separately approved application release, deployed only after the SQL is verified |

`41a892c522d5d87b9363bdf39b67f53885ad8819` is **retired**: it predates the policy-shape gate and
the enforced read-only preflight, so it neither installs nor verifies what this decision describes.
Applying the SQL from the retired commit while verifying with the current one is the specific
mismatch this separation exists to prevent.

## 1. Basis — what the read-only preflight found

`docs/BATCH14AY-PRODUCTION-PREFLIGHT.md` — 20 SELECT-only statements, run individually against
`opixpkquyapeqdceyczs` (PostgreSQL **17.6**), 20 returned, 0 failed, 0 redacted, from the
committed bytes (blob `2749f08f…`). Supplementary catalog probes (S1–S5) are in the same record.

| Prerequisite | State |
|---|---|
| Batch 13 access boundary | **holds** — `anon`/`authenticated` 0 table privileges, 0 of 92 column checks, 0 PUBLIC grants; RLS enabled on both tables |
| Schema | both tables present; `entitlement_authority_at` absent, as the pre-install state requires |
| Index compatibility | the unique functional index's name and expression are **free**; the tables carry only their PK indexes |
| Canonical addresses / duplicates | 0 null, 0 empty, 0 non-canonical, 0 case-duplicate rows → the index builds without refusing existing data |
| Existing bundle objects | **none** — 0 functions, 0 triggers, none of the four release functions: a clean install, not a repair |
| Legacy exposure | `ut_members` 2 rows / `profiles` 19, **all unattested** (the column does not exist yet); 2 addresses in both tables; 0 contradictions |
| Ownership / version | both tables owned by `postgres`; server 17.6, matching the privilege branch the gate is written for |

**Two mismatches, neither of which blocks the rollout:**

1. **The deployed policies are addressed `TO public`** with `auth.role() = 'service_role'` in both
   `USING` and `WITH CHECK`. This **disproved a gate condition**, not the database: the postflight
   counted any policy whose role list named `anon`/`authenticated`/`public` and would have returned
   **false on a correct production boundary**. Corrected in the package, with controls pinning both
   directions (an open `TO public USING (true)` policy is still rejected; the production shape
   reads green). **Production was not changed.**
2. **10 rows carry plan values outside the application's vocabulary** (`full` 7, `master` 2,
   `seeker` 1). They already rank 0: the normaliser is `default: return 'guest'` and is
   **byte-identical between the deployed `ac49ce06` and the candidate `b4f8ce7`**, and the literals
   appear nowhere in `src/` at either commit — so the application never writes them and the
   primitive's vocabulary refusal never fires on a legitimate write. **No action**; they are
   ambiguous legacy rows, not a release defect.

## 2. Exact SQL sequence

Apply in this order, as `postgres`, one transaction per file, `-v ON_ERROR_STOP=1`:

| # | Step | sha256 |
|---|---|---|
| 1 | `20261010_membership_write_contract.sql` | `73cf618ea4f4f3a9a346439dd6dca5456749e2b08815f4e79be5e81cff340d11` |
| 2 | `20261012_apply_lifecycle_update.sql` (**reviewed, unmodified**) | `b352afa09b7c6184cc2345d734f86e4ee1f3e08bc3146e9dc5836a513e371a4b` |
| 3 | `20261013_lifecycle_linkage_sync.sql` | `dc4b0e9ae70ee3ae434f236fc960ccff9dd25966e688b411c55ce6dc8ebd405b` |
| 4 | `20261014_lifecycle_sync_wrapper.sql` | `2472d27240ac0676bc794efbe5cc5a3242dd6003a6c85eedcc9366a171f60dfa` |
| 5 | `20261015_lifecycle_per_entry_skip.sql` (superseded by 6) | `c92e41e78385366402d1bca9d07b4d1ed2030d217b3a76de4c8581a391c9c382` |
| 6 | `20261016_entitlement_authority.sql` | `e87041b08042c297f8f8f410febb02cf1d5883180c3715cf2b747a322f22fbbf` |
| 7 | **policy step:** `select public.b14ac_install_trigger('exclusive');` | — |
| 8 | `20261017_function_surface_boundary.sql` | `ac39a47d8c33f9b20b9d58dbb21dad1dcbdf1149e6f1902ae029d8b46c1c9294` |

Step 7 must precede step 8: the boundary drops seven prototype functions, and the exclusive
statement trigger is what covers direct writers. Step 8 ends by asserting the whole surface and
**aborting** if it is not exactly as intended, so a half-installed surface cannot commit.

## 3. Verification steps

1. **Before:** `scripts/batch14ax-preflight-production.sql` — already executed read-only; re-run it
   if the window is delayed, because it proves the state *now* and does not reserve it.

   **Operator procedure — the runner does not certify provenance.** Extract the committed bytes
   yourself and verify them, then hand the file to the runner:

   ```bash
   git show 44c5a0f62ddae613fd10e13e0312ea612da5c398:scripts/batch14ax-preflight-production.sql > /tmp/preflight.sql
   git hash-object /tmp/preflight.sql   # must equal 2749f08f5baea187d9abe76c3b53dfa1c387294c
   SUPABASE_ACCESS_TOKEN=... python3 scripts/batch14ay-preflight-production-run.py \
       --ref <project-ref> --sql /tmp/preflight.sql --json /tmp/preflight-report.json
   ```

   The runner **opens the path it is given** (`--sql`); it does not resolve a commit, shell out to
   `git`, or check a hash. Provenance is this procedure, not the tool. Two further properties the
   runner *does* enforce are its own: each statement is sent inside an explicit `BEGIN READ ONLY`
   transaction (the server refuses writes with `25006`), and the run begins with a negative control
   that must be refused before any preflight statement is sent.
2. **After:** `scripts/batch14ax-postflight-production.sql` — its **last statement is the verdict**
   and must read `t`. FALSE, NULL or missing all fail. On a red verdict, run
   `scripts/batch14ax-verdict-components.sql`, which re-evaluates the twelve conditions separately
   and prints the raw function facts.
3. **Assert by effect, not by name:** the four functions under their exact signatures; the
   authority column **by type** on both tables; the trigger **enabled**, BEFORE, STATEMENT-level,
   covering INSERT **and** UPDATE on **both** tables; `service_role` holding exactly the release
   closure; `anon`/`authenticated`/PUBLIC holding nothing on any bundle-owned function.
4. **Smoke, as `service_role` — rollback-only and synthetic:**
   `scripts/batch14ay-service-role-smoke.sql`. One transaction: a direct INSERT, a direct UPDATE
   that fires the exclusive-global statement trigger (the INVOKER helper path — the one permission
   the boundary grants that the old PUBLIC default was silently providing), and the atomic RPC
   `apply_lifecycle_update_sync_global`, each asserted. It makes **no Stripe calls, no network
   access and no persistent membership change**: the transaction ends in `rollback`, and a failed
   assertion ABORTS it, so the rollback-only property does not depend on reaching the final
   statement. Two post-condition rows, evaluated from outside the transaction, assert that the
   synthetic row is absent from both tables — the claim is measured, not promised. Run it as the
   operator; it sets `role` to `service_role` locally for the transaction. In the isolated suite
   the same file is run with `rollback` replaced by `commit` as a **control**, which must leave the
   row behind — so "nothing persisted" is a check that can fail.

   **Both post-condition rows must read `expected_met = true`.** A zero exit status is **not**
   sufficient and must not be accepted as the smoke's result: the script raises on its own
   assertions, but the two post-conditions are the only statements that establish the rollback-only
   property, and they run after the transaction. Read them:

   ```
   nothing_persisted_in_ut_members | t
   nothing_persisted_in_profiles   | t
   ```

   `f`, an absent row, or a query that did not run at all are all failures. If either row is
   missing, treat the smoke as failed — do not infer it from the exit code.
5. **Do not release the application in the same window** (§4).

## 4. The application release — exact SHA, and why it is second

**`b4f8ce7149f625f3183507ffc9743e75528e742d`** — the accepted application evidence, deployed
only after the SQL is verified.

* **SQL first is safe; application first is not.** The deployed application (`ac49ce06`, verified
  through Vercel as `dpl_F54o7a73…`) does **not** use the atomic path — `membership-lifecycle-atomic.ts`
  is absent from it and the webhook route blob is the same as in `main`. Applying the SQL first
  leaves that application writing directly, which the statement trigger serializes and rejects
  nothing. The reverse — an application calling `apply_lifecycle_update_sync_global` before the
  function exists — fails every membership write with `42883`.
* **The application candidate is unchanged by this package.** No file under `src/` differs between
  the release record's earlier revision and this one, so the accepted test evidence stands and was
  not re-run.
* Release the application only after the postflight verdict is `t` **and** the smoke in §3.4 passes.

## 5. Rollback consequences

**Database and application rollback are separate and asymmetric.** Reverse the database in the
opposite order:

| Step | Reverse | Consequence |
|---|---|---|
| 8 boundary | re-grant `apply_lifecycle_update_sync` to `service_role` if it is wanted back; otherwise re-apply `20261012`–`20261016` | the pre-boundary surface returns: PUBLIC EXECUTE on 13 bundle-owned functions (including the global advisory key) and the seven prototypes back. Nothing is lost; the exposure returns. |
| 7 policy step | `select public.b14ac_install_trigger('none');` | **do this first** — it is the only step whose removal stops direct writers taking a key whose helpers a later step drops |
| 6 `20261016` | `drop column entitlement_authority_at` on both tables | **destructive and irreversible**: recorded reconciliation evidence is lost and every row reverts to "no reconciliation on record". With the new application deployed, every membership read and write fails `42703`. Leaving the column is inert for an older application — the safer half-measure. |
| 5 `20261015` | nothing | superseded; re-applying 6 or 2 restores a primitive body |
| 4 `20261014` | drop the two wrappers and the installer | the application's entry point disappears → every atomic write fails `42883`. Must follow an application rollback. |
| 3 `20261013` | drop the remaining `b14ab_*` helpers (the boundary already dropped seven) | only safe once step 4 is gone; the wrapper and the installed trigger depend on the lock helper |
| 2 `20261012` | `drop function public.apply_lifecycle_update(jsonb)` | removes the reviewed primitive; the wrapper then fails |
| 1 `20261010` | `drop index public.ut_members_email_lower_key;` | instant, no rewrite — but it re-opens the address-uniqueness defect: `A@x.com` and `a@x.com` can coexist as separate members again. Reversal is not neutral. |

A **partial** database rollback is the dangerous case: dropping the column (6) or the wrappers (4)
while the new application is deployed turns every membership write into a hard error, and there is
no compensating code path.

## 6. What would stop the rollout

* The re-run preflight differing from the run above — in particular a **case-variant duplicate** or
  a **name collision** on `ut_members_email_lower_key`, either of which makes step 1 abort by
  design rather than by accident.
* Any change to `ut_members`/`profiles` grants or policies between this preflight and the apply
  window: the boundary asserts the surface it installs, but the **Batch 13 boundary** is a
  prerequisite that the preflight only proves *now*.
* A postflight verdict that is not `t`, or the §3.4 smoke failing — both mean stop, not retry.
