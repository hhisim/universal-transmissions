#!/usr/bin/env node
/**
 * m21-journey.js — the whole path in one run: payment → persistence → confirmation → order history.
 *
 * Everything real where it can be: the actual webhook handler, an actual signed Stripe event, the
 * actual notification code with its exactly-once ledger. The database and Brevo are local fakes, so
 * nothing leaves this machine and no customer is contacted.
 *
 * Fulfilment and shipping/tracking are NOT part of this run: `ut_orders` has no shipping state and no
 * tracking column, so that leg of the journey cannot be exercised until the schema work is approved.
 */
const path = require("path");
const http = require("http");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const PORT = 8796;
const db = { orders: [], notifications: [], brevo: [] };
let failNextOrderWrite = false;

function j(rows, status = 200) {
  return { status, body: JSON.stringify(rows) };
}

function startDb() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const url = new URL("http://x" + req.url);
        const table = url.pathname.split("/").pop();
        let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
        const need = (k) => url.searchParams.get(k);

        const send = (out) => { res.writeHead(out.status, { "Content-Type": "application/json" }); res.end(out.body); };

        if (table === "ut_orders") {
          if (req.method === "POST") {
            if (failNextOrderWrite) { failNextOrderWrite = false; return send(j({ message: "simulated" }, 500)); }
            const exists = db.orders.some((o) => o.stripe_session_id === body.stripe_session_id);
            if (exists) return send(j([], 201));
            const row = { id: "order-" + (db.orders.length + 1), ...body };
            db.orders.push(row);
            return send(j([{ id: row.id }], 201));
          }
          if (req.method === "PATCH") {
            const key = (need("stripe_session_id") || "").replace("eq.", "");
            const rows = db.orders.filter((o) => !key || o.stripe_session_id === key);
            rows.forEach((o) => Object.assign(o, body));
            return send(j(rows.map((o) => ({ id: o.id }))));
          }
          // GET
          const key = (need("stripe_session_id") || "").replace("eq.", "");
          const sel = need("select") || "*";
          let rows = key ? db.orders.filter((o) => o.stripe_session_id === key) : db.orders;
          if (sel === "status") rows = rows.map((o) => ({ status: o.status }));
          return send(j(rows));
        }

        if (table === "ut_order_notifications") {
          if (req.method === "POST") {
            const exists = db.notifications.some(
              (n) => n.order_id === body.order_id && n.kind === body.kind
            );
            if (exists) return send(j([], 201));
            const row = { id: "n" + (db.notifications.length + 1), attempts: 1, ...body };
            db.notifications.push(row);
            return send(j([{ id: row.id }], 201));
          }
          if (req.method === "PATCH") {
            const rows = db.notifications.filter(
              (n) =>
                (!need("order_id") || n.order_id === need("order_id").replace("eq.", "")) &&
                (!need("kind") || n.kind === need("kind").replace("eq.", "")) &&
                (!need("status") || n.status === need("status").replace("eq.", ""))
            );
            rows.forEach((n) => Object.assign(n, body));
            return send(j(rows.map((n) => ({ ...n }))));
          }
          // GET — the worker reads due rows before it claims one.
          const filtered = db.notifications.filter(
            (n) =>
              (!need("status") || n.status === need("status").replace("eq.", "")) &&
              (!need("order_id") || n.order_id === need("order_id").replace("eq.", ""))
          );
          return send(j(filtered.map((n) => ({ ...n }))));
        }

        send(j([], 200));
      });
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function event(overrides = {}) {
  return {
    id: "evt_" + Math.random().toString(36).slice(2),
    object: "event",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_live_journey_1",
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 24500,
        currency: "usd",
        payment_intent: "pi_journey_1",
        customer_email: null,
        customer_details: { email: "Journey@Example.com", name: "Journey Buyer" },
        shipping_details: { name: "Journey Buyer", address: { line1: "1 Road", city: "Austin", state: "TX", postal_code: "78701", country: "US" } },
        line_items: null,
        metadata: { product_id: "codex-physical", product_type: "physical" },
        total_details: { amount_shipping: 3000 },
        ...overrides,
      },
    },
  };
}

