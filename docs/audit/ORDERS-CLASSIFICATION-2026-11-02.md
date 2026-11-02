# Order classification — `ut_orders` (read-only)

**Date:** 2026-11-02 · **Source:** `opixpkquyapeqdceyczs.ut_orders`, 64 rows, read-only SELECT
**No record was modified, deleted or re-statused.**

## Correction to the standing record

The previous worklog said "no successful production paid-order write has ever been observed"
and "three abandoned pending rows". **Both were wrong.**

- There **is** a completed, paid, fulfilled physical order: **$215.00**, created 2026-04-10, with a
  live Stripe session and a real payment-intent object (`pi_…`, not a test charge). The buyer's
  name, address and both Stripe identifiers are withheld from this committed document; they are
  held in the private operations record only.
- The pending count is **62**, not 3.

## What the 64 rows actually are

| Class | Count | Evidence |
|---|---|---|
| Abandoned checkout | **62** | `stripe_session_id` present, `stripe_payment_intent_id` null, status `pending`, `customer_email` empty |
| Completed + fulfilled | **1** | Live payment intent, status `fulfilled`, **email empty** |
| Synthetic test | **1** | product literally `Test`, a synthetic `test@…` address, session id `test_123` |

Amounts: $99.00 ×44 (Digital Edition), $215.00 ×19 (Physical Edition), $7.77 ×1
(Companion), plus the $99 test row. Date range 2026-03-26 → 2026-10-19.
All 64 carry a Stripe session id; **only 1 carries a payment intent**.

## The defect this exposed

**`customer_email` is empty on every single non-test row — including the paid, fulfilled one.**

The order writer records the session but never captures or backfills the buyer's email, so:

- a real customer who paid $215 has no usable contact record in the database;
- the only identifying field is `customer_name`, on that one row;
- nobody can be emailed, refunded or shipped to from this table;
- the earlier "no paid orders" conclusion was drawn from that same blind spot.

This is a data-capture bug in the checkout path, not a reporting gap. **It is separate from the
membership repair and I have not changed it.**

## Proposed cleanup (for approval — nothing executed)

1. **Delete** the single synthetic row (`product_title = 'Test'`, session `test_123`).
2. **Keep** the fulfilled order untouched; recover its email from the Stripe session via the
   Stripe API and backfill `customer_email` — this needs a decision, because it writes to a
   customer record.
3. **Archive, do not delete**, the 62 abandoned checkouts once they are older than a retention
   window. They are evidence of traffic, not of sales; deleting them destroys the only record
   that checkout was attempted.
4. Fix the writer so the email is captured when the session is created and updated on
   `checkout.session.completed`.

Recommended order: 4 first (stop the bleeding), then 2 (recover the paying customer), then 1,
then 3 on a schedule you choose.
