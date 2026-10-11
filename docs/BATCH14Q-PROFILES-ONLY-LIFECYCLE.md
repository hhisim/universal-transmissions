# Batch 14q — profiles-only lifecycle repair

Baseline: `84e5a9799ed275e20c5f829d2cfd49911144b43b`
Branch: `omni/batch14-membership-write-contract`
Worktree: `/mnt/deploy-ssd/worktrees/ut-batch14`

Production remains `ac49ce06`. **No production SQL was run and nothing was
released.** Concurrency, migration hardening and SELECT-only production
verification are untouched and remain open release blockers (§8).

---

## 1. The defect

Both lifecycle membership writes were set-based filters whose affected-row count
was discarded:

| Path | Statement (before) | Failure mode |
|---|---|---|
| `customer.subscription.created` / `.updated` | `ut_members` `.update(...).eq("stripe_customer_id", customerId)` | matches ZERO rows for a profiles-only member; no error, counted as success |
| `customer.subscription.created` / `.updated` | `profiles` `.update(...).eq("email", email)` | **never executed at all** when the event carried no `metadata.email` (`if (email)` guard) |
| `customer.subscription.deleted` | `ut_members` `.eq("stripe_customer_id", customerId).or(...)` | same zero-match blindness |
| `customer.subscription.deleted` | `profiles` `.eq("stripe_customer_id", customerId)` | same zero-match blindness |
| `invoice.payment_failed` | `ut_members` `.eq("stripe_customer_id", customerId).neq(...)` | same zero-match blindness |

A profiles-only member (legal under option 3) is exactly the case where the
`ut_members` statement cannot match: they have no row there. Their cancellation
therefore wrote nothing, left `profiles.plan = 'initiate'`, and the handler
answered `200`. Stripe saw a successful delivery and never retried.

Reproduced against the pre-repair handler — the new suite run with
`src/app/api/stripe-webhook/route.ts` reverted to `84e5a979`:

```
assertions passed: 11
assertions failed: 9
  FAIL: Q1 at least one required write actually affected a row (writes=["update/0"])
  FAIL: Q1 the profiles row reflects the cancellation (plan=initiate status=active)
  FAIL: Q1 effective entitlement is revoked to guest/free (got initiate)
  FAIL: Q2 at least one required write actually affected a row (writes=["update/0"])
  FAIL: Q2 the profiles row records B's linkage (sub=null)
  FAIL: Q2 entitlement is restored to initiate (got free)
  FAIL: Q3 an update that affected no row is REFUSED, not acknowledged (got 200)
  FAIL: Q3 the failure is named in the response (got [])
  FAIL: Q3 the retry completed the revocation (got initiate)
```

`writes=["update/0"]` is the defect in one line: a statement was issued, it
affected nothing, and that was treated as done.

---

## 2. The repair

New module **`src/lib/membership-lifecycle.ts`** — the explicit update path for
membership rows that ALREADY EXIST.

`resolveLifecycleRows(client, table, authority, isEligible?)` resolves the rows a
lifecycle event is allowed to write:

- the authority is the **verified Stripe relationship** — the customer id and
  each subscription id the event legitimately owns (the governing id from
  Stripe's *current* state, the ids the trusted tables already recorded, and the
  non-terminal candidates seen while reconciling);
- both linkage families are consulted, because a row may carry only one of them;
- results are deduplicated **by primary key**; two distinct rows matching one
  verified relationship fails closed as `lifecycle_duplicate_rows`;
- a row reachable through the linkage but carrying no primary key fails closed
  as `lifecycle_unidentified_row` rather than widening the filter to the address;
- a lookup failure, or a response with no usable row array, is a failure — never
  absence.

`applyLifecycleUpdate(client, table, authority, fields, options)` then writes:

- **update-only by construction** — there is no insert branch, so no membership
  row can be invented to make an update succeed;
- each resolved row is written by its **actual primary key** (`ut_members.id`,
  `profiles.user_id`) — never by an address filter;
- the statement is issued with `.select()` and the **affected-row count is
  checked**; anything other than exactly one row per resolved row returns
  `lifecycle_row_not_updated` and fails the delivery, so Stripe retries;
- a table in which **no** row carries the verified linkage reports
  `linked: false, updated: 0` — honest, and distinguishable from a write.

### Why this is not `writeMembershipRow`

`writeMembershipRow` is the AUTHENTICATED writer: its `profiles` branch refuses
to touch a row unless the caller supplies an auth user id that matches the stored
one, because an address match alone does not authorise a write. That check is
**unchanged and untouched** by this batch.

A Stripe lifecycle event carries no auth user id. Its authority is a different
one: the customer/subscription relationship the handler has already verified
against Stripe's own current state. So the repair adds a **separate** path rather
than relaxing the authenticated one:

