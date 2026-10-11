#!/usr/bin/env node
/**
 * batch14l-linkage-sequence.js
 *
 * FAILING REGRESSION for the confirmed defect. Written BEFORE any production
 * change. Real handler + authority helper + reader; Stripe mocked.
 *
 * Sequence:
 *   both tables link to sub_A
 *   cancel A              -> member linkage clears, profile linkage stays A
 *   reactivate via sub_B  -> member linkage = B, profile linkage stays A
 *   deliver B's update again -> must NOT fail because earlier SUCCESSFUL writes
 *                               manufactured a conflicting-linkage state.
 *
 * Asserts, after EVERY delivery: both tables' subscription linkage, both
 * statuses, the effective entitlement and the response.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const state = {};

const COLUMNS = {
  profiles: ["user_id", "email", "display_name", "plan", "subscription_status",
             "stripe_customer_id", "stripe_subscription_id", "current_period_end",
             "created_at", "updated_at"],
  ut_members: ["id", "email", "plan", "subscription_status", "stripe_customer_id",
               "stripe_subscription_id", "current_period_end", "created_at", "updated_at"],
};

function reset() {
  state.tables = { profiles: [], ut_members: [] };
  state.failUpdate = {};
  state.stripeFail = false;
  state.stripeStatus = undefined;
  state.subs = {};
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
        if (
          !ctx.filters.every(([c, v, op]) => {
            // `IS NULL` matches a SQL NULL; a fixture row models that either as
            // an explicit null or by omitting the column.
            if (op === "is" && v === null) return r[c] === null || r[c] === undefined;
            return r[c] === v;
          })
        ) {
          return false;
        }
        if (ctx.orSpec) {
          return ctx.orSpec.split(",").some((cl) => {
            const m = cl.trim().match(/^(\w+)\.(eq|is)\.(.+)$/);
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
          if (ctx.op === "update") ctx.returning = true;
          return api;
        },
        eq(c, v) { ctx.filters.push([c, v, "eq"]); return api; },
        is(c, v) { ctx.filters.push([c, v, "is"]); return api; },
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
            resolve({ data: ctx.returning ? target.map((r) => ({ ...r })) : null, error: null });
            return;
          }
          if (ctx.op === "select") {
            if (ctx.badColumn) { resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) }); return; }
            resolve({ data: match().slice(0, 1)[0] ?? null, error: null });
            return;
          }
          resolve({ data: null, error: null });
        },
      };
      return api;
    },
  };
}

function subsOf() {
  const subs = Object.assign({}, state.subs || {});
  const row = state.tables.ut_members[0];
  if (row && row.stripe_subscription_id && subs[row.stripe_subscription_id] === undefined) {
    subs[row.stripe_subscription_id] = row.subscription_status || "active";
  }
  const ev = state.event;
  const obj = ev && ev.data && ev.data.object;
  if (ev && String(ev.type).startsWith("customer.subscription.") && obj && obj.id && obj.status) {
    subs[obj.id] = obj.status;
  }
  if (state.stripeStatus) for (const k of Object.keys(subs)) subs[k] = state.stripeStatus;
  return subs;
}

state.event = null;
mockModule("@/lib/supabase", { supabaseAdmin: dbClient() }, { root: ROOT });
mockModule("@/lib/stripe", {
  getStripe: () => ({
    webhooks: { constructEvent: () => state.event },
    customers: { create: async () => ({ id: "cus_new" }) },
    checkout: { sessions: { create: async () => ({ url: "x" }) } },
    subscriptions: {
      retrieve: async (id) => {
        if (state.stripeFail) throw new Error("stripe unreachable");
        const subs = subsOf();
        const requested = id || "sub_1";
        if (!(requested in subs)) { const e = new Error("no such subscription"); e.statusCode = 404; throw e; }
        return { id: requested, status: subs[requested], customer: CUS };
      },
      list: async () => {
        if (state.stripeFail) throw new Error("stripe unreachable");
        const subs = subsOf();
        return { data: Object.entries(subs).map(([id, status]) => ({ id, status, customer: CUS })), has_more: false };
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
async function body(r) { try { return await r.clone().json(); } catch { return {}; } }
const post = async (label) => {
  const res = await webhook.POST(new Request("https://ut.test/api/stripe-webhook", {
    method: "POST", headers: { "stripe-signature": "s" }, body: "{}",
  }));
  const b = await body(res);
  console.error(`    ${label}: status=${res.status} failures=${JSON.stringify(b.membershipFailures || [])}`);
  return res;
};
const EMAIL = "member@example.com", CUS = "cus_seq", A = "sub_A", B = "sub_B";
const ev = (type, obj) => ({ id: "e", type, data: { object: obj } });
const MEM = () => state.tables.ut_members[0] || {};
const PROF = () => state.tables.profiles[0] || {};
const eff = async () => { const r = await resolveMembershipPlan(dbClient(), EMAIL); return r.ok ? r.membership.plan : "READ_ERROR"; };

(async () => {
  console.log("batch14l-linkage-sequence (expect a FAILING last delivery)\n");

  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  ok(MEM().stripe_subscription_id === A && PROF().stripe_subscription_id === A, "T0 both tables link to sub_A");

  // 1. cancel A
  state.event = ev("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  let r = await post("cancel A");
  ok(r.status === 200, "T1 cancel A -> 200 (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === null, "T1 member linkage cleared (is " + MEM().stripe_subscription_id + ")");
  ok(MEM().subscription_status === "canceled", "T1 member status canceled (is " + MEM().subscription_status + ")");
  ok((await eff()) === "guest" || (await eff()) === "free", "T1 entitlement revoked (is " + (await eff()) + ")");

  // 2. reactivate through live sub_B
  state.event = ev("customer.subscription.created", { id: B, customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  r = await post("reactivate B");
  ok(r.status === 200, "T2 reactivate B -> 200 (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B, "T2 member linkage is B (is " + MEM().stripe_subscription_id + ")");
  ok(MEM().subscription_status === "active", "T2 member status active (is " + MEM().subscription_status + ")");
  ok((await eff()) === "initiate", "T2 entitlement restored (is " + (await eff()) + ")");

  // 3. deliver B's update AGAIN — must not fail
  state.event = ev("customer.subscription.updated", { id: B, customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  r = await post("repeat B update");
  const b3 = await body(r);
  ok(r.status === 200,
    "T3 repeating B's update must NOT fail because earlier successful writes manufactured conflicting linkage (got " + r.status + ", failures=" + JSON.stringify(b3.membershipFailures || []) + ")");
  ok(MEM().stripe_subscription_id === B, "T3 member linkage still B (is " + MEM().stripe_subscription_id + ")");
  ok(MEM().subscription_status === "active", "T3 member status still active (is " + MEM().subscription_status + ")");
  ok((await eff()) === "initiate", "T3 entitlement still paid (is " + (await eff()) + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14L_SEQUENCE_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
