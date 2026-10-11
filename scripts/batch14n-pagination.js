#!/usr/bin/env node
/**
 * batch14n-pagination.js
 *
 * Pagination contract for the authority helper, called directly with Stripe
 * seeded explicitly. Verifies BOTH the outcome and the actual request arguments
 * (cursor progression, customer scoping), and that an incomplete enumeration can
 * never become authoritative absence.
 *
 * Every case runs inside safe(): an unexpected exception scores a FAILED
 * assertion and the suite continues, so a mutation that makes the helper throw
 * produces explicit failures instead of aborting the run.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });
const { resolveAuthoritativeSubscription } = require(path.join(ROOT, "src/lib/stripe-subscription-authority.ts"));

const CUS = "cus_1";
let passed = 0; const failures = [];
function ok(c, l) { if (c) { passed += 1; return true; } failures.push(l); console.error("  FAIL:", l); return false; }
const safe = async (name, fn) => {
  try { await fn(); }
  catch (e) { ok(false, name + " threw unexpectedly: " + (e && e.message ? e.message : String(e))); }
};

function pagedStripe(pages, objects = {}) {
  const calls = [];
  let i = 0;
  return {
    calls,
    stripe: {
      subscriptions: {
        retrieve: async (id) => {
          const o = objects[id];
          if (!o) { const e = new Error("no such subscription"); e.statusCode = 404; throw e; }
          if (o.error) { const e = new Error(o.error); e.statusCode = o.statusCode || 500; throw e; }
          return { id, status: o.status, customer: o.customer };
        },
        list: async (args) => {
          calls.push({ ...args });
          const p = pages[i];
          i += 1;
          if (typeof p === "function") return p();
          if (p === undefined) return { data: [], has_more: false };
          return p;
        },
      },
    },
  };
}

const NONE = { subscriptionId: null, alternates: [], source: null, plan: null, status: null };
const sub = (id, status = "active", customer = CUS) => ({ id, status, customer });
const allScoped = (s) => s.calls.length > 0 && s.calls.every((c) => c.customer === CUS);

(async () => {
  console.log("batch14n-pagination\n");

  await safe("P1", async () => {
    const s = pagedStripe([
      { data: [sub("a1", "canceled")], has_more: true },
      { data: [sub("a2", "active")], has_more: false },
    ]);
    const r = await resolveAuthoritativeSubscription(s.stripe, CUS, NONE);
    ok(r.ok === true && r.subscriptionId === "a2" && r.selectedBy === "unique_replacement",
      "P1 multi-page selection finds the live subscription (got " + JSON.stringify(r) + ")");
    ok(s.calls.length === 2, "P1 exactly two list calls (got " + s.calls.length + ")");
    ok(s.calls[1] && s.calls[1].starting_after === "a1",
      "P1 second call uses the LAST id of page 1 as the cursor (got " + JSON.stringify(s.calls[1]) + ")");
    ok(s.calls[0] && s.calls[0].starting_after === undefined, "P1 first call sends no cursor");
    ok(allScoped(s), "P1 EVERY list call is scoped to the customer");
  });

  await safe("P2", async () => {
    const s = pagedStripe([
      { data: [sub("b1", "active")], has_more: true },
      { data: [sub("b2", "active")], has_more: false },
    ]);
    const r = await resolveAuthoritativeSubscription(s.stripe, CUS, NONE);
    ok(r.ok === false && r.reason === "multiple_candidates",
      "P2 live subscriptions on different pages -> ambiguity (got " + JSON.stringify(r) + ")");
  });

  await safe("P3", async () => {
    const s = pagedStripe([{ data: [], has_more: true }]);
    const r = await resolveAuthoritativeSubscription(s.stripe, CUS, NONE);
    ok(r && r.ok === false && r.reason === "stripe_lookup_failed",
      "P3 empty page with has_more=true FAILS, not absence (got " + JSON.stringify(r) + ")");
  });

  await safe("P4", async () => {
    const s = pagedStripe([{ data: null, has_more: false }]);
    const r = await resolveAuthoritativeSubscription(s.stripe, CUS, NONE);
    ok(r && r.ok === false && r.reason === "stripe_lookup_failed",
      "P4 data:null FAILS, not absence (got " + JSON.stringify(r) + ")");
  });

  await safe("P5", async () => {
    const s = pagedStripe([{ data: [{ status: "active", customer: CUS }], has_more: true }]);
    const r = await resolveAuthoritativeSubscription(s.stripe, CUS, NONE);
    ok(r && r.ok === false && r.reason === "stripe_lookup_failed",
      "P5 has_more with no usable cursor FAILS (got " + JSON.stringify(r) + ")");
  });

  await safe("P6", async () => {
    const s = pagedStripe([
      { data: [sub("c1", "canceled")], has_more: true },
      () => { throw new Error("page 2 unreachable"); },
    ]);
    const r = await resolveAuthoritativeSubscription(s.stripe, CUS, NONE);
    ok(r && r.ok === false && r.reason === "stripe_lookup_failed",
      "P6 a later-page failure FAILS, not absence (got " + JSON.stringify(r) + ")");
    ok(allScoped(s), "P6 every list call is scoped to the customer");
  });

  await safe("P7", async () => {
    const s = pagedStripe([
      { data: [sub("d1", "canceled")], has_more: true },
      { data: [sub("d2", "canceled")], has_more: true },
      { data: [sub("d3", "canceled")], has_more: true },
      { data: [sub("d4", "canceled")], has_more: true },
      { data: [sub("d5", "canceled")], has_more: true },
    ]);
    const r = await resolveAuthoritativeSubscription(s.stripe, CUS, NONE);
    ok(r && r.ok === false && r.reason === "multiple_candidates",
      "P7 page-limit exhaustion reports ambiguity, not absence (got " + JSON.stringify(r) + ")");
    ok(s.calls.length === 5, "P7 enumeration is bounded at 5 pages (got " + s.calls.length + ")");
    ok(allScoped(s), "P7 every list call is scoped to the customer");
    ok(s.calls[4] && s.calls[4].starting_after === "d4", "P7 the cursor advances on every page");
  });

  console.log("");
  console.log("assertions passed: " + passed);
  console.log("assertions failed: " + failures.length);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
  console.log("\nBATCH14N_TESTS_PASSED");
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
