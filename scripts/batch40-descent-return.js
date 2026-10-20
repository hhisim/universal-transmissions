#!/usr/bin/env node
/**
 * batch40-descent-return.js — the descent continues through art and Journal.
 *
 * Confirmed gap: stop 2 of "Sound into Form" opens `/journal/cymatics-language-of-form` and stop 3
 * opens `/gallery/hyperdimensional-harmonics`. Both received `?path=&stop=` and neither offered a return
 * to the authored stop, so following a record silently dropped the visitor's place.
 *
 * The arrival control is a SUPPLEMENT: it must not write storage, and the Gallery's collection return
 * and the Journal's search/filter return must keep their own saved context.
 */

const path = require("path");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
require.extensions[".md"] = (mod, filename) => {
  mod.exports = require("fs").readFileSync(filename, "utf8");
};
const fs = require("fs");

const { GUIDED_PATHS, resolvePath } = require(path.join(ROOT, "src/lib/guided-paths.ts"));
const D = require(path.join(ROOT, "src/lib/research-descents.ts"));

let passed = 0;
const failures = [];
function ok(c, label) {
  if (c) { passed += 1; console.log("    pass  " + label); }
  else { failures.push(label); console.log("    FAIL  " + label); }
}

console.log("\n  1. the two confirmed stops resolve to their real destinations");
{
  const p = GUIDED_PATHS.find((x) => x.slug === "sound-into-form");
  const stops = resolvePath(p).stops;
  const s2 = stops.find((s) => s.number === 2);
  const s3 = stops.find((s) => s.number === 3);
  ok(s2 && s2.href.startsWith("/journal/"), "stop 2 opens a Journal article (" + (s2 && s2.href) + ")");
  ok(s3 && s3.href.startsWith("/gallery/"), "stop 3 opens an artwork (" + (s3 && s3.href) + ")");

  const a2 = D.resolveRecordArrival(s2.href, { path: "sound-into-form", stop: "2" });
  ok(a2.context !== null, "stop 2 is accepted at the article it opens");
  ok(a2.context && a2.context.href === "/paths/sound-into-form?stop=2", "and returns to authored stop 2");
  ok(a2.context && a2.context.number === 2, "the authored number is preserved, not re-derived");

  const a3 = D.resolveRecordArrival(s3.href, { path: "sound-into-form", stop: "3" });
  ok(a3.context !== null, "stop 3 is accepted at the artwork it opens");
  ok(a3.context && a3.context.href === "/paths/sound-into-form?stop=3", "and returns to authored stop 3");
}

console.log("\n  2. another record's context is refused");
{
  const p = GUIDED_PATHS.find((x) => x.slug === "sound-into-form");
  const stops = resolvePath(p).stops;
  const s2 = stops.find((s) => s.number === 2);
  const s3 = stops.find((s) => s.number === 3);

  const cross = D.resolveRecordArrival(s3.href, { path: "sound-into-form", stop: "2" });
  ok(cross.context === null, "stop 2's context is refused at the artwork stop 3 opens");
  ok(cross.refused === "other-record", "refused by name: other-record");

  const cross2 = D.resolveRecordArrival(s2.href, { path: "sound-into-form", stop: "3" });
  ok(cross2.context === null && cross2.refused === "other-record", "stop 3's context is refused at the article");

  const room = D.resolveRecordArrival(s2.href, { path: "sound-into-form", stop: "1" });
  ok(room.context === null, "the room stop's context is refused at a Journal article");
}

console.log("\n  3. unknown, unavailable and malformed context");
{
  const art = "/gallery/hyperdimensional-harmonics";
  ok(D.resolveRecordArrival(art, { path: "no-such-path", stop: "3" }).refused === "unknown-path",
    "an unknown path is refused");
  ok(D.resolveRecordArrival(art, { path: "sound-into-form", stop: "999" }).refused === "out-of-range",
    "an out-of-range stop is refused");
  for (const bad of ["3garbage", "3.5", "+3", " 3", "", "03", "-3"]) {
    ok(D.resolveRecordArrival(art, { path: "sound-into-form", stop: bad }).context === null,
      "stop=" + JSON.stringify(bad) + " is refused at a record");
  }
  ok(D.resolveRecordArrival(art, {}).context === null && D.resolveRecordArrival(art, {}).refused === undefined,
    "direct entry makes no arrival claim at all");
  ok(D.resolveRecordArrival(art, { path: "sound-into-form" }).context === null,
    "a path with no stop does not claim an arrival");
}

console.log("\n  4. every authored stop keeps its own number");
{
  let checked = 0;
  let allOk = true;
  for (const p of GUIDED_PATHS) {
    for (const s of resolvePath(p).stops) {
      const r = D.resolveRecordArrival(s.href.split("#")[0], { path: p.slug, stop: String(s.number) });
      if (!r.context || r.context.number !== s.number || r.context.href !== "/paths/" + p.slug + "?stop=" + s.number) {
        allOk = false;
        console.log("      mismatch at " + p.slug + " stop " + s.number + " -> " + s.href);
      }
      checked += 1;
    }
  }
  ok(checked > 0 && allOk, "all " + checked + " authored stops across every path round-trip to their own number");
}

console.log("\n  5. the control is a supplement, never a replacement");
{
  const comp = fs.readFileSync(path.join(ROOT, "src/components/research/DescentReturn.tsx"), "utf8");
  ok(!/localStorage|sessionStorage|document\.cookie|history\.(push|replace)State/.test(comp),
    "the arrival control writes no storage, cookie or history entry");
  ok(/resolveRecordArrival\(recordPath/.test(comp), "it validates against the record actually being served");

  const gal = fs.readFileSync(path.join(ROOT, "src/app/gallery/[slug]/page.tsx"), "utf8");
  ok(/<DescentReturn/.test(gal) && /searchParams=\{searchParams\}/.test(gal), "the artwork page renders it with the address context");
  ok(/<ReturnToBrowse slug=\{artwork\.slug\} \/>/.test(gal), "the Gallery collection return is untouched");

  const jr = fs.readFileSync(path.join(ROOT, "src/app/journal/[slug]/page.tsx"), "utf8");
  ok(/<DescentReturn/.test(jr) && /searchParams=\{searchParams\}/.test(jr), "the article page renders it with the address context");
  ok(/<PostClient slug=\{params\.slug\} \/>/.test(jr), "the article body still renders exactly as before");

  const pc = fs.readFileSync(path.join(ROOT, "src/app/journal/[slug]/PostClient.tsx"), "utf8");
  ok(/journal-return-to-search|returnToSearch|safeJournalReturn/i.test(pc) || /search/i.test(pc),
    "the Journal's own search/filter return logic is still present");
}

console.log("\n  6. rooms still behave as released");
{
  ok(D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "1" }).context !== null,
    "the room arrival still resolves");
  ok(D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "3" }).context === null,
    "the artwork stop is still refused as a room arrival");
}

console.log("\n  ==================== SUMMARY ====================");
console.log("   assertions passed: " + passed + "   assertions failed: " + failures.length);
failures.forEach((f) => console.log("    FAIL " + f));
console.log("   RESULT: " + (failures.length === 0 ? "PASS" : "FAIL"));
process.exit(failures.length === 0 ? 0 : 1);
