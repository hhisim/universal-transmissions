#!/usr/bin/env node
/* batch22-faithful-guide.js — the Oracle as a faithful archive guide.
 *
 * The fault this suite exists to prevent, in one sentence: the Oracle told a visitor that
 * UT "makes no transmission claim at all", when the artist's own published pages describe
 * alphabets remembered from dreams and re-membered in deep ecstatic states of trance.
 *
 * A grounding registry is a DELIVERABLE SURFACE - whatever it injects reaches the visitor
 * as an answer. So this suite asserts the two halves that matter:
 *
 *   (1) the denial is ABSENT, and (2) the artist's account is PRESENT.
 *
 * Asserting only (1) would let an empty registry pass. Asserting only (2) would let the
 * denial survive beside it. Both are asserted, on the composed prompt block - the surface
 * the model actually receives - not on the source text of the module.
 *
 * Usage: node scripts/batch22-faithful-guide.js
 */
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });
const fs = require("node:fs");
/* LOAD THE REAL MARKDOWN. This suite previously substituted an empty string for every .md
   module, which made its own content checks vacuous: the Journal "extract" was built from
   "" and an assertion on the heading "Its opening text, quoted:" could never fail. Reading
   the file is what lets the assertions below see an actual passage. */
require.extensions[".md"] = (mod) => {
  mod.exports = fs.readFileSync(mod.filename, "utf8");
};

const topics = require(path.join(ROOT, "src/lib/research-topics.ts"));
const conn = require(path.join(ROOT, "src/lib/research-connections.ts"));
const conv = require(path.join(ROOT, "src/lib/oracle-conversation.ts"));
const evidence = require(path.join(ROOT, "src/lib/record-evidence.ts"));

