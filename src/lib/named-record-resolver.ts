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
  MAX_GROUNDING_CHARS,
  correspondenceEntryId,
  resolveOracleEntity,
} from "@/lib/oracle-entry-resolver";
import {
  ARCHIVE_TITLES,
  archiveRecordsByTitle,
  recordEvidenceForHref,
  type ArchiveTitleRecord,
} from "@/lib/record-evidence";

/** A name shorter than this must be explicitly framed as a record to be eligible. */
export const MIN_BARE_NAME_CHARS = 4;

/** At most this many records are attached, so the grounding budget stays intact. */
export const MAX_NAMED_RECORDS = 2;

/** Words that frame the following token as a reference to an archive record. */
const FRAMING_WORDS = new Set([
  "letter", "record", "entry", "correspondence", "correspondences",
  "system", "archive", "path", "card", "crystal", "stone", "planet",
]);

/** Which registry carries a record the visitor named. */
export type NamedRecordKind = "correspondence" | "journal" | "artwork";

export interface NamedRecord {
  /** System identity: the correspondence system, or JOURNAL / ARTWORK. */
  sys: string;
  /** The record's own name or title, exactly as its page renders it. */
  e: string;
  /** Stable identity: `corr-v1:<sys>::<e>`, `journal:<slug>` or `gallery:<slug>`. */
  id: string;
  kind: NamedRecordKind;
  /** The record's canonical route. Present for journal and artwork records. */
  href?: string;
}

export interface NamedRecordAmbiguity {
  /** The name as the visitor wrote it. */
  name: string;
  /** Every record that carries this name. Never empty. */
  matches: NamedRecord[];
}

export interface CurrentSubject {
  /** "record" when a correspondence record carries it, "subject" when the visitor named
   *  something the correspondence registry does not carry, "ambiguous" when clarification
   *  is pending. A registry miss is never a claim that the archive does not hold it. */
  kind: "record" | "subject" | "ambiguous" | "none";
  /** The referent as text — present for kind "subject" (and mirrored for a record). */
  text: string | null;
  /** True when the CURRENT question continues an existing subject rather than naming one. */
  carried: boolean;
  id?: string;
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
  /** The current referent, carried separately from the literal question. */
  subject: CurrentSubject;
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
  /* The archive's own record kinds. A title can be carried by a Journal piece AND an artwork
     ("Trivium Method", "Toroidal Tantra"), and the visitor settles it exactly as they settle
     Copper — by naming the kind. `clarify` filters candidates by `sys`, so the kind has to be
     a system word here rather than a second mechanism beside this one. Kept tight: only the
     kind's own names, so ordinary prose does not read as a kind. */
  JOURNAL: ["journal", "journals"],
  ARTWORK: ["artwork", "artworks", "gallery"],
};

/**
 * EVERY system the question names outright. Returning all of them matters: a question
 * naming both ("the metal and colour copper") must not silently take whichever key
 * happens to come first in the map.
 */
export function systemsNamedInQuestion(question: string): string[] {
  const q = String(question ?? "").toLowerCase();
  const found: string[] = [];
  for (const sys of Object.keys(SYSTEM_WORDS)) {
    for (const word of SYSTEM_WORDS[sys]) {
      if (new RegExp(`(^|[^a-z])${escapeRegExp(word)}([^a-z]|$)`).test(q)) {
        found.push(sys);
        break;
      }
    }
  }
  return found;
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
  return { sys: entry.sys, e: entry.e, id: correspondenceEntryId(entry), kind: "correspondence" };
}

/** A Journal or Artwork record, identified by its own canonical route. */
function toArchiveNamedRecord(record: ArchiveTitleRecord): NamedRecord {
  return {
    sys: record.kind.toUpperCase(),
    e: record.title,
    id: `${record.source}:${record.slug}`,
    kind: record.source,
    href: record.href,
  };
}

/** How a record is written into an ambiguity notice, by the identity it actually has. */
function describeForNotice(record: NamedRecord): string {
  return record.href ? `${record.e} (${record.href})` : `${record.sys}::${record.e}`;
}

/** The first word-bounded occurrence of a registered phrase, as a character span. */
function phraseSpan(question: string, name: string): [number, number] | null {
  const re = new RegExp(
    `(^|[^A-Za-z0-9_\\u00C0-\\u024F])${escapeRegExp(name)}(?=[^A-Za-z0-9_\\u00C0-\\u024F]|$)`,
    "i"
  );
  const hit = re.exec(question);
  if (!hit) return null;
  const start = hit.index + hit[1].length;
  return [start, start + name.length];
}

