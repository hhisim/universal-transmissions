#!/usr/bin/env node
/**
 * m24-digital-real.js — replay the GENUINE digital test-mode event through the real handler.
 *
 * The payment itself was made in a browser against Stripe's hosted Checkout (session cs_test_a1evPy…,
 * $99.00, metadata product_type=digital). This feeds Stripe's own event back into our handler with a
 * valid test signature, against an isolated mock database, and checks what we record.
 */
const path = require("path");
const http = require("http");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const PORT = 8803;
const db = { orders: [], brevo: [] };
const j = (res, b, s = 200) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(b)); };

function server() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const url = new URL("http://x" + req.url);
        const table = url.pathname.split("/").pop();
        const key = (url.searchParams.get("stripe_session_id") || "").replace("eq.", "");
        let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }

        if (table === "ut_order_notifications" || table === "ut_order_exceptions") return j(res, { message: "missing" }, 404);

        if (table === "ut_orders") {
          if (req.method === "POST") {
            if (db.orders.some((o) => o.stripe_session_id === body.stripe_session_id)) return j(res, [], 201);
            const row = { id: "order-" + (db.orders.length + 1), ...body };
            db.orders.push(row);
            return j(res, [{ id: row.id }], 201);
          }
          if (req.method === "PATCH") {
            db.orders.filter((o) => !key || o.stripe_session_id === key).forEach((o) => Object.assign(o, body));
            return j(res, db.orders.map((o) => ({ ...o })));
          }
          let rows = db.orders.filter((o) => !key || o.stripe_session_id === key);
          if (url.searchParams.get("select") === "status") rows = rows.map((o) => ({ status: o.status }));
          return j(res, rows);
        }
        return j(res, []);
      });
    });
    s.listen(PORT, "127.0.0.1", () => resolve(s));
  });
}

let passed = 0;
const failures = [];
const check = (n, ok, d) => { if (ok) { passed++; console.log("  PASS  " + n); } else { failures.push(n); console.log("  FAIL  " + n + (d ? " — " + d : "")); } };

function signed(payload, secret) {
  const stripe = require("stripe")("sk_test_dummy");
  const body = JSON.stringify(payload);
  return new Request("http://127.0.0.1/api/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload: body, secret }), "content-type": "application/json" },
    body,
  });
}

(async () => {
  const srv = await server();
  const base = `http://127.0.0.1:${PORT}`;
  process.env.NEXT_PUBLIC_SUPABASE_URL = base;
  process.env.UT_SUPABASE_URL = base;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
  process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "k";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_m24";
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.ORDER_EMAILS_ENABLED = "false"; // the production posture
  process.env.AKASHA_BOT_TOKEN = "";

  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes("api.stripe.com")) return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
    if (u.includes("api.brevo.com")) { db.brevo.push(1); return { ok: true, status: 201, json: async () => ({ messageId: "x" }) }; }
    return realFetch(url, init);
  };

  const { POST } = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));
  const evt = JSON.parse(fs.readFileSync("/tmp/digital-event.json", "utf8"));

  console.log("genuine digital event:", evt.id, "livemode=" + evt.livemode);
  const r1 = await POST(signed(evt, "whsec_m24"));
  const order = db.orders[0];
  check("the webhook accepts the genuine digital event", r1.status === 200, "status " + r1.status);
  check("an order row is written", db.orders.length === 1, db.orders.length + " rows");
  check("it is keyed on the real checkout session", order?.stripe_session_id === "cs_test_a1evPyhfeJTTqyQcY4rcsNQg10YFQqZU6dtDtyNdh28ZNhXyC630mibRCj");
  check("it is recorded as digital", order?.is_digital === true);
  check("the paid total is the real $99.00", order?.amount_cents === 9900, String(order?.amount_cents));
  check("the currency is usd", order?.currency === "usd");
  check("the catalogue product comes from metadata", order?.product_id === "codex-digital", String(order?.product_id));
  check("the verified customer email is stored", String(order?.customer_email || "").toLowerCase() === "digital-test@universal-transmissions.com");
  check("a digital sale needs no shipping address", !order?.shipping_address_line1);
  /* The genuine $99 digital purchase must be `paid`, never `fulfilled`: nothing was delivered to the
     buyer, and there is no asset to deliver (see m25). */
  check("it is recorded as paid, not fulfilled", order?.status === "paid", String(order?.status));
  check("no customer email is sent while the flag is off", db.brevo.length === 0, db.brevo.length + " attempted");

  console.log("replay");
  const r2 = await POST(signed(evt, "whsec_m24"));
  check("a replayed event is acknowledged", r2.status === 200);
  check("and creates no second order", db.orders.length === 1, db.orders.length + " rows");
  check("and still sends nothing", db.brevo.length === 0);

  global.fetch = realFetch;
  srv.close();
  console.log(`\n${failures.length ? "FAILURES" : "ALL PASS"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
})().catch((e) => { console.error("harness crashed:", e); process.exit(1); });
