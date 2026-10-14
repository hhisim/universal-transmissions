#!/usr/bin/env node
/**
 * batch17-instrument-room.js — the Universal Resonator inside the research journey.
 *
 * The instrument is 960 KB of WebGL, a solver worker and a Web Audio graph. The claims
 * that actually matter here are therefore:
 *
 *   - the READING PAGE must start none of it. No iframe, no script, no worker, no audio,
 *     no microphone request until the visitor launches;
 *   - the bundle must be hosted on our own origin with its relative paths intact, so the
 *     instrument is the zip's own build rather than a reimplementation;
 *   - the instrument must be a first-class connection, resolvable by the same exact-key
 *     contract as every other record, and its grounding must carry the model's LIMIT —
 *     that it solves an idealised model and is not a measurement of a real plate;
 *   - the chain Cymatics -> instrument -> model/references -> Oracle -> research must be
 *     navigable in both directions.
 *
 * Usage: node scripts/batch17-instrument-room.js
 */
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });
require.extensions[".md"] = (mod) => { mod.exports = ""; };

const topics = require(path.join(ROOT, "src/lib/research-topics.ts"));
const connections = require(path.join(ROOT, "src/lib/research-connections.ts"));

let passed = 0;
let failed = 0;
const ok = (m) => { console.log(`  ok   ${m}`); passed += 1; };
const bad = (m) => { console.log(`  FAIL ${m}`); failed += 1; };
const chk = (m, cond, detail) => (cond ? ok(m) : bad(`${m}${detail ? ` — ${detail}` : ""}`));
const chkeq = (m, a, b) => chk(m, a === b, `expected ${JSON.stringify(b)}, observed ${JSON.stringify(a)}`);

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const ANCHOR = "research-v1:cymatics/connection/instrument-universal-resonator";
const ASSETS = "public/experience/universal-resonator";
const PAGE = "src/app/experience/universal-resonator/page.tsx";
const LOADER = "src/app/experience/universal-resonator/ResonatorLoader.tsx";

console.log("\n== A. the instrument room exists ==");
chk("the room page exists", exists(PAGE));
chk("the launch component exists", exists(LOADER));
{
  const page = read(PAGE);
  const loader = read(LOADER);
  chk("the room is addressable at its own route", exists("src/app/experience/universal-resonator"));
  chk("the room renders the loader", /<ResonatorLoader\s*\/>/.test(page));
  chk("the room marks itself for the journey", /data-instrument-room=/.test(page));
}

console.log("\n== B. nothing heavy runs before launch ==");
{
  const loader = read(LOADER);
  /* The gate is the whole point: the frame must live in the post-launch branch only. */
  const beforeReturn = loader.slice(0, loader.indexOf("if (!launched)"));
  chk("launch state starts false (nothing is loaded on the reading page)",
      /useState\(false\)/.test(loader));
  chk("there is no iframe before the launch branch is passed",
      !/<iframe/.test(beforeReturn));
  const gateStart = loader.indexOf("if (!launched)");
  /* Everything before the post-launch stage marker is the reading-page branch. */
  const preLaunch = loader.slice(0, loader.indexOf("data-resonator-stage"));
  chk("the pre-launch branch renders no iframe", !/<iframe/.test(preLaunch));
  chk("the pre-launch branch renders an explicit launch action",
      /data-resonator-launch=/.test(preLaunch) && /onClick=/.test(preLaunch));
  chk("the launch gate is the only way into the instrument",
      gateStart !== -1 && loader.indexOf("data-resonator-stage") > gateStart);
  chk("the instrument's own bundle is never referenced by the loader except as the frame src",
      !/app\.js|worker\.js|three/i.test(loader.replace(/src="\/experience\/universal-resonator\/index\.html"/, "")));
  chk("the loader never calls getUserMedia itself",
      !/getUserMedia|mediaDevices/.test(loader));
  chk("the frame is sandboxed and only asks for the microphone it may need",
      /sandbox="/.test(loader) && /allow="microphone; autoplay; fullscreen"/.test(loader));
  /* Snapshot and Record both save through a synthesised <a download> click. A sandbox
     without allow-downloads lets the instrument toast "Snapshot saved." and deliver
     nothing at all - found by exercising capture, not by reading the code. */
  chk("the sandbox permits the instrument's Snapshot and Record downloads",
      /sandbox="[^"]*allow-downloads/.test(loader));
  chk("the sandbox still withholds the capabilities the instrument does not need",
      !/allow-modals|allow-top-navigation|allow-presentation/.test(loader));
  chk("leaving the instrument unmounts the frame", /data-resonator-stop=/.test(loader)
      && /setLaunched\(false\)/.test(loader));

  const page = read(PAGE);
  chk("the reading page does not import the instrument bundle",
      !/app\.js|worker\.js|from "three"|require\("three"\)/.test(page));
  chk("the reading page performs no audio or microphone call",
      !/getUserMedia|AudioContext|mediaDevices/.test(page));
  chk("the reading page explains that nothing has started yet",
      /nothing below runs until|Nothing has been started yet/i.test(page));
}

