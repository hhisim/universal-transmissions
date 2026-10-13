# Batch 14ay — the production SQL surface

**Preparation only. Nothing here has been applied, deployed or released.** No production SQL
was executed, no production configuration changed. Applying the SQL and releasing the
application remain separately authorized steps.

Base: `omni/batch14-membership-write-contract` at `f55483d` (the release-preparation package
it amends). This batch **adds one migration** — `20261017_function_surface_boundary.sql` — and
changes no reviewed file: `20261010` – `20261016` are byte-identical to the hashes the release
record already carries.

## 1. The complete function surface the bundle creates (measured, not assumed)

Dumped from an isolated cluster after installing Batch 13 → `20261010` … `20261016` → the
exclusive-global policy step. The dependency graph below is derived from the function **bodies**;
`pg_depend` records nothing for plpgsql, so a graph built from it would show every function as a
leaf and "unreachable" would be a guess.

| # | Function | Signature | Mode | search_path | ACL (before the boundary) | eff. anon / authd | eff. svc | Runtime purpose | Classification |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `apply_lifecycle_update` | `p_targets jsonb` | DEFINER | pinned | {postgres=X/postgres,service_role=X/postgres} | false / false | true | the reviewed primitive: snapshot, authority decision, guarded write, outcome | REQUIRED — released path |
| 2 | `apply_lifecycle_update_sync` | `p_targets jsonb` | INVOKER | pinned | {postgres=X/postgres,service_role=X/postgres} | false / false | true | per-identity wrapper: takes one advisory key per linkage key | released, NOT used by the application (withdrawn from service_role) |
| 3 | `apply_lifecycle_update_sync_global` | `p_targets jsonb` | INVOKER | pinned | {postgres=X/postgres,service_role=X/postgres} | false / false | true | **the application's entry point**: one global advisory key, then the primitive | REQUIRED — released path |
| 4 | `b14ab_acquire_global_lock` | `p_shared boolean` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | takes the single global advisory key (shared or exclusive) | REQUIRED — the wrapper's and the trigger's INVOKER path |
| 5 | `b14ab_acquire_linkage_locks` | `p_old_customer text, p_old_subscription text, p_new_customer text, p_new_subscription text` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | per-identity lock helper (prototype path) | prototype — unreachable |
| 6 | `b14ab_install_trigger` | `p_kind text` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | Batch 14ab prototype trigger installer | prototype — unreachable |
| 7 | `b14ab_lifecycle_apply` | `p_old_customer text, p_old_subscription text, p_new_customer text, p_new_subscription text, p_seen_pks bigint[], p_plan text, p_status text` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | Batch 14ab prototype applier (with linkage sync) | prototype — unreachable |
| 8 | `b14ab_lifecycle_apply_nosync` | `p_old_customer text, p_old_subscription text, p_new_customer text, p_new_subscription text, p_seen_pks bigint[], p_plan text, p_status text` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | Batch 14ab prototype applier (no sync) | prototype — unreachable |
| 9 | `b14ab_linkage_global_key` | `()` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | immutable global key | REQUIRED — dependency of the lock helper |
| 10 | `b14ab_linkage_key` | `p_kind text, p_value text` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | immutable key for one (kind,value) | dependency of the per-identity path (not granted) |
| 11 | `b14ab_linkage_keys` | `p_old_customer text, p_old_subscription text, p_new_customer text, p_new_subscription text` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | key set for a linkage (prototype path) | prototype — unreachable |
| 12 | `b14ab_trg_row` | `()` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | Batch 14ab row-level trigger function | prototype — never installed |
| 13 | `b14ab_trg_stmt` | `()` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | Batch 14ab statement trigger function | prototype — never installed |
| 14 | `b14ac_install_trigger` | `p_mode text` | INVOKER | **unpinned** | {postgres=X/postgres} | false / false | false | the policy step: installs/removes the statement trigger ('shared'/'exclusive'/'none') | REQUIRED — operator only (policy step / rollback) |
| 15 | `b14ac_linkage_keys_for_payload` | `p_targets jsonb` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | keys for a payload's linkage (per-identity path) | dependency of the per-identity path (not granted) |
| 16 | `b14ac_trg_stmt_exclusive` | `()` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | **the installed trigger function** (exclusive global key) | REQUIRED — installed trigger function |
| 17 | `b14ac_trg_stmt_shared` | `()` | INVOKER | **unpinned** | <default: PUBLIC EXECUTE> | true / true | true | the shared-mode trigger function (not installed; supported for comparison) | retained — reachable only via install('shared') |

