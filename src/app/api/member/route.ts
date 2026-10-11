import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveVerifiedEmail } from "@/lib/verified-identity";
import { findRowByEmail } from "@/lib/membership-write";

export const dynamic = "force-dynamic";

/**
 * Return the signed-in caller's own membership record.
 *
 * Batch 14 changes — this route previously had NO authentication at all:
 *
 *   - The address came from `?email=` (a query parameter), so any caller could
 *     name any address.
 *   - It was a GET that WROTE: it inserted a `ut_members` row for the supplied
 *     address and updated `last_login` on every request.
 *   - It returned `select("*")` — the whole row, including
 *     `stripe_customer_id` and `stripe_subscription_id` — to anyone who asked.
 *
 * It now resolves identity from a signature-verified credential only, ignores
 * the query string entirely, and reads at most the caller's own row.
 */
export async function GET(req: NextRequest) {
  try {
    const email = await resolveVerifiedEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const found = await findRowByEmail(supabaseAdmin, "ut_members", email, "*");

    if (found.ok) {
      // No row is a legitimate answer for a verified member: report "none"
      // rather than creating one on a read.
      if (!found.row) {
        return NextResponse.json({ member: null, plan: null }, { status: 200 });
      }
      return NextResponse.json(found.row);
    }

    if (found.reason === "duplicate_rows") {
      console.error("[member] duplicate ut_members rows for the verified address");
      return NextResponse.json({ error: "Membership records are ambiguous" }, { status: 409 });
    }

    console.error("[member] lookup failed:", found.detail, found.code);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  } catch (err) {
    console.error("Member API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
