# Batch 14v — closing the RPC validation gaps

Baseline: `7dae344bd3cb9fc06f104ea45bd307d7278921c3` (`7dae344`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, no application integration, no release.**

The primitive is still a review candidate and still unwired: `git diff
--name-only <base>..HEAD -- src` is empty. Applying it remains a separately
authorized step.

---

## 0. Corrections to the Batch 14u review

| Batch 14u said | Corrected |
|---|---|
| The harness has **43 assertions** (and 39 before that) | It now has **86**. Any count in the 14u document is stale; this document is authoritative. |
| The mutation table's per-mutation counts (37/2, 36/3, …) | Those were measured against a smaller case set. **§6** re-measures all of them. |
| *"only a uniqueness constraint on the linkage would close that window"* | **Corrected and made specific.** The `ut_members_email_lower_key` unique index does **not** close the absence races, and a uniqueness constraint on the *linkage* is not available today (no such constraint is proposed here). The races are **reproduced** in §3 and the fix is writer synchronization, not an index. |
| *"It performs no reads of its own"* was narrowed to one re-location read per target | Still true, and now load-bearing in a second way: the re-location is what makes an **absent** snapshot checkable, in both directions (§3). |
| *(nothing said about who wins a race)* | **Stated in §4**: the primitive decides only which caller commits first. **It cannot decide which of two callers holds the newer Stripe observation** — it never sees Stripe. |
| *(no claim about installation)* | **Added in §5**: the file is one transaction, so a half-install is impossible, and that is now tested rather than asserted. |

---

## 1. Failing cases written first

The instruction was to add the failing cases **before** changing SQL. They were
added to `scripts/batch14u-rpc-harness.sh` and run against the Batch 14u SQL:

```
assertions passed: 70
assertions failed: 16
BATCH14U_RPC_HARNESS_FAILED
```

with these among them:

```
FAIL: V1 a present update target with EMPTY entries is refused (rc=0, out=ut_members:updated:0)
FAIL: V2 an entry that OMITS a located row is refused (rc=0, out=ut_members:updated:1)
FAIL: V2b no partial write survived (expected 'initiate,initiate', got 'guest,initiate')
FAIL: V3 a REPEATED pk is refused (... out=ERROR: BATCH14 CONFLICT ...)
FAIL: V4 a REPEATED target is refused (... out=ERROR: BATCH14 CONFLICT ...)
FAIL: V5 a SKIPPED row whose status moved on is refused (rc=0, out=ut_members:skipped:0)
FAIL: V6 a SKIPPED row with no guards at all is refused (rc=0, out=ut_members:skipped:0)
FAIL: V7 an UPDATE entry with an empty set is refused (rc=0, out=ut_members:updated:1)
FAIL: V8 a SKIP entry carrying a set is refused (rc=0, out=ut_members:skipped:0)
FAIL: V9 a second-table validation failure is refused (... CONFLICT ...)
FAIL: N5 a profiles COVERAGE violation is refused (rc=0, out=profiles:updated:1)
FAIL: N6/N7/N8 profiles duplicate-pk / empty-update / skip-guards ...
FAIL: J3 the CREATE was rolled back with it (no half-install) (got 'apply_lifecycle_update(jsonb)')
```

Two of these are worse than a missing guard:

- **V2** left a **partial write**: one located row was updated (`guest,initiate`)
  and the caller was told `updated:1`. The omitted row vanished silently.
- **V1/V7** reported `updated` for a target that **wrote nothing** or wrote
  nothing meaningful.

V3/V4/V9 were *rejected*, but only **incidentally** — by a downstream `CONFLICT`,
because the second pass no longer matched. Nothing was *checking* for them, so
the diagnostic named the wrong problem and a differently-shaped payload could
have slipped through.

---

## 2. The repair

`supabase/migrations/20261012_apply_lifecycle_update.sql`, per target, in order:

1. **Re-locate** the linkage under `FOR UPDATE`; compare with `seen_pks`.
2. **Snapshot validation**, independent of what gets written:
   - `DUPLICATE_TARGET` — a table named twice is refused before anything runs;
   - `MISSING_PK`, `DUPLICATE_PK` — every entry has exactly one pk;
   - `ENTRY_NOT_LOCATED` — no entry outside the located set;
   - `COVERAGE` — **no located row may be left out**;
   - `EMPTY_UPDATE` — an update target that located rows but supplied none;
   - `EMPTY_SET`, `SKIP_WITH_SET`, `INCOMPLETE_SNAPSHOT`, `COLUMN_NOT_WRITABLE`,
     `PLAN_VOCABULARY` — per-entry rules.
3. **Guard validation for every entry, update *or* skip.** The rows are already
   held, so this is a stable read. A skipped row whose `plan`, `status`, customer
   or subscription moved is a `CONFLICT`, not a quiet no-op.
4. **Apply** only the entries selected for UPDATE, still conditioned on the
   snapshot.
5. **`INCOMPLETE_UPDATE`** — the rows actually written must equal the rows
   located. This is the invariant that makes "never report updated when a
   required update was omitted" enforceable rather than aspirational, and §6
   shows it firing when the coverage check is removed.

**Coverage is what makes `updated` mean something.** Without it a caller could
name one row, omit another, and still be told the update succeeded.

---

## 3. The absence races, reproduced with deterministic barriers

Both races use a **barrier, not a sleep**: session 1 runs the primitive and then
blocks on an advisory lock; a `\! touch` marks that the re-location has already
happened; the racer commits; session 1 then commits. The ordering is forced, not
timed.

**R1 — a matching row is inserted after the re-location**

```
session 1: begin; apply_lifecycle_update(absent payload); <barrier>; commit;
racer:     insert a row matching the linkage; commit;
result:    session 1 exits 0 and reports ut_members:absent:0
           — and a matching row now exists.
```

**R2 — an existing unlinked row becomes linked after the re-location**

```
session 1: begin; apply_lifecycle_update(absent payload); <barrier>; commit;
racer:     update an existing row to set the linkage; commit;
result:    session 1 exits 0 and reports ut_members:absent:0
           — and that row is now linked.
```

Both are **reproduced**: the harness asserts the call succeeds, reports `absent`,
and that the unseen row is there afterwards (cases R1c/R2c).

### Correcting the index claim

**The unique-email index does not close these races.** It constrains INSERTs by
**email**, and both races are about the **linkage** appearing:

- a row with a *different* email but the same `stripe_subscription_id` is not
  blocked by an email index at all;
- R2 is an **UPDATE** of an existing row, which no insert-time unique index
  constrains, ever;
- and the re-location's `FOR UPDATE` holds only the rows it **found** — it cannot
  lock a row that does not exist yet, nor one that is about to be relinked.

So the race is not "two rows with the same email"; it is "the set of rows owned by
a linkage changed between the snapshot and the commit". No index on either column
closes that.

### Synchronization proposal — NOT APPLIED

This is a **proposal for decision**, not an applied policy. It would change
concurrency behaviour for every writer, so it is deliberately left out of the
migration.

Every writer that can change which rows a linkage owns must serialize on the same
identity. They are:

1. `src/app/api/stripe-webhook/route.ts` — the lifecycle path
   (`created`/`updated`/`deleted`/`payment_failed`), 7 call sites;
2. `src/app/api/stripe-webhook/route.ts` — `invoice.payment_succeeded`, via
   `writeMembershipRow`, 2 call sites;
3. `src/app/api/billing/activate-free/route.ts` — `writeMembershipRow`, 2 sites;
4. `src/app/api/billing/checkout/route.ts` — `writeMembershipRow`, 2 sites;
5. any out-of-band SQL — migrations, manual corrections, support scripts.

Two shapes, in increasing coverage:

- **(A) Cooperative** — each writer takes
  `pg_advisory_xact_lock(hashtextextended('membership:' || key, 0))` **before** it
  snapshots, where `key` is the customer id when present and the subscription id
  otherwise; the primitive takes it too. Covers 1–4 only, and only for as long as
  every writer remembers.
- **(B) Enforced** — a `BEFORE INSERT OR UPDATE` trigger on both tables takes the
  same lock keyed on the row's own linkage, so participation is automatic and
  out-of-band SQL (5) cannot opt out. This is the shape that actually covers
  "all relevant writers"; it also adds lock traffic to every membership write,
  needs a consistent key and lock ordering to avoid deadlock, and therefore needs
  its own review.

Neither is implemented here. **(B) is the one that closes the race**; (A) is
weaker but cheaper. Choosing between them is a policy decision, and this batch
does not make it.

---

## 4. Concurrency: what the primitive does and does not decide

Two **real connections**, an advisory-lock barrier, and both completion orders
(cases CON1/CON2). Each run asserts the **process exit status** and the **result**
of both callers:

| | first committer | second caller |
|---|---|---|
| CON1 (free first) | exit 0, `ut_members:updated:1` | exits non-zero, `BATCH14 CONFLICT` |
| CON2 (guest first) | exit 0, `ut_members:updated:1` | exits non-zero, `BATCH14 CONFLICT` |

and in both, the first committer's state stands (`free/…` in CON1, `guest/…` in
CON2). The loser's write never lands.

