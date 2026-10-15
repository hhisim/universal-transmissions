/**
 * record-evidence.ts - bounded, server-selected evidence from the actual record a
 * research connection names.
 *
 * A connection anchor reaches the Oracle as a RATIONALE: a sentence written ABOUT
 * the record, plus the room's registers. The record's own content did not travel.
 * An answer about "this record" was therefore written from a description of it, and
 * a question asking how a record's own account compares with anything had only the
 * blurb to compare with - which is how a derived summary ends up speaking for the
 * record it summarises.
 *
 * This module selects a bounded extract from the record itself, at render time, from
 * the same datasets the pages render. Nothing here is client-supplied and nothing is
 * generated prose.
 *
 * THE BUDGET IS AN INPUT, NOT A HOPE. The composed provider message is bounded and the
 * route REFUSES rather than truncating when it is exceeded - so evidence large enough
 * to matter is also evidence large enough to turn a legitimate question into a 413.
 * Every entry point here takes the space it is genuinely allowed and returns something
 * that fits inside it, or null when nothing sensible fits. The caller then states
 * honestly that the record's contents were not supplied, rather than letting a derived
 * rationale stand in for them.
 *
 * THREE LIMITS ARE LOAD-BEARING and are stated in the output rather than left to
 * inference, because each is a place where an absence gets read as a denial:
 *
 *   1. An extract is an EXTRACT. The rest of the work was not supplied, and the output
 *      says so, so silence cannot become "the work does not say this".
 *   2. A catalogue entry is the ARCHIVE'S OWN ASSIGNMENT. It is not a finding of
 *      analysis and not a historical source.
 *   3. Nothing supplied here is evidence about what exists outside it.
 *
 * Imports are deliberately narrow. `codex-archive.ts` imports `research-topics.ts`, so
 * importing it back would create a cycle; the Codex path goes through
 * `oracle-entry-resolver.ts`, which reads the same dataset and is cycle-free.
 */

import { artworks } from "@/data/artworks";
import { blogPosts } from "@/data/blog-posts";
import { codex } from "@/lib/codex-data";
import {
  correspondenceEntryId,
  resolveOracleEntity,
} from "@/lib/oracle-entry-resolver";
import type { ResearchConnection } from "@/lib/research-connections";

/** Longest a body extract may ever be, whatever budget is offered. */
export const MAX_EXTRACT_CHARS = 900;
/** Below this there is no honest extract to give, so none is given. */
export const MIN_EVIDENCE_CHARS = 260;
/** Shortest real passage worth supplying. An empty or stub record yields NO evidence
 *  rather than a labelled frame around nothing: a heading with no text under it would
 *  tell the model a record's own words were supplied when none were. */
export const MIN_EXTRACT_CHARS = 120;

export interface RecordEvidence {
  /** Which dataset the record was located in. */
  source: "journal" | "artwork" | "codex";
  /** The record's own title, from the record. */
  title: string;
  /** Bounded lines to append to the connection's grounding. Never exceeds budget. */
  lines: string[];
  /** Characters this evidence contributes. Measured, not estimated. */
  chars: number;
}

export interface EvidenceOptions {
  /** Total characters this evidence may occupy, including its own labels. */
  budget: number;
  /** Most Codex records to sample. */
  sample?: number;
}

/** Cut at a sentence boundary near `max`, so an extract never trails mid-clause. */
function bounded(text: string, max: number): { text: string; truncated: boolean } {
  const clean = text.replace(/\s+/g, " ").trim();
  if (max <= 0) return { text: "", truncated: true };
  if (clean.length <= max) return { text: clean, truncated: false };
  const window = clean.slice(0, max);
  const cut = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("? "),
    window.lastIndexOf("! ")
  );
  const text2 = cut > max * 0.5 ? window.slice(0, cut + 1) : window.trimEnd() + " [...]";
  return { text: text2, truncated: true };
}

