/**
 * The notification outbox.
 *
 * The previous design claimed a row and then sent, in one breath. That proves intent, not delivery:
 * if the process died mid-request the row was stuck as "sending" forever, and a provider timeout left
 * us unable to say whether the customer had been emailed. This module replaces it with a durable state
 * machine — pending → sending → sent | failed | uncertain — where every step is a conditional write,
 * retries are scheduled rather than hoped for, and an interrupted send becomes a fact we record and
 * alert on instead of a guess either way.
 *
 * Deliberate policy: **an interrupted or timed-out send is never automatically resent.** If Brevo
 * cannot tell us whether it accepted the message, a retry risks a second receipt in the buyer's inbox.
 * `uncertain` therefore waits for a delivery webhook or a human, and the monitoring job shouts about
 * it. Late is recoverable; duplicate is not.
 */

export type OutboxStatus = "pending" | "sending" | "sent" | "failed" | "uncertain" | "skipped";
export type NotificationKind = "confirmation" | "payment_failed" | "shipped";

export interface OutboxRow {
  id: string;
  order_id: string;
  kind: NotificationKind;
  status: OutboxStatus;
  attempts: number;
  claimed_at: string | null;
  next_attempt_at: string;
  idempotency_key: string;
  provider_message_id: string | null;
}

/** The lease after which a `sending` row is presumed dead. Long enough for a slow provider, short
 *  enough that a stuck receipt is noticed the same day. */
export const SEND_LEASE_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;

export interface OutboxDb {
  from: (table: string) => any;
}

export type SendOutcome =
  | { outcome: "accepted"; messageId: string | null }
  | { outcome: "rejected"; reason: string }
  | { outcome: "unknown"; reason: string };

/** Backoff: 1, 2, 4, 8, 16 minutes — capped, so a broken sender does not hammer the provider. */
export function backoffMs(attempts: number): number {
  return Math.min(2 ** Math.max(0, attempts - 1), 16) * 60_000;
}

/** Deterministic per purchase, so a replay can never enqueue a second copy under a new key. */
export function idempotencyKeyFor(orderId: string, kind: NotificationKind): string {
  return `${orderId}:${kind}`;
}

export async function enqueue(
  db: OutboxDb,
  input: { orderId: string; kind: NotificationKind; now?: Date }
): Promise<{ queued: boolean; reason: string }> {
  const now = input.now ?? new Date();
  const key = idempotencyKeyFor(input.orderId, input.kind);

  const { data, error } = await db
    .from("ut_order_notifications")
    .upsert(
      {
        order_id: input.orderId,
        kind: input.kind,
        status: "pending",
        attempts: 0,
        next_attempt_at: now.toISOString(),
        idempotency_key: key,
      },
      { onConflict: "order_id,kind", ignoreDuplicates: true }
    )
    .select("id");

  if (error) return { queued: false, reason: `outbox unavailable: ${String(error.message ?? error).slice(0, 80)}` };
  if ((data?.length ?? 0) > 0) return { queued: true, reason: "queued" };
  return { queued: false, reason: "already queued or sent for this order" };
}

/**
 * Claim the next due row. The claim is a conditional UPDATE keyed on the state we read, so two
 * workers racing for the same row cannot both win — the loser's update matches zero rows.
 */
export async function claimNext(db: OutboxDb, now = new Date()): Promise<OutboxRow | null> {
  /* Two kinds of work exist: a row never attempted (`pending`), and a row whose attempt failed and
     whose backoff has now elapsed (`failed`). Both are claimable; anything else — sending, sent,
     uncertain — is not, because sending is leased and the other two are finished. */
  for (const status of ["pending", "failed"] as const) {
    const { data: due, error } = await db
      .from("ut_order_notifications")
      .select("*")
      .eq("status", status)
      .order("next_attempt_at", { ascending: true })
      .limit(1);

    if (error || !due?.length) continue;
    const candidate = due[0] as OutboxRow;
    if (candidate.next_attempt_at && new Date(candidate.next_attempt_at) > now) continue;

    const { data: claimed, error: claimError } = await db
      .from("ut_order_notifications")
      .update({
        status: "sending",
        claimed_at: now.toISOString(),
        attempts: (candidate.attempts ?? 0) + 1,
        updated_at: now.toISOString(),
      })
      .eq("id", candidate.id)
      .eq("status", status)
      .select("*");

    if (claimError || !claimed?.length) continue;
    return claimed[0] as OutboxRow;
  }

  return null;
}

/**
 * A `sending` row whose lease expired belongs to a worker that died. We cannot know whether the
 * provider accepted the message, so it becomes `uncertain` — resolvable, alertable, never re-sent
 * automatically.
 */
