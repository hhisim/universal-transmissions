/**
 * The shapes shared by the server that RESOLVES a record and the client that OFFERS it.
 *
 * Types only, and deliberately no imports: the browser must never pull the resolver, the
 * Journal dataset or the artwork registry just to render a link. The server builds these
 * from the existing resolved identities; the client only reads them.
 */

/** How the archive labels a record. The visitor sees this, so it is never a raw system key. */
export type RecordLinkKind = "Journal" | "Artwork" | "Correspondence";

export interface RecordLink {
  /**
   * The record's stable identity. Carried so the server, the tests and a reviewer can map an
   * identity to exactly one destination. It is NOT rendered: no raw identifier reaches the page.
   */
  id: string;
  /** The record's own title, exactly as its own page renders it. */
  title: string;
  /** Journal, Artwork or Correspondence. */
  kind: RecordLinkKind;
  /** The correspondence system this record belongs to, when it has one. */
  system?: string;
  /** The record's canonical destination — its own article, gallery page, or archive record. */
  href: string;
}

/**
 * A title MORE than one record carries. Reported as alternatives so the visitor can choose;
 * nothing in this shape marks one of them as taken, because none has been.
 */
export interface RecordLinkAlternative {
  /** The name as the visitor wrote it. */
  name: string;
  /** Every record carrying it, in registry order. Never empty. */
  options: RecordLink[];
}

/** The records an answer may offer, in the order the resolver admitted them. */
export interface RecordLinkSet {
  /** Unambiguously named records, in mention order. */
  resolved: RecordLink[];
  /** Names carried by more than one record, reported rather than chosen between. */
  ambiguous: RecordLinkAlternative[];
}

/** True when there is nothing to offer — an unknown subject gets no card at all. */
export function isEmptyLinkSet(set: RecordLinkSet | null | undefined): boolean {
  return !set || (set.resolved.length === 0 && set.ambiguous.length === 0);
}

/**
 * A correspondence system as the archive writes it for visitors: PLATONIC_SOLIDS → Platonic
 * Solids. Same convention the Codex Archive uses, so one record is not named two ways.
 */
export function prettySystemName(sys: string): string {
  return String(sys ?? "")
    .split("_")
    .map((w) => (w.length <= 2 ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}
