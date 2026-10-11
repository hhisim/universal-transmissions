# Batch 14aa — child ownership and verified interruption cleanup

Baseline: `1c4282f1a57fac646ad99d029fa5943f90c8ee83` (`1c4282f`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, no integration, no release.** The migration
(blob `251d8e4c3a395bc0b73e64d51127955638c039f4`) and the accepted controls
(`owns_key` / `waits_key` / `pg_blocking_pids`, and the F/V/N sections) are
unchanged, as is the tracked harness. Synchronization is **not** implemented.

---

## 1. The bug: the parent never owned the run

```bash
run_harness() { timeout 600 bash "$h" "$sql" >"$BASE/run.out" 2>&1 & CHILD=$!; wait "$CHILD"; }
...
out=$(run_harness "$copy")      # <-- command substitution = a SUBSHELL
```

Two faults, one of them fatal:

1. **`$(...)` runs `run_harness` in a subshell.** `CHILD=$!` set the PID inside
   that subshell; the parent's `CHILD` stayed empty. The cleanup trap's
   "terminate the child" step therefore had **nothing to signal** — it could not
   have worked even in principle.
2. The immediate child was the **`timeout` wrapper**, not the harness, so even a
   correct `CHILD` would have identified the wrapper rather than the work.

The conclusion in the 14z review — that the runner "terminates any child harness
run" — was an **untested claim**.

## 2. The fix

- `run_harness` is now called **directly in the parent shell**. It publishes its
  results through globals — `RUN_RC` and `RUN_LOG` — and the callers read those
  instead of capturing stdout, so **no command substitution survives**.
- **No `timeout` wrapper.** The parent launches `bash "$h" "$sql"` itself, so
  `$!` is the **harness process**, and `wait` returns the **harness's own status**
  rather than a wrapper's.
- **`set -m`** gives each background job its **own process group**, whose leader
  is that same PID. `kill -TERM -"$CHILD"` therefore reaches the harness *and*
  everything it spawned (its psql clients, its postgres cluster).
- The child PID is published to `$BASE/child.pid` while a run is in flight, and
  removed when it finishes — this is what lets the interruption test name the
  specific worker instead of guessing.
- The wait is **bounded** by `RUN_TIMEOUT` (600 s default) with a `child_alive`
  check that reads `/proc` and treats a `Z` state as dead, so a finished-but-
  unreaped process is never mistaken for a live one. On deadline the parent
  terminates the group, waits `CHILD_DEADLINE` (10 s), then escalates to SIGKILL

  and reports exit **124**.

## 3. Cleanup: terminate, verify, then remove

`cleanup` now does the steps **in that order**:

1. if the owned child is alive, signal its **process group** with SIGTERM;
2. **wait, bounded, for it to actually be gone** — up to `CHILD_DEADLINE` — and
   escalate to SIGKILL if it is not;
3. only *then* remove the workspace and the pointer;
4. exit with the status it was given: a normal exit keeps its status, a signal
   exits `128 + signum`.

It is **restricted to this run**: the pointer is removed only if it still names
*this* invocation's workspace, and the workspace removed is the one this
invocation created under `mktemp -d`.

This ordering is the point. Removing a workspace out from under a run that is
still writing to it was the previous behaviour's silent hazard.

## 4. The strengthened interruption test

The test now **asserts** each of these; before, four of them were merely printed:

| # | Assertion |
|---|---|
| 1 | the runner reached a phase where a **mutated run is executing** |
| 2 | the runner **published the PID of the worker it owns** |
| 3 | that worker **is RUNNING** at the moment of interruption |
| 4 | that worker is running **the mutated copy** (by `cmdline`) |
| 5 | the in-flight copy is **mutated** — its hash differs from the tracked bytes |
| 6 | the runner **did not exit 0** |
| 7 | the runner exited **143** (`128 + SIGTERM`) |
| 8 | **the owned worker TERMINATED** within the cleanup budget |
| 9 | the **workspace was removed** |
| 10 | the **discovery pointer was removed** |
| 11 | the tracked harness is **byte-identical** |
| 12 | **negative control:** the SIGTERM-ignoring worker **is RUNNING** before the check |
| 13 | **negative control:** it **is rejected** by the same termination check |
| 14 | the same check reports a **SIGKILLed** worker as gone (the check can also pass) |

Fourteen assertions in total — the count the run reports. The review as first
committed in this batch listed thirteen, having omitted row 12; corrected here.

### Results

```
tracked harness sha256 BEFORE: fb07130a08a1c0306d19c4e85b2419cde0d64bc14ebf172e1d0ba18a8b6bba6e
cleanup deadline:              10s (termination budget 20s)
phase at interruption:         mutated:key:running
owned worker pid:              4181392
owned worker cmdline:          bash .../harness.MU-key.sh /root/b14u/supabase/migrations/20261012_apply_lifecycle...
--- sending SIGTERM to the runner (pid 4178778); this is the only signal tested ---
runner exit status:            143
  OK: the owned worker terminated within the cleanup budget
  OK: the workspace was removed
  OK: the discovery pointer was removed
tracked harness sha256 AFTER:  fb07130a08a1c0306d19c4e85b2419cde0d64bc14ebf172e1d0ba18a8b6bba6e
=== NEGATIVE CONTROL: a worker that IGNORES SIGTERM must be REJECTED ===
  OK: the termination check REJECTED the SIGTERM-ignoring worker (alive after 2s)
  OK: the same check reports a SIGKILLed worker as gone
assertions passed: 14
assertions failed: 0
BATCH14Z_INTERRUPTION_TEST_PASSED
```

The negative control is deliberately built so the check *cannot* pass by accident:
the control worker sets `SIG_IGN` for TERM and `exec`s, so the disposition
survives the exec and SIGTERM is genuinely ignored. The check reports it as
**still alive**, which is the rejection the requirement asks for, and the same
check then reports it gone after SIGKILL — so we know it can distinguish the two.

### Scope of what is actually tested

**Only SIGTERM, only against a runner-launched run.** The runner traps INT and
HUP as well; those combinations are **not** tested here and no claim is made about
them.

## 5. Re-run against the unchanged migration

With the rebuilt ownership model, the control and both mutations reproduce
exactly:

```
=== the explicit migration path is load-bearing ===
  OK: a copy with no explicit path REFUSES (exit=2)
=== control: a PRISTINE COPY, unmutated, with the explicit path ===
  copy is the exact original bytes
control: exit=0 | assertions passed: 140 | assertions failed: 0
=== MU-KEY ===   mutated COPY a16317dc… | exit=1 | assertions failed: 1 | NEG3 DETECTED
=== MU-WORKER === mutated COPY 019a6ba8… | exit=1 | assertions failed: 1 | NEG4 DETECTED
tracked harness sha256 AFTER:  fb07130a…  (byte-identical; never written to)
mutations detected: 2 / missed: 0 / tracked harness modified: 0
BATCH14Y_HARNESS_MUTATIONS_PASSED
```

The mutated copy hashes are identical to Batch 14y's, so the same experiments ran
— now on a parent-owned child whose termination is verified.

## 6. Corrections to the Batch 14z review

| Batch 14z said | Corrected |
|---|---|
| "INT, TERM and HUP run the cleanup trap … and any child harness run is terminated" | At `1c4282f` that was **untested and inoperable**: the child PID was recorded in a subshell, so the parent had nothing to signal. Corrected in place. |
| "Cleanup removed the workspace and the pointer, and no harness process survived" | Those two clauses were **printed, not asserted**. The five assertions proved **file preservation and an eventual 143** — not child termination. Now asserted, with a negative control. |
| *(implied coverage of INT/TERM/HUP)* | Only **SIGTERM** against a **runner-launched** run is tested. Stated explicitly. |

---

## 7. Still outstanding — unchanged and separate

1. **Independent review of the primitive** — the next step.
2. Synchronization decision: (A) cooperative or (B) trigger, and the isolated
   concurrency evidence (B) needs before anyone may claim it works. **Not
   implemented.**
3. `invoice.payment_succeeded` — separate review.
4. Unlinked-row authority — held; `batch14s` stays committed red.
5. Unique-index migration hardening and independent review — prepared, not applied.
6. SELECT-only production verification — not performed.
7. Separately authorized SQL application, then an exact-SHA application release.
8. **Separate follow-up:** the harness's cluster-directory leak (~39 MB per run);
   deliberately not fixed here, since it would change the harness hash this
   chain of evidence is anchored to.

No production authorization is granted.
