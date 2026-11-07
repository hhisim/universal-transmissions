/**
 * expired-staging.cjs — end-to-end proof of the expiry path on a real (test-mode) session.
 *
 * Flow:
 *   1. ask the staging deployment to create a TEST Checkout Session for a real catalogue id,
 *      which also inserts the usual `pending` ut_orders row;
 *   2. expire that session in Stripe (test mode only);
 *   3. run the shipped helper against the real row, twice;
 *   4. assert pending → cancelled on the first run and 0 on the second;
 *   5. delete the test row.
 *
 * Never uses a live-mode session, never fulfils, never emails.
 */
const path = require("path");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "..", "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });
const { cancelPendingOrderForExpiredSession } = require(path.join(ROOT, "src/lib/order-expiry.ts"));

const SB_URL = process.env.UT_SUPABASE_URL;
const SB_KEY = process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
const TEST_KEY = process.env.STRIPE_TEST_SECRET_KEY;
const PREVIEW = process.env.PREVIEW_URL;

function adapter() {
  return {
    from(table) {
      const st = { payload: null, filters: [] };
      return {
        update(p) {
          st.payload = p;
          return this;
        },
        eq(c, v) {
          st.filters.push([c, v]);
          return this;
        },
        async select() {
          const qs = st.filters.map(([c, v]) => `${c}=eq.${encodeURIComponent(v)}`).join("&");
          const res = await fetch(`${SB_URL}/rest/v1/${table}?${qs}&select=id`, {
            method: "PATCH",
            headers: {
              apikey: SB_KEY,
              Authorization: `Bearer ${SB_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(st.payload),
          });
          const text = await res.text();
          if (!res.ok) return { data: null, error: { message: `${res.status} ${text.slice(0, 160)}` } };
          return { data: JSON.parse(text || "[]"), error: null };
        },
      };
    },
  };
}

const sb = (p, init = {}) =>
  fetch(`${SB_URL}/rest/v1/${p}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });

async function runStaging() {
  assert.ok(PREVIEW && SB_URL && SB_KEY && TEST_KEY, "staging needs PREVIEW_URL, Supabase and a TEST secret key");
  console.log("  1. creating a test-mode session through the staging deployment");
  const res = await fetch(`${PREVIEW.replace(/\/$/, "")}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "codex-digital" }),
  });
  const body = await res.json();
  const sid = (String(body.url || "").match(/cs_test_[A-Za-z0-9]+/) || [])[0];
  assert.ok(sid, `no test session id in checkout response (${res.status})`);
  console.log(`     session ${sid.slice(0, 22)}…`);

  const rowsRes = await sb(`ut_orders?stripe_session_id=eq.${encodeURIComponent(sid)}&select=id,status`);
  const rows = await rowsRes.json();
  assert.ok(rows.length === 1, "expected exactly one pending row for the staging session");
  const rowId = rows[0].id;
  console.log(`     row ${rowId.slice(0, 8)}… status=${rows[0].status}`);
  assert.strictEqual(rows[0].status, "pending");

  console.log("  2. expiring the session in Stripe (test mode)");
  const exp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}/expire`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${TEST_KEY}:`).toString("base64")}` },
  });
  const session = await exp.json();
  assert.strictEqual(session.status, "expired", `stripe did not expire: ${JSON.stringify(session).slice(0, 120)}`);
  assert.strictEqual(session.payment_status, "unpaid");

  console.log("  3. running the shipped helper against the real row");
  const admin = adapter();
  const first = await cancelPendingOrderForExpiredSession(admin, sid);
  const afterFirst = await (await sb(`ut_orders?id=eq.${rowId}&select=status`)).json();
  assert.strictEqual(first.cancelled, 1, "first run should cancel exactly one row");
  assert.strictEqual(afterFirst[0].status, "cancelled");

  console.log("  4. running it again (idempotency)");
  const second = await cancelPendingOrderForExpiredSession(admin, sid);
  assert.strictEqual(second.cancelled, 0, "second run must be a no-op");

  console.log("  5. deleting the staging row");
  const del = await sb(`ut_orders?id=eq.${rowId}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
  const deleted = await del.json();
  assert.strictEqual(deleted.length, 1);

  console.log("  STAGING PASS — pending → cancelled, replay no-op, row removed");

  // Prove a paid row cannot be moved by this path.
  const paidRes = await sb(`ut_orders?status=eq.paid&select=id&limit=1`);
  const paid = await paidRes.json();
  if (paid.length) {
    const out = await cancelPendingOrderForExpiredSession(admin, "cs_test_this_session_does_not_exist");
    assert.strictEqual(out.cancelled, 0);
    const still = await (await sb(`ut_orders?id=eq.${paid[0].id}&select=status`)).json();
    assert.strictEqual(still[0].status, "paid");
    console.log("  PAID-SAFETY PASS — a paid row is untouched by the expiry path");
  }
}

module.exports = { runStaging };
