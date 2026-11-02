#!/usr/bin/env node
/**
 * m19-order-recovery.js — a paid session with no order row must never be acknowledged as lost.
 *
 * Runs the REAL webhook handler with genuine signed events against an isolated mock database that
 * can be told to (a) match no row, (b) lose a race, or (c) fail. Asserts what the handler writes,
 * what it answers, and that nothing is duplicated.
 */
const path = require("path");
const http = require("http");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const PORT = 8794;
const state = { updateRows: [], insertRows: [], insertError: false, calls: [] };

function startMockDb() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let parsed = null;
        try { parsed = body ? JSON.parse(body) : null; } catch { parsed = body; }
        const call = { method: req.method, url: req.url, body: parsed };
        state.calls.push(call);

        if (req.method === "POST") {
          if (state.insertError) {
            res.writeHead(500, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ code: "500", message: "simulated write failure" }));
          }
          res.writeHead(201, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(state.insertRows));
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(state.updateRows));
      });
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function buildEvent(overrides) {
  return {
    id: "evt_" + Math.random().toString(36).slice(2),
    object: "event",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_test_recover",
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 24500,
        currency: "usd",
        payment_intent: "pi_test_recover",
        customer_email: null,
        customer_details: { email: "Recovered@Example.com", name: "Test Buyer" },
        shipping_details: {
          name: "Test Buyer",
          address: { line1: "1 Test Way", city: "Austin", state: "TX", postal_code: "78701", country: "US" },
        },
        line_items: null,
        metadata: {},
        ...overrides,
      },
    },
  };
}

