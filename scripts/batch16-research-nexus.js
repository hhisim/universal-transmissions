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
/** Every registered connection across every room, counted from the map itself. */
const ALL_CONN = Object.values(connections.CONNECTIONS_BY_TOPIC).reduce((n, l) => n + l.length, 0);

chkeq("the four domains are offered as topics", topics.researchTopicSlugs().sort().join(","),
      "cymatics,geometry,linguistics,symbolism");

{
  const everyConn = Object.entries(connections.CONNECTIONS_BY_TOPIC).flatMap(([slug, list]) =>
    list.map((c) => ({ slug, c })));
  chkeq("the connection map covers every room", everyConn.length, ALL_CONN);
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
  // Linguistics and Symbolism WERE unregistered in Batch 16 and are registered now, so
  // they are no longer forged keys. A slug that is not in the registry still is.
  "research-v1:alchemy",
  "research-v1:research",
  "research-v1:sigils",
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
  /* Batch 17 registered the instrument room as a Cymatics connection, so the room now
     carries seven. The six released with it must still be present, in their original
     order, at the head of the list - the instrument is APPENDED, never interleaved. */
  const slugs = CYM.map((c) => c.anchorSlug);
  chkeq("the Cymatics room carries seven connections", CYM.length, expected.length + 1);
  chkeq("the six released anchors keep their order, with the instrument appended",
        slugs.join(","), expected.concat(["instrument-universal-resonator"]).join(","));
  chk("the instrument is registered as an Instrument, not folded into another kind",
      CYM[CYM.length - 1].kind === "Instrument", CYM[CYM.length - 1].kind);
  const fourier = topics.resolveResearchTopic("research-v1:cymatics/connection/codex-frequency-lattice");
  chk("the released Codex anchor still carries its destination note",
      !!fourier && /front page/.test(fourier.summary) && /FREQUENCY/.test(fourier.summary));
  chk("the released anchor still carries the topic's own sources",
      !!fourier && fourier.sources.length === CYM.length - CYM.length + 4);
}

console.log("\n== D. Geometry names its four streams, and keeps its facts ==");
{
  const s = geo.summary;
  /* RE-SCOPED to the owner's explicit change of direction. The room no longer sorts its
     statements into epistemic registers, so the old guard would fail against a correct
     build. What it guards now is what still has to be true: all four STREAMS are named,
     the mathematical and historical substance survives intact, and the room does NOT
     carry a disclaimer or a ranking instruction. The negative half is the new
     protection - it fails if the old framing is ever reintroduced. */
  for (const [label, needle] of [
    ["the forms themselves", "THE FORMS THEMSELVES"],
    ["what the classical texts record", "WHAT THE CLASSICAL TEXTS RECORD"],
    ["what traditions read into the forms", "WHAT TRADITIONS READ INTO THE FORMS"],
    ["what this room explores", "WHAT THIS ROOM EXPLORES"],
  ]) chk(`the summary names ${label}`, s.includes(needle));
  chk("it states the five-solids result as a proof, not a preference",
      /EXACTLY FIVE/.test(s) && /proved/i.test(s));
  chk("it names the golden ratio as the root of x^2 = x + 1", /x\^2 = x \+ 1/.test(s));
  chk("sacred geometry is presented as a living practice, not a correction",
      /living practice/i.test(s));
  chk("the geometry-cymatics link is a shared inquiry, not a disavowal",
      /parallel inquiry/i.test(s));
  chk("the room no longer carries an \"IMPORTANT LIMITS\" disclaimer block",
      !/IMPORTANT LIMITS/.test(s));
  chk("the room no longer tells the reader to rank statements by evidence",
      !/Do not present a UT reading/.test(s) && !/resemblance[\s\S]{0,120}shared mechanism/i.test(s));
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
  chkeq("every registered connection is exposed", all.length, ALL_CONN);
  chkeq("they span every room that has connections",
        new Set(all.map((r) => r.topicSlug)).size,
        Object.values(connections.CONNECTIONS_BY_TOPIC).filter((l) => l.length).length);
  chk("every exposed anchorId resolves", all.every((r) => !!topics.resolveResearchTopic(r.anchorId)));
  chk("every exposed anchorId is room-scoped",
      all.every((r) => r.anchorId.includes(`${r.topicSlug}/connection/`)));
}

