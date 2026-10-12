#!/usr/bin/env node
/**
 * batch14af-invoice-write-consistency.js
 *
 * THE INVOICE PATH, UNDER THE SAME LIFECYCLE GUARANTEES AS THE SUBSCRIPTION PATHS.
 *
 * `invoice.payment_succeeded` used to address rows by the payload address and to
 * write each table with its own `.update()`. Neither survives the guarantees the
 * rest of Batch 14 established, so this suite pins the repaired contract against
 * the real handler, the real authority helper, the real entitlement reader and
 * the REAL reviewed primitive in a disposable PostgreSQL 16 cluster:
 *
 *   I1  a paid, governed invoice writes BOTH tables through the atomic RPC;
 *   I2  a delayed invoice cannot clear a recorded revocation (status ownership);
 *   I3  a delayed invoice cannot replace the governing subscription;
 *   I4  an invoice whose current subscription is not paid is ignored entirely;
 *   I5  a concurrent change survives, and the write completes on a fresh snapshot;
 *   I6  a required write that keeps losing its race rolls BOTH tables back, and a
 *       healthy retry then completes the operation;
 *   I7  a linkage that owns no profiles row is reported, NOT created.
 *
 * The conflicts in I5 and I6 are raised by PostgreSQL, not by a mocked hook: a
 * concurrent writer keeps moving `profiles.subscription_status` between the
 * authorization snapshot and the write, so the primitive raises its own
 * `BATCH14 CONFLICT`. That column is a guard column of the primitive but is
 * ignored for entitlement by the shared reader (membership-plan.ts: revocation
 * authority is `ut_members.subscription_status` only).
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
const warnings = (b) => (b.membershipWarnings || []).map(String).join(";");
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

const member = (fields) => state.tables.ut_members.push({
  id: "m1", email: EMAIL, plan: "free", subscription_status: "active",
  stripe_customer_id: CUS, stripe_subscription_id: A, ...fields,
});
const profile = (fields) => state.tables.profiles.push({
  user_id: "u1", email: EMAIL, plan: "free", subscription_status: "active",
  stripe_customer_id: CUS, stripe_subscription_id: A, ...fields,
});
const invoice = (subId, id) => h.nextEvent("invoice.payment_succeeded", {
  id: id || "in_1", customer: CUS, customer_email: EMAIL, subscription: subId,
});
/** A concurrent writer that lands exactly once, between snapshot and write. */
function concurrent(fn) { let fired = false; return () => { if (fired) return; fired = true; fn(); }; }

