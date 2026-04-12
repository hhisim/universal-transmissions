import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";

const SUPABASE_URL = "https://opixpkquyapeqdceyczs.supabase.co";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const email = session.user.email;

    // Get stripe_customer_id — check profiles first, then ut_members
    // ut_members has manual entries for paying members (master tier)
    let stripeCustomerId: string | null = null;

    // Try profiles table
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const admin = createClient(url, key);
        const { data } = await admin
          .from("profiles")
          .select("stripe_customer_id")
          .eq("email", email)
          .maybeSingle();
        stripeCustomerId = data?.stripe_customer_id ?? null;
      }
    } catch (e) {
      console.error("profiles lookup error:", e);
    }

    // Try ut_members (manual stripe records for master tier members)
    if (!stripeCustomerId) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
          const admin = createClient(url, key);
          const { data } = await admin
            .from("ut_members")
            .select("stripe_customer_id")
            .eq("email", email)
            .maybeSingle();
          stripeCustomerId = data?.stripe_customer_id ?? null;
        }
      } catch (e) {
        console.error("ut_members lookup error:", e);
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found. Please contact support." }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.universal-transmissions.com";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/member`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Billing portal error:", err);
    return NextResponse.json({ error: "Could not open billing portal. Please try again." }, { status: 500 });
  }
}
