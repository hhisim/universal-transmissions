#!/usr/bin/env node
/**
 * batch11-member-message-authz.js — behavioural tests for POST /api/member/message.
 *
 * Executes the REAL route handler through the project's own TS require shim
 * (scripts/lib/ut-ts-require.cjs). Only the EXTERNAL boundaries are mocked:
 * the Supabase auth endpoint (global fetch), the Supabase DB client, NextAuth's
 * session lookup, and the Resend email service.
 *
 * The route's own authorization logic runs unaltered: identity resolution,
 * the membership policy, fail-closed handling, bounded input validation,
 * escaping, and the send decision.
 *
 * No real email sends, purchases, subscriptions, account creation, role
 * changes or database writes occur.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

/* ── mock state ─────────────────────────────────────────────────────────── */
const state = {
  authStatus: 200,
  authEmail: null,
  authThrows: false,
  profilesPlan: undefined,      // null => no row (real PostgREST shape)
  membersPlan: undefined,
  profilesError: null,
  membersError: null,
  dbThrows: false,
  nextAuthEmail: null,
  nextAuthThrows: false,
  resendError: null,
  sends: [],
  constructed: 0,               // how many times the mail client was INSTANTIATED
  queries: [],                  // [{table, email}] actually requested from the DB
};

const MOCK_USER_URL = "https://mock.supabase.test/auth/v1/user";
const PGRST116 = {
  code: "PGRST116",
  details: "Results contain 2 rows, application/vnd.pgrst.object+json requires 1 row",
  hint: null,
  message: "JSON object requested, multiple (or no) rows returned",
};

function reset() {
  state.authStatus = 200;
  state.authEmail = null;
  state.authThrows = false;
  state.profilesPlan = undefined;
  state.membersPlan = undefined;
  state.profilesError = null;
  state.membersError = null;
  state.dbThrows = false;
  state.nextAuthEmail = null;
  state.nextAuthThrows = false;
  state.resendError = null;
  state.sends = [];
  state.constructed = 0;
  state.queries = [];
}

/* ── install module mocks via the project's own hook ────────────────────── */
const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

function makeDbClient() {
  function chain(table) {
    let email;
    const self = {
      select() { return self; },
      eq(col, val) { if (col === "email") email = val; return self; },
      async maybeSingle() {
        state.queries.push({ table, email });
        if (state.dbThrows) throw new Error("db unavailable");
        if (table === "profiles") {
          if (state.profilesError) return { data: null, error: state.profilesError };
          // Real PostgREST: 0 rows -> data null (no error); 1 row -> object.
          return { data: state.profilesPlan === undefined ? null : { plan: state.profilesPlan }, error: null };
        }
        if (state.membersError) return { data: null, error: state.membersError };
        return { data: state.membersPlan === undefined ? null : { plan: state.membersPlan }, error: null };
      },
    };
    return self;
  }
  return { from: (t) => chain(t) };
}

class MockResend {
  constructor() {
    state.constructed += 1;
    this.emails = {
      send: async (args) => {
        state.sends.push(args);
        return { error: state.resendError };
      },
    };
  }
}

mockModule("resend", { Resend: MockResend }, { root: ROOT });
mockModule("@/lib/auth", {
  auth: async () => {
    if (state.nextAuthThrows) throw new Error("session failure");
    return state.nextAuthEmail ? { user: { email: state.nextAuthEmail } } : null;
  },
}, { root: ROOT });
mockModule("@/lib/supabase", { supabaseAdmin: makeDbClient() }, { root: ROOT });

/* ── env ────────────────────────────────────────────────────────────────── */
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.RESEND_API_KEY = "resend-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";

/* ── mocked network: only the Supabase auth validation endpoint ──────────── */
global.fetch = async (url) => {
  if (String(url) === MOCK_USER_URL) {
    if (state.authThrows) throw new Error("network down");
    const ok = state.authStatus >= 200 && state.authStatus < 300;
    return { ok, status: state.authStatus, json: async () => ({ email: state.authEmail }) };
  }
  throw new Error("unexpected fetch: " + url);
};

const route = require(path.join(ROOT, "src/app/api/member/message/route.ts"));
const POST = route.POST;

/* ── harness ────────────────────────────────────────────────────────────── */
let passed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { passed += 1; return true; }
  failures.push(label);
  console.error("  FAIL:", label);
  return false;
}
async function readBody(res) {
  if (res && typeof res.json === "function") { try { return await res.json(); } catch { return {}; } }
  return res && res.body ? res.body : {};
}
const GOOD = { subject: "Question about Codex II", content: "How was the archive assembled?" };
function req(body, headers) {
  const h = { "Content-Type": "application/json" };
  Object.assign(h, headers || {});
  return new Request("https://ut.test/api/member/message", {
    method: "POST", headers: h,
    body: typeof body === "string" ? body : JSON.stringify(body === undefined ? {} : body),
  });
}
const MEMBER = { Authorization: "Bearer good.token.sig" };
const VICTIM = "victim-member@example.com";

