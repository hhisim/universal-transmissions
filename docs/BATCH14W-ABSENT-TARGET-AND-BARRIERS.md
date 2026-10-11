# Batch 14w — absent-target validation and corrected race evidence

Baseline: `1bab2f739e3818a6da718a7709ad5f693a169fbd` (`1bab2f7`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, no application integration, no release.**
`src/` is untouched: the primitive remains unwired and is still a review
candidate.

---

## 1. The absent-target bypass, reproduced first

`absent` was implemented as an **early return** placed *before* the payload
validation, so an empty linkage short-circuited the whole contract: `entries`
was never even required to be an array.

Run against the Batch 14v SQL — **91 passed / 10 failed**, every failure in the
new section:

```
FAIL: F1 an absent ut_members target with NON-ARRAY entries is refused (rc=0, out=ut_members:absent:0)
FAIL: F2 an absent ut_members target with STRING entries is refused (rc=0, out=ut_members:absent:0)
FAIL: F3 an absent ut_members target with an entry OUTSIDE its empty set is refused (rc=0, out=ut_members:absent:0)
FAIL: F4 an absent ut_members target with a pk-less entry is refused (rc=0, out=ut_members:absent:0)
FAIL: F5 an absent ut_members target with REPEATED pks is refused (rc=0, out=ut_members:absent:0)
FAIL: F6 an absent profiles target with NON-ARRAY entries is refused (rc=0, out=profiles:absent:0)
FAIL: F7 an absent profiles target with an entry OUTSIDE its empty set is refused (rc=0, out=profiles:absent:0)
FAIL: F8 an absent profiles target with REPEATED pks is refused (rc=0, out=profiles:absent:0)
FAIL: F9 a valid first-table update followed by an invalid absent target is refused (rc=0, out=profiles:absent:0,ut_members:updated:1)
FAIL: F9b the first table's write was ROLLED BACK (expected 'initiate/active/cus_1/sub_A', got 'guest/canceled/cus_1/<null>')
```

Both tables are exercised independently (F1–F5 `ut_members`, F6–F8 `profiles`).
**F9 is the damaging one**: a *valid* first-table update **committed** — the call
returned `ut_members:updated:1` — while the second target's payload was never
checked, because that target happened to be absent. Nothing to roll back, because
nothing was rejected.

F10 fixes the other end of the requirement: a **legitimate absent target with
empty entries stays a no-op** (`profiles:absent:0,ut_members:absent:0`), and it
passed before the repair as well as after.

---

## 2. The repair: absence cannot bypass the payload contract

The payload checks moved **above** the absent short-circuit, so they run whether
or not the linkage located anything:

1. `entries` must be an **array** → `INVALID_ENTRIES`;
2. every entry must carry a `pk` → `MISSING_PK`;
3. no repeated pk → `DUPLICATE_PK`;
4. every entry pk must be in the located set → `ENTRY_NOT_LOCATED` (for an
   absent target the located set is empty, so **any** entry lands here);
5. no located row may be missing an entry → `COVERAGE`;
6. **only then** may an absent target return `absent`.

Two subtleties that the reordering forced:

- `EMPTY_UPDATE` now requires `array_length(v_located) > 0`. Without that
  condition the moved check would reject a legitimate absent target with no
  entries — i.e. it would break exactly the case F10 protects.
- The per-entry rules (`EMPTY_SET`, `SKIP_WITH_SET`, `INCOMPLETE_SNAPSHOT`,
  `COLUMN_NOT_WRITABLE`, `PLAN_VOCABULARY`) stay **after** the absent return,
  because an entry on an absent target is already refused by (4); they are only
  reachable once a row is genuinely located.

With the repair: **101 assertions passed, 0 failed, exit 0.**

---

## 3. Real controlled barriers (replacing the sleeps)

Batch 14v's R1/R2 and CON1/CON2 used a `\! touch` marker plus a fixed
`pg_sleep(3)` window. That did not *prove* the ordering it claimed. The sleeps are
gone; every ordering is now established by observing the cluster's lock state,
and **any barrier that times out fails the run** rather than silently passing.

> **Correction (Batch 14x).** These helpers were **cluster-granular**: 
> `wait_advisory` counted *any* granted/ungranted advisory lock in the cluster and
> `wait_txlock` counted *any* blocked transaction — they did not name the expected
> session. Batch 14x replaces both with name-and-key-exact checks
> (`owns_key`/`waits_key` filtered on one `application_name` and one exact
> `classid`/`objid`, and `pg_blocking_pids` comparisons between two named PIDs)
> and adds a negative control proving the two are not interchangeable.

Helpers: `wait_advisory granted|waiting` polls `pg_locks` for the expected
advisory-lock state; `wait_txlock` polls for a caller blocked on another
transaction's row locks. Both give up after ~20s and record a failure.

### R1/R2 — the competing transaction provably commits first

```
racer:      takes the advisory key, then polls pg_locks until some other session
            is WAITING on an advisory lock (raising BARRIER TIMEOUT if it never
            happens), then COMMITS its change, then releases the key;
first txn:  runs the primitive, then blocks on that same key, then commits.
```

The racer cannot reach its `COMMIT` unless it has *observed* the first
transaction waiting, and the first transaction cannot commit until the racer
releases the key — so the competing change is committed strictly before the
primitive's transaction. A zero exit from the racer **is** that proof; a timeout
raises inside the racer and is caught as a failure.

- **R1** — a matching row is inserted after the re-location. Result: the first
  transaction exits 0, reports `ut_members:absent:0`, and a matching row exists
  that it never saw.
- **R2** — an existing unlinked row is relinked after the re-location. Same shape.

Both remain **reproduced known limits**, not defects this batch fixes.

### CON1/CON2 — the second caller provably waits before the first commits

```
1. a holder session takes the gate;
2. the first caller runs the primitive, then blocks on the gate;
3. wait until pg_locks shows the first caller WAITING on the gate;
4. start the second caller; wait until pg_locks shows it WAITING on the first
   caller's row locks (locktype='transactionid', not granted);
5. only now release the gate by killing the holder;
6. the first caller commits; the second re-evaluates and loses.
```

> **Correction (Batch 14x).** Steps 3 and 4 were **cluster-granular** in this
> pass — they asked whether *any* session was waiting on *any* advisory lock, and
> whether *any* transaction was blocked — not whether *these* sessions were. And
> step 5 released the gate by **killing the client PID** of a holder that was
> sitting in `pg_sleep(60)`. Batch 14x replaces all three: the checks name the
> expected session and key, the holder releases **its own backend** on
> instruction from a control table, and the release is **asserted** before the
> run proceeds. It also bounds worker completion, which this pass did not.

Step 4 is the assertion Batch 14v was missing: the second caller is **provably
already blocked** before the first is released. Every worker's **exit status**,
**result** and the **final database state** are asserted, in **both completion
orders**:

| | first committer | second caller |
|---|---|---|
| CON1 (free first) | exit 0, `ut_members:updated:1` | exits non-zero, `BATCH14 CONFLICT` |
| CON2 (guest first) | exit 0, `ut_members:updated:1` | exits non-zero, `BATCH14 CONFLICT` |

and the first committer's state stands in both.

### What the primitive does and does not decide

Unchanged and restated because it matters here: the primitive decides only **who
commits first**. It never contacts Stripe and carries no event timestamp, so if
caller A observed Stripe at T1 and caller B at T2 > T1, **whichever commits first
still wins** — even when its observation is the older. Arbitrating that is the
caller's job, from a fresh reconciliation (Batch 14t §4).

---

## 4. Corrections to the Batch 14v review

| Batch 14v said | Corrected |
|---|---|
| The races used "a barrier, not a sleep … the ordering is forced, not timed" | **False for 14v.** It used `\! touch` + `pg_sleep(3)`. Real barriers are Batch 14w §3. |
| "**Twelve mutations**, each run through the same harness" | **Ten were executed** (MU1–MU9, MU11). The table also carried an MU12 placeholder that was never written or run. |
| R2 "is an UPDATE … which no insert-time unique index constrains" | **Wrong reason.** Unique indexes *do* constrain UPDATEs. The email index is irrelevant because it keys on **email** and this race concerns the **linkage**. |
| The re-location is "the only read" | **Understated.** It is the only read that *locates* rows; guard validation performs **one further read per entry**. The SQL comment is corrected too. |

All four are marked in place in `docs/BATCH14V-RPC-VALIDATION-GAPS.md`.

---

## 5. Synchronization proposal — revised, NOT implemented

Still a proposal for decision. Nothing here is applied, and no lock is taken by
any code path.

### Keys

```
k_cust(c) = hashtextextended('membership:cust:' || c, 0)
k_sub(s)  = hashtextextended('membership:sub:'  || s, 0)
```

### Which keys a writer must hold, by linkage shape

| Linkage | Keys to hold |
|---|---|
| **customer-only** (customer set, no subscription) | `k_cust(customer)` |
| **subscription-only** (no customer) | `k_sub(s)` for **every** subscription id in the set |
| **mixed** | `k_cust(customer)` **and** `k_sub(s)` for every subscription id |
| **absent** (the snapshot located nothing) | the keys derived from the linkage that was **queried** — the customer id and every subscription id asked about. This is the key set shared with any writer that could make a matching row appear. |
| **linkage change** (old → new) | the **union** of the old linkage's keys and the new linkage's keys |

The last two rows are the ones that matter most and were missing from the 14v
proposal. An **absent** query must still take the keys for the linkage it asked
about, or the writer that later creates that linkage takes a key nobody else
holds. And a **linkage change** touches two identities, so a writer resolving the
old linkage and a writer resolving the new one must contend on the same keys —
otherwise both see "no conflict" and interleave.

### Acquisition order

Compute the whole key set, **dedupe**, sort **ascending numerically**, and
acquire with `pg_advisory_xact_lock` in that order, inside the same transaction
as the write. A total order over keys is what prevents the ABBA deadlock between
two writers holding overlapping sets; transaction-scoped locks make the lifetime
exactly the write's.

### Writers that must participate

1. `src/app/api/stripe-webhook/route.ts` — lifecycle path, 7 call sites;
2. `src/app/api/stripe-webhook/route.ts` — `invoice.payment_succeeded`, 2 sites;
3. `src/app/api/billing/activate-free/route.ts`, 2 sites;
4. `src/app/api/billing/checkout/route.ts`, 2 sites;
5. any out-of-band SQL — migrations, manual corrections, support scripts.

### Enforcement, and an explicit non-claim

- **(A) Cooperative** — each writer takes the keys itself. Covers 1–4, and only
  for as long as every writer remembers.
- **(B) Enforced by trigger** — a `BEFORE INSERT OR UPDATE` trigger on both
  tables taking the keys for the row's linkage. A `BEFORE UPDATE` trigger can see
  `OLD` as well as `NEW`, so it *could* take both sides of a linkage change, and
  it would make out-of-band SQL participate too.

**We do not claim (B) closes the races.** That is a hypothesis about a specific
protocol, and it has **no isolated concurrency evidence**: no test has run the
trigger/key protocol above and shown R1/R2 stopped, nor measured the deadlock and
contention behaviour it introduces. Establishing it needs its own isolated
concurrency experiment — the same barrier machinery as §3, applied to that exact
protocol — and that experiment has not been run. Until then (B) is a candidate,
not a fix.

Batch 14v's claim that (B) "is the shape that closes the race" is **withdrawn**.

---

## 6. Mutations

Eleven executed. **MU12 is the one this batch's instruction requires**: it
restores the early-return bypass — the absent short-circuit moved back above the
payload validation — and the new F-section cases must catch it.

| # | Mutation | Result |
|---|---|---|
| MU1 | drop `revoke … from public` | exit 1 — **5** failures (`anon`, `authenticated` can execute) |
| MU2 | disable the located-vs-seen staleness check | exit 1 — **3** (a disappeared row reported as `absent:0`) |
| MU3 | make all four guard comparisons non-null-safe | exit 1 — **7** |
| MU4 | remove the `skip` branch | exit 1 — **1** |
| MU5 | remove the `EMPTY_UPDATE` check | exit 1 — **2** |
| MU6 | remove the `COVERAGE` check | exit 1 — **3**, with the `INCOMPLETE_UPDATE` invariant firing |
| MU7 | remove the `DUPLICATE_PK` check | exit 1 — **5** |
| MU8 | remove the guard-validation pass | exit 1 — **2** (V5, N8: a skipped row's moved guards went unnoticed) |
| MU9 | remove `begin;`/`commit;` | exit 1 — **1** (J3: the CREATE was not rolled back) |
| MU11 | remove the `DUPLICATE_TARGET` check | exit 1 — **1** |
| **MU12** | **restore the absent early-return bypass** | **exit 1 — 10 failures**, exactly the F cases |

MU12 is the mutation this batch required. It puts the absent short-circuit back
above the payload validation, and the new cases catch it:

```
MU12 -> exit=1 | assertions passed: 91 | assertions failed: 10
  FAIL: F1 an absent ut_members target with NON-ARRAY entries is refused (rc=0, out=ut_members:absent:0)
  FAIL: F2 an absent ut_members target with STRING entries is refused (rc=0, out=ut_members:absent:0)
  FAIL: F3 an absent ut_members target with an entry OUTSIDE its empty set is refused ...
  FAIL: F4 an absent ut_members target with a pk-less entry is refused ...
  … F1–F9 plus F9b
```

— the same ten failures, and the same counts (91 passed), as the pre-repair run.
A clean run of the same cases passes 101/0.

**Not covered by any mutation:** `SET_CHANGED` still has no case of its own, and
`INCOMPLETE_UPDATE` is only reached indirectly (via MU6).

---

## 7. Results

```
batch14u-rpc-harness.sh (clean)              -> 101 passed / 0 failed   exit 0
batch14u-rpc-harness.sh (before this repair) ->  91 passed / 10 failed  exit 1
```

Real PostgreSQL 16.15, private cluster on a private unix socket, no TCP listener,
synthetic rows, torn down after the run. Statement-level database evidence; the
handler evidence stays in `docs/BATCH14T-PRE-RECONCILIATION-SNAPSHOT.md`. **No
integration is demonstrated**, because no application code calls the primitive.

---

## 8. Still outstanding — unchanged and separate

1. **Independent review of the primitive** — the next step; this batch stops for it.
2. Synchronization decision (§5): (A) cooperative or (B) trigger, and for (B) the
   isolated concurrency evidence it needs before anyone may claim it works.
3. `invoice.payment_succeeded` — separate review.
4. Unlinked-row authority — held; `batch14s` stays committed red.
5. Unique-index migration hardening and independent review — prepared, not applied.
6. SELECT-only production verification — not performed.
7. Separately authorized SQL application, then an exact-SHA application release.

No production authorization is granted.
