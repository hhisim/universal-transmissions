# Batch 14u — the atomic write contract, prepared and validated

Baseline: `c360bc911404fecf5615f8a506f48e3988f08916` (`c360bc9`)
Branch: `omni/batch14-membership-write-contract`

> ## ⚠ Superseded in part (Batch 14v)
>
> **Assertion and mutation counts in this document are stale.** The harness has
> grown from 39 → 43 → **86 assertions**; every per-mutation count below was
> measured against the smaller case set. The authoritative figures, the corrected
> claims and the new evidence are in
> **`docs/BATCH14V-RPC-VALIDATION-GAPS.md`**.
>
> Specifically corrected there: the claim that *"only a uniqueness constraint on
> the linkage would close that window"* (an index does **not** close the absence
> races — see 14v §3, where both races are reproduced); the missing statement that
> the primitive **cannot decide which of two callers holds the newer Stripe
> observation** (14v §4); and its silence on whether installation is atomic
> (14v §5).

**Preparation only. No production SQL. Nothing released. Nothing wired in.**

- The SQL is a **review candidate**: `supabase/migrations/20261012_apply_lifecycle_update.sql`.
- It has been validated **only** against the isolated harness in
  `scripts/batch14u-rpc-harness.sh` — a private cluster, a private unix socket,
  no TCP listener, ephemeral, torn down after the run.
- **No application code calls it.** The handler still uses the TypeScript
  conditional-write path unchanged.
- Applying it is a separately authorized step and remains a release prerequisite.

---

## 1. Corrections to the previous proposal

Batch 14t §6 stated the contract. Four things in it were wrong or under-specified.

| Previous claim | Correction |
|---|---|
| *"Re-applying the same call with the same snapshot and the same replacement affects 1 row per entry and changes nothing further, so a retry after a transport failure is safe."* | **Withdrawn.** A replay is **refused**. The guards no longer match once the write has landed, so it raises `BATCH14 CONFLICT`. Proven by case **G1**. The old wording implied an old snapshot can be replayed successfully; it cannot, and it must not be able to. |
| *"Absence is declared, never inferred — the caller passes `p_*_present`."* | **Insufficient, as stated.** A caller-supplied flag cannot see a row that becomes linked **after** the snapshot. The function now **re-locates the linkage inside the transaction** and compares the located set with the caller's `seen_pks`; a row that appeared is `BATCH14 NEWLY_LINKED`. Proven by **D2** and **E3**. |
| *"The function makes no decisions and performs no reads of its own."* | **Narrowed.** It performs exactly one read per target — the re-location — and uses it **only** to confirm the snapshot is still current. It still makes no entitlement decisions and never contacts Stripe. |
| *(no recovery story for a lost response)* | **Specified in §4.** |
| *(absent / skipped only)* | **Four distinct outcomes and three named failures**, §2. |

Also added, as instructed: the **existing plan vocabulary is preserved**
(`guest`, `free`, `initiate`) and the **writable columns are restricted** to a
five-column allow-list.

---

## 2. The contract

```
apply_lifecycle_update(p_targets jsonb)
  returns table (target text, outcome text, affected integer, located_pks uuid[])
```

`p_targets` is an array, one object per table:

```json
{ "target": "ut_members",
  "linkage": { "customer_id": "cus_1", "subscription_ids": ["sub_A"] },
  "seen_pks": ["<uuid>"],
  "intent": "update",
  "entries": [
    { "pk": "<uuid>",
      "original": { "plan": "initiate", "subscription_status": "active",
                    "stripe_customer_id": "cus_1", "stripe_subscription_id": "sub_A" },
      "set": { "plan": "guest", "subscription_status": "canceled",
               "stripe_subscription_id": null, "current_period_end": null } } ] }
```

**Original snapshots are explicit.** All four `original` keys must be present —
a **missing** guard key is refused as `INCOMPLETE_SNAPSHOT`, so a caller cannot
accidentally omit a guard by leaving a field out. All four comparisons use
`IS NOT DISTINCT FROM`, so a snapshot value of `NULL` matches a row that holds
`NULL` (case **C4**) and does not match a row that now holds a value (**C5**).