/**
 * Resolve the records a question clearly names.
 *
 * Pure and deterministic: the same question always produces the same result, and it
 * reads only the existing dataset.
 */
/**
 * Reconstruct the conversational subject CHRONOLOGICALLY, walking the transcript
 * forward and carrying one piece of state. Resolving each old turn independently and
 * then searching backwards for a convenient match cannot represent this: it forgets
 * that a later turn may have suspended, clarified or abandoned the subject.
 *
 *  - a turn naming one record        -> that record becomes the subject
 *  - a turn naming several records   -> the subject is AMBIGUOUS (suspended)
 *  - a clarifying turn               -> the chosen candidate becomes the subject
 *  - a turn naming no record at all, that is not a follow-up -> a NEW subject, so the
 *    older record is abandoned rather than left available for a later pronoun.
 */
export type SubjectState =
  | { kind: "none" }
  | { kind: "resolved"; record: NamedRecord }
  | { kind: "ambiguous"; ambiguity: NamedRecordAmbiguity }
  /* A subject the visitor named that has NO archive record. It is still the visitor's
     subject: "Tell me about Zorblax" then "What does it mean?" is a conversation about
     Zorblax, and an absent record must not make the question unanswerable. */
  | { kind: "subject"; text: string };

/**
 * A capitalised, non-function word the visitor used as a subject. Deliberately narrow:
 * only a word the visitor capitalised (or an ALL-CAPS token) counts, so ordinary
 * lowercase questions do not manufacture a subject.
 */
const SUBJECT_STOPWORDS = new Set([
  "the", "a", "an", "this", "that", "these", "those", "it", "its", "they", "them", "their",
  "what", "which", "who", "how", "why", "when", "where", "is", "are", "was", "were", "be",
  "do", "does", "did", "can", "could", "will", "would", "should", "may", "might", "must",
  "tell", "me", "about", "of", "and", "or", "but", "in", "on", "at", "to", "for", "with",
  "please", "explain", "describe", "follow", "show", "give", "more", "again", "also",
]);

/** Words that may sit INSIDE a multi-word name without ending it. */
const PHRASE_CONNECTORS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with",
  "from", "by", "as", "into", "its", "his", "her", "their", "our", "your", "my",
]);

/** A subject is one sentence long: nothing is carried across a sentence boundary. */
const SENTENCE_BOUNDARY = /[.!?;:\n]+/;

/** Articles a title may open with ("The Star and the Uncarved Block"). */
const ARTICLE_HEADS = new Set(["the", "a", "an"]);

/**
 * The visitor's subject within ONE sentence, as a COMPLETE phrase.
 *
 * A name may be a phrase: "The Star and the Uncarved Block" is one Journal title, not the
 * word "Star". The run is therefore taken whole — from the first name word (or the article
 * that opens it) through every following name word, allowing the connector words that hold a
 * name together — and is bounded by the sentence and by the first token that is neither a
 * name word nor a connector leading to one, so it can never swallow the rest of a question.
 *
 * The START rule is unchanged from the single-token version (a capitalised non-function word
 * of four or more characters, or an ALL-CAPS token, never the sentence's first word); only
 * the extent of the run is new.
 */
