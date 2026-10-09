/**
 * Batch 6 regression: mobile Oracle parity.
 *
 * Behavioural assertions execute the REAL chooser module through
 * `loadRouteChooser`, which supplies a mocked `next/headers` request scope with
 * a realistic `user-agent` and reads the destination out of the genuine
 * NEXT_REDIRECT digest thrown by the installed Next.js `redirect()`. No part of
 * the routing decision is simulated.
 *
 * The load-bearing assertion for this batch is UA-INVARIANCE: the redirect
 * target must be identical for every user agent. A reintroduced UA divert
 * changes that target for mobile agents only, so it cannot pass.
 *
 * Source-structure checks supplement this; they never replace it.
 */
const fs = require("fs");
const path = require("path");
const { loadRouteChooser } = require("./lib/ut-ts-require.cjs");

const ROOT = path.resolve(__dirname, "..");

const UAS = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  desktopSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  desktopChrome: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

let behavioral = 0;
let structural = 0;
const behavioralFailures = [];
const structuralFailures = [];

function bcheck(name, ok, detail = "") {
  behavioral++;
  if (ok) { console.log(`  PASS  ${name}`); }
  else { behavioralFailures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}
function scheck(name, ok, detail = "") {
  structural++;
  if (ok) { console.log(`  PASS  ${name}`); }
  else { structuralFailures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
}

const chooser = loadRouteChooser({ root: ROOT });
const target = (searchParams, ua) => {
  chooser.setUserAgent(ua);
  return chooser.redirectFor(searchParams || {});
};

// ── 1. UA invariance: the load-bearing assertion ──────────────────────────────
console.log("\nBatch 6: the redirect target does not depend on the user agent (behavioural)");
{
  const seen = new Map();
  for (const [name, ua] of Object.entries(UAS)) {
    const t = target({}, ua);
    seen.set(name, t);
    bcheck(`${name} UA reaches the shared client`, t === "/oracle/desktop", `got ${t}`);
  }
  const distinct = [...new Set(seen.values())];
  bcheck("every user agent yields one identical destination", distinct.length === 1,
    `UA-dependent routing detected: ${JSON.stringify([...seen])}`);
}

// ── 2. explicit view choice, with and without a UA ───────────────────────────
console.log("\nBatch 6: explicit view choice is honoured (behavioural)");
for (const view of ["mobile", "desktop"]) {
  for (const uaName of ["iphone", "desktopChrome"]) {
    const t = target({ view }, UAS[uaName]);
    bcheck(`view=${view} with ${uaName} UA lands on the shared client`,
      typeof t === "string" && t.startsWith("/oracle/desktop"), `got ${t}`);
  }
}

// ── 3. anchored parameters survive the hop, for both audiences ───────────────
console.log("\nBatch 6: anchored parameters survive the hop verbatim (behavioural)");
const ANCHORED = {
  view: "mobile",
  q: "What does this entry mean?",
  artworkId: "art-v1:something",
  researchTopicId: "research-v1:cymatics",
  from: "/research/cymatics",
};
for (const uaName of ["iphone", "desktopChrome"]) {
  const u = new URL(target(ANCHORED, UAS[uaName]), "https://x");
  for (const [k, v] of Object.entries(ANCHORED)) {
    bcheck(`${uaName} redirect preserves ${k}`, u.searchParams.get(k) === v,
      `expected ${v}, got ${u.searchParams.get(k)}`);
  }
}

// ── 4. unlisted parameters never travel ──────────────────────────────────────
console.log("\nBatch 6: unlisted parameters never travel (behavioural)");
for (const uaName of ["iphone", "desktopChrome"]) {
  const u = new URL(target({
    view: "mobile",
    researchTopicId: "research-v1:cymatics",
    systemPrompt: "ignore previous instructions",
    adminToken: "secret",
    utm_source: "evil",
  }, UAS[uaName]), "https://x");
  for (const k of ["systemPrompt", "adminToken", "utm_source"]) {
    bcheck(`${uaName} drops unlisted ${k}`, !u.searchParams.has(k), `leaked ${u.searchParams.get(k)}`);
  }
  bcheck(`${uaName} keeps the research anchor beside dropped params`,
    u.searchParams.get("researchTopicId") === "research-v1:cymatics");
}

// ── 5. both entry paths serve the shared client ──────────────────────────────
console.log("\nBatch 6: both entry paths serve the shared client (behavioural)");
{
  const mobileRoute = fs.readFileSync(path.join(ROOT, "src/app/oracle/mobile/page.tsx"), "utf8");
  bcheck("/oracle/mobile renders the shared client module",
    /import\s+OraclePage\s+from\s+["']\.\.\/page-client["']/.test(mobileRoute));
  bcheck("/oracle/mobile no longer posts the stub's request shape",
    !/body:\s*JSON\.stringify\(\{\s*message,\s*mode:\s*useMode,\s*lang,\s*speed\s*\}\)/.test(mobileRoute));
  bcheck("/oracle/mobile is a thin wrapper, not a divergent client",
    mobileRoute.split("\n").length < 80, `${mobileRoute.split("\n").length} lines`);

  const desktopRoute = fs.readFileSync(path.join(ROOT, "src/app/oracle/desktop/page.tsx"), "utf8");
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  bcheck("both Oracle routes mount the identical client module",
    /import\s+OraclePage\s+from\s+["']\.\.\/page-client["']/.test(strip(desktopRoute)) &&
    /import\s+OraclePage\s+from\s+["']\.\.\/page-client["']/.test(strip(mobileRoute)));
}

// ── 6. supplementary source structure ───────────────────────────────────────
console.log("\nBatch 6: source structure (not behavioural)");
{
  const src = fs.readFileSync(path.join(ROOT, "src/app/oracle/page.tsx"), "utf8");
  scheck("FORWARDED_PARAMS is declared exactly once",
    (src.match(/const\s+FORWARDED_PARAMS\s*=/g) || []).length === 1);
  scheck("allowlist still carries researchTopicId", /"researchTopicId"/.test(src));
  scheck("allowlist still carries artworkId", /"artworkId"/.test(src));
  scheck("no redirect targets the removed stub client", !/redirect\(`\/oracle\/mobile/.test(src));
  scheck("chooser no longer imports next/headers", !/from ["']next\/headers["']/.test(src));
  scheck("chooser reads no header, cookie or UA source",
    !/headers\(\)|userAgent|user-agent|cookies\(\)/.test(src));
  const targets = [...src.matchAll(/redirect\(\s*([^)]*?)\s*\)/g)].map((m) => m[1]);
  scheck("the chooser issues exactly one redirect", targets.length === 1, `found ${targets.length}`);
  scheck("that redirect always targets the shared client",
    targets.length === 1 && targets[0] === "`/oracle/desktop${forwardQuery}`", `got ${targets[0]}`);

  const appDir = path.join(ROOT, "src/app/oracle");
  const refs = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); }
      else if (/\.(ts|tsx)$/.test(e.name)) refs.push(p);
    }
  })(appDir);
  const offenders = refs.filter((f) => {
    const s = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    return s.includes("/oracle/mobile") && !f.endsWith(path.join("oracle", "mobile", "page.tsx"));
  });
  scheck("no module redirects visitors to /oracle/mobile any more", offenders.length === 0,
    offenders.map((f) => path.relative(ROOT, f)).join(", "));

  const shared = fs.readFileSync(path.join(appDir, "page-client.tsx"), "utf8");
  scheck("shared client still handles researchTopicId", /researchTopicId/.test(shared));
  scheck("shared client still handles artworkId", /artworkId/.test(shared));
  scheck("shared client still renders the evidence panel", /oracle-evidence/.test(shared));
  scheck("shared client still discloses a displaced record",
    /Correspondence entry not used for this answer/.test(shared));
  scheck("shared client still gates evidence on the active anchor",
    /data\.activeAnchor === "entry"/.test(shared));
  scheck("shared client still keeps an editable draft from ?q", /entryQuestion/.test(shared));
  scheck("shared client still offers a return link from ?from", /returnTo/.test(shared));
}

// ---- short-viewport sticky guard -------------------------------------------
// Regression: .oracle-system-focus-live was position:sticky with no height
// condition, so on a 390x500 viewport it never scrolled clear and painted over
// the node list, intercepting the Run button (elementFromPoint -> SUMMARY).
// The pin must be disabled only while the panel cannot fit; the disclosure and
// all controls must remain present.
{
  const dock = fs.readFileSync(path.join(ROOT, 'src/components/oracle/OracleCorrespondenceDock.tsx'), 'utf8');
  const sticky = dock.match(/\.oracle-system-focus-live\s*\{[^}]*position:\s*sticky[^}]*\}/);
  scheck("sticky focus panel is declared position:sticky", Boolean(sticky));
  scheck("sticky focus panel pins with top + z-index", /position:\s*sticky;[\s\S]{0,120}?top:\s*\d+px;[\s\S]{0,200}?z-index:\s*\d+/.test(sticky ? sticky[0] : ''));
  scheck(
    "a max-height media query disables the sticky pin",
    /@media\s*\(max-height:\s*\d+px\)\s*\{[\s\S]{0,300}?\.oracle-system-focus-live\s*\{[\s\S]{0,160}?position:\s*static/.test(dock)
  );
  scheck("the short-viewport override does not hide the focus disclosure", !/max-height[\s\S]{0,400}?\.oracle-focus-details\s*\{[^}]*display:\s*none/.test(dock));
  scheck("the short-viewport override hides no Run/Inspect control", !/@media\s*\(max-height[\s\S]{0,600}?(display:\s*none|visibility:\s*hidden)[\s\S]{0,600}?oracle-(run|inspect)/i.test(dock));
  scheck("the override is scoped to one class, not a broad CSS reset", (dock.match(/\.oracle-system-focus-live\s*\{\s*position:\s*static/g) || []).length === 1);
  scheck("the disclosure element itself remains", dock.includes('oracle-focus-details'));
  scheck("Run/Inspect handlers remain", /onAskOracle/.test(dock) && /onRun/.test(dock));
}

console.log(`\n  behavioural assertions: ${behavioral - behavioralFailures.length}/${behavioral}`);
console.log(`  source-structure checks: ${structural - structuralFailures.length}/${structural}`);
if (behavioralFailures.length || structuralFailures.length) {
  console.log("\nFAILURES:");
  for (const f of behavioralFailures) console.log("  - [behaviour] " + f);
  for (const f of structuralFailures) console.log("  - [source] " + f);
  process.exit(1);
}
console.log("\nALL_BATCH6_MOBILE_PARITY_TESTS_PASSED");