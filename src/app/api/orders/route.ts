import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("ut_orders")
      .select("*")
      .eq("customer_email", email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Orders fetch error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (err) {
    console.error("Orders API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
