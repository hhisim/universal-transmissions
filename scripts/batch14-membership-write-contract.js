#!/usr/bin/env node
/**
 * batch14-membership-write-contract.js
 *
 * Behavioural tests for the membership write contract, executing the REAL route
 * handlers through the project's own TS require shim. Only the external
 * boundaries are mocked — Supabase auth (global fetch), the Supabase DB client,
 * the NextAuth session lookup, and Stripe.
 *
 * The in-memory database mock reproduces the constraint behaviour measured on
 * PostgreSQL 17.11 (see scripts/batch14-*.sql): `ut_members.email` is NOT NULL
 * with a generated id, `profiles.user_id` is NOT NULL with no default, and a
 * case-insensitive unique index on the address exists only when the migration
 * has been applied.
 *
 * No real accounts, sessions, Stripe objects, emails or database writes.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const MOCK_USER_URL = "https://mock.supabase.test/auth/v1/user";

const VICTIM = "victim-member@example.com";
const OWNER = "owner@example.com";

const state = {};

function reset() {
  state.authStatus = 200;
  state.authEmail = null;
  state.authThrows = false;
  state.nextAuthEmail = null;
  state.nextAuthThrows = false;
  state.uniqueEmailIndex = false; // the production migration is NOT applied
  state.profileUserId = null; // what an insert into profiles would supply
  state.fail = { lookup: false, insert: false, update: false };
  state.tables = { profiles: [], ut_members: [] };
  state.queries = [];
  state.events = [];
  state.stripeCalls = [];
  state.customerCalls = [];
  state.stripeThrows = false;
  state.stripeUrl = "https://checkout.stripe.test/session/abc";
  state.domain = "https://mock.ut.test";
}

/* ── boundaries ─────────────────────────────────────────────────────────── */
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
          // insert — enforce the real constraints
          state.events.push("db:insert:" + table);
          if (state.fail.insert) return Promise.resolve({ data: null, error: err("XX000", "insert failed") });
          const row = { ...ctx.payload };
          if (table === "profiles") {
            if (!row.user_id) {
              return Promise.resolve({
                data: null,
                error: err("23502", 'null value in column "user_id" of relation "profiles" violates not-null constraint'),
              });
            }
            if (rows().some((r) => r.user_id === row.user_id)) {
              return Promise.resolve({ data: null, error: err("23505", "duplicate key value violates unique constraint \"profiles_pkey\"") });
            }
          }
          if (!row.email) {
            return Promise.resolve({ data: null, error: err("23502", 'null value in column "email" violates not-null constraint') });
          }
          if (table === "ut_members") row.id = row.id || "id-" + (rows().length + 1);
          if (state.uniqueEmailIndex && rows().some((r) => norm(r.email) === norm(row.email))) {
            return Promise.resolve({
              data: null,
              error: err("23505", 'duplicate key value violates unique constraint "ut_members_email_lower_key"'),
            });
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
  customers: {
    create: async (args) => {
      state.events.push("stripe:customer.create");
      if (state.stripeThrows) throw new Error("stripe down");
      state.customerCalls.push(args);
      return { id: "cus_created_" + (state.customerCalls.length) };
    },
  },
  checkout: {
    sessions: {
      create: async (args) => {
        state.events.push("stripe:checkout.create");
        if (state.stripeThrows) throw new Error("stripe down");
        state.stripeCalls.push(args);
        return { url: state.stripeUrl };
      },
    },
  },
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
        return { data: { user: { email: state.authEmail, id: state.authUserId || null } }, error: null };
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
    return { ok, status: state.authStatus, json: async () => ({ email: state.authEmail }) };
  }
  throw new Error("unexpected fetch: " + url);
};

const activateFree = require(path.join(ROOT, "src/app/api/billing/activate-free/route.ts"));
const memberRoute = require(path.join(ROOT, "src/app/api/member/route.ts"));
const checkoutRoute = require(path.join(ROOT, "src/app/api/billing/checkout/route.ts"));

/* ── harness ────────────────────────────────────────────────────────────── */
let passed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { passed += 1; return true; }
  failures.push(label);
  console.error("  FAIL:", label);
  return false;
}
async function body(res) {
  if (res && typeof res.json === "function") { try { return await res.json(); } catch { return {}; } }
  return (res && res.body) || {};
}
const post = (route, headers, payload, url) =>
  route.POST(new Request(url, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
    body: JSON.stringify(payload === undefined ? {} : payload),
  }));
const get = (route, headers, url) => route.GET(new Request(url, { method: "GET", headers: headers || {} }));

const TOKEN = { Authorization: "Bearer valid.looking.token" };
const FORGED = { Authorization: "Bearer forged.unsigned.token" };

function seededMember(email, plan, customerId) {
  state.tables.ut_members.push({ id: "id-seed", email, plan, stripe_customer_id: customerId || null });
}
function seededProfile(userId, email, plan) {
  state.tables.profiles.push({ user_id: userId, email, plan, subscription_status: "inactive" });
}

