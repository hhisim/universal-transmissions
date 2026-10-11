# Batch 14r — lifecycle authorization and concurrency

Baseline: `c58391853950631cc9316b7e4adaccf0ef9dc1f1`
Branch: `omni/batch14-membership-write-contract`
Worktree: `/mnt/deploy-ssd/worktrees/ut-batch14`

Production remains `ac49ce062d66` on `main`. **No production SQL was run and
nothing was released.** The Q1/Q2 repair and the authenticated writer's ownership
checks are preserved (§7).

---

## 1. What this batch adds

Three things, in the order they were asked for:

| # | Item | State |
|---|---|---|
| 1 | **E5** — contradictory non-null customer linkage fails closed, and both tables are validated before either is written | **repaired**, `batch14r-lifecycle-authorization.js` 21/0 |
| 2 | **E4 and the stale-reconciliation races** — snapshot before the provider call, conditional writes, re-resolution on conflict | **repaired**, `batch14r-concurrency-interleavings.js` 41/0 |
| 3 | **E2b** — unlinked rows in the other table | **promoted to a committed FAILING regression** (`batch14s-unlinked-row-authority.js`, 8 pass / 2 fail) with a bounded proposal in §5 that is **not implemented** |

Plus a transaction/versioning proposal (§6) that is **prepared and not applied**.

---

## 2. E5 — contradictory linkage (item 1)

### The defect

A profile stored `stripe_customer_id = cus_OTHER` and
`stripe_subscription_id = sub_A`. Stripe verified that `sub_A` belongs to
`cus_1`. The pre-repair locator consulted both linkage families and treated any
match as authorisation, so the subscription-only match resolved the row, the
write proceeded, and the profile was **rewritten** to `cus_1` and granted
`initiate` — acknowledged `200`. Two identity claims about one row were resolved
by silently overwriting one of them.

### The rule

A row reached through a subscription id whose stored `stripe_customer_id` is
**non-null and different** from the verified customer is a **contradiction**:
neither claim is provably the stale one, so the module refuses
(`lifecycle_contradictory_linkage`, code `CONTRADICTORY_LINKAGE`) and writes
nothing. A subscription-only match may never override the customer a row names.

Two things this rule deliberately does **not** reject:

- a row whose `stripe_customer_id` is **NULL** — subscription-only linkage is the
  ordinary state of a row recorded before the customer id was persisted (E5c);
- a row whose `stripe_customer_id` **agrees** (E5d).

### Validate both tables before writing either

`membership-lifecycle.ts` is now three phases:

```
resolveLifecycleRows   — locate the rows a verified relationship owns, from the
                         authorization snapshot, BEFORE any Stripe call
planLifecycleUpdate    — validate and accept the whole write for ONE table; NO write
commitLifecycleUpdate  — write, conditioned on the step-1 snapshot
```

The handler plans **both** tables before committing **either**. In E5a the
contradiction lives in the *second* table (`profiles`) while the first
(`ut_members`) is clean and perfectly writable; the suite asserts
`state.writes.length === 0` — no avoidable first-table write precedes the
rejection.

### Evidence (mocked boundaries)

```
batch14r-lifecycle-authorization
  --- E5a contradiction in the second table (profiles) ---
    status=500 failures=["profiles:lifecycle_contradictory_linkage"] writes=[]
  --- E5b contradiction in the first table (ut_members) ---
  --- E5c control: subscription-only linkage (customer NULL) is allowed ---
  --- E5d control: matching customer linkage is allowed ---

assertions passed: 21
assertions failed: 0
```

E5a additionally asserts the mistaken customer is **not** repaired
(`stripe_customer_id` still `cus_OTHER`), the profile gains no entitlement, the
clean first table is unchanged, no row is created and no insert is attempted.

---

## 3. E4 and the stale-reconciliation races (item 2)

### Snapshot before the provider call

The authorization snapshot — the rows, and the exact values the write is
conditioned on — is read **before Stripe is consulted**. A snapshot taken after
the provider lookup is not an authorization snapshot: it would condition the
write on state that was already stale when the decision was made. This forced a
change in what may be used to *locate* a row: only ids already known without
Stripe (the event's own subscription id and whatever the trusted tables
recorded). The **governing** id still comes from Stripe's current state, but it
is used for the write payload, never for finding the row.

### Conditional writes

Every write carries, in addition to the row's real primary key, the snapshot's

- `plan`
- `subscription_status`
- `stripe_customer_id`
- `stripe_subscription_id`

