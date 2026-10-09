#!/usr/bin/env node
/**
 * batch2-evidence-panel.js " source-structure contract for the RENDERED evidence
 * panel. Reported separately from the behavioural assertions: it reads the client
 * source rather than executing a browser, because the panel is a DOM consequence
 * of `activeAnchor`. The behavioural half (that the server withholds a displaced
 * record's evidence in the first place) lives in batch2-research-anchor.js.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = fs.readFileSync(path.join(ROOT, "src/app/oracle/page-client.tsx"), "utf8");

let passed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { passed += 1; return; }
  failures.push(label);
  console.error("  FAIL:", label);
}

const flat = SRC.replace(/\r\n/g, "\n");

ok(/evidence:\s*\n\s*data\.activeAnchor === "entry" && data\.evidence/.test(flat),
  "the evidence panel is gated on the server-declared active anchor");
ok(!/evidence: \(data\.evidence as OracleEvidence\) \|\| undefined/.test(flat),
  "the unconditional evidence assignment is gone");
// Structural, not just lexical: the displaced branch must be the live arm of the
// setEntityNotice ternary, so dead-coding it (e.g. `false &&`) fails here.
const noticeCall = (flat.match(/setEntityNotice\([\s\S]*?\n      \);\n/) || [""])[0];
ok(/setEntityNotice\([\s\S]*data\.entityStatus === "displaced"[\s\S]*?Correspondence entry not used/.test(noticeCall),
  "the displaced branch is the live arm of setEntityNotice, not dead code");
ok(!/false && data\.entityStatus === "displaced"/.test(flat),
  "the displaced branch is not short-circuited away");
ok(/setEntityNotice\([\s\S]*The selected entry is unavailable/.test(flat),
  "a genuinely unknown record still reports unavailable");
ok(/Correspondence entry not used/.test(flat),
  "a displaced record is disclosed as not used, not as broken");
ok(/data\.activeAnchor/.test(flat),
  "the active anchor is read from the response rather than inferred in the client");
ok(/activeAnchor: 'research' \| 'entry' \| 'artwork' \| 'none'/.test(
    fs.readFileSync(path.join(ROOT, "src/app/api/oracle/route.ts"), "utf8")),
  "the route declares the active anchor as a closed union");

console.log(`${passed} source contracts passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((f) => console.error("  -", f));
  process.exit(1);
}
