import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin, getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ authenticated: false, plan: "guest" });
    }

    // Check Oracle profile first, fall back to ut_members
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, stripe_customer_id")
      .eq("id", session.user.email)
      .maybeSingle();

    const { data: member } = await supabaseAdmin
      .from("ut_members")
      .select("plan, subscription_status, current_period_end")
      .eq("email", session.user.email)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      email: session.user.email,
      plan: profile?.plan ?? member?.plan ?? "guest",
      stripeCustomerId: profile?.stripe_customer_id ?? null,
      subscription_status: member?.subscription_status ?? "inactive",
      current_period_end: member?.current_period_end ?? null,
    });
  } catch (err) {
    console.error("Session endpoint error:", err);
    return NextResponse.json({ authenticated: false, plan: "guest" }, { status: 200 });
  }
}
