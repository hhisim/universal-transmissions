#!/usr/bin/env node
/**
 * m15-membership-state.js — who a caller is, what they pay for, and one status answer.
 *
 * Real modules under test: src/lib/member-session.ts, src/lib/membership-plan.ts, and the
 * two HTTP handlers /api/member and /api/billing/session. Only the database and the
 * credential verifier are stubbed.
 *
 * Covered: anonymous, free, initiate, revoked (ut_members says canceled), expired/unverifiable
 * session, lookup failure, ambiguous duplicate rows, and the Priority 3 consistency
 * requirement that both endpoints report the SAME subscription state for the same member.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
// The server client refuses to construct without these; the value is never used because
// the Supabase boundary below is stubbed. Without them getSessionMember() short-circuits
// to null and every "member" case would pass for the wrong reason.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-anon-key";

const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

// ── Fixture ──────────────────────────────────────────────────────────────────
const db = { profiles: [], ut_members: [] };
let failProfiles = false;
let failMembers = false;

function tableQuery(table, columns) {
  const filters = [];
  const builder = {
    eq(col, val) {
      filters.push([col, val]);
      return builder;
    },
    limit() {
      return builder;
    },
    maybeSingle() {
      return builder;
    },
    then(resolve) {
      if ((table === "profiles" && failProfiles) || (table === "ut_members" && failMembers)) {
        return Promise.resolve({ data: null, error: { message: "simulated read failure" } }).then(resolve);
      }
      const cols = String(columns).split(",").map((c) => c.trim());
      const out = db[table]
        .filter((row) => filters.every(([c, v]) => row[c] === v))
        .map((row) => {
          const picked = {};
          for (const c of cols) picked[c] = row[c];
          return picked;
        });
      return Promise.resolve({ data: out, error: null }).then(resolve);
    },
  };
  return builder;
}

const supabaseAdmin = {
  from: (table) => ({ select: (columns) => tableQuery(table, columns) }),
  auth: {
    async getUser() {
      return authenticatedEmail
        ? { data: { user: { email: authenticatedEmail } }, error: null }
        : { data: { user: null }, error: { message: "invalid token" } };
    },
  },
};

let authenticatedEmail = null;
mockModule("@/lib/supabase", { supabaseAdmin }, { root: ROOT });

// The cookie-backed server client is the boundary that talks to Supabase Auth. Stubbing it
// keeps the suite offline while still exercising the real resolution path in member-session.
mockModule("@supabase/ssr", {
  createServerClient: () => ({
    auth: {
      async getUser() {
        return authenticatedEmail
          ? { data: { user: { email: authenticatedEmail } }, error: null }
          : { data: { user: null }, error: { message: "invalid token" } };
      },
    },
  }),
}, { root: ROOT });

// `next/headers` has no meaning outside a request; the session helper reads cookies through it.
mockModule("next/headers", { cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }, { root: ROOT });

const { getSessionMember } = require(path.join(ROOT, "src/lib/member-session.ts"));
const { resolveMembershipPlan, effectiveSubscriptionState } = require(path.join(ROOT, "src/lib/membership-plan.ts"));

let passed = 0;
const failures = [];
function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function reset() {
  db.profiles.length = 0;
  db.ut_members.length = 0;
  failProfiles = false;
  failMembers = false;
  authenticatedEmail = null;
}

(async () => {
  // ── 1. Anonymous ─────────────────────────────────────────────────────────
  reset();
  check("anonymous: no member", (await getSessionMember()) === null);

  // ── 2. Free member ───────────────────────────────────────────────────────
  reset();
  authenticatedEmail = "free@example.com";
  db.profiles.push({ email: "free@example.com", plan: "free", subscription_status: "active" });
  {
    const m = await getSessionMember();
    check("free: resolved", !!m && m.plan === "free", JSON.stringify(m));
    check("free: not paid", !!m && m.isPaid === false);
  }

  // ── 3. Initiate member ───────────────────────────────────────────────────
  reset();
  authenticatedEmail = "initiate@example.com";
  db.profiles.push({ email: "initiate@example.com", plan: "initiate", subscription_status: "active" });
  {
    const m = await getSessionMember();
    check("initiate: resolved as paid", !!m && m.plan === "initiate" && m.isPaid === true, JSON.stringify(m));
  }

  // ── 4. Revocation wins ───────────────────────────────────────────────────
  reset();
  authenticatedEmail = "canceled@example.com";
  db.profiles.push({ email: "canceled@example.com", plan: "initiate", subscription_status: "active" });
  db.ut_members.push({
    email: "canceled@example.com",
    plan: "initiate",
    subscription_status: "canceled",
    entitlement_authority_at: "2026-10-01T00:00:00Z",
  });
  {
    const m = await getSessionMember();
    check("revoked: a canceled subscription loses paid access", !!m && m.isPaid === false, JSON.stringify(m));
    check("revoked: plan falls back to guest", !!m && m.plan === "guest", JSON.stringify(m && m.plan));
  }

  // ── 5. Expired / unverifiable session ────────────────────────────────────
  reset();
  authenticatedEmail = null; // getUser() fails: token expired or forged
  {
    const m = await getSessionMember();
    check("expired session: treated as anonymous, never as a member", m === null);
  }

  // ── 6. Read failure fails closed ─────────────────────────────────────────
  reset();
  authenticatedEmail = "broken@example.com";
  failProfiles = true;
  {
    const m = await getSessionMember();
    check("lookup failure: no plan is invented", m === null);
  }

  // ── 7. Ambiguous duplicate rows ──────────────────────────────────────────
  reset();
  authenticatedEmail = "dupes@example.com";
  db.profiles.push({ email: "dupes@example.com", plan: "free" });
  db.profiles.push({ email: "dupes@example.com", plan: "initiate" });
  {
    const m = await getSessionMember();
    check("duplicate rows: not resolved by picking one", m === null);
  }

  // ── 8. Priority 3 — one subscription state for every reader ──────────────
  reset();
  {
    // A member whose only row is `profiles`, with the unmaintained column set to active.
    const resolved = await resolveMembershipPlan(supabaseAdmin, "profileonly@example.com");
    // No rows at all here; build the fixture instead.
    db.profiles.push({ email: "profileonly@example.com", plan: "initiate", subscription_status: "active" });
    const resolved2 = await resolveMembershipPlan(supabaseAdmin, "profileonly@example.com");
    const state2 = resolved2.ok ? effectiveSubscriptionState(resolved2.membership) : null;
    check("status: a profiles-only member reports no maintained lifecycle state",
      !!state2 && state2.status === null && state2.source === "none", JSON.stringify(state2));
    check("status: the unmaintained column is surfaced separately, not as status",
      !!state2 && state2.profileStatus === "active", JSON.stringify(state2));

    db.ut_members.push({ email: "profileonly@example.com", plan: "initiate", subscription_status: "active", current_period_end: "2027-01-01T00:00:00Z" });
    const resolved3 = await resolveMembershipPlan(supabaseAdmin, "profileonly@example.com");
    const state3 = resolved3.ok ? effectiveSubscriptionState(resolved3.membership) : null;
    check("status: with a maintained row, both readers report ut_members",
      !!state3 && state3.status === "active" && state3.source === "ut_members", JSON.stringify(state3));
    check("status: the period end follows the maintained row",
      !!state3 && state3.currentPeriodEnd === "2027-01-01T00:00:00Z");
  }

  // ── 9. Legacy vocabulary is NOT converted silently ──────────────────────
  reset();
  {
    db.profiles.push({ email: "legacy@example.com", plan: "full", subscription_status: "active" });
    const resolved = await resolveMembershipPlan(supabaseAdmin, "legacy@example.com");
    const plan = resolved.ok ? resolved.membership.plan : null;
    check("legacy 'full': not silently converted into paid access", plan === "guest", `plan=${plan}`);
  }

  // ── 10. Both endpoints agree ────────────────────────────────────────────
  reset();
  {
    authenticatedEmail = "same@example.com";
    db.profiles.push({ email: "same@example.com", plan: "initiate", subscription_status: "active" });
    db.ut_members.push({ email: "same@example.com", plan: "initiate", subscription_status: "active" });

    mockModule("@/lib/verified-identity", {
      resolveVerifiedIdentity: async () => ({ email: "same@example.com", source: "supabase" }),
      resolveVerifiedEmail: async () => "same@example.com",
    }, { root: ROOT });

    const billing = require(path.join(ROOT, "src/app/api/billing/session/route.ts"));
    const memberRoute = require(path.join(ROOT, "src/app/api/member/route.ts"));

    const req = new Request("https://universal-transmissions.com/api/billing/session");
    const billingBody = await (await billing.GET(req)).json();
    const memberBody = await (await memberRoute.GET(req)).json();

    check("consistency: both endpoints report the same subscription_status",
      billingBody.subscription_status === memberBody.subscription_status,
      `${billingBody.subscription_status} vs ${memberBody.subscription_status}`);
    check("consistency: both report the same plan",
      billingBody.plan === memberBody.plan, `${billingBody.plan} vs ${memberBody.plan}`);
    check("consistency: the status is the maintained one, not 'inactive' by omission",
      billingBody.subscription_status === "active", String(billingBody.subscription_status));
  }

  console.log(`\n${failures.length === 0 ? "ALL PASS" : "FAILURES"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
})().catch((err) => {
  console.error("suite crashed:", err);
  process.exit(1);
});
