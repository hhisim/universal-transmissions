#!/usr/bin/env node
/**
 * batch14t-snapshot-timing.js
 *
 * THE AUTHORIZATION SNAPSHOT MUST BE THE UPDATE SNAPSHOT.
 *
 * `readStoredLinkage` before Stripe is not the UPDATE snapshot: it returns
 * linkage ids and a plan/status summary, not the rows the write is conditioned
 * on. If the rows are re-read AFTER reconciliation, a change that lands during
 * the Stripe call is absorbed into the snapshot — the conditional write then
 * matches the NEW values, reports success, and the stale delivery OVERWRITES the
 * newer state it never saw.
 *
 * `state.afterStripe` fires after the provider has answered and before the caller
 * acts on it, so the interleaving is exact:
 *
 *   Stripe reconciliation observes A  ->  another writer installs B and Stripe
 *   now reports A canceled / B active  ->  the stale delivery must PRESERVE B.
 *
 * Each case asserts response, stored linkage and status, effective entitlement,
 * write attempts and affected rows. The reverse ordering (B installed before our
 * snapshot) is the control: same conserved outcome, no race at all.
 *
 * Covered paths: subscription create/update, subscription deletion, and
 * invoice.payment_failed.
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
const A = "sub_A";
const B = "sub_B";
const MEM = () => state.tables.ut_members[0] || {};
const warnings = (b) => (b.membershipWarnings || []).map(String).join(";");

function memberRow(fields) {
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A, ...fields,
  });
}
/** A concurrent writer that lands exactly once, in the post-Stripe window. */
function concurrent(fn) { let fired = false; return () => { if (fired) return; fired = true; fn(); }; }
/** Install B and move Stripe to A-canceled / B-active, exactly once. */
function installB() {
  return concurrent(() => {
    state.tables.ut_members[0].stripe_subscription_id = B;
    state.stripe = { [A]: { status: "canceled", customer: CUS }, [B]: { status: "active", customer: CUS } };
  });
}

(async () => {
  console.log("batch14t-snapshot-timing\n");

  // ── T1 lifecycle: reconciliation observes A, B is installed before planning ─
  console.log("  --- T1 subscription update: the stale delivery must preserve B ---");
  h.reset();
  memberRow({});
  state.stripe = { [A]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.updated", {
    id: A, customer: CUS, status: "active", current_period_end: 1900000000,
  });
  state.afterStripe = installB();

  let r = await h.post();
  let b = await h.bodyOf(r);
  let eff = await h.eff(EMAIL);
  console.error("    status=" + r.status + " warnings=" + warnings(b) +
    " sub=" + MEM().stripe_subscription_id + " attempts=" + JSON.stringify(h.attempts().map((w) => w.matched)));

  ok(r.status === 200, "T1 acknowledged (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B,
    "T1 the installed replacement is PRESERVED, not rewritten back to A (sub is " + MEM().stripe_subscription_id + ")");
  ok(MEM().plan === "initiate" && MEM().subscription_status === "active",
    "T1 stored plan/status preserved (" + MEM().plan + "/" + MEM().subscription_status + ")");
  ok(eff === "initiate", "T1 entitlement still granted by the governing subscription (got " + eff + ")");
  ok(warnings(b).includes("stale-lifecycle"),
    "T1 the superseded delivery BACKS OFF and says so (warnings " + JSON.stringify(b.membershipWarnings || []) + ")");
  ok(h.attempts().length === 1,
    "T1 the stale write was attempted once and lost its race (attempts=" + h.attempts().length + ")");
  ok(h.applied().length === 0,
    "T1 NO row was actually written (applied=" + h.applied().length + ")");

  // ── T1-control: B installed BEFORE our snapshot ──────────────────────────
  console.log("  --- T1-control: B already installed when the snapshot is taken ---");
  h.reset();
  memberRow({ stripe_subscription_id: B });
  state.stripe = { [A]: { status: "canceled", customer: CUS }, [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.updated", {
    id: A, customer: CUS, status: "active", current_period_end: 1900000000,
  });
  r = await h.post();
  b = await h.bodyOf(r);
  eff = await h.eff(EMAIL);
  ok(r.status === 200, "T1c acknowledged (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B, "T1c the replacement is preserved (sub " + MEM().stripe_subscription_id + ")");
  ok(warnings(b).includes("stale-lifecycle"), "T1c the supersession is named");
  ok(h.attempts().length === 0, "T1c no race occurred (attempts=" + h.attempts().length + ")");
  ok(h.applied().length === 0, "T1c nothing was written");
  ok(eff === "initiate", "T1c the conserved outcome matches T1");

  // ── T2 deletion: B installed after the deletion's reconciliation ─────────
  console.log("  --- T2 subscription deletion, B installed after reconciliation ---");
  h.reset();
  memberRow({});
  state.stripe = { [A]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.deleted", { id: A, customer: CUS, current_period_end: 1900000000 });
  state.afterStripe = installB();
  r = await h.post();
  b = await h.bodyOf(r);
  eff = await h.eff(EMAIL);
  console.error("    status=" + r.status + " warnings=" + warnings(b) +
    " sub=" + MEM().stripe_subscription_id + " attempts=" + JSON.stringify(h.attempts().map((w) => w.matched)));
  ok(r.status === 200, "T2 acknowledged (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B, "T2 the replacement survives the deletion (sub " + MEM().stripe_subscription_id + ")");
  ok(MEM().subscription_status === "active", "T2 the replacement's status is untouched (" + MEM().subscription_status + ")");
  ok(warnings(b).includes("stale-deletion"),
    "T2 the deletion is recognised as superseded (warnings " + JSON.stringify(b.membershipWarnings || []) + ")");
  ok(h.attempts().length === 1, "T2 the stale revocation was attempted once and lost (attempts=" + h.attempts().length + ")");
  ok(h.applied().length === 0, "T2 NO row was written (applied=" + h.applied().length + ")");
  ok(eff === "initiate", "T2 entitlement survives (got " + eff + ")");

  // ── T3 dunning: B installed after the payment_failed reconciliation ──────
  console.log("  --- T3 invoice.payment_failed, B installed after reconciliation ---");
  h.reset();
  memberRow({});
  state.stripe = { [A]: { status: "past_due", customer: CUS } };
  h.nextEvent("invoice.payment_failed", { id: "in_1", customer: CUS, subscription: A });
  state.afterStripe = installB();
  r = await h.post();
  b = await h.bodyOf(r);
  eff = await h.eff(EMAIL);
  console.error("    status=" + r.status + " warnings=" + warnings(b) +
    " sub=" + MEM().stripe_subscription_id + " rowstatus=" + MEM().subscription_status +
    " attempts=" + JSON.stringify(h.attempts().map((w) => w.matched)));
  ok(r.status === 200, "T3 acknowledged (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B, "T3 the replacement survives dunning (sub " + MEM().stripe_subscription_id + ")");
  ok(MEM().subscription_status !== "past_due",
    "T3 dunning did NOT stamp past_due on a row Stripe now reports active (" + MEM().subscription_status + ")");
  ok(warnings(b).includes("payment_failed-ignored"),
    "T3 the stale payment failure is ignored and named (warnings " + JSON.stringify(b.membershipWarnings || []) + ")");
  ok(h.attempts().length === 1, "T3 the stale dunning write was attempted once and lost (attempts=" + h.attempts().length + ")");
  ok(h.applied().length === 0, "T3 NO row was written (applied=" + h.applied().length + ")");
  ok(eff === "initiate", "T3 entitlement survives (got " + eff + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14T_SNAPSHOT_TIMING_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
