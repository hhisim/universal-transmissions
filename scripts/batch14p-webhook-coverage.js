#!/usr/bin/env node
/**
 * batch14p-webhook-coverage.js
 *
 * WEBHOOK-LEVEL harness. Executes the real handler, authority helper,
 * entitlement reader and the DB writes through the shared mock.
 *
 * Stripe is seeded EXPLICITLY per subscription id in `state.stripe`. Nothing is
 * derived from membership rows or from historical event payloads.
 *
 * Every membership write is recorded in `state.writes`, so a rejected
 * reconciliation can be proven to have written nothing.
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
  state.writes = [];
  state.failUpdate = {};
  state.stripe = {};          // EXPLICIT Stripe state: id -> {status, customer}
  state.listResult = null;    // optional override for enumeration
  state.retrieveLog = [];
  state.listLog = [];
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
      const doUpdate = (payload) => {
        state.writes.push({ table, op: "update", payload, filters: ctx.filters.slice() });
        return { data: null, error: null };
      };
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
          if (ctx.op === "update") {
            const forced = state.failUpdate[table];
            if (forced) {
              state.writes.push({ table, op: "update-FAILED", payload: ctx.payload, filters: ctx.filters.slice() });
              return Promise.resolve({ data: null, error: err(forced.code || "XX000", forced.message || "update failed") });
            }
            state.writes.push({ table, op: "update", payload: ctx.payload, filters: ctx.filters.slice() });
            const m = match();
            m.forEach((r) => Object.assign(r, ctx.payload));
            return Promise.resolve({ data: m[0] ? { ...m[0] } : null, error: m.length ? null : err("PGRST116", "no row") });
          }
          if (ctx.op === "insert") {
            const row = { ...ctx.payload };
            if (table === "profiles" && !row.user_id) return Promise.resolve({ data: null, error: err("23502", "user_id not null") });
            state.writes.push({ table, op: "insert", payload: row, filters: [] });
            if (table === "ut_members") row.id = row.id || "id-" + rows().length;
            rows().push(row);
            return Promise.resolve({ data: { ...row }, error: null });
          }
          const m = match();
          return Promise.resolve({ data: m[0] ? { ...m[0] } : null, error: m.length ? null : err("PGRST116", "no row") });
        },
        then(resolve) {
          if (ctx.op === "update") {
            const forced = state.failUpdate[table];
            if (forced) {
              state.writes.push({ table, op: "update-FAILED", payload: ctx.payload, filters: ctx.filters.slice() });
              resolve({ data: null, error: err(forced.code || "XX000", forced.message || "update failed") });
              return;
            }
            state.writes.push({ table, op: "update", payload: ctx.payload, filters: ctx.filters.slice() });
            let target = match();
            if (ctx.neq) target = target.filter((r) => r[ctx.neq[0]] !== ctx.neq[1]);
            target.forEach((r) => Object.assign(r, ctx.payload));
            resolve({ data: null, error: null });
            return;
          }
          if (ctx.op === "insert") {
            const row = { ...ctx.payload };
            if (table === "profiles" && !row.user_id) { resolve({ data: null, error: err("23502", "user_id not null") }); return; }
            state.writes.push({ table, op: "insert", payload: row, filters: [] });
            if (table === "ut_members") row.id = row.id || "id-" + rows().length;
            rows().push(row);
            resolve({ data: null, error: null });
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

state.event = null;
mockModule("@/lib/supabase", { supabaseAdmin: dbClient() }, { root: ROOT });
mockModule("@/lib/stripe", {
  getStripe: () => ({
    webhooks: { constructEvent: () => state.event },
    customers: { create: async () => ({ id: "cus_new" }) },
    checkout: { sessions: { create: async () => ({ url: "x" }) } },
    subscriptions: {
      retrieve: async (id) => {
        state.retrieveLog.push(id);
        const o = (state.stripe || {})[id];
        if (!o) { const e = new Error("no such subscription"); e.statusCode = 404; throw e; }
        return { id, status: o.status, customer: o.customer };
      },
      list: async (args) => {
        state.listLog.push({ ...args });
        if (state.listResult) return state.listResult;
        const all = Object.entries(state.stripe || {})
          .map(([id, o]) => ({ id, status: o.status, customer: o.customer }));
        return { data: all, has_more: false };
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
const post = async () => webhook.POST(new Request("https://ut.test/api/stripe-webhook", {
  method: "POST", headers: { "stripe-signature": "s" }, body: "{}",
}));
const bodyOf = async (r) => { try { return await r.json(); } catch { return {}; } };
const EMAIL = "member@example.com", CUS = "cus_1", A = "sub_A", B = "sub_B";
const ev = (type, obj) => ({ id: "e", type, data: { object: obj } });
const MEM = () => state.tables.ut_members[0] || {};
const PROF = () => state.tables.profiles[0] || {};
const memWrites = () => state.writes.filter((w) => w.table === "ut_members" || w.table === "profiles");
const eff = async () => { const r = await resolveMembershipPlan(dbClient(), EMAIL); return r.ok ? r.membership.plan : "READ_ERROR"; };
const paid = (p) => p !== "guest" && p !== "free" && p !== "READ_ERROR";

(async () => {
  console.log("batch14p-webhook-coverage\n");

  // S1 cancel A -> reactivate B -> repeat B update
  console.log("  --- S1 cancel A, reactivate B, repeat B ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  // Stripe's state at cancel time: A is cancelled and no replacement exists yet.
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  state.event = ev("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  let r = await post();
  ok(r.status === 200, "S1 cancel A -> 200 (got " + r.status + ")");
  ok(MEM().subscription_status === "canceled", "S1 member status canceled");
  ok(await eff() !== "initiate", "S1 entitlement revoked");

  // B now exists as the live replacement.
  state.stripe[B] = { status: "active", customer: CUS };
  state.event = ev("customer.subscription.created", { id: B, customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  r = await post();
  ok(r.status === 200, "S1 reactivate B -> 200 (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B, "S1 member linkage is B (is " + MEM().stripe_subscription_id + ")");
  ok(paid(await eff()), "S1 entitlement paid");

  state.event = ev("customer.subscription.updated", { id: B, customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  r = await post();
  ok(r.status === 200, "S1 repeat B update -> 200 (got " + r.status + ")");
  ok(paid(await eff()), "S1 entitlement still paid");
  ok(MEM().stripe_subscription_id === B, "S1 linkage still B");

  // S2 no metadata.email, resolved via stored customer linkage
  console.log("  --- S2 no metadata.email ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  // Scenario intent is a cancelled subscription: Stripe is the authority.
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  state.event = ev("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  r = await post();
  ok(r.status === 200, "S2 lifecycle without metadata.email -> 200 (got " + r.status + ")");
  ok(MEM().subscription_status === "canceled", "S2 resolved through stored customer linkage (status " + MEM().subscription_status + ")");

  // S3 profiles-only membership
  console.log("  --- S3 profiles-only ---");
  reset();
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  state.event = ev("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  r = await post();
  ok(r.status === 200, "S3 profiles-only cancellation -> 200 (got " + r.status + ")");
  ok(!paid(await eff()), "S3 profiles-only access revoked (reader says " + (await eff()) + ")");

  // S4 partial required-write failure then retry
  console.log("  --- S4 partial failure then retry ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  state.event = ev("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000, metadata: { email: EMAIL } });
  state.failUpdate = { ut_members: { message: "transient" } };
  r = await post();
  ok(r.status === 500, "S4 failed write -> 500 (got " + r.status + ")");
  state.failUpdate = {};
  r = await post();
  ok(r.status === 200, "S4 retry -> 200 (got " + r.status + ")");
  ok(await eff() !== "initiate", "S4 retry completed the revocation");

  // S5 delayed deletion of A after B is active
  console.log("  --- S5 delayed deletion of A ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: B });
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: B });
  state.stripe = { [A]: { status: "canceled", customer: CUS }, [B]: { status: "active", customer: CUS } };
  state.event = ev("customer.subscription.deleted", { id: A, customer: CUS, metadata: { email: EMAIL } });
  r = await post();
  const w5 = memWrites().length;
  ok(r.status === 200, "S5 stale deletion -> 200 (got " + r.status + ")");
  ok(MEM().stripe_subscription_id === B && paid(await eff()), "S5 access governed by B is preserved");
  ok(w5 === 0, "S5 a rejected (stale) deletion performs ZERO membership writes (got " + w5 + ")");

  // S6 two recorded, ownership-verified live subscriptions -> fail closed, no writes
  console.log("  --- S6 two recorded live subscriptions ---");
  reset();
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: B });
  state.stripe = { [A]: { status: "active", customer: CUS }, [B]: { status: "active", customer: CUS } };
  state.event = ev("customer.subscription.updated", { id: A, customer: CUS, status: "active", current_period_end: 1900000000, metadata: { email: EMAIL } });
  r = await post();
  const b6 = await bodyOf(r);
  const w6 = memWrites().length;
  ok(r.status === 500, "S6 genuine ambiguity fails closed (got " + r.status + ")");
  ok((b6.membershipFailures || []).some((f) => f.includes("multiple_candidates")),
    "S6 the ambiguity is named (got " + JSON.stringify(b6.membershipFailures || []) + ")");
  ok(w6 === 0, "S6 rejected reconciliation performs ZERO membership writes (got " + w6 + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14P_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
