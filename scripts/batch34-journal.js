#!/usr/bin/env node
/**
 * batch34-journal.js — the Journal's shipped browsing behaviour, driven through the real modules.
 *
 * Every assertion runs the shipped code: `src/lib/journal-browse.ts` (address state, search,
 * filters, counts, return validation) and `src/lib/journal-artworks.ts` (the artwork relationship,
 * read backwards from the existing registry). Nothing here re-implements the logic it checks, and no
 * assertion is a source-pattern match.
 *
 * The dataset fingerprint guards preservation: if a slug, date, author or title changes, the suite
 * fails and says so, because the brief requires every article URL, date and credit to survive.
 */
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
// Next compiles .md imports to a string; node has no such extension, so mirror it for this run.
require.extensions[".md"] = (mod, filename) => {
  mod.exports = fs.readFileSync(filename, "utf8");
};

const { blogPosts } = require(path.join(ROOT, "src/data/blog-posts.ts"));
const { artworks } = require(path.join(ROOT, "src/data/artworks.ts"));
const J = require(path.join(ROOT, "src/lib/journal-browse.ts"));
const A = require(path.join(ROOT, "src/lib/journal-artworks.ts"));

let pass = 0, fail = 0;
const failures = [];
function ok(condition, message) {
  if (condition) { pass += 1; console.log("    ok   " + message); }
  else { fail += 1; failures.push(message); console.log("    FAIL " + message); }
}
const q = (pairs) => new URLSearchParams(pairs);

console.log("\n  1. the dataset is preserved");
{
  const fp = crypto.createHash("md5")
    .update(blogPosts.map((p) => [p.slug, p.publishedAt, p.author, p.title].join("|")).join("\n"))
    .digest("hex");
  ok(blogPosts.length === 82, "82 transmissions, as released");
  ok(fp === "c07bcde5687c1e9edd01adbb02ab5685", "every slug, date, author and title is unchanged (fingerprint)");
  ok(new Set(blogPosts.map((p) => p.slug)).size === blogPosts.length, "no duplicate article URLs");
  ok(blogPosts.every((p) => /^\d{4}-\d{2}-\d{2}/.test(p.publishedAt)), "every record keeps a dated publication");
  ok(blogPosts.every((p) => p.author && p.author.trim()), "every record keeps its author credit");
  ok(blogPosts.every((p) => p.excerpt && p.excerpt.trim()), "every record keeps its excerpt");
}

console.log("\n  2. a known title is found");
{
  const hit = J.filterJournal(blogPosts, J.parseJournalState(q([["q", "the making of power"]])));
  ok(hit.length >= 1 && hit[0].slug === "the-making-of-power", "“the making of power” finds the-making-of-power first");
  const single = J.filterJournal(blogPosts, J.parseJournalState(q([["q", "Power"]])));
  ok(single.length > 1, "a single word matches across titles and excerpts");
  const byTagWord = J.filterJournal(blogPosts, J.parseJournalState(q([["q", "taoism"]])));
  ok(byTagWord.some((p) => p.tags.includes("taoism")), "a tag word is searchable from the same box");
}

console.log("\n  3. empty results are empty, not everything");
{
  const none = J.filterJournal(blogPosts, J.parseJournalState(q([["q", "zzzznotarecord"]])));
  ok(none.length === 0, "an unmatched query returns zero records");
  const badTag = J.filterJournal(blogPosts, J.parseJournalState(q([["tag", "no-such-tag"]])));
  ok(badTag.length === 0, "an unknown tag returns zero records rather than silently widening");
  ok(J.parseJournalState(q([["tag", "no-such-tag"]])).tag === "no-such-tag", "…and the address keeps the tag it asked for");
}

console.log("\n  4. combined filters");
{
  const state = J.parseJournalState(q([["category", "voa"], ["year", "2026"], ["tag", "chakra"]]));
  const combined = J.filterJournal(blogPosts, state);
  ok(combined.length > 0, "category + year + tag together return records");
  ok(combined.every((p) => p.tradition), "every result is in the Vault of Arcana category");
  ok(combined.every((p) => p.publishedAt.startsWith("2026")), "every result is from 2026");
  ok(combined.every((p) => p.tags.some((t) => J.tagGroup("chakra").includes(t))), "every result carries the tag group");
  const personal = J.filterJournal(blogPosts, J.parseJournalState(q([["category", "personal"]])));
  ok(personal.every((p) => !p.tradition), "the personal category excludes Vault records");
  const narrowed = J.filterJournal(blogPosts, J.parseJournalState(q([["q", "vortex"], ["year", "2017"]])));
  ok(narrowed.length > 0 && narrowed.every((p) => p.publishedAt.startsWith("2017")), "search + year intersect correctly");
}

