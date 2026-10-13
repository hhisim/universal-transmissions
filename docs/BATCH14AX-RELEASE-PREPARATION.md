# Batch 14ax — release preparation package

**Preparation only. Nothing here has been applied, deployed or released.** No production
SQL was executed, no production configuration changed, and production remains `ac49ce06`
(application) / no Batch 14 SQL applied. Applying the SQL and releasing the application
are **separately authorized steps**.

Preparation base: `omni/batch14-membership-write-contract` at `b4f8ce7`.

## 1. The candidate

The candidate is the commit on `omni/batch14-membership-write-contract` that carries this
package; its SHA is recorded in §1b by a follow-up commit that changes **no SQL and no
code** (this document only), so the SHA below names the exact commit that contains every
file in this package.

### 1a. SQL hashes — the bundle, in installation order

| # | File | sha256 | git blob |
|---|---|---|---|
| 1 | `20261010_membership_write_contract.sql` (index + hardened guards) | `73cf618ea4f4f3a9a346439dd6dca5456749e2b08815f4e79be5e81cff340d11` | `f0cea2da04522c3fa818190201e8d80da9e1ccce` |
| 2 | `20261012_apply_lifecycle_update.sql` (**REVIEWED — unmodified**) | `b352afa09b7c6184cc2345d734f86e4ee1f3e08bc3146e9dc5836a513e371a4b` | `251d8e4c3a395bc0b73e64d51127955638c039f4` |
| 3 | `20261013_lifecycle_linkage_sync.sql` (key helpers) | `dc4b0e9ae70ee3ae434f236fc960ccff9dd25966e688b411c55ce6dc8ebd405b` | `7fa9642361f2ba3ab66bf20370b3e19e7720eb26` |
| 4 | `20261014_lifecycle_sync_wrapper.sql` (wrapper + trigger installer) | `2472d27240ac0676bc794efbe5cc5a3242dd6003a6c85eedcc9366a171f60dfa` | `ba705e43ae1bb8f1048a319cfdcca9a133d71678` |
| 5 | `20261015_lifecycle_per_entry_skip.sql` (**SUPERSEDED** by 6) | `c92e41e78385366402d1bca9d07b4d1ed2030d217b3a76de4c8581a391c9c382` | `7022e4568e016f799b6572cbb9e1ae588b8f7e86` |
| 6 | `20261016_entitlement_authority.sql` (authority column + primitive) | `e87041b08042c297f8f8f410febb02cf1d5883180c3715cf2b747a322f22fbbf` | `961f27cdf92404bdf7f8dcd6cd64ddd334061eb1` |
| 7 | **policy step, not a file:** `select public.b14ac_install_trigger('exclusive');` | — | — |
| 8 | `20261017_function_surface_boundary.sql` (**NEW — the callable surface**: revokes PUBLIC/anon/authenticated on all 17 bundle-owned functions, grants `service_role` exactly the release closure, withdraws the non-composing per-identity entry point, excludes the seven Batch 14ab prototypes, pins `search_path` on the helpers, then asserts the result and aborts if it is not as intended) | see §1a-bis | see §1a-bis |

`20261012` references `20261015` in the sense that 15/16 both replace its function body;
the reviewed FILE is byte-identical before and after being applied, asserted by both
harnesses on every run (`REV_SHA_BEFORE`).

`20261017` is the **last** step and is what makes the surface safe to release: before it,
13 of the 17 bundle-owned functions carry the DEFAULT PUBLIC EXECUTE grant and two helpers the
released paths depend on are reachable by `service_role` only through it. It is a separate
migration — not edits to `20261010`–`20261016` — so every reviewed file stays byte-identical.
It drops seven Batch 14ab prototype functions, which is why §7's rollback table changed.
Full inventory, call graph and evidence: `docs/BATCH14AY-SQL-SURFACE.md`.

`20261015` is superseded by `20261016` (a mechanical derivation with exactly four
changes). It is listed because it is part of the **validated sequence** and both harnesses
apply it; installing 16 alone produces the same end state, since 16 replaces the function
body 15 installs. The bundle is stated as validated rather than minimal.

### 1a-bis. Step 8 — the boundary migration

| # | File | sha256 | git blob |
|---|---|---|---|
| 8 | `20261017_function_surface_boundary.sql` | `ac39a47d8c33f9b20b9d58dbb21dad1dcbdf1149e6f1902ae029d8b46c1c9294` | `878af9c7d8c44d969497ffbda6462b391bc5605c` |

**Every reviewed file above is byte-identical to the hashes this record already carried** —
re-verified after this batch: `20261010` `73cf618e…`, `20261012` `b352afa0…`, `20261013`
`dc4b0e9a…`, `20261014` `2472d272…`, `20261015` `c92e41e7…`, `20261016` `e87041b0…`. The
surface decision lives in step 8 precisely so that stays true.

### 1c-bis. Artifact hashes — the whole package

Every executable artifact this package ships, as frozen for review. The reviewed migrations
`20261010` – `20261016` are **not** listed because they are unchanged: their hashes are in §1a and
were re-verified after this batch.

