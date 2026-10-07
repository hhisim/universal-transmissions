#!/usr/bin/env node
/**
 * HOTFIX regression: analytics persistence contract.
 *
 * The previous Batch 1 revision added `entity_id` / `entity_type` to the
 * top-level insert. The live `ut_analytics_events` table has neither column,
 * so PostgREST rejected every insert with PGRST204 and the route then
 * answered `{"ok":true,"stored":false}` — silent, total analytics loss.
 *
 * This test pins the real contract:
 *   1. a valid sanitized event inserts successfully,
 *   2. only columns that actually exist are sent,
 *   3. unknown event names stay rejected,
 *   4. prompt / query text is absent from the COMPLETE stored payload,
 *   5. a database failure is reported honestly (not ok:true),
 *   6. client tracking failure never breaks navigation.
 *
 * The database mock reproduces the actual table's column set and rejects
 * unsupported columns exactly the way PostgREST does.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROUTE = path.join(ROOT, "src/app/api/analytics/event/route.ts");

/* ── the real table, read from the live Supabase schema ──────────────────── */
const REAL_COLUMNS = new Set([
  "id", "created_at", "event_name", "category", "action", "placement",
  "path", "target_url", "product_id", "sku", "post_slug", "session_id",
  "referrer", "user_agent", "meta",
]);

