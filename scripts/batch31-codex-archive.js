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
  ok(A.searchArchive("a").nameTotal === 0, "3 a one-letter query is refused rather than matching the corpus");
  ok(A.searchArchive("").nameTotal === 0 && A.searchArchive("   ").nameTotal === 0, "3 an empty query searches for nothing");
  const many = A.searchArchive("e");
  ok(many.nameTotal >= many.names.length, "3 a broad term reports its true total and truncates the list");
  ok(many.names.length <= 60, "3 …and the list stays bounded");
}

/* ── 4. where the visitor arrived from ────────────────────────────────────── */
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

console.log("\n  assertions passed: " + pass + "   assertions failed: " + fail);
for (const m of failures) console.log("   - " + m);
process.exit(fail ? 1 : 0);
