#!/usr/bin/env node
/**
 * batch14ag-read-authority.js
 *
 * THE READ-AUTHORITY RULE, DEMONSTRATED.
 *
 * The pinned defect (scripts/batch14s-unlinked-row-authority.js, §5 of
 * docs/BATCH14R-LIFECYCLE-AUTHORIZATION-AND-CONCURRENCY.md) is that a row no
 * lifecycle writer can address still decided entitlement: it could outrank a
 * verified revocation (U1) or veto a verified grant (U2).
 *
 * The rule now implemented in src/lib/membership-plan.ts:
 *
 *   UNLINKED  — neither `stripe_customer_id` nor `stripe_subscription_id` is
 *               present. Nothing ties the row to the relationship the address was
 *               granted through, so it may neither GRANT nor REVOKE while a linked
 *               row exists for the same address. Reported as `unaddressable`,
 *               never rewritten by address.
 *   LINKED    — carries a customer id and/or a subscription id. That makes it a
 *               CANDIDATE only: a non-empty identifier alone is insufficient,
 *               because the candidates must agree about who the membership
 *               belongs to.
 *   NO LINKED ROW — no verified relationship to prefer, so the previous rule
 *               stands unchanged (highest plan wins; ut_members status revokes).
 *               This is what preserves legitimate legacy access.
 *   CONTRADICTION — two linked rows naming DIFFERENT customers: the stored state
 *               does not say which governs, so the read fails closed rather than
 *               guessing.
 *
 * Part A pins the rule with direct reader controls. Part B runs the two PINNED
 * cases through the real handler and adds the evidence batch14s could not express
 * on the atomic path: what the write actually carried for the unlinked table.
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
const PROF = () => state.tables.profiles[0] || {};
const MEM = () => state.tables.ut_members[0] || {};

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
const rpcSince = (mark) => state.writes.slice(mark).filter((w) => w.op === "rpc");
const targetOf = (rpc, table) => (rpc?.payload || []).find((t) => t?.target === table) || null;
const outcomeOf = (rpc, table) => (rpc?.data || []).find((o) => o?.target === table) || null;

/**
 * The stored values a lifecycle write owns, for an unchanged-row check.
 *
 * Compared per column rather than as a serialized object: the harness round-trips
 * rows through PostgreSQL, which adds a `current_period_end: null` key that the
 * in-memory fixture never had. That is transport, not state.
 */
const memberState = (row) => JSON.stringify({
  id: row.id,
  email: row.email,
  plan: row.plan ?? null,
  subscription_status: row.subscription_status ?? null,
  stripe_customer_id: row.stripe_customer_id ?? null,
  stripe_subscription_id: row.stripe_subscription_id ?? null,
  current_period_end: row.current_period_end ?? null,
});

/** Direct reader controls: no handler, no Stripe — just the stored rows. */
function seed(profiles, members) {
  h.reset();
  for (const p of profiles || []) state.tables.profiles.push({ email: EMAIL, ...p });
  for (const m of members || []) state.tables.ut_members.push({ id: "m1", email: EMAIL, ...m });
}
const read = () => h.effRes(EMAIL);

