/**
 * Membership write helpers — the single write path for public.profiles and
 * public.ut_members.
 *
 * Why this module exists
 * ----------------------
 * Every membership writer used PostgREST upserts of the form
 * `upsert({...}, { onConflict: "email" })`, which compiles to
 * `ON CONFLICT (email) DO UPDATE`. That requires a UNIQUE index on `email`.
 * Neither deployed table has one, so every one of those writes was rejected
 * with `42P10` ("there is no unique or exclusion constraint matching the
 * ON CONFLICT specification") — and **not one caller inspected the result**, so
 * `activate-free` answered `{ success: true, plan: "free" }` after a write that
 * never happened.
 *
 * Adding `UNIQUE(email)` is necessary but not sufficient, and it is not what
 * this module depends on:
 *
 *   - `public.profiles` has `user_id uuid NOT NULL` as its PRIMARY KEY with no
 *     default, so a payload of `{ email, plan }` can never insert a row — the
 *     INSERT half of an upsert fails on a NOT NULL violation regardless of any
 *     unique index. Its schema-backed identity is `user_id`, not `email`.
 *   - `public.ut_members` has `id uuid DEFAULT gen_random_uuid()`, so its row is
 *     insert-complete. Its identity in every caller is the address.
 *
 * So this module does an explicit, error-checked read-then-write instead of an
 * upsert. That is correct with or without a unique index, and it lets us
 * distinguish "no row" from "lookup failed" — which `.maybeSingle()` conflates
 * with `data: null`.
 *
 * Rules enforced here:
 *   - A lookup failure is never treated as "no row"; the write fails closed.
 *   - A duplicate match is never silently merged; it fails closed.
 *   - A paid plan is never downgraded to a free plan by an activation path.
 *   - Every write result is inspected; nothing reports success after a failure.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { planRank } from "@/lib/membership-plan";

// The plan vocabulary is deliberately NOT redefined here. Entitlement is
// compared with the application's own `normalizeMemberPlan` ranking (see
// src/lib/membership-plan.ts) so this module cannot disagree with the readers
// about what a stored plan is worth — and cannot "repair" the plan mapping as a
// side effect of write protection.

/** Plans that a free activation may legitimately set or replace. */
export const FREE_PLANS = new Set(["guest", "free"]);

export type MembershipTable = "profiles" | "ut_members";

export type WriteOutcome<T = Record<string, unknown>> =
  | { ok: true; row: T; action: "inserted" | "updated" | "unchanged" }
  | { ok: false; reason: WriteFailure; detail: string; code?: string };

export type WriteFailure =
  | "lookup_failed"
  | "duplicate_rows"
  | "insert_failed"
  | "update_failed"
  | "missing_identity"
  | "downgrade_refused"
  | "identity_mismatch";

/**
 * Canonical address form. `resolveVerifiedIdentity()` already normalises
 * credential-derived addresses, but writers must not assume that: a webhook
 * takes its address from Stripe, and a raw Supabase session email is not
 * guaranteed lower-case. Normalising at the write boundary is what makes a
 * plain `UNIQUE(email)` behave case-insensitively for application-written rows.
 */
export function normaliseMemberEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Find the single row for an address.
 *
 * Deliberately fetches up to two rows so duplicates are detectable, and returns
 * a discriminated result so the caller can never confuse a failed lookup with
 * an absent row.
 */
export async function findRowByEmail(
  client: SupabaseClient,
  table: MembershipTable,
  email: string,
  columns = "*"
): Promise<
  | { ok: true; row: Record<string, unknown> | null }
  | { ok: false; reason: WriteFailure; detail: string; code?: string }
> {
  const { data, error } = await client
    .from(table)
    .select(columns)
    .eq("email", email)
    .limit(2);

  if (error) {
    return { ok: false, reason: "lookup_failed", detail: error.message, code: error.code };
  }
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length > 1) {
    return {
      ok: false,
      reason: "duplicate_rows",
      detail: `multiple ${table} rows match the address`,
      code: "DUPLICATE",
    };
  }
  return { ok: true, row: rows[0] ?? null };
}

export interface WriteOptions {
  /**
   * Required for `profiles`: its PRIMARY KEY is `user_id`, which is NOT NULL
   * with no default, so an INSERT without it is rejected by the database. The
   * value must come from a verified identity (a Supabase auth user id), never
   * from a request body or query string.
   */
  userId?: string;
  /**
   * Free-activation paths pass true so a paid plan is never replaced by a free
   * one. The administrative webhook path passes false because a Stripe event is
   * the authority on subscription state.
   */
  protectPaidPlan?: boolean;
}

