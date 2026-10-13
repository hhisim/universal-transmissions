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
const fs = require("node:fs");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { registerTsModules, mockModule } = require(path.join(__dirname, "ut-ts-require.cjs"));

const COLUMNS = {
  profiles: ["user_id", "email", "display_name", "plan", "subscription_status",
             "stripe_customer_id", "stripe_subscription_id", "current_period_end",
             "entitlement_authority_at", "created_at", "updated_at"],
  ut_members: ["id", "email", "plan", "subscription_status", "stripe_customer_id",
               "stripe_subscription_id", "current_period_end", "entitlement_authority_at",
               "created_at", "updated_at"],
  ut_orders: ["id", "stripe_session_id", "status", "stripe_payment_intent_id", "customer_email",
              "customer_name", "shipping_name", "shipping_address_line1", "shipping_address_line2",
              "shipping_city", "shipping_state", "shipping_postal_code", "shipping_country",
              "updated_at"],
};

const PG_BIN = "/usr/lib/postgresql/16/bin";
const DB_COLUMNS = {
  ut_members: ["id", "email", "plan", "subscription_status", "stripe_customer_id", "stripe_subscription_id", "current_period_end", "entitlement_authority_at"],
  profiles: ["user_id", "email", "plan", "subscription_status", "stripe_customer_id", "stripe_subscription_id", "current_period_end", "entitlement_authority_at"],
};
const PK_COLUMNS = { ut_members: "id", profiles: "user_id" };

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function errorText(err) {
  return `${err?.stderr || ""}${err?.stdout || ""}`.trim();
}

