#!/usr/bin/env node
/**
 * batch15c-sale-alert-notification.js
 *
 * THE ONE-TIME SALE ALERT NAMES THE REAL PRODUCT AND CLAIMS ONLY WHAT IT PROVED.
 *
 * Grafted onto the Batch 14 hardened webhook without touching its subscription
 * authority. The suite drives the REAL handler; only Stripe and Supabase are
 * mocked (the shared boundary harness), and the outgoing Telegram alert is
 * captured so the suite can assert what the alert *claims*, not just what the
 * code that builds it looks like.
 *
 *   V1  a VOA shop sale names its product and writes NOTHING to ut_orders;
 *   V2  a UT sale with a matching row names the product and claims the write;
 *   V3  a UT sale with NO matching row says so instead of claiming a write;
 *   V4  a failed UT write is reported as failed;
 *   V5  a failed line-item lookup is reported as failed, never as a product;
 *   V6  a failed lookup does not suppress a genuine UT write report;
 *   V7  the Batch 14 authority surface survives the graft (source invariants);
 *   V8  isDigital / order-fulfilment semantics are byte-identical to before.
 */
const path = require("path");
const fs = require("node:fs");
const ROOT = path.resolve(__dirname, "..");

// sendTelegram short-circuits without a token; the harness reads this before it
// loads the handler. Assertions need the alert to actually be built and sent.
process.env.B15C_TELEGRAM_TOKEN = "test-token";

const { createHarness } = require(path.join(ROOT, "scripts/lib/ut-membership-webhook-harness.cjs"));
const ROUTE = path.join(ROOT, "src/app/api/stripe-webhook/route.ts");

let passed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) passed += 1;
  else failures.push(label);
}

function session(overrides = {}) {
  return {
    id: "cs_test_1",
    mode: "payment",
    amount_total: 4900,
    currency: "usd",
    created: 1791900000,
    payment_intent: "pi_test_1",
    customer_email: "buyer@example.com",
    customer_details: { name: "Buyer", email: "buyer@example.com" },
    metadata: {},
    ...overrides,
  };
}

