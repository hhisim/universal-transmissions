# Batch 14ab — linkage synchronization, validated in isolation

Baseline: `d8109e38e30a378a9a4fea8718f64ea4cbf4591a` (`d8109e3`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, application integration, or release.**
The reviewed RPC migration `20261012_apply_lifecycle_update.sql` is **unchanged**
(blob `251d8e4c3a395bc0b73e64d51127955638c039f4`). This batch adds a **separate**
prototype and its own isolated harness, and **chooses no production policy**.

---

## 1. The gap the prototype addresses

The RPC re-locates linkage under `FOR UPDATE` and then commits. A row lock does not
block an INSERT, and a relink of a row that was **not** located is covered by no
lock the RPC holds. A competing writer can therefore commit a new or changed
linkage **between the relocation and the commit**, and the RPC then commits a
decision based on a linkage set that is no longer current.

The RPC cannot fix this alone: it cannot lock rows that do not exist yet.

## 2. The key protocol

A **key set** is derived from the linkage identity a writer is about to create,
change, or replace — covering the **OLD** and the **NEW** side:

| Input | Key |
|---|---|
| customer id | `hashtextextended('b14ab:customer:' \|\| id, 0)` |
| subscription id | `hashtextextended('b14ab:subscription:' \|\| id, 0)` |

`b14ab_linkage_keys(old_c, old_s, new_c, new_s)` unions both kinds over **both** the
old and the new values, deduplicates, and returns them **ascending**. Ascending
order is load-bearing: it is the acquisition order, so two writers touching
overlapping identities acquire shared keys in the same sequence and cannot deadlock
against **each other**.

Writers then take `pg_advisory_xact_lock` on each key, in that order, **before**
relocation.

### The ordering rule this prototype commits to

```
        advisory key lock  ->  row lock        (never the reverse)
```

## 3. Results — 35 assertions, 0 failures

### K — the key protocol (9 assertions)

Customer-only yields exactly one key; subscription-only yields exactly one;
**mixed linkage yields both, ascending**; **multiple subscription ids covers both
old and new**; an **old→new customer change covers both sides**; repeated
identities deduplicate; the set is **invariant under an old/new swap** (so the
order in which a caller happens to describe the change cannot matter); empty
identities yield an empty set; customer and subscription keys never collide.

### L — locks are taken BEFORE relocation, before any row lock (5 assertions)

An independent session holds the `cus_1` key. The write path is then invoked:

- it **blocks on an advisory lock** (L2);
- while blocked it holds **no tuple and no transaction lock** (L3) — so **no row
  lock has been taken yet**, which is precisely the "key before relocation"
  property;
- it **has written nothing** while blocked (L4);
- once released it proceeds and applies the write (L5).

L3 is the assertion that distinguishes "takes the key first" from "takes the key
somewhere later". Without it the protocol could be satisfied in name only.

### R1 / R2 — the absence races, baseline versus prototype (8 assertions)

Both races are reproduced **in the same cluster and the same process** against a
no-sync baseline (`b14ab_lifecycle_apply_nosync`), so the comparison is not across
environments.

| Race | Baseline (no keys) | Prototype (keys) |
|---|---|---|
| **R1** a matching INSERT | the writer **committed inside the window** — race reproduced | the writer **did not commit inside the window** |
| **R2** an existing row relink | the writer **committed inside the window** — race reproduced | the writer **did not commit inside the window** |

Two further assertions pin the sync case down:

- the writer completed **only after** the RPC committed — it was *blocked*, not
  failed;
- the competing writer's committed state **survived** and was not clobbered
  (`9101 = new@x|initiate`; `9201 = cus_1|initiate|active`).

The INSIDE-vs-ABSENT observation is recorded **by the racing transaction itself**
at the instant its window closes, not polled by the harness afterwards — a
harness-side check races the writer's completion by milliseconds and was wrong in
the first two iterations of this harness.

### W — writer-first rejection controls (3 assertions)

A cooperating writer commits **first**; the caller's snapshot does not contain the
row; the prototype reports **`newly_linked`** and does **not** write, and the
competing writer's committed state is preserved. The rejection control is
preserved, not dropped in favour of serialization.

### D — the honest limitation (1 assertion, plus 2 from D2)

**D1: a writer that takes no key is NOT constrained.** A plain INSERT issued
directly, ignoring the protocol, committed inside the RPC's window. The key
protocol is **cooperative**: it orders writers that participate, and does nothing
about a writer that does not. Anyone reading "R1/R2 are prevented" must read it as
"prevented for participating writers".

### T — the trigger proposal's lock ordering (7 assertions)

This is the measurement the brief asks for: *the RPC takes the advisory lock and
then seeks the row lock; an UPDATE holds the row lock and then seeks the advisory
lock.*

| Variant | Deadlock | Direct writer blocked (D2) |
|---|---|---|
| **BEFORE ROW** trigger, per-row key | **YES — detected in S1 (40P01)** | yes |
| **BEFORE STATEMENT** trigger, shared global key | **no** | yes |

**The row-trigger protocol FAILS.** A `BEFORE ROW` trigger fires after the
statement has taken the row, so a direct `UPDATE` holds the row and *then* seeks
the key — the exact inversion of the rule in §2 — and deadlocks against a
transaction that holds the key and then seeks the row. Reported, not hidden.

**The simpler alternative holds.** A `BEFORE STATEMENT` trigger fires before the
statement touches any row, so it takes the key **before** any row lock — the same
order as the RPC — and no deadlock occurs. It also **does** constrain the direct
SQL writer that D1 showed the cooperative protocol cannot (D2-stmt).

**A measurement caveat worth stating.** An earlier version of this harness tried
to detect the row trigger's ordering by counting `locktype='tuple'` rows in
`pg_locks`, and read zero in both variants — including the one that deadlocks.
`pg_locks` shows a tuple lock only for `SELECT … FOR UPDATE`; a plain `UPDATE`'s
row lock is not represented there. The count was therefore **not evidence**, and
the deadlock itself is what establishes the ordering. That probe was replaced
rather than reinterpreted.

## 4. What this does NOT establish

- **No production policy is chosen.** The cooperative protocol, the row trigger
  and the statement trigger are three candidates with different trade-offs:
  participation requirements, deadlock exposure, and granularity (the trigger
  variant needs **one global key**, because a statement-level trigger cannot
  derive per-identity keys). That choice is the user's, and it is deliberately not
  made here.
- **The per-identity key protocol does not constrain non-participants** (D1).
- **The statement-level variant is coarse**: one shared global key means every
  linkage write serialises against the RPC, not just writers touching the same
  identity.
- **The prototype is single-table and synthetic.** It exercises the key protocol
  and lock ordering on `ut_members` in a private cluster; it is not a second full
  RPC and it does not model the reviewed RPC's two-table snapshot/coverage
  contract.
- **The T construction** stands in for the RPC's *ordering* (advisory key →
  `FOR UPDATE` row lock) rather than calling the full RPC; it measures the
  ordering, which is the question.
