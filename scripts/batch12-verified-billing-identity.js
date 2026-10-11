#!/usr/bin/env node
/**
 * batch12-verified-billing-identity.js
 *
 * Behavioural tests for /api/billing/session and /api/billing/portal.
 *
 * Executes the REAL route handlers through the project's own TS require shim.
 * Only external boundaries are mocked: the Supabase auth endpoint (global
 * fetch), the Supabase DB client, NextAuth's session lookup, and Stripe. The
 * authorization logic itself runs unaltered.
 *
 * No real Stripe portal sessions, checkouts, purchases, subscriptions, emails,
 * account creation or database writes occur.
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

const VICTIM = "victim-member@example.com";
const OWNER = "owner@example.com";

const state = {};

function reset() {
  state.authStatus = 200;
  state.authEmail = null;
  state.authThrows = false;
  state.nextAuthEmail = null;
  state.nextAuthThrows = false;
  state.db = {
    profiles: { data: undefined, error: null, throws: false },
    ut_members: { data: undefined, error: null, throws: false },
  };
  state.queries = [];      // [{table, email, columns}]
  state.events = [];       // ordered side-effect log
  state.stripeCalls = [];
  state.stripeThrows = false;
  state.stripeUrl = "https://billing.stripe.test/session/abc";
}

/* ── boundaries ─────────────────────────────────────────────────────────── */
const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

function dbClient() {
  return {
    from(table) {
      const chain = {
        _table: table,
        _email: undefined,
        _columns: undefined,
        select(cols) { this._columns = cols; return this; },
        eq(col, val) { if (col === "email") this._email = val; return this; },
        async limit(n) {
          state.queries.push({ table, email: this._email, columns: this._columns });
          state.events.push("db:" + table);
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
          state.queries.push({ table, email: this._email, columns: this._columns });
          state.events.push("db:" + table);
          const spec = state.db[table];
          if (spec.throws) throw new Error(table + " unavailable");
          if (spec.error) return { data: null, error: spec.error };
          return {
            data: spec.data === undefined ? null : spec.data,
            error: null,
          };
        },
      };
      return chain;
    },
  };
}

