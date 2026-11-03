#!/usr/bin/env node
/**
 * m29-live-telegram.js — drive the REAL production webhook handler with a GENUINE Stripe test-mode
 * event, against the real database, with the real Telegram token, so the studio notification is
 * actually sent rather than asserted.
 *
 * This exists because production is configured with the live Stripe key: when a test-mode event
 * arrives there, the handler cannot resolve the PaymentIntent and acknowledges without writing.
 * Running the same handler here, with a test key, exercises the same code path the live event takes.
 *
 * Everything is labelled TEST MODE. The order is removed afterwards.
 */
const path = require("path");
const crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });
const { NextRequest } = require("next/server");

const EVENT_ID = process.env.M29_EVENT_ID;
const STRIPE_KEY = process.env.M29_STRIPE_KEY;
const SECRET = process.env.M29_WEBHOOK_SECRET || "whsec_m29_local";
const SB_URL = process.env.M29_SB_URL;
const SB_KEY = process.env.M29_SB_KEY;

let passed = 0;
const failed = [];
const check = (n, ok, d) => { if (ok) { passed++; console.log("  PASS  " + n); } else { failed.push(n); console.log("  FAIL  " + n + (d ? " — " + d : "")); } };

async function sb(q) {
  const r = await fetch(`${SB_URL}/rest/v1/${q}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

(async () => {
  console.log("genuine event");
  const er = await fetch(`https://api.stripe.com/v1/events/${EVENT_ID}`, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
  if (!er.ok) { console.error("could not fetch event:", er.status, (await er.text()).slice(0, 200)); process.exit(1); }
  const event = await er.json();
  check("the event came from Stripe, not from a fixture", /^evt_/.test(event.id) && event.type === "checkout.session.completed");
  check("it is test mode, not live", event.livemode === false, String(event.livemode));
  const sessionId = event.data.object.id;
  console.log("    event:", event.id, "| session:", sessionId, "| amount:", event.data.object.amount_total);

  /* A replay must not be able to duplicate anything, so start from a clean slate for this session. */
  const existing = await sb(`ut_orders?select=id&stripe_session_id=eq.${sessionId}`);
  for (const row of existing || []) await fetch(`${SB_URL}/rest/v1/ut_orders?id=eq.${row.id}`, { method: "DELETE", headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });

  const { POST } = require(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"));

  async function deliver(label) {
    const body = JSON.stringify(event);
    const t = Math.floor(Date.now() / 1000);
    const v1 = crypto.createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex");
    const req = new NextRequest("http://x/api/stripe-webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${v1}` },
      body,
    });
    const res = await POST(req);
    const text = await res.text();
    console.log(`    ${label}: HTTP ${res.status} ${text.slice(0, 120)}`);
    return { status: res.status, text };
  }

  console.log("first delivery");
  const first = await deliver("delivery 1");
  check("the handler accepts the genuine event", first.status === 200, String(first.status));

  const rows = await sb(`ut_orders?select=id,status,is_digital,amount_cents,currency,customer_email,product_title,notes&stripe_session_id=eq.${sessionId}`);
  check("an order was persisted", Array.isArray(rows) && rows.length === 1, JSON.stringify(rows).slice(0, 200));
  if (Array.isArray(rows) && rows.length) {
    const o = rows[0];
    check("recorded as paid, never fulfilled", o.status === "paid", o.status);
    check("marked digital", o.is_digital === true);
    check("the amount is the real $99", o.amount_cents === 9900 && o.currency === "usd", `${o.amount_cents} ${o.currency}`);
    check("the buyer email came from Stripe", /@/.test(o.customer_email || ""), o.customer_email);
    console.log("    order:", o.id.slice(0, 8), "| status:", o.status, "| email:", o.customer_email);
  }

  console.log("duplicate delivery");
  const second = await deliver("delivery 2 (replay)");
  const rows2 = await sb(`ut_orders?select=id,status&stripe_session_id=eq.${sessionId}`);
  check("a replayed webhook does not create a second order", Array.isArray(rows2) && rows2.length === 1, JSON.stringify(rows2).slice(0, 160));
  check("the handler answers the replay", second.status === 200, String(second.status));

  console.log(`\n${failed.length ? "FAILURES" : "ALL PASS"} — ${passed} passed, ${failed.length} failed`);
  console.log("ORDER_ID=" + (rows && rows[0] ? rows[0].id : ""));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("harness crashed:", e); process.exit(1); });
