#!/usr/bin/env node
/**
 * batch14c-entitlement-revocation.js
 *
 * Executes the REAL shared reader and the real billing/Ask Hakan handlers.
 * Only external boundaries are mocked (auth, DB, Stripe, mailer).
 *
 * Core question: does "highest entitlement wins" preserve access after a
 * LEGITIMATE revocation? Before Batch 14c it did — a stale paid row kept
 * granting access. Each case below reports stored state, the returned effective
 * plan, and the eligibility outcome.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const OWNER = "owner@example.com";
const state = {};

function reset() {
  state.authEmail = OWNER;
  state.authUserId = null;
  state.nextAuthEmail = OWNER;
  state.tables = { profiles: [], ut_members: [] };
  state.queries = [];
  state.sends = [];
  state.fail = { lookup: false };
}

const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

function dbClient() {
  return {
    from(table) {
      const ctx = { table, filters: [], payload: null, op: null };
      const rows = () => state.tables[table];
      const match = () => rows().filter((r) => ctx.filters.every(([c, v]) => r[c] === v));
      const err = (c, m) => ({ code: c, message: m, details: null, hint: null });
      const api = {
        select() { if (!ctx.op) ctx.op = "select"; return api; },
        eq(col, val) { ctx.filters.push([col, val]); return api; },
        is(col, val) { ctx.filters.push([col, val]); return api; },
        limit(n) {
          state.queries.push({ table, filters: ctx.filters.map((f) => f[1]) });
          if (state.fail.lookup) return Promise.resolve({ data: null, error: err("XX000", "lookup failed") });
          return Promise.resolve({ data: match().slice(0, n).map((r) => ({ ...r })), error: null });
        },
        update(p) { ctx.op = "update"; ctx.payload = p; return api; },
        insert(p) { ctx.op = "insert"; ctx.payload = p; return api; },
        single() {
          if (ctx.op === "select") {
            const m = match();
            if (m.length !== 1) return Promise.resolve({ data: null, error: err("PGRST116", "not a single row") });
            return Promise.resolve({ data: { ...m[0] }, error: null });
          }
          if (ctx.op === "update") {
            const m = match();
            if (m.length !== 1) return Promise.resolve({ data: null, error: err("PGRST116", "not a single row") });
            Object.assign(m[0], ctx.payload);
            return Promise.resolve({ data: { ...m[0] }, error: null });
          }
          const row = { ...ctx.payload };
          if (table === "profiles" && !row.user_id) {
            return Promise.resolve({ data: null, error: err("23502", "null value in column user_id") });
          }
          if (table === "ut_members") row.id = row.id || "id-" + (rows().length + 1);
          rows().push(row);
          return Promise.resolve({ data: { ...row }, error: null });
        },
      };
      return api;
    },
  };
}

class MockResend {
  constructor() { this.emails = { send: async (m) => { state.sends.push(m); return { id: "x" }; } }; }
}

mockModule("@/lib/supabase", { supabaseAdmin: dbClient() }, { root: ROOT });
mockModule("@/lib/stripe", {
  getStripe: () => ({
    customers: { create: async () => ({ id: "cus_new" }) },
    checkout: { sessions: { create: async () => ({ url: "https://x" }) } },
  }),
}, { root: ROOT });
mockModule("@/lib/auth", { auth: async () => ({ user: { email: state.nextAuthEmail } }) }, { root: ROOT });
mockModule("resend", { Resend: MockResend }, { root: ROOT });

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
process.env.NEXT_PUBLIC_BASE_URL = "https://mock.ut.test";
process.env.RESEND_API_KEY = "re_test";

global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ email: state.authEmail }) });

const { resolveMembershipPlan, planRank, isRevokingStatus } =
  require(path.join(ROOT, "src/lib/membership-plan.ts"));
const sessionRoute = require(path.join(ROOT, "src/app/api/billing/session/route.ts"));
const planStatusRoute = require(path.join(ROOT, "src/app/api/billing/plan-status/route.ts"));
const messageRoute = require(path.join(ROOT, "src/app/api/member/message/route.ts"));

let passed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { passed += 1; return true; }
  failures.push(label); console.error("  FAIL:", label); return false;
}
async function body(res) {
  if (res && typeof res.json === "function") { try { return await res.json(); } catch { return {}; } }
  return {};
}
const get = (r, url) => r.GET(new Request(url, { method: "GET" }));
// BATCH 14ag — fixture correction, NOT an assertion change.
//
// `prof` previously seeded a profiles row with NO Stripe linkage while `mem`
// seeded one WITH it. Under the read-authority rule (src/lib/membership-plan.ts)
// an unlinked row may neither grant nor revoke entitlement while a linked row
// exists for the same address, so those cases were answering a different
// question than their labels ask. Every production writer records the customer
// on a profiles row; seeding it here keeps each case testing plan ranking and
// revocation BETWEEN AUTHORITATIVE ROWS. The unlinked-row path is covered by
// batch14s and batch14ag.
const prof = (plan, status) => state.tables.profiles.push({ user_id: "u1", email: OWNER, plan, subscription_status: status, stripe_customer_id: "cus_1" });
const mem = (plan, status) => state.tables.ut_members.push({ id: "m1", email: OWNER, plan, subscription_status: status, stripe_customer_id: "cus_1" });

/** Report one case: stored state -> effective plan -> eligibility. */
async function caseReport(label, resolved, expectPlan, expectEligible) {
  const plan = resolved.ok ? resolved.membership.plan : "(lookup failed)";
  const src = resolved.ok ? resolved.membership.source : "error";
  const rv = resolved.ok && resolved.membership.revokedBy ? resolved.membership.revokedBy.join("+") : "-";
  const session = await body(await get(sessionRoute, "https://ut.test/api/billing/session"));
  const ps = await body(await get(planStatusRoute, "https://ut.test/api/billing/plan-status"));
  const eligibleAsk = planRank(plan) > 0;      // the predicate Ask Hakan / Codex II apply
  console.log("    %s -> plan=%s source=%s revokedBy=%s | session=%s plan-status=%s | AskHakan/CodexII=%s",
    label, plan, src, rv, session.plan, ps.plan, eligibleAsk ? "ELIGIBLE" : "denied");
  ok(plan === expectPlan, label + ": effective plan is " + expectPlan);
  ok(session.plan === expectPlan, label + ": billing/session agrees (" + expectPlan + ")");
  ok(ps.plan === expectPlan, label + ": plan-status agrees (" + expectPlan + ")");
  ok(eligibleAsk === expectEligible, label + ": eligibility is " + (expectEligible ? "granted" : "denied"));
}