function stableDbPk(table, raw) {
  const value = String(raw);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value;
  const hex = crypto.createHash("sha256").update(`${table}:${value}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function startPrivatePostgres(ROOT) {
  const scratch = process.env.B14T_TMPDIR || "/var/tmp";
  fs.mkdirSync(scratch, { recursive: true });
  const base = fs.mkdtempSync(path.join(scratch, "b14t-"));
  const sock = path.join(base, "sock");
  const data = path.join(base, "data");
  const pgLog = path.join(base, "pg.log");
  fs.mkdirSync(sock);
  execFileSync("chown", ["-R", "postgres:postgres", base], { stdio: "ignore" });

  const runAsPostgres = (command, label) => {
    try {
      return execFileSync("su", ["postgres", "-c", command], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      throw new Error(`${label} failed: ${errorText(err) || err.message}`);
    }
  };
  const writeSql = (name, sql) => {
    const file = path.join(base, name);
    fs.writeFileSync(file, `${sql}\n`, { mode: 0o644 });
    return file;
  };
  const applyFile = (file, label) => {
    runAsPostgres(
      `PGAPPNAME=b14t psql -h ${shellQuote(sock)} -d postgres -X -q -v ON_ERROR_STOP=1 -f ${shellQuote(file)}`,
      label
    );
  };

  try {
    runAsPostgres(
      `${PG_BIN}/initdb -D ${shellQuote(data)} -A trust --no-locale -E UTF8`,
      "initdb"
    );
    runAsPostgres(
      `${PG_BIN}/pg_ctl -D ${shellQuote(data)} -o ${shellQuote(`-k ${sock} -c listen_addresses= -c deadlock_timeout=1s`)} -l ${shellQuote(pgLog)} -w start`,
      "pg_ctl start"
    );

    const schema = `
create table public.ut_members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text default 'guest',
  subscription_status text default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);
create table public.profiles (
  user_id uuid primary key,
  email text,
  plan text default 'guest',
  subscription_status text default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
grant usage on schema public to anon, authenticated, service_role;
`;
    applyFile(writeSql("schema.sql", schema), "schema");

    const migrations = [
      "20261012_apply_lifecycle_update.sql",
      "20261013_lifecycle_linkage_sync.sql",
      "20261014_lifecycle_sync_wrapper.sql",
      "20261015_lifecycle_per_entry_skip.sql",
      "20261016_entitlement_authority.sql",
    ];
    for (const migration of migrations) {
      const privateFile = path.join(base, migration);
      fs.copyFileSync(path.join(ROOT, "supabase/migrations", migration), privateFile);
      fs.chmodSync(privateFile, 0o644);
      applyFile(privateFile, migration);
    }
  } catch (err) {
    try { runAsPostgres(`${PG_BIN}/pg_ctl -D ${shellQuote(data)} -m immediate stop`, "pg_ctl stop"); } catch {}
    fs.rmSync(base, { recursive: true, force: true });
    throw err;
  }

  let stopped = false;
  return {
    base,
    sock,
    data,
    queryCounter: 0,
    stop() {
      if (stopped) return;
      stopped = true;
      try {
        runAsPostgres(`${PG_BIN}/pg_ctl -D ${shellQuote(data)} -m immediate stop`, "pg_ctl stop");
      } finally {
        fs.rmSync(base, { recursive: true, force: true });
      }
    },
  };
}

function runPrivateSql(cluster, sql) {
  const file = path.join(cluster.base, `.b14t-${cluster.queryCounter++}.sql`);
  fs.writeFileSync(file, `${sql}\n`, { mode: 0o644 });
  try {
    return execFileSync(
      "su",
      [
        "postgres",
        "-c",
        `PGAPPNAME=b14t psql -h ${shellQuote(cluster.sock)} -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -f ${shellQuote(file)}`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).trim();
  } catch (err) {
    throw new Error(errorText(err) || err.message);
  } finally {
    try { fs.unlinkSync(file); } catch {}
  }
}

function dbMapsForTables(tables) {
  const maps = {
    ut_members: { rawToDb: new Map(), dbToRaw: new Map() },
    profiles: { rawToDb: new Map(), dbToRaw: new Map() },
  };
  for (const table of Object.keys(maps)) {
    const column = PK_COLUMNS[table];
    for (const row of tables[table] || []) {
      if (row[column] === null || row[column] === undefined) {
        throw new Error(`${table}.${column} is required for PostgreSQL-backed RPC tests`);
      }
      const raw = String(row[column]);
      const db = stableDbPk(table, raw);
      maps[table].rawToDb.set(raw, db);
      maps[table].dbToRaw.set(db, raw);
    }
  }
  return maps;
}

function dbPkFor(maps, table, raw) {
  const value = String(raw);
  const known = maps[table].rawToDb.get(value);
  if (known) return known;
  const db = stableDbPk(table, value);
  maps[table].rawToDb.set(value, db);
  maps[table].dbToRaw.set(db, value);
  return db;
}

function syncTablesToPostgres(cluster, tables, maps) {
  const statements = ["truncate public.ut_members, public.profiles;"];
  for (const table of ["ut_members", "profiles"]) {
    const columns = DB_COLUMNS[table];
    const pkColumn = PK_COLUMNS[table];
    for (const row of tables[table] || []) {
      const values = columns.map((column) => {
        if (column === pkColumn) return sqlLiteral(dbPkFor(maps, table, row[column]));
        if (column === "email" && table === "ut_members" && row[column] === undefined) return sqlLiteral("");
        return sqlLiteral(row[column]);
      });
      statements.push(
        `insert into public.${table} (${columns.join(",")}) values (${values.join(",")});`
      );
    }
  }
  runPrivateSql(cluster, statements.join("\n"));
}

function translateRpcPayload(payload, maps) {
  return payload.map((target) => {
    const table = target.target;
    const translated = { ...target };
    if (Array.isArray(target.seen_pks)) {
      translated.seen_pks = target.seen_pks.map((pk) => dbPkFor(maps, table, pk));
    }
    if (Array.isArray(target.entries)) {
      translated.entries = target.entries.map((entry) => ({
        ...entry,
        pk: dbPkFor(maps, table, entry.pk),
      }));
    }
    return translated;
  });
}

function readTablesFromPostgres(cluster, state, maps) {
  const sql = `
select json_build_object(
  'ut_members', coalesce((select json_agg(row_to_json(t)) from (select id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end,entitlement_authority_at from public.ut_members order by id) t), '[]'::json),
  'profiles', coalesce((select json_agg(row_to_json(t)) from (select user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end,entitlement_authority_at from public.profiles order by user_id) t), '[]'::json)
)::text;
`;
  const parsed = JSON.parse(runPrivateSql(cluster, sql).split("\n").filter(Boolean).pop() || "{}");
  for (const table of ["ut_members", "profiles"]) {
    const pkColumn = PK_COLUMNS[table];
    const previous = state.tables[table] || [];
    const previousIndex = new Map(previous.map((row, index) => [String(row[pkColumn]), index]));
    const rows = (parsed[table] || []).map((row) => {
      const dbPk = String(row[pkColumn]);
      const rawPk = maps[table].dbToRaw.get(dbPk) || dbPk;
      const prior = previous.find((candidate) => String(candidate[pkColumn]) === rawPk) || {};
      const next = { ...prior };
      for (const column of DB_COLUMNS[table]) {
        next[column] = column === pkColumn ? rawPk : row[column];
      }
      return next;
    });
    rows.sort((a, b) => (previousIndex.get(String(a[pkColumn])) ?? Number.MAX_SAFE_INTEGER) - (previousIndex.get(String(b[pkColumn])) ?? Number.MAX_SAFE_INTEGER));
    state.tables[table] = rows;
  }
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createHarness(ROOT) {
  const state = {
    tables: { profiles: [], ut_members: [], ut_orders: [] },
    writes: [],
    stripe: {},
    failUpdate: {},
    beforeUpdate: null,
    afterStripe: null,
    // Batch 15c additions — the one-time sale-alert surface.
    lineItems: [],
    lineItemError: null,
    lineItemsCalls: 0,
    telegrams: [],
  };

  const cluster = startPrivatePostgres(ROOT);
  process.env.B14AF_SOCK = cluster.sock;
  process.env.B14AF_BASE = cluster.base;
  const { makePgClient } = require(path.join(ROOT, "scripts/batch14af-atomic-integration.js"));
  const pgClient = makePgClient();
  process.once("exit", () => cluster.stop());

  function reset() {
    state.tables = { profiles: [], ut_members: [], ut_orders: [] };
    state.writes = [];
    state.stripe = {};
    state.failUpdate = {};
    state.beforeUpdate = null;
    state.afterStripe = null;
    state.lineItems = [];
    state.lineItemError = null;
    state.lineItemsCalls = 0;
    state.telegrams = [];
  }

  function dbClient() {
    return {
      rpc: async (name, args) => {
        const payload = cloneJson(args?.p_targets);
        const write = { op: "rpc", name, payload };
        state.writes.push(write);

        try {
          if (!Array.isArray(payload)) {
            throw new Error("atomic RPC payload must contain p_targets[]");
          }
          const hookTarget = payload.find((target) => target?.target === "ut_members") || payload[0];
          if (state.beforeUpdate) {
            state.beforeUpdate(hookTarget?.target, { op: "rpc", name, payload: cloneJson(payload) });
          }

          const maps = dbMapsForTables(state.tables);
          syncTablesToPostgres(cluster, state.tables, maps);
          const postgresPayload = translateRpcPayload(payload, maps);
          write.pgPayload = cloneJson(postgresPayload);
          const result = await pgClient.rpc(name, { ...(args || {}), p_targets: postgresPayload });
          write.data = cloneJson(result.data);
          write.error = cloneJson(result.error);
          readTablesFromPostgres(cluster, state, maps);
          return result;
        } catch (err) {
          const error = {
            code: err?.code,
            message: err instanceof Error ? err.message : String(err),
            details: err?.details,
          };
          write.error = error;
          try {
            const maps = dbMapsForTables(state.tables);
            readTablesFromPostgres(cluster, state, maps);
          } catch {}
          return { data: null, error };
        }
      },
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
      checkout: {
        sessions: {
          create: async () => ({ url: "x" }),
          // Batch 15c — the one-time sale alert resolves product names through this
          // call. A webhook payload never carries line_items, so a suite that wants
          // a real product name must supply it here.
          listLineItems: async () => {
            state.lineItemsCalls += 1;
            if (state.lineItemError) throw state.lineItemError;
            return { data: state.lineItems, has_more: false };
          },
        },
      },
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
  process.env.AKASHA_BOT_TOKEN = process.env.B15C_TELEGRAM_TOKEN ?? "";
  global.fetch = async (url, init) => {
    // Batch 15c — capture the outgoing alert so a suite can assert what it CLAIMS.
    try {
      const body = init && init.body ? JSON.parse(init.body) : null;
      if (body && typeof body.text === "string") {
        state.telegrams.push({ url: String(url), text: body.text });
      }
    } catch {}
    return { ok: true, status: 200, json: async () => ({}) };
  };

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
    applied: () => {
      const rows = [];
      for (const write of state.writes) {
        if (write.op === "update" && write.matched > 0) {
          for (let i = 0; i < write.matched; i += 1) rows.push(write);
        }
        if (write.op === "rpc" && Array.isArray(write.data)) {
          for (const outcome of write.data) {
            const affected = Number(outcome?.affected) || 0;
            for (let i = 0; i < affected; i += 1) {
              rows.push({ ...write, target: outcome.target, outcome, affected: 1 });
            }
          }
        }
      }
      return rows;
    },
    /** Attempts are calls/statements entered; they are not affected-row counts. */
    attempts: () => state.writes.filter((w) =>
      w.op === "update" || w.op === "update-FAILED" || w.op === "rpc"
    ),
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