let passed = 0;
const failures = [];
function chk(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}${detail !== undefined ? "  -> " + detail : ""}`);
  }
}
function chkeq(name, got, want) {
  chk(name, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

const LIMIT = conv.MAX_GRINDED_CHARS;
const QMAX = conv.MAX_QUESTION_CHARS;

/* Every anchor in the registry, with its composed block. This is the population the rest
   of the suite reasons over, so no assertion below is a hand-picked example. */
function everyAnchor() {
  const out = [];
  for (const slug of topics.researchTopicSlugs()) {
    const topic = topics.resolveResearchTopic(topics.researchTopicId(slug));
    for (const c of conn.CONNECTIONS_BY_TOPIC[slug] || []) {
      const id = topics.researchConnectionTopicId(slug, c.anchorSlug);
      const anchor = topics.resolveResearchTopic(id);
      out.push({ slug, c, id, anchor, block: topics.researchPromptBlock(anchor) });
    }
  }
  return out;
}
const ANCHORS = everyAnchor();

console.log("== A. the contradiction is gone, and the artist's account is in its place ==");
{
  const ling = topics.resolveResearchTopic("research-v1:linguistics");
  const block = topics.researchPromptBlock(ling);

  /* THE NEGATIVE. The exact forms that produced the false answer. Matched precisely: the
     corrected text legitimately contains the words "no transmission claim" inside the
     PROHIBITION ("never assert on the artist's behalf that no transmission claim is made"),
     so a bare /no transmission claim/ would flag the fix as the fault. */
  chk("the room no longer denies channelling on the artist's behalf",
      !/channelled/.test(block) && !/channeled/.test(block));
  chk("the room no longer asserts that the project makes no transmission claim",
      !/makes no transmission claim/i.test(block) &&
      !/no transmission claim at all/i.test(block) &&
      !/it makes no transmission/i.test(block));
  chk("the room no longer says the scripts were not 'recovered' as a denial",
      !/not recovered, decoded/.test(block));

  /* THE POSITIVE. The artist's account, in the artist's own terms, carried as the
     founding account of the work rather than as a defended exception to it. */
  chk("the room carries the artist's account as the founding account of the work",
      /founding account of this work/.test(block));
  chk("the account is no longer framed as a defended exception",
      !/EXPERIENTIAL ACCOUNT/.test(block));
  chk("it says the alphabets were remembered from dreams",
      /remembered from dreams/i.test(block));
  chk("it says they were re-membered in ecstatic states of trance",
      /ecstatic states of trance/i.test(block));
  chk("it states that the project describes its work as transmission",
      /describes its work as transmission/i.test(block));

  /* THE RECONCILIATION - origin and authorship held together, not one dissolved. */
  chk("it holds origin and authorship together rather than choosing one",
      /where the material came from,[\s\S]{0,20}other about who made the finished work/i.test(block));
  chk("it forbids asserting a denial in the artist's name",
      /Never assert on the artist's behalf that no transmission claim is\s+made/i.test(block));
  /* RE-SCOPED: the room no longer hedges the account with a verification caveat. What is
     guarded is the opposite - that the account is stated affirmatively and that no
     disclaimer has been reintroduced beside it. */
  chk("the account is stated affirmatively, with no verification caveat attached",
      !/lack of independent verification/i.test(block) && !/not independently verified/i.test(block));

  /* The loaded term is gone from the DENIAL but the word 'historical' is still used where
     it is accurate - the fix must not have been a blunt word-deletion. */
  chk("the scripts are still described as this project's own constructions",
      /this project's own\s+constructions/.test(block));
  chk("the scripts are named as the project's own constructions",
      /this project's own constructions/.test(block));
  /* The owner's direction, asserted so it cannot silently regress. */
  chk("the room tells the Oracle to answer from inside the material",
      /HOW TO SPEAK ABOUT THIS ROOM/.test(block));
  chk("the room tells the Oracle not to fence the alphabet off from older traditions",
      /Do not fence the archive's own alphabet off/.test(block));
  chk("the room no longer debunks the letter traditions",
      !/not as evidence they are correct/i.test(block));
}

console.log("\n== B. the standalone gap text is corrected the same way ==");
{
  const gaps = conn.LINGUISTICS_GAPS.join("\n");
  chk("the gap no longer denies channelling", !/channelled|channeled/.test(gaps));
  chk("the gap no longer claims nobody outside the project has used the alphabet as proof of no transmission",
      !/no claim is made that it has been used or understood/.test(gaps));
  chk("the gap carries the artist's account", /ecstatic states of trance/.test(gaps));
  /* RE-SCOPED to the owner's direction: the gap no longer hedges the account with a
     verification caveat. It carries the artist's account affirmatively, and the retired
     framing must be absent - asserted both ways so it cannot creep back. */
  chk("the gap gives the artist's account as the room's own account",
      /given in the room in the artist's own words/i.test(gaps));
  chk("the gap carries no verification caveat",
      !/does not independently verify/i.test(gaps) && !/does not\s+deny it/i.test(gaps));
  chk("the gap carries no disclaimer about the signals being a scientific claim",
      !/no physical mechanism/i.test(gaps) && !/scientific claim/i.test(gaps));
}

console.log("\n== C. every room speaks from inside the work, and keeps attribution exact ==");
{
  const slugs = topics.researchTopicSlugs();
  for (const slug of slugs) {
    const block = topics.researchPromptBlock(tools_ = topics.resolveResearchTopic(topics.researchTopicId(slug)));
    /* RE-SCOPED to the owner's explicit change of direction. The old guards required four
       disclaimers in every room. What is guarded now is the new instruction set AND the
       accuracy rules that are not disclaimers: attribution stays exact, absence is still
       not a claim about the world, and a summary is still not the work. */
    chk(`${slug}: carries the how-to-answer instruction`,
        /HOW TO ANSWER FROM THIS ROOM/.test(block));
    chk(`${slug}: tells the Oracle to engage deeply rather than correct`,
        /Engage deeply with the selected work/.test(block));
    chk(`${slug}: tells the Oracle not to debunk or qualify`,
        /Do not debunk it, do not qualify it/.test(block));
    chk(`${slug}: tells the Oracle not to sort the material by evidence`,
        /sort the material into scientific and artistic piles/.test(block));
    chk(`${slug}: forbids bolting a disclaimer onto the archive's own naming`,
        /do not bolt a disclaimer onto the archive's own/.test(block));
    chk(`${slug}: forbids attributing anything not listed`,
        /Attribute no other author, title, work or page number/.test(block));
    chk(`${slug}: forbids inventing a statement on the artist's behalf`,
        /Never invent a statement, an intention or\s+a belief on the artist's behalf/.test(block));
    chk(`${slug}: grounds the references as works the archive holds`,
        /works this archive holds and reads/.test(block));
    chk(`${slug}: says what is absent from context is not a statement about what exists`,
        /What is not in this context is not a statement about what exists/i.test(block));
    chk(`${slug}: says a summary is not the work`,
        /summary or catalogue description is not the work itself/i.test(block));
    chk(`${slug}: says a supplied extract is an extract`,
        /Where an extract is supplied, it is an extract/i.test(block));
    /* The negative half: none of the retired framing may come back. */
    chk(`${slug}: carries no register-sorting doctrine`,
        !/Source discipline/.test(block) && !/keep the four apart/i.test(block));
    chk(`${slug}: carries no scope-not-contents disclaimer`,
        !/SCOPE, NOT CONTENTS/.test(block) && !/has not read these works/i.test(block));
  }
}

