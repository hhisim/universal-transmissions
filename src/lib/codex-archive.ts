/**
 * codex-archive.ts — the correspondence archive as an explorable graph.
 *
 * This module adds NO corpus. It indexes the existing `src/data/codex-raw.json` (820 records
 * with a (sys, e) identity, read through the existing `src/lib/codex-data.ts`) and answers:
 * which other Codex records does this one actually name, and which other records carry the
 * same recorded correspondence.
 *
 * ── IDENTITY DISCIPLINE ──────────────────────────────────────────────────────────────
 * A correspondence value is resolved INSIDE THE SYSTEM ITS OWN FIELD NAMES. This is the
 * whole point, because several record names exist in more than one system:
 *
 *     "Silver" and "Gold" are records in BOTH COLORS and METALS
 *     "A" "B" "C" are records in BOTH NOTES and LETTERS_LATIN
 *
 * A global name lookup therefore turns a METALS value "Silver" into a relationship with the
 * COLOUR Silver, and a NOTES value "B" into the Latin letter B. `FIELD_SYSTEM` below is the
 * explicit, reviewable mapping that prevents it, and it is the only place that mapping lives.
 *
 * Values are resolved by two documented normalisation rules, applied in order. No
 * hand-written alias table is used, because measurement showed the data does not need one —
 * scoped to the right system, 26 of 27 fields resolve exactly for essentially every value.
 *
 *   rule 1  a leading ordinal is stripped        "8. Sublimation"  →  "Sublimation"
 *   rule 2  a bracketed/parenthesised qualifier is stripped for MATCHING only
 *                                                "Ares [Greek]"    →  matches "Ares"
 *
 * Rule 2 runs only when the exact form does not resolve, and only when it lands on exactly
 * ONE record. When it lands on several the value is reported AMBIGUOUS and gets no link:
 * "Aphrodite" matches both "Aphrodite [Greek]" and "Aphrodite [Other]", and choosing one
 * would be an invention. A value that resolves to nothing stays readable as text.
 *
 * What the visitor sees is always the archive's own wording — qualifiers intact — and a
 * resolved link carries the target record's own name.
 *
 * ── EPISTEMIC HONESTY ────────────────────────────────────────────────────────────────
 * Every value here comes from UT's own correspondence corpus. That says where the data comes
 * from, not whether a correspondence is true of the world. Each field carries a `basis`
 * describing what KIND of claim its vocabulary is, and no field is presented as an empirical
 * measurement.
 */

import { codex, type CodexEntry } from "@/lib/codex-data";
import { FORORDER } from "@/lib/correspondence-systems";
import { GUIDED_PATHS } from "@/lib/guided-paths";
import { CORPUS_SUMMARY } from "@/lib/corpus-summary";
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
    "The archive records this as part of the entry itself: the record's own content.",
  traditional:
    "The vocabulary belongs to an established esoteric system. Placing this entry in that system is the archive's own arrangement.",
  interpretation:
    "This is UT's own symbolic mapping, carried in the archive's correspondence lattice.",
};

/** Field → honest basis. Fields absent here are treated as `recorded`. */
const FIELD_BASIS: Record<string, Basis> = {
  al: "traditional", ar: "traditional", cr: "traditional", de: "traditional",
  el: "traditional", gm: "traditional", ge: "traditional", ic: "traditional",
  ka: "traditional", lh: "traditional", ll: "traditional", ma: "traditional",
  me: "traditional", mi: "traditional", my: "traditional", nu: "traditional",
  pl: "traditional", ps: "traditional", pt: "traditional", zo: "traditional",
  ch: "interpretation", co: "interpretation", fr: "interpretation",
  no: "interpretation", ph: "interpretation", vi: "interpretation",
  vr: "interpretation",
};

/**
 * THE IDENTITY MAP — which system a field's values name.
 *
 * Explicit and reviewable, and the single source of the scoping rule. Every value of `me` is
 * resolved against METALS and nothing else; every value of `no` against NOTES and nothing
 * else. Two fields never name the same system, so a relationship group is also a field and
 * carries that field's basis.
 */
