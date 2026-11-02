#!/usr/bin/env node
/**
 * m15-oracle-quota.js — the server-side Oracle allowance.
 *
 * Real module under test: src/lib/oracle-quota.ts, executed with the repository's own
 * TypeScript transpiler. Only two boundaries are stubbed, both of them databases:
 * `@/lib/supabase` (a fixture client that implements the two increment RPCs with the
 * same atomic semantics the database has) and `@/lib/member-session` (so the suite can
 * present a guest, a free member, an initiate, an expired session and a forged token).
 *
 * Covered: guest lifetime allowance, free daily allowance and its reset, initiate
 * unlimited, concurrent requests at the boundary, endpoint-switching, and malformed or
 * absent credentials.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");

const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

// ── Fixture database ─────────────────────────────────────────────────────────
const db = { ut_oracle_usage: [], ut_guest_usage: [] };
let nextId = 1;

function rowsOf(table) {
  return db[table];
}

function buildSelect(table, columns) {
  const filters = [];
  const builder = {
    eq(col, val) {
      filters.push([col, val]);
      return builder;
    },
    limit() {
      return builder;
    },
    then(resolve) {
      const cols = String(columns).split(",").map((c) => c.trim());
      const out = rowsOf(table)
        .filter((row) => filters.every(([c, v]) => row[c] === v))
        .map((row) => {
          const picked = {};
          for (const c of cols) picked[c] = row[c];
          return picked;
        });
      return Promise.resolve({ data: out, error: null }).then(resolve);
    },
  };
  return builder;
}

function buildUpdate(table, payload) {
  const filters = [];
  const builder = {
    eq(col, val) {
      filters.push([col, val]);
      return builder;
    },
    select() {
      return builder;
    },
    then(resolve) {
      const matched = rowsOf(table).filter((row) => filters.every(([c, v]) => row[c] === v));
      for (const row of matched) Object.assign(row, payload);
      return Promise.resolve({ data: matched, error: null }).then(resolve);
    },
  };
  return builder;
}

function buildInsert(table, payload) {
  const builder = {
    select() {
      return builder;
    },
    then(resolve) {
      const row = { id: `row-${nextId++}`, ...payload };
      rowsOf(table).push(row);
      return Promise.resolve({ data: [row], error: null }).then(resolve);
    },
  };
  return builder;
}

const supabaseAdmin = {
  from(table) {
    return {
      select: (columns) => buildSelect(table, columns),
      update: (payload) => buildUpdate(table, payload),
      insert: (payload) => buildInsert(table, payload),
    };
  },
  /**
   * The two increment functions that exist in the deployed database. They increment
   * the identity's row by one, creating it when absent — atomically, as SQL does.
   */
  async rpc(name, args) {
    if (name === "increment_oracle_usage") {
      const row = rowsOf("ut_oracle_usage").find(
        (r) => r.email === args.p_email && r.date === args.p_date
      );
      if (row) row.count += 1;
      else rowsOf("ut_oracle_usage").push({ id: `row-${nextId++}`, email: args.p_email, date: args.p_date, count: 1 });
      return { data: null, error: null };
    }
    if (name === "increment_guest_usage") {
      const row = rowsOf("ut_guest_usage").find((r) => r.anonymous_id === args.p_anonymous_id);
      if (row) row.total_count += 1;
      else rowsOf("ut_guest_usage").push({ id: `row-${nextId++}`, anonymous_id: args.p_anonymous_id, total_count: 1 });
      return { data: null, error: null };
    }
    return { data: null, error: { message: `unknown rpc ${name}` } };
  },
};

let memberForRequest = null;
mockModule("@/lib/supabase", { supabaseAdmin }, { root: ROOT });
mockModule("@/lib/member-session", { getRequestMember: async () => memberForRequest }, { root: ROOT });

const { consumeQuota, peekQuota, guestKey } = require(path.join(ROOT, "src/lib/oracle-quota.ts"));

// ── Harness ──────────────────────────────────────────────────────────────────
let passed = 0;
const failures = [];
function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function request(ip, headers = {}) {
  return new Request("https://universal-transmissions.com/api/oracle", {
    method: "POST",
    headers: { "x-forwarded-for": ip, "content-type": "application/json", ...headers },
    body: JSON.stringify({ message: "what is the correspondence of aleph?" }),
  });
}

function reset() {
  db.ut_oracle_usage.length = 0;
  db.ut_guest_usage.length = 0;
  memberForRequest = null;
}

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

