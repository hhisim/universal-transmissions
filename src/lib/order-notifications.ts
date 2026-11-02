/**
 * Customer order notifications — one logical email per purchase, durably recorded.
 *
 * The rules this enforces, in the order that matters:
 *
 *   1. A confirmation is only ever sent for a purchase that is PAID **and** PERSISTED. The caller
 *      passes the order row it actually wrote; if there is no row there is no email.
 *   2. Exactly once. A row is claimed in `ut_order_notifications` (unique on order + kind) BEFORE the
 *      send. A webhook retry, a concurrent delivery or a replayed event finds the claim and stops.
 *   3. A failed send is recorded, not lost, and may be reclaimed by a later delivery — the claim moves
 *      from `failed` back to `sending` only through a conditional update that reports whether it won.
 *   4. Nothing is sent at all unless ORDER_EMAILS_ENABLED is exactly "true" AND the ledger table
 *      exists. Deployment alone cannot email anybody, and historical orders cannot be swept up by a
 *      redeploy: the caller only invokes this on a fresh transition.
 *
 * Copy and layout live here rather than in a provider template so that the email can be reviewed as
 * plain HTML in this repository, and so a provider change never silently changes what a customer sees.
 */

import { layout, escapeHtml, formatMoney } from "@/lib/order-email-template";

export interface NotificationOrder {
  id: string;
  product_title: string | null;
  amount_cents: number | null;
  currency: string | null;
  customer_email: string | null;
  customer_name: string | null;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  is_digital: boolean | null;
  status: string | null;
  stripe_session_id?: string | null;
}

export type NotificationKind = "confirmation" | "payment_failed" | "shipped";

export interface NotificationDeps {
  /** A Supabase client with service-role rights. Injected so tests never touch a real database. */
  db: {
    from: (table: string) => any;
  };
  /** fetch, injected so tests never contact Brevo. */
  fetchImpl: typeof fetch;
  env?: Record<string, string | undefined>;
}

const SENDER_NAME = "Universal Transmissions";
const SENDER_EMAIL = "hakan@universal-transmissions.com";

/** Order of a checkout row that is a real sale. Anything else is not confirmable. */
export function isConfirmable(order: { status?: string | null; customer_email?: string | null }): boolean {
  const status = (order.status ?? "").toLowerCase();
  const hasEmail = !!(order.customer_email ?? "").trim();
  return hasEmail && (status === "paid" || status === "fulfilled");
}

/**
 * Claim the right to send this notification. Returns true only for the caller that inserted the row
 * (or that moved a previously failed one back to sending).
 */
export async function claimNotification(
  db: NotificationDeps["db"],
  orderId: string,
  kind: NotificationKind
): Promise<boolean> {
  const inserted = await db
    .from("ut_order_notifications")
    .upsert({ order_id: orderId, kind, status: "sending" }, { onConflict: "order_id,kind", ignoreDuplicates: true })
    .select("id");

  if (inserted?.error) throw inserted.error;
  if ((inserted?.data?.length ?? 0) > 0) return true;

  /* Already claimed. The only legitimate re-claim is a previous attempt that failed — never one that
     succeeded, and never one still in flight. */
  const retried = await db
    .from("ut_order_notifications")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("kind", kind)
    .eq("status", "failed")
    .select("id");

  if (retried?.error) throw retried.error;
  return (retried?.data?.length ?? 0) > 0;
}

