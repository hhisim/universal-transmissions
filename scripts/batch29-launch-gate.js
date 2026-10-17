#!/usr/bin/env node
/**
 * batch29-launch-gate.js
 *
 * THE SHARED LAUNCH GATE — the component every instrument room now opens behind.
 *
 * Two of the five rooms used to fetch their engine the moment their page opened (1.46 MB for the
 * codex, a 14 MB three.js build for the continuum). Batch 29 put both behind the same explicit
 * gate the Resonator already used. The existing suites cover the Oracle and the resolvers and do
 * not touch this component, so this file covers it directly:
 *
 *   • before launch — the rendered output carries the launch panel and NO iframe at all
 *   • after launch  — the rendered output carries the iframe with the room's own source
 *   • leaving       — the same control that mounts it resets the state that unmounts it
 *   • both rooms actually use it, and the superseded eager loaders are gone
 *
 * The launched branch is rendered by rendering the component twice with `useState` supplying
 * `true`, so both branches are the shipped JSX rather than a description of it.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");

require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = fs.readFileSync(m.filename, "utf8"); };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".jpeg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

let pass = 0, fail = 0;
const failures = [];
const ok = (c, m) => {
  if (c) { pass += 1; console.log("    ok   " + m); }
  else { fail += 1; failures.push(m); console.log("    FAIL " + m); }
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const PROPS = {
  src: "/experience/correspondence-codex/codex.html",
  title: "Correspondence Codex",
  kicker: "Instrument · opens in place",
  launchTitle: "Open the codex surface",
  launchCopy: "Nothing has been started yet.",
  launchCta: "Open the codex →",
  sizeNote: "≈ 1.4 MB · no account needed",
  accent: "#e040fb",
  dataPrefix: "codex",
};

console.log("\nBATCH 29 — the shared launch gate\n");

/* ── 1. before launch: the panel, and no frame of any kind ────────────────── */
console.log("  1. before launch");
{
  const before = renderToStaticMarkup(React.createElement(require(path.join(ROOT, "src/components/experience/InstrumentFrame.tsx")).default, PROPS));
  ok(before.includes('data-instrument-launch="true"'), "1 the launch panel is rendered");
  ok(!/<iframe/i.test(before), "1 …and the document contains no iframe at all");
  ok(!before.includes(PROPS.src), "1 …and the instrument's source is nowhere in the markup");
  ok(before.includes('data-instrument-start="true"'), "1 …with a control that starts it");
  ok(before.includes(PROPS.launchCta), "1 …carrying the room's own call to action");
  ok(before.includes(PROPS.sizeNote), "1 …and the size note that helps a visitor choose");
}

/* ── 2. after launch: the frame, mounted by the same component ────────────── */
console.log("\n  2. after launch");
{
  // useState returns `true` for the launched state, so the shipped launched branch renders.
  const realUseState = React.useState;
  React.useState = () => [true, () => {}];
  let after;
  try {
    delete require.cache[require.resolve(path.join(ROOT, "src/components/experience/InstrumentFrame.tsx"))];
    after = renderToStaticMarkup(React.createElement(require(path.join(ROOT, "src/components/experience/InstrumentFrame.tsx")).default, PROPS));
  } finally {
    React.useState = realUseState;
    delete require.cache[require.resolve(path.join(ROOT, "src/components/experience/InstrumentFrame.tsx"))];
  }
  ok(/<iframe/i.test(after), "2 the launched branch renders an iframe");
  ok(after.includes(`src="${PROPS.src}"`), "2 …pointing at the room's own source");
  ok(after.includes(`data-instrument-frame="${PROPS.dataPrefix}"`), "2 …marked with its room prefix");
  ok(after.includes('data-instrument-stop="true"'), "2 …and offering the control that leaves it");
  ok(after.includes('sandbox="allow-scripts allow-same-origin'), "2 …sandboxed as before");
  ok(!after.includes('data-instrument-launch="true"'), "2 …with the launch panel gone");
}

/* ── 3. leaving is the same state the mount came from ─────────────────────── */
console.log("\n  3. leaving");
{
  const src = read("src/components/experience/InstrumentFrame.tsx");
  ok(/onClick=\{\(\)\s*=>\s*\{[\s\S]{0,240}setLaunched\(false\)[\s\S]{0,120}setReady\(false\)/.test(src),
    "3 the leave control resets both the launched and ready state");
  ok(src.indexOf('data-instrument-start') < src.indexOf("<iframe"),
    "3 the launch control is declared before the frame — there is no second path to it");
  ok(/if\s*\(!launched\)/.test(src), "3 the not-yet-launched branch returns before the frame is built");
  ok(!/useEffect\(/.test(src), "3 the component starts nothing on mount — no effect opens the frame");
}

/* ── 4. the rooms actually use it, and the eager loaders are gone ─────────── */
console.log("\n  4. the rooms use the gate");
{
  const codex = read("src/app/experience/correspondence-codex/page.tsx");
  const cont = read("src/app/experience/correspondence-continuum/page.tsx");
  ok(codex.includes("InstrumentFrame"), "4 the codex room uses the shared gate");
  ok(codex.includes("/experience/correspondence-codex/codex.html"), "4 …with the codex's own source");
  ok(cont.includes("InstrumentFrame"), "4 the continuum room uses the shared gate");
  ok(cont.includes("/experience/correspondence-continuum/index.html"), "4 …with the continuum's own source");
  ok(!fs.existsSync(path.join(ROOT, "src/app/experience/correspondence-codex/CodexLoader.tsx")),
    "4 the eager codex loader is gone");
  ok(!fs.existsSync(path.join(ROOT, "src/app/experience/correspondence-continuum/ContinuumLoader.tsx")),
    "4 the eager continuum loader is gone");
  ok(!/<iframe/i.test(codex) && !/<iframe/i.test(cont),
    "4 neither room page carries an iframe of its own");
}

/* ── 5. the portal starts nothing ────────────────────────────────────────── */
console.log("\n  5. the portal starts nothing");
{
  const portal = read("src/app/experience/page.tsx");
  ok(!/<iframe/i.test(portal), "5 the portal carries no iframe");
  ok(!/dynamic\(/.test(portal), "5 …and imports no instrument dynamically");
  ok(!/universal-resonator\/(app|worker)\.js|codex\.html|continuum\/index\.html/.test(portal),
    "5 …and references none of the instrument payloads");
  ok(portal.includes("/experience/previews/"), "5 …while still showing stills of the real instruments");
  for (const still of ["resonator", "codex", "continuum"]) {
    ok(fs.existsSync(path.join(ROOT, `public/experience/previews/${still}.jpg`)), `5 the ${still} still exists`);
  }
}

console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
for (const m of failures) console.log("   - " + m);
process.exit(fail ? 1 : 0);
