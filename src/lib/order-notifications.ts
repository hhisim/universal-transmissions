/**
 * Customer order notifications.
 *
 * Transport and rules only — the outbox in `order-outbox.ts` owns durability, retries and the
 * uncertain case. This module decides WHETHER something may be emailed, renders it, and translates a
 * provider response into one of three honest outcomes: accepted, rejected, or unknown.
 *
 * Hard rules, each enforced rather than documented:
 *   · a confirmation requires a persisted order that is paid or fulfilled, with an address;
 *   · an order flagged as an incomplete recovery is never confirmable — we do not email a customer
 *     about an order we could not fully rebuild;
 *   · nothing sends unless ORDER_EMAILS_ENABLED is exactly "true" and the outbox exists;
 *   · a send that times out is `uncertain`, never retried automatically and never reported as sent.
 */

import { createHash } from "crypto";
import { layout, escapeHtml, formatMoney, glyph } from "@/lib/order-email-template";
import {
  enqueue,
  drainOutbox,
  backoffMs,
  type OutboxDb,
  type OutboxRow,
  type NotificationKind,
  type SendOutcome,
} from "@/lib/order-outbox";

export type { NotificationKind } from "@/lib/order-outbox";

export interface NotificationOrder {
  id: string;
  product_title: string | null;
  product_id?: string | null;
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
  notes?: string | null;
  stripe_session_id?: string | null;
}

export interface NotificationDeps {
  db: OutboxDb;
  fetchImpl: typeof fetch;
  env?: Record<string, string | undefined>;
}

const SENDER_NAME = "Universal Transmissions";
const SENDER_EMAIL = "hakan@universal-transmissions.com";
const REPLY_TO = "hakan@universal-transmissions.com";
const SEND_TIMEOUT_MS = 15_000;

/**
 * Brevo accepts an `idempotencyKey` header (UUID, TTL 15–30 minutes) and answers a repeat with
 * `duplicate_parameter` instead of sending again. That converts part of our "at-most-once" posture
 * into a genuine no-duplicate guarantee inside the window, so every send carries one — derived
 * deterministically from the outbox key, so a retry reuses the same value and a *different* purchase
 * can never collide with it.
 */
const IDEMPOTENCY_NAMESPACE = "6f2c3b1e-6a41-5f0e-9a6d-2c7d8b9f4a10";

