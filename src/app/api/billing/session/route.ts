import { NextRequest, NextResponse } from "next/server";
import { normalizeMemberPlan } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveVerifiedIdentity } from "@/lib/verified-identity";

/**
 * GET /api/billing/session
 *
 * Identity comes from a signature-verified credential (see
 * @/lib/verified-identity). The address used for both membership lookups is the
 * verified one — a client-supplied email, user id or plan is never consulted.
 *
 * Response contract (unchanged for callers):
 *   anonymous / unverifiable      -> 200 { authenticated: false, plan: "guest" }
 *   verified                      -> 200 { authenticated: true, email, plan,
 *                                          stripeCustomerId, subscription_status,
 *                                          current_period_end }
 *   lookup failure / duplicates   -> 200 { authenticated: false, plan: "guest" }
 *                                    (fail closed: no member data, no plan, no
 *                                     customer id is exposed)
 */

type Row = { plan?: string | null } & Record<string, unknown>;

/**
 * Read one row for a verified address. Returns null when there is no record and
 * throws when the lookup fails or returns more than one row, so the caller can
 * fail closed rather than pick an arbitrary record.
 *
 * Both tables are keyed on email but neither has a unique constraint on it:
 *   0 rows -> maybeSingle() yields { data: null }         -> null
 *   1 row  -> the row                                     -> row
 *   >1 rows-> maybeSingle() yields PGRST116 error         -> throws
 */
async function lookupOne(
  table: "profiles" | "ut_members",
  email: string,
  columns: string
): Promise<Row | null> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(columns)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`${table} lookup failed: ${error.message ?? "unknown error"}`);
  }
  return (data as Row | null) ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveVerifiedIdentity(req);

    if (!identity) {
      // Nothing verified: no member data is returned.
      return NextResponse.json({ authenticated: false, plan: "guest" });
    }

    const email = identity.email;

    try {
      const [profile, member] = await Promise.all([
        lookupOne("profiles", email, "plan,stripe_customer_id"),
        lookupOne("ut_members", email, "plan,subscription_status,current_period_end"),
      ]);

      return NextResponse.json({
        authenticated: true,
        email,
        plan: normalizeMemberPlan(profile?.plan ?? member?.plan ?? "guest"),
        stripeCustomerId: profile?.stripe_customer_id ?? null,
        subscription_status: member?.subscription_status ?? "inactive",
        current_period_end: member?.current_period_end ?? null,
      });
    } catch (err) {
      // Fail closed: a membership we could not read is never reported as data.
      console.error("Session lookup failed:", err);
      return NextResponse.json({ authenticated: false, plan: "guest" });
    }
  } catch (err) {
    console.error("Session endpoint error:", err);
    return NextResponse.json({ authenticated: false, plan: "guest" }, { status: 200 });
  }
}