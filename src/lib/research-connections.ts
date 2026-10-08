import type { ResearchSource } from "@/lib/research-topics";

/**
 * The standing behind a connection. A keyword overlap is not a relationship,
 * so each entry has to state why it belongs and how strongly it is supported.
 */
export type ConnectionBasis = "documented" | "interpretation" | "thematic";

export interface ResearchConnection {
  href: string;
  /** Short label for the record's kind: Artwork, Journal, Instrument, Codex. */
  kind: string;
  title: string;
  /** Why this belongs. Required — no unexplained link is allowed here. */
  rationale: string;
  basis: ConnectionBasis;
  basisLabel: string;
}

/**
 * Cymatics connections, curated from records that already exist in this repo.
 * Every href below is a real route and every title is the record's own title.
 */
export const CYMATICS_CONNECTIONS: ResearchConnection[] = [
  {
    href: "/journal/cymatics-language-of-form",
    kind: "Journal",
    title: "Cymatics and the Language of Form: When Vibration Learns to Spell",
    rationale:
      "The archive's own long-form piece on Hans Jenny's vibrating plate, filed under the tradition tag \"cymatics\" and written about this exact subject — frequency, medium and form as one continuum. It is the deepest existing treatment of the topic in the Journal, and it is where the interpretive register is set out at length rather than asserted.",
    basis: "documented",
    basisLabel: "UT writing on this subject",
  },
  {
    href: "/gallery/throat-chakra",
    kind: "Artwork",
    title: "Bio-Energetic Vortexes No.5 — Truth (Vishuddha Chakra)",
    rationale:
      "The only artwork in the registry whose own description names cymatics as one of its bases: \"based on language, linguistics, cymatics, frequencies and the communicative powers of the Vishuddha Throat Chakra.\" The link is asserted by the record itself rather than inferred from a tag.",
    basis: "documented",
    basisLabel: "Named in the artwork's own record",
  },
  {
    href: "/gallery/recursive-pantheism",
    kind: "Artwork",
    title: "Universal Transmissions VIII — Recursive Pantheism",
    rationale:
      "Its record states it attempts to syncretise macro and micro, zodiac and chakra centres, and explicitly \"cymatic patterns\". It is the clearest case in the archive where a cymatic pattern is being used as a structural argument rather than as surface ornament.",
    basis: "documented",
    basisLabel: "Named in the artwork's own record",
  },
  {
    href: "/gallery/hyperdimensional-harmonics",
    kind: "Artwork",
    title: "Hyperdimensional Harmonics",
    rationale:
      "A member of the Twilight Transmissions whose record describes \"the harmonic integration of hyperdimensional constructs\". It connects to cymatics through the idea of resonance as a compositional method. The relationship is a shared idea rather than a documented citation, and is labelled as such.",
    basis: "thematic",
    basisLabel: "Shared idea — resonance as method",
  },
  {
    href: "/journal/the-kybalion-7-principles-hermetic-philosophy",
    kind: "Journal",
    title: "The Kybalion: The Seven Principles of Hermetic Philosophy Decoded",
    rationale:
      "Vibration is the third of the seven Hermetic principles the piece decodes, which gives cymatics a documented place in the esoteric lineage UT draws on. Included as lineage context: the Kybalion is itself an early-20th-century modern esoteric text, not an ancient source, and the entry is placed for that reason.",
    basis: "thematic",
    basisLabel: "Lineage context",
  },
];

/**
 * What the archive does NOT have. Stated rather than padded: an honest absence is
 * more useful than a thin link, and it keeps the section from implying coverage
 * it cannot support.
 */
export const CYMATICS_GAPS = [
  "The Correspondence Codex holds no cymatics record. Across all 824 entries, neither \"Chladni\" nor \"Jenny\" appears, so there is no correspondence entry to link here without inventing one.",
  "The Solfeggio tone values used symbolically in the work (528, 639, 741, 963 Hz) appear throughout the Correspondence corpus as symbolic attributions. They are recorded there as correspondence material, not as measured physical properties.",
];

export function connectionSources(): ResearchSource[] {
  return [];
}
