/**
 * research-connections.ts - the curated connections for a research topic.
 *
 * A connection is a CLAIM about a relationship, so every entry states why it
 * belongs and which basis it rests on. A shared keyword is not a relationship.
 *
 * This module deliberately imports nothing. `research-topics.ts` derives one
 * Oracle anchor per connection from this data, and an import in this direction
 * would make that a cycle; the unused `connectionSources()` export that pulled
 * `ResearchSource` in was removed for exactly that reason.
 */

export type ConnectionBasis = "documented" | "interpretation" | "thematic";

export interface ResearchConnection {
  /**
   * Stable slug for this connection's Oracle anchor. Addressable as
   * `research-v1:<topic>/connection/<anchorSlug>`. Never derived from prose.
   */
  anchorSlug: string;
  href: string;
  /** Short label for the record's kind: Artwork, Journal, Codex, Instrument. */
  kind: string;
  title: string;
  /** Why this belongs. Required - no unexplained link is allowed here. */
  rationale: string;
  basis: ConnectionBasis;
  basisLabel: string;
  /**
   * How to reach the specific thing this connection names, when the destination
   * is a page that cannot be pointed at it by URL. Optional, and only a
   * destination that does not deep-link needs one: without it a card can only
   * imply that the link lands somewhere it does not.
   */
  destinationNote?: string;
  /** The question this connection's own Oracle entry opens with. */
  suggestedQuestion: string;
}

/**
 * Cymatics connections, curated from records that already exist in this repo.
 * Every href below is a real route and every title is the record's own title.
 */
export const CYMATICS_CONNECTIONS: ResearchConnection[] = [
  {
    anchorSlug: "journal-cymatics-language-of-form",
    href: "/journal/cymatics-language-of-form",
    kind: "Journal",
    title: "Cymatics and the Language of Form: When Vibration Learns to Spell",
    rationale:
      "The archive's own long-form piece on Hans Jenny's vibrating plate, filed under the tradition tag \"cymatics\" and written about this exact subject - frequency, medium and form as one continuum. It is the deepest existing treatment of the topic in the Journal, and it is where the interpretive register is set out at length rather than asserted.",
    basis: "documented",
    basisLabel: "UT writing on this subject",
    suggestedQuestion:
      "This piece sets out the interpretive register at length - where does it separate what the plate does from what the archive reads into it?",
  },
  {
    anchorSlug: "artwork-throat-chakra",
    href: "/gallery/throat-chakra",
    kind: "Artwork",
    title: "Bio-Energetic Vortexes No.5 — Truth (Vishuddha Chakra)",
    rationale:
      "The only artwork in the registry whose own description names cymatics as one of its bases: \"based on language, linguistics, cymatics, frequencies and the communicative powers of the Vishuddha Throat Chakra.\" The link is asserted by the record itself rather than inferred from a tag.",
    basis: "documented",
    basisLabel: "Named in the artwork's own record",
    suggestedQuestion:
      "The record names cymatics among its bases - what in the finished work actually carries that, and what is the chakra correspondence doing?",
  },
  {
    anchorSlug: "artwork-recursive-pantheism",
    href: "/gallery/recursive-pantheism",
    kind: "Artwork",
    title: "Universal Transmissions VIII — Recursive Pantheism",
    rationale:
      "Its record states it attempts to syncretise macro and micro, zodiac and chakra centres, and explicitly \"cymatic patterns\". It is the clearest case in the archive where a cymatic pattern is being used as a structural argument rather than as surface ornament.",
    basis: "documented",
    basisLabel: "Named in the artwork's own record",
    suggestedQuestion:
      "How is a cymatic pattern being used as a structural argument here, rather than as ornament?",
  },
  {
    anchorSlug: "codex-frequency-lattice",
    href: "/experience/correspondence-codex",
    kind: "Codex",
    // The destination's own title. This card used to name the FREQUENCY system
    // here, which reads as a targeted destination: the link opens the Codex
    // front page and nothing more. What the visitor does once they are there is
    // stated in destinationNote instead of implied by the title.
    title: "The UT Correspondence Codex",
    rationale:
      "The archive's own frequency lattice, and the record set the symbolic tone values on this page come from: the solfeggio values assigned symbolic roles in the topic summary (432, 528, 639, 741, 852, 963 Hz) are catalogued there as FREQUENCY entries. It is linked so those assignments can be inspected where they live instead of taken on trust. The lattice is UT symbolic material - the entry labelled \"528 Hz - Miracles\" carries the archive's own symbolic naming, and this page states plainly that the popular therapeutic reading of that value is not supported by the experimental literature.",
    destinationNote:
      "The Codex has no link that targets a single system, so this opens its front page. FREQUENCY is one of the 27 system cards on the Codex Home tab: choose \"〜 FREQUENCY (25 entries)\", which opens the Matrix tab with that system selected. The same button sits in the Matrix tab's system bar.",
    basis: "documented",
    basisLabel: "Catalogued in the archive's own FREQUENCY lattice",
    suggestedQuestion:
      "The codex catalogs these frequency values as UT symbolic assignments - which parts of that are measured, and which parts are symbols?",
  },
  {
    anchorSlug: "artwork-hyperdimensional-harmonics",
    href: "/gallery/hyperdimensional-harmonics",
    kind: "Artwork",
    title: "Hyperdimensional Harmonics",
    rationale:
      "A member of the Twilight Transmissions whose record describes \"the harmonic integration of hyperdimensional constructs\". It connects to cymatics through the idea of resonance as a compositional method. The relationship is a shared idea rather than a documented citation, and is labelled as such.",
    basis: "thematic",
    basisLabel: "Shared idea - resonance as method",
    suggestedQuestion:
      "Resonance as a compositional method is a shared idea here rather than a citation - what does the connection actually rest on?",
  },
  {
    anchorSlug: "journal-kybalion-seven-principles",
    href: "/journal/the-kybalion-7-principles-hermetic-philosophy",
    kind: "Journal",
    title: "The Kybalion: The Seven Principles of Hermetic Philosophy Decoded",
    rationale:
      "Vibration is the third of the seven Hermetic principles the piece decodes, which gives cymatics a documented place in the esoteric lineage UT draws on. Included as lineage context: the Kybalion is itself an early-20th-century modern esoteric text, not an ancient source, and the entry is placed for that reason.",
    basis: "thematic",
    basisLabel: "Lineage context",
    suggestedQuestion:
      "Vibration as a Hermetic principle is lineage context rather than a scientific source - how should that be held alongside the experiment?",
  },
];

/**
 * What the archive does NOT have. Stated rather than padded: an honest absence is
 * more useful than a thin link, and it keeps the section from implying coverage
 * it cannot support.
 */
export const CYMATICS_GAPS = [
  "No single Correspondence-entry passage is linked in this pilot: the Codex link above is the FREQUENCY system as a whole rather than a reading of one entry. A passage that engages the subject under other names would not have been caught by a keyword search, so this is an editorial choice for this page rather than a claim that the Codex is silent on it.",
  "The tone values used in the work (432, 528, 639, 741, 852, 963 Hz) are UT symbolic material. They are catalogued in the archive's own frequency lattice and are not presented here as measured physical properties.",
  "The labels above describe how each connection is held, not scientific evidence. \"Documented\" means the record names the relationship; \"thematic\" means it shares an idea; and every connection here is a UT record, not an external citation.",
];
