#!/usr/bin/env node
/**
 * batch14ai-authority-writer-contract.js
 *
 * THE WRITER SIDE OF THE AUTHORITY CONTRACT.
 *
 * Batch 14ah made entitlement authority depend on `entitlement_authority_at` —
 * evidence that a COMPLETED, VERIFIED reconciliation produced a row. It left the
 * WRITER rules incoherent in three places, reproduced here through the real
 * webhook and the real reader, each with its own independently seeded Stripe state:
 *
 *   A  A first verified CANCELLATION did not attest anything. When the linked row
 *      is a profiles-only membership beside an unlinked paid row, no row is
 *      attested, so the previous rule decides and the stale paid row keeps access:
 *      a verified cancellation is defeated by a row nobody reconciled.
 *   B  DUNNING attested the row it touched. It writes `subscription_status` only,
 *      so attesting made an untouched cached `plan` a complete entitlement
 *      decision — and dunning silently changed who is entitled.
 *   C  The INVOICE attested contradictory linkage it left behind itself: it
 *      corrected the member's subscription but stamped the mirror whose stale
 *      subscription id it never touched, so its own successful write produced an
 *      attested pair that contradicts, and the reader failed closed.
 *
 * The contract they must satisfy (docs/BATCH14AI-WRITER-CONTRACT.md):
 *
 *   A write may attest a target only when it supplies that target's `plan` AND its
 *   `stripe_subscription_id` in the SAME write — setting the linkage or explicitly
 *   clearing it. Otherwise it must not attest, and the row keeps the authority it
 *   already had.
 *
 * D, E and F pin what the repair must NOT break: an attesting revocation still
 * rolls back whole and still completes on a healthy retry, the module REFUSES an
 * unattestable write rather than dropping the stamp silently, and stale-event
 * protection still performs zero writes.
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
const attested = (row) => typeof row.entitlement_authority_at === "string" && row.entitlement_authority_at.length > 0;
const read = () => h.eff(EMAIL);

/** Every stored value a lifecycle write owns, for an unchanged-row check. */
const memberState = (row) => JSON.stringify({
  id: row.id,
  user_id: row.user_id,
  plan: row.plan ?? null,
  subscription_status: row.subscription_status ?? null,
  stripe_customer_id: row.stripe_customer_id ?? null,
  stripe_subscription_id: row.stripe_subscription_id ?? null,
  entitlement_authority_at: row.entitlement_authority_at ?? null,
});
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
  console.log("batch14ai-authority-writer-contract\n");

  // ── A a first verified cancellation must establish revocation authority ────
  console.log("  --- A first verified cancellation, profiles-only beside an unlinked paid row ---");
  h.reset();
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: null, stripe_subscription_id: null,
  });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  let r = await h.post();
  let eff = await read();
  console.error("    status=" + r.status + " profiles.plan=" + PROF().plan + " attested=" + attested(PROF()) + " eff=" + eff);
  ok(r.status === 200, "A the verified cancellation is acknowledged (got " + r.status + ")");
  ok(PROF().plan === "free", "A the linked row is revoked (plan " + PROF().plan + ")");
  ok(attested(PROF()), "A the cancellation ESTABLISHES authority on the row it reconciled");
  ok(eff === "free" || eff === "guest",
    "A TARGET: a verified cancellation must not be defeated by an unreconciled paid row (got " + eff + ")");

  // ── B dunning must not attest an untouched cached plan ─────────────────────
  console.log("  --- B dunning must not attest an untouched cached plan ---");
  h.reset();
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "guest", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: null, stripe_subscription_id: null,
  });
  const effBefore = await read();
  state.stripe = { [A]: { status: "past_due", customer: CUS } };
  h.nextEvent("invoice.payment_failed", { id: "in_1", customer: CUS, customer_email: EMAIL, subscription: A });
  r = await h.post();
  eff = await read();
  console.error("    before=" + effBefore + " status=" + r.status + " member.status=" + MEM().subscription_status +
    " attested=" + attested(MEM()) + " eff=" + eff);
  ok(effBefore === "initiate", "B the paid mirror governs before dunning (got " + effBefore + ")");
  ok(r.status === 200, "B dunning is acknowledged (got " + r.status + ")");
  ok(MEM().subscription_status === "past_due", "B the member is marked past_due (is " + MEM().subscription_status + ")");
  ok(!attested(MEM()), "B TARGET: dunning must NOT attest a plan it did not determine");
  ok(eff === "initiate", "B TARGET: dunning must not change who is entitled (got " + eff + ")");

  // ── C the invoice must not attest contradictory linkage ────────────────────
  console.log("  --- C invoice attestation must not contradict itself ---");
  h.reset();
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: B,
  });
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, plan: "free", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.stripe = { [B]: { status: "active", customer: CUS }, [A]: { status: "canceled", customer: CUS } };
  h.nextEvent("invoice.payment_succeeded", { id: "in_1", customer: CUS, customer_email: EMAIL, subscription: B });
  r = await h.post();
  eff = await read();
  console.error("    status=" + r.status + " member.sub=" + MEM().stripe_subscription_id +
    " profiles.sub=" + PROF().stripe_subscription_id + " eff=" + eff);
  ok(r.status === 200, "C the invoice is acknowledged (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B, "C the member records the governing subscription (is " + MEM().stripe_subscription_id + ")");
  ok(eff !== "READ_ERROR" && eff === "initiate",
    "C TARGET: the invoice must not attest a contradicted pair and lock the member out (got " + eff + ")");

  // ── D the attesting revocation still rolls back, and still retries ─────────
  console.log("  --- D an attesting revocation must still roll back, then complete on retry ---");
  h.reset();
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: A,
  });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  const dBefore = memberState(MEM()) + "|" + memberState(PROF());
  // A concurrent writer that keeps rewriting the mirror: every attempt's snapshot
  // is stale by the time the transaction runs.
  state.beforeUpdate = () => {
    const row = state.tables.profiles[0];
    if (row) row.subscription_status = row.subscription_status === "active" ? "past_due" : "active";
  };
  const markD = state.writes.length;
  h.nextEvent("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  r = await h.post();
  const bD = await h.bodyOf(r);
  const rpcD = state.writes.slice(markD).filter((w) => w.op === "rpc");
  ok(r.status === 500, "D the conflicting revocation refuses the delivery (got " + r.status + ")");
  ok((bD.membershipFailures || []).length > 0, "D the failure is named (got " + JSON.stringify(bD.membershipFailures || []) + ")");
  ok(rpcD.length === 2 && rpcD.every((w) => /BATCH14 CONFLICT/.test(String(w.error?.message || ""))),
    "D both bounded attempts hit a REAL database conflict (rpc calls=" + rpcD.length + ")");
  ok(rowsAppliedSince(markD) === 0, "D the failed revocation applied ZERO rows (rows=" + rowsAppliedSince(markD) + ")");
  ok(memberState(MEM()) + "|" + memberState(PROF()) === dBefore,
    "D BOTH tables are byte-for-byte unchanged, authority field included");
  ok(!attested(MEM()) && !attested(PROF()), "D a rolled-back revocation attests nothing");

  state.beforeUpdate = null;
  const markD2 = state.writes.length;
  h.nextEvent("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  r = await h.post();
  ok(r.status === 200, "D the healthy retry completes (got " + r.status + ")");
  ok(state.writes.slice(markD2).filter((w) => w.op === "rpc").length === 1, "D the retry needed exactly one attempt");
  ok(PROF().plan === "free" && attested(PROF()) && attested(MEM()),
    "D the retry revokes AND attests both tables (profiles " + PROF().plan + "/" + attested(PROF()) + ")");
  // The member row records a REVOKING status, so the reader reports the revoked
  // plan — 'guest' — while the mirror keeps 'free'.
  ok(await read() === "guest", "D the completed revocation governs (got " + (await read()) + ")");

  // ── E the module refuses an unattestable write ─────────────────────────────
  console.log("  --- E the module refuses a write that attests what it did not determine ---");
  const mod = require(path.join(ROOT, "src/lib/membership-lifecycle-atomic.ts"));
  ok(typeof mod.unattestableWrite === "function", "E the attestation predicate is exported");
  ok(mod.unattestableWrite({ subscription_status: "past_due", entitlement_authority_at: "x" }) === "plan and stripe_subscription_id",
    "E a dunning-shaped set is unattestable (got " + mod.unattestableWrite({ subscription_status: "past_due", entitlement_authority_at: "x" }) + ")");
  ok(mod.unattestableWrite({ plan: "initiate", stripe_customer_id: CUS, entitlement_authority_at: "x" }) === "stripe_subscription_id",
    "E an invoice-mirror-shaped set is unattestable (got " + mod.unattestableWrite({ plan: "initiate", stripe_customer_id: CUS, entitlement_authority_at: "x" }) + ")");
  ok(mod.unattestableWrite({ plan: "free", stripe_subscription_id: null, entitlement_authority_at: "x" }) === null,
    "E a revocation that clears the linkage IS attestable");
  ok(mod.unattestableWrite({ subscription_status: "past_due" }) === null,
    "E a write that does not attest is never refused");
  const guards = (pk) => ({ pkValue: pk, guard: { plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A } });
  const snap = (pks) => ({ ok: true, rows: pks.map(guards) });
  const refused = mod.buildAtomicLifecyclePayload({
    authority: { customerId: CUS, subscriptionIds: [A] },
    member: { snapshot: snap(["m1"]), fields: { subscription_status: "past_due", entitlement_authority_at: "x" } },
    profile: { snapshot: snap(["u1"]), fields: { plan: "initiate", stripe_subscription_id: A, entitlement_authority_at: "x" } },
  });
  ok(refused.ok === false && /ut_members/.test(refused.detail) && /plan/.test(refused.detail),
    "E the payload builder REFUSES the unattestable target (got " + JSON.stringify(refused) + ")");
  const accepted = mod.buildAtomicLifecyclePayload({
    authority: { customerId: CUS, subscriptionIds: [A] },
    member: { snapshot: snap(["m1"]), fields: { plan: "guest", stripe_subscription_id: null, entitlement_authority_at: "x" } },
    profile: { snapshot: snap(["u1"]), fields: { plan: "free", stripe_subscription_id: null, entitlement_authority_at: "x" } },
  });
  ok(accepted.ok === true, "E a complete pair is accepted (got " + JSON.stringify(accepted.ok ? "ok" : accepted.detail) + ")");

  // ── F stale-event protection is unchanged ──────────────────────────────────
  console.log("  --- F a superseded deletion still writes nothing ---");
  h.reset();
  state.tables.ut_members.push({
    id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: B, entitlement_authority_at: "2026-01-01T00:00:00.000Z",
  });
  state.tables.profiles.push({
    user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active",
    stripe_customer_id: CUS, stripe_subscription_id: B, entitlement_authority_at: "2026-01-01T00:00:00.000Z",
  });
  const fBefore = memberState(MEM()) + "|" + memberState(PROF());
  state.stripe = { [A]: { status: "canceled", customer: CUS }, [B]: { status: "active", customer: CUS } };
  h.nextEvent("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  r = await h.post();
  const bF = await h.bodyOf(r);
  ok(r.status === 200, "F the stale deletion is acknowledged (got " + r.status + ")");
  ok((bF.membershipWarnings || []).some((w) => String(w).startsWith("stale-deletion:")),
    "F it is named as stale (got " + JSON.stringify(bF.membershipWarnings || []) + ")");
  ok(h.attempts().length === 0, "F ZERO membership write attempts (got " + h.attempts().length + ")");
  ok(memberState(MEM()) + "|" + memberState(PROF()) === fBefore, "F neither table was touched");
  ok(await read() === "initiate", "F access governed by the live subscription is preserved (got " + (await read()) + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14AI_WRITER_CONTRACT_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
