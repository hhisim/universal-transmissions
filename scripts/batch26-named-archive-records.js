#!/usr/bin/env node
/**
 * batch26-named-archive-records.js
 *
 * THE ORACLE OPENS THE RECORD THE VISITOR NAMES — beyond correspondence entries.
 *
 * A visitor who names a Journal piece or an artwork names a record the archive already
 * holds, with its own canonical route and its own text. Until now only correspondence
 * entries could be reached by name, so naming "The Star and the Uncarved Block" reached
 * the provider with no record at all — and a title containing a correspondence word
 * ("The Heart on the Scale") attached the WORD instead of the record.
 *
 * These checks are deterministic and go through the REAL exported POST handlers, so the
 * composed provider message is what is measured — not a restatement of the resolver.
 * The matched preview conversation is run separately and reported as such.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
/* The markdown sources are read as themselves here, not stubbed: this suite asserts that
   the record's OWN TEXT reaches the provider, which cannot be checked against a stub. */
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = fs.readFileSync(m.filename, "utf8"); };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

let pass = 0, fail = 0;
const failures = [];
const ok = (c, m) => { if (c) { pass += 1; console.log("    ok   " + m); } else { fail += 1; failures.push(m); console.log("    FAIL " + m); } };

let capped = [];
globalThis.fetch = async (u, i) => {
  capped.push(i && i.body ? String(i.body) : "");
  return new Response(JSON.stringify({ response: "M", retrieval_status: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } });
};
const call = async (body) => {
  capped = [];
  const r = await require(path.join(ROOT, "src/app/api/oracle/route.ts")).POST(
    new Request("https://ut.test/api/oracle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  );
  const json = await r.json().catch(() => ({}));
  const sent = capped.length ? JSON.parse(capped[capped.length - 1]) : {};
  return { http: r.status, msg: sent.message || "", json, ids: ((json.namedRecords || {}).ids) || [] };
};
const H = (t) => t.map((x, i) => ({ role: i % 2 ? "assistant" : "user", content: x }));

const { resolveNamedRecords } = require(path.join(ROOT, "src/lib/named-record-resolver.ts"));
const { archiveRecordsByTitle } = require(path.join(ROOT, "src/lib/record-evidence.ts"));
const { artworks } = require(path.join(ROOT, "src/data/artworks.ts"));
const { blogPosts } = require(path.join(ROOT, "src/data/blog-posts.ts"));
const { MAX_GRINDED_CHARS } = require(path.join(ROOT, "src/lib/oracle-conversation.ts"));

const STAR = "The Star and the Uncarved Block";
const STAR_ID = "journal:the-star-and-the-uncarved-block";
const STAR_HREF = "/journal/the-star-and-the-uncarved-block";
const TL = "Translinguistic Equation";
const TL_ID = "artwork:translinguistic-equation";
const TL_HREF = "/gallery/translinguistic-equation";
const PRECEDENCE_TITLE = "The Heart on the Scale: How the Egyptian Book of the Dead Makes a Self Legible";
const PRECEDENCE_ID = "journal:egyptian-book-of-the-dead-heart-scale-maat";

/* The fixtures are taken FROM the records, so this suite cannot drift from the archive. */
const starPost = blogPosts.find((p) => p.slug === "the-star-and-the-uncarved-block");
const starArt = artworks.find((a) => a.slug === "translinguistic-equation");
const starRaw = fs.readFileSync(path.join(ROOT, "src/data/blog-content/2026-09-07/the-star-and-the-uncarved-block.md"), "utf8");
const ART_DESC = String(starArt.description);
/* A verbatim line of the article (a real heading in the source file), so "the record's own
   words reached the provider" is checked against text that is IN the record. */
const ARTICLE_LINE = "Thelema, Taoism, and the two ways of losing yourself";

(async () => {
  console.log("  --- 0. fixtures are the record's own, taken from the record ---");
  ok(starPost && starPost.title === STAR, "0 the Journal fixture is the record's own title");
  ok(starRaw.includes(ARTICLE_LINE), "0 the asserted text is verbatim in the Journal source file");
  ok(starArt && starArt.title === TL && ART_DESC.length > 120, "0 the artwork fixture is the record's own title and description");
  ok(archiveRecordsByTitle(STAR).length === 1 && archiveRecordsByTitle(STAR)[0].href === STAR_HREF,
    "0 the Journal title indexes to exactly one record, at its canonical route");
  ok(archiveRecordsByTitle(TL).length === 1 && archiveRecordsByTitle(TL)[0].href === TL_HREF,
    "0 the artwork title indexes to exactly one record, at its canonical route");

  console.log("\n  --- 1. a Journal piece, named by its title ---");
  let r = await call({ message: `Tell me about ${STAR}.`, pack: "codex", mode: "oracle" });
  ok(r.http === 200, "1 the route answers 200");
  ok(r.ids.includes(STAR_ID), `1 the canonical identity reaches the response (${r.ids.join(", ") || "none"})`);
  ok(r.msg.includes(STAR_HREF), "1 the composed message names the record's canonical route");
  ok(r.msg.includes("Journal record"), "1 the message says the visitor named a Journal record");
  ok(!/corr-v1:/.test(r.msg), "1 no correspondence identity is invented for a Journal title");

  console.log("\n  --- 2. the record's OWN TEXT reaches the provider (not a summary of it) ---");
  ok(r.msg.includes(ARTICLE_LINE), "2 the article's own words are in the composed message");
  ok(/Its opening text, quoted:/.test(r.msg), "2 the text arrives explicitly as a quotation of the record");
  ok(/EXTRACT of a \d+-character piece/.test(r.msg), "2 the message states that an extract, not the whole work, was supplied");
  ok(!/simplif|in short|summar(y|ise) it as/i.test(r.msg.split("Its opening text")[0].slice(-400)),
    "2 the record is not introduced by a generated précis standing in for its text");

  console.log("\n  --- 3. an artwork, named by its title ---");
  r = await call({ message: `Tell me about ${TL}.`, pack: "codex", mode: "oracle" });
  ok(r.http === 200, "3 the route answers 200");
  ok(r.ids.includes(TL_ID), `3 the canonical identity reaches the response (${r.ids.join(", ") || "none"})`);
  ok(r.msg.includes(TL_HREF), "3 the composed message names the artwork's canonical route");
  ok(r.msg.includes(ART_DESC), "3 the artwork's own description is supplied verbatim");
  ok(/Year: 2020/.test(r.msg) && /Medium as recorded:/.test(r.msg), "3 its recorded metadata travels with it");
  ok(/Artwork record/.test(r.msg), "3 the message says the visitor named an Artwork record");

  console.log("\n  --- 4. a FULL TITLE wins over a correspondence word inside it ---");
  r = await call({ message: `Tell me about ${PRECEDENCE_TITLE}.`, pack: "codex", mode: "oracle" });
  ok(r.http === 200, "4 the route answers 200");
  ok(r.ids.includes(PRECEDENCE_ID), `4 the title resolves to the Journal record (${r.ids.join(", ") || "none"})`);
  ok(!r.ids.some((i) => i.startsWith("corr-v1:")), "4 the correspondence word inside the title is NOT attached as a second record");
  ok(!/corr-v1:PHYSIOLOGY::Heart/i.test(r.msg), "4 ...and no correspondence grounding for that word is composed");
  ok(r.msg.includes(PRECEDENCE_TITLE), "4 the visitor's own full title travels intact");

  console.log("\n  --- 5. ...while the word itself still resolves on its own ---");
  r = await call({ message: "What does the heart correspond to?", pack: "codex", mode: "oracle" });
  ok(r.ids.includes("corr-v1:PHYSIOLOGY::Heart"), `5 the correspondence word alone still resolves (${r.ids.join(", ") || "none"})`);
  ok(!r.ids.some((i) => i.startsWith("journal:")), "5 ...and no Journal record is substituted for the word");

  console.log("\n  --- 6. two records sharing one title stay AMBIGUOUS ---");
  for (const [title, expect] of [["Trivium Method", ["journal:trivium-method", "artwork:trivium-method"]],
                                 ["Toroidal Tantra", ["journal:toroidal-tantra", "artwork:torroidal-tantra"]]]) {
    const n = resolveNamedRecords(`Tell me about ${title}.`, []);
    ok(n.resolved.length === 0, `6 "${title}" is not silently resolved to one record`);
    ok(n.ambiguous.length === 1 && n.ambiguous[0].matches.length === 2, `6 "${title}" is reported as carried by two records`);
    const listed = n.ambiguous[0].matches.map((m) => m.id).sort();
    ok(JSON.stringify(listed) === JSON.stringify([...expect].sort()), `6 both identities are named (${listed.join(", ")})`);
    ok(/Do not choose one of them silently/.test(n.blocks.join("\n")), `6 the grounding instructs the Oracle to ask`);
    const live = await call({ message: `Tell me about ${title}.`, pack: "codex", mode: "oracle" });
    ok(!live.ids.length, `6 no single identity reaches the response for "${title}"`);
  }

  console.log("\n  --- 7. the canonical record is CARRIED through a follow-up ---");
  r = await call({ message: "What does it mean?", pack: "codex", mode: "oracle",
                   history: H([`Tell me about ${STAR}.`, "It weighs true will against wu wei."]) });
  ok(r.ids.includes(STAR_ID), `7 the follow-up supplies the same canonical record (${r.ids.join(", ") || "none"})`);
  ok(r.msg.includes(ARTICLE_LINE), "7 ...with the record's own text again, not a paraphrase of the last answer");
  ok(r.msg.includes(STAR_HREF), "7 ...and the same canonical route");

  console.log("\n  --- 8. the subject CHANGES to another record, and is carried again ---");
  r = await call({ message: `Now show me ${TL}.`, pack: "codex", mode: "oracle",
                   history: H([`Tell me about ${STAR}.`, "It weighs true will against wu wei.",
                               "What does it mean?", "Two ways of losing yourself."]) });
  ok(r.ids.includes(TL_ID) && !r.ids.includes(STAR_ID), `8 naming the artwork changes the record (${r.ids.join(", ") || "none"})`);
  ok(!r.msg.includes(ARTICLE_LINE), "8 the previous record's text is not carried into the new subject");
  r = await call({ message: "And what is its medium?", pack: "codex", mode: "oracle",
                   history: H([`Tell me about ${TL}.`, "It encodes DNA spin resonance."]) });
  ok(r.ids.includes(TL_ID), `8 the artwork is then carried through its own follow-up (${r.ids.join(", ") || "none"})`);
  ok(r.msg.includes(ART_DESC), "8 ...with the artwork's own description");

  console.log("\n  --- 9. the grounding budget is measured, not hoped for ---");
  const sized = [
    ["Journal opening", { message: `Tell me about ${STAR}.`, pack: "codex", mode: "oracle" }],
    ["Artwork opening", { message: `Tell me about ${TL}.`, pack: "codex", mode: "oracle" }],
    ["Journal follow-up", { message: "What does it mean?", pack: "codex", mode: "oracle", history: H([`Tell me about ${STAR}.`, "It weighs true will against wu wei."]) }],
    ["Precedence title", { message: `Tell me about ${PRECEDENCE_TITLE}.`, pack: "codex", mode: "oracle" }],
  ];
  let worst = 0;
  for (const [label, body] of sized) {
    const res = await call(body);
    const n = res.msg.length;
    worst = Math.max(worst, n);
    ok(res.http === 200 && n > 0 && n <= MAX_GRINDED_CHARS, `9 ${label}: composed message ${n} chars <= ${MAX_GRINDED_CHARS}`);
  }
  console.log(`       worst composed message: ${worst} of ${MAX_GRINDED_CHARS} chars`);

  console.log("\n  --- 10. what must not change ---");
  r = await call({ message: "Follow Aleph through its element, colour and frequency.", pack: "codex", mode: "oracle" });
  ok(r.ids.includes("corr-v1:LETTERS_HEBREW::Aleph"), "10 Aleph still resolves as a correspondence record");
  r = await call({ message: "Tell me about copper in the archive.", pack: "codex", mode: "oracle" });
  ok(!r.ids.length && /Do not choose one of them silently/.test(resolveNamedRecords("Tell me about copper in the archive.", []).blocks.join("\n")),
    "10 Copper stays ambiguous, with clarification preserved");
  r = await call({ message: "Tell me about Prismatic Transmissions.", pack: "codex", mode: "oracle" });
  ok(!r.ids.length && !/corr-v1:/.test(r.msg), "10 an unheld subject resolves to no record invented");
  const subject = resolveNamedRecords("Tell me about Prismatic Transmissions.", []);
  ok(subject.subject.kind === "subject" && subject.subject.text === "Prismatic Transmissions",
    "10 ...and it is still carried as the visitor's subject");
  let sel = await call({ message: `Tell me about ${STAR}.`, pack: "codex", mode: "oracle", entityId: "corr-v1:METALS::Copper" });
  ok(!sel.ids.some((i) => i.startsWith("journal:")), "10 an explicit selection is never overridden by a name in the question");
  ok(!sel.msg.includes(ARTICLE_LINE) || /Selected Correspondence record/.test(sel.msg),
    "10 ...the selected record's grounding is what is composed");
  sel = await call({ message: `Tell me about ${STAR}.`, pack: "codex", mode: "oracle", entityId: "corr-v1:NOPE::Nothing" });
  ok(!sel.ids.some((i) => i.startsWith("journal:")), "10 an UNRESOLVED selection stays a failed selection, with no substitution");

  console.log("\n  --- 11. the onward links reach the right records ---");
  for (const [href, file, title] of [[STAR_HREF, "src/app/journal/[slug]/page.tsx", STAR],
                                     [TL_HREF, "src/app/gallery/[slug]/page.tsx", TL]]) {
    ok(fs.existsSync(path.join(ROOT, file)), `11 ${href} is served by ${file}`);
    const slug = href.split("/").pop();
    const held = href.startsWith("/journal/")
      ? blogPosts.find((p) => p.slug === slug)
      : artworks.find((a) => a.slug === slug);
    ok(held && held.title === title, `11 ${href} resolves to "${title}" and not to another record`);
  }

  console.log(`\n  assertions passed: ${pass}   assertions failed: ${fail}`);
  if (fail) { console.log("  failures:"); failures.forEach((f) => console.log("   - " + f)); }
  process.exit(fail ? 1 : 0);
})();
