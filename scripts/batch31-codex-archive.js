#!/usr/bin/env node
/**
 * batch31-codex-archive.js
 *
 * THE CODEX AS A LIVING ARCHIVE — the behaviour this batch added, and the discipline it preserved.
 *
 * The identity rules are the ones that must not move: a value resolves inside the system its own
 * field names, an ambiguous value gets no link, and a name that exists in two systems stays two
 * records. Everything this batch added is derived from indexes the module already built or from
 * registries that already named the Codex.
 *
 * Source checks here read the shipped components; the browser journeys are recorded separately.
 */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
require(path.join(ROOT, "scripts/lib/ut-ts-require.cjs")).registerTsModules({ root: ROOT });
for (const e of [".md", ".mdx"]) require.extensions[e] = (m) => { m.exports = fs.readFileSync(m.filename, "utf8"); };
for (const e of [".css", ".scss", ".svg", ".png", ".jpg", ".jpeg", ".webp"]) require.extensions[e] = (m) => { m.exports = ""; };

const A = require(path.join(ROOT, "src/lib/codex-archive.ts"));
const { codex } = require(path.join(ROOT, "src/lib/codex-data.ts"));
const { correspondenceEntryId } = require(path.join(ROOT, "src/lib/oracle-entry-resolver.ts"));
const { CONNECTIONS_BY_TOPIC } = require(path.join(ROOT, "src/lib/research-connections.ts"));
const { GUIDED_PATHS } = require(path.join(ROOT, "src/lib/guided-paths.ts"));

