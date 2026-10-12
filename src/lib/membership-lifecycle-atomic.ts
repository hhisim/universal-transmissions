/**
 * Batch 14af — the atomic lifecycle write path.
 *
 * The lifecycle webhook paths covered by Batch 14t now perform BOTH tables'
 * writes through the reviewed database primitive
 * `public.apply_lifecycle_update(jsonb)` (Batch 14u–14v), reached through the
 * synchronization wrapper `public.apply_lifecycle_update_sync_global` (Batch 14ac).
 *
 * WHY THE RPC AND NOT TWO CONDITIONAL WRITES
 * ------------------------------------------
 * PostgREST issues one statement per request, so the previous path was two
 * transactions: the ut_members update could commit while the profiles update
 * never ran, leaving access PAID with the mirror unwritten. The RPC applies both
 * targets' conditional writes in ONE transaction, so any conflict aborts both.
 *
 * SYNCHRONIZATION PROTOCOL — ONE, THROUGHOUT
 * ------------------------------------------
 * Every lifecycle path in this module uses the EXCLUSIVE GLOBAL key, via
 * `apply_lifecycle_update_sync_global`. The wrapper takes that key before its
 * re-location and calls the RPC unchanged.
 *
 * Serialization cost, stated plainly: one global key means every lifecycle write
 * in the system serialises against every other — there is no per-identity
 * concurrency. That is the price of covering writers that bypass the RPC
 * entirely (a direct SQL INSERT or relink), which per-identity keys cannot do
 * because a statement-level trigger cannot derive per-identity keys (measured,
 * Batch 14ac: the shared-per-identity route does not compose with the trigger,
 * and the shared global variant deadlocks on lock upgrade while the exclusive
 * one does not).
 *
 * COVERAGE OF DIRECT WRITERS IS CONDITIONAL. The wrapper alone synchronises
 * only writers that go THROUGH it — a cooperative protocol. A writer that never
 * takes the key (a plain direct INSERT or UPDATE in SQL) is covered ONLY when
 * the matching trigger protocol is installed alongside it. Measured in Batch
 * 14ad (D3c): the per-identity wrapper does not compose with the global-key
 * trigger — they contend on different locks — and a direct writer committed
 * inside the window. Do not read "the wrapper is installed" as "direct writers
 * are covered".
 *
 * It is deliberately uniform: mixing protocols per path would leave some writes
 * outside the lock and reintroduce the race the protocol exists to close.
 *
 * SNAPSHOTS
 * ---------
 * The `seenPks` and the per-row `original` guards MUST come from the snapshot
 * taken BEFORE Stripe was consulted (Batch 14t). This module cannot re-read rows
 * — it is given the snapshot and carries it. A fresh read here would let a change
 * that landed during the Stripe call be absorbed into the write's own conditions.
 *
 * FAILURES
 * --------
 * The RPC's conflict classes (NEWLY_LINKED / DISAPPEARED / SET_CHANGED /
 * CONFLICT) remain RETRYABLE: the caller re-resolves and re-reconciles within its
 * existing bounded retry policy. Payload/validation errors are NOT retryable —
 * they are caller bugs and retrying cannot fix them.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LifecycleFailure,
  LifecycleResolve,
  LifecycleTable,
  LifecycleWrite,
} from "./membership-lifecycle";

/** The exclusive-global synchronized entry point. One protocol, everywhere. */
export const ATOMIC_LIFECYCLE_RPC = "apply_lifecycle_update_sync_global";

/** Columns the reviewed primitive permits a write to name. */
const WRITABLE_COLUMNS = new Set([
  "plan",
  "subscription_status",
  "stripe_customer_id",
  "stripe_subscription_id",
  "current_period_end",
  // Batch 14ah: the reconciliation stamp the reader requires before a row may
  // decide entitlement. Written only by paths that reconcile, and only when the
  // same write determines the row's plan AND its subscription linkage — see
  // `unattestableWrite` below.
  "entitlement_authority_at",
]);

/**
 * The RPC's conflict classes. These mean "the state moved; re-resolve and
 * re-reconcile", and they must stay retryable.
 */
const RETRYABLE_RPC_FAILURE =
  /BATCH14 (NEWLY_LINKED|DISAPPEARED|SET_CHANGED|CONFLICT)\b/;
const SAFETY_NET_FAILURE =
  /BATCH14 (ENTRY_NOT_LOCATED|COVERAGE|INCOMPLETE_UPDATE|INCOMPLETE_SNAPSHOT)\b/;

export interface AtomicLifecycleAuthority {
  customerId?: string | null;
  subscriptionIds?: Array<string | null | undefined>;
}

export interface AtomicLifecycleSide {
  /** The pre-reconciliation snapshot for this table. */
  snapshot: LifecycleResolve;
  /** The fields the caller decided to write. */
  fields: Record<string, unknown>;
}

