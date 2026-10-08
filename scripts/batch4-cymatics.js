#!/usr/bin/env node
/**
 * Batch 4 — Cymatics connections + research Oracle portal: contract assertions.
 *
 * Checks the properties that actually matter for this batch:
 *  - only real registry keys; no fuzzy/substring matching
 *  - client-supplied descriptive text is never trusted or forwarded
 *  - anchor precedence: research > artwork; unknown topic does NOT fall back
 *  - honest ungrounded state for unknown identifiers
 *  - epistemic honesty in the page copy
 *  - the unfinished instrument boundary is preserved
 *  - every connection points at a route that really resolves
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = process.argv[2] || "/var/tmp/ut-batch4";
const R = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0;
const fails = [];
function ok(name, cond, detail) {
  if (cond) pass++;
  else fails.push(name + (detail ? " :: " + detail : ""));
}
function section(t) {
  console.log("\n── " + t);
}

/** Collapse whitespace so assertions survive line-wrapped source. */
const flat = (s) => s.replace(/\s+/g, " ");

/**
 * Recover the RUNTIME text of a template array of string literals. Source wraps
 * long strings across entries (`"...not an",` / `"  experimental result."`), so a
 * raw-source regex can never see the phrase a reader actually gets. This
 * concatenates the literals the way `.join("\n")` does, minus the newlines.
 */