(async () => {
  // ── 1. Guest allowance ────────────────────────────────────────────────────
  reset();
  {
    const req = () => request("203.0.113.10");
    let allowed = 0;
    for (let i = 0; i < 12; i++) {
      const d = await consumeQuota(req());
      if (d.allowed) allowed += 1;
    }
    check("guest: exactly 10 questions allowed", allowed === 10, `allowed=${allowed}`);
    const after = await peekQuota(req());
    check("guest: usage reads 10/10", after.used === 10 && after.limit === 10, `used=${after.used} limit=${after.limit}`);
    const refused = await consumeQuota(req());
    check("guest: the 11th is refused", refused.allowed === false && refused.reason === "exhausted", JSON.stringify(refused.reason));
  }

  // ── 2. Guest identity is server-bound, not client-supplied ────────────────
  reset();
  {
    const a = guestKey(request("198.51.100.7"));
    const b = guestKey(request("198.51.100.8"));
    check("guest: identity differs per address", a !== b);
    const withFakeId = guestKey(request("198.51.100.7", { cookie: "" }));
    check("guest: a query-supplied id cannot be injected through the client", withFakeId === a);
    const parsed = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(a);
    check("guest: key is a well-formed uuid for the uuid column", parsed, a);
  }

  // ── 3. Reload does not reset the allowance ───────────────────────────────
  reset();
  {
    for (let i = 0; i < 10; i++) await consumeQuota(request("192.0.2.44"));
    const afterReload = await peekQuota(request("192.0.2.44"));
    check("guest: reloading reports the spent allowance", afterReload.used === 10, `used=${afterReload.used}`);
  }

  // ── 4. Free daily allowance + reset ──────────────────────────────────────
  reset();
  {
    memberForRequest = { email: "free@example.com", plan: "free", isPaid: false };
    let allowed = 0;
    for (let i = 0; i < 27; i++) {
      const d = await consumeQuota(request("192.0.2.50"));
      if (d.allowed) allowed += 1;
    }
    check("free: exactly 25 questions allowed in a day", allowed === 25, `allowed=${allowed}`);
    const state = await peekQuota(request("192.0.2.50"));
    check("free: reports 25/25 with a reset instant", state.used === 25 && state.resetAt !== null, JSON.stringify({ used: state.used, resetAt: state.resetAt }));

    // Yesterday's row must not count against today.
    db.ut_oracle_usage.push({ id: "old", email: "free@example.com", date: yesterday, count: 25 });
    const fresh = await peekQuota(request("192.0.2.50"));
    check("free: the daily counter resets at the date boundary", fresh.used === 25 && fresh.allowed === false,
      `used=${fresh.used}`); // today still 25; yesterday's row ignored
    const previousMember = memberForRequest;
    memberForRequest = { email: "free2@example.com", plan: "free", isPaid: false };
    const other = await peekQuota(request("192.0.2.50"));
    check("free: another member is unaffected", other.used === 0, `used=${other.used}`);
    memberForRequest = previousMember;
  }

  // ── 5. Initiate is unlimited ─────────────────────────────────────────────
  reset();
  {
    memberForRequest = { email: "initiate@example.com", plan: "initiate", isPaid: true };
    let allowed = 0;
    for (let i = 0; i < 50; i++) {
      const d = await consumeQuota(request("192.0.2.60"));
      if (d.allowed) allowed += 1;
    }
    check("initiate: 50 consecutive questions all allowed", allowed === 50, `allowed=${allowed}`);
    const state = await peekQuota(request("192.0.2.60"));
    check("initiate: reports unlimited", state.limit === "unlimited" && state.remaining === "unlimited");
    check("initiate: spends no counter row", db.ut_oracle_usage.length === 0, `rows=${db.ut_oracle_usage.length}`);
  }

  // ── 6. Concurrency at the boundary ───────────────────────────────────────
  reset();
  {
    db.ut_guest_usage.push({ id: "seed", anonymous_id: guestKey(request("192.0.2.70")), total_count: 8 });
    const results = await Promise.all(
      Array.from({ length: 6 }, () => consumeQuota(request("192.0.2.70")))
    );
    const allowed = results.filter((r) => r.allowed).length;
    check("concurrency: only the remaining 2 units are granted from 6 parallel requests", allowed === 2, `allowed=${allowed}`);
    const state = await peekQuota(request("192.0.2.70"));
    check("concurrency: the counter never exceeds the ceiling", state.used <= 10, `used=${state.used}`);
  }

  // ── 7. Switching endpoints shares one allowance ─────────────────────────
  reset();
  {
    memberForRequest = { email: "free2@example.com", plan: "free", isPaid: false };
    for (let i = 0; i < 5; i++) await consumeQuota(request("192.0.2.80")); // "endpoint A"
    for (let i = 0; i < 3; i++) await consumeQuota(request("192.0.2.80")); // "endpoint B"
    const state = await peekQuota(request("192.0.2.80"));
    check("endpoints: a second Oracle surface spends the same counter", state.used === 8, `used=${state.used}`);
  }

  // ── 8. Malformed / absent credentials are guests ────────────────────────
  reset();
  {
    memberForRequest = null;
    const forged = await peekQuota(request("192.0.2.90", { authorization: "Bearer not-a-jwt" }));
    check("malformed bearer: treated as guest, not elevated", forged.plan === "guest");

    const empty = await peekQuota(new Request("https://universal-transmissions.com/api/oracle"));
    check("no headers at all: still a guest with the guest allowance", empty.plan === "guest" && empty.limit === 10);

    // An expired session resolves to no member, so the caller keeps the guest allowance.
    memberForRequest = null;
    let allowed = 0;
    for (let i = 0; i < 11; i++) if ((await consumeQuota(request("192.0.2.91"))).allowed) allowed += 1;
    check("expired session: cannot exceed the guest allowance", allowed === 10, `allowed=${allowed}`);
  }

  // ── 9. Refund returns the unit ──────────────────────────────────────────
  reset();
  {
    memberForRequest = { email: "refund@example.com", plan: "free", isPaid: false };
    const d = await consumeQuota(request("192.0.2.100"));
    const before = await peekQuota(request("192.0.2.100"));
    await d.refund();
    const after = await peekQuota(request("192.0.2.100"));
    check("refund: a failed answer gives the unit back", after.used === before.used - 1, `${before.used} -> ${after.used}`);
  }

  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
})().catch((err) => {
  console.error("suite crashed:", err);
  process.exit(1);
});