export const FIELD_SYSTEM: Record<string, string> = {
  al: "ALCHEMY", ar: "ARCHETYPES", ch: "CHAKRAS", co: "COLORS", cr: "CRYSTALS",
  de: "DEITIES", el: "ELEMENTS", fr: "FREQUENCY", gm: "GEOMANCY", ge: "GEOMETRY",
  ic: "I_CHING", ka: "KABBALAH", lh: "LETTERS_HEBREW", ll: "LETTERS_LATIN",
  ma: "MAJOR_ARCANA", my: "MAYAN", me: "METALS", mi: "MINOR_ARCANA",
  no: "NOTES", nu: "NUMBERS", ph: "PHYSIOLOGY", pl: "PLANETS", pt: "PLANTS",
  ps: "PLATONIC_SOLIDS", vi: "VICES", vr: "VIRTUES", zo: "ZODIAC",
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
const parts = (value: string) => value.split(";").map((p) => p.trim()).filter(Boolean);

/** RULE 1 — strip a leading ordinal: "8. Sublimation" → "Sublimation". */
const stripOrdinal = (s: string) => norm(s.replace(/^\s*\d+\s*[.):]\s*/, ""));

/** RULE 2 (matching only) — strip bracketed/parenthesised qualifiers. */
const stripQualifier = (s: string) =>
  norm(s.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").replace(/^[^A-Za-z0-9♯♭]+/, ""));

export interface ArchiveRecord {
  sys: string;
  e: string;
  id: string;
  href: string;
  fields: Array<{ key: string; label: string; value: string; basis: Basis }>;
}

export interface RelLink {
  /** The archive's own wording for the value, qualifiers intact. */
  value: string;
  field: string;
  fieldLabel: string;
  basis: Basis;
  basisLabel: string;
  target: { sys: string; e: string; id: string };
}

/** A value that names records in the field's own system but cannot be pinned to one. */
export interface AmbiguousValue { value: string; candidates: string[]; fieldLabel: string }

/** One target system, with its complete de-duplicated total computed before any limit. */
export interface RelGroup {
  sys: string;
  /** UNIQUE target records, counted before limiting. */
  total: number;
  /** Every basis present in this group, computed rather than taken from the first item. */
  bases: Basis[];
  examples: RelLink[];
}

export function archiveHref(id: string, from?: string) {
  const base = `/codex/archive?entry=${encodeURIComponent(id)}`;
  return from ? `${base}&from=${encodeURIComponent(from)}` : base;
}

export function systemHref(sys: string) {
  return `/codex/archive?system=${encodeURIComponent(sys)}`;
}

/* ── indexes, built once per server process ────────────────────────────── */

/** system → normalised key → the record names that key resolves to (for ambiguity). */
const SYS_INDEX = new Map<string, Map<string, string[]>>();
const PAIR_INDEX = new Map<string, CodexEntry>();
/** field → normalised value → unique records carrying it (shared correspondence). */
const VALUE_INDEX = new Map<string, Array<{ sys: string; e: string; id: string }>>();

for (const entry of codex) {
  const sys = String(entry.sys || "");
  const e = String(entry.e || "");
  if (!sys || !e) continue;
  PAIR_INDEX.set(`${sys}\u0000${e}`, entry);

  let byKey = SYS_INDEX.get(sys);
  if (!byKey) { byKey = new Map(); SYS_INDEX.set(sys, byKey); }
  for (const key of Array.from(new Set([norm(e), stripOrdinal(e), stripQualifier(e)]))) {
    if (!key) continue;
    const arr = byKey.get(key) || [];
    if (!arr.includes(e)) arr.push(e);
    byKey.set(key, arr);
  }

  const id = correspondenceEntryId(entry);
  for (const field of ARCHIVE_FIELDS) {
    const raw = (entry as unknown as Record<string, unknown>)[field];
    if (typeof raw !== "string" || !raw.trim()) continue;
    for (const p of parts(raw)) {
      const key = `${field}\u0000${stripOrdinal(p)}`;
      if (key.endsWith("\u0000")) continue;
      const arr = VALUE_INDEX.get(key) || [];
      if (!arr.some((x) => x.id === id)) arr.push({ sys, e, id });
      VALUE_INDEX.set(key, arr);
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
  const fields = ARCHIVE_FIELDS.map((key) => {
    const raw = (entry as unknown as Record<string, unknown>)[key];
    if (typeof raw !== "string" || !raw.trim()) return null;
    return { key, label: FIELD_LABELS[key] || key.toUpperCase(), value: raw.trim(),
             basis: FIELD_BASIS[key] || "recorded" };
  }).filter(Boolean) as ArchiveRecord["fields"];
  return { sys, e, id: correspondenceEntryId(entry), href: archiveHref(correspondenceEntryId(entry)), fields };
}

/** The record for a (sys, e) pair, fully populated, or null when the pair is not in the
 *  corpus. The fields must come from the ACTUAL entry — synthesising a partial { sys, e }
 *  object yields a record with no content, which renders as a heading over nothing. */
export function archiveRecordFor(sys: string, e: string): ArchiveRecord | null {
  const entry = findRecord(sys, e);
  return entry ? toArchiveRecord(entry) : null;
}

/* ── resolution ─────────────────────────────────────────────────────────── */

export type Resolution =
  | { state: "resolved"; target: string }
  | { state: "ambiguous"; candidates: string[] }
  | { state: "unresolved" };

/** Resolve one value inside the system its field names. Never searches another system. */
export function resolveValue(field: string, raw: string): Resolution {
  const sys = FIELD_SYSTEM[field];
  if (!sys) return { state: "unresolved" };
  const byKey = SYS_INDEX.get(sys);
  if (!byKey) return { state: "unresolved" };

  for (const key of [norm(raw), stripOrdinal(raw), stripQualifier(raw)]) {
    const hit = byKey.get(key);
    if (!hit || !hit.length) continue;
    if (hit.length === 1) return { state: "resolved", target: hit[0] };
    return { state: "ambiguous", candidates: hit };
  }
  return { state: "unresolved" };
}

/**
 * The record's outgoing relationships, grouped by the system they lead into.
 *
 * Totals are UNIQUE record identities counted BEFORE any display limit, so "24 records in
 * Planets" means 24 distinct records even when the same one is named twice.
 */
export function relationshipGroups(
  sys: string, e: string, perGroup = 3
): { groups: RelGroup[]; unresolved: Array<{ value: string; fieldLabel: string }>; ambiguous: AmbiguousValue[] } {
  const entry = findRecord(sys, e);
  const groups: RelGroup[] = [];
  const unresolved: Array<{ value: string; fieldLabel: string }> = [];
  const ambiguous: AmbiguousValue[] = [];
  if (!entry) return { groups, unresolved, ambiguous };

  const selfId = correspondenceEntryId(entry);
  const bySys = new Map<string, { links: RelLink[]; seen: Set<string>; bases: Set<Basis> }>();

  for (const field of ARCHIVE_FIELDS) {
    const raw = (entry as unknown as Record<string, unknown>)[field];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const basis = FIELD_BASIS[field] || "recorded";
    const label = FIELD_LABELS[field] || field.toUpperCase();
    const targetSys = FIELD_SYSTEM[field];

    for (const p of parts(raw)) {
      const res = resolveValue(field, p);
      if (res.state === "unresolved") { unresolved.push({ value: p, fieldLabel: label }); continue; }
      if (res.state === "ambiguous") {
        ambiguous.push({ value: p, candidates: res.candidates, fieldLabel: label });
        continue;
      }
      const tEntry = PAIR_INDEX.get(`${targetSys}\u0000${res.target}`);
      if (!tEntry) { unresolved.push({ value: p, fieldLabel: label }); continue; }
      const tId = correspondenceEntryId(tEntry);
      if (tId === selfId) continue;

      let bucket = bySys.get(targetSys);
      if (!bucket) { bucket = { links: [], seen: new Set(), bases: new Set() }; bySys.set(targetSys, bucket); }
      if (bucket.seen.has(tId)) continue;                 // deduplicate on stable identity
      bucket.seen.add(tId);
      bucket.bases.add(basis);
      bucket.links.push({
        value: p, field, fieldLabel: label, basis, basisLabel: BASIS_LABEL[basis],
        target: { sys: targetSys, e: res.target, id: tId },
      });
    }
  }

  for (const [targetSys, bucket] of Array.from(bySys.entries())) {
    groups.push({
      sys: targetSys,
      total: bucket.seen.size,                            // complete, de-duplicated, pre-limit
      bases: Array.from(bucket.bases),
      examples: bucket.links.slice(0, perGroup),
    });
  }
  groups.sort((a, b) => b.total - a.total || a.sys.localeCompare(b.sys));
  return { groups, unresolved, ambiguous };
}

/** Other records carrying the same recorded correspondence: de-duplicated, counted first. */
export function sharedWith(sys: string, e: string, limit = 5) {
  const entry = findRecord(sys, e);
  if (!entry) return [];
  const selfId = correspondenceEntryId(entry);
  const out: Array<{
    field: string; fieldLabel: string; value: string; basis: Basis; basisLabel: string;
    total: number; others: Array<{ sys: string; e: string; id: string }>;
  }> = [];
  const emitted = new Set<string>();

  for (const field of ARCHIVE_FIELDS) {
    const raw = (entry as unknown as Record<string, unknown>)[field];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const basis = FIELD_BASIS[field] || "recorded";
    const label = FIELD_LABELS[field] || field.toUpperCase();
    for (const p of parts(raw)) {
      const key = `${field}\u0000${stripOrdinal(p)}`;
      if (emitted.has(key)) continue;                     // one row per (field, value)
      emitted.add(key);
      const all = (VALUE_INDEX.get(key) || []).filter((r) => r.id !== selfId);
      if (!all.length) continue;
      out.push({
        field, fieldLabel: label, value: p, basis, basisLabel: BASIS_LABEL[basis],
        total: all.length,                                 // unique records, before limiting
        others: all.slice(0, limit),
      });
    }
  }
  return out;
}

export function systemsReached(sys: string, e: string): number {
  return relationshipGroups(sys, e, 0).groups.length;
}

/* ── onward routes, DERIVED from the research registry ───────────────────
 * The research rooms document the Codex lattices themselves: the Cymatics room carries a
 * connection with anchorSlug `codex-frequency-lattice` and the Geometry room carries
 * `codex-geometry-lattice`. The route from a Codex system to a research room is READ from
 * that registry rather than restated here, so a system with no anchor gets no route — the
 * honest outcome, since a route no existing record supports must not be manufactured.
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
      out[m[1].toUpperCase()] = { href: `/research/${topicId}`, room: domain.title, why: c.rationale || "" };
    }
  }
  return out;
})();

export function researchRouteForSystem(sys: string) {
  return RESEARCH_ROUTES[String(sys).toUpperCase()] || null;
}

export const SYSTEMS_WITH_RESEARCH_ROUTE = Object.keys(RESEARCH_ROUTES).sort();

/**
 * Every system present in the corpus, with the number of records a visitor can ADDRESS in it.
 *
 * The dataset holds four DEITIES identities twice, so counting source rows would report 824 as
 * though it were 824 distinct records — and would report a system's size one larger than the list
 * of it a visitor is shown. The counts here are distinct identities, which is the same measure
 * CORPUS_SUMMARY publishes.
 */
export const SYSTEMS: Array<{ sys: string; count: number }> = (() => {
  const bySys = new Map<string, Set<string>>();
  for (const entry of codex) {
    const sys = String(entry.sys || "");
    if (!sys) continue;
    let ids = bySys.get(sys);
    if (!ids) { ids = new Set(); bySys.set(sys, ids); }
    ids.add(correspondenceEntryId(entry));
  }
  return Array.from(bySys.entries())
    .map(([sys, ids]) => ({ sys, count: ids.size }))
    .sort((a, b) => b.count - a.count || a.sys.localeCompare(b.sys));
})();

export function isKnownSystem(sys: string): boolean {
  return SYSTEMS.some((s) => s.sys === sys);
}

export function recordsInSystem(sys: string): Array<{ sys: string; e: string; id: string }> {
  const out: Array<{ sys: string; e: string; id: string }> = [];
  const seen = new Set<string>();
  for (const entry of codex) {
    if (String(entry.sys || "") !== sys) continue;
    const id = correspondenceEntryId(entry);
    if (seen.has(id)) continue;                 // one entry per addressable record
    seen.add(id);
    out.push({ sys, e: String(entry.e || ""), id });
  }
  return out.sort((a, b) => a.e.localeCompare(b.e));
}

/**
 * A small representative set, DERIVED not hand-picked: for each system, the record whose
 * values reach into the most DIFFERENT systems, then the widest of those overall.
 *
 * Breadth, not volume. Every record here names forty or more others, so volume measures
 * nothing and ranking by it surfaces the degenerate hubs whose pages tell a visitor nothing.
 */
let _repCache: Array<{ sys: string; e: string; id: string; reaches: number }> | null = null;

export function representativeSet(limit = 8) {
  if (!_repCache) {
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
    _repCache = Array.from(best.values())
      .filter((x) => x.reaches >= 4)
      .sort((a, b) => b.reaches - a.reaches || a.sys.localeCompare(b.sys));
  }
  return _repCache.slice(0, limit);
}

/* ─────────────────────────────────────────────────────────────────────────────
   BATCH 31 — ADDITIVE DERIVATIONS

   Nothing here resolves anything new. Each function reads an index this module already built,
   or a registry that already named the Codex, and reports what it finds. No correspondence is
   inferred, no alias table is introduced, and the resolver above is untouched.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * The routes OTHER registries already draw into this system's archive view.
 *
 * The research registry carries connections whose href is `/codex/archive?system=…`, and the
 * guided paths stop on those same anchors. Both are read here rather than restated, so a system
 * whose view nothing names gets no route — which is the honest result, not an omission.
 */
export interface RegisteredRoute {
  href: string;
  kind: "Research room" | "Guided path";
  title: string;
  why: string;
}

const CODEX_ARCHIVE_HREF = /^\/codex\/archive\?system=([A-Z_]+)$/;

/** anchorSlug → the system its connection points at, read from the research registry. */
const ANCHOR_SYSTEM: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const connections of Object.values(CONNECTIONS_BY_TOPIC)) {
    for (const c of connections) {
      const m = CODEX_ARCHIVE_HREF.exec(c.href || "");
      if (m && c.anchorSlug) out[c.anchorSlug] = m[1];
    }
  }
  return out;
})();

