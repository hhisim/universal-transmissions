/**
 * Where an order's customer email comes from, and in what order of authority.
 *
 * The defect this exists to close: a Checkout session's `customer_email` is the LEGACY field and
 * Stripe leaves it null on modern sessions — the address the buyer typed lives in
 * `customer_details.email`. Code that read only `customer_email` wrote `""` into `ut_orders` for a
 * real, paid, physical order (2026-04-10, cs_live_a1l2V1…, $245.00 paid, name recorded, email lost).
 *
 * The order below is deliberately "what the buyer typed" first, then the deprecated echo, then the
 * payment instrument's own record. Nothing is invented: if none of these carry an address the answer
 * is the empty string and the caller records an order with no email rather than a guessed one.
 */

export interface OrderEmailSources {
  /** Checkout session's `customer_details.email` — what the buyer entered at checkout. */
  customerDetailsEmail?: string | null;
  /** The legacy `session.customer_email` field. Usually null on modern sessions. */
  sessionEmail?: string | null;
  /** The charge's `billing_details.email`. */
  billingDetailsEmail?: string | null;
  /** The PaymentIntent's `receipt_email`. */
  receiptEmail?: string | null;
}

export interface ResolvedEmail {
  email: string;
  /** Which source produced it, for logs and reconciliation reports. Never a value. */
  source:
    | "customer_details.email"
    | "session.customer_email"
    | "billing_details.email"
    | "receipt_email"
    | "unavailable";
}

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  // A single "@" or a placeholder is not an address; treat obviously unusable values as absent.
  if (!trimmed || !trimmed.includes("@")) return "";
  return trimmed;
}

export function pickCustomerEmail(sources: OrderEmailSources): ResolvedEmail {
  const candidates: Array<[ResolvedEmail["source"], unknown]> = [
    ["customer_details.email", sources.customerDetailsEmail],
    ["session.customer_email", sources.sessionEmail],
    ["billing_details.email", sources.billingDetailsEmail],
    ["receipt_email", sources.receiptEmail],
  ];

  for (const [source, value] of candidates) {
    const email = clean(value);
    if (email) return { email, source };
  }

  return { email: "", source: "unavailable" };
}

/** True when an order is a real sale and must carry a customer email. */
export function orderNeedsEmail(order: { status?: string | null; customer_email?: string | null }): boolean {
  const status = (order.status ?? "").toLowerCase();
  const isSale = status === "paid" || status === "fulfilled";
  return isSale && !clean(order.customer_email);
}

/**
 * A completed Checkout session is not proof of payment.
 *
 * Asynchronous methods (SEPA debits, bank transfers) emit `checkout.session.completed` with
 * `payment_status: "unpaid"` and settle later through `async_payment_succeeded`. Only a settled
 * payment may be written as a sale.
 */
export function isSettledPayment(paymentStatus: unknown): boolean {
  return typeof paymentStatus === "string" && paymentStatus.toLowerCase() === "paid";
}