with **null-safe** comparisons — `IS NULL` when the snapshot held no value,
`= value` otherwise — and is issued with `.select()` so the affected-row count is
available. A statement that affects **no** row is a lost race, reported
distinctly as `lifecycle_write_conflict`.

### A conflict re-resolves — it does not reuse the old authority

`MAX_LIFECYCLE_ATTEMPTS = 2`: on a conflict the handler re-reads the stored
linkage **and re-queries Stripe**, then re-plans and re-commits. Only if the
second attempt also loses its race is the delivery refused (`500`), so Stripe
retries. Both the deletion path and the dunning path use the same loop.

### The eight deterministic interleavings

`state.beforeUpdate` fires inside the update branch only — after the resolving
reads, before the statement matches — so order A is *exact*, not timing-based.
Order B is the same change landing before the snapshot is taken.

| Scenario | order A (change lands in the window) | order B (change lands first) |
|---|---|---|
| **S1 customer reassignment** | one lost race, then the fresh resolution finds the contradiction → `500`, **0 rows changed**, the reassignment stands | contradiction found on the first look → `500`, **0 write attempts** |
| **S2 replacement subscription** | one lost race; the fresh Stripe state shows the replacement governs → `stale-lifecycle` warning, `200`, our write never lands, linkage stays `B` | same outcome, **0 write attempts** |
| **S3 grant racing a cancellation** | `attempts=[0,1]` — one lost race then a successful conditional write; grant lands, linkage `B`, entitled | same outcome, `attempts=[1]` |
| **S4 status-only change** | `attempts=[0,1]`; the authoritative `past_due` wins on the **fresh** snapshot, plan and linkage untouched | same outcome, `attempts=[1]` |

Every case asserts final linkage, entitlement, response status and affected rows:

```
batch14r-concurrency-interleavings
    order A: status=500 failures=["ut_members:lifecycle_contradictory_linkage"] attempts=["ut_members/0"]
    order A: status=200 warnings=stale-lifecycle:sub_A attempts=[0]
    order A: status=200 failures=[] attempts=[0,1]
    order A: status=200 failures=[] attempts=[0,1]

assertions passed: 41
assertions failed: 0
```

The assertion that separates the two orders is the one on `attempts`: order A
must show the lost race, order B must show none, and the conserved end state must
be identical.

---

## 4. Something this batch removed

The payload-derived plan/status mapping (`active → initiate`,
`canceled → free`, …) at the top of the lifecycle case was dead once the write
began deriving both from the validated authority, and it is now gone. Plan and
status are computed in exactly one place, from `entitlementFromAuthority`. On an
early refusal the notification reports no plan change rather than a
payload-derived guess.

---

## 5. E2b promoted, and the bounded authority proposal (item 3)

`scripts/batch14s-unlinked-row-authority.js` is **committed RED on purpose**. It
asserts target behaviour that is not implemented:

```
batch14s-unlinked-row-authority  [PINNED DEFECT — EXPECTED RED]
  U1 (linked row revoked, unlinked row PAID)   eff=initiate  → FAIL: expected revoked
  U2 (linked row granted, unlinked row REVOKED) eff=guest     → FAIL: expected granted
assertions passed: 8
assertions failed: 2
```

### The problem

One table carries the verified linkage; the other holds a row for the same
address carrying **no linkage at all**. No lifecycle writer can address that
row — and must not, by address. The shared reader ranks it anyway, so:

- **U1 cancellation**: the linked row is revoked to `guest`, an unlinked row at
  `initiate`/`active` outranks it → the member **stays PAID**, acknowledged `200`.
- **U2 reactivation**: the linked row is granted `initiate`, an unlinked row whose
  `subscription_status` is `canceled` is the reader's revocation authority → the
  member **stays REVOKED**, acknowledged `200`.

Both suites also assert the unlinked row is **not** rewritten by address.

### Remedies considered and rejected

- **R1 — update the unlinked row by email.** Rejected. The address is not an
  authority on this path: `profiles` identity is not the address (8 of its 19
  deployed rows carry a `user_id` absent from `auth.users`), and rewriting a row
  no verified relationship owns is exactly the class of write this batch closed.
- **R2 — make `profiles.subscription_status` the revocation authority.**
  Rejected **as stated**. No lifecycle path owns that column: nothing writes it
  today, and nothing clears it, so honouring it would revoke **permanently**.
  Ownership must be established first — a path that writes *and clears* it under
  the same snapshot/CAS discipline — which in turn needs the `profiles` identity
  decision (option 1/2/3 in `docs/BATCH14-MEMBERSHIP-WRITE-CONTRACT.md` §6).
  Until then it stays non-authoritative.