let _inboundCache: Map<string, RegisteredRoute[]> | null = null;

export function registeredRoutesForSystem(sys: string): RegisteredRoute[] {
  if (!_inboundCache) {
    const map = new Map<string, RegisteredRoute[]>();
    const add = (system: string, route: RegisteredRoute) => {
      const arr = map.get(system) || [];
      if (!arr.some((r) => r.href === route.href && r.kind === route.kind)) arr.push(route);
      map.set(system, arr);
    };
    for (const [topicId, connections] of Object.entries(CONNECTIONS_BY_TOPIC)) {
      const domain = RESEARCH_DOMAINS.find((d) => d.slug === topicId);
      for (const c of connections) {
        const m = CODEX_ARCHIVE_HREF.exec(c.href || "");
        if (!m) continue;
        add(m[1], {
          href: `/research/${topicId}`,
          kind: "Research room",
          title: domain ? domain.title : topicId,
          why: c.rationale || "",
        });
      }
    }
    for (const path of GUIDED_PATHS) {
      for (const stop of path.stops) {
        if (!stop.anchor) continue;
        const system = ANCHOR_SYSTEM[stop.anchor];
        if (!system) continue;
        add(system, {
          href: `/paths/${path.slug}`,
          kind: "Guided path",
          title: path.title,
          why: stop.encounter,
        });
      }
    }
    _inboundCache = map;
  }
  return _inboundCache.get(String(sys).toUpperCase()) || [];
}

