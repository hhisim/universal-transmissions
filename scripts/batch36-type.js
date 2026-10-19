#!/usr/bin/env node
/**
 * batch36-type.js — the glyph transformation must be deliberate, brief and reversible.
 *
 * Three things are asserted here without a browser:
 *
 *   1. The released static rendering is byte-identical. The test reimplements the original
 *      algorithm and compares, so "we kept the existing system" is a measurement rather than a claim.
 *   2. The burst schedule is brief, peaks where it says it does, and always ends by settling.
 *   3. The guards refuse to transform under reduced motion, in a hidden tab, or twice.
 *
 * The rendered proof — readable at rest, readable with JavaScript off, readable in a background
 * tab, clean accessible name — is the browser capture, not this file.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });

const G = require(path.join(ROOT, "src/lib/glyph-burst.ts"));

let pass = 0, fail = 0;
const failures = [];
function ok(condition, message) {
  if (condition) { pass += 1; console.log("    ok   " + message); }
  else { fail += 1; failures.push(message); console.log("    FAIL " + message); }
}

/* ── the algorithm as it shipped, for parity ─────────────────────────────────────────────── */
const UP = ["\u0300","\u0301","\u0302","\u0303","\u0304","\u0305","\u0306","\u0307","\u0308","\u0309","\u030A","\u030B","\u030C","\u030D","\u030E","\u030F","\u0310","\u0311","\u0312","\u0313","\u0314","\u0315","\u031A"];
const DOWN = ["\u0316","\u0317","\u0318","\u0319","\u031C","\u031D","\u031E","\u031F","\u0320","\u0321","\u0322","\u0323","\u0324","\u0325","\u0326","\u0327","\u0328","\u0329","\u032A","\u032B","\u032C","\u032D","\u032E","\u032F","\u0330","\u0331","\u0332","\u0333"];
const MID = ["\u0323","\u0334","\u0335","\u0336","\u0337","\u0338","\u0339","\u033A","\u033B","\u033C","\u033D","\u033E","\u033F","\u0340","\u0341","\u0342","\u0343","\u0344","\u0345","\u0346"];

function legacy(text, intensity) {
  let s = text.length * 31 + intensity.length * 17;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  const counts = { subtle: { up: 1, down: 0, mid: 0 }, moderate: { up: 2, down: 1, mid: 1 }, heavy: { up: 4, down: 3, mid: 2 } }[intensity];
  let out = "";
  for (const char of text.split("")) {
    if (char === " ") { out += char; continue; }
    let r = "";
    for (let i = 0; i < counts.up; i++) r += UP[Math.floor(rng() * UP.length)];
    for (let i = 0; i < counts.mid; i++) r += MID[Math.floor(rng() * MID.length)];
    r += char;
    for (let i = 0; i < counts.down; i++) r += DOWN[Math.floor(rng() * DOWN.length)];
    out += r;
  }
  return out;
}

console.log("\n  1. every existing static title keeps exactly the marks it had");
{
  const cases = [
    ["THE CODEX", "heavy"], ["Journal", "moderate"], ["Universal Transmissions", "moderate"],
    ["Gallery", "moderate"], ["Origin", "subtle"], ["", "moderate"], ["Two  spaces", "heavy"],
  ];
  let mismatched = 0;
  for (const [text, intensity] of cases) {
    if (G.corrupt(text, intensity) !== legacy(text, intensity)) {
      mismatched += 1;
      console.log("       differs:", JSON.stringify(text), intensity);
    }
  }
  ok(mismatched === 0, "static output is byte-identical to the released algorithm (" + cases.length + " cases)");
}

console.log("\n  2. the corruption is deterministic and actually corrupts");
{
  ok(G.corrupt("THE CODEX", "heavy") === G.corrupt("THE CODEX", "heavy"), "same words + intensity → same glyphs, every time");
  ok(G.corrupt("THE CODEX", "heavy") !== "THE CODEX", "the corrupted form is not the plain form");
  ok([...G.corrupt("Journal", "moderate")].some((c) => c >= "\u0300" && c <= "\u036f"), "the corruption uses combining marks");
  ok(G.corrupt("a b", "heavy").length > 3, "spaces survive and marks are added around letters");
  ok(G.corrupt("A", "subtle").length > 1 && G.corrupt("A", "heavy").length > G.corrupt("A", "subtle").length,
    "a higher intensity produces more corruption");
}

