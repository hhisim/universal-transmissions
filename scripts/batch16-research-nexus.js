#!/usr/bin/env node
/**
 * batch16-research-nexus.js — the research nexus and the second room.
 *
 * Batch 15 built one room (Cymatics) with its own connection registry. Batch 16 makes
 * that machinery general — two registered rooms, one registry, one exact-resolution
 * contract — and turns /research into a surface where a visitor can select a
 * relationship and see what it connects, why, on what basis, and where to go next.
 *
 * The assertions that matter most here are the ones that stop this batch from LYING:
 *   - every Geometry connection must name a record that actually exists, by its own title;
 *   - the Geometry↔Cymatics relationship must state its limit, not imply a mechanism;
 *   - a domain with no registered record must be described as a reading page, not as a room;
 *   - the exact-resolution contract must hold for BOTH rooms, including forged keys.
 *
 * Usage: node scripts/batch16-research-nexus.js
 */
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });

// blog-posts.ts imports each post's markdown, which only a bundler resolves. These
// assertions read the RECORD SET (slug + title), never the bodies.
require.extensions[".md"] = (mod) => { mod.exports = ""; };

const topics = require(path.join(ROOT, "src/lib/research-topics.ts"));
const connections = require(path.join(ROOT, "src/lib/research-connections.ts"));
const artworkData = require(path.join(ROOT, "src/data/artworks.ts"));
const blogPosts = require(path.join(ROOT, "src/data/blog-posts.ts"));

let passed = 0;
let failed = 0;
const ok = (m) => { console.log(`  ok   ${m}`); passed += 1; };
const bad = (m) => { console.log(`  FAIL ${m}`); failed += 1; };
const chk = (m, cond, detail) => (cond ? ok(m) : bad(`${m}${detail ? ` — ${detail}` : ""}`));
const chkeq = (m, a, b) => chk(m, a === b, `expected ${JSON.stringify(b)}, observed ${JSON.stringify(a)}`);

const GEOM = connections.GEOMETRY_CONNECTIONS;
const CYM = connections.CYMATICS_CONNECTIONS;

// ── record sets, so a connection can be checked against the real archive ───────
function collectArtworks() {
  const out = new Map();
  for (const a of artworkData.artworks || artworkData.default || []) {
    if (a && a.slug) out.set(a.slug, a.title);
  }
  return out;
}
const ARTWORKS = collectArtworks();
const POSTS = new Map();
for (const p of blogPosts.blogPosts || blogPosts.default || []) {
  if (p && p.slug) POSTS.set(p.slug, p.title);
}

console.log("\n== A. one registry, one exact-resolution contract, two rooms ==");
const cym = topics.resolveResearchTopic(topics.researchTopicId("cymatics"));
const geo = topics.resolveResearchTopic(topics.researchTopicId("geometry"));
chk("the Cymatics room still resolves", !!cym && cym.id === "cymatics");
chk("the Geometry room resolves", !!geo && geo.id === "geometry");
chkeq("both rooms are offered as topics", topics.researchTopicSlugs().sort().join(","), "cymatics,geometry");

{
  const everyConn = Object.entries(connections.CONNECTIONS_BY_TOPIC).flatMap(([slug, list]) =>
    list.map((c) => ({ slug, c })));
  chkeq("the connection map covers both rooms", everyConn.length, CYM.length + GEOM.length);
  let resolved = 0;
  for (const { slug, c } of everyConn) {
    const id = topics.researchConnectionTopicId(slug, c.anchorSlug);
    const t = topics.resolveResearchTopic(id);
    if (t && t.id === topics.connectionRegistryKey(slug, c.anchorSlug)) resolved += 1;
  }
  chkeq("EVERY connection in BOTH rooms resolves through the one resolver", resolved, everyConn.length);
  /* Across rooms, not just within one: a Geometry card must resolve under its own
     key and must NOT resolve under the Cymatics key of the same slug. */
  const gFirst = GEOM[0];
  chk("a Geometry anchor resolves under the Geometry key",
      !!topics.resolveResearchTopic(topics.researchConnectionTopicId("geometry", gFirst.anchorSlug)));
  chk("the SAME slug does not resolve under the other room's key",
      !topics.resolveResearchTopic(topics.researchConnectionTopicId("cymatics", gFirst.anchorSlug)));
}

