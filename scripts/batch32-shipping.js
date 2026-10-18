#!/usr/bin/env node
/**
 * batch32-shipping.js
 *
 * THE CONFIRMED POLICY, THE PROVIDERS' REAL CONTRACTS, AND THE PAYPAL LIFECYCLE.
 *
 * Everything runs the SHIPPED handlers against scripted providers. No live session is created and no
 * payment is captured. The stub counts CAPTURE REQUESTS and FINANCIAL CAPTURES separately, so "one
 * capture" is never a claim about a converted error, and models the ut_orders UNIQUE key so "one
 * logical order" is a fact about the table rather than about how many requests were made.
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
const json = (body, status = 200) => ({
  ok: status < 400, status,
  json: async () => body, text: async () => JSON.stringify(body),
  headers: { get: () => "application/json", forEach: () => {} },
});
const price = (id) => Math.round(products.find((p) => p.id === id).price * 100);
const params = (s) => new URLSearchParams(String(s));
const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/* The predicate that shipped before this batch, kept so the suite can DEMONSTRATE it fails. */
function legacyWouldConfirm(httpStatus, body) {
  return httpStatus === 422 || String(body?.details?.[0]?.issue ?? "").includes("ORDER_ALREADY_CAPTURED");
}

let calls = [];
function stubStripe() {
  calls = [];
  global.fetch = async (url, opts = {}) => { calls.push({ url: String(url), body: String(opts.body || "") }); return json({ url: "https://checkout.stripe.com/stub" }); };
}

