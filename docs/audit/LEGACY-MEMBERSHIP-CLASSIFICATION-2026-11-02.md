# Legacy membership records — evidence classification (read-only)

**Date:** 2026-11-02 · **Source:** `profiles` (21 rows, 2 of them the audit QA accounts) and
`ut_members` (2 rows), cross-checked against `auth.users` sign-in history and `ut_orders`.
**No record was converted, migrated or modified.**

## Why this exists

`normalizeMemberPlan()` accepts only `initiate` / `free` / `guest`. Every other stored value
ranks as `guest`. `docs/BATCH14AY-ROLLOUT-DECISION.md` §1 already recorded this as *"ambiguous
legacy rows, no action"* — this document supplies the evidence behind that judgement so the
decision can be taken deliberately rather than by default.

## The nine rows outside the vocabulary

| # | plan | stored status | Stripe customer | Stripe sub | price_id | promo | trial end | created | last sign-in | orders |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `full` | active | – | – | – | – | – | 2026-03-21 | never | 0 |
| 2 | `full` | active | **yes** | – | – | – | – | 2026-03-21 | never | 0 |
| 3 | `full` | active | – | – | – | – | – | 2026-03-23 | never | 0 |
| 4 | `full` | active | – | – | – | **etsy** | 2026-04-24 | 2026-03-25 | never | 0 |
| 5 | `full` | active | – | – | – | **etsy** | 2026-04-24 | 2026-03-25 | never | 0 |
| 6 | `master` | active | – | – | – | – | – | 2026-04-12 | 2026-04-12 | 0 |
| 7 | `seeker` | active | **yes** | **yes** | – | – | – | 2026-04-19 | 2026-04-19 | 0 |
| 8 | `full` | active | – | – | – | – | – | 2026-04-21 | 2026-05-08 | 0 |
| 9 | `full` | active | – | – | – | – | – | 2026-04-21 | never | 0 |

## Classification

**A — Etsy promo comps (rows 4, 5).** `promo_source = 'etsy'` with a trial that ended
**2026-04-24**. Purchased access was a 30-day comp, and it expired seven months ago. No payment
instrument of any kind is recorded. *Evidence supports treating these as expired, not paid.*

**B — Manual/beta grants, no payment evidence (rows 1, 2, 3, 8, 9).** Five `full` rows created
21–25 March. None has `price_id`; none has a subscription; two are on a single business domain
(`kamallaya.com`); one carries a Stripe customer id but no subscription, which is what checkout
creates before any payment. These look like hand-granted early access. *Ambiguous — cannot be
shown to be paid, cannot be shown to be a fix-up either.*

**C — Manual grant with activity (row 6, `master`).** Created and signed in once on 2026-04-12,
no payment evidence. *Ambiguous, same as B.*

**D — QA test row (row 7, `seeker`).** `qa_…@example.com`, created during batch testing on
2026-04-19, and the only legacy row carrying a real Stripe customer **and** subscription.
`seeker` is VOA's free-tier name — the row looks like a VOA-shaped record written into the UT
database by a test. *This is test data, and it is the single reason "one legacy row has a
subscription" is true.*

## What the evidence rules out

- **No legacy row has a `price_id`.** Not one records which price was bought.
- **No legacy row has a live Stripe subscription** other than the QA row.
- **No legacy row has an order** in `ut_orders`.
- So: **no paying customer is currently locked out by the vocabulary gap.** The two Etsy rows are
  expired comps; the rest are unattested grants.

## Options, with the consequence of each

1. **Leave as-is (current behaviour).** Nine rows rank `guest`. No paying customer is affected
   today. Any future row written as `full`/`master` would silently lose access.
2. **Read-time alias `full`/`master` → `initiate`.** Reversible, no data rewrite. Grants lifetime
   paid access to five unattested grants and two expired promo comps — including access to Codex
   II and Ask Hakan, which are the things people pay for.
3. **Migrate the rows to `initiate`.** Same outcome as 2, but written down; harder to reverse and
   it destroys the evidence of what the rows used to say.
4. **Targeted: honour only rows with reconciliation evidence**, i.e. `entitlement_authority_at`
   present — which is **none of them**. This changes nothing today but makes the rule explicit.

**Recommendation: option 1 plus a guard.** Keep the fail-closed normaliser (an unknown value must
never silently become paid), and add a startup/report check that counts rows outside the
vocabulary so the next `full` row is noticed rather than buried. If you want the two Etsy buyers
recomped, do it as a deliberate grant (`plan: initiate`, with `promo_source` retained), not by
widening the vocabulary.

**This needs your decision. Nothing has been changed.**
