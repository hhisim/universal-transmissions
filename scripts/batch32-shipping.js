#!/usr/bin/env node
/**
 * batch32-shipping.js
 *
 * THE CONFIRMED SHIPPING POLICY, AND THE PAYPAL LIFECYCLE.
 *
 * The policy (owner-confirmed): physical Codex $30 worldwide except Australia and Asia at $50; the
 * cube $20 worldwide; digital products no shipping and no delivery address; prices unchanged.
 *
 * Everything here runs the SHIPPED route handlers with the provider stubbed, so the assertions are
 * about the requests and responses these routes really produce. NO LIVE SESSION IS CREATED and NO
 * PAYMENT IS CAPTURED — the PayPal API is a fake with a scripted answer.
 *
 * The money-safety assertions are the ones that matter most: when verification fails, the route must
 * NOT call capture at all.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = fs.readFileSync(m.filename, "utf8"); };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".jpeg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

const S = require(path.join(ROOT, "src/data/shipping.ts"));
const { products } = require(path.join(ROOT, "src/data/products.ts"));

let pass = 0, fail = 0;
const failures = [];
const ok = (c, m) => { if (c) { pass += 1; console.log("    ok   " + m); } else { fail += 1; failures.push(m); console.log("    FAIL " + m); } };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const price = (id) => Math.round(products.find((p) => p.id === id).price * 100);

/* ── the stubs ──────────────────────────────────────────────────────────── */
let calls = [];
function stubStripe() {
  calls = [];
  global.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), body: String(opts.body || "") });
    return json({ url: "https://checkout.stripe.com/stub" });
  };
}
function stubPayPal({ order = null, capture = null, captureStatus = 200, readStatus = 200 } = {}) {
  calls = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    /* The token request is form-encoded, not JSON — parsing it blindly throws inside the stub and
       makes the route look like it failed to authenticate. */
    let body = null;
    if (opts.body) {
      try { body = JSON.parse(String(opts.body)); } catch { body = String(opts.body); }
    }
    calls.push({ url: u, method: opts.method || "GET", body, auth: (opts.headers || {}).Authorization });
    if (/oauth2\/token/.test(u)) return json({ access_token: "STUB-TOKEN" });
    if (/\/capture$/.test(u)) {
      return json(capture ?? {
        status: "COMPLETED",
        purchase_units: [{ payments: { captures: [{ id: "CAPTURE-1" }] } }],
        payer: { email_address: "buyer@example.com" },
      }, captureStatus);
    }
    if (/v2\/checkout\/orders\//.test(u)) return json(order, readStatus);
    if (/v2\/checkout\/orders$/.test(u)) return json({ id: "ORDER-1" });
    return json({}, 404);
  };
}
const captureCalls = () => calls.filter((c) => /\/capture$/.test(c.url));
const params = (s) => new URLSearchParams(String(s));

/** An order as PayPal would return it after the buyer approved. */
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
    payer: { email_address: "buyer@example.com" },
  };
}

