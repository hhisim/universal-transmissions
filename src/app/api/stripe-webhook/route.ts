import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Telegram notification helper ────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.AKASHA_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_HOME_CHANNEL ?? "5491669332";

async function sendTelegram(html: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("AKASHA_BOT_TOKEN not set — skipping Telegram notification");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("Telegram notification failed:", err);
  }
}

function formatCurrency(amount: number | null | undefined, currency: string = "usd"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

// UT Supabase — the webhook writes to UT's database, not VOA's
function getUtSupabaseAdmin(): SupabaseClient {
  const url = process.env.UT_SUPABASE_URL;
  const key = process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("UT_SUPABASE_URL or UT_SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key);
}
const utSupabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getUtSupabaseAdmin();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
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

      let orderNote = "";
      try {
        const { error } = await utSupabaseAdmin
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
        else {
          console.log(`Order updated to: ${isDigital ? "fulfilled" : "paid"}`);
          orderNote = "✅ Order updated in UT DB";
        }
      } catch (err) {
        console.error("Supabase update failed:", err);
      }

      // ── Telegram notification ────────────────────────────────────────────
      const amount = session.amount_total;
      const productName = session.line_items?.data[0]?.description ?? "Order";
      const customerName = session.customer_details?.name ?? session.customer_email ?? "Unknown";
      const customerEmail = session.customer_email ?? "—";
      const ts = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });

      await sendTelegram(
        `<b>🛒 NEW SALE — ${formatCurrency(amount, session.currency ?? "usd")}</b>\n` +
        `Customer: ${customerName}\n` +
        `Email: ${customerEmail}\n` +
        `Product: ${productName}\n` +
        `Time: ${ts}\n` +
        `${orderNote}`
      );
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const ts = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
      console.log(`❌ Payment failed: ${intent.id}`);
      await sendTelegram(
        `<b>⚠️ PAYMENT FAILED</b>\n` +
        `Payment Intent: ${intent.id}\n` +
        `Amount: ${formatCurrency(intent.amount, intent.currency)}\n` +
        `Time: ${ts}`
      );
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
      let plan: 'free' | 'initiate' = 'free';
      let subscriptionStatus = subscription.status;

      if (subscription.status === "active" || subscription.status === "trialing") {
        plan = "initiate";
      } else if (subscription.status === "past_due") {
        subscriptionStatus = "past_due";
        plan = "initiate"; // keep plan but mark status
      } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
        plan = "free";
        subscriptionStatus = "canceled";
      }

      // Get period end
      const periodEnd = new Date((subscription as any).current_period_end * 1000).toISOString();

      // Update ut_members (existing store members)
      let memberNote = "";
      try {
        await utSupabaseAdmin
          .from("ut_members")
          .update({
            plan,
            subscription_status: subscriptionStatus,
            stripe_subscription_id: subscription.id,
            current_period_end: periodEnd,
            stripe_customer_id: customerId,
          })
          .eq("stripe_customer_id", customerId);
        console.log(`ut_members updated: plan=${plan}, status=${subscriptionStatus}`);
        memberNote = "✅ Member record updated";
      } catch (err) {
        console.error("Failed to update ut_members subscription:", err);
      }

      // Update profiles table (Oracle members) — keyed by email
      if (email) {
        try {
          await utSupabaseAdmin
            .from("profiles")
            .update({
              plan,
              email,
              stripe_customer_id: customerId,
            })
            .eq("email", email);
          console.log(`profiles updated: email=${email}, plan=${plan}`);
        } catch (err) {
          console.error("Failed to update Oracle profile subscription:", err);
        }
      }

      // ── Telegram notification ────────────────────────────────────────────
      const isNew = event.type === "customer.subscription.created";
      const ts = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
      await sendTelegram(
        `<b>${isNew ? "✨ NEW MEMBERSHIP" : "🔄 MEMBERSHIP UPDATE"}</b>\n` +
        `Email: ${email ?? "—"}\n` +
        `Plan: ${plan}\n` +
        `Status: ${subscriptionStatus}\n` +
        `Customer ID: ${customerId}\n` +
        `Time: ${ts}\n` +
        `${memberNote}`
      );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log(`Subscription deleted: ${subscription.id} for customer ${customerId}`);

      // Revert ut_members
      try {
        await utSupabaseAdmin
          .from("ut_members")
          .update({
            plan: "guest",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
          })
          .eq("stripe_customer_id", customerId);
        console.log("ut_members reverted to guest");
      } catch (err) {
        console.error("Failed to cancel ut_members subscription:", err);
      }

      // Revert profiles (Oracle) — find by stripe_customer_id
      try {
        const { data: profile } = await utSupabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()
        if (profile) {
          await utSupabaseAdmin
            .from("profiles")
            .update({ plan: "free" })
            .eq("id", profile.id)
          console.log(`profiles reverted to free: ${profile.id}`);
        }
      } catch (err) {
        console.error("Failed to revert Oracle profile:", err);
      }

      // ── Telegram notification ──────────────────────────────────────────────
      const ts = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
      await sendTelegram(
        `<b>❌ MEMBERSHIP CANCELLED</b>\n` +
        `Customer ID: ${customerId}\n` +
        `Time: ${ts}`
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      console.log(`Invoice payment failed for customer ${customerId}: ${invoice.id}`);

      try {
        await utSupabaseAdmin
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
      const invoiceAny = invoice as any;
      if (invoiceAny.subscription && invoice.customer_email) {
        const customerId = invoice.customer as string;
        const subscriptionId = invoiceAny.subscription as string;
        const customerEmail = invoice.customer_email;

        try {
          await utSupabaseAdmin
            .from("ut_members")
            .upsert(
              {
                email: customerEmail,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                plan: "initiate",
                subscription_status: "active",
              },
              { onConflict: "email" }
            );

          // Also upsert profiles (Oracle) — keyed by email
          await utSupabaseAdmin
            .from("profiles")
            .upsert(
              { email: customerEmail, stripe_customer_id: customerId, plan: "initiate" },
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