export function idempotencyUuid(key: string): string {
  // UUID v5 (SHA-1, namespaced) — stable across processes and runs without any stored mapping.
  const nsBytes = Buffer.from(IDEMPOTENCY_NAMESPACE.replace(/-/g, ""), "hex");
  const nameBytes = Buffer.from(key, "utf8");
  const hash = createHash("sha1").update(nsBytes).update(nameBytes).digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** An order we could not fully reconstruct must not be confirmed as though it were ordinary. */
export function isIncompleteRecovery(order: { notes?: string | null }): boolean {
  return /unresolved/i.test(String(order.notes ?? ""));
}

export function isConfirmable(order: {
  status?: string | null;
  customer_email?: string | null;
  notes?: string | null;
}): boolean {
  const status = (order.status ?? "").toLowerCase();
  const hasEmail = !!(order.customer_email ?? "").trim();
  return hasEmail && (status === "paid" || status === "fulfilled") && !isIncompleteRecovery(order);
}

/** Amounts the customer will read. Shipping is only shown when the provider actually charged it. */
export interface MoneyBreakdown {
  itemCents: number | null;
  shippingCents: number | null;
  totalCents: number | null;
}

export function breakdownFrom(order: NotificationOrder, shippingCents?: number | null): MoneyBreakdown {
  const total = typeof order.amount_cents === "number" ? order.amount_cents : null;
  const shipping = typeof shippingCents === "number" && shippingCents > 0 ? shippingCents : null;
  const item = total !== null ? total - (shipping ?? 0) : null;
  return { itemCents: item, shippingCents: shipping, totalCents: total };
}

function moneyRow(label: string, value: string, opts: { strong?: boolean } = {}): string {
  return `<tr>
    <td style="padding:10px 0;color:#8f88ad;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;text-align:right;color:${opts.strong ? "#E7C56B" : "#EDE8FF"};font-size:${opts.strong ? "17px" : "13.5px"};${opts.strong ? "font-weight:600;" : ""}font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${escapeHtml(value)}</td>
  </tr>`;
}

export function renderConfirmation(
  order: NotificationOrder,
  opts: { shippingCents?: number | null } = {}
): { subject: string; html: string; text: string } {
  const name = escapeHtml(order.customer_name || "there");
  const product = escapeHtml(order.product_title || "Your order");
  const isPhysical = !order.is_digital;
  const money = breakdownFrom(order, opts.shippingCents);
  const total = formatMoney(money.totalCents, order.currency);

  const addressLines = [
    order.shipping_name,
    order.shipping_address_line1,
    order.shipping_address_line2,
    [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", "),
    order.shipping_country,
  ].filter((l) => !!l && String(l).trim().length > 0) as string[];

  const rows = [
    moneyRow("Item", product),
    isPhysical && money.itemCents !== null ? moneyRow("Item price", formatMoney(money.itemCents, order.currency)) : "",
    isPhysical && money.shippingCents ? moneyRow("Shipping", formatMoney(money.shippingCents, order.currency)) : "",
    moneyRow("Total paid", total, { strong: true }),
  ].join("");

  const shippingBlock =
    isPhysical && addressLines.length
      ? `<div style="margin-top:30px;">
           <div style="color:#8f88ad;font-size:10px;letter-spacing:.24em;text-transform:uppercase;margin-bottom:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Shipping to</div>
           <div style="color:#EDE8FF;font-size:13.5px;line-height:1.8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${addressLines.map(escapeHtml).join("<br>")}</div>
         </div>`
      : `<div style="margin-top:30px;">
           <div style="color:#8f88ad;font-size:10px;letter-spacing:.24em;text-transform:uppercase;margin-bottom:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Digital edition</div>
           <div style="color:#EDE8FF;font-size:13.5px;line-height:1.8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
             Nothing ships. Your edition is tied to this order${order.customer_email ? ` and to ${escapeHtml(order.customer_email)}` : ""}.
             Open <a href="https://universal-transmissions.com/sanctum/orders" style="color:#E7C56B;text-decoration:none;">your orders in the Sanctum</a>.
           </div>
         </div>`;

  const body = `
    ${glyph("begin")}
    <p style="margin:0 0 20px;color:#EDE8FF;font-size:19px;line-height:1.5;font-family:Georgia,'Times New Roman',serif;letter-spacing:.01em;">Thank you, ${name}.</p>
    <p style="margin:0 0 28px;color:#b8b1cf;font-size:13.5px;line-height:1.9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      Your payment has cleared and your order is recorded. This letter is the record of it.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-top:1px solid #262238;border-bottom:1px solid #262238;">${rows}</table>
    ${shippingBlock}
    ${glyph("end")}
    <div style="margin-top:32px;color:#6f688b;font-size:11px;line-height:1.9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      Order reference ${escapeHtml(String(order.id).slice(0, 8)).toUpperCase()} ·
      <a href="https://universal-transmissions.com/sanctum/orders" style="color:#E7C56B;text-decoration:none;">View your orders</a>
    </div>`;

  const html = layout({
    preheader: `Your ${order.product_title || "order"} is confirmed — ${total}`,
    body,
    artLine: isPhysical ? "THE CODEX · VOLUME ONE" : "THE DIGITAL CODEX",
  });

  const text = [
    `Thank you, ${order.customer_name || "there"}.`,
    ``,
    `Your payment has cleared and your order is recorded.`,
    ``,
    `Item:       ${order.product_title || "Your order"}`,
    isPhysical && money.itemCents !== null ? `Item price: ${formatMoney(money.itemCents, order.currency)}` : "",
    isPhysical && money.shippingCents ? `Shipping:   ${formatMoney(money.shippingCents, order.currency)}` : "",
    `Total paid: ${total}`,
    ``,
    isPhysical && addressLines.length
      ? `Shipping to:\n${addressLines.join("\n")}`
      : `Digital edition — nothing ships. Your edition is tied to this order${order.customer_email ? ` and to ${order.customer_email}` : ""}.`,
    ``,
    `Order reference ${String(order.id).slice(0, 8).toUpperCase()}`,
    `View your orders: https://universal-transmissions.com/sanctum/orders`,
    ``,
    `Universal Transmissions · universal-transmissions.com`,
    `Questions about this order: reply to this email.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject: `Your Universal Transmissions order — ${order.product_title || "confirmed"}`, html, text };
}

/**
 * A failed payment may only claim "nothing was charged" when the provider's final state supports it.
 * `providerState` comes from the event that triggered the notice; anything that is not an explicitly
 * unsettled outcome switches to the weaker claim, which is always true.
 */
export function renderPaymentFailed(
  order: Pick<NotificationOrder, "product_title" | "customer_name" | "currency" | "amount_cents">,
  opts: { reason?: string; providerState?: string | null } = {}
): { subject: string; html: string; text: string } {
  const settled = /(succeeded|paid|partially_refunded|refunded)/i.test(String(opts.providerState ?? ""));
  const nothingCharged = !settled;

  const headline = nothingCharged ? "Your payment did not complete." : "Your payment needs attention.";
  const claim = nothingCharged
    ? "Nothing has been charged, and the order has not been placed."
    : "The provider has not confirmed this charge as cancelled. If a payment does appear on your statement, reply to this message and we will resolve it.";

  const body = `
    ${glyph("begin")}
    <p style="margin:0 0 20px;color:#EDE8FF;font-size:19px;line-height:1.5;font-family:Georgia,'Times New Roman',serif;">${headline}</p>
    <p style="margin:0 0 24px;color:#b8b1cf;font-size:13.5px;line-height:1.9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      ${claim}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-top:1px solid #262238;border-bottom:1px solid #262238;">
      ${moneyRow("Order", escapeHtml(order.product_title || "your item"))}
      ${typeof order.amount_cents === "number" ? moneyRow("Amount", formatMoney(order.amount_cents, order.currency)) : ""}
    </table>
    <p style="margin:24px 0 0;color:#b8b1cf;font-size:13.5px;line-height:1.9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      ${nothingCharged ? "You can try again whenever you are ready — nothing has been reserved." : "Reply to this message and a person will look at it with you."}
      ${opts.reason ? `<br><span style="color:#6f688b;font-size:12px;">Provider: ${escapeHtml(opts.reason)}</span>` : ""}
    </p>
    ${glyph("end")}`;

  const html = layout({
    preheader: nothingCharged ? "Your payment did not complete — nothing was charged." : "Your payment needs attention.",
    body,
    artLine: "CORRESPONDENCE",
  });

  const text = [
    headline,
    ``,
    claim,
    ``,
    `Order:  ${order.product_title || "your item"}`,
    typeof order.amount_cents === "number" ? `Amount: ${formatMoney(order.amount_cents, order.currency)}` : "",
    ``,
    nothingCharged
      ? "You can try again whenever you are ready — nothing has been reserved."
      : "Reply to this message and a person will look at it with you.",
    ``,
    `Universal Transmissions · universal-transmissions.com`,
    `Reply to this email and a person will answer.`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    subject: nothingCharged
      ? "Your Universal Transmissions payment did not complete"
      : "Your Universal Transmissions payment needs attention",
    html,
    text,
  };
}

/** Queue a confirmation. Sending happens through the outbox, never inline in this call. */
export async function enqueueConfirmation(
  order: NotificationOrder,
  deps: NotificationDeps
): Promise<{ queued: boolean; reason: string }> {
  const env = deps.env ?? process.env;
  if (String(env.ORDER_EMAILS_ENABLED ?? "").toLowerCase() !== "true") {
    return { queued: false, reason: "customer emails are disabled (ORDER_EMAILS_ENABLED is not true)" };
  }
  if (!env.BREVO_KEY && !env.BREVO_API_KEY) return { queued: false, reason: "no Brevo key is configured" };
  if (!isConfirmable(order)) {
    return {
      queued: false,
      reason: isIncompleteRecovery(order)
        ? "recovery was incomplete — the customer is not told about an order we could not rebuild"
        : "not a persisted paid order with an address",
    };
  }
  try {
    return await enqueue(deps.db, { orderId: order.id, kind: "confirmation" });
  } catch (err) {
    return { queued: false, reason: `outbox unavailable: ${String((err as Error)?.message ?? err).slice(0, 80)}` };
  }
}

/** The transport. Maps a provider response onto accepted / rejected / unknown. */
export function makeBrevoSender(deps: {
  fetchImpl: typeof fetch;
  apiKey: string;
  loadOrder: (orderId: string) => Promise<NotificationOrder | null>;
  timeoutMs?: number;
}) {
  return async function send(row: OutboxRow): Promise<SendOutcome> {
    const order = await deps.loadOrder(row.order_id);
    if (!order) return { outcome: "rejected", reason: "order row could not be read" };
    if (row.kind !== "confirmation") return { outcome: "rejected", reason: `unsupported kind ${row.kind}` };

    const { subject, html, text } = renderConfirmation(order);

    /* A timeout is the dangerous case: the request may have reached Brevo and been accepted after our
       connection dropped. That is `unknown`, never "failed" and never "sent". */
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? SEND_TIMEOUT_MS);
    try {
      const res = await deps.fetchImpl("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "api-key": deps.apiKey,
          "content-type": "application/json",
          accept: "application/json",
          "X-Mailin-custom": row.idempotency_key,
        },
        body: JSON.stringify({
          sender: { name: SENDER_NAME, email: SENDER_EMAIL },
          replyTo: { email: REPLY_TO, name: SENDER_NAME },
          to: [{ email: order.customer_email as string, name: order.customer_name || undefined }],
          subject,
          htmlContent: html,
          textContent: text,
          tags: ["order-confirmation"],
          headers: {
            "X-Mailin-custom": row.idempotency_key,
            /* Provider-side duplicate suppression: a retry inside the TTL cannot become a second
               receipt. Outside the TTL it can, which is why the outbox still refuses to resend an
               outcome it could not observe. */
            idempotencyKey: idempotencyUuid(row.idempotency_key),
          },
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string; code?: string };
      if (!res.ok) {
        /* Brevo's idempotency reply: the same key was already accepted in this window. That is not a
           failure — it means the customer has (or will have) exactly one copy, which is the outcome
           we wanted. Recorded as accepted with no new message id. */
        const duplicate = payload?.code === "duplicate_parameter" || /duplicate/i.test(String(payload?.message ?? ""));
        if (duplicate) return { outcome: "accepted", messageId: null };
        return { outcome: "rejected", reason: payload?.message ?? `HTTP ${res.status}` };
      }
      return { outcome: "accepted", messageId: payload?.messageId ?? null };
    } catch (err) {
      const aborted = (err as Error)?.name === "AbortError";
      return {
        outcome: "unknown",
        reason: aborted
          ? "provider timed out — acceptance unknown"
          : `network error — acceptance unknown: ${String((err as Error)?.message ?? err).slice(0, 80)}`,
      };
    } finally {
      clearTimeout(timer);
    }
  };
}

/** Queue the confirmation and immediately try to drain — the durable row is the safety net. */
export async function notifyOrderConfirmed(
  order: NotificationOrder,
  deps: NotificationDeps
): Promise<{ sent: boolean; reason: string; queued?: boolean }> {
  const env = deps.env ?? process.env;
  const queued = await enqueueConfirmation(order, deps);
  if (!queued.queued) return { sent: false, reason: queued.reason };

  const apiKey = (env.BREVO_KEY ?? env.BREVO_API_KEY) as string;
  const send = makeBrevoSender({
    fetchImpl: deps.fetchImpl,
    apiKey,
    loadOrder: async (id) => {
      const { data } = await deps.db.from("ut_orders").select("*").eq("id", id).limit(1);
      return (data?.[0] as NotificationOrder) ?? null;
    },
  });

  const drained = await drainOutbox({ db: deps.db, send, limit: 3 });
  if (drained.sent > 0) return { sent: true, reason: "confirmation sent", queued: true };
  if (drained.uncertain > 0) return { sent: false, reason: "send outcome unknown — recorded for reconciliation", queued: true };
  return { sent: false, reason: "queued for retry", queued: true };
}

export { backoffMs };
