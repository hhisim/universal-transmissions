import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`✅ Payment succeeded for session: ${session.id}`);

      // shipping_details exists on the Session object but TypeScript may not know it
      const shippingDetails = (session as any).shipping_details as { name?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } } | null | undefined;

      // Determine if digital
      const isDigital = session.line_items?.data[0]?.price?.product
        ? typeof session.line_items.data[0].price.product === "string"
          ? ["codex-digital", "chakra-4k", "chakra-8k"].some(id =>
              session.line_items!.data[0].price!.product!.toString().includes(id) ||
              session.line_items!.data[0].description?.toLowerCase().includes("pdf") ||
              session.line_items!.data[0].description?.toLowerCase().includes("loop pack")
            )
          : !!(session.line_items!.data[0].price!.product as Stripe.Product | null)?.description
        : false;

      // Update order status in Supabase
      try {
        const { error } = await supabaseAdmin
          .from("ut_orders")
          .update({
            status: isDigital ? "fulfilled" : "paid",
            stripe_payment_intent_id: session.payment_intent as string,
            customer_email: session.customer_email || "",
            customer_name: session.customer_details?.name || null,
            shipping_name: shippingDetails?.name || null,
            shipping_address_line1: shippingDetails?.address?.line1 || null,
            shipping_address_line2: shippingDetails?.address?.line2 || null,
            shipping_city: shippingDetails?.address?.city || null,
            shipping_state: shippingDetails?.address?.state || null,
            shipping_postal_code: shippingDetails?.address?.postal_code || null,
            shipping_country: shippingDetails?.address?.country || null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", session.id);

        if (error) {
          console.error("Failed to update order status:", error);
        } else {
          console.log(`Order updated to: ${isDigital ? "fulfilled" : "paid"}`);
        }
      } catch (err) {
        console.error("Supabase update failed:", err);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ Payment failed: ${intent.id}`);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
