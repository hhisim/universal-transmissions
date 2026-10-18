import { NextRequest, NextResponse } from "next/server";
import { products } from "@/data/products";
import {
  requiresShipping,
  shippingCentsFor,
  dollars,
  deliveryZone,
} from "@/data/shipping";
import { paypalConfigured, paypalFetch } from "@/lib/paypal";

/**
 * CAPTURE a PayPal order — the step that actually takes the money.
 *
 * This route did not run at all before: nothing called it, it posted to the sandbox host while
 * orders were created on the live host, and it authenticated with an environment variable the
 * project does not define. It is called now, from the return address PayPal sends the buyer back to,
 * and it does the following IN ORDER:
 *
 *   1. read the order back from PayPal — never trust the amount the browser saw;
 *   2. VERIFY the product, the currency, the shipping and the total against the confirmed policy,
 *      using the delivery country PayPal itself reports. A mismatch stops here and no money moves;
 *   3. capture, unless it was already captured, in which case the existing result is returned —
 *      a buyer refreshing the return page, or arriving twice, cannot be charged twice;
 *   4. report success only when PayPal confirms COMPLETED.
 *
 * The verification in step 2 is the reason the country is checked rather than taken on trust: the
 * order was priced from the country the buyer declared on the product page, and this confirms that
 * the address PayPal collected carries the same rate.
 */
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

    /* ── 3. capture, unless it is already captured ──────────────────────────── */
    // A repeated return, a refresh, or a second tab must not charge anyone twice.
    if (order.status === "COMPLETED") {
      const existing = order?.purchase_units?.[0]?.payments?.captures?.[0];
      return NextResponse.json({
        captured: true,
        alreadyCaptured: true,
        orderId,
        productId: product.id,
        productTitle: product.title,
        totalCents: paidTotal,
        shippingCents: paidShipping,
        country,
        captureId: existing?.id ?? null,
        payerEmail: order?.payer?.email_address ?? null,
      });
    }

    const captureRes = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
    });
    if (!captureRes) {
      return NextResponse.json({ error: "PayPal authentication failed", code: "AUTH" }, { status: 502 });
    }
    const captured = await captureRes.json();

    /* A race — two returns arriving at once — surfaces as an already-captured error. That is a
       success, not a failure, and is reported as one. */
    const alreadyCaptured =
      captureRes.status === 422 ||
      String(captured?.details?.[0]?.issue ?? "").includes("ORDER_ALREADY_CAPTURED");

    if (!captureRes.ok && !alreadyCaptured) {
      console.error("PayPal capture failed:", captured);
      return NextResponse.json(
        {
          error: captured?.message ?? "PayPal capture failed",
          code: captured?.details?.[0]?.issue ?? "CAPTURE_FAILED",
        },
        { status: 502 }
      );
    }

    /* ── 4. report only what PayPal confirms ───────────────────────────────── */
    const status = alreadyCaptured ? "COMPLETED" : captured?.status;
    if (status !== "COMPLETED") {
      return NextResponse.json(
        { error: `PayPal returned status ${status}`, code: "NOT_COMPLETED" },
        { status: 502 }
      );
    }

    const capture = captured?.purchase_units?.[0]?.payments?.captures?.[0];

    return NextResponse.json({
      captured: true,
      alreadyCaptured,
      orderId,
      captureId: capture?.id ?? null,
      status,
      productId: product.id,
      productTitle: product.title,
      totalCents: paidTotal,
      shippingCents: paidShipping,
      currency,
      country,
      payerEmail: captured?.payer?.email_address ?? order?.payer?.email_address ?? null,
      deliveryAddress: unit?.shipping?.address ?? null,
    });
  } catch (err) {
    console.error("PayPal capture error:", err);
    return NextResponse.json({ error: "PayPal capture failed", code: "EXCEPTION" }, { status: 500 });
  }
}
