import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { products } from "@/data/products";
import { supabaseAdmin } from "@/lib/supabase";

const DIGITAL_PRODUCTS = ["codex-digital", "chakra-4k", "chakra-8k"];
const PHYSICAL_PRODUCTS = ["codex-physical", "hexahedron-cube"];

// Australia and Asian countries for $50 shipping surcharge
const AU_ASIA_COUNTRIES = ["AU", "NZ", "JP", "CN", "KR", "IN", "TH", "VN", "MY", "SG", "ID", "PH", "PK", "BD", "LK", "NP", "MM", "KH", "LA", "MN", "TW", "HK", "MO"];

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const isDigital = DIGITAL_PRODUCTS.includes(productId);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Determine shipping amount: $50 for AU/Asia countries for codex-physical, $30 otherwise
    let shippingAmount = productId === "codex-physical" ? 3000 : 2000;
    const shippingDisplayName = productId === "codex-physical"
      ? "Standard Shipping ($30, AU/Asia $50)"
      : "Worldwide Shipping ($20)";

    const sessionParams: Record<string, unknown> = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.title,
              description: product.description.slice(0, 255),
              images: product.images.slice(0, 1),
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/sanctum/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/sanctum/${product.slug}?canceled=true`,
    };

    // Add shipping for physical items
    if (PHYSICAL_PRODUCTS.includes(productId)) {
      (sessionParams as Record<string, unknown>).shipping_address_collection = {
        allowed_countries: [
          "US", "CA", "GB", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI", "IE", "PT", "PL", "CZ", "HU", "RO", "BG", "HR", "SK", "SI", "EE", "LV", "LT", "GR", "MT", "CY", "LU", "IS", "LI", "MC", "AD", "SM", "VA", "ME", "RS", "BA", "MK", "AL", "XK", "TR", "IL", "ZA", "BR", "AR", "CL", "CO", "MX", "PE", "VE", "UY", "PY", "BO", "EC", "GY", "SR", "GF", "PA", "CR", "HN", "NI", "SV", "GT", "BZ", "JM", "HT", "DO", "TT", "BB", "BS", "CU", "PR", "VI", "GU", "CW", "SX", "BQ", "AW", "LC", "DM", "VC", "AG", "GD", "KN", "AI", "MS", "VG", "TC",
          ...AU_ASIA_COUNTRIES,
        ],
      };
      (sessionParams as Record<string, unknown>).shipping_options = [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingAmount, currency: "usd" },
            display_name: shippingDisplayName,
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 21 },
            },
          },
        },
      ];
      (sessionParams as Record<string, unknown>).billing_address_collection = "required";
    };

    const session = await stripe.checkout.sessions.create(sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0]);

    // Save order to Supabase
    try {
      await supabaseAdmin.from("ut_orders").insert({
        stripe_session_id: session.id,
        customer_email: session.customer_email || "",
        product_id: productId,
        product_title: product.title,
        amount_cents: Math.round(product.price * 100),
        is_digital: isDigital,
        status: "pending",
      });
    } catch (err) {
      console.error("Failed to save order:", err);
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: "Checkout failed", detail: message }, { status: 500 });
  }
}
