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
 *
 * The Instrument entry was appended last so the six connections released with the
 * Cymatics room keep their original anchors and their order.
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
  /* ── The instrument room (batch 17) ─────────────────────────────────────────
     Appended last so the six connections above keep the anchors and the order they
     were released with. The instrument is the one record in this room that PERFORMS
     the room's subject rather than writing about it, which is why it belongs here
     rather than in a separate list. */
  {
    anchorSlug: "instrument-universal-resonator",
    href: "/experience/universal-resonator",
    kind: "Instrument",
    title: "The Universal Resonator",
    rationale:
      "The archive's own instrument for this room: it solves a driven plate or membrane field and renders the nodal structure as tethered sand, with a live 2D model monitor. It belongs because it is the only record here that performs the room's subject instead of describing it - the visitor drives a medium and reads the pattern that forms. Its own record is explicit about the limit, and that limit travels with this connection rather than staying on the instrument page: the plate is an idealised model, so what it shows is the structure of the model's own mathematics made visible. It is not a physical measurement of a real plate, it is not a prediction for any particular sheet of material you could hold, and the monitor is a model diagnostic rather than a decorative thumbnail. Idealised is not the same as false - the model is real and it is solved honestly - but nothing here should be read as an experimental result.",
    basis: "documented",
    basisLabel: "A UT instrument, with its model stated in its own record",
    destinationNote:
      "The room opens as a reading page. The instrument itself does not load until you launch it, and leaving stops its audio and graphics.",
    suggestedQuestion:
      "The instrument solves a model rather than measuring a real plate - what exactly is it solving, and where does that model stop being able to tell you about a physical plate?",
  },
];

/**
 * Geometry connections, curated from records that already exist in this repo.
 * Same contract as above: every href is a real route, every title is the record's
 * own title, and every entry states why it belongs and on what basis.
 *
 * The registers this room keeps apart are mathematical property, historical
 * documentation, traditional symbolism and UT artistic reading. A connection that
 * rests on a traditional reading says so, and one that rests on a UT record is
 * never dressed as an external citation.
 */
