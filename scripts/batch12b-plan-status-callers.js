#!/usr/bin/env node
/**
 * batch12b-plan-status-callers.js
 *
 * Coverage for the plan-status route (the closed unauthenticated fallback) and
 * for the caller fallback logic in UTSessionSync / AuthProvider.
 *
 * Executes the REAL route handler, the REAL shared identity helper and the REAL
 * caller functions. Only external boundaries are mocked: the Supabase auth
 * endpoint, the Supabase DB client, NextAuth, the browser Supabase client, and
 * Stripe (to prove it is never touched).
 *
 * No real portal sessions, checkouts, purchases, subscriptions, emails,
 * accounts or database writes.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MOCK_USER_URL = "https://mock.supabase.test/auth/v1/user";
const PGRST116 = {
  code: "PGRST116",
  details: "Results contain 2 rows, application/vnd.pgrst.object+json requires 1 row",
  hint: null,
  message: "JSON object requested, multiple (or no) rows returned",
};

const SYNTHETIC = "synthetic-a@example.invalid";
const SYNTHETIC_B = "synthetic-b@example.invalid";

const state = {};
function reset() {
  state.authStatus = 200;
  state.authEmail = null;
  state.authThrows = false;
  state.nextAuthEmail = null;
  state.db = {
    profiles: { data: undefined, error: null, throws: false },
    ut_members: { data: undefined, error: null, throws: false },
  };
  state.queries = [];
  state.stripeCalls = [];
  state.callerFetches = [];
  state.callerResponse = { status: 200, body: { authenticated: false, plan: "guest" } };
  state.callerThrows = false;
  state.clientSession = null;
  state.setCalls = [];
  state.clearCalls = 0;
}

/* ── boundaries ─────────────────────────────────────────────────────────── */
const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

function dbClient() {
  return {
    from(table) {
      const chain = {
        select() { return chain; },
        eq(col, val) { if (col === "email") chain._email = val; return chain; },
        async limit(n) {
          state.queries.push({ table, email: chain._email });
          const spec = state.db[table];
          if (spec.throws) throw new Error(table + " unavailable");
          if (spec.error) return { data: null, error: spec.error };
          const rows =
            spec.data === undefined || spec.data === null
              ? []
              : Array.isArray(spec.data)
                ? spec.data
                : [spec.data];
          return { data: rows.slice(0, n), error: null };
        },
        async maybeSingle() {
          state.queries.push({ table, email: chain._email });
          const spec = state.db[table];
          if (spec.throws) throw new Error(table + " unavailable");
          if (spec.error) return { data: null, error: spec.error };
          return { data: spec.data === undefined ? null : spec.data, error: null };
        },
      };
      return chain;
    },
  };
}

mockModule("@/lib/supabase", { supabaseAdmin: dbClient() }, { root: ROOT });
mockModule("@/lib/auth", {
  auth: async () => {
    if (state.nextAuthThrows) throw new Error("session failure");
    return state.nextAuthEmail ? { user: { email: state.nextAuthEmail } } : null;
  },
}, { root: ROOT });
mockModule("@/lib/stripe", {
  getStripe: () => ({ billingPortal: { sessions: { create: async (a) => { state.stripeCalls.push(a); return { url: "x" }; } } } }),
}, { root: ROOT });
mockModule("@/lib/supabase-client", {
  supabase: { auth: { getSession: async () => ({ data: { session: state.clientSession } }) } },
}, { root: ROOT });

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

global.fetch = async (url, init) => {
  const u = String(url);
  if (u === MOCK_USER_URL) {
    if (state.authThrows) throw new Error("network down");
    const ok = state.authStatus >= 200 && state.authStatus < 300;
    return { ok, status: state.authStatus, json: async () => ({ email: state.authEmail }) };
  }
  if (u === "/api/billing/session") {
    state.callerFetches.push({ url: u, auth: (init && init.headers && init.headers.Authorization) || null });
    if (state.callerThrows) throw new Error("network down");
    return {
      ok: state.callerResponse.status >= 200 && state.callerResponse.status < 300,
      status: state.callerResponse.status,
      json: async () => state.callerResponse.body,
    };
  }
  if (u.indexOf("plan-status") !== -1) {
    state.callerFetches.push({ url: u, auth: null, planStatus: true });
    throw new Error("plan-status must never be called: " + u);
  }
  throw new Error("unexpected fetch: " + u);
};

// browser globals used by the callers
global.window = {
  __utSetSession: (email, plan) => state.setCalls.push({ email, plan }),
  __utClearSession: () => { state.clearCalls += 1; },
};

const planStatus = require(path.join(ROOT, "src/app/api/billing/plan-status/route.ts"));
const syncMod = require(path.join(ROOT, "src/components/auth/UTSessionSync.tsx"));
const authMod = require(path.join(ROOT, "src/components/auth/AuthProvider.tsx"));

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
function getPlanStatus(query, headers) {
  const url = "https://ut.test/api/billing/plan-status" + (query || "");
  return planStatus.GET(new Request(url, { method: "GET", headers: headers || {} }));
}
const TOKEN = { Authorization: "Bearer valid.token.here" };
const FORGED = { Authorization: "Bearer forged.sig.value" };

