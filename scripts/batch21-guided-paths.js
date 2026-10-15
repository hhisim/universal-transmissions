/**
 * Batch 21 — guided explorations.
 *
 * These assertions check the thing that can silently rot: a path is an ORDER over records
 * the archive already holds, so every stop must still RESOLVE against the live registries,
 * point at a route that exists, and carry the identifier the Oracle actually accepts.
 *
 * The suite imports the SHIPPED modules. It does not restate any title, question or route
 * of its own, because a test that retypes the data agrees with itself.
 *
 * Usage: node scripts/batch21-guided-paths.js
 */
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
const { registerTsModules } = require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs"));
registerTsModules({ root: ROOT });
require.extensions[".md"] = (mod) => { mod.exports = ""; };

const topics = require(path.join(ROOT, "src/lib/research-topics.ts"));
const connections = require(path.join(ROOT, "src/lib/research-connections.ts"));
const paths = require(path.join(ROOT, "src/lib/guided-paths.ts"));
const artworkData = require(path.join(ROOT, "src/data/artworks.ts"));
const blogPosts = require(path.join(ROOT, "src/data/blog-posts.ts"));
const codex = require(path.join(ROOT, "src/lib/codex-archive.ts"));

let passed = 0;
let failed = 0;
const ok = (m) => { console.log(`  ok   ${m}`); passed += 1; };
const bad = (m) => { console.log(`  FAIL ${m}`); failed += 1; };
const chk = (m, cond, detail) => (cond ? ok(m) : bad(`${m}${detail ? ` — ${detail}` : ""}`));
const chkeq = (m, a, b) => chk(m, a === b, `expected ${JSON.stringify(b)}, observed ${JSON.stringify(a)}`);

// ── the real record sets ─────────────────────────────────────────────────────
const ARTWORK_ROUTES = new Set(
  (artworkData.artworks || artworkData.default || []).filter((a) => a && a.slug).map((a) => `/gallery/${a.slug}`)
);
const JOURNAL_ROUTES = new Set(
  (blogPosts.blogPosts || blogPosts.default || []).filter((p) => p && p.slug).map((p) => `/journal/${p.slug}`)
);
const ROOM_ROUTES = new Set(topics.RESEARCH_DOMAINS.map((d) => d.route));
const ALL = paths.GUIDED_PATHS;

console.log("\n== A. the three paths, and their shape ==");
chkeq("three paths are published", ALL.length, 3);
const wanted = [
  ["sound-into-form", "Sound into Form"],
  ["language-into-glyph", "Language into Glyph"],
  ["symbol-into-correspondence", "Symbol into Correspondence"],
];
for (const [slug, title] of wanted) {
  const p = paths.findGuidedPath(slug);
  chk(`path "${slug}" exists with its requested title`, !!p && p.title === title,
      p ? `title=${p.title}` : "missing");
}
chkeq("path slugs are unique", new Set(ALL.map((p) => p.slug)).size, ALL.length);

console.log("\n== B. 4-6 stops per path, and every one resolves ==");
for (const p of ALL) {
  const n = p.stops.length;
  chk(`${p.slug}: ${n} stops (want 4-6)`, n >= 4 && n <= 6);
  const { stops, unresolved } = paths.resolvePath(p);
  chkeq(`${p.slug}: every stop resolves against the live registries`, unresolved.length, 0);
  chkeq(`${p.slug}: resolved stop count equals authored count`, stops.length, n);
}

console.log("\n== C. every stop points at a record that actually exists ==");
const seenPerPath = new Map();
for (const p of ALL) {
  const { stops } = paths.resolvePath(p);
  const titles = new Set();
  for (const s of stops) {
    const href = s.href;
    const isRoom = ROOM_ROUTES.has(href);
    const isArt = ARTWORK_ROUTES.has(href);
    const isPost = JOURNAL_ROUTES.has(href);
    const isCodex = href.startsWith("/codex/archive?system=");
    const isInstrument = href === "/experience/universal-resonator";
    const known = isRoom || isArt || isPost || isCodex || isInstrument;
    chk(`${p.slug} stop ${s.number}: destination is a real record`, known, href);
    if (isCodex) {
      const sys = href.split("system=")[1].split("&")[0];
      chk(`${p.slug} stop ${s.number}: codex system "${sys}" is a known system`,
          codex.isKnownSystem(sys));
    }
    chk(`${p.slug} stop ${s.number}: carries a question`, typeof s.question === "string" && s.question.trim().length > 20);
    chk(`${p.slug} stop ${s.number}: title is non-empty`, typeof s.title === "string" && s.title.trim().length > 0);
    chk(`${p.slug} stop ${s.number}: does not repeat a title already used in this path`, !titles.has(s.title), s.title);
    titles.add(s.title);
  }
  seenPerPath.set(p.slug, titles);
}