### The proposed rule (bounded, reader-side, not implemented)

> When at least one membership row for the address carries a **verified Stripe
> linkage**, entitlement is decided by the **linked rows alone**. Unlinked rows
> are recorded as `unaddressable` and contribute nothing — neither a grant nor a
> revocation. When **no** row for the address carries a linkage, today's
> behaviour is unchanged: highest plan wins, `ut_members.subscription_status`
> revokes.

Why this shape:

- it fixes **both** directions — cancellation (U1) and reactivation (U2);
- it never writes by address, and never grants or removes entitlement on an
  unlinked row's word;
- it is scoped: a member whose records were never linked keeps exactly today's
  treatment, so no legacy member silently gains or loses access;
- it is a **reader** change in `src/lib/membership-plan.ts::resolveMembershipPlan`
  — no migration, no write-path change, no new authority.

Cost, stated plainly: an unlinked-only member (no linked row for that address at
all) is unaffected, so a legacy paid row with no linkage still grants, and an
unlinked `canceled` row still revokes. That is deliberate — with no verified
relationship there is nothing to prefer, and changing it would revoke access from
members whose linkage was simply never recorded.

`batch14s-unlinked-row-authority.js` is that policy's regression. It is red now;
it goes green when the rule lands, and a green run should be read as "the rule
landed — verify it was not weakened".

---

## 6. Transaction / versioning proposal (prepared, **not applied**)

**A single-table conditional UPDATE is already safe under concurrency.** Measured
on real PostgreSQL: two writers issuing the same guarded statement serialise on
the row lock, the qualification is re-evaluated after the lock is released, and
exactly one affects a row (§8 P5). That is where the lost-update protection comes
from — **not** from any index.

**A two-table lifecycle write is not atomic.** PostgREST issues one statement per
request, so the `ut_members` and `profiles` writes are separate transactions.
§8 P4 shows a half-write is reachable, and that only an explicit transaction keeps
the pair together.

**Proposal (requires its own authorization and review; nothing applied):** one
`security definer` function owned by the service role, e.g.

```
apply_lifecycle_update(
  p_customer_id      text,
  p_subscription_ids text[],
  p_member_fields    jsonb,
  p_profile_fields   jsonb
) returns table (table_name text, affected integer)
```

which locates both rows, applies both conditional updates inside one transaction,
`raise exception`s on any snapshot mismatch so the whole transaction rolls back,
and returns the per-table affected counts. PostgREST then answers an error and
Stripe retries. It is option (a); option (b) is to accept the half-write and keep
the retry loop as the convergence mechanism (the current state), documented as a
known window.

**Explicitly:** the `ut_members_email_lower_key` unique index does **not** solve
lifecycle lost updates. It constrains INSERTs by address; it says nothing about
UPDATE-versus-UPDATE races on plan, status or linkage, and it cannot make a
two-table write atomic.

---

## 7. Preservation

- **`src/lib/membership-write.ts` is not in the diff.** `writeMembershipRow` is
  never called from the lifecycle path, `userId` appears nowhere in the new
  module, and the remaining callers are the unchanged ones (`activate-free` ×2,
  `checkout` ×2, `invoice.payment_succeeded` ×2).
- `profiles.user_id` is read off the row the verified linkage resolved and used
  only as that row's primary key — never as, or in place of, an authenticated
  identity, and never fabricated.
- `invoice.payment_succeeded` is unchanged. `profiles.subscription_status` is
  still never written (§5 R2).
- The Q1/Q2 repair is intact: `batch14q` 20/0 and `batch14p` 34/0 at this
  revision, with `batch14q`'s Q3 (a resolved row the UPDATE does not affect is
  refused) now implemented by the conflict branch.

---

## 8. Results

### Mocked boundaries — 14 Green + 1 pinned Red

