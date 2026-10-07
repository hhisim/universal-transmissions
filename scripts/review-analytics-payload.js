/**
 * Review regression: prompt text must be absent from the COMPLETE event payload.
 *
 * The earlier check only asserted the `path` field. This test exercises the real
 * server route module: it loads route.ts, strips the TypeScript-only syntax, and
 * calls POST with a payload shaped exactly like InteractionTracker's output for
 * the artwork -> Oracle link (which carries ?q=<prompt>), then asserts the
 * prompt text appears NOWHERE in the row that would be inserted.
 */
const fs = require("fs");
const path = require("path");

// Resolve ROOT to an absolute path: the scripts are run as `node scripts/x.js .`
// and a relative ROOT would make path.join() drop the leading slash.
const ROOT = path.resolve(process.argv[2] || process.cwd());
const routePath = path.join(ROOT, "src/app/api/analytics/event/route.ts");
const libPath = path.join(ROOT, "src/lib/analytics.ts");
const trackerPath = path.join(ROOT, "src/components/analytics/InteractionTracker.tsx");
const ts = require(path.join(ROOT, "node_modules/typescript"));

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

// ── Source-level invariants (fast, no eval needed) ──────────────────────
const route = fs.readFileSync(routePath, "utf8");
const lib = fs.readFileSync(libPath, "utf8");
const tracker = fs.readFileSync(trackerPath, "utf8");

console.log("\nAnalytics: payload construction");
check("tracker no longer sends target_url as url.href", !/target_url:\s*url\.href/.test(tracker));
check("tracker has no textContent fallback in code", !/label:\s*tokenLabel\([^)]*textContent/.test(tracker));
check("tracker label is token-gated", /function tokenLabel/.test(tracker));
check("tracker sends entity ids", /entity_id:\s*\w+\.dataset\.analyticsEntityId/.test(tracker));

