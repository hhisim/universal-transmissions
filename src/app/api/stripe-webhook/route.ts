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
    // ── One-time product payments (existing) ──────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Check if this is a subscription (has subscription_data or mode === 'subscription')
      if (session.mode === "subscription") {
        // Handled by subscription.updated — skip duplicate processing
        break;
      }

      // One-time product payment
      console.log(`✅ Product payment succeeded for session: ${session.id}`);
      const shippingDetails = (session as any).shipping_details as {
        name?: string;
        address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string };
      } | null | undefined;

      const isDigital = session.line_items?.data[0]?.price?.product
        ? typeof session.line_items.data[0].price.product === "string"
          ? ["codex-digital", "chakra-4k", "chakra-8k"].some(id =>
              session.line_items!.data[0].price!.product!.toString().includes(id) ||
              session.line_items!.data[0].description?.toLowerCase().includes("pdf") ||
              session.line_items!.data[0].description?.toLowerCase().includes("loop pack")
            )
          : !!((session.line_items!.data[0].price!.product as Stripe.Product | null)?.description)
        : false;

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

        if (error) console.error("Failed to update order status:", error);
        else console.log(`Order updated to: ${isDigital ? "fulfilled" : "paid"}`);
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

    // ── Subscription events ───────────────────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const email = subscription.metadata?.email;

      console.log(`Subscription ${event.type}: ${subscription.id} for customer ${customerId}`);

      // Determine plan and status
      let plan = "free";
      let subscriptionStatus = subscription.status;

      if (subscription.status === "active" || subscription.status === "trialing") {
        plan = "initiate";
      } else if (subscription.status === "past_due") {
        subscriptionStatus = "past_due";
        plan = "initiate"; // keep plan but mark status
      } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
        plan = "guest";
        subscriptionStatus = "canceled";
      }

      // Get period end
      const periodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();

      // Update ut_members
      try {
        await supabaseAdmin
          .from("ut_members")
          .update({
            plan,
            subscription_status: subscriptionStatus,
            stripe_subscription_id: subscription.id,
            current_period_end: periodEnd,
            stripe_customer_id: customerId,
          })
          .eq("stripe_customer_id", customerId);

        console.log(`Member updated: plan=${plan}, status=${subscriptionStatus}`);
      } catch (err) {
        console.error("Failed to update member subscription:", err);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log(`Subscription deleted: ${subscription.id} for customer ${customerId}`);

      try {
        await supabaseAdmin
          .from("ut_members")
          .update({
            plan: "guest",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
          })
          .eq("stripe_customer_id", customerId);

        console.log("Member reverted to guest plan");
      } catch (err) {
        console.error("Failed to cancel member subscription:", err);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      console.log(`Invoice payment failed for customer ${customerId}: ${invoice.id}`);

      try {
        await supabaseAdmin
          .from("ut_members")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);

        console.log("Member marked as past_due");
      } catch (err) {
        console.error("Failed to mark past_due:", err);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      // Ensure member record exists when payment succeeds
      const invoiceAny = invoice as any;
      if (invoiceAny.subscription && invoice.customer_email) {
        const customerId = invoice.customer as string;
        const subscriptionId = invoiceAny.subscription as string;

        try {
          await supabaseAdmin
            .from("ut_members")
            .upsert(
              {
                email: invoice.customer_email,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                plan: "initiate",
                subscription_status: "active",
              },
              { onConflict: "email" }
            );
        } catch (err) {
          console.error("Failed to upsert member on invoice.payment_succeeded:", err);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