/** Strip the markdown scaffolding that would only cost budget in a prompt. */
function plain(md: string): string {
  return md
    .replace(/^---[\s\S]*?^---/m, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

/** `/journal/<slug>` -> the Journal record's own opening text. */
function journalEvidence(href: string, budget: number): RecordEvidence | null {
  const slug = href.replace(/^\/journal\//, "").split(/[?#]/)[0];
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return null;
  const full = plain(String(post.content ?? ""));
  const head = [
    `THE RECORD'S OWN CONTENT (selected server-side from /journal/${slug}):`,
    `Title: ${post.title}`,
    post.publishedAt ? `Published: ${post.publishedAt}` : "",
    post.excerpt ? `Its own summary line: ${post.excerpt}` : "",
  ].filter(Boolean);
  /* The closing note is the part that stops an extract being read as the whole work,
     so its cost is reserved BEFORE the extract is sized - never trimmed to fit after. */
  const note =
    `(An EXTRACT of a ${full.length}-character piece. Its remainder is NOT supplied here, and its ` +
    `absence is a limit of this context - not a statement about what the piece says.)`;
  const room = budget - head.join("\n").length - note.length - 8;
  if (room < MIN_EVIDENCE_CHARS) return null;
  const body = bounded(full, Math.min(MAX_EXTRACT_CHARS, room));
  /* A record with no usable text gets NO evidence. Without this the module emitted the
     labels and an empty quote, and a caller checking for the label would report the
     record's own words as supplied when nothing had been read. */
  if (full.length < MIN_EXTRACT_CHARS || body.text.length < MIN_EXTRACT_CHARS) return null;
  const lines = [...head, "", "Its opening text, quoted:", `"${body.text}"`, note];
  return { source: "journal", title: post.title, lines, chars: lines.join("\n").length };
}

/** `/gallery/<slug>` -> the Artwork record's own description. */
function artworkEvidence(href: string, budget: number): RecordEvidence | null {
  const slug = href.replace(/^\/gallery\//, "").split(/[?#]/)[0];
  const art = artworks.find((a) => a.slug === slug);
  if (!art) return null;
  const head = [
    `THE RECORD'S OWN ACCOUNT (selected server-side from /gallery/${slug}):`,
    `Title: ${art.title}`,
    art.year ? `Year: ${art.year}` : "",
    art.medium ? `Medium as recorded: ${art.medium}` : "",
  ].filter(Boolean);
  const note =
    "This is the artist's or the archive's own account of the work, and it is carried here as " +
    "what the record says about itself - the statement the piece is made from.";
  const room = budget - head.join("\n").length - note.length - 10;
  if (room < MIN_EVIDENCE_CHARS) return null;
  const desc = bounded(String(art.description ?? ""), room);
  if (desc.text.length < MIN_EXTRACT_CHARS) return null;
  const lines = [...head, "", "Its own description, quoted:", `"${desc.text}"`, note];
  return { source: "artwork", title: art.title, lines, chars: lines.join("\n").length };
}

/**
 * `/codex/archive?system=X` -> a bounded sample of that system's actual records,
 * rendered through the SAME resolver the Oracle's own dock uses. Fields are added
 * until the budget runs out, and the number NOT shown is stated.
 */
function codexEvidence(href: string, budget: number, sample: number): RecordEvidence | null {
  const m = /[?&]system=([^&#]+)/.exec(href);
  if (!m) return null;
  const sys = decodeURIComponent(m[1]);
  const entries = codex.filter((e) => String(e.sys) === sys);
  if (entries.length === 0) return null;

  const resolved = entries.slice(0, sample).flatMap((entry) => {
    const r = resolveOracleEntity("correspondence_entry", correspondenceEntryId(entry));
    return r.status === "resolved" ? [r.entry] : [];
  });
  if (resolved.length === 0) return null;

  const head = [
    `THE RECORD SET ITSELF (selected server-side from /codex/archive?system=${sys}):`,
    `System: ${sys} - ${entries.length} records in the archive's own catalogue.`,
    "",
    "Shown here with the archive's own field assignments:",
  ];
  const tail =
    `These are the ARCHIVE'S OWN assignments: symbolic correspondences this project holds and ` +
    `works from, carried in the same lattice the imagery is composed from. The other ` +
    `${Math.max(0, entries.length - resolved.length)} records in this system are NOT supplied here; ` +
    `that is a limit of this context, not a statement that they assign nothing.`;

  const lines = [...head];
  const used = () => lines.join("\n").length + tail.length + 4;
  let shown = 0;
  for (const entry of resolved) {
    const block: string[] = ["", `— ${entry.title}`];
    for (const f of entry.fields) block.push(`    ${f.label}: ${f.value}`);
    if (used() + block.join("\n").length <= budget) {
      lines.push(...block);
      shown++;
      continue;
    }
    /* Add fields one at a time rather than dropping the record whole, so a partially
       supplied record is still a usable answer to "what correspondences does it carry". */
    const partial: string[] = ["", `— ${entry.title}`];
    for (const f of entry.fields) {
      const line = `    ${f.label}: ${f.value}`;
      if (used() + partial.join("\n").length + line.length + 1 > budget) break;
      partial.push(line);
    }
    if (partial.length > 2) {
      partial.push("    (further fields on this record were not supplied)");
      lines.push(...partial);
      shown++;
    }
    break;
  }
  if (shown === 0) return null;
  lines.push("", tail);
  return { source: "codex", title: `The Archive — ${sys} system`, lines, chars: lines.join("\n").length };
}

/**
 * The bounded evidence for one connection, or null when there is nothing that fits -
 * in which case the caller must say the contents were not supplied rather than let a
 * derived rationale stand in for them.
 */
export function connectionEvidence(
  c: ResearchConnection,
  opts: EvidenceOptions
): RecordEvidence | null {
  const budget = Math.max(0, Math.floor(opts.budget));
  if (budget < MIN_EVIDENCE_CHARS) return null;
  const sample = opts.sample ?? 1;
  if (c.href.startsWith("/journal/")) return journalEvidence(c.href, budget);
  if (c.href.startsWith("/gallery/")) return artworkEvidence(c.href, budget);
  if (c.href.startsWith("/codex/archive")) return codexEvidence(c.href, budget, sample);
  return null;
}

/** The honest line for a destination whose contents are not supplied. */
export function noEvidenceLine(c: ResearchConnection): string {
  return (
    `The contents of this ${c.kind.toLowerCase()} record are NOT supplied with this context: its own ` +
    `text was not placed in front of you and was not read for this answer. Do not describe what it ` +
    `contains or summarise it, and do not treat its absence from this context as a statement that it ` +
    `says nothing, or that it does not exist.`
  );
}