console.log("\n  5. tag aliases widen browsing without rewriting records");
{
  ok(JSON.stringify(J.tagGroup("chakras")) === JSON.stringify(["chakra", "chakras"]), "chakras folds onto chakra");
  ok(JSON.stringify(J.tagGroup("daoism")) === JSON.stringify(["taoism", "daoism"]), "daoism folds onto taoism");
  const aliased = J.filterJournal(blogPosts, J.parseJournalState(q([["tag", "chakras"]])));
  const canonicalOnly = blogPosts.filter((p) => p.tags.includes("chakras")).length;
  ok(aliased.length > canonicalOnly, "selecting chakras also finds the records tagged chakra (" + aliased.length + " > " + canonicalOnly + ")");
  ok(blogPosts.some((p) => p.tags.includes("chakras")), "the source tag 'chakras' still exists verbatim on its record");
  ok(blogPosts.some((p) => p.tags.includes("chakra")), "the source tag 'chakra' still exists verbatim on its records");
}

console.log("\n  6. pagination is stable and complete");
{
  const all = J.filterJournal(blogPosts, J.EMPTY_JOURNAL_STATE);
  const expectedPages = Math.ceil(all.length / J.JOURNAL_PAGE_SIZE);
  const first = J.pageSlice(all, 1);
  const second = J.pageSlice(all, 2);
  ok(first.pageCount === expectedPages, "page count is ceil(" + all.length + "/" + J.JOURNAL_PAGE_SIZE + ") = " + expectedPages);
  ok(first.items.length === J.JOURNAL_PAGE_SIZE, "page 1 is full");
  ok(first.items[0].slug !== second.items[0].slug, "page 2 starts elsewhere");
  const seen = new Set();
  let duplicates = 0;
  for (let p = 1; p <= expectedPages; p += 1) {
    for (const post of J.pageSlice(all, p).items) {
      if (seen.has(post.slug)) duplicates += 1;
      seen.add(post.slug);
    }
  }
  ok(duplicates === 0 && seen.size === all.length, "paging through every page visits each record exactly once");
  ok(J.pageSlice(all, 9999).page === expectedPages, "a page past the end clamps to the last page");
  ok(J.pageSlice(all, 0).page === 1, "page 0 clamps to the first page");
  const again = J.filterJournal(blogPosts, J.EMPTY_JOURNAL_STATE);
  ok(again.map((p) => p.slug).join() === all.map((p) => p.slug).join(), "ordering is deterministic between calls");
}

console.log("\n  7. the address round-trips");
{
  const state = { q: "vortex", year: "2017", tag: "chakra", category: "voa", page: 3 };
  const href = J.journalHref(state);
  const parsed = J.parseJournalState(new URLSearchParams(href.split("?")[1] || ""));
  ok(J.journalHref(parsed) === href, "build → parse → build is stable");
  ok(href.includes("q=vortex") && href.includes("year=2017") && href.includes("tag=chakra")
     && href.includes("category=voa") && href.includes("page=3"), "every dimension is in the address");
  ok(J.journalHref(J.EMPTY_JOURNAL_STATE) === "/journal", "an unfiltered view is the bare route");
  ok(J.parseJournalState(q([["page", "abc"]])).page === 1, "a non-numeric page is ignored");
  ok(J.parseJournalState(q([["year", "17"]])).year === null, "a malformed year is ignored");
  ok(J.parseJournalState(q([["category", "junk"]])).category === "all", "an unknown category falls back to all");
  const long = J.parseJournalState(q([["q", "x".repeat(200)]]));
  ok(long.q.length === J.MAX_QUERY_LENGTH, "an overlong query is bounded");
}

