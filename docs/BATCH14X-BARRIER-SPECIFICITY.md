# Batch 14x — barrier specificity and controlled release

Baseline: `19b240a4f27db7034579fae89540bf299dbe340b` (`19b240a`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, no integration, no release.**

The migration is **byte-identical** to the reviewed candidate — blob
`251d8e4c3a395bc0b73e64d51127955638c039f4`, unchanged. This pass touches the
harness and this review only. The synchronization proposal is **not** implemented.

---

## 1. Every worker is identified, not counted

Each worker gets a unique `application_name` of the form
`<run-prefix>-<role>-<key>` (e.g. `b14x-4113493-first-4102`), set through
`PGAPPNAME`, and its **backend PID** is read from `pg_stat_activity` via
`pid_of <app>`. Roles: `holder`, `first`, `second`, `racer`, `neg`.

That is what makes the checks in §2 possible: a barrier can name one session
instead of describing the cluster.

---

## 2. Barrier checks are specific

| Assertion | How it is checked |
|---|---|
| the expected **holder owns the exact key** | `pg_locks` row with `granted`, `classid = (key::bigint >> 32)`, `objid = (key::bigint & 4294967295)`, joined to `pg_stat_activity` and filtered on that worker's `application_name` |
| the expected **first caller waits on that key** | the same predicate with `granted = false` |
| the first caller is **blocked by the holder** | `unnest(pg_blocking_pids(first_pid))` contains `holder_pid` |
| the expected **second caller is blocked by the first** | `unnest(pg_blocking_pids(second_pid))` contains `first_pid` |
| the **racer holds / has released** its key | exact key + that worker's name, via `owns_key` / `wait_until_zero` |

**No cluster-wide count is used as proof anywhere.** The previous helpers
(`wait_advisory granted|waiting`, `wait_txlock`) counted *any* advisory lock or
*any* blocked transaction in the whole cluster; they are deleted.

The `::bigint` casts are load-bearing, not cosmetic: with `int4` operands
PostgreSQL masks the shift count, so `4101 >> 32` evaluates to `4101` and the
`classid` never matches the real lock. That bug made the holder check fail loudly
rather than pass vacuously — see §5.

---

## 3. Controlled backend release, not a disconnect

A harness control table drives release:

```sql
create table public.b14x_gate (id int primary key, released boolean not null default false);
insert into public.b14x_gate values (1, false), (2, false);
```

- **Gate holder (CON cases)** — takes the gate, then polls row `id = 1` and calls
  `pg_advisory_unlock(gate)` **on its own backend** when told to, then exits 0.
  It is not killed, and nothing depends on disconnect detection.
- **Racer (R cases)** — holds its key, waits until the *specific* first session is
  waiting on the *specific* key, then waits for the harness's go-ahead on row
  `id = 2`, then commits and releases.

After signalling, the harness **asserts the release actually happened**
(`wait_until_zero` on the holder's/racer's ownership of the key) before
proceeding. `pg_sleep(60)` as a release mechanism and `kill <client-pid>` are
both gone.

**Why the racer needs the go-ahead.** Without it, the racer reacted within one
50 ms poll of seeing the waiter — so the window it created was ~50 ms, and the
harness's own 50 ms poll could miss it. In the first run of this pass R1/R2 failed
exactly that way: the racer had already committed and released before
`waits_key` ever observed the wait. Holding the racer until the harness has
finished asserting makes the barrier **observable**, and the ordering guarantee is
unchanged: the racer still cannot commit until after the first transaction is
provably waiting.

---

## 4. Every wait is bounded, with diagnostics and cleanup

- `wait_until` / `wait_until_zero` — 400 ticks (20 s). Non-numeric output from a
  failed query is normalised to `0`/`-1` rather than reaching `[` as an error.
- `wait_worker` — 30 s **worker completion** bound; on timeout it records a
  failure, dumps diagnostics, terminates this harness's backends, and kills the
  shell job.
- `diag_dump` preserves, for any failing case, `pg_stat_activity` for these
  workers, their `pg_locks` rows, and their `pg_blocking_pids` relationships, to
  `$BASE/diag/<label>.txt` — the path is printed.
- `cleanup_workers` calls `pg_terminate_backend` for this harness's
  `application_name` prefix only, so a failed case cannot poison the next one.

**The holder's termination is recorded separately** from caller outcomes:
`HOLDER terminated as intended (exit 0)` is its own assertion, distinct from
whether the first and second callers succeeded or failed.

---

## 5. Two bugs found while hardening — and what they demonstrate

Both were caught because the checks are specific enough to fail:

1. **Int4 shift masking.** `owns_key` compared `classid = ($1 >> 32)` with a
   plain integer literal, so `4101 >> 32` evaluated to `4101` and no row could
   ever match. The CON holder check failed loudly on the first run instead of
   silently succeeding. Fixed with explicit `::bigint` casts.
2. **`$(pid_of …)` expanded once, not per poll.** The CON second-caller check was
   built as `"blocked_by $(pid_of "$second") $pid1"` — resolved *at string-build
   time*, before the second caller had connected, yielding `0`. The check could
   therefore never succeed. The preserved diagnostics proved the protocol was
   actually correct (`pg_blocking_pids(second) = {first}`), which is how the
   harness bug was identified rather than the protocol being wrongly blamed.
   Fixed by escaping the substitution so `eval` re-resolves it on every tick.

A third issue — the racer's 50 ms reaction window — is described in §3.

Together these show the barrier assertions are load-bearing: each one failed when
the protocol or the check was wrong, and none passed vacuously.

---

## 6. Negative control

An unrelated holder takes key `9001` under a different `application_name`, and:

| # | Assertion | Result |
|---|---|---|
| NEG1 | the unrelated holder owns **its own** key | 1 |
| NEG2 | a **cluster-wide** advisory count *would* have been satisfied | 1 |
| NEG3 | the **known holder's name** does not match a key it does not hold | 0 |
| NEG4 | the **known key** does not match a worker that does not hold it | 0 |
| NEG5 | no waiter is reported for that worker on a key nobody holds | 0 |
| NEG6 | the unrelated holder terminated as intended | exit 0 |

NEG2 and NEG3 are the point: the coarse check that the previous harness would
have used says "yes, a holder exists", while the specific check correctly says
"that is not my holder".

> **Correction (Batch 14y).** NEG3 as first written was
> `owns_key 9101 "${APP}-first-9101"` — it changed **both** the key *and* the
> worker name at once, so it could not say which filter was doing the work. It is
> now `owns_key 9101 "$NEGAPP"`: the **same worker** that is known to hold the key,
> asked about a **different** key. NEG4 keeps the complementary shape — the
> **same key**, asked about a **different worker** — so the two predicates are
> isolated from each other. Batch 14y also mutation-checks each one
> independently (removing the key filter must fail NEG3; removing the worker
> filter must fail NEG4).

---

## 7. Re-run results

| | |
|---|---|
| clean run | **130 assertions passed, 0 failed, exit 0** |
| repeat run 1 | 130 passed / 0 failed, exit 0 |
| repeat run 2 | 130 passed / 0 failed, exit 0 |

Three consecutive clean runs were **observed**. That is evidence of stability
across those three runs; it is **not** a general claim that the harness cannot be
flaky, and no such claim is made — three runs support no statistical statement
about a flake rate. The harness was run against the identical SQL blob
(`251d8e4c…`) each time.

**What "both orders" actually meant here.** Only CON had two orderings, and they
should have been named:

- **CON1** — the `free` caller commits first, the `guest` caller second;
- **CON2** — the `guest` caller commits first, the `free` caller second.

R1 and R2 were **not** two orders of one test. Each reproduced a *different* race
in the *same* ordering: the re-location runs first and the competing writer
commits afterwards (R1 = matching INSERT, R2 = existing-row relink). The reverse
ordering for both races is added in Batch 14y as R3/R4.

Each case asserts both callers' exit status, their reported results, and the final
database state.

**Unchanged SQL evidence is reused, not re-derived.** The migration is the same
bytes that were reviewed at `19b240a`, so the A–J, V, N and F section results
recorded then still stand; they are simply executed again as part of this run.
The only new assertions are the barrier-specific ones above plus the negative
control.

---

## 8. Corrections to the Batch 14w review

| Batch 14w said | Corrected |
|---|---|
| Barrier helpers polled `pg_locks` for "the expected advisory-lock state" | They polled at **cluster** granularity — `wait_advisory` counted *any* advisory lock, `wait_txlock` counted *any* blocked transaction. Both are now replaced by named, key-exact checks. |
| The gate holder was released "by killing the holder" | 14w used `pg_sleep(60)` plus a **client-PID kill**. 14x replaces it with a control-table instruction and the holder releasing its own backend, with the release **asserted**. |
| *(nothing on worker completion bounds)* | Every wait, including worker completion, is now bounded, and a timeout fails the case, preserves diagnostics and cleans up its backends. |

Marked in place in `docs/BATCH14W-ABSENT-TARGET-AND-BARRIERS.md`.

---

## 9. Still outstanding — unchanged and separate

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