(async () => {
  console.log("batch14af-invoice-write-consistency\n");

  // ── I1 a paid, governed invoice writes BOTH tables through the atomic RPC ──
  console.log("  --- I1 a paid, governed invoice writes both tables atomically ---");
  h.reset();
  member({});
  profile({});
  state.stripe = { [A]: { status: "active", customer: CUS } };
  invoice(A);
  const mark1 = state.writes.length;
  let r = await h.post();
  let b = await h.bodyOf(r);
  ok(r.status === 200, "I1 acknowledged (got " + r.status + ")");
  ok(MEM().plan === "initiate", "I1 ut_members plan recorded (is " + MEM().plan + ")");
  ok(PROF().plan === "initiate", "I1 profiles plan mirrored (is " + PROF().plan + ")");
  ok(MEM().stripe_subscription_id === A, "I1 the governing subscription is recorded (is " + MEM().stripe_subscription_id + ")");
  ok(MEM().subscription_status === "active", "I1 the stored status is left as it was (is " + MEM().subscription_status + ")");
  ok(rpcSince(mark1).length === 1, "I1 ONE atomic RPC was used, not two independent writes (rpc calls=" + rpcSince(mark1).length + ")");
  ok(rowsAppliedSince(mark1) === 2, "I1 both tables' rows were updated in that one call (rows=" + rowsAppliedSince(mark1) + ")");
  ok(h.inserts().length === 0, "I1 no row was inserted (inserts=" + h.inserts().length + ")");
  ok((b.membershipFailures || []).length === 0, "I1 no required write failed (got " + JSON.stringify(b.membershipFailures || []) + ")");

  // ── I2 a delayed invoice cannot clear a recorded revocation ───────────────
  // Stripe still reports the subscription ACTIVE, so reconciliation does not
  // screen the invoice out; only STATUS OWNERSHIP can keep the member revoked.
  // The seeded status is written to a value the handler would have to CHANGE to
  // restore access, so this is the proof rather than a coincidence.
  console.log("  --- I2 a delayed invoice cannot clear a recorded revocation ---");
  for (const status of ["canceled", "incomplete_expired"]) {
    h.reset();
    member({ plan: "guest", subscription_status: status });
    profile({ plan: "free", subscription_status: "active" });
    state.stripe = { [A]: { status: "active", customer: CUS } };
    invoice(A, "in_" + status);
    const mark2 = state.writes.length;
    r = await h.post();
    const eff2 = await h.eff(EMAIL);
    ok(r.status === 200, "I2[" + status + "] acknowledged (got " + r.status + ")");
    ok(MEM().plan === "initiate", "I2[" + status + "] the invoice's plan write DID land (is " + MEM().plan + ")");
    ok(MEM().subscription_status === status,
      "I2[" + status + "] the invoice did NOT rewrite the status (is " + MEM().subscription_status + ")");
    ok(eff2 === "guest", "I2[" + status + "] entitlement stays REVOKED — no resurrection (got " + eff2 + ")");
    ok(rpcSince(mark2).length === 1, "I2[" + status + "] the write still went through the atomic RPC (rpc calls=" + rpcSince(mark2).length + ")");
  }

  // ── I3 a delayed invoice cannot replace the governing subscription ────────
  console.log("  --- I3 a delayed invoice must not steal the governing subscription ---");
  h.reset();
  member({ plan: "initiate", subscription_status: "active", stripe_subscription_id: B });
  profile({ plan: "initiate", subscription_status: "active", stripe_subscription_id: B });
  state.stripe = { [A]: { status: "canceled", customer: CUS }, [B]: { status: "active", customer: CUS } };
  invoice(A, "in_old");
  r = await h.post();
  ok(r.status === 200, "I3 acknowledged (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B,
    "I3 the stored linkage is still the GOVERNING subscription B, not the invoice's A (is " + MEM().stripe_subscription_id + ")");
  ok(PROF().stripe_subscription_id === B, "I3 the mirror's linkage is untouched (is " + PROF().stripe_subscription_id + ")");
  ok(MEM().subscription_status === "active" && PROF().plan === "initiate", "I3 neither table was downgraded");

  // ── I4 an invoice whose current subscription is not paid is ignored ───────
  console.log("  --- I4 an invoice whose subscription is not current and paid ---");
  h.reset();
  member({ plan: "guest", subscription_status: "canceled", stripe_subscription_id: null });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  invoice(A, "in_stale");
  r = await h.post();
  b = await h.bodyOf(r);
  const eff4 = await h.eff(EMAIL);
  ok(r.status === 200, "I4 acknowledged (got " + r.status + ")");
  ok(warnings(b).includes("invoice-ignored"), "I4 the invoice is ignored and named (warnings " + warnings(b) + ")");
  ok(h.attempts().length === 0, "I4 NO write was attempted at all (attempts=" + h.attempts().length + ")");
  ok(MEM().plan === "guest" && MEM().subscription_status === "canceled", "I4 the row is untouched");
  ok(eff4 === "guest", "I4 entitlement stays revoked (got " + eff4 + ")");

  // ── I5 a concurrent change survives, and the write completes ─────────────
  console.log("  --- I5 a concurrent change survives one lost race ---");
  h.reset();
  member({});
  profile({});
  state.stripe = { [A]: { status: "active", customer: CUS } };
  invoice(A, "in_race");
  state.beforeUpdate = concurrent(() => { state.tables.profiles[0].subscription_status = "past_due"; });
  const mark5 = state.writes.length;
  r = await h.post();
  const rpc5 = rpcSince(mark5);
  ok(r.status === 200, "I5 the delivery completes after one lost race (got " + r.status + ")");
  ok(rpc5.length === 2, "I5 exactly one re-resolution happened (rpc calls=" + rpc5.length + ")");
  ok(/BATCH14 CONFLICT/.test(String(rpc5[0]?.error?.message || "")),
    "I5 the first attempt lost a REAL database conflict (got " + JSON.stringify(String(rpc5[0]?.error?.message || "").slice(0, 60)) + ")");
  ok(MEM().plan === "initiate" && PROF().plan === "initiate", "I5 the invoice's plan write landed on the FRESH snapshot");
  ok(PROF().subscription_status === "past_due",
    "I5 the concurrent writer's value SURVIVED (is " + PROF().subscription_status + ")");
  ok(rowsAppliedSince(mark5) === 2, "I5 only the successful attempt updated rows (rows=" + rowsAppliedSince(mark5) + ")");

  // ── I6 a required write that keeps losing rolls back, then a retry completes ─
  console.log("  --- I6 a required write failure rolls BOTH tables back, then a healthy retry ---");
  h.reset();
  member({});
  profile({});
  state.stripe = { [A]: { status: "active", customer: CUS } };
  invoice(A, "in_conflict");
  // A writer that keeps rewriting the mirror: every attempt's snapshot is stale by
  // the time the transaction runs.
  state.beforeUpdate = () => {
    const row = state.tables.profiles[0];
    if (row) row.subscription_status = row.subscription_status === "active" ? "past_due" : "active";
  };
  const mark6 = state.writes.length;
  r = await h.post();
  b = await h.bodyOf(r);
  const rpc6 = rpcSince(mark6);
  ok(r.status === 500, "I6 the failed required write refuses the delivery (got " + r.status + ")");
  ok((b.membershipFailures || []).some((f) => String(f).startsWith("invoice-ut_members:")),
    "I6 the failed required write is named (got " + JSON.stringify(b.membershipFailures || []) + ")");
  ok(rpc6.length === 2, "I6 both bounded attempts reached the database (rpc calls=" + rpc6.length + ")");
  ok(rpc6.every((w) => /BATCH14 CONFLICT/.test(String(w.error?.message || ""))),
    "I6 the failures are REAL database conflicts, not mocks");
  ok(rowsAppliedSince(mark6) === 0, "I6 the failed write applied ZERO rows (rows=" + rowsAppliedSince(mark6) + ")");
  ok(MEM().plan === "free" && MEM().stripe_subscription_id === A,
    "I6 the ut_members write was ROLLED BACK with the failing mirror (plan=" + MEM().plan + ")");

  state.beforeUpdate = null;
  const mark6b = state.writes.length;
  invoice(A, "in_conflict");
  r = await h.post();
  ok(r.status === 200, "I6 the healthy retry completes the delivery (got " + r.status + ")");
  ok(MEM().plan === "initiate" && PROF().plan === "initiate", "I6 the retry completed BOTH tables");
  ok(rpcSince(mark6b).length === 1, "I6 the healthy retry needed exactly one attempt (rpc calls=" + rpcSince(mark6b).length + ")");
  ok(rowsAppliedSince(mark6b) === 2, "I6 the healthy retry updated both tables' rows (rows=" + rowsAppliedSince(mark6b) + ")");

  // ── I7 a linkage that owns no profiles row is reported, NOT created ───────
  console.log("  --- I7 a missing profiles row is reported, never created ---");
  h.reset();
  member({});
  state.stripe = { [A]: { status: "active", customer: CUS } };
  invoice(A, "in_profiles_only");
  r = await h.post();
  b = await h.bodyOf(r);
  ok(r.status === 200, "I7 acknowledged (got " + r.status + ")");
  ok(MEM().plan === "initiate", "I7 the member row was written (is " + MEM().plan + ")");
  ok(state.tables.profiles.length === 0, "I7 no profiles row was created (rows=" + state.tables.profiles.length + ")");
  ok(h.inserts().length === 0, "I7 no INSERT was attempted, so no user_id was fabricated (inserts=" + h.inserts().length + ")");
  ok((b.membershipFailures || []).length === 0, "I7 a missing mirror is NOT a required-write failure (got " + JSON.stringify(b.membershipFailures || []) + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14AF_INVOICE_WRITE_CONSISTENCY_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
