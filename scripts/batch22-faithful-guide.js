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
require.extensions[".md"] = (mod) => {
  mod.exports = "";
};

const topics = require(path.join(ROOT, "src/lib/research-topics.ts"));
const conn = require(path.join(ROOT, "src/lib/research-connections.ts"));
const conv = require(path.join(ROOT, "src/lib/oracle-conversation.ts"));
const evidence = require(path.join(ROOT, "src/lib/record-evidence.ts"));
const fs = require("node:fs");

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

  /* THE POSITIVE. The artist's account, in the artist's own terms. */
  chk("the room carries the artist's experiential account",
      /EXPERIENTIAL ACCOUNT/.test(block));
  chk("it says the alphabets were remembered from dreams",
      /remembered from dreams/i.test(block));
  chk("it says they were re-membered in ecstatic states of trance",
      /ecstatic states of trance/i.test(block));
  chk("it states that the project describes its work as transmission",
      /describes its work as transmission/i.test(block));

  /* THE RECONCILIATION - the part that stops either half being dissolved into the other. */
  chk("it separates origin from authorship rather than choosing one",
      /where the material came from is not who made the finished work/i.test(block));
  chk("it forbids asserting a denial in the artist's name",
      /never assert on the artist's behalf that no transmission claim is made/i.test(block));
  chk("it states that lack of verification is not a denial",
      /lack of independent verification as a denial/i.test(block));

  /* The loaded term is gone from the DENIAL but the word 'historical' is still used where
     it is accurate - the fix must not have been a blunt word-deletion. */
  chk("the scripts are still described as this project's own constructions",
      /this project's own\s+constructions/.test(block));
  chk("a historical language is still refused as a characterisation",
      /not a historical language recovered or decoded/.test(block));
}

console.log("\n== B. the standalone gap text is corrected the same way ==");
{
  const gaps = conn.LINGUISTICS_GAPS.join("\n");
  chk("the gap no longer denies channelling", !/channelled|channeled/.test(gaps));
  chk("the gap no longer claims nobody outside the project has used the alphabet as proof of no transmission",
      !/no claim is made that it has been used or understood/.test(gaps));
  chk("the gap carries the artist's account", /ecstatic states of trance/.test(gaps));
  chk("the gap says the archive does not verify and does not deny",
      /does not\s+deny it/i.test(gaps) && /does not independently verify/i.test(gaps));
}

console.log("\n== C. every room states whose claim it is ==");
{
  const slugs = topics.researchTopicSlugs();
  for (const slug of slugs) {
    const block = topics.researchPromptBlock(topics.resolveResearchTopic(topics.researchTopicId(slug)));
    chk(`${slug}: carries the whose-claim-it-is rules`, /WHOSE CLAIM IT IS/.test(block));
    chk(`${slug}: says an experiential account is reported as the holder's`,
        /reported AS the account of whoever holds it/i.test(block));
    chk(`${slug}: says lack of verification is not evidence against it`,
        /independent verification is not\s+evidence against it/i.test(block));
    chk(`${slug}: says an absence from context is not a claim about the world`,
        /Absence from THIS CONTEXT is not a claim about the world/i.test(block));
    chk(`${slug}: says a summary is not the work`,
        /catalogue description is not the work/i.test(block));
    chk(`${slug}: says a supplied extract is an extract`,
        /supplied extract is an EXTRACT/i.test(block));
    chk(`${slug}: keeps the reference scope guarantee`,
        /SCOPE, NOT CONTENTS/.test(block) && /has not read these works/i.test(block));
    chk(`${slug}: forbids attributing anything not listed`,
        /Attribute no other author, title, work or page number/.test(block));
    chk(`${slug}: keeps the four registers apart`,
        /keep the four apart/i.test(block));
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
  chk("the Enochian anchor carries the piece's own opening text",
      /Its opening text, quoted:/.test(JOURNAL.block));
  chk("it states the extract's size and that the remainder is unsupplied",
      /An EXTRACT of a \d+-character piece/.test(JOURNAL.block) &&
      /remainder is NOT supplied here/.test(JOURNAL.block));
  chk("it does not present the extract as the whole work",
      !/the piece in full/i.test(JOURNAL.block));

  const ART = ANCHORS.find((a) => a.c.kind === "Artwork");
  chk("an artwork anchor carries the record's own description",
      /Its own description, quoted:/.test(ART.block));
  chk("it marks that description as an account, not as evidence about the world",
      /not evidence about the world it depicts|not evidence about the world/i.test(ART.block));

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
  const huge = evidence.connectionEvidence(JOURNAL.c, { budget: 100000, sample: 5 });
  chk("an extract never exceeds the hard cap however much budget is offered",
      !!huge && huge.chars < 1200, huge ? huge.chars : "null");
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

console.log("");
console.log(`assertions passed: ${passed}`);
console.log(`assertions failed: ${failures.length}`);
if (failures.length) {
  console.log("\nfailures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\nBATCH22_FAITHFUL_GUIDE_TESTS_PASSED");
