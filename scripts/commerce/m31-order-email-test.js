#!/usr/bin/env node
/**
 * m31-order-email-test.js — controlled validation of the shipped order-confirmation path.
 *
 * What it proves, using the real modules and the real provider:
 *   1. nothing sends while ORDER_EMAILS_ENABLED is not "true";
 *   2. with the gate on, exactly one confirmation is queued and sent for an order;
 *   3. a second call for the same order does not send again (outbox idempotency);
 *   4. the message reaches the provider (Brevo message id recorded).
 *
 * It never fulfils, never ships, and never touches a real customer order: it inserts a synthetic
 * `ut_orders` row addressed to a controlled inbox, then deletes that row and its outbox rows.
 *
 * Required env:
 *   UT_SUPABASE_URL, UT_SUPABASE_SERVICE_ROLE_KEY, BREVO_KEY, TEST_INBOX
 */
const path = require("path");
const crypto = require("crypto");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const { createClient } = require(path.join(ROOT, "node_modules/@supabase/supabase-js"));
const { notifyOrderConfirmed } = require(path.join(ROOT, "src/lib/order-notifications.ts"));

const URL_ = process.env.UT_SUPABASE_URL;
const KEY = process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
const BREVO = process.env.BREVO_KEY || process.env.BREVO_API_KEY;
const INBOX = process.env.TEST_INBOX;

(async () => {
  assert.ok(URL_ && KEY && BREVO && INBOX, "need UT_SUPABASE_URL, service key, BREVO_KEY, TEST_INBOX");
  const db = createClient(URL_, KEY, { auth: { persistSession: false } });
  const id = crypto.randomUUID();
  const session = `test_email_validation_${Date.now()}`;

  console.log("1. inserting a synthetic PAID order (no fulfilment)");
  const { error: insErr } = await db.from("ut_orders").insert({
    id,
    status: "paid",
    product_id: "codex-digital",
    product_title: "TEST — order email validation (do not fulfil)",
    amount_cents: 9900,
    currency: "usd",
    customer_email: INBOX,
    customer_name: "Order Email Validation",
    is_digital: true,
    stripe_session_id: session,
    notes: "Synthetic order created by m31 to validate the confirmation email. Delete after the test.",
  });
  assert.ok(!insErr, `insert failed: ${insErr?.message}`);

  try {
    console.log("2. gate OFF — expect no send");
    const off = await notifyOrderConfirmed(
      { id, product_title: null, amount_cents: 9900, currency: "usd", customer_email: INBOX, customer_name: null,
        shipping_name: null, shipping_address_line1: null, shipping_address_line2: null, shipping_city: null,
        shipping_state: null, shipping_postal_code: null, shipping_country: null, is_digital: true, status: "paid" },
      { db, fetchImpl: fetch, env: { ORDER_EMAILS_ENABLED: "false", BREVO_KEY: BREVO } }
    );
    assert.strictEqual(off.sent, false);
    assert.match(off.reason, /disabled/i);
    console.log(`   gate OFF → ${off.reason}`);

    console.log("3. gate ON — send once");
    const first = await notifyOrderConfirmed(
      { id, product_title: null, amount_cents: 9900, currency: "usd", customer_email: INBOX, customer_name: null,
        shipping_name: null, shipping_address_line1: null, shipping_address_line2: null, shipping_city: null,
        shipping_state: null, shipping_postal_code: null, shipping_country: null, is_digital: true, status: "paid" },
      { db, fetchImpl: fetch, env: { ORDER_EMAILS_ENABLED: "true", BREVO_KEY: BREVO } }
    );
    console.log(`   result: ${JSON.stringify(first)}`);
    assert.strictEqual(first.sent, true, `expected a send, got ${JSON.stringify(first)}`);

    const { data: outbox } = await db
      .from("ut_order_notifications")
      .select("id,kind,status,provider_message_id,attempts")
      .eq("order_id", id);
    console.log(`   outbox rows: ${JSON.stringify(outbox)}`);
    assert.strictEqual(outbox.length, 1, "exactly one outbox row expected");
    assert.ok(outbox[0].provider_message_id, "provider message id should be recorded");

    console.log("4. replay — expect no second send");
    const second = await notifyOrderConfirmed(
      { id, product_title: null, amount_cents: 9900, currency: "usd", customer_email: INBOX, customer_name: null,
        shipping_name: null, shipping_address_line1: null, shipping_address_line2: null, shipping_city: null,
        shipping_state: null, shipping_postal_code: null, shipping_country: null, is_digital: true, status: "paid" },
      { db, fetchImpl: fetch, env: { ORDER_EMAILS_ENABLED: "true", BREVO_KEY: BREVO } }
    );
    const { data: outbox2 } = await db
      .from("ut_order_notifications").select("id,status,provider_message_id").eq("order_id", id);
    console.log(`   replay: ${JSON.stringify(second)} · outbox rows now ${outbox2.length}`);
    assert.strictEqual(outbox2.length, 1, "replay must not create a second row");
    assert.strictEqual(second.sent, false, "replay must not send");

    console.log(`\nB2 PASS — one send to ${INBOX}, provider id ${outbox[0].provider_message_id}, replay suppressed`);
  } finally {
    console.log("5. cleanup — removing the synthetic order and its outbox rows");
    await db.from("ut_order_notifications").delete().eq("order_id", id);
    await db.from("ut_orders").delete().eq("id", id);
    const { data: left } = await db.from("ut_orders").select("id").eq("id", id);
    assert.strictEqual(left.length, 0, "synthetic order should be gone");
    console.log("   cleaned");
  }
})().catch((err) => {
  console.error("B2 FAIL —", err.message);
  process.exit(1);
});