- Nothing here is wired into the application, and nothing is applied.

## 5. Harness safety

- Private cluster, private unix socket, **no TCP listener** (asserted), synthetic
  rows, torn down at the end.
- **It stops its own cluster and removes its own data directory.** Verified after
  the run: **no run directories left, no live cluster process**, disk unchanged.
  This is the fix for the leak Batch 14z reported (~39 MB per run); the new
  harness removes what it creates.
- **Failure diagnostics are preserved**: on a failing run the workspace's logs and
  SQL are copied to `/var/tmp/b14ab-diag-<ts>` **before** teardown and the path is
  printed. The mechanism fired during development (two preserved diagnostic
  directories from the early failing iterations remain in `/var/tmp`).

---

## 6. Still outstanding — unchanged and separate

1. **Independent review of the reviewed RPC primitive** — still the gating step.
2. **The synchronization policy choice** — now narrowed to: cooperative
   per-identity keys (precise, needs participation, D1), versus a statement-level
   shared global key (covers non-participants, no deadlock, coarse). **Not chosen
   here.**
3. `invoice.payment_succeeded` — separate review.
4. Unlinked-row authority — held; `batch14s` stays committed red.
5. Unique-index migration hardening and independent review — prepared, not applied.
6. SELECT-only production verification — not performed.
7. Separately authorized SQL application, then an exact-SHA application release.

No production authorization is granted.
