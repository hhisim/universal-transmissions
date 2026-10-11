/**
 * Lifecycle writes for EXISTING membership rows.
 *
 * Why this module exists
 * ---------------------
 * The Stripe lifecycle handlers wrote with set-based filters and never looked at
 * how many rows the statement touched:
 *
 *   ut_members  `.update({...}).eq("stripe_customer_id", customerId)`
 *   profiles    `.update({...}).eq("email", email)`   <- skipped entirely when
 *                                                       the event carried no
 *                                                       `metadata.email`
 *
 * A profiles-only member (legal under option 3) therefore had the `ut_members`
 * statement match ZERO rows, the `profiles` statement never run at all, and the
 * delivery was acknowledged `200`. A cancellation left the member PAID and a
 * reactivation left them unentitled, with no error anywhere.
 *
 * This module is the explicit update path for rows that ALREADY EXIST. It is
 * deliberately separate from `writeMembershipRow`:
 *
 *   - `writeMembershipRow` is the AUTHENTICATED writer. Its `profiles` branch
 *     refuses to touch a row unless the caller supplies an auth user id that
 *     matches the stored one, because an address match alone does not authorise
 *     a write. Nothing here weakens that check, and this module never calls it.
 *   - A Stripe lifecycle event carries no auth user id (and one must never be
 *     fabricated). Its authority is a DIFFERENT one: the Stripe customer and
 *     subscription relationship the caller has ALREADY verified against
 *     Stripe's own current state.
 *
 * So the authorisation here is: the row must itself carry the VERIFIED Stripe
 * linkage. A row is addressable only when its stored `stripe_customer_id` (or a
 * stored `stripe_subscription_id` this event legitimately owns) equals a value
 * the caller verified. An address from the event payload is NOT an authority
 * and is never used to select a row. In particular `profiles.user_id` is read
 * off the row the verified linkage resolved, and is used only as that row's
 * primary key — it is never presented as, or substituted for, an authenticated
 * identity.
 *
 * What this module guarantees
 * ---------------------------
 *   - A lookup failure is never absence. An unusable response is a failure.
 *   - More than one row for one verified relationship fails closed.
 *   - Every resolved row is updated by its ACTUAL primary key
 *     (`ut_members.id`, `profiles.user_id`), never by an address filter.
 *   - The number of rows the database reports as updated is CHECKED. A resolved
 *     row that fails to update is a failure, so the delivery is refused and
 *     Stripe retries — zero matches never count as completion.
 *   - Rows are never INSERTED. Creating a row to make an update succeed would
 *     invent a membership, so there is no insert branch at all.
 *   - A table in which no row carries the verified linkage has nothing to
 *     update; that is reported as `linked: false` and `updated: 0` rather than
 *     disguised as an affected-row success.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type LifecycleTable = "profiles" | "ut_members";

/** The column that actually identifies a row in each table. */
export const LIFECYCLE_PK: Record<LifecycleTable, "id" | "user_id"> = {
  ut_members: "id",
  profiles: "user_id",
};

/**
 * The verified Stripe relationship a lifecycle write is authorised by.
 *
 * `customerId` and `subscriptionIds` must already have been checked against
 * Stripe's current state by the caller; this module does not re-query Stripe.
 */
export interface LifecycleAuthority {
  customerId?: string | null;
  subscriptionIds?: Array<string | null | undefined>;
}

export interface LifecycleRow {
  table: LifecycleTable;
  pkColumn: "id" | "user_id";
  pkValue: string;
  row: Record<string, unknown>;
}

export type LifecycleFailure =
  | "lifecycle_no_authority"
  | "lifecycle_lookup_failed"
  | "lifecycle_duplicate_rows"
  | "lifecycle_unidentified_row"
  | "lifecycle_update_failed"
  | "lifecycle_row_not_updated";

export type LifecycleResolve =
  | {
      ok: true;
      /** Rows the write is willing to change, after the eligibility filter. */
      rows: LifecycleRow[];
      /** Rows carrying the verified linkage, BEFORE the eligibility filter. */
      matched: number;
      /** How many bounded reads were performed. */
      lookedUp: number;
    }
  | { ok: false; reason: LifecycleFailure; detail: string; code?: string };

export type LifecycleWrite =
  | {
      ok: true;
      table: LifecycleTable;
      /** Rows carrying the verified linkage, before the eligibility filter. */
      resolved: number;
      /** Resolved rows this write was willing to change. */
      eligible: number;
      /** Rows the database reported as updated. */
      updated: number;
      /** False when no row in this table carries the verified linkage. */
      linked: boolean;
    }
  | { ok: false; reason: LifecycleFailure; detail: string; code?: string };

/** Bounded work: the recorded id set is small, and this is a webhook. */
const MAX_LINKAGE_IDS = 4;
const LOOKUP_LIMIT = 2;