(async () => {
  console.log("batch14ag-read-authority\n");

  // ── A1 legacy grant: no linkage anywhere -> previous rule, unchanged ──────
  console.log("  --- A1 no link at all: a legacy paid row still grants ---");
  seed([{ user_id: "u1", plan: "initiate", subscription_status: "active" }], []);
  let res = await read();
  ok(res.ok && res.membership.plan === "initiate",
    "A1 the only row is paid and unlinked -> it still grants (got " + (res.ok ? res.membership.plan : "error") + ")");
  ok(res.ok && (res.membership.unaddressable || []).length === 0,
    "A1 nothing is reported unaddressable when no row is linked");

  // ── A2 legacy revocation: no linkage anywhere -> status still revokes ────
  console.log("  --- A2 no link at all: a legacy revocation still revokes ---");
  seed([], [{ plan: "guest", subscription_status: "canceled" }]);
  res = await read();
  ok(res.ok && res.membership.plan === "guest" && res.membership.source === "revoked",
    "A2 an unlinked revocation still revokes when nothing is linked (got " + (res.ok ? res.membership.plan + "/" + res.membership.source : "error") + ")");

  // ── A3 customer-only linkage earns authority ─────────────────────────────
  console.log("  --- A3 customer-only linkage earns authority ---");
  seed(
    [{ user_id: "u1", plan: "guest", subscription_status: "inactive", stripe_customer_id: CUS, stripe_subscription_id: null }],
    [{ plan: "initiate", subscription_status: "active", stripe_customer_id: null, stripe_subscription_id: null }]
  );
  res = await read();
  ok(res.ok && res.membership.plan === "guest",
    "A3 the customer-linked row decides; the unlinked paid row does not outrank it (got " + (res.ok ? res.membership.plan : "error") + ")");
  ok(res.ok && JSON.stringify(res.membership.unaddressable) === JSON.stringify(["ut_members"]),
    "A3 the unlinked table is reported unaddressable (got " + JSON.stringify(res.membership.unaddressable) + ")");

  // ── A4 subscription-only linkage earns authority ─────────────────────────
  console.log("  --- A4 subscription-only linkage earns authority ---");
  seed(
    [{ user_id: "u1", plan: "initiate", subscription_status: "active", stripe_customer_id: null, stripe_subscription_id: null }],
    [{ plan: "guest", subscription_status: "canceled", stripe_customer_id: null, stripe_subscription_id: A }]
  );
  res = await read();
  ok(res.ok && res.membership.plan === "guest" && res.membership.source === "revoked",
    "A4 a subscription-linked revocation revokes; the unlinked paid row cannot veto it (got " + (res.ok ? res.membership.plan + "/" + res.membership.source : "error") + ")");

  // ── A5 profiles-only membership, linked and unlinked ─────────────────────
  console.log("  --- A5 profiles-only membership ---");
  seed([{ user_id: "u1", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS }], []);
  res = await read();
  ok(res.ok && res.membership.plan === "initiate" && res.membership.source === "profiles",
    "A5 a LINKED profiles-only member is entitled from that row (got " + (res.ok ? res.membership.plan : "error") + ")");
  seed([{ user_id: "u1", plan: "initiate", subscription_status: "active" }], []);
  res = await read();
  ok(res.ok && res.membership.plan === "initiate",
    "A5 an UNLINKED profiles-only member keeps today's treatment (got " + (res.ok ? res.membership.plan : "error") + ")");

  // ── A6 contradictory customers fail closed ───────────────────────────────
  console.log("  --- A6 contradictory linked customers ---");
  seed(
    [{ user_id: "u1", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS }],
    [{ plan: "initiate", subscription_status: "active", stripe_customer_id: OTHER_CUS }]
  );
  res = await read();
  ok(res.ok === false && res.reason === "ambiguous",
    "A6 two linked rows naming different customers FAIL CLOSED rather than picking one (got " + JSON.stringify(res.ok ? res.membership.plan : res.reason) + ")");
  ok(res.ok === false && /different Stripe customers/.test(res.detail || ""),
    "A6 the contradiction is named (got " + (res.ok ? "-" : res.detail) + ")");
  ok(await h.eff(EMAIL) === "READ_ERROR",
    "A6 an unreadable authority is never reported as a plan");

  // ── A7 agreeing linked rows: established behaviour preserved ─────────────
  console.log("  --- A7 two linked, agreeing rows ---");
  seed(
    [{ user_id: "u1", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS }],
    [{ plan: "free", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A }]
  );
  res = await read();
  ok(res.ok && res.membership.plan === "initiate",
    "A7 highest plan still wins between authoritative rows (got " + (res.ok ? res.membership.plan : "error") + ")");
  seed(
    [{ user_id: "u1", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS }],
    [{ plan: "guest", subscription_status: "canceled", stripe_customer_id: CUS }]
  );
  res = await read();
  ok(res.ok && res.membership.plan === "guest" && res.membership.source === "revoked",
    "A7 a LINKED revocation still overrides a stale paid mirror (got " + (res.ok ? res.membership.plan : "error") + ")");

  // ── B1 PINNED U1: cancellation vs an unlinked stale paid row ─────────────
  console.log("  --- B1 pinned U1: cancellation must override an unlinked stale paid row ---");
  h.reset();
  const u1Seeded = { id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: null, stripe_subscription_id: null };
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, display_name: "M", plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.tables.ut_members.push({ ...u1Seeded });
  const u1Before = memberState(MEM());
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  const markB1 = state.writes.length;
  let r = await h.post();
  let eff = await h.eff(EMAIL);
  const b1Rpc = rpcSince(markB1)[0];
  ok(r.status === 200, "B1 acknowledged (got " + r.status + ")");
  ok(eff === "guest" || eff === "free", "B1 TARGET: an unaddressable row must not outrank the linked revocation (got " + eff + ")");
  ok(PROF().plan !== "initiate", "B1 the LINKED row is revoked (plan " + PROF().plan + ")");
  ok(memberState(MEM()) === u1Before, "B1 the unlinked row keeps every stored value it had, unchanged");
  const b1Member = targetOf(b1Rpc, "ut_members");
  const b1Outcome = outcomeOf(b1Rpc, "ut_members");
  ok(b1Member && b1Member.entries.length === 0 && b1Member.seen_pks.length === 0,
    "B1 the atomic payload carried NO entry for the unlinked table (entries=" + (b1Member ? b1Member.entries.length : "no target") + ")");
  ok(b1Outcome && b1Outcome.outcome === "absent" && b1Outcome.affected === 0,
    "B1 the database reported that linkage as absent, having written nothing (got " + JSON.stringify(b1Outcome) + ")");
  ok(rowsAppliedSince(markB1) === 1, "B1 exactly ONE row was updated (rows=" + rowsAppliedSince(markB1) + ")");
  ok(h.inserts().length === 0, "B1 no row was created (inserts=" + h.inserts().length + ")");

  // ── B2 PINNED U2: reactivation vs an unlinked stale revocation ───────────
  console.log("  --- B2 pinned U2: reactivation must override an unlinked stale revocation ---");
  h.reset();
  const u2Seeded = { id: "m1", email: EMAIL, plan: "guest", subscription_status: "canceled", stripe_customer_id: null, stripe_subscription_id: null };
  state.tables.ut_members.push({ ...u2Seeded });
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, display_name: "M", plan: "free", subscription_status: "canceled",
    stripe_customer_id: CUS, stripe_subscription_id: null,
  });
  const u2Before = memberState(MEM());
  state.stripe = { [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.created", { id: B, customer: CUS, status: "active", current_period_end: 1900000000 });
  const markB2 = state.writes.length;
  r = await h.post();
  eff = await h.eff(EMAIL);
  const b2Rpc = rpcSince(markB2)[0];
  ok(r.status === 200, "B2 acknowledged (got " + r.status + ")");
  ok(eff === "initiate", "B2 TARGET: an unaddressable revocation record must not veto a verified grant (got " + eff + ")");
  ok(PROF().plan === "initiate", "B2 the LINKED row is granted (plan " + PROF().plan + ")");
  ok(memberState(MEM()) === u2Before, "B2 the unlinked row keeps every stored value it had, unchanged");
  const b2Member = targetOf(b2Rpc, "ut_members");
  const b2Outcome = outcomeOf(b2Rpc, "ut_members");
  ok(b2Member && b2Member.entries.length === 0 && b2Member.seen_pks.length === 0,
    "B2 the atomic payload carried NO entry for the unlinked table (entries=" + (b2Member ? b2Member.entries.length : "no target") + ")");
  ok(b2Outcome && b2Outcome.outcome === "absent" && b2Outcome.affected === 0,
    "B2 the database reported that linkage as absent, having written nothing (got " + JSON.stringify(b2Outcome) + ")");
  ok(rowsAppliedSince(markB2) === 1, "B2 exactly ONE row was updated (rows=" + rowsAppliedSince(markB2) + ")");
  ok(h.inserts().length === 0, "B2 no row was created, so no user_id was fabricated (inserts=" + h.inserts().length + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14AG_READ_AUTHORITY_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
