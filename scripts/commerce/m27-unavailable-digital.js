#!/usr/bin/env node
/**
 * m27-unavailable-digital.js — suspending a product's purchase path.
 *
 * The requirement was explicit: do not rely on hiding the button. These checks call the routes the
 * way a direct POST would, with no browser involved, and prove the refusal happens on the server for
 * BOTH providers — while the listing itself stays intact and physical sales are untouched.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

let passed = 0;
const failures = [];
const check = (n, ok, d) => {
  if (ok) { passed++; console.log("  PASS  " + n); }
  else { failures.push(n + (d ? " — " + d : "")); console.log("  FAIL  " + n + (d ? " — " + d : "")); }
};

const NextRequest = require("next/server").NextRequest;
const post = (body) => new NextRequest("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  const { products } = require(path.join(ROOT, "src/data/products.ts"));
  const digital = products.find((p) => p.id === "codex-digital");
  const physical = products.find((p) => p.id === "codex-physical");

  console.log("the listing is preserved");
  {
    check("the digital product still exists", !!digital);
    check("its price is unchanged", digital?.price === 99, String(digital?.price));
    check("it keeps its images", Array.isArray(digital?.images) && digital.images.length >= 3);
    check("it keeps its description", (digital?.description || "").length > 100);
    check("and is marked unavailable", digital?.available === false);
    check("with a customer-facing explanation", /temporarily unavailable/i.test(digital?.unavailableNote || ""));
    check("physical is still available", physical?.available === true);
  }

  console.log("server-side refusal — card");
  {
    const { POST } = require(path.join(ROOT, "src/app/api/checkout/route.ts"));
    const r = await POST(post({ productId: "codex-digital", country: "US" }));
    const body = await r.json();
    check("a direct POST cannot start a digital checkout", r.status === 409, "status " + r.status);
    check("the refusal is machine-readable", body.code === "UNAVAILABLE", String(body.code));
    check("and explains itself to the buyer", /temporarily unavailable/i.test(body.error || ""));
  }

  console.log("server-side refusal — paypal");
  {
    const { POST } = require(path.join(ROOT, "src/app/api/paypal/create-order/route.ts"));
    const r = await POST(post({ productId: "codex-digital", country: "US" }));
    const body = await r.json();
    check("PayPal is refused too, not just Stripe", r.status === 409, "status " + r.status);
    check("with the same machine-readable code", body.code === "UNAVAILABLE", String(body.code));
  }

  console.log("other products are unaffected");
  {
    const { POST } = require(path.join(ROOT, "src/app/api/checkout/route.ts"));
    const r = await POST(post({ productId: "codex-physical" }));
    check("a physical purchase is not blocked by the availability guard", r.status !== 409, "status " + r.status);
    const unknown = await POST(post({ productId: "no-such-product" }));
    check("an unknown product is still a 404", unknown.status === 404, "status " + unknown.status);
  }

  console.log(`\n${failures.length ? "FAILURES" : "ALL PASS"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
})().catch((e) => { console.error("harness crashed:", e); process.exit(1); });
