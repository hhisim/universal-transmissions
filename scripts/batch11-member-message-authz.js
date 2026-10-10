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
const Module = require("module");

const ROOT = path.resolve(__dirname, "..");

/* ── mock state ─────────────────────────────────────────────────────────── */
const state = {
  authStatus: 200,
  authEmail: null,
  authThrows: false,
  profilesPlan: undefined,
  membersPlan: undefined,
  profilesError: null,
  membersError: null,
  dbThrows: false,
  nextAuthEmail: null,
  nextAuthThrows: false,
  resendError: null,
  sends: [],
};

const MOCK_USER_URL = "https://mock.supabase.test/auth/v1/user";

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
}

/* ── install module mocks via the project's own hook ───────────────────── */
const { registerTsModules, mockModule } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

function makeDbClient() {
  function chain(table) {
    const self = {
      select() { return self; },
      eq() { return self; },
      async maybeSingle() {
        if (state.dbThrows) throw new Error("db unavailable");
        if (table === "profiles") {
          if (state.profilesError) return { data: null, error: state.profilesError };
          return { data: { plan: state.profilesPlan ?? null }, error: null };
        }
        if (state.membersError) return { data: null, error: state.membersError };
        return { data: { plan: state.membersPlan ?? null }, error: null };
      },
    };
    return self;
  }
  return { from: (t) => chain(t) };
}

class MockResend {
  emails = {
    send: async (args) => {
      state.sends.push(args);
      return { error: state.resendError };
    },
  };
}

// External boundaries only: the email service, the session lookup, the DB client.
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
    return {
      ok,
      status: state.authStatus,
      json: async () => ({ email: state.authEmail }),
    };
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