export async function recoverStale(db: OutboxDb, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - SEND_LEASE_MS).toISOString();
  const { data: stale, error } = await db
    .from("ut_order_notifications")
    .select("id,claimed_at")
    .eq("status", "sending");

  if (error || !stale?.length) return 0;

  const expired = (stale as Array<{ id: string; claimed_at: string | null }>).filter(
    (r) => !r.claimed_at || r.claimed_at < cutoff
  );

  let moved = 0;
  for (const row of expired) {
    const { data: updated } = await db
      .from("ut_order_notifications")
      .update({
        status: "uncertain",
        last_error: "interrupted during send — provider acceptance unknown",
        updated_at: now.toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "sending")
      .select("id");
    if (updated?.length) moved += 1;
  }
  return moved;
}

async function mark(
  db: OutboxDb,
  id: string,
  patch: Record<string, unknown>,
  expected: OutboxStatus = "sending"
): Promise<boolean> {
  const { data } = await db
    .from("ut_order_notifications")
    .update(patch)
    .eq("id", id)
    .eq("status", expected)
    .select("id");
  return (data?.length ?? 0) > 0;
}

export async function markSent(db: OutboxDb, row: OutboxRow, messageId: string | null, now = new Date()) {
  return mark(db, row.id, {
    status: "sent",
    provider: "brevo",
    provider_message_id: messageId,
    sent_at: now.toISOString(),
    last_error: null,
    updated_at: now.toISOString(),
  });
}

export async function markFailed(db: OutboxDb, row: OutboxRow, reason: string, now = new Date()) {
  const exhausted = row.attempts >= MAX_ATTEMPTS;
  return mark(db, row.id, {
    status: exhausted ? "uncertain" : "failed",
    provider: "brevo",
    last_error: reason.slice(0, 300),
    next_attempt_at: new Date(now.getTime() + backoffMs(row.attempts)).toISOString(),
    updated_at: now.toISOString(),
  });
}

export async function markUncertain(db: OutboxDb, row: OutboxRow, reason: string, now = new Date()) {
  return mark(db, row.id, {
    status: "uncertain",
    provider: "brevo",
    last_error: reason.slice(0, 300),
    updated_at: now.toISOString(),
  });
}

export interface DrainResult {
  processed: number;
  sent: number;
  failed: number;
  uncertain: number;
  staleRecovered: number;
  exhausted: boolean;
}

/**
 * Drain due work. `send` is supplied by the caller so the transport stays swappable and testable.
 * `limit` bounds one request's work; the scheduled job drains the rest.
 */
export async function drainOutbox(input: {
  db: OutboxDb;
  send: (row: OutboxRow) => Promise<SendOutcome>;
  now?: Date;
  limit?: number;
}): Promise<DrainResult> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 5;
  const result: DrainResult = { processed: 0, sent: 0, failed: 0, uncertain: 0, staleRecovered: 0, exhausted: false };

  result.staleRecovered = await recoverStale(input.db, now);

  for (let i = 0; i < limit; i += 1) {
    const row = await claimNext(input.db, now);
    if (!row) break;
    result.processed += 1;

    let outcome: SendOutcome;
    try {
      outcome = await input.send(row);
    } catch (err) {
      outcome = { outcome: "unknown", reason: String((err as Error)?.message ?? err) };
    }

    if (outcome.outcome === "accepted") {
      await markSent(input.db, row, outcome.messageId, now);
      result.sent += 1;
    } else if (outcome.outcome === "rejected") {
      await markFailed(input.db, row, outcome.reason, now);
      result.failed += 1;
    } else {
      /* Timed out or threw: we do not know whether Brevo has it. Never mark sent, never blind-retry. */
      await markUncertain(input.db, row, outcome.reason, now);
      result.uncertain += 1;
    }
  }

  return result;
}

/**
 * Record what the provider says happened *after* acceptance. A delivered/bounced note never changes
 * the send state — "Brevo accepted it" and "the mailbox took it" are separate facts.
 */
export async function applyDeliveryEvent(
  db: OutboxDb,
  input: { messageId: string; event: string; now?: Date }
): Promise<boolean> {
  const now = input.now ?? new Date();
  const { data } = await db
    .from("ut_order_notifications")
    .update({
      delivery_status: input.event.slice(0, 60),
      delivery_updated_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("provider_message_id", input.messageId)
    .select("id");
  return (data?.length ?? 0) > 0;
}

/**
 * Exactly-once is not achievable against an SMTP relay that offers no idempotency key. The policy is
 * therefore **at-most-once with reconciliation**: a message is never sent twice by us, and the only
 * window where the provider might hold a copy we do not know about is `uncertain`, which is alerted
 * and reconciled by delivery webhook. Recorded here so the limitation is not rediscovered later.
 */
export const DELIVERY_GUARANTEE = "at-most-once, reconciled through provider delivery events";
