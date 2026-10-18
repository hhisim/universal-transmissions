#!/usr/bin/env node
/**
 * batch32-shipping.js
 *
 * THE CONFIRMED SHIPPING POLICY, PROVIDER DESTINATIONS, AND THE PAYPAL LIFECYCLE.
 *
 * Policy (owner-confirmed): physical Codex $30 worldwide except Australia and Asia at $50; the cube
 * $20 worldwide; digital products no shipping and no delivery address; prices unchanged.
 *
 * Everything here runs the SHIPPED route handlers with the providers stubbed. NO LIVE SESSION IS
 * CREATED AND NO PAYMENT IS CAPTURED — Stripe and PayPal are fakes with scripted answers, and the
 * fake counts FINANCIAL CAPTURES separately from CAPTURE REQUESTS so "one capture" can never be a
 * claim about converted errors.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = fs.readFileSync(m.filename, "utf8"); };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".jpeg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

const S = require(path.join(ROOT, "src/data/shipping.ts"));
const D = require(path.join(ROOT, "src/data/destinations.ts"));
const { products } = require(path.join(ROOT, "src/data/products.ts"));

let pass = 0, fail = 0;
const failures = [];
const ok = (c, m) => { if (c) { pass += 1; console.log("    ok   " + m); } else { fail += 1; failures.push(m); console.log("    FAIL " + m); } };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
/* A Response good enough for both fetch callers here: our routes read json(), and supabase-js reads
   text() and the headers as well. A stub missing text() silently made every Supabase write fail. */
const json = (body, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
  headers: { get: () => "application/json", forEach: () => {} },
});
const price = (id) => Math.round(products.find((p) => p.id === id).price * 100);
const params = (s) => new URLSearchParams(String(s));
const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/* The exact predicate that shipped in this batch's first candidate, reproduced verbatim.
   It exists here only so the suite can DEMONSTRATE that the old branch fails these tests. */
function legacyWouldConfirm(httpStatus, body) {
  return httpStatus === 422 || String(body?.details?.[0]?.issue ?? "").includes("ORDER_ALREADY_CAPTURED");
}

/* ── Stripe stub ───────────────────────────────────────────────────────────── */
let calls = [];
function stubStripe() {
  calls = [];
  global.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), body: String(opts.body || "") });
    return json({ url: "https://checkout.stripe.com/stub" });
  };
}

/* ── PayPal + Supabase + Telegram stub ─────────────────────────────────────── */
/**
 * Emulates the orders API with a MUTABLE order, so repeated and concurrent calls behave the way a
 * real provider's do. Counts capture REQUESTS and FINANCIAL CAPTURES separately.
 */
