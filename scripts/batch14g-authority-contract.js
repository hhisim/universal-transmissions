#!/usr/bin/env node
/**
 * batch14g-authority-contract.js
 *
 * Four demonstrated authority failures. Real handler, helper, writer and reader.
 * Stripe mocked (read-only retrieval only).
 *
 * G1 Stripe says active; a delayed payload says unpaid  -> status AND plan must
 *    both follow the authority, not a mixture.
 * G2 Stripe returns NO subscriptions; a successful invoice arrives -> must not
 *    grant entitlement from the historical invoice.
 * G3 Stripe returns NO subscriptions; an old active lifecycle snapshot -> must
 *    not fall back to its payload and resurrect the membership.
 * G4 No ut_members row, profiles.plan=initiate; the cancellation's profile
 *    write FAILS -> must not acknowledge a completed revocation while the
 *    reader still reports paid access.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const state = {};

const COLUMNS = {
  profiles: ["user_id", "email", "display_name", "plan", "subscription_status",
             "stripe_customer_id", "stripe_subscription_id", "price_id",
             "current_period_end", "preferred_lang", "created_at", "updated_at"],
  ut_members: ["id", "email", "plan", "subscription_status", "stripe_customer_id",
               "stripe_subscription_id", "current_period_end", "created_at", "updated_at"],
};

function reset() {
  state.tables = { profiles: [], ut_members: [] };
  state.failUpdate = {};
  state.failSelect = {};
  state.stripeFail = false;
  state.stripeEmpty = false;      // Stripe reports NO subscriptions
  state.stripeStatus = undefined;
  state.stripeId = "sub_1";
}

const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

function dbClient() {
  return {
    from(table) {
      const ctx = { table, filters: [], payload: null, op: null };
      const rows = () => state.tables[table];
      const cols = COLUMNS[table] || [];
      const match = () => rows().filter((r) => {
        if (!ctx.filters.every(([c, v]) => r[c] === v)) return false;
        if (ctx.orSpec) {
          return ctx.orSpec.split(",").some((clause) => {
            const m = clause.trim().match(/^(\w+)\.(eq|is)\.(.+)$/);
            if (!m) return true;
            const [, col, op, val] = m;
            return op === "is" && val === "null" ? r[col] === null : String(r[col]) === val;
          });
        }
        return true;
      });
      const err = (c, m) => ({ code: c, message: m, details: null, hint: null });
      const api = {
        select(c) {
          if (!ctx.op) {
            ctx.op = "select";
            if (c && c !== "*") {
              const bad = c.split(",").map((x) => x.trim()).filter((x) => x && !cols.includes(x));
              if (bad.length) ctx.badColumn = bad[0];
            }
          }
          return api;
        },
        eq(c, v) { ctx.filters.push([c, v]); return api; },
        is(c, v) { ctx.filters.push([c, v]); return api; },
        neq(c, v) { ctx.neq = [c, v]; return api; },
        or(spec) { ctx.orSpec = spec; return api; },
        limit(n) {
          if (ctx.badColumn) return Promise.resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) });
          return Promise.resolve({ data: match().slice(0, n).map((r) => ({ ...r })), error: null });
        },
        update(p) { ctx.op = "update"; ctx.payload = p; return api; },
        insert(p) { ctx.op = "insert"; ctx.payload = p; return api; },
        single() {
          if (ctx.badColumn) return Promise.resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) });
          if (ctx.op === "update") {
            const forced = state.failUpdate[table];
            if (forced) return Promise.resolve({ data: null, error: err(forced.code || "XX000", forced.message || "update failed") });
            const m = match();
            if (m.length !== 1) return Promise.resolve({ data: null, error: err("PGRST116", "no row matched") });
            Object.assign(m[0], ctx.payload);
            return Promise.resolve({ data: { ...m[0] }, error: null });
          }
          if (ctx.op === "insert") {
            const row = { ...ctx.payload };
            if (table === "profiles" && !row.user_id) return Promise.resolve({ data: null, error: err("23502", "user_id not null") });
            if (table === "ut_members") row.id = row.id || "id-" + rows().length;
            rows().push(row);
            return Promise.resolve({ data: { ...row }, error: null });
          }
          const m = match();
          if (m.length !== 1) return Promise.resolve({ data: null, error: err("PGRST116", "no row") });
          return Promise.resolve({ data: { ...m[0] }, error: null });
        },
        then(resolve) {
          if (ctx.op === "update") {
            if (ctx.badColumn) { resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) }); return; }
            const forced = state.failUpdate[table];
            if (forced) { resolve({ data: null, error: err(forced.code || "XX000", forced.message || "update failed") }); return; }
            let target = match();
            if (ctx.neq) target = target.filter((r) => r[ctx.neq[0]] !== ctx.neq[1]);
            target.forEach((r) => Object.assign(r, ctx.payload));
            resolve({ data: null, error: null });
            return;
          }
          if (ctx.op === "select") {
            if (ctx.badColumn) { resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) }); return; }
            resolve({ data: match().slice(0, 1)[0] ?? null, error: state.failSelect[table] || null });
            return;
          }
          resolve({ data: null, error: null });
        },
      };
      return api;
    },
  };
}

state.event = null;
mockModule("@/lib/supabase", { supabaseAdmin: dbClient() }, { root: ROOT });
mockModule("@/lib/stripe", {
  getStripe: () => ({
    webhooks: { constructEvent: () => state.event },
    customers: { create: async () => ({ id: "cus_new" }) },
    checkout: { sessions: { create: async () => ({ url: "x" }) } },
    subscriptions: {
      retrieve: async () => {
        if (state.stripeFail) throw new Error("stripe unreachable");
        if (state.stripeEmpty) { const e = new Error("no such subscription"); e.statusCode = 404; throw e; }
        return { id: state.stripeId, status: state.stripeStatus || "active", customer: "cus_1" };
      },
      list: async () => {
        if (state.stripeFail) throw new Error("stripe unreachable");
        if (state.stripeEmpty) return { data: [] };
        return { data: [{ id: state.stripeId, status: state.stripeStatus || "active", customer: "cus_1" }] };
      },
    },
  }),
}, { root: ROOT });
mockModule("@/lib/auth", { auth: async () => null }, { root: ROOT });
mockModule("@supabase/supabase-js", { createClient: () => dbClient(), SupabaseClient: class {} }, { root: ROOT });

process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.UT_SUPABASE_URL = "https://mock.supabase.test";
process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "k";
process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.test";
process.env.AKASHA_BOT_TOKEN = "";
global.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });

const webhook = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));
const { resolveMembershipPlan } = require(path.join(ROOT, "src/lib/membership-plan.ts"));

let passed = 0; const failures = [];
function ok(c, l) { if (c) { passed += 1; return true; } failures.push(l); console.error("  FAIL:", l); return false; }
async function body(r) { try { return await r.json(); } catch { return {}; } }
const post = () => webhook.POST(new Request("https://ut.test/api/stripe-webhook", { method: "POST", headers: { "stripe-signature": "s" }, body: "{}" }));
const EMAIL = "member@example.com", CUS = "cus_1";
const ev = (type, obj) => ({ id: "e", type, data: { object: obj } });
const M = () => state.tables.ut_members[0];
async function effective() {
  const r = await resolveMembershipPlan(dbClient(), EMAIL);
  return r.ok ? r.membership.plan : "READ_ERROR";
}

(async () => {
  console.log("batch14g-authority-contract\n");

  // G1 — authoritative active vs a delayed unpaid payload
  console.log("  --- G1 authority must drive plan AND status together ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: "sub_1" });
  state.stripeStatus = "active";
  state.event = ev("customer.subscription.updated", { id: "sub_1", customer: CUS, status: "unpaid", current_period_end: 1900000000, metadata: { email: EMAIL } });
  await post();
  ok(M().subscription_status === "active", "G1 status follows the authority (is " + M().subscription_status + ")");
  ok(M().plan === "initiate", "G1 plan follows the authority, not the historical payload (is " + M().plan + ")");
  ok(await effective() === "initiate", "G1 entitlement is paid (authority says active)");

  // G2 — Stripe reports NO subscription; a successful invoice must not grant
  console.log("  --- G2 no current subscription: an invoice must not grant ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "guest", subscription_status: "canceled", stripe_customer_id: CUS, stripe_subscription_id: null });
  state.stripeEmpty = true;
  state.event = ev("invoice.payment_succeeded", { id: "in_old", customer: CUS, customer_email: EMAIL, subscription: "sub_old" });
  const r2 = await post();
  ok(M().plan === "guest", "G2 the historical invoice does not grant entitlement (plan is " + M().plan + ")");
  ok(await effective() === "guest", "G2 entitlement stays guest");
  ok(M().stripe_subscription_id === null, "G2 the old invoice does not install a subscription id");

  // G3 — Stripe reports NO subscription; an old active snapshot must not resurrect
  console.log("  --- G3 no current subscription: an old active snapshot must not resurrect ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "guest", subscription_status: "canceled", stripe_customer_id: CUS, stripe_subscription_id: "sub_1" });
  state.stripeEmpty = true;
  state.event = ev("customer.subscription.updated", { id: "sub_1", customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  await post();
  ok(M().plan === "guest", "G3 the payload active snapshot does not grant (plan is " + M().plan + ")");
  ok(await effective() === "guest", "G3 entitlement stays guest");

  // G4 — profiles-only entitlement; the cancellation mirror fails
  console.log("  --- G4 profiles-only paid access; failed cancellation mirror ---");
  reset();
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: "sub_1" });
  state.stripeStatus = "canceled";
  state.event = ev("customer.subscription.deleted", { id: "sub_1", customer: CUS, metadata: { email: EMAIL } });
  state.failUpdate = { profiles: { message: "mirror down" } };
  const r4 = await post();
  ok(r4.status === 500,
    "G4 a revocation that did not fully complete must NOT be acknowledged as success (got " + r4.status + ")");
  const b4 = await body(r4);
  ok(Array.isArray(b4.membershipFailures) && b4.membershipFailures.length > 0,
    "G4 the incomplete revocation is named in the response");
  // with the mirror healthy, the retry must complete the revocation
  state.failUpdate = {};
  const r4b = await post();
  ok(r4b.status === 200, "G4 the retry is acknowledged (got " + r4b.status + ")");
  const afterRetry = await effective();
  ok(afterRetry === "guest" || afterRetry === "free",
    "G4 after the retry access is revoked / non-paid (reader says " + afterRetry + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14G_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