(async () => {
  console.log("batch14c-entitlement-revocation\n");
  console.log("  (stored plan / subscription_status -> effective plan -> eligibility)\n");

  ok(isRevokingStatus("canceled") && isRevokingStatus("unpaid") && isRevokingStatus("incomplete_expired"),
    "R0 canceled / unpaid / incomplete_expired revoke");
  ok(!isRevokingStatus("active") && !isRevokingStatus("past_due") && !isRevokingStatus("inactive") && !isRevokingStatus(null),
    "R0 active / past_due / inactive / NULL do NOT revoke");

  console.log("  --- entitlement cases ---");

  reset(); prof("initiate", "active"); mem("free", "active");
  await caseReport("C1 profiles=initiate, ut_members=free", await resolveMembershipPlan(dbClient(), OWNER), "initiate", true);

  reset(); prof("initiate", "active"); mem("guest", "canceled");
  await caseReport("C2 profiles=initiate, ut_members=guest after CANCEL", await resolveMembershipPlan(dbClient(), OWNER), "guest", false);

  reset(); prof("guest", "inactive"); mem("initiate", "active");
  await caseReport("C3 profiles=guest, ut_members=initiate", await resolveMembershipPlan(dbClient(), OWNER), "initiate", true);

  reset(); prof("guest", "inactive"); mem("initiate", "canceled");
  await caseReport("C4 ut_members=initiate but CANCELED", await resolveMembershipPlan(dbClient(), OWNER), "guest", false);

  reset(); prof("free", "inactive"); mem("guest", "canceled");
  await caseReport("C5 successful lifecycle on both tables", await resolveMembershipPlan(dbClient(), OWNER), "guest", false);

  reset(); prof("guest", "inactive"); mem("initiate", "active");
  state.tables.ut_members[0].subscription_status = "canceled"; // ut_members write succeeded, profiles write failed
  await caseReport("C6 profiles write failed, ut_members revoked", await resolveMembershipPlan(dbClient(), OWNER), "guest", false);

  reset(); prof("free", "inactive"); mem("initiate", "active"); // ut_members write FAILED (still paid), profiles succeeded
  const c7 = await resolveMembershipPlan(dbClient(), OWNER);
  {
    const plan = c7.ok ? c7.membership.plan : "(lookup failed)";
    console.log("    C7 ut_members write failed (still initiate/active), profiles=free -> plan=%s source=%s", plan, c7.ok ? c7.membership.source : "-");
    ok(plan === "initiate", "C7 reports the STALE paid state — a failed revocation write is not detectable from stored state");
    ok(c7.ok && c7.membership.source !== "revoked", "C7 is not falsely reported as revoked");
  }

  reset(); prof("initiate", "past_due"); mem("guest", "active");
  await caseReport("C8 past_due (dunning) keeps access", await resolveMembershipPlan(dbClient(), OWNER), "initiate", true);

  console.log("");
  console.log("  --- Ask Hakan gate (real handler) ---");

  reset(); prof("initiate", "active");
  let r = await messageRoute.POST(new Request("https://ut.test/api/member/message", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject: "s", content: "c" }),
  }));
  ok(r.status === 200 && state.sends.length === 1, "E1 paid member -> Ask Hakan accepts (200, one send)");

  reset(); prof("initiate", "active"); mem("guest", "canceled");
  state.sends = [];
  r = await messageRoute.POST(new Request("https://ut.test/api/member/message", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject: "s", content: "c" }),
  }));
  ok(r.status === 403, "E2 revoked member -> Ask Hakan denies (403)");
  ok(state.sends.length === 0, "E2 no email is sent for a revoked member");

  reset(); prof("guest", "inactive"); mem("initiate", "canceled");
  state.sends = [];
  r = await messageRoute.POST(new Request("https://ut.test/api/member/message", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject: "s", content: "c" }),
  }));
  ok(r.status === 403, "E3 canceled ut_members -> Ask Hakan denies (403)");
  ok(state.sends.length === 0, "E3 no email sent");

  reset(); prof("initiate", "active"); mem("guest", "canceled");
  const codex = await resolveMembershipPlan(dbClient(), OWNER);
  ok(codex.ok && planRank(codex.membership.plan) === 0, "E4 Codex II gate sees no entitlement after cancellation");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14C_REVOCATION_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