let pass = 0, fail = 0;
const failures = [];
const ok = (c, m) => { if (c) { pass += 1; console.log("    ok   " + m); } else { fail += 1; failures.push(m); console.log("    FAIL " + m); } };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const pageCode = fs.readFileSync(path.join(ROOT, "src/app/codex/archive/page.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

console.log("\nBATCH 31 — the Codex archive\n");

/* ── 1. identity discipline, unchanged ────────────────────────────────────── */
console.log("  1. identity");
{
  ok(A.FIELD_SYSTEM.me === "METALS" && A.FIELD_SYSTEM.co === "COLORS",
    "1 a field's values are scoped to the system its own field names");
  const colorsSilver = codex.filter((r) => r.sys === "COLORS" && r.e === "Silver");
  const metalsSilver = codex.filter((r) => r.sys === "METALS" && r.e === "Silver");
  ok(colorsSilver.length === 1 && metalsSilver.length === 1,
    "1 \"Silver\" exists as two different records in two systems");
  ok(correspondenceEntryId(colorsSilver[0]) !== correspondenceEntryId(metalsSilver[0]),
    "1 …and they carry different identities");
  ok(A.FIELD_SYSTEM.no === "NOTES" && A.FIELD_SYSTEM.ll === "LETTERS_LATIN",
    "1 a note is not resolved against the Latin alphabet");

  const amb = A.resolveValue("de", "Aphrodite");
  ok(amb.state === "ambiguous", "1 a value matching several records is reported ambiguous");
  ok(amb.state === "ambiguous" && amb.candidates.length > 1, "1 …with its candidates, not a guess");
  ok(A.resolveValue("de", "NotARealDeity").state === "unresolved", "1 a value with no record stays unresolved");
  ok(A.resolveValue("zz", "Anything").state === "unresolved", "1 a field with no system resolves nothing");

  /* rule 1 and rule 2 still apply, and rule 2 only lands on exactly one record */
  const ordinalled = A.relationshipGroups("ALCHEMY", "Calcination", 1);
  ok(ordinalled.groups.length > 0, "1 a record still resolves its own relationships");

  /* every record's own id round-trips: direct record links keep working */
  let roundTrip = 0, bad = 0;
  for (const e of codex) {
    const id = correspondenceEntryId(e);
    const back = A.recordFromId(id);
    if (back && back.sys === String(e.sys) && back.e === String(e.e)) roundTrip += 1; else bad += 1;
  }
  ok(bad === 0, `1 all ${roundTrip} record ids resolve back to the record they name`);
}

/* ── 2. the existing URL contracts ────────────────────────────────────────── */
console.log("\n  2. addresses");
{
  const id = correspondenceEntryId(codex.find((r) => r.sys === "KABBALAH"));
  ok(A.archiveHref(id) === `/codex/archive?entry=${encodeURIComponent(id)}`, "2 the entry address is unchanged");
  ok(A.archiveHref(id, "/codex/archive?q=aleph") ===
     `/codex/archive?entry=${encodeURIComponent(id)}&from=${encodeURIComponent("/codex/archive?q=aleph")}`,
     "2 a return target still rides along in `from`");
  ok(A.systemHref("LETTERS_HEBREW") === "/codex/archive?system=LETTERS_HEBREW", "2 the system address is unchanged");
  ok(A.isKnownSystem("KABBALAH") && !A.isKnownSystem("NOPE"), "2 system validation still refuses unknown systems");

  const page = code("src/app/codex/archive/page.tsx");
  ok(/q=\$\{encodeURIComponent\(q\)\}/.test(page), "2 search leaves the query in the address");
  ok(/<form[\s\S]{0,160}method="get"/.test(page), "2 …through a GET form, so it needs no script");
}

/* ── 3. search ────────────────────────────────────────────────────────────── */
console.log("\n  3. search");
{
  const aleph = A.searchArchive("aleph");
  ok(aleph.names.some((n) => n.e === "Aleph" && n.sys === "LETTERS_HEBREW"), "3 a record is found by its name");
  ok(aleph.nameTotal >= 1, "3 …with the total counted before any limit");

  const silver = A.searchArchive("silver");
  const systems = silver.names.map((n) => n.sys).sort();
  ok(systems.includes("COLORS") && systems.includes("METALS"),
    "3 two same-named records are returned as two, in their own systems");

  const value = A.searchArchive("cayenne");
  ok(value.values.some((v) => v.fieldLabel === "Plants"), "3 a recorded value is found and named with its field");
  ok(value.values.every((v) => v.records.every((r) => r.id && r.e)), "3 …with the records that carry it");

  ok(A.searchArchive("zzzznothing").nameTotal === 0, "3 a term nobody uses matches nothing");
  ok(A.searchArchive("").nameTotal === 0 && A.searchArchive("   ").nameTotal === 0, "3 an empty query searches for nothing");

  /* SHORT EXACT NAMES. Fifty-six records have one- or two-character names; a minimum length of two
     hides exactly those, and an unrestricted one-character substring search would answer a query
     the visitor meant as one letter with hundreds of unrelated records. */
  const oneChar = A.searchArchive("A");
  ok(oneChar.nameTotal > 0, `3 a one-character query still finds the records named that (${oneChar.nameTotal})`);
  ok(oneChar.names.every((n) => String(n.e).trim().toLowerCase() === "a"),
    "3 …and returns only records whose own name is that character");
  ok(oneChar.names.some((n) => n.sys === "LETTERS_LATIN" && n.e === "A"), "3 …including the Latin letter A");
  ok(oneChar.nameTotal < 20, "3 …rather than every record containing that letter");
  ok(A.searchArchive("al").nameTotal >= oneChar.nameTotal, "3 two characters search as a substring again");

  /* The same rule for recorded VALUES, or a one-letter query answers with hundreds of values that
     merely contain the letter: "A" must not match "Mars". */
  const oneCharValues = A.searchArchive("A").values;
  ok(oneCharValues.every((v) => v.value.trim().toLowerCase() === "a"),
    `3 one-character value matching is exact too (${oneCharValues.length} value rows, all exactly "a")`);
  ok(!oneCharValues.some((v) => /^mars$/i.test(v.value.trim())), "3 …so 'A' does not match 'Mars'");
  ok(A.searchArchive("A").valueTotal < 10, `3 …and the substring flood is gone (was 473, now ${A.searchArchive("A").valueTotal})`);
  ok(A.searchArchive("al").values.length > 0, "3 value discovery is intact for longer queries");
  ok(A.searchArchive("mars").nameTotal > 0 || A.searchArchive("mars").valueTotal > 0,
    "3 …and a longer value query still finds its records");

  /* DUPLICATE ROWS. The dataset holds four DEITIES identities twice; search must report one hit
     and one count for each addressable record. */
  for (const q of ["christos", "hecate", "kuan yin", "ma’at"]) {
    const r = A.searchArchive(q);
    const ids = r.names.map((n) => n.id);
    ok(ids.length > 0, `3 "${q}" finds its record`);
    ok(new Set(ids).size === ids.length, `3 "${q}" returns one hit per identity, not one per row`);
    ok(r.nameTotal === ids.length, `3 …and its total counts identities`);
  }
  const dupRows = codex.filter((e) => String(e.e || "").toLowerCase().startsWith("christos"));
  ok(dupRows.length === 2, `3 the source really holds ${dupRows.length} rows for that name`);
  ok(A.searchArchive("christos").names.length === 1, "3 …which search reports once");
  const many = A.searchArchive("e");
  ok(many.nameTotal >= many.names.length, "3 a broad term reports its true total and truncates the list");
  ok(many.names.length <= 60, "3 …and the list stays bounded");
}

/* ── 4. where the visitor arrived from ────────────────────────────────────── */
/* ── 3b. what gets counted ───────────────────────────────────────────────── */
console.log("\n  3b. what gets counted");
{
  const { CORPUS_SUMMARY } = require(path.join(ROOT, "src/lib/corpus-summary.ts"));
  ok(codex.length === 824, `3b the dataset still holds its ${codex.length} source rows`);
  ok(A.CORPUS.sourceRecords === 824, "3b the summary still knows them as source rows");
  ok(A.CORPUS.records === 820, `3b the entrance reports distinct identities (${A.CORPUS.records})`);
  ok(A.CORPUS.records === CORPUS_SUMMARY.distinctIdentities,
    "3b …taken from the existing summary rather than counted again");
  ok(A.CORPUS.systems === 27 && A.CORPUS.systems === CORPUS_SUMMARY.systemCount,
    "3b and the 27 systems that summary publishes");

  const sum = A.SYSTEMS.reduce((n, x) => n + x.count, 0);
  ok(sum === A.CORPUS.records, `3b the per-system counts add up to the same total (${sum})`);
  const dei = A.SYSTEMS.find((x) => x.sys === "DEITIES");
  ok(dei.count === 198, `3b a system's count is its addressable records (DEITIES ${dei.count})`);
  ok(A.recordsInSystem("DEITIES").length === dei.count, "3b …and that system's list is exactly that long");
  const deiIds = A.recordsInSystem("DEITIES").map((r) => r.id);
  ok(new Set(deiIds).size === deiIds.length, "3b no record is listed twice in a system");
  ok(A.recordsInSystem("DEITIES").filter((r) => /christos/i.test(r.e)).length === 1,
    "3b the duplicated row appears once in the system list");
}

console.log("\n  4. arrival");
{
  /* a relationship that really exists: read the source's own fields to find it */
  const srcSys = "ALCHEMY", srcE = "Calcination";
  const groups = A.relationshipGroups(srcSys, srcE, 200).groups;
  const example = groups.flatMap((g) => g.examples).find((x) => x.target.sys === "PLANTS");
  ok(Boolean(example), "4 a real relationship exists to follow");
  const sourceHref = A.archiveHref(correspondenceEntryId(codex.find((r) => r.sys === srcSys && r.e === srcE)), "/codex/archive");
  const arrived = A.arrivalContext(sourceHref, example.target.sys, example.target.e);
  ok(Boolean(arrived && arrived.source), "4 arriving from a record reports the record it came from");
  ok(arrived.viaFieldLabel === example.fieldLabel && arrived.viaValue === example.value,
    `4 …and the value that reaches it, re-read from the source (${example.fieldLabel}: "${example.value}")`);

  const unrelated = A.arrivalContext(
    A.archiveHref(correspondenceEntryId(codex.find((r) => r.sys === "KABBALAH"))),
    example.target.sys, example.target.e);
  ok(unrelated && unrelated.source && unrelated.viaFieldLabel === null,
    "4 a source that does not actually reach this record claims no route");
  const andBack = A.arrivalContext(sourceHref, srcSys, srcE);
  ok(andBack === null, "4 a record does not claim to have arrived from itself");

  const fromSystem = A.arrivalContext("/codex/archive?system=LETTERS_HEBREW", "LETTERS_HEBREW", "Aleph");
  ok(fromSystem && fromSystem.systemView === "LETTERS_HEBREW" && !fromSystem.source,
    "4 arriving from a system view reports the system, not a fabricated record");

  ok(A.arrivalContext("https://elsewhere.example/x", "PLANTS", "Cayenne") === null, "4 an outside address is refused");
  ok(A.arrivalContext("/codex/archive-not-real?system=METALS", "METALS", "Gold") === null,
    "4 a path that only LOOKS like this page is refused — the pathname must match exactly");
  ok(A.arrivalContext("/codex/archive/extra", "METALS", "Gold") === null, "4 a deeper path is refused too");
  ok(A.arrivalContext("/codex/archive?system=NOT_A_SYSTEM", "METALS", "Gold") === null,
    "4 an unknown system is not somewhere a visitor can have been browsing");
  const outside = A.arrivalContext("/codex/archive?system=METALS", "PLANTS", "Cayenne");
  ok(outside === null, "4 a system view that does not CONTAIN this record is no arrival");
  ok(A.arrivalContext("/codex/archive?system=METALS", "METALS", "Gold") !== null,
    "4 …while a system view that does contain it still is");
  const known = A.SYSTEMS[0].sys;
  ok(Boolean(A.arrivalContext(`/codex/archive?system=${known}`, known, A.recordsInSystem(known)[0].e)),
    "4 a real system view is still reported");
  ok(A.arrivalContext("/codex/archive?q=aleph", "LETTERS_HEBREW", "Aleph") === null,
    "4 a search address names no source record, so it claims no arrival");
  ok(A.arrivalContext("/codex/archive?entry=corr-v1:BOGUS::Nope", "PLANTS", "Cayenne") === null,
    "4 a malformed entry id is refused");
  ok(A.arrivalContext("", "PLANTS", "Cayenne") === null, "4 no `from` means no claim");
}

/* ── 5. routes other registries already draw ──────────────────────────────── */
console.log("\n  5. registered routes");
{
  let expected = 0;
  for (const conns of Object.values(CONNECTIONS_BY_TOPIC)) {
    for (const c of conns) if (/^\/codex\/archive\?system=/.test(c.href || "")) expected += 1;
  }
  ok(expected >= 3, `5 the research registry names ${expected} Codex system views`);

  const heb = A.registeredRoutesForSystem("LETTERS_HEBREW");
  ok(heb.some((r) => r.kind === "Research room"), "5 a system named by a research room reports that room");
  ok(heb.some((r) => r.kind === "Guided path"), "5 …and any guided path that stops on it");
  const hebRoom = heb.find((r) => r.kind === "Research room");
  ok(CONNECTIONS_BY_TOPIC[hebRoom.href.replace("/research/", "")]
      .some((c) => c.href === "/codex/archive?system=LETTERS_HEBREW"),
    "5 …read from the registry rather than restated");

  const arcana = A.registeredRoutesForSystem("MAJOR_ARCANA");
  ok(arcana.length >= 2, `5 MAJOR_ARCANA reports ${arcana.length} registered routes`);

  const none = A.registeredRoutesForSystem("KABBALAH");
  ok(none.length === 0, "5 a system nothing names reports no route");

  /* every route reported must exist in a registry */
  const pathSlugs = new Set(GUIDED_PATHS.map((p) => p.slug));
  const topicSlugs = new Set(Object.keys(CONNECTIONS_BY_TOPIC));
  let invented = 0;
  for (const s of A.SYSTEMS) {
    for (const r of A.registeredRoutesForSystem(s.sys)) {
      if (r.kind === "Guided path" && !pathSlugs.has(r.href.replace("/paths/", ""))) invented += 1;
      if (r.kind === "Research room" && !topicSlugs.has(r.href.replace("/research/", ""))) invented += 1;
    }
  }
  ok(invented === 0, "5 no reported route points at anything the registries do not hold");
  ok(A.SYSTEMS_WITH_REGISTERED_ROUTES.length >= 3,
    `5 systems named by another registry: ${A.SYSTEMS_WITH_REGISTERED_ROUTES.join(", ")}`);
}

/* ── 6. the entrance and the record ──────────────────────────────────────── */
console.log("\n  6. entrance and record");
{
  const page = code("src/app/codex/archive/page.tsx");
  const searchAt = page.indexOf("<SearchForm />"), whyAt = page.indexOf("How to read this");
  ok(searchAt > -1 && whyAt > -1 && searchAt < whyAt,
    "6 the search and the material come before the explanation");
  ok(/CORPUS\.records/.test(page) && /CORPUS\.systems/.test(page),
    "6 the entrance's counts are derived from the corpus");
  ok(/representativeSet\(/.test(page) && /SYSTEMS\.map/.test(page),
    "6 the way in and the system list are derived too");
  ok(/data-arrival=/.test(page), "6 a record says where the visitor arrived from");
  ok(/registeredRoutesForSystem\(/.test(page), "6 …and offers the routes that already lead here");
  ok(/MEASURED_LOOKING/.test(page) && /BASIS_NOTE/.test(page),
    "6 the record still marks its bases and flags measured-looking fields");
  ok(/unresolved/.test(page) && /ambiguous/.test(page),
    "6 the unlinked and ambiguous values are still shown as what they are");
}

/* ── 7. media is opt-in ──────────────────────────────────────────────────── */
console.log("\n  7. media");
{
  const presented = code("src/app/codex/page.tsx");
  ok(!/<iframe/.test(presented), "7 the presented page mounts no video frame of its own");
  ok(/CodexVideoCard/.test(presented), "7 …it uses the gated card instead");
  const card = code("src/components/codex/CodexVideoCard.tsx");
  ok(/const \[playing, setPlaying\]/.test(card) && /playing \? \(/.test(card),
    "7 the card mounts its frame only once it is asked to play");
  ok(/<button/.test(card) && /aria-label=/.test(card), "7 the gate is a real, labelled control");
  ok(!/thumbnail|i\.ytimg|img\.youtube/.test(card), "7 …and asks a third party for nothing to draw itself");
}

/* ── 8. the browsing context survives the journey ────────────────────────── */
console.log("\n  8. context");
{
  const page = code("src/app/codex/archive/page.tsx");
  ok(/const contextHref = from \|\| "\/codex\/archive"/.test(page),
    "8 a record keeps the context the visitor arrived with");
  ok(/archiveHref\(entry\.id, contextHref\)/.test(page),
    "8 …and its own links carry it onward instead of resetting to the archive index");
  ok(/arrivalSourceHref\(from, pair\.sys, pair\.e\)/.test(page),
    "8 the source link is the address the visitor arrived from, not one rebuilt from the source id");
  ok(!/archiveHref\(arrival\.source\.id/.test(page),
    "8 …which is what made the source point back at itself before reaching the search");

  const searchFromB = "/codex/archive?q=silver";
  const A_ID2 = correspondenceEntryId(codex.find((r) => r.sys === "COLORS" && r.e === "Silver"));
  const aAddr = A.archiveHref(A_ID2, searchFromB);
  const generated = A.arrivalSourceHref(aAddr, "CRYSTALS", "MOONSTONE");
  ok(generated === aAddr, "8 on record B the generated source link IS record A's address, unchanged");
  const genParams = new URLSearchParams(generated.split("?")[1]);
  ok(genParams.get("entry") === A_ID2, "8 …it names record A");
  ok(genParams.get("from") === searchFromB, "8 …and its return target is the original search, not record A");
  const faulty = A.archiveHref(A_ID2, aAddr);
  ok(faulty !== generated && faulty.includes(encodeURIComponent(aAddr)),
    "8 the rebuilt construction is self-referential, which is why it was wrong");
  ok(A.arrivalSourceHref("/codex/archive?q=silver", "CRYSTALS", "MOONSTONE") === null,
    "8 a search address is not a source address");

  const searchFrom = "/codex/archive?q=aleph";
  const A_ID = correspondenceEntryId(codex.find((r) => r.sys === "LETTERS_HEBREW" && r.e === "Aleph"));
  const aSelf = A.archiveHref(A_ID, searchFrom);
  ok(aSelf.includes(encodeURIComponent(searchFrom)), "8 record A's own address carries the search");
  const bLink = A.archiveHref(A_ID, aSelf);
  ok(bLink.includes(encodeURIComponent(aSelf)), "8 the link from A carries A's address onward");
  const atA = A.arrivalContext(aSelf, "LETTERS_HEBREW", "Aleph");
  ok(atA === null, "8 A never claims to have arrived from itself");
  ok(new URLSearchParams(aSelf.split("?")[1]).get("from") === searchFrom,
    "8 …and A's return target is still the search results");
}

/* ── 9. imagery ─────────────────────────────────────────────────────────── */
console.log("\n  9. imagery");
{
  const presented = code("src/app/codex/page.tsx");
  const card = code("src/components/codex/CodexVideoCard.tsx");
  ok(!/images\.squarespace-cdn\.com/.test(presented), "9 the presented page fetches no imagery from an external CDN");
  ok(!/unoptimized/.test(presented), "9 …and serves its plates through the optimiser");
  ok(/codex-hero-plates/.test(presented), "9 the manuscript opens on its own plates");
  ok(/\/codex\/book\//.test(presented), "9 …from files this site serves");
  ok(/\/codex\/video\/\$\{youtubeId\}\.jpg/.test(card), "9 each video gate shows its own still, served locally");
  ok(!/ytimg|youtube\.com\/vi/.test(card), "9 …without asking a third party for a picture");
  ok(/data-video-still=/.test(card), "9 …and the stills are addressable for verification");
  for (const f of ["vol1-cover.jpg", "spread-02.jpg", "spread-03.jpg", "spread-06.jpg", "spread-146.jpg"]) {
    ok(fs.existsSync(path.join(ROOT, "public/codex/book", f)), `9 the book plate ${f} is served locally`);
  }
  const vids = ["ECAFuxZpyK0","vC_UYkb3l0c","gSqdxDWO278","Owi-ooswzMM","BbO1VgyZq9M","au9mPzB1dVM",
                "N0p65Q3dz4Y","figkoXZA7i8","atXSIFfr8KY","0ipNIO02Y3Y","E1yhN3FueSs","VoDB_OWbaNs","r7nvYvklpYE"];
  let stills = 0;
  for (const v of vids) if (fs.existsSync(path.join(ROOT, `public/codex/video/${v}.jpg`))) stills += 1;
  ok(stills === vids.length, `9 all ${stills} video stills are served locally`);
  ok(!/<iframe/.test(presented), "9 and no player is mounted until one is asked for");
  ok(/\{r\.kind === "Guided path" \? "Follow" : "Read"\} \{r\.title\}/.test(pageCode),
    "9 onward routes are written for a visitor to act on — Read <room>, Follow <path>");
  ok(/Read Linguistics/.test(pageCode) === false, "9 …and the wording is produced from the registry, not typed per route");
  ok(!/reported rather than invented/.test(pageCode),
    "9 …with the registry mechanics left in the implementation, not explained on the page");
}

/* ── 10. the priorities the site leads with ─────────────────────────────── */
console.log("\n  10. priorities");
{
  const home = code("src/app/page.tsx");
  const nav = code("src/components/ui/Navigation.tsx");
  const codex = code("src/app/codex/page.tsx");
  const { getProduct } = require(path.join(ROOT, "src/data/products.ts"));
  const physical = getProduct("universal-transmissions-codex-vol1-physical");
  const digital = getProduct("universal-transmissions-codex-vol1-digital");

  /* the opening offers the art and the book first */
  ok(/href="\/codex"[\s\S]{0,80}DISCOVER THE CODEX/.test(home), "10 the opening action is DISCOVER THE CODEX");
  ok(/href="\/gallery"[\s\S]{0,80}ENTER THE GALLERY/.test(home), "10 …and ENTER THE GALLERY");
  ok(!/ENTER THE ARCHIVE/.test(home), "10 the archive is no longer the primary action");
  ok(/ut-hero-secondary[\s\S]{0,400}\/codex\/archive/.test(home),
    "10 the archive stays reachable as a secondary invitation");
  ok(/artistic project of Hakan Hisim/.test(home), "10 the opening introduces it as Hakan's artistic project");

  /* the book leads, with its real cover, and the archive is named for what it is */
  ok(/name: "The Codex"[\s\S]{0,220}href: "\/codex"/.test(home),
    "10 a door named The Codex opens the book");
  ok(/name: "Correspondence Archive"[\s\S]{0,260}href: "\/codex\/archive"/.test(home),
    "10 the archive door is named Correspondence Archive");
  ok(!/name: "The Codex"[\s\S]{0,220}href: "\/codex\/archive"/.test(home),
    "10 …and nothing called The Codex opens the database");
  ok(/ut-book-grid/.test(home) && /\/codex\/book\/vol1-cover\.jpg/.test(home),
    "10 the book has a composed section using its real cover");
  ok(/\/codex\/book\/spread-06\.jpg/.test(home), "10 …and a spread");

  /* acquisition reaches the product, with the registry's own figures */
  ok(Boolean(physical && digital), "10 both editions exist in the products registry");
  ok(new RegExp(`/sanctum/\\$\\{codexPhysical\\.slug\\}`).test(home),
    "10 the homepage acquires the physical edition by its registered slug");
  ok(new RegExp(`data-acquire="codex-physical"`).test(home), "10 …and marks it for verification");
  ok(new RegExp(`/sanctum/\\$\\{physical!\\.slug\\}`).test(codex),
    "10 the Codex page acquires the same product");
  ok(!/href="\/sanctum"[^>]*>\s*Acquire/.test(codex), "10 no acquisition button stops at the shop index");
  ok(/\$\{physical\?\.available \? ` — \$\$\{physical\.price\}` : ""\}/.test(codex) ||
     /physical\.price/.test(codex),
    "10 the price shown comes from the registry, not typed here");

  /* EVERY edition action, wherever it appears, reaches its product - the closing section on
     /codex kept a bare /sanctum link for the digital edition long after the others were fixed. */
  const bareAcquire = [];
  for (const rel of ["src/app/page.tsx", "src/app/codex/page.tsx"]) {
    const body = code(rel);
    const re = /href="\/sanctum"([^>]*)>([\s\S]{0,90}?)<\/Link>/g;
    let m;
    while ((m = re.exec(body))) {
      if (/acqui|edition|purchase|buy/i.test(m[2])) bareAcquire.push(`${rel}: ${m[2].replace(/\s+/g, " ").trim().slice(0, 40)}`);
    }
  }
  ok(bareAcquire.length === 0, `10 no edition action stops at the shop index (${bareAcquire.join(" | ") || "none"})`);
  const physicalActions = (codex.match(/data-acquire="codex-physical"/g) || []).length;
  const digitalActions = (codex.match(/data-acquire="codex-digital"/g) || []).length;
  ok(physicalActions === 3 && digitalActions === 2,
    `10 the Codex page's ${physicalActions} physical and ${digitalActions} digital actions are all marked`);
  ok((codex.match(/\/sanctum\/\$\{physical!\.slug\}/g) || []).length === physicalActions,
    "10 …and every physical action uses the registered destination");
  ok((codex.match(/\/sanctum\/\$\{digital!\.slug\}/g) || []).length === digitalActions,
    "10 …as does every digital one");

  /* the shop is in the main navigation, not behind an account */
  ok(/\{ href: "\/sanctum", label: "Shop", ariaLabel: "Sanctum · Shop" \}/.test(nav),
    "10 the shop is a main navigation item, named Sanctum · Shop for assistive technology");
  ok(/aria-label=\{ariaLabel \?\? label\}/.test(nav) && /ariaLabel=\{item\.ariaLabel\}/.test(nav),
    "10 …and the full name is what gets spoken");
  ok(/NAV_ITEMS\.map/.test(nav), "10 it renders on desktop and in the mobile menu alike");
  ok(/@media \(max-width: 1279px\)[\s\S]{0,80}nav-external/.test(read("src/app/globals.css")),
    "10 …with the cross-site links stepping out of the header below 1280 so nothing is clipped");
  ok(/Correspondence Archive/.test(nav), "10 the navigation names the archive for what it is");
  ok(/label: "More"/.test(nav), "10 secondary destinations are grouped to keep the bar readable");
}

/* ── 11. the purchase path ──────────────────────────────────────────────── */
console.log("\n  11. the purchase path");
{
  const { products, getProduct } = require(path.join(ROOT, "src/data/products.ts"));
  const paypal = code("src/app/api/paypal/create-order/route.ts");
  const stripe = code("src/app/api/checkout/route.ts");
  const sanctum = code("src/app/sanctum/[slug]/page.tsx");

  /* both product pages send the product's `id`; both routes must resolve it */
  ok(/productId: p\.id/.test(sanctum), "11 the product page sends the product's id");
  ok(/products\.find\(\(p\) => p\.id === productId\)/.test(stripe),
    "11 the Stripe route resolves by id");
  ok(/products\.find\(\(p\) => p\.id === productId\) \?\? getProduct\(productId\)/.test(paypal),
    "11 …and the PayPal route now does too, accepting a slug as well");

  /* the defect, demonstrated against the registry itself */
  const byId = products.find((p) => p.id === "codex-physical");
  ok(Boolean(byId), "11 the id the page sends resolves to a product");
  ok(getProduct("codex-physical") === undefined,
    "11 …while the slug lookup that used to run here finds nothing — which is the 404");
  ok(getProduct(byId.slug) === byId, "11 and the fallback still resolves a slug");

  /* neither route may invent a figure */
  ok(/Math\.round\(product\.price \* 100\)/.test(paypal) && /item_total/.test(paypal),
    "11 PayPal's item total is the registry price, carried as its own line");
  ok(/Math\.round\(product\.price \* 100\)/.test(stripe), "11 Stripe charges the registry price");
  for (const id of ["codex-physical", "codex-digital"]) {
    const prod = products.find((p) => p.id === id);
    ok(Boolean(prod && prod.price > 0 && prod.available), `11 ${id} is priced and available at ${prod && prod.price}`);
  }

  /* every edition action on the pages reaches a real product */
  const all = code("src/app/page.tsx")
    + code("src/app/codex/page.tsx");
  const slugs = [...all.matchAll(/sanctum\/\$\{(physical|digital)!\.slug\}/g)].map((m) => m[1]);
  ok(slugs.length >= 5, `11 ${slugs.length} edition actions are registry-derived`);
  for (const which of ["physical", "digital"]) {
    ok(!new RegExp(`href="/sanctum"([^>]*)>[^<]*${which === "physical" ? "Physical" : "Digital"}`).test(all),
      `11 no ${which} edition action stops at the shop index`);
  }
}

console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
for (const m of failures) console.log("   - " + m);
process.exit(fail ? 1 : 0);
