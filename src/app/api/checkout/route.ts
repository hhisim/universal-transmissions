import { NextRequest, NextResponse } from "next/server";
import { products } from "@/data/products";
import {
  requiresShipping,
  shippingCentsFor,
  shippingLabelFor,
  deliveryWindow,
} from "@/data/shipping";
import { allowedDeliveryFor, unsupportedDestinationMessage } from "@/data/destinations";
import { supabaseAdmin } from "@/lib/supabase";

const DIGITAL_PRODUCTS = ["codex-digital", "chakra-4k", "chakra-8k"];

export async function POST(req: NextRequest) {
  try {
    const { productId, country } = await req.json();
    const product = products.find((p) => p.id === productId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // A destination the provider cannot serve is refused HERE, before any checkout exists, rather
    // than becoming an address the provider rejects after the buyer has filled everything in.
    if (requiresShipping(productId)) {
      if (!country) {
        return NextResponse.json(
          { error: "Choose a delivery country before purchasing.", code: "NO_DESTINATION" },
          { status: 400 }
        );
      }
      const refusal = unsupportedDestinationMessage(productId, "stripe", country);
      if (refusal) {
        return NextResponse.json({ error: refusal, code: "UNSUPPORTED_DESTINATION" }, { status: 400 });
      }
    }

    // Credentials come AFTER the destination is validated: a destination the provider cannot serve
    // is the buyer's problem to fix and deserves a 400 that says so, not a server-configuration
    // error that hides it.
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

    const isDigital = DIGITAL_PRODUCTS.includes(productId);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.universal-transmissions.com";
    const unitAmount = Math.round(product.price * 100);

    const params = new URLSearchParams({
      "payment_method_types[0]": "card",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": product.title,
      "line_items[0][price_data][product_data][description]": product.description.slice(0, 255),
      "line_items[0][price_data][unit_amount]": String(unitAmount),
      "line_items[0][quantity]": "1",
      mode: "payment",
      success_url: `${baseUrl}/sanctum/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/sanctum/${product.slug}?canceled=true`,
    });

    // Products that ship are priced from the DELIVERY COUNTRY, decided here rather than in the
    // browser: the request carries a country, never an amount. The address the buyer may give is
    // then restricted to the countries carrying the same rate, so changing the address inside the
    // session cannot produce a total that disagrees with the rate that was charged.
    if (requiresShipping(productId)) {
      const shipAmt = shippingCentsFor(productId, country);
      const shipName = shippingLabelFor(productId, country);
      const window = deliveryWindow(productId);
      params.append("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
      params.append("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(shipAmt));
      params.append("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
      params.append("shipping_options[0][shipping_rate_data][display_name]", shipName);
      params.append("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]", "business_day");
      params.append("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]", String(window.min));
      params.append("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]", "business_day");
      params.append("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]", String(window.max));

      // Restrict delivery to the countries carrying this rate. Nothing here is buyer-selectable:
      // there is one rate, and the address must fall inside it. A product charged the same
      // everywhere (the cube) is not restricted at all, because no address could disagree with it.
      allowedDeliveryFor(productId, "stripe", country).forEach((cc, i) => {
        params.append(`shipping_address_collection[allowed_countries][${i}]`, cc);
      });
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(key + ":").toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await res.json();
    if (!res.ok || session.error) {
      console.error("Stripe error:", session.error || res.status);
      return NextResponse.json({ error: "Checkout failed", detail: session.error?.message }, { status: 502 });
    }

    // Save order to Supabase
    try {
      await supabaseAdmin.from("ut_orders").insert({
        stripe_session_id: session.id,
        customer_email: session.customer_email || "",
        product_id: productId,
        product_title: product.title,
        amount_cents: unitAmount,
        is_digital: isDigital,
        status: "pending",
      });
    } catch (e) {
      console.error("Supabase insert failed:", e);
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Checkout error:", msg);
    return NextResponse.json({ error: "Checkout failed", detail: msg }, { status: 500 });
  }
}
