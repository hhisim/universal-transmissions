/**
 * Membership plan resolution — one rule, shared by every reader.
 *
 * Why this exists
 * ---------------
 * Before Batch 14b the readers disagreed about which table wins:
 *
 *   /api/billing/session      profiles -> ut_members
 *   /api/member/message       profiles -> ut_members
 *   sanctum/member/codex-ii   profiles -> ut_members
 *   /api/billing/plan-status  ut_members -> profiles
 *   /api/member               ut_members only
 *
 * Four of the five were profiles-first. That mattered as soon as free
 * activation stopped creating a `profiles` row (option 3): a member holding an
 * old `profiles` row at plan 'guest' alongside a new `ut_members` row at
 * 'free' would be reported as 'guest' by every profiles-first reader — the
 * activation would succeed and be invisible. The opposite order is no better:
 * it lets a stale 'free' in `ut_members` hide a paid 'initiate' in `profiles`.
 *
 * A fixed table order therefore cannot be correct in both directions. The rule
 * here is **highest entitlement wins**, using the plan vocabulary the
 * application already has (`normalizeMemberPlan`). The plan vocabulary and the
 * price-to-plan mapping are NOT changed by this module.
 *
 * Failure handling: any lookup error is a failure, never an absent row. Callers
 * answer as unauthenticated/guest rather than guessing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMemberPlan, type MemberPlan } from "@/lib/plans";

export type { MemberPlan };

export interface MembershipRow {
  plan?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
  created_at?: string | null;
}

export interface ResolvedMembership {
  /** Highest-entitlement plan observed across both tables, normalised. */
  plan: MemberPlan;
  profile: MembershipRow | null;
  member: MembershipRow | null;
  /** Raw stored value the reported plan came from, for diagnostics. */
  source: "profiles" | "ut_members" | "none";
}

export type PlanResolution =
  | { ok: true; membership: ResolvedMembership }
  | { ok: false; reason: "lookup_failed" | "ambiguous"; detail: string };

/** Entitlement rank in the application's existing plan vocabulary. */
export function planRank(plan?: string | null): number {
  switch (normalizeMemberPlan(plan)) {
    case "initiate":
      return 2;
    case "free":
      return 1;
    default:
      return 0;
  }
}

const PROFILE_COLUMNS = "plan,stripe_customer_id,stripe_subscription_id,subscription_status";
const MEMBER_COLUMNS =
  "plan,stripe_customer_id,stripe_subscription_id,subscription_status,current_period_end,created_at";

/**
 * Read both membership tables for one verified address and resolve the plan.
 *
 * Both lookups run together; either one failing fails the whole resolution, so
 * an unreadable membership is never reported as a plan. A caller that gets
 * `{ok:false}` must answer as guest.
 */
export async function resolveMembershipPlan(
  client: SupabaseClient,
  email: string
): Promise<PlanResolution> {
  try {
    const [profileRes, memberRes] = await Promise.all([
      client.from("profiles").select(PROFILE_COLUMNS).eq("email", email).limit(2),
      client.from("ut_members").select(MEMBER_COLUMNS).eq("email", email).limit(2),
    ]);

    if (profileRes.error) {
      return { ok: false, reason: "lookup_failed", detail: profileRes.error.message };
    }
    if (memberRes.error) {
      return { ok: false, reason: "lookup_failed", detail: memberRes.error.message };
    }

    const profiles = (profileRes.data ?? []) as unknown as MembershipRow[];
    const members = (memberRes.data ?? []) as unknown as MembershipRow[];

    // Ambiguous data is not resolved by picking one row.
    if (profiles.length > 1 || members.length > 1) {
      // Ambiguous data is reported as ambiguity, not as a transient read error:
      // the two need different answers from a caller.
      return {
        ok: false,
        reason: "ambiguous",
        detail: "multiple membership rows match one address",
      };
    }

    const profile = profiles[0] ?? null;
    const member = members[0] ?? null;

    const profileRank = planRank(profile?.plan);
    const memberRank = planRank(member?.plan);

    let plan: MemberPlan = "guest";
    let source: ResolvedMembership["source"] = "none";
    if (profileRank === 0 && memberRank === 0) {
      // Neither table grants entitlement. Report whichever stored value exists
      // so the shape matches the previous behaviour.
      plan = normalizeMemberPlan(profile?.plan ?? member?.plan ?? "guest");
      source = profile ? "profiles" : member ? "ut_members" : "none";
    } else if (profileRank >= memberRank) {
      plan = normalizeMemberPlan(profile?.plan);
      source = "profiles";
    } else {
      plan = normalizeMemberPlan(member?.plan);
      source = "ut_members";
    }

    return { ok: true, membership: { plan, profile, member, source } };
  } catch (err) {
    return {
      ok: false,
      reason: "lookup_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
