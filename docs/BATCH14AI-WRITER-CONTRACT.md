# The authority writer contract — Batch 14ai, completed in 14aj

**Candidate. Prepared, not released.** Continues from `d2b366c`. No production SQL was
applied; no production configuration changed. The schema addition
(`entitlement_authority_at`) is unchanged by these batches, and the SQL candidate remains
unapplied.

## 1. Four defects in the writer side of the 14ah contract

14ah decided entitlement by `entitlement_authority_at` — evidence that a completed,
verified reconciliation produced a row — but left the rules for WRITING it incoherent.
Every case below was reproduced through the real webhook and the real reader, with its own
independently seeded Stripe state, **before the repair that closes it**.

Cases A, B and C were captured against `7100f2a` (Batch 14ai):

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

Case C2 was captured against `d2b366c` (Batch 14aj):

```
  --- C2 both rows already attested to A; B's invoice arrives before B's lifecycle event ---
    status=200 member.sub=sub_B profiles.sub=sub_A bothAttested=true eff=READ_ERROR
  FAIL: C2 TARGET: every target the invoice attests must record the SAME governing subscription (profiles records sub_A)
  FAIL: C2 TARGET: an invoice delivered before the lifecycle event must not lock the member out (got READ_ERROR)
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

**C — the invoice attested a contradiction it created itself.** With both rows unattested,
its mirror write settled `plan` and the customer but left the stored subscription alone
while stamping both rows, so the member recorded `sub_B` and the mirror `sub_A`, and the
reader **failed closed** — on the invoice's own successful write.

**C2 — and omitting the stamp does not remove existing authority.** Batch 14ai's first
answer to C was to stop the mirror write attesting. That only works while the mirror is
unattested. When BOTH rows are already attested to `A`, and Stripe has `A` canceled and
`B` active, an invoice for `B` delivered **before** `B`'s lifecycle notification still
corrects the member to `sub_B` while the mirror keeps its existing attestation and its
stale `sub_A` — the contradiction returns, and the member is denied. Suppressing a write's
stamp cannot withdraw authority a row already carries, and erasing it would have concealed
the conflict instead of resolving it.

## 2. The contract

> **A write may attest a target only when it supplies that target's `plan` AND its
> `stripe_subscription_id` in the SAME write — setting the linkage, or explicitly
> clearing it with `null`. Otherwise it must not attest, and the row keeps the authority
> it already had.**

> **Every attested target a write changes must be left recording the SAME governing
> relationship.** The invoice therefore corrects the mirror's linkage to the governing
> subscription rather than leaving it stale (C2).

Why both columns, and why the linkage:

* `plan` is the entitlement being claimed. A write that does not determine the plan
  cannot claim to have decided the row (case B).
* `stripe_subscription_id` is what the reader's contradiction check keys on. A write that
  corrects one table's linkage while leaving the other's stale linkage attested
  manufactures a contradiction — whether it stamps the second row (C) or merely leaves its
  existing stamp standing (C2).
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
| `customer.subscription.deleted` | **member**: plan `guest`, status `canceled`, subscription `null`, period end `null`; **profile**: plan `free`, subscription `null` | **YES** (was NO before 14ai) |
| `invoice.payment_succeeded` | **member**: plan, customer, governing subscription; **profile**: plan, customer, the SAME governing subscription | **YES** on both (14ai: member only; 14ah: both, mirror's linkage stale) |
| `invoice.payment_failed` (dunning) | status `past_due` | **NO** (was YES before 14ai) |
| `api/billing/checkout` (customer creation), `writeMembershipRow` | customer, plan | **NO** |

## 4. Enforcement, not convention

`unattestableWrite(fields)` in `src/lib/membership-lifecycle-atomic.ts` returns the names a
write is missing when it names `entitlement_authority_at`. Both atomic entry points —
`buildAtomicLifecyclePayload` (via `applyAtomicLifecycleUpdate`, two targets) and
`applyAtomicLifecycleUpdateOne` (single target) — **refuse** such a write with the named
code `UNATTESTABLE_WRITE` and a detail naming the target and the missing column, and they
return **before any payload is built or sent**, so a refused write costs **zero RPC
calls**. A caller that regresses fails loudly instead of over-claiming authority, and an
unusable snapshot keeps its own distinct code (`SNAPSHOT_UNUSABLE`).

The predicate is exported and pinned by the focused suite, in both directions.

## 5. What the repairs must not break, and do not

* **Genuine contradiction rejection** — two attested rows that genuinely disagree about the
  customer or the subscription still fail closed (`batch14ah` N3, `batch14ag` A6). The
  invoice now *resolves* the contradiction it used to create; it does not suppress the
  check.
* **Recorded revocations are preserved** — no path clears `subscription_status` back to an
  entitled value, and the invoice never writes it at all.
* **Stale-event protection** — a superseded deletion still performs **zero** write
  attempts and touches neither table (`batch14ai` F; `batch14t` T2 unchanged).
* **Atomic rollback and retry** — a revocation that keeps losing its race rolls BOTH
  tables back with the authority field included, applies zero rows, and attests nothing; a
  healthy retry then revokes and attests both tables (`batch14ai` D, driven by real
  `BATCH14 CONFLICT` from the isolated database).
* **The checkout-ID counterexamples** — `batch14ah` X1/X2 unchanged at 24/0.
* **No timestamp-based event ordering.** `entitlement_authority_at` is evidence that a
  reconciliation ran, never a tie-breaker between rows; nothing compares timestamps. C2 is
  precisely the case where ordering the events differently (invoice first) must be safe on
  its own terms.
* **No rewriting of unlinked rows by address.** The untouched tables are reported
  `absent, affected=0` and nothing is inserted.

## 6. Evidence

* **`scripts/batch14ai-authority-writer-contract.js` → 48 / 0**: the four cases (A/B/C/C2)
  plus D (rollback + retry of an attesting revocation), E (the predicate, both shapes, and
  an accepted complete pair), G (both entry points refuse with a named code and **zero RPC
  calls**, changing nothing) and F (stale-event protection).
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

## 7. Corrections to the earlier reviews

* **14ah's writer table** recorded the cancellation as *"NO — omitted, therefore
  preserved"*. That was defect A: a first cancellation preserved nothing to preserve. A
  cancellation now **attests** (establishes or refreshes) and clears the mirror's linkage.
* **14ah's dunning row** recorded **YES**; dunning now attests nothing (defect B).
* **14ai's invoice row** recorded the mirror as **NO**. Defect C2 shows that is
  insufficient: *omitting a stamp does not remove existing authority*. The invoice now
  attests both targets it changes, each recording the same governing subscription.
* **14ah's limit** *"the rule is only as strong as the writers"* is enforced rather than
  trusted: an unattestable write is refused on both entry points, before the round trip.

## 8. Limits

* Exposure against production data was still not re-measured; index hardening, production
  verification and SQL application remain separate work.
* The mirror's subscription **linkage** is cleared on cancellation and corrected to the
  governing subscription by an invoice. Both changes make the two rows agree; while they
  are mid-flight, an older *unattested* row may still record a superseded id, which is
  harmless because it contributes nothing while an attested row exists.
* An attested row still has no expiry: the last completed reconciliation wins until a
  newer one writes it.
* C2 covers the invoice-before-lifecycle ordering. Other interleavings of the same two
  events are covered by the concurrency suites, not re-derived here.

**No release readiness is claimed. Production remains `ac49ce06`.**
