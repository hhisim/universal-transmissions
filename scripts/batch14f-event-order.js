#!/usr/bin/env node
/**
 * batch14f-event-order.js
 *
 * Regression tests for reproduced event-order failures. Stripe is MOCKED
 * (read-only retrieval only); no live event resend, purchase or member write.
 *
 * A. active subscription B on file; an invoice.payment_succeeded for the OLDER
 *    subscription A overwrites the stored linkage to A; subscription.deleted
 *    for A then revokes B's still-active membership.
 * B. a member revoked with status `unpaid` (or `incomplete_expired`); a
 *    delayed invoice.payment_failed rewrites the status to `past_due` and
 *    restores entitlement.
 * C. a cancelled subscription; an older subscription.updated snapshot
 *    reporting `active` restores entitlement.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const state = {};

const COLUMNS = {
  profiles: ["user_id", "email", "display_name", "plan", "subscription_status",
             "stripe_customer_id", "stripe_subscription_id", "price_id",
             "current_period_end", "preferred_lang", "entitlement_authority_at", "created_at", "updated_at"],
  ut_members: ["id", "email", "plan", "subscription_status", "stripe_customer_id",
               "stripe_subscription_id", "current_period_end", "entitlement_authority_at", "created_at", "updated_at"],
};

function reset() {
  state.tables = { profiles: [], ut_members: [] };
  state.failUpdate = {};
  state.failSelect = {};
  state.stripeFail = false;
  // what Stripe authoritatively reports for this customer
  state.stripeCurrent = null;   // { id, status }
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
          if (ctx.op === "update") ctx.returning = true;
          return api;
        },
        eq(c, v) { ctx.filters.push([c, v, "eq"]); return api; },
        is(c, v) { ctx.filters.push([c, v, "is"]); return api; },
        neq(c, v) { ctx.neq = [c, v]; return api; },
        not(c, o, v) { ctx.neq = [c, v]; return api; },
        or(spec) { ctx.orSpec = spec; return api; },
        limit(n) {
          if (ctx.badColumn) return Promise.resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) });
          if (state.failSelect[table]) return Promise.resolve({ data: null, error: state.failSelect[table] });
          return Promise.resolve({ data: match().slice(0, n).map((r) => ({ ...r })), error: null });
        },
        update(p) { ctx.op = "update"; ctx.payload = p; return api; },
        insert(p) { ctx.op = "insert"; ctx.payload = p; return api; },
        single() {
          if (ctx.badColumn) return Promise.resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) });
          if (ctx.op === "update") {
            const forced = state.failUpdate[table];
            if (forced) return Promise.resolve({ data: null, error: err(forced.code || "XX000", forced.message || "update failed") });
            if (state.throwUpdate && state.throwUpdate[table]) throw new Error("db threw");
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
            if (state.throwUpdate && state.throwUpdate[table]) throw new Error("db threw");
            let target = match();
            if (ctx.neq) target = target.filter((r) => r[ctx.neq[0]] !== ctx.neq[1]);
            target.forEach((r) => Object.assign(r, ctx.payload));
            resolve({ data: ctx.returning ? target.map((r) => ({ ...r })) : null, error: null });
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
      // READ-ONLY authoritative retrieval
      retrieve: async () => {
        if (state.stripeFail) throw new Error("stripe unreachable");
        if (!state.stripeCurrent) { const e = new Error("no such subscription"); e.statusCode = 404; throw e; }
        return { id: state.stripeCurrent.id, status: state.stripeCurrent.status, customer: "cus_1" };
      },
      list: async () => {
        if (state.stripeFail) throw new Error("stripe unreachable");
        return { data: state.stripeCurrent ? [{ id: state.stripeCurrent.id, status: state.stripeCurrent.status }] : [] };
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
  return r.ok ? r.membership.plan : "ERROR";
}

(function seed(plan, status, subId) {
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan, subscription_status: status, stripe_customer_id: CUS, stripe_subscription_id: subId });
})("initiate", "active", "sub_B");

(async () => {
  console.log("batch14f-event-order\n");

  // ─────────────────────────────── A ───────────────────────────────
  console.log("  --- A: old invoice must not steal the linkage, then revoke ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: "sub_B" });
  state.stripeCurrent = { id: "sub_B", status: "active" };
  state.event = ev("invoice.payment_succeeded", { id: "in_A", customer: CUS, customer_email: EMAIL, subscription: "sub_A" });
  await post();
  ok(M().stripe_subscription_id === "sub_B", "A1 stored linkage not replaced by the older subscription A (is " + M().stripe_subscription_id + ")");
  state.event = ev("customer.subscription.deleted", { id: "sub_A", customer: CUS, metadata: { email: EMAIL } });
  await post();
  ok(await effective() !== "guest", "A2 subscription.deleted for the older A does not revoke the active B");
  ok(M().subscription_status === "active", "A3 B's status is preserved (is " + M().subscription_status + ")");

  // ─────────────────────────────── B ───────────────────────────────
  console.log("  --- B: a stale payment failure must not clear ANY revocation ---");
  for (const status of ["unpaid", "incomplete_expired", "canceled"]) {
    reset();
    state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "guest", subscription_status: status, stripe_customer_id: CUS, stripe_subscription_id: "sub_1" });
    state.stripeCurrent = { id: "sub_1", status };
    state.event = ev("invoice.payment_failed", { id: "in_1", customer: CUS });
    await post();
    ok(M().subscription_status === status, "B[" + status + "] stored revocation is not rewritten to past_due (is " + M().subscription_status + ")");
    ok(await effective() === "guest", "B[" + status + "] entitlement stays revoked");
  }

  // ─────────────────────────────── C ───────────────────────────────
  console.log("  --- C: an old active snapshot must not resurrect a cancelled subscription ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "guest", subscription_status: "canceled", stripe_customer_id: CUS, stripe_subscription_id: "sub_1" });
  state.stripeCurrent = { id: "sub_1", status: "canceled" };
  state.event = ev("customer.subscription.updated", { id: "sub_1", customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  await post();
  ok(M().subscription_status === "canceled", "C1 a stale active snapshot does not clear the cancellation (is " + M().subscription_status + ")");
  ok(await effective() === "guest", "C2 entitlement stays revoked");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14F_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