- `writeMembershipRow` is never called from the lifecycle path;
- `profiles.user_id` is read **off the row the verified linkage resolved** and
  used only as that row's primary key. It is never fabricated, never taken from
  the event, and never presented as — or substituted for — an authenticated
  identity;
- the event's `metadata.email` is no longer a write key at all. It is used for
  the Telegram notification and for logging; it never selects the row that is
  written.

### Handler wiring

| Event | Change |
|---|---|
| `customer.subscription.created` / `.updated` | both tables written through `applyLifecycleUpdate`; the **governing** subscription id from Stripe's current state is recorded (previously the *event's* id was written, which could be the superseded one); a non-finite `current_period_end` no longer throws `RangeError` |
| `customer.subscription.deleted` | both tables written through `applyLifecycleUpdate`; the old `.or(eq(id), is(null))` guard is preserved as an explicit `isEligible` predicate — a row recording a *different* subscription is superseded and is left untouched |
| `invoice.payment_failed` | routed through the same path; the "do not overwrite a recorded cancellation" `neq` is preserved as an `isEligible` predicate |
| `invoice.payment_succeeded` | **unchanged** — still `writeMembershipRow`, still `protectPaidPlan: false`, still does not write `subscription_status` |

`profiles.subscription_status` is still never written, for the reason already
documented in `membership-plan.ts`: the shared reader ignores it for entitlement,
and a value written there could never be cleared.

---

## 3. Mock fidelity

The regression mocks could express "the update happened" and "the update threw",
but **not** "the update matched no row" — which is the defect under test. Fixed
in all six webhook-driving suites (`14d`, `14e`, `14f`, `14g`, `14l`, `14p`) and
in the new `14q`:

- `.select()` on an update chain marks the statement as RETURNING;
- the awaitable update branch then resolves the matched rows as an **array** —
  `[]` for a zero-match statement, exactly as PostgREST answers (200 + `[]`);
- `data: null` is still returned when `.select()` was not chained, so the mock
  does not over-model either.

---

## 4. Regressions

**`scripts/batch14q-profiles-only-lifecycle.js`** — new, 20 assertions, real
handler + authority helper + reader + writes. Stripe seeded explicitly per id.
No `metadata.email` anywhere, and no `ut_members` row: the member exists only as
a `profiles` row.

- **Q1** profiles-only at `initiate`, cancellation through stored customer
  linkage. Assertions: `200`; a required write genuinely affected a row; the
  profiles row reflects the cancellation; the reader **resolves** (`ok === true`)
  and lands on `guest`/`free` — `READ_ERROR` is a lookup failure and is
  explicitly not accepted as proof of revocation; no row was inserted; the
  existing profile identity (`user_id = u1`) is untouched; no `ut_members` row
  was invented.
- **Q2** profiles-only at `free`, genuine replacement `B` active. Requires **both**
  that the profiles row records `B`'s linkage **and** that entitlement is restored
  to `initiate` — either alone is an incomplete repair. Plus the same
  no-insert / identity-untouched / no-invented-row assertions.
- **Q3** a row that the linkage resolves but the `UPDATE` does not affect must be
  **refused**, not acknowledged: `500`, the failure named as `profiles:…`, and the
  member still paid because nothing was written; the retry then completes the
  revocation. This is the "zero matches must not count as completion" rule
  exercised end-to-end.

**`scripts/batch14p-webhook-coverage.js`** — 22 → 34 assertions.

- **S1 both-table state**: seeds both tables, and now asserts both after
  cancellation (`ut_members guest/canceled`, `profiles free`), after reactivation
  (both tables record `B`, status cleared from `canceled`, entitlement paid), and
  after a repeated `B` update.
- **S4 genuine partial success then failure/retry**: both tables seeded, the
  `profiles` mirror fails while the `ut_members` write **really succeeds**;
  asserts `500`, the failure named, the `ut_members` write applied, the `profiles`
  mirror still stale (a real partial application), then the retry completing the
  mirror and leaving the revocation complete.
- **S5 both-table preservation on stale deletion**: both tables record `B`, a
  delayed deletion of `A` arrives; asserts neither table was downgraded, both
  still record `B`, entitlement still paid and readable, and that the rejected
  deletion performed **zero** membership writes.
- **S3** strengthened: the reader must resolve to `guest`/`free`, not merely
  "not initiate" — `READ_ERROR` no longer satisfies it.

**`scripts/batch14d-webhook-failure-reactivation.js`** — W3 re-labelled and
commented to state the distinction the repair depends on: a table with **no
linked row** has nothing to update (acknowledged), which is NOT the same as a
resolved row the update fails to affect (refused, see Q3).

---

## 5. Mutation coverage

