import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin, getSupabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Get logged-in user session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const email = session.user.email;
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_INITIATE_MONTHLY;

    if (!priceId) {
      console.error("Missing NEXT_PUBLIC_STRIPE_PRICE_INITIATE_MONTHLY env var");
      return NextResponse.json({ error: "Subscription not configured" }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // 2. Get or create Stripe customer
    const { data: member } = await supabaseAdmin
      .from("ut_members")
      .select("stripe_customer_id")
      .eq("email", email)
      .maybeSingle();

    let customerId: string;

    if (member?.stripe_customer_id) {
      customerId = member.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await getStripe().customers.create({
        email,
        metadata: { email, source: "ut_oracle" },
      });
      customerId = customer.id;

      // Store customer ID in ut_members (store) and profiles (Oracle)
      await supabaseAdmin
        .from("ut_members")
        .upsert(
          { email, stripe_customer_id: customerId, plan: "free" },
          { onConflict: "email" }
        );
      // Also create Oracle profile — look up UUID from auth.users by email
      const { data: authUser } = await supabaseAdmin
        .from("auth.users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (authUser?.id) {
        await supabaseAdmin
          .from("profiles")
          .upsert(
            { id: authUser.id, stripe_customer_id: customerId, plan: "free" },
            { onConflict: "id" }
          );
      }
    }

    // 3. Create subscription checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        metadata: {
          email,
          plan: "initiate",
        },
      },
      success_url: `${baseUrl}/account?session_id={CHECKOUT_SESSION_ID}&success=1`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
      metadata: { email },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Billing checkout error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
