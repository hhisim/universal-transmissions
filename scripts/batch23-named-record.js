#!/usr/bin/env node
/**
 * batch23-named-record.js
 *
 * THE ORACLE FINDS THE RECORD THE VISITOR NAMES.
 *
 * A record reaches the Oracle today only when the visitor SELECTS it. A visitor who
 * types the name of a record sends no identifier, so no record grounding is composed —
 * and the backend cannot compensate, because the record is not in its corpus (its
 * Hebrew-letter correspondence entries are empty shells, its alphabet engine holds the
 * 26 LATIN letters, and the chroma collections hold no Hebrew-letter record).
 *
 * These checks are deterministic. They assert the resolver and the composition; the
 * matched live demonstrations are run separately and reported as such.
 */
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

const { resolveNamedRecords } = require(path.join(ROOT, "src/lib/named-record-resolver.ts"));
const { resolveOracleEntity } = require(path.join(ROOT, "src/lib/oracle-entry-resolver.ts"));
const { codex } = require(path.join(ROOT, "src/lib/codex-data.ts"));
const { composeGroundedMessage } = require(path.join(ROOT, "src/lib/oracle-conversation.ts"));

const fs = require("fs");
const ALEPH_Q = "Follow Aleph through its element, colour and frequency. How do these correspondences unfold together?";

let passed = 0; const failures = [];
function ok(c, l) { if (c) { passed += 1; return true; } failures.push(l); console.error("  FAIL:", l); return false; }

const allBlocks = (r) => r.blocks.join("\n");
const mask = (s) => JSON.stringify(s).replace(/[a-z]/g, (c) => (Math.random() < 0.4 ? "x" : c));

console.log("batch23-named-record  [deterministic]\n");

/* ── 1. an ordinary Aleph question reaches the actual Aleph fields ───────────── */
console.log("  --- 1 ordinary Aleph question reaches the actual Aleph fields ---");
const aleph = resolveNamedRecords(ALEPH_Q);
ok(aleph.resolved.length === 1, "1 exactly one record resolved (got " + aleph.resolved.length + ")");
ok(aleph.resolved[0] && aleph.resolved[0].id === "corr-v1:LETTERS_HEBREW::Aleph",
  "1 it is the Hebrew-letters Aleph (got " + (aleph.resolved[0] && aleph.resolved[0].id) + ")");
ok(/Air/.test(allBlocks(aleph)), "1 the grounding carries the element (Air)");
ok(/Blue; White; Grey/.test(allBlocks(aleph)), "1 the grounding carries the colours (Blue; White; Grey)");
ok(/741 Hz/.test(allBlocks(aleph)), "1 the grounding carries the frequency (741 Hz)");
ok(aleph.ambiguous.length === 0, "1 the name is not ambiguous (got " + aleph.ambiguous.length + ")");

/* ── 2. the grounding is IDENTICAL to an explicitly selected record ─────────── */
console.log("  --- 2 named grounding === selected grounding (the resolver is reused) ---");
const selected = resolveOracleEntity("correspondence_entry", "corr-v1:LETTERS_HEBREW::Aleph");
ok(selected.status === "resolved", "2 the selected path resolves the same id");
ok(allBlocks(aleph).includes(selected.entry.promptBlock),
  "2 the named block contains the selected path's promptBlock verbatim");

/* ── 3. switching to another named record changes the grounding ─────────────── */
console.log("  --- 3 switching to another named record changes the grounding ---");
const beth = resolveNamedRecords("Follow Gimel through its element, colour and frequency.");
ok(beth.resolved.length === 1 && beth.resolved[0].id === "corr-v1:LETTERS_HEBREW::Gimel",
  "3 Gimel resolves to the Gimel record (got " + (beth.resolved[0] && beth.resolved[0].id) + ")");
ok(!/741 Hz/.test(allBlocks(beth)), "3 Gimel's grounding does NOT carry Aleph's frequency");
ok(allBlocks(beth) !== allBlocks(aleph), "3 the grounding actually changed between the two records");