(async () => {
  console.log("batch12b-plan-status-callers\n");

  /* ══════════ plan-status ══════════ */

  reset();
  let r = await getPlanStatus("?email=" + encodeURIComponent(SYNTHETIC_B), {});
  let b = await body(r);
  ok(r.status === 200, "PS1 anonymous -> 200");
  ok(b.plan === "guest", "PS1 anonymous -> guest");
  ok(b.stripeCustomerId === undefined, "PS1 no customer id field exposed");
  ok(!JSON.stringify(b).includes(SYNTHETIC_B), "PS1 victim address never echoed");
  ok(state.queries.length === 0, "PS1 no database lookup for an anonymous request");
  ok(state.stripeCalls.length === 0, "PS1 no Stripe call");

  reset();
  state.authStatus = 403; state.authEmail = SYNTHETIC_B;
  b = await body(await getPlanStatus("?email=" + encodeURIComponent(SYNTHETIC_B), FORGED));
  ok(b.plan === "guest", "PS2 forged token -> guest");
  ok(state.queries.length === 0, "PS2 forged token -> no database lookup");
  ok(!JSON.stringify(b).includes(SYNTHETIC_B), "PS2 victim address never echoed");

  // verified A asking for B
  reset();
  state.authEmail = SYNTHETIC;
  state.db.ut_members.data = { plan: "initiate" };
  state.db.profiles.data = { plan: "initiate", stripe_customer_id: "cus_A" };
  r = await getPlanStatus("?email=" + encodeURIComponent(SYNTHETIC_B), TOKEN);
  b = await body(r);
  ok(b.plan === "initiate", "PS3 verified caller gets own plan");
  ok(state.queries.length === 2, "PS3 both tables were actually queried (no vacuous pass)");
  ok(state.queries.every((q) => q.email === SYNTHETIC),
    "PS3 every lookup used the verified identity, never the query email");
  ok(!state.queries.some((q) => q.email === SYNTHETIC_B), "PS3 victim address never queried");
  ok(b.stripeCustomerId === undefined, "PS3 customer id removed from the response");
  ok(!JSON.stringify(b).includes("cus_A"), "PS3 no customer id in the payload");

  reset();
  state.authEmail = SYNTHETIC;
  state.db.ut_members.data = { plan: "free" };
  state.db.profiles.data = { plan: "initiate" };
  b = await body(await getPlanStatus("", TOKEN));
  // Batch 14b: precedence is now "highest entitlement wins". The previous
  // ut_members-first rule reported this paid member (profiles: initiate) as
  // "free" because a lower plan sat in the other table — a downgrade in the
  // answer, and the opposite of what every other reader did.
  ok(b.plan === "initiate", "PS4 highest entitlement wins: a paid plan is not hidden by a lower one");

  reset();
  state.authEmail = SYNTHETIC;
  state.db.ut_members.data = null; state.db.profiles.data = null;
  b = await body(await getPlanStatus("", TOKEN));
  ok(b.plan === "guest", "PS5 missing membership -> guest");

  reset();
  state.authEmail = SYNTHETIC;
  state.db.ut_members.error = PGRST116;
  b = await body(await getPlanStatus("", TOKEN));
  ok(b.plan === "guest", "PS6 duplicate rows -> fail closed guest");

  reset();
  state.authEmail = SYNTHETIC;
  state.db.profiles.throws = true;
  b = await body(await getPlanStatus("", TOKEN));
  ok(b.plan === "guest", "PS7 lookup throws -> fail closed guest");
  ok(b.stripeCustomerId === undefined, "PS7 no data leaked on failure");

  reset();
  state.nextAuthEmail = SYNTHETIC;
  state.db.ut_members.data = { plan: "initiate" };
  b = await body(await getPlanStatus("", {}));
  ok(b.plan === "initiate", "PS8 NextAuth identity accepted");
  ok(state.queries.length === 2, "PS8 both tables queried");
  ok(state.queries.every((q) => q.email === SYNTHETIC), "PS8 lookup keyed on the NextAuth identity");

  reset();
  state.authThrows = true;
  b = await body(await getPlanStatus("?email=" + encodeURIComponent(SYNTHETIC_B)));
  ok(b.plan === "guest", "PS9 verification failure -> guest, no lookup");
  ok(state.queries.length === 0, "PS9 no lookup when verification fails");

  /* ══════════ caller: UTSessionSync ══════════ */

  reset();
  state.clientSession = { access_token: "supa-token" };
  state.callerResponse = { status: 200, body: { authenticated: true, email: SYNTHETIC, plan: "initiate" } };
  await syncMod.syncCurrentSession();
  ok(state.callerFetches.length === 1 && state.callerFetches[0].url === "/api/billing/session",
    "US1 calls the verified session endpoint");
  ok(state.callerFetches[0].auth === "Bearer supa-token", "US1 sends the Supabase token");
  ok(state.setCalls.length === 1 && state.setCalls[0].email === SYNTHETIC,
    "US1 publishes the VERIFIED address from the response");
  ok(state.setCalls[0].plan === "initiate", "US1 publishes the verified plan");
  ok(state.clearCalls === 0, "US1 does not clear on success");

  reset();
  state.clientSession = null;                       // NextAuth cookie path
  state.callerResponse = { status: 200, body: { authenticated: true, email: SYNTHETIC, plan: "free" } };
  await syncMod.syncCurrentSession();
  ok(state.callerFetches[0].auth === null, "US2 no token -> relies on the verified session cookie");
  ok(state.setCalls.length === 1 && state.setCalls[0].email === SYNTHETIC,
    "US2 NextAuth session is published from the verified response");

  reset();
  state.clientSession = { access_token: "t" };
  state.callerResponse = { status: 200, body: { authenticated: false, plan: "guest" } };
  await syncMod.syncCurrentSession();
  ok(state.setCalls.length === 0, "US3 unauthenticated response publishes nothing");
  ok(state.clearCalls === 1, "US3 unauthenticated response clears stale state");

  reset();
  state.clientSession = { access_token: "expired" };
  state.callerResponse = { status: 401, body: { error: "Authentication required" } };
  await syncMod.syncCurrentSession();
  ok(state.setCalls.length === 0, "US4 rejected credential publishes nothing");
  ok(state.clearCalls === 1, "US4 rejected credential clears state");

  reset();
  state.clientSession = { access_token: "t" };
  state.callerThrows = true;
  await syncMod.syncCurrentSession();
  ok(state.clearCalls === 1, "US5 network failure clears rather than caching a stale identity");

  reset();
  state.callerFetches = [];
  state.clientSession = null;
  state.callerResponse = { status: 200, body: { authenticated: false, plan: "guest" } };
  await syncMod.syncCurrentSession();
  ok(!state.callerFetches.some((f) => f.planStatus), "US6 never falls back to the unauthenticated endpoint");

  /* ══════════ caller: AuthProvider.fetchPlan ══════════ */

  reset();
  state.callerResponse = { status: 200, body: { authenticated: true, plan: "initiate", stripeCustomerId: "cus_OWN" } };
  let out = await authMod.fetchPlan("tok");
  ok(out.plan === "initiate", "AP1 returns the verified plan");
  ok(out.stripeCustomerId === "cus_OWN", "AP1 returns the owner's customer id from the verified session");
  ok(state.callerFetches[0].url === "/api/billing/session", "AP1 uses the verified session endpoint");
  ok(state.callerFetches[0].auth === "Bearer tok", "AP1 sends the token when held");

  reset();
  state.callerResponse = { status: 200, body: { authenticated: false, plan: "guest" } };
  out = await authMod.fetchPlan(undefined);
  ok(out.plan === "guest", "AP2 unauthenticated -> guest");
  ok(out.stripeCustomerId === undefined, "AP2 no customer id for an unauthenticated caller");
  ok(state.callerFetches[0].auth === null, "AP2 no token -> cookie path");

  reset();
  state.callerThrows = true;
  out = await authMod.fetchPlan("tok");
  ok(out.plan === "guest", "AP3 failure -> guest");
  ok(!state.callerFetches.some((f) => f.planStatus), "AP3 never uses the unauthenticated endpoint");

  /* ══════════ structural ══════════ */

  const PS = fs.readFileSync(path.join(ROOT, "src/app/api/billing/plan-status/route.ts"), "utf8");
  const US = fs.readFileSync(path.join(ROOT, "src/components/auth/UTSessionSync.tsx"), "utf8");
  const AP = fs.readFileSync(path.join(ROOT, "src/components/auth/AuthProvider.tsx"), "utf8");
  ok(/resolveVerifiedIdentity/.test(PS), "plan-status resolves verified identity");
  ok(!/searchParams/.test(PS), "plan-status never reads query parameters");
  ok(!/stripeCustomerId/.test(PS), "plan-status no longer returns a customer id");
  ok(!/fetch\(`\/api\/billing\/plan-status/.test(US), "UTSessionSync has no plan-status call");
  ok(!/fetch\(`\/api\/billing\/plan-status/.test(AP), "AuthProvider has no plan-status call");
  ok(/__utClearSession/.test(US), "UTSessionSync still clears on failure");
  ok(/supabase\.auth\.signOut\(\)/.test(AP), "AuthProvider sign-out behaviour preserved");
  ok(/export async function fetchPlan/.test(AP), "fetchPlan exported for coverage");
  ok(/export async function syncCurrentSession/.test(US), "syncCurrentSession exported for coverage");

  console.log(`\n  PASS ${passed}   FAIL ${failures.length}`);
  if (failures.length) {
    console.log("\nALL_BATCH12B_PLAN_STATUS_CALLER_TESTS_FAILED");
    process.exit(1);
  }
  console.log("ALL_BATCH12B_PLAN_STATUS_CALLER_TESTS_PASSED");
})();