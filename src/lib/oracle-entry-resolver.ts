/**
 * oracle-entry-resolver.ts — server-side resolution of a selected Oracle entry.
 *
 * The visitor's selected entry travels as an opaque STABLE IDENTIFIER plus an
 * entity type. Nothing descriptive is trusted from the client: no title, no
 * system name, no "description", no source claim. The record is looked up here,
 * against the same dataset the Oracle's own Correspondence dock renders, and only
 * fields actually present in that record are ever surfaced.
 *
 * Identity: the dataset has no per-entry id column, so a record's identity is the
 * pair (sys, e). The public identifier is a reversible encoding of that pair, and
 * the resolver decodes it back and re-verifies against the dataset — a client
 * cannot reach a record without naming a pair that genuinely exists.
 *
 * No new corpus and no vector database is introduced: this reads the existing
 * `src/data/codex-raw.json` (824 entries) through the existing
 * `src/lib/codex-data.ts` and `src/lib/correspondence-systems.ts` modules.
 */

import { codex, type CodexEntry } from "@/lib/codex-data";
import { FORORDER } from "@/lib/correspondence-systems";

/** Entry identifier prefix, so an artwork id can never be read as an entry id. */
export const CORRESPONDENCE_ENTRY_PREFIX = "corr-v1:";
/** Upper bound on the grounding block handed to the provider. */
export const MAX_GROUNDING_CHARS = 2600;

/** Entity types the Oracle understands. Correspondence entries are one of them. */
export type OracleEntityType = "correspondence_entry";

const MAX_ID_CHARS = 200;

/** Keys that are structural/derived rather than meaningful record content. */
const NON_EVIDENCE_KEYS = new Set(["sys", "e"]);

/** Human labels for the compact evidence chips, matching the dock's own naming. */
const FIELD_LABELS: Record<string, string> = {
  al: "Alchemy", ar: "Archetypes", co: "Colors", cr: "Crystals",
  de: "Deities", el: "Elements", fr: "Frequency", gm: "Geomancy",
  ge: "Geometry", ic: "I Ching", ka: "Kabbalah", lh: "Hebrew",
  ll: "Latin", ma: "Major Arcana", my: "Mayan", me: "Metals",
  mi: "Minor Arcana", no: "Note", nu: "Number", ph: "Physiology",
  pl: "Planets", pt: "Plants", ps: "Platonic Solid", vi: "Shadow/Vices",
  vr: "Virtues", zo: "Zodiac", ch: "Chakras",
};

/** Order the same fields in the same order the Correspondence dock uses. */
const EVIDENCE_ORDER: string[] = FORORDER.filter(
  (key) => key !== "sys" && key !== "e"
) as string[];

export interface EvidenceField {
  label: string;
  value: string;
}

export interface ResolvedEntry {
  entityId: string;
  entityType: OracleEntityType;
  title: string;
  system: string;
  /** "UT corpus material" — a correspondence record, not a historical source. */
  sourceType: string;
  /** Fields genuinely present on this record, bounded for a compact display. */
  fields: EvidenceField[];
  /** A real in-site inspection action, when one exists. */
  action: { label: string; href: string; entryId?: string } | null;
  /** Bounded, label-free record body for the provider prompt. */
  promptBlock: string;
}

export type Resolution =
  | { status: "resolved"; entry: ResolvedEntry }
  | { status: "unknown"; entityId: string | null; reason: string }
  | { status: "ambiguous"; entityId: string | null; reason: string; candidates: string[] }
  | { status: "absent" };

function encode(sys: string, e: string): string {
  return `${CORRESPONDENCE_ENTRY_PREFIX}${encodeURIComponent(sys)}::${encodeURIComponent(e)}`;
}

function decode(id: string): { sys: string; e: string } | null {
  if (typeof id !== "string" || !id.startsWith(CORRESPONDENCE_ENTRY_PREFIX)) return null;
  const raw = id.slice(CORRESPONDENCE_ENTRY_PREFIX.length);
  const split = raw.indexOf("::");
  if (split <= 0) return null;
  try {
    const sys = decodeURIComponent(raw.slice(0, split));
    const e = decodeURIComponent(raw.slice(split + 2));
    if (!sys || !e) return null;
    return { sys, e };
  } catch {
    return null;
  }
}

