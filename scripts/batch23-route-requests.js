#!/usr/bin/env node
/**
 * Request-level tests for BOTH Oracle route handlers, with the provider mocked.
 *
 * Reading a route module and matching a regex does not establish that the route
 * behaves: these tests build real Requests, invoke the exported POST handler, and
 * assert on the response the visitor would actually receive. The outbound provider
 * call is intercepted, so no model is contacted and the run is deterministic.
 */
const path = require("path");
const ROOT = path.join(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

// The route graph reaches blog content and stylesheets, which node cannot parse.
// Stub the non-code extensions so the ROUTE MODULE itself loads unmodified.
const MINIMAL_POST = "---\ntitle: stub\ndate: 2026-01-01\n---\n\nstub body\n";
for (const ext of [".md", ".mdx"]) {
  // A plain string: the modules call .replace() on it, and esModuleInterop wraps a
  // non-ESM export as { default: value }, so a default import still receives a string.
  require.extensions[ext] = (mod) => { mod.exports = MINIMAL_POST; };
}
for (const ext of [".css", ".scss", ".svg", ".png", ".jpg", ".webp"]) {
  require.extensions[ext] = (mod) => { mod.exports = ""; };
}

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed += 1; } else { failed += 1; console.log("  FAIL: " + m); } };

// ── mock the provider: capture what the route composed, answer with the record ids ──
let captured = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  captured.push({ url: u, body: init && init.body ? String(init.body) : null });
  let composed = "";
  try { composed = JSON.parse(String(init.body)).message || ""; } catch {}
  const ids = [];
  const re = /corr-v1:[A-Z_]+::[A-Za-z0-9%._-]+/g;
  let m; while ((m = re.exec(composed)) !== null) if (ids.indexOf(m[0]) === -1) ids.push(m[0]);
  return new Response(JSON.stringify({
    response: "MOCK ANSWER grounded on: " + (ids.join(", ") || "no record"),
    retrieval_status: "ok", sources: [], usage: {},
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};

const routes = {
  "/api/oracle": require(path.join(ROOT, "src/app/api/oracle/route.ts")),
  "/api/codex-oracle": require(path.join(ROOT, "src/app/api/codex-oracle/route.ts")),
};

async function call(which, body) {
  captured = [];
  const res = await routes[which].POST(new Request("https://ut.test" + which, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
  let json = {}; try { json = await res.json(); } catch {}
  return { status: res.status, json, composed: captured.map((c) => c.body).join("\n"), calls: captured };
}

const ALEPH_Q = "Follow Aleph through its element, colour and frequency. How do these correspondences unfold together?";
const SYSTEMS = Object.keys(routes);

(async () => {
  for (const which of SYSTEMS) {
    console.log("\n  === " + which + " (request-level, provider mocked) ===");

    // R1 named record -> grounding reaches the provider
    let r = await call(which, { message: ALEPH_Q });
    ok(r.status === 200, which + " R1 answers 200");
    ok(/corr-v1:LETTERS_HEBREW::Aleph/.test(r.composed), which + " R1 the Aleph record identity reaches the provider");
    ok((r.json.namedRecords && r.json.namedRecords.ids || []).indexOf("corr-v1:LETTERS_HEBREW::Aleph") !== -1,
      which + " R1 namedRecords reports the Aleph identity");
    const turn1 = r.json.response;

    // R2 continuity: follow-up without repeating the name
    const hist = [{ role: "user", content: ALEPH_Q }, { role: "assistant", content: turn1 }];
    r = await call(which, { message: "And how does that relate to the colour?", history: hist });
    ok(r.status === 200, which + " R2 answers 200");
    ok(/corr-v1:LETTERS_HEBREW::Aleph/.test(r.composed), which + " R2 the follow-up STILL grounds on Aleph");

    // R3 ambiguity preserved
    r = await call(which, { message: "Tell me about copper in the archive." });
    const amb = r.json.namedRecords && r.json.namedRecords.ambiguous || [];
    ok(amb.length === 1 && amb[0].matches.length === 2, which + " R3 both copper candidates preserved");

    // R4 clarification through the system, request-level
    const copperHist = [{ role: "user", content: "Tell me about copper in the archive." },
                        { role: "assistant", content: "Which copper do you mean?" }];
    r = await call(which, { message: "The metal one.", history: copperHist });
    ok(/corr-v1:METALS::Copper/.test(r.composed), which + " R4 the clarification grounds on METALS::Copper");

    // R5 a property follow-up after the clarification keeps it
    const clarifiedHist = copperHist.concat([{ role: "user", content: "The metal one." },
                                             { role: "assistant", content: "Copper, the metal." }]);
    r = await call(which, { message: "What is its colour?", history: clarifiedHist });
    ok(/corr-v1:METALS::Copper/.test(r.composed), which + " R5 a property follow-up keeps METALS::Copper");
    ok(!/corr-v1:COLORS::Copper/.test(r.composed), which + " R5 ...and does not switch to COLORS::Copper");

    // R6 a new unknown subject prevents revival
    const zorbHist = [{ role: "user", content: ALEPH_Q }, { role: "assistant", content: "Aleph carries Air." },
                      { role: "user", content: "Tell me about Zorblax." }, { role: "assistant", content: "No record of Zorblax." }];
    r = await call(which, { message: "What does it mean?", history: zorbHist });
    ok(!/corr-v1:LETTERS_HEBREW::Aleph/.test(r.composed), which + " R6 no Aleph revival after an unknown subject");

    // R7 unknown name attaches nothing
    r = await call(which, { message: "Follow Zorblax through its element and colour." });
    ok(!/corr-v1:/.test(r.composed), which + " R7 an unknown name attaches no record at all");

    // R8 explicit precedence, incl. an unresolved identifier (/api/oracle only; the
    //    codex route has no selection input)
    if (which === "/api/oracle") {
      r = await call(which, { message: "What does this record say?", entityType: "correspondence_entry", entityId: "corr-v1:LETTERS_HEBREW::Gimel" });
      ok(r.json.entityStatus === "resolved", which + " R8a a valid explicit selection resolves");
      ok(/corr-v1:LETTERS_HEBREW::Gimel/.test(r.composed), which + " R8a ...and grounds on the SELECTED record");
      r = await call(which, { message: ALEPH_Q, entityType: "correspondence_entry", entityId: "corr-v1:NOT_A_SYSTEM::Nonexistent" });
      ok(r.json.entityStatus === "unknown", which + " R8b an unresolved identifier reports unknown");
      ok(!/corr-v1:LETTERS_HEBREW::Aleph/.test(r.composed),
        which + " R8b ...and does NOT silently become an inferred Aleph record");
      ok(!r.json.namedRecords, which + " R8b ...namedRecords stays null");
    }
  }

  globalThis.fetch = realFetch;
  console.log("\n  assertions passed: " + passed);
  console.log("  assertions failed: " + failed);
  if (!failed) console.log("\nBATCH23_ROUTE_REQUEST_TESTS_PASSED");
  process.exit(failed ? 1 : 0);
})();
