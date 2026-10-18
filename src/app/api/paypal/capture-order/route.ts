import { NextRequest, NextResponse } from "next/server";
import { products } from "@/data/products";
import { requiresShipping, shippingCentsFor, dollars, deliveryZone } from "@/data/shipping";
import { fromProviderCountry } from "@/data/destinations";
import { paypalConfigured, paypalFetch } from "@/lib/paypal";
import {
  recordPayPalOrder,
  notifyStudio,
  setAlertOutcome,
  readAlertOutcome,
  type PayPalOrderRecord,
} from "@/lib/order-recording";

/**
 * CAPTURE a PayPal order — the step that takes the money.
 *
 * Every success path — a fresh capture, an order PayPal already reports as COMPLETED, and an
 * ORDER_ALREADY_CAPTURED re-read — passes through the SAME verification before anything is
 * confirmed: a non-empty capture id, a COMPLETED capture, and the expected amount and currency.
 * A fresh HTTP 200 is not evidence; PayPal's record of the capture is.
 *
 * Nothing is written to ut_orders and no sale alert is sent unless that verification passes.
 */

/** The one issue code that means "this order already has a capture" — matched exactly. */
const ALREADY_CAPTURED_ISSUE = "ORDER_ALREADY_CAPTURED";

function issueCodes(body: unknown): string[] {
  const details = (body as { details?: Array<{ issue?: string }> } | null)?.details ?? [];
  return details.map((d) => String(d?.issue ?? "")).filter(Boolean);
}

interface Expected {
  totalCents: number;
  currency: string;
}

/**
 * Decide, from PAYPAL'S OWN RECORD, whether a captured order really carries a completed payment:
 * a non-empty capture id, status COMPLETED, the amount this order was priced at, and USD.
 */