export interface AtomicLifecycleInput {
  authority: AtomicLifecycleAuthority;
  member: AtomicLifecycleSide;
  profile: AtomicLifecycleSide;
}

export interface AtomicLifecycleResult {
  /** True only when BOTH targets' writes committed together. */
  ok: boolean;
  /** True when the failure is a conflict class the caller must retry. */
  retryable: boolean;
  member: LifecycleWrite;
  profile: LifecycleWrite;
}

function cleanIds(ids: Array<string | null | undefined> | undefined): string[] {
  const seen = new Set<string>();
  for (const id of ids ?? []) {
    if (typeof id === "string" && id.trim().length > 0) seen.add(id.trim());
  }
  return Array.from(seen);
}

function failureWrite(
  table: LifecycleTable,
  reason: LifecycleFailure,
  detail: string,
  code?: string
): LifecycleWrite {
  return { ok: false, reason, detail, code };
}

/**
 * One target for the reviewed primitive, built from a snapshot ALREADY TAKEN.
 *
 * `seen_pks` is the located set the caller snapshotted, and every entry carries
 * its own four guard values, so the primitive can prove the set has not changed
 * and every row still matches what the decision was made from. `null` guards are
 * sent as JSON null, which the primitive compares with `IS NOT DISTINCT FROM`.
 */
/**
 * The builder's envelope. Callers send `target` — the envelope never reaches the RPC.
 */
export type AtomicTargetBuild = { ok: true; target: Record<string, unknown> };

export function buildAtomicTarget(
  table: LifecycleTable,
  side: AtomicLifecycleSide,
  authority: AtomicLifecycleAuthority
): AtomicTargetBuild | null {
  if (!side.snapshot.ok) return null;

  const subscriptionIds = cleanIds(authority.subscriptionIds);
  const customerId =
    typeof authority.customerId === "string" && authority.customerId.trim().length > 0
      ? authority.customerId.trim()
      : null;

  const located = side.snapshot.all ?? side.snapshot.rows;
  const eligible = new Set(side.snapshot.rows.map((row) => row.pkValue));
  const writable = located.filter((row) => eligible.has(row.pkValue));
  const excluded = located.length - writable.length;

  const guards = (row: (typeof located)[number]) => ({
    plan: row.guard.plan,
    subscription_status: row.guard.subscription_status,
    stripe_customer_id: row.guard.stripe_customer_id,
    stripe_subscription_id: row.guard.stripe_subscription_id,
  });

  const mixed = excluded > 0 && writable.length > 0;
  const skipAll = located.length > 0 && writable.length === 0;

  return {
    ok: true,
    target: {
      target: table,
      // All rows excluded -> the EXISTING target-level skip: every located row is
      // covered and its guards validated, and none is written. Mixed -> the
      // target stays an update and each EXCLUDED entry carries an explicit
      // per-entry skip, so coverage is exact, guards are still validated, and
      // excluded rows receive no UPDATE.
      intent: skipAll ? "skip" : "update",
      linkage: { customer_id: customerId, subscription_ids: subscriptionIds },
      seen_pks: located.map((row) => row.pkValue),
      entries: located.map((row) => {
        const base = { pk: row.pkValue, original: guards(row) };
        if (skipAll) return base;
        if (eligible.has(row.pkValue)) return { ...base, set: { ...side.fields } };
        return mixed ? { ...base, skip: true } : base;
      }),
    },
  };
}

/** The full `p_targets` payload: both tables, always, as TARGET OBJECTS. */
export function buildAtomicLifecyclePayload(
  input: AtomicLifecycleInput
): { ok: true; targets: Record<string, unknown>[] } | { ok: false; detail: string } {
  const targets: Record<string, unknown>[] = [];
  for (const [table, side] of [
    ["ut_members", input.member],
    ["profiles", input.profile],
  ] as Array<[LifecycleTable, AtomicLifecycleSide]>) {
    const built = buildAtomicTarget(table, side, input.authority);
    if (!built) {
      return {
        ok: false,
        detail: `${table}: the snapshot is not usable for an atomic write`,
      };
    }
    const unattestable = unattestableWrite(side.fields);
    if (unattestable) {
      // Refused rather than silently dropped: an unattestable write means the
      // caller believes this reconciliation decided the row when it did not.
      return {
        ok: false,
        detail: `${table}: a write that attests entitlement authority must supply ${unattestable} in the same write`,
      };
    }
    // The envelope is the builder's own result shape. The RPC takes the TARGET.
    targets.push(built.target);
  }
  return { ok: true, targets };
}