function key(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

type RawSelect =
  | { ok: true; rows: Record<string, unknown>[] }
  | { ok: false; reason: LifecycleFailure; detail: string; code?: string };

/**
 * One bounded read of at most two rows.
 *
 * `data: null` without an error is NOT "no rows": PostgREST answers an empty
 * result with `[]`, so a null payload means the response was unusable and must
 * not be read as absence.
 */
async function selectLinked(
  client: SupabaseClient,
  table: LifecycleTable,
  column: string,
  value: string
): Promise<RawSelect> {
  let res: { data?: unknown; error?: { message?: string; code?: string } | null };
  try {
    res = await client.from(table).select("*").eq(column, value).limit(LOOKUP_LIMIT);
  } catch (err) {
    return {
      ok: false,
      reason: "lifecycle_lookup_failed",
      detail: `${table}.${column}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (res && res.error) {
    return {
      ok: false,
      reason: "lifecycle_lookup_failed",
      detail: `${table}.${column}: ${res.error.message ?? "query failed"}`,
      code: res.error.code,
    };
  }
  const data = res?.data;
  if (!Array.isArray(data)) {
    return {
      ok: false,
      reason: "lifecycle_lookup_failed",
      detail: `${table}.${column}: the lookup returned no usable row array`,
    };
  }
  return { ok: true, rows: data as unknown as Record<string, unknown>[] };
}

/**
 * Resolve the EXISTING rows a lifecycle event is allowed to write.
 *
 * Both families of verified linkage are consulted, because a row may carry only
 * one of them: the Stripe customer, and each subscription id the event
 * legitimately owns (the governing one plus the ids the trusted tables already
 * recorded). Results are deduplicated by primary key; two DISTINCT rows in one
 * table that both match the same verified relationship is a data conflict and
 * fails closed rather than being resolved by picking one.
 */
export async function resolveLifecycleRows(
  client: SupabaseClient,
  table: LifecycleTable,
  authority: LifecycleAuthority,
  isEligible?: (row: Record<string, unknown>) => boolean
): Promise<LifecycleResolve> {
  const customerId = key(authority.customerId);
  const subscriptionIds = Array.from(
    new Set((authority.subscriptionIds ?? []).map(key).filter((id): id is string => id !== null))
  ).slice(0, MAX_LINKAGE_IDS);

  if (!customerId && subscriptionIds.length === 0) {
    return {
      ok: false,
      reason: "lifecycle_no_authority",
      detail: "neither a verified customer nor a verified subscription was supplied",
    };
  }

  const byPk = new Map<string, Record<string, unknown>>();
  const pkColumn = LIFECYCLE_PK[table];
  let lookedUp = 0;

  const queries: Array<{ column: string; value: string }> = [];
  if (customerId) queries.push({ column: "stripe_customer_id", value: customerId });
  for (const id of subscriptionIds) queries.push({ column: "stripe_subscription_id", value: id });

  for (const query of queries) {
    lookedUp += 1;
    const res = await selectLinked(client, table, query.column, query.value);
    if (!res.ok) return res;
    if (res.rows.length > 1) {
      return {
        ok: false,
        reason: "lifecycle_duplicate_rows",
        detail: `${table}: ${res.rows.length} rows carry the same verified ${query.column}`,
      };
    }
    for (const row of res.rows) {
      const pk = key(row[pkColumn]);
      if (!pk) {
        // Reachable only through the verified linkage, but with no primary key
        // it cannot be updated by identity. Refuse rather than widen the filter
        // to the address.
        return {
          ok: false,
          reason: "lifecycle_unidentified_row",
          detail: `${table}: a row matched the verified ${query.column} but carries no ${pkColumn}`,
        };
      }
      byPk.set(pk, row);
    }
    if (byPk.size > 1) {
      return {
        ok: false,
        reason: "lifecycle_duplicate_rows",
        detail: `${table}: ${byPk.size} distinct rows match one verified Stripe relationship`,
      };
    }
  }

  const all: LifecycleRow[] = Array.from(byPk.entries()).map(([pkValue, row]) => ({
    table,
    pkColumn,
    pkValue,
    row,
  }));
  const rows = isEligible ? all.filter((entry) => isEligible(entry.row)) : all;
  return { ok: true, rows, matched: all.length, lookedUp };
}

/**
 * Apply one lifecycle update to the rows a verified Stripe relationship owns.
 *
 * Update-only by construction: there is no insert branch. Each resolved row is
 * written by its own primary key so the database can report exactly how many
 * rows it changed, and that count is checked.
 */
export async function applyLifecycleUpdate(
  client: SupabaseClient,
  table: LifecycleTable,
  authority: LifecycleAuthority,
  fields: Record<string, unknown>,
  options: { isEligible?: (row: Record<string, unknown>) => boolean } = {}
): Promise<LifecycleWrite> {
  const resolved = await resolveLifecycleRows(client, table, authority, options.isEligible);
  if (!resolved.ok) return resolved;

  let updated = 0;
  for (const target of resolved.rows) {
    let res: { data?: unknown; error?: { message?: string; code?: string } | null };
    try {
      res = await client
        .from(table)
        .update(fields)
        .eq(target.pkColumn, target.pkValue)
        .select();
    } catch (err) {
      return {
        ok: false,
        reason: "lifecycle_update_failed",
        detail: `${table}.${target.pkColumn}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (res && res.error) {
      return {
        ok: false,
        reason: "lifecycle_update_failed",
        detail: `${table}.${target.pkColumn}: ${res.error.message ?? "update failed"}`,
        code: res.error.code,
      };
    }
    const data = res?.data;
    if (!Array.isArray(data)) {
      return {
        ok: false,
        reason: "lifecycle_row_not_updated",
        detail: `${table}.${target.pkColumn}: the update reported no usable affected-row data`,
        code: "NO_AFFECTED_ROWS",
      };
    }
    if (data.length !== 1) {
      // The row was resolved from verified linkage and then not written. That is
      // a failure, not an empty success: the caller must refuse the delivery so
      // Stripe retries. Zero matches never count as completion.
      return {
        ok: false,
        reason: "lifecycle_row_not_updated",
        detail: `${table}.${target.pkColumn}: ${data.length} row(s) affected, expected exactly 1`,
        code: "NO_AFFECTED_ROWS",
      };
    }
    updated += 1;
  }

  return {
    ok: true,
    table,
    resolved: resolved.matched,
    eligible: resolved.rows.length,
    updated,
    linked: resolved.matched > 0,
  };
}
