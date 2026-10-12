# Batch 14ai — the authority writer contract

**Candidate. Prepared, not released.** Continues from `7100f2a`. No production SQL was
applied; no production configuration changed. The schema addition
(`entitlement_authority_at`) is unchanged by this batch, and the SQL candidate remains
unapplied.

## 1. Three defects in the writer side of the 14ah contract

14ah decided entitlement by `entitlement_authority_at` — evidence that a completed,
verified reconciliation produced a row — but left the rules for WRITING it incoherent.
Each case below was reproduced through the real webhook and the real reader, with its own
independently seeded Stripe state, **before the repair**. Captured output against
`7100f2a`:

```
  --- A first verified cancellation, profiles-only beside an unlinked paid row ---
    status=200 profiles.plan=free attested=false eff=initiate
  FAIL: A the cancellation ESTABLISHES authority on the row it reconciled
  FAIL: A TARGET: a verified cancellation must not be defeated by an unreconciled paid row (got initiate)
  --- B dunning must not attest an untouched cached plan ---
    before=initiate status=200 member.status=past_due attested=true eff=guest
  FAIL: B TARGET: dunning must NOT attest a plan it did not determine
  FAIL: B TARGET: dunning must not change who is entitled (got guest)
  --- C invoice attestation must not contradict itself ---
    status=200 member.sub=sub_B profiles.sub=sub_A eff=READ_ERROR
  FAIL: C TARGET: the invoice must not attest a contradicted pair and lock the member out (got READ_ERROR)

assertions passed: 7
assertions failed: 5
```

**A — a first verified cancellation established nothing.** The deletion path omitted the
stamp (it was thought of as "preserve"), so when the reconciled row had never been
attested, the revocation produced no authority at all. With a profiles-only membership
beside an unlinked paid row, no row was attested, the previous rule decided, and the
**stale paid row kept access** — a verified cancellation defeated by a row nobody
reconciled.

**B — dunning attested a plan it did not determine.** Dunning writes
`subscription_status` only, leaving `plan` as whatever was cached. Stamping it turned
that untouched cached plan into a complete entitlement decision: in the reproduction the
effective plan moved from `initiate` to `guest` **merely because dunning ran**.

**C — the invoice attested a contradiction it created itself.** Its member write corrects
the subscription; its mirror write settles `plan` and the customer but never touches the
stored subscription. Stamping both left an attested pair whose subscription ids disagree
(`sub_B` vs `sub_A`), so the reader **failed closed** and locked the member out — on the
invoice's own successful write.

## 2. The contract

> **A write may attest a target only when it supplies that target's `plan` AND its
> `stripe_subscription_id` in the SAME write — setting the linkage, or explicitly
> clearing it with `null`. Otherwise it must not attest, and the row keeps the authority
> it already had.**

Why both columns, and why the linkage:

* `plan` is the entitlement being claimed. A write that does not determine the plan
  cannot claim to have decided the row (case B).
* `stripe_subscription_id` is what the reader's contradiction check keys on. A write that
  corrects one table's linkage while attesting the other's untouched, stale linkage
  manufactures a contradiction (case C).
* **Explicitly clearing** counts as supplying it: a revocation determines that the
  subscription no longer governs, which is why a cancellation is attestable (case A).

A cancellation therefore **attests the rows it revokes** — establishing authority on the
first one and refreshing it on every later one — and **clears the linkage on both
tables**, so a later attested pair cannot contradict on a subscription that no longer
governs.

## 3. What each path writes

| Path | Fields written | Attests? |
|---|---|---|
| `customer.subscription.created` / `.updated` | plan, status, customer, subscription, period end | **YES** |
| `customer.subscription.deleted` | **member**: plan `guest`, status `canceled`, subscription `null`, period end `null`; **profile**: plan `free`, subscription `null` | **YES** (was NO) |
| `invoice.payment_succeeded` | **member**: plan, customer, governing subscription; **profile**: plan, customer | member **YES**; profile **NO** (was YES) |
| `invoice.payment_failed` (dunning) | status `past_due` | **NO** (was YES) |
| `api/billing/checkout` (customer creation), `writeMembershipRow` | customer, plan | **NO** |

