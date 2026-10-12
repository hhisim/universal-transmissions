#!/usr/bin/env node
/**
 * batch14ah-durable-authority.js
 *
 * DURABLE ENTITLEMENT AUTHORITY.
 *
 * The identifier-presence rule (Batch 14ag) treated "this row records a Stripe
 * identifier" as authority. That is not evidence of anything: the CHECKOUT path
 * writes `stripe_customer_id` at CUSTOMER CREATION, with no subscription
 * reconciliation behind it. So a customer id alone could decide entitlement.
 *
 * The two counterexamples are the defect, added BEFORE the repair:
 *
 *   X1  customer creation alone must not SUPPRESS legitimate legacy paid access —
 *       a legacy paid row must not be outranked by a row carrying only a checkout
 *       customer id.
 *   X2  customer creation alone must not BYPASS a recorded revocation — a row with
 *       only a checkout customer id must not lift a `canceled` record.
 *
 * The repair: a row decides entitlement only when it carries explicit evidence of
 * a COMPLETED, VERIFIED subscription reconciliation — `entitlement_authority_at`,
 * written atomically by the reconciled lifecycle writers and NEVER cleared by
 * cancellation. `docs/BATCH14AH-DURABLE-AUTHORITY.md` is the contract.
 *
 * The controls below cover what the rule must NOT do (customer-only checkout,
 * profiles-only membership) and what it must still refuse (contradictory records).
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
const OTHER_CUS = "cus_OTHER";
const A = "sub_A";
const B = "sub_B";
/** What a completed, verified reconciliation records. */
const STAMP = "2026-05-01T00:00:00.000Z";
const PROF = () => state.tables.profiles[0] || {};
const MEM = () => state.tables.ut_members[0] || {};
const rpcSince = (mark) => state.writes.slice(mark).filter((w) => w.op === "rpc");
const outcomeOf = (rpc, table) => (rpc?.data || []).find((o) => o?.target === table) || null;

const memberState = (row) => JSON.stringify({
  id: row.id,
  email: row.email,
  plan: row.plan ?? null,
  subscription_status: row.subscription_status ?? null,
  stripe_customer_id: row.stripe_customer_id ?? null,
  stripe_subscription_id: row.stripe_subscription_id ?? null,
  current_period_end: row.current_period_end ?? null,
  entitlement_authority_at: row.entitlement_authority_at ?? null,
});

/** Direct reader controls: stored rows only, no handler, no Stripe. */
function seed(profiles, members) {
  h.reset();
  for (const p of profiles || []) state.tables.profiles.push({ email: EMAIL, ...p });
  for (const m of members || []) state.tables.ut_members.push({ id: "m1", email: EMAIL, ...m });
}
const read = () => h.effRes(EMAIL);