console.log("\n  8. a return address can only name this archive");
{
  const filtered = J.journalHref({ q: "power", year: "2017", tag: null, category: "all", page: 2 });
  const withAnchor = filtered + "#j-the-making-of-power";
  ok(J.safeJournalReturn(withAnchor) === withAnchor, "a filtered journal address with its anchor is accepted");
  ok(J.safeJournalReturn("/journal") === "/journal", "the bare route is accepted");
  ok(J.safeJournalReturn("https://evil.example/journal") === null, "an absolute URL is refused");
  ok(J.safeJournalReturn("//evil.example/journal") === null, "a protocol-relative URL is refused");
  ok(J.safeJournalReturn("/gallery/vitruvian-spirit") === null, "another surface is refused");
  ok(J.safeJournalReturn("/journalx?year=2017") === null, "a lookalike route is refused");
  ok(J.safeJournalReturn("/journal\\..\\etc") === null, "a backslash path is refused");
  ok(J.safeJournalReturn("/journal?q=a\nb") === null, "a literal control character is refused");
  ok(J.safeJournalReturn("/journal?q=a%0Ab") === "/journal?q=a%0Ab", "an encoded newline stays an ordinary query value");
  ok(J.safeJournalReturn("/journal?" + "a".repeat(500)) === null, "an overlong return address is refused");
  ok(J.safeJournalReturn(null) === null && J.safeJournalReturn(undefined) === null && J.safeJournalReturn("") === null,
    "an absent or empty return address is refused");
}

console.log("\n  9. counts come from the records");
{
  const years = J.deriveYears();
  ok(years.length > 0 && years.every((y) => /^\d{4}$/.test(y.year)), "years are derived, all four digits");
  ok(years.some((y) => y.year === "2025") === blogPosts.some((p) => p.publishedAt.startsWith("2025")),
    "a year exists in the filter exactly when the archive holds records for it");
  ok(years.reduce((sum, y) => sum + y.count, 0) === blogPosts.length, "year counts sum to the archive");
  const cats = J.deriveCategories();
  ok(cats[0].count === blogPosts.length, "the All category counts every record");
  ok(cats[1].count + cats[2].count === blogPosts.length, "the two collections partition the archive");
  const facets = J.deriveTagFacets();
  const rawTags = new Set();
  for (const post of blogPosts) for (const tag of post.tags || []) rawTags.add(tag);
  const expectedCanonical = new Set(Array.from(rawTags).map(J.canonicalTagKey)).size;
  ok(facets.length === expectedCanonical, "tag facets merge aliases into " + expectedCanonical + " browse keys (from " + rawTags.size + " source tags)");
  ok(facets.every((f, i) => i === 0 || facets[i - 1].count >= f.count), "facets are ordered by count, then name");
  const chakraFacet = facets.find((f) => f.tag === "chakra");
  const chakraRaw = blogPosts.filter((p) => p.tags.includes("chakra") || p.tags.includes("chakras")).length;
  ok(chakraFacet && chakraFacet.count === chakraRaw, "the chakra facet counts both spellings (" + chakraRaw + ")");
}

console.log("\n  10. the artwork relationship is read, not invented");
{
  const postSlug = "universal-transmissions-xi-vitruvian-spirit-seeding-the-new-renaissance";
  const linked = A.artworkRecordsForJournal(postSlug);
  ok(linked.some((a) => a.slug === "vitruvian-spirit"), "the Vitruvian Spirit record is found from its Journal post");
  ok(A.artworkRecordsForJournal("adding-new-transmissions-soon").length === 0, "a post with no recorded artwork claims none");
  const allLinked = A.journalPostsWithArtwork();
  ok(allLinked.length > 0 && allLinked.length < blogPosts.length, "only some posts document a work (" + allLinked.length + " of " + blogPosts.length + ")");
  const artworkSlugs = new Set(artworks.map((a) => a.slug));
  let bogus = 0;
  for (const slug of allLinked) for (const art of A.artworkRecordsForJournal(slug)) if (!artworkSlugs.has(art.slug)) bogus += 1;
  ok(bogus === 0, "every derived artwork exists in the artwork registry");
  const postSlugs = new Set(blogPosts.map((p) => p.slug));
  ok(allLinked.every((slug) => postSlugs.has(slug)), "every derived Journal post exists in the archive");
}

