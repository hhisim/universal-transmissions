#!/usr/bin/env node
/**
 * m28-manual-fulfilment.js — the studio's confirmation that a digital edition was actually sent.
 *
 * Digital delivery is manual, so `fulfilled` is a human statement, not a payment side effect.
 * These checks hold the line: only the studio can say it, only for a paid digital order, only once,
 * and the audit survives.
 */
const path = require("path");
const http = require("http");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const PORT = 8809;
const state = { orders: {}, writes: 0 };
const j = (res, b, s = 200) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(b)); };

function server() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const url = new URL("http://x" + req.url);
        if (!url.pathname.startsWith("/rest/v1/ut_orders")) return j(res, []);
        const id = (url.searchParams.get("id") || "").replace("eq.", "");
        const statusFilter = (url.searchParams.get("status") || "").replace("eq.", "");
        const order = state.orders[id];

        if (req.method === "PATCH") {
          if (!order || (statusFilter && order.status !== statusFilter)) return j(res, []);
          state.writes += 1;
          Object.assign(order, JSON.parse(raw || "{}"));
          return j(res, [{ id: order.id, status: order.status }]);
        }
        const single = (req.headers["accept"] || "").includes("pgrst.object");
        if (!order) return j(res, { code: "PGRST116", message: "no rows" }, 406);
        return j(res, single ? order : [order]);
      });
    });
    s.listen(PORT, "127.0.0.1", () => resolve(s));
  });
}

let passed = 0;
const failures = [];
const check = (n, ok, d) => { if (ok) { passed++; console.log("  PASS  " + n); } else { failures.push(n + (d ? " — " + d : "")); console.log("  FAIL  " + n + (d ? " — " + d : "")); } };
const NextRequest = require("next/server").NextRequest;

const KEY = "ut_admin_test_key_123";
const ID = "cccccccc-3333-4333-8333-cccccccccccc";

function order(over) {
  return { id: ID, status: "paid", is_digital: true, product_title: "Codex Vol.1 — Digital", customer_email: "buyer@example.com", notes: "recovered", ...over };
}

function call(headers, id = ID) {
  return new NextRequest("http://x/api/admin/orders/" + id + "/fulfil", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ note: "sent 1.54 GB master by email" }),
  });
}

(async () => {
  const srv = await server();
  const base = `http://127.0.0.1:${PORT}`;
  process.env.NEXT_PUBLIC_SUPABASE_URL = base;
  process.env.UT_SUPABASE_URL = base;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
  process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "k";
  const mod = path.join(ROOT, "src/app/api/admin/orders/[id]/fulfil/route.ts");

  console.log("fail closed");
  delete process.env.ADMIN_FULFILMENT_KEY;
  delete require.cache[require.resolve(mod)];
  {
    const { POST } = require(mod);
    check("no admin key configured ⇒ nobody can fulfil", (await POST(call({ "x-ut-admin-key": KEY }), { params: { id: ID } })).status === 503);
  }

  process.env.ADMIN_FULFILMENT_KEY = KEY;
  delete require.cache[require.resolve(mod)];
  const { POST } = require(mod);

  console.log("authorisation");
  state.orders[ID] = order({});
  {
    check("no credential is refused", (await POST(call({}), { params: { id: ID } })).status === 401);
    check("a wrong key is refused", (await POST(call({ "x-ut-admin-key": "nope" }), { params: { id: ID } })).status === 401);
    /* A buyer's own session must not satisfy this route: it never reads cookies or bearer tokens. */
    check("a buyer's session cannot fulfil their own order",
      (await POST(call({ authorization: "Bearer buyer-token", cookie: "sb-x-auth-token=stolen" }), { params: { id: ID } })).status === 401);
    check("nothing was written by the refusals", state.writes === 0, String(state.writes));
  }

  console.log("the real confirmation");
  {
    const r = await POST(call({ "x-ut-admin-key": KEY }), { params: { id: ID } });
    const body = await r.json();
    check("the studio confirms delivery", r.status === 200 && body.ok === true);
    check("the order becomes fulfilled", state.orders[ID].status === "fulfilled", state.orders[ID].status);
    check("a timestamp is returned", /^\d{4}-\d{2}-\d{2}T/.test(body.fulfilledAt || ""), body.fulfilledAt);
    check("an audit line is appended", /delivered manually/.test(state.orders[ID].notes || ""), state.orders[ID].notes);
    check("the previous note is preserved", /recovered/.test(state.orders[ID].notes || ""));
    check("the audit names the actor", /studio-manual-fulfilment/.test(state.orders[ID].notes || ""));
  }

  console.log("idempotency");
  {
    const before = state.orders[ID].notes;
    const writesBefore = state.writes;
    const r = await POST(call({ "x-ut-admin-key": KEY }), { params: { id: ID } });
    const body = await r.json();
    check("a second confirmation is accepted", r.status === 200);
    check("and says it was already fulfilled", body.alreadyFulfilled === true);
    check("the audit is not duplicated", state.orders[ID].notes === before);
    check("no second write happens", state.writes === writesBefore, `${state.writes} vs ${writesBefore}`);
  }

  console.log("refusals that protect customers");
  {
    const unpaid = "dddddddd-4444-4444-8444-dddddddddddd";
    state.orders[unpaid] = order({ id: unpaid, status: "pending" });
    check("an unpaid order cannot be marked delivered", (await POST(call({ "x-ut-admin-key": KEY }, unpaid), { params: { id: unpaid } })).status === 409);

    const phys = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
    state.orders[phys] = order({ id: phys, is_digital: false });
    check("a physical order is not a digital fulfilment", (await POST(call({ "x-ut-admin-key": KEY }, phys), { params: { id: phys } })).status === 409);

    check("an unknown order is 404", (await POST(call({ "x-ut-admin-key": KEY }, "missing"), { params: { id: "missing" } })).status === 404);
  }

  srv.close();
  console.log(`\n${failures.length ? "FAILURES" : "ALL PASS"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
})().catch((e) => { console.error("harness crashed:", e); process.exit(1); });
