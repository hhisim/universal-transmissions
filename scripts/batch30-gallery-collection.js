#!/usr/bin/env node
/**
 * batch30-gallery-collection.js
 *
 * THE COLLECTION — the behaviour this batch changed, asserted against the shipped modules.
 *
 * The released gallery was random, cropped every work to 4:5, carried no counts, no search and
 * no shareable state, and left 32 of 35 cards invisible behind a reveal. Each of those is a
 * check below. These are data and source assertions over the modules the pages import — they are
 * NOT a click-lifecycle test; the browser journeys are recorded separately.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".jpeg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

const G = require(path.join(ROOT, "src/lib/gallery-collection.ts"));
const { artworks } = require(path.join(ROOT, "src/data/artworks.ts"));
const { ARTWORK_IMAGE_META } = require(path.join(ROOT, "src/data/artwork-image-meta.ts"));

let pass = 0, fail = 0;
const failures = [];
const ok = (c, m) => { if (c) { pass += 1; console.log("    ok   " + m); } else { fail += 1; failures.push(m); console.log("    FAIL " + m); } };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
/* Source checks read the CODE, not the prose around it: these files explain the defects they
   fix, and a check that matches an explanation of `Math.random` would "fail" for mentioning it. */
const code = (rel) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

console.log("\nBATCH 30 — the collection\n");

/* ── 1. order is stable, and the archive's own ─────────────────────────────── */
console.log("  1. order");
{
  const src = code("src/app/gallery/GalleryClient.tsx");
  ok(!/Math\.random/.test(src), "1 the gallery contains no randomness");
  const state = { series: "all", q: "", sort: "registry", work: null, orientation: "all" };
  const a = G.visibleWorks(state).map((x) => x.slug).join(",");
  const b = G.visibleWorks(state).map((x) => x.slug).join(",");
  ok(a === b, "1 two reads of the collection produce the same sequence");
  ok(a === artworks.map((x) => x.slug).join(","), "1 and it is the registry's own order");
  ok(G.COLLECTION_SIZE === artworks.length, `1 the collection size is the registry's (${artworks.length})`);
}

/* ── 2. every work reachable ──────────────────────────────────────────────── */
console.log("\n  2. reachability");
{
  const all = G.visibleWorks({ series: "all", q: "", sort: "registry", work: null, orientation: "all" });
  ok(all.length === artworks.length, `2 "All works" holds every published work (${all.length}/${artworks.length})`);
  const seen = new Set();
  for (const s of G.gallerySeries()) for (const w of G.worksInSeries(s.id)) seen.add(w.slug);
  ok(seen.size === artworks.length, `2 every work is reachable through some series or the remainder (${seen.size}/${artworks.length})`);
  const remainder = G.worksInSeries("other").length;
  const named = G.gallerySeries().find((s) => s.id === "other");
  ok((named ? named.count : 0) === remainder, "2 the remainder group's count is its own length");
  for (const s of G.gallerySeries()) {
    ok(s.count === G.worksInSeries(s.id).length, `2 "${s.label}" reports its true count (${s.count})`);
  }
}

/* ── 3. counts come from the registry, not from a hand-written list ───────── */
console.log("\n  3. derived counts");
{
  for (const tag of ["universal-transmissions", "bio-energetic-vortexes", "prismatic", "twilight-transmissions"]) {
    const fromRegistry = artworks.filter((a) => a.tags.includes(tag)).length;
    const fromLib = G.worksInSeries(tag).length;
    ok(fromRegistry === fromLib, `3 ${tag}: ${fromLib} works, read from the tags`);
  }
  const src = code("src/app/gallery/GalleryClient.tsx");
  ok(!/prismaticSlugs/.test(src), "3 the hardcoded prismatic slug list is gone");
  const prismatic = G.worksInSeries("prismatic").length;
  ok(prismatic === 5, `3 prismatic now follows the tag (${prismatic}), not the drifted hand list (6)`);
}

