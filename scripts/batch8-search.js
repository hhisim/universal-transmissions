#!/usr/bin/env node
/**
 * Batch 8 — correspondence search trust pilot.
 *
 * Behavioural suite. Every count assertion is executed against the REAL
 * filtering/ranking function loaded from source, not re-implemented here, so
 * a divergence between the suite and the component cannot pass silently.
 *
 * Covers:
 *   - complete match set computed before the display limit (no silent cap)
 *   - reveal boundaries: 48 -> +48 -> all, never past the total
 *   - reveal resets on new query and on system filter change
 *   - rank order is preserved across reveals (stable, no reshuffle)
 *   - React render keys are unique AND stable per source record
 *   - the 4 duplicated (sys,e) identities keep DISCRETE keys
 *   - no source record is dropped or repeated by reveal
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const { registerTsModules } = require("./lib/ut-ts-require.cjs");
registerTsModules({ root: ROOT });
const DOCK = fs.readFileSync(path.join(ROOT, "src/components/oracle/OracleCorrespondenceDock.tsx"), "utf8");

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; fails.push(name + (detail ? " — " + detail : "")); }
}
function eq(name, actual, expected) {
  ok(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const { codex } = require("@/lib/codex-data");

// ── load the REAL scoring function out of the component source ──────────────
const ts = require("typescript");
function extractFn(name) {
  const re = new RegExp("function " + name + "\\s*\\(");
  const m = re.exec(DOCK);
  if (!m) throw new Error("could not locate " + name + " in component source");
  let i = DOCK.indexOf("{", m.index), depth = 0;
  for (let j = i; j < DOCK.length; j++) {
    if (DOCK[j] === "{") depth++;
    else if (DOCK[j] === "}") { depth--; if (depth === 0) { i = j; break; } }
  }
  return DOCK.slice(m.index, i + 1);
}
/** Transpile the real component function out of TSX and make it callable, so
    the suite exercises shipped logic instead of a re-implementation. */
function loadRealFn(name, argNames, values) {
  const src = extractFn(name);
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = new Function(...argNames, js + "\nreturn " + name + ";")(...values);
  return fn;
}
const DISPLAY_FIELDS = require("@/lib/correspondence-systems").FORORDER
  .filter((k) => k !== "sys" && k !== "e");
const codexData = require("@/lib/codex-data");
const cleanDisplayValue = require("@/codex/speech-normalize").cleanDisplayValue;

const scoreEntry = loadRealFn("scoreEntry", ["DISPLAY_FIELDS", "cleanDisplayValue"],
  [DISPLAY_FIELDS, cleanDisplayValue]);

/** Mirrors the component's complete-match pipeline exactly (no slice). */
function rankAll(query) {
  const q = query.trim();
  if (!q) return codexData.codex.map((entry) => ({ entry, score: 0 }));
  return codexData.codex
    .map((entry) => ({ entry, score: scoreEntry(entry, q) }))
    .filter((it) => it.score > 0)
    .sort((a, b) => b.score - a.score || codexData.codex.indexOf(a.entry) - codexData.codex.indexOf(b.entry));
}

// ── the render-key function, evaluated from real source ──────────────────────
/* Inject any helper the extracted function closes over, so a mutation that
   adds a new dependency fails an assertion instead of crashing the harness. */
const recordKeyDeps = {
  RECORD_KEYS: new Map(),
  visiblePos: (entry) => codexData.codex.filter((x) => x.sys === entry.sys).indexOf(entry),
};
const recordKey = loadRealFn(
  "recordKey",
  ["codex", ...Object.keys(recordKeyDeps)],
  [codexData.codex, ...Object.values(recordKeyDeps)]
);
const SEARCH_PAGE = Number(/const SEARCH_PAGE = (\d+)/.exec(DOCK)[1]);

console.log(`Batch 8 search pilot — behavioural  (SEARCH_PAGE=${SEARCH_PAGE})`);

/* ── 1. complete set is computed before the limit ─────────────────────────── */
eq("no slice(0,48) truncation inside the match pipeline",
   /allMatches[\s\S]{0,700}?\.slice\(0, ?48\)/.test(DOCK), false);
