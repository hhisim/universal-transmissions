/**
 * codex-archive.ts — the correspondence archive as an explorable graph.
 *
 * This module adds NO corpus. It indexes the existing `src/data/codex-raw.json`
 * (824 records, read through the existing `src/lib/codex-data.ts`) and answers two
 * questions about a selected record: which other Codex records does this one actually
 * name, and which other records carry the same recorded correspondence.
 *
 * Identity is the existing one: a record is the pair (sys, e), and its public
 * identifier is `correspondenceEntryId` from `oracle-entry-resolver.ts` — the same
 * identifier the Oracle already resolves server-side. Nothing here invents an id.
 *
 * EPISTEMIC HONESTY. Every value in this file comes from UT's own correspondence
 * corpus. That is a statement about where the data comes from, not about whether the
 * correspondence is true of the world. Each field therefore carries a `basis` that
 * says what KIND of claim the vocabulary is, and no field is ever presented as an
 * empirical measurement:
 *
 *   recorded       the archive states it; this is the record's own content
 *   traditional    the vocabulary is drawn from an established esoteric system
 *   interpretation UT's own synthesis, with no external system standing behind it
 *
 * A field like `fr` ("396 Hz — Liberation") reads like a measurement. In this corpus
 * it is a recorded symbolic correspondence, and the UI says so rather than implying
 * anyone measured it.
 */

import { codex, type CodexEntry } from "@/lib/codex-data";
import { FORORDER } from "@/lib/correspondence-systems";
import { correspondenceEntryId } from "@/lib/oracle-entry-resolver";
import { CONNECTIONS_BY_TOPIC } from "@/lib/research-connections";
import { RESEARCH_DOMAINS } from "@/lib/research-topics";

export type Basis = "recorded" | "traditional" | "interpretation";

export const BASIS_LABEL: Record<Basis, string> = {
  recorded: "Recorded in the Codex corpus",
  traditional: "Vocabulary from an established tradition",
  interpretation: "UT symbolic interpretation",
};

export const BASIS_NOTE: Record<Basis, string> = {
  recorded:
    "The archive records this correspondence as part of the entry itself. It is the record's own content, not a claim about the world.",
  traditional:
    "The vocabulary belongs to an established esoteric system. That the archive places THIS entry in that system is its own arrangement, not a canonical ruling of the tradition.",
  interpretation:
    "This is UT's own symbolic mapping. No external system is being cited, and nothing here is measured or verified.",
};

/** Field → honest basis. Fields absent here are treated as `recorded`. */
const FIELD_BASIS: Record<string, Basis> = {
  // Established esoteric vocabularies.
  al: "traditional", ar: "traditional", cr: "traditional", de: "traditional",
  el: "traditional", gm: "traditional", ge: "traditional", ic: "traditional",
  ka: "traditional", lh: "traditional", ll: "traditional", ma: "traditional",
  me: "traditional", mi: "traditional", my: "traditional", nu: "traditional",
  pl: "traditional", ps: "traditional", pt: "traditional", zo: "traditional",
  // UT's own synthesis.
  ch: "interpretation", co: "interpretation", fr: "interpretation",
  no: "interpretation", ph: "interpretation", vi: "interpretation",
  vr: "interpretation",
};

export const FIELD_LABELS: Record<string, string> = {
  al: "Alchemy", ar: "Archetypes", co: "Colors", cr: "Crystals",
  de: "Deities", el: "Elements", fr: "Frequency", gm: "Geomancy",
  ge: "Geometry", ic: "I Ching", ka: "Kabbalah", lh: "Hebrew",
  ll: "Latin", ma: "Major Arcana", my: "Mayan", me: "Metals",
  mi: "Minor Arcana", no: "Note", nu: "Number", ph: "Physiology",
  pl: "Planets", pt: "Plants", ps: "Platonic Solid", vi: "Vices",
  vr: "Virtues", zo: "Zodiac", ch: "Chakras",
};

/** Display order, taken from the corpus's own field order. */
export const ARCHIVE_FIELDS = FORORDER.filter(
  (k) => k !== "sys" && k !== "e" && FIELD_LABELS[k]
) as string[];

/** Fields whose value can read as a measurement. Flagged so the UI can say otherwise. */
export const MEASURED_LOOKING = new Set(["fr", "ph"]);

const norm = (s: string) =>
  s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();

/** A value like "Ares [Greek]; Sekhmet [Egyptian]" is several names. */
const parts = (value: string) =>
  value.split(";").map((p) => p.trim()).filter(Boolean);