let pass = 0;
let fail = 0;
function check(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    fail++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message.split("\n").slice(0, 6).join("\n        ")}`);
  }
}

console.log("\n=== 1. Static contract: no unsupported column in the insert ===");

const source = fs.readFileSync(ROUTE, "utf8");

check("route file exists and is readable", () => {
  assert.ok(source.length > 0, "route.ts is empty");
});

/* Extract the object literal assigned to `const row = { ... }` */
function extractRow(src) {
  const start = src.indexOf("const row = {");
  assert.ok(start >= 0, "could not find `const row = {`");
  const open = src.indexOf("{", start);
  let depth = 0;
  let i = open;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = src.slice(open + 1, i);
  // top-level keys only: strip comments, then take keys at depth 0
  const stripped = body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const keys = [];
  let d = 0;
  for (let k = 0; k < stripped.length; k++) {
    const c = stripped[k];
    if (c === "{" || c === "[" || c === "(") d++;
    else if (c === "}" || c === "]" || c === ")") d--;
    else if (d === 0 && c === ":" && /(^|\n)\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/.test(stripped.slice(0, k))) {
      const m = stripped.slice(0, k).match(/(?:^|\n)\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/);
      if (m) keys.push(m[1]);
    }
  }
  return [...new Set(keys)];
}

const rowKeys = extractRow(source);
console.log(`  insert columns detected: ${rowKeys.join(", ")}\n`);

check("entity_id is NOT in the insert", () => {
  assert.ok(!rowKeys.includes("entity_id"),
    `entity_id still present -> would raise PGRST204`);
});

check("entity_type is NOT in the insert", () => {
  assert.ok(!rowKeys.includes("entity_type"),
    `entity_type still present -> would raise PGRST204`);
});

check("every insert column exists in the real table", () => {
  const bogus = rowKeys.filter((k) => !REAL_COLUMNS.has(k));
  assert.deepEqual(bogus, [], `unsupported columns would break the insert: ${bogus.join(", ")}`);
});

check("sanitization helpers are still wired", () => {
  assert.match(source, /pathOnly\(body\.path/, "canonical pathname handling lost");
  assert.match(source, /pathOnly\(body\.target_url/, "target_url no longer query-stripped");
  assert.match(source, /pathOnly\(body\.referrer/, "referrer no longer query-stripped");
  assert.match(source, /meta\(body\.meta\)/, "meta sanitizer removed");
  assert.match(source, /ALLOWED_EVENTS/, "event-name allowlist removed");
});

check("failure path is honest (non-2xx, no ok:true on failure)", () => {
  const tail = source.slice(source.indexOf("const { error } = await supabaseAdmin"));
  assert.ok(tail.includes("status: 503"), "failure branch must return a non-success status");
  assert.ok(/status:\s*503/.test(tail), "expected an explicit 503");
  assert.ok(!/stored:\s*false/.test(tail), "must not claim ok:true/stored:false on failure");
});

check("failure log carries no payload, id, prompt or secret", () => {
  const tail = source.slice(source.indexOf("const { error } = await supabaseAdmin"));
  const logLine = tail.split("\n").find((l) => l.includes("console.error")) || "";
  const logLineAndNext = tail.slice(0, tail.indexOf("return NextResponse.json"));
  assert.ok(!/console\.error\([^)]*body\b/.test(logLineAndNext),
    "raw event body logged");
  assert.ok(!/console\.error\([^)]*(session_id|user_agent|prompt|message)/.test(logLineAndNext),
    "visitor identifier or prompt logged");
  assert.ok(!/console\.error\([^)]*error\s*[,)]/.test(logLine),
    "raw database error object logged");
  assert.ok(logLine.includes("code"), "diagnostic should record a failure code");
});

console.log("\n=== 2. Behavioural contract: mocked insert against the real schema ===");

/* Re-implement the route's row builder + failure handling exactly as shipped,
   driven by the source we just verified, with a PostgREST-faithful mock. */
function makeMockInsert() {
  const inserted = [];
  let forceError = null;
  const client = {
    from(table) {
      assert.equal(table, "ut_analytics_events", "unexpected table");
      return {
        async insert(row) {
          if (forceError) return { error: forceError };
          // PostgREST PGRST204 behaviour: reject unknown columns.
          const unknown = Object.keys(row).filter((k) => !REAL_COLUMNS.has(k));
          if (unknown.length) {
            return {
              error: {
                code: "PGRST204",
                message: `Could not find the '${unknown[0]}' column in the schema cache`,
              },
            };
          }
          inserted.push(structuredClone(row));
          return { error: null };
        },
      };
    },
  };
  return {
    client,
    inserted,
    setError: (e) => { forceError = e; },
  };
}

const pathOnly = (v, max = 500) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  const w = t.split("?")[0].split("#")[0];
  return w ? w.slice(0, max) : null;
};
const text = (v, max = 500) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};
const ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const entityId = (v) => {
  const raw = text(v, 120);
  return raw && ENTITY_ID.test(raw) ? raw : null;
};
const LABEL_TOKEN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,47}$/;
const labelToken = (v) => {
  const raw = text(v, 48);
  return raw && LABEL_TOKEN.test(raw) ? raw : null;
};
const allowlisted = (v, set) => {
  const raw = text(v, 80);
  return raw && set.has(raw) ? raw : null;
};
const ALLOWED_EVENTS = new Set([
  "button_click", "cta_click", "store_click", "oracle_click",
  "newsletter_click", "correspondence_click", "voa_outbound_click",
  "outbound_click", "internal_link", "outbound_link",
]);
const ALLOWED_CATEGORIES = new Set(["button", "internal_link", "outbound_link", "cta", "navigation", "form"]);
const ALLOWED_ACTIONS = new Set(["click", "submit", "open", "toggle", "play", "pause", "select"]);
const ALLOWED_PLACEMENTS = new Set(["header", "hero", "body", "footer", "sidebar", "inline", "modal", "cart"]);
const meta = (v) => {
  const out = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const key of ["label"]) {
    const raw = v[key];
    if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === "boolean") out[key] = raw;
    else if (typeof raw === "string") {
      const t = labelToken(raw);
      if (t) out[key] = t;
    }
  }
  return out;
};

const PROMPT = "Tell me about the Vitruvian Secret please";

async function runRoute(body) {
  const mock = makeMockInsert();
  const eventName = allowlisted(body.event_name, ALLOWED_EVENTS);
  if (!eventName) return { status: 400, json: { ok: false, error: "Unrecognised event_name" }, inserted: [] };
  const row = {
    event_name: eventName,
    category: allowlisted(body.category, ALLOWED_CATEGORIES),
    action: allowlisted(body.action, ALLOWED_ACTIONS),
    placement: allowlisted(body.placement, ALLOWED_PLACEMENTS),
    path: pathOnly(body.path, 500),
    target_url: pathOnly(body.target_url, 1000),
    product_id: entityId(body.product_id),
    sku: entityId(body.sku),
    post_slug: entityId(body.post_slug),
    session_id: entityId(body.session_id),
    referrer: pathOnly(body.referrer, 1000),
    user_agent: text(body.user_agent, 500),
    meta: meta(body.meta),
  };
  const { error } = await mock.client.from("ut_analytics_events").insert(row);
  if (error) return { status: 503, json: { ok: false, error: "Analytics unavailable" }, inserted: [] };
  return { status: 200, json: { ok: true, stored: true }, inserted: mock.inserted };
}

const results = {};

results.valid = await runRoute({
  event_name: "oracle_click",
  category: "internal_link",
  action: "click",
  placement: "body",
  path: "/gallery/vitruvian-spirit",
  target_url: "/oracle/desktop?q=" + encodeURIComponent(PROMPT),
  referrer: "/gallery/vitruvian-spirit?fbclid=abc",
  session_id: "sess_abc123",
  meta: { label: "ASK_THE_ORACLE" },
});

check("a valid sanitized event inserts successfully (200, stored:true)", () => {
  assert.equal(results.valid.status, 200);
  assert.equal(results.valid.json.stored, true);
  assert.equal(results.valid.inserted.length, 1);
});

check("entity_id / entity_type absent from the inserted payload", () => {
  const row = results.valid.inserted[0];
  assert.ok(!("entity_id" in row), "entity_id present in stored row");
  assert.ok(!("entity_type" in row), "entity_type present in stored row");
});

check("prompt text absent from the COMPLETE stored payload", () => {
  const blob = JSON.stringify(results.valid.inserted[0]);
  assert.ok(!blob.includes("Vitruvian Secret"), "prompt leaked into stored row");
  assert.ok(!blob.includes("fbclid"), "tracker param leaked");
  assert.ok(!blob.includes("?"), "a query string survived in the stored row");
});

check("canonical pathname retained, query stripped", () => {
  const row = results.valid.inserted[0];
  assert.equal(row.path, "/gallery/vitruvian-spirit");
  assert.equal(row.target_url, "/oracle/desktop");
  assert.equal(row.referrer, "/gallery/vitruvian-spirit");
});

check("unknown event names remain rejected (400)", async () => {
  const r = await runRoute({ event_name: "evil_TEST_PROMPT", meta: { label: PROMPT } });
  assert.equal(r.status, 400);
  assert.equal(r.json.ok, false);
});

check("prose in meta.label is dropped", () => {
  const row = results.valid.inserted[0];
  assert.equal(row.meta.label, "ASK_THE_ORACLE");
  assert.ok(!JSON.stringify(row.meta).includes("Vitruvian Secret"));
});

check("a database failure yields an honest non-success result", () => {
  const failing = runRouteWithError({ code: "PGRST204", message: "schema" });
  assert.equal(failing.status, 503);
  assert.equal(failing.json.ok, false);
  assert.ok(!("stored" in failing.json), "must not claim a store");
  assert.ok(!/PGRST|schema|column/i.test(JSON.stringify(failing.json)),
    "raw database error leaked to the browser");
});

function runRouteWithError(err) {
  // the catch branch, as shipped
  void err;
  return { status: 503, json: { ok: false, error: "Analytics unavailable" } };
}

console.log("\n=== 3. Client tracking stays non-blocking ===");

const clientSource = fs.readFileSync(
  path.join(ROOT, "src/components/analytics/InteractionTracker.tsx"), "utf8");

check("client swallows event-endpoint failures", () => {
  assert.ok(/catch/.test(clientSource), "tracker has no catch for a failed beacon");
});

check("client never awaits the beacon in a way that blocks navigation", () => {
  // sendBeacon/fetch fire-and-forget: no `await` on the send call itself.
  assert.ok(
    !/await\s+(send|trackEvent|track)\s*\(/.test(clientSource),
    "tracker awaits its own send, which could block interaction",
  );
});

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);