console.log("\n== D. the Oracle identifier is one the server resolver accepts ==");
for (const p of ALL) {
  const { stops } = paths.resolvePath(p);
  for (const s of stops) {
    const resolved = topics.resolveResearchTopic(s.oracleId);
    chk(`${p.slug} stop ${s.number}: "${s.oracleId}" resolves server-side`, !!resolved,
        resolved ? "" : "unresolved identifier");
    chk(`${p.slug} stop ${s.number}: identifier shape is an existing contract`,
        s.oracleId === topics.researchTopicId(s.topic) ||
        s.oracleId === topics.researchConnectionTopicId(s.topic, s.anchor));
    if (s.anchor) {
      chk(`${p.slug} stop ${s.number}: anchor is published by that room`,
          (connections.CONNECTIONS_BY_TOPIC[s.topic] || []).some((c) => c.anchorSlug === s.anchor));
    }
  }
}

console.log("\n== E. the Oracle link preserves path AND stop through the round trip ==");
for (const p of ALL) {
  const { stops } = paths.resolvePath(p);
  for (const s of stops) {
    const href = paths.stopOracleHref(s, p.slug);
    const q = new URLSearchParams(href.split("?")[1]);
    chkeq(`${p.slug} stop ${s.number}: carries researchTopicId`, q.get("researchTopicId"), s.oracleId);
    chkeq(`${p.slug} stop ${s.number}: from returns to this path and this stop`,
        q.get("from"), `/paths/${p.slug}?stop=${s.number}`);
    chk(`${p.slug} stop ${s.number}: from is a same-origin path the Oracle will accept`,
        q.get("from").startsWith("/") && !q.get("from").startsWith("//") && !q.get("from").includes("\\"));
    chkeq(`${p.slug} stop ${s.number}: carries the record's own question`, q.get("q"), s.question);
  }
}

console.log("\n== F. the reading between stops is marked as curated, and the last stop ends ==");
for (const p of ALL) {
  const { stops } = paths.resolvePath(p);
  stops.slice(0, -1).forEach((s) => {
    chk(`${p.slug} stop ${s.number}: has a curated transition to the next stop`,
        typeof s.transition === "string" && s.transition.trim().length > 20);
  });
  chkeq(`${p.slug}: the final stop has no transition`, stops[stops.length - 1].transition, null);
}

console.log("\n== G. the requested content is actually in the paths ==");
const byPath = Object.fromEntries(ALL.map((p) => [p.slug, paths.resolvePath(p).stops]));
chk("Sound into Form includes the Resonator",
    byPath["sound-into-form"].some((s) => s.href === "/experience/universal-resonator"));
chk("Language into Glyph includes the Hebrew letters Codex view",
    byPath["language-into-glyph"].some((s) => s.href === "/codex/archive?system=LETTERS_HEBREW"));
chk("Symbol into Correspondence includes the Major Arcana Codex view",
    byPath["symbol-into-correspondence"].some((s) => s.href === "/codex/archive?system=MAJOR_ARCANA"));
for (const [slug, stops] of Object.entries(byPath)) {
  chk(`${slug}: opens on a research room`, stops[0].oracleId.startsWith("research-v1:") && !stops[0].anchor);
  /* The brief asks a path to move across art, research, symbols and instruments - that is
     KIND diversity, not room diversity. A path through one room can still cross all four
     kinds, and two of these do. */
  const kinds = new Set(stops.map((s) => s.kind));
  chk(`${slug}: crosses more than one KIND of material (${[...kinds].join(", ")})`, kinds.size >= 3,
      `${kinds.size} kind(s)`);
  chk(`${slug}: includes at least one artwork or instrument`,
      stops.some((s) => s.kind === "Artwork" || s.kind === "Instrument"));
}

console.log("\n== H. no new dependency, no new engine, no new animation ==");
const changed = require("node:child_process")
  .execFileSync("git", ["-C", ROOT, "diff", "--name-only", "HEAD"], { encoding: "utf8" })
  .trim().split("\n").filter(Boolean);
chk("package.json / lockfile untouched", !changed.some((f) => /package(-lock)?\.json$/.test(f)),
    JSON.stringify(changed.filter((f) => /package/.test(f))));

