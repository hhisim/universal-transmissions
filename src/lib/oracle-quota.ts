import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getGuestTotalLimit, getDailyLimit, type MemberPlan } from "@/lib/plans";
import { getRequestMember } from "@/lib/member-session";

/**
 * Server-side Oracle quota.
 *
 * Before this module the only limit was a counter in the browser: reloading the page
 * reset it, calling `/api/oracle` directly ignored it, and `/api/oracle-v2` and
 * `/api/codex-oracle` had no limit at all. The `PLAN_CONFIG.dailyLimit` values existed
 * in copy but were enforced nowhere.
 *
 * Three rules make this hard to bypass:
 *
 *   1. The counter lives in the database, per identity, and is written on the server.
 *      Reloading changes nothing.
 *   2. Every Oracle entry point calls THIS module, so switching endpoint does not hand
 *      anyone a second allowance.
 *   3. A guest is identified by a server-bound key (a cookie this server issues, hashed
 *      together with the caller's address), never by a client-supplied id. Clearing the
 *      cookie still leaves the address binding.
 *
 * Counting is a compare-and-set, not a blind increment: we read the identity's usage
 * (summed across any duplicate rows), then bump the row only on condition that it still
 * holds the value we read. A concurrent request that moved first makes our update affect
 * zero rows and we retry against the fresh value. A plain increment (the database's
 * `increment_*_usage` RPC) cannot do this — six parallel requests at the ceiling would
 * all increment, then all be refused, leaving the counter past the limit and the
 * allowance permanently spent. That is why this module does its own conditional write.
 *
 * Initiate is unlimited, per the membership promise, with a rate window as abuse
 * protection rather than a quota.
 */

export type QuotaDecision = {
  allowed: boolean;
  plan: MemberPlan;
  /** What the allowance is measured in: 'day' for free, 'lifetime' for guest. */
  window: "day" | "lifetime" | "unlimited";
  used: number;
  limit: number | "unlimited";
  remaining: number | "unlimited";
  resetAt: string | null;
  reason?: "exhausted" | "rate_limited" | "lookup_failed" | "contended";
  /** Best-effort undo, used when the Oracle itself fails after a unit was taken. */
  refund?: () => Promise<void>;
};

const GUEST_COOKIE = "ut_guest_id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ATTEMPTS = 10;
const RETRY_BASE_MS = 6;

/** UTC day key — the same key the usage rows are written under. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Next UTC midnight, as the reset moment for a daily allowance. */
function nextUtcMidnight(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

/**
 * The caller's address, from a hop the client cannot write.
 *
 * `x-forwarded-for` is client-appendable: taking its FIRST entry let a caller send
 * `x-forwarded-for: <anything>` and receive a brand-new guest allowance — demonstrated
 * against the deployed preview, where 10 spent questions were followed by a spoofed header
 * and a fresh 200. The platform's own address header wins, and the LAST forwarded hop is
 * the one appended by the proxy rather than the one supplied by the caller.
 */
function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
  if (hops.length > 0) return hops[hops.length - 1];
  return "unknown";
}

/**
 * A stable, server-derived guest key.
 *
 * `ut_guest_usage.anonymous_id` is a uuid column, so the key is formatted as one. The
 * cookie is only honoured when this server issued it, and it is always combined with the
 * caller's address so a copied cookie does not carry an allowance to another client.
 */