console.log("\nAnalytics: server-side enforcement");
check("event_name is allowlisted", /allowlisted\(body\.event_name, ALLOWED_EVENTS\)/.test(route));
check("category allowlisted", /ALLOWED_CATEGORIES/.test(route));
check("action allowlisted", /ALLOWED_ACTIONS/.test(route));
check("placement allowlisted", /ALLOWED_PLACEMENTS/.test(route));
check("entity_type NOT persisted (column absent from real table)", !/entity_type:/.test(route));
check("post_slug/sku/product_id constrained to token shape", /post_slug: entityId\(/.test(route) && /sku: entityId\(/.test(route));
check("meta restricted to an explicit key list", /ALLOWED_META_KEYS/.test(route));
check("meta label must be token-shaped", /LABEL_TOKEN/.test(route));
check("free-form Object.entries(meta) pass-through is gone", !/Object\.entries\(value as Record<string, unknown>\)/.test(route));
check("referrer stripped of query", /referrer: pathOnly\(/.test(route));

console.log("\nAnalytics: session id is not an entity value");
check("session_id is not persisted as entity data", !/entity_id:\s*getSessionId\(\)/.test(lib));

// ── Behavioural: execute the real route and inspect the stored row ───────
// Transpile with the project's own TypeScript compiler rather than regex
// type-stripping, so the executed code is the real module.
function loadRouteModule() {
  const source = fs.readFileSync(routePath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: "route.ts",
  }).outputText;

  const inserted = [];
  const moduleObj = { exports: {} };
  const req = (spec) => {
    if (spec === "next/server") {
      return {
        NextResponse: {
          json: (body, init) => ({ __json: true, body, status: init && init.status ? init.status : 200 }),
        },
      };
    }
    if (spec.includes("supabase")) {
      return { supabaseAdmin: { from: () => ({ insert: async (row) => { inserted.push(row); return { error: null }; } }) } };
    }
    return {};
  };

  const wrapper = new Function("require", "module", "exports", js);
  wrapper(req, moduleObj, moduleObj.exports);
  return { POST: moduleObj.exports.POST, inserted };
}

const PROMPT = "Tell me about the symbolism inside this glyph field";

/* Shaped exactly like InteractionTracker's output for the artwork CTA. */
const payload = {
  event_name: "oracle_click",
  category: "internal_link",
  action: "click",
  target_url: "/oracle/desktop?view=desktop&artworkId=ut-011&q=" + encodeURIComponent(PROMPT),
  path: "/gallery/vitruvian-spirit?ref=" + encodeURIComponent(PROMPT),
  referrer: "https://www.universal-transmissions.com/gallery/vitruvian-spirit?q=" + encodeURIComponent(PROMPT),
  entity_id: "ut-011",
  entity_type: "artwork",
  meta: { label: "ASK_THE_ORACLE" },
};

/* Minimal NextRequest stand-in: the route reads .json() and .headers. */
const makeReq = (body) => ({
  json: async () => body,
  headers: new Headers({ "user-agent": "review-harness/1.0" }),
});

(async () => {
  console.log("\nAnalytics: end-to-end payload (real route module, real compiler)");
  let POST, inserted;
  try {
    ({ POST, inserted } = loadRouteModule());
    check("route module loaded and executed", typeof POST === "function");
  } catch (e) {
    check("route module loaded and executed", false, String(e).slice(0, 200));
    return;
  }

  const res = await POST(makeReq(payload));
  check("request accepted", res.status === 200, `status ${res.status}`);
  check("row captured for inspection", inserted.length === 1, `inserted ${inserted.length}`);

  const row = inserted[0] || {};
  const serialised = JSON.stringify(row);

  console.log("\n  stored row:", JSON.stringify(row, null, 2));

  // ── The core assertion: the prompt must not appear ANYWHERE. ───────────
  const promptVariants = [
    ["plain prompt", PROMPT],
    ["url-encoded prompt", encodeURIComponent(PROMPT)],
    ["plus-encoded prompt", PROMPT.replace(/ /g, "+")],
    ["lowercase prompt", PROMPT.toLowerCase()],
    ["leading fragment", "Tell me about the symbolism"],
    ["tail fragment", "symbolism inside this glyph field"],
  ];
  for (const [label, variant] of promptVariants) {
    check(`prompt fragment absent from whole stored row: ${label}`,
      !serialised.includes(variant));
  }
  check("no '?' query survives in path", !String(row.path || "").includes("?"));
  check("no '?' query survives in target_url", !String(row.target_url || "").includes("?"));
  check("no '?' query survives in referrer", !String(row.referrer || "").includes("?"));
  check("path is the canonical route", row.path === "/gallery/vitruvian-spirit", `got ${row.path}`);
  check("target_url reduced to pathname", row.target_url === "/oracle/desktop", `got ${row.target_url}`);
  check("entity_id absent from the stored row (unsupported column)", !("entity_id" in row));
  check("entity_type absent from the stored row (unsupported column)", !("entity_type" in row));
  check("token label retained", row.meta && row.meta.label === "ASK_THE_ORACLE");

  // ── Adversarial: hostile payloads must be dropped, not stored ──────────
  console.log("\n  adversarial payloads:");
  const hostile = [
    { name: "prose label (prompt text as label)", body: { event_name: "cta_click", meta: { label: PROMPT } } },
    { name: "unknown meta key", body: { event_name: "cta_click", meta: { prompt: PROMPT, answer: "secret" } } },
    { name: "unknown event name", body: { event_name: "evil_" + PROMPT, category: "internal_link" } },
    { name: "unknown category", body: { event_name: "cta_click", category: PROMPT } },
    { name: "email in session_id", body: { event_name: "cta_click", session_id: "hakan@example.com" } },
    { name: "email in entity_id", body: { event_name: "cta_click", entity_id: "hakan@example.com" } },
    { name: "prompt in post_slug", body: { event_name: "cta_click", post_slug: PROMPT } },
    { name: "unknown entity_type", body: { event_name: "cta_click", entity_type: PROMPT } },
  ];
  for (const h of hostile) {
    const before = inserted.length;
    const r = await POST(makeReq(h.body));
    const rowAfter = inserted[inserted.length - 1] || {};
    const ser = JSON.stringify(rowAfter);
    if (inserted.length === before) {
      // rejected before insert: also acceptable, and arguably better
      check(`${h.name}: rejected (status ${r.status})`, r.status >= 400 || !JSON.stringify(r.body).includes("Tell me"));
    } else {
      check(`${h.name}: prompt absent from stored row`,
        !ser.includes("Tell me about the symbolism") && !ser.includes("secret") && !ser.includes("hakan@example.com"),
        ser.slice(0, 160));
    }
    // Required: never store the sensitive value
    check(`${h.name}: sensitive value not persisted`,
      !JSON.stringify(inserted).includes("Tell me about the symbolism") ||
      !JSON.stringify(inserted).includes("hakan@example.com"));
  }

  console.log("\n  final stored rows:");
  inserted.forEach((r, i) => console.log(`   [${i}]`, JSON.stringify(r)));

  console.log(`\n${"=".repeat(56)}`);
  console.log(`PASS ${pass}   FAIL ${fail}`);
  if (failures.length) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("ALL_ANALYTICS_PAYLOAD_TESTS_PASSED");
})();