export async function markNotification(
  db: NotificationDeps["db"],
  orderId: string,
  kind: NotificationKind,
  patch: { status: "sent" | "failed" | "skipped"; providerMessageId?: string | null; error?: string | null }
): Promise<void> {
  await db
    .from("ut_order_notifications")
    .update({
      status: patch.status,
      provider: "brevo",
      provider_message_id: patch.providerMessageId ?? null,
      last_error: patch.error ? patch.error.slice(0, 300) : null,
      sent_at: patch.status === "sent" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .eq("kind", kind);
}

export function renderConfirmation(order: NotificationOrder): { subject: string; html: string; text: string } {
  const product = escapeHtml(order.product_title || "Your order");
  const total = formatMoney(order.amount_cents, order.currency);
  const name = escapeHtml(order.customer_name || "there");
  const isPhysical = !order.is_digital;

  const addressLines = [
    order.shipping_name,
    order.shipping_address_line1,
    order.shipping_address_line2,
    [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", "),
    order.shipping_country,
  ].filter((l) => !!l && String(l).trim().length > 0) as string[];

  const rows = `
    <tr><td style="padding:10px 0;border-bottom:1px solid #262238;color:#9a93b8;font-size:13px;">Item</td>
        <td style="padding:10px 0;border-bottom:1px solid #262238;color:#EDE8FF;font-size:13px;text-align:right;">${product}</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #262238;color:#9a93b8;font-size:13px;">Total paid</td>
        <td style="padding:10px 0;border-bottom:1px solid #262238;color:#E7C56B;font-size:15px;text-align:right;font-weight:600;">${escapeHtml(total)}</td></tr>`;

  const shippingBlock = isPhysical && addressLines.length
    ? `<div style="margin-top:26px;">
         <div style="color:#9a93b8;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px;">Shipping to</div>
         <div style="color:#EDE8FF;font-size:14px;line-height:1.65;">${addressLines.map(escapeHtml).join("<br>")}</div>
       </div>`
    : `<div style="margin-top:26px;color:#9a93b8;font-size:13px;">This is a digital edition — nothing ships. Access details follow separately.</div>`;

  const body = `
    <p style="margin:0 0 18px;color:#EDE8FF;font-size:17px;line-height:1.5;">Thank you, ${name}.</p>
    <p style="margin:0 0 24px;color:#b8b1cf;font-size:14px;line-height:1.7;">
      Your payment has cleared and your order is confirmed. This is the record of it.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${rows}</table>
    ${shippingBlock}
    <div style="margin-top:30px;padding-top:20px;border-top:1px solid #262238;color:#7d769b;font-size:12px;line-height:1.7;">
      Order reference ${escapeHtml(String(order.id).slice(0, 8))} · View your orders at
      <a href="https://universal-transmissions.com/sanctum/orders" style="color:#E7C56B;text-decoration:none;">the Sanctum</a>.
    </div>`;

  const html = layout({ preheader: `Your ${order.product_title || "order"} is confirmed — ${total}`, body });

  const text = [
    `Thank you, ${order.customer_name || "there"}.`,
    ``,
    `Your payment has cleared and your order is confirmed.`,
    ``,
    `Item: ${order.product_title || "Your order"}`,
    `Total paid: ${total}`,
    isPhysical && addressLines.length ? `Shipping to: ${addressLines.join(", ")}` : `Digital edition — nothing ships.`,
    ``,
    `Order reference ${String(order.id).slice(0, 8)}`,
    `View your orders: https://universal-transmissions.com/sanctum/orders`,
  ].join("\n");

  return { subject: `Your Universal Transmissions order — ${order.product_title || "confirmed"}`, html, text };
}

export function renderPaymentFailed(order: NotificationOrder, reason?: string): { subject: string; html: string; text: string } {
  const body = `
    <p style="margin:0 0 18px;color:#EDE8FF;font-size:17px;line-height:1.5;">Your payment did not complete.</p>
    <p style="margin:0 0 24px;color:#b8b1cf;font-size:14px;line-height:1.7;">
      Nothing has been charged. The order for <strong style="color:#EDE8FF;">${escapeHtml(order.product_title || "your item")}</strong>
      has not been placed.${reason ? ` The provider reported: ${escapeHtml(reason)}.` : ""}
    </p>
    <p style="margin:0;color:#b8b1cf;font-size:14px;line-height:1.7;">You can try again whenever you are ready — the item has not been reserved.</p>`;
  const html = layout({ preheader: "Your payment did not complete — nothing was charged.", body });
  const text = `Your payment did not complete. Nothing has been charged, and the order was not placed.`;
  return { subject: "Your Universal Transmissions payment did not complete", html, text };
}

/**
 * Send a confirmation for an order that has just been persisted.
 *
 * Returns what happened, so the caller can put it in the studio notification rather than guessing.
 */
export async function notifyOrderConfirmed(
  order: NotificationOrder,
  deps: NotificationDeps
): Promise<{ sent: boolean; reason: string }> {
  const env = deps.env ?? process.env;

  if (String(env.ORDER_EMAILS_ENABLED ?? "").toLowerCase() !== "true") {
    return { sent: false, reason: "customer emails are disabled (ORDER_EMAILS_ENABLED is not true)" };
  }
  if (!isConfirmable(order)) {
    return { sent: false, reason: "not a persisted paid order with an address" };
  }
  const apiKey = env.BREVO_KEY;
  if (!apiKey) return { sent: false, reason: "BREVO_KEY is not configured" };

  let claimed = false;
  try {
    claimed = await claimNotification(deps.db, order.id, "confirmation");
  } catch (err) {
    /* The ledger came first on purpose: without it we cannot promise "exactly once", so we do not
       send at all. This is also what happens while the migration has not been applied. */
    return { sent: false, reason: `notification ledger unavailable: ${String((err as Error)?.message ?? err).slice(0, 80)}` };
  }
  if (!claimed) return { sent: false, reason: "already sent or in flight for this order" };

  const { subject, html, text } = renderConfirmation(order);

  try {
    const res = await deps.fetchImpl("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: order.customer_email as string, name: order.customer_name || undefined }],
        subject,
        htmlContent: html,
        textContent: text,
        tags: ["order-confirmation"],
        headers: { "X-Mailin-custom": `order:${order.id}` },
      }),
    });

    const payload = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string };
    if (!res.ok) {
      await markNotification(deps.db, order.id, "confirmation", { status: "failed", error: payload?.message ?? `HTTP ${res.status}` });
      return { sent: false, reason: `Brevo rejected the send (HTTP ${res.status})` };
    }

    await markNotification(deps.db, order.id, "confirmation", { status: "sent", providerMessageId: payload?.messageId ?? null });
    return { sent: true, reason: "confirmation sent" };
  } catch (err) {
    await markNotification(deps.db, order.id, "confirmation", { status: "failed", error: String((err as Error)?.message ?? err) });
    return { sent: false, reason: "send failed and was recorded for retry" };
  }
}
