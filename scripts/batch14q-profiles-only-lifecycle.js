#!/usr/bin/env node
/**
 * batch14q-profiles-only-lifecycle.js
 *
 * FAILING REGRESSIONS for the profiles-only lifecycle defect. Real handler,
 * authority helper, writer and reader. Stripe seeded EXPLICITLY per id.
 *
 * No ut_members row: the member exists only as a profiles row, which is legal
 * under option 3. Events carry NO metadata.email, so resolution must go through
 * the trusted stored customer linkage.
 *
 * The defect: both membership writes were set-based filters whose affected-row
 * count was discarded. The `ut_members` statement matched ZERO rows, the
 * `profiles` statement — filtered on the event's absent `metadata.email` — never
 * ran at all, and the delivery was acknowledged 200. A cancellation left the
 * member PAID and a reactivation left them unentitled.
 *
 * REAL POSTGRESQL, NOT A MOCK CLIENT (harness fidelity).
 * This suite used to roll its own in-memory client. That client implemented only
 * `from()`, so once the lifecycle write moved onto the atomic RPC path every
 * attempt failed with `client.rpc is not a function` and the suite could no longer
 * exercise the code it exists to guard. It now drives the SHARED harness, which
 * executes the atomic lifecycle write as real SQL against a private PostgreSQL, so
 * the affected-row counts asserted below are Postgres' own, not a simulation's.
 *
 * Q3's "the UPDATE affects no row" is therefore a genuine compare-and-set miss:
 * a concurrent writer moves `subscription_status` to `past_due` between our
 * snapshot and our statement, the guard no longer matches, and Postgres reports
 * zero affected rows. `past_due` is deliberately NOT a revoking status, so the
 * member stays paid — which is what makes "nothing was written" observable.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const { createHarness } = require(path.join(ROOT, "scripts/lib/ut-membership-webhook-harness.cjs"));

const h = createHarness(ROOT);

let passed = 0; const failures = [];
function ok(c, l) { if (c) { passed += 1; return true; } failures.push(l); console.error("  FAIL:", l); return false; }

const EMAIL = "member@example.com", CUS = "cus_1", A = "sub_A", B = "sub_B";

const PROF = () => h.state.tables.profiles[0] || {};
const inserts = () => h.inserts();
/** Rows that actually CHANGED — Postgres' own affected-row count, not an attempt. */
const applied = () => h.applied();
const named = (b, needle) => (b.membershipFailures || []).some((f) => String(f).includes(needle));