**Writable columns are restricted** to
`plan`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`,
`current_period_end`. Anything else is `COLUMN_NOT_WRITABLE`. `set` is a partial
update: a column left out keeps its current value.

**The plan vocabulary is preserved**: `plan` may only be `guest`, `free` or
`initiate`, or `NULL`. Anything else is `PLAN_VOCABULARY`.

### Outcomes — four states, never merged

| outcome | meaning | affected |
|---|---|---|
| `updated` | the caller's entries were applied | the number of rows |
| `absent` | the linkage owns no row, and owned none when snapshotted | 0 |
| `skipped` | the linkage owns a row, but the caller chose not to write it (**present-but-ineligible**) | 0 |

### Failures — three classes, each `SQLSTATE 40001`

| error | meaning |
|---|---|
| `BATCH14 NEWLY_LINKED` | the linkage now owns a row the snapshot did not have |
| `BATCH14 DISAPPEARED` | the linkage no longer owns a row the snapshot had |
| `BATCH14 CONFLICT` | a row still exists and is still located, but no longer matches the caller's original values (**changed**) |

Any of these raises inside the function's single transaction, so **both tables
roll back** — case **B**.

`skipped` is deliberately *not* `absent`: "the row exists and I chose not to
write it" and "there was no row" are different facts, and only the second one
means the caller's table is unaddressed. `skipped` is still subject to the
staleness check, so it cannot be used to ignore a newly linked row (**E3**).

### Security

`security definer`, `set search_path = pg_catalog, public`, and execution is
**service-role only**: `revoke all … from public, anon, authenticated` then
`grant execute … to service_role`. The revoke from `PUBLIC` is load-bearing —
PostgreSQL grants `EXECUTE` to `PUBLIC` on new functions by default, so without it
every role could drive entitlement writes. Proven by **H**.

---

## 3. What the harness proves

`scripts/batch14u-rpc-harness.sh` — isolated cluster, synthetic rows, the
proposed migration applied. **86 assertions** as of Batch 14v (this section
originally reported 39; see the supersession note at the top).

| Required property | Case | Result |
|---|---|---|
| both writes succeed together | **A** (both targets `updated`, one row each; both rows carry their write) | pass |
| second-table conflict/error rolls back the first | **B** (refused, `CONFLICT` named, the **first** table rolled back, the second untouched) | pass |
| null-safe guards preserve a changed customer / subscription / status | **C1/C2/C3** each refused with the row preserved; **C4** `NULL`-vs-`NULL` matches; **C5** a `NULL` guard does not match a non-`NULL` row | pass |
| disappearance and newly appearing linkage handled as specified | **D1** `DISAPPEARED`; **D2** `NEWLY_LINKED` from absence alone, row untouched; **D3** genuine absence is `absent:0`, not an error | pass |
| skipped/ineligible rows remain legitimate no-ops | **E1** `skipped:0` distinct from `absent`, **E2** row untouched, **E3** skip does not bypass the staleness check | pass |
| concurrent calls in both orders preserve the newer state | **F1** fresh-then-stale → stale loses, newer state preserved, and the stale call **waited on the row lock** (≥2s); **F2** the first call succeeds while current, then the other loses, and the committed state is preserved | pass |
| replay after success has the documented outcome | **G** first call succeeds; an identical replay is **refused**; the post-write state stands; a **fresh** snapshot then converges | pass |
| anon/authenticated cannot execute it; service_role can | **H** both non-service roles denied; `service_role` succeeds; plus `SECURITY DEFINER` and the pinned `search_path` verified in `pg_proc` | pass |

### Does the harness bite?

Four mutations of the SQL, each run through the same harness. **Their counts are
stale — measured against the 43-assertion harness; Batch 14v §6 re-measures all
of them and adds six more.**

| Mutation | Harness result | What failed |
|---|---|---|
| **MU1** — drop `revoke all … from public` | **exit 1** — 37 passed / **2 failed** | `anon` and `authenticated` could execute it |
| **MU2** — disable the located-vs-seen staleness check | **exit 1** — 36 passed / **3 failed** | `D1` a disappeared row reported `absent:0` instead of `DISAPPEARED`, plus the newly-linked assertions |
| **MU3** — replace all four guard comparisons with `=` in both tables | **exit 1** — 37 passed / **6 failed** | `C4`/`C6` (a NULL guard stopped matching a NULL column) and the cases downstream of them |
| **MU4** — remove the `skip` branch | **exit 1** — 38 passed / **1 failed** | `E1` reported `updated:0` instead of `skipped:0` |

Clean run for comparison: **43 passed / 0 failed**, exit 0.

**This is why MU3 exists in that form.** The first version of MU3 mutated only
the `plan` guard, and it went **undetected** — no case then exercised a NULL
`plan` or `subscription_status`. That was a gap in the *tests*, not in the
mutation: cases **C6** and **C7** were added to cover a NULL in every guard
column, and MU3 was widened to all four guard classes in both tables. With both
changes it is caught.

---

## 4. Recovery after a committed transaction whose response was lost

The function is called over HTTP. The call can **commit and still fail to return**
— a dropped connection, a timeout, a gateway restart. The caller cannot tell
"committed" from "never ran".

**The contract does not try to make replay succeed.** It makes the ambiguity
resolvable:

1. The caller retries with the **same** snapshot. The guards no longer match the
   post-write row, so the retry raises `BATCH14 CONFLICT` (case **G1**).
2. A `CONFLICT` is therefore **not** evidence that nothing happened. It means the
   state moved — either this call already committed, or another writer moved it.
3. The caller must not "fix" this by retrying harder or by loosening the guards.
   It must **re-resolve from scratch**: read the stored linkage again, snapshot
   both tables again, and **re-run the Stripe reconciliation**, then decide from
   that fresh state.
4. From the fresh state the outcome is determinate: if the subscription is still
   the governing one, the fresh snapshot matches and the write lands normally; if
   it has been superseded, the fresh reconciliation detects that and writes
   nothing. Case **G3** exercises the converging step.

This is the same bounded re-resolution the Batch 14t repair already implements in
the handler (`MAX_LIFECYCLE_ATTEMPTS = 2`). **The RPC does not add a second
recovery mechanism, and it deliberately provides no "already applied" success
signal** — such a signal would have to be inferred from a state the caller
already admitted it cannot see.

---

## 5. Evidence classes, kept separate

- **Statement-level database evidence — this document.** The harness runs the
  proposed SQL against real PostgreSQL 16.15. It proves what the *primitive* does.
- **Handler evidence — `docs/BATCH14T-PRE-RECONCILIATION-SNAPSHOT.md`.** The
  mocked suites (`batch14t`, `batch14r-*`) prove what the *TypeScript handler*
  does. They do not exercise this SQL, because the SQL is not wired in.
- **Not evidence of integration.** Nothing here shows the handler and the
  primitive working together, because no such integration exists.

---

## 6. Residual limits (stated, not papered over)

- **A phantom row can escape.** The re-location holds the rows it finds
  (`FOR UPDATE`), but a row **inserted** concurrently during the call is not
  blocked by a row lock — and neither is an existing row that another writer
  **relinks**. **Correction (Batch 14v §3): the unique-email index does not close
  this.** An email index constrains INSERTs by email, while the race is about the
  *linkage* appearing: a row with a different email but the same subscription id
  is unaffected, and relinking an existing row is an UPDATE that no insert-time
  index constrains. Closing it needs writer synchronization (14v §3,
  "Synchronization proposal"), which is **not applied**.
- **`subscription_status` values are not vocabulary-checked.** `plan` is, because
  the vocabulary is small and closed. `subscription_status` is free text in the
  deployed schema and is passed through unvalidated. If it should be constrained,
  that is a separate decision.
- **One allow-list, not per-table.** The five writable columns are allowed on both
  tables. The application currently writes a narrower set to `profiles`; the
  function does not enforce that narrower set.
- **Never executed outside the harness.** No production database has ever run it.
- **Independent review has not happened.** That is the next step, and it is the
  reason this stops here.

---

## 7. Still outstanding

1. **Independent review of this primitive** — the immediate next step.
2. **`invoice.payment_succeeded`** — separate review; not covered by any of this.
3. **Unlinked-row authority decision** — held; `batch14s` stays committed red.
4. **Unique-index migration hardening and independent review** — prepared, not
   applied.
5. **SELECT-only production verification** — not performed.
6. **Separately authorized SQL application**, then an **exact-SHA application
   release**.
