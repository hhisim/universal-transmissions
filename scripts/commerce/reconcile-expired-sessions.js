#!/usr/bin/env node
/**
 * reconcile-expired-sessions.js — close `pending` orders whose Stripe Checkout Session expired.
 *
 * Why this exists: checkout inserts a `ut_orders` row at session creation (`pending`) so a paid
 * webhook always has something to update. Abandoned carts leave those rows behind, and Stripe's
 * `checkout.session.expired` event only starts closing them from the moment the handler ships.
 * Historical rows need a one-off pass.
 *
 * Safety rules, enforced in code and not by convention:
 *   · only rows currently `pending` are loaded;
 *   · a row is a candidate only when Stripe itself reports `status: expired` and a payment_status
 *     that is neither `paid` nor `no_payment_required`;
 *   · the write is the shared helper (`cancelPendingOrderForExpiredSession`), which filters on
 *     `status = pending` — so a replay, a concurrent webhook, or a second run cannot double-apply,
 *     and a paid/fulfilled row can never be moved backwards;
 *   · nothing is fulfilled, shipped or emailed; the helper writes only status and updated_at.
 *
 * Usage:
 *   node scripts/commerce/reconcile-expired-sessions.js            # dry run (default)
 *   node scripts/commerce/reconcile-expired-sessions.js --apply    # perform the update
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const { isAbandonedCheckout, cancelPendingOrderForExpiredSession } = require(
  path.join(ROOT, "src/lib/order-expiry.ts")
);

const SB_URL = process.env.UT_SUPABASE_URL;
const SB_KEY = process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_LIVE = process.env.STRIPE_SECRET_KEY;
const STRIPE_TEST = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST;
const APPLY = process.argv.includes("--apply");
const REPORT = (() => {
  const i = process.argv.indexOf("--report");
  return i > -1 ? process.argv[i + 1] : null;
})();

if (!SB_URL || !SB_KEY) {
  console.error("Missing UT_SUPABASE_URL / UT_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

/** Minimal supabase-compatible admin adapter over PostgREST (update → eq,eq → select). */
function adminAdapter() {
  return {
    from(table) {
      const state = { table, payload: null, filters: [] };
      return {
        update(payload) {
          state.payload = payload;
          return this;
        },
        eq(column, value) {
          state.filters.push([column, value]);
          return this;
        },
        async select() {
          const qs = state.filters
            .map(([c, v]) => `${encodeURIComponent(c)}=eq.${encodeURIComponent(v)}`)
            .join("&");
          const res = await fetch(`${SB_URL}/rest/v1/${state.table}?${qs}&select=id`, {
            method: "PATCH",
            headers: {
              apikey: SB_KEY,
              Authorization: `Bearer ${SB_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(state.payload),
          });
          const text = await res.text();
          if (!res.ok) return { data: null, error: { message: `${res.status} ${text.slice(0, 200)}` } };
          return { data: JSON.parse(text || "[]"), error: null };
        },
      };
    },
  };
}

async function listPending() {
  const url =
    `${SB_URL}/rest/v1/ut_orders?select=id,status,stripe_session_id,amount_cents,product_id,created_at` +
    `&status=eq.pending&stripe_session_id=not.is.null&order=created_at.asc`;
  const res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!res.ok) throw new Error(`list pending failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function stripeSession(id) {
  const key = id.startsWith("cs_test_") ? STRIPE_TEST : STRIPE_LIVE;
  if (!key) return { error: "no key for session prefix" };
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
  });
  if (!res.ok) return { error: `${res.status}` };
  return { session: await res.json() };
}

(async () => {
  const pending = await listPending();
  const candidates = [];
  const skipped = [];
  for (const row of pending) {
    const id = row.stripe_session_id;
    const got = await stripeSession(id);
    if (got.error) {
      skipped.push({ id: row.id, session: id, reason: `stripe_error:${got.error}` });
      continue;
    }
    if (!isAbandonedCheckout(got.session)) {
      skipped.push({
        id: row.id,
        session: id,
        reason: `not_abandoned:${got.session.status}/${got.session.payment_status}`,
      });
      continue;
    }
    candidates.push({
      id: row.id,
      session: id,
      amount_cents: row.amount_cents,
      product_id: row.product_id,
      created_at: row.created_at,
      stripe_status: got.session.status,
      stripe_payment_status: got.session.payment_status,
    });
  }

  const result = {
    mode: APPLY ? "apply" : "dry-run",
    scanned_pending: pending.length,
    candidates: candidates.length,
    candidates_by_product: candidates.reduce((acc, c) => {
      acc[c.product_id] = (acc[c.product_id] || 0) + 1;
      return acc;
    }, {}),
    skipped: skipped.length,
    skipped_detail: skipped.slice(0, 10),
    cancelled: 0,
    cancelled_ids: [],
    apply_errors: [],
  };

  if (APPLY) {
    const admin = adminAdapter();
    for (const c of candidates) {
      try {
        const out = await cancelPendingOrderForExpiredSession(admin, c.session);
        result.cancelled += out.cancelled;
        result.cancelled_ids.push(...out.ids);
        if (out.cancelled === 0) {
          result.apply_errors.push({ session: c.session, note: "already closed or no longer pending" });
        }
      } catch (err) {
        result.apply_errors.push({ session: c.session, error: String(err).slice(0, 160) });
      }
    }
  }

  console.log(JSON.stringify(result, null, 2));
  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ result, candidates }, null, 2));
  if (!APPLY) console.log("\nDry run only. Re-run with --apply to write.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
