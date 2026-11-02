#!/usr/bin/env node
/**
 * reconcile-order-email.js — recover customer emails for real sales from VERIFIED provider data.
 *
 * The April 2026 sale was recorded with `customer_email: ""` because the writer of the day read only
 * `session.customer_email`, a field Stripe leaves null; the address the buyer typed lives in
 * `customer_details.email` and on the charge's billing details. This script finds sales that lost
 * their email and asks Stripe for the address that was actually supplied.
 *
 * Rules that make it safe to run against production:
 *   · DRY RUN by default. Nothing is written unless --apply is passed.
 *   · It only ever fills an EMPTY email. A non-empty value is reported, never overwritten.
 *   · It only proposes an address that Stripe itself records for that payment; if Stripe has no
 *     address, the order is reported as unresolved. No address is ever inferred or constructed.
 *   · It only considers orders whose payment Stripe confirms as settled (`payment_status: paid`).
 *   · PayPal rows are reported separately: they need a PayPal lookup, and are not guessed at here.
 *   · Re-running is a no-op once the values have been written.
 *
 * Usage:
 *   node scripts/commerce/reconcile-order-email.js            # report only
 *   node scripts/commerce/reconcile-order-email.js --apply    # fill empty emails
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const APPLY = process.argv.includes("--apply");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.UT_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase admin configuration (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(2);
}
if (!STRIPE_KEY) {
  console.error("Missing STRIPE_SECRET_KEY — cannot verify provider data.");
  process.exit(2);
}

const { pickCustomerEmail } = require(path.join(ROOT, "src/lib/order-identity.ts"));

async function sb(pathAndQuery, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

async function stripe(pathAndQuery) {
  const res = await fetch(`https://api.stripe.com/v1/${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Ask Stripe for the address it holds for this checkout session. */
async function emailFromStripe(sessionId) {
  const session = await stripe(`checkout/sessions/${encodeURIComponent(sessionId)}`);
  const settled = session.payment_status === "paid";
  const direct = pickCustomerEmail({
    customerDetailsEmail: session.customer_details?.email,
    sessionEmail: session.customer_email,
  });
  if (direct.email) return { ...direct, settled, session };

  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!piId) return { ...direct, settled, session };

  const pi = await stripe(`payment_intents/${encodeURIComponent(piId)}?expand[]=latest_charge`);
  const charge = typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  const fromInstrument = pickCustomerEmail({
    customerDetailsEmail: session.customer_details?.email,
    sessionEmail: session.customer_email,
    billingDetailsEmail: charge?.billing_details?.email,
    receiptEmail: pi.receipt_email,
  });
  return { ...fromInstrument, settled, session, paymentIntent: pi };
}

(async () => {
  const orders = await sb("ut_orders?select=*&order=created_at.asc");
  const sales = orders.filter((o) => ["paid", "fulfilled"].includes((o.status || "").toLowerCase()));
  const missing = sales.filter((o) => !(o.customer_email || "").trim());

  console.log(`mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`orders: ${orders.length} · sales (paid/fulfilled): ${sales.length} · sales missing email: ${missing.length}\n`);

  const proposals = [];
  for (const order of missing) {
    const ref = order.stripe_session_id || "";
    if (ref.startsWith("paypal:")) {
      console.log(`- ${order.id} paypal:${ref.slice(7)} → needs a PayPal lookup (not attempted here)`);
      continue;
    }
    let result;
    try {
      result = await emailFromStripe(ref);
    } catch (err) {
      console.log(`- ${order.id} ${ref.slice(0, 20)} → Stripe lookup failed: ${String(err.message).slice(0, 80)}`);
      continue;
    }
    const paidTotal = result.session?.amount_total;
    const paidCurrency = result.session?.currency;
    const amountMismatch = typeof paidTotal === "number" && paidTotal !== order.amount_cents;
    const currencyMismatch = paidCurrency && paidCurrency !== order.currency;

    if (!result.settled) {
      console.log(`- ${order.id} ${ref.slice(0, 20)} → NOT SETTLED at Stripe (payment_status=${result.session?.payment_status}); not a sale, left alone`);
      continue;
    }
    if (!result.email) {
      console.log(`- ${order.id} ${ref.slice(0, 20)} → Stripe holds NO address for this payment; unresolved, nothing written`);
      continue;
    }
    console.log(
      `- ${order.id} ${ref.slice(0, 20)} → email ${result.email} (source: ${result.source})` +
        (amountMismatch ? ` · amount recorded ${order.amount_cents} vs paid ${paidTotal}` : "") +
        (currencyMismatch ? ` · currency recorded ${order.currency ?? "null"} vs ${paidCurrency}` : "")
    );
    proposals.push({ order, email: result.email, source: result.source, paidTotal, paidCurrency });
  }

  console.log(`\nproposals: ${proposals.length}`);
  if (!APPLY) {
    console.log("dry run — nothing written. Re-run with --apply to fill empty emails from these verified values.");
    return;
  }

  for (const p of proposals) {
    const updated = await sb(`ut_orders?id=eq.${encodeURIComponent(p.order.id)}&customer_email=eq.`, {
      method: "PATCH",
      body: JSON.stringify({ customer_email: p.email, updated_at: new Date().toISOString() }),
    });
    if (Array.isArray(updated) && updated.length === 1 && updated[0].customer_email === p.email) {
      console.log(`  wrote ${p.email} to order ${p.order.id}`);
    } else {
      console.log(`  NOT written for ${p.order.id} — the row changed or already had a value (no overwrite)`);
    }
  }
})().catch((err) => {
  console.error("reconciliation failed:", err);
  process.exit(1);
});