export const GEOMETRY_CONNECTIONS: ResearchConnection[] = [
  {
    anchorSlug: "room-cymatics",
    href: "/research/cymatics",
    kind: "Research room",
    title: "Cymatics — the parallel research room",
    rationale:
      "The two rooms study the same question from opposite ends. Geometry asks what the ratios themselves are; cymatics asks what a driven medium does. The relationship is real and worth following, but its limit matters: a Chladni figure and a constructed mandala can look alike, and that resemblance is NOT evidence of a shared mechanism. The plate's nodal pattern is produced by standing waves in a specific medium at a specific frequency; a drawn figure is produced by an intention. Nothing in this archive measures a geometric construction emerging from vibration, and the archive holds no experiment of that kind. It is linked here as a parallel inquiry, in that order.",
    basis: "thematic",
    basisLabel: "Parallel inquiry — resemblance is not mechanism",
    suggestedQuestion:
      "Both rooms talk about pattern in vibration and form — where exactly does the archive stop short of claiming that geometry and sound share one mechanism?",
  },
  {
    anchorSlug: "codex-geometry-lattice",
    href: "/experience/correspondence-codex",
    kind: "Codex",
    title: "The UT Correspondence Codex",
    rationale:
      "The archive's own GEOMETRY system, 20 entries — Circle, Cube, Hexagon, Hexagram, Decagon, Dodecagon, Flower of Life, Metatron's Cube and others — each carrying UT's symbolic correspondences (alchemical stage, deity, colour, crystal, tone). It is the archive's geometric index and the record set the symbolic readings in this room come from. It is a symbolic lattice, not a geometric reference: the correspondence of the Hexagon to Venus is an assignment this project makes, and the entries state no mathematical property of a hexagon.",
    destinationNote:
      "The Codex has no link that targets a single system, so this opens its front page. GEOMETRY is one of the 27 system cards on the Codex Home tab: choose \"🔺 GEOMETRY (20 entries)\", which opens the Matrix tab with that system selected. The same button sits in the Matrix tab's system bar.",
    basis: "documented",
    basisLabel: "Catalogued in the archive's own GEOMETRY lattice",
    suggestedQuestion:
      "The codex catalogs geometric forms with symbolic correspondences - which parts of that are properties of the forms, and which are symbolic assignments?",
  },
  {
    anchorSlug: "artwork-tetra",
    href: "/gallery/tetra",
    kind: "Artwork",
    title: "Universal Transmissions IV — Tetra",
    rationale:
      "The only artwork in the registry whose own record names its geometry outright: it \"explores tetrahedral geometry and its relationship to higher dimensional reality\". The first half of that sentence is a description of the work's subject; the second half is the work's own speculative frame, and the two are held apart here rather than merged.",
    basis: "documented",
    basisLabel: "Named in the artwork's own record",
    suggestedQuestion:
      "The record says the work explores tetrahedral geometry and higher dimensions - which of those two halves is a description of the work, and which is its own speculation?",
  },
  {
    anchorSlug: "journal-vitruvian-spirit",
    href: "/journal/universal-transmissions-xi-vitruvian-spirit-seeding-the-new-renaissance",
    kind: "Journal",
    title: "Universal Transmissions XI - Vitruvian Spirit (Seeding the New Renaissance)",
    rationale:
      "The archive's own treatment of proportion in the Vitruvian register — the human figure resolved into a circle and a square. It is included because proportion is the subject here and the Journal is where this archive argues for it at length. The Vitruvian construction is a Renaissance drawing of an ancient proportion text; it is not a measurement of the body.",
    basis: "documented",
    basisLabel: "UT writing on this subject",
    suggestedQuestion:
      "The Vitruvian construction places a figure in a circle and a square - what is documented about the proportions it uses, and what is the archive reading into it?",
  },
  {
    anchorSlug: "journal-walter-russell-universal-one",
    href: "/journal/walter-russell-universal-one-cosmology-of-light",
    kind: "Journal",
    title: "Walter Russell's The Universal One: When Cosmology Became a Diagram of Light",
    rationale:
      "A documented case of cosmological argument carried by a drawn geometry rather than by mathematics. It belongs here as evidence of a practice — a twentieth-century author reasoning in diagrams — and the Journal piece treats it as such. Russell's diagrams are not derived from measurement, and the entry is placed with that stated.",
    basis: "documented",
    basisLabel: "UT writing on this subject",
    suggestedQuestion:
      "Russell reasoned in diagrams rather than equations - what can a diagram establish on its own, and where does that practice need a measurement underneath it?",
  },
  {
    anchorSlug: "artwork-merkaba",
    href: "/gallery/merkaba",
    kind: "Artwork",
    title: "Universal Transmissions III — Merkaba",
    rationale:
      "The artwork's record names the Merkaba — \"a spiraling force of counter-rotating fields of light\". The interlocking-tetrahedron form is a TRADITIONAL reading of that name, not something the record states, and its description is of a light vehicle rather than of a solid. Held as a UT artistic interpretation that draws on a traditional form, so the geometric reading is not presented as the record's own claim.",
    basis: "interpretation",
    basisLabel: "UT artwork read through its traditional form",
    suggestedQuestion:
      "The record describes a light vehicle and the geometry comes from a traditional reading - how should the two be held together without one standing in for the other?",
  },
];

/**
 * Geometry's honest absences. The room is new, so what it does NOT yet hold is
 * stated as plainly as what it does.
 */
export const GEOMETRY_GAPS = [
  "This room does not claim that any UT symbolic correspondence in the Codex's GEOMETRY lattice is a property of the form itself. The lattice assigns meanings; it does not measure.",
  "The Geometry↔Cymatics relationship is presented as a parallel inquiry. No experiment in this archive shows a geometric construction emerging from vibration, and visual resemblance between a nodal pattern and a drawn figure is not offered here as evidence of a shared mechanism.",
  "External references on this page support historical and mathematical statements only — that a treatise exists, that a construction is documented, that a solid was associated with an element in a named text. They are not presented as endorsing any UT reading.",
  "The room covers classical Euclidean and Platonic material. Non-Euclidean geometry, higher-dimensional and projective treatments are not yet part of it, and no entry above should be read as covering them.",
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

/**
 * Connections per research topic, keyed by the topic's registry slug.
 *
 * ONE map for every room: `research-topics.ts` derives each room's Oracle anchors from
 * this, so a second room cannot end up with a second registry or a second resolver.
 * Declared here, after both arrays, so the ordering is explicit rather than incidental.
 */
export const CONNECTIONS_BY_TOPIC: Record<string, ResearchConnection[]> = {
  cymatics: CYMATICS_CONNECTIONS,
  geometry: GEOMETRY_CONNECTIONS,
};

/** Honest absences per research topic. */
export const GAPS_BY_TOPIC: Record<string, string[]> = {
  cymatics: CYMATICS_GAPS,
  geometry: GEOMETRY_GAPS,
};
