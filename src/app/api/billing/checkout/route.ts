import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { normaliseMemberEmail, writeMembershipRow } from "@/lib/membership-write";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify the caller with Supabase (signature-verified access token).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.email) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Canonical address + the verified Supabase user id (profiles is keyed by it).
    const email = normaliseMemberEmail(user.email);
    if (!email) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const userId = user.id;

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_INITIATE_MONTHLY;
    if (!priceId) {
      console.error("Missing NEXT_PUBLIC_STRIPE_PRICE_INITIATE_MONTHLY env var");
      return NextResponse.json({ error: "Subscription not configured" }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // 2. Reuse the stored customer, or create one.
    //
    //    `stripe_customer_id` is read through the shared helper so a lookup
    //    failure is distinguished from "no member row"; the old code used
    //    `.maybeSingle()`, which returns `data: null` for both an absent row and
    //    an errored query, and then silently created a second Stripe customer.
    let customerId: string | null = null;
    {
      const { data: existing, error: lookupError } = await supabaseAdmin
        .from("ut_members")
        .select("stripe_customer_id")
        .eq("email", email)
        .limit(2);

      if (lookupError) {
        console.error("Billing checkout: member lookup failed:", lookupError.message, lookupError.code);
        // Fail closed: do not invent a customer when the lookup is unknown.
        return NextResponse.json({ error: "Membership lookup failed" }, { status: 503 });
      }
      const rows = existing ?? [];
      if (rows.length > 1) {
        console.error("Billing checkout: duplicate member rows for the verified address");
        return NextResponse.json({ error: "Membership records are ambiguous" }, { status: 409 });
      }
      customerId = (rows[0]?.stripe_customer_id as string | null) ?? null;
    }

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email,
        metadata: { email, source: "ut_oracle" },
      });
      customerId = customer.id;

      // Persist the new customer id. Both writes are error-checked; neither is
      // an upsert, because neither table has a unique index on email.
      //
      // Side effect to be aware of: the Stripe customer now exists. If the
      // writes below fail, that customer is orphaned — it is not deleted here,
      // because compensating against live Stripe automatically is out of scope.
      const memberWrite = await writeMembershipRow(
        supabaseAdmin,
        "ut_members",
        email,
        { stripe_customer_id: customerId, plan: "free" },
        { protectPaidPlan: true }
      );
      if (!memberWrite.ok) {
        console.error(
          "Billing checkout: ut_members write failed:",
          memberWrite.reason,
          memberWrite.detail
        );
      }

      const profileWrite = await writeMembershipRow(
        supabaseAdmin,
        "profiles",
        email,
        { stripe_customer_id: customerId, plan: "free" },
        { protectPaidPlan: true, userId }
      );
      if (!profileWrite.ok) {
        console.error(
          "Billing checkout: profiles write failed:",
          profileWrite.reason,
          profileWrite.detail
        );
      }
    }

    // 3. Create the subscription checkout session.
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        metadata: { email, plan: "initiate" },
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