**Accurate description of first-committer semantics.** The primitive serializes
the two calls on the row lock and the guards re-evaluate after it is released; the
caller that commits first keeps the row, and the other is refused. That is all it
does. **It cannot decide which caller holds the newer Stripe observation**: it
never contacts Stripe and has no event timestamp, so if caller A observed Stripe
at T1 and caller B at T2 > T1, the primitive still lets **whichever commits
first** win — even if that one's observation is the older. Deciding that is the
caller's job, from a fresh reconciliation, which is why a `CONFLICT` must trigger
fresh resolution rather than a retry (Batch 14t §4).

---

## 5. Installation is atomic

The file is wrapped in `begin; … commit;`, so function creation, ownership
(`alter … owner to postgres`), the comment and the execution grants commit
together or not at all.

Tested rather than asserted (case J): the function is dropped, the migration is
applied with its **final grant sabotaged** (targeting a role that does not
exist), and the result is checked:

- the apply exits **non-zero**, and
- `to_regprocedure('public.apply_lifecycle_update(jsonb)')` is **NULL** — the
  CREATE rolled back with the failed grant, leaving **no half-install**.

Re-applying the real migration restores the function and it still works (J4/J5),
and applying it twice in a row is clean (I1). Ownership and ACLs are asserted on
both application and reapplication: owner `postgres`, `SECURITY DEFINER` true,
`search_path` pinned, `service_role` has EXECUTE, `anon`/`authenticated`/`PUBLIC`
do not.

