# Batch 14t — the pre-reconciliation snapshot

Baseline: `67fe1ae161679c33f97c5bbe6bc2bff934a1ef1b`
Branch: `omni/batch14-membership-write-contract`
Worktree: `/mnt/deploy-ssd/worktrees/ut-batch14`

Production remains `ac49ce062d66` on `main`. **No production SQL was run and
nothing was released.** Preview only.

---

## 0. Correction to Batch 14r

The Batch 14r review claimed item 2 — *E4 and the stale-reconciliation races* —
was **repaired**. **That claim is withdrawn.** The per-row conditional write and
the bounded re-resolution were real, but the snapshot they conditioned on was
taken **after** the Stripe call, so the repair did not close the race it claimed
to close. Specifically:

- `readStoredLinkage` was called before Stripe, but it returns linkage ids and a
  plan/status summary — **it is not the UPDATE snapshot**;
- `planLifecycleUpdate` then **queried the rows after reconciliation**, so the
  guard values were captured from a state the decision never saw.

Consequence, reproduced in §2: a change landing during the Stripe call was
absorbed into the snapshot, the conditional write matched the NEW values, the
delivery reported success, and a decision made from the OLD values **overwrote
the newer state**.

Two further corrections:

- Batch 14r §6 said *"The retry loop converges it"*. **Withdrawn.** No evidence
  shows retries converge under sustained contention; a repeated lost race refuses
  the delivery and Stripe's own retry is the only mechanism, and a half-write
  stands until the RPC in §6 exists.
- The real-PostgreSQL evidence in Batch 14r supports **conditional UPDATE
  semantics only**. It does **not** validate the handler's snapshot timing and it
  does **not** validate an atomic RPC, because none exists. §7 restates the
  scope.

---

## 1. The defect

`snapshotLifecycleRows` (then `resolveLifecycleRows`) was invoked from inside
`planLifecycleUpdate`, which the handler called **after** reconciliation. So the
order was:

```
readStoredLinkage            <- ids only, NOT the update snapshot
resolveAuthoritativeSubscription   <- Stripe
planLifecycleUpdate          <- queries the rows HERE, after Stripe
commitLifecycleUpdate        <- guards on values read after Stripe
```

A writer landing between the Stripe answer and that query is invisible: the guard
is read from the new state, so the write matches, and the stale payload
overwrites the linkage the newer writer just installed.

---

## 2. The failing regression, written first

`scripts/batch14t-snapshot-timing.js`. `state.afterStripe` fires **after the
provider has answered and before the caller acts on it** — the exact window:

> Stripe reconciliation observes A → another writer installs B and Stripe now
> reports A canceled / B active → **the stale delivery must preserve B.**

Against the Batch 14r implementation (`67fe1ae`):

```
--- T1 subscription update: the stale delivery must preserve B ---
    status=200 warnings= sub=sub_A attempts=[1]
  FAIL: T1 the installed replacement is PRESERVED, not rewritten back to A (sub is sub_A)
  FAIL: T1 the superseded delivery BACKS OFF and says so (warnings [])
  FAIL: T1 NO row was actually written (applied=1)
  --- T2 subscription deletion, B installed after reconciliation ---
    status=200 warnings= sub=sub_B attempts=[]
  FAIL: T2 the deletion is recognised as superseded (warnings [])
  FAIL: T2 the stale revocation was attempted once and lost (attempts=0)
  --- T3 invoice.payment_failed, B installed after reconciliation ---
    status=200 warnings= sub=sub_B rowstatus=past_due attempts=[1]
  FAIL: T3 dunning did NOT stamp past_due on a row Stripe now reports active (past_due)
  FAIL: T3 the stale payment failure is ignored and named (warnings [])
  FAIL: T3 NO row was actually written (applied=1)

assertions passed: 19
assertions failed: 8
```

T1 is the headline: the stale delivery **wrote `sub_A` back over the installed
`sub_B`** and reported no conflict. T3 stamped `past_due` onto a row Stripe now
reports as an active different subscription. T2 never noticed the move at all.

The **control** (T1-control: B already installed when the snapshot is taken)
passed at `67fe1ae` and still passes — same conserved outcome, zero attempts, so
the regression is measuring the race and not something incidental.

Requested asserts are all present per case: response status, stored linkage and
status, effective entitlement, write **attempts**, and **affected rows**.

---

## 3. The repair

`membership-lifecycle.ts` is renamed and re-split so the ordering is structural,
not conventional:

