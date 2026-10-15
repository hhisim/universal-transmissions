/**
 * named-record-resolver.ts — resolve a record the VISITOR NAMES in their question.
 *
 * WHY THIS EXISTS
 *
 * A Correspondence record reaches the Oracle today only when the visitor SELECTS it:
 * the client sends the opaque `corr-v1:` identifier and the server resolves it. A
 * visitor who simply TYPES the name of a record —
 *
 *     "Follow Aleph through its element, colour and frequency."
 *
 * — sends no identifier, so no record grounding is composed at all. The backend
 * cannot compensate, because the record does not exist in its corpus: the Hebrew
 * letter entries in the backend's correspondence index are empty shells, its alphabet
 * engine holds the 26 LATIN letters, and the chroma collections carry no Hebrew-letter
 * record. The record lives HERE, in `src/data/codex-raw.json`.
 *
 * So a clearly named record must be resolved BEFORE broad semantic retrieval, from the
 * same dataset and through the same identifier scheme the selected-record path already
 * uses. This module adds no corpus, no index and no second source of truth.
 *
 * WHAT IT WILL NOT DO
 *
 *   - it invents nothing: a name resolves only to a record that exists in the dataset;
 *   - an unknown name produces NO record (never a stand-in);
 *   - a name carried by more than one record is reported as AMBIGUOUS and all its
 *     candidates are listed — this module never silently picks one.
 *
 * CONSERVATIVE BY DESIGN
 *
 * Matching is whole-word and case-insensitive. To keep precision (a wrongly attached
 * record is worse than a missing one) a name is only eligible when it is at least
 * `MIN_BARE_NAME_CHARS` long, OR the question explicitly frames it as a record
 * reference ("the letter Beth", "the record Heh"). That bound is deliberate and
 * documented: short names that are also ordinary words (Heh, Vav, Yod, Mem, Nun, Peh,
 * Tav) are reached through the framing form, not by bare mention.
 */

import { codex, type CodexEntry } from "@/lib/codex-data";
import {
  CORRESPONDENCE_ENTRY_PREFIX,
  correspondenceEntryId,
  resolveOracleEntity,
} from "@/lib/oracle-entry-resolver";

/** A name shorter than this must be explicitly framed as a record to be eligible. */
export const MIN_BARE_NAME_CHARS = 4;

/** At most this many records are attached, so the grounding budget stays intact. */
export const MAX_NAMED_RECORDS = 2;

/** Words that frame the following token as a reference to an archive record. */
const FRAMING_WORDS = new Set([
  "letter", "record", "entry", "correspondence", "correspondences",
  "system", "archive", "path", "card", "crystal", "stone", "planet",
]);

export interface NamedRecord {
  sys: string;
  e: string;
  id: string;
}

export interface NamedRecordAmbiguity {
  /** The name as the visitor wrote it. */
  name: string;
  /** Every record that carries this name. Never empty. */
  matches: NamedRecord[];
}

export interface NamedRecordResolution {
  /** Unambiguous records the visitor clearly named, in mention order. */
  resolved: NamedRecord[];
  /** Names that match more than one record — reported, never resolved silently. */
  ambiguous: NamedRecordAmbiguity[];
  /** Grounding blocks, resolved records first, then any ambiguity notice. */
  blocks: string[];
  /** Identifiers attached, for logging and evidence. */
  ids: string[];
}

/** name (lowercased) -> every record carrying it. Built once, from the dataset. */
const BY_NAME: Map<string, CodexEntry[]> = (() => {
  const index = new Map<string, CodexEntry[]>();
  for (const entry of codex) {
    const name = typeof entry.e === "string" ? entry.e.trim().toLowerCase() : "";
    if (!name) continue;
    const bucket = index.get(name);
    if (bucket) bucket.push(entry);
    else index.set(name, [entry]);
  }
  return index;
})();

function toNamedRecord(entry: CodexEntry): NamedRecord {
  return { sys: entry.sys, e: entry.e, id: correspondenceEntryId(entry) };
}

/**
 * Resolve the records a question clearly names.
 *
 * Pure and deterministic: the same question always produces the same result, and it
 * reads only the existing dataset.
 */