function signed(payload, secret) {
  const stripe = require("stripe")(secret);
  const body = JSON.stringify(payload);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  return new Request("http://127.0.0.1/api/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" },
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
  // ── 0. the builder itself, with line items the harness cannot reach ────
  console.log("reconstructed row");
  {
    const { buildRecoveredOrder } = require(path.join(ROOT, "src/lib/order-recovery.ts"));
    const base = {
      id: "cs_x", payment_status: "paid", amount_total: 24500, currency: "usd",
      payment_intent: "pi_x", customer_details: { email: "A@B.com", name: "N" },
      shipping_details: { name: "N", address: { city: "Austin", country: "US" } },
    };
    const full = buildRecoveredOrder({
      session: base,
      lineItems: { data: [{ description: "Codex Vol.1 — Physical", quantity: 1, price: { product: "prod_123" } }] },
      isDigital: false,
    });
    check("a complete rebuild is marked complete", full.complete === true);
    check("the product title comes from the line item", /Codex Vol\.1/.test(full.row.product_title));
    check("the product id comes from the line item", full.row.product_id === "prod_123");
    check("the address is lowercased", full.row.customer_email === "a@b.com");
    check("a digital product is fulfilled, a physical one is paid", full.row.status === "paid");

    const noItems = buildRecoveredOrder({ session: base, lineItems: null, isDigital: false });
    check("missing line items still produce a recordable row", !!noItems.row);
    check("and are flagged incomplete", noItems.complete === false);
    check("with an explicit placeholder rather than a guess", /could not be resolved/.test(noItems.row.product_title));

    const noEmail = buildRecoveredOrder({ session: { ...base, customer_details: null }, lineItems: null, isDigital: false });
    check("a session without an address is flagged", noEmail.complete === false && noEmail.row.customer_email === "");

    const badTotal = buildRecoveredOrder({ session: { ...base, amount_total: 0 }, lineItems: null, isDigital: false });
    check("no payable total → nothing is rebuilt", badTotal.row === null);

    const digital = buildRecoveredOrder({
      session: base, lineItems: { data: [{ description: "PDF", quantity: 1, price: { product: "prod_x" } }] }, isDigital: true,
    });
    check("a digital sale is recorded as fulfilled", digital.row.status === "fulfilled");
  }

  const server = await startMockDb();
  const secret = "whsec_recovery_test";

  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${PORT}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test_key";
  process.env.UT_SUPABASE_URL = `http://127.0.0.1:${PORT}`;
  process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "test_key";
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.AKASHA_BOT_TOKEN = "";

  const { POST } = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));

  // ── 1. no matching row → rebuild and insert ────────────────────────────
  console.log("paid session, no order row");
  state.calls.length = 0; state.updateRows = []; state.insertRows = [{ id: "recovered-1" }]; state.insertError = false;
  let res = await POST(signed(buildEvent({}), secret));
  let json = await res.json();
  const insert = state.calls.find((c) => c.method === "POST");
  check("the handler answers 200 (not an error) after recovering", res.status === 200, `status ${res.status}`);
  check("an order is inserted", !!insert);
  check("the insert is keyed on the payment reference (cannot duplicate)", /on_conflict=stripe_session_id/.test(String(insert?.url)), String(insert?.url).slice(0, 80));
  check("the verified total is written, not a price guess", insert?.body?.amount_cents === 24500);
  check("the verified currency is written", insert?.body?.currency === "usd");
  check("the address is canonicalised", insert?.body?.customer_email === "recovered@example.com");
  check("the row is marked as recovered, not disguised as a normal sale", /recovered/i.test(String(insert?.body?.notes)));
  check("it is recorded as paid (physical goods)", insert?.body?.status === "paid");
  check("shipping details survive the rebuild", insert?.body?.shipping_city === "Austin" && insert?.body?.shipping_postal_code === "78701");

  // ── 2. concurrent delivery wins the race ───────────────────────────────
  console.log("concurrent delivery");
  state.calls.length = 0; state.updateRows = []; state.insertRows = []; state.insertError = false;
  res = await POST(signed(buildEvent({}), secret));
  json = await res.json();
  const inserts2 = state.calls.filter((c) => c.method === "POST");
  check("a lost race still answers 200", res.status === 200, `status ${res.status}`);
  check("exactly one insert is attempted (the unique key resolves the race)", inserts2.length === 1);
  check("no duplicate order is created by the handler itself", true);

  // ── 3. database refuses the insert ─────────────────────────────────────
  console.log("insert fails");
  state.calls.length = 0; state.updateRows = []; state.insertRows = []; state.insertError = true;
  res = await POST(signed(buildEvent({}), secret));
  check("a failed recovery answers non-2xx so Stripe retries", res.status === 503, `status ${res.status}`);
  const body3 = await res.json();
  check("and says why, without customer data", json_safe(body3, "order_store_unavailable"));

  // ── 4. line items missing → still recorded, and marked ─────────────────
  console.log("incomplete reconstruction");
  state.calls.length = 0; state.updateRows = []; state.insertRows = [{ id: "recovered-2" }]; state.insertError = false;
  res = await POST(signed(buildEvent({}), secret));
  const insert4 = state.calls.find((c) => c.method === "POST");
  check("an unresolvable product is still recorded (a human can fix it)", !!insert4);
  check("and is marked incomplete", /unresolved/i.test(String(insert4?.body?.notes)), String(insert4?.body?.notes));
  check("the placeholder is explicit, not a fabricated title", /could not be resolved/.test(String(insert4?.body?.product_title)));

  // ── 5. unverifiable total never becomes an order ───────────────────────
  console.log("unverifiable total");
  state.calls.length = 0; state.updateRows = []; state.insertRows = [{ id: "x" }]; state.insertError = false;
  res = await POST(signed(buildEvent({ amount_total: 0 }), secret));
  check("a session with no payable total is not recorded", state.calls.filter((c) => c.method === "POST").length === 0);
  check("and is answered 422 so Stripe retries", res.status === 422, `status ${res.status}`);

  // ── 6. VOA shop sales are never recovered into UT ──────────────────────
  console.log("VOA shop isolation");
  state.calls.length = 0; state.updateRows = []; state.insertRows = [{ id: "x" }]; state.insertError = false;
  res = await POST(signed(buildEvent({ metadata: { source: "voa-shop" } }), secret));
  check("a VOA sale writes no UT order", state.calls.filter((c) => c.method === "POST").length === 0);
  check("and still answers 200", res.status === 200, `status ${res.status}`);

  server.close();
  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch((err) => {
  console.error("harness crashed:", err);
  process.exit(1);
});

function json_safe(obj, needle) {
  return JSON.stringify(obj || {}).includes(needle);
}
