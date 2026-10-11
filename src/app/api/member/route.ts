import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveVerifiedEmail } from "@/lib/verified-identity";
import { resolveMembershipPlan } from "@/lib/membership-plan";

export const dynamic = "force-dynamic";

/**
 * Return the signed-in caller's own membership record.
 *
 * Batch 14 changes — this route previously had NO authentication at all:
 *   the address came from `?email=`, it was a GET that WROTE (inserting a
 *   `ut_members` row and updating `last_login`), and it returned `select("*")`
 *   including `stripe_customer_id` to anyone who asked.
 *
 * Batch 14b: the plan is resolved across BOTH tables with the same rule every
 * other reader uses, so a free activation recorded only in `ut_members` is
 * observable here even when a stale `profiles` row exists.
 */
export async function GET(req: NextRequest) {
  try {
    const email = await resolveVerifiedEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const resolved = await resolveMembershipPlan(supabaseAdmin, email);

    if (!resolved.ok) {
      if (resolved.reason === "ambiguous") {
        console.error("[member] ambiguous membership rows for the verified address");
        return NextResponse.json({ error: "Membership records are ambiguous" }, { status: 409 });
      }
      console.error("[member] lookup failed:", resolved.detail);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const { membership } = resolved;

    if (!membership.member && !membership.profile) {
      // No membership record at all. Reported as such; a read never creates one.
      return NextResponse.json({ member: null, plan: null }, { status: 200 });
    }

    // The row itself comes from ut_members when present; the plan is the
    // resolved effective plan, which may come from profiles.
    const row = membership.member ?? membership.profile ?? {};
    return NextResponse.json({ ...row, plan: membership.plan });
  } catch (err) {
    console.error("Member API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
