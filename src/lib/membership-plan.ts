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
  /** Batch 14ah: when a completed, verified reconciliation produced this row. */
  entitlement_authority_at?: string | null;
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
 * READ AUTHORITY — does this row carry EXPLICIT EVIDENCE that a completed,
 * verified subscription reconciliation produced its state?
 *
 * This is the authority test, and it is the ONLY one. Identifier presence is
 * deliberately NOT authority: `api/billing/checkout` writes `stripe_customer_id`
 * at CUSTOMER CREATION, with no subscription reconciliation behind it, so
 * "this row records a Stripe id" would let a checkout suppress a legitimate
 * legacy paid row and lift a recorded revocation.
 */
export function hasReconciliationEvidence(row: MembershipRow | null | undefined): boolean {
  const stamp = row?.entitlement_authority_at;
  return typeof stamp === "string" && stamp.trim().length > 0;
}

/**
 * Does the row record any Stripe identifier?
 *
 * Used ONLY as the consistency check between rows that already have authority —
 * never as an authority test.
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

const PROFILE_COLUMNS =
  "plan,stripe_customer_id,stripe_subscription_id,subscription_status,entitlement_authority_at";
const MEMBER_COLUMNS =
  "plan,stripe_customer_id,stripe_subscription_id,subscription_status,current_period_end,created_at,entitlement_authority_at";

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
    // A row may decide entitlement only when it carries EXPLICIT EVIDENCE of a
    // completed, verified subscription reconciliation — the timestamp a lifecycle
    // writer persists ATOMICALLY with the decision it made from Stripe's current
    // state:
    //
    //   ATTESTED   — `entitlement_authority_at` is present. A verified
    //                reconciliation produced this row, so it may both GRANT and
    //                REVOKE.
    //
    //   UNATTESTED — no reconciliation is on record: legacy rows, rows a checkout
    //                wrote at CUSTOMER CREATION, hand-seeded rows. An unattested
    //                row contributes NOTHING while an attested row exists for the
    //                same address. It is reported as `unaddressable` and is never
    //                rewritten by address.
    //
    // IDENTIFIER PRESENCE IS NOT EVIDENCE. `api/billing/checkout` writes
    // `stripe_customer_id` at customer creation with no subscription behind it, so
    // "this row records a Stripe id" would let a checkout suppress a legitimate
    // legacy paid row AND lift a recorded revocation. Authority is the
    // reconciliation timestamp, never the identifier.
    //
    // NO ATTESTED ROW AT ALL — there is no reconciliation to prefer, so the
    // previous rule stands unchanged: highest plan wins and
    // `ut_members.subscription_status` revokes. That is what preserves legitimate
    // legacy access AND keeps a recorded revocation effective.
    //
    // CONTRADICTION — two attested rows that disagree about the relationship they
    // record: a different non-empty customer, or a different non-empty
    // subscription. Nothing stored says which governs, and choosing one would be
    // guessing, so the read fails closed instead of entitling on either.
    //
    // `profiles.subscription_status` remains non-authoritative for revocation
    // (nothing writes and clears it), so it is not consulted here either.
    const profileAttested = hasReconciliationEvidence(profile);
    const memberAttested = hasReconciliationEvidence(member);
    const attestedAny = profileAttested || memberAttested;

    const unaddressable: string[] = [];
    if (attestedAny) {
      if (profile && !profileAttested) unaddressable.push("profiles");
      if (member && !memberAttested) unaddressable.push("ut_members");
    }

    if (profileAttested && memberAttested) {
      const profileCustomer = linkageId(profile?.stripe_customer_id);
      const memberCustomer = linkageId(member?.stripe_customer_id);
      const profileSubscription = linkageId(profile?.stripe_subscription_id);
      const memberSubscription = linkageId(member?.stripe_subscription_id);
      const customerClash =
        profileCustomer !== null && memberCustomer !== null && profileCustomer !== memberCustomer;
      const subscriptionClash =
        profileSubscription !== null &&
        memberSubscription !== null &&
        profileSubscription !== memberSubscription;
      if (customerClash || subscriptionClash) {
        return {
          ok: false,
          reason: "ambiguous",
          detail: customerClash
            ? "two attested rows name different Stripe customers; no stored state says which governs"
            : "two attested rows name different Stripe subscriptions; no stored state says which governs",
        };
      }
    }

    // Only rows with reconciliation evidence may decide entitlement.
    const authorityProfile = attestedAny && !profileAttested ? null : profile;
    const authorityMember = attestedAny && !memberAttested ? null : member;

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
