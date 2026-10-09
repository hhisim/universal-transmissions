#!/usr/bin/env node
/**
 * batch2-research-anchor.js — the research-anchor contract, exercised against
 * the REAL `/api/oracle` handler.
 *
 * Why this file exists. The anchor-precedence rule — research > correspondence
 * entry > artwork, and an unresolvable research identifier must NOT fall back to
 * artwork context — is documented in `src/app/api/oracle/route.ts` and in the
 * anchor-policy table of the UT Oracle skill, but no restored suite asserted it.
 * A mutation that let `resolveArtwork` run unconditionally while a research topic
 * was requested passed all 365 assertions in the two Batch 2 suites. That is a
 * coverage gap in the harness, not a product defect, and this file closes it.
 *
 * Everything asserted here is the shipped handler and the shipped registry. The
 * only stubbed boundary is the Oracle backend HTTP call on `global.fetch`.
 *
 * KNOWN COHERENCE GAP — reported, not asserted (see FINDING below). Assertions
 * here cover only contracts the route's own comments state as intended.
 */
const path = require("path");
const { registerTsModules } = require("./lib/ut-ts-require.cjs");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
registerTsModules({ root: ROOT });

const oracleRoute = require(path.join(SRC, "app/api/oracle/route.ts"));
const topics = require(path.join(SRC, "lib/research-topics.ts"));
const { artworks } = require(path.join(SRC, "data/artworks.ts"));

