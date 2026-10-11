#!/usr/bin/env node
/**
 * batch14q-profiles-only-lifecycle.js
 *
 * FAILING REGRESSIONS for the profiles-only lifecycle defect. Real handler,
 * authority helper, writer and reader. Stripe seeded EXPLICITLY per id.
 *
 * No ut_members row: the member exists only as a profiles row, which is legal
 * under option 3. Events carry NO metadata.email, so resolution must go through
 * the trusted stored customer linkage.
 *
 * The defect: both membership writes were set-based filters whose affected-row
 * count was discarded. The `ut_members` statement matched ZERO rows, the
 * `profiles` statement — filtered on the event's absent `metadata.email` — never
 * ran at all, and the delivery was acknowledged 200. A cancellation left the
 * member PAID and a reactivation left them unentitled.
 *
 * MOCK FIDELITY: `UPDATE ... .select()` resolves the AFFECTED ROWS as an array,
 * and a statement that matched nothing resolves `[]` (PostgREST answers 200 with
 * an empty array) while still applying nothing. Without that, a suite cannot
 * express "the update matched no row" at all, which is precisely the behaviour
 * under test.
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
  state.stripe = {};
  state.failUpdate = {};   // table -> message: the statement returns an error
  state.zeroUpdate = {};   // table -> true: the statement matches NOTHING
}

const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

function dbClient() {
  return {
    from(table) {
      const ctx = { table, filters: [], payload: null, op: null, returning: false };
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
          } else if (ctx.op === "update") {
            // `UPDATE ... .select()` asks PostgREST for the affected rows.
            ctx.returning = true;
          }
          return api;
        },
        eq(c, v) { ctx.filters.push([c, v, "eq"]); return api; },
        is(c, v) { ctx.filters.push([c, v, "is"]); return api; },
        neq(c, v) { ctx.neq = [c, v]; return api; },
        or(spec) { ctx.orSpec = spec; return api; },
        limit(n) {
          if (ctx.badColumn) {
            return Promise.resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) });
          }
          return Promise.resolve({ data: match().slice(0, n).map((r) => ({ ...r })), error: null });
        },
        update(p) { ctx.op = "update"; ctx.payload = p; return api; },
        insert(p) { ctx.op = "insert"; ctx.payload = p; return api; },
        single() { return api.then((r) => Promise.resolve(r)); },
        then(resolve) {
          if (ctx.op === "update") {
            const forced = state.failUpdate[table];
            if (forced) {
              state.writes.push({ table, op: "update-FAILED", payload: ctx.payload, matched: 0 });
              resolve({ data: null, error: err("XX000", forced) });
              return;
            }
            let target = match();
            if (ctx.neq) target = target.filter((r) => r[ctx.neq[0]] !== ctx.neq[1]);
            // A statement that matches nothing leaves the table alone and
            // answers an EMPTY array, not an error.
            if (state.zeroUpdate[table]) target = [];
            state.writes.push({ table, op: "update", payload: ctx.payload, matched: target.length });
            target.forEach((r) => Object.assign(r, ctx.payload));
            resolve({ data: ctx.returning ? target.map((r) => ({ ...r })) : null, error: null });
            return;
          }
          if (ctx.op === "insert") {
            const row = { ...ctx.payload };
            if (table === "profiles" && !row.user_id) {
              state.writes.push({ table, op: "insert-rejected", payload: row, matched: 0 });
              resolve({ data: null, error: err("23502", "user_id not null") });
              return;
            }
            state.writes.push({ table, op: "insert", payload: row, matched: 1 });
            if (table === "ut_members") row.id = row.id || "id-" + rows().length;
            rows().push(row);
            resolve({ data: { ...row }, error: null });
            return;
          }
          if (ctx.op === "select") {
            if (ctx.badColumn) {
              resolve({ data: null, error: err("42703", `column ${table}.${ctx.badColumn} does not exist`) });
              return;
            }
            const m = match();
            resolve({ data: m.slice(0, 1)[0] ? { ...m[0] } : null, error: m.length ? null : err("PGRST116", "no row") });
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
        const o = (state.stripe || {})[id];
        if (!o) { const e = new Error("no such subscription"); e.statusCode = 404; throw e; }
        return { id, status: o.status, customer: o.customer };
      },
      list: async () => ({
        data: Object.entries(state.stripe || {}).map(([id, o]) => ({ id, status: o.status, customer: o.customer })),
        has_more: false,
      }),
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
const post = async () => webhook.POST(new Request("https://ut.test/api/stripe-webhook", { method: "POST", headers: { "stripe-signature": "s" }, body: "{}" }));
const bodyOf = async (r) => { try { return await r.json(); } catch { return {}; } };
const EMAIL = "member@example.com", CUS = "cus_1", A = "sub_A", B = "sub_B";
const ev = (type, obj) => ({ id: "e", type, data: { object: obj } });
const PROF = () => state.tables.profiles[0] || {};
const MEM = () => state.tables.ut_members[0] || {};
/** The reader's own answer, WITH the resolution outcome kept. READ_ERROR is not
 *  a plan and must never be accepted as proof that a revocation happened. */
const effRes = async () => resolveMembershipPlan(dbClient(), EMAIL);
const writes = () => state.writes.filter((w) => w.table === "profiles" || w.table === "ut_members");
const inserts = () => writes().filter((w) => w.op === "insert" || w.op === "insert-rejected");
const named = (b, needle) => (b.membershipFailures || []).some((f) => String(f).includes(needle));

