#!/usr/bin/env node
/**
 * m22-real-testmode.js — a GENUINE Stripe test-mode purchase through the real handler.
 *
 * The event this replays was produced by Stripe itself (livemode: false) after a real test-card
 * payment on the hosted Checkout page — not hand-built. It is delivered to the actual webhook code
 * with a valid signature, against an isolated database with the line-items endpoint served locally.
 *
 * What it proves: real provider payment → order persistence via recovery → outbox row → exactly one
 * send → replay safety. What it does not prove: a real Brevo delivery (the transport is stubbed here;
 * a controlled real send is a separate, explicitly approved step).
 */
const path = require("path");
const fs = require("fs");
const http = require("http");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const EVENT_PATH = process.env.REAL_EVENT || "/tmp/real-test-event.json";
const PORT = 8798;
const db = { orders: [], notifications: [], exceptions: [], brevo: [] };

function send(res, rows, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(rows));
}

function startDb() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const url = new URL("http://x" + req.url);
        const table = url.pathname.split("/").pop();
        const need = (k) => url.searchParams.get(k);
        let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }

        if (table === "ut_orders") {
          if (req.method === "POST") {
            const exists = db.orders.some((o) => o.stripe_session_id === body.stripe_session_id);
            if (exists) return send(res, [], 201);
            const row = { id: "order-" + (db.orders.length + 1), ...body };
            db.orders.push(row);
            return send(res, [{ id: row.id }], 201);
          }
          if (req.method === "PATCH") {
            const key = (need("stripe_session_id") || "").replace("eq.", "");
            const rows = db.orders.filter((o) => !key || o.stripe_session_id === key);
            rows.forEach((o) => Object.assign(o, body));
            return send(res, rows.map((o) => ({ ...o })));
          }
          const key = (need("stripe_session_id") || "").replace("eq.", "");
          const id = (need("id") || "").replace("eq.", "");
          let rows = db.orders;
          if (key) rows = rows.filter((o) => o.stripe_session_id === key);
          if (id) rows = rows.filter((o) => o.id === id);
          if (need("select") === "status") rows = rows.map((o) => ({ status: o.status }));
          return send(res, rows);
        }

        if (table === "ut_order_notifications") {
          if (req.method === "POST") {
            const dup = db.notifications.some((n) => n.order_id === body.order_id && n.kind === body.kind);
            if (dup) return send(res, [], 201);
            const row = { id: "n" + (db.notifications.length + 1), ...body };
            db.notifications.push(row);
            return send(res, [{ id: row.id }], 201);
          }
          if (req.method === "PATCH") {
            const rows = db.notifications.filter(
              (n) =>
                (!need("id") || n.id === need("id").replace("eq.", "")) &&
                (!need("status") || n.status === need("status").replace("eq.", "")) &&
                (!need("kind") || n.kind === need("kind").replace("eq.", ""))
            );
            rows.forEach((n) => Object.assign(n, body));
            return send(res, rows.map((n) => ({ ...n })));
          }
          return send(res, db.notifications.filter((n) => !need("status") || n.status === need("status").replace("eq.", "")));
        }

        if (table === "ut_order_exceptions") {
          if (req.method === "POST") {
            const dup = db.exceptions.some((e) => e.payment_reference === body.payment_reference);
            if (dup) return send(res, [], 201);
            const row = { id: "e" + (db.exceptions.length + 1), ...body };
            db.exceptions.push(row);
            return send(res, [{ id: row.id }], 201);
          }
          return send(res, db.exceptions);
        }

        send(res, []);
      });
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

(async () => {
  if (!fs.existsSync(EVENT_PATH)) {
    console.log(`no real event at ${EVENT_PATH} — run the test-mode checkout first`);
    process.exit(2);
  }
  const event = JSON.parse(fs.readFileSync(EVENT_PATH, "utf8"));
  const session = event.data.object;

  console.log("real Stripe test-mode event");
  check("the event came from Stripe test mode", event.livemode === false, `livemode=${event.livemode}`);
  check("the payment is settled", session.payment_status === "paid");
  check("the charged total is the catalogue price plus shipping", session.amount_total === 24500);
  check("the buyer address is present", !!session.customer_details?.email);
  check("the session carries our product metadata", session.metadata?.product_id === "codex-physical");

  const server = await startDb();
  const base = `http://127.0.0.1:${PORT}`;
  process.env.NEXT_PUBLIC_SUPABASE_URL = base;
  process.env.UT_SUPABASE_URL = base;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
  process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "k";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_real_testmode";
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.AKASHA_BOT_TOKEN = "";
  process.env.ORDER_EMAILS_ENABLED = "true";
  process.env.BREVO_KEY = "test-brevo";

  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes("api.stripe.com") && u.includes("/line_items")) {
      return new Response(
        JSON.stringify({ data: session.line_items || [{ description: "Universal Transmissions Codex Vol.1 — Physical Edition", quantity: 1, amount_total: 21500, price: { product: "prod_codex_physical" } }] }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    if (u.includes("api.stripe.com")) {
      return new Response(JSON.stringify({ id: session.payment_intent, status: "succeeded", receipt_email: null, latest_charge: null }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.includes("api.brevo.com")) {
      db.brevo.push(JSON.parse(init.body));
      return { ok: true, status: 201, json: async () => ({ messageId: "brevo-real-1" }) };
    }
    return realFetch(url, init);
  };

  const { POST } = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));
  const stripe = require("stripe")("sk_test_dummy");
  const body = JSON.stringify(event);
  const signed = new Request("http://127.0.0.1/api/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_real_testmode" }), "content-type": "application/json" },
    body,
  });

  console.log("handler");
  const res = await POST(signed);
  check("the handler accepts the real event", res.status === 200, `status ${res.status}`);

  console.log("persistence");
  const order = db.orders[0];
  check("an order row exists", db.orders.length === 1, `${db.orders.length} rows`);
  check("the amount stored is the amount charged", order?.amount_cents === 24500);
  check("the currency is usd", order?.currency === "usd");
  check("the buyer's address is stored, canonicalised", order?.customer_email === String(session.customer_details.email).toLowerCase());
  check("the product id comes from metadata", order?.product_id === "codex-physical");
  check("the payment reference is the session", order?.stripe_session_id === session.id);
  check("shipping details survived", order?.shipping_city?.length > 0);
  check("no exception was opened for a clean recovery", db.exceptions.length === 0);

  console.log("confirmation");
  check("exactly one confirmation was queued and sent", db.brevo.length === 1, `${db.brevo.length} sends`);
  check("it is addressed to the buyer", db.brevo[0]?.to?.[0]?.email === String(session.customer_details.email).toLowerCase());
  check("it shows the amount actually charged", /\$245\.00/.test(db.brevo[0]?.htmlContent || ""));
  check("the ledger records it as sent", db.notifications[0]?.status === "sent");
  check("the provider message id is recorded", db.notifications[0]?.provider_message_id === "brevo-real-1");

  console.log("replay");
  const signedAgain = new Request("http://127.0.0.1/api/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_real_testmode" }), "content-type": "application/json" },
    body,
  });
  await POST(signedAgain);
  check("a replayed delivery creates no second order", db.orders.length === 1);
  check("and sends no second email", db.brevo.length === 1);

  global.fetch = realFetch;
  server.close();
  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch((err) => { console.error("harness crashed:", err); process.exit(1); });
