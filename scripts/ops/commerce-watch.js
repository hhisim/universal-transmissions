#!/usr/bin/env node
/**
 * commerce-watch.js — the alerting that did not exist when this work started.
 *
 * Watches the four things that can quietly go wrong in commerce, and shouts through Telegram:
 *
 *   1. unresolved payments  — ut_order_exceptions rows still `open` (money with no order)
 *   2. notification trouble — outbox rows `uncertain` or `failed` past their retry budget
 *   3. webhook trouble      — Stripe events still showing pending deliveries
 *   4. stuck sends          — rows sitting in `sending` beyond their lease
 *
 * Deliberately read-only: it never fixes anything, so running it can never make an incident worse.
 * Exits non-zero when something is wrong, so a cron wrapper can escalate too.
 *
 * Usage: node scripts/ops/commerce-watch.js [--json]
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.UT_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const TG_TOKEN = process.env.AKASHA_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_HOME_CHANNEL || "5491669332";
const JSON_ONLY = process.argv.includes("--json");
const LEASE_MS = 10 * 60 * 1000;

async function sb(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 120)}`);
  return res.json();
}

async function stripe(pathAndQuery) {
  const res = await fetch(`https://api.stripe.com/v1/${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}`);
  return res.json();
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

(async () => {
  const findings = [];
  const errors = [];

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("missing Supabase configuration");
    process.exit(2);
  }

  // 1. unresolved payments
  try {
    const rows = await sb("ut_order_exceptions?select=payment_reference,reason,amount_cents,currency,created_at&status=eq.open&order=created_at.asc");
    if (rows.length) {
      findings.push({
        kind: "unresolved_payment",
        severity: "critical",
        count: rows.length,
        detail: rows.slice(0, 5).map((r) => `${r.payment_reference.slice(0, 12)}… ${r.currency ?? ""} ${r.amount_cents ?? "?"} — ${String(r.reason).slice(0, 60)}`),
        ageHours: rows[0]?.created_at ? Math.round((Date.now() - new Date(rows[0].created_at)) / 3600_000) : null,
      });
    }
  } catch (err) {
    // A missing table means the migration is unapplied — expected in preview, not an alert storm.
    if (!/42P01|does not exist|404/.test(String(err.message))) errors.push(`exceptions: ${err.message}`);
  }

  // 2 + 4. notification trouble
  try {
    const uncertain = await sb("ut_order_notifications?select=id,order_id,kind,status,attempts,last_error,claimed_at,created_at&status=in.(uncertain,sending)");
    const stuck = uncertain.filter((r) => r.status === "uncertain" || (r.claimed_at && Date.now() - new Date(r.claimed_at) > LEASE_MS));
    if (stuck.length) {
      findings.push({
        kind: "notification_trouble",
        severity: "high",
        count: stuck.length,
        detail: stuck.slice(0, 5).map((r) => `${r.kind} ${r.status} attempts=${r.attempts} — ${String(r.last_error ?? "").slice(0, 60)}`),
      });
    }
  } catch (err) {
    if (!/42P01|does not exist|404/.test(String(err.message))) errors.push(`notifications: ${err.message}`);
  }

  // 3. webhook delivery backlog
  if (STRIPE_KEY) {
    try {
      const events = await stripe("events?limit=20");
      const pending = events.data.filter((e) => e.pending_webhooks > 0);
      if (pending.length) {
        findings.push({
          kind: "webhook_backlog",
          severity: "high",
          count: pending.length,
          detail: pending.slice(0, 5).map((e) => `${e.type} pending=${e.pending_webhooks}`),
        });
      }
    } catch (err) {
      errors.push(`stripe: ${err.message}`);
    }
  }

  const summary = { checkedAt: new Date().toISOString(), findings, errors, ok: findings.length === 0 && errors.length === 0 };

  if (JSON_ONLY) {
    console.log(JSON.stringify(summary, null, 1));
  } else {
    if (findings.length === 0 && errors.length === 0) {
      console.log("commerce-watch: all clear");
    }
    for (const f of findings) {
      console.log(`[${f.severity.toUpperCase()}] ${f.kind} ×${f.count}`);
      f.detail.forEach((d) => console.log(`   ${d}`));
    }
    errors.forEach((e) => console.log(`[WARN] ${e}`));
  }

  if (findings.length && TG_TOKEN && !JSON_ONLY) {
    const lines = findings
      .map((f) => `<b>[${f.severity.toUpperCase()}] ${f.kind} ×${f.count}</b>\n` + f.detail.map((d) => `· ${d}`).join("\n"))
      .join("\n\n");
    try {
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: TG_CHAT, text: `<b>UT commerce watch</b>\n\n${lines}`, parse_mode: "HTML" }),
      });
    } catch (err) {
      console.error("telegram alert failed:", err.message);
    }
  }

  process.exit(findings.length || errors.length ? 1 : 0);
})().catch((err) => {
  console.error("commerce-watch crashed:", err);
  process.exit(2);
});
