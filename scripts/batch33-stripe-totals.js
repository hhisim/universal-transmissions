#!/usr/bin/env node
/**
 * batch33-stripe-totals.js
 *
 * THE PAID TOTAL COMES FROM STRIPE, NOT FROM OUR OWN PRICE TABLE.
 *
 * Runs the SHIPPED Stripe webhook handler against a scripted provider and an isolated in-memory
 * ut_orders table. No live charge, no production write, no SQL. Signature verification runs for
 * real (HMAC over `<t>.<body>`), so the "invalid signature" cases prove the guard still works.
 */
const path = require("path");
const Module = require("module");
const crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });

const SECRET = "whsec_test_batch33";
const NO_TOKEN = process.env.BATCH33_NO_TOKEN === "1";   // child-process mode: token absent at load
process.env.STRIPE_WEBHOOK_SECRET = SECRET;      // the handler verifies with this
if (!NO_TOKEN) process.env.AKASHA_BOT_TOKEN = "test-token";  // so sendTelegram actually runs (fetch is stubbed)
process.env.TELEGRAM_HOME_CHANNEL = "test-chat";
process.env.UT_SUPABASE_URL = "https://isolated.test";        // the webhook uses the UT_* pair
process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
let pass = 0, fail = 0; const failures = [];
const ok = (c, m) => { if (c) { pass += 1; console.log("    ok   " + m); } else { fail += 1; failures.push(m); console.log("    FAIL " + m); } };

/* ── isolated storage ───────────────────────────────────────────────────── */
let rows, updates, telegrams, dbError, dbThrow;
function reset() { rows = new Map(); updates = []; telegrams = []; dbError = null; dbThrow = false; }
function seed(sessionId, amountCents, isDigital) {
  rows.set(sessionId, { id: "row-" + sessionId, stripe_session_id: sessionId, amount_cents: amountCents,
    currency: null, is_digital: isDigital, status: "pending", stripe_payment_intent_id: null, notes: null });
}
function chain(table) {
  const q = { __payload: undefined, __eq: undefined };
  const step = () => q;
  for (const m of ["select", "in", "is", "order", "limit", "match", "not", "gte", "lte", "filter", "maybeSingle", "single", "insert", "upsert", "delete"]) q[m] = step;
  q.update = (payload) => { if (dbThrow) throw new Error("connection refused"); q.__payload = payload; return q; };
  q.eq = (col, val) => { q.__eq = [col, val]; return q; };
  q.then = (res) => {
    if (dbError) return Promise.resolve({ data: null, error: dbError }).then(res);
    let data = [];
    if (table === "ut_orders" && q.__payload && q.__eq && q.__eq[0] === "stripe_session_id") {
      const row = rows.get(q.__eq[1]);
      if (row) { Object.assign(row, q.__payload); data = [{ id: row.id }]; }
      updates.push({ payload: q.__payload, key: q.__eq[1], matched: !!row });
      if (q.__payload.status && !["paid", "fulfilled", "pending"].includes(q.__payload.status)) q.__payload = null;
    }
    return Promise.resolve({ data, error: null }).then(res);
  };
  return q;
}