| | |
|---|---|
| `snapshotLifecycleRows(client, table, authority, isEligible?)` | **The authorization snapshot.** Reads the rows and captures pks + original `plan`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`. Must run **before** the provider. |
| `planLifecycleUpdate(snapshot, table, fields)` | **Pure.** No I/O, takes the already-captured snapshot, so it is *structurally unable* to re-read the rows. |
| `commitLifecycleUpdate(client, plan)` | Writes, conditioned on the snapshot's values, null-safely, and checks the affected rows. |

The handler now does, per attempt:

```
(1)  readStoredLinkage                     <- ids for the authority helper
(1b) snapshotLifecycleRows x BOTH tables   <- THE UPDATE SNAPSHOT, before the provider
(2)  resolveAuthoritativeSubscription      <- Stripe
(3)  planLifecycleUpdate x2                <- pure; no reads
(4)  commitLifecycleUpdate x2              <- guarded
```

Both tables are snapshotted before the provider is consulted and both are
planned before either is committed. A snapshot rejection (a contradiction, a
duplicate, an unidentifiable row) now costs **no** write and **no** provider
call.

**On conflict the whole attempt restarts** — `readStoredLinkage`, both
snapshots *and* the Stripe reconciliation — because the loop body is the entire
cycle. The Batch 14r loop re-resolved the linkage and Stripe too, but from the
wrong snapshot; that part is now correct.

### Path coverage

| Path | Snapshot before provider | Evidence |
|---|---|---|
| `customer.subscription.created` / `.updated` | yes | T1, T1-control |
| `customer.subscription.deleted` | yes | T2 |
| `invoice.payment_failed` | yes | T3 |
| **`invoice.payment_succeeded`** | **NOT COVERED** | see §5 |

---

## 4. The regression detects the move (item 3)

Three mutations in `scripts/batch14r-mutation-runner.py` restore the pre-Batch-14t
ordering, one per path, because each path has its own snapshot/plan site:

| # | Mutation | Detected as |
|---|---|---|
| **M8** | lifecycle path re-reads the rows after reconciliation | `batch14t` **3 failures** — `T1 the installed replacement is PRESERVED` |
| **M9** | deletion path re-reads the rows after reconciliation | `batch14t` **2 failures** — `T2 the deletion is recognised as superseded` |
| **M10** | dunning path re-reads the row after reconciliation | `batch14t` **3 failures** — `T3 dunning did NOT stamp past_due` |

Each is a precise text substitution of that path's pure `planLifecycleUpdate`
calls for post-Stripe `snapshotLifecycleRows` calls, and the runner **fails the
whole run** if any is not detected with its declared signature. Together they show
the regression bites for all three covered paths, not just the headline one.

The Batch 14r mutations were retargeted where the code they anchored on was
replaced — M7 now downgrades a second-table snapshot rejection to a warning,
which is the same "avoidable first-table write" defect expressed against the new
structure, and M3's expected count was corrected for the changed write volume.

**Preserved assertions:** the contradictory-linkage cases (`batch14r-lifecycle-authorization.js`,
21/0) and the zero-write assertion inside E5a still hold — the contradiction is now
detected one phase earlier, still with `writes.length === 0`.

---

## 5. Not covered by this repair

`invoice.payment_succeeded` still uses the **unchanged** `writeMembershipRow`
path. It is **not** covered by the lifecycle concurrency repair and must be
reviewed separately: it writes billing artefacts (customer id, current
subscription id, plan) through the authenticated writer, does not set
`subscription_status`, and its `profiles` mirror is optional. If it needs the same
conditional-write discipline, that is a separate decision with its own
regression — it is **not** claimed here.

---

## 6. Atomicity proposal — FOR INDEPENDENT REVIEW, NOT APPLIED

Prepared, not applied. No SQL has been run against any database.

### Why a function, not a retry loop

PostgREST issues one statement per request, so the two conditional updates are two
transactions. Real PostgreSQL confirms the per-row conditional UPDATE is safe
under concurrency (the qualification is re-evaluated after the row lock, so
exactly one writer affects a row) — but that protects one statement, not the pair:
a half-write is reachable (§7 P4). **A retry loop does not make the pair atomic**,
and no measurement here shows it converges under contention.

### Contract

```
apply_lifecycle_update(
  p_customer_id      text,
  p_members          jsonb,   -- original snapshots + replacements, see below
  p_profiles         jsonb,
  p_members_present  boolean, -- the caller ASSERTS whether a row existed
  p_profiles_present boolean
) returns table (target text, pk uuid, affected integer)
```

`p_members` / `p_profiles` are arrays of objects that carry **the original
snapshot values explicitly**, not merely customer/subscription ids plus
replacement fields:

```
[{ "pk": "<uuid>",
   "original": { "plan": "initiate" | null,
                 "subscription_status": "active" | null,
                 "stripe_customer_id": "cus_…" | null,
                 "stripe_subscription_id": "sub_…" | null },
   "set":      { "plan": "global", "subscription_status": "canceled",
                 "stripe_subscription_id": null, "current_period_end": null,
                 "stripe_customer_id": "cus_…" } }]