function joined(src) {
  return [...src.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join("\n");
}

// ── 1. research registry ────────────────────────────────────────────────────
section("research registry");
const topics = R("src/lib/research-topics.ts");
const topicsFlat = flat(topics);
ok("prefix is versioned", topics.includes('RESEARCH_TOPIC_PREFIX = "research-v1:"'));
ok("registry exports a resolver", /export function resolveResearchTopic/.test(topics));
ok("resolver rejects non-strings", /typeof rawId !== "string"/.test(topics));
ok(
  "resolver uses exact own-key lookup (no fuzzy/substring fallback)",
  /Object\.prototype\.hasOwnProperty\.call\(REGISTRY, slug\) \? REGISTRY\[slug\] : null/.test(topicsFlat),
  "lookup line did not match"
);
ok(
  "resolver does not iterate/prefix-match the registry",
  !/Object\.(keys|entries)\(REGISTRY\)\.(find|filter|some)/.test(topicsFlat) &&
    !/REGISTRY\[slug\]/.test(topicsFlat.replace("? REGISTRY[slug] : null", ""))
);
ok("resolver bounds input length", /const id = rawId\.trim\(\)\.slice\(0, 120\)/.test(topics));
ok("returns null for unknown -> honest ungrounded", /:\s*ResearchTopic \| null/.test(topics));
ok("no client-supplied system prompt field exists", !/systemPrompt/.test(topics));
ok("no client-supplied summary field is accepted as input", !/readSummary|body\.summary/.test(topics));

section("epistemic discipline in the registry summary");
const cyStart = topics.indexOf("const CYMATICS");
const cySources = topics.indexOf("sources: [", cyStart);
const cyBlock = topics.slice(cyStart, cySources);
const cyFlat = flat(cyBlock);
for (const marker of ["OBSERVED", "HISTORICAL", "UT ARTISTIC INTERPRETATION"]) {
  ok("summary declares " + marker, cyBlock.includes(marker));
}
ok("summary states the DNA claim is unsupported", /no established evidence/i.test(cyFlat));
ok("summary names 528 Hz DNA repair as a claim NOT supported", /528 Hz repairs DNA/i.test(cyFlat));
// The unverified "force field as Jenny's belief" attribution was removed after
// searching all 135 PDF pages of the 2001 scan. Lock in the correction.
ok("page does not attribute a force field to Jenny",
  !/manifest an invisible force field/i.test(cyFlat));
ok("grounding block does not attribute a force field to Jenny",
  !/manifestation of an invisible force/i.test(joined(topics)));
ok("grounding cites Jenny's own empirical-only method statement",
  /strictly empirical and phenomenological lines/i.test(joined(topics)));
ok("unsupported Galileo date 1630 is absent", !/around 1630/.test(cyFlat));
ok("Jenny Volume II dated 1974, not his death year 1972",
  /Volume 2, 1974/i.test(joined(topics)) && !/second volume in 1972/i.test(joined(topics)));
ok("summary separates observation from analogy",
  /is an analogy,\s*not an\s+experimental result/i.test(joined(cyBlock)));
ok("prompt block forbids medical/frequency claims", /do not offer medical or healing claims/i.test(topicsFlat));
ok(
  "prompt block separates interpretation from experiment",
  /do not present an interpretation or a symbolic frequency assignment as an\s+experimental\s+result/i.test(joined(topics.slice(topics.indexOf("function researchPromptBlock"))))
);
const cySrcBlock = topics.slice(cySources);
ok("every source states what it supports", (cySrcBlock.match(/\n      supports:/g) || []).length === 3,
  "supports: count = " + (cySrcBlock.match(/\n      supports:/g) || []).length);
ok("bounded summary is a fixed server record (not request-derived)", /const CYMATICS: ResearchTopic = \{/.test(topics));

// ── 2. source honesty ──────────────────────────────────────────────────────
section("source honesty");
ok("Chladni 1787 primary source present", topics.includes("Entdeckungen"));
ok("Jenny source present", topics.includes("Kymatik"));
ok("no UT-owned file is labelled as an external citation", !/internal: true/.test(topics));
ok("source kinds include primary/historical/reference",
  /kind: "primary"/.test(topics) && /kind: "historical"/.test(topics) && /kind: "reference"/.test(topics));
ok("each source declares bounded support text", (topics.match(/supports:/g) || []).length >= 3);

// ── 3. connections ─────────────────────────────────────────────────────────
section("connections");
const conns = R("src/lib/research-connections.ts");
const blocks = conns.split(/\n  \{\n/).slice(1);
const entries = [...conns.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
ok("4-6 connections", entries.length >= 4 && entries.length <= 6, "got " + entries.length);
ok("every connection has a rationale", blocks.length === entries.length && blocks.every((b) => /rationale:/.test(b)),
  `blocks=${blocks.length} hrefs=${entries.length}`);
ok("every connection declares a basis",
  blocks.every((b) => /basis:\s*"(documented|interpretation|thematic)"/.test(b)));
ok("every connection states its basisLabel", blocks.every((b) => /basisLabel:/.test(b)));
ok("basis vocabulary is explicit", /type ConnectionBasis = "documented" \| "interpretation" \| "thematic"/.test(conns));
ok("states a keyword alone is insufficient", /keyword overlap is not a relationship/i.test(flat(conns)));
ok("declares an honest correspondence gap instead of inventing a link",
  /No Correspondence entry is linked in this pilot/i.test(flat(conns)));
ok("gap makes no exhaustive corpus claim", !/824 entries|holds no cymatics record/i.test(flat(conns)));
ok("no canvas/graph/large-viz dependency", !/canvas|getContext\(|d3|three|webgl/i.test(conns));
ok("all connection hrefs are internal routes", entries.every((h) => h.startsWith("/") && !h.includes("..")));
ok("no invented /research/ cross-links", !entries.some((h) => h.startsWith("/research/")));

// Every href must resolve in the REAL registry, not just on disk: journal and
// gallery are dynamic [slug] routes, so a filesystem probe would be meaningless.
const { createRequire } = require("node:module");
const require2 = createRequire(ROOT + "/");
const artworks = require2("/var/tmp/b4_artworks.cjs").artworks;
const artSlugs = new Set(artworks.map((a) => a.slug));
const blogSrc = R("src/data/blog-posts.ts");
const blogSlugs = new Set([...blogSrc.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]));
for (const h of entries) {
  const slug = h.split("/").pop();
  const known = h.startsWith("/gallery/")
    ? artSlugs.has(slug)
    : h.startsWith("/journal/")
    ? blogSlugs.has(slug)
    : fs.existsSync(path.join(ROOT, "src/app", slug, "page.tsx"));
  ok("target exists in the real registry: " + h, known);
}
// And the titles must be the records' own titles, not invented prose.
const titleOf = {};
for (const a of artworks) titleOf[a.slug] = a.title;
for (const b of blocks) {
  const href = (b.match(/href:\s*"([^"]+)"/) || [])[1];
  if (!href || !href.startsWith("/gallery/")) continue;
  const stated = (b.match(/title:\s*"([^"]+)"/) || [])[1];
  const slug = href.split("/").pop();
  ok("artwork title is the record's own title: " + slug, stated === titleOf[slug], `stated="${stated}" actual="${titleOf[slug]}"`);
}

// ── 4. page: epistemic language + boundaries ───────────────────────────────
section("cymatics page");
const page = R("src/app/research/cymatics/page.tsx");
const pageFlat = flat(page);
ok("no 'DNA Repair' label remains", !/DNA Repair/.test(page));
ok("528 label explicitly disclaims DNA", /no DNA claim/i.test(page));
ok("term credited to Hans Jenny, not antiquity", /coined by Hans Jenny/.test(page));
ok("duplicated kyma sentence removed", (page.match(/meaning .{0,12}wave/gi) || []).length <= 1);
ok("Chladni given primary date 1787", /1787/.test(page));
ok("Chladni's treatise named", /Entdeckungen/.test(page));
ok("predecessors (Hooke/Galileo) named", /Hooke/.test(page) && /Galileo/.test(page));
ok("'atoms to galaxies' overreach removed", !/atoms to galaxies/i.test(page));
ok("'laboratory proof of an ancient claim' overreach removed", !/laboratory proof of an ancient claim/i.test(page));
ok("metaphysical limit stated explicitly", /metaphysical question the experiment does not answer/i.test(pageFlat));
ok("UT interpretation explicitly labelled", (page.match(/UT artistic interpretation/gi) || []).length >= 2);
ok("what the experiment does NOT show is stated", /What the experiment does not show/i.test(pageFlat));
ok("frequency table has an explicit reading note", /How to read this table/i.test(pageFlat));
ok("table note denies DNA/medical evidence", /no established evidence that any frequency in this table repairs DNA/i.test(pageFlat));
ok("Jenny volume dated 1967", /Kymatik<\/em> \(1967\)/.test(page));
ok("observation-vs-interpretation distinction preserved in the mystical voice",
  /genuinely observed and genuinely reproducible/i.test(pageFlat));
ok("Chladni described as primary-source history, not just folklore", /Ernst Chladni \(1756.{0,4}1827\) introduced the method systematically/i.test(pageFlat));

section("unfinished instrument boundary preserved");
ok("tonoscope explicitly not yet built", /not yet built/.test(pageFlat));
ok("unfinished routes labelled as coming-soon", /coming-soon surfaces/i.test(pageFlat));
ok("no audio element added", !/<audio\b/i.test(page));
ok("no WebGL/canvas added", !/getContext\(|<canvas|webgl/i.test(page));
ok("no background animation in the new component",
  !/requestAnimationFrame|setInterval/.test(R("src/components/research/CymaticsConnections.tsx")));
ok("existing /experience links retained", page.includes("/experience/cymatic-tonoscope"));
ok("does not suggest an interactive instrument exists",
  !/start the audio|play the tonoscope|interactive instrument/i.test(pageFlat));

// ── 5. wiring ──────────────────────────────────────────────────────────────
section("page wiring");
ok("connections component imported", /CymaticsConnections/.test(page));
ok("portal component imported", /ResearchOraclePortal/.test(page));
ok("topic resolved on the server in the page", /resolveResearchTopic\(researchTopicId\("cymatics"\)\)/.test(page));
ok("portal receives a return link", /returnHref="\/research\/cymatics"/.test(page));
ok("page takes no descriptive input from the URL", !/searchParams/.test(page));

// ── 6. Oracle portal component ─────────────────────────────────────────────
section("research oracle portal component");
const portal = R("src/components/research/ResearchOraclePortal.tsx");
const portalFlat = flat(portal);
ok("renders a stable identifier", /research-v1:/.test(portal) && /topic\.id/.test(portal));
ok("shows a context chip", /data-research-chip/.test(portal));
ok("shows a return link", /data-research-return/.test(portal));
ok("no auto-submit mechanism", !/\.submit\(|autoSubmit|fetch\(|sendMessage\(/i.test(portal));
ok("draft is user-controlled state", /onChange/.test(portal) && /setDraft/.test(portal));
ok("draft re-seed guarded by a dirty flag", /if \(dirty\) return/.test(portal));
ok("cleared draft handled explicitly", /cleared/.test(portal) && /data-research-empty/.test(portal));
ok("external sources open safely", /rel="noopener noreferrer"/.test(portal));
ok("states sources are not per-sentence citations",
  /references behind this page[\s\S]{0,160}?not the full text of each document/i.test(portalFlat));
ok("explicitly says the model gets the summary, not the documents",
  /not the full text of each document/i.test(portalFlat));
ok("draft has a real label", /htmlFor="research-oracle-draft"/.test(portal));
ok("survives rerender: seeded once via useState initialiser + dirty guard",
  /useState\(topic\.suggestedQuestion\)/.test(portal) && /dirty/.test(portal));

// ── 7. API ─────────────────────────────────────────────────────────────────
section("oracle api");
const api = R("src/app/api/oracle/route.ts");
const apiFlat = flat(api);
ok("imports the research resolver", /resolveResearchTopic/.test(api));
ok("reads researchTopicId from the request body",
  /const \{[^}]*researchTopicId[^}]*\} = body;/.test(apiFlat));
ok("research precedence: artwork suppressed when a topic is requested",
  /const artwork =\s*researchRequested \? null : resolveArtwork/.test(apiFlat));
ok("entry does not outrank a topic", /if \(entry && !topic\)/.test(apiFlat));
ok("unknown identifier yields an explicit ungrounded notice",
  /could not be resolved on the server/i.test(apiFlat));
ok("unknown path forbids inventing evidence",
  /Do not invent a[\s\S]{0,40}?title, summary, source list or experimental finding/i.test(apiFlat));
ok("unknown path forbids treating supplied text as evidence",
  /treat any supplied URL or prompt text as evidence/i.test(apiFlat));
ok("response exposes resolved research only (or null)", /groundedResearch/.test(api));
ok("response distinguishes absent vs resolved vs unknown", /researchStatus/.test(api));
ok("no client title/summary echoed into grounding",
  !/body\?\.title|body\?\.summary|body\?\.systemPrompt/.test(api));

// ── 8. Oracle client ───────────────────────────────────────────────────────
section("oracle client");
const client = R("src/app/oracle/page-client.tsx");
const clientFlat = flat(client);
ok("client reads the stable identifier", /searchParams\.get\("researchTopicId"\)/.test(client));
ok("client resolves via the shared registry", /resolveResearchTopic/.test(client));
ok("client never trusts a URL title/summary/prompt",
  !/searchParams\.get\("(title|summary|prompt|systemPrompt)"\)/.test(client));
ok("identifier bounded by the existing entity budget",
  /searchParams\.get\("researchTopicId"\),\s*MAX_ENTITY_CHARS/.test(clientFlat));
ok("artwork context dropped when a research topic is requested",
  /if \(researchRequested\) return null/.test(client));
ok("draft still bounded by MAX_DRAFT_CHARS",
  /boundedParam\(searchParams\.get\("q"\), MAX_DRAFT_CHARS\)/.test(client));
ok("return path still bounded by MAX_RETURN_CHARS",
  /boundedParam\(searchParams\.get\("from"\), MAX_RETURN_CHARS\)/.test(client));
ok("sends only the identifier to the API",
  /researchTopicId: researchContext\s*\? researchTopicIdFor/.test(client));
ok("does not send a client-built research prompt", !/systemPrompt:|grounding:\s*\[/.test(client));
ok("history still excludes the current question", /buildHistoryFromMessages/.test(client));
ok("research return path hardened against protocol-relative URLs",
  /!returnTo\.startsWith\("\/\/"\)/.test(clientFlat));
ok("no auto-submit effect for the seeded question", !/useEffect\([\s\S]{0,200}?sendMessage\(/.test(client));

// ── 10. review round: anchor policy + visitor-facing copy ───────────────────
section("anchor policy consistency");
ok("client distinguishes 'supplied' from 'resolved'",
  /const researchRequested = rawResearchId\.length > 0;/.test(client));
ok("artwork suppressed whenever a research id was supplied",
  /if \(researchRequested\) return null;/.test(client));
ok("unavailable research context is disclosed in the UI",
  /data-research-unavailable/.test(client) && /RESEARCH CONTEXT UNAVAILABLE/.test(client));
ok("no silent substitute anchor for an unknown research id",
  /researchRequested && !researchContext && \(/.test(client));
ok("API discloses unavailability rather than inventing a topic",
  /could not be resolved on the server/.test(api) && /Do not invent a/.test(api));
ok("API returns an explicit researchStatus",
  /researchStatus: researchRequested \? \(topic \? 'resolved' : 'unknown'\) : 'absent'/.test(api));

section("visitor-facing copy");
const portalCopy = R("src/components/research/ResearchOraclePortal.tsx");
ok("no raw identifier shown in the portal UI",
  !/id research-v1/.test(portalCopy));
ok("portal still sends the identifier on the wire",
  /research-v1:\$\{topic\.id\}/.test(portalCopy));
ok("portal uses the plain continuation sentence",
  /Continue with \{topic\.title\} as your context\. Edit the question before opening the/.test(portalCopy));
// Assert on JSX *text nodes* only: strip comments first, then look for the
// plumbing language between tags. A raw source regex would match the code
// comment above the chip, which is not shown to visitors.
const portalText = portalCopy.replace(/\{[\s\S]*?\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
ok("portal no longer explains server resolution to visitors",
  !/It cannot be told a different title/.test(portalText) &&
  !/resolved on the server/.test(portalText) &&
  !/identifier/.test(portalText));
ok("portal drops the never-submitted-automatically label",
  !/never submitted automatically/.test(portalCopy));
ok("oracle chip no longer shows the raw identifier",
  !/researchContext\.id\.toUpperCase\(\)/.test(client));
ok("oracle chip still shows the registry title + return link",
  /researchContext\.title/.test(client) && /researchContext\.returnTo/.test(client));

section("correspondence absence claim");
const connGaps = R("src/lib/research-connections.ts");
ok("no exhaustive corpus claim remains", !/824 entries/.test(connGaps) && !/holds no cymatics record/.test(connGaps));
ok("absence stated as an editorial fact for this pilot",
  /No Correspondence entry is linked in this pilot/.test(connGaps));
ok("keyword-sweep limitation is admitted", /keyword search/.test(connGaps));
ok("frequency values described as UT symbolic material",
  /UT symbolic material/.test(connGaps));
ok("internal labels distinguished from scientific evidence",
  /not scientific evidence/.test(connGaps));

// ── 8b. defects found in LIVE preview verification ─────────────────────────
section("live-verified defect regressions");
const route = R("src/app/oracle/page.tsx");
ok("oracle chooser forwards the research identifier",
  /const FORWARDED_PARAMS = \[[^\]]*"researchTopicId"/.test(route));
ok("research id is forwarded alongside the existing params",
  /"view", "q", "artworkId", "researchTopicId", "from"/.test(route));
ok("chooser still allowlists (no blind passthrough)", /const FORWARDED_PARAMS/.test(route));
ok("client renders a research context chip", /data-research-context/.test(client));
ok("chip shows the registry title, not URL text", /researchContext\.title/.test(client));
ok("chip offers a return link", /researchContext\.returnTo/.test(client));
ok("research chip renders before the artwork chip",
  client.indexOf("data-research-context") < client.indexOf("{artworkContext && ("));
ok("no joined-statement damage from newline-agnostic patching",
  !/\}\);[^\r\n]{1,4}const artworkContext/.test(client) &&
  !/return null;[^\r\n]{1,8}const match = artworks/.test(client));

// ── 9. previous behaviour preserved ────────────────────────────────────────
section("batch 3 / oracle behaviour preserved");
const out = execSync(
  "cd " + ROOT + " && { git diff --name-only; git status --porcelain | grep '^??' | cut -c4-; }",
  { encoding: "utf8" }
);
const uniq = [...new Set(out.split("\n").filter(Boolean))];
console.log("   changed files: " + uniq.length);
ok("no gallery pilot files modified", !uniq.some((f) => /ProgressiveDetailExplorer|Lightbox/.test(f)));
ok("gallery route files untouched", !uniq.some((f) => /app\/gallery\//.test(f)));
ok("no public media touched", !uniq.some((f) => f.startsWith("public/")));
ok("codex corpus untouched", !uniq.some((f) => /codex-raw|data\/codex/.test(f)));
ok("artwork registry untouched", !uniq.some((f) => f.endsWith("data/artworks.ts")));
ok("journal content untouched", !uniq.some((f) => /blog-content|blog-posts/.test(f)));
ok("other research pages untouched",
  uniq.filter((f) => /app\/research\//.test(f)).every((f) => f.endsWith("research/cymatics/page.tsx")));
ok("oracle changes confined to the client + the shared chooser",
  uniq.filter((f) => /app\/oracle\//.test(f)).every(
    (f) => f.endsWith("oracle/page-client.tsx") || f.endsWith("oracle/page.tsx")
  ));
ok("oracle mobile client untouched", !uniq.some((f) => /oracle\/mobile/.test(f)));

console.log("\n────────────────────────────────");
console.log(`BATCH 4 ASSERTIONS: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log("\nFAILURES:");
  fails.forEach((f) => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("all assertions passed");