/** Validate the fields locally, so a caller bug is caught before the round trip. */
export function unwritableField(fields: Record<string, unknown>): string | null {
  for (const name of Object.keys(fields)) {
    if (!WRITABLE_COLUMNS.has(name)) return name;
  }
  return Object.keys(fields).length === 0 ? "<empty set>" : null;
}

/**
 * Batch 14ai — the ATTESTATION CONTRACT, enforced before the round trip.
 *
 * A write may stamp `entitlement_authority_at` only when it supplies the target's
 * `plan` AND its `stripe_subscription_id` in the SAME write — setting the linkage
 * or explicitly clearing it with null. Attesting anything less over-claims:
 *
 *   - dunning writes `subscription_status` alone, so stamping it would turn an
 *     untouched cached `plan` into a complete entitlement decision, and dunning
 *     would silently change who is entitled;
 *   - the invoice's mirror write settles `plan` and the customer but leaves the
 *     stored subscription untouched, so stamping it would attest a pair that
 *     contradicts the member's corrected linkage, and the reader would fail closed
 *     on the invoice's own successful write.
 *
 * Returns the names the write is missing, or null when the write may attest.
 */
export function unattestableWrite(fields: Record<string, unknown>): string | null {
  if (!("entitlement_authority_at" in fields)) return null;
  const missing: string[] = [];
  if (!("plan" in fields)) missing.push("plan");
  if (!("stripe_subscription_id" in fields)) missing.push("stripe_subscription_id");
  return missing.length > 0 ? missing.join(" and ") : null;
}

type RpcRow = {
  target?: unknown;
  outcome?: unknown;
  affected?: unknown;
};

type RpcError = { message?: string; code?: string; details?: string } | null;

function rpcMessage(error: RpcError): string {
  return `${error?.message ?? ""} ${error?.details ?? ""}`;
}