```

The function **makes no decisions and performs no reads of its own**. It applies
the caller's decision conditionally, so the authorization reasoning stays in one
place and the function cannot invent a snapshot.

### Semantics

- **Guards.** For each entry, `... where pk = pks and <each original value
  compared with `is not distinct from`>`. Null-safe by construction.
- **Conflict.** Any entry whose UPDATE affects **0 rows** raises
  `BATCH14 CONFLICT` (`errcode 40001`) and the **whole transaction rolls back —
  both tables**, so no half-write is possible. PostgREST answers an error and the
  webhook's existing bounded re-resolution handles it.
- **Absence.** Absence is *declared*, never inferred. If a target's array is empty
  the caller must pass `p_*_present = false`, meaning "there was no row for this
  table"; the function then performs no statement for that target and returns
  `affected = 0`. If `p_*_present = true` and the array is empty, or an entry
  matches nothing, that is a **conflict**, not absence. This is what keeps "the
  table had no linked row" distinguishable from "the row we snapshotted is gone".
- **Idempotency.** Re-applying the same call with the same snapshot and the same
  replacement affects 1 row per entry and changes nothing further, so a retry
  after a transport failure is safe.
- **Return.** `affected` per entry so the caller can assert exactly what landed,
  instead of inferring success from an absence of errors.

### Security settings

```sql
create function public.apply_lifecycle_update(...)
  returns table (...)
  language plpgsql
  security definer
  set search_path = pg_catalog, public
as $$ … $$;

alter function public.apply_lifecycle_update(...) owner to postgres;

revoke all on function public.apply_lifecycle_update(...) from public;
revoke all on function public.apply_lifecycle_update(...) from anon, authenticated;
grant execute on function public.apply_lifecycle_update(...) to service_role;
```

- `security definer` with a **pinned `search_path`**, owned by `postgres`, so the
  body cannot be redirected by a caller-controlled path;
- execute is granted **only to `service_role`** — the webhook's key. Not `public`,
  not `anon`, not `authenticated`, so a signed-in member cannot drive entitlement
  writes through it;
- it takes no auth user id and fabricates none; the pks come from the caller's
  verified snapshot, exactly as the TypeScript path does today.

### What this proposal does NOT claim

- **It does not claim retries converge.** It removes the half-write window; the
  bounded re-resolution and Stripe's retry remain the only recovery mechanism, and
  under sustained contention a delivery can still be refused repeatedly.
- **It is not validated.** It has never been executed. Before it is applied it
  needs its own isolated-database harness (conflict path, absence path, rollback
  of both tables, grant verification) and an independent review.
- Applying it is a **separately authorized SQL step** and is not part of this
  batch.

---

## 7. Evidence

### Mocked boundaries

| Suite | Assertions | Failures |
|---|---|---|
| `batch14t-snapshot-timing.js` | 27 | 0 |
| `batch14r-lifecycle-authorization.js` | 21 | 0 |
| `batch14r-concurrency-interleavings.js` | 41 | 0 |
| `batch14q-profiles-only-lifecycle.js` | 20 | 0 |
| `batch14p-webhook-coverage.js` | 34 | 0 |
| `batch14d` / `batch14e` / `batch14f` / `batch14g` / `batch14l` | 26 / 22 / 11 / 12 / 13 | 0 |
| `batch14b` / `batch14c` | 41 / 38 | 0 |
| `batch14-membership-write-contract.js` | 51 | 0 |
| `batch14m` / `batch14n` | 7 / 15 | 0 |
| **379 assertions, 0 failures** | | |
| `batch14s-unlinked-row-authority.js` | 8 | **2 — pinned, §8** |
| `batch11` / `batch12` / `batch12b` | exit 0 | — |

Mutation runner: eight mutations, all detected, every restore hash-verified.

### Isolated real PostgreSQL — **and what it does not say**

PostgreSQL 16.15, private cluster, private unix socket, no TCP listener,
synthetic rows, torn down after the run. Carried over from Batch 14r:

```
P1 guard holds                     affected = 1
P2 row moved in the window         affected = 0   kept cus_OTHER, plan untouched
P3 'sub = null' 0   vs  'sub IS NULL' 1
P4 first table written, second not ut_members = guest/canceled ; profiles = initiate/active
   same statements, rolled back    ut_members = initiate/active
P5 two concurrent writers          writer 2 affected = 0 ; final = guest/canceled
```

**Scope:** this supports **conditional UPDATE semantics** — that the guard is
re-evaluated under concurrency, that `= null` and `IS NULL` differ, and that two
statements are not atomic without a transaction. It does **not** validate the
handler's snapshot timing (that is the mocked regression in §2, not a database
property) and it does **not** validate the §6 RPC, which has never been executed.

---

## 8. Held: the unlinked-row policy

`batch14s-unlinked-row-authority.js` remains **committed red (8 pass / 2
fail)** and is left exactly as it was. The policy change stays **held pending a
precise authority definition** — which rows may legitimately exist without a
verified linkage, who owns that column, and what clears it. Batch 14t does not
touch it and does not weaken or silence it.

---

## 9. Release prerequisites (all open)

1. **Lifecycle concurrency** — snapshot timing corrected, single-statement
   conditional writes proven; the **two-table atomicity gap remains** (§6, not
   applied).
2. **`invoice.payment_succeeded`** — not covered by this repair (§5), needs its
   own review.
3. **Unique-index migration hardening and independent review** —
   `20261010_membership_write_contract.sql`, prepared, **not applied**.
4. **SELECT-only production verification** — not performed.
5. **Separately authorized SQL application** before any application release.
6. **The unlinked-row authority decision** — held, with its red regression
   visible.
