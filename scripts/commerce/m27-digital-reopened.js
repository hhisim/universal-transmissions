#!/usr/bin/env node
/**
 * m27-digital-reopened.js — the $99 digital edition is for sale again, with manual delivery.
 *
 * Replaces the previous suspension suite. The suspension guard still exists in both checkout routes
 * but is data-driven (`product.available`), so reopening must be proven from the data the routes
 * read — not by firing a real Checkout session, which would charge-capable traffic in production.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

let passed = 0;
const failures = [];
const check = (n, ok, d) => {
  if (ok) { passed++; console.log("  PASS  " + n); }
  else { failures.push(n + (d ? " — " + d : "")); console.log("  FAIL  " + n + (d ? " — " + d : "")); }
};

const { products } = require(path.join(ROOT, "src/data/products.ts"));
const digital = products.find((p) => p.id === "codex-digital");
const physical = products.find((p) => p.id === "codex-physical");
const desc = digital?.description || "";

console.log("the digital edition is for sale");
{
  check("the product exists", !!digital);
  check("it is available again", digital?.available === true, String(digital?.available));
  check("the price is still $99", digital?.price === 99, String(digital?.price));
  check("it keeps its artwork", Array.isArray(digital?.images) && digital.images.length >= 3);
  check("it keeps its identity", /Universal Transmissions Codex/i.test(digital?.title || ""));
}

console.log("the customer is told how delivery works");
{
  check("no instant-download promise", !/instant download/i.test(desc), desc.slice(0, 80));
  check("delivery is personal", /personally/i.test(desc));
  check("the page states it again at checkout", /Delivered personally/i.test(digital?.deliveryNote || ""));
  check("the description names the real edition", /156 pages/i.test(desc));
}

console.log("both providers read the same flag");
{
  const checkout = fs.readFileSync(path.join(ROOT, "src/app/api/checkout/route.ts"), "utf8");
  const paypal = fs.readFileSync(path.join(ROOT, "src/app/api/paypal/create-order/route.ts"), "utf8");
  check("Stripe refuses only when the product is unavailable", /available\s*===\s*false/.test(checkout));
  check("PayPal refuses on the same condition", /available\s*===\s*false/.test(paypal));
  check("neither hardcodes the digital product", !/codex-digital["']?\s*\)\s*\{?\s*return.*UNAVAILABLE/i.test(checkout));
}

console.log("manual delivery stays manual");
{
  const fulfil = fs.readFileSync(path.join(ROOT, "src/app/api/admin/orders/[id]/fulfil/route.ts"), "utf8");
  check("fulfilment requires a paid order", /status\s*!==\s*"paid"/.test(fulfil));
  check("fulfilment requires the studio secret", /ADMIN_FULFILMENT_KEY/.test(fulfil));
  check("fulfilment is idempotent", /alreadyFulfilled/.test(fulfil));
  const noDownload = !fs.existsSync(path.join(ROOT, "src/app/api/orders/[id]/download/route.ts"));
  check("no automated download route exists", noDownload);
}

console.log("physical sales are untouched");
{
  check("physical is still available", physical?.available === true);
  check("physical keeps its own price", typeof physical?.price === "number" && physical.price > 0);
}

console.log(`\n${failures.length ? "FAILURES" : "ALL PASS"} — ${passed} passed, ${failures.length} failed`);
if (failures.length) failures.forEach((f) => console.log("  - " + f));
process.exit(failures.length ? 1 : 0);
