#!/usr/bin/env node
/**
 * batch14p-webhook-coverage.js
 *
 * WEBHOOK-LEVEL harness. Executes the real handler, authority helper,
 * entitlement reader and the DB writes through the shared mock.
 *
 * Stripe is seeded EXPLICITLY per subscription id in `state.stripe`. Nothing is
 * derived from membership rows or from historical event payloads.
 *
 * Every membership write is recorded in `state.writes`, so a rejected
 * reconciliation can be proven to have written nothing.
 *
 * Batch 14af adaptation
 * ---------------------
 * This suite now runs against the SHARED PostgreSQL-backed harness
 * (`scripts/lib/ut-membership-webhook-harness.cjs`), so its membership writes go
 * through the reviewed atomic primitive in a real, disposable PostgreSQL 16
 * cluster instead of a per-table in-process fake. S1–S6 behavioural coverage is
 * preserved; two expectations had to be re-pointed at the atomic contract and
 * are marked ATOMIC below:
 *
 *   - S4 previously asserted a PARTIAL application — the ut_members write had
 *     landed and only the profiles mirror failed. That describes the
 *     two-transaction path this batch removes. The atomic contract is the
 *     opposite: a failed required write leaves BOTH tables unchanged, and a
 *     healthy retry completes the operation. The failure is a real one raised by
 *     the isolated database, not a mocked hook.
 *   - S5/S6 asserted "zero membership writes" by counting table-scoped `.update()`
 *     records. On the atomic path the write is a single RPC, which carries no
 *     `table`, so that count would be vacuous. The same claim is counted as write
 *     ATTEMPTS: entered update statements plus RPC calls.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { createHarness } = require(path.join(ROOT, "scripts/lib/ut-membership-webhook-harness.cjs"));

const h = createHarness(ROOT);
const { state } = h;

let passed = 0; const failures = [];
function ok(c, l) { if (c) { passed += 1; return true; } failures.push(l); console.error("  FAIL:", l); return false; }

const EMAIL = "member@example.com", CUS = "cus_1", A = "sub_A", B = "sub_B";
const MEM = () => state.tables.ut_members[0] || {};
const PROF = () => state.tables.profiles[0] || {};
const paid = (p) => p !== "guest" && p !== "free" && p !== "READ_ERROR";

/** RPC calls entered since a write-log mark. */
const rpcSince = (mark) => state.writes.slice(mark).filter((w) => w.op === "rpc");
/** Rows actually UPDATED since a write-log mark. Attempts are never counted here. */
const rowsAppliedSince = (mark) => {
  let n = 0;
  for (const w of state.writes.slice(mark)) {
    if (w.op === "update" && w.matched > 0) n += w.matched;
    if (w.op === "rpc" && Array.isArray(w.data)) {
      for (const outcome of w.data) n += Number(outcome?.affected) || 0;
    }
  }
  return n;
};

