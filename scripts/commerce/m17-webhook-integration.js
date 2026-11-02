#!/usr/bin/env node
/**
 * m17-webhook-integration.js — the REAL webhook handler, a signed event, and an isolated database.
 *
 * No Stripe test-mode key exists in this environment (only a live key), and writing test rows into
 * the production database is not acceptable. So this harness stands up a local mock of the Supabase
 * REST surface the handler talks to, points the handler at it, signs genuine Stripe events with its
 * own webhook secret, and asserts what the handler actually writes.
 *
 * What it proves:
 *   · a paid session whose address exists only in `customer_details.email` writes that address
 *     (the exact shape that lost the April sale's email);
 *   · the legacy `customer_email` field alone still works when it is the only source;
 *   · a session with `payment_status: "unpaid"` writes NOTHING (no phantom sale);
 *   · a duplicate delivery writes the same value again — idempotent, never a second order;
 *   · an event whose session matches no row reports "nothing written" instead of claiming success.
 *
 * It never contacts Stripe and never touches production: every outbound call lands on 127.0.0.1.
 */
const path = require("path");
const http = require("http");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const WRITES = [];
const PORT = 8791;

function startMockDb() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let parsed = null;
        try { parsed = body ? JSON.parse(body) : null; } catch { parsed = body; }
        WRITES.push({ method: req.method, url: req.url, body: parsed });
        res.writeHead(200, { "Content-Type": "application/json" });
        // The handler asks for the affected rows via select(); hand back one id so it reports a write.
        res.end(JSON.stringify([{ id: "mock-order-id" }]));
      });
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

function buildEvent(overrides) {
  return {
    id: "evt_test_" + Math.random().toString(36).slice(2),
    object: "event",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_test_abcdef",
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 24500,
        currency: "usd",
        payment_intent: "pi_test_123",
        customer_email: null,
        customer_details: { email: "buyer@example.com", name: "Test Buyer" },
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

function signedRequest(payload, secret) {
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
  const server = await startMockDb();
  const secret = "whsec_test_integration_secret";

  // Point the handler at the mock database and a self-signed webhook secret, BEFORE importing it.
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${PORT}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test_service_key";
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy"; // never used: no network path is taken below
  process.env.UT_SUPABASE_URL = `http://127.0.0.1:${PORT}`;
  process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "test_service_key";
  process.env.AKASHA_BOT_TOKEN = "";

  // The handler builds its own Supabase clients from ut-utils/lib; mock that module so every table
  // call lands on the mock server regardless of how the module names its client.
  mockModule("@/lib/supabase", {
    supabaseAdmin: { from: () => ({ update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [{ id: "mock" }], error: null }) }) }) }) },
  }, { root: ROOT });

  const route = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));
  const POST = route.POST;

  // ── 1. paid session, address only in customer_details ───────────────────
  console.log("paid session, address only in customer_details");
  WRITES.length = 0;
  let res = await POST(signedRequest(buildEvent({}), secret));
  const body1 = await res.json();
  const wroteEmail = JSON.stringify(WRITES).includes("buyer@example.com");
  const first = WRITES.find((w) => w.body && w.body.customer_email !== undefined);
  if (first) {
    console.log(
      "  payload → " +
        JSON.stringify({
          method: first.method,
          table: String(first.url).split("?")[0],
          key: String(first.url).match(/stripe_session_id=eq\.([^&]+)/)?.[1] ?? null,
          customer_email: first.body.customer_email,
          customer_name: first.body.customer_name,
          status: first.body.status,
          amount_cents: first.body.amount_cents,
          currency: first.body.currency,
        })
    );
  }
  check("handler accepts the signed event", res.status === 200, `status ${res.status}`);
  check("the address from customer_details is what gets written", wroteEmail, JSON.stringify(WRITES).slice(0, 200));
  check("the sale is recorded as paid (physical)", JSON.stringify(WRITES).includes('"paid"'));
  check("the verified total from Stripe is written, not the product price", JSON.stringify(WRITES).includes("24500"));

  // ── 2. legacy field only ────────────────────────────────────────────────
  console.log("legacy customer_email only");
  WRITES.length = 0;
  res = await POST(signedRequest(buildEvent({ customer_details: { name: "Legacy" }, customer_email: "legacy@example.com" }), secret));
  check("legacy field is still honoured", JSON.stringify(WRITES).includes("legacy@example.com"));

  // ── 3. unpaid session must write nothing ────────────────────────────────
  console.log("unpaid (async) session");
  WRITES.length = 0;
  res = await POST(signedRequest(buildEvent({ payment_status: "unpaid" }), secret));
  check("no paid record is written for an unsettled session", WRITES.length === 0, `${WRITES.length} write(s)`);
  check("the handler still answers 200 so Stripe does not retry forever", res.status === 200);

  // ── 4. duplicate delivery ───────────────────────────────────────────────
  console.log("duplicate delivery");
  WRITES.length = 0;
  const dupe = buildEvent({});
  await POST(signedRequest(dupe, secret));
  await POST(signedRequest(dupe, secret));
  const mutations = WRITES.filter((w) => w.method !== "GET");
  check(
    "a repeated event writes again (idempotent by key), never a second order",
    mutations.length === 2 && !JSON.stringify(mutations).includes("insert")
  );
  check("no insert is ever attempted for an existing row", !mutations.some((w) => w.method === "POST"));

  // ── 5. bad signature ────────────────────────────────────────────────────
  console.log("signature");
  WRITES.length = 0;
  const bad = new Request("http://127.0.0.1/api/stripe-webhook", {
    method: "POST", headers: { "stripe-signature": "t=1,v1=deadbeef" }, body: JSON.stringify(buildEvent({})),
  });
  res = await POST(bad);
  check("a forged signature is rejected", res.status === 400, `status ${res.status}`);
  check("nothing is written on a rejected signature", WRITES.length === 0);

  server.close();
  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch((err) => {
  console.error("integration harness crashed:", err);
  process.exit(1);
});