/* ── 4. a genuinely ambiguous name does not select arbitrarily ──────────────── */
console.log("  --- 4 an ambiguous name is reported, never silently chosen ---");
const amb = resolveNamedRecords("Tell me about copper in the archive.");
ok(amb.ambiguous.length === 1, "4 the ambiguous name is reported (got " + amb.ambiguous.length + ")");
ok(amb.resolved.length === 0, "4 NOTHING was resolved from an ambiguous name (got " + amb.resolved.length + ")");
ok(amb.ambiguous[0] && amb.ambiguous[0].matches.length > 1,
  "4 every candidate is listed (got " + (amb.ambiguous[0] ? amb.ambiguous[0].matches.length : 0) + ")");
ok(/more than one archive record/.test(allBlocks(amb)) && /do not choose one of them silently/i.test(allBlocks(amb)),
  "4 the grounding tells the model not to choose silently");
ok(amb.ids.length === 0, "4 no identifier was attached for an ambiguous name");

/* ── 5. an unknown name acquires no fabricated record ──────────────────────── */
console.log("  --- 5 an unknown name acquires no fabricated archive record ---");
for (const unknown of [
  "Follow Zorblax through its element, colour and frequency.",
  "What does the archive say about the Ninth Aethyr?",
  "Tell me about Vor'Tash the Unspoken.",
]) {
  const r = resolveNamedRecords(unknown);
  ok(r.resolved.length === 0 && r.ambiguous.length === 0 && r.blocks.length === 0 && r.ids.length === 0,
    "5 no record invented for " + JSON.stringify(unknown.slice(0, 34)) + " (resolved=" + r.resolved.length +
    ", ambiguous=" + r.ambiguous.length + ", blocks=" + r.blocks.length + ")");
}

/* ── 6. every attached identifier is a REAL record ─────────────────────────── */
console.log("  --- 6 every attached identifier exists in the dataset ---");
const realIds = new Set(codex.map((e) => "corr-v1:" + e.sys + "::" + e.e));
ok(codex.length === 824, "6 the dataset is unchanged (824 entries, got " + codex.length + ")");
for (const id of aleph.ids.concat(beth.ids)) {
  ok(realIds.has(id), "6 " + id + " exists in the dataset");
}
ok(resolveNamedRecords("Explain the difference between Aleph and a made-up word.").ids.length === 1,
  "6 a question mixing a real name and an invented one attaches only the real one");

/* ── 7. the conservative bound is stated and holds ─────────────────────────── */
console.log("  --- 7 the short-name bound ---");
ok(resolveNamedRecords("mem is a letter").resolved.length === 0,
  "7 a bare short name is NOT resolved (precision-first bound)");
ok(resolveNamedRecords("I bet the archive holds Bet.").resolved.length === 0,
  "7 a 3-letter record name that is also an ordinary word (bet) is NOT resolved bare");
// Framing is the word IMMEDIATELY BEFORE the name ("the letter Bet", "the record Bet").
// A name that merely appears near the word "letter" is not framed, and is not attached.
ok(resolveNamedRecords("Tell me about the letter Bet.").resolved.length === 1,
  "7 ...but the same name IS resolved when the question frames it as a record");
ok(resolveNamedRecords("Tell me about Bet, the second letter.").resolved.length === 0,
  "7 mere proximity to the word 'letter' is not framing (the preceding word must frame it)");
ok(resolveNamedRecords("Tell me about the letter Mem.").resolved.length === 1,
  "7 the same name IS resolved when the question frames it as a record");

/* ── 8. composition: the record reaches the provider message ──────────────── */
console.log("  --- 8 the record reaches the composed provider message ---");
const composed = composeGroundedMessage({ history: [], grounding: allBlocks(aleph), question: ALEPH_Q });
ok(composed.ok === true, "8 the message composes within budget");
ok(/Air/.test(composed.message) && /741 Hz/.test(composed.message),
  "8 the Aleph fields are IN the composed message");
ok(composed.message.trimEnd().endsWith(ALEPH_Q),
  "8 the question is still last and intact");
ok(composed.message.indexOf("Air") < composed.message.indexOf("Question:"),
  "8 the grounding precedes the question");

