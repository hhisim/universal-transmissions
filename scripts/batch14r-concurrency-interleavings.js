#!/usr/bin/env node
/**
 * batch14r-concurrency-interleavings.js
 *
 * DETERMINISTIC INTERLEAVINGS for the snapshot-to-write window.
 *
 * Each scenario runs in BOTH completion orders:
 *
 *   order A — our authorization snapshot is read, the concurrent writer lands,
 *             our conditional write then loses its race and the handler
 *             re-resolves from FRESH linkage and FRESH Stripe state.
 *   order B — the concurrent writer lands BEFORE our snapshot, so the handler
 *             reads the new state and never races at all.
 *
 * The two orders must converge on the same conserved outcome; what differs is
 * the path (a lost race versus none), which is asserted explicitly.
 *
 * `state.beforeUpdate` fires inside the update branch only — after the resolving
 * reads, before the statement matches — so order A is exact, not timing-based.
 *
 * Scenarios: customer reassignment, replacement subscription, cancellation
 * versus grant, and a status-only change. Every case asserts final linkage,
 * entitlement, response and affected rows.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { createHarness } = require(path.join(ROOT, "scripts/lib/ut-membership-webhook-harness.cjs"));

const h = createHarness(ROOT);
const { state } = h;

let passed = 0; const failures = [];
function ok(c, l) { if (c) { passed += 1; return true; } failures.push(l); console.error("  FAIL:", l); return false; }

const EMAIL = "member@example.com";
const CUS = "cus_1";
const OTHER = "cus_OTHER";
const A = "sub_A";
const B = "sub_B";
const MEM = () => state.tables.ut_members[0] || {};
const warnings = (b) => (b.membershipWarnings || []).map(String).join(";");
const named = (b, needle) => (b.membershipFailures || []).some((f) => String(f).includes(needle));

function memberRow(fields) {
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A, ...fields,
  });
}
/** A concurrent writer that lands exactly once, in the update window. */
function concurrent(fn) {
  let fired = false;
  return () => { if (fired) return; fired = true; fn(); };
}