console.log("\n== C. the bundle is hosted same-origin, as built ==");
{
  chk("the instrument entry point is hosted", exists(`${ASSETS}/index.html`));
  const html = read(`${ASSETS}/index.html`);
  for (const rel of ["./app.js", "./style.css", "./ut-logo.svg", "./favicon.svg"]) {
    chk(`index.html loads ${rel} relatively`, html.includes(`"${rel}"`));
  }
  for (const f of ["app.js", "worker.js", "style.css", "index.html", "ut-logo.svg",
                   "favicon.svg", "THIRD_PARTY_NOTICES.txt"]) {
    chk(`shipped: ${f}`, exists(`${ASSETS}/${f}`));
  }
  const fonts = fs.readdirSync(path.join(ROOT, ASSETS, "fonts"));
  chkeq("all fifteen bundled fonts travel with it", fonts.length, 15);
  chk("the fonts are the instrument's own woff2 set",
      fonts.every((f) => f.endsWith(".woff2")));
  const notices = read(`${ASSETS}/THIRD_PARTY_NOTICES.txt`);
  chk("third-party notices name Three.js", /Three\.js/.test(notices) && /MIT License/.test(notices));
  chk("third-party notices name the build tool", /esbuild/.test(notices));
  const styleFile = read(`${ASSETS}/style.css`);
  chk("the instrument's skin stylesheet travelled intact", styleFile.length > 30000);
  const appjs = read(`${ASSETS}/app.js`);
  chk("the instrument bundle is the real build, not a stub", appjs.length > 400000, `${appjs.length} bytes`);
  /* The engine is minified, so its prose is gone; what proves it is the real instrument
     is the machinery itself: a WebGL renderer, Three.js, an off-thread solver, and a
     Web Audio graph - all of which must live inside the bundle and NOT on our page. */
  for (const [what, needle] of [["a WebGL renderer", "WebGLRenderer"], ["Three.js", "THREE"],
                                ["an off-thread solver", "new Worker"],
                                ["a Web Audio graph", "AudioContext"],
                                ["the plate model", "cosine"]]) {
    chk(`the bundle carries ${what}`, appjs.includes(needle));
  }
  chk("the microphone code lives inside the instrument, behind its own control",
      appjs.includes("getUserMedia"));
}