console.log("\n== B. a forged or guessed identifier still cannot produce a record ==");
for (const bad of [
  "research-v1:geometry/connection/does-not-exist",
  "research-v1:geometry/connection/artwork-tetra-x",
  "research-v1:GEOMETRY",
  "research-v1:geometry/connection",
  "research-v1:geometry/connection/",
  "geometry/connection/room-cymatics/suffix",
  "research-v1:linguistics",
  "research-v1:symbolism",
]) {
  chk(`rejected: ${bad}`, topics.resolveResearchTopic(bad) === null);
}
chk("an exact Geometry anchor resolves while a genuinely different slug does not",
    !!topics.resolveResearchTopic("research-v1:geometry/connection/artwork-tetra")
    && !topics.resolveResearchTopic("research-v1:geometry/connection/artwork-tetra/extra")
    && !topics.resolveResearchTopic("research-v1:geometry/connection/artwork-tetr"));
chk("surrounding whitespace is normalised, not treated as a different key",
    !!topics.resolveResearchTopic(" research-v1:geometry/connection/artwork-tetra "));

console.log("\n== C. the Cymatics release is untouched by the generalisation ==");
{
  const expected = ["journal-cymatics-language-of-form", "artwork-throat-chakra", "artwork-recursive-pantheism",
                    "codex-frequency-lattice", "artwork-hyperdimensional-harmonics", "journal-kybalion-seven-principles"];
  chkeq("still six Cymatics connections", CYM.length, 6);
  chkeq("the same six anchors, in the same order", CYM.map((c) => c.anchorSlug).join(","), expected.join(","));
  const fourier = topics.resolveResearchTopic("research-v1:cymatics/connection/codex-frequency-lattice");
  chk("the released Codex anchor still carries its destination note",
      !!fourier && /front page/.test(fourier.summary) && /FREQUENCY/.test(fourier.summary));
  chk("the released anchor still carries the topic's own sources",
      !!fourier && fourier.sources.length === CYM.length - CYM.length + 4);
}

console.log("\n== D. Geometry keeps four registers apart ==");
{
  const s = geo.summary;
  for (const [label, needle] of [
    ["MATHEMATICAL", "MATHEMATICAL"],
    ["HISTORICAL", "HISTORICAL"],
    ["TRADITIONAL SYMBOLISM", "TRADITIONAL SYMBOLISM"],
    ["UT ARTISTIC INTERPRETATION", "UT ARTISTIC INTERPRETATION"],
  ]) chk(`the summary carries the ${label} register`, s.includes(needle));
  chk("it states the five-solids result as a proof, not a preference",
      /EXACTLY FIVE/.test(s) && /proved/i.test(s));
  chk("it names the golden ratio as the root of x^2 = x + 1", /x\^2 = x \+ 1/.test(s));
  chk("it marks 'sacred geometry' as a modern term", /modern term/i.test(s));
  chk("it states the resemblance limit outright", /resemblance[\s\S]{0,120}shared mechanism/i.test(s));
  chk("it labels the cymatics relationship a PARALLEL INQUIRY", /PARALLEL INQUIRY/.test(s));
  chk("it forbids presenting a UT reading as measurement",
      /Do not present a UT reading/.test(s));
}