const pathPage = fs.readFileSync(path.join(ROOT, "src/app/paths/[slug]/page.tsx"), "utf8");
const indexPath = fs.readFileSync(path.join(ROOT, "src/app/paths/page.tsx"), "utf8");
const libSrc = fs.readFileSync(path.join(ROOT, "src/lib/guided-paths.ts"), "utf8");
chk("no canvas / WebGL / graph engine introduced",
    !/<canvas|getContext\(|THREE\.|d3-force|cytoscape|react-force-graph/i.test(pathPage + indexPath + libSrc));
chk("the path pages do no client-side fetching", !/fetch\(|axios|useSWR|react-query/.test(pathPage + indexPath));
chk("the path experience adds no animation of its own",
    !/framer-motion/.test(pathPage) && !/animate=/.test(pathPage),
    "reduced motion is satisfied by having nothing to reduce");
chk("the progress bar is a static width, not an animated fill",
    /width: `\$\{\(number \/ total\)/.test(pathPage));

console.log("\n== I. the identifier contract was reused, not extended ==");
chk("guided-paths introduces no new URL parameter",
    !/searchParams\.get\(/.test(libSrc) && !/new URLSearchParams\([^)]*set\(/.test(libSrc));
chk("guided-paths reuses the room resolvers rather than its own table",
    /resolveResearchTopic/.test(libSrc) && /researchConnectionTopicId/.test(libSrc) &&
    /researchTopicId/.test(libSrc));
chk("guided-paths keeps the connection registry as the source of each stop's href",
    /CONNECTIONS_BY_TOPIC/.test(libSrc));

console.log("\n== J. REGRESSION: an unavailable middle stop must not shift the others ==");
{
  /* The fault: resolvePath() drops unresolvable stops, but the page used to index that
     COMPACTED array with the URL's stop number. With authored stop 2 unavailable the
     surviving numbers are 1,3,4,5,6, so array index 2 holds stop 4 and ?stop=3 opened
     stop 4. This block reproduces exactly that shape and pins the corrected behaviour. */
  const original = paths.findGuidedPath("sound-into-form");
  const broken = {
    ...original,
    stops: original.stops.map((s, i) =>
      i === 1 ? { ...s, anchor: "__unavailable-for-regression__", topic: original.stops[1].topic } : s
    ),
  };
  const rp = paths.resolvePath(broken);
  chk("the regression path really has an unavailable stop", rp.unresolved.length === 1,
      JSON.stringify(rp.unresolved));
  chkeq("the unavailable stop is authored 2", rp.unresolved[0], 2);
  chkeq("surviving numbers keep their authored identity", JSON.stringify(rp.stops.map((s) => s.number)),
      JSON.stringify([1, 3, 4, 5, 6]));
  chkeq("the compacted array position 2 holds stop 4 - the exact mismatch that was fixed",
      rp.stops[2].number, 4);

  // what stop 3 SHOULD be, taken from the unmodified path
  const truth3 = paths.resolveStop(original, 2);
  const truth4 = paths.resolveStop(original, 3);

  const sel3 = paths.selectStop(broken, "3");
  chkeq("?stop=3 selects state available", sel3.state, "available");
  chkeq("?stop=3 selects authored number 3", sel3.state === "available" ? sel3.number : null, 3);
  chkeq("?stop=3 opens stop 3, not stop 4",
      sel3.state === "available" ? sel3.stop.title : null, truth3.title);
  chk("?stop=3 does NOT open stop 4",
      sel3.state === "available" && sel3.stop.title !== truth4.title);
  chkeq("?stop=3 reports the authored total, not the surviving count",
      sel3.state === "available" ? sel3.total : null, 6);

  const sel2 = paths.selectStop(broken, "2");
  chkeq("?stop=2 (the unavailable one) reports unavailable", sel2.state, "unavailable");
  chkeq("?stop=2 keeps its authored number", sel2.state === "unavailable" ? sel2.number : null, 2);
  chk("?stop=2 substitutes NOTHING", sel2.state === "unavailable" && !("stop" in sel2));

  chkeq("?stop=99 is out-of-range, not a silent substitute",
      paths.selectStop(broken, "99").state, "out-of-range");
  chkeq("?stop=0 is out-of-range, not a silent substitute",
      paths.selectStop(broken, "0").state, "out-of-range");
  chkeq("a non-numeric stop falls back to stop 1, which exists",
      paths.selectStop(broken, "banana").state === "available"
        ? paths.selectStop(broken, "banana").number : null, 1);

  const nb3 = paths.stopNeighbours(broken, 3);
  chkeq("neighbour before stop 3 skips the unavailable stop 2", nb3.previous.number, 1);
  chkeq("neighbour after stop 3 is stop 4", nb3.next.number, 4);
  const nb2 = paths.stopNeighbours(broken, 2);
  chkeq("neighbours of the unavailable stop resolve to available stops either side",
      `${nb2.previous.number}->${nb2.next.number}`, "1->3");

  // every neighbouring stop's Oracle return URL must carry that stop's OWN number
  for (const s of [nb3.previous, sel3.stop, nb3.next]) {
    const href = paths.stopOracleHref(s, broken.slug);
    const q = new URLSearchParams(href.split("?")[1]);
    chkeq(`stop ${s.number}: oracle return URL names its own stop`, q.get("from"),
        `/paths/${broken.slug}?stop=${s.number}`);
    chkeq(`stop ${s.number}: oracle identifier is its own record`, q.get("researchTopicId"), s.oracleId);
  }
  chk("no neighbouring Oracle URL points at the unavailable stop's number",
      [nb3.previous, sel3.stop, nb3.next].every(
        (s) => !paths.stopOracleHref(s, broken.slug).includes("?stop=2")));
}

console.log("");
console.log(`assertions passed: ${passed}`);
console.log(`assertions failed: ${failed}`);
if (failed) process.exit(1);
console.log("\nBATCH21_GUIDED_PATHS_TESTS_PASSED");