console.log("\n== D. registered through the existing connection + Oracle machinery ==");
{
  const cym = connections.CYMATICS_CONNECTIONS;
  const inst = cym.find((c) => c.anchorSlug === "instrument-universal-resonator");
  chk("the instrument is a registered Cymatics connection", !!inst);
  chkeq("its kind is Instrument", inst && inst.kind, "Instrument");
  chkeq("its destination is the instrument room", inst && inst.href, "/experience/universal-resonator");
  chk("it states why it belongs", !!inst && inst.rationale.length > 80);
  chk("it declares a basis and a basis label", !!inst && !!inst.basis && !!inst.basisLabel);
  chk("it explains how to reach the instrument, since the room only deep-links to a launch",
      !!inst && /launch/i.test(inst.destinationNote || ""), inst && inst.destinationNote);
  chk("it opens the Oracle with its own question", !!inst && inst.suggestedQuestion.length > 30);

  const t = topics.resolveResearchTopic(ANCHOR);
  chk("the instrument anchor resolves through the same exact-key contract", !!t);
  const block = t ? topics.researchPromptBlock(t) : "";
  chk("the anchor's grounding carries the room's own registers",
      /WHAT THE CYMATICS ROOM HOLDS/.test(block));
  chk("the anchor's grounding carries the reference supports descriptions",
      t && t.sources.some((s) => s.supports && block.includes(s.supports)));
  /* The limit is the point: an idealised model is not a measurement of a real plate. */
  chk("the grounding states the model is idealised", /idealised/i.test(block));
  chk("the grounding states it is not a physical measurement",
      /not a physical measurement|not a measurement/i.test(block));
  chk("the grounding keeps the instrument from being read as a real-plate prediction",
      /real-plate|particular sheet|material/i.test(block));
  chk("the anchor is registered for the cymatics room, not a new namespace",
      /id cymatics\/connection\/instrument-universal-resonator/.test(block));
  chk("a forged instrument anchor does NOT resolve",
      topics.resolveResearchTopic("research-v1:cymatics/connection/instrument") === null);
  chk("a padded instrument anchor does NOT resolve",
      topics.resolveResearchTopic("research-v1:cymatics/connection/instrument-universal-resonator/two") === null);

  /* The budget invariant must still hold with the new anchor in the set. */
  const conv = require(path.join(ROOT, "src/lib/oracle-conversation.ts"));
  const total = block.length + conv.MAX_QUESTION_CHARS;
  chk("the instrument anchor fits the composed-message budget",
      total <= conv.MAX_GRINDED_CHARS, `${total} > ${conv.MAX_GRINDED_CHARS}`);

  const all = topics.allRegisteredConnections();
  chk("the nexus picks the instrument up automatically (no second list to drift)",
      all.some((r) => r.connection.anchorSlug === "instrument-universal-resonator"));
}

console.log("\n== E. the chain is navigable ==");
{
  const page = read(PAGE);
  chk("the room returns to Cymatics research",
      /href="\/research\/cymatics"/.test(page) && /data-instrument-return=/.test(page));
  chk("the room links back to the research nexus", /href="\/research"/.test(page));
  chk("the room explains the model", /data-instrument-model=/.test(page));
  chk("the room carries the references", /data-instrument-references=/.test(page));
  chk("the room offers the Oracle in this context", /data-instrument-oracle=/.test(page));
  chk("the Oracle link carries the instrument's own anchor id",
      /researchTopicId=\$\{encodeURIComponent\(anchorId\)\}/.test(page));
  chk("the Oracle link carries the instrument's suggested question",
      /q=\$\{encodeURIComponent\(connection\.suggestedQuestion\)\}/.test(page));
  chk("the room points at the third-party notices it must preserve",
      /THIRD_PARTY_NOTICES\.txt/.test(page));

  /* The Cymatics room renders whatever the registry holds, so the entry point is the
     connection itself rather than a separately maintained card. */
  const cymPage = read("src/app/research/cymatics/page.tsx");
  chk("the Cymatics room renders the shared connections surface",
      /<CymaticsConnections/.test(cymPage));
  const shared = read("src/components/research/ResearchConnections.tsx");
  chk("the shared surface links every connection's destination",
      /href=\{c\.href\}/.test(shared) || /href=\{connection\.href\}/.test(shared));
}

console.log("\n== F. the instrument bundle was not reimplemented ==");
{
  const page = read(PAGE);
  const loader = read(LOADER);
  chk("no WebGL/three code was written into the room", !/WebGLRenderer|requestAnimationFrame/.test(page + loader));
  chk("the room does not reimplement the engine",
      !/new Worker\(|AudioContext|createOscillator/.test(page + loader));
  chk("the frame loads the zip's own entry point unchanged",
      /src="\/experience\/universal-resonator\/index\.html"/.test(loader));
}

console.log(`\nassertions passed: ${passed}`);
console.log(`assertions failed: ${failed}`);
console.log(failed === 0 ? "BATCH17_INSTRUMENT_ROOM_TESTS_PASSED" : "BATCH17_INSTRUMENT_ROOM_TESTS_FAILED");
process.exit(failed === 0 ? 0 : 1);