function subjectPhraseIn(sentence: string): string | null {
  const tokens = sentence.match(/[A-Za-z0-9_\u00C0-\u024F'’-]+/g) ?? [];
  if (!tokens.length) return null;

  const isAllCaps = (t: string) => t.length >= 3 && t === t.toUpperCase() && /[A-Z]/.test(t);
  // A name word inside the run: capitalised and not a function word.
  const isName = (t: string) => /^[A-Z]/.test(t) && !SUBJECT_STOPWORDS.has(t.toLowerCase());
  const opensAName = (t: string) => isName(t) && t.length >= 4;
  const isConnector = (t: string) => PHRASE_CONNECTORS.has(t.toLowerCase());

  let start = tokens.findIndex(isAllCaps);
  if (start < 0) {
    for (let i = 0; i < tokens.length; i++) {
      // A CAPITALISED article opens a name when a name word follows it: "The Star …".
      // A lowercase article does not — that is prose ("what is the Codex?"), and the name
      // word alone opens the run there, exactly as it did before.
      if (/^[A-Z]/.test(tokens[i]) && ARTICLE_HEADS.has(tokens[i].toLowerCase()) && isName(tokens[i + 1] ?? "")) {
        start = i;
        break;
      }
      // Sentence case is not a subject: the first word of a sentence never opens one.
      if (i === 0) continue;
      if (opensAName(tokens[i])) {
        start = i;
        break;
      }
    }
  }
  if (start < 0) return null;

  let end = start;
  let j = start + 1;
  while (j < tokens.length) {
    if (isName(tokens[j])) {
      end = j;
      j += 1;
      continue;
    }
    // Connectors continue the run only when a name word follows them.
    if (isConnector(tokens[j])) {
      let k = j;
      while (k < tokens.length && isConnector(tokens[k])) k += 1;
      if (k < tokens.length && isName(tokens[k])) {
        j = k;
        continue;
      }
    }
    break;
  }
  return tokens.slice(start, end + 1).join(" ");
}

function bareSubjectIn(question: string): string | null {
  for (const sentence of String(question ?? "").split(SENTENCE_BOUNDARY)) {
    const phrase = subjectPhraseIn(sentence);
    if (phrase) return phrase;
  }
  return null;
}

export function reconstructSubject(
  history: ReadonlyArray<{ role?: string; text?: string; content?: string }>
): SubjectState {
  let state: SubjectState = { kind: "none" };

  for (const turn of history) {
    if (!turn || turn.role !== "user") continue;
    const said = typeof turn.text === "string"
      ? turn.text
      : (typeof turn.content === "string" ? turn.content : "");
    if (!said) continue;

    const mentions = resolveNamedRecords(said, []); // question only, no re-entry

    if (mentions.ambiguous.length) {
      state = { kind: "ambiguous", ambiguity: mentions.ambiguous[0] };
      continue;
    }
    if (mentions.resolved.length) {
      state = { kind: "resolved", record: mentions.resolved[0] };
      continue;
    }
    // Named nothing. A clarification settles the pending ambiguity; a genuine
    // follow-up leaves the subject alone; anything else is a NEW subject and the
    // older record is abandoned.
    const clarified = clarify(said, state);
    if (clarified) {
      state = { kind: "resolved", record: clarified };
      continue;
    }
    if (!looksLikeFollowUp(said)) {
      // A new subject that is not an archive record is STILL the subject. Remember it
      // rather than dropping to "none", so a later pronoun continues it.
      const bare = bareSubjectIn(said);
      state = bare ? { kind: "subject", text: bare } : { kind: "none" };
    }
  }

  return state;
}

/**
 * Settle a suspended ambiguity using the ONE system the turn names. Exactly one system
 * and exactly one matching candidate, or nothing is chosen.
 */
function clarify(question: string, state: SubjectState): NamedRecord | null {
  if (state.kind !== "ambiguous") return null;
  const systems = systemsNamedInQuestion(question);
  if (systems.length !== 1) return null;
  // Naming a system is not enough on its own: "what is its colour?" names the colour
  // system but asks about a property, it does not pick the colour Copper. A clarifying
  // turn REFERS TO the record — by repeating its name, or with a selection "one".
  const q = String(question ?? "").toLowerCase();
  const refers =
    new RegExp(`(^|[^a-z])${escapeRegExp(state.ambiguity.name.toLowerCase())}([^a-z]|$)`).test(q) ||
    /(^|[^a-z])one([^a-z]|$)/.test(q) ||
    /(^|[^a-z])that([^a-z]|$)/.test(q) ||
    /(^|[^a-z])this([^a-z]|$)/.test(q);
  if (!refers) return null;
  const hit = state.ambiguity.matches.filter((m) => m.sys === systems[0]);
  return hit.length === 1 ? hit[0] : null;
}

export function resolveNamedRecords(
  question: string,
  history?: ReadonlyArray<{ role?: string; text?: string; content?: string }>
): NamedRecordResolution {
  const ambiguous: NamedRecordAmbiguity[] = [];
  const seen = new Set<string>();
  const q = String(question ?? "");

  /* Every eligible record is collected WITH the position at which the visitor named it. The
     limit is applied AFTER this list is ordered, because the passes below are not the order of
     the visitor's words: a title pass that runs first would otherwise consume the whole
     allowance before an earlier correspondence mention in the same question was ever seen. */
  const eligible: Array<{ at: number; record: NamedRecord }> = [];

  /** Record one candidate set, either as a resolution or as a preserved ambiguity. */
  const admit = (spelling: string, candidates: NamedRecord[], at: number): void => {
    const identity = candidates.map((c) => c.id).sort().join("|");
    if (seen.has(identity)) return;
    seen.add(identity);
    if (candidates.length > 1) {
      ambiguous.push({ name: spelling, matches: candidates });
      return;
    }
    eligible.push({ at, record: candidates[0] });
  };

  // ── Words carry their positions: a title that CONTAINS a correspondence word has to be
  //    able to say which occurrence of that word it covers.
  const words: string[] = [];
  const wordAt: number[] = [];
  {
    const scanner = /[A-Za-z0-9_\u00C0-\u024F'’-]+/g;
    let hit: RegExpExecArray | null;
    while ((hit = scanner.exec(q)) !== null) {
      words.push(hit[0]);
      wordAt.push(hit.index);
    }
  }

  /* ── ARCHIVE TITLES FIRST (Journal, Artwork), matched as WHOLE TITLES ────────────────
     A record the visitor can open by name is not only a correspondence entry. The span a
     matched title occupies is remembered, because a title that CONTAINS a correspondence
     word ("The Star and the Uncarved Block") is ONE record: the visitor named the title,
     not the word inside it. That is precedence, and it is positional, not a preference. */
  const titleSpans: Array<[number, number]> = [];
  for (const title of ARCHIVE_TITLES) {
    const span = phraseSpan(q, title);
    if (!span) continue;
    titleSpans.push(span);
    if (!title.includes(" ")) continue; // one-word titles are settled with the words below
    admit(title, archiveRecordsByTitle(title).map(toArchiveNamedRecord), span[0]);
  }

  /** Is this span strictly INSIDE a title the visitor named? */
  const insideNamedTitle = (start: number, end: number): boolean =>
    titleSpans.some(([s, e]) => start >= s && end <= e && !(start === s && end === e));

  // ── Single words, keeping the visitor's own spelling for the ambiguity notice.
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const key = word.toLowerCase();
    if (key.includes(" ")) continue; // phrases are matched whole, below
    const start = wordAt[i];
    if (insideNamedTitle(start, start + word.length)) continue; // the title was named, not this word

    const matches = BY_NAME.get(key);
    const titled = archiveRecordsByTitle(key);

    // Precision guard: a short bare name must be framed as a record reference.
    const framed = i > 0 && FRAMING_WORDS.has(words[i - 1].toLowerCase());
    if (key.length < MIN_BARE_NAME_CHARS && !framed) continue;

    if (titled.length) {
      /* The same name carried by a title AND by a correspondence record is a real
         collision. Both are admitted together so it is REPORTED, never resolved
         silently in favour of whichever registry this module happens to check first. */
      admit(word, [...titled.map(toArchiveNamedRecord), ...(matches ?? []).map(toNamedRecord)], start);
      continue;
    }
    if (!matches || !matches.length) continue;

    admit(word, matches.map(toNamedRecord), start);
  }

  // ── Multiword correspondence names, matched as WHOLE PHRASES. A single token of a
  //    multiword name is never substituted for it.
  for (const name of MULTIWORD_NAMES) {
    if (!phraseInQuestion(q, name)) continue;
    const span = phraseSpan(q, name);
    if (span && insideNamedTitle(span[0], span[1])) continue; // inside a title the visitor named
    const matches = BY_NAME.get(name);
    if (matches && matches.length) admit(name, matches.map(toNamedRecord), span ? span[0] : q.length);
  }

  /* MENTION ORDER, THEN THE LIMIT. The visitor's own order decides which records survive the
     allowance — not the order of the passes that found them. */
  const resolved: NamedRecord[] = eligible
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_NAMED_RECORDS)
    .map((a) => a.record);

  /* Provenance is recorded HERE, before the walk runs: only the word/phrase passes and
     the same-question clarification below can establish that the CURRENT QUESTION named
     its subject. After the walk, a non-empty `resolved` may merely be carried. */
  const namedByCurrentQuestion = resolved.length > 0 || ambiguous.length > 0;

  if (resolved.length || ambiguous.length) {
    /* The question names records itself. If it is ambiguous AND names exactly one of
       the carrying systems, that is the visitor choosing ("the metal copper"). */
    if (ambiguous.length && !resolved.length) {
      const systems = systemsNamedInQuestion(q);
      if (systems.length === 1) {
        const hit = ambiguous[0].matches.filter((m) => m.sys === systems[0]);
        if (hit.length === 1) {
          ambiguous.pop();
          resolved.push(hit[0]);
        }
      }
    }
  } else {
    /* ── The question names nothing, so it continues the reconstructed subject. ──
       The subject is rebuilt chronologically, which is what makes a clarification
       stick, keeps a suspended ambiguity suspended, and lets a new unknown subject
       abandon the older record so a later pronoun cannot revive it. */
    const state = Array.isArray(history) ? reconstructSubject(history) : { kind: "none" as const };
    if (state.kind === "ambiguous") {
      const settled = clarify(q, state);
      if (settled) resolved.push(settled);
      else if (systemsNamedInQuestion(q).length > 0) {
        // Still unresolved: keep it visibly pending rather than answering as though
        // the visitor had chosen.
        const systemConflicts = systemsNamedInQuestion(q).length > 1;
        if (systemConflicts) ambiguous.push(state.ambiguity);
      }
    } else if (state.kind === "resolved" && looksLikeFollowUp(q)) {
      resolved.push(state.record);
    }
  }

  const blocks: string[] = [];
  const ids: string[] = [];

  for (const record of resolved) {
    /* ── A JOURNAL OR ARTWORK RECORD ─────────────────────────────────────────────────
       Its own text is selected from the record by the SAME bounded-evidence helper a
       research connection uses, at the same grounding cap the correspondence path is held
       to, and it is supplied as SOURCE TEXT. A record whose text does not fit says so,
       rather than being replaced by a summary written here. */
    if (record.kind === "journal" || record.kind === "artwork") {
      const what = record.kind === "journal" ? "Journal" : "Artwork";
      const evidence = record.href ? recordEvidenceForHref(record.href, MAX_GROUNDING_CHARS) : null;
      if (evidence) {
        blocks.push(
          [
            `The visitor named this ${what} record in the question (it was resolved by its own title, not selected from a page):`,
            `It is the record ${record.id} at ${record.href}.`,
            "",
            ...evidence.lines,
            "",
            `Answer from this record. The quoted text above is the record's own words: do not replace it with a summary of your own, and do not ask the visitor to open the record's page first. Broader retrieval may deepen the answer but must not substitute a different record for this one.`,
          ].join("\n")
        );
        ids.push(record.id);
      } else {
        blocks.push(
          `The visitor named a ${what} record, "${record.e}" (${record.href}), whose own text could not be fitted into this context. ` +
            `Say plainly that its contents were not supplied. Do not describe what it contains, do not summarise it, and do not put another record in its place.`
        );
      }
      continue;
    }

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
    const list = item.matches.map(describeForNotice).join("; ");
    blocks.push(
      `The visitor named "${item.name}", which is carried by more than one archive record: ${list}. ` +
        `Do not choose one of them silently — say which records share the name and ask which one is meant.`
    );
  }  /* ── THE CURRENT REFERENT ───────────────────────────────────────────────────
     Carried separately from the literal question, from record grounding and from the
     transcript. Reused from the Batch 23 chronological walk — no second resolver. */
  let subject: CurrentSubject = { kind: "none", text: null, carried: false };
  if (resolved.length) {
    subject = { kind: "record", text: resolved[0].e, carried: !namedByCurrentQuestion, id: resolved[0].id };
  } else if (ambiguous.length) {
    subject = { kind: "ambiguous", text: ambiguous[0].name, carried: !namedByCurrentQuestion };
  } else if (Array.isArray(history)) {
    const state = reconstructSubject(history);
    const followUp = looksLikeFollowUp(q);
    if (state.kind === "resolved") subject = { kind: "record", text: state.record.e, carried: followUp, id: state.record.id };
    else if (state.kind === "ambiguous") subject = { kind: "ambiguous", text: state.ambiguity.name, carried: followUp };
    else if (state.kind === "subject") subject = { kind: "subject", text: state.text, carried: followUp };
  }
  if (subject.kind === "none") {
    const bare = bareSubjectIn(q);
    if (bare) subject = { kind: "subject", text: bare, carried: false };
  }

  return { resolved, ambiguous, blocks, ids, subject };
}
