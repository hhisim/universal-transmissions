#!/usr/bin/env node
/**
 * batch39-descents.js — the rooms and the descents that actually visit them.
 *
 * The demonstrated gap: "Sound into Form", stop 1, links to `/research/cymatics`, and the room it
 * serves offered no descent link and no way back to the stop the visitor was reading.
 *
 * These assertions prove the connection is DERIVED from the authored registry rather than listed by
 * hand, and that inbound context is refused when it does not name this room — no fabricated arrival.
 */

const path = require("path");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
// Next compiles .md imports to a string (raw loader); node has no such extension, so mirror it.
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

const ROOMS = ["cymatics", "geometry", "linguistics", "symbolism"];

console.log("\n  1. the relationship is derived from the authored registry");
{
  const authored = (topic) =>
    GUIDED_PATHS.flatMap((p) =>
      resolvePath(p).stops.filter((s) => s.topic === topic).map((s) => ({ slug: p.slug, number: s.number }))
    );
  for (const room of ROOMS) {
    const derived = D.descentsForRoom(room);
    const expected = authored(room);
    ok(derived.length > 0, room + " has at least one authored descent (" + derived.length + ")");
    ok(
      JSON.stringify(derived.map((d) => d.pathSlug + ":" + d.number)) ===
        JSON.stringify(expected.map((e) => e.slug + ":" + e.number)),
      room + " lists exactly the authored stops that visit it, in registry order"
    );
    ok(derived.every((d) => d.href === "/paths/" + d.pathSlug + "?stop=" + d.number),
      room + " links carry the path and the authored stop number");
    ok(derived.every((d) => d.number >= 1 && d.number <= d.total),
      room + " never reports a stop outside its path's authored range");
  }
}

console.log("\n  2. the observation itself");
{
  const first = GUIDED_PATHS.find((p) => p.slug === "sound-into-form");
  ok(!!first, "Sound into Form exists in the registry");
  const stop1 = resolvePath(first).stops.find((s) => s.number === 1);
  ok(stop1 && stop1.topic === "cymatics", "its stop 1 names the cymatics room");
  ok(stop1 && stop1.anchor === null, "that stop is the room itself, not one of its connections");
  const listed = D.descentsForRoom("cymatics").some((d) => d.pathSlug === "sound-into-form" && d.number === 1);
  ok(listed, "the cymatics room's own list includes Sound into Form, stop 1");
}

console.log("\n  3. inbound context is proved, never assumed");
{
  const good = D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "1" });
  ok(good.context !== null, "a valid path and stop are accepted");
  ok(good.context && good.context.href === "/paths/sound-into-form?stop=1",
    "the return address is the same authored stop");
  ok(good.context && good.context.pathTitle === "Sound into Form", "the return names the path");

  const unknown = D.resolveDescentContext("cymatics", { path: "no-such-descent", stop: "1" });
  ok(unknown.context === null && unknown.refused === "unknown-path", "an unknown path is refused by name");

  const outOfRange = D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "99" });
  ok(outOfRange.context === null && outOfRange.refused === "out-of-range", "an out-of-range stop is refused");

  /* A real stop of a real path that visits a DIFFERENT room. */
  let other = null;
  for (const p of GUIDED_PATHS) {
    for (const s of resolvePath(p).stops) {
      if (s.topic !== "cymatics") { other = { p: p.slug, s: s.number, topic: s.topic }; break; }
    }
    if (other) break;
  }
  ok(!!other, "the registry holds a stop for another room to test against (" + (other && other.topic) + ")");
  const mismatched = D.resolveDescentContext("cymatics", { path: other.p, stop: String(other.s) });
  ok(mismatched.context === null && mismatched.refused === "other-room",
    "a stop that belongs to another room is refused, so no arrival is fabricated");

  const empty = D.resolveDescentContext("cymatics", {});
  ok(empty.context === null && empty.refused === undefined, "no context is silent, not a refusal");
}

console.log("\n  4. nothing was invented");
{
  const src = require("fs").readFileSync(path.join(ROOT, "src/lib/research-descents.ts"), "utf8");
  ok(!/\[\s*\{\s*pathSlug:/.test(src), "no descent list is hard-coded");
  ok(/resolvePath\(path\)/.test(src), "every list is produced by resolving the authored path");
  ok(GUIDED_PATHS.length > 0, "the registry is still the single source (" + GUIDED_PATHS.length + " paths)");

  const pages = ROOMS.map((r) => require("fs").readFileSync(path.join(ROOT, "src/app/research", r, "page.tsx"), "utf8"));
  ok(pages.every((p) => /<ResearchDescents topic="/.test(p)), "all four rooms render the derived descents");
  ok(pages.every((p) => /searchParams/.test(p)), "all four rooms receive the inbound context from the address");

  const pathPage = require("fs").readFileSync(path.join(ROOT, "src/app/paths/[slug]/page.tsx"), "utf8");
  ok(/data-path-context=/.test(pathPage), "a path's record link carries which path and stop it came from");
  ok(/stop\.number\b/.test(pathPage), "the context uses the authored number, not the array position");
}

console.log("\n  ==================== SUMMARY ====================");
console.log("   assertions passed: " + passed + "   assertions failed: " + failures.length);
failures.forEach((f) => console.log("    FAIL " + f));
console.log("   RESULT: " + (failures.length === 0 ? "PASS" : "FAIL"));
process.exit(failures.length === 0 ? 0 : 1);
