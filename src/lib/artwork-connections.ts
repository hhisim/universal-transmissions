/**
 * artwork-connections.ts — the archive records that belong to an artwork.
 *
 * This reuses the standard set by `research-connections.ts`: a connection is a CLAIM
 * about a relationship, so every entry has to state WHY it belongs and on what basis.
 * A shared tag is not a relationship, and neither is a keyword that happens to appear in
 * both records. Nothing here is inferred from subject matter; an entry exists only when a
 * record in this repository can be pointed at.
 *
 * Two directions are represented, and they are the SAME claim seen from either end:
 *
 *  1. A Journal post that names the work. Sourced from a literal map below, because the
 *     slug has to be checked against the artwork it names — some installments have no
 *     post at all, and a missing post is recorded as an absence rather than filled in.
 *
 *  2. A research room whose own documented connections already name this artwork. This is
 *     DERIVED by reading `CONNECTIONS_BY_TOPIC` rather than restated, so the artwork page
 *     cannot drift from the research room: if the research side stops naming the work,
 *     the artwork side stops claiming it too.
 *
 * The distinction the archive holds elsewhere is preserved here: an entry's `basis` says
 * whether a link is documented in a record, a thematic shared subject, or a UT
 * interpretation. Prose that merely mentions a work is NOT promoted to a connection.
 */

import { CONNECTIONS_BY_TOPIC, type ConnectionBasis } from "./research-connections";
import { RESEARCH_DOMAINS } from "./research-topics";

export interface ArtworkConnection {
  /** Stable anchor for this connection, addressable and never derived from prose. */
  anchorSlug: string;
  href: string;
  /** What kind of record this is: Journal, Research, Codex. */
  kind: string;
  title: string;
  /** Why this belongs. Required — an unexplained link is not allowed here. */
  rationale: string;
  basis: ConnectionBasis;
  basisLabel: string;
  /** The question this connection's Oracle entry opens with. */
  suggestedQuestion: string;
}

/**
 * Journal records that explicitly name a work in this registry.
 *
 * Each `why` quotes or points at what the record actually does, so the claim can be
 * checked against the post rather than taken on trust. Installments with no post are
 * listed in ARTWORK_CONNECTION_GAPS instead of being given a near-miss link.
 */
const JOURNAL_BY_ARTWORK: Record<
  string,
  { slug: string; title: string; why: string; question: string }[]
> = {
  "vitruvian-spirit": [
    {
      slug: "universal-transmissions-xi-vitruvian-spirit-seeding-the-new-renaissance",
      title: "Universal Transmissions XI — Vitruvian Spirit (Seeding the New Renaissance)",
      why:
        "The work's own long-form record: a Journal post carrying the same title as the artwork itself, written about this piece's making and its place in the series. This is the archive's own account of the work, not a reading placed beside it.",
      question:
        "This piece has its own making-of record — what did seeding a 'new renaissance' mean while the work was being built, as opposed to what it is read to mean now?",
    },
  ],
  "cosmic-egg": [
    {
      slug: "universal-transmissions-ix-the-cosmic-egg",
      title: "Universal Transmissions IX — The Cosmic Egg",
      why:
        "A Journal post named for this installment, discussing the work directly. The record and the artwork share a title because the post IS the work's own account of itself.",
      question:
        "The Cosmic Egg is recorded as a container that has to break — how does this work hold that breaking, and where does the record stop describing and start interpreting?",
    },
  ],
  "recursive-pantheism": [
    {
      slug: "universal-transmissions-viii-recursive-pantheism",
      title: "Universal Transmissions VIII — Recursive Pantheism",
      why:
        "The installment's own Journal record, sharing the work's title and covering its creation. It is also the record in which the artwork's description says it syncretises macro and micro, zodiac and chakra centres.",
      question:
        "The record claims this work syncretises macro and micro — what is actually fused in the image, and what remains a UT reading laid over it?",
    },
  ],
};

/** Honest absences: an installment with no dedicated Journal record, stated rather than filled. */
export const ARTWORK_CONNECTION_GAPS: Record<string, string[]> = {
  merkaba: [
    "No Journal record names this installment, so no Journal connection is claimed. Its only documented archive link is the research room below.",
  ],
  tetra: [
    "No Journal record is named for this installment. Other posts discuss tetrahedral geometry as a subject, but a shared subject is not a record about this work, so none is claimed as a connection.",
  ],
};

/**
 * Research rooms that already name this artwork in their own documented connections.
 *
 * Derived, not restated: this walks the same data the research page renders, so the two
 * surfaces cannot disagree about whether the relationship exists.
 */
export function researchRoomsForArtwork(artworkSlug: string): ArtworkConnection[] {
  const target = `/gallery/${artworkSlug}`;
  const out: ArtworkConnection[] = [];
  for (const [topicId, connections] of Object.entries(CONNECTIONS_BY_TOPIC)) {
    const match = connections.find((c) => c.href === target);
    if (!match) continue;
    const domain = RESEARCH_DOMAINS.find((d) => d.slug === topicId);
    out.push({
      anchorSlug: `artwork-${artworkSlug}--from-${topicId}`,
      href: `/research/${topicId}`,
      kind: "Research",
      title: domain ? `${domain.title} — research room` : topicId,
      /* The research room's own rationale is reused verbatim: the claim is the same one,
         and paraphrasing it here would let the two surfaces drift apart. */
      rationale: `${match.rationale} (Reused from the ${domain?.title ?? topicId} room, where this artwork is already a documented connection.)`,
      basis: match.basis,
      basisLabel: match.basisLabel,
      suggestedQuestion: match.suggestedQuestion,
    });
  }
  return out;
}

/** Journal connections for a work, as full entries. */
export function journalConnectionsForArtwork(artworkSlug: string): ArtworkConnection[] {
  const posts = JOURNAL_BY_ARTWORK[artworkSlug] ?? [];
  return posts.map((p) => ({
    anchorSlug: `artwork-${artworkSlug}--journal-${p.slug}`,
    href: `/journal/${p.slug}`,
    kind: "Journal",
    title: p.title,
    rationale: p.why,
    basis: "documented" as ConnectionBasis,
    basisLabel: "The work's own Journal record",
    suggestedQuestion: p.question,
  }));
}

/**
 * Every archive connection for a work, Journal first.
 *
 * The order is deliberate: a record about the work itself outranks a room that merely
 * lists it, so the strongest basis is read first.
 */
export function connectionsForArtwork(artworkSlug: string): ArtworkConnection[] {
  return [
    ...journalConnectionsForArtwork(artworkSlug),
    ...researchRoomsForArtwork(artworkSlug),
  ];
}
