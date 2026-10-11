#!/usr/bin/env node
/**
 * batch14m-recorded-candidates.js
 *
 * Unit tests for the recorded-candidate set, called DIRECTLY on the authority
 * helper. Stripe is seeded EXPLICITLY per id — nothing is inferred from
 * membership rows or historical event payloads.
 *
 * Written BEFORE the helper change, so the first four cases are expected to fail
 * against 2600add3 (the loop returns on the first live recorded id and never
 * validates the rest).
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const { resolveAuthoritativeSubscription, readStoredLinkage } =
  require(path.join(ROOT, "src/lib/stripe-subscription-authority.ts"));

const CUS = "cus_1";

/** Explicit Stripe state: id -> {status, customer} or {error}. */
function fakeStripe(objects, pages = null) {
  return {
    subscriptions: {
      retrieve: async (id) => {
        const o = objects[id];
        if (!o) { const e = new Error("no such subscription"); e.statusCode = 404; throw e; }
        if (o.error) { const e = new Error(o.error); e.statusCode = o.statusCode || 500; throw e; }
        return { id, status: o.status, customer: o.customer };
      },
      list: async () => {
        if (pages) return pages.shift();
        return { data: [], has_more: false };
      },
    },
  };
}

let passed = 0; const failures = [];
function ok(c, l) { if (c) { passed += 1; return true; } failures.push(l); console.error("  FAIL:", l); return false; }

const L = (primary, alternates) => ({
  subscriptionId: primary, alternates, source: "ut_members", plan: null, status: null,
});

(async () => {
  console.log("batch14m-recorded-candidates\n");

  // A1 — two recorded, verified, live -> ambiguity
  let r = await resolveAuthoritativeSubscription(
    fakeStripe({ X: { status: "active", customer: CUS }, Y: { status: "active", customer: CUS } }),
    CUS, L("X", ["Y"]));
  ok(r.ok === false && r.reason === "multiple_candidates",
    "A1 two recorded live verified subscriptions -> ambiguity (got " + JSON.stringify(r) + ")");

  // A2 — reversed order -> the same ambiguity
  r = await resolveAuthoritativeSubscription(
    fakeStripe({ X: { status: "active", customer: CUS }, Y: { status: "active", customer: CUS } }),
    CUS, L("Y", ["X"]));
  ok(r.ok === false && r.reason === "multiple_candidates",
    "A2 reversed order -> the same ambiguity (got " + JSON.stringify(r) + ")");

  // A3 — live primary + ownership-MISMATCHED alternate -> rejection
  r = await resolveAuthoritativeSubscription(
    fakeStripe({ X: { status: "active", customer: CUS }, Y: { status: "active", customer: "cus_other" } }),
    CUS, L("X", ["Y"]));
  ok(r.ok === false && r.reason === "ownership_mismatch",
    "A3 a mismatched alternate must be REJECTED, not ignored (got " + JSON.stringify(r) + ")");

  // A4 — live primary + unverifiable alternate -> rejection
  r = await resolveAuthoritativeSubscription(
    fakeStripe({ X: { status: "active", customer: CUS }, Y: { status: "active", customer: undefined } }),
    CUS, L("X", ["Y"]));
  ok(r.ok === false && r.reason === "ownership_unverifiable",
    "A4 an unverifiable alternate must be rejected (got " + JSON.stringify(r) + ")");

  // A4b — live primary + alternate lookup FAILURE -> rejection
  r = await resolveAuthoritativeSubscription(
    fakeStripe({ X: { status: "active", customer: CUS }, Y: { status: "active", customer: CUS, error: "stripe down" } }),
    CUS, L("X", ["Y"]));
  ok(r.ok === false && r.reason === "stripe_lookup_failed",
    "A4b an alternate lookup failure must be reported, not swallowed (got " + JSON.stringify(r) + ")");

  // A5 — one terminal recorded + one live -> select the live one
  r = await resolveAuthoritativeSubscription(
    fakeStripe({ X: { status: "canceled", customer: CUS }, Y: { status: "active", customer: CUS } }),
    CUS, L("X", ["Y"]));
  ok(r.ok === true && r.found === true && r.subscriptionId === "Y" && r.selectedBy === "stored",
    "A5 one terminal + one live recorded -> select the live one (got " + JSON.stringify(r) + ")");

  // A6 — no live recorded -> full replacement enumeration
  r = await resolveAuthoritativeSubscription(
    fakeStripe({ X: { status: "canceled", customer: CUS } },
      [{ data: [{ id: "Z", status: "active", customer: CUS }], has_more: false }]),
    CUS, L("X", []));
  ok(r.ok === true && r.subscriptionId === "Z" && r.selectedBy === "unique_replacement",
    "A6 no live recorded -> complete replacement enumeration (got " + JSON.stringify(r) + ")");

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14M_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