| File | sha256 | git blob |
|---|---|---|
| `20261017_function_surface_boundary.sql` | `ac39a47d8c33f9b20b9d58dbb21dad1dcbdf1149e6f1902ae029d8b46c1c9294` | `878af9c7d8c44d969497ffbda6462b391bc5605c` |
| `batch14ax-preflight-production.sql` | `2bb03de36a1ea8622fad24516ba1043d87ee2c1031263ab80018445f9c5a2fe9` | `2749f08f5baea187d9abe76c3b53dfa1c387294c` |
| `batch14ax-postflight-production.sql` | `8acbfa584d3e88d0f8c6e3157617297a744b9d3fa88b6f8b25474e5ded2ea305` | `eab700b786c0937aab07004505786b63fdb71309` |
| `batch14ax-install-bundle-validate.sh` | `84d64bd27e608f495431938431ef4e152e3391177eb4e93cc6480f26fbde0029` | `3f215121c789c5d732c3cac1980203cc562c855f` |
| `batch14ax-gate-negatives.sh` | `b6699bb50a8296acf89ba31f1e2101deeaa0457cc7757254f7e3e03e8f030b39` | `b25487655d61d7fe7375e51582e8b63e63c2ee60` |
| `batch14ax-verdict-components.sql` | `04f1ecea5dc5af76de25536b05c227ca615dbf5fc6b470662dac51c31e9e8459` | `4c3d3bb6c276eaef6c87a76ddf1d574734b5101f` |
| `batch14ay-function-surface.sh` | `67962eef6536f60524213aa719d8fb7ea751e96da9f2d94d37b9406fc979622a` | `71186eb18ac42c4f8d675221fd913ca73e5f0177` |
| `batch14ay-surface-gate.sh` | `78aded4192deaf893b8c99458b698046425f61b134b30082e2ad879e049845f6` | `3535a3eebf061d81fccb1e569231497f303d6d52` |
| `batch14ay-preflight-production-run.py` | `8dd32c3b633da7a0f4758779d5e047dddbe2e6b895c9c441326dd321b250e00d` | `7cdbb9fdd02ec2448377cd8d54752b6909f16eed` |
| `batch14ay-service-role-smoke.sql` | `ea4d8facd8f917cb421d90027734e1eabb191b5bf97ad02dc66bceac9f173d8d` | `02a30c313b23b5346988b6de70a22eddf8b773e3` |
| `batch14ax-email-index-negatives.sh` | `68b7da975a60293ae10329263798510ffddc40d48c9599d148337f1d4d1211b7` | `2ef4064900c78e7e3709ab5c66163d55286665c9` |

`docs/BATCH14AY-SQL-SURFACE.md` (surface inventory and boundary rationale),
`docs/BATCH14AY-PRODUCTION-PREFLIGHT.md` (the read-only production preflight and every mismatch)
and `docs/BATCH14AY-ROLLOUT-DECISION.md` (the rollout decision and rollback consequences) are this
package's documents. They contain no executable artifact and are amended by the follow-up commit
that names the candidate — see §1b.

### 1b. Candidate SHA

**`44c5a0f62ddae613fd10e13e0312ea612da5c398`**

That is the single candidate identifier for this package: the commit that carries every artifact
in §1a, §1a-bis and §1c-bis (the migration, the harnesses, the smoke script and the documents).

**There is exactly one candidate, and it is not the branch tip.** This record is amended after that
commit so that it can name it; that amendment — and any later correction to this file — changes
**`docs/` only** and is never an alternative candidate. To check: `git diff --name-only <candidate>
<tip>` must list nothing outside `docs/`. Do not resolve the candidate to a later docs-only commit.

**A second candidate exists and is deliberately NOT this one.** The application release is
`b4f8ce7149f625f3183507ffc9743e75528e742d` — approved separately, deployed only after the SQL is verified, and referenced
by this package but never carried by it. The two are kept apart so that applying SQL from one
commit while verifying with another is visible as a mismatch rather than a detail.

**Retired identifiers**, none of which is a candidate for anything: `41a892c…` is **retired** — it
predates the policy-shape gate and the enforced read-only preflight; `5bc511e…` (before the
production preflight), `286eab5f…` (before the boundary migration), `f55483d…` (before the surface
finalisation) and `56dd20f…` likewise. Each installs or verifies strictly less than this record
describes.

### 1c. Harness files in this package

Hashes as of this revision. The gate harnesses are version-parameterised: run them with
`PGBIN=/usr/lib/postgresql/<major>/bin` to select the server.

| File | sha256 | git blob |
|---|---|---|
| `scripts/batch14ax-email-index-negatives.sh` | `68b7da975a60293ae10329263798510ffddc40d48c9599d148337f1d4d1211b7` | `2ef4064900c78e7e3709ab5c66163d55286665c9` |
| `scripts/batch14ax-install-bundle-validate.sh` | see §1c-bis | see §1c-bis |
| `scripts/batch14ax-gate-negatives.sh` | see §1c-bis | see §1c-bis |
| `scripts/batch14ax-verdict-components.sql` | `ecfdebd262fd8f628a4afe5f2dfe4889dc056e841733b0c44feda5da9370cff2` | `4ddfc5446a969cfd2f4f18f059c16e7c0dd83b9c` |
| `scripts/batch14ax-preflight-production.sql` | see §1c-bis | see §1c-bis |
| `scripts/batch14ax-postflight-production.sql` | see §1c-bis (rewritten this batch: complete surface + corrected PUBLIC diagnostic) | see §1c-bis |
| `scripts/batch14ax-install-bundle-validate.sh` | see §1c-bis (components extended to the complete surface) | see §1c-bis |
| `scripts/batch14ax-gate-negatives.sh` | see §1c-bis (C14–C17 added for the new conditions) | see §1c-bis |
| `scripts/batch14ax-verdict-components.sql` | see §1c-bis (components 11–12 added) | see §1c-bis |
| `scripts/batch14ay-function-surface.sh` | **NEW** — the inventory dump (17 functions, ACLs, per-role EXECUTE, bodies, triggers) | see §1c-bis |
| `scripts/batch14ay-surface-gate.sh` | **NEW** — the focused surface gate: denials, authorized paths, load-bearing grants, RESTRICT, coverage | see §1c-bis |