/** Systems some other registry actually draws a route into. */
export const SYSTEMS_WITH_REGISTERED_ROUTES: string[] = (() => {
  const out: string[] = [];
  for (const s of SYSTEMS) if (registeredRoutesForSystem(s.sys).length) out.push(s.sys);
  return out.sort();
})();

/* ── where the visitor arrived from ─────────────────────────────────────────
   The relationship links already carry `from`, and a record's own href carries the id of the
   record it was read on. That is enough to say where a visitor came from WITHOUT adding a
   parameter that could disagree with the corpus: the source's own fields are re-read here and
   the value that reaches this record is the one reported. If the source does not actually
   reach this record, no context is claimed.
   ───────────────────────────────────────────────────────────────────────── */

export interface Arrival {
  fromHref: string;
  source: { sys: string; e: string; id: string } | null;
  /** Set when the visitor came from a system view rather than from one record. */
  systemView: string | null;
  viaFieldLabel: string | null;
  viaValue: string | null;
}

export function arrivalContext(
  from: string,
  targetSys: string,
  targetE: string
): Arrival | null {
  if (!from) return null;
  /* The PATHNAME must be this page exactly. A prefix test accepts `/codex/archive-not-real`, which
     is not somewhere a visitor can have been browsing, so a claimed arrival from it is refused. */
  const cut = from.search(/[?#]/);
  const pathOnly = cut === -1 ? from : from.slice(0, cut);
  if (pathOnly !== "/codex/archive") return null;

  const query = cut === -1 ? "" : from.slice(cut + 1);
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return null;
  }
  /* A system view only counts when the corpus has that system: an unknown name is not somewhere
     the visitor can have been browsing either. */
  const rawSystem = (params.get("system") || "").trim().toUpperCase();
  const systemView = rawSystem && isKnownSystem(rawSystem) ? rawSystem : null;
  const entryId = params.get("entry");
  if (!entryId) {
    return systemView
      ? { fromHref: from, source: null, systemView, viaFieldLabel: null, viaValue: null }
      : null;
  }
  const pair = recordFromId(entryId);
  if (!pair) return null;
  const source = findRecord(pair.sys, pair.e);
  if (!source) return null;
  const sourceId = correspondenceEntryId(source);
  const target = findRecord(targetSys, targetE);
  if (!target) return null;
  const targetId = correspondenceEntryId(target);
  if (sourceId === targetId) return null;

  /* Re-read the source's own relationships; only one that lands on THIS record counts. */
  const { groups } = relationshipGroups(pair.sys, pair.e, 200);
  for (const g of groups) {
    for (const ex of g.examples) {
      if (ex.target.id === targetId) {
        return {
          fromHref: from,
          source: { sys: pair.sys, e: pair.e, id: sourceId },
          systemView: null,
          viaFieldLabel: ex.fieldLabel,
          viaValue: ex.value,
        };
      }
    }
  }
  /* Arrived by a route the source's fields do not actually support: say nothing. */
  return { fromHref: from, source: { sys: pair.sys, e: pair.e, id: sourceId }, systemView: null,
           viaFieldLabel: null, viaValue: null };
}

/* ── search ─────────────────────────────────────────────────────────────────
   Two honest result kinds: records whose own NAME matches, and recorded VALUES that match
   (with the records carrying them). Totals are counted before any limit.
   ───────────────────────────────────────────────────────────────────────── */

export interface NameHit { sys: string; e: string; id: string }
export interface ValueHit { field: string; fieldLabel: string; value: string; records: Array<{ sys: string; e: string; id: string }> }

export interface SearchResult {
  query: string;
  names: NameHit[];
  nameTotal: number;
  values: ValueHit[];
  valueTotal: number;
  /** True when a total exceeds what is shown, so the UI can say so. */
  namesTruncated: boolean;
  valuesTruncated: boolean;
}

export function searchArchive(rawQuery: string, nameLimit = 60, valueLimit = 12): SearchResult {
  const q = norm(rawQuery).slice(0, 80);
  const empty: SearchResult = { query: rawQuery.trim(), names: [], nameTotal: 0, values: [],
    valueTotal: 0, namesTruncated: false, valuesTruncated: false };
  if (!q) return empty;

  /* ONE CHARACTER means one character. Fifty-six records have names of one or two characters — the
     Latin and Hebrew letters, the notes — and a minimum length of two hides exactly those, so the
     "A" a visitor types to reach the letter A finds nothing. A one-character query is answered
     EXACTLY instead: it matches a record whose own name is that character, and nothing else. What
     it must never become is a substring search over the whole corpus on one letter. */
  const exactOnly = q.length < 2;

  const byId = new Map<string, NameHit>();
  for (const entry of codex) {
    const sys = String(entry.sys || "");
    const e = String(entry.e || "");
    if (!sys || !e) continue;
    const id = correspondenceEntryId(entry);
    if (byId.has(id)) continue;                 // one hit per addressable record
    const forms = [norm(e), stripOrdinal(e), stripQualifier(e)];
    const matches = exactOnly ? forms.some((f) => f === q) : forms.some((f) => f.includes(q));
    if (!matches) continue;
    byId.set(id, { sys, e, id });
  }
  const names: NameHit[] = Array.from(byId.values());
  names.sort((a, b) => a.e.localeCompare(b.e) || a.sys.localeCompare(b.sys));

  const values: ValueHit[] = [];
  for (const [key, records] of Array.from(VALUE_INDEX.entries())) {
    const at = key.indexOf("\u0000");
    if (at <= 0) continue;
    const field = key.slice(0, at);
    const value = key.slice(at + 1);
    if (!value.includes(q)) continue;
    values.push({
      field,
      fieldLabel: FIELD_LABELS[field] || field.toUpperCase(),
      value,
      records: records.slice(0, 6),
    });
  }
  values.sort((a, b) => a.value.localeCompare(b.value));

  return {
    query: rawQuery.trim(),
    names: names.slice(0, nameLimit),
    nameTotal: names.length,
    values: values.slice(0, valueLimit),
    valueTotal: values.length,
    namesTruncated: names.length > nameLimit,
    valuesTruncated: values.length > valueLimit,
  };
}

/**
 * What the entrance reports: the DISTINCT identities a visitor can address, taken from the
 * existing summary rather than counted again here. The dataset holds 824 source rows, four of
 * which repeat a DEITIES identity, and 824 rows is not 824 records.
 */
export const CORPUS = {
  records: CORPUS_SUMMARY.distinctIdentities,
  systems: CORPUS_SUMMARY.systemCount,
  sourceRecords: CORPUS_SUMMARY.sourceRecords,
} as const;