(async () => {
  console.log("batch14p-webhook-coverage\n");

  // S1 cancel A -> reactivate B -> repeat B update, asserting BOTH tables
  console.log("  --- S1 cancel A, reactivate B, repeat B (both tables) ---");
  h.reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  // Stripe's state at cancel time: A is cancelled and no replacement exists yet.
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  let r = await h.post();
  let e1 = await h.eff(EMAIL);
  ok(r.status === 200, "S1 cancel A -> 200 (got " + r.status + ")");
  ok(MEM().subscription_status === "canceled", "S1 ut_members status canceled");
  ok(MEM().plan === "guest", "S1 ut_members plan is guest (got " + MEM().plan + ")");
  ok(PROF().plan === "free", "S1 profiles mirrored to free (got " + PROF().plan + ")");
  ok(e1 !== "initiate" && e1 !== "READ_ERROR", "S1 entitlement revoked without a read error (got " + e1 + ")");
  const s1 = { rpc: rpcSince(0).length, rows: rowsAppliedSince(0) };
  ok(s1.rpc === 1, "S1 the cancellation went through the atomic RPC (rpc calls=" + s1.rpc + ")");
  ok(s1.rows === 2, "S1 the atomic RPC updated both tables' rows (rows=" + s1.rows + ")");

  // B now exists as the live replacement.
  state.stripe[B] = { status: "active", customer: CUS };
  h.nextEvent("customer.subscription.created", { id: B, customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  r = await h.post();
  let e2 = await h.eff(EMAIL);
  ok(r.status === 200, "S1 reactivate B -> 200 (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B, "S1 ut_members linkage is B (is " + MEM().stripe_subscription_id + ")");
  ok(PROF().stripe_subscription_id === B, "S1 profiles linkage is B (is " + PROF().stripe_subscription_id + ")");
  ok(MEM().subscription_status === "active", "S1 ut_members status cleared from canceled (is " + MEM().subscription_status + ")");
  ok(paid(e2) && e2 !== "READ_ERROR", "S1 entitlement paid (got " + e2 + ")");

  h.nextEvent("customer.subscription.updated", { id: B, customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  r = await h.post();
  const e3 = await h.eff(EMAIL);
  ok(r.status === 200, "S1 repeat B update -> 200 (got " + r.status + ")");
  ok(paid(e3) && e3 !== "READ_ERROR", "S1 entitlement still paid (got " + e3 + ")");
  ok(MEM().stripe_subscription_id === B && PROF().stripe_subscription_id === B,
    "S1 both tables still record B (ut_members=" + MEM().stripe_subscription_id + ", profiles=" + PROF().stripe_subscription_id + ")");

  // S2 no metadata.email, resolved via stored customer linkage
  console.log("  --- S2 no metadata.email ---");
  h.reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  // Scenario intent is a cancelled subscription: Stripe is the authority.
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  r = await h.post();
  ok(r.status === 200, "S2 lifecycle without metadata.email -> 200 (got " + r.status + ")");
  ok(MEM().subscription_status === "canceled", "S2 resolved through stored customer linkage (status " + MEM().subscription_status + ")");

  // S3 profiles-only membership
  console.log("  --- S3 profiles-only ---");
  h.reset();
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  r = await h.post();
  ok(r.status === 200, "S3 profiles-only cancellation -> 200 (got " + r.status + ")");
  const e3p = await h.eff(EMAIL);
  ok(e3p === "guest" || e3p === "free", "S3 profiles-only access revoked to guest/free (reader says " + e3p + ")");
  ok(PROF().plan === "free", "S3 the profiles-only mirror was revoked by the atomic RPC (plan " + PROF().plan + ")");
  const s3Rows = rowsAppliedSince(0);
  ok(s3Rows === 1, "S3 only the profiles row was updated — the absent member target wrote nothing (rows=" + s3Rows + ")");

  // S4 ATOMIC: the failed required write rolls BOTH tables back, then a healthy retry completes it.
  //
  // The failure is raised by the ISOLATED DATABASE, not by a mocked hook: a
  // concurrent writer keeps moving `profiles.subscription_status` between the
  // authorization snapshot and the write, so the reviewed primitive raises a real
  // `BATCH14 CONFLICT` on the SECOND target and the whole transaction aborts —
  // including the ut_members statement that would otherwise have matched.
  //
  // `profiles.subscription_status` is a guard column of the primitive but is
  // IGNORED for entitlement by the shared reader (membership-plan.ts: revocation
  // authority is `ut_members.subscription_status` only), so the injection cannot
  // disturb the entitlement this scenario asserts.
  console.log("  --- S4 a failed required write leaves BOTH tables unchanged, then a healthy retry ---");
  h.reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000, metadata: { email: EMAIL } });

  // The concurrent writer: every attempt's snapshot is stale by the time the
  // transaction runs. `beforeUpdate` fires inside the RPC call, i.e. after the
  // snapshot was taken and before PostgreSQL is asked to apply it.
  state.beforeUpdate = () => {
    const row = state.tables.profiles[0];
    if (row) row.subscription_status = row.subscription_status === "active" ? "past_due" : "active";
  };

  const mark4 = state.writes.length;
  r = await h.post();
  const b4 = await h.bodyOf(r);
  const e4a = await h.eff(EMAIL);
  const failed4 = rpcSince(mark4);

  ok(r.status === 500, "S4 the failed required write refuses the delivery -> 500 (got " + r.status + ")");
  ok((b4.membershipFailures || []).some((f) => String(f).startsWith("profiles:")),
    "S4 the failed required write is named (got " + JSON.stringify(b4.membershipFailures || []) + ")");
  ok(failed4.length === 2, "S4 both bounded attempts reached the database (rpc calls=" + failed4.length + ")");
  ok(failed4.length === 2 && failed4.every((w) => /BATCH14 CONFLICT/.test(String(w.error?.message || ""))),
    "S4 the failure is a REAL database conflict, not a mock (got " +
      JSON.stringify(failed4.map((w) => String(w.error?.message || "").slice(0, 60))) + ")");
  ok(failed4.length > 0 && failed4.every((w) => w.data === null),
    "S4 an aborted transaction reports no outcome rows (data=" + JSON.stringify(failed4.map((w) => w.data)) + ")");
  ok(failed4.some((w) => /target profiles/.test(String(w.error?.message || ""))),
    "S4 the conflicting target is the SECOND table (profiles)");
  ok(rowsAppliedSince(mark4) === 0,
    "S4 the failed write applied ZERO rows across both attempts (rows=" + rowsAppliedSince(mark4) + ")");
  // The inversion of the pre-14af expectation: the ut_members revocation did NOT
  // land, even though its statement was reached and would have matched.
  ok(MEM().plan === "initiate" && MEM().subscription_status === "active",
    "S4 the ut_members revocation was ROLLED BACK with the failing mirror (plan=" + MEM().plan + " status=" + MEM().subscription_status + ")");
  ok(PROF().plan === "initiate", "S4 the profiles mirror was not written (plan=" + PROF().plan + ")");
  ok(PROF().stripe_subscription_id === A, "S4 the profiles linkage is untouched (sub " + PROF().stripe_subscription_id + ")");
  ok(paid(e4a) && e4a !== "READ_ERROR", "S4 access was NOT revoked by the failed write (got " + e4a + ")");

  // The healthy retry: the interfering writer is gone, so the same delivery
  // completes the operation on both tables.
  state.beforeUpdate = null;
  const mark4b = state.writes.length;
  r = await h.post();
  const e4b = await h.eff(EMAIL);
  ok(r.status === 200, "S4 retry -> 200 (got " + r.status + ")");
  ok(rpcSince(mark4b).length === 1,
    "S4 the healthy retry needed exactly one write attempt (rpc calls=" + rpcSince(mark4b).length + ")");
  ok(MEM().subscription_status === "canceled" && MEM().plan !== "initiate",
    "S4 the retry completed the revocation on ut_members (plan=" + MEM().plan + " status=" + MEM().subscription_status + ")");
  ok(PROF().plan !== "initiate", "S4 the retry completed the profiles mirror (plan=" + PROF().plan + ")");
  ok(rowsAppliedSince(mark4b) === 2,
    "S4 the healthy retry updated both tables' rows (rows=" + rowsAppliedSince(mark4b) + ")");
  ok(e4b !== "initiate" && e4b !== "READ_ERROR", "S4 the retry leaves the revocation complete (got " + e4b + ")");

  // S5 delayed deletion of A after B is active — BOTH tables preserved
  console.log("  --- S5 delayed deletion of A (both tables preserved) ---");
  h.reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: B });
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: B });
  state.stripe = { [A]: { status: "canceled", customer: CUS }, [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  r = await h.post();
  const e5 = await h.eff(EMAIL);
  ok(r.status === 200, "S5 stale deletion -> 200 (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B, "S5 ut_members still records B (is " + MEM().stripe_subscription_id + ")");
  ok(PROF().stripe_subscription_id === B, "S5 profiles still records B (is " + PROF().stripe_subscription_id + ")");
  ok(MEM().subscription_status === "active" && MEM().plan === "initiate" && PROF().plan === "initiate",
    "S5 neither table was downgraded (ut_members=" + MEM().plan + "/" + MEM().subscription_status + ", profiles=" + PROF().plan + ")");
  ok(paid(e5) && e5 !== "READ_ERROR", "S5 access governed by B is preserved (got " + e5 + ")");
  // ATOMIC: write ATTEMPTS — entered update statements plus RPC calls.
  const w5 = h.attempts().length;
  ok(w5 === 0, "S5 a rejected (stale) deletion performs ZERO membership write attempts (got " + w5 + ")");
  ok(rowsAppliedSince(0) === 0, "S5 a rejected (stale) deletion applied ZERO rows (got " + rowsAppliedSince(0) + ")");

  // S6 two recorded, ownership-verified live subscriptions -> fail closed, no writes
  console.log("  --- S6 two recorded live subscriptions ---");
  h.reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: B });
  state.stripe = { [A]: { status: "active", customer: CUS }, [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  r = await h.post();
  const b6 = await h.bodyOf(r);
  ok(r.status === 500, "S6 genuine ambiguity fails closed (got " + r.status + ")");
  ok((b6.membershipFailures || []).some((f) => f.includes("multiple_candidates")),
    "S6 the ambiguity is named (got " + JSON.stringify(b6.membershipFailures || []) + ")");
  // ATOMIC: write ATTEMPTS — entered update statements plus RPC calls.
  const w6 = h.attempts().length;
  ok(w6 === 0, "S6 rejected reconciliation performs ZERO membership write attempts (got " + w6 + ")");
  ok(rowsAppliedSince(0) === 0, "S6 rejected reconciliation applied ZERO rows (got " + rowsAppliedSince(0) + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14P_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
