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
  /**
   * Further subscription ids recorded for the same identity, when the two
   * tables disagree. They are CANDIDATES, not a conflict: Stripe decides which
   * one actually governs.
   */
  alternates?: string[];
  /** Which table the linkage came from; null when neither carries one. */
  source: "ut_members" | "profiles" | null;
  plan: string | null;
  status: string | null;
};

export type LinkageReason =
  | "linkage_lookup_failed"
  | "duplicate_rows"
  | "conflicting_linkage"
  | "no_lookup_key";

export type LinkageResult =
  | { ok: true; linkage: StoredLinkage }
  | { ok: false; reason: LinkageReason; detail: string };

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

/**
 * Read the stored linkage from BOTH tables BEFORE asking Stripe anything.
 *
 * Failure, absence and ambiguity are three different outcomes:
 *   - a returned error or a thrown exception is a FAILURE (never absence);
 *   - more than one row for one address is a duplicate and is rejected;
 *   - two tables naming different subscriptions is a conflict and is rejected.
 *
 * A row that exists but carries no id does NOT hide the other table's linkage;
 * both tables are always consulted before a decision is made.
 */
export async function readStoredLinkage(
  // Loosely typed on purpose: supabase-js query builders are deeply generic and
  // a narrow structural type is not assignable from SupabaseClient.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { from: (table: string) => any },
  key: { email?: string | null; customerId?: string | null }
): Promise<LinkageResult> {
  // Resolve by address when the event carries one; otherwise fall back to the
  // TRUSTED stored customer linkage. Querying email='' silently matched nothing
  // and turned "we have no key" into apparent membership absence.
  const email = typeof key.email === "string" && key.email.length > 0 ? key.email : null;
  const customerId =
    typeof key.customerId === "string" && key.customerId.length > 0 ? key.customerId : null;
  if (!email && !customerId) {
    return {
      ok: false,
      reason: "no_lookup_key",
      detail: "event carries neither an address nor a customer id",
    };
  }
  const column = email ? "email" : "stripe_customer_id";
  const value = email ?? (customerId as string);
  const seen: Array<{ table: "ut_members" | "profiles"; id: string | null; plan: string | null; status: string | null }> = [];

  for (const table of ["ut_members", "profiles"] as const) {
    let res: { data?: unknown; error?: { message?: string } | null };
    try {
      res = await client
        .from(table)
        .select("stripe_subscription_id,plan,subscription_status")
        .eq(column, value)
        .limit(2);
    } catch (err) {
      return {
        ok: false,
        reason: "linkage_lookup_failed",
        detail: `${table}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (res && res.error) {
      return {
        ok: false,
        reason: "linkage_lookup_failed",
        detail: `${table}: ${res.error.message ?? "query failed"}`,
      };
    }
    const rows = (res?.data ?? []) as unknown as Array<Record<string, unknown>>;
    if (rows.length > 1) {
      return {
        ok: false,
        reason: "duplicate_rows",
        detail: `${table}: ${rows.length} rows for one address`,
      };
    }
    if (rows.length === 1) {
      const id = rows[0].stripe_subscription_id;
      seen.push({
        table,
        id: typeof id === "string" && id.length > 0 ? id : null,
        plan: (rows[0].plan as string | null) ?? null,
        status: (rows[0].subscription_status as string | null) ?? null,
      });
    }
  }

  const withId = seen.filter((s) => s.id !== null);
  const distinct = Array.from(new Set(withId.map((s) => s.id as string)));
  // A DISAGREEMENT IS NOT A FAILURE. The tables legitimately diverge after a
  // cancellation and a reactivation, and treating that as conflicting_linkage
  // blocked every subsequent delivery. The recorded ids become candidates and
  // reconciliation decides; genuine ambiguity is caught later, when more than
  // one candidate turns out to be live.
  const ordered = withId.map((s) => s.id as string);
  const primary = ordered[0] ?? null;
  const basis = withId[0] ?? seen[0] ?? null;
  return {
    ok: true,
    linkage: {
      subscriptionId: primary,
      alternates: ordered.filter((id) => id !== primary),
      source: basis?.table ?? null,
      plan: basis?.plan ?? null,
      status: basis?.status ?? null,
    },
  };
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

  // 1. recorded linkage — try every id the tables recorded for this identity.
  // A disagreement between tables simply means more than one candidate; Stripe's
  // state picks the live one. Only a genuine tie (more than one live) is
  // ambiguous, and that is rejected in the enumeration step below.
  const recordedIds = storedId
    ? [storedId, ...((typeof stored === "object" && stored?.alternates) || []).filter((a) => a !== storedId)]
    : [];
  // Collect EVERY live recorded candidate before choosing. Returning on the first
  // one skipped validation of the rest, so a genuine tie could not be detected.
  const liveRecorded: Array<{ id: string; status: string | null }> = [];
  for (const recordedId of recordedIds) {
    try {
      const sub = await stripe.subscriptions.retrieve(recordedId);
      const owner = customerIdOf(sub.customer);
      if (owner === null) {
        return {
          ok: false,
          reason: "ownership_unverifiable",
          detail: `recorded subscription ${recordedId} carries no readable customer`,
        };
      }
      if (owner !== String(customerId)) {
        return {
          ok: false,
          reason: "ownership_mismatch",
          detail: `recorded subscription ${recordedId} belongs to a different customer`,
        };
      }
      if (LIVE.has((sub.status ?? "").toLowerCase())) {
        liveRecorded.push({ id: sub.id, status: sub.status ?? null });
      }
      // a terminal recorded subscription falls through to replacement enumeration
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

  // Decide from the FULL recorded set before considering any replacement.
  if (liveRecorded.length > 1) {
    // Two recorded subscriptions that are both live and both ownership-verified:
    // the policy cannot choose one, so fail closed rather than pick a winner.
    return {
      ok: false,
      reason: "multiple_candidates",
      detail:
        `${liveRecorded.length} recorded subscriptions are live for this customer; ` +
        `the policy does not choose one: ${liveRecorded.map((c) => c.id).join(", ")}`,
    };
  }
  if (liveRecorded.length === 1) {
    return {
      ok: true,
      found: true,
      subscriptionId: liveRecorded[0].id,
      status: liveRecorded[0].status,
      selectedBy: "stored",
      candidates: [],
    };
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
    // An incomplete or unusable enumeration must NEVER become authoritative
    // absence: data:null, an empty page claiming more results, or a missing
    // cursor all mean we could not enumerate, which is a failure.
    if (!Array.isArray(res.data)) {
      return {
        ok: false,
        reason: "stripe_lookup_failed",
        detail: "subscription list returned no usable data array",
      };
    }
    const rows = res.data;
    if (rows.length === 0 && res.has_more) {
      return {
        ok: false,
        reason: "stripe_lookup_failed",
        detail: "list returned an empty page while claiming more results",
      };
    }
    if (res.has_more && (!rows[rows.length - 1] || !rows[rows.length - 1].id)) {
      return {
        ok: false,
        reason: "stripe_lookup_failed",
        detail: "list claimed more results but supplied no usable cursor",
      };
    }
    for (const sub of rows) {
      // Verified ownership is REQUIRED for every enumerated candidate too, not
      // just for the stored one. A row whose customer cannot be read is not
      // evidence of absence — it is unverifiable, so we fail closed rather than
      // selecting it or silently dropping it.
      const owner = customerIdOf(sub.customer);
      if (owner === null) {
        return {
          ok: false,
          reason: "ownership_unverifiable",
          detail: `listed subscription ${sub.id} carries no readable customer`,
        };
      }
      if (owner !== String(customerId)) continue;
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