async function callRpc(
  client: SupabaseClient,
  payload: Record<string, unknown>[]
): Promise<{ data: unknown; error: RpcError }> {
  try {
    const res = await client.rpc(ATOMIC_LIFECYCLE_RPC, { p_targets: payload });
    return { data: res.data, error: (res.error as RpcError) ?? null };
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

/** Map an RPC error onto the caller's failure vocabulary, keeping conflicts retryable. */
function errorWrite(table: LifecycleTable, error: RpcError): LifecycleWrite {
  const retryable = RETRYABLE_RPC_FAILURE.test(rpcMessage(error));
  const safetyNet = SAFETY_NET_FAILURE.test(rpcMessage(error));
  return failureWrite(
    table,
    retryable ? "lifecycle_write_conflict" : "lifecycle_update_failed",
    `atomic lifecycle write failed: ${error?.message ?? "unknown error"}`,
    retryable ? "WRITE_CONFLICT" : safetyNet ? "COVERAGE" : error?.code
  );
}

function writeFromOutcome(
  table: LifecycleTable,
  side: AtomicLifecycleSide,
  rows: RpcRow[]
): LifecycleWrite | null {
  const row = rows.find((candidate) => candidate.target === table);
  if (!row) return null;
  const snapshot = side.snapshot;
  const matched = snapshot.ok ? snapshot.matched : 0;
  const eligible = snapshot.ok ? snapshot.rows.length : 0;
  const outcome = typeof row.outcome === "string" ? row.outcome : "";
  const affected = typeof row.affected === "number" ? row.affected : 0;

  if (outcome === "absent") {
    // Verified absent inside the transaction: nothing to write, not a failure.
    return { ok: true, table, resolved: 0, eligible: 0, updated: 0, linked: false, conflicted: 0 };
  }
  if (outcome === "updated" || outcome === "skipped") {
    return {
      ok: true,
      table,
      resolved: matched,
      eligible,
      updated: affected,
      linked: true,
      conflicted: 0,
    };
  }
  return failureWrite(
    table,
    "lifecycle_row_not_updated",
    `${table}: unexpected outcome ${JSON.stringify(outcome)} from the atomic primitive`,
    "UNEXPECTED_OUTCOME"
  );
}

/** A caller bug the primitive would reject anyway: refuse before the round trip. */
function refuseBoth(table: LifecycleTable, invalid: string): AtomicLifecycleResult {
  const detail = `${table}: the write names a column the lifecycle contract does not own (${invalid})`;
  return {
    ok: false,
    retryable: false,
    member: failureWrite("ut_members", "lifecycle_update_failed", detail, "COLUMN_NOT_WRITABLE"),
    profile: failureWrite("profiles", "lifecycle_update_failed", detail, "COLUMN_NOT_WRITABLE"),
  };
}

/**
 * Apply the caller's decision for both tables in ONE transaction.
 *
 * On failure NOTHING was written *when the failure carries an explicit conflict
 * class* — a `BATCH14` error means the transaction did not commit, so both sides
 * are reported as failed rather than one pretending to have succeeded.
 *
 * THAT IS NOT TRUE OF EVERY FAILURE. If the transport fails after the primitive
 * committed, the caller sees an error for a transaction that DID commit: commit
 * status is then UNKNOWN and must not be reported as a rollback. Only an explicit
 * conflict class is evidence that nothing landed.
 */
export async function applyAtomicLifecycleUpdate(
  client: SupabaseClient,
  input: AtomicLifecycleInput
): Promise<AtomicLifecycleResult> {
  const invalidMember = unwritableField(input.member.fields);
  if (invalidMember) return refuseBoth("ut_members", invalidMember);
  const invalidProfile = unwritableField(input.profile.fields);
  if (invalidProfile) return refuseBoth("profiles", invalidProfile);

  const built = buildAtomicLifecyclePayload(input);
  if (!built.ok) {
    // A LOCAL REFUSAL NEVER BECOMES A PAYLOAD: return before the round trip.
    return {
      ok: false,
      retryable: false,
      member: failureWrite("ut_members", "lifecycle_update_failed", built.detail, "SNAPSHOT_UNUSABLE"),
      profile: failureWrite("profiles", "lifecycle_update_failed", built.detail, "SNAPSHOT_UNUSABLE"),
    };
  }
  const payload = built.targets;

  const { data, error } = await callRpc(client, payload);

  if (error) {
    // Both sides failed: the primitive committed neither.
    const retryable = RETRYABLE_RPC_FAILURE.test(rpcMessage(error));
    return {
      ok: false,
      retryable,
      member: errorWrite("ut_members", error),
      profile: errorWrite("profiles", error),
    };
  }

  const rows = Array.isArray(data) ? (data as RpcRow[]) : [];
  const memberWrite = writeFromOutcome("ut_members", input.member, rows);
  const profileWrite = writeFromOutcome("profiles", input.profile, rows);

  if (!memberWrite || !profileWrite) {
    const detail = "the atomic primitive returned no outcome for a requested target";
    return {
      ok: false,
      retryable: false,
      member: memberWrite ?? failureWrite("ut_members", "lifecycle_row_not_updated", detail, "NO_OUTCOME"),
      profile: profileWrite ?? failureWrite("profiles", "lifecycle_row_not_updated", detail, "NO_OUTCOME"),
    };
  }

  return {
    ok: memberWrite.ok && profileWrite.ok,
    retryable: false,
    member: memberWrite,
    profile: profileWrite,
  };
}

/** Exposed for the focused tests: is this RPC failure class retryable? */
export function isRetryableAtomicFailure(message: string): boolean {
  return RETRYABLE_RPC_FAILURE.test(message);
}

/**
 * The same primitive, for a path that writes ONE table.
 *
 * Dunning updates `ut_members` only: `past_due` is not a revocation, so the
 * `profiles` mirror is deliberately left alone. The protocol is unchanged — it is
 * still the exclusive-global synchronized entry point, just with a one-target
 * payload, which the primitive accepts.
 */
export async function applyAtomicLifecycleUpdateOne(
  client: SupabaseClient,
  input: {
    authority: AtomicLifecycleAuthority;
    table: LifecycleTable;
    side: AtomicLifecycleSide;
  }
): Promise<{ ok: boolean; retryable: boolean; write: LifecycleWrite }> {
  const invalid = unwritableField(input.side.fields);
  if (invalid) {
    return {
      ok: false,
      retryable: false,
      write: failureWrite(
        input.table,
        "lifecycle_update_failed",
        `${input.table}: the write names a column the lifecycle contract does not own (${invalid})`,
        "COLUMN_NOT_WRITABLE"
      ),
    };
  }

  const target = buildAtomicTarget(input.table, input.side, input.authority);
  if (!target) {
    return {
      ok: false,
      retryable: false,
      write: failureWrite(
        input.table,
        "lifecycle_update_failed",
        "the snapshot is not usable for an atomic write",
        "SNAPSHOT_UNUSABLE"
      ),
    };
  }

  // `target` is the envelope; the RPC takes its `.target`.
  const { data, error } = await callRpc(client, [target.target]);
  if (error) {
    return {
      ok: false,
      retryable: RETRYABLE_RPC_FAILURE.test(rpcMessage(error)),
      write: errorWrite(input.table, error),
    };
  }

  const write = writeFromOutcome(
    input.table,
    input.side,
    Array.isArray(data) ? (data as RpcRow[]) : []
  );
  if (!write) {
    return {
      ok: false,
      retryable: false,
      write: failureWrite(
        input.table,
        "lifecycle_row_not_updated",
        "the atomic primitive returned no outcome for the requested target",
        "NO_OUTCOME"
      ),
    };
  }
  return { ok: write.ok, retryable: false, write };
}
