/**
 * Expired Checkout Sessions.
 *
 * Checkout creates a `ut_orders` row at session creation (`status: "pending"`) so a paid webhook
 * can always find a row to update. The cost of that design is a tail of rows for carts that were
 * never paid: Stripe expires the session, and nothing ever closes the row.
 *
 * This module owns the one correct transition — pending → cancelled — and nothing else:
 *   · it only ever touches `pending` rows, so a paid, fulfilled or already-cancelled order can
 *     never be moved backwards by a duplicate delivery or a re-run of the reconciler;
 *   · it never writes an amount, an email, a payment intent or a shipping field;
 *   · it never calls fulfilment, notifications or any side-effecting code.
 */

export type ExpiredCheckoutSession = {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  mode?: string | null;
};

/**
 * A session is abandoned only when Stripe says it is expired AND the money never settled.
 * `unpaid` is the normal case; the payment_status guard is what stops a late asynchronous
 * settlement from being cancelled by a stale expiry event.
 */
export function isAbandonedCheckout(session: ExpiredCheckoutSession): boolean {
  if (!session || !session.id) return false;
  if (session.status !== "expired") return false;
  if (session.mode === "subscription") return false;
  return session.payment_status !== "paid" && session.payment_status !== "no_payment_required";
}

export type CancelResult = { cancelled: number; ids: string[] };

type AdminLike = {
  from: (table: string) => any;
};

/**
 * Idempotent: the update is filtered on `status = pending`, so a second call matches nothing.
 * Returns how many rows were actually moved, which is what makes the claim provable.
 */
export async function cancelPendingOrderForExpiredSession(
  admin: AdminLike,
  sessionId: string
): Promise<CancelResult> {
  if (!sessionId) return { cancelled: 0, ids: [] };

  const { data, error } = await admin
    .from("ut_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("stripe_session_id", sessionId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    throw new Error(`ut_orders expiry update failed: ${error.message ?? String(error)}`);
  }

  const ids = (data ?? []).map((row: { id: string }) => row.id);
  return { cancelled: ids.length, ids };
}
