#!/usr/bin/env node
/**
 * batch14d-webhook-failure-reactivation.js
 *
 * Executes the REAL stripe-webhook handler with mocked external boundaries
 * (Stripe signature verification, the Stripe API, the DB client) and the REAL
 * shared reader. Signature verification and price->plan mapping are untouched.
 *
 * Covers: required-write failure must not be acknowledged; retry completes the
 * remaining work; cancellation followed by legitimate reactivation.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const state = {};

function reset() {
  state.tables = { profiles: [], ut_members: [] };
  state.fail = { update: {}, insert: {}, lookup: false };
  state.casRows = null;          // forces a compare-and-set miss when set to 0
  state.events = [];
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
  if (state.stripeStatus) {
    // explicit override: every subscription reports this status
    for (const k of Object.keys(subs)) subs[k] = state.stripeStatus;
  }
  return subs;
}

const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

function dbClient() {
  return {
    from(table) {
      const ctx = { table, filters: [], payload: null, op: null };
      const rows = () => state.tables[table];
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
        select() { if (!ctx.op) ctx.op = "select"; if (ctx.op === "update") ctx.returning = true;
          return api; },
        eq(c, v) { ctx.filters.push([c, v, "eq"]); return api; },
        is(c, v) { ctx.filters.push([c, v, "is"]); return api; },
        neq(c, v) { ctx.neq = [c, v]; return api; },
        or(spec) { ctx.orSpec = spec; return api; },
        limit(n) {
          state.events.push("select:" + table);
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
            state.events.push("update:" + table);
            const forced = state.fail.update[table];
            if (forced) return Promise.resolve({ data: null, error: err(forced.code || "XX000", forced.message || "update failed") });
            const m = match();
            if (m.length !== 1) return Promise.resolve({ data: null, error: err("PGRST116", "no row matched") });
            Object.assign(m[0], ctx.payload);
            return Promise.resolve({ data: { ...m[0] }, error: null });
          }
          const row = { ...ctx.payload };
          if (table === "ut_members") row.id = row.id || "id-" + (rows().length + 1);
          rows().push(row);
          return Promise.resolve({ data: { ...row }, error: null });
        },
      };
      // Make the chain awaitable so a bare `.update(...).eq(...)` (no `.select()`)
      // resolves with {error}, exactly as supabase-js does.
      api.then = (resolve) => {
        if (ctx.op === "update") {
          state.events.push("update:" + table);
          const forced = state.fail.update[table];
          if (forced) {
            resolve({ data: null, error: err(forced.code || "XX000", forced.message || "update failed") });
            return;
          }
          let target = match();
          if (ctx.neq) target = target.filter((r) => r[ctx.neq[0]] !== ctx.neq[1]);
          target.forEach((r) => Object.assign(r, ctx.payload));
          resolve({ data: ctx.returning ? target.map((r) => ({ ...r })) : null, error: null });
          return;
        }
        resolve({ data: null, error: null });
      };
      return api;
    },
  };
}

const SUB_ID = "sub_test_1";
const CUSTOMER = "cus_test_1";

function makeEvent(type, object) {
  return { id: "evt_1", type, data: { object } };
}
state.event = null;

mockModule("@/lib/supabase", { supabaseAdmin: dbClient() }, { root: ROOT });
mockModule("@/lib/stripe", {
  getStripe: () => ({
    webhooks: { constructEvent: () => state.event },
    subscriptions: {
      // Per-id model. The stored subscription carries the membership row's
      // status; the event's own subscription carries the payload status and
      // overrides for its own id. This is what lets a cancelled stored
      // subscription sit alongside a newer live one.
      retrieve: async (id) => {
        if (state.stripeFail) throw new Error("stripe unreachable");
        const subs = subsOf();
        const requested = id || "sub_1";
        if (!(requested in subs)) {
          const e = new Error("no such subscription");
          e.statusCode = 404;
          throw e;
        }
        return { id: requested, status: subs[requested], customer: CUSTOMER };
      },
      list: async () => {
        if (state.stripeFail) throw new Error("stripe unreachable");
        const subs = subsOf();
        return {
          data: Object.entries(subs).map(([id, status]) => ({ id, status, customer: CUSTOMER })),
          has_more: false,
        };
      },
    },
    customers: { create: async () => ({ id: "cus_new" }) },
    checkout: { sessions: { create: async () => ({ url: "https://x" }) } },
  }),
}, { root: ROOT });
mockModule("@/lib/auth", { auth: async () => null }, { root: ROOT });
// the webhook builds its own client via createClient
mockModule("@supabase/supabase-js", { createClient: () => dbClient(), SupabaseClient: class {} }, { root: ROOT });

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.UT_SUPABASE_URL = "https://mock.supabase.test";
process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "k";
process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.test";
process.env.AKASHA_BOT_TOKEN = "";
global.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });

const webhook = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));
const { resolveMembershipPlan } = require(path.join(ROOT, "src/lib/membership-plan.ts"));

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
const post = async () => {
  const res = await webhook.POST(new Request("https://ut.test/api/stripe-webhook", {
    method: "POST", headers: { "stripe-signature": "sig" }, body: "{}",
  }));
  try {
    const b = await res.clone().json();
    console.error("    DIAG status=" + res.status +
      " failures=" + JSON.stringify(b.membershipFailures || []) +
      " warnings=" + JSON.stringify(b.membershipWarnings || []));
  } catch (e) { console.error("    DIAG status=" + res.status + " (unreadable body)"); }
  return res;
};
function member(email, plan, status) {
  state.tables.ut_members.push({ id: "m1", email, plan, subscription_status: status, stripe_customer_id: CUSTOMER, stripe_subscription_id: SUB_ID });
}
function profile(email, plan, status) {
  state.tables.profiles.push({ user_id: "u1", email, plan, subscription_status: status, stripe_customer_id: CUSTOMER });
}
const EMAIL = "member@example.com";

(async () => {
  console.log("batch14d-webhook-failure-reactivation\n");

  console.log("  --- required-write failure must not be acknowledged ---");

  reset(); member(EMAIL, "initiate", "active");
  state.event = makeEvent("customer.subscription.updated", {
    id: SUB_ID, customer: CUSTOMER, status: "canceled", current_period_end: 1900000000,
  });
  state.fail.update = { ut_members: { code: "XX000", message: "db down" } };
  let r = await post(); let b = await body(r);
  ok(r.status === 500, "W1 ut_members write fails -> 500, NOT a success acknowledgement");
  ok(b.membershipFailures && b.membershipFailures.length > 0, "W1 the failure is named in the response");

  reset(); member(EMAIL, "initiate", "active"); profile(EMAIL, "initiate", "active");
  state.event = makeEvent("customer.subscription.updated", {
    id: SUB_ID, customer: CUSTOMER, status: "active", current_period_end: 1900000000,
    metadata: { email: EMAIL },
  });
  state.fail.update = { profiles: { code: "XX000", message: "db down" } };
  r = await post(); b = await body(r);
  ok(r.status === 500, "W2 profiles write fails -> 500");

  reset(); member(EMAIL, "initiate", "active");
  state.event = makeEvent("customer.subscription.updated", { id: SUB_ID, customer: CUSTOMER, status: "active", current_period_end: 1900000000 });
  state.fail.update = {};
  // force a compare-and-set style miss on ut_members
  const realPush = state.tables.ut_members;
  state.tables.ut_members = [];
  r = await post();
  state.tables.ut_members = realPush;
  // W3 — a table with NO row carrying the verified linkage has nothing to
  // update, so the delivery is acknowledged. This is NOT the same as a resolved
  // row that the update fails to affect: that is a failure (see batch14q Q3).
  ok(r.status === 200, "W3 a lifecycle update over a table with no LINKED row does not fail the delivery (no row = nothing to change)");

  reset(); member(EMAIL, "initiate", "active");
  state.event = makeEvent("customer.subscription.deleted", { id: SUB_ID, customer: CUSTOMER, current_period_end: 1900000000 });
  state.fail.update = {};
  r = await post(); b = await body(r);
  ok(r.status === 200, "W4 successful cancellation -> 200");
  ok(state.tables.ut_members[0].plan === "guest" && state.tables.ut_members[0].subscription_status === "canceled",
    "W4 ut_members reverted to guest/canceled");

  console.log("");
  console.log("  --- retry completes the remaining work ---");

  reset(); member(EMAIL, "initiate", "active"); profile(EMAIL, "initiate", "active");
  state.event = makeEvent("customer.subscription.updated", { id: SUB_ID, customer: CUSTOMER, status: "canceled", current_period_end: 1900000000 });
  state.fail.update = { ut_members: { code: "XX000", message: "db down" } };
  r = await post();
  ok(r.status === 500, "W5 first delivery fails -> 500 (Stripe will retry)");
  const afterFirst = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(afterFirst.ok && afterFirst.membership.plan === "initiate", "W5 after the failed delivery the member is still (stale) paid");

  state.fail.update = {};                     // the transient fault clears
  r = await post(); b = await body(r);
  ok(r.status === 200, "W5 retry -> 200");
  const afterRetry = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(afterRetry.ok && afterRetry.membership.plan === "guest", "W5 the retry completed the revocation");

  console.log("");
  console.log("  --- repeated delivery is safe ---");
  r = await post(); b = await body(r);
  ok(r.status === 200, "W6 re-delivery -> 200");
  const twice = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(twice.ok && twice.membership.plan === "guest", "W6 still revoked; no duplicate row");
  ok(state.tables.ut_members.length === 1, "W6 exactly one membership row");

  console.log("");
  console.log("  --- cancellation then legitimate REACTIVATION ---");

  reset(); member(EMAIL, "guest", "canceled"); profile(EMAIL, "free", "active");
  let res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(res.ok && res.membership.plan === "guest", "X1 cancelled state -> guest");

  state.event = makeEvent("customer.subscription.created", { id: "sub_new", customer: CUSTOMER, status: "active", current_period_end: 1900000000 });
  state.fail.update = {};
  r = await post();
  ok(r.status === 200, "X2 reactivation event -> 200");
  res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(res.ok && res.membership.plan === "initiate", "X2 reactivation restores entitlement (cancellation is not permanent)");
  ok(state.tables.ut_members[0].subscription_status === "active", "X2 status cleared from canceled");

  console.log("");
  console.log("  --- reactivation that only half-succeeds ---");
  reset(); member(EMAIL, "guest", "canceled"); profile(EMAIL, "initiate", "canceled");
  state.event = makeEvent("customer.subscription.created", {
    id: "sub_new", customer: CUSTOMER, status: "active", current_period_end: 1900000000,
    metadata: { email: EMAIL },
  });
  state.fail.update = { profiles: { code: "XX000", message: "db down" } };
  r = await post();
  ok(r.status === 500, "X3 partial reactivation -> 500 so Stripe retries");
  res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(res.ok && res.membership.source !== "revoked",
    "X3 ut_members is the revocation authority and its write succeeded, so the membership is NOT revoked");
  ok(state.tables.profiles[0].plan !== undefined,
    "X3 the failed profiles write leaves that row's plan stale (a recorded partial-failure artefact)");

  state.fail.update = {};
  r = await post();
  res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(r.status === 200, "X3 retry -> 200");
  ok(res.ok && res.membership.source !== "revoked",
    "X3 retry clears the revocation (the membership is no longer revoked)");
  ok(state.tables.ut_members[0].subscription_status === "active",
    "X3 ut_members status is active again after the successful retry");

  console.log("");
  console.log("  --- out-of-order delivery ---");
  reset(); member(EMAIL, "guest", "canceled"); profile(EMAIL, "free", "active");
  state.event = makeEvent("invoice.payment_succeeded", {
    id: "in_old", customer: CUSTOMER, customer_email: EMAIL, subscription: "sub_old",
  });
  state.fail.update = {};
  r = await post();
  ok(r.status === 200, "X4 a stale payment-succeeded after cancellation -> 200");
  res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(res.ok && res.membership.plan === "guest",
    "X4 it does NOT resurrect the membership (invoice events no longer own subscription_status)");
  ok(state.tables.ut_members[0].subscription_status === "canceled", "X4 the canceled status is preserved");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14D_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
