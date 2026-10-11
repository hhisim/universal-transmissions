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
 * reactivation left them unentitled, with no error anywhere. Batch 14q closed
 * that; this revision closes the two holes that remained.
 *
 * Three-phase shape
 * -----------------
 *   1. `snapshotLifecycleRows` — THE AUTHORIZATION SNAPSHOT. Read the rows a
 *      verified relationship owns and capture their primary keys plus the
 *      original plan / status / customer / subscription values. **Before any
 *      provider call.**
 *   2. `planLifecycleUpdate`   — accept the whole write for ONE table from that
 *      snapshot. Pure: no I/O, and structurally unable to re-read the rows.
 *   3. `commitLifecycleUpdate` — WRITE, conditioned on the step-1 snapshot.
 *
 * The split is load-bearing twice over. Planning BOTH tables before committing
 * EITHER means a rejection discovered while validating the second table can never
 * follow an avoidable write to the first. And because step 2 cannot read, the only
 * way to condition a write on a snapshot is to have taken it BEFORE the caller
 * consulted the provider — reading the rows afterwards is not a snapshot of the
 * state the decision was made from, it is a snapshot of a state that decision
 * never saw.
 *
 * Authorisation, and what it is not
 * ---------------------------------
 * `writeMembershipRow` is the AUTHENTICATED writer: its `profiles` branch
 * refuses to touch a row unless the caller supplies an auth user id that matches
 * the stored one, because an address match alone does not authorise a write.
 * Nothing here weakens that check and this module never calls it.
 *
 * A Stripe lifecycle event carries no auth user id. Its authority is a different
 * one: the Stripe customer and subscription relationship the caller has ALREADY
 * verified against Stripe's own current state. So the authorisation here is: the
 * row must itself carry the VERIFIED Stripe linkage. An address from the event
 * payload is not an authority, is never used to select a row, and is never used
 * to "repair" one. `profiles.user_id` is read off the row the verified linkage
 * resolved and used only as that row's primary key — it is never presented as,
 * or substituted for, an authenticated identity, and never fabricated.
 *
 * Contradictory linkage fails closed
 * ----------------------------------
 * A row whose stored `stripe_customer_id` is non-null and DIFFERENT from the
 * verified customer is not a row to repair by matching on a subscription id. It
 * is a contradiction: two identity claims about one row, and this module cannot
 * know which is stale. It fails closed (`lifecycle_contradictory_linkage`) and
 * writes nothing, rather than silently rewriting the row's customer to the one
 * Stripe just told us about.
 *
 * Conditional writes
 * ------------------
 * Every write is conditioned on the snapshot's `plan`, `subscription_status`,
 * `stripe_customer_id` and `stripe_subscription_id` (null-safe `IS NULL` /
 * `= value` comparisons) plus the row's real primary key. A statement that
 * affects no row means the row changed after the snapshot was taken — a
 * CONFLICT, reported distinctly (`lifecycle_write_conflict`) so the caller
 * re-resolves from fresh linkage and fresh provider state instead of reusing a
 * decision made from values that no longer hold.
 *
 * Bounded work: at most MAX_LINKAGE_IDS subscription ids, at most two rows per
 * lookup, no insert branch anywhere.
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
 * Every id here must already be known WITHOUT asking Stripe again: the customer
 * from the event, and the subscription ids the event owns plus the ones the
 * trusted tables recorded. Locating rows must not depend on the result of the
 * reconciliation whose snapshot exists to condition the write.
 */
export interface LifecycleAuthority {
  customerId?: string | null;
  subscriptionIds?: Array<string | null | undefined>;
}

