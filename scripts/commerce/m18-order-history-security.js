#!/usr/bin/env node
/**
 * m18-order-history-security.js — /api/orders must never hand out orders on a caller's say-so.
 *
 * The route used to return rows for any `email` query parameter, unauthenticated. These tests run
 * the real route handler and assert, for every shape of attempt, what it answers and — just as
 * important — what identity it queries the database with.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

// ── who the session says we are ────────────────────────────────────────────
let CURRENT_MEMBER = null;
mockModule("@/lib/member-session", {
  getRequestMember: async () => CURRENT_MEMBER,
}, { root: ROOT });

// ── the database: records what identity the route asked with ───────────────
const QUERIES = [];
const ROWS_BY_EMAIL = {
  "buyer@example.com": [
    { id: "order-1", product_title: "Codex Vol.1 — Physical", amount_cents: 24500, currency: "usd", status: "fulfilled" },
  ],
  "someone.else@example.com": [
    { id: "order-2", product_title: "Private purchase", amount_cents: 9900, currency: "usd", status: "paid" },
  ],
};

mockModule("@/lib/supabase", {
  supabaseAdmin: {
    from: (table) => {
      const q = { table, select: null, filters: [] };
      const builder = {
        select(cols) { q.select = cols; return builder; },
        eq(col, val) { q.filters.push([col, val]); return builder; },
        order() {
          QUERIES.push({ ...q });
          const match = q.filters.find(([c]) => c === "customer_email");
          const rows = match ? (ROWS_BY_EMAIL[match[1]] ?? []) : [];
          return Promise.resolve({ data: rows, error: null });
        },
      };
      return builder;
    },
  },
}, { root: ROOT });

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

function req(url) {
  return new Request(url, { method: "GET" });
}

(async () => {
  const { GET } = require(path.join(ROOT, "src/app/api/orders/route.ts"));

  // ── 1. anonymous ───────────────────────────────────────────────────────
  console.log("anonymous");
  CURRENT_MEMBER = null;
  QUERIES.length = 0;
  let res = await GET(req("http://x/api/orders?email=buyer@example.com"));
  let body = await res.json();
  check("no session → 401", res.status === 401, `status ${res.status}`);
  check("no session → no database read at all", QUERIES.length === 0, `${QUERIES.length} queries`);
  check("no order data in the body", !JSON.stringify(body).includes("order-1"));

  // ── 2. anonymous, no parameter ─────────────────────────────────────────
  res = await GET(req("http://x/api/orders"));
  check("no session and no parameter → still 401", res.status === 401, `status ${res.status}`);

  // ── 3. a member asking for their own orders ────────────────────────────
  console.log("authenticated, own orders");
  CURRENT_MEMBER = { email: "buyer@example.com", plan: "initiate", isPaid: true };
  QUERIES.length = 0;
  res = await GET(req("http://x/api/orders?email=buyer@example.com"));
  body = await res.json();
  check("their own orders are returned", res.status === 200 && body.orders?.length === 1, `status ${res.status}`);
  check("the query is keyed on the VERIFIED address", QUERIES[0]?.filters.some(([c, v]) => c === "customer_email" && v === "buyer@example.com"));
  check("select(*) is gone — only display fields are exposed", QUERIES[0]?.select !== "*" && !/(^|,)\*(,|$)/.test(QUERIES[0]?.select || ""));
  check("internal ids that the page does not need are not selected", !String(QUERIES[0]?.select).includes("stripe_session_id"));

  // ── 4. forged email parameter ──────────────────────────────────────────
  console.log("forged parameter");
  QUERIES.length = 0;
  res = await GET(req("http://x/api/orders?email=someone.else@example.com"));
  body = await res.json();
  check("asking for another customer's email → 403", res.status === 403, `status ${res.status}`);
  check("their orders are NOT returned", !JSON.stringify(body).includes("order-2") && !JSON.stringify(body).includes("Private purchase"));
  check("no database read happens for a forged request", QUERIES.length === 0, `${QUERIES.length} queries`);

  // ── 5. parameter omitted entirely (the page's own path) ────────────────
  console.log("no parameter");
  CURRENT_MEMBER = { email: "buyer@example.com", plan: "free", isPaid: false };
  QUERIES.length = 0;
  res = await GET(req("http://x/api/orders"));
  body = await res.json();
  check("omitting the parameter still scopes to the session identity", res.status === 200 && QUERIES[0]?.filters.some(([, v]) => v === "buyer@example.com"));
  check("and returns only that identity's rows", body.orders?.length === 1 && body.orders[0].id === "order-1");

  // ── 6. case differences must not widen access ──────────────────────────
  console.log("case handling");
  QUERIES.length = 0;
  res = await GET(req("http://x/api/orders?email=BUYER@EXAMPLE.COM"));
  check("a different case of your own address is allowed", res.status === 200, `status ${res.status}`);
  check("and is normalised before the query", QUERIES[0]?.filters.some(([, v]) => v === "buyer@example.com"));

  // ── 7. a member with no orders ─────────────────────────────────────────
  CURRENT_MEMBER = { email: "no.orders@example.com", plan: "guest", isPaid: false };
  res = await GET(req("http://x/api/orders"));
  body = await res.json();
  check("a member with no orders gets an empty list, not a 403", res.status === 200 && Array.isArray(body.orders) && body.orders.length === 0);

  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch((err) => {
  console.error("harness crashed:", err);
  process.exit(1);
});
