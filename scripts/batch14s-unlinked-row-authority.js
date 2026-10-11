#!/usr/bin/env node
/**
 * batch14s-unlinked-row-authority.js
 *
 * ⚠ PINNED DEFECT — THIS SUITE IS EXPECTED TO FAIL. ⚠
 *
 * It is committed RED on purpose. It asserts the TARGET behaviour of the
 * bounded authority proposal in
 * docs/BATCH14R-LIFECYCLE-AUTHORIZATION-AND-CONCURRENCY.md §5, which is NOT
 * implemented: the fix is a reader-side rule and it is the owner's call.
 * A green run here would mean either the proposal landed, or the suite was
 * weakened — check which.
 *
 * E2b promoted: ONE table carries the verified Stripe linkage, the OTHER holds a
 * row for the same address that carries no linkage at all. The lifecycle writer
 * cannot address that row — an address from the event payload is not an
 * authority, and rewriting the row by email is explicitly forbidden — so the
 * unlinked row keeps whatever it says and the shared reader ranks it anyway.
 *
 *   U1 cancellation: the linked row is revoked to `guest`, an unlinked row at
 *      `initiate`/`active` outranks it → the member stays PAID, acknowledged 200.
 *   U2 reactivation: the linked row is granted `initiate`, an unlinked row whose
 *      `subscription_status` is `canceled` is the reader's revocation authority
 *      → the member stays REVOKED, acknowledged 200.
 *
 * Both cases also assert the unlinked row is NOT rewritten by address, which is
 * the part of the proposal that must hold whichever way the identity question is
 * settled.
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
const PROF = () => state.tables.profiles[0] || {};
const MEM = () => state.tables.ut_members[0] || {};
const writesTo = (table) => state.writes.filter((w) => w.table === table);

(async () => {
  console.log("batch14s-unlinked-row-authority  [PINNED DEFECT — EXPECTED RED]\n");

  // ── U1 cancellation: an unlinked PAID row keeps access ───────────────────
  console.log("  --- U1 cancellation, unlinked PAID row in the other table ---");
  h.reset();
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, display_name: "M", plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: null, stripe_subscription_id: null,
  });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.updated", {
    id: A, customer: CUS, status: "canceled", current_period_end: 1900000000,
  });

  let r = await h.post();
  let b = await h.bodyOf(r);
  let e = await h.eff(EMAIL);
  console.error("    status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) +
    " eff=" + e + " writes=" + JSON.stringify(state.writes.map((w) => w.table + "/" + w.matched)));

  ok(r.status === 200, "U1 the delivery itself is acknowledged (got " + r.status + ")");
  ok(PROF().plan !== "initiate", "U1 the LINKED row is revoked (plan " + PROF().plan + ")");
  ok(writesTo("ut_members").length === 0,
    "U1 the unlinked row is NOT rewritten by address (ut_members writes " + writesTo("ut_members").length + ")");
  ok(MEM().plan === "initiate" && MEM().subscription_status === "active",
    "U1 the unlinked row keeps its own values (" + MEM().plan + "/" + MEM().subscription_status + ")");
  ok(e === "guest" || e === "free",
    "U1 TARGET: entitlement is revoked — an unaddressable row must not outrank the linked one (got " + e + ")");

  // ── U2 reactivation: an unlinked REVOKED row blocks access ───────────────
  console.log("  --- U2 reactivation, unlinked REVOKED row in the other table ---");
  h.reset();
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "guest", subscription_status: "canceled",
    stripe_customer_id: null, stripe_subscription_id: null,
  });
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, display_name: "M", plan: "free", subscription_status: "canceled",
    stripe_customer_id: CUS, stripe_subscription_id: null,
  });
  state.stripe = { [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.created", {
    id: B, customer: CUS, status: "active", current_period_end: 1900000000,
  });

  r = await h.post();
  b = await h.bodyOf(r);
  e = await h.eff(EMAIL);
  console.error("    status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) +
    " eff=" + e + " writes=" + JSON.stringify(state.writes.map((w) => w.table + "/" + w.matched)));

  ok(r.status === 200, "U2 the delivery itself is acknowledged (got " + r.status + ")");
  ok(PROF().plan === "initiate", "U2 the LINKED row is granted (plan " + PROF().plan + ")");
  ok(writesTo("ut_members").length === 0,
    "U2 the unlinked row is NOT rewritten by address (ut_members writes " + writesTo("ut_members").length + ")");
  ok(MEM().subscription_status === "canceled",
    "U2 the unlinked row keeps its own status (" + MEM().subscription_status + ")");
  ok(e === "initiate",
    "U2 TARGET: entitlement is granted — an unaddressable revocation record must not veto a verified grant (got " + e + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  console.log("");
  console.log("PINNED DEFECT: the failures above are the proposal in §5 of the review");
  console.log("document, not a regression introduced by this batch.");
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14S_UNLINKED_ROW_TARGET_MET (the proposal landed — verify it was not weakened)");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
