/**
 * Recovering a paid order that has no row.
 *
 * The failure this closes: `/api/checkout` writes the `ut_orders` row when the Checkout session is
 * created. If that insert fails, the customer still pays, Stripe still confirms, and the webhook's
 * update matches **zero rows**. The handler used to report "no matching row" and answer 2xx — so
 * Stripe stopped retrying and the sale existed only inside Stripe. Money taken, nothing recorded.
 *
 * Retrying does not fix that: no number of webhook deliveries creates a row that was never written.
 * So the webhook RECONSTRUCTS the order from the verified session instead.
 *
 * What makes that safe:
 *   · every value comes from Stripe's own record of the settled payment, or from the product
 *     information carried in the session — nothing is inferred from a price table or a guess;
 *   · the insert is keyed on `stripe_session_id`, the table's unique payment reference, so a
 *     concurrent or repeated delivery cannot create a second order;
 *   · a recovered row is marked in `notes`, so it is never indistinguishable from a normal sale;
 *   · if the reconstruction cannot be completed, the caller is told, and the handler answers
 *     non-2xx so Stripe keeps retrying instead of the loss being acknowledged.
 */

import { pickCustomerEmail } from "@/lib/order-identity";

export interface RecoveryAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface RecoveryShipping {
  name?: string | null;
  address?: RecoveryAddress | null;
}

export interface RecoveryCustomerDetails {
  email?: string | null;
  name?: string | null;
}

export interface RecoveryPrice {
  product?: unknown;
}

export interface RecoveryLineItem {
  description?: string | null;
  quantity?: number | null;
  price?: RecoveryPrice | null;
}

export interface RecoveryLineItems {
  data?: RecoveryLineItem[];
}

export interface RecoverySession {
  id: string;
  payment_intent?: unknown;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: RecoveryCustomerDetails | null;
  customer_email?: string | null;
  shipping_details?: RecoveryShipping | null;
}

export interface RecoveredOrder {
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  customer_email: string;
  customer_name: string | null;
  product_id: string | null;
  product_title: string;
  amount_cents: number;
  currency: string;
  status: "paid" | "fulfilled";
  is_digital: boolean;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  notes: string;
}

export interface RecoveryResult {
  /** The row to insert, or null when the session cannot be trusted enough to rebuild from. */
  row: RecoveredOrder | null;
  /** True when every element the customer will see came from verified data. */
  complete: boolean;
  /** Human-readable reason when the row is null or incomplete. Never contains customer data. */
  reason: string;
}

/** The provider's own answer to "was this paid, and for how much" — the only basis for recovery. */
export function isRecoverablePayment(session: RecoverySession): boolean {
  const total = session.amount_total;
  const currency = session.currency;
  return (
    typeof total === "number" &&
    Number.isInteger(total) &&
    total > 0 &&
    typeof currency === "string" &&
    /^[a-z]{3}$/.test(currency)
  );
}

export function buildRecoveredOrder(input: {
  session: RecoverySession;
  lineItems: RecoveryLineItems | null;
  isDigital: boolean;
}): RecoveryResult {
  const { session, lineItems, isDigital } = input;

  if (!session?.id) {
    return { row: null, complete: false, reason: "session has no id" };
  }
  if (!isRecoverablePayment(session)) {
    return { row: null, complete: false, reason: "no verifiable total or currency on the session" };
  }

  const email = pickCustomerEmail({
    customerDetailsEmail: session.customer_details?.email,
    sessionEmail: session.customer_email,
  });

  const items = lineItems?.data ?? [];
  const first = items[0];
  const productTitle = items.length
    ? items.map((li) => `${li.description ?? "item"} ×${li.quantity ?? 1}`).join(" + ")
    : "";
  const rawProduct = first?.price?.product;
  const productId = typeof rawProduct === "string" ? rawProduct : null;

  /* An incomplete reconstruction is still recorded — an order with a missing product title is
     recoverable by a human, whereas a sale acknowledged and never stored is not. It is marked. */
  const missing: string[] = [];
  if (!productTitle) missing.push("product title");
  if (!email.email) missing.push("customer email");

  const address = session.shipping_details?.address ?? null;
  const noteParts = ["recovered from the Stripe webhook: the checkout row never existed"];
  if (missing.length) noteParts.push(`unresolved: ${missing.join(", ")}`);

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : ((session.payment_intent as { id?: string } | null | undefined)?.id ?? null);

  return {
    complete: missing.length === 0,
    reason: missing.length ? `unresolved: ${missing.join(", ")}` : "complete",
    row: {
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntent,
      customer_email: email.email.toLowerCase(),
      customer_name: session.customer_details?.name ?? null,
      product_id: productId,
      product_title: productTitle || "— (product could not be resolved)",
      amount_cents: session.amount_total as number,
      currency: session.currency as string,
      status: isDigital ? "fulfilled" : "paid",
      is_digital: isDigital,
      shipping_name: session.shipping_details?.name ?? null,
      shipping_address_line1: address?.line1 ?? null,
      shipping_address_line2: address?.line2 ?? null,
      shipping_city: address?.city ?? null,
      shipping_state: address?.state ?? null,
      shipping_postal_code: address?.postal_code ?? null,
      shipping_country: address?.country ?? null,
      notes: noteParts.join(" · "),
    },
  };
}
