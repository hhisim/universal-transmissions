#!/usr/bin/env node
/**
 * m26-brevo-webhook.js — the delivery endpoint's authentication and event handling.
 *
 * A secret in a query string is logged by every proxy and analytics hop it passes through, so the
 * endpoint must accept a header and must NOT accept the old ?token= form.
 */
const path = require("path");
const http = require("http");
const ROOT = path.resolve(__dirname, "..", "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const PORT = 8807;
const state = { updates: 0 };
const j = (res, b, s = 200) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(b)); };

function server() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const url = new URL("http://x" + req.url);
        if (url.pathname.startsWith("/rest/v1/ut_order_notifications")) {
          if (req.method === "PATCH") {
            state.updates += 1;
            return j(res, [{ id: "n1", provider_message_id: "m1" }]);
          }
          return j(res, [{ id: "n1" }]);
        }
        return j(res, []);
      });
    });
    s.listen(PORT, "127.0.0.1", () => resolve(s));
  });
}

let passed = 0;
const failures = [];
const check = (n, ok, d) => { if (ok) { passed++; console.log("  PASS  " + n); } else { failures.push(n + (d ? " — " + d : "")); console.log("  FAIL  " + n + (d ? " — " + d : "")); } };

const NextRequest = require("next/server").NextRequest;
const SECRET = "ut_whsec_test_1234567890";

function post(body, headers = {}, url = "http://x/api/brevo-webhook") {
  return new NextRequest(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

const EVENT = { event: "delivered", "message-id": "<202611021517.63622696414@smtp-relay.mailin.fr>", email: "buyer@example.com" };

(async () => {
  const srv = await server();
  const base = `http://127.0.0.1:${PORT}`;
  process.env.NEXT_PUBLIC_SUPABASE_URL = base;
  process.env.UT_SUPABASE_URL = base;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
  process.env.UT_SUPABASE_SERVICE_ROLE_KEY = "k";

  const mod = path.join(ROOT, "src/app/api/brevo-webhook/route.ts");

  console.log("unconfigured");
  delete process.env.BREVO_WEBHOOK_SECRET;
  {
    delete require.cache[require.resolve(mod)];
    const { POST } = require(mod);
    const r = await POST(post(EVENT, { "x-ut-webhook-secret": SECRET }));
    check("with no secret configured the route refuses everything", r.status === 503, "status " + r.status);
  }

  console.log("configured");
  process.env.BREVO_WEBHOOK_SECRET = SECRET;
  delete require.cache[require.resolve(mod)];
  const { POST } = require(mod);

  {
    check("no credential is rejected", (await POST(post(EVENT))).status === 401);
    check("a wrong header is rejected", (await POST(post(EVENT, { "x-ut-webhook-secret": "wrong" }))).status === 401);
    check("the old ?token= form is no longer accepted", (await POST(post(EVENT, {}, "http://x/api/brevo-webhook?token=" + SECRET))).status === 401);
    check("a correct header is accepted", (await POST(post(EVENT, { "x-ut-webhook-secret": SECRET }))).status === 200);

    const basic = "Basic " + Buffer.from("ut:" + SECRET).toString("base64");
    check("Basic auth with the right password is accepted", (await POST(post(EVENT, { authorization: basic }))).status === 200);
    const badBasic = "Basic " + Buffer.from("ut:nope").toString("base64");
    check("Basic auth with a wrong password is rejected", (await POST(post(EVENT, { authorization: badBasic }))).status === 401);

    const batch = await POST(post([EVENT, { ...EVENT, event: "hard_bounce", "message-id": "m2" }], { "x-ut-webhook-secret": SECRET }));
    const body = await batch.json();
    check("a batch is processed", batch.status === 200 && body.applied === 2, JSON.stringify(body));

    const junk = await POST(new NextRequest("http://x/api/brevo-webhook", { method: "POST", headers: { "content-type": "application/json", "x-ut-webhook-secret": SECRET }, body: "not json" }));
    check("a malformed body is a 400, not a crash", junk.status === 400, "status " + junk.status);
  }

  srv.close();
  console.log(`\n${failures.length ? "FAILURES" : "ALL PASS"} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
})().catch((e) => { console.error("harness crashed:", e); process.exit(1); });
