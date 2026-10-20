#!/usr/bin/env node
/**
 * batch39-descents.js — rooms and the descents that actually VISIT them.
 *
 * A stop carries the room it belongs to, but its destination is a separate fact. Stops 2-4 of "Sound
 * into Form" name cymatics while opening a Journal piece, an artwork and an instrument: they are not
 * visits. An arrival claim has the same requirement, and the stop number must be a real authored
 * number — `parseInt` would have read "1garbage" as 1.
 *
 * The EXPECTED results in section 1 are written out by hand from the registry's destinations, so they
 * do not repeat the implementation's predicate. If the code went back to matching topics, they differ.
 */

const path = require("path");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
require.extensions[".md"] = (mod, filename) => {
  mod.exports = require("fs").readFileSync(filename, "utf8");
};

const { GUIDED_PATHS, resolvePath } = require(path.join(ROOT, "src/lib/guided-paths.ts"));
const D = require(path.join(ROOT, "src/lib/research-descents.ts"));

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

function stopsOpening(topic) {
  const out = [];
  for (const p of GUIDED_PATHS) {
    for (const s of resolvePath(p).stops) {
      const target = s.href.split("#")[0].split("?")[0].replace(/\/+$/, "");
      if (target === `/research/${topic}`) out.push({ slug: p.slug, number: s.number });
    }
  }
  return out;
}

console.log("\n  1. only stops whose DESTINATION is the room count as visits");
{
  /* Hand-read from the authored registry, 2026-10-19:
       cymatics    <- sound-into-form stop 1  (stops 2,3,4 open a Journal piece, an artwork, the Resonator)
       geometry    <- sound-into-form stop 6
       linguistics <- language-into-glyph stop 1
       symbolism   <- symbol-into-correspondence stop 1 */
  const expected = {
    cymatics: ["sound-into-form:1"],
    geometry: ["sound-into-form:6"],
    linguistics: ["language-into-glyph:1"],
    symbolism: ["symbol-into-correspondence:1"],
  };
  for (const [room, want] of Object.entries(expected)) {
    const got = D.descentsForRoom(room).map((d) => d.pathSlug + ":" + d.number);
    ok(JSON.stringify(got) === JSON.stringify(want),
      room + " lists exactly " + want.join(", ") + " (got " + (got.length ? got.join(", ") : "nothing") + ")");
    ok(JSON.stringify(got) === JSON.stringify(stopsOpening(room).map((s) => s.slug + ":" + s.number)),
      room + " agrees with an independent read of the registry's destinations");
  }
}

console.log("\n  2. same-topic stops that open other records are not descents");
{
  const cym = D.descentsForRoom("cymatics");
  for (const n of [2, 3, 4]) {
    ok(!cym.some((d) => d.pathSlug === "sound-into-form" && d.number === n),
      "Sound into Form stop " + n + " is NOT listed among cymatics descents");
  }
  const p = GUIDED_PATHS.find((x) => x.slug === "sound-into-form");
  const r = resolvePath(p).stops;
  for (const n of [2, 3, 4]) {
    const s = r.find((x) => x.number === n);
    ok(!!s && s.topic === "cymatics" && !s.href.startsWith("/research/cymatics"),
      "stop " + n + " still records topic cymatics while opening " + (s ? s.href : "?") + " — the case that was mislabelled");
  }
}

console.log("\n  3. counts are of distinct paths, and authored numbers survive");
{
  for (const room of ["cymatics", "geometry", "linguistics", "symbolism"]) {
    const list = D.descentsForRoom(room);
    const paths = [...new Set(list.map((d) => d.pathSlug))];
    ok(paths.length === 1, room + " is visited by exactly one path (" + paths.length + ")");
    ok(paths.length === list.length, room + ": distinct paths equals listed stops here");
    ok(list.every((d) => d.number >= 1 && d.number <= d.total && d.href === "/paths/" + d.pathSlug + "?stop=" + d.number),
      room + " keeps the authored number in the address");
  }
  const comp = require("fs").readFileSync(path.join(ROOT, "src/components/research/ResearchDescents.tsx"), "utf8");
  ok(/new Set\(descents\.map\(\(d\) => d\.pathSlug\)\)/.test(comp), "the displayed count is of distinct paths, not stops");
  ok(/data-descent-stops=/.test(comp) && /data-descent-paths=/.test(comp), "both counts are exposed for measurement");
  ok(/key=\{`\$\{d\.pathSlug\}:\$\{d\.number\}`\}/.test(comp),
    "each listed stop is keyed by path AND authored number, so a repeated visit stays distinct");
}

console.log("\n  4. inbound context uses the same destination check");
{
  const bad = D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "3" });
  ok(bad.context === null, "stop 3 is refused as an arrival at cymatics");
  ok(bad.refused === "other-record", "and refused by name: at that stop the path opens an artwork");
  const good = D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "1" });
  ok(good.context !== null && good.context.href === "/paths/sound-into-form?stop=1",
    "stop 1 is a real arrival and returns to itself");
  const geo = D.resolveDescentContext("geometry", { path: "sound-into-form", stop: "6" });
  ok(geo.context !== null && geo.context.number === 6, "stop 6 is a real arrival at geometry");
  const wrongRoom = D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "6" });
  ok(wrongRoom.context === null, "stop 6 is refused at cymatics — it opens geometry");
  const unknown = D.resolveDescentContext("cymatics", { path: "no-such-descent", stop: "1" });
  ok(unknown.refused === "unknown-path", "an unknown path is refused by name");
  const empty = D.resolveDescentContext("cymatics", {});
  ok(empty.context === null && empty.refused === undefined, "no context is silent, not a refusal");
}

console.log("\n  5. the stop parameter is parsed strictly");
{
  for (const raw of ["1garbage", "1.5", "1.0", "+1", " 1", "", "0", "-1", "01", "1e2", "NaN"]) {
    const r = D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: raw });
    ok(r.context === null,
      "stop=" + JSON.stringify(raw) + " is refused for an arrival claim (" + (r.refused || "silent") + ")");
  }
  ok(D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "2" }).context === null,
    "a well-formed number is still refused when the stop opens another record");
  ok(D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "1" }).context !== null,
    "the one well-formed, genuinely visiting value is accepted");
}

console.log("\n  6. the path page's own behaviour is untouched");
{
  const pagesrc = require("fs").readFileSync(path.join(ROOT, "src/app/paths/[slug]/page.tsx"), "utf8");
  ok(/selectStop\(path, searchParams\.stop\)/.test(pagesrc), "the path page still selects with selectStop");
  ok(!/malformed-stop/.test(pagesrc), "strict parsing lives in the descent library, not in the path page");
  const gp = require("fs").readFileSync(path.join(ROOT, "src/lib/guided-paths.ts"), "utf8");
  ok(/Number\.parseInt\(raw \?\? "1", 10\)/.test(gp), "guided-paths' lenient reading is unchanged");
}

console.log("\n  ==================== SUMMARY ====================");
console.log("   assertions passed: " + passed + "   assertions failed: " + failures.length);
failures.forEach((f) => console.log("    FAIL " + f));
console.log("   RESULT: " + (failures.length === 0 ? "PASS" : "FAIL"));
process.exit(failures.length === 0 ? 0 : 1);
