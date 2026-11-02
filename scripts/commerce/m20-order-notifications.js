#!/usr/bin/env node
/**
 * m20-order-notifications.js — one logical confirmation per purchase, and nothing else.
 *
 * The ledger and Brevo are both faked: this suite is about the RULES, not about either service.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const { notifyOrderConfirmed, renderConfirmation, isConfirmable } = require(path.join(
  ROOT,
  "src/lib/order-notifications.ts"
));

// ── a ledger with just enough behaviour to be honest ───────────────────────
function makeDb(opts = {}) {
  const rows = [];
  return {
    rows,
    from() {
      const state = { op: null, payload: null, filters: [] };
      const api = {
        upsert(row) { state.op = "upsert"; state.payload = row; return api; },
        update(patch) { state.op = "update"; state.payload = patch; return api; },
        select() { state.wantSelect = true; return api; },
        eq(k, v) { state.filters.push([k, v]); return api; },
        limit() { return api; },
        then(res, rej) { return run().then(res, rej); },
      };

      async function run() {
        if (opts.broken) return { data: null, error: { message: "relation does not exist" } };

        if (state.op === "upsert") {
          const exists = rows.some(
            (r) => r.order_id === state.payload.order_id && r.kind === state.payload.kind
          );
          if (exists) return { data: [], error: null };
          const row = { id: "n" + (rows.length + 1), attempts: 1, ...state.payload };
          rows.push(row);
          return { data: [{ id: row.id }], error: null };
        }

        if (state.op === "update") {
          const matches = rows.filter((r) =>
            state.filters.every(([k, v]) => String(r[k]) === String(v))
          );
          matches.forEach((r) => Object.assign(r, state.payload, { attempts: (r.attempts || 1) + (state.payload.status === "sending" ? 1 : 0) }));
          return { data: matches.map((r) => ({ id: r.id })), error: null };
        }

        return { data: rows, error: null };
      }

      return api;
    },
  };
}

function makeFetch(responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const next = responses.shift() ?? { ok: true, messageId: "msg" };
    return {
      ok: !!next.ok,
      status: next.ok ? 201 : 400,
      json: async () => (next.ok ? { messageId: next.messageId } : { message: next.error ?? "rejected" }),
    };
  };
  return { fn, calls };
}

const ORDER = {
  id: "9403c334-6a4f-4b31-be46-b6c51d434081",
  product_title: "Universal Transmissions Codex Vol.1 — Physical Edition",
  amount_cents: 24500,
  currency: "usd",
  customer_email: "buyer@example.com",
  customer_name: "Test Buyer",
  shipping_name: "Test Buyer",
  shipping_address_line1: "1 Test Way",
  shipping_address_line2: null,
  shipping_city: "Austin",
  shipping_state: "TX",
  shipping_postal_code: "78701",
  shipping_country: "US",
  is_digital: false,
  status: "paid",
};

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

(async () => {
  const ON = { ORDER_EMAILS_ENABLED: "true", BREVO_KEY: "test-key" };

  console.log("gating");
  {
    const db = makeDb(); const f = makeFetch([]);
    const r = await notifyOrderConfirmed(ORDER, { db, fetchImpl: f.fn, env: { BREVO_KEY: "test-key" } });
    check("disabled unless ORDER_EMAILS_ENABLED is exactly true", r.sent === false && f.calls.length === 0, r.reason);
  }
  {
    const db = makeDb(); const f = makeFetch([]);
    const r = await notifyOrderConfirmed({ ...ORDER, status: "pending" }, { db, fetchImpl: f.fn, env: ON });
    check("never sent for an unpaid order", r.sent === false && f.calls.length === 0);
  }
  {
    const db = makeDb(); const f = makeFetch([]);
    const r = await notifyOrderConfirmed({ ...ORDER, customer_email: "" }, { db, fetchImpl: f.fn, env: ON });
    check("never sent without an address", r.sent === false && f.calls.length === 0);
  }
  {
    const db = makeDb({ broken: true }); const f = makeFetch([]);
    const r = await notifyOrderConfirmed(ORDER, { db, fetchImpl: f.fn, env: ON });
    check("no ledger (migration not applied) → no email is sent", r.sent === false && f.calls.length === 0, r.reason);
    check("and the reason says the ledger is unavailable", /ledger unavailable/.test(r.reason));
  }

  console.log("exactly once");
  {
    const db = makeDb(); const f = makeFetch([{ ok: true, messageId: "m-1" }, { ok: true, messageId: "m-2" }]);
    const first = await notifyOrderConfirmed(ORDER, { db, fetchImpl: f.fn, env: ON });
    const second = await notifyOrderConfirmed(ORDER, { db, fetchImpl: f.fn, env: ON });
    check("the first delivery sends", first.sent === true);
    check("the retry does NOT send again", second.sent === false && /already sent|in flight/.test(second.reason), second.reason);
    check("exactly one network send happened", f.calls.length === 1, `${f.calls.length} sends`);
    check("the ledger records it as sent", db.rows[0].status === "sent" && db.rows[0].provider_message_id === "m-1");
  }
  {
    const db = makeDb(); const f = makeFetch([]);
    await Promise.all([
      notifyOrderConfirmed(ORDER, { db, fetchImpl: f.fn, env: ON }),
      notifyOrderConfirmed(ORDER, { db, fetchImpl: f.fn, env: ON }),
      notifyOrderConfirmed(ORDER, { db, fetchImpl: f.fn, env: ON }),
    ]);
    check("three concurrent deliveries send exactly once", f.calls.length === 1, `${f.calls.length} sends`);
  }

  console.log("failure and retry");
  {
    const db = makeDb(); const f = makeFetch([{ ok: false, error: "sender not verified" }, { ok: true, messageId: "m-3" }]);
    const first = await notifyOrderConfirmed(ORDER, { db, fetchImpl: f.fn, env: ON });
    check("a rejected send is reported as not sent", first.sent === false);
    check("and is recorded as failed for retry", db.rows[0].status === "failed" && /sender not verified/.test(db.rows[0].last_error || ""));
    const second = await notifyOrderConfirmed(ORDER, { db, fetchImpl: f.fn, env: ON });
    check("a later delivery may reclaim a failed send", second.sent === true);
    check("and the ledger ends sent", db.rows[0].status === "sent");
    check("two network attempts in total", f.calls.length === 2);
  }

  console.log("content");
  {
    const { subject, html, text } = renderConfirmation(ORDER);
    check("subject names the product", /Codex Vol\.1/.test(subject));
    check("html shows the paid total, formatted", /\$245\.00/.test(html));
    check("html shows the shipping address", /Austin/.test(html) && /78701/.test(html));
    check("html carries the order reference", /9403c334/.test(html));
    check("html has no unrendered template syntax", !/\{\{|\}\}/.test(html));
    check("the plain-text alternative is present", /Total paid: \$245\.00/.test(text));
    check("brand survives: dark ground and gold accent", /#030308/.test(html) && /#E7C56B/.test(html));
  }
  {
    const { html } = renderConfirmation({ ...ORDER, customer_name: '<script>alert(1)</script>', shipping_city: 'A&B' });
    check("customer-supplied text is escaped", !/<script>/.test(html) && /&lt;script&gt;/.test(html) && /A&amp;B/.test(html));
  }
  {
    const digital = renderConfirmation({ ...ORDER, is_digital: true, shipping_address_line1: null, shipping_city: null });
    check("a digital order says nothing ships", /digital edition/i.test(digital.html));
  }
  {
    check("a fulfilled physical order is confirmable", isConfirmable({ status: "fulfilled", customer_email: "a@b.com" }) === true);
    check("a pending order is not", isConfirmable({ status: "pending", customer_email: "a@b.com" }) === false);
  }

  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch((err) => { console.error("harness crashed:", err); process.exit(1); });
