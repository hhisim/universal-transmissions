# Batch 14z — an interruption-safe mutation runner

Baseline: `6c22f234e74afc0dd066eebbedfe420e24ae30d5` (`6c22f23`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, no integration, no release.** The migration
is unchanged (blob `251d8e4c3a395bc0b73e64d51127955638c039f4`), and the SQL and the
NEG/reverse-order tests are untouched. Synchronization is **not** implemented.

---

## 1. The gap this closes

The mutation runner mutated the **tracked** harness in place and restored it
afterwards:

```
mutate $HARNESS  ->  run  ->  cp backup $HARNESS  ->  verify sha256
```

The verify step made a *successful* restore checkable, but it could not make one
**guaranteed**. Between the mutation and the restore the tracked artifact was
mutated on disk, and a SIGKILL, a crash, or a host failure in that window would
have left it that way — the exact artifact the whole review chain depends on.

## 2. The change

The runner now **never writes to the tracked harness at all**:

- each mutation is applied to a **disposable copy** under a private
  `mktemp -d /var/tmp/b14z-mut-XXXXXX` workspace;
- every mutation **starts from the exact original bytes**, re-read from the
  tracked file immediately before the copy is made;
- the copy is run with the **original migration path passed explicitly** as `$1`,
  because a copy's own `$ROOT` resolves to the temp parent where no migration
  exists;
- the tracked harness is only ever **read**, and its sha256 is verified **before**
  and **after** the whole run;
- there is **no restore step**, because there is nothing to restore.

The named-failure checks are unchanged: each mutation must still produce a
non-zero exit *and* the specific named assertion, or it counts as missed.

### The explicit path is load-bearing, and that is checked

A copy that is not given a migration path falls back to its own `$ROOT` and finds
nothing. The runner asserts that a copy with no usable path **refuses** rather
than silently doing nothing:

```
=== the explicit migration path is load-bearing ===
  OK: a copy without the explicit path refuses (exit=2)
```

## 3. Cleanup, and exactly what it guarantees

```
trap 'cleanup $?'            EXIT
trap 'cleanup $((128 +  2))' INT
trap 'cleanup $((128 + 15))' TERM
trap 'cleanup $((128 +  1))' HUP
```

`cleanup` un-traps itself first, terminates any running child harness, removes the
workspace and the discovery pointer, then exits with the status it was given. The
status is **preserved**: a normal exit keeps whatever the script was returning, and
a signal exits `128 + signum` (130 INT, 143 TERM, 129 HUP) rather than being
flattened to 0 by the handler.

**Guaranteed on interruption:**

- INT, TERM and HUP run the cleanup trap — the workspace and the discovery pointer
  are removed, and any child harness run is terminated.
- The exit status is `128 + signum`, so an interrupted run is never reported as a
  success.

**NOT guaranteed — stated plainly, not hand-waved:**

- SIGKILL, a segfault, an OOM kill, or the host disappearing run no trap. In those
  cases the temp workspace and pointer may be left behind, and a copy of the
  harness may remain on disk.
- Cleanup of the *child* relies on the child's own traps after a TERM; a child
  killed with SIGKILL would leave its postgres cluster directory behind.

**The tracked harness is unaffected in every one of those cases**, because the
runner never opens it for writing. That is the property this batch is for: the
worst outcome of a hard kill is a stale temp directory, never a corrupted tracked
artifact. The reported leftovers are in §5.

## 4. The interruption test

`scripts/batch14z-interruption-test.sh` does not take the safety property on
trust. It:

1. records the tracked harness sha256;
2. starts the runner and waits for its discovery pointer, then waits until the
   phase marker shows a **mutated copy is actually executing**;
3. confirms the in-flight copy's sha256 **differs** from the tracked bytes — i.e.
   the interruption really lands inside a mutated run;
4. sends **SIGTERM**;
5. requires the runner to exit **non-zero**, specifically **143**;
6. re-hashes the tracked harness and requires it **byte-identical**;
7. reports what cleanup removed and what it did not.

```
tracked harness:               /root/b14u/scripts/batch14u-rpc-harness.sh
tracked harness sha256 BEFORE: fb07130a08a1c0306d19c4e85b2419cde0d64bc14ebf172e1d0ba18a8b6bba6e
runner workspace:              /var/tmp/b14z-mut-VAqkOc
phase at interruption:         mutated:key:running
in-flight copy:                /var/tmp/b14z-mut-VAqkOc/harness.MU-key.sh
in-flight copy sha256:         a16317dc8f3f091649982dd8fb0390c70cd14a2cc7fca5091da97df33c55e027

--- sending SIGTERM to the runner (pid 4159391) ---
runner exit status:            143
tracked harness sha256 AFTER:  fb07130a08a1c0306d19c4e85b2419cde0d64bc14ebf172e1d0ba18a8b6bba6e

=== what cleanup did, and did not, remove ===
  workspace removed
  discovery pointer removed
  postgres cluster dirs left in /var/tmp: 58
  runner workspaces left in /var/tmp:     0
  harness processes still running:        0

assertions passed: 5
assertions failed: 0
BATCH14Z_INTERRUPTION_TEST_PASSED
```

Three facts carry the claim:

1. the interruption landed with a **mutated copy in flight** — the phase marker
   read `mutated:key:running` and the running copy hashed `a16317dc…`, which
   differs from the tracked `fb07130a…`;
2. the runner exited **143** (`128 + SIGTERM`) — the interruption was not
   swallowed;
3. the tracked harness re-hashed **byte-identical** after the kill.

Cleanup removed the workspace and the pointer, and no harness process survived.

---

## 4a. Finding: the harness leaks its cluster directory (reported, not fixed here)

The test reported **58** leftover `b14u-pg-*` directories in `/var/tmp`. They are
**stopped clusters — data directories only** (no `postmaster.pid`, no postgres
process). `scripts/batch14u-rpc-harness.sh` stops its cluster in its `EXIT` trap
but never removes the data directory, so every run of this harness — and every
mutation run, which starts several — leaves ~39 MB behind.

Measured across this session: **61 directories, 2.4 GB**, on a filesystem that was
**91 % full with 7.0 GB free**. That is a genuine leak, not a cosmetic one.

- **Cleaned up now:** all stale `b14u-pg-*`, `b14y-mut-*` and `b14z-mut-*`
  directories were removed — **2368 MiB reclaimed**, filesystem 91 % → 88 %,
  7.0 GB → 9.3 GB free.
- **Not fixed in this pass:** removing the data directory is a one-line addition to
  the harness's own `cleanup()`, but it would change the harness hash
  (`fb07130a…`), invalidating the hashes and evidence this batch reports. The
  harness is accepted on source review, so it is left byte-identical and this is
  recorded as a **follow-up** for a pass where re-hashing is expected.

## 5. Re-run against the unchanged migration

```
tracked harness sha256 BEFORE: fb07130a08a1c0306d19c4e85b2419cde0d64bc14ebf172e1d0ba18a8b6bba6e
migration passed explicitly:   .../supabase/migrations/20261012_apply_lifecycle_update.sql
disposable workspace:          /var/tmp/b14z-mut-yygqUQ

=== the explicit migration path is load-bearing ===
  OK: a copy with no explicit path REFUSES (exit=2)

=== control: a PRISTINE COPY, unmutated, with the explicit path ===
  copy is the exact original bytes
control: exit=0 | assertions passed: 140 | assertions failed: 0
control clean OK

=== MU-KEY: remove the key filter -> NEG3 must fail ===
  mutated COPY sha256: a16317dc8f3f091649982dd8fb0390c70cd14a2cc7fca5091da97df33c55e027
  run: exit=1 | assertions failed: 1
  DETECTED: 'NEG3 the KNOWN HOLDER's name does not match a key it does not hold' failed as required
  tracked harness untouched (hash matches)

=== MU-WORKER: remove the worker filter -> NEG4 must fail ===
  mutated COPY sha256: 019a6ba879d837d6d1a1030bd48078f187a56d9860a18b914f40e40235a898b6
  run: exit=1 | assertions failed: 1
  DETECTED: 'NEG4 the KNOWN KEY does not match a worker that does not hold it' failed as required
  tracked harness untouched (hash matches)

=== final state ===
tracked harness sha256 AFTER:  fb07130a08a1c0306d19c4e85b2419cde0d64bc14ebf172e1d0ba18a8b6bba6e
tracked harness is byte-identical to the original (it was never written to)

mutations detected: 2 / missed: 0 / tracked harness modified: 0
BATCH14Y_HARNESS_MUTATIONS_PASSED
```

The two mutated copies hash **exactly** as they did in Batch 14y
(`a16317dc…`, `019a6ba8…`), which also confirms the copies are byte-identical to
what the previous in-place method produced — the same experiments, on a
throwaway file this time. Each still produces **exactly one** failing assertion.

The control runs a **pristine copy**, not the tracked file, so the tracked harness
is never executed either — only read, for hashing.

## 6. Corrections to the Batch 14y review

| Batch 14y said | Corrected |
|---|---|
| the runner "restores the file from the bytes it read at start, and verifies the restore by sha256" | It **wrote to the tracked harness**. The verification made a successful restore *checkable*, not *guaranteed*; a hard kill inside the mutate window would have left the tracked artifact mutated. Marked in place in `docs/BATCH14Y-HARNESS-EVIDENCE-GAPS.md`. The 14y **results** stand — the mutations were detected — and the 14z re-run reproduces them with the safe method. |

---

## 7. Still outstanding — unchanged and separate

1. **Independent review of the primitive** — the next step; this batch stops for it.
2. Synchronization decision: (A) cooperative or (B) trigger, and for (B) the
   isolated concurrency evidence it needs before anyone may claim it works. **Not
   implemented here.**
3. `invoice.payment_succeeded` — separate review.
4. Unlinked-row authority — held; `batch14s` stays committed red.
5. Unique-index migration hardening and independent review — prepared, not applied.
6. SELECT-only production verification — not performed.
7. Separately authorized SQL application, then an exact-SHA application release.
8. **Follow-up (§4a):** add data-directory removal to the harness's own `cleanup()`
   so it stops leaking ~39 MB per run. Deliberately **not** done in this pass,
   because it would change the harness hash this batch's evidence is anchored to.

No production authorization is granted.
