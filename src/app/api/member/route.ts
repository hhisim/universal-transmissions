import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Upsert member record
    const { data, error } = await supabaseAdmin
      .from("ut_members")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Member fetch error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!data) {
      // Create member record
      const { data: newMember, error: insertError } = await supabaseAdmin
        .from("ut_members")
        .insert({ email, oracle_access: false })
        .select()
        .single();

      if (insertError) {
        console.error("Member insert error:", insertError);
        return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
      }

      return NextResponse.json(newMember);
    }

    // Update last_login
    await supabaseAdmin
      .from("ut_members")
      .update({ last_login: new Date().toISOString() })
      .eq("email", email);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Member API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