console.log("\n== J. incomplete domains are described honestly ==");
{
  chkeq("four domains are presented", topics.RESEARCH_DOMAINS.length, 4);
  const registered = topics.RESEARCH_DOMAINS.filter((d) => d.registered);
  const reading = topics.RESEARCH_DOMAINS.filter((d) => !d.registered);
  // Batch 20 completed the last two domains, so the honest current state is that ALL
  // four are rooms. The reading-page branch below is kept: it is what re-checks the
  // claim if a domain is ever reverted, and it must never be deleted to make a run pass.
  chkeq("all four are registered rooms", registered.length, 4);
  chkeq("no domain is left as a reading page", reading.length, 0);
  chkeq("the registered set", registered.map((d) => d.slug).sort().join(","),
        "cymatics,geometry,linguistics,symbolism");
  for (const d of reading) {
    chk(`${d.slug} is described as a reading page, not a room`,
        /reading page/i.test(d.standing) && /not yet a room/i.test(d.standing));
    chk(`${d.slug} is NOT registered in the registry`, !topics.isRegisteredRoom(d.slug));
    chk(`${d.slug} has no connection registry entry`,
        !connections.CONNECTIONS_BY_TOPIC[d.slug] && !connections.GAPS_BY_TOPIC[d.slug]);
  }
  for (const d of registered) {
    chk(`${d.slug} is registered`, topics.isRegisteredRoom(d.slug));
    chk(`${d.slug} standing says it is a research room`, /research room/i.test(d.standing));
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

console.log("\n== L. the grounding carries the room's facts and its references' scope ==");
{
  const prompt = topics.researchPromptBlock(geo);
  chk("the room prompt block names the permitted external references",
      /The external references supplied with this context are/.test(prompt));
  for (const src of geo.sources) {
    chk(`the permitted list includes: ${src.label.slice(0, 34)}`, prompt.includes(src.label));
  }
  chk("the room prompt block forbids attributing anything else",
      /Attribute no other author, title, work or page number/.test(prompt));
  /* The owner's direction, guarded so it cannot silently regress. */
  chk("the room prompt block tells the Oracle not to debunk or qualify the work",
      /Do not debunk it, do not qualify it/.test(prompt));
  chk("the room prompt block tells the Oracle not to sort the material by evidence",
      /sort the material into scientific and artistic piles/.test(prompt));

  const anchor = topics.resolveResearchTopic("research-v1:geometry/connection/artwork-tetra");
  const anchorPrompt = topics.researchPromptBlock(anchor);

  /* The completed contract: a selected connection is answered with the ROOM's own
     material, not just the connection's blurb. */
  chk("the anchor's grounding carries the room's registers",
      /WHAT THE GEOMETRY ROOM HOLDS/.test(anchorPrompt)
      && anchorPrompt.includes(geo.summary));
  chk("the room's mathematical result travels with the anchor", /EXACTLY FIVE/.test(anchorPrompt));
  chk("the room's substantive account of the forms travels with the anchor",
      /five convex regular polyhedra|EXACTLY FIVE/.test(anchorPrompt));

  /* Each reference arrives with the catalogue's own statement of what it supports. */
  for (const src of geo.sources) {
    chk(`the anchor lists the reference: ${src.label.slice(0, 30)}`,
        anchorPrompt.includes(src.label));
    chk(`the anchor carries that reference's SUPPORTS description: ${src.label.slice(0, 26)}`,
        anchorPrompt.includes(src.supports));
  }
  /* RE-SCOPED: the old guard required the "scope, not contents" disclaimer. The
     references are still grounded as works the archive holds - asserted positively -
     and the new instruction not to fence them off is asserted alongside it. */
  chk("the anchor grounds the references as works this archive holds",
      /works this archive holds and reads/.test(anchorPrompt));
  chk("the anchor does not append a disclaimer to the archive's own naming",
      !/no evidence|not supported by the experimental literature/i.test(anchorPrompt));
  chk("the anchor forbids attributing anything not listed",
      /Attribute no other author, title, work or page number/.test(anchorPrompt));
  chk("the anchor tells the Oracle to engage the work rather than correct it",
      /Engage deeply with the selected work/.test(anchorPrompt));
  chk("the anchor still carries its own basis, not only the room's",
      /How strongly it is supported/.test(anchorPrompt));
}

console.log("\n== L2. every anchor's grounding still fits the composed-message budget ==");
{
  /* The route REFUSES (413) rather than truncating when the composed message would
     exceed MAX_GRINDED_CHARS, so grounding + a maximum-length question MUST fit for
     every registered anchor. Carrying the room facts made this budget real: it was
     raised once, and this assertion is what stops it silently regressing. */
  const conv = require(path.join(ROOT, "src/lib/oracle-conversation.ts"));
  const LIMIT = conv.MAX_GRINDED_CHARS;
  const QMAX = conv.MAX_QUESTION_CHARS;
  const anchors = topics.allRegisteredConnections();
  chk("the budget is large enough to be worth asserting", LIMIT > QMAX, `${LIMIT} vs ${QMAX}`);
  let worst = 0;
  let worstId = "";
  for (const a of [...anchors.map((r) => r.anchorId), ...topics.researchTopicSlugs().map(topics.researchTopicId)]) {
    const block = topics.researchPromptBlock(topics.resolveResearchTopic(a));
    const total = block.length + QMAX;
    if (total > worst) { worst = total; worstId = a; }
    chk(`fits the budget: ${a}`, total <= LIMIT, `${total} > ${LIMIT}`);
  }
  console.log(`  (worst case: ${worstId} at ${worst} of ${LIMIT}, headroom ${LIMIT - worst})`);
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