function verifyCompletedCapture(
  order: unknown,
  expected: Expected
): { ok: true; capture: Record<string, unknown> } | { ok: false; reason: string } {
  const unit = (order as { purchase_units?: Array<Record<string, unknown>> } | null)?.purchase_units?.[0];
  const capture = (unit?.payments as { captures?: Array<Record<string, unknown>> } | undefined)?.captures?.[0];
  if (!capture) return { ok: false, reason: "PayPal records no capture on this order" };
  const id = String(capture.id ?? "").trim();
  if (!id) return { ok: false, reason: "PayPal returned a capture with no id" };
  const status = String(capture.status ?? "");
  if (status !== "COMPLETED") {
    return { ok: false, reason: `PayPal records the capture as ${status || "unknown"}` };
  }
  const amount = capture.amount as { value?: string; currency_code?: string } | undefined;
  const capturedCents = Math.round(Number(amount?.value ?? "0") * 100);
  if (!Number.isFinite(capturedCents) || capturedCents !== expected.totalCents) {
    return {
      ok: false,
      reason: `the capture is ${dollars(capturedCents)} but this order was priced at ${dollars(expected.totalCents)}`,
    };
  }
  if (String(amount?.currency_code ?? "") !== expected.currency) {
    return { ok: false, reason: `the capture is in ${amount?.currency_code ?? "an unknown currency"}` };
  }
  return { ok: true, capture };
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Missing order id", code: "NO_ORDER" }, { status: 400 });
    }
    if (!paypalConfigured()) {
      return NextResponse.json({ error: "PayPal not configured", code: "NOT_CONFIGURED" }, { status: 500 });
    }

    /* ── 1. read the order back ─────────────────────────────────────────────── */
    const readRes = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
    if (!readRes) {
      return NextResponse.json({ error: "PayPal authentication failed", code: "AUTH" }, { status: 502 });
    }
    const order = await readRes.json();
    if (!readRes.ok) {
      return NextResponse.json(
        { error: "Order not found", code: "ORDER_NOT_FOUND", detail: order?.message ?? null },
        { status: 404 }
      );
    }

    const unit = order?.purchase_units?.[0];
    const productId = unit?.custom_id ?? null;
    const product = productId ? products.find((p) => p.id === productId) : undefined;
    if (!product) {
      return NextResponse.json(
        { error: "Order does not name a product this store sells", code: "UNKNOWN_PRODUCT" },
        { status: 409 }
      );
    }

    /* ── 2. verify before capturing ─────────────────────────────────────────── */
    const currency = unit?.amount?.currency_code;
    if (currency !== "USD") {
      return NextResponse.json(
        { error: `Order currency is ${currency}, expected USD`, code: "CURRENCY_MISMATCH" },
        { status: 409 }
      );
    }

    const ships = requiresShipping(product.id);
    /* PayPal reports China as `C2`, not `CN`. Normalising here is load-bearing: `CN` is in the
       Australia-and-Asia zone at $50, so an unmapped `C2` would be priced worldwide at $30. */
    const providerCountry = unit?.shipping?.address?.country_code ?? null;
    const country = fromProviderCountry("paypal", providerCountry);
    if (ships && !country) {
      return NextResponse.json(
        { error: "A physical order arrived without a delivery country", code: "NO_DELIVERY_COUNTRY" },
        { status: 409 }
      );
    }

    const expectedShipping = ships ? shippingCentsFor(product.id, country) : 0;
    const expectedTotal = Math.round(product.price * 100) + expectedShipping;
    const paidTotal = Math.round(Number(unit?.amount?.value ?? "0") * 100);
    const paidShipping = unit?.amount?.breakdown?.shipping
      ? Math.round(Number(unit.amount.breakdown.shipping.value) * 100)
      : 0;

    if (!Number.isFinite(paidTotal) || paidTotal !== expectedTotal) {
      return NextResponse.json(
        {
          error: `Order total is ${dollars(paidTotal)} but ${dollars(expectedTotal)} is required for ${product.title} to ${country ?? "a digital buyer"}`,
          code: "TOTAL_MISMATCH",
        },
        { status: 409 }
      );
    }
    if (ships && paidShipping !== expectedShipping) {
      return NextResponse.json(
        {
          error: `Order shipping is ${dollars(paidShipping)} but ${dollars(expectedShipping)} applies to ${deliveryZone(country)}`,
          code: "SHIPPING_MISMATCH",
        },
        { status: 409 }
      );
    }

    const expected: Expected = { totalCents: paidTotal, currency: "USD" };

    /* ── 3. capture, and verify EVERY success path the same way ─────────────── */
    let captureId = "";
    let alreadyCaptured = false;

    if (order.status === "COMPLETED") {
      const check = verifyCompletedCapture(order, expected);
      if (!check.ok) {
        return NextResponse.json(
          {
            error: `PayPal reports this order as completed but ${check.reason}. No payment has been confirmed.`,
            code: "CAPTURE_NOT_CONFIRMED",
          },
          { status: 409 }
        );
      }
      alreadyCaptured = true;
      captureId = String(check.capture.id ?? "");
    } else {
      const captureRes = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: "POST",
        // A STABLE key: every retry of this order reuses it, so a retry after a lost response
        // returns the original capture instead of taking a second payment.
        headers: { "PayPal-Request-Id": `capture-${orderId}` },
      });
      if (!captureRes) {
        return NextResponse.json({ error: "PayPal authentication failed", code: "AUTH" }, { status: 502 });
      }
      const captured = await captureRes.json();

      if (!captureRes.ok) {
        const issues = issueCodes(captured);
        if (!issues.includes(ALREADY_CAPTURED_ISSUE)) {
          // An ordinary provider error stays an error. Nothing is reported as paid.
          return NextResponse.json(
            { error: captured?.message ?? "PayPal capture failed", code: issues[0] ?? "CAPTURE_FAILED" },
            { status: 502 }
          );
        }
        /* Already captured — still not taken on trust: the order is re-read and the capture
           verified before anything is confirmed. */
        const reread = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
        const fresh = reread ? await reread.json() : null;
        const check = fresh
          ? verifyCompletedCapture(fresh, expected)
          : { ok: false as const, reason: "the order could not be re-read" };
        if (!check.ok) {
          return NextResponse.json(
            {
              error: `PayPal reported this order as already captured, but its record does not confirm a completed payment: ${check.reason}. No payment has been confirmed.`,
              code: "CAPTURE_NOT_CONFIRMED",
            },
            { status: 409 }
          );
        }
        alreadyCaptured = true;
        captureId = String(check.capture.id ?? "");
      } else {
        /* A FRESH 200 is not evidence either. The same verification runs on the capture response,
           so a pending capture, a wrong amount, a foreign currency or a missing capture id is
           refused exactly like every other path — and no order is written and no alert is sent. */
        const check = verifyCompletedCapture(captured, expected);
        if (!check.ok) {
          return NextResponse.json(
            {
              error: `PayPal accepted the capture but its record does not confirm the payment: ${check.reason}. Nothing has been recorded or announced; check order ${orderId} at PayPal before acting.`,
              code: "CAPTURE_NOT_CONFIRMED",
            },
            { status: 502 }
          );
        }
        captureId = String(check.capture.id ?? "");
      }
    }

    if (!captureId) {
      return NextResponse.json(
        { error: "No confirmed capture id. Nothing has been recorded.", code: "CAPTURE_NOT_CONFIRMED" },
        { status: 502 }
      );
    }

    /* ── 4. the order, recorded into the process the Stripe path already uses ─ */
    /* The RECIPIENT is the person the goods ship to, which is not necessarily the payer. */
    const recipientName = unit?.shipping?.name?.full_name ?? null;
    const payerName =
      [order?.payer?.name?.given_name, order?.payer?.name?.surname].filter(Boolean).join(" ") || null;
    const email = order?.payer?.email_address ?? null;
    const rawAddress = unit?.shipping?.address ?? null;

    const record: PayPalOrderRecord = {
      orderId,
      captureId,
      productId: product.id,
      productTitle: product.title,
      amountCents: paidTotal,
      isDigital: !ships,
      email,
      /* The shipping recipient when PayPal supplies one; the payer is a fallback, not an assumption. */
      name: recipientName ?? payerName,
      /* PayPal's portable address fields are NOT the recorder's field names — mapped explicitly. */
      address: rawAddress
        ? {
            line1: rawAddress.address_line_1 ?? null,
            line2: rawAddress.address_line_2 ?? null,
            city: rawAddress.admin_area_2 ?? null,
            state: rawAddress.admin_area_1 ?? null,
            postal_code: rawAddress.postal_code ?? null,
            country_code: fromProviderCountry("paypal", rawAddress.country_code),
          }
        : null,
    };

    const written = await recordPayPalOrder(record);

    /* The studio is told ONCE per order — on the call that created the row, or on any call whose
       write failed (money has been taken either way). A repeat does not manufacture a success: it
       reports what the original alert actually did, recovered from the row. */
    let studioNotified: boolean | null = null;
    let notifyDetail: string | null = null;

    if (written.recorded && written.alreadyRecorded) {
      const earlier = await readAlertOutcome(orderId);
      studioNotified = earlier.known ? earlier.sent : null;
      notifyDetail = earlier.known
        ? `recorded earlier — alert ${earlier.sent ? "was sent" : "failed"}${earlier.detail ? `: ${earlier.detail}` : ""}`
        : "recorded earlier — the original alert outcome was not recorded";
    } else {
      const notified = await notifyStudio(record, { recorded: written.recorded, detail: written.detail });
      studioNotified = notified.notified;
      notifyDetail = notified.detail ?? null;
      if (written.recorded) {
        await setAlertOutcome(orderId, notified.notified, notified.detail);
      }
    }

    return NextResponse.json({
      captured: true,
      alreadyCaptured,
      orderId,
      captureId,
      status: "COMPLETED",
      productId: product.id,
      productTitle: product.title,
      totalCents: paidTotal,
      shippingCents: paidShipping,
      currency,
      country,
      providerCountry,
      payerEmail: email,
      recipientName: recipientName ?? null,
      deliveryAddress: record.address,
      orderRecorded: written.recorded,
      orderAlreadyRecorded: written.alreadyRecorded,
      recordingDetail: written.detail ?? null,
      studioNotified,
      notifyDetail,
    });
  } catch (err) {
    console.error("PayPal capture error:", err);
    return NextResponse.json({ error: "PayPal capture failed", code: "EXCEPTION" }, { status: 500 });
  }
}
