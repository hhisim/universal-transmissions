#!/usr/bin/env node
/**
 * batch14b-membership-readback.js
 *
 * Batch 14b behavioural tests, executing the REAL handlers through the
 * project's TS require shim. Only external boundaries are mocked: the Supabase
 * auth endpoint (global fetch), the DB client, NextAuth and Stripe.
 *
 * Focus: the option-3 identity direction (activation must be OBSERVABLE),
 * cross-reader precedence agreement, and that a verified user id can never
 * overwrite a different identity.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const MOCK_USER_URL = "https://mock.supabase.test/auth/v1/user";

const OWNER = "owner@example.com";
const VICTIM = "victim-member@example.com";
const UID_A = "11111111-1111-1111-1111-111111111111";
const UID_B = "22222222-2222-2222-2222-222222222222";

const state = {};

function reset() {
  state.authStatus = 200;
  state.authEmail = null;
  state.authUserId = null;
  state.authThrows = false;
  state.nextAuthEmail = null;
  state.nextAuthThrows = false;
  state.indexed = false;
  state.fail = { lookup: false, insert: false, update: false };
  state.tables = { profiles: [], ut_members: [] };
  state.queries = [];
  state.events = [];
  state.stripeCalls = [];
  state.customerCalls = [];
  state.stripeUrl = "https://checkout.stripe.test/session/abc";
}

const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });
const norm = (v) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").trim().toLowerCase() : "");

function dbClient() {
  return {
    from(table) {
      const ctx = { table, filters: [], payload: null, op: null };
      const rows = () => state.tables[table];
      const match = () => rows().filter((r) => ctx.filters.every(([c, v]) => r[c] === v));
      const err = (code, message) => ({ code, message, details: null, hint: null });
      const api = {
        select() { if (!ctx.op) ctx.op = "select"; return api; },
        eq(col, val) { ctx.filters.push([col, val]); return api; },
        is(col, val) { ctx.filters.push([col, val]); return api; },
        limit(n) {
          state.queries.push({ table, filters: ctx.filters.map((f) => f[1]), op: "select" });
          state.events.push("db:select:" + table);
          if (state.fail.lookup) return Promise.resolve({ data: null, error: err("XX000", "lookup failed") });
          return Promise.resolve({ data: match().slice(0, n).map((r) => ({ ...r })), error: null });
        },
        update(payload) { ctx.op = "update"; ctx.payload = payload; return api; },
        insert(payload) { ctx.op = "insert"; ctx.payload = payload; return api; },
        single() {
          if (ctx.op === "select") {
            const m = match();
            if (m.length !== 1) return Promise.resolve({ data: null, error: err("PGRST116", "not a single row") });
            return Promise.resolve({ data: { ...m[0] }, error: null });
          }
          if (ctx.op === "update") {
            state.events.push("db:update:" + table);
            if (state.fail.update) return Promise.resolve({ data: null, error: err("XX000", "update failed") });
            const m = match();
            if (m.length !== 1) return Promise.resolve({ data: null, error: err("PGRST116", "not a single row") });
            Object.assign(m[0], ctx.payload);
            return Promise.resolve({ data: { ...m[0] }, error: null });
          }
          state.events.push("db:insert:" + table);
          if (state.fail.insert) return Promise.resolve({ data: null, error: err("XX000", "insert failed") });
          const row = { ...ctx.payload };
          if (table === "profiles") {
            if (!row.user_id) {
              return Promise.resolve({ data: null, error: err("23502", 'null value in column "user_id" violates not-null constraint') });
            }
            if (rows().some((r) => r.user_id === row.user_id)) {
              return Promise.resolve({ data: null, error: err("23505", "duplicate key value violates unique constraint") });
            }
          }
          if (!row.email) return Promise.resolve({ data: null, error: err("23502", 'null value in column "email"') });
          if (table === "ut_members") row.id = row.id || "id-" + (rows().length + 1);
          if (state.indexed && rows().some((r) => norm(r.email) === norm(row.email))) {
            return Promise.resolve({ data: null, error: err("23505", 'duplicate key value violates unique constraint "ut_members_email_lower_key"') });
          }
          rows().push(row);
          return Promise.resolve({ data: { ...row }, error: null });
        },
      };
      return api;
    },
  };
}

const fakeStripe = {
  customers: { create: async (a) => { state.events.push("stripe:customer.create"); state.customerCalls.push(a); return { id: "cus_new" }; } },
  checkout: { sessions: { create: async (a) => { state.events.push("stripe:checkout.create"); state.stripeCalls.push(a); return { url: state.stripeUrl }; } } },
};

mockModule("@/lib/supabase", { supabaseAdmin: dbClient() }, { root: ROOT });
mockModule("@/lib/stripe", { getStripe: () => fakeStripe }, { root: ROOT });
mockModule("@/lib/auth", {
  auth: async () => {
    if (state.nextAuthThrows) throw new Error("session failure");
    return state.nextAuthEmail ? { user: { email: state.nextAuthEmail } } : null;
  },
}, { root: ROOT });
mockModule("@supabase/supabase-js", {
  createClient: () => ({
    auth: {
      getUser: async () => {
        if (state.authThrows) throw new Error("network down");
        const ok = state.authStatus >= 200 && state.authStatus < 300;
        if (!ok) return { data: { user: null }, error: { message: "invalid" } };
        return { data: { user: { email: state.authEmail, id: state.authUserId } }, error: null };
      },
    },
  }),
}, { root: ROOT });

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
process.env.NEXT_PUBLIC_BASE_URL = "https://mock.ut.test";
process.env.NEXT_PUBLIC_STRIPE_PRICE_INITIATE_MONTHLY = "price_test_initiate";

global.fetch = async (url) => {
  if (String(url) === MOCK_USER_URL) {
    if (state.authThrows) throw new Error("network down");
    const ok = state.authStatus >= 200 && state.authStatus < 300;
    return { ok, status: state.authStatus, json: async () => ({ email: state.authEmail, id: state.authUserId }) };
  }
  throw new Error("unexpected fetch: " + url);
};

const activateFree = require(path.join(ROOT, "src/app/api/billing/activate-free/route.ts"));
const memberRoute = require(path.join(ROOT, "src/app/api/member/route.ts"));
const sessionRoute = require(path.join(ROOT, "src/app/api/billing/session/route.ts"));
const planStatusRoute = require(path.join(ROOT, "src/app/api/billing/plan-status/route.ts"));
const checkoutRoute = require(path.join(ROOT, "src/app/api/billing/checkout/route.ts"));
const { planRank } = require(path.join(ROOT, "src/lib/membership-plan.ts"));

let passed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { passed += 1; return true; }
  failures.push(label); console.error("  FAIL:", label); return false;
}
async function body(res) {
  if (res && typeof res.json === "function") { try { return await res.json(); } catch { return {}; } }
  return (res && res.body) || {};
}
const post = (r, h, p, url) => r.POST(new Request(url, {
  method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, h || {}),
  body: JSON.stringify(p === undefined ? {} : p),
}));
const get = (r, h, url) => r.GET(new Request(url, { method: "GET", headers: h || {} }));
const TOKEN = { Authorization: "Bearer valid.looking.token" };
function profile(uid, email, plan) { state.tables.profiles.push({ user_id: uid, email, plan, subscription_status: "inactive" }); }
function member(email, plan, cus) { state.tables.ut_members.push({ id: "id-" + email, email, plan, stripe_customer_id: cus || null }); }

(async () => {
  console.log("batch14b-membership-readback\n");

  /* ══════════ plan ranking matches the application's own vocabulary ══════════ */
  ok(planRank("initiate") === 2, "R0 initiate ranks 2");
  ok(planRank("free") === 1, "R0 free ranks 1");
  ok(planRank("guest") === 0, "R0 guest ranks 0");
  ok(planRank("master") === 0, "R0 an unrecognised stored plan normalises to guest, not to paid");

  /* ══════════ option 3: activation must be OBSERVABLE ══════════ */
  reset();
  profile(UID_A, OWNER, "guest"); // a stale Oracle profile at guest
  state.nextAuthEmail = OWNER;    // NextAuth: email only, no uuid
  let r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  let b = await body(r);
  ok(r.status === 200 && b.success === true, "A1 free activation succeeds for a NextAuth caller");
  ok(b.source === "ut_members", "A1 the activation is recorded in ut_members");
  ok(b.profile === "skipped_no_verified_user_id", "A1 no profiles row is attempted without a verified uuid");
  ok(state.tables.ut_members.length === 1 && state.tables.ut_members[0].plan === "free", "A1 ut_members row created at free");
  ok(state.tables.profiles.length === 1 && state.tables.profiles[0].plan === "guest", "A1 the stale profiles row is left alone (no invented identity)");

  // the real reader must now SEE it
  r = await get(memberRoute, {}, "https://ut.test/api/member");
  b = await body(r);
  ok(b.plan === "free", "A2 /api/member observes the new membership despite the stale profiles row");

  reset();
  profile(UID_A, OWNER, "guest");
  member(OWNER, "free", null);
  state.nextAuthEmail = OWNER;
  r = await get(sessionRoute, {}, "https://ut.test/api/billing/session");
  b = await body(r);
  ok(b.plan === "free", "A3 billing/session observes ut_members 'free' over profiles 'guest'");
  r = await get(planStatusRoute, {}, "https://ut.test/api/billing/plan-status");
  b = await body(r);
  ok(b.plan === "free", "A3 plan-status agrees with session (readers no longer diverge)");

  reset();
  profile(UID_A, OWNER, "initiate");
  member(OWNER, "free", null);
  state.nextAuthEmail = OWNER;
  r = await get(sessionRoute, {}, "https://ut.test/api/billing/session");
  b = await body(r);
  ok(b.plan === "initiate", "A4 a paid plan in profiles is NOT hidden by a 'free' ut_members row");
  r = await get(planStatusRoute, {}, "https://ut.test/api/billing/plan-status");
  b = await body(r);
  ok(b.plan === "initiate", "A4 plan-status agrees (no conflicting plans exposed)");
  r = await get(memberRoute, {}, "https://ut.test/api/member");
  b = await body(r);
  ok(b.plan === "initiate", "A4 /api/member agrees as well");

  reset();
  profile(UID_A, OWNER, "initiate");
  state.nextAuthEmail = OWNER;
  r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  b = await body(r);
  ok(r.status === 409 && b.code === "PAID_MEMBERSHIP_ACTIVE", "A5 activation refuses a paid member (paid in profiles, ut_members empty)");
  ok(state.tables.ut_members.length === 0, "A5 no competing ut_members row was written");

  reset();
  state.nextAuthEmail = OWNER;
  state.fail.lookup = true;
  r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  ok(r.status === 503, "A6 an unreadable membership is not treated as 'no plan'");
  ok(state.tables.ut_members.length === 0, "A6 nothing written when the pre-read failed");

  reset();
  state.nextAuthEmail = null;
  r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  ok(r.status === 401, "A7 anonymous -> 401");
  ok(state.queries.length === 0 && state.events.length === 0, "A7 no lookup and no side effect before authentication");

  // Supabase caller DOES carry a uuid, so profiles may be written
  reset();
  state.authEmail = OWNER;
  state.authUserId = UID_A;
  r = await post(activateFree, TOKEN, {}, "https://ut.test/api/billing/activate-free");
  b = await body(r);
  ok(r.status === 200 && b.success === true, "A8 activation succeeds for a Supabase caller");
  ok(b.profile === "inserted", "A8 the profiles row is written when a verified uuid IS available");
  ok(state.tables.profiles.length === 1 && state.tables.profiles[0].user_id === UID_A, "A8 written with the verified uuid");

  /* ══════════ identity: an email match must not authorise another identity ═══ */
  reset();
  profile(UID_B, OWNER, "guest"); // the address belongs to a DIFFERENT user_id
  state.authEmail = OWNER;
  state.authUserId = UID_A;       // verified caller is A
  r = await post(activateFree, TOKEN, {}, "https://ut.test/api/billing/activate-free");
  b = await body(r);
  ok(state.tables.profiles[0].user_id === UID_B, "I1 the other identity's row is NOT overwritten");
  ok(state.tables.profiles[0].plan === "guest", "I1 its plan is unchanged");
  ok(b.profile === "identity_mismatch", "I1 the refusal is reported as an identity mismatch");
  ok(state.events.filter((e) => e === "db:update:profiles").length === 0, "I1 no UPDATE was issued against the foreign row");

  reset();
  profile(UID_A, OWNER, "guest");
  state.authEmail = OWNER;
  state.authUserId = UID_A;
  r = await post(activateFree, TOKEN, {}, "https://ut.test/api/billing/activate-free");
  b = await body(r);
  ok(b.profile === "updated" && state.tables.profiles[0].plan === "free", "I2 the caller's OWN row is updated normally");

  /* ══════════ member route ══════════ */
  reset();
  r = await get(memberRoute, {}, "https://ut.test/api/member?email=" + encodeURIComponent(VICTIM));
  ok(r.status === 401, "M1 anonymous with a victim address -> 401");
  ok(state.queries.length === 0, "M1 the supplied address never reaches the database");

  reset();
  member(OWNER, "initiate", "cus_owner");
  member(VICTIM, "master", "cus_victim");
  state.nextAuthEmail = OWNER;
  r = await get(memberRoute, {}, "https://ut.test/api/member?email=" + encodeURIComponent(VICTIM));
  b = await body(r);
  ok(b.email === OWNER, "M2 returns the verified caller's own row");
  ok(JSON.stringify(b).indexOf(VICTIM) === -1, "M2 the victim address appears nowhere");

  reset();
  state.nextAuthEmail = OWNER;
  r = await get(memberRoute, {}, "https://ut.test/api/member");
  b = await body(r);
  ok(r.status === 200 && b.member === null, "M3 verified with no membership -> {member:null}");
  ok(state.tables.ut_members.length === 0, "M3 a read never creates a row");

  reset();
  member(OWNER, "guest", "a"); member(OWNER, "guest", "b");
  state.nextAuthEmail = OWNER;
  r = await get(memberRoute, {}, "https://ut.test/api/member");
  ok(r.status === 409, "M4 duplicate rows -> 409 (ambiguity is not resolved by picking one)");

  reset();
  state.nextAuthEmail = OWNER;
  state.fail.lookup = true;
  r = await get(memberRoute, {}, "https://ut.test/api/member");
  ok(r.status === 500, "M5 lookup failure -> 500, not 'no member'");

  /* ══════════ checkout still guards identity ══════════ */
  reset();
  member(OWNER, "initiate", "cus_existing");
  profile(UID_A, OWNER, "initiate");
  state.authEmail = OWNER;
  state.authUserId = UID_A;
  r = await post(checkoutRoute, TOKEN, {}, "https://ut.test/api/billing/checkout");
  b = await body(r);
  ok(r.status === 200 && typeof b.url === "string", "C1 checkout returns a url for a verified member");
  ok(state.customerCalls.length === 0, "C1 the stored Stripe customer is reused");
  ok(state.tables.ut_members[0].plan === "initiate", "C1 the paid plan is untouched by checkout");

  reset();
  state.authEmail = OWNER;
  state.authUserId = UID_A;
  state.fail.lookup = true;
  r = await post(checkoutRoute, TOKEN, {}, "https://ut.test/api/billing/checkout");
  ok(r.status === 503 && state.customerCalls.length === 0, "C2 unknown lookup -> 503 and NO replacement customer");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14B_HANDLER_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