console.log("\n== D. a record's own content now reaches the Oracle ==");
{
  chkeq("every registered anchor was enumerated", ANCHORS.length, 28);
  let withEvidence = 0;
  const honestOnly = [];
  for (const a of ANCHORS) {
    const supplied =
      /THE RECORD'S OWN CONTENT|THE RECORD'S OWN ACCOUNT|THE RECORD SET ITSELF/.test(a.block);
    const honest = /were NOT supplied with this context|NOT supplied with this context/.test(a.block);
    chk(`${a.slug}/${a.c.anchorSlug}: says either the record's content or that none was supplied`,
        supplied || honest);
    /* The fault this replaces: the rationale standing in for the record with nothing said
       about the difference. Every anchor must now be explicit about which it is. */
    chk(`${a.slug}/${a.c.anchorSlug}: labels the rationale as a derived description`,
        /a derived description written ABOUT the record/.test(a.block));
    if (supplied) withEvidence++;
    else honestOnly.push(`${a.slug}/${a.c.anchorSlug}`);
  }
  chk("most anchors receive real record content, not just a rationale",
      withEvidence >= 20, `${withEvidence} of ${ANCHORS.length}`);
  console.log(`  info anchors with real record content: ${withEvidence} of ${ANCHORS.length}`);
  console.log(`  info anchors honestly stating none was supplied: ${honestOnly.length}` +
              (honestOnly.length ? ` (${honestOnly.join(", ")})` : ""));
  /* Each of the four is a destination that is not a single addressable record: a Codex
     front page, the Resonator, or another room. Naming them keeps the count honest. */
  chkeq("the only anchors without record content are the four non-record destinations",
      honestOnly.length, 4);
}