/**
 * Create or update one membership row keyed by address.
 *
 * Not an upsert: the row is read first, then inserted or updated explicitly, so
 * the outcome is known and every error is surfaced.
 */
export async function writeMembershipRow(
  client: SupabaseClient,
  table: MembershipTable,
  emailInput: string,
  fields: Record<string, unknown>,
  options: WriteOptions = {}
): Promise<WriteOutcome> {
  const email = normaliseMemberEmail(emailInput);
  if (!email) {
    return { ok: false, reason: "missing_identity", detail: "no usable address" };
  }

  // `email` is part of the row identity for both tables and must not be
  // overridden by the caller's field map.
  const payload: Record<string, unknown> = { ...fields, email };

  const found = await findRowByEmail(client, table, email, "*");
  if (!found.ok) return found;

  if (found.row) {
    const currentPlan = found.row.plan;
    const nextPlan = payload.plan;

    // Refuse only a genuine downgrade in the application's own ranking.
    // A change that RAISES the effective plan is allowed: a stored value the
    // application does not recognise (e.g. "master") normalises to "guest", so
    // replacing it with "free" is an upgrade, not a downgrade. Refusing that
    // would block a legitimate transition rather than protect anyone.
    if (
      options.protectPaidPlan &&
      planRank(currentPlan as string | null) > planRank(nextPlan as string | null)
    ) {
      return {
        ok: false,
        reason: "downgrade_refused",
        detail: `existing plan "${String(currentPlan)}" ranks above "${String(nextPlan)}"`,
        code: "DOWNGRADE_REFUSED",
      };
    }

    // `profiles` is keyed by user_id, not by an `id` column, so the previous
    // `.eq("id", row.id)` matched nothing on that table. It is also not enough
    // for an address lookup to authorise a write: a verified caller must own
    // the row the address resolved to. Both are checked here.
    let pkColumn: string;
    if (table === "profiles") {
      const existingUserId = (found.row.user_id as string | undefined) ?? null;
      const claimedUserId = options.userId?.trim() || null;

      if (!claimedUserId) {
        return {
          ok: false,
          reason: "missing_identity",
          detail:
            "updating profiles requires the verified auth user id; an address match alone does not identify a row",
          code: "NO_USER_ID",
        };
      }
      if (existingUserId !== claimedUserId) {
        // The address resolves to a DIFFERENT identity. Refuse rather than
        // overwrite another account's row.
        return {
          ok: false,
          reason: "identity_mismatch",
          detail:
            "the address resolves to a row owned by a different user_id; refusing to overwrite another identity",
          code: "IDENTITY_MISMATCH",
        };
      }
      pkColumn = "user_id";
    } else {
      pkColumn = "id";
    }

    if (isNoOp(found.row, payload)) {
      return { ok: true, row: found.row, action: "unchanged" };
    }

    const { data, error } = await client
      .from(table)
      .update(payload)
      .eq(pkColumn, found.row[pkColumn] as string)
      .select()
      .single();

    if (error) {
      return { ok: false, reason: "update_failed", detail: error.message, code: error.code };
    }
    return { ok: true, row: data as Record<string, unknown>, action: "updated" };
  }

  // No existing row: insert. `profiles` cannot be inserted without its key.
  if (table === "profiles") {
    const userId = options.userId?.trim();
    if (!userId) {
      return {
        ok: false,
        reason: "missing_identity",
        detail:
          "profiles.user_id is NOT NULL with no default; an INSERT needs the verified auth user id",
        code: "NO_USER_ID",
      };
    }
    payload.user_id = userId;
  }

  const { data, error } = await client.from(table).insert(payload).select().single();
  if (error) {
    // 23505 = unique_violation: a concurrent insert won the race. Surfaced
    // rather than swallowed; the caller may retry the read-then-write path.
    return { ok: false, reason: "insert_failed", detail: error.message, code: error.code };
  }
  return { ok: true, row: data as Record<string, unknown>, action: "inserted" };
}

/** True when every field the caller wants to set already holds that value. */
function isNoOp(row: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  return Object.entries(payload).every(([key, value]) => row[key] === value);
}