console.log("\n  3. the transformation is brief, peaks deliberately, and settles");
{
  const moderate = G.burstPlan("moderate");
  ok(moderate[0].intensity === "subtle", "it opens quietly");
  ok(moderate.some((p) => p.intensity === "moderate"), "it reaches the stated peak");
  ok(moderate[moderate.length - 1].intensity === "subtle", "it resolves on the quiet phase");
  ok(G.burstDuration("moderate") <= 1000, "it lasts under a second (" + G.burstDuration("moderate") + "ms)");

  const heavy = G.burstPlan("heavy");
  ok(heavy.some((p) => p.intensity === "heavy"), "the Codex title does reach heavy");
  ok(heavy[heavy.length - 1].intensity === "subtle", "…and still resolves quietly");
  ok(G.burstDuration("heavy") <= 1000, "heavy stays under a second (" + G.burstDuration("heavy") + "ms)");

  ok(G.burstPlan("subtle").length === 1 && G.burstDuration("subtle") <= 400, "subtle is a single short phase");
  ok(G.burstPlan("moderate").every((p) => p.ms > 0), "no zero-length phases");
}

console.log("\n  4. it refuses to transform when it should");
{
  ok(G.shouldBurst({ reducedMotion: true, hidden: false, alreadyPlayed: false }) === false,
    "reduced motion → never transforms");
  ok(G.shouldBurst({ reducedMotion: false, hidden: true, alreadyPlayed: false }) === false,
    "a background tab → never transforms");
  ok(G.shouldBurst({ reducedMotion: false, hidden: false, alreadyPlayed: true }) === false,
    "it does not repeat");
  ok(G.shouldBurst({ reducedMotion: false, hidden: false, alreadyPlayed: false }) === true,
    "an ordinary visible visit → transforms once");
  ok(G.shouldBurst({ reducedMotion: true, hidden: true, alreadyPlayed: true }) === false,
    "every guard at once still refuses");
}

console.log("\n  5. the component contract (smoke)");
{
  const file = path.join(ROOT, "src/components/ui/ZalgoText.tsx");
  const src = fs.readFileSync(file, "utf8");
  ok(/"use client"/.test(src), "still a client component");
  ok(!/Math\.random/.test(src), "no unseeded randomness — server and client cannot disagree");
  /* Comment text mentions tabindex on purpose; only a real attribute would add a keyboard stop. */
  ok(!/\btabIndex=|\btabindex=/.test(src), "the component adds no keyboard stop");
  ok(/aria-hidden="true"/.test(src), "the decorative layer is hidden from assistive technology");
  ok(/data-glyph-burst/.test(src), "the burst state is observable for verification");
  ok(/\{text\}/.test(src), "the plain words are always rendered");
  /* Regression: the pilot headings are gradient-clipped, which makes their text transparent.
     An absolutely positioned decoration inherits that transparency and paints nothing — the title
     then vanishes mid-burst. The decoration must set its own fill. */
  ok(/WebkitTextFillColor/.test(src), "the decoration sets an explicit text fill so it cannot inherit transparency");
  ok(!/opacity: active \? 0 : 1/.test(src), "the readable text is never hidden during the burst");
  ok(/mode\?: "static" \| "burst"/.test(src), "burst is opt-in; static stays the default");

  const pages = ["src/app/page.tsx", "src/app/journal/page.tsx", "src/app/codex/page.tsx"];
  let piloted = 0;
  for (const page of pages) {
    const content = fs.readFileSync(path.join(ROOT, page), "utf8");
    if (/mode="burst"/.test(content)) piloted += 1;
  }
  ok(piloted === 3, "the pilot covers the three named titles (" + piloted + "/3)");

  const nav = fs.readFileSync(path.join(ROOT, "src/components/ui/Navigation.tsx"), "utf8");
  ok(!/mode="burst"/.test(nav), "navigation keeps its existing behaviour — no global change");
  ok(/<ZalgoText/.test(nav), "navigation still uses the same typography system");
}

console.log("\n  ==================== SUMMARY ====================");
console.log(`   assertions passed: ${pass}   assertions failed: ${fail}`);
if (fail) {
  failures.forEach((f) => console.log("   FAIL " + f));
  console.log("   RESULT: FAIL");
  process.exit(1);
}
console.log("   RESULT: PASS");
process.exit(0);
