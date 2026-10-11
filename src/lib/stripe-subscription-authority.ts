/**
 * Bounded current-subscription reconciliation.
 *
 * The event payload is a snapshot taken when Stripe created the event, so a
 * delayed delivery carries stale state. Recency is therefore taken from
 * Stripe's CURRENT state, never from delivery order, list position or
 * `event.created`.
 *
 * Read-only: this module performs no writes and no Stripe mutations.
 */

export type EntitlementState = {
  plan: "guest" | "free" | "initiate";
  status: string;
  basis: "active" | "past_due" | "revoked" | "absent" | "other";
};

export type StoredLinkage = {
  subscriptionId: string | null;
  /** Which table the linkage came from; null when neither carries one. */
  source: "ut_members" | "profiles" | null;
  plan: string | null;
  status: string | null;
};

export type AmbiguityReason =
  | "missing_customer"
  | "stripe_lookup_failed"
  | "ownership_mismatch"
  | "ownership_unverifiable"
  | "multiple_candidates"
  | "ambiguous_status";

export type AuthoritativeSubscription =
  | {
      ok: true;
      found: boolean;
      subscriptionId: string | null;
      status: string | null;
      /** How the governing subscription was chosen. */
      selectedBy: "stored" | "unique_replacement" | "none";
      /** Other non-terminal subscriptions seen, for reporting only. */
      candidates: string[];
    }
  | { ok: false; reason: AmbiguityReason; detail: string };

type StripeSubscription = {
  id: string;
  status: string;
  customer?: unknown;
  current_period_end?: number;
};

type MinimalStripe = {
  subscriptions: {
    retrieve: (id: string, args?: Record<string, unknown>) => Promise<StripeSubscription>;
    list: (args: Record<string, unknown>) => Promise<{
      data: StripeSubscription[];
      has_more?: boolean;
    }>;
  };
};

const REVOKING = new Set(["canceled", "incomplete_expired", "unpaid"]);
/** Statuses under which a subscription still grants (or may grant) access. */
const LIVE = new Set(["active", "trialing", "past_due"]);

export function isRevokingStatusValue(status: string | null | undefined): boolean {
  return typeof status === "string" && REVOKING.has(status.toLowerCase());
}

/**
 * Extract a customer id from Stripe's customer field, which may be a string or
 * an EXPANDED object. A missing or unreadable representation returns null and
 * must never be treated as verified ownership.
 */
