/**
 * From a resolved identity to the place that record lives.
 *
 * The resolver already knows WHICH records a question named — `NamedRecord` carries the
 * record's own title (`e`), its kind, its system and, for a Journal piece or an artwork, its
 * canonical route. This module turns those identities into destinations and nothing else:
 *
 *   Journal        -> the article the Journal index carries it at
 *   Artwork        -> the gallery page the artwork registry carries it at
 *   Correspondence -> the record's own entry in the released Codex Archive
 *
 * It reads no prose, guesses no slug and builds no second index: a record is offered only if
 * the registry that owns it already knows where it lives. A record whose destination cannot
 * be established is omitted rather than linked somewhere plausible.
 */
import { archiveHref } from "./codex-archive";
import type { NamedRecord, NamedRecordResolution } from "./named-record-resolver";
import type { RecordLink, RecordLinkAlternative, RecordLinkSet } from "./record-link-types";

/**
 * Where a Codex Archive record returns to. The archive itself renders `?from=` as
 * "← RETURN TO WHERE YOU WERE", and it validates that value as a same-site path, so this is
 * the visitor's way back to the conversation they left.
 */
export const ORACLE_RETURN_PATH = "/oracle";

/** A record's canonical destination, or null when its registry does not carry one. */
export function linkForRecord(record: NamedRecord, from: string = ORACLE_RETURN_PATH): RecordLink | null {
  if (record.kind === "correspondence") {
    // A correspondence record's page IS its entry in the archive: a stable identifier the
    // archive resolves server-side. Nothing is inferred from the record's name.
    return {
      id: record.id,
      title: record.e,
      kind: "Correspondence",
      system: record.sys,
      href: archiveHref(record.id, from),
    };
  }
  if (!record.href) return null; // no canonical route known: omit rather than invent one
  return {
    id: record.id,
    title: record.e,
    kind: record.kind === "journal" ? "Journal" : "Artwork",
    href: record.href,
  };
}

/**
 * The link set for one answer, in the resolver's own order.
 *
 * `resolved` keeps MENTION ORDER — the visitor's, not the order of the passes that found the
 * records — and an ambiguous name stays a group of alternatives. Returns null when there is
 * nothing to offer, so an unknown subject acquires no card.
 */
export function recordLinksFor(
  resolution: Pick<NamedRecordResolution, "resolved" | "ambiguous"> | null | undefined,
  from: string = ORACLE_RETURN_PATH
): RecordLinkSet | null {
  if (!resolution) return null;

  const resolved = resolution.resolved
    .map((r) => linkForRecord(r, from))
    .filter((l): l is RecordLink => l !== null);

  const ambiguous: RecordLinkAlternative[] = resolution.ambiguous
    .map((group) => ({
      name: group.name,
      options: group.matches
        .map((m) => linkForRecord(m, from))
        .filter((l): l is RecordLink => l !== null),
    }))
    .filter((group) => group.options.length > 0);

  if (!resolved.length && !ambiguous.length) return null;
  return { resolved, ambiguous };
}