/** The original values a write is conditioned on. Read BEFORE any Stripe call. */
export interface LifecycleGuard {
  plan: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface LifecycleRow {
  table: LifecycleTable;
  pkColumn: "id" | "user_id";
  pkValue: string;
  /** Snapshot captured at resolve time; the write is conditioned on it. */
  guard: LifecycleGuard;
  /** The full row as read, for eligibility predicates. */
  row: Record<string, unknown>;
}

export type LifecycleFailure =
  | "lifecycle_no_authority"
  | "lifecycle_lookup_failed"
  | "lifecycle_duplicate_rows"
  | "lifecycle_unidentified_row"
  | "lifecycle_contradictory_linkage"
  | "lifecycle_update_failed"
  | "lifecycle_row_not_updated"
  | "lifecycle_write_conflict";

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

export type LifecyclePlan =
  | {
      ok: true;
      table: LifecycleTable;
      fields: Record<string, unknown>;
      rows: LifecycleRow[];
      resolved: number;
      eligible: number;
      linked: boolean;
    }
  | { ok: false; reason: LifecycleFailure; detail: string; code?: string };

export type LifecycleWrite =
  | {
      ok: true;
      table: LifecycleTable;
      resolved: number;
      eligible: number;
      /** Rows the database reported as updated. The only verified-complete count. */
      updated: number;
      linked: boolean;
      /** Rows whose conditional write lost its race and were not changed. */
      conflicted: number;
    }
  | { ok: false; reason: LifecycleFailure; detail: string; code?: string };

/** Bounded work: the recorded id set is small, and this is a webhook. */
const MAX_LINKAGE_IDS = 4;
const LOOKUP_LIMIT = 2;

/** Columns every lifecycle write is conditioned on, on both tables. */
const GUARD_COLUMNS: Array<keyof LifecycleGuard> = [
  "plan",
  "subscription_status",
  "stripe_customer_id",
  "stripe_subscription_id",
];

function key(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function guardOf(row: Record<string, unknown>): LifecycleGuard {
  return {
    plan: key(row.plan),
    subscription_status: key(row.subscription_status),
    stripe_customer_id: key(row.stripe_customer_id),
    stripe_subscription_id: key(row.stripe_subscription_id),
  };
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
 * THE AUTHORIZATION SNAPSHOT.
 *
 * Read the EXISTING rows a lifecycle event is allowed to write, and capture
 * their primary keys plus the original `plan`, `subscription_status`,
 * `stripe_customer_id` and `stripe_subscription_id` — the values the conditional
 * write will be conditioned on.
 *
 * **This must run BEFORE the provider is consulted.** It is not the same thing as
 * reading stored linkage: a linkage read returns ids and a plan/status summary,
 * not the rows. Re-reading the rows after reconciliation is not equivalent and is
 * actively wrong — a change that lands during the provider call would be absorbed
 * into the snapshot, the conditional write would then match the NEW values, the
 * delivery would report success, and a decision made from the OLD values would
 * overwrite the newer state it never saw.
 *
 * Both linkage families are consulted, because a row may carry only one of them:
 * the verified customer, and each subscription id the event legitimately owns.
 * Results are deduplicated by primary key; two DISTINCT rows in one table that
 * both match the same verified relationship is a data conflict and fails closed
 * rather than being resolved by picking one.
 *
 * A row reached through a subscription id whose stored customer disagrees with
 * the verified one is a CONTRADICTION and fails closed — it is never repaired,
 * and no subscription-only match is allowed to override the customer it names.
 */
export async function snapshotLifecycleRows(
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

  const byPk = new Map<string, LifecycleRow>();
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
      if (query.column === "stripe_subscription_id" && customerId) {
        // Two identity claims about one row: the subscription says this customer
        // owns it, the row names another. Neither is provably the stale one, so
        // refuse — never "repair" the customer from a subscription-only match.
        const recorded = key(row.stripe_customer_id);
        if (recorded !== null && recorded !== customerId) {
          return {
            ok: false,
            reason: "lifecycle_contradictory_linkage",
            detail:
              `${table}: the row recording subscription ${query.value} names customer ${recorded}, ` +
              `but ${query.value} belongs to ${customerId}`,
            code: "CONTRADICTORY_LINKAGE",
          };
        }
      }
      byPk.set(pk, { table, pkColumn, pkValue: pk, guard: guardOf(row), row });
    }
    if (byPk.size > 1) {
      return {
        ok: false,
        reason: "lifecycle_duplicate_rows",
        detail: `${table}: ${byPk.size} distinct rows match one verified Stripe relationship`,
      };
    }
  }

  const all = Array.from(byPk.values());
  const rows = isEligible ? all.filter((entry) => isEligible(entry.row)) : all;
  return { ok: true, rows, matched: all.length, lookedUp };
}

/**
 * Accept the whole write for ONE table from a snapshot ALREADY CAPTURED.
 *
 * Pure by construction: it performs no I/O and cannot re-read the rows, so there
 * is no way for it to "helpfully" pick up a newer state than the one the decision
 * was made from. The snapshot must have been taken BEFORE reconciliation.
 *
 * Separating this from the commit is what lets the caller validate every table
 * before writing any of them.
 */
export function planLifecycleUpdate(
  snapshot: LifecycleResolve,
  table: LifecycleTable,
  fields: Record<string, unknown>
): LifecyclePlan {
  if (!snapshot.ok) return snapshot;
  return {
    ok: true,
    table,
    fields,
    rows: snapshot.rows,
    resolved: snapshot.matched,
    eligible: snapshot.rows.length,
    linked: snapshot.matched > 0,
  };
}

type UpdateFilter = {
  eq: (column: string, value: unknown) => UpdateFilter;
  is: (column: string, value: null) => UpdateFilter;
  select: () => PromiseLike<{
    data?: unknown;
    error?: { message?: string; code?: string } | null;
  }>;
};

function condition(
  query: UpdateFilter,
  column: keyof LifecycleGuard,
  value: string | null
): UpdateFilter {
  // Null safe: `IS NULL` for a snapshot that held no value, `= value` otherwise.
  return value === null ? query.is(column, null) : query.eq(column, value);
}

/**
 * Apply a plan, conditioned on the snapshot the plan was built from.
 *
 * Update-only by construction: there is no insert branch. Each row is written by
 * its own primary key plus the four guard columns, so the database can report
 * exactly how many rows it changed and can refuse one that moved underneath us.
 */
export async function commitLifecycleUpdate(
  client: SupabaseClient,
  plan: LifecyclePlan
): Promise<LifecycleWrite> {
  if (!plan.ok) return plan;

  let updated = 0;
  let conflicted = 0;

  for (const target of plan.rows) {
    let query = client
      .from(plan.table)
      .update(plan.fields)
      .eq(target.pkColumn, target.pkValue) as unknown as UpdateFilter;
    for (const column of GUARD_COLUMNS) {
      query = condition(query, column, target.guard[column]);
    }

    let res: { data?: unknown; error?: { message?: string; code?: string } | null };
    try {
      res = await query.select();
    } catch (err) {
      return {
        ok: false,
        reason: "lifecycle_update_failed",
        detail: `${plan.table}.${target.pkColumn}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (res && res.error) {
      return {
        ok: false,
        reason: "lifecycle_update_failed",
        detail: `${plan.table}.${target.pkColumn}: ${res.error.message ?? "update failed"}`,
        code: res.error.code,
      };
    }
    const data = res?.data;
    if (!Array.isArray(data)) {
      return {
        ok: false,
        reason: "lifecycle_row_not_updated",
        detail: `${plan.table}.${target.pkColumn}: the update reported no usable affected-row data`,
        code: "NO_AFFECTED_ROWS",
      };
    }
    if (data.length === 0) {
      // The row matched the verified linkage and the snapshot when it was read,
      // and no longer matches the snapshot. That is a lost race, not an empty
      // success: re-resolve rather than reuse this decision.
      conflicted += 1;
      continue;
    }
    if (data.length !== 1) {
      return {
        ok: false,
        reason: "lifecycle_row_not_updated",
        detail: `${plan.table}.${target.pkColumn}: ${data.length} row(s) affected, expected exactly 1`,
        code: "NO_AFFECTED_ROWS",
      };
    }
    updated += 1;
  }

  if (conflicted > 0) {
    return {
      ok: false,
      reason: "lifecycle_write_conflict",
      detail:
        `${plan.table}: ${conflicted} of ${plan.rows.length} row(s) changed after the snapshot was read`,
      code: "WRITE_CONFLICT",
    };
  }

  return {
    ok: true,
    table: plan.table,
    resolved: plan.resolved,
    eligible: plan.eligible,
    updated,
    linked: plan.linked,
    conflicted: 0,
  };
}

/** True when a failure means "re-resolve from fresh state", not "give up". */
export function isRetryableLifecycleFailure(reason: string): boolean {
  return reason === "lifecycle_write_conflict";
}