/* ── scripted provider (with REAL signature verification) ───────────────── */
const fakeStripe = {
  webhooks: {
    constructEvent(raw, sig, secret) {
      const parts = String(sig).split(",").reduce((a, p) => { const [k, v] = p.split("="); a[k] = v; return a; }, {});
      if (!parts.t || !parts.v1) throw new Error("No signatures found matching the expected signature");
      const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))) throw new Error("Signature mismatch");
      if (secret !== SECRET) throw new Error("Unexpected signing secret");
      return JSON.parse(raw);
    },
  },
  checkout: { sessions: { listLineItems: async () => ({ data: [{ description: "Codex", quantity: 1 }] }) } },
};
function sign(raw) { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${crypto.createHmac("sha256", SECRET).update(`${t}.${raw}`).digest("hex")}`; }

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@/lib/stripe") return { getStripe: () => fakeStripe };
  if (request === "@supabase/supabase-js") return { createClient: () => ({ from: (t) => chain(t) }), SupabaseClient: class {} };
  return origLoad.apply(this, arguments);
};
global.fetch = async (url, opts) => {
  if (String(url).includes("api.telegram.org")) { telegrams.push(String((opts && opts.body) || "")); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
  return { ok: true, status: 200, json: async () => ({}), text: async () => "{}" };
};

const handler = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));
const request = (body, headers = {}) => ({
  headers: { get: (k) => headers[String(k).toLowerCase()] ?? null },
  text: async () => body,
  json: async () => JSON.parse(body),
});
async function deliver(session, extra = {}) {
  const raw = JSON.stringify({ id: "evt_" + (session.id || "x"), type: "checkout.session.completed",
    data: { object: session }, ...extra });
  const res = await handler.POST(request(raw, { "stripe-signature": sign(raw) }));
  let body = null; try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}
const session = (over = {}) => ({
  id: "cs_test_ORDER1", object: "checkout.session", mode: "payment", amount_total: 24500, currency: "usd",
  payment_intent: "pi_1", customer_email: "buyer@example.com", created: 1700000000,
  customer_details: { name: "Buyer Name", email: "buyer@example.com" },
  shipping_details: { name: "Buyer Name", address: { line1: "1 Main St", line2: null, city: "Austin", state: "TX", postal_code: "78701", country: "US" } },
  metadata: {}, ...over,
});

// CASES
const row = (id) => rows.get(id);
const lastUpdate = () => updates.length ? updates[updates.length - 1] : null;

(async () => {
  if (NO_TOKEN) {
    // Fresh process with no AKASHA_BOT_TOKEN at module load: the notification helper must not call out.
    reset(); seed("cs_test_ORDER1", 21500, false);
    const r = await deliver(session({ amount_total: 24500 }));
    console.log("NO_TOKEN_RESULT " + JSON.stringify({ telegrams: telegrams.length, status: r.status,
      amount: row("cs_test_ORDER1").amount_cents }));
    process.exit(0);
  }
  console.log("\n  1. the three agreed totals, taken from the provider");
  for (const [label, over, cents, status, address] of [
    ["physical US", { amount_total: 24500, currency: "usd", shipping_details: { name: "Buyer Name", address: { line1: "1 Main St", city: "Austin", state: "TX", postal_code: "78701", country: "US" } } }, 24500, "paid", "US"],
    ["physical AU", { amount_total: 26500, currency: "usd", shipping_details: { name: "Buyer Name", address: { line1: "2 Coode Pl", city: "Bonyrigg", state: "NSW", postal_code: "2177", country: "AU" } } }, 26500, "paid", "AU"],
    ["digital",     { amount_total: 9900,  currency: "usd", shipping_details: null, line_items: { data: [{ description: "Codex Digital", price: { product: "prod_codex-digital" } }] } }, 9900, "fulfilled", null],
  ]) {
    reset(); seed("cs_test_ORDER1", 21500, address === null);
    const r = await deliver(session(over));
    const w = row("cs_test_ORDER1");
    ok(r.status === 200, `${label}: delivered 200`);
    ok(w.amount_cents === cents, `${label}: amount_cents recorded as ${cents} (was 21500 pending)`);
    ok(w.currency === "usd", `${label}: currency recorded as usd`);
    ok(w.status === status, `${label}: status ${status}`);
    if (address) ok(w.shipping_country === address, `${label}: shipping country preserved (${address})`);
    else ok(!w.shipping_country, `${label}: no shipping address written`);
  }

  console.log("\n  2. repeat delivery is idempotent");
  reset(); seed("cs_test_ORDER1", 21500, false);
  const strip = (r) => { const c = { ...r }; delete c.updated_at; return JSON.stringify(c); };
  await deliver(session({ amount_total: 26500 })); const first = strip(row("cs_test_ORDER1"));
  await deliver(session({ amount_total: 26500 })); const second = strip(row("cs_test_ORDER1"));
  ok(rows.size === 1, "repeat: still ONE row");
  ok(first === second, "repeat: row values identical after redelivery (updated_at aside)");
  ok(row("cs_test_ORDER1").amount_cents === 26500, "repeat: total stays 26500 (not doubled, not re-priced)");

  // A shape-valid code is the provider's own value: recorded verbatim, never normalised or guessed.
  reset(); seed("cs_test_ORDER1", 21500, false);
  const unusual = await deliver(session({ amount_total: 24500, currency: "nzd" }));
  ok(unusual.status === 200 && row("cs_test_ORDER1").currency === "nzd", "a shape-valid currency is recorded exactly as sent (nzd)");

  console.log("\n  3. an untrustworthy total cannot produce a paid record");
  for (const [label, over] of [
    ["missing amount_total", { amount_total: null }],
    ["undefined amount_total", { amount_total: undefined }],
    ["zero", { amount_total: 0 }],
    ["negative", { amount_total: -24500 }],
    ["string", { amount_total: "24500" }],
    ["fractional", { amount_total: 24500.5 }],
    ["missing currency", { currency: null }],
    ["uppercase currency", { currency: "USD" }],
    ["padded currency", { currency: "usd " }],
  ]) {
    reset(); seed("cs_test_ORDER1", 21500, false);
    const r = await deliver(session(over));
    const w = row("cs_test_ORDER1");
    ok(r.status === 422 && r.body && r.body.error === "unverifiable_paid_total",
      `${label}: answered 422 (Stripe will retry)`);
    ok(updates.length === 0, `${label}: NO paid update issued`);
    ok(w.status === "pending" && w.amount_cents === 21500, `${label}: row left pending, amount untouched`);
    ok(telegrams.length === 1 && telegrams[0].includes("amount unverified"),
      `${label}: still alerted, and says the amount is unverified`);
  }

  console.log("\n  4. signature verification is intact");
  reset(); seed("cs_test_ORDER1", 21500, false);
  const raw = JSON.stringify({ id: "evt_x", type: "checkout.session.completed", data: { object: session() } });
  const bad = await handler.POST(request(raw, { "stripe-signature": "t=1,v1=" + "0".repeat(64) }));
  ok(bad.status === 400, "forged signature rejected with 400");
  ok(updates.length === 0, "forged signature writes nothing");
  const none = await handler.POST(request(raw, {}));
  ok(none.status === 400, "absent signature rejected with 400");

  console.log("\n  5. preserved behaviours");
  reset(); seed("cs_test_ORDER1", 21500, false);
  const foreign = await deliver(session({ id: "cs_test_NOTOURS", amount_total: 24500 }));
  ok(foreign.status === 200, "a foreign session is still delivered 200");
  ok(updates.some((u) => u.matched === false), "…but no row matched, so nothing was written");
  ok(telegrams[0] && telegrams[0].includes("No matching UT order"), "…and the alert says so rather than claiming an update");

  reset(); seed("cs_test_ORDER1", 21500, false);
  await deliver(session({ metadata: { source: "voa-shop" } }));
  ok(updates.length === 0, "VOA shop sale writes no UT order");
  ok(telegrams.length === 1 && telegrams[0].includes("VOA shop"), "VOA shop sale is still reported");

  console.log("\n  6. an unavailable order store is never acknowledged as success");
  {
    // (a) the store answers with an error
    reset(); seed("cs_test_ORDER1", 21500, false);
    dbError = { message: "connection terminated", code: "57P01" };
    const r = await deliver(session({ amount_total: 24500 }));
    ok(r.status === 503 && r.body && r.body.error === "order_store_unavailable",
      "store error -> 503 order_store_unavailable (Stripe will retry)");
    ok(row("cs_test_ORDER1").status === "pending" && row("cs_test_ORDER1").amount_cents === 21500,
      "store error -> row untouched, never marked paid");
    ok(telegrams.length === 1 && telegrams[0].includes("UT DB update failed"),
      "store error -> alert reports the failure instead of a sale");
    ok(!telegrams[0].includes("✅"), "store error -> alert claims no success");

    // (b) the client cannot even be built: exactly the preview condition (no service-role key)
    reset(); seed("cs_test_ORDER1", 21500, false);
    const savedUrl = process.env.UT_SUPABASE_URL, savedKey = process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
    const r2 = await deliver(session({ amount_total: 24500 }));
    process.env.UT_SUPABASE_URL = savedUrl; process.env.UT_SUPABASE_SERVICE_ROLE_KEY = savedKey;
    ok(r2.status === 503 && r2.body && r2.body.error === "order_store_unavailable",
      "missing credential -> 503, not a silent 200");
    ok(row("cs_test_ORDER1").status === "pending", "missing credential -> row stays pending");

    // (c) a thrown connection failure takes the same path
    reset(); seed("cs_test_ORDER1", 21500, false);
    dbThrow = true;
    let r3; try { r3 = await deliver(session({ amount_total: 24500 })); } catch (e) { r3 = { status: 0, body: { error: "THREW: " + e.message } }; }
    ok(r3.status === 503, "thrown failure -> 503 (no unhandled rejection)");
    ok(row("cs_test_ORDER1").status === "pending", "thrown failure -> row stays pending");
  }

  console.log("\n  7. no studio alert without a token (the preview condition)");
  {
    const { execFileSync } = require("child_process");
    const out = execFileSync(process.execPath, [__filename],
      { env: { ...process.env, BATCH33_NO_TOKEN: "1", AKASHA_BOT_TOKEN: "" }, encoding: "utf8" });
    const line = out.split("\n").find((l) => l.startsWith("NO_TOKEN_RESULT ")) || "";
    const res = line ? JSON.parse(line.slice("NO_TOKEN_RESULT ".length)) : null;
    ok(res && res.telegrams === 0, "fresh process, no AKASHA_BOT_TOKEN -> zero Telegram calls");
    ok(res && res.status === 200, "…the sale is still acknowledged 200");
    ok(res && res.amount === 24500, "…and the total is still recorded");
  }

  console.log("\n  ==================== SUMMARY ====================");
  console.log(`   assertions passed: ${pass}   assertions failed: ${fail}`);
  if (fail) { failures.forEach((f) => console.log("   FAIL " + f)); console.log("   RESULT: FAIL"); process.exit(1); }
  console.log("   RESULT: PASS"); process.exit(0);
})().catch((err) => {
  console.log("\n   CRASH  the suite threw instead of asserting: " + (err && err.message));
  console.log("   RESULT: CRASH (not a failed assertion)");
  process.exit(2);
});
