import { NextRequest, NextResponse } from "next/server";
import { products } from "@/data/products";
import { requiresShipping, shippingCentsFor, dollars, deliveryZone } from "@/data/shipping";
import { paypalConfigured, paypalFetch } from "@/lib/paypal";
import { recordPayPalOrder, notifyStudio, type PayPalOrderRecord } from "@/lib/order-recording";

/**
 * CAPTURE a PayPal order — the step that takes the money.
 *
 * This route did not run at all before Batch 32: nothing called it, it posted to the sandbox host
 * while orders were created on the live host, and it authenticated with an environment variable the
 * project does not define. It is called now, from the address PayPal returns the buyer to, and it:
 *
 *   1. reads the order back from PayPal — never trusting the amount the browser saw;
 *   2. verifies the product, currency, shipping and total against the confirmed policy, using the
 *      delivery country PayPal itself reports. A mismatch stops here and no money moves;
 *   3. captures, using a STABLE idempotency key derived from the order, so a retry after a lost
 *      response can never take a second payment;
 *   4. confirms ONLY when PayPal's own record shows a completed capture of the right amount —
 *      an error code is never converted into a success;
 *   5. records the order into the same `ut_orders` process the Stripe path uses and tells the studio.
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
 * Decide, from PAYPAL'S OWN RECORD, whether this order carries a genuine completed capture.
 *
 * This is the check that replaces the old behaviour. The previous version treated ANY HTTP 422 as
 * ORDER_ALREADY_CAPTURED and then reported status COMPLETED without asking PayPal anything — so a
 * declined instrument (INSTRUMENT_DECLINED) and an unapproved order (ORDER_NOT_APPROVED) both came
 * back as a confirmed payment. Nothing here is inferred from an error: the capture has to exist, be
 * COMPLETED, and carry the amount and currency this order was priced at.
 */
function verifyCompletedCapture(
  order: unknown,
  expected: Expected
): { ok: true; capture: Record<string, unknown> } | { ok: false; reason: string } {
  const unit = (order as { purchase_units?: Array<Record<string, unknown>> } | null)?.purchase_units?.[0];
  const capture = (unit?.payments as { captures?: Array<Record<string, unknown>> } | undefined)?.captures?.[0];
  if (!capture) return { ok: false, reason: "PayPal records no capture on this order" };
  const status = String(capture.status ?? "");
  if (status !== "COMPLETED") {
    return { ok: false, reason: `PayPal records the capture as ${status || "unknown"}` };
  }
  const amount = capture.amount as { value?: string; currency_code?: string } | undefined;
  const capturedCents = Math.round(Number(amount?.value ?? "0") * 100);
  if (capturedCents !== expected.totalCents) {
    return {
      ok: false,
      reason: `the capture is ${dollars(capturedCents)} but this order was priced at ${dollars(expected.totalCents)}`,
    };
  }
  if (String(amount?.currency_code ?? "") !== expected.currency) {
    return {
      ok: false,
      reason: `the capture is in ${amount?.currency_code ?? "an unknown currency"}`,
    };
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
    const country = unit?.shipping?.address?.country_code ?? null;
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

    /* ── 3. capture, unless a verified capture already exists ───────────────── */
    let captureId: string | null = null;
    let alreadyCaptured = false;
    const existingCaptureId = unit?.payments?.captures?.[0]?.id ?? null;

    if (order.status === "COMPLETED") {
      // Already paid. Confirm it ONLY against PayPal's own record of the capture.
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
      captureId = String(check.capture.id ?? existingCaptureId ?? "");
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
        if (issues.includes(ALREADY_CAPTURED_ISSUE)) {
          /* The order already has a capture. That is NOT taken as proof of payment: the order is
             re-read and the capture itself has to verify. */
          const reread = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
          const fresh = reread ? await reread.json() : null;
          const check = fresh ? verifyCompletedCapture(fresh, expected) : { ok: false as const, reason: "the order could not be re-read" };
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
          // An ordinary provider error stays an error. Nothing is reported as paid.
          return NextResponse.json(
            {
              error: captured?.message ?? "PayPal capture failed",
              code: issues[0] ?? "CAPTURE_FAILED",
            },
            { status: 502 }
          );
        }
      } else {
        const status = String(captured?.status ?? "");
        if (status !== "COMPLETED") {
          return NextResponse.json(
            { error: `PayPal returned status ${status}`, code: "NOT_COMPLETED" },
            { status: 502 }
          );
        }
        captureId = String(captured?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? "");
      }
    }

    /* ── 4. the order, recorded into the process the Stripe path already uses ─ */
    const email = order?.payer?.email_address ?? null;
    const name =
      [order?.payer?.name?.given_name, order?.payer?.name?.surname].filter(Boolean).join(" ") || null;
    const address = unit?.shipping?.address ?? null;

    const record: PayPalOrderRecord = {
      orderId,
      captureId,
      productId: product.id,
      productTitle: product.title,
      amountCents: paidTotal,
      isDigital: !ships,
      email,
      name,
      address,
    };
    const written = await recordPayPalOrder(record);
    /* The studio is told ONCE per order — on the call that created the row, or on any call whose
       write failed (money has been taken either way). A refresh or a concurrent return does not send
       a second alert; it reports that the first confirmation carried it. */
    const shouldNotify = !written.recorded || !written.alreadyRecorded;
    const notified = shouldNotify
      ? await notifyStudio(record, { recorded: written.recorded, detail: written.detail })
      : { notified: true, detail: "sent with the first confirmation" };

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
      payerEmail: email,
      deliveryAddress: address,
      orderRecorded: written.recorded,
      orderAlreadyRecorded: written.alreadyRecorded,
      recordingDetail: written.detail ?? null,
      studioNotified: notified.notified,
      notifyDetail: notified.detail ?? null,
    });
  } catch (err) {
    console.error("PayPal capture error:", err);
    return NextResponse.json({ error: "PayPal capture failed", code: "EXCEPTION" }, { status: 500 });
  }
}