## 4. Enforcement, not convention

`unattestableWrite(fields)` in `src/lib/membership-lifecycle-atomic.ts` returns the names a
write is missing when it names `entitlement_authority_at`, and
`buildAtomicLifecyclePayload` **refuses** such a payload with a named detail rather than
silently dropping the stamp. A caller that regresses now fails loudly instead of
over-claiming authority. The predicate is exported and pinned by the focused suite.

The repair is four edits: the module check, and the three call sites (the deletion gains
the stamp on both targets and the mirror's cleared linkage; dunning and the invoice's
mirror write lose the stamp).

## 5. What the repair must not break, and does not

* **Genuine contradiction rejection** — two attested rows that disagree about the
  customer or the subscription still fail closed (`batch14ah` N3, `batch14ag` A6).
* **Stale-event protection** — a superseded deletion still performs **zero** write
  attempts and touches neither table (`batch14ai` F; `batch14t` T2 unchanged).
* **Atomic rollback and retry** — a revocation that keeps losing its race rolls BOTH
  tables back with the authority field included, applies zero rows, and does not attest
  anything; a healthy retry then revokes and attests both tables (`batch14ai` D, driven by
  real `BATCH14 CONFLICT` from the isolated database).
* **The checkout-ID counterexamples** — `batch14ah` X1/X2 unchanged at 24/0.
* **No timestamp-based event ordering.** `entitlement_authority_at` is evidence that a
  reconciliation ran, never a tie-breaker between rows; nothing compares timestamps.
* **No rewriting of unlinked rows by address.** The untouched tables are reported
  `absent, affected=0` and nothing is inserted.

## 6. Evidence

* **`scripts/batch14ai-authority-writer-contract.js` → 34 / 0**: the three cases (A/B/C)
  plus D (rollback + retry of an attesting revocation), E (the module's refusals, both
  shapes, and an accepted complete pair) and F (stale-event protection).
* **Pinned cases preserved**: `batch14s` **10 / 0** with unchanged bytes.
* **Everything else unchanged**, re-run for this commit — `batch14b` 41/0, `batch14c` 38/0,
  `batch14d` 12/14, `batch14e` 13/9, `batch14f` 11/0, `batch14g` 10/2, `batch14l` 7/6,
  `batch14q` 10/10, `batch14-membership-write-contract` 51/0, `batch14m` 7/0, `batch14n`
  15/0, `batch14p` 49/0, `batch14t` 27/0, `batch14r-concurrency` 41/0,
  `batch14r-authorization` 21/0, `batch14af-invoice-write-consistency` 49/0,
  `batch14ag` 30/0, `batch14ah` 24/0 — each still-red suite with a **byte-identical
  failing-assertion list**.
* `scripts/batch14af-atomic-integration.sh` → **24 / 0** (re-run: the module changed).
* `npx tsc --noEmit` → exit 0; `npm run build` → exit 0.

## 7. Corrections to the 14ah review

* Its writer table recorded the cancellation as *"NO — omitted, therefore preserved"*.
  That was the defect: a first cancellation preserved nothing to preserve. A cancellation
  now **attests** (establishes or refreshes) and clears the mirror's linkage.
* Its invariant *"never cleared"* stands, with the sharper statement: **written by every
  completed reconciliation, never set to NULL by any path**.
* Its limit *"the rule is only as strong as the writers"* is now enforced rather than
  trusted: an unattestable write is refused by the module.

## 8. Limits

* Exposure against production data was still not re-measured; index hardening, production
  verification and SQL application remain separate work.
* The mirror's linkid is now cleared on cancellation. A later reconciliation restores it;
* The mirror's subscription **linkage** is now cleared on cancellation. A later
  reconciliation restores it; until then the mirror records that the subscription no
  longer governs, which is what the member row records too.
* An attested row still has no expiry: the last completed reconciliation wins until a
  newer one writes it.

**No release readiness is claimed. Production remains `ac49ce06`.**
