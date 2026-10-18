import { supabaseAdmin } from "@/lib/supabase";

/**
 * Recording a confirmed PayPal order into the SAME process the Stripe path already uses.
 *
 * The Stripe route inserts a `ut_orders` row when the session is created (`status: "pending"`), and
 * the webhook then updates it to `paid` or `fulfilled` with the customer, the shipping address and
 * the payment reference, and notifies the studio. A confirmed PayPal capture has to land in the same
 * place, or a PayPal sale would be money taken with no order behind it.
 *
 * Two deliberate differences from the Stripe path, both because PayPal tells us later:
 *   · the row is written on CONFIRMED CAPTURE, not at order creation — PayPal collects the payer's
 *     email and address during approval, so a row written earlier would be a guess, and abandoned
 *     approvals would leave `pending` rows that were never going to be paid;
 *   · the payment reference is stored as `paypal:<order id>`. `ut_orders.stripe_session_id` is the
 *     table's unique payment reference and is NOT NULL, and it is what `/sanctum/orders` and the
 *     webhook key on. Prefixing keeps a PayPal order from ever being mistaken for a Stripe session.
 *     The column is named for Stripe because the schema predates PayPal; no schema change is made
 *     here (SQL was out of scope), and `notes` records the provider explicitly.
 */

const TELEGRAM_BOT_TOKEN = process.env.AKASHA_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_HOME_CHANNEL ?? "5491669332";

export interface PayPalOrderRecord {
  orderId: string;
  captureId: string | null;
  productId: string;
  productTitle: string;
  amountCents: number;
  isDigital: boolean;
  email: string | null;
  name: string | null;
  address: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country_code?: string | null;
  } | null;
}

/** The row's payment reference. Prefixed so a PayPal order is never read as a Stripe session. */
export function paypalOrderReference(orderId: string): string {
  return `paypal:${orderId}`;
}

/**
 * Write the order, once. A repeated return finds the existing row and reports it rather than
 * inserting a second one; a genuine race is caught by the unique constraint and reported the same
 * way, because the row that won is the row that describes this payment.
 */
export async function recordPayPalOrder(
  record: PayPalOrderRecord
): Promise<{ recorded: boolean; alreadyRecorded: boolean; detail?: string }> {
  const reference = paypalOrderReference(record.orderId);
  try {
    /* ONE atomic statement, keyed on the payment reference.
     *
     * A read-then-insert is not safe here: two returns arriving together both read "no row" and both
     * insert, and only the database's unique constraint would notice. `onConflict` with
     * `ignoreDuplicates` resolves that inside the write itself, and `select()` reports what was
     * actually inserted — so a repeated or concurrent return produces ONE logical order, and this
     * function can say truthfully which call created it. */
    const { data, error } = await supabaseAdmin
      .from("ut_orders")
      .upsert(
        {
          stripe_session_id: reference,
          stripe_payment_intent_id: record.captureId,
          customer_email: record.email ?? "",
          customer_name: record.name,
          product_id: record.productId,
          product_title: record.productTitle,
          amount_cents: record.amountCents,
          currency: "usd",
          /* PAID for both kinds of product.
           *
           * "Fulfilled" is a claim about a delivery that has actually happened, and nothing here
           * performs one: there is no download route, and the Download control on /sanctum/orders
           * has no handler behind it. Writing `fulfilled` at the moment money is taken would record
           * a delivery that did not occur. A physical order has not shipped either, so both start at
           * `paid` — dispatch or delivery moves them on. (The Stripe webhook still writes
           * `fulfilled` for digital orders; that is pre-existing behaviour, left unchanged and
           * reported rather than silently diverged from.) */
          status: "paid",
          shipping_name: record.name,
          shipping_address_line1: record.address?.line1 ?? null,
          shipping_address_line2: record.address?.line2 ?? null,
          shipping_city: record.address?.city ?? null,
          shipping_state: record.address?.state ?? null,
          shipping_postal_code: record.address?.postal_code ?? null,
          shipping_country: record.address?.country_code ?? null,
          is_digital: record.isDigital,
          notes: `paypal order ${record.orderId}`,
        },
        { onConflict: "stripe_session_id", ignoreDuplicates: true }
      )
      .select("id");

    if (error) {
      return { recorded: false, alreadyRecorded: false, detail: error.message };
    }
    const inserted = (data ?? []).length > 0;
    return { recorded: true, alreadyRecorded: !inserted };
  } catch (err) {
    return {
      recorded: false,
      alreadyRecorded: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** The studio is told about a sale by the same mechanism the Stripe webhook uses. */
export async function notifyStudio(
  record: PayPalOrderRecord,
  recording: { recorded: boolean; detail?: string } = { recorded: true }
): Promise<{ notified: boolean; detail?: string }> {
  if (!TELEGRAM_BOT_TOKEN) return { notified: false, detail: "AKASHA_BOT_TOKEN is not set" };
  const amount = `$${(record.amountCents / 100).toFixed(2)}`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        text:
          `<b>\u{1F6D2} NEW SALE (PayPal) — ${amount}</b>\n` +
          `Customer: ${record.name ?? record.email ?? "Unknown"}\n` +
          `Email: ${record.email ?? "—"}\n` +
          `Product: ${record.productTitle} \u00d71\n` +
          (record.address?.country_code ? `Ship to: ${record.address.country_code}\n` : "") +
          `Order: ${record.orderId}\n` +
          (recording.recorded
            ? `\u2705 Order recorded in UT DB`
            : `\u26a0\ufe0f The order row did NOT write (${recording.detail ?? "unknown"}) \u2014 record it by hand`)
      }),
    });
    if (!res.ok) return { notified: false, detail: `telegram HTTP ${res.status}` };
    return { notified: true };
  } catch (err) {
    return { notified: false, detail: err instanceof Error ? err.message : String(err) };
  }
}