/* Every rejected path must satisfy ALL of these. */
function assertNoMail(label) {
  ok(state.sends.length === 0, `${label} -> ZERO email calls`);
  ok(state.constructed === 0, `${label} -> mail client NEVER constructed`);
}

(async () => {
  console.log("batch11-member-message-authz: server-side authorization\n");

  /* ── rejected paths ───────────────────────────────────────────────────── */
  reset();
  ok((await POST(req(GOOD))).status === 401, "A1 anonymous -> 401");
  assertNoMail("A1 anonymous");

  reset();
  state.authStatus = 403; state.authEmail = "hhisim@hotmail.com";
  ok((await POST(req(Object.assign({}, GOOD, { plan: "initiate" }), MEMBER))).status === 401,
    "A2 forged token (bad JWT signature) -> 401, not trusted");
  assertNoMail("A2 forged token");

  reset();
  state.authEmail = "free@example.com"; state.profilesPlan = "free";
  ok((await POST(req(Object.assign({}, GOOD, { plan: "initiate", email: VICTIM }), MEMBER))).status === 403,
    "A3A verified FREE member claiming plan=initiate -> 403");
  assertNoMail("A3A forged plan claim");

  // forged body identity must never be the row selector
  const forgedQs = state.queries.filter((q) => q.email === VICTIM);
  ok(forgedQs.length === 0, "A3B forged body identity NEVER used as the row selector");
  ok(state.queries.every((q) => q.email === "free@example.com"),
    "A3B every membership query used the VERIFIED email only");
  ok(state.queries.length > 0, "A3B a membership lookup actually happened");

  reset();
  state.authEmail = "free@example.com"; state.membersPlan = "free";
  ok((await POST(req(GOOD, MEMBER))).status === 403, "A4 verified free member (ut_members) -> 403");
  assertNoMail("A4 free member");

  reset();
  state.authEmail = "nobody@example.com";   // both lookups return data:null
  ok((await POST(req(GOOD, MEMBER))).status === 403, "A5 authenticated, no membership record -> 403");
  assertNoMail("A5 guest");

  reset();
  state.authEmail = "member@example.com"; state.profilesError = { message: "relation error" };
  ok((await POST(req(GOOD, MEMBER))).status === 500, "A6 membership lookup error -> fail closed 500");
  assertNoMail("A6 lookup error");

  reset();
  state.authEmail = "member@example.com"; state.dbThrows = true;
  ok((await POST(req(GOOD, MEMBER))).status === 500, "A7 membership lookup throws -> fail closed 500");
  assertNoMail("A7 lookup throws");

  reset();
  state.authThrows = true;
  ok((await POST(req(GOOD, MEMBER))).status === 401, "A8 auth verification throws -> fail closed 401");
  assertNoMail("A8 auth throws");

  // duplicate membership rows: PGRST116 from maybeSingle() -> deny, never pick one
  reset();
  state.authEmail = "dup@example.com"; state.profilesError = PGRST116; state.profilesPlan = "initiate";
  ok((await POST(req(GOOD, MEMBER))).status === 500,
    "A9 duplicate membership rows (PGRST116) -> fail closed 500, no row chosen");
  assertNoMail("A9 duplicate rows");

  /* ── accepted path ────────────────────────────────────────────────────── */
  reset();
  state.authEmail = "member@example.com"; state.profilesPlan = "initiate";
  const good = await POST(req(GOOD, MEMBER));
  ok(good.status === 200 && (await readBody(good)).success === true, "B1 eligible member -> 200 success");
  ok(state.sends.length === 1, "B1 exactly ONE email call");
  ok(state.constructed === 1, "B1 mail client constructed exactly once");
  ok(state.sends[0].to === "hhisim@hotmail.com", "B1 recipient is the FIXED configured address");
  ok(state.sends[0].replyTo === "member@example.com", "B1 replyTo is the VERIFIED identity");
  ok(state.queries.every((q) => q.email === "member@example.com"),
    "B1 membership looked up by the verified email only");

  reset();
  state.authEmail = "m2@example.com"; state.membersPlan = "initiate";   // profiles has no row
  ok((await POST(req(GOOD, MEMBER))).status === 200, "B2 ut_members fallback grants access");
  ok(state.sends[0].replyTo === "m2@example.com", "B2 fallback replyTo is the verified identity");

  reset();
  state.authEmail = "real@example.com"; state.profilesPlan = "initiate";
  await POST(req(Object.assign({}, GOOD, {
    email: VICTIM, plan: "initiate", priority: true, replyTo: VICTIM,
  }), MEMBER));
  ok(state.sends.length === 1, "B3 eligible request still sends once");
  ok(state.sends[0].replyTo === "real@example.com", "B3 client-supplied replyTo IGNORED");
  ok(state.sends[0].to === "hhisim@hotmail.com", "B3 fixed recipient preserved under forgery");
  ok(!state.sends[0].html.includes(VICTIM), "B3 forged address absent from HTML");
  ok(!state.sends[0].html.includes("Priority Channel"), "B3 priority claim not honoured");
  ok(state.queries.every((q) => q.email === "real@example.com"),
    "B3 BODY identity never selected another member's record");

  reset();
  state.nextAuthEmail = "nextauth@example.com"; state.profilesPlan = "initiate";
  ok((await POST(req(GOOD))).status === 200, "B4 NextAuth session identity accepted");
  ok(state.sends[0].replyTo === "nextauth@example.com", "B4 NextAuth replyTo is the verified identity");

  reset();
  state.nextAuthThrows = true; state.profilesPlan = "initiate";
  ok((await POST(req(GOOD))).status === 401, "B5 NextAuth session lookup throws -> fail closed 401");
  assertNoMail("B5 nextauth throws");

  /* ── bounded input ────────────────────────────────────────────────────── */
  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  ok((await POST(req({ content: "x" }, MEMBER))).status === 400, "C1 missing subject -> 400");
  assertNoMail("C1 missing subject");

  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  ok((await POST(req({ subject: "a".repeat(201), content: "x" }, MEMBER))).status === 400,
    "C2 oversize subject -> 400");
  assertNoMail("C2 oversize subject");

  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  ok((await POST(req({ subject: "s", content: "b".repeat(5001) }, MEMBER))).status === 400,
    "C3 oversize content -> 400");
  assertNoMail("C3 oversize content");

  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  await POST(req({ subject: '<img src=x onerror="alert(1)">', content: "<script>alert(2)</script>" }, MEMBER));
  const h = state.sends[0].html;
  ok(!h.includes("<script>"), "C4 script tag escaped out of HTML body");
  ok(!h.includes("<img"), "C4 img tag escaped out of HTML body");
  ok(h.includes("&lt;script&gt;"), "C4 escaped form present");

  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  await POST(req({ subject: "hello\r\nBcc: attacker@evil.test", content: "x" }, MEMBER));
  ok(!/[\r\n]/.test(state.sends[0].subject), "C5 no CR/LF survives into the subject header");
  ok(!state.sends[0].subject.split(/\r?\n/).some((l) => /^bcc:/i.test(l)),
    "C5 no injected header line can be formed");

  /* ── failure handling ─────────────────────────────────────────────────── */
  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  state.resendError = { message: "resend down" };
  const mailFail = await POST(req(GOOD, MEMBER));
  ok(mailFail.status === 500, "D1 mail service failure -> 500");
  ok((await readBody(mailFail)).success === undefined, "D1 no success reported after a mail failure");

  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  ok((await POST(req("{not json", MEMBER))).status === 400, "D2 malformed JSON -> 400");
  assertNoMail("D2 malformed JSON");

  /* ── structural guarantees ────────────────────────────────────────────── */
  const SRC = fs.readFileSync(path.join(ROOT, "src/app/api/member/message/route.ts"), "utf8");
  const sendIdx = SRC.indexOf("new Resend(");
  const authIdx = SRC.indexOf("Authentication required");
  const paidIdx = SRC.indexOf("isPaidPlan(lookup.plan)");
  ok(authIdx > 0 && paidIdx > authIdx && sendIdx > paidIdx,
    "ordering: 401 gate, then membership gate, then mail construction");
  ok(!/const planLabel = plan ===/.test(SRC), "plan label no longer derived from the request");
  ok(!/priority = plan/.test(SRC), "priority no longer derived from the request");
  ok(/to: HAKAN_EMAIL/.test(SRC), "recipient remains the fixed constant");
  // The NextAuth fallback now lives in the shared verified-identity helper, so
  // assert the mechanism rather than its file location. The BEHAVIOUR is covered
  // directly by B4 (NextAuth identity accepted) and B5 (NextAuth failure -> 401).
  const IDENTITY_SRC = fs.readFileSync(path.join(ROOT, "src/lib/verified-identity.ts"), "utf8");
  ok(/await auth\(\)/.test(IDENTITY_SRC), "NextAuth session is consulted server-side");
  ok(/\/auth\/v1\/user/.test(IDENTITY_SRC), "Supabase token validated server-side");
  ok(/import \{ resolveVerifiedEmail \} from "@\/lib\/verified-identity"/.test(SRC),
    "member-message route uses the shared verified-identity helper");
  ok(!/decodeEmailFromToken/.test(SRC), "route does NOT use the unsigned decode helper");
  ok(!/decodeEmailFromToken/.test(IDENTITY_SRC), "helper does NOT use the unsigned decode helper");

  console.log(`\n  PASS ${passed}   FAIL ${failures.length}`);
  if (failures.length) {
    console.log("\nALL_MEMBER_MESSAGE_AUTHZ_TESTS_FAILED");
    process.exit(1);
  }
  console.log("ALL_MEMBER_MESSAGE_AUTHZ_TESTS_PASSED");
})();