let passed = 0;
const failures = [];
const findings = [];
function ok(cond, label) {
  if (cond) { passed += 1; return; }
  failures.push(label);
  console.error("  FAIL:", label);
}
function eq(actual, expected, label) {
  ok(actual === expected, `${label} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

const realFetch = global.fetch;
let captured = null;
global.fetch = async (url, init) => {
  if (String(url).includes("/chat")) {
    captured = { url: String(url), body: JSON.parse(init.body) };
    return { ok: true, status: 200, json: async () => ({ response: "OK" }), text: async () => "OK" };
  }
  return realFetch(url, init);
};

const CYMATICS = `${topics.RESEARCH_TOPIC_PREFIX}${topics.researchTopicSlugs()[0]}`;
const topic = topics.resolveResearchTopic(CYMATICS);
const THOTH = "corr-v1:DEITIES::Thoth%20%5BEgyptian%5D";
const artwork = artworks[0];

async function post(body) {
  captured = null;
  const res = await oracleRoute.POST({ json: async () => body });
  return { res, payload: await res.json(), sent: captured };
}

(async () => {
  console.log("Batch 2 — research anchor precedence (real /api/oracle handler)\n");

  // ── the registry is the source of the anchor ────────────────────────────
  {
    ok(topics.researchTopicSlugs().length > 0, "registry exposes at least one topic");
    ok(!!topic, `registry resolves ${CYMATICS}`);
    eq(topic.route, "/research/cymatics", "topic route is the canonical in-site route");
    eq(topics.resolveResearchTopic("research-v1:definitely-not-a-topic"), null,
      "an unknown research identifier resolves to null");
    eq(topics.resolveResearchTopic(undefined), null, "an absent identifier resolves to null");
  }

  // ── 1. a resolved research topic becomes the primary anchor ──────────────
  {
    const turn = await post({ message: "What does this actually show?", researchTopicId: CYMATICS, artworkId: artwork.id });
    eq(turn.res.status, 200, "research request accepted");
    const sent = turn.sent.body.message;
    ok(sent.includes(`id ${topic.id}`), "provider message names the server-resolved topic");
    ok(sent.includes(`Title: ${topic.title}`), "provider message carries the verified title, not a client one");
    ok(!sent.includes("Artwork context"), "artwork context is suppressed when research is requested");
    ok(!sent.includes(artwork.title), "the superseded artwork title never reaches the provider");
    eq(turn.payload.researchStatus, "resolved", "researchStatus is resolved");
    eq(turn.payload.groundedResearch.id, topic.id, "response carries the server-resolved research id");
    eq(turn.payload.groundedResearch.title, topic.title, "response carries the server-resolved research title");
    eq(turn.payload.groundedResearch.route, topic.route, "response carries the canonical research route");
    eq(turn.payload.groundedArtworkId, null, "the superseded artwork is not reported as grounded");
  }

  // ── 2. precedence: research displaces the correspondence entry in the prompt ──
  {
    const turn = await post({
      message: "Read this entry.",
      researchTopicId: CYMATICS,
      entityId: THOTH,
      entityType: "correspondence_entry",
    });
    const sent = turn.sent.body.message;
    ok(sent.includes("Selected UT research topic"), "research is the primary anchor");
    ok(sent.includes("Primary anchor is the selected Correspondence record") === false,
      "the correspondence record does not claim the primary anchor");
    ok(!sent.includes(THOTH), "the displaced entry id is not sent upstream");
    ok(!sent.includes("UT corpus material"), "no displaced entry grounding reaches the model");

    // Reported, not asserted: the route still resolves and returns the entry even
    // though `if (entry && !topic)` suppressed its grounding from the prompt. See
    // the FINDING block printed at the end of this run.
    if (turn.payload.entityStatus === "resolved" && turn.payload.evidence) {
      findings.push(
        `research + entry sent together → entityStatus=${turn.payload.entityStatus}, ` +
        `evidence.entityId=${turn.payload.evidence.entityId}, while the prompt omitted that entry's grounding`
      );
    }
  }

  // ── 3. an unknown research identifier must NOT fall back to artwork ──────
  // The middle row of the anchor-policy table: an id that was REQUESTED but not
  // resolved is not the same as no id at all.
  {
    const turn = await post({
      message: "Tell me about it.",
      researchTopicId: "research-v1:definitely-not-a-topic",
      artworkId: artwork.id,
    });
    const sent = turn.sent.body.message;
    ok(sent.includes("could not be resolved on the server"),
      "the model is told the research identifier is unavailable");
    ok(!sent.includes("Artwork context"), "artwork context is NOT substituted for the unknown topic");
    ok(!sent.includes(artwork.title), "the supplied artwork never stands in for the unknown topic");
    ok(!/Title:\s*definitely-not-a-topic/.test(sent), "no title is invented for the unknown topic");
    eq(turn.payload.researchStatus, "unknown", "researchStatus is unknown, not absent");
    eq(turn.payload.groundedResearch, null, "no research context is fabricated");
    eq(turn.payload.groundedArtworkId, null, "no artwork is reported as grounded");
  }

  // ── 4. with NO research request, existing handling is untouched ───────────
  {
    const turn = await post({ message: "What is this?", artworkId: artwork.id });
    ok(turn.sent.body.message.includes("Artwork context"), "artwork grounding still works on its own");
    ok(turn.sent.body.message.includes(`Title: ${artwork.title}`), "the registry title is used");
    eq(turn.payload.researchStatus, "absent", "researchStatus is absent when none was requested");
    eq(turn.payload.groundedArtworkId, artwork.id, "artwork is grounded");

    const entry = await post({ message: "What does this hold?", entityId: THOTH, entityType: "correspondence_entry" });
    eq(entry.payload.entityStatus, "resolved", "a correspondence entry still resolves without research");
    ok(entry.sent.body.message.includes("primary anchor"), "the entry is still the primary anchor on its own");
    ok(entry.payload.evidence && entry.payload.evidence.entityId === THOTH, "evidence is returned on its own");
    eq(entry.payload.researchStatus, "absent", "no research status is invented");
  }

  // ── 5. a client-supplied research title is never trusted ──────────────────
  {
    const turn = await post({
      message: "Tell me about it.",
      researchTopicId: CYMATICS,
      researchTopicTitle: "Definitely the healing frequencies of DNA",
    });
    const sent = turn.sent.body.message;
    ok(!sent.includes("Definitely the healing frequencies of DNA"),
      "a client-supplied research title is not trusted");
    eq(turn.payload.groundedResearch.title, topic.title, "the registry title is used instead");
  }

  global.fetch = realFetch;
  console.log(`\n${passed} assertions passed, ${failures.length} failed`);
  if (findings.length) {
    console.log("\nFINDING (reported, not asserted):");
    findings.forEach((f) => console.log("  - " + f));
  }
  if (failures.length) {
    console.error("\nFailures:");
    failures.forEach((f) => console.error("  -", f));
    process.exit(1);
  }
})().catch((err) => {
  console.error("suite crashed:", err);
  process.exit(1);
});