**`scripts/batch14q-mutation-runner.py`** — worktree-relative (root derived from
the script's own path, no hard-coded checkout), restores from the bytes it read
in a `finally` block, and verifies the target's sha256 after **every** outcome
(after mutation, after each suite run, after restore — including on exception).
An anchor that does not match exactly once aborts the mutation instead of
silently no-opping.

```
  scripts/batch14p-webhook-coverage.js         exit=0   failures=0   ok      <- M0 control
  scripts/batch14q-profiles-only-lifecycle.js  exit=0   failures=0   ok
  scripts/batch14d-webhook-failure-reactivation.js exit=0 failures=0  ok

  scripts/batch14p-webhook-coverage.js         exit=1   failures=3   ok      <- M1
  scripts/batch14q-profiles-only-lifecycle.js  exit=0   failures=0   ok
  restore: hash verified (e25528ef8561)

  scripts/batch14q-profiles-only-lifecycle.js  exit=1   failures=2   ok      <- M2
  scripts/batch14p-webhook-coverage.js         exit=0   failures=0   ok
  restore: hash verified (f85fad4e0cd8)

  scripts/batch14q-profiles-only-lifecycle.js  exit=1   failures=10  ok      <- M3
  scripts/batch14p-webhook-coverage.js         exit=1   failures=10  ok
  restore: hash verified (f85fad4e0cd8)

  scripts/batch14q-profiles-only-lifecycle.js  exit=1   failures=9   ok      <- M4
  scripts/batch14p-webhook-coverage.js         exit=0   failures=0   ok
  restore: hash verified (12585e532baa)

MUTATION RUN PASSED — every mutation was detected and every restore verified
```

| # | Mutation | Detected as |
|---|---|---|
| M0 | control, no mutation | 0 failures everywhere |
| M1 | authority helper: early-return on the first **live recorded** subscription (the behaviour as it stood at `2600add3`) | exactly the three S6 assertions — the ambiguity is no longer detected |
| M2 | lifecycle writer: accept an update that affected no row | the two Q3 assertions |
| M3 | lifecycle writer: address `profiles` by a non-existent `id` column instead of `user_id` | 10 + 10 failures |
| M4 | webhook: skip the profiles mirror when the event carries no `metadata.email` (the pre-repair guard) | 9 failures in 14q |

M1 reproduces the known three-S6-failure signature exactly; its diagnosis is not
repeated here.

---

## 6. Results

| Suite | Assertions | Failures |
|---|---|---|
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
| `batch11-member-message-authz.js` | exit 0 | — |
| `batch12-verified-billing-identity.js` | exit 0 | — |
| `batch12b-plan-status-callers.js` | exit 0 | — |

- `npx tsc --noEmit` → **exit 0**
- `npx next build` → **exit 0** (`✓ Compiled successfully`, `✓ Generating static pages (196/196)`; the `Route /api/billing/session` dynamic-server-usage notice is the pre-existing benign one)

The `profiles` identity question, the `profiles`-vs-`ut_members` divergence and
the option-3 decision are unchanged by this batch.

---

## 7. Deliberate non-changes

- **`writeMembershipRow` is not modified.** Its ownership check
  (`existingUserId !== claimedUserId → identity_mismatch`) and its
  `missing_identity` refusal for a `profiles` insert without a verified `user_id`
  are exactly as they were. No caller of it changed except that the lifecycle
  path stopped using address filters — it never used `writeMembershipRow`.
- **No INSERT anywhere in the lifecycle path**, so no row is created to make an
  update succeed.
- **`invoice.payment_succeeded` is untouched**, including its "do not set
  `subscription_status`" rule and the optional `profiles` mirror warning.
- **No price → plan mapping change, no migration, no policy or grant change.**

---

## 8. Limits and open items

- **A row with no verified linkage is not addressable.** If a paid `profiles` row
  carries neither `stripe_customer_id` nor any known `stripe_subscription_id`,
  a lifecycle event cannot reach it and the handler reports `linked: false`
  rather than writing through the event's address. That is deliberate — an
  address from the payload is not an authority — and it is logged. It is the one
  way entitlement can still under-revoke, and it is now observable instead of
  silent.
- **`profiles.plan` differs between revoking paths**: the deletion path writes
  `free`, the lifecycle path writes the entitlement's `guest`. Both are non-paid
  and the reader ranks them accordingly; the asymmetry is pre-existing (the
  lifecycle path always derived its plan from `entitlementFromAuthority`) and was
  left alone.
- **Concurrency is not addressed here** — resolve-then-update is not atomic, and
  a row deleted between the two steps surfaces as `lifecycle_row_not_updated`,
  which fails the delivery and self-corrects on Stripe's retry. A compare-and-set
  for the lifecycle path is **not** implemented.
- **Migration hardening** (`ut_members_email_lower_key`) is prepared and still
  **not applied**.
- **SELECT-only production verification** of the deployed rows was **not**
  performed.

All three remain open release blockers.
