import { NextRequest, NextResponse } from "next/server";
import { getProduct, products } from "@/data/products";
import { requiresShipping, shippingCentsFor, shippingLabelFor, deliveryZone } from "@/data/shipping";
import { getPayPalAccessToken, paypalBaseUrl, paypalConfigured, siteBaseUrl } from "@/lib/paypal";

/**
 * Create a PayPal order for one product, priced for the delivery country the buyer declared.
 *
 * The shipping rate is computed HERE, from the confirmed policy, and never taken from the request —
 * the browser sends a country, not an amount. What the buyer pays is what this route decides.
 *
 * Shipping handling, stated rather than left to a default:
 *   · a product that ships ....... `shipping_preference: GET_FROM_FILE`, so PayPal collects the
 *     delivery address, and the total already includes the postage for the declared country
 *   · a digital product .......... `shipping_preference: NO_SHIPPING`, which explicitly suppresses
 *     both a shipping charge and any request for a delivery address
 */
export async function POST(req: NextRequest) {
  try {
    const { productId, country } = await req.json();

    /* Both product pages send the product's `id` (for example "codex-physical"), which is what
       /api/checkout resolves by. This route resolved by SLUG only until Batch 31, so the lookup
       never matched and every PayPal purchase returned "Product not found". Resolve by id first,
       and still accept a slug so either shape works. */
    const product = products.find((p) => p.id === productId) ?? getProduct(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!paypalConfigured()) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
    }
    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "PayPal authentication failed" }, { status: 502 });
    }

    const ships = requiresShipping(product.id);
    const shippingCents = ships ? shippingCentsFor(product.id, country) : 0;
    const itemTotalCents = Math.round(product.price * 100);
    const totalCents = itemTotalCents + shippingCents;
    const usd = (cents: number) => (cents / 100).toFixed(2);

    const purchaseUnit: Record<string, unknown> = {
      /* The product travels with the order so the capture step can verify WHICH product was bought
         rather than trusting the amount alone. */
      custom_id: product.id,
      description: product.title,
      amount: {
        currency_code: "USD",
        value: usd(totalCents),
        ...(ships && shippingCents > 0
          ? {
              breakdown: {
                item_total: { currency_code: "USD", value: usd(itemTotalCents) },
                shipping: { currency_code: "USD", value: usd(shippingCents) },
              },
            }
          : {}),
      },
    };

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
      application_context: {
        brand_name: "Universal Transmissions",
        /* Physical orders let PayPal collect the delivery address; digital orders are explicitly
           told not to ask for one and not to add shipping. */
        shipping_preference: ships ? "GET_FROM_FILE" : "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: `${siteBaseUrl()}/sanctum/paypal/return`,
        cancel_url: `${siteBaseUrl()}/sanctum/${product.slug}?canceled=true`,
      },
    };

    const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("PayPal API error:", data);
      return NextResponse.json({ error: "PayPal order creation failed" }, { status: 502 });
    }

    return NextResponse.json({
      orderId: data.id,
      // What was priced, so the page can show the same figures the order carries.
      zone: deliveryZone(country),
      shippingLabel: ships ? shippingLabelFor(product.id, country) : null,
      shippingCents,
      totalCents,
    });
  } catch (err) {
    console.error("PayPal create-order error:", err);
    return NextResponse.json({ error: "PayPal order creation failed" }, { status: 500 });
  }
}
