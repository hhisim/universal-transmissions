#!/usr/bin/env node
/**
 * batch14e-reconciliation.js
 *
 * The DB mock REJECTS NONEXISTENT COLUMNS, so `profiles.id` fails exactly as it
 * does in production (profiles' primary key is `user_id`). This is what makes
 * the tests able to detect the defects the review named.
 *
 * Exercises the REAL stripe-webhook handler and the REAL reader.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const state = {};

// Real deployed columns only.
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
  state.warnings = [];
  state.stripeStatus = undefined;
  state.subs = {};
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
      const ctx = { table, filters: [], payload: null, op: null, cols: null };
      const rows = () => state.tables[table];
      const cols = COLUMNS[table] || [];
      const match = () => rows().filter((r) => {
        if (!ctx.filters.every(([c, v]) => r[c] === v)) return false;
        if (ctx.orSpec) {
          // honour `.or("stripe_subscription_id.eq.X,stripe_subscription_id.is.null")`
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
            ctx.cols = c;
            // reject nonexistent columns, like PostgREST does
            if (c && c !== "*") {
              const bad = c.split(",").map((x) => x.trim()).filter((x) => x && !cols.includes(x));
              if (bad.length) ctx.badColumn = bad[0];
            }
          }
          if (ctx.op === "update") ctx.returning = true;
          return api;
        },
        eq(c, v) { ctx.filters.push([c, v]); return api; },
        is(c, v) { ctx.filters.push([c, v]); return api; },
        neq(c, v) { ctx.neq = [c, v]; return api; },
        or(spec) { ctx.orSpec = spec; return api; },
        limit(n) {
          state.events = state.events || [];
          if (ctx.badColumn) return Promise.resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) });
          if (state.failSelect[table]) return Promise.resolve({ data: null, error: state.failSelect[table] });
          return Promise.resolve({ data: match().slice(0, n).map((r) => ({ ...r })), error: null });
        },
        update(p) { ctx.op = "update"; ctx.payload = p; return api; },
        insert(p) { ctx.op = "insert"; ctx.payload = p; return api; },
        single() {
          if (ctx.op === "update") {
            if (ctx.badColumn) return Promise.resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) });
            const forced = state.failUpdate[table];
            if (forced) return Promise.resolve({ data: null, error: err(forced.code || "XX000", forced.message || "update failed") });
            const m = match();
            if (m.length !== 1) return Promise.resolve({ data: null, error: err("PGRST116", "no row matched") });
            Object.assign(m[0], ctx.payload);
            return Promise.resolve({ data: { ...m[0] }, error: null });
          }
          if (ctx.op === "insert") {
            const row = { ...ctx.payload };
            if (table === "profiles" && !row.user_id) {
              return Promise.resolve({ data: null, error: err("23502", 'null value in column "user_id" violates not-null constraint') });
            }
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
            if (state.throwUpdate && state.throwUpdate[table]) { throw new Error("db threw"); }
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
        // Per-id model: the stored subscription carries the row's status, the
        // event's own subscription carries the payload status (and overrides for
        // its own id). Lets a cancelled stored subscription sit alongside a
        // newer live one.
        retrieve: async (id) => {
          if (state.stripeFail) throw new Error("stripe unreachable");
          const subs = subsOf();
          const requested = id || "sub_1";
          if (!(requested in subs)) {
            const e = new Error("no such subscription");
            e.statusCode = 404;
            throw e;
          }
          return { id: requested, status: subs[requested], customer: "cus_1" };
        },
        list: async () => {
          if (state.stripeFail) throw new Error("stripe unreachable");
          const subs = subsOf();
          return {
            data: Object.entries(subs).map(([id, status]) => ({ id, status, customer: "cus_1" })),
            has_more: false,
          };
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
const EMAIL = "member@example.com", CUS = "cus_1", SUB = "sub_1";
const ev = (type, obj) => ({ id: "e", type, data: { object: obj } });
function seedMember(plan, status, subId) {
  state.tables.ut_members.push({ id: "m1", email: EMAIL, plan, subscription_status: status, stripe_customer_id: CUS, stripe_subscription_id: subId === undefined ? SUB : subId });
}
function seedProfile(plan, status) {
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, plan, subscription_status: status, stripe_customer_id: CUS });
}

(async () => {
  console.log("batch14e-reconciliation  (mock rejects nonexistent columns)\n");

  // E0 — the mock really does reject profiles.id
  reset();
  const probe = await dbClient().from("profiles").select("id").eq("stripe_customer_id", CUS).limit(2);
  ok(probe.error && probe.error.code === "42703", "E0 mock rejects profiles.id exactly as PostgREST does");

  // E1 — cancellation with the REAL profiles schema
  reset(); seedMember("initiate", "active"); seedProfile("initiate", "active");
  state.event = ev("customer.subscription.deleted", { id: SUB, customer: CUS, metadata: { email: EMAIL } });
  let r = await post(); let b = await body(r);
  ok(r.status === 200, "E1 cancellation -> 200");
  ok(state.tables.ut_members[0].plan === "guest" && state.tables.ut_members[0].subscription_status === "canceled",
    "E1 ut_members revoked to guest/canceled");
  ok(state.tables.profiles[0].plan === "free", "E1 profiles mirrored to free via stripe_customer_id (no profiles.id queried)");

  // E2 — profiles update error is recorded, not swallowed
  reset(); seedMember("initiate", "active"); seedProfile("initiate", "active");
  state.event = ev("customer.subscription.deleted", { id: SUB, customer: CUS, metadata: { email: EMAIL } });
  state.failUpdate = { profiles: { message: "mirror down" } };
  r = await post(); b = await body(r);
  // The cancellation mirror is REQUIRED: a failed mirror leaves access paid, so
  // the delivery must be refused rather than acknowledged.
  ok(r.status === 500, "E2 a failed cancellation mirror is refused, not acknowledged (got " + r.status + ")");
  ok(Array.isArray(b.membershipFailures) && b.membershipFailures.length > 0, "E2 the failure is named in the response");

  // E3 — payment_failed returned error
  reset(); seedMember("initiate", "active");
  state.event = ev("invoice.payment_failed", { id: "in_1", customer: CUS });
  state.failUpdate = { ut_members: { message: "db down" } };
  state.stripeStatus = "past_due";
  r = await post(); b = await body(r);
  ok(r.status === 500, "E3 payment_failed returned error -> 500 (Stripe retries)");

  // E4 — payment_failed thrown exception
  reset(); seedMember("initiate", "active");
  state.event = ev("invoice.payment_failed", { id: "in_1", customer: CUS });
  state.failUpdate = {}; state.throwUpdate = { ut_members: true };
  state.stripeStatus = "past_due";
  r = await post();
  state.throwUpdate = {};
  ok(r.status === 500, "E4 payment_failed thrown exception -> 500");

  // E5 — dunning must not clobber a cancellation
  reset(); seedMember("guest", "canceled");
  state.event = ev("invoice.payment_failed", { id: "in_1", customer: CUS });
  state.stripeStatus = "past_due";
  r = await post();
  ok(r.status === 200, "E5 payment_failed on a cancelled row -> 200");
  ok(state.tables.ut_members[0].subscription_status === "canceled", "E5 a delayed payment_failed does NOT overwrite canceled");
  let res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(res.ok && res.membership.plan === "guest", "E5 the member stays revoked");

  // E6 — payment_succeeded profile helper refusing missing userId is a warning
  reset(); seedMember("guest", "canceled");
  state.event = ev("invoice.payment_succeeded", { id: "in_2", customer: CUS, customer_email: EMAIL, subscription: "sub_new" });
  r = await post(); b = await body(r);
  ok(r.status === 200, "E6 payment_succeeded -> 200");
  ok(state.tables.ut_members[0].subscription_status === "canceled", "E6 the delayed payment_succeeded does NOT resurrect the membership");
  res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(res.ok && res.membership.plan === "guest", "E6 entitlement remains revoked");

  // E7 — failure then safe retry
  reset(); seedMember("initiate", "active");
  state.event = ev("customer.subscription.updated", { id: SUB, customer: CUS, status: "canceled", current_period_end: 1900000000, metadata: { email: EMAIL } });
  state.failUpdate = { ut_members: { message: "transient" } };
  r = await post();
  ok(r.status === 500, "E7 first delivery fails -> 500");
  state.failUpdate = {};
  r = await post();
  ok(r.status === 200, "E7 retry -> 200");
  res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(res.ok && res.membership.plan === "guest", "E7 the retry completed the revocation");

  // E8 — the stale invoice sequence end to end
  reset(); seedMember("initiate", "active"); seedProfile("initiate", "active");
  state.event = ev("customer.subscription.deleted", { id: SUB, customer: CUS, metadata: { email: EMAIL } });
  await post();
  state.event = ev("invoice.payment_succeeded", { id: "in_old", customer: CUS, customer_email: EMAIL, subscription: "sub_old" });
  await post();
  state.event = ev("invoice.payment_failed", { id: "in_old", customer: CUS });
  await post();
  res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(res.ok && res.membership.plan === "guest", "E8 cancel -> delayed success -> delayed failure: STILL REVOKED");
  ok(state.tables.ut_members[0].subscription_status === "canceled", "E8 the cancellation record survived both stale invoices");

  // E9 — late cancellation belonging to an OLDER subscription
  reset(); seedMember("initiate", "active", "sub_NEW");
  state.event = ev("customer.subscription.deleted", { id: "sub_OLD", customer: CUS, metadata: { email: EMAIL } });
  r = await post(); b = await body(r);
  res = await resolveMembershipPlan(dbClient(), EMAIL);
  ok(res.ok && res.membership.plan === "initiate", "E9 a late cancellation of a SUPERSEDED subscription does not revoke");
  ok(state.tables.ut_members[0].subscription_status === "active", "E9 the active status is preserved");

  // E9b — legacy row with no linkage keeps the old behaviour
  reset(); seedMember("initiate", "active", null);
  state.event = ev("customer.subscription.deleted", { id: "sub_OLD", customer: CUS, metadata: { email: EMAIL } });
  await post();
  ok(state.tables.ut_members[0].subscription_status === "canceled", "E9b a legacy row with no stored linkage still revokes");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14E_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