(async () => {
  const h = createHarness(ROOT);
  const { state, reset, nextEvent, post, bodyOf } = h;
  const alert = () => (state.telegrams.length ? state.telegrams[state.telegrams.length - 1].text : "");
  const alertCount = () => state.telegrams.length;
  const orderWrites = () => state.writes.filter((w) => w.table === "ut_orders");

  // ── V1. a VOA shop sale: right product, right source, ZERO UT writes ───────
  reset();
  state.lineItems = [{ description: "VOA — Emerald Tablet print", quantity: 1 }];
  nextEvent("checkout.session.completed", session({ id: "cs_voa_1", metadata: { source: "voa-shop" } }));
  let r = await post();
  let b = await bodyOf(r);
  ok(r.status === 200, "V1 acknowledged (got " + r.status + ")");
  ok(alertCount() === 1, "V1 exactly one alert was sent (got " + alertCount() + ")");
  ok(alert().includes("NEW SALE (VOA shop)"), "V1 the alert is the VOA variant");
  ok(!alert().includes("NEW SALE —"), "V1 it is not also the generic UT variant");
  ok(alert().includes("VOA — Emerald Tablet print ×1"), "V1 the real product name is in the alert");
  ok(alert().includes("no UT order written"), "V1 it states no UT order was written");
  ok(!alert().includes("✅ Order updated in UT DB"), "V1 it does NOT claim a UT write");
  ok(!alert().includes("recorded in VOA DB"), "V1 it does NOT claim VOA persisted the sale");
  ok(alert().includes("not verified here"), "V1 it says VOA recording is unverified here");
  ok(orderWrites().length === 0, "V1 ZERO ut_orders statements were issued (got " + orderWrites().length + ")");
  ok(state.lineItemsCalls === 1, "V1 line items were resolved once (got " + state.lineItemsCalls + ")");

  // ── V2. a UT sale whose session matches a row ─────────────────────────────
  reset();
  state.tables.ut_orders = [{ id: "ord_1", stripe_session_id: "cs_ut_1", status: "pending" }];
  state.lineItems = [{ description: "Chakra 8K poster", quantity: 2 }];
  nextEvent("checkout.session.completed", session({ id: "cs_ut_1" }));
  r = await post();
  b = await bodyOf(r);
  ok(r.status === 200, "V2 acknowledged (got " + r.status + ")");
  ok(alert().includes("Chakra 8K poster ×2"), "V2 the real product name is in the alert");
  ok(!alert().includes("Product: Order"), "V2 it does not fall back to a hardcoded \"Order\"");
  ok(!alert().includes("(VOA shop)"), "V2 a UT sale is not reported as a VOA sale");
  ok(alert().includes("✅ Order updated in UT DB"), "V2 it claims the write it can prove");
  ok(orderWrites().length === 1, "V2 exactly one ut_orders statement (got " + orderWrites().length + ")");
  ok(orderWrites()[0].matched === 1, "V2 that statement matched one row (got " + orderWrites()[0].matched + ")");
  ok(orderWrites()[0].filters.some((f) => f[0] === "stripe_session_id" && f[1] === "cs_ut_1"),
     "V2 it was addressed by the session id");
  ok(orderWrites()[0].payload.status === "paid", "V2 order-fulfilment status is unchanged (got " + orderWrites()[0].payload.status + ")");
  ok(orderWrites()[0].payload.customer_email === "buyer@example.com", "V2 the buyer email is recorded");

  // ── V3. a UT sale whose session matches NOTHING ───────────────────────────
  reset();
  state.lineItems = [{ description: "Signed giclée", quantity: 1 }];
  nextEvent("checkout.session.completed", session({ id: "cs_ut_nomatch" }));
  r = await post();
  b = await bodyOf(r);
  ok(r.status === 200, "V3 acknowledged (got " + r.status + ")");
  ok(alert().includes("Signed giclée ×1"), "V3 the product name is still resolved");
  ok(alert().includes("⚠️ No matching UT order found — nothing written to UT DB"),
     "V3 it reports the zero match honestly");
  ok(!alert().includes("✅ Order updated in UT DB"), "V3 it does NOT claim a write that never happened");
  ok(orderWrites().length === 1 && orderWrites()[0].matched === 0,
     "V3 the statement was issued and matched nothing (got " +
       orderWrites().length + " statements, matched " +
       (orderWrites()[0] ? orderWrites()[0].matched : "n/a") + ")");

  // ── V4. the UT write itself fails ─────────────────────────────────────────
  reset();
  state.lineItems = [{ description: "Festival print", quantity: 1 }];
  state.failUpdate = { ut_orders: "boom" };
  nextEvent("checkout.session.completed", session({ id: "cs_ut_fail" }));
  r = await post();
  b = await bodyOf(r);
  ok(r.status === 200, "V4 acknowledged (got " + r.status + ")");
  ok(alert().includes("❌ UT DB update failed"), "V4 a failed write is reported as failed");
  ok(!alert().includes("✅ Order updated in UT DB"), "V4 it does NOT claim success on failure");

  // ── V5. the line-item lookup fails (VOA sale) ─────────────────────────────
  reset();
  state.lineItemError = new Error("stripe listLineItems unavailable");
  nextEvent("checkout.session.completed", session({ id: "cs_voa_lookupfail", metadata: { source: "voa-shop" } }));
  r = await post();
  b = await bodyOf(r);
  ok(r.status === 200, "V5 a lookup failure does not fail the delivery (got " + r.status + ")");
  ok(alert().includes("— (product lookup failed)"), "V5 the lookup failure is stated, not hidden");
  ok(!alert().includes("Product: Order"), "V5 it does not invent a product name");
  ok(!alert().includes("Product: —\\n"), "V5 it is not silently blank");
  ok(orderWrites().length === 0, "V5 a VOA sale still writes nothing to UT");

  // ── V6. lookup fails, but a genuine UT write must still be reported ───────
  reset();
  state.lineItemError = new Error("stripe listLineItems unavailable");
  state.tables.ut_orders = [{ id: "ord_6", stripe_session_id: "cs_ut_lookupfail", status: "pending" }];
  nextEvent("checkout.session.completed", session({ id: "cs_ut_lookupfail" }));
  r = await post();
  b = await bodyOf(r);
  ok(alert().includes("product lookup failed"), "V6 the lookup failure is still stated");
  ok(alert().includes("✅ Order updated in UT DB"),
     "V6 a lookup failure does not suppress a real write report");

  // ── V7. the Batch 14 authority surface survived the graft ─────────────────
  const src = fs.readFileSync(ROUTE, "utf8");
  const invariants = [
    ["webhooks.constructEvent", "signature verification"],
    ["resolveAuthoritativeSubscription", "subscription authority"],
    ["readStoredLinkage", "verified linkage"],
    ["snapshotLifecycleRows", "pre-Stripe snapshot"],
    ["applyAtomicLifecycleUpdate", "atomic lifecycle write"],
    ["reconciliationStamp", "authority stamp"],
    ["MAX_LIFECYCLE_ATTEMPTS", "bounded retries"],
  ];
  for (const [needle, label] of invariants) {
    ok(src.includes(needle), "V7 preserved: " + label + " (" + needle + ")");
  }
  ok(/\.eq\("stripe_session_id", session\.id\)\s*\n\s*\.select\("id"\)/.test(src),
     "V7 the ut_orders update asks for the affected rows");

  // ── V8. isDigital / order-fulfilment semantics are unchanged ──────────────
  const IS_DIGITAL = [
    "      const isDigital = session.line_items?.data[0]?.price?.product",
    "        ? typeof session.line_items.data[0].price.product === \"string\"",
    "          ? [\"codex-digital\", \"chakra-4k\", \"chakra-8k\"].some(id =>",
    "              session.line_items!.data[0].price!.product!.toString().includes(id) ||",
    "              session.line_items!.data[0].description?.toLowerCase().includes(\"pdf\") ||",
    "              session.line_items!.data[0].description?.toLowerCase().includes(\"loop pack\")",
    "            )",
    "          : !!((session.line_items!.data[0].price!.product as Stripe.Product | null)?.description)",
    "        : false;",
  ].join("\n");
  ok(src.includes(IS_DIGITAL), "V8 the isDigital expression is byte-identical to the pre-change version");
  ok(src.includes("status: isDigital ? \"fulfilled\" : \"paid\""),
     "V8 the fulfilment status expression is unchanged");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) {
    failures.forEach((f) => console.log("  - " + f));
    process.exit(1);
  }
  console.log("\nBATCH15C_SALE_ALERT_NOTIFICATION_TESTS_PASSED");
})().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});
