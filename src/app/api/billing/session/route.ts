import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ authenticated: false, plan: "guest" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.email) {
      return NextResponse.json({ authenticated: false, plan: "guest" });
    }

    const email = user.email;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, stripe_customer_id")
      .eq("email", email)
      .maybeSingle();

    const { data: member } = await supabaseAdmin
      .from("ut_members")
      .select("plan, subscription_status, current_period_end")
      .eq("email", email)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      email,
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