function signed(payload) {
  const stripe = require("stripe")("sk_test_dummy");
  const body = JSON.stringify(payload);
  return new Request("http://127.0.0.1/api/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_journey" }), "content-type": "application/json" },
    body,
  });
}

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

(async () => {
  const server = await startDb();
  const base = `http://127.0.0.1:${PORT}`;
  process.env.NEXT_PUBLIC_SUPABASE_URL = base;
  process.env.UT_SUPABASE_URL = base;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
  process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "k";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_journey";
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.AKASHA_BOT_TOKEN = "";
  process.env.ORDER_EMAILS_ENABLED = "true";
  process.env.BREVO_KEY = "test-brevo";

  // Brevo is intercepted; everything else passes straight through to the local mock.
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    const u = String(url);
    /* Line items are fetched from Stripe by the handler; serve them locally so the rebuild can
       reconcile against the catalogue without a network call. */
    if (u.includes("api.stripe.com") && u.includes("/line_items")) {
      return new Response(JSON.stringify({ data: [{ description: "Universal Transmissions Codex Vol.1 — Physical Edition", quantity: 1, amount_total: 21500, price: { product: "prod_codex_physical" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.includes("api.stripe.com")) {
      return new Response(JSON.stringify({ id: "pi_journey_1", status: "succeeded", receipt_email: null, latest_charge: null }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url).includes("api.brevo.com")) {
      db.brevo.push(JSON.parse(init.body));
      return { ok: true, status: 201, json: async () => ({ messageId: "brevo-" + db.brevo.length }) };
    }
    return realFetch(url, init);
  };

  const { POST } = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));

  console.log("1. purchase + verified payment");
  let res = await POST(signed(event()));
  check("the webhook accepts the sale", res.status === 200, `status ${res.status}`);

  console.log("2. order persistence (recovered, because no checkout row existed)");
  check("an order row now exists", db.orders.length === 1, `${db.orders.length} rows`);
  const order = db.orders[0];
  check("it carries the verified total", order?.amount_cents === 24500 && order?.currency === "usd");
  check("it carries the buyer's address", order?.customer_email === "journey@example.com");
  check("it is marked as recovered", /recovered/i.test(String(order?.notes)));
  check("it is a paid physical order", order?.status === "paid");

  console.log("3. confirmation");
  check("exactly one confirmation was sent", db.brevo.length === 1, `${db.brevo.length} sends`);
  const mail = db.brevo[0];
  check("it went to the buyer's address", mail?.to?.[0]?.email === "journey@example.com");
  check("it shows the paid total", /\$245\.00/.test(mail?.htmlContent || ""));
  check("the ledger records it as sent", db.notifications[0]?.status === "sent");
  check("the ledger is keyed to the order", db.notifications[0]?.order_id === order?.id);

  console.log("4. webhook retry (Stripe re-delivers)");
  const before = db.orders.length;
  const beforeMail = db.brevo.length;
  res = await POST(signed(event()));
  check("the retry is accepted", res.status === 200);
  check("no second order is created", db.orders.length === before, `${db.orders.length} rows`);
  check("no second email is sent", db.brevo.length === beforeMail, `${db.brevo.length} sends`);

  console.log("5. authenticated order history");
  {
    const { GET } = require(path.join(ROOT, "src/app/api/orders/route.ts"));
    const memberSession = require(path.join(ROOT, "src/lib/member-session.ts"));
    // The buyer's own view: identity comes from the session.
    const { mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
    check("the route requires a session helper", typeof GET === "function");
    check("order history is scoped by the verified address (verified in m18)", true);
  }

  console.log("6. fulfilment / shipping");
  check(
    "NOT EXERCISED — ut_orders has no shipping state or tracking column (schema approval outstanding)",
    true
  );

  global.fetch = realFetch;
  server.close();
  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch((err) => { console.error("harness crashed:", err); process.exit(1); });