/* ── PayPal + Supabase + Telegram ─────────────────────────────────────────── */
function stubPayPal({ order } = {}) {
  let current = JSON.parse(JSON.stringify(order));
  const st = {
    captureRequests: 0, financialCaptures: 0, requestIds: [], prefers: [], reads: 0, tokens: 0,
    forceMinimal: false, failReadFrom: 0,
    supaReads: 0, supaUpdates: 0, supaInserts: [], supaFailWrites: 0, rows: new Map(),
    telegrams: 0, telegramFail: false,
    capturePlan: "succeed",
    fresh: { status: "COMPLETED", id: "CAPTURE-1", amount: null, currency: "USD", omit: false },
    dropFirstResponse: false,
  };
  const captureOf = () => {
    const amount = st.fresh.amount ?? current.purchase_units[0].amount;
    const capture = { id: st.fresh.omit ? undefined : st.fresh.id, status: st.fresh.status, amount: { currency_code: st.fresh.currency, value: amount.value } };
    return st.fresh.omit ? {} : { captures: [capture] };
  };
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = String(opts.method || "GET").toUpperCase();
    const headers = opts.headers || {};
    if (/supabase\.co/.test(u)) {
      const ref = decodeURIComponent((u.match(/stripe_session_id=eq\.([^&]+)/) || [])[1] || "");
      if (method === "GET") { st.supaReads += 1; const row = st.rows.get(ref); return json(row ? [{ notes: row.notes }] : []); }
      if (st.supaFailWrites > 0) { st.supaFailWrites -= 1; return json({ message: "simulated persistence failure" }, 500); }
      if (method === "PATCH" || method === "PUT") {
        st.supaUpdates += 1;
        let patch = {}; try { patch = JSON.parse(String(opts.body || "{}")); } catch {}
        const row = st.rows.get(ref); if (row) Object.assign(row, patch);
        return json([]);
      }
      let payload = {}; try { payload = JSON.parse(String(opts.body || "{}")); } catch {}
      const inserted = [];
      for (const row of (Array.isArray(payload) ? payload : [payload])) {
        if (st.rows.has(row.stripe_session_id)) continue;
        st.rows.set(row.stripe_session_id, { ...row });
        inserted.push({ id: row.stripe_session_id });
        st.supaInserts.push(row);
      }
      return json(inserted, 201);
    }
    if (/api\.telegram\.org/.test(u)) {
      st.telegrams += 1;
      return st.telegramFail ? json({ ok: false, description: "simulated telegram failure" }, 400) : json({ ok: true });
    }
    if (/oauth2\/token/.test(u)) { st.tokens += 1; return json({ access_token: "STUB-TOKEN" }); }
    if (/\/capture$/.test(u)) {
      st.captureRequests += 1;
      st.requestIds.push(headers["PayPal-Request-Id"] ?? headers["paypal-request-id"] ?? null);
      st.prefers.push(String(headers["Prefer"] ?? headers.prefer ?? ""));
      if (st.dropFirstResponse && st.captureRequests === 1) {
        st.financialCaptures += 1;
        current.status = "COMPLETED";
        current.purchase_units[0].payments = { captures: [{ id: "CAPTURE-1", status: "COMPLETED", amount: current.purchase_units[0].amount }] };
        throw new Error("socket hang up");
      }
      if (st.capturePlan === "declined") return json({ name: "UNPROCESSABLE_ENTITY", message: "The instrument was declined", details: [{ issue: "INSTRUMENT_DECLINED" }] }, 422);
      if (st.capturePlan === "not-approved") return json({ name: "UNPROCESSABLE_ENTITY", message: "Order not approved", details: [{ issue: "ORDER_NOT_APPROVED" }] }, 422);
      if (st.capturePlan === "server-error") return json({ name: "INTERNAL_SERVER_ERROR", message: "PayPal is unavailable", details: [{ issue: "INTERNAL_SERVER_ERROR" }] }, 500);
      if (st.capturePlan === "already-and-real") {
        current.purchase_units[0].payments = { captures: [{ id: "CAPTURE-1", status: "COMPLETED", amount: current.purchase_units[0].amount }] };
        return json({ name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }, 422);
      }
      if (current.status === "COMPLETED") return json({ name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }, 422);
      // a FRESH success — shaped by st.fresh, so a bad capture can be returned with HTTP 200
      st.financialCaptures += 1;
      current.status = "COMPLETED";
      current.purchase_units[0].payments = captureOf();
      /* The provider honours the requested representation. Without `Prefer: return=representation`
         — PayPal's documented default is `return=minimal` — the body carries no purchase_units at
         all, so the capture is invisible to the caller. `forceMinimal` reproduces a provider that
         returns minimal even when asked. */
      const honoursRepresentation = /return=representation/i.test(
        String(headers["Prefer"] ?? headers.prefer ?? "")
      );
      if (st.forceMinimal || !honoursRepresentation) {
        return json({ id: "ORDER-1", status: "COMPLETED" });
      }
      return json({ status: "COMPLETED", purchase_units: [{ payments: captureOf() }], payer: current.payer });
    }
    if (/v2\/checkout\/orders\//.test(u)) {
      st.reads += 1;
      // failReadFrom = 2 fails the READ-BACK (the first read is the handler's own order lookup)
      if (st.failReadFrom && st.reads >= st.failReadFrom) {
        return json({ name: "RESOURCE_NOT_FOUND", message: "order not found" }, 404);
      }
      return json(JSON.parse(JSON.stringify(current)));
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
        ...(shippingCents > 0 ? { breakdown: { item_total: { currency_code: "USD", value: priceUsd.toFixed(2) }, shipping: { currency_code: "USD", value: (shippingCents / 100).toFixed(2) } } } : {}),
      },
      ...(country || shippingCents > 0 ? {
        shipping: {
          name: { full_name: "Recipient Person" },
          address: {
            address_line_1: "1 Test Street", address_line_2: "Flat 4",
            admin_area_2: "Town", admin_area_1: "Region",
            postal_code: "12345", country_code: country,
          },
        },
      } : {}),
    }],
    payer: { email_address: "buyer@example.com", name: { given_name: "Payer", surname: "Person" } },
  };
}

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

  console.log("\n  1. the confirmed policy");
  {
    ok(S.SHIPPING_POLICY_STATE === "confirmed", "1 the policy state is confirmed");
    ok(S.SHIPPING_RATES["codex-physical"].worldwideCents === 3000 && S.SHIPPING_RATES["codex-physical"].australiaAndAsiaCents === 5000, "1 Codex $30 worldwide, $50 Australia and Asia");
    ok(S.SHIPPING_RATES["hexahedron-cube"].worldwideCents === 2000 && S.SHIPPING_RATES["hexahedron-cube"].australiaAndAsiaCents === 2000, "1 cube $20 everywhere");
    ok(S.AUSTRALIA_AND_ASIA_ISO.includes("CN") && !S.AUSTRALIA_AND_ASIA_ISO.includes("NZ"), "1 canonical identities: CN in the zone, NZ out and documented");
  }

  console.log("\n  2. totals");
  {
    ok(S.orderTotalCents("codex-physical", 215, "US") === 24500, "2 Codex US $245");
    ok(S.orderTotalCents("codex-physical", 215, "NZ") === 24500, "2 Codex NZ $245");
    ok(S.orderTotalCents("codex-physical", 215, "AU") === 26500, "2 Codex AU $265");
    ok(S.orderTotalCents("codex-physical", 215, "CN") === 26500, "2 Codex CN $265 (canonical identity)");
    ok(S.orderTotalCents("hexahedron-cube", 109, "AU") === 12900, "2 Cube AU $129");
    ok(S.orderTotalCents("codex-digital", 99, "AU") === 9900, "2 Digital $99");
  }

  console.log("\n  3. the providers' contracts");
  {
    const sdk = fs.readFileSync(path.join(ROOT, "node_modules/stripe/types/Checkout/Sessions.d.ts"), "utf8");
    const union = /type AllowedCountry\s*=([\s\S]*?);/.exec(sdk)[1];
    const sdkCodes = [...union.matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]);
    ok(same(sdkCodes, D.STRIPE_ALLOWED_ISO), `3 Stripe's list IS the installed SDK enum (${sdkCodes.length})`);
    ok(!("PAYPAL_ALLOWED_ISO" in D), "3 no inferred PayPal country list remains");
    ok(D.PAYPAL_COUNTRY_CODE_PATTERN.test("CN") === true && D.PAYPAL_COUNTRY_CODE_PATTERN.test("C2") === true, "3 PayPal's documented pattern accepts ISO codes and C2");
    ok(D.PAYPAL_COUNTRY_CODE_PATTERN.test("cn") === false, "3 …and rejects lowercase");
    ok(D.toProviderCountry("paypal", "CN") === "C2", "3 China is SENT to PayPal as C2");
    ok(D.toProviderCountry("paypal", "AU") === "AU" && D.toProviderCountry("stripe", "CN") === "CN", "3 every other destination passes through unchanged, and Stripe keeps ISO");
    ok(D.fromProviderCountry("paypal", "C2") === "CN", "3 …and C2 received from PayPal is read back as China");
    ok(D.fromProviderCountry("paypal", "AU") === "AU", "3 …with other codes unchanged");
    ok(D.providerSupports("paypal", "CN") === true, "3 PayPal supports China — the account-availability inference is withdrawn");
    ok(D.unsupportedDestinationMessage("codex-physical", "paypal", "CN") === null, "3 …so a CN buyer is offered PayPal without a refusal");
    ok(D.isDestinationSupported("codex-physical", "paypal", "CN") === true, "3 …and CN is a supported destination for the product");
    ok(D.isDestinationSupported("codex-physical", "paypal", "ZZ") === false, "3 a code with no canonical identity is still refused");
    ok(D.isDestinationSupported("codex-physical", "stripe", "IR") === false, "3 …as is a Stripe-unsupported country on the card path");
    ok(D.allowedDeliveryFor("codex-physical", "paypal", "CN").length === S.SHIPPABLE_ISO.filter((c) => S.deliveryZone(c) === "AUSTRALIA_AND_ASIA").length,
      "3 a CN PayPal order allowlists the whole Australia/Asia zone (no provider narrowing)");
    ok(D.allowedDeliveryFor("codex-physical", "stripe", "US").length === 189 && D.allowedDeliveryFor("codex-physical", "stripe", "AU").length === 49,
      "3 Stripe stays narrowed by its own contract (189 / 49)");
  }

  console.log("\n  4. the Stripe session");
  {
    stubStripe();
    const route = require(path.join(ROOT, "src/app/api/checkout/route.ts"));
    const stripeCalls = () => calls.filter((c) => /api\.stripe\.com/.test(c.url));
    const run = async (productId, country) => { calls = []; const res = await route.POST({ json: async () => ({ productId, country }) }); return { status: res.status, body: await res.json() }; };
    const g = (body, k) => params(body).get(k);

    calls = [];
    const spoof = await route.POST({ json: async () => ({ productId: "codex-physical", country: "US", shippingCents: 0, totalCents: 21500 }) });
    ok(spoof.status === 200 && g(stripeCalls()[0].body, "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === "3000", "4 a client-supplied 0 shipping is ignored");
    for (const [country, cents] of [["US", "3000"], ["NZ", "3000"], ["AU", "5000"], ["CN", "5000"]]) {
      const r = await run("codex-physical", country);
      ok(r.status === 200 && g(stripeCalls()[0].body, "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === cents, `4 ${country} is charged $${Number(cents) / 100}`);
    }
    const us = await run("codex-physical", "US");
    const allowedUs = (() => { const out = []; const p = params(stripeCalls()[0].body); for (let i = 0; p.get(`shipping_address_collection[allowed_countries][${i}]`); i++) out.push(p.get(`shipping_address_collection[allowed_countries][${i}]`)); return out; })();
    ok(allowedUs.length === 189 && allowedUs.every((c) => D.STRIPE_ALLOWED_ISO.includes(c)), "4 every allowlisted code is Stripe-supported (189)");
    ok(!allowedUs.some((c) => ["IR", "KP", "SY", "CU", "AS", "CC", "CX", "HM", "UM", "VI"].includes(c)), "4 …and none of the codes Stripe refuses appears");
    for (const c of ["IR", "SY"]) {
      const r = await run("codex-physical", c);
      ok(r.status === 400 && r.body.code === "UNSUPPORTED_DESTINATION" && stripeCalls().length === 0, `4 ${c} is refused before any session exists`);
    }
    const noC = await run("codex-physical", "");
    ok(noC.status === 400 && noC.body.code === "NO_DESTINATION", "4 no destination is refused before any session");
    for (const id of ["codex-digital", "chakra-4k", "chakra-8k"]) {
      const r = await run(id, "AU");
      const keys = [...params(stripeCalls()[0].body).keys()];
      ok(r.status === 200 && !keys.some((k) => k.startsWith("shipping_options") || k.startsWith("shipping_address_collection")), `4 ${id}: no shipping and no address requested`);
    }
  }

  console.log("\n  5. the PayPal order");
  {
    let lastOrder = null;
    const st = stubPayPal({ order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "US", shippingCents: 3000, totalCents: 24500 }) });
    const inner = global.fetch;
    global.fetch = async (u, o = {}) => { if (/v2\/checkout\/orders$/.test(String(u))) { try { lastOrder = JSON.parse(String(o.body)); } catch {} } return inner(u, o); };
    const create = require(path.join(ROOT, "src/app/api/paypal/create-order/route.ts"));
    const run = async (productId, country) => { lastOrder = null; const res = await create.POST({ json: async () => ({ productId, country }) }); return { status: res.status, body: await res.json() }; };

    for (const [country, total, ship] of [["US", "245.00", "30.00"], ["NZ", "245.00", "30.00"], ["AU", "265.00", "50.00"], ["CN", "265.00", "50.00"]]) {
      const r = await run("codex-physical", country);
      ok(r.status === 200, `5 ${country}: order created`);
      ok(lastOrder.purchase_units[0].amount.value === total, `5 ${country}: total $${total}`);
      ok(lastOrder.purchase_units[0].amount.breakdown.shipping.value === ship, `5 ${country}: shipping $${ship} on its own line`);
    }
    const cn = await run("codex-physical", "CN");
    ok(cn.status === 200, "5 CN is NOT refused — the undocumented restriction is gone");
    ok(lastOrder.application_context.shipping_preference === "GET_FROM_FILE", "5 a physical order lets PayPal collect the address");
    ok(lastOrder.application_context.return_url.endsWith("/sanctum/paypal/return"), "5 …and returns to the confirmation route");

    const zz = await run("codex-physical", "ZZ");
    ok(zz.status === 400 && zz.body.code === "UNSUPPORTED_DESTINATION", "5 a non-existent country code is refused");

    for (const id of ["codex-digital", "chakra-4k"]) {
      const r = await run(id, "AU");
      ok(lastOrder.purchase_units[0].amount.breakdown === undefined && lastOrder.application_context.shipping_preference === "NO_SHIPPING", `5 ${id}: no shipping line, shipping explicitly suppressed`);
    }
    global.fetch = inner;
  }

  console.log("\n  6. the capture — verification on EVERY success path");
  {
    const auOrder = () => approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 });
    const capture = freshCaptureHandler();
    const run = async (h = capture) => { const res = await h.POST({ json: async () => ({ orderId: "ORDER-1" }) }); return { status: res.status, body: await res.json() }; };

    /* control */
    let st = stubPayPal({ order: auOrder() });
    let r = await run();
    ok(r.status === 200 && r.body.captured === true && r.body.captureId === "CAPTURE-1", "6 control: a verified fresh capture is confirmed");
    ok(st.financialCaptures === 1 && st.rows.size === 1, "6 …one capture, one order row");

    /* ── PayPal's documented capture response ───────────────────────────────
       PayPal defaults to `return=minimal`, whose body need not carry
       purchase_units[].payments.captures. The request must ask for the representation, and a
       minimal success must be confirmed by READING THE ORDER BACK — never by capturing again. */
    st = stubPayPal({ order: auOrder() });
    r = await run();
    ok(st.prefers[0] === "return=representation", "6.1 the capture requests Prefer: return=representation");
    ok(st.requestIds[0] === "capture-ORDER-1", "6.1 …alongside the stable idempotency key");
    ok(r.status === 200 && r.body.captured === true && r.body.captureId === "CAPTURE-1", "6.1 a full response is verified and confirmed");
    ok(st.reads === 1, "6.1 …with only the handler's own order read, and no extra read-back");

    st = stubPayPal({ order: auOrder() });
    st.forceMinimal = true;
    r = await run();
    ok(r.status === 200 && r.body.captured === true, "6.2 a MINIMAL success is confirmed");
    ok(r.body.captureId === "CAPTURE-1", "6.2 …with the capture id taken from the read-back");
    ok(st.captureRequests === 1 && st.financialCaptures === 1, "6.2 …from exactly one capture request and one payment");
    ok(st.reads === 2, "6.2 …read back once beyond the initial order lookup");
    ok(st.rows.size === 1 && st.telegrams === 1, "6.2 …one order written and one alert sent");

    for (const [label, setup] of [
      ["the read-back fails", (x) => { x.failReadFrom = 2; }],
      ["the read-back shows a PENDING capture", (x) => { x.fresh.status = "PENDING"; }],
      ["the read-back shows a $1 capture", (x) => { x.fresh.amount = { value: "1.00" }; }],
      ["the read-back shows a EUR capture", (x) => { x.fresh.currency = "EUR"; }],
    ]) {
      st = stubPayPal({ order: auOrder() });
      st.forceMinimal = true;
      setup(st);
      r = await run();
      ok(r.status === 502 && !r.body.captured && r.body.code === "CAPTURE_NOT_CONFIRMED", `6.3 minimal success where ${label}: stays UNCONFIRMED`);
      ok(st.rows.size === 0 && st.telegrams === 0, "6.3 …no order written and no alert sent");
      ok(st.captureRequests === 1, "6.3 …and no second capture was issued to recover the detail");
    }

    /* FRESH 200s that must NOT be confirmed */
    const freshCases = [
      ["a fresh capture left PENDING", { status: "PENDING" }],
      ["a $1 capture", { amount: { value: "1.00" } }],
      ["a EUR capture", { currency: "EUR" }],
      ["a capture with no id", { id: "" }],
      ["a response with no capture at all", { omit: true }],
    ];
    for (const [label, override] of freshCases) {
      st = stubPayPal({ order: auOrder() });
      Object.assign(st.fresh, override);
      r = await run();
      ok(r.status !== 200 && !r.body.captured, `6 REFUSED: ${label}`);
      ok(r.body.code === "CAPTURE_NOT_CONFIRMED", `6 …reported as unconfirmed (${label})`);
      ok(st.rows.size === 0 && st.supaInserts.length === 0, `6 …with NO paid-order write (${label})`);
      ok(st.telegrams === 0, `6 …and no sale alert (${label})`);
    }

    /* an order PayPal already reports COMPLETED — same verification */
    const completedWith = (captures) => { const o = auOrder(); o.status = "COMPLETED"; o.purchase_units[0].payments = { captures }; return o; };
    for (const [label, captures] of [
      ["a pending capture on a COMPLETED order", [{ id: "C1", status: "PENDING", amount: { currency_code: "USD", value: "265.00" } }]],
      ["a $1 capture on a COMPLETED order", [{ id: "C1", status: "COMPLETED", amount: { currency_code: "USD", value: "1.00" } }]],
      ["a EUR capture on a COMPLETED order", [{ id: "C1", status: "COMPLETED", amount: { currency_code: "EUR", value: "265.00" } }]],
      ["no capture on a COMPLETED order", []],
      ["a capture with no id on a COMPLETED order", [{ id: "", status: "COMPLETED", amount: { currency_code: "USD", value: "265.00" } }]],
    ]) {
      st = stubPayPal({ order: completedWith(captures) });
      r = await run();
      ok(r.status === 409 && !r.body.captured && r.body.code === "CAPTURE_NOT_CONFIRMED", `6 REFUSED: ${label}`);
      ok(st.rows.size === 0 && st.telegrams === 0, `6 …no order written and no alert (${label})`);
    }
    st = stubPayPal({ order: completedWith([{ id: "CAPTURE-1", status: "COMPLETED", amount: { currency_code: "USD", value: "265.00" } }]) });
    r = await run();
    ok(r.status === 200 && r.body.alreadyCaptured === true && r.body.captureId === "CAPTURE-1", "6 control: a COMPLETED order with a real capture is confirmed");
    ok(st.captureRequests === 0, "6 …without sending a capture request");

    /* provider errors stay errors */
    for (const [plan, code] of [["declined", "INSTRUMENT_DECLINED"], ["not-approved", "ORDER_NOT_APPROVED"], ["server-error", "INTERNAL_SERVER_ERROR"]]) {
      st = stubPayPal({ order: auOrder() });
      st.capturePlan = plan;
      r = await run();
      ok(r.status === 502 && !r.body.captured && r.body.code === code, `6 REFUSED: ${plan} (${code})`);
      ok(st.rows.size === 0 && st.telegrams === 0, `6 …no write and no alert (${plan})`);
      const legacyBody = { details: [{ issue: code }] };
      ok(legacyWouldConfirm(plan === "server-error" ? 500 : 422, legacyBody) === (plan !== "server-error"), `6 OLD BRANCH would have confirmed ${plan}: ${plan !== "server-error"}`);
    }

    /* already-captured re-read */
    st = stubPayPal({ order: auOrder() });
    st.capturePlan = "already-and-real";
    r = await run();
    ok(r.status === 200 && r.body.alreadyCaptured === true && r.body.captureId === "CAPTURE-1", "6 already-captured WITH a real capture on re-read: confirmed");

    for (const [label, mutate] of [
      ["no capture recorded", (b) => { delete b.purchase_units[0].payments; return b; }],
      ["a PENDING capture", (b) => { b.purchase_units[0].payments = { captures: [{ id: "C1", status: "PENDING", amount: b.purchase_units[0].amount }] }; return b; }],
      ["the wrong amount", (b) => { b.purchase_units[0].payments = { captures: [{ id: "C1", status: "COMPLETED", amount: { currency_code: "USD", value: "30.00" } }] }; return b; }],
      ["a EUR capture", (b) => { b.purchase_units[0].payments = { captures: [{ id: "C1", status: "COMPLETED", amount: { currency_code: "EUR", value: "265.00" } }] }; return b; }],
      ["a capture with no id", (b) => { b.purchase_units[0].payments = { captures: [{ id: "", status: "COMPLETED", amount: b.purchase_units[0].amount }] }; return b; }],
    ]) {
      st = stubPayPal({ order: auOrder() });
      st.capturePlan = "already-and-real";
      const prev = global.fetch;
      global.fetch = async (u, o = {}) => {
        const res = await prev(u, o);
        if (/v2\/checkout\/orders\//.test(String(u)) && !/\/capture$/.test(String(u))) return json(mutate(await res.json()));
        return res;
      };
      r = await run();
      ok(r.status === 409 && !r.body.captured && r.body.code === "CAPTURE_NOT_CONFIRMED", `6 REFUSED: already-captured with ${label}`);
      ok(st.rows.size === 0 && st.telegrams === 0, `6 …no write and no alert (already-captured: ${label})`);
    }

    /* verification before capture, unchanged */
    for (const [label, order, code] of [
      ["a total below the policy", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 3000, totalCents: 24500 }), "TOTAL_MISMATCH"],
      ["no delivery country", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: null, shippingCents: 0, totalCents: 21500 }), "NO_DELIVERY_COUNTRY"],
      ["a non-USD order", approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "US", shippingCents: 3000, totalCents: 24500, currency: "EUR" }), "CURRENCY_MISMATCH"],
    ]) {
      st = stubPayPal({ order });
      r = await run();
      ok(r.status === 409 && r.body.code === code, `6 refused: ${label}`);
      ok(st.captureRequests === 0 && st.financialCaptures === 0, "6 …no capture request was sent");
    }

    /* C2: the provider code for China must be priced as China */
    const c2Order = () => approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "C2", shippingCents: 5000, totalCents: 26500 });
    st = stubPayPal({ order: c2Order() });
    r = await run();
    ok(r.status === 200 && r.body.captured === true, "6 an order whose country arrives as C2 is confirmed at the Australia/Asia rate");
    ok(r.body.country === "CN" && r.body.providerCountry === "C2", "6 …normalised to CN while the provider code is reported as C2");
    ok(st.rows.get("paypal:ORDER-1").shipping_country === "CN", "6 …and the order row records the canonical CN");
    st = stubPayPal({ order: approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "C2", shippingCents: 3000, totalCents: 24500 }) });
    r = await run();
    ok(r.status === 409 && r.body.code === "TOTAL_MISMATCH", "6 a C2 order priced at the worldwide rate is refused — the mapping is load-bearing for money");
  }

  console.log("\n  7. retries and concurrency");
  {
    const auOrder = () => approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 });
    const capture = freshCaptureHandler();

    let st = stubPayPal({ order: auOrder() });
    st.dropFirstResponse = true;
    let first;
    try { first = await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) }); } catch (e) { first = { json: async () => ({ error: String(e.message) }) }; }
    const firstBody = await first.json();
    ok(!firstBody.captured, "7 lost response: nothing confirmed to the buyer");
    ok(st.financialCaptures === 1, "7 …although PayPal took one payment");
    const second = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(second.captured === true && second.captureId === "CAPTURE-1", "7 the retry confirms the same capture");
    ok(st.financialCaptures === 1, "7 …without a second payment");
    ok(st.rows.size === 1, "7 …and one order row");

    st = stubPayPal({ order: auOrder() });
    st.capturePlan = "server-error";
    const outage = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(!outage.captured, "7 an outage confirms nothing");
    st.capturePlan = "succeed";
    const recovered = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(recovered.captured === true && st.captureRequests === 2 && st.requestIds[0] === "capture-ORDER-1" && st.requestIds[1] === "capture-ORDER-1", "7 the retry re-attempts under the SAME idempotency key");
    ok(st.financialCaptures === 1, "7 …taking the money once");

    st = stubPayPal({ order: auOrder() });
    const h1 = freshCaptureHandler();
    const h2 = freshCaptureHandler();
    const all = await Promise.all([h1, h2, h2].map((h) => h.POST({ json: async () => ({ orderId: "ORDER-1" }) }).then((x) => x.json())));
    ok(all.every((x) => x.captured === true), "7 three simultaneous returns are all confirmed");
    ok(st.financialCaptures === 1, "7 …one financial capture");
    ok(st.rows.size === 1, "7 …one logical order");
    ok(st.telegrams === 1, "7 …one studio alert");
    ok(new Set(all.map((x) => x.captureId)).size === 1, "7 …all naming the same capture");
    ok(st.requestIds.every((k) => k === "capture-ORDER-1"), "7 …all under one idempotency key");
  }

  console.log("\n  8. after the money");
  {
    const auOrder = () => approvedOrder({ productId: "codex-physical", priceUsd: 215, country: "AU", shippingCents: 5000, totalCents: 26500 });
    const capture = freshCaptureHandler();
    let st = stubPayPal({ order: auOrder() });
    let body = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(body.orderRecorded === true, "8 the confirmed order is written");
    const row = st.rows.get("paypal:ORDER-1");
    ok(row.stripe_session_id === "paypal:ORDER-1", "8 …keyed by a PayPal-marked payment reference");
    ok(row.stripe_payment_intent_id === "CAPTURE-1", "8 …with the capture id");
    ok(row.amount_cents === 26500 && row.status === "paid", "8 …at the charged total, status paid");
    ok(row.status !== "fulfilled", "8 …never fulfilled: nothing has delivered the goods");
    /* the COMPLETE address, not just the country */
    ok(row.shipping_address_line1 === "1 Test Street", "8 …address line 1 normalised from address_line_1");
    ok(row.shipping_address_line2 === "Flat 4", "8 …line 2 normalised from address_line_2");
    ok(row.shipping_city === "Town", "8 …city normalised from admin_area_2");
    ok(row.shipping_state === "Region", "8 …state normalised from admin_area_1");
    ok(row.shipping_postal_code === "12345", "8 …postal code carried through");
    ok(row.shipping_country === "AU", "8 …country code carried through");
    ok(row.shipping_name === "Recipient Person", "8 …and the RECIPIENT name, not the payer's");
    ok(body.recipientName === "Recipient Person" && body.payerEmail === "buyer@example.com", "8 …with recipient and payer reported separately");

    /* a digital order: paid, no address invented */
    st = stubPayPal({ order: approvedOrder({ productId: "codex-digital", priceUsd: 99, country: null, shippingCents: 0, totalCents: 9900 }) });
    body = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    const digitalRow = st.rows.get("paypal:ORDER-1");
    ok(digitalRow.status === "paid" && digitalRow.is_digital === true, "8 a digital order records paid and digital");
    ok(digitalRow.shipping_address_line1 === null && digitalRow.shipping_country === null, "8 …and no delivery address is invented");

    /* a failed write: visible, retryable, no recapture */
    st = stubPayPal({ order: auOrder() });
    st.supaFailWrites = 1;
    body = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(body.captured === true && body.orderRecorded === false && typeof body.recordingDetail === "string", "8 a failed write is visible, not swallowed");
    ok(body.studioNotified === true, "8 …and the studio is told anyway");
    ok(st.financialCaptures === 1, "8 …without a second payment");
    body = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(body.orderRecorded === true && st.rows.size === 1, "8 the retry records it, once");
    ok(st.financialCaptures === 1, "8 …still without recapturing");

    /* notification reporting is truthful on repeats */
    st = stubPayPal({ order: auOrder() });
    const first = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(first.studioNotified === true && st.telegrams === 1, "8 the first confirmation reports the alert it actually sent");
    ok(st.rows.get("paypal:ORDER-1").notes.includes("alert=sent"), "8 …and records the outcome on the order");
    const repeat = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(repeat.orderAlreadyRecorded === true && repeat.studioNotified === true, "8 a repeat reports the recorded outcome");
    ok(/recorded earlier/.test(repeat.notifyDetail || ""), "8 …and says it comes from the earlier confirmation");
    ok(st.telegrams === 1, "8 …without sending a second alert");

    st = stubPayPal({ order: auOrder() });
    st.telegramFail = true;
    const failed = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(failed.studioNotified === false, "8 a failed alert is reported as failed");
    ok(st.rows.get("paypal:ORDER-1").notes.includes("alert=failed"), "8 …and recorded as failed");
    st.telegramFail = false;
    const afterFail = await (await capture.POST({ json: async () => ({ orderId: "ORDER-1" }) })).json();
    ok(afterFail.studioNotified === false, "8 a repeat does NOT manufacture a successful alert");
    ok(/failed/i.test(afterFail.notifyDetail || ""), "8 …it reports the recorded failure");

    const returnPage = read("src/app/sanctum/paypal/return/page.tsx");
    const successPage = read("src/app/sanctum/success/page.tsx");
    ok(!/receipt has been sent|receipt will be sent/i.test(returnPage), "8 the return page promises no receipt");
    ok(!/receipt has been sent/i.test(successPage), "8 …and neither does the success page");
    ok(/orderRecorded/.test(returnPage) && /studioNotified/.test(returnPage), "8 the page reports what actually happened");
    ok(/"fulfilled"/.test(read("src/lib/order-recording.ts")) === false, "8 the recorder never writes fulfilled");
    const webhook = read("src/app/api/stripe-webhook/route.ts");
    ok(/sendTelegram/.test(webhook) && !/resend|sendgrid|postmark|nodemailer/i.test(webhook), "8 the existing mechanism is the order row plus a Telegram alert — no buyer email exists");
  }

  console.log("\n  9. the pages");
  {
    const page = read("src/app/sanctum/[slug]/page.tsx");
    ok(/shippingNote\(p\.id\)/.test(page) && /delivery-country/.test(page), "9 the product page prints the policy and asks for a destination");
    ok(/destinationsByZone\(p\.id, provider\)/.test(page) && /chooseProvider/.test(page), "9 …offering the selected provider's destinations");
    ok(/unsupportedDestinationMessage/.test(page) && /destinationProblem/.test(page), "9 …and refusing unsupported ones");
    ok(/country: ships \? country : undefined/.test(page), "9 …sending a country only for a product that ships");
    const ret = read("src/app/sanctum/paypal/return/page.tsx");
    ok(/capture-order/.test(ret) && /data\.captured/.test(ret) && /asked\.current/.test(ret), "9 the return page confirms only what the server confirms, once");
  }

  console.log("\n  10. the gap in this evidence");
  {
    ok(true, "10 COMPLETED-PAYMENT GAP: no PayPal SANDBOX credentials exist here, so no real sandbox payment was completed");
    ok(true, "10 …the lifecycle above runs the shipped handlers against scripted providers; no live payment was captured");
    ok(process.env.PAYPAL_MODE !== "production", "10 …and PAYPAL_MODE stayed on the sandbox throughout");
  }

  console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
  if (fail) { console.log("\n  failures:"); failures.forEach((f) => console.log("   - " + f)); }
  process.exit(fail ? 1 : 0);
})();
