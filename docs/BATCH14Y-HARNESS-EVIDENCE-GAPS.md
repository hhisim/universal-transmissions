# Batch 14y — the two remaining harness evidence gaps

Baseline: `7831298aa055705cef7f2e45d34c153ce3967257` (`7831298`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, no integration, no release.**

The migration is **byte-identical** to the reviewed candidate — blob
`251d8e4c3a395bc0b73e64d51127955638c039f4`, unchanged. This pass touches the
harness and the review only. Synchronization is **not** implemented.

---

## 1. NEG3 corrected, and the two predicates isolated

**The gap.** NEG3 was `owns_key 9101 "${APP}-first-9101"` — it changed **both** the
key *and* the worker name relative to the known holder, so it could not
distinguish which filter was doing the work. A single assertion exercising two
filters at once proves neither.

**The correction.** NEG3 is now `owns_key 9101 "$NEGAPP"`:

| # | Assertion | Shape | Expect |
|---|---|---|---|
| NEG1 | the unrelated holder owns its own key | same worker, same key | 1 |
| **NEG3** | the known holder's name does **not** match a key it does not hold | **same worker, DIFFERENT key** | 0 |
| **NEG4** | the known key does **not** match a worker that does **not** hold it | **same key, DIFFERENT worker** | 0 |
| NEG5 | no waiter for that worker on a key nobody holds | same worker, different key | 0 |

NEG3 isolates **key** filtering; NEG4 isolates **worker** filtering. Neither can
pass because of the other.

### Mutation-checked independently

`scripts/batch14y-harness-mutations.sh` removes one filter at a time from
`owns_key`, runs the whole harness, requires the named assertion to fail, restores
the file from the bytes it read at start, and verifies the restore by sha256.

```
harness sha256 (original): fb07130a08a1c0306d19c4e85b2419cde0d64bc14ebf172e1d0ba18a8b6bba6e

=== control: no mutation ===
control: exit=0 | assertions passed: 140 | assertions failed: 0
control clean OK

=== MU-KEY: remove the key filter -> NEG3 must fail ===
  mutated sha256: a16317dc8f3f091649982dd8fb0390c70cd14a2cc7fca5091da97df33c55e027
  run: exit=1 | assertions failed: 1
  DETECTED: 'NEG3 the KNOWN HOLDER's name does not match a key it does not hold' failed as required
  restore: hash verified (fb07130a…)

=== MU-WORKER: remove the worker filter -> NEG4 must fail ===
  mutated sha256: 019a6ba879d837d6d1a1030bd48078f187a56d9860a18b914f40e40235a898b6
  run: exit=1 | assertions failed: 1
  DETECTED: 'NEG4 the KNOWN KEY does not match a worker that does not hold it' failed as required
  restore: hash verified (fb07130a…)

harness sha256 (final): fb07130a08a1c0306d19c4e85b2419cde0d64bc14ebf172e1d0ba18a8b6bba6e
harness is byte-identical to the original
mutations detected: 2 / mutations missed: 0 / restores failed: 0
```

Each mutation produced **exactly one** failing assertion — the one predicted.
That is the strongest available evidence that the two predicates are independent
rather than jointly satisfied: removing either breaks only its own control.

---

## 2. Reverse-order controls for BOTH absence races

R1 and R2 reproduce the races in one ordering: the re-location runs first, the
competing writer commits afterwards, and the call reports `absent` and misses the
row. The reverse ordering — **the competing writer commits before the
re-location** — was untested. With the original *empty* snapshot, the call must
now reject `NEWLY_LINKED` and leave the competing writer's committed state intact.

Ordering here is enforced by **sequencing, not by a barrier**, which is stronger
for this direction: the writer runs to completion, its **exit 0** is asserted, and
its **committed state is asserted in the database** — all before the primitive is
invoked. There is no window in which the ordering could be otherwise.

| Case | Competing writer | Asserted |
|---|---|---|
| **R3** | a matching **INSERT** | writer exits 0; state committed before the call; the call is **rejected** naming `NEWLY_LINKED`; the inserted row is **preserved** |
| **R4** | an existing row **relinked** | writer exits 0; state `guest/canceled/cus_1/sub_A` committed before the call; the call is **rejected** naming `NEWLY_LINKED`; that state is **preserved** |

Both writers run under their own `application_name`, and each worker's outcome
(exit status and reported result) is recorded. Together with R1/R2 this gives both
completion orders for both races:

| Race | re-location first (RPC misses it) | writer commits first (call rejects) |
|---|---|---|
| matching INSERT appears | **R1** — `absent`, row unseen | **R3** — `NEWLY_LINKED`, row preserved |
| existing row becomes linked | **R2** — `absent`, relink unseen | **R4** — `NEWLY_LINKED`, relink preserved |

---

## 3. Corrections to the Batch 14x review

| Batch 14x said | Corrected |
|---|---|
| "Three consecutive clean runs, **so the barriers are not flaky**" | Three clean runs were **observed**. That is evidence of stability across those runs; it is **not** a general claim that the harness cannot be flaky, and three runs support no statistical statement about a flake rate. The claim is withdrawn as stated. |
| "R1/R2 and CON1/CON2 were re-run in **both orders**" | Only **CON** has two orderings, now named: **CON1** = `free` commits first then `guest`; **CON2** = `guest` first then `free`. **R1 and R2 are not two orders of one test** — each reproduces a *different* race in the *same* ordering. The reverse ordering for both races is R3/R4 (§2). |
| NEG3 "…the key-specific check is not satisfied by that key" | NEG3 changed both the key and the worker. Corrected in §1 to isolate key filtering, with NEG4 the complementary control. |

All three are marked in place in `docs/BATCH14X-BARRIER-SPECIFICITY.md`.

---

## 4. Results

```
clean run: 140 assertions passed / 0 failed / exit 0      (was 130 before R3/R4 and the NEG3 change)
mutation check: 2 detected / 0 missed / 0 restores failed / exit 0
```

Run against the identical SQL blob `251d8e4c…` throughout. **Unchanged SQL
evidence is reused, not re-derived**: the A–J, V, N and F section results recorded
at `19b240a` still stand, since the migration bytes are the same; they are simply
re-executed as part of each run.

Statement-level database evidence (this harness) remains separate from handler
evidence (`batch14t`). No integration is demonstrated, because no application code
calls the primitive.

---

## 5. Still outstanding — unchanged and separate

1. **Independent review of the primitive** — the next step; this batch stops for it.
2. Synchronization decision: (A) cooperative or (B) trigger, and for (B) the
   isolated concurrency evidence it needs before anyone may claim it works. **Not
   implemented here.**
3. `invoice.payment_succeeded` — separate review.
4. Unlinked-row authority — held; `batch14s` stays committed red.
5. Unique-index migration hardening and independent review — prepared, not applied.
6. SELECT-only production verification — not performed.
7. Separately authorized SQL application, then an exact-SHA application release.

No production authorization is granted.
