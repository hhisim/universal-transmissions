#!/usr/bin/env node
/**
 * batch32-shipping.js
 *
 * RECONCILING CODEX SHIPPING — what the three definitions actually say, and the guarantees that
 * must hold whichever one the owner chooses.
 *
 * This suite does NOT assert that any particular rate is correct. It asserts:
 *   - the policy table records the rates exactly as the code and the page already state them;
 *   - the Stripe session is unchanged by the move to that table;
 *   - digital purchases never acquire a shipping charge or a delivery requirement, on either
 *     provider — the control that must survive any future shipping change;
 *   - the disagreements are still visible rather than quietly resolved.
 *
 * The request assertions run the SHIPPED route handlers with the provider stubbed, so they check
 * the parameters the routes really build and create no live session.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = fs.readFileSync(m.filename, "utf8"); };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".jpeg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

const S = require(path.join(ROOT, "src/data/shipping.ts"));
const { products } = require(path.join(ROOT, "src/data/products.ts"));

let pass = 0, fail = 0;
const failures = [];
const ok = (c, m) => { if (c) { pass += 1; console.log("    ok   " + m); } else { fail += 1; failures.push(m); console.log("    FAIL " + m); } };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

(async () => {
  /* ── 1. the definitions as they stand ───────────────────────────────────── */
  console.log("\n  1. the three definitions");
  {
    ok(S.SHIPPING_POLICY_STATE === "unreconciled", "1 the policy is recorded as unreconciled, not decided here");
    ok(S.flatShippingCents("codex-physical") === 3000, "1 Stripe charges the Codex $30 flat");
    ok(S.flatShippingCents("hexahedron-cube") === 2000, "1 …and the cube $20 flat");
    ok(S.shippingLabel("codex-physical") === "Standard Shipping", "1 the Codex charge is named Standard Shipping");
    ok(S.shippingLabel("hexahedron-cube") === "Worldwide Shipping", "1 …and the cube's Worldwide Shipping");

    const zones = S.STATED_ZONE_RATES["codex-physical"];
    const worldwide = zones.find((z) => z.countries === "worldwide");
    const auasia = zones.find((z) => z.zone === "AU/Asia");
    ok(worldwide.cents === 3000 && worldwide.appliedByProviders === true, "1 the worldwide zone is $30 and is applied");
    ok(Boolean(auasia) && auasia.cents === 5000, "1 the page states an AU/Asia rate of $50");
    ok(auasia.appliedByProviders === false, "1 …which NO provider applies — the disagreement is recorded, not hidden");
    ok(S.STATED_ZONE_RATES["hexahedron-cube"].length === 1, "1 the cube states one zone only");

    /* the page's own rule, available for the day it is settled */
    ok(S.statedZoneRateCents("codex-physical", "AU") === 5000, "1 the stated rate for AU is $50");
    ok(S.statedZoneRateCents("codex-physical", "JP") === 5000, "1 …and for JP");
    ok(S.statedZoneRateCents("codex-physical", "DE") === 3000, "1 …while DE falls to the worldwide rate");
    ok(S.statedZoneRateCents("codex-physical", "au") === 5000, "1 …matched case-insensitively");
    ok(S.statedZoneRateCents("codex-digital", "AU") === null, "1 a digital product states no zone at all");
  }

  /* ── 2. the product-page sentence comes from the table ──────────────────── */
  console.log("\n  2. what the page prints");
  {
    ok(S.shippingNote("codex-physical") === "$30 worldwide (AU/Asia $50) · Ships within 10 days",
      `2 the Codex sentence is unchanged: "${S.shippingNote("codex-physical")}"`);
    ok(S.shippingNote("hexahedron-cube") === "$20 worldwide · Requires personal inspection & signing of Certificate of Authenticity",
      "2 …and so is the cube's");
    ok(S.shippingNote("codex-digital") === null, "2 a digital edition prints no shipping sentence");
    for (const id of ["codex-digital", "chakra-4k", "chakra-8k"]) {
      ok(S.shippingNote(id) === null, `2 ${id} has no delivery requirement`);
    }

    const page = read("src/app/sanctum/[slug]/page.tsx");
    ok(/shippingNote\(p\.id\)/.test(page), "2 the product page renders the table's sentence");
    ok(!/\$30 worldwide/.test(page) && !/\$20 worldwide/.test(page),
      "2 …and no rate is typed into the page any more");
    ok(/\{shippingNote\(p\.id\) && \(/.test(page), "2 the block appears exactly when the product ships");
    ok((page.match(/Shipping info for physical items/g) || []).length === 1,
      "2 …in one block, not one per product");
  }

  /* ── 3. which products ship ─────────────────────────────────────────────── */
  console.log("\n  3. physical and digital stay distinct");
  {
    const shipping = products.filter((p) => S.requiresShipping(p.id)).map((p) => p.id).sort();
    ok(JSON.stringify(shipping) === JSON.stringify(["codex-physical", "hexahedron-cube"]),
      `3 exactly the two physical products ship (${shipping.join(", ")}) — nothing gained or lost shipping`);
    const digital = products.filter((p) => !S.requiresShipping(p.id)).map((p) => p.id).sort();
    ok(digital.length === 3 && digital.includes("codex-digital"),
      `3 …and the other ${digital.length} are digital: ${digital.join(", ")}`);
    ok(S.requiresShipping("codex-digital") === false, "3 the digital edition requires no shipping");
    ok(S.STATED_ZONE_RATES["codex-digital"] === undefined, "3 …and has no zone rates");
    let threw = false;
    try { S.flatShippingCents("codex-digital"); } catch { threw = true; }
    ok(threw, "3 asking a digital product for a shipping rate throws rather than returning a number");
  }

  /* ── 4. the Stripe session, from the shipped route ──────────────────────── */
  console.log("\n  4. the Stripe session the route builds");
  {
    process.env.STRIPE_SECRET_KEY = "sk_test_stub";
    let captured = null;
    global.fetch = async (url, opts = {}) => {
      if (/api\.stripe\.com\/v1\/checkout\/sessions/.test(String(url))) {
        captured = new URLSearchParams(String(opts.body || ""));
        return { ok: true, status: 200, json: async () => ({ url: "https://checkout.stripe.com/stub" }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    };
    const route = require(path.join(ROOT, "src/app/api/checkout/route.ts"));
    const run = async (productId) => {
      captured = null;
      const res = await route.POST({ json: async () => ({ productId }) });
      return { status: res.status, params: captured, body: await res.json() };
    };
    const g = (p, k) => (p ? p.get(k) : null);

    for (const [id, price, ship] of [["codex-physical", 21500, 3000], ["hexahedron-cube", 10900, 2000]]) {
      const r = await run(id);
      const p = r.params;
      ok(r.status === 200, `4 ${id}: the session is created`);
      ok(g(p, "line_items[0][price_data][unit_amount]") === String(price),
        `4 ${id}: the book costs $${Number(price) / 100}`);
      ok(g(p, "shipping_options[0][shipping_rate_data][fixed_amount][amount]") === String(ship),
        `4 ${id}: shipping is $${Number(ship) / 100}, from the table`);
      ok(g(p, "shipping_options[0][shipping_rate_data][fixed_amount][currency]") === "usd",
        `4 ${id}: shipping is charged in USD`);
      ok(g(p, "shipping_options[0][shipping_rate_data][display_name]") === S.shippingLabel(id),
        `4 ${id}: the charge carries the table's name`);
      ok(g(p, "shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]") === "5" &&
         g(p, "shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]") === "21",
        `4 ${id}: the advertised window is unchanged (5–21 business days)`);
      ok(g(p, "line_items[0][quantity]") === "1", `4 ${id}: one item`);
    }

    /* the digital control: no shipping option may appear at all */
    for (const id of ["codex-digital", "chakra-4k", "chakra-8k"]) {
      const r = await run(id);
      const p = r.params;
      const hasShipping = p ? [...p.keys()].some((k) => k.startsWith("shipping_options")) : false;
      ok(r.status === 200 && !hasShipping, `4 ${id}: NO shipping option is added (digital)`);
      ok(g(p, "line_items[0][price_data][unit_amount]") === String(products.find((x) => x.id === id).price * 100),
        `4 ${id}: the total is the product price alone`);
    }

    const r = await run("codex-physical");
    ok(![...r.params.keys()].some((k) => k.includes("shipping_address_collection")),
      "4 GAP recorded: the session still collects no delivery address for a physical order");
  }

  /* ── 5. the PayPal order, from the shipped route ────────────────────────── */
  console.log("\n  5. the PayPal order the route builds");
  {
    process.env.PAYPAL_CLIENT_ID = "stub-id";
    process.env.PAYPAL_CLIENT_SECRET = "stub-secret";
    let order = null;
    global.fetch = async (url, opts = {}) => {
      if (/oauth2\/token/.test(String(url))) return { ok: true, status: 200, json: async () => ({ access_token: "STUB" }) };
      if (/v2\/checkout\/orders/.test(String(url))) {
        order = JSON.parse(String(opts.body || "{}"));
        return { ok: true, status: 200, json: async () => ({ id: "STUB-ORDER" }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    };
    const paypal = require(path.join(ROOT, "src/app/api/paypal/create-order/route.ts"));
    const run = async (productId) => {
      order = null;
      const res = await paypal.POST({ json: async () => ({ productId }) });
      return { status: res.status, order, body: await res.json() };
    };

    for (const [id, price] of [["codex-physical", "215.00"], ["hexahedron-cube", "109.00"]]) {
      const r = await run(id);
      const unit = r.order.purchase_units[0];
      ok(r.status === 200, `5 ${id}: an order is created`);
      ok(unit.amount.value === price && unit.amount.currency_code === "USD",
        `5 ${id}: the order is $${price} USD`);
      ok(unit.amount.breakdown === undefined,
        `5 ${id}: GAP recorded — the order carries no shipping line and no breakdown`);
      ok(r.order.application_context === undefined && r.order.shipping_preference === undefined,
        `5 ${id}: GAP recorded — no shipping preference and no return address are set`);
    }
    for (const id of ["codex-digital", "chakra-4k", "chakra-8k"]) {
      const r = await run(id);
      const unit = r.order.purchase_units[0];
      ok(r.status === 200 && unit.amount.value === products.find((x) => x.id === id).price.toFixed(2),
        `5 ${id}: the digital order is the product price alone, with no shipping (control holds)`);
    }

    /* the capture route cannot run */
    const capture = read("src/app/api/paypal/capture-order/route.ts");
    ok(/api-m\.sandbox\.paypal\.com/.test(capture), "5 GAP recorded: capture posts to the PayPal SANDBOX host");
    ok(/api-m\.paypal\.com/.test(read("src/app/api/paypal/create-order/route.ts")),
      "5 …while orders are created on the LIVE host — the two disagree");
    ok(/process\.env\.PAYPAL_ACCESS_TOKEN/.test(capture),
      "5 …and capture reads PAYPAL_ACCESS_TOKEN, which the project does not define");
    let callers = 0;
    for (const dir of ["src/app", "src/components", "src/lib"]) {
      const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(e.name) && !full.includes("api/paypal/capture-order")) {
          if (/capture-order|paypal\/capture/.test(fs.readFileSync(full, "utf8"))) callers += 1;
        }
      });
      walk(path.join(ROOT, dir));
    }
    ok(callers === 0, "5 GAP recorded: nothing in the site calls capture — PayPal takes no payment today");
    ok(/PAYPAL_MODE/.test(read("src/app/api/paypal/create-order/route.ts")) === false,
      "5 …and the PAYPAL_MODE the project defines is read nowhere");
  }

  /* ── 6. provider totals ─────────────────────────────────────────────────── */
  console.log("\n  6. what a buyer is actually charged");
  {
    const codex = products.find((p) => p.id === "codex-physical");
    const digital = products.find((p) => p.id === "codex-digital");
    const stripeTotal = codex.price * 100 + S.flatShippingCents("codex-physical");
    ok(stripeTotal === 24500, `6 Stripe, Codex: $${stripeTotal / 100} — the $245 observed on the live checkout`);
    ok(S.statedZoneRateCents("codex-physical", "AU") + codex.price * 100 === 26500,
      "6 …but the page's own rule for AU would be $265");
    ok(digital.price * 100 === 9900, "6 Stripe, digital: $99, no shipping");
    ok(true, "6 PayPal, Codex: $215 — no shipping is added, before or after (recorded gap)");
  }

  /* ── 7. the decision is still open ──────────────────────────────────────── */
  console.log("\n  7. the open decision");
  {
    ok(S.OPEN_SHIPPING_DECISIONS.length === 3, "7 the three decisions are recorded in the module");
    ok(S.OPEN_SHIPPING_DECISIONS.some((d) => /AU\/Asia/.test(d)), "7 …including the AU/Asia rate");
    ok(S.OPEN_SHIPPING_DECISIONS.some((d) => /PayPal charge shipping/.test(d)), "7 …and whether PayPal charges shipping");
    ok(S.SHIPPING_POLICY_STATE === "unreconciled", "7 nothing has been chosen on the owner's behalf");
  }

  console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
  if (fail) { console.log("\n  failures:"); failures.forEach((f) => console.log("   - " + f)); }
  process.exit(fail ? 1 : 0);
})();
