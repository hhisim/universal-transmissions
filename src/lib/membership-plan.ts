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
  /** Effective plan after revocation is applied. */
  plan: MemberPlan;
  profile: MembershipRow | null;
  member: MembershipRow | null;
  /** Raw stored value the reported plan came from, for diagnostics. */
  source: "profiles" | "ut_members" | "none" | "revoked";
  /** Which table(s) recorded a revoking subscription status. */
  revokedBy?: string[];
  /**
   * Rows that carry no verified Stripe linkage and were therefore given NO
   * authority for this read. They are reported, never rewritten.
   */
  unaddressable?: string[];
}

/**
 * Subscription states that REVOKE entitlement.
 *
 * Taken from what the application already writes and from Stripe's terminal
 * states — not invented here:
 *   - `canceled` is written by the `customer.subscription.deleted` handler
 *     into `ut_members.subscription_status`, the column the subscription events
 *     own (see the AUTHORITY SCOPE note in resolveMembershipPlan).
 *   - `incomplete_expired` and `unpaid` are Stripe's terminal non-paying states.
 *
 * Deliberately NOT revoking:
 *   - `past_due`  — the existing `invoice.payment_failed` handler sets this
 *                   WITHOUT changing the plan, so dunning keeps access. Treating
 *                   it as a revocation would change billing behaviour.
 *   - `active`, `trialing` — paying or in trial.
 *   - `inactive`  — `profiles.subscription_status` defaults to this, and nine
 *                   deployed profiles carry it (eight at `guest`, one at
 *                   `free`). Treating it as a revocation would be a new policy
 *                   and is unnecessary: those rows grant no paid plan anyway.
 *   - NULL — no lifecycle signal recorded.
 *
 * Deployed data at the time of writing: zero rows in any revoking state, the
 * only paid rows being one `profiles.initiate` and one `ut_members.initiate`,
 * both `active`. So this rule removes access from nobody today.
 */
export const REVOKING_STATUSES = new Set(["canceled", "incomplete_expired", "unpaid"]);

export function isRevokingStatus(status?: string | null): boolean {
  return typeof status === "string" && REVOKING_STATUSES.has(status.trim().toLowerCase());
}

/**
 * A stored Stripe identifier, or null. Empty and whitespace-only values are
 * ABSENT: a column written as "" does not name a relationship.
 */
export function linkageId(value?: string | null): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * READ AUTHORITY — does this row carry a VERIFIED Stripe relationship at all?
 *
 * This makes a row a CANDIDATE and nothing more: a bare identifier is never
 * sufficient on its own, because the candidate set must also be consistent
 * before it may decide entitlement. See the authority block in
 * `resolveMembershipPlan`.
 */
export function hasVerifiedStripeLinkage(row: MembershipRow | null | undefined): boolean {
  if (!row) return false;
  return (
    linkageId(row.stripe_customer_id) !== null ||
    linkageId(row.stripe_subscription_id) !== null
  );
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

    // ── READ AUTHORITY ───────────────────────────────────────────────────────
    //
    // A row earns authority ONLY through a verified Stripe relationship:
    //
    //   UNLINKED  — neither identifier is present. Nothing on record ties the row
    //               to the relationship this address was actually granted
    //               through, so it may neither GRANT entitlement nor REVOKE it
    //               while a linked row exists for the same address. Such a row is
    //               reported as `unaddressable` and is never rewritten by address.
    //
    //   LINKED    — carries a customer id and/or a subscription id. This makes the
    //               row a CANDIDATE, not an authority: a non-empty identifier
    //               alone is insufficient, because the candidates must agree
    //               about who the membership belongs to.
    //
    //   NO LINKED ROW AT ALL — there is no verified relationship to prefer, so
    //               today's rule stands unchanged: highest plan wins and
    //               `ut_members.subscription_status` revokes. This is what keeps
    //               legitimate legacy access intact.
    //
    //   CONTRADICTION — two linked rows naming DIFFERENT customers. The stored
    //               state does not say which is current, and choosing one would
    //               be guessing, so the read fails closed instead of entitling on
    //               either.
    //
    // `profiles.subscription_status` remains non-authoritative for revocation
    // (nothing writes and clears it), so it is not consulted here either.
    const profileLinked = hasVerifiedStripeLinkage(profile);
    const memberLinked = hasVerifiedStripeLinkage(member);
    const linkedAny = profileLinked || memberLinked;

    const unaddressable: string[] = [];
    if (linkedAny) {
      if (profile && !profileLinked) unaddressable.push("profiles");
      if (member && !memberLinked) unaddressable.push("ut_members");
    }

    if (profileLinked && memberLinked) {
      const profileCustomer = linkageId(profile?.stripe_customer_id);
      const memberCustomer = linkageId(member?.stripe_customer_id);
      if (
        profileCustomer !== null &&
        memberCustomer !== null &&
        profileCustomer !== memberCustomer
      ) {
        return {
          ok: false,
          reason: "ambiguous",
          detail:
            "the linked rows name different Stripe customers; no stored state says which governs",
        };
      }
    }

    // Only rows with authority may decide entitlement.
    const authorityProfile = linkedAny && !profileLinked ? null : profile;
    const authorityMember = linkedAny && !memberLinked ? null : member;

    // A recorded revocation is an AUTHORITY signal, not another plan to rank.
    // Without this, a stale paid row would keep granting access after a
    // legitimate cancellation whose write to the other table failed.
    // AUTHORITY SCOPE: `ut_members.subscription_status` ONLY.
    //
    // No code path writes `profiles.subscription_status` — the Stripe handlers
    // set `profiles.plan` and nothing else. A value written there could never be
    // cleared, so treating it as a revocation authority would revoke an account
    // PERMANENTLY, even after a legitimate reactivation. The subscription
    // events DO own `ut_members.subscription_status`, and they clear it on
    // reactivation, so that is the single authority for revocation.
    //
    // `profiles.subscription_status` is therefore ignored for entitlement and is
    // recorded as an unmaintained column requiring a separate decision.
    const revokedBy: string[] = [];
    if (isRevokingStatus(authorityMember?.subscription_status)) revokedBy.push("ut_members");
    if (revokedBy.length > 0) {
      return {
        ok: true,
        membership: { plan: "guest", profile, member, source: "revoked", revokedBy, unaddressable },
      };
    }

    const profileRank = planRank(authorityProfile?.plan);
    const memberRank = planRank(authorityMember?.plan);

    let plan: MemberPlan = "guest";
    let source: ResolvedMembership["source"] = "none";
    if (profileRank === 0 && memberRank === 0) {
      // Neither table grants entitlement. Report whichever stored value exists
      // so the shape matches the previous behaviour.
      plan = normalizeMemberPlan(authorityProfile?.plan ?? authorityMember?.plan ?? "guest");
      source = authorityProfile ? "profiles" : authorityMember ? "ut_members" : "none";
    } else if (profileRank >= memberRank) {
      plan = normalizeMemberPlan(authorityProfile?.plan);
      source = "profiles";
    } else {
      plan = normalizeMemberPlan(authorityMember?.plan);
      source = "ut_members";
    }

    return { ok: true, membership: { plan, profile, member, source, unaddressable } };
  } catch (err) {
    return {
      ok: false,
      reason: "lookup_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
