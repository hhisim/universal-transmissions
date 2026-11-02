#!/usr/bin/env node
/**
 * m16-order-identity.js — the customer-email rule, and proof the writer is wired to it.
 *
 * The rule itself is pure, so it is tested directly. The wiring is checked by reading the route:
 * a helper that exists but is not called would leave the defect in place while the unit tests
 * stayed green, which is precisely how the April sale lost its address.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const { pickCustomerEmail, orderNeedsEmail, isSettledPayment } = require(path.join(
  ROOT,
  "src/lib/order-identity.ts"
));

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

// ── 1. Source authority ────────────────────────────────────────────────────
console.log("source authority");
{
  const r = pickCustomerEmail({ customerDetailsEmail: "buyer@example.com", sessionEmail: null });
  check("customer_details.email wins when the legacy field is null", r.email === "buyer@example.com" && r.source === "customer_details.email");
}
{
  const r = pickCustomerEmail({ customerDetailsEmail: "typed@example.com", sessionEmail: "legacy@example.com" });
  check("the address the buyer typed outranks the legacy echo", r.email === "typed@example.com");
}
{
  const r = pickCustomerEmail({ customerDetailsEmail: null, sessionEmail: "legacy@example.com" });
  check("legacy session.customer_email is still used when it is all there is", r.email === "legacy@example.com" && r.source === "session.customer_email");
}
{
  const r = pickCustomerEmail({ billingDetailsEmail: "card@example.com" });
  check("the charge's billing details are the last resort", r.email === "card@example.com" && r.source === "billing_details.email");
}
{
  const r = pickCustomerEmail({ receiptEmail: "receipt@example.com" });
  check("receipt_email is considered", r.email === "receipt@example.com");
}
{
  const r = pickCustomerEmail({});
  check("no source → empty, never a guess", r.email === "" && r.source === "unavailable");
}
{
  const r = pickCustomerEmail({ customerDetailsEmail: "   ", sessionEmail: "  spaced@example.com  " });
  check("values are trimmed", r.email === "spaced@example.com");
}
{
  const r = pickCustomerEmail({ customerDetailsEmail: "not-an-address", sessionEmail: "real@example.com" });
  check("an unusable value falls through to the next source", r.email === "real@example.com");
}

// ── 2. Which orders need an email ──────────────────────────────────────────
console.log("order classification");
check("a paid order without an email needs one", orderNeedsEmail({ status: "paid", customer_email: "" }) === true);
check("a fulfilled order without an email needs one", orderNeedsEmail({ status: "fulfilled", customer_email: null }) === true);
check("a paid order WITH an email needs nothing", orderNeedsEmail({ status: "paid", customer_email: "x@example.com" }) === false);
check("a pending (abandoned) checkout is not a sale", orderNeedsEmail({ status: "pending", customer_email: "" }) === false);

// ── 3. Settled payment ─────────────────────────────────────────────────────
console.log("payment settlement");
check("paid is settled", isSettledPayment("paid") === true);
check("unpaid is NOT settled (async methods complete before they pay)", isSettledPayment("unpaid") === false);
check("no_payment_required is not a card sale", isSettledPayment("no_payment_required") === false);
check("missing status is not settled", isSettledPayment(undefined) === false);

// ── 4. The writer is actually wired to the rule ────────────────────────────
console.log("wiring");
{
  const route = fs.readFileSync(path.join(ROOT, "src/app/api/stripe-webhook/route.ts"), "utf8");
  check("the webhook imports the email rule", /from "@\/lib\/order-identity"/.test(route));
  check("the webhook resolves the email before writing", /const resolvedEmail = await resolveOrderCustomerEmail\(session\)/.test(route));
  check("the row is written with the resolved email", /customer_email: resolvedEmail\.email/.test(route));
  check("the legacy-only expression is gone from the write", !/customer_email: session\.customer_email \|\| session\.customer_details\?\.email \|\| ""/.test(route));
  check("the session's payment status gates the sale", /isSettledPayment\(session\.payment_status\)/.test(route));
  check("the resolver falls back to the payment instrument", /billing_details/.test(route));
}

// ── 5. PayPal path carries the payer address ───────────────────────────────
{
  const capture = fs.readFileSync(path.join(ROOT, "src/app/api/paypal/capture-order/route.ts"), "utf8");
  const writer = fs.readFileSync(path.join(ROOT, "src/lib/order-recording.ts"), "utf8");
  check("PayPal capture reads the payer address", /payer\?\.email_address/.test(capture));
  check("PayPal writer persists that address", /customer_email: record\.email \?\? ""/.test(writer));
}

console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