/** Build the stable identifier for a dataset entry. Used by the client to select. */
export function correspondenceEntryId(entry: CodexEntry): string {
  return encode(String(entry.sys || ""), String(entry.e || ""));
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/**
 * True when two entries share the same display name across different systems —
 * the genuine ambiguity case, which must surface honestly rather than guess.
 */
function isAmbiguousName(sys: string, e: string): boolean {
  const target = clean(e).toLowerCase();
  const matches = codex.filter((entry) => clean(entry.e).toLowerCase() === target);
  return matches.length > 1;
}

/**
 * Resolve a client-supplied entity reference.
 *
 * Unknown identifiers and unaddressable names produce an honest, usable state
 * (`unknown` / `ambiguous`) that names the problem and still lets the Oracle
 * answer — it is never silently dropped and never substituted with another record.
 */
export function resolveOracleEntity(rawType: unknown, rawId: unknown): Resolution {
  const id = typeof rawId === "string" ? rawId.trim().slice(0, MAX_ID_CHARS) : "";

  // No entity supplied is normal — plain Oracle questions keep working.
  if (!id && !rawType) return { status: "absent" };

  if (rawType !== undefined && rawType !== null && rawType !== "correspondence_entry") {
    return {
      status: "unknown",
      entityId: id || null,
      reason: "That entry type is not supported by the Oracle.",
    };
  }

  if (!id) {
    return { status: "unknown", entityId: null, reason: "No entry identifier was supplied." };
  }

  // A bare legacy name is accepted only when it is globally unambiguous.
  if (!id.startsWith(CORRESPONDENCE_ENTRY_PREFIX)) {
    const needle = id.toLowerCase();
    const matches = codex.filter((entry) => clean(entry.e).toLowerCase() === needle);
    if (matches.length === 0) {
      return {
        status: "unknown",
        entityId: id,
        reason: "That entry is not present in the Correspondence corpus.",
      };
    }
    if (matches.length > 1) {
      return {
        status: "ambiguous",
        entityId: id,
        reason: "More than one Correspondence entry shares that name.",
        candidates: matches.slice(0, 6).map((m) => `${m.sys} · ${clean(m.e)}`),
      };
    }
    return resolveResolved(matches[0]);
  }

  const pair = decode(id);
  if (!pair) {
    return { status: "unknown", entityId: id, reason: "That entry identifier is malformed." };
  }

  // Re-verify against the real dataset. A forged pair finds nothing.
  const match = codex.find(
    (entry) => clean(entry.sys) === pair.sys && clean(entry.e) === pair.e
  );
  if (!match) {
    return {
      status: "unknown",
      entityId: id,
      reason: "That entry is not present in the Correspondence corpus.",
    };
  }
  return resolveResolved(match);
}

function resolveResolved(entry: CodexEntry): Resolution {
  const title = clean(entry.e) || clean(entry.sys) || "Unnamed entry";
  const system = clean(entry.sys);
  const entityId = correspondenceEntryId(entry);

  // Only fields genuinely present on this record become evidence.
  const fields: EvidenceField[] = [];
  let evidenceChars = 0;
  for (const key of EVIDENCE_ORDER) {
    if (NON_EVIDENCE_KEYS.has(key)) continue;
    const value = clean((entry as unknown as Record<string, unknown>)[key]);
    if (!value) continue;
    // Bound the evidence display so it stays compact and accessible.
    const shown = value.length > 220 ? `${value.slice(0, 217)}…` : value;
    fields.push({ label: FIELD_LABELS[key] || key.toUpperCase(), value: shown });
    evidenceChars += shown.length;
    if (evidenceChars > 1400 || fields.length >= 8) break;
  }

  // Two real destinations, no invented deep-link:
  //  - href    the live Correspondence Codex experience. Verified 200 on BOTH
  //            production and the Batch 2 preview. The Oracle's own page renders
  //            the record in place via `openEntry`, so the panel can also show
  //            the record inline without leaving the page.
  // There is deliberately NO `/oracle/correspondence` link: that route does not
  // exist and returns 404 in both production and preview.
  const action = {
    label: "Inspect this entry",
    href: "/experience/correspondence-codex",
    entryId: entityId,
  };

  // Provider grounding: the resolved record only, no client-supplied prose.
  const promptLines = [
    `Selected Correspondence record (verified in the UT corpus, id ${entityId}):`,
    `Title: ${title}`,
    `System: ${system}`,
    ...(fields.length
      ? fields.map((f) => `${f.label}: ${f.value}`)
      : ["(this record carries no additional correspondence fields)"]),
    "This record is UT corpus material — a correspondence lattice entry, not a historical document or a scientific citation.",
    "Treat it as the primary anchor for the answer. Broader retrieval may supplement it but must not replace it.",
  ];
  // Bound the grounding block without slicing through a field: drop whole
  // trailing field lines until it fits.
  let promptBlock = promptLines.join("\n");
  while (promptBlock.length > MAX_GROUNDING_CHARS && promptLines.length > 3) {
    promptLines.pop();
    promptBlock = promptLines.join("\n");
  }

  return {
    status: "resolved",
    entry: {
      entityId,
      entityType: "correspondence_entry",
      title,
      system,
      sourceType: "UT corpus material",
      fields,
      action,
      promptBlock,
    },
  };
}

export { isAmbiguousName };