(async () => {
  console.log("batch14ah-durable-authority\n");

  // ── X1 the counterexample: customer creation must not suppress legacy access ─
  console.log("  --- X1 a checkout customer id must not suppress a legacy paid row ---");
  seed(
    // A legitimate legacy paid member: no linkage at all, still paying.
    [{ user_id: "u1", plan: "initiate", subscription_status: "active" }],
    // What `api/billing/checkout` writes at customer creation: a customer id and
    // plan 'free'. No subscription, no reconciliation, no authority.
    [{ plan: "free", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: null }]
  );
  let res = await read();
  let plan = res.ok ? res.membership.plan : "error";
  console.error("    effective plan = " + plan);
  ok(res.ok && plan === "initiate",
    "X1 customer creation alone must not suppress legitimate legacy paid access (got " + plan + ")");

  // ── X2 the counterexample: customer creation must not bypass a revocation ────
  console.log("  --- X2 a checkout customer id must not bypass a recorded revocation ---");
  seed(
    [{ user_id: "u1", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: null }],
    [{ plan: "guest", subscription_status: "canceled", stripe_customer_id: null, stripe_subscription_id: null }]
  );
  res = await read();
  plan = res.ok ? res.membership.plan : "error";
  console.error("    effective plan = " + plan);
  ok(res.ok && plan === "guest",
    "X2 customer creation alone must not bypass a recorded revocation (got " + plan + ")");

  // ── N1 customer-only checkout, alone: no manufactured authority ─────────────
  console.log("  --- N1 a checkout row on its own ---");
  seed([], [{ plan: "free", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: null }]);
  res = await read();
  ok(res.ok && res.membership.plan === "free",
    "N1 a customer-only row reports its own plan, nothing more (got " + (res.ok ? res.membership.plan : "error") + ")");
  ok(res.ok && (res.membership.unaddressable || []).length === 0,
    "N1 nothing is unaddressable when no row has reconciliation evidence (got " + JSON.stringify(res.ok ? res.membership.unaddressable : null) + ")");

  // ── N2 profiles-only membership ─────────────────────────────────────────────
  console.log("  --- N2 profiles-only membership ---");
  seed([{ user_id: "u1", plan: "initiate", subscription_status: "active", entitlement_authority_at: STAMP }], []);
  res = await read();
  ok(res.ok && res.membership.plan === "initiate" && res.membership.source === "profiles",
    "N2 an ATTESTED profiles-only member is entitled from that row (got " + (res.ok ? res.membership.plan : "error") + ")");
  seed([{ user_id: "u1", plan: "initiate", subscription_status: "active" }], []);
  res = await read();
  ok(res.ok && res.membership.plan === "initiate",
    "N2 an UNATTESTED profiles-only member keeps today's treatment (got " + (res.ok ? res.membership.plan : "error") + ")");

  // ── N3 contradictory SUBSCRIPTION records between attested rows ─────────────
  console.log("  --- N3 contradictory subscription records ---");
  seed(
    [{ user_id: "u1", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A, entitlement_authority_at: STAMP }],
    [{ plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: B, entitlement_authority_at: STAMP }]
  );
  res = await read();
  ok(res.ok === false && res.reason === "ambiguous",
    "N3 two attested rows naming different subscriptions FAIL CLOSED (got " + JSON.stringify(res.ok ? res.membership.plan : res.reason) + ")");
  ok(res.ok === false && /different Stripe subscriptions/.test(res.detail || ""),
    "N3 the subscription contradiction is named (got " + (res.ok ? "-" : res.detail) + ")");
  ok(await h.eff(EMAIL) === "READ_ERROR", "N3 an unreadable authority is never reported as a plan");

  // ── N4 evidence, not identifiers, decides ───────────────────────────────────
  console.log("  --- N4 evidence decides, identifiers do not ---");
  // Identifiers but no evidence on the paid row's side: legacy rule still rules.
  seed(
    [{ user_id: "u1", plan: "initiate", subscription_status: "active" }],
    [{ plan: "free", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A }]
  );
  res = await read();
  ok(res.ok && res.membership.plan === "initiate",
    "N4 an IDENTIFIER on the other row is not authority; the legacy rule still applies (got " + (res.ok ? res.membership.plan : "error") + ")");
  // The same shape, but now with a completed reconciliation behind it.
  seed(
    [{ user_id: "u1", plan: "initiate", subscription_status: "active" }],
    [{ plan: "free", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A, entitlement_authority_at: STAMP }]
  );
  res = await read();
  ok(res.ok && res.membership.plan === "free",
    "N4 with EVIDENCE the reconciled row decides, and the stale paid row is unaddressable (got " + (res.ok ? res.membership.plan : "error") + ")");
  ok(res.ok && JSON.stringify(res.membership.unaddressable) === JSON.stringify(["profiles"]),
    "N4 the unattested row is reported unaddressable (got " + JSON.stringify(res.ok ? res.membership.unaddressable : null) + ")");
  // And the revocation direction.
  seed(
    [{ user_id: "u1", plan: "initiate", subscription_status: "active" }],
    [{ plan: "guest", subscription_status: "canceled", stripe_customer_id: CUS, entitlement_authority_at: STAMP }]
  );
  res = await read();
  ok(res.ok && res.membership.plan === "guest" && res.membership.source === "revoked",
    "N4 an attested revocation still overrides a stale paid mirror (got " + (res.ok ? res.membership.plan : "error") + ")");

  // ── W1 cancellation PRESERVES authority ─────────────────────────────────────
  console.log("  --- W1 a cancellation must not strip the row's authority ---");
  h.reset();
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A, entitlement_authority_at: STAMP,
  });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  let r = await h.post();
  ok(r.status === 200, "W1 the cancellation is acknowledged (got " + r.status + ")");
  ok(PROF().plan === "free", "W1 the linked row is revoked (plan " + PROF().plan + ")");
  ok(typeof PROF().entitlement_authority_at === "string" && PROF().entitlement_authority_at.length > 0,
    "W1 the revocation ATTESTED the row — the field is set, never cleared (got " +
      JSON.stringify(PROF().entitlement_authority_at) + ")");
  ok(await h.eff(EMAIL) === "free",
    "W1 the revocation is still readable as authoritative (got " + (await h.eff(EMAIL)) + ")");

  // ── W2 reactivation RE-ASSERTS authority ────────────────────────────────────
  console.log("  --- W2 a reactivation re-asserts authority ---");
  h.reset();
  const legacyMember = { id: "m1", email: EMAIL, plan: "guest", subscription_status: "canceled", stripe_customer_id: null, stripe_subscription_id: null };
  state.tables.ut_members.push({ ...legacyMember });
  const beforeW2 = memberState(MEM());
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, plan: "free", subscription_status: "canceled",
    stripe_customer_id: CUS, stripe_subscription_id: null,
  });
  state.stripe = { [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.created", { id: B, customer: CUS, status: "active", current_period_end: 1900000000 });
  const markW2 = state.writes.length;
  r = await h.post();
  const w2Rpc = rpcSince(markW2)[0];
  ok(r.status === 200, "W2 acknowledged (got " + r.status + ")");
  ok(PROF().plan === "initiate", "W2 the reconciled row is granted (plan " + PROF().plan + ")");
  ok(typeof PROF().entitlement_authority_at === "string" && PROF().entitlement_authority_at.length > 0,
    "W2 the reactivation records a fresh reconciliation stamp");
  ok(await h.eff(EMAIL) === "initiate",
    "W2 the grant is authoritative even though an unattested row still records a revocation (got " + (await h.eff(EMAIL)) + ")");
  ok(memberState(MEM()) === beforeW2, "W2 the unattested legacy row keeps every stored value it had");
  const w2Member = outcomeOf(w2Rpc, "ut_members");
  ok(w2Member && w2Member.outcome === "absent" && w2Member.affected === 0,
    "W2 the unattested table was never written (got " + JSON.stringify(w2Member) + ")");
  ok(h.inserts().length === 0, "W2 no row was created, so no user_id was fabricated (inserts=" + h.inserts().length + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14AH_DURABLE_AUTHORITY_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
