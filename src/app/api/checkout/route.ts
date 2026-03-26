import { NextRequest, NextResponse } from "next/server";
import { products } from "@/data/products";
import { supabaseAdmin } from "@/lib/supabase";

const DIGITAL_PRODUCTS = ["codex-digital", "chakra-4k", "chakra-8k"];
const PHYSICAL_PRODUCTS = ["codex-physical", "hexahedron-cube"];

// Countries supported by Stripe's shipping_address_collection
// NOTE: Turkey (TR) and Israel (IL) are NOT supported by Stripe shipping_address_collection
const SUPPORTED_SHIPPING_COUNTRIES = [
  "US","CA","GB","DE","FR","IT","ES","NL","BE","AT","CH","SE","NO","DK","FI","IE","PT","PL","CZ","HU","RO","BG","HR","SK","SI","EE","LV","LT","GR","MT","CY","LU","IS","LI","MC","AD","SM","VA","ME","RS","BA","MK","AL","XK","ZA","BR","AR","CL","CO","MX","PE","VE","UY","PY","BO","EC","GY","SR","GF","PA","CR","HN","NI","SV","GT","BZ","JM","HT","DO","TT","BB","BS","CU","PR","VI","GU","CW","SX","BQ","AW","LC","DM","VC","AG","GD","KN","AI","MS","VG","TC",
  "AU","NZ","JP","CN","KR","IN","TH","VN","MY","SG","ID","PH","PK","BD","LK","NP","MM","KH","LA","MN","TW","HK","MO",
];

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  try {
    const { productId } = await req.json();
    const product = products.find((p) => p.id === productId);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const isDigital = DIGITAL_PRODUCTS.includes(productId);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.universal-transmissions.com";
    const unitAmount = Math.round(product.price * 100);

    // Build form-encoded body
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

    if (PHYSICAL_PRODUCTS.includes(productId)) {
      SUPPORTED_SHIPPING_COUNTRIES.forEach((c, i) =>
        params.append(`shipping_address_collection[allowed_countries][${i}]`, c)
      );
      const shipAmt = productId === "codex-physical" ? 3000 : 2000;
      const shipName = productId === "codex-physical" ? "Standard Shipping ($30, AU/Asia $50)" : "Worldwide Shipping ($20)";
      params.append("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
      params.append("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(shipAmt));
      params.append("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
      params.append("shipping_options[0][shipping_rate_data][display_name]", shipName);
      params.append("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]", "business_day");
      params.append("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]", "5");
      params.append("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]", "business_day");
      params.append("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]", "21");
      params.append("billing_address_collection", "required");
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
