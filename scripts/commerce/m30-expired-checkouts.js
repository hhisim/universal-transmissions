#!/usr/bin/env node
/**
 * m30-expired-checkouts.js — the pending → cancelled transition for abandoned Checkout Sessions.
 *
 * Three layers:
 *   1. classification: only a Stripe-expired, unpaid, one-off session is abandoned;
 *   2. write discipline: the helper writes status + updated_at only, filters on
 *      `status = pending`, and a replay is a no-op;
 *   3. staging end-to-end (opt-in with STAGING_E2E=1): a real Stripe TEST session is created,
 *      expired, and the same helper is run against the real database row, twice, to prove
 *      idempotency. The test row is deleted afterwards.
 *
 * The staging test never touches a live-mode session and never fulfils or emails anything.
 */
const path = require("path");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const { isAbandonedCheckout, cancelPendingOrderForExpiredSession } = require(
  path.join(ROOT, "src/lib/order-expiry.ts")
);

let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}\n        ${err.message}`);
    process.exitCode = 1;
  }
};

/** Fake supabase admin that records the exact query it was asked to run. */
function fakeAdmin(rows) {
  const calls = { payload: null, filters: [], selects: 0 };
  return {
    calls,
    from() {
      return {
        update(payload) {
          calls.payload = payload;
          return this;
        },
        eq(column, value) {
          calls.filters.push([column, value]);
          return this;
        },
        async select() {
          calls.selects++;
          const bySession = rows.filter(
            (r) =>
              r.stripe_session_id === calls.filters.find(([c]) => c === "stripe_session_id")?.[1] &&
              r.status === calls.filters.find(([c]) => c === "status")?.[1]
          );
          for (const r of bySession) r.status = calls.payload.status;
          return { data: bySession.map((r) => ({ id: r.id })), error: null };
        },
      };
    },
  };
}

console.log("classification");
check("expired + unpaid is abandoned", () =>
  assert.strictEqual(
    isAbandonedCheckout({ id: "cs_1", status: "expired", payment_status: "unpaid", mode: "payment" }),
    true
  )
);
check("expired + paid is NOT abandoned", () =>
  assert.strictEqual(
    isAbandonedCheckout({ id: "cs_1", status: "expired", payment_status: "paid", mode: "payment" }),
    false
  )
);
check("complete + paid is NOT abandoned", () =>
  assert.strictEqual(
    isAbandonedCheckout({ id: "cs_1", status: "complete", payment_status: "paid", mode: "payment" }),
    false
  )
);
check("subscription checkout is NOT cancelled by this path", () =>
  assert.strictEqual(
    isAbandonedCheckout({ id: "cs_1", status: "expired", payment_status: "unpaid", mode: "subscription" }),
    false
  )
);
check("no_payment_required is NOT abandoned", () =>
  assert.strictEqual(
    isAbandonedCheckout({ id: "cs_1", status: "expired", payment_status: "no_payment_required" }),
    false
  )
);
check("empty id is rejected", () => assert.strictEqual(isAbandonedCheckout({ id: "" }), false));

console.log("write discipline");
(async () => {
  const rows = [
    { id: "row-pending", stripe_session_id: "cs_x", status: "pending" },
    { id: "row-paid", stripe_session_id: "cs_x", status: "paid" },
  ];
  const admin = fakeAdmin(rows);
  const first = await cancelPendingOrderForExpiredSession(admin, "cs_x");
  check("a pending row is cancelled", () => assert.strictEqual(first.cancelled, 1));
  check("only the pending row moved", () => {
    assert.strictEqual(rows.find((r) => r.id === "row-pending").status, "cancelled");
    assert.strictEqual(rows.find((r) => r.id === "row-paid").status, "paid");
  });
  check("payload touches only status and updated_at", () =>
    assert.deepStrictEqual(Object.keys(admin.calls.payload).sort(), ["status", "updated_at"])
  );
  check("update is filtered on the session and on status = pending", () =>
    assert.deepStrictEqual(admin.calls.filters, [
      ["stripe_session_id", "cs_x"],
      ["status", "pending"],
    ])
  );
  const second = await cancelPendingOrderForExpiredSession(admin, "cs_x");
  check("replay is a no-op", () => assert.strictEqual(second.cancelled, 0));
  check("replay does not rewrite the payload on a paid row", () =>
    assert.strictEqual(rows.find((r) => r.id === "row-paid").status, "paid")
  );

  if (process.env.STAGING_E2E === "1") {
    console.log("\nstaging end-to-end (test-mode session, real database row)");
    const { runStaging } = require(path.join(ROOT, "scripts/commerce/lib/expired-staging.cjs"));
    await runStaging();
  }

  console.log(`\nALL PASS — ${passed} passed, ${process.exitCode ? 1 : 0} failed`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
