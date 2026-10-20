#!/usr/bin/env node
/**
 * batch41-resonator-return.js — the descent continues through the instrument room.
 *
 * Confirmed: stop 4 of "Sound into Form" opens `/experience/universal-resonator?path=…&stop=4` and the
 * page offered no way back. Batch 40's resolution and control are reused unchanged; what this suite
 * guards is the WRAPPER integration and, above all, that the explicit launch gate is untouched — the
 * arrival control is text and a link, and must never start the engine, request audio or microphone, or
 * fetch the instrument payload.
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

const RECORD = "/experience/universal-resonator";
const PAGE = path.join(ROOT, "src/app/experience/universal-resonator/page.tsx");
const LOADER = path.join(ROOT, "src/app/experience/universal-resonator/ResonatorLoader.tsx");
const CONTROL = path.join(ROOT, "src/components/research/DescentReturn.tsx");

console.log("\n  1. stop 4 resolves to the instrument, and back to stop 4");
{
  const p = GUIDED_PATHS.find((x) => x.slug === "sound-into-form");
  const stop4 = resolvePath(p).stops.find((s) => s.number === 4);
  ok(!!stop4, "Sound into Form has an authored stop 4");
  ok(stop4 && stop4.href.startsWith("/experience/universal-resonator"),
    "stop 4 opens the Resonator (" + (stop4 && stop4.href) + ")");

  const r = D.resolveRecordArrival(RECORD, { path: "sound-into-form", stop: "4" });
  ok(r.context !== null, "stop 4 is accepted at the instrument page");
  ok(r.context && r.context.href === "/paths/sound-into-form?stop=4", "the return targets authored stop 4");
  ok(r.context && r.context.number === 4, "the authored number is preserved");
}

console.log("\n  2. wrong record, malformed and direct entry claim nothing");
{
  ok(D.resolveRecordArrival(RECORD, { path: "sound-into-form", stop: "3" }).refused === "other-record",
    "stop 3 (an artwork) is refused at the instrument");
  ok(D.resolveRecordArrival(RECORD, { path: "sound-into-form", stop: "2" }).refused === "other-record",
    "stop 2 (an article) is refused at the instrument");
  for (const bad of ["4garbage", "4.0", "+4", " 4", "", "04"]) {
    ok(D.resolveRecordArrival(RECORD, { path: "sound-into-form", stop: bad }).context === null,
      "stop=" + JSON.stringify(bad) + " is refused at the instrument");
  }
  const direct = D.resolveRecordArrival(RECORD, {});
  ok(direct.context === null && direct.refused === undefined, "direct entry makes no claim");
}

console.log("\n  3. the control is mounted by the page, outside the instrument frame");
{
  const src = fs.readFileSync(PAGE, "utf8");
  ok(/<DescentReturn/.test(src), "the page mounts DescentReturn");
  ok(/recordPath="\/experience\/universal-resonator"/.test(src), "it is bound to this record's own path");
  ok(/searchParams=\{searchParams\}/.test(src), "the address context is passed through");
  ok(/searchParams\?: \{ path\?: string; stop\?: string \}/.test(src), "the page accepts the validated shape");

  const controlAt = src.indexOf("<DescentReturn");
  const firstSection = src.indexOf("<section");
  ok(controlAt > 0 && firstSection > controlAt, "the control renders BEFORE the first section, outside the instrument frame");
  ok(/data-instrument-room="true"/.test(src), "the room wrapper is still there");
}

console.log("\n  4. the launch gate is unchanged");
{
  const loader = fs.readFileSync(LOADER, "utf8");
  ok(/^'use client';/.test(loader), "the loader is still a client component");
  ok(/const \[launched, setLaunched\] = useState\(false\)/.test(loader), "it still starts unlaunched");
  ok(/if \(!launched\)/.test(loader), "the pre-launch branch is still the gate");
  /* The pre-launch branch is `if (!launched) { return ( … ) }`. Everything the visitor sees before
     choosing to enter must live inside it, and the instrument frame must live after it. */
  const lines = loader.split("\n");
  const gateAt = lines.findIndex((l) => /if \(!launched\)/.test(l));
  const afterBlock = lines.findIndex((l, i) => i > gateAt && /^  return \(/.test(l));
  const preLaunch = lines.slice(gateAt, afterBlock === -1 ? undefined : afterBlock).join("\n");
  ok(gateAt > -1 && afterBlock > gateAt, "the pre-launch branch and the launched branch are distinguishable");
  ok(!/<iframe|<script|<link rel="preload"/.test(preLaunch), "no iframe, script or preload in the pre-launch branch");
  ok(/<iframe/.test(loader), "the instrument frame exists only after launch");

  const controlsrc = fs.readFileSync(CONTROL, "utf8");
  ok(!/localStorage|sessionStorage|document\.cookie/.test(controlsrc), "the arrival control writes no storage");
  ok(!/setLaunched|ResonatorLoader|startAudio|getUserMedia|navigator\.mediaDevices|AudioContext/.test(controlsrc),
    "the arrival control cannot launch, start audio or request the microphone");
  ok(!/iframe|<script/.test(controlsrc), "the arrival control renders no iframe or script");

  /* The reading page must not reference the payload at all before launch. */
  const payloadRefs = (fs.readFileSync(PAGE, "utf8").match(/resonator.*\.(js|wasm)|\.wasm|AudioWorklet/gi) || []);
  ok(payloadRefs.length === 0, "the page itself still references no instrument payload");
}

console.log("\n  5. accepted returns elsewhere are preserved");
{
  ok(D.resolveRecordArrival("/journal/cymatics-language-of-form", { path: "sound-into-form", stop: "2" }).context !== null,
    "the Journal article return still resolves");
  ok(D.resolveRecordArrival("/gallery/hyperdimensional-harmonics", { path: "sound-into-form", stop: "3" }).context !== null,
    "the artwork return still resolves");
  ok(D.resolveDescentContext("cymatics", { path: "sound-into-form", stop: "1" }).context !== null,
    "the room return still resolves");
}

console.log("\n  ==================== SUMMARY ====================");
console.log("   assertions passed: " + passed + "   assertions failed: " + failures.length);
failures.forEach((f) => console.log("    FAIL " + f));
console.log("   RESULT: " + (failures.length === 0 ? "PASS" : "FAIL"));
process.exit(failures.length === 0 ? 0 : 1);
