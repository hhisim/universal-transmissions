import { codex, type CodexEntry } from "@/lib/codex-data";

/**
 * Derived corpus summary.
 *
 * Every visitor-facing count must come from here. These values were previously
 * hand-copied numeric literals (577, 1000+, 824) that drifted from the dataset
 * and from each other. They are now computed once from the source records.
 *
 * Measurement definitions, stated precisely so a reader is never misled:
 *
 *  - sourceRecords: every row in the dataset, counted as authored. Four DEITIES
 *    identities are each present twice, so this is 824 while distinct
 *    identities number 820. The duplicate rows are retained deliberately; the
 *    public (sys,e) identifier is unchanged and corpus deduplication is
 *    separate work.
 *  - distinctIdentities: unique (sys,e) pairs — the number of records a visitor
 *    can actually address by public id.
 *  - systemCount: distinct systems.
 *
 * Deliberately NOT derived: any "unique entities" figure inflated by relation
 * tokens. Relation values are symbolic links between records, not entries, and
 * adding them to a count would overstate the corpus to a visitor.
 *
 * This module derives counts from the corpus in the same module the Oracle dock
 * already uses, so it is safe to import from a server component. Landing pages
 * must import only CORPUS_SUMMARY (a few numbers), never `codex` itself.
 */
export interface CorpusSummary {
  /** 824 — every source record, duplicates included. */
  sourceRecords: number;
  /** 820 — unique (sys,e) identities, i.e. publicly addressable records. */
  distinctIdentities: number;
  /** 27 — distinct systems. */
  systemCount: number;
}

function summarize(entries: readonly CodexEntry[]): CorpusSummary {
  const identities = new Set<string>();
  const systems = new Set<string>();
  for (const entry of entries) {
    identities.add(`${entry.sys}:${entry.e}`);
    systems.add(entry.sys);
  }
  return {
    sourceRecords: entries.length,
    distinctIdentities: identities.size,
    systemCount: systems.size,
  };
}

/** Counts derived from the real dataset — never hand-edited. */
export const CORPUS_SUMMARY: CorpusSummary = summarize(codex);

/**
 * Primary visitor-facing phrasing. Records, not entities.
 * e.g. "824 correspondence records across 27 systems"
 */
export function corpusRecordsLine(s: CorpusSummary = CORPUS_SUMMARY): string {
  return `${s.sourceRecords} correspondence records across ${s.systemCount} systems`;
}