const fakeStripe = {
  billingPortal: {
    sessions: {
      create: async (args) => {
        state.events.push("stripe:portal");
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

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
process.env.NEXT_PUBLIC_BASE_URL = "https://mock.ut.test";

global.fetch = async (url) => {
  if (String(url) === MOCK_USER_URL) {
    if (state.authThrows) throw new Error("network down");
    const ok = state.authStatus >= 200 && state.authStatus < 300;
    return { ok, status: state.authStatus, json: async () => ({ email: state.authEmail }) };
  }
  throw new Error("unexpected fetch: " + url);
};

const sessionRoute = require(path.join(ROOT, "src/app/api/billing/session/route.ts"));
const portalRoute = require(path.join(ROOT, "src/app/api/billing/portal/route.ts"));

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
function getSession(headers, url) {
  return sessionRoute.GET(new Request(url || "https://ut.test/api/billing/session",
    { method: "GET", headers: headers || {} }));
}
function postPortal(headers, payload, url) {
  const h = Object.assign({ "Content-Type": "application/json" }, headers || {});
  return portalRoute.POST(new Request(url || "https://ut.test/api/billing/portal",
    { method: "POST", headers: h, body: JSON.stringify(payload === undefined ? {} : payload) }));
}
const TOKEN = { Authorization: "Bearer valid.looking.token" };
const FORGED = { Authorization: "Bearer forged.unsigned.token" };

function assertNoSideEffects(label) {
  ok(state.queries.length === 0, label + " -> no membership lookup before authentication");
  ok(state.stripeCalls.length === 0, label + " -> no Stripe call");
  ok(state.events.length === 0, label + " -> no side effect of any kind");
}

(async () => {
  console.log("batch12-verified-billing-identity\n");

  /* ══════════ SESSION ══════════ */

  reset();
  let r = await getSession({});
  let b = await body(r);
  ok(r.status === 200, "S1 anonymous -> 200 (caller contract)");
  ok(b.authenticated === false && b.plan === "guest", "S1 anonymous -> {authenticated:false, plan:'guest'}");
  ok(b.email === undefined && b.stripeCustomerId === undefined, "S1 anonymous exposes NO member data");
  assertNoSideEffects("S1 anonymous");

  reset();
  r = await getSession(FORGED);
  b = await body(r);
  ok(r.status === 200 && b.authenticated === false && b.plan === "guest",
    "S2 unsigned/forged token -> not authenticated, no member data");
  assertNoSideEffects("S2 forged token");

  // the decisive forgery: a forged token naming a real member must NOT authenticate
  reset();
  state.authStatus = 403;                 // Supabase rejects the signature
  state.authEmail = VICTIM;               // payload would have decoded to this
  r = await getSession(FORGED);
  b = await body(r);
  ok(b.authenticated === false, "S3 forged payload naming a victim does NOT authenticate");
  ok(b.email !== VICTIM, "S3 victim address never echoed");
  assertNoSideEffects("S3 forged payload naming a victim");

  reset();
  state.authThrows = true;
  b = await body(await getSession(TOKEN));
  ok(b.authenticated === false && b.plan === "guest", "S4 auth verification throws -> not authenticated");
  assertNoSideEffects("S4 auth throws");

  reset();
  state.authEmail = OWNER;
  state.db.profiles.data = { plan: "initiate", stripe_customer_id: "cus_OWN" };
  state.db.ut_members.data = { plan: "initiate", subscription_status: "active", current_period_end: "2026-11-01T00:00:00Z" };
  r = await getSession(TOKEN);
  b = await body(r);
  ok(r.status === 200 && b.authenticated === true, "S5 verified identity -> authenticated");
  ok(b.email === OWNER, "S5 email is the VERIFIED address");
  ok(b.plan === "initiate", "S5 plan resolved from the member record");
  ok(b.stripeCustomerId === "cus_OWN", "S5 stripeCustomerId from own record");
  ok(b.subscription_status === "active" && b.current_period_end === "2026-11-01T00:00:00Z",
    "S5 subscription_status and current_period_end preserved");
  ok(typeof b.plan === "string" && "authenticated" in b && "email" in b,
    "S5 response keys compatible with existing callers");
  ok(state.queries.every((q) => q.email === OWNER),
    "S5 every membership lookup used the verified identity");
  ok(state.queries.length === 2, "S5 both tables read once");

  // forged victim address in query string must not influence anything
  reset();
  state.authEmail = OWNER;
  state.db.profiles.data = { plan: "free", stripe_customer_id: null };
  state.db.ut_members.data = null;
  r = await getSession(TOKEN, "https://ut.test/api/billing/session?email=" + encodeURIComponent(VICTIM));
  b = await body(r);
  ok(b.email === OWNER, "S6?email=<victim> ignored; verified identity wins");
  ok(state.queries.every((q) => q.email === OWNER), "S6 victim address never used as a lookup key");

  reset();
  state.authEmail = OWNER;
  state.db.profiles.data = null;
  state.db.ut_members.data = null;
  b = await body(await getSession(TOKEN));
  ok(b.authenticated === true && b.plan === "guest", "S7 missing records -> authenticated, plan guest");
  ok(b.stripeCustomerId === null, "S7 no customer id for a missing record");

  reset();
  state.authEmail = OWNER;
  state.db.profiles.error = PGRST116;
  b = await body(await getSession(TOKEN));
  ok(b.authenticated === false && b.plan === "guest", "S8 duplicate records -> fail closed");
  ok(b.stripeCustomerId === undefined, "S8 duplicate records expose no customer id");
  ok(b.email === undefined, "S8 duplicate records expose no member data");

  reset();
  state.authEmail = OWNER;
  state.db.profiles.throws = true;
  b = await body(await getSession(TOKEN));
  ok(b.authenticated === false && b.plan === "guest", "S9 lookup throws -> fail closed");
  ok(b.stripeCustomerId === undefined, "S9 no customer id leaked on failure");

  reset();
  state.nextAuthEmail = OWNER;             // no Bearer token: NextAuth path
  state.db.profiles.data = { plan: "initiate", stripe_customer_id: "cus_N" };
  state.db.ut_members.data = null;
  b = await body(await getSession({}));
  ok(b.authenticated === true && b.email === OWNER, "S10 NextAuth identity accepted");
  ok(state.queries.every((q) => q.email === OWNER), "S10 NextAuth lookup uses verified identity");

  /* ══════════ PORTAL ══════════ */

  reset();
  r = await postPortal({});
  ok(r.status === 401, "P1 anonymous -> 401");
  assertNoSideEffects("P1 anonymous");

  reset();
  r = await postPortal(FORGED);
  ok(r.status === 401, "P2 malformed/forged credential -> 401");
  assertNoSideEffects("P2 forged credential");

  reset();
  state.authStatus = 401; state.authEmail = VICTIM;
  r = await postPortal(FORGED);
  ok(r.status === 401, "P3 forged payload naming a victim -> 401");
  assertNoSideEffects("P3 forged payload naming a victim");

  reset();
  state.nextAuthThrows = true;
  r = await postPortal(TOKEN);
  ok(r.status === 401, "P4 auth failure -> 401");
  ok(state.stripeCalls.length === 0, "P4 auth failure -> no Stripe call");

  // the core cross-account attack: forged victim identity must not select their customer
  reset();
  state.authEmail = OWNER;
  state.db.ut_members.data = { stripe_customer_id: "cus_OWN" };
  state.db.profiles.data = { stripe_customer_id: "cus_VICTIM" };
  r = await postPortal(TOKEN);
  b = await body(r);
  ok(r.status === 200 && typeof b.url === "string", "P5 verified caller -> 200 {url}");
  ok(state.stripeCalls.length === 1, "P5 exactly one Stripe portal call");
  ok(state.stripeCalls[0]?.customer === "cus_OWN",
    "P5 portal uses the VERIFIED identity's stored customer");
  ok(state.queries.every((q) => q.email === OWNER),
    "P5 every customer lookup used the verified identity");
  ok(state.stripeCalls[0]?.customer !== "cus_VICTIM", "P5 victim customer never selected");
  ok(state.stripeCalls[0]?.return_url === "https://mock.ut.test/account", "P5 return_url contract kept");

  // caller-supplied customer identity is ignored
  reset();
  state.authEmail = OWNER;
  state.db.ut_members.data = { stripe_customer_id: "cus_OWN" };
  r = await postPortal(TOKEN,
    { customer: "cus_VICTIM", stripeCustomerId: "cus_VICTIM", customer_id: "cus_VICTIM", email: VICTIM });
  b = await body(r);
  ok(r.status === 200 && state.stripeCalls[0]?.customer === "cus_OWN",
    "P6 supplied customer id IGNORED; own stored customer used");
  ok(state.queries.every((q) => q.email === OWNER), "P6 supplied victim email IGNORED for lookup");

  reset();
  state.authEmail = OWNER;
  state.db.ut_members.data = null;
  state.db.profiles.data = { stripe_customer_id: "cus_PROFILE" };
  r = await postPortal(TOKEN);
  ok(r.status === 200 && state.stripeCalls[0]?.customer === "cus_PROFILE",
    "P7 profiles fallback preserved (ut_members first, then profiles)");

  reset();
  state.authEmail = OWNER;
  state.db.ut_members.data = null;
  state.db.profiles.data = null;
  r = await postPortal(TOKEN);
  b = await body(r);
  ok(r.status === 404, "P8 no stored customer -> 404");
  ok(typeof b.error === "string", "P8 404 keeps the error contract");
  ok(state.stripeCalls.length === 0, "P8 no Stripe call without a customer");

  reset();
  state.authEmail = OWNER;
  state.db.ut_members.error = PGRST116;
  r = await postPortal(TOKEN);
  ok(r.status === 500, "P9 duplicate records -> fail closed 500");
  ok(state.stripeCalls.length === 0, "P9 duplicate records -> no Stripe call");

  reset();
  state.authEmail = OWNER;
  state.db.ut_members.throws = true;
  r = await postPortal(TOKEN);
  ok(r.status === 500, "P10 lookup throws -> fail closed 500");
  ok(state.stripeCalls.length === 0, "P10 no Stripe call on lookup failure");

  reset();
  state.authEmail = OWNER;
  state.db.ut_members.data = { stripe_customer_id: "cus_OWN" };
  state.stripeThrows = true;
  r = await postPortal(TOKEN);
  ok(r.status === 500, "P11 Stripe failure -> 500");
  ok(typeof (await body(r)).error === "string", "P11 Stripe failure keeps the error contract");

  reset();
  state.nextAuthEmail = OWNER;
  state.db.ut_members.data = { stripe_customer_id: "cus_N" };
  r = await postPortal({});
  ok(r.status === 200 && state.stripeCalls[0]?.customer === "cus_N",
    "P12 NextAuth identity accepted for portal");

  /* ── ordering: nothing happens before authentication ──────────────────── */
  reset();
  state.authStatus = 403; state.authEmail = VICTIM;
  await postPortal(FORGED);
  ok(state.events[0] === undefined || !state.events.includes("stripe:portal"),
    "O1 rejected portal request never reached Stripe");
  ok(state.events.filter((e) => e.startsWith("db:")).length === 0,
    "O1 rejected portal request never reached the database");

  /* ── structural guarantees ────────────────────────────────────────────── */
  const S = fs.readFileSync(path.join(ROOT, "src/app/api/billing/session/route.ts"), "utf8");
  const P = fs.readFileSync(path.join(ROOT, "src/app/api/billing/portal/route.ts"), "utf8");
  const V = fs.readFileSync(path.join(ROOT, "src/lib/verified-identity.ts"), "utf8");
  for (const [name, src] of [["session", S], ["portal", P]]) {
    ok(!/decodeEmailFromToken/.test(src), `${name} route no longer defines/uses unsigned decode`);
    ok(/from "@\/lib\/verified-identity"/.test(src), `${name} route uses the shared verified identity`);
  }
  ok(!/customers\.create/.test(P), "portal never creates a replacement Stripe customer");
  ok(/resolveVerifiedIdentity\(req\)/.test(P), "portal resolves identity from the request");
  // Compare call sites INSIDE the POST body; the earlier indexOf hit the
  // function DEFINITION (declared above POST) and gave a meaningless order.
  const postBody = P.slice(P.indexOf("export async function POST"));
  const authIdx = postBody.indexOf("resolveVerifiedIdentity(req)");
  const lookIdx = postBody.indexOf("lookupStripeCustomerId(");
  const stripeIdx = postBody.indexOf("billingPortal.sessions.create");
  ok(authIdx > -1 && lookIdx > -1 && stripeIdx > -1, "portal POST has all three steps");
  ok(authIdx < lookIdx && lookIdx < stripeIdx,
    "portal ordering inside POST: authenticate, then lookup, then Stripe");
  // and the lookup helper must be keyed on the verified address, never a body field
  const lookFn = P.slice(P.indexOf("async function lookupStripeCustomerId"), P.indexOf("export async function POST"));
  ok(/eq\("email", email\)/.test(lookFn), "portal lookup filters on the email argument");
  ok(!/req\.|json\(\)/.test(lookFn), "portal lookup never reads the request body");
  ok(/payload\.email/.test(V) === false, "helper never reads payload.email");

  console.log(`\n  PASS ${passed}   FAIL ${failures.length}`);
  if (failures.length) {
    console.log("\nALL_BATCH12_BILLING_IDENTITY_TESTS_FAILED");
    process.exit(1);
  }
  console.log("ALL_BATCH12_BILLING_IDENTITY_TESTS_PASSED");
})();