**Triggers:** `b14ac_stmt_trg` — BEFORE STATEMENT, INSERT **and** UPDATE, on both
`public.ut_members` and `public.profiles`, executing `b14ac_trg_stmt_exclusive()`, `tgenabled = 'O'`.
The Batch 14ab row-level and shared-mode triggers are **not** installed.

**Call graph (from the bodies):**

```
service_role → apply_lifecycle_update_sync_global (INVOKER)
                 ├─ b14ab_acquire_global_lock (INVOKER) ─ b14ab_linkage_global_key (INVOKER)
                 └─ apply_lifecycle_update (DEFINER)        [executes as postgres]

direct DML  → b14ac_trg_stmt_exclusive (INVOKER, fired)
                 └─ b14ab_acquire_global_lock ─ b14ab_linkage_global_key

operator    → b14ac_install_trigger (INVOKER)
                 ├─ b14ac_trg_stmt_exclusive
                 └─ b14ac_trg_stmt_shared

unreached   → b14ab_install_trigger ─ {b14ab_trg_row, b14ab_trg_stmt}
              b14ab_lifecycle_apply ─ b14ab_acquire_linkage_locks ─ b14ab_linkage_keys
              b14ab_lifecycle_apply_nosync      (called by nothing at all)
```

## 2. What the inventory exposed

1. **13 of the 17 functions carried the DEFAULT PUBLIC EXECUTE grant.** `anon`, `authenticated`
   and any role at all could call them — including `b14ab_acquire_global_lock()`, which takes
   the single global advisory key. An anonymous caller can take that key and hold it, which
   stalls every membership write for as long as it likes: a **denial-of-service lever, not a
   data leak** (Batch 13 had already withdrawn `anon`/`authenticated` table access, so the
   write-capable prototype appliers could not actually write). Exposure is still exposure.
2. **Two functions the RELEASED paths call were reachable by `service_role` ONLY through that
   PUBLIC grant** — `b14ab_acquire_global_lock` and `b14ab_linkage_global_key`, both on the
   INVOKER path of the wrapper *and* of the installed trigger function. **Closing PUBLIC
   without granting them would have broken every atomic RPC and every direct write with
   `42501`.** This is the finding that makes the grant in §3.2 load-bearing rather than tidy:
   the boundary is not "revoke everything", it is "revoke PUBLIC, then grant the closure".
   The focused gate proves both halves — including that revoking the grant again breaks the
   write (F1/F2).
3. **Seven prototype functions are unreachable from any released path** (§1, classes
   "prototype"). They are Batch 14ab's abandoned machinery.
4. **None of the helpers pinned `search_path`.** The three released functions did; the helpers
   and both trigger functions resolved names through whatever path the session had.
5. **The trigger functions are INVOKER and unpinned, yet their bodies call a helper.** So a
   direct write exercises a two-level INVOKER chain — which is why the *grant* (not just the
   revoke) decides whether direct writers work at all.

## 3. The boundary migration — `20261017_function_surface_boundary.sql`

A separate, final migration rather than edits to the reviewed files: the release record's
hashes and the reviewed primitive stay exactly as reviewed, and the surface decision is one
reviewable artifact.

### 3.1 What it does