export function customerIdOf(customer: unknown): string | null {
  if (typeof customer === "string" && customer.length > 0) return customer;
  if (customer && typeof customer === "object") {
    const id = (customer as { id?: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
    // deleted/expanded-without-id: NOT verifiable
    return null;
  }
  return null;
}

/** Read the stored linkage BEFORE asking Stripe anything. */
export async function readStoredLinkage(
  // Loosely typed on purpose: supabase-js query builders are deeply generic and
  // a narrow structural type is not assignable from SupabaseClient.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { from: (table: string) => any },
  email: string
): Promise<StoredLinkage> {
  for (const table of ["ut_members", "profiles"] as const) {
    try {
      const { data } = await client
        .from(table)
        .select("stripe_subscription_id,plan,subscription_status")
        .eq("email", email)
        .limit(2);
      const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
      if (rows.length === 1) {
        const id = rows[0].stripe_subscription_id;
        return {
          subscriptionId: typeof id === "string" && id.length > 0 ? id : null,
          source: table,
          plan: (rows[0].plan as string | null) ?? null,
          status: (rows[0].subscription_status as string | null) ?? null,
        };
      }
    } catch {
      // treat an unreadable row as no linkage; the caller still reconciles
    }
  }
  return { subscriptionId: null, source: null, plan: null, status: null };
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 5;

/**
 * Resolve the customer's governing subscription.
 *
 * SELECTION RULE (stated, with its limits):
 *   1. The STORED subscription governs when Stripe still knows it, ownership is
 *      verifiable, and its status is live (active/trialing/past_due).
 *   2. Otherwise the customer's non-terminal subscriptions are enumerated. If
 *      EXACTLY ONE remains, it governs — this is the genuine-reactivation and
 *      replaced-subscription path.
 *   3. If NONE remains, entitlement is absent (authoritative: grants nothing).
 *   4. If MORE THAN ONE remains, the policy cannot choose one governing
 *      subscription, so this FAILS CLOSED and reports the ambiguity rather than
 *      inventing a multiple-subscription billing policy.
 *
 * LIMITS: list position is deliberately NOT used to break ties, and no event
 * timestamp is consulted. Pagination is bounded (MAX_PAGES); if the customer has
 * more pages than that, the result is reported as ambiguous rather than guessed.
 */
export async function resolveAuthoritativeSubscription(
  stripe: MinimalStripe,
  customerId: string | null | undefined,
  stored: StoredLinkage | string | null
): Promise<AuthoritativeSubscription> {
  if (typeof customerId !== "string" || customerId.length === 0) {
    return { ok: false, reason: "missing_customer", detail: "no customer id on the event" };
  }
  const storedId =
    typeof stored === "string" ? stored : stored && stored.subscriptionId ? stored.subscriptionId : null;

  // 1. stored linkage
  if (storedId) {
    try {
      const sub = await stripe.subscriptions.retrieve(storedId);
      const owner = customerIdOf(sub.customer);
      if (owner === null) {
        return {
          ok: false,
          reason: "ownership_unverifiable",
          detail: `stored subscription ${storedId} carries no readable customer`,
        };
      }
      if (owner !== String(customerId)) {
        return {
          ok: false,
          reason: "ownership_mismatch",
          detail: `stored subscription ${storedId} belongs to a different customer`,
        };
      }
      if (LIVE.has((sub.status ?? "").toLowerCase())) {
        return {
          ok: true,
          found: true,
          subscriptionId: sub.id,
          status: sub.status ?? null,
          selectedBy: "stored",
          candidates: [],
        };
      }
      // terminal stored subscription: fall through to look for a replacement
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | null)?.statusCode;
      if (statusCode !== 404) {
        return {
          ok: false,
          reason: "stripe_lookup_failed",
          detail: err instanceof Error ? err.message : String(err),
        };
      }
      // 404: gone; a replacement may exist
    }
  }

  // 2. enumerate non-terminal subscriptions
  const candidates: StripeSubscription[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let res: { data: StripeSubscription[]; has_more?: boolean };
    try {
      res = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: PAGE_LIMIT,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
    } catch (err) {
      return {
        ok: false,
        reason: "stripe_lookup_failed",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
    const rows = Array.isArray(res.data) ? res.data : [];
    for (const sub of rows) {
      // ownership must be verifiable on every row we might select
      const owner = customerIdOf(sub.customer);
      if (owner !== null && owner !== String(customerId)) continue;
      if (LIVE.has((sub.status ?? "").toLowerCase())) candidates.push(sub);
    }
    if (!res.has_more || rows.length === 0) break;
    startingAfter = rows[rows.length - 1]?.id;
    if (!startingAfter) break;
    if (page === MAX_PAGES - 1 && res.has_more) {
      return {
        ok: false,
        reason: "multiple_candidates",
        detail: `more than ${MAX_PAGES} pages of subscriptions; selection would be a guess`,
      };
    }
  }

  if (candidates.length === 0) {
    return { ok: true, found: false, subscriptionId: null, status: null, selectedBy: "none", candidates: [] };
  }
  if (candidates.length > 1) {
    return {
      ok: false,
      reason: "multiple_candidates",
      detail:
        `${candidates.length} live subscriptions for this customer; the policy does not choose one: ` +
        candidates.map((c) => c.id).join(", "),
    };
  }
  return {
    ok: true,
    found: true,
    subscriptionId: candidates[0].id,
    status: candidates[0].status ?? null,
    selectedBy: "unique_replacement",
    candidates: [],
  };
}

/** Is this event's subscription the one that governs entitlement? */
export function eventGovernsCurrentSubscription(
  authoritative: Extract<AuthoritativeSubscription, { ok: true }>,
  eventSubscriptionId: string
): boolean {
  if (authoritative.found && authoritative.subscriptionId) {
    return authoritative.subscriptionId === eventSubscriptionId;
  }
  return true;
}

/**
 * Derive the COMPLETE entitlement update from validated current state, so a
 * historical payload field can never leak into the update.
 */
export function entitlementFromAuthority(
  authoritative: Extract<AuthoritativeSubscription, { ok: true }>
): EntitlementState | null {
  if (!authoritative.found || !authoritative.subscriptionId) {
    return { plan: "guest", status: "canceled", basis: "absent" };
  }
  const status = (authoritative.status ?? "").toLowerCase();
  if (status === "active" || status === "trialing") {
    return { plan: "initiate", status, basis: "active" };
  }
  if (status === "past_due") {
    return { plan: "initiate", status: "past_due", basis: "past_due" };
  }
  if (REVOKING.has(status)) {
    return { plan: "guest", status: "canceled", basis: "revoked" };
  }
  if (!status) return null;
  return { plan: "guest", status, basis: "other" };
}