/* ── 4. each work keeps its own shape ─────────────────────────────────────── */
console.log("\n  4. aspect ratio");
{
  let checked = 0, wrong = 0, unrecorded = 0;
  for (const a of artworks) {
    const meta = ARTWORK_IMAGE_META[a.slug];
    const aspect = G.aspectOf(a.slug);
    if (!meta) {
      unrecorded += 1;
      ok(aspect === null, `4 ${a.slug} has no recorded size, so no ratio is claimed`);
      ok(G.orientationOf(a.slug) === null, `4 ${a.slug} is placed in no orientation bucket`);
      continue;
    }
    checked += 1;
    const expected = `${meta.width} / ${meta.height}`;
    if (aspect !== expected) { wrong += 1; console.log("        " + a.slug + ": " + aspect + " != " + expected); }
  }
  ok(wrong === 0, `4 all ${checked} recorded works report their master's own ratio`);
  ok(checked + unrecorded === artworks.length, "4 every work is accounted for");
  /* The card's markup lives in the component that renders it. Checking the gallery for
     expressions that moved into WorkCard is what made these two assertions report false against
     the shipped source; they now read the responsible component, and assert the grid uses it. */
  const card = code("src/components/gallery/WorkCard.tsx");
  const gallery = code("src/app/gallery/GalleryClient.tsx");
  ok(!/aspect-\[4\/5\]/.test(card), "4 the forced 4:5 box is gone from the card");
  ok(!/aspect-\[4\/5\]/.test(gallery), "4 …and from the gallery that renders it");
  ok(/aspectRatio: aspect \?\? "4 \/ 3"/.test(card), "4 the card takes the work's ratio, with a neutral box only when none is recorded");
  ok(/objectFit: aspect \? "cover" : "contain"/.test(card), "4 an unrecorded work is contained, never cropped");
  ok(/<WorkCard/.test(gallery), "4 the grid renders that card component");
  ok(/<WorkCard[\s\S]{0,240}artwork=\{a\}/.test(gallery), "4 …passing the work itself, not a copy of its fields");
}

/* ── 5. search ───────────────────────────────────────────────────────────── */
console.log("\n  5. search");
{
  const all = G.visibleWorks({ series: "all", q: "", sort: "registry", work: null, orientation: "all" });
  const vit = G.searchWorks(all, "vitruvian");
  ok(vit.some((a) => a.slug === "vitruvian-spirit"), "5 a title search finds the work");
  ok(G.searchWorks(all, "VITRUVIAN").length === vit.length, "5 search is case-insensitive");
  ok(G.searchWorks(all, "zzzznotawork").length === 0, "5 a term nobody uses matches nothing (and says so)");
  const byMedium = G.searchWorks(all, "mandelbulb");
  ok(byMedium.length > 0, "5 the medium field is searched too");
  const byYear = G.searchWorks(all, "2017");
  ok(byYear.every((a) => a.year === 2017), "5 a year matches only works of that year");
}

/* ── 6. order the visitor chooses ─────────────────────────────────────────── */
console.log("\n  6. sorts");
{
  const all = G.visibleWorks({ series: "all", q: "", sort: "registry", work: null, orientation: "all" });
  const newest = G.sortWorks(all, "newest");
  const oldest = G.sortWorks(all, "oldest");
  const title = G.sortWorks(all, "title");
  ok(newest.every((a, i) => i === 0 || newest[i - 1].year >= a.year), "6 newest-first is ordered by year");
  ok(oldest.every((a, i) => i === 0 || oldest[i - 1].year <= a.year), "6 oldest-first is ordered by year");
  ok(title.every((a, i) => i === 0 || title[i - 1].title.localeCompare(a.title) <= 0), "6 title order is alphabetical");
  const tieA = G.sortWorks(all, "newest"), tieB = G.sortWorks(all, "newest");
  ok(tieA.map((a) => a.slug).join() === tieB.map((a) => a.slug).join(), "6 equal years keep a stable order between runs");
}

/* ── 7. the browse state round-trips through the URL ──────────────────────── */
console.log("\n  7. shareable state");
{
  const state = { series: "prismatic", q: "equation", sort: "newest", work: "trinary-transcendence", orientation: "landscape" };
  const qs = G.browseQuery(state);
  const back = G.parseBrowseState(new URLSearchParams(qs));
  ok(back.series === state.series, "7 series survives the URL");
  ok(back.q === state.q, "7 the search survives the URL");
  ok(back.sort === state.sort, "7 the order survives the URL");
  ok(back.orientation === state.orientation, "7 the shape survives the URL");
  ok(back.work === state.work, "7 the work marker survives the URL");
  ok(G.browseQuery({ series: "all", q: "", sort: "registry", orientation: "all", work: null }) === "",
    "7 an unnarrowed collection produces a clean URL");
  ok(G.parseBrowseState(new URLSearchParams("series=nonsense&sort=nonsense")).series === "all",
    "7 an unknown series falls back to the whole collection");
  ok(G.parseBrowseState(new URLSearchParams("sort=nonsense")).sort === "registry",
    "7 an unknown order falls back to archive order");
}

