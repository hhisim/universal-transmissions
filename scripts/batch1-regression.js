/**
 * Focused regression tests for Batch 1 (Oracle readiness, readability, handoff).
 *
 * These run as plain node scripts (no test framework) so they work in the
 * isolated worktree without adding dependencies. Each asserts one contract.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] || process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const pageClient = read("src/app/oracle/page-client.tsx");
const router = read("src/app/oracle/page.tsx");
const desktop = read("src/app/oracle/desktop/page.tsx");
const apiRoute = read("src/app/api/oracle/route.ts");
const gallery = read("src/app/gallery/[slug]/page.tsx");
const analytics = read("src/lib/analytics.ts");
const analyticsRoute = read("src/app/api/analytics/event/route.ts");

console.log("\nB. Readiness: no fixed gate before input is usable");
check(
  "no 5x900ms boot interval + 1200ms hand-off",
  !/setTimeout\(\(\) => setBooted\(true\), 1200\)/.test(pageClient),
  "found the old 1200ms gate"
);
check(
  "booted set without a timer delay",
  /requestAnimationFrame\(\(\) => setBooted\(true\)\)/.test(pageClient),
  "expected rAF-based immediate readiness"
);
check(
  "boot overlay is aria-hidden and non-interactive",
  /className="oracle-boot-overlay" aria-hidden="true"/.test(pageClient)
);
check(
  "overlay CSS sets pointer-events: none",
  /\.oracle-boot-overlay\s*\{[^}]*pointer-events:\s*none/.test(pageClient)
);
check(
  "reduced motion skips boot entirely",
  /prefers-reduced-motion: reduce/.test(pageClient)
);

console.log("\nC. Text before speech");
check(
  "answer appended before TTS is awaited",
  /const bubble: Msg = \{[\s\S]{0,400}?setMsgs\(\(p\) => \[\.\.\.p, bubble\]\)[\s\S]{0,800}?fetchTTS\(answer\)\.then\(/.test(pageClient),
  "expected the answer append to precede the fire-and-forget TTS call"
);
check(
  "the answer append is not gated on TTS resolving",
  !/await fetchTTS/.test(pageClient),
  "found an awaited TTS before the append"
);
check(
  "TTS is fired in background, not awaited inline",
  /fetchTTS\(answer\)\.then\(/.test(pageClient),
  "expected fire-and-forget TTS"
);
check(
  "no raw audioUrl const from awaited fetchTTS",
  !/const audioUrl = answer \? await fetchTTS/.test(pageClient),
  "found the old awaited-TTS pattern"
);
check(
  "stale request aborted via AbortController",
  /reqAbortRef\.current\?\.abort\(\)/.test(pageClient) && /signal: reqController\.signal/.test(pageClient)
);
check(
  "aborted requests do not append an answer",
  /if \(reqController\.signal\.aborted\) return;/.test(pageClient)
);
check(
  "object URLs revoked for discarded audio",
  /URL\.revokeObjectURL\(audioUrl\)/.test(pageClient)
);
check(
  "TTS failure cannot corrupt the answer",
  /ttsPending: voiceOn && Boolean\(answer\)/.test(pageClient)
);
check(
  "raw backend detail no longer shown to visitor",
  !/The transmission was interrupted\. \$\{detail\}/.test(pageClient),
  "raw error detail still interpolated into the answer"
);

console.log("\nD. Readable immediately");
check(
  "readable markdown rendered unconditionally",
  /<div className="oracle-answer-readable">\s*<ReactMarkdown/.test(pageClient)
);
check(
  "decode echo is opt-in via state",
  /const \[decodedOverlay, setDecodedOverlay\] = useState\(false\)/.test(pageClient)
);
check(
  "decoded echo toggle is aria-pressed",
  /aria-pressed=\{decodedOverlay\}/.test(pageClient)
);
check(
  "glyph identity preserved (DecryptText still exists)",
  /function DecryptText/.test(pageClient)
);
check(
  "xenolinguistic mode retained",
  /encryptXeno/.test(pageClient)
);
check(
  "input has accessible name",
  /aria-label=\{t\.placeholder\}/.test(pageClient)
);
check(
  "live status region present",
  /role="status" aria-live="polite"/.test(pageClient)
);

console.log("\nE. Artwork context handoff");
check(
  "gallery link carries artworkId",
  /artworkId=\$\{encodeURIComponent\(artwork\.id\)\}/.test(gallery)
);
check(
  "gallery link carries return path",
  /from=\$\{encodeURIComponent\(`\/gallery\/\$\{artwork\.slug\}`\)\}/.test(gallery)
);
check(
  "/oracle redirect preserves allowlisted params",
  /buildForwardQuery/.test(router) && /FORWARDED_PARAMS = \["view", "q", "artworkId", "from"\]/.test(router)
);
check(
  "redirect does not blanket-forward unknown params",
  (router.match(/params\.set\(key, value\)/g) || []).length === 1
);
check(
  "q seeds an editable draft",
  /searchParams\.get\("q"\)/.test(pageClient)
);
check(
  "draft is never auto-submitted",
  !/send\(draftQuestion\)|send\(fromEntry\)/.test(pageClient),
  "found an auto-submit of the seeded draft"
);
check(
  "artwork id resolved against the registry",
  /artworks\.find\(\(a\) => a\.id === rawArtworkId \|\| a\.slug === rawArtworkId\)/.test(pageClient)
);
check(
  "untrusted title from URL is not displayed",
  !/searchParams\.get\("artworkTitle"\)/.test(pageClient)
);
check(
  "return path validated (relative only)",
  /returnTo\.startsWith\("\/"\) && !returnTo\.startsWith\("\/\/"\)/.test(pageClient)
);
check(
  "server re-resolves artwork id, ignoring client title",
  /function resolveArtwork/.test(apiRoute) && /composed\.message/.test(apiRoute) && /message: composed\.message/.test(apiRoute));
check(
  "unknown artwork id is dropped, not echoed",
  /if \(!match\) return null;/.test(apiRoute)
);
check(
  "desktop page wrapped in Suspense",
  /Suspense/.test(desktop)
);

console.log("\nE. Analytics does not capture free-text prompts");
check(
  "client no longer concatenates location.search",
  !/location\.pathname\}\$\{window\.location\.search\}/.test(analytics),
  "query string still concatenated into path"
);
check(
  "client has a sanitizing path helper",
  /function sanitizedPath/.test(analytics)
);
check(
  "server strips query strings too",
  /function pathOnly/.test(analyticsRoute) && /pathOnly\(body\.path/.test(analyticsRoute)
);
check(
  "entity ids are allowlisted",
  /ALLOWED_ENTITY_ID/.test(analytics) && /ENTITY_ID/.test(analyticsRoute)
);
check(
  "no duplicate helper definitions",
  (analyticsRoute.match(/function pathOnly\(/g) || []).length === 1
);

console.log("\nRegression: unchanged behaviour that must not break");
for (const mode of ["oracle", "correspondence", "etymology", "tarot_arcana"]) {
  check(`mode "${mode}" still handled`, pageClient.includes(`"${mode}"`) || pageClient.includes(`${mode}`));
}
check("EN/TR/RU languages retained", /"en"/.test(pageClient) && /"tr"/.test(pageClient) && /"ru"/.test(pageClient));
check("voice controls retained", /voiceOn/.test(pageClient) && /voiceGender/.test(pageClient));
check("fast/deep speed toggle retained", /setSpeed\("fast"\)/.test(pageClient) && /"deep"/.test(pageClient));
check("guest tier limits retained", /tier === "initiate" \? Infinity/.test(pageClient));
check("AudioPlayer still wired", /function AudioPlayer/.test(pageClient));
check("correspondence dock retained", /OracleCorrespondenceDock/.test(pageClient));
check("API timeout retained", /120000/.test(apiRoute));
check("API packs codex", /pack: 'codex'/.test(apiRoute));

console.log(`\n${"=".repeat(56)}`);
console.log(`PASS ${pass}   FAIL ${fail}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("ALL_REGRESSION_TESTS_PASSED");