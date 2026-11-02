/**
 * Recovering a paid order that has no row — and refusing to recover one we cannot trust.
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
 *   · every value comes from Stripe's record of the settled payment, the session's line items, or the
 *     catalogue entry the checkout stamped into metadata — never from a guess;
 *   · the reconstruction is CHECKED against the catalogue: the product must exist and the money must
 *     reconcile (line items + shipping = the amount actually charged);
 *   · a reconstruction that fails a check is still recorded, but marked INCOMPLETE — and an
 *     incomplete order never fulfils, never grants access and never emails the customer;
 *   · the insert is keyed on `stripe_session_id`, so a concurrent delivery cannot duplicate it.
 */

import { pickCustomerEmail } from "@/lib/order-identity";
import { products } from "@/data/products";
import { shippingCentsFor, requiresShipping } from "@/data/shipping";

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
  amount_total?: number | null;
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
  /* Modern sessions carry the address here; `shipping_details` is the legacy top-level field and is
     absent on current API versions. Reading only the legacy one silently loses the address. */
  collected_information?: { shipping_details?: RecoveryShipping | null } | null;
  metadata?: Record<string, string> | null;
  total_details?: { amount_shipping?: number | null } | null;
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
  row: RecoveredOrder | null;
  /** True only when the order reconciles with the catalogue AND every customer-facing field exists. */
  complete: boolean;
  /** Human-readable reason when the row is null or incomplete. Never contains customer data. */
  reason: string;
  /** Issues that must be resolved by a person before this order may fulfil. */
  issues: string[];
  /** Shipping the provider charged, when it is known — used for the receipt's money breakdown. */
  shippingCents: number | null;
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

/**
 * Does this payment reconcile with the product it claims to be?
 *
 * Three independent facts must agree: the catalogue product named in metadata, the money Stripe
 * charged, and the line items the session actually carried. A disagreement is not corrected here —
 * it is reported, because an order we force into shape is worse than one a human looks at.
 */
export function validateAgainstCatalogue(input: {
  session: RecoverySession;
  lineItems: RecoveryLineItems | null;
}): { productId: string | null; isDigital: boolean; issues: string[]; shippingCents: number | null } {
  const issues: string[] = [];
  const declaredId = input.session.metadata?.product_id ?? null;
  const product = declaredId ? products.find((p) => p.id === declaredId) : undefined;

  if (!declaredId) issues.push("no product metadata on the session");
  else if (!product) issues.push(`unknown product "${declaredId}"`);

  const isDigital = (input.session.metadata?.product_type ?? "") === "digital" || (product ? !requiresShipping(product.id) : false);

  const chargedTotal = input.session.amount_total ?? null;
  const chargedShipping = input.session.total_details?.amount_shipping ?? null;
  const items = input.lineItems?.data ?? [];
  const itemTotal = items.length
    ? items.reduce((sum, li) => sum + (typeof li.amount_total === "number" ? li.amount_total : 0), 0)
    : null;

  if (product && itemTotal !== null) {
    const catalogueCents = Math.round(product.price * 100);
    if (itemTotal !== catalogueCents) {
      issues.push(`line items ${itemTotal} do not match catalogue price ${catalogueCents}`);
    }
  }

  if (chargedTotal !== null && itemTotal !== null) {
    const expected = itemTotal + (chargedShipping ?? 0);
    if (expected !== chargedTotal) issues.push(`charged ${chargedTotal} does not equal items+shipping ${expected}`);
  }

  /* Nothing to reconcile against: we cannot prove the amount belongs to a catalogue product, so the
     order is recorded but stays incomplete. */
  if (itemTotal === null) issues.push("session line items unavailable");

  return {
    productId: product?.id ?? declaredId,
    isDigital,
    issues,
    shippingCents: typeof chargedShipping === "number" ? chargedShipping : null,
  };
}

export function buildRecoveredOrder(input: {
  session: RecoverySession;
  lineItems: RecoveryLineItems | null;
  isDigital?: boolean;
}): RecoveryResult {
  const { session, lineItems } = input;

  if (!session?.id) {
    return { row: null, complete: false, reason: "session has no id", issues: ["no session id"], shippingCents: null };
  }
  if (!isRecoverablePayment(session)) {
    return {
      row: null,
      complete: false,
      reason: "no verifiable total or currency on the session",
      issues: ["no verifiable total"],
      shippingCents: null,
    };
  }

  const validation = validateAgainstCatalogue({ session, lineItems });
  const isDigital = input.isDigital ?? validation.isDigital;

  const email = pickCustomerEmail({
    customerDetailsEmail: session.customer_details?.email,
    sessionEmail: session.customer_email,
  });

  const items = lineItems?.data ?? [];
  const productTitle = items.length
    ? items.map((li) => `${li.description ?? "item"} ×${li.quantity ?? 1}`).join(" + ")
    : "";
  const catalogue = validation.productId ? products.find((p) => p.id === validation.productId) : undefined;
  const fallbackProduct = lineItems?.data?.[0]?.price?.product;

  const issues = [...validation.issues];
  if (!productTitle) issues.push("no line-item description");
  if (!email.email) issues.push("no customer email");

  const complete = issues.length === 0;

  const shipping = session.shipping_details ?? session.collected_information?.shipping_details ?? null;
  const address = shipping?.address ?? null;
  const noteParts = ["recovered from the Stripe webhook: the checkout row never existed"];
  if (!complete) noteParts.push(`unresolved: ${issues.join("; ")}`);

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : ((session.payment_intent as { id?: string } | null | undefined)?.id ?? null);

  return {
    complete,
    reason: complete ? "complete" : `unresolved: ${issues.join("; ")}`,
    issues,
    shippingCents: validation.shippingCents,
    row: {
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntent,
      customer_email: email.email.toLowerCase(),
      customer_name: session.customer_details?.name ?? null,
      product_id: catalogue?.id ?? validation.productId ?? (typeof fallbackProduct === "string" ? fallbackProduct : null),
      product_title: productTitle || catalogue?.title || "— (product could not be resolved)",
      amount_cents: session.amount_total as number,
      currency: session.currency as string,
      /* An incomplete recovery is NEVER fulfilled: fulfilment would grant access to a product we could
         not verify. It stays `paid` until a person resolves it. */
      status: isDigital && complete ? "fulfilled" : "paid",
      is_digital: isDigital,
      shipping_name: shipping?.name ?? null,
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

/**
 * Durably record a payment we could not turn into a valid order. Stripe stops retrying eventually;
 * this row is what keeps the payment discoverable after that, and what the monitoring job alerts on.
 */
export async function recordPaymentException(
  db: { from: (table: string) => any },
  input: {
    paymentReference: string;
    provider?: "stripe" | "paypal";
    reason: string;
    amountCents?: number | null;
    currency?: string | null;
    payload?: unknown;
  }
): Promise<boolean> {
  try {
    const { error } = await db
      .from("ut_order_exceptions")
      .upsert(
        {
          payment_reference: input.paymentReference,
          provider: input.provider ?? "stripe",
          reason: input.reason.slice(0, 300),
          amount_cents: input.amountCents ?? null,
          currency: input.currency ?? null,
          payload: input.payload ?? null,
          status: "open",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "payment_reference", ignoreDuplicates: false }
      )
      .select("id");
    return !error;
  } catch {
    return false;
  }
}
