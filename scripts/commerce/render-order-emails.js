#!/usr/bin/env node
/**
 * render-order-emails.js — write the real email templates to HTML with sample data.
 *
 * Uses the same functions the webhook uses, so what you review is what a customer would receive.
 * Sample data only: no real customer's name, address or email appears here.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const { renderConfirmation, renderPaymentFailed } = require(path.join(ROOT, "src/lib/order-notifications.ts"));

const OUT = process.env.EMAIL_PREVIEW_DIR || "/root/ut-email-previews";
fs.mkdirSync(OUT, { recursive: true });

const sample = {
  id: "9403c334-6a4f-4b31-be46-b6c51d434081",
  product_title: "Universal Transmissions Codex Vol.1 — Physical Edition",
  amount_cents: 24500,
  currency: "usd",
  customer_email: "sample@example.com",
  customer_name: "Sample Buyer",
  shipping_name: "Sample Buyer",
  shipping_address_line1: "1 Example Street",
  shipping_address_line2: "Apt 4",
  shipping_city: "Austin",
  shipping_state: "TX",
  shipping_postal_code: "78701",
  shipping_country: "US",
  is_digital: false,
  status: "paid",
};

const digital = {
  ...sample,
  product_title: "Universal Transmissions Codex Vol.1 — Digital Edition",
  amount_cents: 9900,
  is_digital: true,
  shipping_address_line1: null,
  shipping_address_line2: null,
  shipping_city: null,
  shipping_state: null,
  shipping_postal_code: null,
  shipping_country: null,
};

const jobs = [
  // Physical: item, shipping and total shown separately, from the catalogue rate that was charged.
  ["01-confirmation-physical", renderConfirmation(sample, { shippingCents: 3000 })],
  ["02-confirmation-digital", renderConfirmation(digital)],
  // Failed: an unsettled provider state may claim "nothing charged"; a settled one may not.
  ["03-payment-failed", renderPaymentFailed(sample, { reason: "Your card was declined by the issuer", providerState: "failed" })],
  ["04-payment-failed-settled", renderPaymentFailed(sample, { reason: "Provider state: succeeded", providerState: "succeeded" })],
];

for (const [name, mail] of jobs) {
  const file = path.join(OUT, `${name}.html`);
  fs.writeFileSync(file, mail.html, "utf8");
  console.log(`${name}\n  subject: ${mail.subject}\n  file: ${file}\n  bytes: ${mail.html.length}`);
}
console.log(`\npreviews written to ${OUT}`);