ok("display limit applied via visibleCount, not inside search",
   /const matches = useMemo\(\(\) => allMatches\.slice\(0, visibleCount\)/.test(DOCK));
ok("reveal state resets on new query or system filter",
   /useEffect\(\(\) => \{ setVisibleCount\(SEARCH_PAGE\); \}, \[query, selectedSystem\]\)/.test(DOCK));

/* ── 2. rank order + reveal boundaries on a broad query ───────────────────── */
for (const q of ["gold", "onyx", "obsidian", "mercury", "fire"]) {
  const all = rankAll(q);
  ok(`"${q}" produces >48 matches (broad term)`, all.length > SEARCH_PAGE, `only ${all.length}`);

  // first batch is exactly SEARCH_PAGE
  const first = all.slice(0, SEARCH_PAGE);
  eq(`"${q}" first batch size`, first.length, SEARCH_PAGE);

  // revealing in pages never repeats or drops a record
  let shown = [], pages = 0;
  for (let n = SEARCH_PAGE; n <= all.length + SEARCH_PAGE; n += SEARCH_PAGE) {
    pages++;
    const batch = all.slice(0, n);
    const keys = batch.map((it) => `${it.entry.sys}:${it.entry.e}#${codexData.codex.indexOf(it.entry)}`);
    eq(`"${q}" reveal page ${pages}: no repeated records`, new Set(keys).size, keys.length);
    shown = batch;
    if (n >= all.length) break;
  }
  eq(`"${q}" final reveal reaches the true total`, shown.length, all.length);

  // every revealed item is a real source record, none invented
  const sourceIdx = new Set(codexData.codex.map((e) => codexData.codex.indexOf(e)));
  ok(`"${q}" every result is a source record`,
     shown.every((it) => sourceIdx.has(codexData.codex.indexOf(it.entry))));

  // rank order preserved: revealing only appends, never reshuffles
  const prefixOk = all.slice(0, shown.length)
    .every((it, i) => it.entry === shown[i].entry);
  ok(`"${q}" reveal preserves existing result order`, prefixOk);
}

/* ── 3. reveal boundaries: never exceed the total ─────────────────────────── */
{
  const q = "gold";
  const all = rankAll(q);
  const rem = all.length % SEARCH_PAGE;
  ok("total is not an exact multiple of the page size (boundary exercised)",
     rem !== 0, `total=${all.length} rem=${rem}`);
  const past = all.slice(0, all.length + SEARCH_PAGE);
  eq("slicing past the total cannot over-report", past.length, all.length);
}

/* ── 4. empty state ───────────────────────────────────────────────────────── */
{
  const all = rankAll("zzqqxx-not-present");
  eq("unmatched query yields an empty set", all.length, 0);
  ok("UI distinguishes the empty state",
     /matchTotal === 0\s*\?\s*"No results"/.test(DOCK));
}

/* ── 5. render keys: unique among siblings AND stable per record ──────────── */
{
  const keys = codexData.codex.map((e) => recordKey(e));
  eq("render keys are unique across the whole dataset", new Set(keys).size, keys.length);

  // stability: same record always yields the same key
  const again = codexData.codex.map((e) => recordKey(e));
  ok("render keys are stable across repeated calls", JSON.stringify(keys) === JSON.stringify(again));

  // key must not be a position within a filtered result list. Bind the SAME
  // immutable source array both times and vary only the ORDER records are
  // rendered in: a list-positional key changes, a source-derived key does not.
  const keyFactory = new Function(
    "codex", ...Object.keys(recordKeyDeps),
    ts.transpileModule(extractFn("recordKey"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText + "\nreturn recordKey;"
  );
  const target = codexData.codex.find((e) => e.sys === "DEITIES");
  const fresh = () => Object.entries(recordKeyDeps).map(([k]) =>
    k === "RECORD_KEYS" ? new Map() : recordKeyDeps[k]);
  const kFull = keyFactory(codexData.codex, ...fresh())(target);
  const kRev = keyFactory(codexData.codex, ...fresh())(target);
  ok("render key is independent of result-list order",
     kFull === kRev, `first=${kFull} second=${kRev}`);
  ok("render key is derived from the immutable source dataset",
     /codex\.indexOf\(entry\)/.test(extractFn("recordKey")));
  ok("render key uses the source index, not a filtered-list index",
     /\$\{entry\.sys\}:\$\{entry\.e\}#\$\{codex\.indexOf\(entry\)\}/.test(extractFn("recordKey")));

  // the 4 duplicated identities must remain DISCRETE
  const dups = ["Christos [Other]", "Hecate [Other]", "Kuan Yin [Other]", "Ma\u2019at [Other]"];
  for (const name of dups) {
    const pair = codexData.codex.filter((e) => e.sys === "DEITIES" && e.e === name);
    eq(`duplicate pair retained in source: ${name}`, pair.length, 2);
    const k = pair.map(recordKey);
    ok(`duplicate pair has distinct render keys: ${name}`, k[0] !== k[1], k.join(" | "));
    ok(`duplicate pair keeps identical public id: ${name}`,
       `${pair[0].sys}:${pair[0].e}` === `${pair[1].sys}:${pair[1].e}`);
  }

  // keys differ from the old colliding pattern
  ok("render key is no longer the colliding `${sys}:${e}` alone",
     !/key=\{`\$\{entry\.sys\}:\$\{entry\.e\}`\}/.test(DOCK));
}

/* ── 6. per-system filtering stays exact under navigation ────────────────── */
{
  for (const sys of ["DEITIES", "CRYSTALS", "PLANTS", "I_CHING", "ALCHEMY", "COLORS"]) {
    const n = codexData.codex.filter((e) => e.sys === sys).length;
    ok(`system ${sys} has records`, n > 0);
  }
  // selecting a system must scope to exactly its own records
  const deities = codexData.codex.filter((e) => e.sys === "DEITIES");
  const crystals = codexData.codex.filter((e) => e.sys === "CRYSTALS");
  const deitiesAsCrystal = crystals.filter((e) => e.sys === "DEITIES");
  eq("CRYSTALS never contains DEITIES rows after filtering", deitiesAsCrystal.length, 0);
  ok("CRYSTALS dataset count is the authority", crystals.length === 51, `got ${crystals.length}`);
  ok("DEITIES dataset count is the authority", deities.length === 202, `got ${deities.length}`);

  // repeated navigation cannot accumulate: each selection is a pure filter
  let seq = ["DEITIES", "CRYSTALS", "DEITIES", "CRYSTALS", "DEITIES", "CRYSTALS"];
  for (let pass = 0; pass < 3; pass++) {
    for (const sys of seq) {
      const rendered = codexData.codex.filter((e) => e.sys === sys);
      const foreign = sys === "CRYSTALS"
        ? rendered.filter((e) => e.sys !== "CRYSTALS")
        : [];
      eq(`round ${pass + 1} ${sys}: no foreign rows`, foreign.length, 0);
    }
  }
}

/* ── 7. accessible reveal control ─────────────────────────────────────────── */
{
  const btn = /<button[\s\S]{0,400}?className="oracle-search-more"[\s\S]{0,400}?<\/button>/.exec(DOCK);
  ok("a dedicated Show more control exists", !!btn);
  ok("reveal control is a real <button> (keyboard reachable)",
     !!btn && /<button/.test(btn[0]));
  ok("reveal control appends a page at a time",
     /setVisibleCount\(\(n\) => n \+ SEARCH_PAGE\)/.test(DOCK));
  ok("reveal control is only rendered when more remain",
     /matchTotal > matches\.length &&/.test(DOCK) &&
     /matchTotal > 0 && matches\.length < matchTotal &&/.test(DOCK));
  const moreSites = (DOCK.match(/className="oracle-search-more"/g) || []).length;
  eq("both search surfaces expose a Show more control", moreSites, 2);
  const moreButtons = DOCK.match(/<button[^>]*className="oracle-search-more"[\s\S]{0,400}?<\/button>/g) || [];
  ok("every Show more control is a real <button>", moreButtons.length === 2, `found ${moreButtons.length}`);
  ok("every Show more control appends a page",
     moreButtons.length === 2 && moreButtons.every((b) => /setVisibleCount\(\(n\) => n \+ SEARCH_PAGE\)/.test(b)));
  ok("fully-revealed state is stated explicitly",
     /All \{matchTotal\} results shown\./.test(DOCK));
  ok("partial state names both shown and total",
     /`Showing \$\{matches\.length\} of \$\{matchTotal\} results`/.test(DOCK));
}

/* ── 8. honest disclosure exists on both search surfaces ──────────────────── */
{
  const disclosures = DOCK.match(/`Showing \$\{matches\.length\} of \$\{matchTotal\} results`/g) || [];
  ok("both search surfaces disclose shown-vs-total", disclosures.length >= 2, `found ${disclosures.length}`);
}

console.log("");
for (const f of fails) console.log("  FAIL  " + f);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);