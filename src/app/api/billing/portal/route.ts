import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: member } = await supabaseAdmin
      .from("ut_members")
      .select("stripe_customer_id")
      .eq("email", session.user.email)
      .maybeSingle();

    if (!member?.stripe_customer_id) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: `${baseUrl}/member`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Billing portal error:", err);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}