export function resolveNamedRecords(
  question: string,
  history?: ReadonlyArray<{ role?: string; text?: string; content?: string }>
): NamedRecordResolution {
  const resolved: NamedRecord[] = [];
  const ambiguous: NamedRecordAmbiguity[] = [];
  const seen = new Set<string>();

  // Whole words, keeping the visitor's own spelling for the ambiguity notice.
  // ES5-safe on purpose: the project targets es5, so no `u` flag and no `\p{...}`
  // property escapes — an explicit Latin-1 + Latin Extended-A range instead.
  const words = String(question ?? "").match(/[A-Za-z0-9_\u00C0-\u024F'’-]+/g) ?? [];

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const key = word.toLowerCase();
    const matches = BY_NAME.get(key);
    if (!matches || !matches.length) continue;

    // Precision guard: a short bare name must be framed as a record reference.
    const framed = i > 0 && FRAMING_WORDS.has(words[i - 1].toLowerCase());
    if (key.length < MIN_BARE_NAME_CHARS && !framed) continue;

    const candidates = matches.map(toNamedRecord);
    const identity = candidates.map((c) => c.id).sort().join("|");
    if (seen.has(identity)) continue;
    seen.add(identity);

    if (candidates.length > 1) {
      // The name is carried by more than one record. Preserve that ambiguity — all
      // candidates are listed and none is chosen.
      ambiguous.push({ name: word, matches: candidates });
      continue;
    }

    if (resolved.length >= MAX_NAMED_RECORDS) continue;
    resolved.push(candidates[0]);
  }

  /* ── CONTINUITY ────────────────────────────────────────────────────────────
     A visitor who follows up without repeating the name ("And how does that relate
     to the colour?") must keep the record the conversation is already about. The
     current question wins; only when it names nothing do we inherit the most recent
     record a PREVIOUS user turn named. Nothing is inherited across a question that
     names a different record, and an inherited record is never ambiguous-based. */
  if (!resolved.length && !ambiguous.length && Array.isArray(history)) {
    for (let i = history.length - 1; i >= 0 && resolved.length === 0; i -= 1) {
      const turn = history[i];
      if (!turn || turn.role !== "user") continue;
      // `HistoryMessage` carries the visitor's words in `text`; `content` is tolerated
      // for callers that shape their own turns. Reading only `content` kept this
      // inheritance silently inert against the real conversation type.
      const said = typeof turn.text === "string"
        ? turn.text
        : (typeof turn.content === "string" ? turn.content : "");
      if (!said) continue;
      const prior = resolveNamedRecords(said);  // question only: no history re-entry
      if (prior.resolved.length) resolved.push(...prior.resolved.slice(0, MAX_NAMED_RECORDS));
    }
  }

  const blocks: string[] = [];
  const ids: string[] = [];

  for (const record of resolved) {
    // Reuse the selected-record resolver verbatim, so a NAMED record and a SELECTED
    // record produce byte-identical grounding.
    const resolution = resolveOracleEntity("correspondence_entry", record.id);
    if (resolution.status === "resolved" && resolution.entry) {
      blocks.push(
        [
          "The visitor named this archive record in the question (it was resolved by name, not selected from a page):",
          resolution.entry.promptBlock,
          "Answer from this record. Broader retrieval may deepen it but must not replace it, and do not ask the visitor to open the record's page first.",
        ].join("\n")
      );
      ids.push(record.id);
    } else {
      // The dataset and the resolver must agree. If they ever do not, say so rather
      // than attaching a record the resolver could not verify.
      blocks.push(
        `The visitor named the record ${CORRESPONDENCE_ENTRY_PREFIX}${record.sys}::${record.e}, which could not be resolved. ` +
          `Say plainly that the record is unavailable. Do not invent one.`
      );
    }
  }

  for (const item of ambiguous) {
    const list = item.matches.map((m) => `${m.sys}::${m.e}`).join("; ");
    blocks.push(
      `The visitor named "${item.name}", which is carried by more than one archive record: ${list}. ` +
        `Do not choose one of them silently — say which records share the name and ask which one is meant.`
    );
  }

  return { resolved, ambiguous, blocks, ids };
}