console.log("\n  11. the address the cards actually generate is usable");
{
  /* Unfiltered cards generate /journal#j-<slug>; a fragment is a place inside the index, so the
     return link built from an article opened there must survive validation. */
  const unfiltered = J.journalHref(J.EMPTY_JOURNAL_STATE);
  const generated = unfiltered + "#j-the-making-of-power";
  ok(generated === "/journal#j-the-making-of-power", "an unfiltered card generates /journal#j-<slug>");
  ok(J.safeJournalReturn(generated) === generated, "…and that exact address is accepted back");

  const filtered = J.journalHref({ q: "", year: "2017", tag: "vortex", category: "all", page: 1 });
  ok(J.safeJournalReturn(filtered + "#j-the-making-of-power") === filtered + "#j-the-making-of-power",
    "a filtered return with its anchor is still accepted");

  ok(J.safeJournalReturn("/journal#") === "/journal#", "an empty fragment is still the index");
  ok(J.safeJournalReturn("/journal?year=2017") === "/journal?year=2017", "a plain filtered address is accepted");

  ok(J.safeJournalReturn("/journal/third-vortex-the-power") === null, "an article path is not a return to the collection");
  ok(J.safeJournalReturn("/journalx#j-a") === null, "a lookalike route with a fragment is refused");
  ok(J.safeJournalReturn("https://evil.example/journal#j-a") === null, "an external address with a fragment is refused");
  ok(J.safeJournalReturn("//evil.example/journal") === null, "a protocol-relative address is still refused");
}

console.log("\n  12. one article, one facet count — including when it carries both spellings");
{
  const both = blogPosts.filter((p) => p.tags.includes("athanor") || p.tags.includes("athenor"));
  ok(both.length === 1, "the Alchemical Vessel record is the only one carrying athanor/athenor (" + both.length + ")");
  ok(both[0].tags.includes("athanor") && both[0].tags.includes("athenor"),
    "that record carries BOTH spellings, so occurrence-counting would report two");

  const facets = J.deriveTagFacets();
  const athanor = facets.find((f) => f.tag === "athanor");
  ok(athanor && athanor.count === 1, "the athanor facet counts that record once, not twice (" + (athanor && athanor.count) + ")");

  /* The invariant, for every facet: the count equals the number of RECORDS in the group. */
  let mismatched = 0;
  for (const facet of facets) {
    const group = J.tagGroup(facet.tag);
    const records = blogPosts.filter((p) => (p.tags || []).some((t) => group.includes(String(t).trim().toLowerCase())));
    if (records.length !== facet.count) mismatched += 1;
  }
  ok(mismatched === 0, "every facet count equals the number of matching records (" + mismatched + " mismatches)");
}

console.log("\n  13. a direct alias address selects the canonical, visible facet");
{
  const aliases = Object.keys(J.TAG_ALIASES);
  ok(aliases.length === 4, "four reviewed aliases");
  let bad = 0;
  for (const alias of aliases) {
    const canonical = J.TAG_ALIASES[alias];
    const parsed = J.parseJournalState(q([["tag", alias]]));
    if (parsed.tag !== canonical) bad += 1;
  }
  ok(bad === 0, "?tag=<alias> resolves to the canonical facet for all four");

  const facetKeys = new Set(J.deriveTagFacets().map((f) => f.tag));
  let missing = 0;
  for (const alias of aliases) {
    const parsed = J.parseJournalState(q([["tag", alias]]));
    if (!facetKeys.has(parsed.tag)) missing += 1;
  }
  ok(missing === 0, "the resolved facet exists in the bank, so it can be shown selected");

  const rewritten = J.journalHref(J.parseJournalState(q([["tag", "athenor"]])));
  ok(rewritten === "/journal?tag=athanor", "the address is written canonically after resolution (" + rewritten + ")");
  const cleared = J.parseJournalState(q([["tag", "athanor"]]));
  ok(cleared.tag === "athanor" && J.TAG_ALIASES[cleared.tag] === undefined,
    "the selected canonical facet is a real tag, so clicking it clears rather than re-selects");

  let stillPresent = 0;
  for (const alias of aliases) {
    if (!blogPosts.some((p) => p.tags.includes(alias))) stillPresent += 1;
  }
  ok(stillPresent === 0, "all four source spellings still exist verbatim in the records");
}

console.log("\n  ==================== SUMMARY ====================");
console.log(`   assertions passed: ${pass}   assertions failed: ${fail}`);
if (fail) {
  failures.forEach((f) => console.log("   FAIL " + f));
  console.log("   RESULT: FAIL");
  process.exit(1);
}
console.log("   RESULT: PASS");
process.exit(0);