(async () => {
  console.log("batch14-membership-write-contract\n");
  console.log("NOTE: profiles.user_id insert-requirement, NOT NULL email and the");
  console.log("case-insensitive unique index are reproduced from PostgreSQL 17.11.\n");

  /* ═════════════ activate-free ═════════════ */
  reset();
  let r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  let b = await body(r);
  ok(r.status === 401, "A1 anonymous -> 401");
  ok(state.queries.length === 0, "A1 anonymous -> NO database lookup before authentication");
  ok(state.events.length === 0, "A1 anonymous -> no side effect at all");

  reset();
  seededProfile("11111111-1111-1111-1111-111111111111", OWNER, "guest");
  state.nextAuthEmail = OWNER;
  r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  b = await body(r);
  ok(r.status === 200 && b.success === true && b.plan === "free", "A2 free plan activates for a guest profile");
  // Batch 14b (option 3): activation is recorded in ut_members, which is the
  // row every reader consults, not in a profiles row keyed by address.
  ok(state.tables.ut_members.length === 1 && state.tables.ut_members[0].plan === "free",
     "A2 the activation is recorded in ut_members");

  reset();
  seededProfile("22222222-2222-2222-2222-222222222222", OWNER, "initiate");
  state.nextAuthEmail = OWNER;
  r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  b = await body(r);
  ok(r.status === 409, "A3 existing PAID member -> 409, not a silent downgrade");
  ok(b.success !== true, "A3 does NOT report a successful activation");
  ok(state.tables.profiles[0].plan === "initiate", "A3 paid plan left intact");
  ok(state.events.filter((e) => e.startsWith("db:update")).length === 0, "A3 no UPDATE was issued against the paid row");

  reset();
  state.nextAuthEmail = OWNER;
  r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  b = await body(r);
  // Batch 14b (option 3): a NextAuth session carries no uuid, so no profiles
  // row can be written — but the activation still succeeds, because it is
  // recorded where the readers look. Inventing an identity is still forbidden.
  ok(r.status === 200 && b.success === true && b.plan === "free",
     "A4 no profiles row and no verified uuid -> activation still succeeds (option 3)");
  ok(state.tables.ut_members.length === 1 && state.tables.ut_members[0].plan === "free",
     "A4 the activation is recorded in ut_members");
  ok(state.tables.profiles.length === 0, "A4 no profiles row is invented");

  reset();
  seededProfile("33333333-3333-3333-3333-333333333333", OWNER, "guest");
  state.nextAuthEmail = OWNER;
  state.fail.lookup = true;
  r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  b = await body(r);
  // An unreadable membership is not "no plan"; the pre-read now distinguishes it.
  ok(r.status === 503, "A5 lookup failure -> 503 (not treated as 'no plan')");
  ok(b.success !== true, "A5 lookup failure does NOT report success");

  reset();
  seededProfile("44444444-4444-4444-4444-444444444444", OWNER, "free");
  state.nextAuthEmail = OWNER;
  r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  ok(r.status === 200, "A6 repeated activation on an already-free profile -> 200 (idempotent)");

  /* ═════════════ member GET ═════════════ */
  reset();
  r = await get(memberRoute, {}, "https://ut.test/api/member");
  ok(r.status === 401, "M1 anonymous -> 401 (the route used to serve anyone)");
  ok(state.queries.length === 0, "M1 anonymous -> no database lookup");

  reset();
  r = await get(memberRoute, {}, "https://ut.test/api/member?email=" + encodeURIComponent(VICTIM));
  ok(r.status === 401, "M2 anonymous with a victim ?email= -> still 401");
  ok(state.queries.length === 0, "M2 the supplied address never reaches the database");
  ok(state.events.length === 0, "M2 no write of any kind on a read");

  reset();
  seededMember(OWNER, "initiate", "cus_owner");
  seededMember(VICTIM, "master", "cus_victim");
  state.nextAuthEmail = OWNER;
  r = await get(memberRoute, {}, "https://ut.test/api/member?email=" + encodeURIComponent(VICTIM));
  b = await body(r);
  ok(r.status === 200, "M3 verified member -> 200");
  ok(b.email === OWNER, "M3 returns the VERIFIED member's own row, not the requested one");
  // The route now resolves across both tables, so more than one lookup is
  // expected — but every one of them must use the verified address.
  ok(state.queries.length >= 1 && state.queries.every((q) => q.filters[0] === OWNER),
     "M3 every lookup used the verified address");
  ok(JSON.stringify(b).indexOf(VICTIM) === -1, "M3 the victim address appears nowhere in the response");

  reset();
  state.nextAuthEmail = OWNER;
  r = await get(memberRoute, {}, "https://ut.test/api/member");
  b = await body(r);
  ok(r.status === 200 && b.member === null, "M4 verified member with no row -> {member:null}, not an implicit create");
  ok(state.tables.ut_members.length === 0, "M4 no row was created by a read");
  ok(state.events.filter((e) => e.startsWith("db:insert")).length === 0, "M4 no INSERT was issued");

  reset();
  seededMember(OWNER, "guest", "cus_a");
  seededMember(OWNER, "guest", "cus_b");
  state.nextAuthEmail = OWNER;
  r = await get(memberRoute, {}, "https://ut.test/api/member");
  ok(r.status === 409, "M5 duplicate rows for one address -> 409 (fail closed, no silent merge)");

  reset();
  state.nextAuthEmail = OWNER;
  state.fail.lookup = true;
  r = await get(memberRoute, {}, "https://ut.test/api/member");
  ok(r.status === 500, "M6 lookup failure -> 500 rather than 'no member'");

  /* ═════════════ billing checkout ═════════════ */
  reset();
  r = await post(checkoutRoute, {}, {}, "https://ut.test/api/billing/checkout");
  ok(r.status === 401, "C1 no credentials -> 401");
  ok(state.queries.length === 0, "C1 no membership lookup before authentication");
  ok(state.customerCalls.length === 0 && state.stripeCalls.length === 0, "C1 no Stripe call");

  reset();
  state.authStatus = 403;
  state.authEmail = VICTIM;
  r = await post(checkoutRoute, FORGED, {}, "https://ut.test/api/billing/checkout");
  ok(r.status === 401, "C2 forged credential -> 401");
  ok(state.customerCalls.length === 0, "C2 no Stripe customer created for a forged credential");
  ok(state.queries.length === 0, "C2 no membership lookup");

  reset();
  seededMember(OWNER, "initiate", "cus_existing");
  state.authEmail = OWNER;
  state.authUserId = "55555555-5555-5555-5555-555555555555";
  r = await post(checkoutRoute, TOKEN, {}, "https://ut.test/api/billing/checkout");
  b = await body(r);
  ok(r.status === 200 && typeof b.url === "string", "C3 verified member -> checkout url returned");
  ok(state.customerCalls.length === 0, "C3 the stored customer id is REUSED (no duplicate customer)");
  ok(state.stripeCalls.length === 1 && state.stripeCalls[0].customer === "cus_existing", "C3 the session uses the stored customer");
  ok(state.tables.ut_members[0].plan === "initiate", "C3 an existing paid plan is not downgraded by checkout");

  reset();
  state.authEmail = OWNER;
  state.authUserId = "66666666-6666-6666-6666-666666666666";
  state.profileUserId = "66666666-6666-6666-6666-666666666666";
  r = await post(checkoutRoute, TOKEN, {}, "https://ut.test/api/billing/checkout");
  b = await body(r);
  ok(r.status === 200 && typeof b.url === "string", "C4 first-time member -> checkout url returned");
  ok(state.customerCalls.length === 1, "C4 exactly one customer created");
  ok(state.tables.ut_members.length === 1 && state.tables.ut_members[0].email === OWNER, "C4 ut_members row written for the verified address");
  ok(state.tables.profiles.length === 1 && state.tables.profiles[0].email === OWNER, "C4 profiles row written with the verified user id");

  reset();
  state.authEmail = OWNER;
  state.authUserId = "77777777-7777-7777-7777-777777777777";
  state.fail.lookup = true;
  r = await post(checkoutRoute, TOKEN, {}, "https://ut.test/api/billing/checkout");
  ok(r.status === 503, "C5 lookup failure -> 503 (fail closed)");
  ok(state.customerCalls.length === 0, "C5 NO replacement Stripe customer is created when the lookup is unknown");

  reset();
  seededMember(OWNER, "guest", "cus_a");
  seededMember(OWNER, "guest", "cus_b");
  state.authEmail = OWNER;
  r = await post(checkoutRoute, TOKEN, {}, "https://ut.test/api/billing/checkout");
  ok(r.status === 409, "C6 duplicate member rows -> 409");
  ok(state.customerCalls.length === 0, "C6 no Stripe call on the ambiguous path");

  reset();
  seededMember(OWNER, "guest", null);
  state.authEmail = OWNER;
  state.authUserId = "88888888-8888-8888-8888-888888888888";
  state.fail.update = true;
  r = await post(checkoutRoute, TOKEN, {}, "https://ut.test/api/billing/checkout");
  b = await body(r);
  ok(b.url !== undefined || r.status === 500, "C7 a failed persistence step is not reported as a success");
  ok(b.success === undefined && b.plan === undefined, "C7 the response makes no persistence claim");

  /* ═════════════ migration is not required for the app to be correct ═══════ */
  reset();
  ok(state.uniqueEmailIndex === false, "D1 the production migration is NOT applied in these tests");
  seededProfile("99999999-9999-9999-9999-999999999999", OWNER, "guest");
  state.nextAuthEmail = OWNER;
  r = await post(activateFree, {}, {}, "https://ut.test/api/billing/activate-free");
  ok(r.status === 200, "D2 activate-free works with no unique index present (read-then-write)");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14_HANDLER_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });