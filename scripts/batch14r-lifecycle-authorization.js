#!/usr/bin/env node
/**
 * batch14r-lifecycle-authorization.js
 *
 * E5 — CONTRADICTORY NON-NULL CUSTOMER LINKAGE MUST FAIL CLOSED.
 *
 * A profile stores customer `cus_OTHER` and subscription `sub_A`. Stripe verifies
 * that `sub_A` belongs to `cus_1`. The pre-repair handler acknowledged 200,
 * rewrote the profile's customer to `cus_1` and granted `initiate` — a
 * subscription-only match silently overriding the customer the row itself names.
 *
 * Two rules are under test:
 *
 *   1. A contradiction is REFUSED, never repaired. Two identity claims about one
 *      row, neither provably stale, is not something this code may resolve.
 *   2. BOTH tables are validated before EITHER is written, so a rejection
 *      discovered while validating the second table cannot follow an avoidable
 *      write to the first. The contradiction below lives in the SECOND table on
 *      purpose: the first table is perfectly writable, and must still be left
 *      untouched.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { createHarness } = require(path.join(ROOT, "scripts/lib/ut-membership-webhook-harness.cjs"));

const h = createHarness(ROOT);
const { state } = h;

let passed = 0; const failures = [];
function ok(c, l) { if (c) { passed += 1; return true; } failures.push(l); console.error("  FAIL:", l); return false; }

const EMAIL = "member@example.com";
const CUS = "cus_1";            // the VERIFIED customer
const OTHER = "cus_OTHER";      // what the row itself claims
const A = "sub_A";              // Stripe says this belongs to CUS
const PROF = () => state.tables.profiles[0] || {};
const MEM = () => state.tables.ut_members[0] || {};
const named = (b, needle) => (b.membershipFailures || []).some((f) => String(f).includes(needle));

(async () => {
  console.log("batch14r-lifecycle-authorization\n");

  // ── E5a: the contradiction is in the SECOND table ────────────────────────
  console.log("  --- E5a contradiction in the second table (profiles) ---");
  h.reset();
  // The first table is clean and perfectly writable. It must still be untouched.
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "free", subscription_status: "canceled",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, display_name: "M", plan: "free", subscription_status: "canceled",
    stripe_customer_id: OTHER, stripe_subscription_id: A,
  });
  state.stripe = { [A]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.created", {
    id: A, customer: CUS, status: "active", current_period_end: 1900000000,
  });

  let r = await h.post();
  let b = await h.bodyOf(r);
  console.error("    status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) +
    " writes=" + JSON.stringify(state.writes));

  ok(r.status === 500, "E5a the contradiction refuses the delivery (got " + r.status + ")");
  ok(named(b, "lifecycle_contradictory_linkage"),
    "E5a the contradiction is named (got " + JSON.stringify(b.membershipFailures || []) + ")");
  ok(named(b, "profiles:"), "E5a the rejection names the table it was found in");
  ok(state.writes.length === 0,
    "E5a NO write is attempted at all — the writable first table is not written before the second is validated (got " +
    JSON.stringify(state.writes.map((w) => w.table + "/" + w.op + "/" + w.matched)) + ")");
  ok(PROF().stripe_customer_id === OTHER,
    "E5a the mistaken customer is NOT silently repaired (got " + PROF().stripe_customer_id + ")");
  ok(PROF().plan === "free", "E5a the profile gains no entitlement (plan " + PROF().plan + ")");
  ok(MEM().plan === "free" && MEM().subscription_status === "canceled",
    "E5a the clean first table is unchanged too (" + MEM().plan + "/" + MEM().subscription_status + ")");
  ok(state.tables.profiles.length === 1 && state.tables.ut_members.length === 1,
    "E5a no row was created");
  ok(h.inserts().length === 0, "E5a no insert was attempted");

  // ── E5b: the contradiction is in the FIRST table ─────────────────────────
  console.log("  --- E5b contradiction in the first table (ut_members) ---");
  h.reset();
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "free", subscription_status: "canceled",
    stripe_customer_id: OTHER, stripe_subscription_id: A,
  });
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, display_name: "M", plan: "free", subscription_status: "canceled",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.stripe = { [A]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.created", {
    id: A, customer: CUS, status: "active", current_period_end: 1900000000,
  });
  r = await h.post();
  b = await h.bodyOf(r);
  ok(r.status === 500, "E5b a contradiction in the first table also refuses (got " + r.status + ")");
  ok(named(b, "lifecycle_contradictory_linkage"), "E5b the contradiction is named");
  ok(state.writes.length === 0, "E5b nothing was written");
  ok(PROF().plan === "free", "E5b the second table is untouched (plan " + PROF().plan + ")");

  // ── E5c: control — an ABSENT customer is not a contradiction ─────────────
  console.log("  --- E5c control: subscription-only linkage (customer NULL) is allowed ---");
  h.reset();
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, display_name: "M", plan: "free", subscription_status: "canceled",
    stripe_customer_id: null, stripe_subscription_id: A,
  });
  state.stripe = { [A]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.created", {
    id: A, customer: CUS, status: "active", current_period_end: 1900000000,
  });
  r = await h.post();
  b = await h.bodyOf(r);
  ok(r.status === 200, "E5c a row with NO customer recorded is not a contradiction (got " + r.status +
    ", failures=" + JSON.stringify(b.membershipFailures || []) + ")");
  ok(PROF().plan === "initiate", "E5c the subscription-only row is entitled (plan " + PROF().plan + ")");
  ok(PROF().stripe_customer_id === CUS, "E5c and its customer is recorded (got " + PROF().stripe_customer_id + ")");
  ok(PROF().stripe_subscription_id === A, "E5c and its subscription is recorded");
  ok(h.applied().length === 1, "E5c exactly one row was actually written (got " + h.applied().length + ")");

  // ── E5d: control — a MATCHING customer is not a contradiction ────────────
  console.log("  --- E5d control: matching customer linkage is allowed ---");
  h.reset();
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, display_name: "M", plan: "free", subscription_status: "canceled",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.stripe = { [A]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.created", {
    id: A, customer: CUS, status: "active", current_period_end: 1900000000,
  });
  r = await h.post();
  b = await h.bodyOf(r);
  ok(r.status === 200, "E5d an agreeing customer is not a contradiction (got " + r.status + ")");
  ok(PROF().plan === "initiate", "E5d the row is entitled (plan " + PROF().plan + ")");
  ok(h.applied().length === 1, "E5d exactly one row was actually written");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14R_AUTHORIZATION_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