---

## 6. Mutations

Twelve mutations of the SQL, each run through the same harness. Every one is
detected.

| # | Mutation | Result |
|---|---|---|
| MU1 | drop `revoke … from public` | exit 1 — 5 failures (`anon`, `authenticated` can execute) |
| MU2 | disable the located-vs-seen staleness check | exit 1 — 3 (disappeared reported as `absent:0`) |
| MU3 | make all four guard comparisons non-null-safe | exit 1 — 7 (C4/C6 and downstream) |
| MU4 | remove the `skip` branch | exit 1 — 1 (`skipped` became `updated:0`) |
| **MU5** | remove the `EMPTY_UPDATE` check | exit 1 — 2 |
| **MU6** | remove the `COVERAGE` check | exit 1 — 3, and the **`INCOMPLETE_UPDATE` invariant fires** |
| **MU7** | remove the `DUPLICATE_PK` check | exit 1 — 3 |
| **MU8** | remove the guard-validation pass (rely on the UPDATE's own guard) | exit 1 — 2 (V5, N8: a **skipped** row's moved guards went unnoticed) |
| **MU9** | remove `begin;`/`commit;` | exit 1 — 1 (J3: the CREATE was **not** rolled back) |
| **MU11** | remove the `DUPLICATE_TARGET` check | exit 1 — 1 |
| MU12 | *(not applicable)* | — |

MU6 is worth noting: removing coverage makes the layer-5 invariant fire, so the
"never report `updated` when an update was omitted" guarantee has **two**
independent enforcements, and the mutation shows the second one is reachable, not
decorative.

**Not claimed:** no mutation exercises `INCOMPLETE_UPDATE` directly (MU6 reaches
it indirectly), and no mutation covers the `SET_CHANGED` classification, which has
no case of its own.

---

## 7. What is and is not proven

- **Statement-level database evidence** — this document and
  `scripts/batch14u-rpc-harness.sh`. Real PostgreSQL 16.15, a private cluster on a
  private unix socket with no TCP listener, synthetic rows, torn down after the
  run. It proves what the **primitive** does.
- **Handler evidence** — `docs/BATCH14T-PRE-RECONCILIATION-SNAPSHOT.md`. Mocked
  suites proving what the **TypeScript handler** does.
- **NOT proven:** any integration of the two. No application code calls this
  function, so nothing here demonstrates the handler and the primitive working
  together. Claiming otherwise would be a fabricated result.
- **NOT proven:** that the races in §3 are fixed. They are **reproduced**, and the
  fix is a proposal.
- **NOT proven:** the primitive under production data volumes, or on the
  production schema (the harness recreates the deployed shapes; it is not a
  restore).

### Results

```
batch14u-rpc-harness.sh (clean)  ->  assertions passed: 86   assertions failed: 0   exit 0
batch14u-rpc-harness.sh (before the repair) -> 70 / 16      exit 1
```

---

## 8. Still outstanding

1. **Independent review of the primitive** — the immediate next step.
2. **Synchronization decision** (§3): cooperative (A) or enforced trigger (B).
   Not applied; needs authorization either way.
3. `invoice.payment_succeeded` — separate review.
4. Unlinked-row authority decision — held; `batch14s` stays committed red.
5. Unique-index migration hardening and independent review — prepared, not
   applied.
6. SELECT-only production verification — not performed.
7. Separately authorized SQL application, then an exact-SHA application release.

No production authorization is granted by this batch, and none is implied.
