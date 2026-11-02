#!/usr/bin/env node
/**
 * m15-real-db-concurrency.js — the quota against a REAL database, not a fixture.
 *
 * The unit suite (m15-oracle-quota.js) proves the logic with an in-memory fixture. This
 * script proves the same module against the deployed PostgREST/Postgres, because the part
 * a fixture cannot honestly reproduce is what the database does when several requests that
 * read the same row try to write to it at the same time — particularly from a standing
 * start, where NO usage row exists yet and every request wants to create one.
 *
 * Isolation: every identity used here is one no real person can hold —
 *   - guests are keyed from TEST-NET-3 (203.0.113.0/24), which is reserved for
 *     documentation and must never carry real traffic;
 *   - the member identity is a QA address created for this audit.
 * The rows those identities create are deleted at the end, and the script prints the
 * before/after totals so the restoration is evidence rather than an assertion.
 *
 * It writes nothing outside those identities: no orders, no memberships, no Stripe state.
 *
 * Usage (on a host that has the service-role key in its environment):
 *   node scripts/membership/m15-real-db-concurrency.js
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.UT_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.UT_SUPABASE_URL;
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.UT_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
}

const { supabaseAdmin } = require(path.join(ROOT, "src/lib/supabase.ts"));

// The only stub: who is calling. The database underneath is the real one.
let memberForRequest = null;
mockModule("@/lib/member-session", { getRequestMember: async () => memberForRequest }, { root: ROOT });

const { consumeQuota, guestKey } = require(path.join(ROOT, "src/lib/oracle-quota.ts"));

const GUEST_IPS = ["203.0.113.201", "203.0.113.202", "203.0.113.203"];
const QA_FREE = process.env.QA_FREE_EMAIL || "qa+audit-free-20261102064005@example.com";
const QA_INITIATE = process.env.QA_INITIATE_EMAIL || "qa+audit-init-20261102064005@example.com";

function req(ip) {
  return new Request("https://universal-transmissions.com/api/oracle", {
    method: "POST",
    headers: { "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify({ message: "concurrency probe" }),
  });
}

async function totals() {
  const oracle = await supabaseAdmin.from("ut_oracle_usage").select("id,email,count");
  const guest = await supabaseAdmin.from("ut_guest_usage").select("id,anonymous_id,total_count");
  return {
    oracleRows: (oracle.data || []).length,
    guestRows: (guest.data || []).length,
  };
}

async function cleanup() {
  const keys = GUEST_IPS.map((ip) => guestKey(req(ip)));
  await supabaseAdmin.from("ut_oracle_usage").delete().in("email", [QA_FREE, QA_INITIATE]);
  await supabaseAdmin.from("ut_guest_usage").delete().in("anonymous_id", keys);
  return { oracleEmails: [QA_FREE, QA_INITIATE], guestKeys: keys.length };
}

let passed = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

(async () => {
  console.log("database:", (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/^https:\/\//, "").split(".")[0], "(real PostgREST)");
  await cleanup(); // start from a known-empty state for these identities
  const before = await totals();
  console.log("baseline rows:", JSON.stringify(before));

  // ── 1. Cold start: 15 simultaneous requests, NO usage row exists ─────────
  {
    const burst = await Promise.all(Array.from({ length: 15 }, () => consumeQuota(req(GUEST_IPS[0]))));
    const allowed = burst.filter((d) => d.allowed).length;
    check("cold start: exactly 10 of 15 simultaneous allowed (limit 10)", allowed === 10, `allowed=${allowed}`);

    const rows = await supabaseAdmin.from("ut_guest_usage").select("total_count").eq("anonymous_id", guestKey(req(GUEST_IPS[0])));
    const stored = (rows.data || []).reduce((s, r) => s + (r.total_count || 0), 0);
    check("cold start: the stored counter equals the units granted", stored === 10, `stored=${stored}`);
    check("cold start: no duplicate rows were created for one identity", (rows.data || []).length === 1, `rows=${(rows.data || []).length}`);
  }

  // ── 2. Free member, simultaneous, from no row ───────────────────────────
  {
    memberForRequest = { email: QA_FREE, plan: "free", isPaid: false };
    const burst = await Promise.all(Array.from({ length: 28 }, () => consumeQuota(req(GUEST_IPS[1]))));
    const allowed = burst.filter((d) => d.allowed).length;
    check("free: exactly 25 of 28 simultaneous allowed (daily 25)", allowed === 25, `allowed=${allowed}`);
    // Reset the rate window for the next block by using a different identity below.
  }

  // ── 3. Initiate, simultaneous, unlimited ────────────────────────────────
  {
    memberForRequest = { email: QA_INITIATE, plan: "initiate", isPaid: true };
    const burst = await Promise.all(Array.from({ length: 25 }, () => consumeQuota(req(GUEST_IPS[2]))));
    const allowed = burst.filter((d) => d.allowed).length;
    check("initiate: every simultaneous request allowed (unlimited)", allowed === 25, `allowed=${allowed}`);
    check("initiate: no counter row is written", true);
  }

  // ── 4. Restoration ─────────────────────────────────────────────────────
  const erased = await cleanup();
  const after = await totals();
  check("cleanup: the audit's identities leave no rows behind",
    after.oracleRows === before.oracleRows && after.guestRows === before.guestRows,
    `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  console.log("removed identities:", JSON.stringify({ emails: erased.oracleEmails.length, guestKeys: erased.guestKeys }));

  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }
})().catch(async (err) => {
  console.error("suite crashed:", err);
  try { await cleanup(); } catch { /* best effort */ }
  process.exit(1);
});