| Step | Action |
|---|---|
| 1 | `revoke all … from public, anon, authenticated` on **all 17** bundle-owned functions — driven from an existence-guarded loop, because seven of them are dropped later in the same file and a bare `revoke` would make a second run fail |
| 2 | `grant execute … to service_role` on **exactly the release closure** (below) |
| 3 | `revoke` the per-identity variant from `service_role` (below) |
| 4 | `drop` the seven prototype functions — **RESTRICT, never CASCADE** |
| 5 | pin `search_path = pg_catalog, public` on the seven that lacked it |
| 6 | **assert** the resulting surface and `raise exception` if it is not exactly as intended |

### 3.2 The release closure — service_role gets exactly this

| Function | Why it is granted |
|---|---|
| `apply_lifecycle_update_sync_global(jsonb)` | the application's entry point (`ATOMIC_LIFECYCLE_RPC`) |
| `apply_lifecycle_update(jsonb)` | the wrapper is INVOKER, so its call to the DEFINER primitive is made **as service_role** |
| `b14ab_acquire_global_lock(boolean)` | INVOKER helper on the wrapper's path **and** on the installed trigger's path |
| `b14ab_linkage_global_key()` | INVOKER dependency of the lock helper |

Everything else is denied to `service_role`, including the withdrawn per-identity variant and
the operator-only installer (postgres keeps both).

### 3.3 The withdrawn per-identity entry point

`apply_lifecycle_update_sync(jsonb)` stays **defined** and stays callable by the superuser
operator, but `service_role` loses it. Reason: the released application calls the GLOBAL entry
point, and the per-identity variant **does not compose** with the installed exclusive-global
trigger (measured — `BATCH14AC` §3, D3c), so a future caller could silently reintroduce the very
race the wrapper exists to close. Withdrawing the grant makes the wrong tool unusable instead of
silently racy. It is one statement to restore:

```sql
grant execute on function public.apply_lifecycle_update_sync(jsonb) to service_role;
```

### 3.4 The excluded prototypes — and why exclusion is safe

| Dropped | Reached by |
|---|---|
| `b14ab_install_trigger(text)` | nothing (superseded by `b14ac_install_trigger`) |
| `b14ab_trg_row()`, `b14ab_trg_stmt()` | only `b14ab_install_trigger` — the abandoned row-level protocol, never installed by the bundle |
| `b14ab_lifecycle_apply(…)`, `b14ab_lifecycle_apply_nosync(…)` | nothing at all |
| `b14ab_acquire_linkage_locks(…)` | only `b14ab_lifecycle_apply` |
| `b14ab_linkage_keys(…)` | only `b14ab_acquire_linkage_locks` |

`b14ab_linkage_key(text,text)` is **kept** — it is a dependency of `b14ac_linkage_keys_for_payload`,
which the per-identity path uses — and `b14ac_trg_stmt_shared()` is kept because
`b14ac_install_trigger`'s `'shared'` branch references it.

Two consequences worth stating plainly:

* The prototype harness (`scripts/batch14ab-sync-harness.sh`) installs the bundle **without**
  this boundary, so its fixtures still exercise the prototype protocol. Nothing about that
  evidence changes; the boundary is the **production** step.
* Re-applying `20261013` recreates every dropped function (`create or replace`), so the
  exclusion is reversible by re-running the sequence.

### 3.5 Fail-closed, not best-effort

The final block asserts, and aborts the transaction if any of these is untrue: every retained
function exists with its **exact** identity arguments, is owned by `postgres`, has the pinned
`search_path`, has no `anon`/`authenticated`/PUBLIC `EXECUTE`, and has `service_role` EXECUTE
exactly where §3.2/§3.3 say; every prototype signature is gone; and **no other bundle-owned
function is present** (so a stray helper cannot hide from the gate).

Step 4 is `DROP` **without** `CASCADE`: if a trigger or another function still depends on one,
the migration **aborts**. The harness proves that with a deliberately dependent trigger (H1/H2)
and then proves the migration applies again once the dependent is gone (H3).

