# Batch 14ac — synchronization validated against the REVIEWED RPC

Baseline: `7733dbba6c00b6255f0bb9be617c3fa6fe72d973` (`7733dbb`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, application integration, or production-policy
selection.** The reviewed migration `20261012_apply_lifecycle_update.sql` is loaded
**byte-identical** and is never redefined. The synchronization layer is a
**separate** file; the key helpers are a third.

**Result: 89 assertions passed / 0 failed, exit 0.**

---

## 1. What was built

| File | Role |
|---|---|
| `20261012_apply_lifecycle_update.sql` | the reviewed RPC — **unchanged**, applied as-is |
| `20261013_lifecycle_linkage_sync.sql` | key helpers (per-identity keys, global key) |
| `20261014_lifecycle_sync_wrapper.sql` | **the sync wrapper + trigger candidates** |
| `scripts/batch14ac-rpc-sync-harness.sh` | this experiment |

Three entry points exist, all layered over the reviewed RPC without modifying it:

- `apply_lifecycle_update(p_targets)` — the reviewed RPC alone (the **baseline**).
- `apply_lifecycle_update_sync(p_targets)` — per-identity keys, then the RPC.
- `apply_lifecycle_update_sync_global(p_targets)` — the **single global key**, then
  the RPC. This exists because the trigger candidates take the global key, and a
  per-identity writer does not hold it.

## 2. Experiment discipline

- **Every psql invocation runs `ON_ERROR_STOP=1`.** A failing statement aborts the
  script, so a `\!` completion marker can only be written **after a successful
  COMMIT**. Worker exit statuses are captured to per-worker files and asserted.
- **No timing assumptions.** A holder is released only after the harness has
  **observed** that the specific waiter is blocked **by the expected backend** **on
  the expected advisory key** (`pg_locks` ungranted advisory entry on that exact
  `(classid, objid)` + `pg_blocking_pids` naming the expected backend). On the
  baseline path the gate is the competing writer's own post-COMMIT marker. Waits
  are bounded, and a bound that expires fails the case and preserves diagnostics.
- **The deadlock case assumes nothing about the victim**: it asserts the named
  SQLSTATE, that exactly one transaction was aborted, and that exactly one
  survived and committed.

### Two harness defects found by that discipline — reported, not hidden

1. **`wait_rc` inside `$(...)`.** `wait` only works for a child of the *current*
   shell; called from a command substitution it ran in a subshell, returned
   immediately, and reported a status file that had not been written yet — so
   workers were reported as failing when they had succeeded. This is the **same
   lesson as Batch 14aa** (a subshell changes who owns the child) and it was
   reintroduced here. The helper now sets a global instead.
2. **Vacuous relink fixtures.** The first version of the race driver always seeded
   the standard fixture, which **wiped the unlinked rows** the relink races needed.
   The "relink" cases therefore ran an `UPDATE` matching **zero rows** and passed
   green. Every race case now asserts that the competing writer actually did
   something — the unlinked row really was relinked, or the competing INSERT really
   landed — so a no-op can no longer pass.

> **Correction (Batch 14ad).** Two further defects in this harness were found
> afterwards and are corrected in the committed file:
>
> - **`q()` did not return its real SQL exit status.** It printed through `printf`
>   and therefore returned `printf`'s status, so any `if q ...` tested `printf`
>   rather than the statement. The assertions here read `$QRC` explicitly in the
>   places that mattered, so the results below stand, but any status-based branch
>   would have been wrong. Fixed in Batch 14ad.
> - **`wait_blocked` masked the advisory key without accounting for the sign.**
>   `hashtextextended` can return a negative bigint and `pg_locks.classid` is an
>   unsigned oid, so `(key >> 32)` never matched for such keys. **This can only
>   produce a false negative** — the check fails loudly and the case is reported as
>   a FAIL — so it cannot have manufactured any passing block-observation here.
>   Every blocked-path assertion in this batch passed, which means the comparison
>   matched and the blocks were genuine. Fixed in Batch 14ad.

## 3. Results

### Setup
Cluster up; **no TCP listener** (asserted); schema and the three roles created; the
reviewed migration applied; **the reviewed file's hash unchanged by applying it**;
the key helpers present (the wrapper's declared dependency asserted, not assumed).

### E — errors fail the experiment (5)
A clean script exits 0; a failing statement exits **non-zero** under
`ON_ERROR_STOP`; the failure names its **SQLSTATE**; the failing script's marker is
**absent** because its `COMMIT` never ran; the successful script's marker is
**present** and follows its `COMMIT`.

### B — the races, on BOTH tables (44 assertions across 8 cases)

Each race is run twice against the same cluster: **baseline** (the reviewed RPC
alone) and **wrapper**, with the competing writer taking the key only in the
wrapper case.

| Case | Table | Race | Baseline | Wrapper |
|---|---|---|---|---|
| B1 | `ut_members` | matching INSERT | writer **committed inside the window** | **blocked**, no commit inside |
| B2 | `ut_members` | relink of an unlinked row | writer **committed inside the window** | **blocked** |
| B3 | `profiles` | matching INSERT | writer **committed inside the window** | **blocked** |
| B4 | `profiles` | relink of an unlinked row | writer **committed inside the window** | **blocked** |

Every wrapper case additionally asserts the block was observed against the
**expected backend on the expected key**, that no gate timed out, that both
transactions still committed cleanly, and that the competing writer's **committed
state survives** (the relinked row really carries the new linkage; the inserted
row really landed). So the races are reproduced *and* prevented, on both tables,
for both race shapes — **for participating writers**, which is the limit D1 of
Batch 14ab already named and D3c re-confirms below.

### W2 — the writer-first fixture, fixed (7)

The earlier fixture was wrong: it seeded a row and then called with an **empty**
`seen_pks`, so the "rejection" fired against a pre-existing row, not a new one.

The corrected fixture: **two** pre-existing matching rows are seeded and **both**
are in `seen_pks`; that call is **accepted** (`updated:2`) as the fixture's own
baseline. Then **one new matching row** appears. The call is now rejected as
`NEWLY_LINKED`, and the rejection **names the offending row** in its `located`/`seen`
detail (W4) — so the rejection is attributable to the newcomer.

The rejection's **dependence on the new row** is then proven by control: adding the
newcomer to `seen_pks` (with guards brought up to current state) makes the call
**accepted** (`updated:3`). And the rejected call **wrote nothing** — the newcomer
keeps its own values.

A **genuinely absent** linkage — no matching row at all, with other rows present —
returns `absent` with no error (W7).

### RB — atomic rollback preserved (3)

A two-target call whose **second** target's snapshot no longer matches its located
set fails the whole call with `NEWLY_LINKED`, the **first** target's write is
**rolled back** with it, and the second target is untouched. The wrapper layers over
the RPC without weakening its all-or-nothing property.

### D3 — the trigger candidate and direct writers (3 cases)

With the **shared** statement trigger installed, a direct SQL writer that takes **no
key of its own** is **blocked** by the trigger — on **both** `ut_members` and
`profiles`.

**D3c is the important negative result, asserted rather than glossed:**
`apply_lifecycle_update_sync` (per-identity keys) does **not** compose with the
trigger. The trigger takes the **global** key; a per-identity writer holds only the
linkage key; they do not contend, and the direct writer **commits inside the
window**. The trigger can only cover non-participants if the RPC path takes the
**same global key** — which is exactly what `apply_lifecycle_update_sync_global`
does, and why that variant exists.

### U — the shared-lock upgrade case (8)

Two transactions each perform membership DML on **disjoint** rows (the trigger's
shared key is taken for each), then each requests the **exclusive** key before
committing.

| Variant | Outcome |
|---|---|
| **shared** statement trigger | **DEADLOCK** — the upgrade from shared to exclusive deadlocks two holders against each other |
| **exclusive** statement trigger | **NO deadlock** — a second writer cannot hold it at all, so no upgrade is possible |

Asserted: **exactly one** transaction is the deadlock victim; the victim reports
SQLSTATE **`40P01`**; **exactly one** transaction survived and committed; the
survivor's own write is present.

**The victim is not assumed.** Observed across four runs: **t1, t2, t1, t2** — it
genuinely varies. Any assertion that named a victim in advance would have been
flaky, and the harness deliberately does not.

## 4. Corrections to the Batch 14ab review

| Batch 14ab said | Corrected |
|---|---|
| "`pg_locks` shows a tuple lock only for `SELECT … FOR UPDATE`; a plain `UPDATE`'s row lock is not represented there." | **Wrong, withdrawn.** PostgreSQL's ordinary row-level locks are **not in `pg_locks` at all** — they live in the tuple header (`xmax`/infomask), so they are invisible to the lock catalogue whether taken by `SELECT … FOR UPDATE`, `UPDATE`, or `DELETE`. What `pg_locks` can show as `locktype='tuple'` is a separate, narrower tuple lock. The visibility question is **not** "SELECT FOR UPDATE versus UPDATE". |
| "The row-trigger protocol FAILS" (stated generally) | Narrowed to the **schedules actually tested**: in the interleaving exercised, a deadlock was detected. Other interleavings were not enumerated and are not claimed. |
| "The simpler alternative holds" | Narrowed likewise to the **orderings exercised in that harness**. |

Both edits are marked in place in `docs/BATCH14AB-LINKAGE-SYNCHRONIZATION.md`.

---

## 5. What this does NOT establish

- **No production policy is chosen.** The candidates now have measured trade-offs:
  per-identity keys are precise but **cooperative** and do **not** compose with a
  global-key trigger; the global key covers non-participants but is **coarse**; the
  **shared** global trigger **deadlocks on upgrade**; the **exclusive** global
  trigger does not, but serialises every linkage write.
- The reviewed RPC's own absence races remain **unfixed in production** — nothing
  here is applied or wired in.
- The harness is synthetic (private cluster, synthetic rows) though it now loads the
  **real** two-table schema and the **real** reviewed RPC, and uses the RPC's actual
  payload contract, located-set validation and exact-coverage rules rather than a
  `LIMIT 1` stand-in.
- `invoice.payment_succeeded`, unlinked-row authority, index hardening and
  production verification remain separate and untouched.

## 6. Harness safety

Private cluster, private unix socket, **no TCP listener** (asserted), torn down at
the end. Verified after the run: **no run directories left, no live cluster, disk
unchanged**. Failure diagnostics are copied to `/var/tmp/b14ac-diag-<ts>` **before**
teardown and the path is printed; the mechanism fired during development (six
preserved directories from the failing iterations remain).

---

## 7. Still outstanding — unchanged and separate

1. **Independent review of the reviewed RPC primitive** — still the gating step.
2. **The synchronization policy choice** — now informed by measurement, still not
   made.
3. `invoice.payment_succeeded` — separate review.
4. Unlinked-row authority — held; `batch14s` stays committed red.
5. Unique-index migration hardening and independent review — prepared, not applied.
6. SELECT-only production verification — not performed.
7. Separately authorized SQL application, then an exact-SHA application release.

No production authorization is granted.