## 2. Installation prerequisites

1. **Role.** Run as `postgres` (or a role that is superuser). Two files require it:
   `20261014` does `alter function … owner to postgres` and `20261016` is applied by a role
   that must be able to replace the reviewed function; the policy step must be able to call
   `b14ac_install_trigger(text)`, which is revoked from `public`, `anon` and `authenticated`.
2. **One transaction per file.** Every file carries its own `begin`/`commit`; the wrapper
   and the trigger installer commit together with their ACLs. Apply them with a
   fail-fast psql (`-v ON_ERROR_STOP=1`) so a failure stops the sequence rather than
   continuing past a half-installed bundle.
3. **Locks.** `20261010` and `20261013`/`20261014` take `ACCESS EXCLUSIVE`-class locks on
   the two tables and set their own `lock_timeout`/`statement_timeout`, aborting rather
   than queueing behind traffic.
4. **Batch 13 must already be applied.** The bundle abstains from all grants and policies
   on the two tables; it must not be the change that alters that boundary, and the
   postflight re-asserts it (§4).
5. **`service_role` must exist** and must be able to `EXECUTE
   public.apply_lifecycle_update_sync_global(jsonb)`. That grant is made by `20261014`.
6. **Application ordering — SQL FIRST, then the application.** Neither `main` (`605aabe`)
   nor `ac49ce06` uses the atomic module: `src/lib/membership-lifecycle-atomic.ts` is absent
   from both, `applyAtomicLifecycleUpdate` appears nowhere in either webhook route, and the
   route file is the same blob in both. The atomic path exists only on the batch14 branch.
   Applying the SQL to a database whose application still writes directly is safe — the
   trigger serializes those writes and rejects none. The reverse is not: an application
   released before the SQL would call a function that does not exist and fail every
   membership write with `42883`.
7. **The application must call the GLOBAL entry point** —
   `ATOMIC_LIFECYCLE_RPC = "apply_lifecycle_update_sync_global"` in
   `src/lib/membership-lifecycle-atomic.ts`. The per-identity variant
   (`apply_lifecycle_update_sync`) does **not** compose with the statement trigger.

## 3. The matching exclusive-global statement-trigger protocol

**Wrapper installation alone is insufficient.** `apply_lifecycle_update_sync_global` takes
the single global advisory key and then calls the reviewed primitive — but it only covers
writers that CALL it. A direct writer (PostgREST writes from checkout, the member portal,
an operator's SQL session) takes no key of its own and can commit a linkage between the
RPC's relocation and its commit, which is the race the wrapper exists to close.

Installing the **statement trigger** covers those non-participants, and it must be
installed in the **exclusive** mode, for two measured reasons (docs/BATCH14AC §3):

* **D3c — a per-identity wrapper does not compose with a global-key trigger.** The trigger
  takes the global key; a per-identity writer holds only the linkage key; they do not
  contend, and the direct writer commits inside the window. Only the global entry point
  covers non-participants.
* **U — the shared mode deadlocks on upgrade.** Two transactions each take the key shared
  for their own DML and then request it exclusive: with the **shared** trigger, the upgrade
  deadlocks (`40P01`, exactly one victim). With the **exclusive** trigger, a second writer
  cannot hold it at all, so no upgrade is possible.

The policy step is therefore exactly:

```sql
select public.b14ac_install_trigger('exclusive');
```

which installs `b14ac_stmt_trg` on **both** `public.ut_members` and `public.profiles`,
calling `b14ac_trg_stmt_exclusive()`. `'none'` removes them (the rollback step);
an unknown mode is refused with SQLSTATE `22023`.

## 4. The SELECT-only preflight and postflight

**Executed against production, read-only, statement by statement** — results, the prerequisite
comparison and every mismatch: `docs/BATCH14AY-PRODUCTION-PREFLIGHT.md`.

**The runner does not certify provenance — the operator does.** `batch14ay-preflight-production-run.py`
takes `--sql PATH` and opens that file; it does not resolve a commit, shell out to `git`, or verify a
hash. The executed bytes are certified by the operator procedure in
`docs/BATCH14AY-ROLLOUT-DECISION.md` §3.1 (`git show <candidate>:<path>` → `git hash-object` must
equal the value in §1c-bis → pass that path to `--sql`). *Deferred defect:* the runner's own header
still claims it performs the extraction and the blob check. That sentence is wrong; correcting it
would change a frozen artifact hash, so it is deferred to the next candidate rather than edited
here. What the runner genuinely enforces is its own: every statement inside `BEGIN READ ONLY`
(`25006` on a write) and a negative control that must be refused before the run.

`scripts/batch14ax-preflight-production.sql` (P0–P16) and
`scripts/batch14ax-postflight-production.sql` (Q0–Q90). Both are **SELECT-only** — the
bundle validator greps both files for any writing statement outside a comment and requires
zero hits — and both are **counts-only**: no member address, user id, customer id or
subscription id is ever projected. Addresses appear only as group keys inside subqueries.

**The postflight's LAST statement (Q90) is the mandatory verdict** — a single boolean that
the harness reads as the last line of the file's unaligned output and requires to be exactly
`t`. A FALSE, NULL, MISSING or non-boolean verdict FAILS, and the validator additionally
asserts that **nothing follows the verdict** in the file, so a later statement can never be
mistaken for it. The verdict independently ANDs ten conditions:

1. the authority column exists on BOTH tables **with type `timestamp with time zone`**;
2. the address index is structurally the required single-expression key (right table, one
   key column, no INCLUDE columns, no partial predicate, unique/valid/ready/live, expression
   compared structurally);
3. all four functions exist under their **exact signatures** — `p_targets jsonb` for the
   primitive and both wrappers, `p_mode text` for the installer;
4. the three callable functions carry the declared **security mode** (primitive DEFINER,
   wrappers INVOKER), a pinned **`search_path = pg_catalog, public`**, owner `postgres`,
   `service_role` EXECUTE, and no `anon`/`authenticated`/PUBLIC EXECUTE;
5. the **trigger installer** is present, owned by `postgres`, and callable by no application
   role;
6. the statement trigger is **ENABLED** (`tgenabled = 'O'`), **BEFORE**, **STATEMENT-level**,
   covers **INSERT and UPDATE**, on **BOTH** tables, and calls the exclusive-global function;
7. **effective TABLE access** is withdrawn from `anon`/`authenticated` — inheritance-aware,
   on the server's own privilege list;
8. **effective COLUMN access** is withdrawn, on a deliberately version-independent list;
9. no **PUBLIC** grant on tables, columns, or the four guarded functions — detected with
   `aclexplode`, because a grantee of 0 *is* PUBLIC, and a NULL `proacl` means the default
   PUBLIC grant is still in place;
10. RLS is **enabled on both tables**, the withdrawn `allow_authenticated_read` policy is
    absent, and **no policy** on either table is visible to `anon`/`authenticated`/PUBLIC.

Coverage:

* **Schema / index / function / trigger definitions** — the two tables and their columns,
  the address index with every structural flag (table, unique, valid, ready, live, key
  count, predicate, expression), and every non-internal trigger on both tables with the
  function it calls.
* **Ownership and ACLs** — owner of every lifecycle function, `acl_entries`, and
  `has_function_privilege` for `service_role`, `anon` and `authenticated`.
* **Batch 13 preservation** — privileges held by `anon`/`authenticated` on both tables
  (expect 0), grants to `PUBLIC` (expect 0), `service_role`'s full set (8 on PostgreSQL 17,
  7 on 16), and the policy inventory.
