/**
 * Bounded current-subscription reconciliation.
 *
 * The webhook used to treat the EVENT PAYLOAD as authoritative. A payload is a
 * snapshot taken when Stripe created the event, so a delayed delivery carries
 * stale state and can:
 *   - overwrite the stored subscription linkage with an older subscription,
 *   - clear a recorded revocation by rewriting the status,
 *   - resurrect a cancelled subscription from an old `active` snapshot.
 *
 * Recency is therefore NOT inferred from delivery order or `event.created`.
 * Before any entitlement change we ask Stripe, read-only, what the customer's
 * CURRENT subscription is, and use that as the authority.
 *
 * This module performs no writes and no Stripe mutations.
 */

export type EntitlementState = {
  /** The plan the reader will rank. */
  plan: "guest" | "free" | "initiate";
  /** The status to persist. `canceled` is the canonical revocation. */
  status: string;
  /** Why this state was chosen — for logs and tests. */
  basis: "active" | "past_due" | "revoked" | "absent" | "other";
};

/**
 * Derive the COMPLETE entitlement update from validated current state.
 *
 * A lifecycle payload is historical; mixing its fields with the authoritative
 * status produced a wrong plan (reproduced: authority `active` + delayed payload
 * `unpaid` yielded status `active` but plan `free`). Every field is therefore
 * taken from one source of truth.
 *
 * Absence is distinguished from failure: `found: false` means Stripe reports no
 * current subscription, which is authoritative — it grants nothing. Only a
 * genuine lookup failure yields null, and the caller must then refuse to
 * acknowledge the delivery.
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
  if (!status) return null;               // ambiguous: no status to act on
  return { plan: "guest", status, basis: "other" };
}

export type AuthoritativeSubscription =
  | { ok: true; found: boolean; subscriptionId: string | null; status: string | null }
  | { ok: false; reason: "stripe_lookup_failed"; detail: string };

type MinimalStripe = {
  subscriptions: {
    retrieve: (id: string) => Promise<{ id: string; status: string; customer?: unknown }>;
    list: (args: Record<string, unknown>) => Promise<{ data: Array<{ id: string; status: string }> }>;
  };
};

const REVOKING = new Set(["canceled", "incomplete_expired", "unpaid"]);

export function isRevokingStatusValue(status: string | null | undefined): boolean {
  return typeof status === "string" && REVOKING.has(status.toLowerCase());
}

/**
 * Resolve the customer's current subscription from Stripe (read-only).
 *
 * Lookup order, using checked stored/customer linkage:
 *   1. the STORED subscription id, only if Stripe still knows it and it belongs
 *      to this customer;
 *   2. otherwise the customer's most recent subscription.
 *
 * A 404 on the stored id is NOT a lookup failure — it means that subscription is
 * gone, which is itself authoritative state. Any other error is reported as a
 * failure so the caller can decline to acknowledge a required membership update.
 */
export async function resolveAuthoritativeSubscription(
  stripe: MinimalStripe,
  customerId: string,
  storedSubscriptionId: string | null
): Promise<AuthoritativeSubscription> {
  if (storedSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(storedSubscriptionId);
      const belongsToCustomer =
        sub.customer === undefined || String(sub.customer) === String(customerId);
      if (belongsToCustomer) {
        return { ok: true, found: true, subscriptionId: sub.id, status: sub.status ?? null };
      }
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | null)?.statusCode;
      if (statusCode !== 404) {
        return {
          ok: false,
          reason: "stripe_lookup_failed",
          detail: err instanceof Error ? err.message : String(err),
        };
      }
      // 404: the stored subscription no longer exists. Fall through — the
      // customer may hold a newer one.
    }
  }

  try {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });
    const current = list.data?.[0];
    if (!current) return { ok: true, found: false, subscriptionId: null, status: null };
    return { ok: true, found: true, subscriptionId: current.id, status: current.status ?? null };
  } catch (err) {
    return {
      ok: false,
      reason: "stripe_lookup_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * May this event's subscription change entitlement?
 *
 * Only if it IS the customer's current subscription, or if Stripe reports no
 * current subscription and this event is the one retiring the stored one.
 */
export function eventGovernsCurrentSubscription(
  authoritative: Extract<AuthoritativeSubscription, { ok: true }>,
  eventSubscriptionId: string
): boolean {
  if (authoritative.found && authoritative.subscriptionId) {
    return authoritative.subscriptionId === eventSubscriptionId;
  }
  return true;
}
