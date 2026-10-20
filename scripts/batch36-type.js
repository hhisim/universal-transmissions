#!/usr/bin/env node
/**
 * batch36-type.js — the typography treatment, as the owner directed.
 *
 * Owner direction (2026-10-19): stop removing visible Zalgo styling. The homepage, Codex and Journal
 * main titles return to their exact pre-Batch-36 static treatment and original intensities, with no
 * replacement animation. Readability is served by spacing, composition, contrast and accessible
 * labels — not by toning the glyphs down.
 *
 * These assertions guard the RESTORED design. The burst design is superseded, and the assertions that
 * required it were replaced rather than kept green.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const RELEASED = "1efd5d35d68d6d8ad6c7ec835e2718b6eb094681";

let passed = 0;
const failures = [];
function ok(condition, label) {
  if (condition) {
    passed += 1;
    console.log("    pass  " + label);
  } else {
    failures.push(label);
    console.log("    FAIL  " + label);
  }
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

console.log("\n  1. the component is the released one, byte for byte");
{
  const working = read("src/components/ui/ZalgoText.tsx");
  let released = null;
  try {
    released = execFileSync("git", ["show", RELEASED + ":src/components/ui/ZalgoText.tsx"], {
      cwd: ROOT, encoding: "utf8",
    });
  } catch (e) { released = null; }
  ok(released !== null, "the released version is available for comparison");
  ok(released !== null && working === released, "ZalgoText.tsx is identical to " + RELEASED.slice(0, 12));
  ok(/aria-label=\{text\}/.test(working), "the readable words remain the accessible name");
  ok(!/mode=|burst/i.test(working), "the superseded burst design is gone from the component");
  ok(/seededRandom\(text\.length \* 31 \+ intensity\.length \* 17\)/.test(working),
    "the corruption is deterministic, so server and client render the same text");
}

console.log("\n  2. the three titles carry their original intensities");
{
  const page = read("src/app/page.tsx");
  const journal = read("src/app/journal/page.tsx");
  const codex = read("src/app/codex/page.tsx");
  ok(/<ZalgoText text="Universal Transmissions" intensity="moderate" \/>/.test(page),
    "homepage title: static, moderate — as released");
  ok(/<ZalgoText text="Journal" intensity="moderate" \/>/.test(journal),
    "Journal title: static, moderate — as released");
  ok(/<ZalgoText text="THE CODEX" intensity="heavy" \/>/.test(codex),
    "Codex title: static, heavy — as released");
  ok(!/mode=/.test(page) && !/mode=/.test(journal) && !/mode=/.test(codex),
    "no title opts into a time-based treatment");
  ok(!fs.existsSync(path.join(ROOT, "src/lib/glyph-burst.ts")) &&
     !fs.existsSync(path.join(ROOT, "src/lib/glyph-burst-runner.ts")),
    "the burst modules are deleted, not left dormant");
}

console.log("\n  3. the visible glyph identity is real and unchanged");
{
  const UP = ["\u0300","\u0301","\u0302","\u0303","\u0304","\u0305","\u0306","\u0307","\u0308","\u0309","\u030A","\u030B","\u030C","\u030D","\u030E","\u030F","\u0310","\u0311","\u0312","\u0313","\u0314","\u0315","\u031A"];
  const DOWN = ["\u0316","\u0317","\u0318","\u0319","\u031C","\u031D","\u031E","\u031F","\u0320","\u0321","\u0322","\u0323","\u0324","\u0325","\u0326","\u0327","\u0328","\u0329","\u032A","\u032B","\u032C","\u032D","\u032E","\u032F","\u0330","\u0331","\u0332","\u0333"];
  const MID = ["\u0323","\u0334","\u0335","\u0336","\u0337","\u0338","\u0339","\u033A","\u033B","\u033C","\u033D","\u033E","\u033F","\u0340","\u0341","\u0342","\u0343","\u0344","\u0345","\u0346"];
  const counts = { subtle:{up:1,down:0,mid:0}, moderate:{up:2,down:1,mid:1}, heavy:{up:4,down:3,mid:2} };
  const gen = (text, intensity) => {
    let s = (text.length * 31 + intensity.length * 17) >>> 0;
    const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    return text.split("").map((ch) => {
      if (ch === " ") return ch;
      const c = counts[intensity];
      let out = "";
      for (let i = 0; i < c.up; i++) out += pick(UP);
      for (let i = 0; i < c.mid; i++) out += pick(MID);
      out += ch;
      for (let i = 0; i < c.down; i++) out += pick(DOWN);
      return out;
    }).join("");
  };
  const marks = (s) => (s.match(/[\u0300-\u036F]/g) || []).length;
  for (const [text, intensity, expect] of [["THE CODEX","heavy",72],["Journal","moderate",28],["Universal Transmissions","moderate",88]]) {
    const out = gen(text, intensity);
    /* letters x (up + mid + down) for that intensity — the released rule, not a hand count. */
    const expected = text.replace(/ /g, "").length * (counts[intensity].up + counts[intensity].mid + counts[intensity].down);
    ok(marks(out) === expected && expected === expect,
      intensity + ' "' + text + '" carries ' + expect + " combining marks (got " + marks(out) + ")");
    ok(out.replace(/[\u0300-\u036F]/g, "") === text, intensity + ' "' + text + '" still spells the original words');
    ok(out === gen(text, intensity), intensity + ' "' + text + '" is deterministic');
  }
  ok(marks(gen("THE CODEX","heavy")) > marks(gen("THE CODEX","moderate")), "heavy is denser than moderate — intensities are not flattened");
  ok(marks(gen("THE CODEX","moderate")) > marks(gen("THE CODEX","subtle")), "moderate is denser than subtle");
}

console.log("\n  4. readability without removing the glyphs");
{
  const page = read("src/app/page.tsx");
  const globals = read("src/app/globals.css");
  ok(/ut-gradient-text/.test(page), "the title still uses the gradient treatment");
  ok(/tracking-|letter-spacing/.test(page), "the title keeps its tracking");
  ok(/@media \(prefers-reduced-motion/.test(globals), "reduced motion is still handled in the stylesheet");
}

console.log("\n  ==================== SUMMARY ====================");
console.log("   assertions passed: " + passed + "   assertions failed: " + failures.length);
failures.forEach((f) => console.log("    FAIL " + f));
console.log("   RESULT: " + (failures.length === 0 ? "PASS" : "FAIL"));
process.exit(failures.length === 0 ? 0 : 1);
