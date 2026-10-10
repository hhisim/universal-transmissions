import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeMemberPlan } from "@/lib/plans";
import { resolveVerifiedIdentity } from "@/lib/verified-identity";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/plan-status
 *
 * Returns the plan of the VERIFIED caller. This route previously took an
 * arbitrary `?email=` and read that member's record with the service-role key,
 * which made it an unauthenticated member-data endpoint: anyone could ask for
 * any address and receive its plan and Stripe customer id.
 *
 * Now:
 *   - the address is the verified identity only; `?email=` and every other
 *     caller-supplied identifier is ignored entirely;
 *   - anonymous or unverifiable callers receive no member data;
 *   - the Stripe customer id is no longer returned — no legitimate caller of
 *     this endpoint needs it, and /api/billing/session already supplies it to
 *     the verified owner;
 *   - lookup failure or duplicate rows fail closed.
 */

type Row = { plan?: string | null };

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveVerifiedIdentity(req);

    if (!identity) {
      // No member data for an unverified caller.
      return NextResponse.json({ plan: "guest" });
    }

    const email = identity.email;

    try {
      const [member, profile] = await Promise.all([
        supabaseAdmin.from("ut_members").select("plan").eq("email", email).maybeSingle(),
        supabaseAdmin.from("profiles").select("plan").eq("email", email).maybeSingle(),
      ]);

      if (member.error || profile.error) {
        throw new Error(member.error?.message ?? profile.error?.message ?? "lookup failed");
      }

      const m = (member.data as Row | null) ?? null;
      const p = (profile.data as Row | null) ?? null;

      return NextResponse.json({
        plan: normalizeMemberPlan(m?.plan ?? p?.plan ?? "guest"),
      });
    } catch (err) {
      // Fail closed: an unreadable membership is never reported as a plan.
      console.error("[billing/plan-status] lookup failed:", err);
      return NextResponse.json({ plan: "guest" });
    }
  } catch (err) {
    console.error("[billing/plan-status]", err);
    return NextResponse.json({ plan: "guest" });
  }
}