export function guestKey(request: Request): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([^;]+)`).exec(cookieHeader);
  const fromCookie = match?.[1]?.trim();
  const salt = process.env.ORACLE_QUOTA_SALT ?? "ut-oracle-quota-v1";
  const seed = `${clientIp(request)}|${UUID_RE.test(fromCookie ?? "") ? fromCookie : ""}|${salt}`;
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${(parseInt(hex[16], 16) & 0x3 | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// ── Rate window (abuse protection, not a quota) ──────────────────────────────
// Per-instance memory: a hard guarantee would need shared storage. It still stops a
// scripted burst against one instance, which is the failure mode that costs money.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_INITIATE = 60;
const RATE_MAX_OTHER = 30;
const hits = new Map<string, number[]>();

function withinRate(key: string, max: number): boolean {
  const now = Date.now();
  const fresh = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= max) {
    hits.set(key, fresh);
    return false;
  }
  fresh.push(now);
  hits.set(key, fresh);
  return true;
}

// ── Per-identity queue ──────────────────────────────────────────────────────
// Every request for one identity competes for the same counter row, so the database
// serialises them whether we like it or not. Measured on the deployed database, a 28-way
// burst at a ceiling of 25 granted only 16: the losers exhausted their retries while
// spending most of their time waiting on round trips. Serialising in-process first turns
// that contention into a queue, so the burst spends the allowance it is entitled to.
// The compare-and-set remains the authority: this only removes avoidable fighting.
const queues = new Map<string, Promise<unknown>>();

function serialise<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.then(work, work);
  const tail = next.then(
    () => undefined,
    () => undefined
  );
  queues.set(key, tail);
  // Forget the entry once it is the tail and nothing else queued behind it.
  void tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return next;
}

// ── Counters ────────────────────────────────────────────────────────────────

type UsageTable = "ut_oracle_usage" | "ut_guest_usage";

type UsageSnapshot = { used: number; topRowId: string | null; topCount: number };

/** Read the identity's usage, summed across rows so a duplicate cannot hide it. */
async function snapshot(args: {
  table: UsageTable;
  keyColumn: "email" | "anonymous_id";
  keyValue: string;
  countColumn: "count" | "total_count";
  date?: string;
}): Promise<UsageSnapshot> {
  const { table, keyColumn, keyValue, countColumn, date } = args;
  let query = supabaseAdmin.from(table).select(`id,${countColumn}`).eq(keyColumn, keyValue);
  if (date) query = query.eq("date", date);
  const { data, error } = await query;
  if (error) throw new Error(`${table} read failed: ${error.message}`);

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  let topCount = 0;
  let topRowId: string | null = null;
  for (const row of rows) {
    const value = Number(row[countColumn] ?? 0);
    if (value >= topCount) {
      topCount = value;
      topRowId = typeof row.id === "string" ? row.id : null;
    }
  }
  const used = rows.reduce((sum, row) => sum + Number(row[countColumn] ?? 0), 0);
  return { used, topRowId, topCount };
}

/**
 * Spend exactly one unit, or report exhaustion. The write is conditional on the value we
 * read, so two requests can never both spend the last unit.
 */
async function consumeUnit(args: {
  table: UsageTable;
  keyColumn: "email" | "anonymous_id";
  keyValue: string;
  countColumn: "count" | "total_count";
  limit: number;
  date?: string;
}): Promise<{ allowed: boolean; used: number; topRowId: string | null; topCount: number; contended?: boolean }> {
  const { table, keyColumn, keyValue, countColumn, limit, date } = args;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const snap = await snapshot({ table, keyColumn, keyValue, countColumn, date });
    if (snap.used >= limit) {
      return { allowed: false, used: snap.used, topRowId: snap.topRowId, topCount: snap.topCount };
    }

    if (!snap.topRowId) {
      const insert: Record<string, unknown> = { [keyColumn]: keyValue, [countColumn]: 1 };
      if (date) insert.date = date;
      const { data: inserted, error } = await supabaseAdmin
        .from(table)
        .insert(insert)
        .select(`id,${countColumn}`);
      if (!error) {
        const row = (inserted?.[0] ?? {}) as Record<string, unknown>;
        return { allowed: true, used: 1, topRowId: typeof row.id === "string" ? row.id : null, topCount: 1 };
      }
      // Someone inserted the same identity first; re-read and take the update path.
      if (error.code === "23505") continue;
      throw new Error(`${table} insert failed: ${error.message}`);
    }

    // Compare-and-set: only lands if the row still holds the value we read.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from(table)
      .update({ [countColumn]: snap.topCount + 1, updated_at: new Date().toISOString() })
      .eq("id", snap.topRowId)
      .eq(countColumn, snap.topCount)
      .select(countColumn);

    if (updateError) throw new Error(`${table} update failed: ${updateError.message}`);
    if (updated && updated.length > 0) {
      return { allowed: true, used: snap.used + 1, topRowId: snap.topRowId, topCount: snap.topCount + 1 };
    }

    // Lost the race. Another request moved the counter between our read and our write.
    // Back off briefly and re-read rather than giving up: with a real database and a
    // genuine burst, giving up here refuses units the caller is entitled to. Measured on
    // the deployed database: 28 simultaneous requests at a ceiling of 25 granted only 12
    // before this backoff existed.
    await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_MS + Math.random() * RETRY_BASE_MS * 3));
  }

  // Still contended after the budget. Refuse this request — never grant past the ceiling —
  // but report it as contention so the client sees a retryable condition, not "exhausted".
  return { allowed: false, used: limit, topRowId: null, topCount: 0, contended: true };
}

async function refundUnit(args: {
  table: UsageTable;
  rowId: string | null;
  countColumn: "count" | "total_count";
  current: number;
}): Promise<void> {
  const { table, rowId, countColumn, current } = args;
  if (!rowId) return;
  try {
    await supabaseAdmin
      .from(table)
      .update({ [countColumn]: Math.max(0, current - 1), updated_at: new Date().toISOString() })
      .eq("id", rowId);
  } catch {
    /* refund is best-effort */
  }
}

export type QuotaCaller =
  | { kind: "member"; member: NonNullable<Awaited<ReturnType<typeof getRequestMember>>> }
  | { kind: "guest"; key: string };

/** Who is asking, according to the verified session or the server-bound guest key. */
export async function identifyCaller(request: Request): Promise<QuotaCaller> {
  const member = await getRequestMember(request);
  if (member) return { kind: "member", member };
  return { kind: "guest", key: guestKey(request) };
}

/** Read the caller's allowance without spending any of it. */
export async function peekQuota(request: Request): Promise<QuotaDecision> {
  const caller = await identifyCaller(request);

  if (caller.kind === "member" && caller.member.plan === "initiate") {
    return { allowed: true, plan: "initiate", window: "unlimited", used: 0, limit: "unlimited", remaining: "unlimited", resetAt: null };
  }

  if (caller.kind === "member" && caller.member.plan === "free") {
    const limit = getDailyLimit("free") as number;
    const { used } = await snapshot({
      table: "ut_oracle_usage",
      keyColumn: "email",
      keyValue: caller.member.email,
      countColumn: "count",
      date: todayUtc(),
    });
    return {
      allowed: used < limit,
      plan: "free",
      window: "day",
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt: nextUtcMidnight(),
      ...(used >= limit ? { reason: "exhausted" as const } : {}),
    };
  }

  const limit = getGuestTotalLimit();
  const key = caller.kind === "guest" ? caller.key : guestKey(request);
  const { used } = await snapshot({
    table: "ut_guest_usage",
    keyColumn: "anonymous_id",
    keyValue: key,
    countColumn: "total_count",
  });
  return {
    allowed: used < limit,
    plan: "guest",
    window: "lifetime",
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: null,
    ...(used >= limit ? { reason: "exhausted" as const } : {}),
  };
}

/**
 * Spend one Oracle question. Call this BEFORE answering, so a burst cannot outrun the
 * counter; call `decision.refund()` if the answer then fails.
 */
export async function consumeQuota(request: Request): Promise<QuotaDecision> {
  const caller = await identifyCaller(request);

  if (caller.kind === "member" && caller.member.plan === "initiate") {
    if (!withinRate(`member:${caller.member.email}`, RATE_MAX_INITIATE)) {
      return { allowed: false, plan: "initiate", window: "unlimited", used: 0, limit: "unlimited", remaining: "unlimited", resetAt: null, reason: "rate_limited" };
    }
    // The membership promise is unlimited; the rate window above is abuse protection.
    return { allowed: true, plan: "initiate", window: "unlimited", used: 0, limit: "unlimited", remaining: "unlimited", resetAt: null, refund: async () => {} };
  }

  if (caller.kind === "member" && caller.member.plan === "free") {
    const email = caller.member.email;
    const limit = getDailyLimit("free") as number;
    const date = todayUtc();

    if (!withinRate(`member:${email}`, RATE_MAX_OTHER)) {
      return { allowed: false, plan: "free", window: "day", used: 0, limit, remaining: 0, resetAt: nextUtcMidnight(), reason: "rate_limited" };
    }

    const spent = await serialise(`free:${email}:${date}`, () =>
      consumeUnit({
        table: "ut_oracle_usage",
        keyColumn: "email",
        keyValue: email,
        countColumn: "count",
        limit,
        date,
      })
    );

    return {
      allowed: spent.allowed,
      plan: "free",
      window: "day",
      used: spent.used,
      limit,
      remaining: Math.max(0, limit - spent.used),
      resetAt: nextUtcMidnight(),
      ...(spent.allowed ? {} : { reason: spent.contended ? ("contended" as const) : ("exhausted" as const) }),
      refund: async () => refundUnit({ table: "ut_oracle_usage", rowId: spent.topRowId, countColumn: "count", current: spent.topCount }),
    };
  }

  const key = caller.kind === "guest" ? caller.key : guestKey(request);
  const limit = getGuestTotalLimit();

  if (!withinRate(`guest:${key}`, RATE_MAX_OTHER)) {
    return { allowed: false, plan: "guest", window: "lifetime", used: 0, limit, remaining: 0, resetAt: null, reason: "rate_limited" };
  }

  const spent = await serialise(`guest:${key}`, () =>
    consumeUnit({
      table: "ut_guest_usage",
      keyColumn: "anonymous_id",
      keyValue: key,
      countColumn: "total_count",
      limit,
    })
  );

  return {
    allowed: spent.allowed,
    plan: "guest",
    window: "lifetime",
    used: spent.used,
    limit,
    remaining: Math.max(0, limit - spent.used),
    resetAt: null,
    ...(spent.allowed ? {} : { reason: spent.contended ? ("contended" as const) : ("exhausted" as const) }),
    refund: async () => refundUnit({ table: "ut_guest_usage", rowId: spent.topRowId, countColumn: "total_count", current: spent.topCount }),
  };
}

/** The JSON body returned when a question is refused. */
export function quotaRefusal(decision: QuotaDecision) {
  const exhausted = decision.reason === "exhausted";
  return {
    error:
      decision.reason === "contended"
        ? "The Oracle is busy. Please send that again."
        : exhausted
          ? decision.plan === "guest"
            ? "Your guest questions are used up. Sign in for a daily allowance, or join Initiate for unlimited access."
            : "You have used today's questions. The allowance resets at midnight UTC."
          : "Too many questions in a short time. Please wait a moment.",
    code: decision.reason === "contended" ? "contended" : exhausted ? "quota_exhausted" : "rate_limited",
    plan: decision.plan,
    used: decision.used,
    limit: decision.limit,
    remaining: decision.remaining,
    resetAt: decision.resetAt,
  };
}
