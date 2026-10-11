/**
 * ut-membership-webhook-harness.cjs — shared boundary mocks for the Batch 14
 * webhook suites.
 *
 * The REAL handler, authority helper, lifecycle writer and entitlement reader
 * are executed. Only two boundaries are stubbed: the Supabase client and Stripe.
 *
 * Mock fidelity that these suites depend on:
 *   - `UPDATE ... .select()` resolves the AFFECTED ROWS as an array, `[]` for a
 *     zero-match statement — PostgREST answers 200 with an empty array, not an
 *     error. Without this a suite cannot express "the statement matched nothing",
 *     which is the whole defect class on this path.
 *   - `IS NULL` matches a SQL NULL, which a fixture row models either as an
 *     explicit `null` or by omitting the column.
 *   - `state.beforeUpdate(table, ctx)` fires inside the update branch, i.e.
 *     AFTER the resolving reads and BEFORE the statement matches. That is the
 *     hook the interleaving suites use to model a concurrent writer landing in
 *     the snapshot-to-write window, deterministically.
 */
const path = require("path");
const { registerTsModules, mockModule } = require(path.join(__dirname, "ut-ts-require.cjs"));

const COLUMNS = {
  profiles: ["user_id", "email", "display_name", "plan", "subscription_status",
             "stripe_customer_id", "stripe_subscription_id", "current_period_end",
             "created_at", "updated_at"],
  ut_members: ["id", "email", "plan", "subscription_status", "stripe_customer_id",
               "stripe_subscription_id", "current_period_end", "created_at", "updated_at"],
};

function createHarness(ROOT) {
  const state = {
    tables: { profiles: [], ut_members: [] },
    writes: [],
    stripe: {},
    failUpdate: {},
    beforeUpdate: null,
    afterStripe: null,
  };

  function reset() {
    state.tables = { profiles: [], ut_members: [] };
    state.writes = [];
    state.stripe = {};
    state.failUpdate = {};
    state.beforeUpdate = null;
    state.afterStripe = null;
  }

  function dbClient() {
    return {
      from(table) {
        const ctx = { table, filters: [], payload: null, op: null, returning: false };
        const rows = () => state.tables[table];
        const cols = COLUMNS[table] || [];
        const match = () => rows().filter((r) =>
          ctx.filters.every(([c, v, op]) => {
            if (op === "is" && v === null) return r[c] === null || r[c] === undefined;
            return r[c] === v;
          }));
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
              ctx.returning = true;
            }
            return api;
          },
          eq(c, v) { ctx.filters.push([c, v, "eq"]); return api; },
          is(c, v) { ctx.filters.push([c, v, "is"]); return api; },
          neq(c, v) { ctx.neq = [c, v]; return api; },
          or(s) { ctx.orSpec = s; return api; },
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
              if (state.beforeUpdate) state.beforeUpdate(table, ctx);
              const forced = state.failUpdate[table];
              if (forced) {
                state.writes.push({ table, op: "update-FAILED", payload: ctx.payload, filters: ctx.filters.slice(), matched: 0 });
                resolve({ data: null, error: err("XX000", forced) });
                return;
              }
              let target = match();
              if (ctx.neq) target = target.filter((r) => r[ctx.neq[0]] !== ctx.neq[1]);
              state.writes.push({
                table, op: "update", payload: ctx.payload,
                filters: ctx.filters.slice(), matched: target.length,
              });
              target.forEach((r) => Object.assign(r, ctx.payload));
              resolve({ data: ctx.returning ? target.map((r) => ({ ...r })) : null, error: null });
              return;
            }
            if (ctx.op === "insert") {
              const row = { ...ctx.payload };
              state.writes.push({ table, op: "insert", payload: row, filters: [], matched: 1 });
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

  let event = null;
  mockModule("@/lib/supabase", { supabaseAdmin: dbClient() }, { root: ROOT });
  mockModule("@/lib/stripe", {
    getStripe: () => ({
      webhooks: { constructEvent: () => event },
      customers: { create: async () => ({ id: "cus_new" }) },
      checkout: { sessions: { create: async () => ({ url: "x" }) } },
      subscriptions: {
        retrieve: async (id) => {
          const o = (state.stripe || {})[id];
          if (!o) { const e = new Error("no such subscription"); e.statusCode = 404; throw e; }
          const result = { id, status: o.status, customer: o.customer };
          // Fires AFTER the provider has answered and BEFORE the caller acts on
          // it: the deterministic window for "another writer installs B while we
          // are still holding the reconciliation we just read".
          if (state.afterStripe) state.afterStripe();
          return result;
        },
        list: async () => {
          const result = {
            data: Object.entries(state.stripe || {}).map(([id, o]) => ({ id, status: o.status, customer: o.customer })),
            has_more: false,
          };
          if (state.afterStripe) state.afterStripe();
          return result;
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

  const nextEvent = (type, object) => { event = { id: "evt", type, data: { object } }; };
  const post = async () => webhook.POST(new Request("https://ut.test/api/stripe-webhook", {
    method: "POST", headers: { "stripe-signature": "s" }, body: "{}",
  }));
  const bodyOf = async (r) => { try { return await r.json(); } catch { return {}; } };

  return {
    state,
    reset,
    dbClient,
    nextEvent,
    post,
    bodyOf,
    /** Rows that actually CHANGED. A statement that affected nothing is not one. */
    applied: () => state.writes.filter((w) => w.op === "update" && w.matched > 0),
    attempts: () => state.writes.filter((w) => w.op === "update" || w.op === "update-FAILED"),
    inserts: () => state.writes.filter((w) => w.op === "insert"),
    effRes: (email) => resolveMembershipPlan(dbClient(), email),
    /** Resolved plan, or READ_ERROR — never treated as an answer. */
    eff: async (email) => {
      const r = await resolveMembershipPlan(dbClient(), email);
      return r.ok ? r.membership.plan : "READ_ERROR";
    },
  };
}

module.exports = { createHarness, COLUMNS };