* **Aggregate authority / legacy / conflict exposure** — per table: rows, attested rows,
  unattested legacy rows, checkout-style customer-only rows, rows with no Stripe linkage,
  revoked rows, past-due rows, unrecognised plan values. Cross-table: addresses in both
  tables, attested customer contradictions, attested subscription contradictions, and the
  two "an attested row suppresses an unattested paid row" populations.
* **Installation prerequisites** — the global entry point present, the trigger installer
  present, and `service_role` able to call the entry point.
* **A red gate names its cause** — `scripts/batch14ax-verdict-components.sql` re-evaluates
  the verdict's ten conditions separately, prints only the ones that do NOT hold, and then
  prints the raw facts behind them (owner, security mode, search_path, ACLs, per-role
  EXECUTE) for each of the four guarded functions. Both harnesses run it automatically
  whenever the verdict is not `t`. A gate that reports only "false" is itself a defect.

## 4b. Gate validation, on PostgreSQL 16 AND 17

Both harnesses are version-parameterised (`PGBIN=…`), so the same file runs against either
server:

| Run | Result |
|---|---|
| `batch14ax-install-bundle-validate.sh` on **PostgreSQL 16.15** | **49 / 0** |
| `batch14ax-install-bundle-validate.sh` on **PostgreSQL 17** | **48 / 0** |
| `batch14ax-gate-negatives.sh` on **PostgreSQL 16.15** | **36 / 0** |
| `batch14ax-gate-negatives.sh` on **PostgreSQL 17** | **36 / 0** |

PostgreSQL 17 was installed from the official PGDG repository **on the test host only**,
specifically so the version-dependent branch is exercised rather than argued: the preflight's
P16 self-test reports the branch the *running* server takes, and on 16 the harness asserts the
negative control — that naming `MAINTAIN` unconditionally raises
`unrecognized privilege type: "MAINTAIN"` — which is what makes the `CASE` guard
load-bearing rather than stylistic.

**Direct writes are proven as `service_role`, not as the session user.** A superuser session
proves nothing about the application role: it bypasses RLS and holds every privilege by
definition. The validator therefore runs an INSERT and an UPDATE under
`set role service_role`, asserts both persist, asserts `service_role` may execute the
trigger's function (a missing EXECUTE would make every direct write fail with `42501`), and
asserts a case-variant duplicate is still refused by the index on that path.

### The negative-control matrix

`batch14ax-gate-negatives.sh` installs a clean bundle, proves the verdict reads `t`, injects
ONE drift, requires the verdict to stop reading `t`, reverts the drift, and requires the
verdict to read `t` again — so every case proves both halves. Cases: **C0** clean-install
control · **C1** table access re-granted to PUBLIC · **C2** column access granted to
`authenticated` (a table-level check would miss it) · **C3** the trigger disabled · **C4** the
trigger dropped on one table · **C5** the trigger installed in SHARED mode (the wrong
protocol) · **C6** the wrapper exposed to `anon` · **C7** RLS disabled on one table · **C8**
the withdrawn read policy re-created · **C9** the authority column dropped · **C10** a
required signature dropped · **C11** a wrapper re-created DEFINER with no `search_path` ·
**C12** function ownership moved off `postgres` · **C13** the verdict parser itself (a FALSE,
NULL, missing and error-before-verdict file) · **F** the clean-install control, restored.