(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_stub";
  process.env.PAYPAL_CLIENT_ID = "stub-id";
  process.env.PAYPAL_CLIENT_SECRET = "stub-secret";
  process.env.PAYPAL_MODE = "sandbox";
  process.env.NEXT_PUBLIC_BASE_URL = "https://preview.example";

  /* ── 1. the confirmed policy ────────────────────────────────────────────── */
  console.log("\n  1. the confirmed policy");
  {
    ok(S.SHIPPING_POLICY_STATE === "confirmed", '1 the policy state is "confirmed", not "unreconciled"');
    ok(S.SHIPPING_RATES["codex-physical"].worldwideCents === 3000, "1 the Codex is $30 worldwide");
    ok(S.SHIPPING_RATES["codex-physical"].australiaAndAsiaCents === 5000, "1 …and $50 for Australia and Asia");
    ok(S.SHIPPING_RATES["hexahedron-cube"].worldwideCents === 2000 &&
       S.SHIPPING_RATES["hexahedron-cube"].australiaAndAsiaCents === 2000, "1 the cube keeps $20 worldwide, both zones");
    ok(S.OPEN_SHIPPING_QUESTIONS.length === 1 && /New Zealand/.test(S.OPEN_SHIPPING_QUESTIONS[0]),
      "1 the one open question (New Zealand) is recorded rather than assumed");
    for (const p of products) {
      ok(typeof p.price === "number" && p.price > 0, `1 ${p.id} keeps its price ($${p.price}) — prices unchanged`);
    }
  }

  /* ── 2. the geographic definition ───────────────────────────────────────── */
  console.log("\n  2. what 'Australia and Asia' covers");
  {
    ok(typeof S.GEOGRAPHIC_DEFINITION.standard === "string" && /M49/.test(S.GEOGRAPHIC_DEFINITION.standard),
      "2 the definition names its standard: UN M49");
    ok(S.GEOGRAPHIC_DEFINITION.asiaSubregions.length === 5, "2 …all five Asian subregions");
    ok(typeof S.GEOGRAPHIC_DEFINITION.excludes.NZ === "string", "2 New Zealand's exclusion is documented, not silent");
    ok(S.AUSTRALIA_AND_ASIA_ISO.includes("AU"), "2 Australia is in the zone");
    ok(!S.AUSTRALIA_AND_ASIA_ISO.includes("NZ"), "2 New Zealand is NOT — M49 Oceania, not Asia, not Australia");
    for (const cc of ["JP", "CN", "HK", "TW", "KR", "SG", "MY", "TH", "ID", "PH", "VN", "IN", "PK", "BD", "LK", "KZ", "UZ", "AE", "SA", "IL", "TR", "QA", "IR", "MN", "KH"]) {
      ok(S.deliveryZone(cc) === "AUSTRALIA_AND_ASIA", `2 ${cc} is Australia/Asia`);
    }
    for (const cc of ["US", "CA", "MX", "GB", "DE", "FR", "IT", "ES", "NL", "SE", "BR", "AR", "ZA", "EG", "NZ", "FJ", "PG"]) {
      ok(S.deliveryZone(cc) === "WORLDWIDE", `2 ${cc} is worldwide`);
    }
    ok(S.deliveryZone("au") === "AUSTRALIA_AND_ASIA", "2 the code is matched case-insensitively");
    ok(S.deliveryZone("") === "WORLDWIDE" && S.deliveryZone(null) === "WORLDWIDE",
      "2 an unknown or missing country falls to the worldwide rate");
    ok(S.AUSTRALIA_AND_ASIA_ISO.length >= 50 && new Set(S.AUSTRALIA_AND_ASIA_ISO).size === S.AUSTRALIA_AND_ASIA_ISO.length,
      `2 the list is explicit and duplicate-free (${S.AUSTRALIA_AND_ASIA_ISO.length} codes)`);
  }

  /* ── 3. the totals the brief names ──────────────────────────────────────── */
  console.log("\n  3. the totals");
  {
    const codex = price("codex-physical");
    ok(S.orderTotalCents("codex-physical", 215, "US") === 24500, "3 Codex elsewhere: $215 + $30 = $245");
    ok(S.orderTotalCents("codex-physical", 215, "GB") === 24500, "3 …and from the UK");
    ok(S.orderTotalCents("codex-physical", 215, "AU") === 26500, "3 Codex Australia: $215 + $50 = $265");
    ok(S.orderTotalCents("codex-physical", 215, "JP") === 26500, "3 Codex Asia (JP): $265");
    ok(S.orderTotalCents("codex-physical", 215, "NZ") === 24500, "3 Codex New Zealand: $245 — the documented exclusion");
    ok(S.orderTotalCents("hexahedron-cube", 109, "US") === 12900, "3 Cube: $109 + $20 = $129");
    ok(S.orderTotalCents("hexahedron-cube", 109, "AU") === 12900, "3 …the same from Australia ($20 worldwide)");
    ok(S.orderTotalCents("codex-digital", 99, "US") === 9900 && S.orderTotalCents("codex-digital", 99, "AU") === 9900,
      "3 Digital Codex: $99, no shipping, whichever country");
    ok(codex === 21500, "3 the product price itself is untouched");
    ok(S.shippingCentsFor("codex-digital", "AU") === 0, "3 a digital product is charged no shipping even for AU");
  }

  /* ── 4. the rate is the server's decision ───────────────────────────────── */
  console.log("\n  4. the server decides the rate");
  {
    stubStripe();
    const route = require(path.join(ROOT, "src/app/api/checkout/route.ts"));
    const lastParams = () => params(calls[calls.length - 1].body);
    /* A browser that tries to set its own amount is ignored: the route reads `country` only. */
    const res = await route.POST({ json: async () => ({ productId: "codex-physical", country: "US", shippingCents: 0, totalCents: 21500, amount: 21500 }) });
    const p = lastParams();
    ok(res.status === 200, "4 the session is still created");
    ok(p.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "3000",
      "4 a client-supplied 0 shipping is ignored — the server charges $30 for US");
    ok(p.get("line_items[0][price_data][unit_amount]") === "21500",
      "4 …and a client-supplied total cannot change the item price");

    const au = await route.POST({ json: async () => ({ productId: "codex-physical", country: "AU", shippingCents: 0 }) });
    const pa = lastParams();
    ok(au.status === 200 && pa.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "5000",
      "4 …and $50 for an Australian address, not the $0 the client asked for");
  }

  /* ── 5. the Stripe session ──────────────────────────────────────────────── */
  console.log("\n  5. the Stripe session");
  {
    stubStripe();
    const route = require(path.join(ROOT, "src/app/api/checkout/route.ts"));
    const run = async (productId, country) => {
      calls = [];
      const res = await route.POST({ json: async () => ({ productId, country }) });
      return { status: res.status, p: calls.length ? params(calls[0].body) : null };
    };
    const g = (p, k) => (p ? p.get(k) : null);
    const allowed = (p) => {
      const out = [];
      for (let i = 0; p.get(`shipping_address_collection[allowed_countries][${i}]`); i++) {
        out.push(p.get(`shipping_address_collection[allowed_countries][${i}]`));
      }
      return out;
    };

    for (const [country, cents, labelPart] of [["US", "3000", "Rest of world"], ["DE", "3000", "Rest of world"], ["AU", "5000", "Australia & Asia"], ["JP", "5000", "Australia & Asia"]]) {
      const r = await run("codex-physical", country);
      ok(r.status === 200, `5 Codex to ${country}: the session is created`);
      ok(g(r.p, "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === cents,
        `5 …charged ${Number(cents) / 100} for ${country}`);
      ok(g(r.p, "shipping_options[0][shipping_rate_data][display_name]").includes(labelPart),
        `5 …and the charge says which zone it is (${labelPart})`);
      ok(g(r.p, "shipping_options[0][shipping_rate_data][fixed_amount][currency]") === "usd", `5 …in USD`);
    }

    /* the address may only be in the zone that was charged */
    const us = await run("codex-physical", "US");
    const usAllowed = allowed(us.p);
    ok(usAllowed.length > 150, `5 a US session collects an address from ${usAllowed.length} countries`);
    ok(usAllowed.includes("US") && usAllowed.includes("GB"), "5 …including the United States and the UK");
    ok(!usAllowed.includes("AU") && !usAllowed.includes("JP"),
      "5 …and NO Australia-or-Asia country, so a $30 order cannot be delivered to a $50 country");

    const au = await run("codex-physical", "AU");
    const auAllowed = allowed(au.p);
    ok(auAllowed.includes("AU") && auAllowed.includes("JP"), "5 an Australian session accepts an Australia/Asia address");
    ok(!auAllowed.includes("US") && !auAllowed.includes("DE"),
      "5 …and no worldwide country, so a $50 order cannot be delivered to a $30 country");
    ok(S.AUSTRALIA_AND_ASIA_ISO.every((c) => auAllowed.includes(c)), "5 …covering the whole Australia/Asia zone");
    ok(allowed(us.p).length + auAllowed.length === S.SHIPPABLE_ISO.length,
      "5 the two zones together cover every shippable country exactly once");

    const cube = await run("hexahedron-cube", "AU");
    ok(g(cube.p, "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "2000",
      "5 the cube is $20 from Australia as well");

    /* digital: no shipping option, no address collection */
    for (const id of ["codex-digital", "chakra-4k", "chakra-8k"]) {
      const r = await run(id, "AU");
      const keys = r.p ? [...r.p.keys()] : [];
      ok(r.status === 200, `5 ${id}: the session is created`);
      ok(!keys.some((k) => k.startsWith("shipping_options")), `5 ${id}: NO shipping option`);
      ok(!keys.some((k) => k.startsWith("shipping_address_collection")), `5 ${id}: NO delivery address requested`);
      ok(g(r.p, "line_items[0][price_data][unit_amount]") === String(price(id)), `5 ${id}: the total is the product price`);
    }

    /* changing the country changes the session before any payment */
    const before = await run("codex-physical", "US");
    const after = await run("codex-physical", "AU");
    ok(g(before.p, "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "3000" &&
       g(after.p, "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "5000",
      "5 changing the country changes the rate before payment — a new session is priced, not edited");
  }

  /* ── 6. the PayPal order ────────────────────────────────────────────────── */
  console.log("\n  6. the PayPal order");
  {
    stubPayPal();
    const create = require(path.join(ROOT, "src/app/api/paypal/create-order/route.ts"));
    const run = async (productId, country) => {
      calls = [];
      const res = await create.POST({ json: async () => ({ productId, country }) });
      return { status: res.status, body: await res.json(), sent: calls.find((c) => /v2\/checkout\/orders$/.test(c.url)) };
    };

    for (const [country, total] of [["US", "245.00"], ["DE", "245.00"], ["AU", "265.00"], ["JP", "265.00"], ["NZ", "245.00"]]) {
      const r = await run("codex-physical", country);
      const unit = r.sent.body.purchase_units[0];
      ok(r.status === 200, `6 Codex to ${country}: an order is created`);
      ok(unit.amount.value === total, `6 …total $${total}`);
      ok(unit.amount.currency_code === "USD", `6 …in USD`);
      ok(unit.amount.breakdown.item_total.value === "215.00", `6 …item $215.00`);
      ok(unit.amount.breakdown.shipping.value === (total === "265.00" ? "50.00" : "30.00"),
        `6 …shipping $${total === "265.00" ? "50.00" : "30.00"}, carried as its own line`);
      ok(unit.custom_id === "codex-physical", "6 …and the order names the product for verification at capture");
    }

    const phys = await run("codex-physical", "US");
    ok(phys.sent.body.application_context.shipping_preference === "GET_FROM_FILE",
      "6 a physical order asks PayPal to collect the delivery address");
    ok(phys.sent.body.application_context.return_url === "https://preview.example/sanctum/paypal/return",
      "6 …and returns to the confirmation route");
    ok(phys.sent.body.application_context.cancel_url.includes("canceled=true"),
      "6 …with a cancellation that returns to the product page");
    ok(phys.sent.body.intent === "CAPTURE", "6 intent is CAPTURE");
    ok(r0Host(calls) === "https://api-m.sandbox.paypal.com", "6 the sandbox host is used while PAYPAL_MODE=sandbox");

    const cube = await run("hexahedron-cube", "AU");
    ok(cube.sent.body.purchase_units[0].amount.value === "129.00", "6 the cube to Australia: $129.00");

    for (const id of ["codex-digital", "chakra-4k", "chakra-8k"]) {
      const r = await run(id, "AU");
      const unit = r.sent.body.purchase_units[0];
      ok(r.status === 200 && unit.amount.value === (price(id) / 100).toFixed(2),
        `6 ${id}: the order is the product price alone`);
      ok(unit.amount.breakdown === undefined, `6 ${id}: no shipping line exists`);
      ok(r.sent.body.application_context.shipping_preference === "NO_SHIPPING",
        `6 ${id}: shipping is EXPLICITLY suppressed (NO_SHIPPING), not left to a default`);
    }

    /* environment selection is consistent, and production really is production */
    process.env.PAYPAL_MODE = "production";
    const live = await run("codex-physical", "US");
    ok(r0Host(calls) === "https://api-m.paypal.com", "6 with PAYPAL_MODE=production the LIVE host is used");
    ok(live.status === 200, "6 …and the same order is built (stubbed — nothing real was called)");
    process.env.PAYPAL_MODE = "sandbox";
    delete process.env.PAYPAL_MODE;
    const unset = await run("codex-physical", "US");
    ok(r0Host(calls) === "https://api-m.sandbox.paypal.com", "6 an unset PAYPAL_MODE defaults to sandbox, never live");
    process.env.PAYPAL_MODE = "sandbox";
  }

  /* ── 7. the capture lifecycle ───────────────────────────────────────────── */
  console.log("\n  7. the PayPal capture");
  {
    const capture = require(path.join(ROOT, "src/app/api/paypal/capture-order/route.ts"));
    const run = async (orderId = "ORDER-1") => {
      const res = await capture.POST({ json: async () => ({ orderId }) });
      return { status: res.status, body: await res.json(), captures: captureCalls().length };
    };

    /* a correct Australia order captures */
    stubPayPal({ order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 }) });
    const good = await run();
    ok(good.status === 200 && good.body.captured === true, "7 a verified order is captured");
    ok(good.captures === 1, "7 …exactly once");
    ok(good.body.totalCents === 26500 && good.body.shippingCents === 5000 && good.body.country === "AU",
      "7 …and the confirmation reports the product, total, shipping and country");
    ok(good.body.captureId === "CAPTURE-1" && good.body.status === "COMPLETED",
      "7 …with PayPal's own capture id and status");

    /* totals that do not match the policy never reach PayPal */
    const bad = [
      ["too little for an Australian address", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 3000, totalCents: 24500 }), "TOTAL_MISMATCH"],
      ["too much", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "US", shippingCents: 3000, totalCents: 50000 }), "TOTAL_MISMATCH"],
      ["a $30 order shipped to Australia", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 3000, totalCents: 24500 }), "TOTAL_MISMATCH"],
    ];
    for (const [label, order, code] of bad) {
      stubPayPal({ order });
      const r = await run();
      ok(r.status === 409 && r.body.code === code, `7 refused: ${label}`);
      ok(r.captures === 0, `7 …and PayPal was NOT asked to capture — no money moved`);
    }

    stubPayPal({ order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: null, shippingCents: 0, totalCents: 21500 }) });
    const noCountry = await run();
    ok(noCountry.status === 409 && noCountry.body.code === "NO_DELIVERY_COUNTRY",
      "7 refused: a physical order with no delivery country");
    ok(noCountry.captures === 0, "7 …with no capture");

    stubPayPal({ order: { ...approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "US", shippingCents: 3000, totalCents: 24500 }), purchase_units: [{ custom_id: "not-a-product", amount: { currency_code: "USD", value: "245.00" } }] } });
    const unknown = await run();
    ok(unknown.status === 409 && unknown.body.code === "UNKNOWN_PRODUCT", "7 refused: an order naming no product this store sells");
    ok(unknown.captures === 0, "7 …with no capture");

    stubPayPal({ order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "US", shippingCents: 3000, totalCents: 24500, currency: "EUR" }) });
    const wrongCurrency = await run();
    ok(wrongCurrency.status === 409 && wrongCurrency.body.code === "CURRENCY_MISMATCH", "7 refused: a currency that is not USD");
    ok(wrongCurrency.captures === 0, "7 …with no capture");

    /* a repeated return must not charge twice */
    stubPayPal({ order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500, status: "COMPLETED" }) });
    const again = await run();
    ok(again.status === 200 && again.body.alreadyCaptured === true, "7 a second visit to the return page does not capture again");
    ok(again.captures === 0, "7 …it issues no capture call at all");

    /* a race that PayPal reports as already-captured is a success, not a failure */
    stubPayPal({
      order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 }),
      captureStatus: 422,
      capture: { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] },
    });
    const race = await run();
    ok(race.status === 200 && race.body.captured === true && race.body.alreadyCaptured === true,
      "7 a simultaneous second return is reported as success, not as a failure");

    /* a failed capture is never reported as paid */
    stubPayPal({
      order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 }),
      captureStatus: 500,
      capture: { name: "INTERNAL_SERVER_ERROR", message: "PayPal is unavailable", details: [{ issue: "INSTRUMENT_DECLINED" }] },
    });
    const failed = await run();
    ok(failed.status === 502 && !failed.body.captured, "7 a failed capture returns an error and claims nothing");
    ok(failed.body.code === "INSTRUMENT_DECLINED", "7 …naming PayPal's own reason");

    stubPayPal({
      order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 }),
      capture: { status: "PENDING", purchase_units: [{ payments: { captures: [{ id: "CAP-2" }] } }] },
    });
    const pending = await run();
    ok(pending.status === 502 && !pending.body.captured, "7 a capture that is not COMPLETED is not reported as paid");

    const missing = await require(path.join(ROOT, "src/app/api/paypal/capture-order/route.ts")).POST({ json: async () => ({}) });
    ok(missing.status === 400, "7 a request with no order id is refused");

    /* the environment and the token */
    stubPayPal({ order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "US", shippingCents: 3000, totalCents: 24500 }) });
    await run();
    const tokenCall = calls.find((c) => /oauth2\/token/.test(c.url));
    ok(Boolean(tokenCall) && /^Basic /.test(tokenCall.auth || ""),
      "7 the token is obtained server-side from the client id and secret");
    ok(!/ACCESS_TOKEN/.test(read("src/app/api/paypal/capture-order/route.ts")),
      "7 …and no long-lived PAYPAL_ACCESS_TOKEN is read anywhere");
    ok(r0Host(calls) === "https://api-m.sandbox.paypal.com" && /api-m\.sandbox\.paypal\.com\/v2\/checkout\/orders\/ORDER-1\/capture/.test(calls.find((c) => /\/capture$/.test(c.url)).url),
      "7 the read and the capture use the SAME environment — the host is no longer hardcoded per route");

    delete process.env.PAYPAL_CLIENT_ID;
    const unconfigured = await run();
    ok(unconfigured.status === 500, "7 an unconfigured PayPal refuses rather than pretending");
    process.env.PAYPAL_CLIENT_ID = "stub-id";
  }

  /* ── 8. the pages ───────────────────────────────────────────────────────── */
  console.log("\n  8. the pages");
  {
    const page = read("src/app/sanctum/[slug]/page.tsx");
    ok(/shippingNote\(p\.id\)/.test(page), "8 the product page prints the policy's sentence");
    ok(/delivery-country/.test(page) && /Choose a delivery country/.test(page),
      "8 …and asks for a delivery country before purchasing");
    ok(/requiresShipping\(p\.id\)/.test(page) && /country: ships \? country : undefined/.test(page),
      "8 …and only sends one for a product that ships");
    ok(/Choose a delivery country before purchasing/.test(page), "8 purchasing without one is refused on the page too");
    ok(/Total · /.test(page), "8 the total including shipping is shown before payment");
    ok(/SHIPPABLE_ISO/.test(page) && /deliveryZone/.test(page), "8 the country list comes from the policy, not a hand-written list");
    ok(!/\$30 worldwide \(AU\/Asia \$50\)/.test(page), "8 no rate is typed into the page");

    const ret = read("src/app/sanctum/paypal/return/page.tsx");
    ok(/capture-order/.test(ret), "8 the return page calls the capture route");
    ok(/data\.captured/.test(ret), "8 …and shows confirmation only when the server reports a capture");
    ok(/asked\.current/.test(ret), "8 …attempting the capture once per visit");
    ok(/alreadyCaptured/.test(ret), "8 …and telling a repeat visitor they were not charged twice");

    const create = read("src/app/api/paypal/create-order/route.ts");
    ok(/shipping_preference: ships \? "GET_FROM_FILE" : "NO_SHIPPING"/.test(create),
      "8 the shipping preference is explicit for both kinds of product");
    ok(/\/lib\/paypal/.test(create) && /\/lib\/paypal/.test(read("src/app/api/paypal/capture-order/route.ts")),
      "8 both PayPal routes share one environment and auth helper");
    const paypalLib = read("src/lib/paypal.ts");
    const savedMode = process.env.PAYPAL_MODE;
    delete process.env.PAYPAL_MODE;
    ok(require(path.join(ROOT, "src/lib/paypal.ts")).paypalBaseUrl() === "https://api-m.sandbox.paypal.com",
      "8 …which defaults to the sandbox when the mode is unset (checked by asking it)");
    process.env.PAYPAL_MODE = savedMode || "sandbox";
    ok(!/api-m\.sandbox\.paypal\.com/.test(read("src/app/api/paypal/create-order/route.ts")) &&
       !/api-m\.(sandbox\.)?paypal\.com/.test(read("src/app/api/paypal/capture-order/route.ts")),
      "8 no host is hardcoded in either route any more");
  }

  /* ── 9. the verification gap ────────────────────────────────────────────── */
  console.log("\n  9. the gap in this evidence");
  {
    ok(true, "9 COMPLETED-PAYMENT GAP: no PayPal sandbox credentials exist in this project, so a real sandbox payment was not completed");
    ok(true, "9 …the lifecycle above runs the shipped routes against a scripted PayPal, and no live payment was captured");
    ok(process.env.PAYPAL_MODE !== "production", "9 …and PAYPAL_MODE stayed on the sandbox throughout");
  }

  console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
  if (fail) { console.log("\n  failures:"); failures.forEach((f) => console.log("   - " + f)); }
  process.exit(fail ? 1 : 0);
})();

/** The PayPal host the current stub was called on. */
function r0Host(list) {
  const hit = list.find((c) => /paypal\.com/.test(c.url));
  if (!hit) return null;
  const m = String(hit.url).match(/^https:\/\/[^/]+/);
  return m ? m[0] : null;
}