| Suite | Assertions | Failures |
|---|---|---|
| `batch14r-lifecycle-authorization.js` | 21 | 0 |
| `batch14r-concurrency-interleavings.js` | 41 | 0 |
| `batch14q-profiles-only-lifecycle.js` | 20 | 0 |
| `batch14p-webhook-coverage.js` | 34 | 0 |
| `batch14d-webhook-failure-reactivation.js` | 26 | 0 |
| `batch14e-reconciliation.js` | 22 | 0 |
| `batch14f-event-order.js` | 11 | 0 |
| `batch14g-authority-contract.js` | 12 | 0 |
| `batch14l-linkage-sequence.js` | 13 | 0 |
| `batch14b-membership-readback.js` | 41 | 0 |
| `batch14c-entitlement-revocation.js` | 38 | 0 |
| `batch14-membership-write-contract.js` | 51 | 0 |
| `batch14m-recorded-candidates.js` | 7 | 0 |
| `batch14n-pagination.js` | 15 | 0 |
| **352 assertions, 0 failures** | | |
| `batch14s-unlinked-row-authority.js` | 8 | **2 (pinned, §5)** |
| `batch11`, `batch12`, `batch12b` | exit 0 | — |

### Mutation runner

`scripts/batch14r-mutation-runner.py` — worktree-relative, restores from the
bytes it read in a `finally` block, verifies the target's sha256 after every
outcome, and refuses an anchor that does not match exactly once. Control included.

| # | Mutation | Caught by |
|---|---|---|
| M0 | control, no mutation | 0 failures everywhere |
| M1 | authority helper: early-return on the first live recorded subscription | exactly the three S6 assertions |
| M2 | conditional write accepts a lost race instead of re-resolving | 14r-conc 11, 14q 2 |
| M3 | `profiles` addressed by a non-existent `id` column | 14q 10, 14p 17 |
| M4 | profiles mirror skipped when there is no `metadata.email` | 14q 9 |
| M5 | contradictory-linkage guard dropped | 14r-auth 11, 14r-conc 11 |
| M6 | write conditioned on the primary key only (snapshot guards dropped) | 14r-conc 11 |
| M7 | planning writes, so a second-table rejection follows a first-table write | 14r-auth 4 |

```
MUTATION RUN PASSED — every mutation was detected and every restore verified
```

### Isolated real PostgreSQL — **separate evidence class**

PostgreSQL **16.15** (the earlier batches used 17.11; the SQL semantics below are
identical across the two). Private cluster on a private unix socket, **no TCP
listener**, synthetic rows only, cluster stopped and the data dir abandoned in
`/var/tmp`. **Not production, and not the production schema.**

```
P1 guard holds                    affected = 1
P2 row moved in the window        affected = 0   kept cus_OTHER, plan untouched = initiate
P3 'sub = null'                   affected = 0
P3 'sub IS NULL'                  affected = 1
P4 first table written, second not
     ut_members = guest/canceled      profiles = initiate/active
   same statements inside a rolled-back transaction
     ut_members = initiate/active
P5 two concurrent writers         writer 2 affected = 0 ; final = guest/canceled
```

P3 is why the guards are null-safe. P4 is the transaction proposal's evidence. P5
is why a single guarded UPDATE needs no version column — and why an index would
not have provided it.

### Build

- `npx tsc --noEmit` → **exit 0**
- `npx next build` → **exit 0** (`✓ Compiled successfully`, `✓ Generating static pages (196/196)` — unchanged from the parent commit)

---

## 9. Limits

- **The unlinked-row cases are not fixed** (§5). They are pinned red by a
  committed regression and depend on your decision.
- **The two-table write is not atomic** (§6). The retry loop converges it; the
  window is real and documented.
- **`MAX_LIFECYCLE_ATTEMPTS = 2`.** A second consecutive lost race refuses the
  delivery rather than looping. That is deliberate: repeated losses mean
  something else is actively rewriting the row, and guessing is worse than a
  retry.
- **A contradiction is not repaired.** A row that genuinely moved to another
  customer is now a refused delivery, not a silent rewrite. If that state is
  legitimate rather than erroneous, the linkage has to be corrected by the path
  that owns it, not by a lifecycle event.
- Only mocked-boundary evidence exists for the handler logic; the real-PostgreSQL
  evidence covers statement semantics only, not the handler.

---

## 10. Release prerequisites (all still open)

1. **Lifecycle concurrency and conditional writes** — implemented at the
   single-statement level (§3); the two-table atomicity gap remains (§6) and is
   the open part.
2. **Unique-index migration hardening and independent review** —
   `supabase/migrations/20261010_membership_write_contract.sql` is prepared,
   **not applied**, not independently reviewed. `profiles` still has no
   uniqueness constraint.
3. **SELECT-only production verification** — not performed.
4. **Separately authorized SQL application before application release** — no DDL
   or DML applied; nothing released.
5. **The unlinked-row authority decision** (§5) — a policy choice for the owner,
   with a committed failing regression and a bounded proposal waiting on it.