## 4. Evidence — isolated PostgreSQL 17

`scripts/batch14ay-surface-gate.sh` (PG17, unix socket, `listen_addresses` empty, private
cluster torn down) installs Batch 13 → the bundle → the policy step → the boundary, and asserts:

| Section | What it proves |
|---|---|
| A | the boundary applies cleanly **and re-applying it is a no-op** |
| B | the surface is exactly the ten retained functions — signature, mode, owner, pinned path, per-role EXECUTE, PUBLIC grant count — and all seven prototypes are absent |
| C | an **unrelated legacy function is untouched** (same ACL, still holding its default PUBLIC EXECUTE) |
| D | **denied calls**: `anon`, `authenticated` and a role holding only PUBLIC are refused on **all ten** functions, each with a function-level `42501` naming that function |
| E | **authorized paths**: as `service_role` the direct INSERT/UPDATE commit, the statement trigger fires, and the atomic RPC returns `(ut_members,updated,1,…)` and lands `initiate|active`; the withdrawn per-identity variant is refused for `service_role` and still runs for the operator; the installer's `'none'` / `'exclusive'` / `'shared'` modes work and an unknown mode is refused with `22023` |
| F | **the grant is load-bearing**: revoke it and the direct write fails with `42501`; restore it and the write succeeds |
| G | **the denial is load-bearing**: re-grant PUBLIC on a helper and a PUBLIC-only role can call it; revoke and it is refused again |
| H | **fail-closed**: a dependent trigger blocks the prototype `DROP` and the boundary aborts, naming the dependency |
| I | **coverage by measurement**: `track_functions=all` and `pg_stat_user_functions` report at least one completed call for **every** retained function (a call that raises is not counted, which is why the counter is reported as "completed calls") |

The same file runs unchanged on PostgreSQL 16 (`PGBIN=/usr/lib/postgresql/16/bin`) — see the
results table in the release record.

## 5. The corrected PUBLIC diagnostic

The postflight used to print, as INFORMATIONAL, the count of "other functions with PUBLIC
EXECUTE" while scoping its mandatory check to the four guarded functions. Both halves of that
were wrong: the informational row **included the bundle's own helpers**, so the surface this
release is responsible for was under-reported, and the mandatory check could never fail on the
helpers it was actually responsible for.

Now: `bundle_owned_functions_public_execute` is **mandatory** (`= 0`, over every function the
bundle creates) and `unrelated_functions_with_public_execute_informational` is scoped to
functions the bundle did **not** create — out of this release's authority, so not a gate, but
still reported so the exposure is visible instead of hidden.

## 6. Production aliases — read-only verification through Vercel

Recorded in full in `docs/BATCH14AX-RELEASE-PREPARATION.md` §8. In one line: both
`universal-transmissions.com` and `www.universal-transmissions.com` resolve to
**`dpl_F54o7a73ehL1ouHwMXzqhZ8ZNgRa`** (`READY`, target `production`), whose source SHA is
**`ac49ce062d66a49b0e4202a5e15755b930667bc3`** — the recorded production baseline, now measured
rather than inferred. Both live responses carry the identical `etag`.

## 7. Limits — what this batch does NOT claim

* **No production SQL was executed.** The boundary is validated in isolated clusters only.
* The isolated clusters are PostgreSQL **16.15 and 17**; production is 17.6. The **17** branch of
  the version-dependent privilege lists is exercised here (16 for the contrast), so the
  `MAINTAIN` path is no longer only a production claim.
* The **two production aliases are verified read-only**; nothing was deployed.
* The **denied-call** results are an isolated-database evidence class. They show what the ACLs
  do on a server configured like production, not what the production server does today.
* `b14ac_trg_stmt_shared` is retained although the released mode is `exclusive`; it is not part
  of the closure and is not granted to any application role.
