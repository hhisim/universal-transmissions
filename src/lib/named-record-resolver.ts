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

/** A name with a space is matched as a PHRASE, so "The Explorer" is a name, not a token. */
const MULTIWORD_NAMES: string[] = Array.from(BY_NAME.keys()).filter((n) => n.includes(" "));

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The whole registered phrase appears, word-bounded — never one of its tokens alone. */
function phraseInQuestion(question: string, name: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9_\\u00C0-\\u024F])${escapeRegExp(name)}([^A-Za-z0-9_\\u00C0-\\u024F]|$)`, "i").test(question);
}

/** System identity -> the ordinary words a visitor uses to name it. */
const SYSTEM_WORDS: Record<string, string[]> = {
  METALS: ["metal", "metals", "metallic"],
  COLORS: ["color", "colors", "colour", "colours"],
  CRYSTALS: ["crystal", "crystals", "stone", "stones", "mineral", "minerals"],
  PLANETS: ["planet", "planets"],
  DEITIES: ["deity", "deities", "god", "goddess", "angel", "angels"],
  ZODIAC: ["zodiac", "sign", "signs"],
  TAROT: ["tarot", "card", "cards", "arcana"],
  LETTERS_HEBREW: ["hebrew", "hebrew letter", "hebrew letters"],
  LETTERS_LATIN: ["latin", "latin letter", "latin letters"],
  ALCHEMY: ["alchemy", "alchemical", "process", "processes"],
  GEOMANCY: ["geomancy", "geomantic", "figure", "figures"],
  ARCHETYPES: ["archetype", "archetypes"],
  I_CHING: ["iching", "i ching", "hexagram", "hexagrams"],
  KABBALAH: ["kabbalah", "sephirah", "sephiroth"],
};

/** The system a question names outright, if any. */
export function systemNamedInQuestion(question: string): string | null {
  const q = String(question ?? "").toLowerCase();
  for (const sys of Object.keys(SYSTEM_WORDS)) {
    for (const word of SYSTEM_WORDS[sys]) {
      if (new RegExp(`(^|[^a-z])${escapeRegExp(word)}([^a-z]|$)`).test(q)) return sys;
    }
  }
  return null;
}

/** Words that make a question a FOLLOW-UP rather than a new subject. */
const ANAPHORA = new Set([
  "that", "this", "these", "those", "it", "its", "they", "them", "their",
  "same", "another",
]);

/**
 * Is this question a genuine follow-up? A question that names nothing is NOT
 * automatically one: "Tell me about Zorblax" is a new subject, not a continuation,
 * and must not inherit the previous record. A follow-up leans on a word that points
 * back at what was already said.
 */
function looksLikeFollowUp(question: string): boolean {
  const words = String(question ?? "").toLowerCase().match(/[a-z0-9']+/g) ?? [];
  return words.some((w) => ANAPHORA.has(w));
}

function toNamedRecord(entry: CodexEntry): NamedRecord {
  return { sys: entry.sys, e: entry.e, id: correspondenceEntryId(entry) };
}

/**
 * Resolve the records a question clearly names.
 *
 * Pure and deterministic: the same question always produces the same result, and it
 * reads only the existing dataset.
 */
/** The ambiguity the conversation is currently sitting on, if its last named turn left one. */
function currentAmbiguity(
  history: ReadonlyArray<{ role?: string; text?: string; content?: string }>
): NamedRecordAmbiguity | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (!turn || turn.role !== "user") continue;
    const said = typeof turn.text === "string"
      ? turn.text
      : (typeof turn.content === "string" ? turn.content : "");
    if (!said) continue;
    const prior = resolveNamedRecords(said, []);
    if (prior.ambiguous.length) return prior.ambiguous[0];
    if (prior.resolved.length) return null;
  }
  return null;
}

export function resolveNamedRecords(
  question: string,
  history?: ReadonlyArray<{ role?: string; text?: string; content?: string }>
): NamedRecordResolution {
  const resolved: NamedRecord[] = [];
  const ambiguous: NamedRecordAmbiguity[] = [];
  const seen = new Set<string>();
  const q = String(question ?? "");

  /** Record one candidate set, either as a resolution or as a preserved ambiguity. */
  const admit = (spelling: string, candidates: NamedRecord[]): void => {
    const identity = candidates.map((c) => c.id).sort().join("|");
    if (seen.has(identity)) return;
    seen.add(identity);
    if (candidates.length > 1) {
      ambiguous.push({ name: spelling, matches: candidates });
      return;
    }
    if (resolved.length < MAX_NAMED_RECORDS) resolved.push(candidates[0]);
  };

  // ── Single words, keeping the visitor's own spelling for the ambiguity notice.
  //    ES5-safe: no `u` flag and no \p{...} escapes.
  const words = q.match(/[A-Za-z0-9_\u00C0-\u024F'’-]+/g) ?? [];

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const key = word.toLowerCase();
    if (key.includes(" ")) continue; // phrases are matched whole, below
    const matches = BY_NAME.get(key);
    if (!matches || !matches.length) continue;

    // Precision guard: a short bare name must be framed as a record reference.
    const framed = i > 0 && FRAMING_WORDS.has(words[i - 1].toLowerCase());
    if (key.length < MIN_BARE_NAME_CHARS && !framed) continue;

    admit(word, matches.map(toNamedRecord));
  }

  // ── Multiword registered names, matched as WHOLE PHRASES. A single token of a
  //    multiword name is never substituted for it.
  for (const name of MULTIWORD_NAMES) {
    if (resolved.length >= MAX_NAMED_RECORDS) break;
    if (!phraseInQuestion(q, name)) continue;
    const matches = BY_NAME.get(name);
    if (matches && matches.length) admit(name, matches.map(toNamedRecord));
  }

  /* ── CLARIFICATION ──────────────────────────────────────────────────────────
     The conversation is currently ambiguous and the visitor has answered with the
     SYSTEM instead of repeating the name ("the metal one", "the metal copper"). The
     intended candidate is the ambiguous one whose system identity is named — the
     SAME registry, no second namespace. */
  const sysWord = systemNamedInQuestion(q);
  if (!resolved.length && sysWord) {
    // Prefer the ambiguity raised by THIS question (the visitor repeated the name and
    // added the system: "the metal copper"), then the one the conversation is on
    // ("the metal one").
    const candidates = ambiguous.length
      ? ambiguous[0].matches
      : (Array.isArray(history) ? (currentAmbiguity(history) || { matches: [] }).matches : []);
    const hit = candidates.filter((m) => m.sys === sysWord);
    if (hit.length === 1) {
      if (ambiguous.length) ambiguous.pop();  // clarified: no longer ambiguous
      resolved.push(hit[0]);
    }
  }

  /* ── CONTINUITY ─────────────────────────────────────────────────────────────
     Only a GENUINE follow-up inherits, and only from the most recent subject. A
     question that names nothing is not automatically a continuation: "Tell me about
     Zorblax" is a new subject and must not receive the previous record's grounding.
     An unresolved ambiguity in the transcript IS the current conversational state,
     so the walk stops there rather than reviving an older resolved record. */
  if (!resolved.length && !ambiguous.length && looksLikeFollowUp(q) && Array.isArray(history)) {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const turn = history[i];
      if (!turn || turn.role !== "user") continue;
      // HistoryMessage carries the visitor's words in `text`; `content` is tolerated
      // for callers that shape their own turns.
      const said = typeof turn.text === "string"
        ? turn.text
        : (typeof turn.content === "string" ? turn.content : "");
      if (!said) continue;
      const prior = resolveNamedRecords(said); // question only: no history re-entry
      if (prior.ambiguous.length) break;       // the ambiguity is the current state
      if (prior.resolved.length) {
        resolved.push(...prior.resolved.slice(0, MAX_NAMED_RECORDS));
        break;
      }
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
  }  return { resolved, ambiguous, blocks, ids };
}