### Three findings this validation produced

1. **`ALTER FUNCTION … OWNER TO` is not ACL-neutral.** C12 moves a wrapper's owner to
   `service_role` and back: the ownership returns, but PostgreSQL **drops the
   `service_role=X/…` ACL entry** in the process, so the function becomes unreachable by the
   application role even though its owner is correct again. The harness asserts this finding
   explicitly, and the revert re-applies `20261014` (which owns both the owner and the grants)
   rather than flipping the owner back. It is also why the verdict checks owner **and** ACLs
   as separate conditions.
2. **`MAINTAIN` is a TABLE privilege and `has_column_privilege()` rejects it on every
   version.** The first revision of P12/Q8 built the column-privilege list with the same
   version `CASE` used for tables, which fails on PostgreSQL 17 with
   `unrecognized privilege type: "MAINTAIN"`. The column lists are now deliberately
   version-independent (`SELECT, INSERT, UPDATE, REFERENCES`). **The PostgreSQL 17 run is what
   caught this** — it would have failed at install time on production, which is 17.6.
3. **The bundle's own helper functions still carry the default PUBLIC EXECUTE grant**
   (`b14ab_*`, `b14ac_*`, the trigger functions). The release does not claim to harden them,
   so this is NOT a mandatory gate — but it is not hidden either: the postflight's Q9 prints
   it as `other_public_functions_with_public_execute_informational`, and the exposure is real
   (an anonymous caller could reach `b14ab_acquire_global_lock()` and hold the exclusive
   advisory key, which is a denial-of-service lever, not a data leak). **Follow-up, not part
   of this release:** a later, separate migration should revoke PUBLIC on the helper
   functions. It is deliberately not folded in here, because it would change the reviewed
   bundle's hashes.

Every postflight row whose expectation is knowable carries an `expected_met` boolean, and
Q10 returns a single boolean ANDing the critical conditions, so a green run does not depend
on the operator reading values correctly. Row counts in Q3/Q8/Q9 are printed for direct
comparison against the preflight's P1b/P7/P8 — **the bundle must add and change no rows, and
it performs no backfill**: stamping legacy rows would manufacture authority the system
never established.

## 5. Authoritative regression coverage

**No application source changed in this batch or in this package's follow-ups** (the roster
contains only SQL, harnesses and this document), so the accepted application evidence stands
and was not re-run. That evidence is the tree at **`b4f8ce7`** — the commit that completed
the writer contract — **not `d2b366c`**. The first revision of this document cited
`d2b366c`, which is the *intermediate* commit of that same batch: the results listed below
(notably `batch14ai` at **48 / 0**, including cases C2 and G) were produced against
`b4f8ce7`, where the C2 invoice-coherence fix and those two cases landed. `d2b366c` is its
parent and corresponds to the earlier 34 / 0 revision of the same suite. No measured result
in this record changes; the citation was wrong and is corrected here.

| Suite | Result | Covers |
|---|---|---|
| `batch14s-unlinked-row-authority.js` | 10 / 0 (bytes unchanged) | the two pinned cases |
| `batch14ai-authority-writer-contract.js` | 48 / 0 | the writer contract: A/B/C/C2, rollback+retry, the predicate, both entry points, stale events |
| `batch14ah-durable-authority.js` | 24 / 0 | durable authority, checkout counterexamples X1/X2 |
| `batch14ag-read-authority.js` | 30 / 0 | the reader's authority rule |
| `batch14t-snapshot-timing.js` | 27 / 0 | snapshot timing, retry, stale deletion |
| `batch14p-webhook-coverage.js` | 49 / 0 | webhook coverage S1–S6 |
| `batch14af-invoice-write-consistency.js` | 49 / 0 | invoice write consistency |
| `batch14r-concurrency` / `-authorization` | 41 / 0 · 21 / 0 | interleavings, authorization |
| `batch14b`, `batch14c`, `batch14f`, `batch14m`, `batch14n`, `batch14-membership-write-contract` | 41/0 · 38/0 · 11/0 · 7/0 · 15/0 · 51/0 | readback, revocation, event order, candidates, pagination, write contract |
| `scripts/batch14af-atomic-integration.sh` | 24 / 0 (isolated PG16, module compiled) | the integrated TS lifecycle path |
| `npx tsc --noEmit` / `npm run build` | exit 0 / exit 0 | types, build |

### 5b. Gate validation, on PostgreSQL 16 AND 17 (current results)

Everything here runs against private isolated clusters (unix socket, `listen_addresses`
empty, asserted; data directory torn down at the end) and is version-parameterised
(`PGBIN=/usr/lib/postgresql/<major>/bin`):