function stubPayPal({ order, captureAvailableOnRead = true } = {}) {
  let current = JSON.parse(JSON.stringify(order));
  const st = { captureRequests: 0, financialCaptures: 0, requestIds: [], reads: 0, tokens: 0, supaReads: 0, supaInserts: [], supaFailWrites: 0, telegrams: 0, rows: new Map(), capturePlan: "succeed", dropFirstResponse: false };
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    const headers = opts.headers || {};
    if (/supabase\.co/.test(u)) {
      if (!opts.method || opts.method === "GET") { st.supaReads += 1; return json([]); }
      if (st.supaFailWrites > 0) {
        st.supaFailWrites -= 1;
        return json({ message: "simulated persistence failure" }, 500);
      }
      /* The table, modelled with its UNIQUE key. An upsert with ignore-duplicates keeps one row and
         reports only what it actually inserted — which is what makes "one logical order" checkable
         rather than a claim about how many requests were made. */
      let payload;
      try { payload = JSON.parse(String(opts.body)); } catch { payload = {}; }
      const rows = Array.isArray(payload) ? payload : [payload];
      const inserted = [];
      for (const row of rows) {
        const key = row.stripe_session_id;
        if (st.rows.has(key)) continue;
        st.rows.set(key, row);
        inserted.push({ id: "row-" + (st.rows.size) });
        st.supaInserts.push(row);
      }
      return json(inserted, 201);
    }
    if (/api\.telegram\.org/.test(u)) { st.telegrams += 1; return json({ ok: true }); }
    if (/oauth2\/token/.test(u)) { st.tokens += 1; return json({ access_token: "STUB-TOKEN" }); }
    if (/\/capture$/.test(u)) {
      st.captureRequests += 1;
      st.requestIds.push(headers["PayPal-Request-Id"] ?? headers["paypal-request-id"] ?? null);
      if (st.dropFirstResponse && st.captureRequests === 1) {
        st.financialCaptures += 1;                       // PayPal DID take the money…
        current.status = "COMPLETED";
        current.purchase_units[0].payments = { captures: [{ id: "CAPTURE-1", status: "COMPLETED", amount: current.purchase_units[0].amount }] };
        throw new Error("socket hang up");               // …and the response never arrived.
      }
      if (st.capturePlan === "declined") return json({ name: "UNPROCESSABLE_ENTITY", message: "The instrument was declined", details: [{ issue: "INSTRUMENT_DECLINED" }] }, 422);
      if (st.capturePlan === "not-approved") return json({ name: "UNPROCESSABLE_ENTITY", message: "Order not approved", details: [{ issue: "ORDER_NOT_APPROVED" }] }, 422);
      if (st.capturePlan === "server-error") return json({ name: "INTERNAL_SERVER_ERROR", message: "PayPal is unavailable", details: [{ issue: "INTERNAL_SERVER_ERROR" }] }, 500);
      if (st.capturePlan === "pending") return json({ status: "PENDING", purchase_units: [{ payments: { captures: [{ id: "CAP-2", status: "PENDING" }] } }] });
      if (st.capturePlan === "already-and-real") {
        // Realistic: PayPal refuses a second capture BECAUSE a completed one is on the order.
        current.purchase_units[0].payments = {
          captures: [{ id: "CAPTURE-1", status: "COMPLETED", amount: current.purchase_units[0].amount }],
        };
        return json({ name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }, 422);
      }
      if (current.status === "COMPLETED") {
        return json({ name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }, 422);
      }
      st.financialCaptures += 1;
      current.status = "COMPLETED";
      current.purchase_units[0].payments = { captures: [{ id: "CAPTURE-1", status: "COMPLETED", amount: current.purchase_units[0].amount }] };
      return json({ status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAPTURE-1", status: "COMPLETED", amount: current.purchase_units[0].amount }] } }], payer: { email_address: "buyer@example.com", name: { given_name: "Test", surname: "Buyer" } } });
    }
    if (/v2\/checkout\/orders\//.test(u)) {
      st.reads += 1;
      const shown = JSON.parse(JSON.stringify(current));
      if (!captureAvailableOnRead && shown.purchase_units[0].payments) delete shown.purchase_units[0].payments;
      return json(shown);
    }
    if (/v2\/checkout\/orders$/.test(u)) return json({ id: "ORDER-1" });
    return json({}, 404);
  };
  return st;
}

function approvedOrder({ productId, priceUsd, country, shippingCents, totalCents, currency = "USD", status = "APPROVED" }) {
  return {
    id: "ORDER-1",
    status,
    purchase_units: [{
      custom_id: productId,
      amount: {
        currency_code: currency,
        value: (totalCents / 100).toFixed(2),
        ...(shippingCents > 0
          ? { breakdown: { item_total: { currency_code: "USD", value: priceUsd.toFixed(2) }, shipping: { currency_code: "USD", value: (shippingCents / 100).toFixed(2) } } }
          : {}),
      },
      ...(country ? { shipping: { address: { country_code: country, address_line_1: "1 Test Street", admin_area_2: "Town", postal_code: "12345" } } } : {}),
    }],
    payer: { email_address: "buyer@example.com", name: { given_name: "Test", surname: "Buyer" } },
  };
}

/* A fresh instance of the handler, so concurrency is exercised across separate module instances. */
function freshCaptureHandler() {
  const target = path.join(ROOT, "src/app/api/paypal/capture-order/route.ts");
  delete require.cache[require.resolve(target)];
  return require(target);
}

(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_stub";
  process.env.PAYPAL_CLIENT_ID = "stub-id";
  process.env.PAYPAL_CLIENT_SECRET = "stub-secret";
  process.env.PAYPAL_MODE = "sandbox";
  process.env.NEXT_PUBLIC_BASE_URL = "https://preview.example";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stub.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-key";
  process.env.AKASHA_BOT_TOKEN = "stub-bot";
  process.env.TELEGRAM_HOME_CHANNEL = "123";

  /* ── 1. the confirmed policy ────────────────────────────────────────────── */
  console.log("\n  1. the confirmed policy");
  {
    ok(S.SHIPPING_POLICY_STATE === "confirmed", '1 the policy state is "confirmed"');
    ok(S.SHIPPING_RATES["codex-physical"].worldwideCents === 3000 && S.SHIPPING_RATES["codex-physical"].australiaAndAsiaCents === 5000, "1 the Codex is $30 worldwide, $50 Australia and Asia");
    ok(S.SHIPPING_RATES["hexahedron-cube"].worldwideCents === 2000 && S.SHIPPING_RATES["hexahedron-cube"].australiaAndAsiaCents === 2000, "1 the cube keeps $20 worldwide, both zones");
    ok(S.OPEN_SHIPPING_QUESTIONS.length === 1 && /New Zealand/.test(S.OPEN_SHIPPING_QUESTIONS[0]), "1 the New Zealand question is recorded rather than assumed");
    for (const p of products) ok(typeof p.price === "number" && p.price > 0, `1 ${p.id} keeps its price ($${p.price})`);
  }

  /* ── 2. the geographic definition ───────────────────────────────────────── */
  console.log("\n  2. what 'Australia and Asia' covers");
  {
    ok(/M49/.test(S.GEOGRAPHIC_DEFINITION.standard), "2 the definition names its standard: UN M49");
    ok(S.AUSTRALIA_AND_ASIA_ISO.includes("AU") && !S.AUSTRALIA_AND_ASIA_ISO.includes("NZ"), "2 Australia in, New Zealand out and documented");
    for (const cc of ["JP", "CN", "SG", "IN", "AE", "TR", "KZ", "MN", "PH"]) ok(S.deliveryZone(cc) === "AUSTRALIA_AND_ASIA", `2 ${cc} is Australia/Asia`);
    for (const cc of ["US", "GB", "DE", "NZ", "BR", "ZA", "FJ"]) ok(S.deliveryZone(cc) === "WORLDWIDE", `2 ${cc} is worldwide`);
    ok(S.deliveryZone("au") === "AUSTRALIA_AND_ASIA" && S.deliveryZone(null) === "WORLDWIDE", "2 case-insensitive, and a missing country falls to worldwide");
  }

  /* ── 3. the totals ──────────────────────────────────────────────────────── */
  console.log("\n  3. the totals");
  {
    ok(S.orderTotalCents("codex-physical", 215, "US") === 24500, "3 Codex elsewhere: $215 + $30 = $245");
    ok(S.orderTotalCents("codex-physical", 215, "GB") === 24500 && S.orderTotalCents("codex-physical", 215, "DE") === 24500, "3 …GB and DE too");
    ok(S.orderTotalCents("codex-physical", 215, "NZ") === 24500, "3 …and NZ, the documented exclusion");
    ok(S.orderTotalCents("codex-physical", 215, "AU") === 26500, "3 Codex Australia: $215 + $50 = $265");
    ok(S.orderTotalCents("codex-physical", 215, "JP") === 26500, "3 Codex Asia (JP): $265");
    ok(S.orderTotalCents("hexahedron-cube", 109, "US") === 12900 && S.orderTotalCents("hexahedron-cube", 109, "AU") === 12900, "3 Cube: $109 + $20 = $129, from the US and from Australia");
    ok(S.orderTotalCents("codex-digital", 99, "US") === 9900 && S.orderTotalCents("codex-digital", 99, "AU") === 9900, "3 Digital Codex: $99, no shipping, whichever country");
  }

  /* ── 4. destinations: the policy is not the provider's contract ─────────── */
  console.log("\n  4. provider destinations");
  {
    /* The contract itself, re-read from the installed SDK, so this cannot drift. */
    const sdk = fs.readFileSync(path.join(ROOT, "node_modules/stripe/types/Checkout/Sessions.d.ts"), "utf8");
    const union = /type AllowedCountry\s*=([\s\S]*?);/.exec(sdk)[1];
    const sdkCodes = [...union.matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]);
    ok(same(sdkCodes, D.STRIPE_ALLOWED_ISO), `4 the Stripe list IS the installed SDK's own enum (${sdkCodes.length} codes)`);
    ok(D.STRIPE_ALLOWED_ISO.length === D.DESTINATION_PROVENANCE.stripe.codes, "4 …and the recorded count matches the list");
    ok(D.PAYPAL_ALLOWED_ISO.length === D.DESTINATION_PROVENANCE.paypal.codes, "4 the PayPal list matches its recorded count");
    ok(new Set(D.PAYPAL_ALLOWED_ISO).size === D.PAYPAL_ALLOWED_ISO.length && new Set(D.STRIPE_ALLOWED_ISO).size === D.STRIPE_ALLOWED_ISO.length, "4 neither list repeats a code");
    ok([...D.STRIPE_ALLOWED_ISO, ...D.PAYPAL_ALLOWED_ISO].every((c) => /^[A-Z]{2}$/.test(c)), "4 every code is two uppercase letters");

    /* The defect: 15 codes were being sent to Stripe that Stripe does not support. */
    const wasSending = ["AS", "CC", "CU", "CX", "FM", "HM", "IR", "KP", "MH", "MP", "NF", "PW", "SY", "UM", "VI"];
    const unsupported = wasSending.filter((c) => !D.STRIPE_ALLOWED_ISO.includes(c));
    ok(unsupported.length === 15, `4 all 15 previously-sent codes are outside Stripe's contract: ${unsupported.join(" ")}`);
    const everSent = ["codex-physical", "hexahedron-cube"].flatMap((id) => ["US", "AU", "JP", "DE"].flatMap((c) => D.allowedDeliveryFor(id, "stripe", c)));
    ok(!everSent.some((c) => unsupported.includes(c)), "4 and NONE of them appears in any allowlist the server now builds");

    /* The allowlist is the provider's contract filtered by the policy's rate. */
    ok(D.allowedDeliveryFor("codex-physical", "stripe", "US").length === 189, "4 a US Codex order allowlists 189 destinations");
    ok(D.allowedDeliveryFor("codex-physical", "stripe", "AU").length === 49, "4 an Australian Codex order allowlists 49");
    ok(!D.allowedDeliveryFor("codex-physical", "stripe", "US").includes("AU"), "4 …the worldwide rate never allows an Australia/Asia address");
    ok(!D.allowedDeliveryFor("codex-physical", "stripe", "AU").includes("US"), "4 …and the Australia/Asia rate never allows a worldwide one");
    ok(D.allowedDeliveryFor("codex-physical", "stripe", "AU").every((c) => D.STRIPE_ALLOWED_ISO.includes(c)), "4 every allowlisted code is one Stripe supports");
    ok(D.allowedDeliveryFor("hexahedron-cube", "stripe", "US").length === 238 && D.allowedDeliveryFor("hexahedron-cube", "stripe", "US").includes("AU"), "4 the cube is unrestricted and may go to Australia from a US declaration");
    ok(D.allowedDeliveryFor("codex-digital", "stripe", "US").length === 0, "4 a digital product has no destinations and no allowlist");
    ok(D.allowedDeliveryFor("codex-physical", "paypal", "US").length === 163 && D.allowedDeliveryFor("codex-physical", "paypal", "AU").length === 37, "4 PayPal's own list is narrower: 163 worldwide, 37 in the zone");

    /* The providers disagree, and the buyer is told which one works. */
    ok(D.isDestinationSupported("codex-physical", "stripe", "CN") === true && D.isDestinationSupported("codex-physical", "paypal", "CN") === false, "4 China: card yes, PayPal no");
    ok(/PayPal cannot deliver to CN/.test(D.unsupportedDestinationMessage("codex-physical", "paypal", "CN")), "4 …and the refusal names the country and the reason");
    ok(/card payment instead/i.test(D.unsupportedDestinationMessage("codex-physical", "paypal", "CN")), "4 …and tells the buyer what to do instead");
    ok(/Neither card payment nor PayPal/.test(D.unsupportedDestinationMessage("codex-physical", "stripe", "IR")), "4 a destination neither provider serves says so plainly");
    ok(D.unsupportedDestinationMessage("codex-physical", "stripe", "US") === null, "4 a supported destination produces no refusal");
    ok(D.offeredDestinations("codex-digital", "stripe").length === 0, "4 a digital product is offered no destinations");
    const groups = D.destinationsByZone("codex-physical", "stripe");
    ok(groups.worldwide.length === 189 && groups.australiaAndAsia.length === 49, "4 the page's groups are exactly the allowlists for each zone");
    ok(groups.worldwide.length + groups.australiaAndAsia.length === D.STRIPE_ALLOWED_ISO.length, "4 …and together they are Stripe's whole supported set");
  }

  /* ── 5. the Stripe session ──────────────────────────────────────────────── */
  console.log("\n  5. the Stripe session");
  {
    stubStripe();
    const route = require(path.join(ROOT, "src/app/api/checkout/route.ts"));
    /* The route also writes the order row, which is a real request under a runtime where
       supabase-js can construct — so the Stripe call is selected by URL, not by position. */
    const stripeCalls = () => calls.filter((c) => /api\.stripe\.com/.test(c.url));
    const lastParams = () => params(stripeCalls()[stripeCalls().length - 1].body);
    const run = async (productId, country) => { calls = []; const res = await route.POST({ json: async () => ({ productId, country }) }); return { status: res.status, body: await res.json(), p: calls.length ? lastParams() : null }; };
    const g = (p, k) => (p ? p.get(k) : null);
    const allowed = (p) => { const out = []; for (let i = 0; p.get(`shipping_address_collection[allowed_countries][${i}]`); i++) out.push(p.get(`shipping_address_collection[allowed_countries][${i}]`)); return out; };

    /* The server decides the rate, ignoring anything the browser sends. */
    calls = [];
    const spoof = await route.POST({ json: async () => ({ productId: "codex-physical", country: "US", shippingCents: 0, totalCents: 21500, amount: 21500 }) });
    ok(spoof.status === 200 && g(params(stripeCalls()[0].body), "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "3000", "5 a client-supplied 0 shipping is ignored — the server charges $30");
    ok(g(params(stripeCalls()[0].body), "line_items[0][price_data][unit_amount]") === "21500", "5 …and a client-supplied total cannot change the item price");

    for (const [country, cents, zoneWords] of [["US", "3000", "Rest of world"], ["GB", "3000", "Rest of world"], ["NZ", "3000", "Rest of world"], ["AU", "5000", "Australia & Asia"], ["JP", "5000", "Australia & Asia"]]) {
      const r = await run("codex-physical", country);
      ok(r.status === 200, `5 Codex to ${country}: session created`);
      ok(g(r.p, "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === cents, `5 …charged $${Number(cents) / 100}`);
      ok(g(r.p, "shipping_options[0][shipping_rate_data][display_name]").includes(zoneWords), `5 …the charge names its zone (${zoneWords})`);
    }

    /* No unsupported code can be sent, whatever the declared country. */
    for (const country of ["US", "AU"]) {
      const r = await run("codex-physical", country);
      ok(allowed(r.p).length > 0 && allowed(r.p).every((c) => D.STRIPE_ALLOWED_ISO.includes(c)), `5 every allowlisted code for a ${country} order is Stripe-supported`);
      ok(!allowed(r.p).some((c) => ["IR", "KP", "SY", "CU", "AS", "CC", "CX", "HM", "UM", "VI"].includes(c)), `5 …and none of the codes Stripe does not support is present`);
    }
    const us = await run("codex-physical", "US");
    ok(!allowed(us.p).includes("AU") && !allowed(us.p).includes("JP"), "5 a $30 order can never take an Australia/Asia address");

    /* An unsupported destination is refused before a session exists. */
    for (const [productId, country, who] of [["codex-physical", "IR", "neither provider"], ["codex-physical", "SY", "neither provider"]]) {
      const r = await run(productId, country);
      ok(r.status === 400, `5 ${country} (${who}) is refused`);
      ok(stripeCalls().length === 0, `5 …before any session is created — no request reached Stripe`);
      ok(/cannot deliver|Neither card payment/.test(r.body.error), "5 …with a message the buyer can act on");
      ok(r.body.code === "UNSUPPORTED_DESTINATION", "5 …and a machine-readable code");
    }
    /* A destination refusal is the buyer's to fix, so it must not be hidden behind a
       configuration error — and a supported destination must still report the missing key. */
    const savedKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    const noKeyBad = await run("codex-physical", "IR");
    ok(noKeyBad.status === 400 && noKeyBad.body.code === "UNSUPPORTED_DESTINATION", "5 an unsupported destination is refused even with Stripe unconfigured");
    const noKeyGood = await run("codex-physical", "US");
    ok(noKeyGood.status === 500 && /not configured/.test(noKeyGood.body.error), "5 …while a supported destination still reports the missing configuration");
    process.env.STRIPE_SECRET_KEY = savedKey;

    const noCountry = await run("codex-physical", "");
    ok(noCountry.status === 400 && noCountry.body.code === "NO_DESTINATION" && stripeCalls().length === 0, "5 a physical order with no destination is refused before any session");

    const cube = await run("hexahedron-cube", "AU");
    ok(g(cube.p, "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "2000", "5 the cube is $20 from Australia");
    ok(allowed(cube.p).includes("AU") && allowed(cube.p).includes("US"), "5 …and its destinations are unrestricted in both directions");

    for (const id of ["codex-digital", "chakra-4k", "chakra-8k"]) {
      const r = await run(id, "AU");
      const keys = r.p ? [...r.p.keys()] : [];
      ok(r.status === 200, `5 ${id}: session created`);
      ok(!keys.some((k) => k.startsWith("shipping_options")), `5 ${id}: NO shipping option`);
      ok(!keys.some((k) => k.startsWith("shipping_address_collection")), `5 ${id}: NO delivery address requested`);
      ok(g(r.p, "line_items[0][price_data][unit_amount]") === String(price(id)), `5 ${id}: the total is the product price`);
    }
  }

  /* ── 6. the PayPal order ────────────────────────────────────────────────── */
  console.log("\n  6. the PayPal order");
  {
    const st = stubPayPal({ order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "US", shippingCents: 3000, totalCents: 24500 }) });
    const create = require(path.join(ROOT, "src/app/api/paypal/create-order/route.ts"));
    const run = async (productId, country) => { const before = st.captureRequests + st.reads; const res = await create.POST({ json: async () => ({ productId, country }) }); const body = await res.json(); const sent = global.__lastOrder; return { status: res.status, body, sent, before }; };
    let lastOrder = null;
    const origFetch = global.fetch;
    global.fetch = async (u, o = {}) => { if (/v2\/checkout\/orders$/.test(String(u))) { try { lastOrder = JSON.parse(String(o.body)); } catch {} } return origFetch(u, o); };
    global.__lastOrder = null;
    const st2 = st;

    for (const [country, total, ship] of [["US", "245.00", "30.00"], ["GB", "245.00", "30.00"], ["NZ", "245.00", "30.00"], ["AU", "265.00", "50.00"], ["JP", "265.00", "50.00"]]) {
      lastOrder = null;
      const r = await run("codex-physical", country);
      ok(r.status === 200, `6 Codex to ${country}: order created`);
      ok(lastOrder.purchase_units[0].amount.value === total, `6 …total $${total}`);
      ok(lastOrder.purchase_units[0].amount.breakdown.shipping.value === ship, `6 …shipping $${ship} on its own line`);
      ok(lastOrder.purchase_units[0].amount.breakdown.item_total.value === "215.00", "6 …item $215.00");
      ok(lastOrder.purchase_units[0].custom_id === "codex-physical", "6 …naming the product for verification at capture");
      ok(r.body.zone === (ship === "50.00" ? "AUSTRALIA_AND_ASIA" : "WORLDWIDE"), "6 …and reporting the zone it priced");
    }

    lastOrder = null;
    await run("codex-physical", "US");
    ok(lastOrder.application_context.shipping_preference === "GET_FROM_FILE", "6 a physical order asks PayPal for the delivery address");
    ok(lastOrder.application_context.return_url === "https://preview.example/sanctum/paypal/return", "6 …and returns to the confirmation route");
    ok(lastOrder.application_context.cancel_url.includes("canceled=true"), "6 …with a cancellation back to the product page");

    lastOrder = null;
    const cube = await run("hexahedron-cube", "AU");
    ok(cube.status === 200 && lastOrder.purchase_units[0].amount.value === "129.00", "6 the cube to Australia: $129.00");
    ok(lastOrder.purchase_units[0].amount.breakdown.shipping.value === "20.00", "6 …shipping $20");

    for (const id of ["codex-digital", "chakra-4k", "chakra-8k"]) {
      lastOrder = null;
      const r = await run(id, "AU");
      ok(r.status === 200 && lastOrder.purchase_units[0].amount.value === (price(id) / 100).toFixed(2), `6 ${id}: the order is the product price alone`);
      ok(lastOrder.purchase_units[0].amount.breakdown === undefined, `6 ${id}: no shipping line exists`);
      ok(lastOrder.application_context.shipping_preference === "NO_SHIPPING", `6 ${id}: shipping is EXPLICITLY suppressed`);
    }

    /* A destination PayPal does not serve never reaches PayPal. */
    for (const country of ["CN", "TR", "PK", "IQ", "LB", "IR", "KP"]) {
      lastOrder = null;
      const before = st.tokens;
      const r = await run("codex-physical", country);
      ok(r.status === 400 && r.body.code === "UNSUPPORTED_DESTINATION", `6 ${country}: refused before an order exists`);
      ok(lastOrder === null, `6 ${country}: no order was sent to PayPal`);
      ok(/cannot deliver|Neither card/.test(r.body.error), `6 ${country}: the refusal explains itself`);
    }
    const savedClient = process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_ID;
    const cnNoCreds = await run("codex-physical", "CN");
    ok(cnNoCreds.status === 400 && cnNoCreds.body.code === "UNSUPPORTED_DESTINATION", "6 an unsupported destination is refused even with PayPal unconfigured");
    const usNoCreds = await run("codex-physical", "US");
    ok(usNoCreds.status === 500 && /not configured/.test(usNoCreds.body.error), "6 …while a supported destination reports the missing configuration");
    process.env.PAYPAL_CLIENT_ID = savedClient;
  }

  /* ── 7. the capture: no manufactured success ────────────────────────────── */
  console.log("\n  7. the PayPal capture");
  {
    const capture = freshCaptureHandler();
    const run = async (orderId = "ORDER-1") => {
      const res = await capture.POST({ json: async () => ({ orderId }) });
      return { status: res.status, body: await res.json() };
    };
    const auOrder = () => approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 });

    /* the success control */
    let st = stubPayPal({ order: auOrder() });
    let r = await run();
    ok(r.status === 200 && r.body.captured === true, "7 a verified order is captured");
    ok(st.financialCaptures === 1 && st.captureRequests === 1, "7 …exactly one financial capture, from one request");
    ok(r.body.captureId === "CAPTURE-1" && r.body.status === "COMPLETED", "7 …reporting PayPal's own capture id and status");
    ok(r.body.totalCents === 26500 && r.body.shippingCents === 5000 && r.body.country === "AU", "7 …with the total, shipping and country");
    ok(st.requestIds[0] === "capture-ORDER-1", "7 …sent under a stable idempotency key");

    /* ordinary provider errors stay failures — the exact thing that was broken */
    for (const [plan, label, code] of [["declined", "a declined instrument", "INSTRUMENT_DECLINED"], ["not-approved", "an unapproved order", "ORDER_NOT_APPROVED"], ["server-error", "a provider outage", "INTERNAL_SERVER_ERROR"]]) {
      st = stubPayPal({ order: auOrder() });
      st.capturePlan = plan;
      r = await run();
      ok(r.status === 502 && !r.body.captured, `7 refused: ${label}`);
      ok(r.body.code === code, `7 …naming PayPal's own issue code (${code})`);
      ok(st.financialCaptures === 0, "7 …and no capture is reported as having happened");

      /* PROOF THE OLD BRANCH FAILS THIS TEST: it returned "confirmed" for exactly this response. */
      const body = plan === "declined"
        ? { details: [{ issue: "INSTRUMENT_DECLINED" }] }
        : plan === "not-approved"
          ? { details: [{ issue: "ORDER_NOT_APPROVED" }] }
          : { details: [{ issue: "INTERNAL_SERVER_ERROR" }] };
      const httpStatus = plan === "server-error" ? 500 : 422;
      ok(legacyWouldConfirm(httpStatus, body) === (httpStatus === 422),
        `7 OLD BRANCH, ${label}: it would ${httpStatus === 422 ? "HAVE confirmed the payment" : "not have confirmed"} — the shipped route refuses it`);
    }
    ok(legacyWouldConfirm(422, { details: [{ issue: "INSTRUMENT_DECLINED" }] }) === true,
      "7 OLD BRANCH proof: any 422 was read as already-captured, so a declined card came back as paid");

    /* already captured — but only confirmed when PayPal's record proves it */
    st = stubPayPal({ order: auOrder() });
    st.capturePlan = "already-and-real";
    r = await run();
    ok(r.status === 200 && r.body.captured === true && r.body.alreadyCaptured === true, "7 already-captured WITH a real capture on the re-read: confirmed");
    ok(r.body.captureId === "CAPTURE-1", "7 …from the re-read, not from the error code");
    ok(st.reads >= 2, "7 …the order was genuinely re-read");

    // An order PayPal already reports as COMPLETED, with the capture on record.
    const completedOrder = () => {
      const o = auOrder();
      o.status = "COMPLETED";
      o.purchase_units[0].payments = { captures: [{ id: "CAPTURE-1", status: "COMPLETED", amount: o.purchase_units[0].amount }] };
      return o;
    };
    st = stubPayPal({ order: completedOrder() });
    r = await run();
    ok(r.status === 200 && r.body.alreadyCaptured === true && st.financialCaptures === 0, "7 an order PayPal already marks COMPLETED is confirmed without a second capture");
    ok(st.captureRequests === 0, "7 …no capture request is sent at all");

    /* THE KEY CASE: ORDER_ALREADY_CAPTURED with nothing to back it up */
    st = stubPayPal({ order: auOrder() });
    st.capturePlan = "already-and-real";
    st.financialCaptures = 0;
    global.fetch = ((orig) => async (u, o = {}) => {
      const res = await orig(u, o);
      if (/v2\/checkout\/orders\//.test(String(u)) && !/\/capture$/.test(String(u))) {
        const body = await res.json();
        delete body.purchase_units[0].payments;               // PayPal claims captured, records nothing
        return json(body);
      }
      return res;
    })(global.fetch);
    r = await run();
    ok(r.status === 409 && !r.body.captured, "7 already-captured with NO capture recorded: NOT confirmed");
    ok(r.body.code === "CAPTURE_NOT_CONFIRMED", "7 …and reported as unconfirmed rather than as a payment");

    st = stubPayPal({ order: auOrder() });
    st.capturePlan = "already-and-real";
    global.fetch = ((orig) => async (u, o = {}) => {
      const res = await orig(u, o);
      if (/v2\/checkout\/orders\//.test(String(u)) && !/\/capture$/.test(String(u))) {
        const body = await res.json();
        body.purchase_units[0].payments = { captures: [{ id: "CAPTURE-1", status: "PENDING", amount: body.purchase_units[0].amount }] };
        return json(body);
      }
      return res;
    })(global.fetch);
    r = await run();
    ok(r.status === 409 && !r.body.captured, "7 already-captured but the capture is only PENDING: NOT confirmed");

    st = stubPayPal({ order: auOrder() });
    st.capturePlan = "already-and-real";
    global.fetch = ((orig) => async (u, o = {}) => {
      const res = await orig(u, o);
      if (/v2\/checkout\/orders\//.test(String(u)) && !/\/capture$/.test(String(u))) {
        const body = await res.json();
        body.purchase_units[0].payments = { captures: [{ id: "CAPTURE-1", status: "COMPLETED", amount: { currency_code: "USD", value: "30.00" } }] };
        return json(body);
      }
      return res;
    })(global.fetch);
    r = await run();
    ok(r.status === 409 && !r.body.captured, "7 already-captured but the capture is for the WRONG AMOUNT: NOT confirmed");

    /* pending / failed captures are never paid */
    st = stubPayPal({ order: auOrder() });
    st.capturePlan = "pending";
    r = await run();
    ok(r.status === 502 && !r.body.captured, "7 a capture that returns PENDING is not reported as paid");

    /* verification before capture, unchanged */
    for (const [label, order, code] of [
      ["a total below the policy", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 3000, totalCents: 24500 }), "TOTAL_MISMATCH"],
      ["a $30 order shipped to Australia", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 3000, totalCents: 24500 }), "TOTAL_MISMATCH"],
      ["a physical order with no country", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: null, shippingCents: 0, totalCents: 21500 }), "NO_DELIVERY_COUNTRY"],
      ["a non-USD order", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "US", shippingCents: 3000, totalCents: 24500, currency: "EUR" }), "CURRENCY_MISMATCH"],
    ]) {
      st = stubPayPal({ order });
      r = await run();
      ok(r.status === 409 && r.body.code === code, `7 refused: ${label}`);
      ok(st.captureRequests === 0 && st.financialCaptures === 0, "7 …no capture request was even sent");
    }
  }

  /* ── 8. retries and concurrency ─────────────────────────────────────────── */
  console.log("\n  8. retries, concurrency and lost responses");
  {
    const auOrder = () => approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 });

    /* a lost response: PayPal took the money, the answer never arrived, the buyer returns */
    let st = stubPayPal({ order: auOrder() });
    st.dropFirstResponse = true;
    const capture = freshCaptureHandler();
    let first;
    try { first = await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) }); } catch (e) { first = { status: 500, json: async () => ({ error: String(e.message) }) }; }
    const firstBody = await first.json();
    ok(!firstBody.captured, "8 first attempt, response lost: nothing is confirmed to the buyer");
    ok(st.financialCaptures === 1, "8 …although PayPal DID take one payment");
    const second = await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) });
    const secondBody = await second.json();
    ok(secondBody.captured === true && secondBody.captureId === "CAPTURE-1", "8 the retry confirms the same capture");
    ok(st.financialCaptures === 1, "8 …and NO second payment was taken");
    ok(st.requestIds[0] === "capture-ORDER-1", "8 …the first attempt used the stable idempotency key");
    ok(st.captureRequests === 1, "8 …and the retry needed no second capture request: it resolved by reading the order, which is safer still");

    /* A retry that genuinely has to RE-ATTEMPT the capture must reuse the same key. */
    st = stubPayPal({ order: auOrder() });
    st.capturePlan = "server-error";
    const outage = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(!outage.captured, "8 a provider outage confirms nothing");
    st.capturePlan = "succeed";
    const recovered = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(recovered.captured === true, "8 …the retry then captures successfully");
    ok(st.captureRequests === 2 && st.requestIds[0] === "capture-ORDER-1" && st.requestIds[1] === "capture-ORDER-1",
      "8 …and it re-attempted the capture under the SAME idempotency key");
    ok(st.financialCaptures === 1, "8 …still taking the money exactly once");

    /* concurrency, across separate handler instances */
    st = stubPayPal({ order: auOrder() });
    const h1 = freshCaptureHandler();
    const h2 = freshCaptureHandler();
    ok(h1 !== h2, "8 two genuinely separate handler instances were loaded");
    const [r1, r2, r3] = await Promise.all([
      h1.POST({ json: async () => ({ orderId: "ORDER-1" }) }).then(async (x) => ({ s: x.status, b: await x.json() })),
      h2.POST({ json: async () => ({ orderId: "ORDER-1" }) }).then(async (x) => ({ s: x.status, b: await x.json() })),
      h2.POST({ json: async () => ({ orderId: "ORDER-1" }) }).then(async (x) => ({ s: x.status, b: await x.json() })),
    ]);
    const all = [r1, r2, r3];
    ok(all.every((x) => x.b.captured === true), "8 three simultaneous returns all report the payment as confirmed");
    ok(st.financialCaptures === 1, `8 …with exactly ONE financial capture between them (requests: ${st.captureRequests}, captures: ${st.financialCaptures})`);
    ok(new Set(all.map((x) => x.b.captureId)).size === 1 && all[0].b.captureId === "CAPTURE-1", "8 …and all three name the same capture id");
    ok(st.requestIds.every((k) => k === "capture-ORDER-1"), "8 …all under the same idempotency key");

    /* a repeat visit much later */
    const again = await h2.POST({ json: async () => ({ orderId: "ORDER-1" }) });
    const againBody = await again.json();
    ok(againBody.captured === true && againBody.alreadyCaptured === true, "8 a later repeat visit is confirmed as already captured");
    ok(st.financialCaptures === 1, "8 …still one financial capture");
  }

  /* ── 9. post-payment handling ───────────────────────────────────────────── */
  console.log("\n  9. after the money: the order and the studio");
  {
    const auOrder = () => approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 });
    const capture = freshCaptureHandler();

    let st = stubPayPal({ order: auOrder() });
    let res = await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) });
    let body = await res.json();
    ok(body.orderRecorded === true, "9 the confirmed order IS written to ut_orders");
    ok(st.supaInserts.length === 1, "9 …one row, in one insert");
    const row = st.supaInserts[0];
    ok(row.stripe_session_id === "paypal:ORDER-1", "9 …keyed by a PayPal-marked payment reference, never mistaken for a Stripe session");
    ok(row.status === "paid", "9 …status paid for a physical order (the mapping the Stripe webhook uses)");
    ok(row.amount_cents === 26500, "9 …carrying the total that was actually charged");
    ok(row.shipping_country === "AU" && row.is_digital === false, "9 …with the delivery country and the physical flag");
    ok(row.stripe_payment_intent_id === "CAPTURE-1", "9 …and the capture id as the payment reference");
    ok(row.customer_email === "buyer@example.com", "9 …and the payer's email");
    ok(st.telegrams === 1, "9 the studio is notified — the same mechanism the Stripe webhook uses");
    ok(body.studioNotified === true, "9 …and the page is told so");

    /* digital lands fulfilled */
    st = stubPayPal({ order: approvedOrder({ productId: "codex-digital", priceUsd: 99, country: null, shippingCents: 0, totalCents: 9900 }) });
    res = await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) });
    body = await res.json();
    ok(body.captured === true && st.supaInserts[0].status === "paid", "9 a digital order records as PAID — nothing has delivered the file, so fulfilled would be a claim that is not true");
    ok(st.supaInserts[0].status !== "fulfilled", "9 …and never 'fulfilled', which is reserved for a delivery that actually happened");
    ok(st.supaInserts[0].shipping_country === null && st.supaInserts[0].is_digital === true, "9 …and no delivery address is invented for it");

    /* a repeat cannot write a second row, and does not alert twice */
    st = stubPayPal({ order: auOrder() });
    res = await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) });
    body = await res.json();
    ok(body.orderRecorded === true && body.orderAlreadyRecorded === false, "9 the first confirmation creates the order");
    ok(st.telegrams === 1, "9 …and alerts the studio once");
    res = await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) });
    body = await res.json();
    ok(body.orderRecorded === true && body.orderAlreadyRecorded === true, "9 a repeat visit reports the order already recorded");
    ok(st.rows.size === 1, "9 …and the table still holds exactly one row");
    ok(st.telegrams === 1, "9 …and no second studio alert is sent");
    ok(body.studioNotified === true, "9 …while still telling the buyer the studio was notified");

    /* concurrent returns must produce ONE logical order, not one row per return */
    st = stubPayPal({ order: auOrder() });
    const hc1 = freshCaptureHandler();
    const hc2 = freshCaptureHandler();
    await Promise.all([
      hc1.POST({ json: async () => ({ orderId: "ORDER-1" }) }),
      hc2.POST({ json: async () => ({ orderId: "ORDER-1" }) }),
      hc1.POST({ json: async () => ({ orderId: "ORDER-1" }) }),
    ]);
    ok(st.rows.size === 1, `9 three concurrent returns produced exactly ONE order row (table holds ${st.rows.size})`);
    ok(st.supaInserts.length === 1, "9 …one row was actually created, the other returns were ignored by the unique key");
    ok(st.financialCaptures === 1, "9 …and exactly one financial capture");
    ok(st.telegrams === 1, "9 …and one studio notification");

    /* a persistence failure must stay visible, and be retryable without taking money again */
    st = stubPayPal({ order: auOrder() });
    st.supaFailWrites = 1;
    let resFail = await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) });
    let bodyFail = await resFail.json();
    ok(bodyFail.captured === true && bodyFail.orderRecorded === false, "9 a failed write still confirms the payment but reports the order as NOT recorded");
    ok(typeof bodyFail.recordingDetail === "string" && bodyFail.recordingDetail.length > 0, "9 …with the reason visible rather than swallowed");
    ok(bodyFail.studioNotified === true, "9 …and the studio is told anyway, because the money was taken");
    ok(st.financialCaptures === 1, "9 …without taking a second payment");

    let resRetry = await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) });
    let bodyRetry = await resRetry.json();
    ok(bodyRetry.captured === true && bodyRetry.orderRecorded === true, "9 the retry then records the order");
    ok(st.financialCaptures === 1, "9 …and still does not recapture the payment");
    ok(st.supaInserts.length === 1, "9 …writing the row exactly once");

    /* the page claims only what ran */
    const returnPage = read("src/app/sanctum/paypal/return/page.tsx");
    ok(!/receipt has been sent|receipt will be sent|emailed receipt/i.test(returnPage), "9 the return page no longer promises a receipt email");
    const successPage = read("src/app/sanctum/success/page.tsx");
    ok(!/receipt has been sent/i.test(successPage), "9 …and neither does the Stripe success page");
    ok(/orderRecorded/.test(returnPage) && /studioNotified/.test(returnPage), "9 …it reports whether the order was recorded and the studio told");
    ok(/contact the studio/i.test(returnPage), "9 …and tells the buyer what to do if it was not");
    const webhook = read("src/app/api/stripe-webhook/route.ts");
    ok(!/resend|sendgrid|postmark|nodemailer/i.test(webhook), "9 confirming: no buyer-receipt mechanism exists in the Stripe path either");
    ok(/sendTelegram/.test(webhook), "9 …the existing post-payment mechanism is the order row plus a Telegram alert, which the PayPal path now reuses");
    ok(st.telegrams >= 1, "9 the studio notification is MOCKED here — it reached the stubbed bot endpoint, not a real one");
    ok(!/"fulfilled"/.test(read("src/lib/order-recording.ts")), "9 the recorder never writes the status 'fulfilled' at all");
  }

  /* ── 10. the pages ──────────────────────────────────────────────────────── */
  console.log("\n  10. the pages");
  {
    const page = read("src/app/sanctum/[slug]/page.tsx");
    ok(/shippingNote\(p\.id\)/.test(page), "10 the product page prints the policy's sentence");
    ok(/delivery-country/.test(page) && /Choose a delivery country/.test(page), "10 …and asks for a delivery country");
    ok(/destinationsByZone\(p\.id, provider\)/.test(page), "10 …offering the selected PROVIDER's destinations");
    ok(/chooseProvider/.test(page) && /setProviderNotice/.test(page), "10 …and explaining when a provider change invalidates the country");
    ok(/unsupportedDestinationMessage/.test(page) && /destinationProblem/.test(page), "10 …refusing an unsupported destination before checkout");
    ok(/requiresShipping\(p\.id\)/.test(page) && /country: ships \? country : undefined/.test(page), "10 …and sending a country only for a product that ships");
    ok(!/\$30 worldwide \(AU\/Asia \$50\)/.test(page), "10 no rate is typed into the page");
    ok(!/SHIPPABLE_ISO/.test(page), "10 …and the geographic list is no longer used as if it were a provider contract");
    const ret = read("src/app/sanctum/paypal/return/page.tsx");
    ok(/capture-order/.test(ret) && /data\.captured/.test(ret), "10 the return page confirms only what the server confirms");
    ok(/asked\.current/.test(ret), "10 …attempting the capture once per visit");
  }

  /* ── 11. the gap in this evidence ───────────────────────────────────────── */
  console.log("\n  11. the gap in this evidence");
  {
    ok(true, "11 COMPLETED-PAYMENT GAP: this project holds no PayPal SANDBOX credentials, so no real sandbox payment was completed");
    ok(true, "11 …the lifecycle above runs the shipped handlers against a scripted PayPal, and no live payment was captured");
    ok(process.env.PAYPAL_MODE !== "production", "11 …and PAYPAL_MODE stayed on the sandbox throughout");
  }

  console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
  if (fail) { console.log("\n  failures:"); failures.forEach((f) => console.log("   - " + f)); }
  process.exit(fail ? 1 : 0);
})();
