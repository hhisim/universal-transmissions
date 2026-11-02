#!/usr/bin/env node
/**
 * m23-release-compat.js — what the new release does when the migration has NOT been applied.
 *
 * This answers the sequencing question with evidence rather than argument:
 *
 *   · can a paid order still be persisted?        (must be yes — recovery must not depend on new tables)
 *   · is any payment acknowledged but lost?       (must be no — unrecoverable ⇒ non-2xx)
 *   · are exception records lost?                 (YES — the table does not exist yet)
 *   · can a customer be emailed accidentally?     (must be no)
 *
 * The third answer is why the migration goes FIRST: the code is survivable without it, but an
 * incomplete recovery would leave no durable exception row, only the `unresolved` marker in the order.
 */
const path = require("path");
const http = require("http");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const PORT = 8801;
const db = { orders: [], brevo: [], writes: [] };
let failOrderWrite = false;

function j(res, rows, status = 200) {
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
        db.writes.push({ table, method: req.method });

        // The migration has not been applied: these tables do not exist.
        if (table === "ut_order_notifications" || table === "ut_order_exceptions") {
          return j(res, { code: "42P01", message: `relation "public.${table}" does not exist` }, 404);
        }

        if (table === "ut_orders") {
          if (req.method === "POST") {
            if (failOrderWrite) { failOrderWrite = false; return j(res, { message: "write failed" }, 500); }
            if (db.orders.some((o) => o.stripe_session_id === body.stripe_session_id)) return j(res, [], 201);
            const row = { id: "order-" + (db.orders.length + 1), ...body };
            db.orders.push(row);
            return j(res, [{ id: row.id }], 201);
          }
          if (req.method === "PATCH") {
            const key = (need("stripe_session_id") || "").replace("eq.", "");
            const rows = db.orders.filter((o) => !key || o.stripe_session_id === key);
            rows.forEach((o) => Object.assign(o, body));
            return j(res, rows.map((o) => ({ ...o })));
          }
          const key = (need("stripe_session_id") || "").replace("eq.", "");
          let rows = db.orders.filter((o) => !key || o.stripe_session_id === key);
          if (need("select") === "status") rows = rows.map((o) => ({ status: o.status }));
          return j(res, rows);
        }

        return j(res, []);
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
        id: "cs_" + Math.random().toString(36).slice(2),
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 24500,
        currency: "usd",
        payment_intent: "pi_x",
        customer_email: null,
        customer_details: { email: "Compat@Example.com", name: "Compat Buyer" },
        collected_information: { shipping_details: { name: "Compat Buyer", address: { line1: "1 Way", city: "Austin", state: "TX", postal_code: "78701", country: "US" } } },
        metadata: { product_id: "codex-physical", product_type: "physical" },
        total_details: { amount_shipping: 3000, amount_discount: 0, amount_tax: 0 },
        line_items: null,
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
    headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_compat" }), "content-type": "application/json" },
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
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_compat";
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.AKASHA_BOT_TOKEN = "";
  process.env.ORDER_EMAILS_ENABLED = "true";
  process.env.BREVO_KEY = "test-brevo";

  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes("api.stripe.com") && u.includes("/line_items")) {
      return new Response(JSON.stringify({ data: [{ description: "Codex", quantity: 1, amount_total: 21500, price: { product: "p" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.includes("api.stripe.com")) {
      return new Response(JSON.stringify({ id: "pi_x", status: "succeeded", receipt_email: null, latest_charge: null }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.includes("api.brevo.com")) { db.brevo.push(JSON.parse(init.body)); return { ok: true, status: 201, json: async () => ({ messageId: "x" }) }; }
    return realFetch(url, init);
  };

  const { POST } = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));

  console.log("code deployed, migration NOT applied");
  {
    const res = await POST(signed(event()));
    check("a paid order is still persisted", db.orders.length === 1, `${db.orders.length} rows`);
    check("the webhook does not crash on the missing tables", res.status === 200, `status ${res.status}`);
    check("no customer email is attempted", db.brevo.length === 0);
    check("the order carries the recovered marker", /recovered/i.test(String(db.orders[0]?.notes)));
    check("the address was read from collected_information", db.orders[0]?.shipping_city === "Austin");
  }

  console.log("incomplete recovery without the exception table");
  {
    // No product metadata: the rebuild cannot reconcile, so it must be recorded but inert.
    const res = await POST(signed(event({ metadata: {}, id: "cs_incomplete_1" })));
    const row = db.orders.find((o) => o.stripe_session_id === "cs_incomplete_1");
    check("the incomplete order is still recorded", !!row);
    check("it is marked unresolved in the row itself", /unresolved/i.test(String(row?.notes)));
    check("it is not fulfilled", row?.status === "paid");
    check("no email is sent for it", db.brevo.length === 0);
    check("the missing exception table does not break the response", res.status === 200, `status ${res.status}`);
    console.log("    NOTE: the exception row CANNOT be written without the migration — this is the sequencing argument");
  }

  console.log("unrecoverable payment");
  {
    const before = db.orders.length;
    const res = await POST(signed(event({ amount_total: 0, id: "cs_bad_1" })));
    check("no order is written for an unverifiable total", db.orders.length === before);
    check("the payment is not acknowledged (non-2xx so Stripe retries)", res.status === 422, `status ${res.status}`);
  }

  console.log("database failure");
  {
    failOrderWrite = true;
    const res = await POST(signed(event({ id: "cs_dbfail_1" })));
    check("a failed insert is not acknowledged", res.status === 503, `status ${res.status}`);
  }

  global.fetch = realFetch;
  server.close();
  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch((err) => { console.error("harness crashed:", err); process.exit(1); });