(async () => {
  console.log("batch14r-concurrency-interleavings\n");

  // ── S1 customer reassignment ─────────────────────────────────────────────
  console.log("  --- S1 customer reassignment ---");
  h.reset();
  memberRow({});
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  const reassign = concurrent(() => { state.tables.ut_members[0].stripe_customer_id = OTHER; });
  state.beforeUpdate = (table) => { if (table === "ut_members") reassign(); };
  let r = await h.post();
  let b = await h.bodyOf(r);
  console.error("    order A: status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) +
    " attempts=" + JSON.stringify(h.attempts().map((w) => w.table + "/" + w.matched)));
  ok(r.status === 500, "S1-A the reassigned row refuses the delivery (got " + r.status + ")");
  ok(named(b, "lifecycle_contradictory_linkage"), "S1-A the contradiction is named");
  ok(h.attempts().length === 1, "S1-A the snapshot-to-write window really was exercised (attempts=" + h.attempts().length + ")");
  ok(h.applied().length === 0, "S1-A no row was actually written (applied=" + h.applied().length + ")");
  ok(MEM().stripe_customer_id === OTHER, "S1-A the concurrent reassignment stands (cust " + MEM().stripe_customer_id + ")");
  ok(MEM().plan === "initiate" && MEM().subscription_status === "active",
    "S1-A the row keeps its stored plan/status (" + MEM().plan + "/" + MEM().subscription_status + ")");
  ok(await h.eff(EMAIL) === "initiate", "S1-A entitlement is unchanged by the refusal");

  h.reset();
  memberRow({ stripe_customer_id: OTHER });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  r = await h.post();
  b = await h.bodyOf(r);
  ok(r.status === 500, "S1-B the contradiction is refused on the first look too (got " + r.status + ")");
  ok(named(b, "lifecycle_contradictory_linkage"), "S1-B the contradiction is named");
  ok(h.attempts().length === 0, "S1-B no write was attempted at all (attempts=" + h.attempts().length + ")");
  ok(MEM().stripe_customer_id === OTHER && MEM().plan === "initiate", "S1-B the row is untouched");

  // ── S2 replacement subscription ──────────────────────────────────────────
  console.log("  --- S2 replacement subscription ---");
  h.reset();
  memberRow({});
  state.stripe = { [A]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "active", current_period_end: 1900000000 });
  const replaced = concurrent(() => {
    state.tables.ut_members[0].stripe_subscription_id = B;
    state.stripe = { [A]: { status: "canceled", customer: CUS }, [B]: { status: "active", customer: CUS } };
  });
  state.beforeUpdate = (table) => { if (table === "ut_members") replaced(); };
  r = await h.post();
  b = await h.bodyOf(r);
  console.error("    order A: status=" + r.status + " warnings=" + warnings(b) +
    " attempts=" + JSON.stringify(h.attempts().map((w) => w.matched)));
  ok(r.status === 200, "S2-A the delivery is acknowledged (got " + r.status + ")");
  ok(warnings(b).includes("stale-lifecycle"), "S2-A the superseded event backs off (warnings " + warnings(b) + ")");
  ok(h.applied().length === 0, "S2-A our write never landed (applied=" + h.applied().length + ")");
  ok(h.attempts().length === 1, "S2-A the lost race was exercised (attempts=" + h.attempts().length + ")");
  ok(MEM().stripe_subscription_id === B, "S2-A the replacement linkage stands (sub " + MEM().stripe_subscription_id + ")");
  ok(await h.eff(EMAIL) === "initiate", "S2-A entitlement untouched");

  h.reset();
  memberRow({ stripe_subscription_id: B });
  state.stripe = { [A]: { status: "canceled", customer: CUS }, [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "active", current_period_end: 1900000000 });
  r = await h.post();
  b = await h.bodyOf(r);
  ok(r.status === 200, "S2-B the superseded event is acknowledged (got " + r.status + ")");
  ok(warnings(b).includes("stale-lifecycle"), "S2-B the supersession is named");
  ok(h.attempts().length === 0, "S2-B no write was attempted (attempts=" + h.attempts().length + ")");
  ok(MEM().stripe_subscription_id === B && await h.eff(EMAIL) === "initiate",
    "S2-B the conserved outcome matches order A");

  // ── S3 cancellation versus grant ─────────────────────────────────────────
  console.log("  --- S3 grant racing a cancellation ---");
  h.reset();
  memberRow({ plan: "free", subscription_status: "canceled", stripe_subscription_id: null });
  state.stripe = { [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.created", { id: B, customer: CUS, status: "active", current_period_end: 1900000000 });
  const cancelled = concurrent(() => {
    state.tables.ut_members[0].plan = "guest";
    state.tables.ut_members[0].subscription_status = "canceled";
  });
  state.beforeUpdate = (table) => { if (table === "ut_members") cancelled(); };
  r = await h.post();
  b = await h.bodyOf(r);
  console.error("    order A: status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) +
    " attempts=" + JSON.stringify(h.attempts().map((w) => w.matched)));
  ok(r.status === 200, "S3-A the grant completes after one lost race (got " + r.status + ")");
  ok(h.attempts().length === 2, "S3-A exactly one re-resolution happened (attempts=" + h.attempts().length + ")");
  ok(h.applied().length === 1, "S3-A exactly one row was actually written (applied=" + h.applied().length + ")");
  ok(MEM().plan === "initiate" && MEM().subscription_status === "active",
    "S3-A the grant won on the FRESH snapshot (" + MEM().plan + "/" + MEM().subscription_status + ")");
  ok(MEM().stripe_subscription_id === B, "S3-A final linkage is B (got " + MEM().stripe_subscription_id + ")");
  ok(await h.eff(EMAIL) === "initiate", "S3-A entitlement is granted");

  h.reset();
  memberRow({ plan: "guest", subscription_status: "canceled", stripe_subscription_id: null });
  state.stripe = { [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.created", { id: B, customer: CUS, status: "active", current_period_end: 1900000000 });
  r = await h.post();
  ok(r.status === 200, "S3-B the grant completes (got " + r.status + ")");
  ok(h.attempts().length === 1, "S3-B no race occurred (attempts=" + h.attempts().length + ")");
  ok(h.applied().length === 1, "S3-B exactly one row written");
  ok(MEM().plan === "initiate" && MEM().stripe_subscription_id === B && await h.eff(EMAIL) === "initiate",
    "S3-B the conserved outcome matches order A");

  // ── S4 status-only change ────────────────────────────────────────────────
  console.log("  --- S4 status-only change ---");
  h.reset();
  memberRow({});
  state.stripe = { [A]: { status: "past_due", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "past_due", current_period_end: 1900000000 });
  const statusOnly = concurrent(() => { state.tables.ut_members[0].subscription_status = "trialing"; });
  state.beforeUpdate = (table) => { if (table === "ut_members") statusOnly(); };
  r = await h.post();
  b = await h.bodyOf(r);
  console.error("    order A: status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) +
    " attempts=" + JSON.stringify(h.attempts().map((w) => w.matched)));
  ok(r.status === 200, "S4-A the status write completes after one lost race (got " + r.status + ")");
  ok(h.attempts().length === 2, "S4-A exactly one re-resolution happened (attempts=" + h.attempts().length + ")");
  ok(h.applied().length === 1, "S4-A exactly one row was actually written (applied=" + h.applied().length + ")");
  ok(MEM().subscription_status === "past_due", "S4-A the authoritative status won (got " + MEM().subscription_status + ")");
  ok(MEM().plan === "initiate", "S4-A the plan is unchanged (got " + MEM().plan + ")");
  ok(MEM().stripe_subscription_id === A && MEM().stripe_customer_id === CUS, "S4-A linkage is untouched");
  ok(await h.eff(EMAIL) === "initiate", "S4-A dunning keeps access");

  h.reset();
  memberRow({ subscription_status: "trialing" });
  state.stripe = { [A]: { status: "past_due", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "past_due", current_period_end: 1900000000 });
  r = await h.post();
  ok(r.status === 200, "S4-B the status write completes (got " + r.status + ")");
  ok(h.attempts().length === 1, "S4-B no race occurred (attempts=" + h.attempts().length + ")");
  ok(MEM().subscription_status === "past_due" && await h.eff(EMAIL) === "initiate",
    "S4-B the conserved outcome matches order A");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14R_CONCURRENCY_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