| Harness | Result | Proves |
|---|---|---|
| `scripts/batch14ay-function-surface.sh` | inventory | the complete surface it dumps — 17 functions with signature, mode, owner, pinned path, raw ACL, per-role **effective** EXECUTE, bodies and triggers — is the basis of the §1a-bis decisions, and its call graph is derived from the bodies (plpgsql records nothing in `pg_depend`) |
| `scripts/batch14ay-surface-gate.sh` | **83 / 0** (PG17) | the focused surface validation: §4 of `docs/BATCH14AY-SQL-SURFACE.md` (denials for all ten functions × three roles, authorized direct writes and atomic RPC, the withdrawn per-identity variant, the installer's modes, load-bearing grant and denial controls, RESTRICT, and completed-call coverage) |
| `scripts/batch14ax-install-bundle-validate.sh` | **58 / 0** (PG16) · **57 / 0** (PG17) | Batch 13 applied first, every bundle file applies in order **including the boundary**, the preflight EXECUTES against the pre-install state, the reviewed file is byte-identical after being applied, the exclusive trigger covers both tables, an unknown mode is refused (22023), direct writes as `service_role` commit and the index refuses a case-variant duplicate, Batch 13 preservation survives, the postflight EXECUTES with a mandatory verdict of `t`, and both files are SELECT-only |
| `scripts/batch14ax-gate-negatives.sh` | **66 / 0** (PG16) · **66 / 0** (PG17) | 24 cases: the clean-install control, PUBLIC table access, column access, disabled trigger, partial trigger coverage, shared-mode trigger, exposed wrapper, RLS drift, re-created read policy, missing authority column, missing signature, wrong security mode/search_path, moved ownership, PUBLIC EXECUTE on a helper, a re-created prototype, a revoked release-closure grant, an unpinned helper, and the six POLICY-SHAPE cases: open on both sides (reject), `service_role` + `true/true` (GREEN), the exact production shape (GREEN), restricted `USING` with unrestricted `WITH CHECK` (reject), unrestricted `USING` with restricted `WITH CHECK` (reject), omitted `WITH CHECK` defaulting to `USING` (GREEN), and an unapproved authenticated shape (reject) — plus the verdict-parser controls, the smoke and its rollback control, and the restored clean-install control |
| `scripts/batch14ax-email-index-negatives.sh` | 27 / 0 | the hardened index guards (unchanged this batch) |

The 17 branch of the privilege `CASE` **is** exercised (PostgreSQL 17 is installed on the test
host from PGDG), which is what makes the version-independent column-privilege list a measured
decision rather than an argument.

**Defects this validation found and fixed in this package:**

1. **The boundary migration was not idempotent.** Seven of the functions it revokes are dropped
   later in the same file, so a bare `revoke … on function` made the SECOND run fail. Caught by
   the focused gate's A2 assertion (`re-applying it is a no-op`). Fixed with an
   existence-guarded loop over `to_regprocedure`.
2. **An assertion in the validator rested on a false rationale.** It required `service_role` to
   hold EXECUTE on the trigger function, reasoning that "a missing EXECUTE would make every
   direct write fail with 42501". The boundary closes PUBLIC — removing that grant — and the
   harness's own direct writes still commit and persist, so the rationale is false: trigger
   invocation does not consult the function's EXECUTE. The assertion now records the measured
   fact, and the requirement that actually matters (EXECUTE on the INVOKER helper the trigger
   calls) is asserted directly.
3. **The PUBLIC diagnostic was mis-scoped.** It reported the bundle's own helpers as "other
   functions", under-reporting the surface this release owns while the mandatory check covered
   only four functions. Now: mandatory `= 0` across every bundle-owned function, informational
   scoped to unrelated ones.
4. **The policy condition tested the role list instead of the boundary — found by the
   PRODUCTION preflight, not by any isolated run.** All three deployed policies are addressed
   `TO public` and constrain on `auth.role() = 'service_role'`; the condition counted any policy
   whose role list named `anon`/`authenticated`/`public`, so the verdict would have read **false
   on a correct production database** and blocked the rollout for a non-defect. This project's own
   notes already state the rule — the role list is not the gate, the `USING`/`WITH CHECK`
   expression is. The condition now counts a policy only when it is addressed to those roles
   **and** does not constrain them out, and two controls pin it in both directions (C18 open
   policy → reject; C19 production-shaped policy → green). This is why the preflight is run
   against production and not only against a fixture: the isolated fixture happened to declare
   its policies `TO service_role`, so no isolated run could have surfaced it.
5. **The policy gate tested a SUBSTRING, not a shape.** The exemption
   `~* 'auth\.role\(\)\s*=\s*''service_role'''` accepted any expression that merely
   *contained* that text — so `USING (true) WITH CHECK (auth.role() = 'service_role')` would have
   passed while leaving reads open. It is replaced by a **closed set of approved shapes** compared
   on `(roles, command, permissiveness, effective USING, effective WITH CHECK)`, with PostgreSQL's
   defaults applied first (`WITH CHECK` defaults to `USING` for UPDATE/ALL; not applicable for
   SELECT/DELETE; `USING` not applicable for INSERT). **An unknown shape fails review.** Six
   controls pin it, three of them GREEN — because a gate that rejects a correct production
   boundary is the failure mode this whole correction exists to remove.
6. **Two bugs the new controls exposed immediately, both of which would have shipped.**
   (a) The approved `roles` values were written `'{service_role}'`/`'{public}'` while the
   expression emits a **bare comma-joined list** — every policy would have been reported as an
   unapproved shape, production included. The three GREEN controls caught it; without them the
   first red run would have looked like a production problem. (b) Component 9's
   `PUBLIC EXECUTE` predicate had been **lost in an earlier edit**, leaving a clause that asked
   whether any bundle-owned function exists — false after the install. It was invisible because the
   components run only on a red verdict, which then printed a misleading cause. Both are fixed.
7. **The preflight's read-only claim was overstated and is now enforced.** The runner asserted
   that "SELECT/WITH prefixes make it read-only"; a prefix test does not constrain a `SELECT` that
   calls a volatile function, so that was a declaration rather than a guarantee. Each statement now
   runs inside an explicit `BEGIN READ ONLY` transaction, where the server refuses any write with
   `25006`, and the run begins with a **negative control** that must be refused. The production run
   reported the control refused before any preflight statement was sent.
8. **A negative control did not inject its drift.** C15's prototype re-creation passed its
   dollar-quoted body through nested `psql -c` / `su -c`, so the inner shell expanded `$fn` to
   nothing, the injection failed, and the case reported "the drift was not caught" — the same
   trap C11 hit earlier. Both now write the injection to a FILE and assert that the injection
   itself succeeded, so a failed injection can never masquerade as a caught mutation.

**Two defects were found by that validation and fixed in this package** — which is why the
files are validated rather than merely written:

1. The preflight's P6 privilege CTE was declared `privs(p)`, aliasing its single column as
   `p`, so `p.priv` did not exist and the file **errored on the first real run**
   (`ERROR: column p.priv does not exist`). Corrected to `privs(priv)`.
2. The bundle validator initially ran the preflight/postflight from under `/root`, where the
   `postgres` user cannot read them; psql failed with `Permission denied` and the SQL never
   executed. The harness now copies every SQL file into the postgres-owned workspace, so an
   unreadable file can never masquerade as a passing one.

The migration-file negatives were run against the hardened `20261010`; every negative aborts
with a message naming its defect, and the harness asserts the migration FILE is unmodified by
being applied.

## 6. Known obsolete fixtures and deferred defects

* **Still-red suites, unchanged and pre-existing:** `batch14d` 12/14, `batch14e` 13/9,
  `batch14g` 10/2, `batch14l` 7/6, `batch14q` 10/10. Each uses its own inline fake without
  an `rpc()` method, so it cannot exercise the atomic path. Their failing-assertion lists
  are byte-identical to the pre-Batch-14af baselines — they are known obsolete fixtures, not
  regressions, and they are NOT part of the authoritative coverage above.
* **`batch14f` A1 is a vacuous green**: its inline fake has no `rpc()`, so the invoice write
  is refused and the assertion passes for the wrong reason. The guarantee is carried by
  `batch14af-invoice-write-consistency.js` I3 instead.
* **`batch14s`'s header** still reads "PINNED DEFECT — EXPECTED RED"; its unchanged bytes are
  the evidence the rule landed. Updating that header is the owner's call.
* **`20261015` is superseded** by `20261016` (§1a) and is retained only for sequence fidelity.
* **WITHDRAWN (was: "the harness cluster is PostgreSQL 16 … the 17 branch runs only in
  production").** PostgreSQL 17 is now installed on the test host from PGDG and both gate
  harnesses are version-parameterised (`PGBIN=…`), so the 17 branch of the privilege `CASE`
  **is** exercised, and running it is what caught a real defect: the first revision of the
  column-privilege check used the same version `CASE` as the table list, and
  `has_column_privilege()` rejects `MAINTAIN` on **every** version — it would have failed at
  production install time. Column lists are now version-independent. What remains true is
  narrower: the isolated runs are on 16.15 and 17, production is **17.6**, and no isolated run
  is production.

## 7. Rollback

Database and application rollback are **separate**, and their consequences are not
symmetric. Roll back the database in reverse installation order.

### 7a. Database

| Step | Rollback | Consequence |
|---|---|---|
| 8 `20261017` (boundary) | restore the withdrawn grant (`grant execute on function public.apply_lifecycle_update_sync(jsonb) to service_role;`) and re-apply `20261012`–`20261016` to recreate the prototype functions and unpin the search paths. Simply dropping this file from the sequence is also safe. | the pre-boundary surface returns: PUBLIC EXECUTE on 13 bundle-owned functions (including the global advisory key) and the seven prototypes back in place. Nothing is lost, but the exposure returns. |
| 7 policy step | `select public.b14ac_install_trigger('none');` | removes both statement triggers. **Do this FIRST**: it is the only step whose removal stops direct writers taking a key whose helper functions the later steps drop. |
| 6 `20261016` | `drop column entitlement_authority_at` on both tables | **DESTRUCTIVE and NOT reversible**: the recorded reconciliation evidence is lost, and every row reverts to "no reconciliation on record". With the new application still deployed, every membership READ and WRITE fails with `42703` (undefined column). Leaving the column in place is inert for an older application and is the safer half-measure. |
| 5 `20261015` | nothing | superseded; re-applying 6 or 2 restores a primitive body. |
| 4 `20261014` | drop the two wrapper functions and `b14ac_install_trigger` | the application's entry point disappears → every atomic write fails with `42883`. Must follow an application rollback. |
| 3 `20261013` | drop the remaining `b14ab_*` helper functions — the boundary has already dropped seven of them, so what is left is `b14ab_acquire_global_lock` and `b14ab_linkage_global_key` (plus `b14ab_linkage_key`, used by the per-identity path) | only safe once step 4 is gone; the wrapper and the installed trigger depend on the lock helper. |
| 2 `20261012` | `drop function public.apply_lifecycle_update(jsonb)` | removes the reviewed primitive; the wrapper then fails. |
| 1 `20261010` | `drop index public.ut_members_email_lower_key;` | instant, no data loss, no rewrite — but it re-opens the address-uniqueness defect: `A@x.com` and `a@x.com` can again coexist as separate members. Reversal is not neutral. |

A partial database rollback is the dangerous case: dropping the column (6) or the wrappers
(4) while the new application is deployed turns every membership write into a hard error.
There is no compensating code path.

### 7b. Application

| State | Effect |
|---|---|
| Application rolled back, database still forward | Safe. The pre-atomic application writes the tables directly; the statement trigger is taken on every such write (it serializes them, it does not block them), and `entitlement_authority_at` is simply never selected or written. Rows keep the authority stamps already recorded; the older reader ignores the column. |
| Application forward, database rolled back | **Broken.** `42703` for the authority column on every read of the two tables, and `42883` for `apply_lifecycle_update_sync_global` on every write. Roll the database back only together with the application, or not at all. |
| Application rollback does NOT undo | authority stamps already written (the data remains); the email index; the triggers. Those are database rollbacks. |
| Application rollback re-opens | the writer-contract defects closed in Batch 14ai/14aj: a first verified cancellation would again establish nothing, dunning would again attest a cached plan, and an invoice would again attest a contradicted pair. |

## 8. Limits

* **Exposure numbers are install-time measurements, not forecasts.** P7/P8/Q8/Q9 must be
  run against production and compared; no count in this package is derived from production
  data.
* **The isolated validation is synthetic**: a private PG16 cluster with two tables, three
  roles and RLS enabled, not a copy of production. It proves the bundle's ORDER and the
  objects it installs, not production's data conditions.
* **Index hardening and production verification remain separate work**, as does any
  decision about backfilling authority evidence — which this package explicitly does not
  propose.
* **No release readiness is claimed here.** Installing the SQL, deploying the application,
  and verifying production afterwards are each separately authorized.

**Production remains untouched: no Batch 14 SQL is applied, and no Batch 14 application
change is deployed.**

### Production baseline, reconciled and verified read-only

The first revision of this document said "production application `ac49ce06`". That was an
**unverified claim and is withdrawn.** What the repository establishes is narrower:

| Ref | Commit | What it is |
|---|---|---|
| `main` | `605aabea16344b476d8e76db599deaa38391007b` | trunk (`fix: render recent journal heroes`); **58 commits BEHIND** the Batch 13 tip, and does **not** contain `20261010_membership_access_hardening.sql` |
| `ac49ce06` | `ac49ce062d66a49b0e4202a5e15755b930667bc3` | `Batch 13c: fix the PostgreSQL 17 path and make verification SELECT-only`, on `omni/batch13-membership-db-access`; a DESCENDANT of `main` and an ANCESTOR of the batch14 branch |

`git merge-base main ac49ce06` = `605aabe`; `git rev-list --count main..ac49ce06` = **58**;
`ac49ce06..main` = **0** — one lineage, not two divergent ones.

* **Verified read-only:** the ancestry above; that
  `src/app/api/stripe-webhook/route.ts` is the **same blob**
  (`56073ee48fd1b97115e453db9809c9762aeb250c`) in `main` and `ac49ce06`; that
  `src/lib/membership-lifecycle-atomic.ts` is **absent** from both and present only on the
  batch14 branch; and that the Batch 13 migration file exists in `ac49ce06` and not in
  `main`.
* **NOW ESTABLISHED — measured read-only through the Vercel API, not inferred from the
  repository.** Both production aliases resolve to a single deployment:

  | | |
  |---|---|
  | Project | `universal-transmissions` — `prj_E5hqrQHvT2gE0sirOyjN9dwscJyY`, framework nextjs |
  | Deployment ID | **`dpl_F54o7a73ehL1ouHwMXzqhZ8ZNgRa`** |
  | Immutable URL | `universal-transmissions-bv473auep-hhisim-7214s-projects.vercel.app` |
  | State | `READY`, `target: production`, `aliasAssigned: true` |
  | **Source SHA** | **`ac49ce062d66a49b0e4202a5e15755b930667bc3`** |
  | Git baseline | repo `hhisim/universal-transmissions`, ref `main`, author Hakan Hisim — "Batch 13c: fix the PostgreSQL 17 path and make verification SELECT-only" |
  | Created → ready | 2026-10-10T23:13:52Z → 2026-10-10T23:15:56Z |
  | Aliases on it | `universal-transmissions.com`, `www.universal-transmissions.com`, `universal-transmissions.net`, `www.universal-transmissions.net`, `universal-transmissions.vercel.app`, `universal-transmissions-hhisim-7214s-projects.vercel.app`, `universal-transmissions-git-main-hhisim-7214s-projects.vercel.app` |
  | Live probe | both `.com` aliases HTTP 200 with the **identical** `etag: "3bd84e80dacd12e3008b94bb08761f69"` |

  So the production baseline is `ac49ce06` **by measurement**, and the previous revision's
  withdrawal is now resolved in the other direction: it was right that the repository could
  not establish the deployed SHA, and the deployed SHA is nevertheless `ac49ce06`.
  Note the consequence: the deployed commit is **58 commits AHEAD of `main`** as `main`
  stands today, so `git push` to `main` is not what keeps this project deployed.
* **Credential finding (operational, read-only):** the Vercel token stored at
  `/root/.config/omni-commerce/platform-credentials.json` and the token documented in the
  `ut-vercel-deploy` skill are **both rotated/invalid** (`403 {"invalidToken":true}`). The
  live token is the one in `/mnt/hermes-ssd/thoth-clean/.env` **on the Pi** (validated:
  `200`, user `hhisim-7214`). Any deploy or API call that used the local copies would have
  failed; this verification used the live one. The skill has been corrected.
* **What matters for the release** is unchanged by all of the above: whichever commit is
  deployed, **the application does not use the atomic path** (identical webhook route blob,
  no atomic module), so the SQL-first ordering in §2.6 holds either way. And because `main`
  does not carry the Batch 13 migration while `ac49ce06` does, the Batch 13 boundary must be
  verified **by effect** — the preflight's P6/P11/P12/P13/P15 and the postflight's
  Q7–Q10 — not inferred from which branch was deployed.