(async () => {
  console.log("batch14q-profiles-only-lifecycle  [real PostgreSQL]\n");

  // Q1 — profiles-only at initiate, cancellation, no metadata.email
  console.log("  --- Q1 profiles-only initiate, canceled, no metadata.email ---");
  h.reset();
  h.state.tables.profiles.push({ user_id: "u1", email: EMAIL, display_name: "M", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  h.state.stripe[A] = { status: "canceled", customer: CUS };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  let r = await h.post();
  let b = await h.bodyOf(r);
  let q1 = await h.effRes(EMAIL);
  console.error("    status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) + " applied=" + applied().length);
  ok(r.status === 200, "Q1 -> 200 (got " + r.status + ")");
  ok(applied().length > 0,
    "Q1 at least one required write actually affected a row (applied=" + applied().length + ", attempts=" + h.attempts().length + ")");
  ok(PROF().plan !== "initiate" || PROF().subscription_status === "canceled",
    "Q1 the profiles row reflects the cancellation (plan=" + PROF().plan + " status=" + PROF().subscription_status + ")");
  // STRENGTHENED: the reader must RESOLVE, and resolve to a non-paid plan.
  // "READ_ERROR" is a lookup failure, i.e. no evidence of revocation at all.
  ok(q1.ok === true, "Q1 entitlement resolves without a read error (ok=" + q1.ok + (q1.ok ? "" : ", reason=" + q1.reason) + ")");
  ok(q1.ok === true && (q1.membership.plan === "guest" || q1.membership.plan === "free"),
    "Q1 effective entitlement is revoked to guest/free (got " + (q1.ok ? q1.membership.plan : "READ_ERROR") + ")");
  // No identity invented, no row created.
  ok(inserts().length === 0, "Q1 no membership row was inserted to make the update succeed (got " + JSON.stringify(inserts()) + ")");
  ok(h.state.tables.profiles.length === 1 && PROF().user_id === "u1",
    "Q1 the existing profile identity is untouched (rows=" + h.state.tables.profiles.length + ", user_id=" + PROF().user_id + ")");
  ok(h.state.tables.ut_members.length === 0, "Q1 no ut_members row was invented (rows=" + h.state.tables.ut_members.length + ")");

  // Q2 — profiles-only at free, genuine replacement B active, no metadata.email
  console.log("  --- Q2 profiles-only free, replacement B active, no metadata.email ---");
  h.reset();
  h.state.tables.profiles.push({ user_id: "u1", email: EMAIL, display_name: "M", plan: "free", subscription_status: "canceled", stripe_customer_id: CUS, stripe_subscription_id: null });
  h.state.stripe[B] = { status: "active", customer: CUS };
  h.nextEvent("customer.subscription.created", { id: B, customer: CUS, status: "active", current_period_end: 1900000000 });
  r = await h.post();
  b = await h.bodyOf(r);
  let q2 = await h.effRes(EMAIL);
  console.error("    status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) + " applied=" + applied().length);
  ok(r.status === 200, "Q2 -> 200 (got " + r.status + ")");
  ok(applied().length > 0,
    "Q2 at least one required write actually affected a row (applied=" + applied().length + ")");
  // STRENGTHENED: BOTH are required. Recording B's linkage while leaving the
  // member unentitled, or restoring entitlement without recording which
  // subscription governs, are each an incomplete repair.
  ok(PROF().stripe_subscription_id === B,
    "Q2 the profiles row records B's linkage (sub=" + PROF().stripe_subscription_id + ")");
  ok(q2.ok === true && q2.membership.plan === "initiate",
    "Q2 entitlement is restored to initiate (got " + (q2.ok ? q2.membership.plan : "READ_ERROR") + ")");
  ok(inserts().length === 0, "Q2 no membership row was inserted to make the update succeed (got " + JSON.stringify(inserts()) + ")");
  ok(h.state.tables.profiles.length === 1 && PROF().user_id === "u1",
    "Q2 the existing profile identity is untouched (rows=" + h.state.tables.profiles.length + ", user_id=" + PROF().user_id + ")");
  ok(h.state.tables.ut_members.length === 0, "Q2 no ut_members row was invented (rows=" + h.state.tables.ut_members.length + ")");

  // Q3 — a lost race must be RE-RESOLVED, never acknowledged from the stale snapshot
  //
  // The contract here is Batch 14r/14t, which SUPERSEDES this suite's original Q3.
  // The original asserted that an UPDATE affecting no row is refused with 500 and
  // retried by the caller. The handler no longer does that: on a compare-and-set
  // miss it recognises the lost race, re-resolves from FRESH linkage and FRESH
  // Stripe state, and converges. A 500 would now be the defect, not the fix.
  console.log("  --- Q3a a lost race is re-resolved, not acknowledged from the stale snapshot ---");
  h.reset();
  h.state.tables.profiles.push({ user_id: "u1", email: EMAIL, display_name: "M", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  h.state.stripe[A] = { status: "canceled", customer: CUS };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  // A concurrent writer moves the row between our snapshot and our statement, so
  // the compare-and-set guard no longer matches and the UPDATE affects NO row.
  // `past_due` is not a revoking status, so nothing here can be mistaken for the
  // revocation having happened.
  h.state.beforeUpdate = () => { h.state.tables.profiles[0].subscription_status = "past_due"; };
  r = await h.post();
  b = await h.bodyOf(r);
  let q3 = await h.effRes(EMAIL);
  console.error("    status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) + " attempts=" + h.attempts().length + " eff=" + (q3.ok ? q3.membership.plan : "READ_ERROR"));
  ok(r.status === 200, "Q3a a lost race does not 500 (got " + r.status + ")");
  ok(named(b, "profiles:") === false, "Q3a no failure is reported once the race is resolved (got " + JSON.stringify(b.membershipFailures || []) + ")");
  ok(h.attempts().length >= 2, "Q3a the conflict forced a SECOND attempt (attempts=" + h.attempts().length + ")");
  ok(applied().length > 0, "Q3a the fresh resolution actually wrote (applied=" + applied().length + ")");
  ok(q3.ok === true && (q3.membership.plan === "guest" || q3.membership.plan === "free"),
    "Q3a the fresh resolution completed the revocation (got " + (q3.ok ? q3.membership.plan : "READ_ERROR") + ")");

  // Q3b — THE DECISIVE ONE: the re-resolution reconciles Stripe AFRESH.
  // Stripe first says `canceled` (that is what our first snapshot holds). While the
  // race is lost, Stripe's answer CHANGES to `active`. A handler that reuses its
  // old authority result revokes the member; one that reconciles afresh does not.
  console.log("  --- Q3b the re-resolution uses FRESH Stripe state, not the old result ---");
  h.reset();
  h.state.tables.profiles.push({ user_id: "u1", email: EMAIL, display_name: "M", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  h.state.stripe[A] = { status: "canceled", customer: CUS };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  h.state.beforeUpdate = () => {
    h.state.tables.profiles[0].subscription_status = "past_due";
    h.state.stripe[A] = { status: "active", customer: CUS };
  };
  r = await h.post();
  b = await h.bodyOf(r);
  q3 = await h.effRes(EMAIL);
  console.error("    status=" + r.status + " attempts=" + h.attempts().length + " eff=" + (q3.ok ? q3.membership.plan : "READ_ERROR") + " stripeNow=active");
  ok(r.status === 200, "Q3b -> 200 (got " + r.status + ")");
  ok(h.attempts().length >= 2, "Q3b the conflict forced fresh reconciliation (attempts=" + h.attempts().length + ")");
  ok(q3.ok === true && q3.membership.plan === "initiate",
    "Q3b the member is NOT revoked — the stale `canceled` result was not reused (got " + (q3.ok ? q3.membership.plan : "READ_ERROR") + ")");
  ok(PROF().plan === "initiate",
    "Q3b the stored plan follows the FRESH answer, not the stale snapshot (plan=" + PROF().plan + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14Q_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