(async () => {
  console.log("batch14q-profiles-only-lifecycle\n");

  // Q1 — profiles-only at initiate, cancellation, no metadata.email
  console.log("  --- Q1 profiles-only initiate, canceled, no metadata.email ---");
  reset();
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, display_name: "M", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  state.event = ev("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  let r = await post();
  let b = await bodyOf(r);
  let q1 = await effRes();
  console.error("    status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) + " writes=" + JSON.stringify(state.writes));
  ok(r.status === 200, "Q1 -> 200 (got " + r.status + ")");
  ok(state.writes.some((w) => w.op === "update" && w.matched > 0),
    "Q1 at least one required write actually affected a row (writes=" + JSON.stringify(state.writes.map((w) => w.op + "/" + w.matched)) + ")");
  ok(PROF().plan !== "initiate" || PROF().subscription_status === "canceled",
    "Q1 the profiles row reflects the cancellation (plan=" + PROF().plan + " status=" + PROF().subscription_status + ")");
  // STRENGTHENED: the reader must RESOLVE, and resolve to a non-paid plan.
  // "READ_ERROR" is a lookup failure, i.e. no evidence of revocation at all.
  ok(q1.ok === true, "Q1 entitlement resolves without a read error (ok=" + q1.ok + (q1.ok ? "" : ", reason=" + q1.reason) + ")");
  ok(q1.ok === true && (q1.membership.plan === "guest" || q1.membership.plan === "free"),
    "Q1 effective entitlement is revoked to guest/free (got " + (q1.ok ? q1.membership.plan : "READ_ERROR") + ")");
  // No identity invented, no row created.
  ok(inserts().length === 0, "Q1 no membership row was inserted to make the update succeed (got " + JSON.stringify(inserts()) + ")");
  ok(state.tables.profiles.length === 1 && PROF().user_id === "u1",
    "Q1 the existing profile identity is untouched (rows=" + state.tables.profiles.length + ", user_id=" + PROF().user_id + ")");
  ok(state.tables.ut_members.length === 0, "Q1 no ut_members row was invented (rows=" + state.tables.ut_members.length + ")");

  // Q2 — profiles-only at free, genuine replacement B active, no metadata.email
  console.log("  --- Q2 profiles-only free, replacement B active, no metadata.email ---");
  reset();
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, display_name: "M", plan: "free", subscription_status: "canceled", stripe_customer_id: CUS, stripe_subscription_id: null });
  state.stripe = { [B]: { status: "active", customer: CUS } };
  state.event = ev("customer.subscription.created", { id: B, customer: CUS, status: "active", current_period_end: 1900000000 });
  r = await post();
  b = await bodyOf(r);
  let q2 = await effRes();
  console.error("    status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) + " writes=" + JSON.stringify(state.writes));
  ok(r.status === 200, "Q2 -> 200 (got " + r.status + ")");
  ok(state.writes.some((w) => w.op === "update" && w.matched > 0),
    "Q2 at least one required write actually affected a row (writes=" + JSON.stringify(state.writes.map((w) => w.op + "/" + w.matched)) + ")");
  // STRENGTHENED: BOTH are required. Recording B's linkage while leaving the
  // member unentitled, or restoring entitlement without recording which
  // subscription governs, are each an incomplete repair.
  ok(PROF().stripe_subscription_id === B,
    "Q2 the profiles row records B's linkage (sub=" + PROF().stripe_subscription_id + ")");
  ok(q2.ok === true && q2.membership.plan === "initiate",
    "Q2 entitlement is restored to initiate (got " + (q2.ok ? q2.membership.plan : "READ_ERROR") + ")");
  ok(inserts().length === 0, "Q2 no membership row was inserted to make the update succeed (got " + JSON.stringify(inserts()) + ")");
  ok(state.tables.profiles.length === 1 && PROF().user_id === "u1",
    "Q2 the existing profile identity is untouched (rows=" + state.tables.profiles.length + ", user_id=" + PROF().user_id + ")");
  ok(state.tables.ut_members.length === 0, "Q2 no ut_members row was invented (rows=" + state.tables.ut_members.length + ")");

  // Q3 — a resolved row that the update does NOT affect must not count as done
  console.log("  --- Q3 a linked row the UPDATE does not affect is refused, then retried ---");
  reset();
  state.tables.profiles.push({ user_id: "u1", email: EMAIL, display_name: "M", plan: "initiate", subscription_status: "active", stripe_customer_id: CUS, stripe_subscription_id: A });
  state.stripe = { [A]: { status: "canceled", customer: CUS } };
  state.event = ev("customer.subscription.updated", { id: A, customer: CUS, status: "canceled", current_period_end: 1900000000 });
  state.zeroUpdate = { profiles: true };
  r = await post();
  b = await bodyOf(r);
  let q3 = await effRes();
  console.error("    status=" + r.status + " failures=" + JSON.stringify(b.membershipFailures || []) + " eff=" + (q3.ok ? q3.membership.plan : "READ_ERROR"));
  ok(r.status === 500, "Q3 an update that affected no row is REFUSED, not acknowledged (got " + r.status + ")");
  ok(named(b, "profiles:"), "Q3 the failure is named in the response (got " + JSON.stringify(b.membershipFailures || []) + ")");
  ok(q3.ok === true && q3.membership.plan === "initiate",
    "Q3 the member is still paid because nothing was written (got " + (q3.ok ? q3.membership.plan : "READ_ERROR") + ")");

  state.zeroUpdate = {};
  r = await post();
  q3 = await effRes();
  ok(r.status === 200, "Q3 retry -> 200 (got " + r.status + ")");
  ok(q3.ok === true && (q3.membership.plan === "guest" || q3.membership.plan === "free"),
    "Q3 the retry completed the revocation (got " + (q3.ok ? q3.membership.plan : "READ_ERROR") + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14Q_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