console.log("\n== E. Geometry sources are real and scoped ==");
{
  chkeq("three references", geo.sources.length, 3);
  for (const src of geo.sources) {
    chk(`a reference is https: ${src.label.slice(0, 44)}`, /^https:\/\//.test(src.url));
    chk(`a reference has a scoping 'supports': ${src.label.slice(0, 30)}`,
        typeof src.supports === "string" && src.supports.length > 80);
  }
  chk("the references are historical/primary documents, none claimed as UT material",
      geo.sources.every((s) => s.kind === "historical" || s.kind === "primary") && geo.sources.every((s) => !s.internal));
  chk("every reference points at a digitised document host",
      geo.sources.every((s) => /archive\.org/.test(s.url)));
}

console.log("\n== F. every Geometry connection names a record that EXISTS, by its own title ==");
{
  chkeq("six Geometry connections", GEOM.length, 6);
  for (const c of GEOM) {
    const m = /^\/(gallery|journal)\/(.+)$/.exec(c.href);
    if (m) {
      const [, kind, slug] = m;
      const title = kind === "gallery" ? ARTWORKS.get(slug) : POSTS.get(slug);
      chk(`${c.href} is a real ${kind} record`, !!title);
      if (title) {
        chk(`the card title is the record's OWN title`, c.title === title,
            `card=${JSON.stringify(c.title)} record=${JSON.stringify(title)}`);
      }
    } else {
      const route = path.join(ROOT, "src/app", c.href, "page.tsx");
      chk(`${c.href} is a real route`, fs.existsSync(route));
    }
    chk(`every connection states why it belongs: ${c.anchorSlug}`, c.rationale && c.rationale.length > 120);
    chk(`every connection states its basis: ${c.anchorSlug}`,
        ["documented", "interpretation", "thematic"].includes(c.basis) && !!c.basisLabel);
  }
}

console.log("\n== G. the Geometry↔Cymatics relationship explains its limits ==");
{
  const link = GEOM.find((c) => c.href === "/research/cymatics");
  chk("the relationship exists and targets the Cymatics room", !!link);
  if (link) {
    chk("it is held as a thematic/parallel inquiry, not as documented fact", link.basis === "thematic");
    chk("it says resemblance is NOT evidence of a shared mechanism",
        /resemblance is NOT evidence of a shared mechanism/i.test(link.rationale));
    chk("it states the plate and the drawn figure have different causes",
        /standing waves/i.test(link.rationale) && /intention/i.test(link.rationale));
    chk("it says the archive holds no such experiment",
        /no experiment/i.test(link.rationale));
    const anchor = topics.resolveResearchTopic(
      topics.researchConnectionTopicId("geometry", link.anchorSlug));
    chk("its Oracle anchor carries the same limit, not a softer version",
        !!anchor && /resemblance is NOT evidence of a shared mechanism/i.test(anchor.summary));
  }
}

console.log("\n== H. a destination that cannot be targeted still says how to reach it ==");
{
  const codex = GEOM.find((c) => c.href === "/experience/correspondence-codex");
  chk("the Codex connection exists", !!codex);
  if (codex) {
    chkeq("the title is the destination's OWN title", codex.title, "The UT Correspondence Codex");
    chk("the note names the GEOMETRY system card as it actually reads",
        /GEOMETRY \(20 entries\)/.test(codex.destinationNote || ""));
    chk("the note says the link opens the front page", /front page/.test(codex.destinationNote || ""));
    chk("the note names the Home tab and the Matrix tab",
        /Home tab/.test(codex.destinationNote || "") && /Matrix/.test(codex.destinationNote || ""));
    const anchor = topics.resolveResearchTopic(
      topics.researchConnectionTopicId("geometry", codex.anchorSlug));
    chk("the anchor carries the same 'how to reach it' statement",
        !!anchor && anchor.summary.includes(codex.destinationNote));
  }
  /* A destination needs the note when it cannot be pointed at the thing the card
     names. A room route (/research/…) points exactly at that room, so it does not. */
  const needsNote = GEOM.filter((c) => !/^\/(gallery|journal|research)\//.test(c.href));
  chk("every destination that cannot be pointed at its own record carries a note",
      needsNote.length > 0 && needsNote.every((c) => (c.destinationNote || "").trim().length > 40));
}

console.log("\n== I. the nexus shows every registered relationship, and no invented one ==");
{
  const all = topics.allRegisteredConnections();
  chkeq("every registered connection is exposed", all.length, CYM.length + GEOM.length);
  chkeq("they span exactly two rooms", new Set(all.map((r) => r.topicSlug)).size, 2);
  chk("every exposed anchorId resolves", all.every((r) => !!topics.resolveResearchTopic(r.anchorId)));
  chk("every exposed anchorId is room-scoped",
      all.every((r) => r.anchorId.includes(`${r.topicSlug}/connection/`)));
}

console.log("\n== J. incomplete domains are described honestly ==");
{
  chkeq("four domains are presented", topics.RESEARCH_DOMAINS.length, 4);
  const registered = topics.RESEARCH_DOMAINS.filter((d) => d.registered);
  const reading = topics.RESEARCH_DOMAINS.filter((d) => !d.registered);
  chkeq("two are registered rooms", registered.length, 2);
  chkeq("two are reading pages", reading.length, 2);
  chkeq("the registered pair", registered.map((d) => d.slug).sort().join(","), "cymatics,geometry");
  for (const d of reading) {
    chk(`${d.slug} is described as a reading page, not a room`,
        /reading page/i.test(d.standing) && /not yet a room/i.test(d.standing));
    chk(`${d.slug} is NOT registered in the registry`, !topics.isRegisteredRoom(d.slug));
    chk(`${d.slug} has no connection registry entry`,
        !connections.CONNECTIONS_BY_TOPIC[d.slug] && !connections.GAPS_BY_TOPIC[d.slug]);
  }
  for (const d of registered) {
    chk(`${d.slug} is registered`, topics.isRegisteredRoom(d.slug));
    chk(`${d.slug} standing says it is a full research room`, /full research room/i.test(d.standing));
  }
}

console.log("\n== K. both rooms render the SAME surface, and it stays accessible ==");
{
  const shared = fs.readFileSync(path.join(ROOT, "src/components/research/ResearchConnections.tsx"), "utf8");
  const cymWrap = fs.readFileSync(path.join(ROOT, "src/components/research/CymaticsConnections.tsx"), "utf8");
  const geoPage = fs.readFileSync(path.join(ROOT, "src/app/research/geometry/page.tsx"), "utf8");
  const nexusPage = fs.readFileSync(path.join(ROOT, "src/app/research/page.tsx"), "utf8");
  const nexusCmp = fs.readFileSync(path.join(ROOT, "src/components/research/ResearchNexus.tsx"), "utf8");

  chk("the Cymatics room renders the shared surface", /<ResearchConnections/.test(cymWrap));
  chk("the Geometry room renders the shared surface", /<ResearchConnections/.test(geoPage));
  chk("the Geometry room passes its own registry and gaps",
      /connections=\{GEOMETRY_CONNECTIONS\}/.test(geoPage) && /gaps=\{GEOMETRY_GAPS\}/.test(geoPage));
  const cymPage = fs.readFileSync(path.join(ROOT, "src/app/research/cymatics/page.tsx"), "utf8");
  chk("both rooms pass a return path so the Oracle can return the visitor",
      /returnHref="\/research\/cymatics"/.test(cymPage) && /returnHref="\/research\/geometry"/.test(geoPage));

  chkeq("a card still holds exactly two links", (shared.match(/<Link/g) || []).length, 2);
  chk("the Oracle link is still NOT nested inside the destination link",
      shared.indexOf("data-connection-oracle") > shared.indexOf("</Link>"));
  chk("the basis legend is keyboard-operable (real buttons with aria-expanded)",
      /<button/.test(shared) && /aria-expanded=/.test(shared));
  chk("focus styles are present on the interactive elements", /focus-visible:outline/.test(shared));
  chk("neither header label is shrink-0 (the 390px clipping defect stays fixed)",
      !/shrink-0/.test(shared.slice(shared.indexOf("sm:items-start sm:justify-between"),
                                     shared.indexOf("</div>", shared.indexOf("sm:items-start sm:justify-between")))));

  chk("the nexus is rendered by /research", /<ResearchNexus/.test(nexusPage));
  chk("the nexus filter is keyboard-operable buttons with aria-pressed",
      /<button/.test(nexusCmp) && /aria-pressed=/.test(nexusCmp));
  chk("the nexus announces the filtered count", /aria-live="polite"/.test(nexusCmp));
  chk("the inspector shows what it connects, why, how well supported, and where next",
      /What it connects/i.test(nexusCmp) && /Why it connects/i.test(nexusCmp)
      && /How well it is supported/i.test(nexusCmp)
      && /Open the record/i.test(nexusCmp) && /Ask the Oracle about this/i.test(nexusCmp));

  /* ── batch 16b: selection is real, and the copy is visitor-facing ─────────── */
  chk("the visitor selects a relationship rather than reading a wall of cards",
      /\[data-nexus-relationship\]|data-nexus-relationship=/.test(nexusCmp)
      && /setSelected/.test(nexusCmp));
  chk("the selection opens an inspector",
      /data-nexus-inspector/.test(nexusCmp) && /data-nexus-basis/.test(nexusCmp));
  chk("the inspector lists the records behind the relationship",
      /data-nexus-records/.test(nexusCmp) && /the room it belongs to/.test(nexusCmp));
  chk("narrowing the room cannot leave an empty inspector",
      /shown\[0\] \?\? null|shown\.find\(/.test(nexusCmp));
  chk("up/down move between relationships",
      /ArrowDown/.test(nexusCmp) && /ArrowUp/.test(nexusCmp));
  {
    /* Visitor-facing language: no server/registry machinery on the page. */
    const pageCopy = nexusPage + nexusCmp;
    for (const jargon of ["server-resolved", "registry key", "exact-resolution",
                          "resolveResearchTopic", "research-v1:"]) {
      chk(`the nexus does not expose machinery language: ${jargon}`,
          !pageCopy.includes(jargon));
    }
    chk("the nexus still explains what a visitor can do",
        /what it links\s+to, why it is held/i.test(nexusPage));
  }
}

console.log("\n== L. the grounding names the ONLY permitted external references ==");
{
  /* The live journey found the Oracle attributing authors that were never supplied.
     The grounding now names its permitted references explicitly, so the model has a
     stated boundary to stay inside — asserted here on the actual prompt block. */
  const prompt = topics.researchPromptBlock(geo);
  chk("the prompt block names the permitted external references",
      /ONLY external references supplied/.test(prompt));
  for (const src of geo.sources) {
    chk(`the permitted list includes: ${src.label.slice(0, 34)}`, prompt.includes(src.label));
  }
  chk("the prompt block forbids attributing anything else",
      /Do not attribute any other author, title, work or page number/.test(prompt));
  const anchorPrompt = topics.researchPromptBlock(
    topics.resolveResearchTopic("research-v1:geometry/connection/artwork-tetra"));
  chk("a connection anchor's grounding carries the same boundary",
      /ONLY external references supplied/.test(anchorPrompt));
  chk("the anchor names the topic's references, not the anchor's own",
      anchorPrompt.includes(geo.sources[0].label));
}

console.log("\n== M. the batch stayed inside its lane ==");
{
  /* `three`, @react-three/fiber and @react-three/drei are PRE-EXISTING dependencies of
     this site. The honest check is not "no such word appears in package.json" — it is
     that THIS batch added no dependency at all, so the manifest is byte-identical to
     the released commit. */
  const { execFileSync } = require("node:child_process");
  const changed = execFileSync("git", ["-C", ROOT, "diff", "--name-only", "HEAD"],
    { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  chk("package.json is untouched, so no dependency was added or removed",
      !changed.includes("package.json") && !changed.includes("package-lock.json"),
      JSON.stringify(changed.filter((f) => /package/.test(f))));
  const shared = fs.readFileSync(path.join(ROOT, "src/components/research/ResearchConnections.tsx"), "utf8");
  const nexusCmp = fs.readFileSync(path.join(ROOT, "src/components/research/ResearchNexus.tsx"), "utf8");
  chk("no canvas/WebGL engine was introduced",
      !/<canvas|getContext\(|THREE\./i.test(shared + nexusCmp));
  chk("the nexus does no network fetching",
      !/fetch\(|axios|useSWR|react-query/.test(nexusCmp));
  chk("only React and Next are imported by the new surfaces",
      (shared + nexusCmp).split("\n")
        .filter((l) => /^import /.test(l))
        .every((l) => /next\/|react|@\/lib|\.\/basis-style/.test(l)));
}

console.log("");
console.log(`assertions passed: ${passed}`);
console.log(`assertions failed: ${failed}`);
if (failed) process.exit(1);
console.log("\nBATCH16_RESEARCH_NEXUS_TESTS_PASSED");