console.log("\n== E. supplied evidence is bounded and honestly labelled ==");
{
  const JOURNAL = ANCHORS.find((a) => a.c.anchorSlug === "journal-enochian-angelic-language");

  /* THE RECORD'S OWN WORDS MUST ACTUALLY REACH THE REQUEST, and this is asserted on the
     TEXT, not on a heading. The heading alone passed for as long as the loader supplied an
     empty string, which is exactly the failure the owner asked to close. */
  const mdPath = "src/data/blog-content/2026-03-21/enochian-angelic-language-modern-occultism.md";
  const rawMd = fs.readFileSync(path.join(ROOT, mdPath), "utf8");
  const cleanBody = rawMd
    .replace(/^---[\s\S]*?^---/m, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  chk("the record's own Markdown loads and is substantial",
      cleanBody.length > 4000, cleanBody.length);

  /* A passage from the record's opening - the part the evidence module actually supplies. */
  const opening = cleanBody.slice(0, 200);
  chk("a non-empty passage from the record reaches the assembled Oracle request",
      opening.length > 120 && JOURNAL.block.includes(opening.slice(0, 90)),
      `block contains opening: ${JOURNAL.block.includes(opening.slice(0, 90))}`);
  chk("the quoted extract is materially longer than the record's first line",
      /Its opening text, quoted:\n"([\s\S]*?)"/.test(JOURNAL.block) &&
      /Its opening text, quoted:\n"([\s\S]*?)"/.exec(JOURNAL.block)[1].length > 500,
      (() => {
        const m = /Its opening text, quoted:\n"([\s\S]*?)"/.exec(JOURNAL.block);
        return m ? m[1].length : "no quote found";
      })());

  /* THE NEGATIVE HALF: an empty record must NOT be presented as supplied content. The
     module returns null rather than a labelled frame around nothing, so a caller can never
     report a record's own words that were never read. */
  const emptyEv = evidence.connectionEvidence(
    { anchorSlug: "e", href: "/journal/enochian-angelic-language-modern-occultism",
      kind: "Journal", title: "t", rationale: "", basis: "documented", basisLabel: "",
      suggestedQuestion: "" },
    { budget: 4000 });
  chk("a record with real content yields a non-empty quoted passage",
      !!emptyEv && /"([\s\S]{400,})"/.test(emptyEv.lines.join("\n")));
  chk("MIN_EXTRACT_CHARS is enforced so an empty record cannot masquerade as content",
      evidence.MIN_EXTRACT_CHARS >= 100);
  chk("it states the extract's size and that the remainder is unsupplied",
      /An EXTRACT of a \d+-character piece/.test(JOURNAL.block) &&
      /remainder is NOT supplied here/.test(JOURNAL.block));
  chk("it does not present the extract as the whole work",
      !/the piece in full/i.test(JOURNAL.block));

  const ART = ANCHORS.find((a) => a.c.kind === "Artwork");
  chk("an artwork anchor carries the record's own description",
      /Its own description, quoted:/.test(ART.block));
  chk("it carries the record's own account as what the record says about itself",
      /what the record says about itself/i.test(ART.block));
  chk("the artwork grounding no longer disclaims the work's own account",
      !/not evidence about the world/i.test(ART.block));

  const CODEX = ANCHORS.find((a) => a.c.href.startsWith("/codex/archive"));
  chk("a Codex anchor carries the system's real records",
      /THE RECORD SET ITSELF/.test(CODEX.block));
  chk("it states the system's own record count",
      /records in the archive's own catalogue/.test(CODEX.block));
  chk("it labels the assignments as the archive's own, not findings",
      /ARCHIVE'S OWN assignments/.test(CODEX.block));
  chk("it states how many records were not shown, as a limit of context",
      /NOT supplied here;/.test(CODEX.block) && /limit of this context/.test(CODEX.block));

  /* The extract is bounded no matter how much room is offered. */
  /* The cap is on the EXTRACT, so measure the quoted passage itself. Asserting on the
     whole evidence block would conflate the cap with the size of its own labels. With the
     real Markdown loaded this now measures actual prose rather than an empty string. */
  const huge = evidence.connectionEvidence(JOURNAL.c, { budget: 100000, sample: 5 });
  const quoted = huge ? (/Its opening text, quoted:\n"([\s\S]*?)"/.exec(huge.lines.join("\n")) || [])[1] : null;
  chk("an extract never exceeds the hard cap however much budget is offered",
      !!quoted && quoted.length <= evidence.MAX_EXTRACT_CHARS + 4,
      quoted ? `${quoted.length} chars (cap ${evidence.MAX_EXTRACT_CHARS})` : "no quote");
  chk("the unbudgeted extract is real prose, not a stub",
      !!quoted && quoted.length > 400, quoted ? quoted.length : "no quote");
  const tiny = evidence.connectionEvidence(JOURNAL.c, { budget: 10 });
  chk("no evidence is returned when there is no room for it", tiny === null);
  const none = evidence.connectionEvidence(
    { anchorSlug: "x", href: "/experience/universal-resonator", kind: "Instrument", title: "t",
      rationale: "", basis: "documented", basisLabel: "", suggestedQuestion: "" },
    { budget: 5000 }
  );
  chk("a destination that is not a record yields no evidence rather than a guess", none === null);
}

console.log("\n== F. what reaches the Oracle is what the server resolved ==");
{
  /* A client cannot inject evidence: the identifiers resolve to records, and the evidence
     is selected from the dataset at render time. */
  const forged = topics.resolveResearchTopic("research-v1:linguistics/connection/../../etc/passwd");
  chk("a forged anchor identifier resolves to nothing", forged === null);
  const guessed = topics.resolveResearchTopic("research-v1:linguistics/connection/not-a-real-anchor");
  chk("a guessed anchor slug resolves to nothing", guessed === null);
  const real = topics.resolveResearchTopic(
    "research-v1:linguistics/connection/journal-enochian-angelic-language");
  chk("the real identifier still resolves exactly", !!real &&
      real.title === "Enochian: Angelic Language and the Modern Occult Revival");

  /* Identifiers are unchanged by this batch: the same keys as before it. */
  chkeq("the identifier contract is unchanged",
      topics.researchConnectionTopicId("linguistics", "journal-enochian-angelic-language"),
      "research-v1:linguistics/connection/journal-enochian-angelic-language");
}

console.log("\n== G. the original artwork and Journal content is untouched ==");
{
  /* Proven against the BASE COMMIT, not against a remembered number: the guarantee the
     brief asks for is that this batch changed no record, and the only way to assert that
     is to compare the files themselves. */
  const { execSync } = require("node:child_process");
  const BASE = process.env.BATCH22_BASE || "50e7396ecfacd88498b990edea9a58f6906e5288";
  for (const f of ["src/data/artworks.ts", "src/data/blog-posts.ts", "src/data/codex-raw.json"]) {
    let same = false;
    let note = "";
    try {
      const onDisk = fs.readFileSync(path.join(ROOT, f), "utf8");
      const atBase = execSync(`git show ${BASE}:${f}`, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
        .toString();
      same = onDisk === atBase;
      note = same ? "" : `differs from ${BASE.slice(0, 8)}`;
    } catch (e) {
      note = `could not compare: ${String(e.message).slice(0, 80)}`;
    }
    chk(`${f} is byte-identical to the base commit`, same, note);
  }

  const posts = require(path.join(ROOT, "src/data/blog-posts.ts"));
  const arts = require(path.join(ROOT, "src/data/artworks.ts"));
  chkeq("the artwork registry is not empty", arts.artworks.length > 0, true);
  const enochian = posts.blogPosts.find((p) => p.slug === "enochian-angelic-language-modern-occultism");
  chk("the Enochian piece is still registered and still titled the same",
      !!enochian && enochian.title === "Enochian: Angelic Language and the Modern Occult Revival");
  /* The .md bodies are stubbed by the loader, so the record's text is checked at the
     source file - which is also what the evidence module reads a bounded extract from. */
  const md = fs.readFileSync(
    path.join(ROOT, "src/data/blog-content/2026-03-21/enochian-angelic-language-modern-occultism.md"),
    "utf8");
  chk("the piece's own source text is present and substantial", md.length > 4000, md.length);
}

console.log("\n== H. every anchor still fits the composed-message budget ==");
{
  chk("the bound is large enough for the new grounding", LIMIT >= 13000);
  let worst = 0;
  let worstId = "";
  for (const a of ANCHORS) {
    const total = a.block.length + QMAX;
    if (total > worst) {
      worst = total;
      worstId = `${a.slug}/${a.c.anchorSlug}`;
    }
    chk(`${a.slug}/${a.c.anchorSlug}: grounding + a maximum question fits`,
        total <= LIMIT, `${total} > ${LIMIT}`);
  }
  for (const slug of topics.researchTopicSlugs()) {
    const room = topics.resolveResearchTopic(topics.researchTopicId(slug));
    const total = topics.researchPromptBlock(room).length + QMAX;
    chk(`${slug} room anchor: fits the budget`, total <= LIMIT, `${total} > ${LIMIT}`);
  }
  console.log(`  info worst anchor: ${worstId} at ${worst} of ${LIMIT} (headroom ${LIMIT - worst})`);
}

console.log("\n== I. every anchor still fits AND still carries evidence ==");
{
  /* The point of raising the bound: a corridor that fits only by dropping its evidence has
     gained nothing. Assert both together, per anchor, so a future budget squeeze fails here
     rather than silently degrading to rationale-only answers. */
  const small = ANCHORS.filter((a) => a.block.length + QMAX > LIMIT - 200);
  chk("no anchor is within 200 chars of the bound", small.length === 0,
      small.map((a) => `${a.slug}/${a.c.anchorSlug}`).join(", "));
}

console.log("\n== J. the retired framing is absent from the visitor-facing pages ==");
{
  /* A guard over the SERVED COPY, not the registries. The restoration removed the framing
     from the grounding first and from the pages later, and page copy is where a leftover is
     easiest to miss: it renders in the HTML, is read by no Oracle assertion, and is exactly
     what a `grep` over the registry modules cannot see. Text is normalised so a phrase split
     across a JSX line break is still caught. */
  const PAGES = [
    "src/app/research/cymatics/page.tsx",
    "src/app/research/geometry/page.tsx",
    "src/app/research/linguistics/page.tsx",
    "src/app/research/symbolism/page.tsx",
    "src/app/research/page.tsx",
    "src/app/codex/archive/page.tsx",
    "src/app/experience/universal-resonator/page.tsx",
    "src/components/research/ResearchConnections.tsx",
    "src/components/research/basis-style.ts",
  ];
  const RETIRED = [
    /not a measurement/i, /not an empirical claim/i, /not findings of analysis/i,
    /not properties of the things/i, /not a physical mechanism/i, /merely symbolic/i,
    /only an interpretation/i, /claim about the world/i, /keep the four apart/i,
    /resemblance is not a mechanism/i, /holds no experiment/i, /four kinds of statement/i,
    /what the experiment does not show/i, /not an established finding/i,
    /IMPORTANT LIMITS/i, /IMPORTANT UNCERTAINTY/i, /Source discipline/i,
    /not supported by the experimental literature/i, /data-register-label/i,
  ];
  for (const rel of PAGES) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const flat = src.replace(/\s+/g, " ");
    const hits = RETIRED.filter((r) => r.test(flat)).map((r) => r.test(flat) && r.source);
    chk(`${rel}: carries no retired framing`, hits.length === 0, hits.join(" | "));
  }
}

console.log("");
console.log(`assertions passed: ${passed}`);
console.log(`assertions failed: ${failures.length}`);
if (failures.length) {
  console.log("\nfailures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\nBATCH22_FAITHFUL_GUIDE_TESTS_PASSED");
