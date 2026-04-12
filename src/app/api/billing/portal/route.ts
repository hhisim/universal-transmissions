import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin, getSupabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check Oracle profile first, then ut_members
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("email", session.user.email)
      .maybeSingle();

    const { data: member } = profile?.stripe_customer_id
      ? { data: { stripe_customer_id: profile.stripe_customer_id } }
      : await supabaseAdmin
          .from("ut_members")
          .select("stripe_customer_id")
          .eq("email", session.user.email)
          .maybeSingle()
          .then(r => ({ data: r.data }));

    const customerId = profile?.stripe_customer_id ?? member?.stripe_customer_id
    if (!customerId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Billing portal error:", err);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}