/* ── 8. content does not depend on a reveal completing ────────────────────── */
console.log("\n  8. visibility");
{
  const reveal = code("src/components/ui/SectionReveal.tsx");
  ok(!/opacity:\s*0/.test(reveal), "8 the reveal no longer ships a hidden state");
  ok(!/initial=\{/.test(reveal), "8 …and sets no framer initial state");
  const css = read("src/app/globals.css");
  ok(/\[data-reveal\]\s*\{\s*opacity:\s*1;/.test(css), "8 the resting state in CSS is fully visible");
  ok(/@keyframes ut-reveal/.test(css), "8 the animation is an addition on top of it");
  ok(/\[data-reveal\],\s*\[data-reveal="shown"\]\s*\{\s*animation:\s*none !important/.test(css),
    "8 reduced motion removes the animation entirely");
  const gallery = read("src/app/gallery/GalleryClient.tsx");
  ok(!/SectionReveal/.test(gallery), "8 the gallery does not wait on a reveal at all");
}

/* ── 9. resized previews, masters opt-in ─────────────────────────────────── */
console.log("\n  9. loading");
{
  const gallery = code("src/app/gallery/GalleryClient.tsx");
  ok(!/unoptimized/.test(gallery), "9 the grid serves optimised derivatives, not raw masters");
  ok(/sizes=/.test(gallery), "9 the grid declares its sizes");
  const hero = code("src/components/gallery/ArtworkHero.tsx");
  ok(!/unoptimized/.test(hero), "9 the artwork hero still serves a derivative first");
  ok(/loading|priority|Lightbox|inspecting/.test(hero), "9 …with the master requested on inspection");
}

/* ── 10. the way back ────────────────────────────────────────────────────── */
console.log("\n  10. return");
{
  const ret = read("src/components/gallery/ReturnToBrowse.tsx");
  ok(/carried\.set\("work", slug\)/.test(ret), "10 the return link carries the work the visitor left");
  for (const k of ["series", "q", "sort", "orientation"]) {
    ok(ret.includes(`"${k}"`), `10 …and the ${k} they were browsing with`);
  }
  ok(!/from ["']@\/data\/artworks/.test(ret), "10 it does not pull the collection into the artwork page bundle");
  const detail = read("src/app/gallery/[slug]/page.tsx");
  ok(/ReturnToBrowse/.test(detail), "10 the artwork page offers it");
  ok(!/BACK TO GALLERY/.test(detail), "10 and no longer offers only the state-losing link");
}

/* ── 11. the return journey ─────────────────────────────────────────────── */
console.log("\n  11. return journey");
{
  const gallery = code("src/app/gallery/GalleryClient.tsx");
  const returner = read("src/components/gallery/ReturnToBrowse.tsx");

  /* the marker survives the gallery's own URL writer */
  ok(/browseQuery\(\{ series, q, sort, orientation, work: returnedTo \}\)/.test(gallery),
    "11 the URL writer carries the return marker instead of rebuilding the address without it");
  ok(/validWorkSlug\(/.test(gallery), "11 the marker is validated before it is trusted");
  ok(!/querySelector\(`\[data-work="\$\{/.test(gallery), "11 the marker never becomes part of a DOM selector");

  /* a position belongs to a collection, not to the browser */
  ok(!/SCROLL_KEY/.test(gallery), "11 the single global scroll key is gone");
  ok(/withSavedPosition\(/.test(gallery) && /readSavedPosition\(/.test(gallery),
    "11 positions are written and read through the collection-scoped helpers");
  ok(/rememberPlace\(a\.slug\)/.test(gallery), "11 leaving a work records which work was left");

  /* the behaviour of those helpers */
  const A = { series: "prismatic", q: "", sort: "registry", orientation: "all" };
  const B = { series: "all", q: "", sort: "registry", orientation: "all" };
  const sigA = G.browseSignature(A);
  const sigB = G.browseSignature(B);
  ok(sigA !== sigB, "11 two different collections have different signatures");
  ok(G.browseSignature({ ...A, q: "" }) === G.browseSignature({ ...A, q: "   " }),
    "11 …and an empty search is the same collection as no search");

  let store = G.withSavedPosition(null, sigA, { y: 900, work: "prismatic-equation" });
  store = G.withSavedPosition(store, sigB, { y: 120, work: "root-chakra" });
  ok(G.readSavedPosition(store, sigA, "prismatic-equation").y === 900,
    "11 a return to the right collection and work returns the saved place");
  ok(G.readSavedPosition(store, sigB, "root-chakra").y === 120,
    "11 …and the other collection keeps its own");
  ok(G.readSavedPosition(store, sigB, "prismatic-equation") === null,
    "11 an entry saved while leaving a different work is refused, not used");
  ok(G.readSavedPosition(store, G.browseSignature({ ...A, series: "other" }), "prismatic-equation") === null,
    "11 an unrelated collection's entry never answers for this one");
  ok(G.readSavedPosition(null, sigA, "prismatic-equation") === null, "11 absent storage yields no position");
  ok(G.readSavedPosition("not json", sigA, "prismatic-equation") === null, "11 unreadable storage yields no position");
  ok(G.readSavedPosition('{"x":{"y":"900"}}', "x", null) === null, "11 a malformed entry yields no position");
  ok(G.readSavedPosition(G.withSavedPosition(null, sigA, { y: -40, work: null }), sigA, null).y === 0,
    "11 a negative offset is clamped");

  /* markers */
  ok(G.validWorkSlug("vitruvian-spirit") === "vitruvian-spirit", "11 a published slug is a valid marker");
  ok(G.validWorkSlug("no-such-work") === null, "11 an unknown work is refused");
  ok(G.validWorkSlug('"] , [data-work="x') === null, "11 a value that is not a slug is refused");
  ok(G.validWorkSlug("") === null && G.validWorkSlug(null) === null && G.validWorkSlug(undefined) === null,
    "11 empty and missing markers are refused");
  let allValid = true;
  for (const a of artworks) if (G.validWorkSlug(a.slug) !== a.slug) allValid = false;
  ok(allValid, `11 every one of the ${artworks.length} published works is a valid marker`);

  /* the return link the work page offers */
  ok(/carried\.set\("work", slug\)/.test(returner), "11 the work page's return link names the work");
  ok(!/from ["']@\/data\/artworks/.test(returner), "11 …without pulling the registry into that page");
}

/* ── 12. the entrance, and the order the visitor chose ───────────────────── */
console.log("\n  12. entrance and order");
{
  const css = read("src/app/globals.css");
  const reveal = css.slice(css.indexOf("@keyframes ut-reveal"), css.indexOf("@keyframes ut-reveal") + 260);
  ok(!/opacity/.test(reveal), "12 the shared entrance animates transform only — it cannot hide content");
  ok(/from \{\s*transform: translate/.test(reveal), "12 …and it still moves");
  ok(/\[data-reveal\] \{\s*opacity: 1;/.test(css), "12 the resting state is fully visible");

  ok(!/grid-auto-flow:\s*row dense/.test(css), "12 the grid no longer reorders itself to fill holes");
  ok(!/grid-column:\s*span 2/.test(css), "12 no card spans two columns, so visual order matches the sort");
  const gallery = code("src/app/gallery/GalleryClient.tsx");
  ok(/shown\.map/.test(gallery), "12 the grid renders the collection in the order the module returned it");

  /* the opening says what it shows */
  ok(/countWord\(featured\.length\)/.test(gallery), "12 the opening's sentence is built from the list it renders");
  ok(!/Five works/.test(gallery), "12 …and no hard-coded count remains");
  ok(/artworks\.filter\(\(a\) => a\.featured\)/.test(gallery) && !/\.slice\(0, 4\)/.test(gallery),
    "12 the featured list is not silently capped");
  const featuredCount = artworks.filter((a) => a.featured).length;
  ok(featuredCount > 0, `12 the archive marks ${featuredCount} works as starting points, and all are rendered`);

  /* real artwork in the opening, on every width */
  ok(/ut-begin-strip/.test(gallery) && /<Image/.test(gallery), "12 the opening leads with artwork");
  ok(/@media \(max-width: 640px\)[\s\S]{0,900}ut-begin-strip/.test(css), "12 …compacted rather than stacked on a narrow screen");
  ok(/ut-refine/.test(gallery) && /<details/.test(gallery), "12 secondary controls fold away");
  ok(/data-gallery-search/.test(gallery), "12 …while search stays in the open");
}

/* ── 13. where a return lands without a saved position ──────────────────────
   The regression: a card's `offsetTop` is measured from its offset parent, and the collection grid
   is `position: relative`, so the first card reports 0 however far down the page the grid begins.
   A return built from it lands at the top of the document. The scenario below is the one that was
   measured on the preview: the grid starts 1011px down a 844px-tall viewport, and its first card
   has offsetTop 0. What follows asserts the RESULTING VIEWPORT POSITION, not that a scroll ran. */
console.log("\n  13. return position without storage");
{
  const NAV = 64;            // fixed site navigation
  const VIEWPORT = 844;      // the narrow 390x844 viewport
  const GRID_DOC_TOP = 1011; // where the collection grid begins in the document
  const OFFSET = G.RETURN_SCROLL_OFFSET;

  const grid = read("src/app/globals.css").match(/\.ut-collection \{[^}]*position: relative/);
  ok(Boolean(grid), "13 the collection grid is positioned — it is the card's offset parent");

  /* the first card: offsetTop 0 relative to that grid, so its document top is the grid's top */
  const firstCardOffsetTop = 0;
  const firstCardDocTop = GRID_DOC_TOP + firstCardOffsetTop;

  const fixedTarget = G.returnScrollTarget(firstCardDocTop);
  const fixedViewportTop = firstCardDocTop - fixedTarget;
  ok(fixedTarget === GRID_DOC_TOP - OFFSET, `13 the fixed return targets the card's document position (${fixedTarget})`);
  ok(fixedViewportTop === OFFSET, `13 …and the card lands ${fixedViewportTop}px from the top of the viewport`);
  ok(fixedViewportTop >= NAV, "13 below the fixed navigation, not under it");
  ok(fixedViewportTop < VIEWPORT, "13 and inside the viewport rather than below it");

  /* what the released line produced: max(0, offsetTop - offset) on its own */
  const oldTarget = Math.max(0, firstCardOffsetTop - OFFSET);
  const oldViewportTop = firstCardDocTop - oldTarget;
  ok(oldTarget === 0, "13 the old offsetTop arithmetic (kept here as the counter-example) targets 0");
  ok(oldViewportTop > VIEWPORT, `13 …leaving the card at ${oldViewportTop}px, below a ${VIEWPORT}px viewport`);

  /* a later-row work, whose offsetTop is real but still measured from the grid */
  const laterRowOffsetTop = 2480;
  const laterDocTop = GRID_DOC_TOP + laterRowOffsetTop;
  const laterViewportTop = laterDocTop - G.returnScrollTarget(laterDocTop);
  ok(laterViewportTop === OFFSET, `13 a later-row card also lands ${laterViewportTop}px from the top`);
  ok(laterDocTop - Math.max(0, laterRowOffsetTop - OFFSET) !== laterViewportTop,
    "13 …which offsetTop alone would not have achieved without the grid's own position");

  ok(G.returnScrollTarget(0) === 0, "13 a card at the very top scrolls to the top, never negative");
  ok(G.returnScrollTarget(-500) === 0, "13 a negative position is clamped");
  ok(G.returnScrollTarget(Number.NaN) === 0, "13 an unmeasurable card does not throw a scroll to NaN");

  /* and the source must read the document, not the offset parent */
  const gallery = code("src/app/gallery/GalleryClient.tsx");
  ok(/window\.scrollY \+ card\.getBoundingClientRect\(\)\.top/.test(gallery),
    "13 the component measures the card in document coordinates");
  ok(!/offsetTop - 120/.test(gallery), "13 the offsetTop arithmetic is gone");
  ok(/returnScrollTarget\(/.test(gallery), "13 …and it uses the tested helper");
}

console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
for (const m of failures) console.log("   - " + m);
process.exit(fail ? 1 : 0);