/* ── 9. a follow-up retains the subject through history ───────────────────── */
console.log("  --- 9 a follow-up retains the subject ---");
const followUp = composeGroundedMessage({
  history: [
    { role: "user", text: ALEPH_Q },
    { role: "assistant", text: "Aleph carries Air, the colours Blue, White and Grey, and 741 Hz — Awakening." },
  ],
  grounding: allBlocks(aleph),
  question: "And how does that relate to the colour?",
});
ok(followUp.ok === true, "9 the follow-up composes");
ok(/741 Hz/.test(followUp.message), "9 the prior turn's subject is retained in the transcript");
ok(followUp.message.trimEnd().endsWith("And how does that relate to the colour?"),
  "9 the follow-up question is last");

/* ── 9b. CONTINUITY: a follow-up that does not repeat the name ─────────────── */
const routeSrc = fs.readFileSync(path.join(ROOT, "src/app/api/oracle/route.ts"), "utf8");
console.log("  --- 9b follow-up continuity through history (not a source guard) ---");
// The REAL HistoryMessage shape is { role, text }. An earlier version of this
// fixture used `content`, which is why it did not catch that the resolver read the
// wrong field and the inheritance was inert against the live conversation.
const HIST = [
  { role: "user", text: ALEPH_Q },
  { role: "assistant", text: "Aleph carries Air, the colours Blue, White and Grey, and 741 Hz — Awakening." },
];
const carried = resolveNamedRecords("And how does that relate to the colour?", HIST);
ok(carried.resolved.length === 1 && carried.resolved[0].id === "corr-v1:LETTERS_HEBREW::Aleph",
  "9b a follow-up without the name INHERITS the record (got " + JSON.stringify(carried.ids) + ")");
ok(/Air/.test(allBlocks(carried)) && /741 Hz/.test(allBlocks(carried)),
  "9b the inherited record's fields are grounded again");
ok(resolveNamedRecords("And how does that relate to the colour?").resolved.length === 0,
  "9b WITHOUT history the same follow-up resolves nothing (so 9b is not vacuous)");
const switched = resolveNamedRecords("Now follow Gimel instead.", HIST);
ok(switched.resolved.length === 1 && switched.resolved[0].id === "corr-v1:LETTERS_HEBREW::Gimel",
  "9b a question naming a DIFFERENT record wins over the inherited one (got " + JSON.stringify(switched.ids) + ")");
ok(!/741 Hz/.test(allBlocks(switched)), "9b the inherited Aleph grounding is not carried alongside Gimel");

/* ── 9c. a FAILED explicit selection must not become an inferred record ─────── */
console.log("  --- 9c a failed explicit selection is not replaced by an inferred one ---");
ok(/explicitSelectionSupplied/.test(routeSrc),
  "9c the route distinguishes a SUPPLIED identifier from a resolved entry");
ok(/if \(!entry && !explicitSelectionSupplied && !researchRequested\)/.test(routeSrc),
  "9c name resolution is skipped when the visitor supplied an identifier, resolved or not");
ok(!/if \(!entry && !researchRequested\) \{\s*const named = resolveNamedRecords/.test(routeSrc),
  "9c the guard does not fall back to `entry` alone");

/* ── 10. an explicit selection stays authoritative (route wiring) ─────────── */
console.log("  --- 10 an explicit selected-record anchor remains authoritative ---");
ok(/if \(!entry && !explicitSelectionSupplied && !researchRequested\)/.test(routeSrc),
  "10 name resolution is guarded on no selected entry, no supplied identifier and no research topic");
ok(routeSrc.indexOf("if (entry && !entryDisplaced)") < routeSrc.indexOf("resolveNamedRecords(question, conversation)"),
  "10 the explicit entry is grounded before any name resolution is considered");
ok(/resolveNamedRecords/.test(routeSrc), "10 the route actually calls the resolver");
// Negative half: the guard must not be removable while the suite stays green.
ok(!/if \(entry \|\| researchRequested\) \{\s*const named = resolveNamedRecords/.test(routeSrc),
  "10 the guard is not inverted (a selected record must never be overridden by a name)");
const codexOracle = fs.readFileSync(path.join(ROOT, "src/app/api/codex-oracle/route.ts"), "utf8");
ok(/resolveNamedRecords/.test(codexOracle),
  "10 the codex-oracle route resolves named records too");

console.log("");
console.log("assertions passed: " + passed);
console.log("assertions failed: " + failures.length);
if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
console.log("\nBATCH23_NAMED_RECORD_TESTS_PASSED");