/** Strip a bracketed qualifier and trailing descriptors: "Geburah (Severity)" → "geburah". */
const bareName = (s: string) =>
  norm(s.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").replace(/^[^A-Za-z0-9]+/, ""));

export interface ArchiveRecord {
  sys: string;
  e: string;
  id: string;
  href: string;
  fields: Array<{ key: string; label: string; value: string; basis: Basis }>;
}

export interface Relationship {
  /** `names` — this record's value IS another Codex record.
   *  `shares` — another record carries the same recorded correspondence. */
  kind: "names" | "shares";
  field: string;
  fieldLabel: string;
  value: string;
  basis: Basis;
  /** Why the two records connect, in plain language. */
  rationale: string;
  target: { sys: string; e: string; id: string; href: string; label: string };
}

export function archiveHref(id: string, from?: string) {
  const base = `/codex/archive?entry=${encodeURIComponent(id)}`;
  return from ? `${base}&from=${encodeURIComponent(from)}` : base;
}

const DISPLAY_FIELDS = ARCHIVE_FIELDS;

/* ── indexes, built once per server process ────────────────────────────── */

const NAME_INDEX = new Map<string, Array<{ sys: string; e: string }>>();
const VALUE_INDEX = new Map<string, Array<{ sys: string; e: string }>>();
const PAIR_INDEX = new Map<string, CodexEntry>();

for (const entry of codex) {
  const sys = String(entry.sys || "");
  const e = String(entry.e || "");
  if (!sys || !e) continue;
  PAIR_INDEX.set(`${sys}\u0000${e}`, entry);
  const nameKey = bareName(e);
  if (nameKey) {
    const arr = NAME_INDEX.get(nameKey) || [];
    arr.push({ sys, e });
    NAME_INDEX.set(nameKey, arr);
  }
  for (const key of DISPLAY_FIELDS) {
    const value = (entry as unknown as Record<string, unknown>)[key];
    if (typeof value !== "string" || !value.trim()) continue;
    for (const p of parts(value)) {
      const k = `${key}\u0000${bareName(p)}`;
      if (!k.endsWith("\u0000")) {
        const arr = VALUE_INDEX.get(k) || [];
        arr.push({ sys, e });
        VALUE_INDEX.set(k, arr);
      }
    }
  }
}

export function findRecord(sys: string, e: string): CodexEntry | undefined {
  return PAIR_INDEX.get(`${sys}\u0000${e}`);
}

export function recordFromId(id: string): { sys: string; e: string } | null {
  const PREFIX = "corr-v1:";
  if (!id.startsWith(PREFIX)) return null;
  const raw = id.slice(PREFIX.length);
  const at = raw.indexOf("::");
  if (at <= 0) return null;
  try {
    const sys = decodeURIComponent(raw.slice(0, at));
    const e = decodeURIComponent(raw.slice(at + 2));
    if (!sys || !e) return null;
    return findRecord(sys, e) ? { sys, e } : null;
  } catch {
    return null;
  }
}

export function toArchiveRecord(entry: CodexEntry): ArchiveRecord {
  const sys = String(entry.sys || "");
  const e = String(entry.e || "");
  const fields = DISPLAY_FIELDS.map((key) => {
    const raw = (entry as unknown as Record<string, unknown>)[key];
    if (typeof raw !== "string" || !raw.trim()) return null;
    return { key, label: FIELD_LABELS[key] || key.toUpperCase(), value: raw.trim(),
             basis: FIELD_BASIS[key] || "recorded" };
  }).filter(Boolean) as ArchiveRecord["fields"];
  return { sys, e, id: correspondenceEntryId(entry), href: archiveHref(correspondenceEntryId(entry)), fields };
}

/** How many recorded correspondence values a record carries, across all systems. */
export function connectionCount(entry: CodexEntry): number {
  let n = 0;
  for (const key of DISPLAY_FIELDS) {
    const raw = (entry as unknown as Record<string, unknown>)[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    n += parts(raw).length;
  }
  return n;
}

/* ── onward routes, DERIVED from the research registry ───────────────────
 * The research rooms document the Codex lattices themselves: the Cymatics room
 * carries a connection with anchorSlug `codex-frequency-lattice` and the Geometry
 * room carries `codex-geometry-lattice`, both with basis "documented" and the label
 * "Catalogued in the archive's own <SYSTEM> lattice".
 *
 * So the route from a Codex system to a research room is READ from that registry
 * rather than restated here: the anchor slug is `codex-<system>-lattice`, and the
 * system it names is matched against the record's own `sys`. Adding or removing a
 * Codex anchor in the registry changes this automatically, and a system with no
 * anchor gets no route at all — which is the honest outcome, since a route that no
 * existing record supports is exactly what must not be manufactured.
 */
const CODEX_ANCHOR = /^codex-([a-z0-9]+)-lattice$/i;

const RESEARCH_ROUTES: Record<string, { href: string; room: string; why: string }> = (() => {
  const out: Record<string, { href: string; room: string; why: string }> = {};
  for (const [topicId, connections] of Object.entries(CONNECTIONS_BY_TOPIC)) {
    for (const c of connections) {
      const m = CODEX_ANCHOR.exec(c.anchorSlug || "");
      if (!m) continue;
      const domain = RESEARCH_DOMAINS.find((d) => d.slug === topicId);
      if (!domain) continue;
      out[m[1].toUpperCase()] = {
        href: `/research/${topicId}`,
        room: domain.title,
        why: c.rationale || "",
      };
    }
  }
  return out;
})();

/** The research room that documents this Codex system, or null when none does. */
export function researchRouteForSystem(sys: string) {
  return RESEARCH_ROUTES[String(sys).toUpperCase()] || null;
}

/** Every system that currently has a documented research room. */
export const SYSTEMS_WITH_RESEARCH_ROUTE = Object.keys(RESEARCH_ROUTES).sort();

/** All 27 systems present in the corpus, with their record counts. */
export const SYSTEMS: Array<{ sys: string; count: number }> = (() => {
  const counts = new Map<string, number>();
  for (const entry of codex) {
    const sys = String(entry.sys || "");
    if (!sys) continue;
    counts.set(sys, (counts.get(sys) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([sys, count]) => ({ sys, count }))
    .sort((a, b) => b.count - a.count || a.sys.localeCompare(b.sys));
})();

export function recordsInSystem(sys: string): Array<{ sys: string; e: string; id: string }> {
  const out: Array<{ sys: string; e: string; id: string }> = [];
  for (const entry of codex) {
    if (String(entry.sys || "") !== sys) continue;
    out.push({ sys, e: String(entry.e || ""), id: correspondenceEntryId(entry) });
  }
  return out.sort((a, b) => a.e.localeCompare(b.e));
}

/**
 * Relationships grouped by the SYSTEM they lead into.
 *
 * Every record in this corpus names a great many others — a single Deities value can name
 * three records, and the corpus holds 202 deities — so a flat list of named records is not
 * a usable map of anything. Grouping by target system is what makes the reach legible:
 * "this record touches Geometry, Planets and Tarot" is information; 340 links are not.
 * Each group shows a bounded number of examples and the honest total.
 */
export interface SystemLinkGroup {
  sys: string;
  count: number;
  basis: Basis;
  basisLabel: string;
  examples: Relationship[];
}

const _groupCache = new Map<string, SystemLinkGroup[]>();

export function relationshipSystems(sys: string, e: string, perSystem = 2): SystemLinkGroup[] {
  const key = `${sys}\u0000${e}`;
  const hit = _groupCache.get(key);
  if (hit) return hit;
  const bySys = new Map<string, Relationship[]>();
  for (const r of relationshipsFor(sys, e)) {
    if (r.kind !== "names") continue;
    const arr = bySys.get(r.target.sys) || [];
    arr.push(r);
    bySys.set(r.target.sys, arr);
  }
  const groups = Array.from(bySys.entries())
    .map(([targetSys, items]) => ({
      sys: targetSys,
      count: items.length,
      basis: items[0].basis,
      basisLabel: BASIS_LABEL[items[0].basis],
      examples: items.slice(0, perSystem),
    }))
    .sort((a, b) => b.count - a.count || a.sys.localeCompare(b.sys));
  _groupCache.set(key, groups);
  return groups;
}

/** How many DIFFERENT systems this record's own values reach into. */
export function systemsReached(sys: string, e: string): number {
  return relationshipSystems(sys, e).length;
}

/**
 * A small representative set, DERIVED rather than hand-picked: for each system, the record
 * whose own values reach into the most DIFFERENT systems, then the widest of those overall.
 *
 * The measure is breadth of reach, not volume of links. Volume is near-useless here — every
 * record names forty or more others, and ranking by that surfaces the degenerate hubs (a
 * crystal named in hundreds of records, the note "A") whose pages open onto a list that
 * tells a visitor nothing. Breadth picks records that visibly connect distant parts of the
 * archive, which is what an explorable entry point should be.
 */
let _repCache: Array<{ sys: string; e: string; id: string; reaches: number }> | null = null;

function computeRepresentative() {
  const best = new Map<string, { sys: string; e: string; id: string; reaches: number }>();
  for (const entry of codex) {
    const s = String(entry.sys || "");
    const en = String(entry.e || "");
    if (!s || !en) continue;
    const reaches = systemsReached(s, en);
    const cur = best.get(s);
    if (!cur || reaches > cur.reaches) {
      best.set(s, { sys: s, e: en, id: correspondenceEntryId(entry), reaches });
    }
  }
  return Array.from(best.values())
    .filter((x) => x.reaches >= 4)
    .sort((a, b) => b.reaches - a.reaches || a.sys.localeCompare(b.sys));
}

export function representativeSet(limit = 8) {
  if (!_repCache) _repCache = computeRepresentative();
  return _repCache.slice(0, limit);
}

/** The record for a (sys, e) pair, fully populated, or null when the pair is not in the corpus.
 *  This exists because the fields must come from the ACTUAL entry: building a partial
 *  { sys, e } object and casting it yields a record with no content at all, which renders
 *  as a heading with nothing under it. */
export function archiveRecordFor(sys: string, e: string): ArchiveRecord | null {
  const entry = findRecord(sys, e);
  return entry ? toArchiveRecord(entry) : null;
}

export function relationshipsFor(sys: string, e: string): Relationship[] {
  const entry = findRecord(sys, e);
  if (!entry) return [];
  const out: Relationship[] = [];
  const selfId = correspondenceEntryId(entry);

  for (const key of DISPLAY_FIELDS) {
    const raw = (entry as unknown as Record<string, unknown>)[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const basis = FIELD_BASIS[key] || "recorded";
    const label = FIELD_LABELS[key] || key.toUpperCase();

    for (const p of parts(raw)) {
      const bare = bareName(p);
      if (!bare) continue;

      // 1. the value names another record
      const named = (NAME_INDEX.get(bare) || []).filter(
        (t) => !(t.sys === sys && t.e === e)
      );
      for (const t of named.slice(0, 3)) {
        const tEntry = PAIR_INDEX.get(`${t.sys}\u0000${t.e}`);
        if (!tEntry) continue;
        const tId = correspondenceEntryId(tEntry);
        if (tId === selfId) continue;
        out.push({
          kind: "names", field: key, fieldLabel: label, value: p, basis,
          rationale: `This record's ${label} field names “${p}”, which is itself a Codex record in ${t.sys}.`,
          target: { sys: t.sys, e: t.e, id: tId, href: archiveHref(tId), label: t.e },
        });
      }
    }
  }
  return out;
}

/** Other records carrying the same recorded correspondence, with the honest total. */
export function sharedWith(
  sys: string, e: string, limit = 6
): Array<{ field: string; fieldLabel: string; value: string; basis: Basis; rationale: string;
           total: number; others: Array<{ sys: string; e: string; id: string; href: string }> }> {
  const entry = findRecord(sys, e);
  if (!entry) return [];
  const out: ReturnType<typeof sharedWith> = [];
  for (const key of DISPLAY_FIELDS) {
    const raw = (entry as unknown as Record<string, unknown>)[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const basis = FIELD_BASIS[key] || "recorded";
    const label = FIELD_LABELS[key] || key.toUpperCase();
    for (const p of parts(raw)) {
      const bare = bareName(p);
      if (!bare) continue;
      const all = VALUE_INDEX.get(`${key}\u0000${bare}`) || [];
      const others = all.filter((t) => !(t.sys === sys && t.e === e));
      if (!others.length) continue;
      out.push({
        field: key, fieldLabel: label, value: p, basis,
        rationale: `${others.length} other Codex ${others.length === 1 ? "record carries" : "records carry"} the same recorded ${label} correspondence.`,
        total: others.length,
        others: others.slice(0, limit).map((t) => {
          const tEntry = PAIR_INDEX.get(`${t.sys}\u0000${t.e}`)!;
          const id = correspondenceEntryId(tEntry);
          return { sys: t.sys, e: t.e, id, href: archiveHref(id) };
        }),
      });
    }
  }
  return out;
}