(async () => {
  console.log("batch11-member-message-authz: server-side authorization\n");

  /* ── rejected paths: every one must send ZERO emails ──────────────────── */
  reset();
  ok((await POST(req(GOOD))).status === 401, "A1 anonymous -> 401");
  ok(state.sends.length === 0, "A1 anonymous -> ZERO email calls");

  reset();
  state.authStatus = 403; state.authEmail = "hhisim@hotmail.com";
  const forged = await POST(req(Object.assign({}, GOOD, { plan: "initiate" }), MEMBER));
  ok(forged.status === 401, "A2 forged token (bad JWT) -> 401, not trusted");
  ok(state.sends.length === 0, "A2 forged token -> ZERO email calls");

  reset();
  state.authEmail = "free@example.com"; state.profilesPlan = "free";
  const forgedPlan = await POST(
    req(Object.assign({}, GOOD, { plan: "initiate", email: "hhisim@hotmail.com" }), MEMBER));
  ok(forgedPlan.status === 403, "A3 verified FREE member claiming plan=initiate -> 403");
  ok(state.sends.length === 0, "A3 forged plan claim -> ZERO email calls");

  reset();
  state.authEmail = "free@example.com"; state.membersPlan = "free";
  ok((await POST(req(GOOD, MEMBER))).status === 403, "A4 verified free member (ut_members) -> 403");
  ok(state.sends.length === 0, "A4 free member -> ZERO email calls");

  reset();
  state.authEmail = "nobody@example.com";
  state.profilesPlan = null; state.membersPlan = null;
  ok((await POST(req(GOOD, MEMBER))).status === 403, "A5 authenticated, no membership record -> 403");
  ok(state.sends.length === 0, "A5 guest -> ZERO email calls");

  reset();
  state.authEmail = "member@example.com"; state.profilesError = { message: "relation error" };
  ok((await POST(req(GOOD, MEMBER))).status === 500, "A6 membership lookup error -> fail closed 500");
  ok(state.sends.length === 0, "A6 lookup error -> ZERO email calls");

  reset();
  state.authEmail = "member@example.com"; state.dbThrows = true;
  ok((await POST(req(GOOD, MEMBER))).status === 500, "A7 membership lookup throws -> fail closed 500");
  ok(state.sends.length === 0, "A7 lookup throws -> ZERO email calls");

  reset();
  state.authThrows = true;
  ok((await POST(req(GOOD, MEMBER))).status === 401, "A8 auth verification throws -> fail closed 401");
  ok(state.sends.length === 0, "A8 auth throws -> ZERO email calls");

  /* ── accepted path ────────────────────────────────────────────────────── */
  reset();
  state.authEmail = "member@example.com"; state.profilesPlan = "initiate";
  const good = await POST(req(GOOD, MEMBER));
  const goodBody = await readBody(good);
  ok(good.status === 200 && goodBody.success === true, "B1 eligible member -> 200 success");
  ok(state.sends.length === 1, "B1 exactly ONE email call");
  ok(state.sends[0].to === "hhisim@hotmail.com", "B1 recipient is the FIXED configured address");
  ok(state.sends[0].replyTo === "member@example.com", "B1 replyTo is the VERIFIED identity");

  reset();
  state.authEmail = "m2@example.com"; state.profilesPlan = null; state.membersPlan = "initiate";
  ok((await POST(req(GOOD, MEMBER))).status === 200, "B2 ut_members fallback grants access");
  ok(state.sends[0].replyTo === "m2@example.com", "B2 fallback replyTo is the verified identity");

  reset();
  state.authEmail = "real@example.com"; state.profilesPlan = "initiate";
  await POST(req(Object.assign({}, GOOD, {
    email: "attacker@evil.test", plan: "initiate", priority: true, replyTo: "attacker@evil.test",
  }), MEMBER));
  ok(state.sends.length === 1, "B3 eligible request still sends once");
  ok(state.sends[0].replyTo === "real@example.com", "B3 client-supplied replyTo IGNORED");
  ok(!state.sends[0].html.includes("attacker@evil.test"), "B3 forged address absent from HTML");
  ok(!state.sends[0].html.includes("Priority Channel"), "B3 priority claim not honoured");
  ok(!state.sends[0].html.includes("★"), "B3 priority marker removed");

  reset();
  state.nextAuthEmail = "nextauth@example.com"; state.profilesPlan = "initiate";
  ok((await POST(req(GOOD))).status === 200, "B4 NextAuth session identity accepted");
  ok(state.sends[0].replyTo === "nextauth@example.com", "B4 NextAuth replyTo is the verified identity");

  /* ── bounded input ────────────────────────────────────────────────────── */
  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  ok((await POST(req({ content: "x" }, MEMBER))).status === 400, "C1 missing subject -> 400");
  ok(state.sends.length === 0, "C1 -> ZERO email calls");

  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  ok((await POST(req({ subject: "a".repeat(201), content: "x" }, MEMBER))).status === 400,
    "C2 oversize subject -> 400");
  ok(state.sends.length === 0, "C2 -> ZERO email calls");

  reset();
  state.authEmail = "m@example.com"; state.profilesPlan = "initiate";
  ok((await POST(req({ subject: "s", content: "b".repeat(5001) }, MEMBER))).status === 400,
    "C3 oversize content -> 400");
  ok(state.sends.length === 0, "C3 -> ZERO email calls");

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
  ok(!state.sends[0].subject.split(/\r?\n/).some(l => /^bcc:/i.test(l)),
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
  ok(state.sends.length === 0, "D2 -> ZERO email calls");

  /* ── structural guarantees ────────────────────────────────────────────── */
  const SRC = fs.readFileSync(path.join(ROOT, "src/app/api/member/message/route.ts"), "utf8");
  ok(/resend\.emails\.send/.test(SRC), "route still contains the send call");
  const sendIdx = SRC.indexOf("resend.emails.send");
  const authIdx = SRC.indexOf("Authentication required");
  const paidIdx = SRC.indexOf("isPaidPlan(lookup.plan)");
  ok(authIdx > 0 && paidIdx > authIdx && sendIdx > paidIdx,
    "ordering in source: 401 gate, then membership gate, then send");
  ok(!/const planLabel = plan ===/.test(SRC), "plan label no longer derived from the request");
  ok(!/priority = plan/.test(SRC), "priority no longer derived from the request");
  ok(/to: HAKAN_EMAIL/.test(SRC), "recipient remains the fixed constant");

  console.log(`\n  PASS ${passed}   FAIL ${failures.length}`);
  if (failures.length) {
    console.log("\nALL_MEMBER_MESSAGE_AUTHZ_TESTS_FAILED");
    process.exit(1);
  }
  console.log("ALL_MEMBER_MESSAGE_AUTHZ_TESTS_PASSED");
})();