import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestMember } from "@/lib/member-session";

export const dynamic = "force-dynamic";

/**
 * A member's own orders.
 *
 * This route used to return every order matching an `email` query parameter to anyone who asked —
 * no session, `select("*")`, and the address taken from the caller. Knowing a customer's email was
 * enough to read their name, their shipping address and what they bought. The email parameter was
 * doing authentication's job, which it cannot do.
 *
 * Now the caller is identified by their Supabase session and the orders are looked up for THAT
 * verified address. The parameter is still accepted so existing links keep working, but it is only
 * ever compared against the verified identity — it never selects a row.
 */
const ORDER_FIELDS = [
  "id",
  "product_title",
  "amount_cents",
  "currency",
  "status",
  "is_digital",
  "created_at",
  "customer_email",
  "shipping_city",
  "shipping_state",
  "shipping_country",
  "fulfillment_tracking",
].join(",");

export async function GET(req: NextRequest) {
  try {
    const member = await getRequestMember(req);
    if (!member?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const verifiedEmail = member.email.trim().toLowerCase();
    const requested = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();

    /* Asking for somebody else's orders is not a lookup, it is an attempt. Refuse it loudly rather
       than quietly answering with the caller's own rows, which would hide the attempt. */
    if (requested && requested !== verifiedEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("ut_orders")
      .select(ORDER_FIELDS)
      .eq("customer_email", verifiedEmail)
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
