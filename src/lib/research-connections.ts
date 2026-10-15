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
      "The piece reads the figures at length - how does the archive move from the plate to the meaning it draws from it?",
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
      "The record names cymatics among its bases - where do you see that in the finished work, and how does the chakra correspondence live there?",
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
      "How does the cymatic pattern hold this piece together - what does it structure?",
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
      "The archive's own frequency lattice, and the record set the symbolic tone values on this page come from. The solfeggio values the work is built on (432, 528, 639, 741, 852, 963 Hz) are catalogued there as FREQUENCY entries, each carrying the name the archive gives it - 432 Hz natural tuning, 528 Hz the love frequency, 639 Hz harmony, 741 Hz awakening, 852 Hz the third eye, 963 Hz the crown tone. Open it to read the values where they live, in the lattice the imagery is composed from.",
    destinationNote:
      "The Codex has no link that targets a single system, so this opens its front page. FREQUENCY is one of the 27 system cards on the Codex Home tab: choose \"〜 FREQUENCY (25 entries)\", which opens the Matrix tab with that system selected. The same button sits in the Matrix tab's system bar.",
    basis: "documented",
    basisLabel: "Catalogued in the archive's own FREQUENCY lattice",
    suggestedQuestion:
      "Walk me through the frequency lattice - what does each tone carry in the archive's own naming?",
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
      "Resonance runs through both the room and this artwork - how does the piece compose with it?",
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
      "How does the Hermetic principle of vibration sit alongside the cymatics work - where do the two meet?",
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
      "Take me inside the Resonator - what is it solving, and what do you see when you watch it move?",
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
      "The two rooms study one question from opposite ends: geometry asks what the ratios themselves are, and cymatics asks what a driven medium does when it is sung into. Follow them together and the same figures keep returning - the nodal pattern on the plate and the constructed mandala, the standing wave and the drawn proportion. The archive holds them as two approaches to a single inquiry, and this is where the two rooms are read side by side.",
    basis: "thematic",
    basisLabel: "Parallel inquiry - two rooms, one question",
    suggestedQuestion:
      "Geometry and Cymatics circle one question from opposite sides - how does the archive hold the two together?",
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
      "The archive's own treatment of proportion in the Vitruvian register — the human figure resolved into a circle and a square. It is included because proportion is the subject here and the Journal is where this archive argues for it at length. The Vitruvian construction is a Renaissance drawing of an ancient proportion text, and proportion is the argument.",
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
      "Russell thought in diagrams - what does his way of reasoning open up for this archive's own work?",
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
  "The Codex GEOMETRY lattice is the archive's own assignment set: twenty correspondences the work is composed from.",
  "Geometry and Cymatics are two rooms pursuing one inquiry from different sides - form as the structure of space, and form arising from vibration.",
  "The references on this page are the classical sources the room reads: Euclid's Elements, Plato's Timaeus and Kepler's Harmonices Mundi.",
  "This room covers classical Euclidean and Platonic material. Non-Euclidean geometry, higher-dimensional and projective treatments are not yet part of it.",
];

/**
 * What the archive does NOT have. Stated rather than padded: an honest absence is
 * more useful than a thin link, and it keeps the section from implying coverage
 * it cannot support.
 */
export const CYMATICS_GAPS = [
  "The tone values on this page are the archive's symbolic naming, given as the work's own scheme.",
  "The reading of a cymatic figure as a mandala, a cell or a cosmogram is the archive's reading, and it is the reading the imagery is composed from.",
  "The works cited are the archive's sources on this subject: Chladni's 1787 treatise, Jenny's Kymatik, and a physical-society account of the figures. They are listed so the material can be followed back to its originals.",
  "This room covers the classical cymatics lineage. The Chladni plate as a mathematical problem, modern modal analysis and sonification practice are not yet part of it.",
];


/**
 * Linguistics connections.
 *
 * Four registers are kept apart here, because this is the room where they are most
 * easily merged: established linguistic knowledge, historical accounts of real
 * writing systems, tradition-specific letter associations, and UT's own script and
 * xenolinguistic constructions. Nothing below claims that a UT construction descends
 * from a historical script, and resemblance between glyphs is not offered as descent.
 */
export const LINGUISTICS_CONNECTIONS: ResearchConnection[] = [
  {
    anchorSlug: "journal-universal-transmissions-alphabet",
    href: "/journal/universal-transmissions-alphabet",
    kind: "Journal",
    title: "Universal Transmissions Alphabet",
    rationale:
      "The archive's own note on its constructed alphabet - a short process entry recording \"functional pictographic morphemes\" and interactive decoding of the artist's own cipher. The clearest case of UT material that belongs in the construction register: the piece presents the alphabet as something the project is building.",
    basis: "interpretation",
    basisLabel: "UT's own script construction",
    suggestedQuestion:
      "Take me through UT's own alphabet - how was it built, and how does it stand beside the older scripts in this room?",
  },
  {
    anchorSlug: "artwork-translinguistic-equation",
    href: "/gallery/translinguistic-equation",
    kind: "Artwork",
    title: "Translinguistic Equation",
    rationale:
      "In the record's own words the work concerns \"amplifying the higher cortical experience by translinguistically encoding DNA electron spin resonance into monoamine inhibited harmala alkaloids\", and it calls the result a visualisation of language as a living quantum field. It is the archive at its most mechanistic and at its most literal: language treated as an operating system, consciousness as the field it runs in. Read alongside the room's account of UT's constructed scripts, it is the clearest single statement of what the Xenolinguistics is for.",
    basis: "interpretation",
    basisLabel: "UT's own construction - language as a working system",
    suggestedQuestion:
      "The record describes this in mechanistic terms - electron spin resonance, alkaloids. What is the artwork doing with that language?",
  },
  {
    anchorSlug: "artwork-linguistic-mystic",
    href: "/gallery/linguistic-mystic",
    kind: "Artwork",
    title: "Linguistic Mystic",
    rationale:
      "Its record names the subject as the mystic relationship between language, consciousness and the cosmos, and gives its inspiration in the artist's own words: \"the age old Strophariad Mystic mentors of Translinguistic syntax, that launched legendary ludicrous lexicons of language into the Noosphere\". The mentors, the lexicons and the Noosphere are the piece's own stated inspiration and are carried here as the artist's account. It is the entry that shows how the archive's script-work and its mythos are one thing.",
    basis: "interpretation",
    basisLabel: "UT artistic reading - the artist's own stated inspiration",
    suggestedQuestion:
      "The record names its inspiration as the Strophariad Mystic mentors - what is this piece doing with the idea of a mystic relation between language and consciousness?",
  },
  {
    anchorSlug: "journal-reality-as-syntax",
    href: "/journal/linguistics-2026-03-19-reality-as-syntax",
    kind: "Journal",
    title: "Reality as Syntax: When Language Becomes the Architecture of Perception",
    rationale:
      "The Journal's long-form piece on language as the ground of reality, included so the reading can be read rather than summarised. It is an argument, not a linguistics paper, and it builds on an external book - Gallimore's Alien Information Theory - whose central line it quotes and then asserts as \"mathematical fact\". That assertion is the piece's own, not an established result; the gaps below say why that book is not citable here.",
    basis: "interpretation",
    basisLabel: "UT position - the archive's own argument",
    suggestedQuestion:
      "This piece argues that language becomes the architecture of perception - how does that idea run through the archive?",
  },
  {
    anchorSlug: "journal-sefer-yetzirah-32-paths",
    href: "/journal/sefer-yetzirah-32-paths-of-wisdom",
    kind: "Journal",
    title: "Sefer Yetzirah and the 32 Paths of Wisdom: The Hebrew Alphabet as the Software of Creation",
    rationale:
      "The Hebrew letters carry number, planet and element assignments through the Sefer Yetzirah and the Kabbalistic tradition - a living letter-language the archive works inside. The title's \"software\" is the archive's own metaphor for what a letter-system does when it is treated as a working language rather than an alphabet.",
    basis: "thematic",
    basisLabel: "Tradition-specific letter associations",
    suggestedQuestion:
      "Which letter assignments here come from the text and its commentators, and where does the archive's own \"software\" framing start?",
  },
  {
    anchorSlug: "codex-archive-hebrew-letters",
    href: "/codex/archive?system=LETTERS_HEBREW",
    kind: "Codex",
    title: "The Archive — LETTERS_HEBREW system (22 records)",
    rationale:
      "The archive's own letter records, where each Hebrew letter carries the full set of correspondences UT assigns it. This is the lattice itself rather than a description of it, so the assignments can be inspected one record at a time and their basis read on each record.",
    basis: "documented",
    basisLabel: "Catalogued in the archive's own LETTERS_HEBREW lattice",
    suggestedQuestion:
      "Follow Aleph through its element, colour and frequency. How do these correspondences unfold together?",
  },
  {
    anchorSlug: "codex-archive-latin-letters",
    href: "/codex/archive?system=LETTERS_LATIN",
    kind: "Codex",
    title: "The Archive — LETTERS_LATIN system (26 records)",
    rationale:
      "The corresponding lattice for the Latin alphabet. Reading the two systems side by side is the honest way to see whether a resemblance is being claimed, because both are visible and neither asserts descent from the other.",
    basis: "documented",
    basisLabel: "Catalogued in the archive's own LETTERS_LATIN lattice",
    suggestedQuestion:
      "Read the Latin lattice beside UT's own alphabet - what does each carry, and how do they speak to one another?",
  },
  {
    anchorSlug: "journal-enochian-angelic-language",
    href: "/journal/enochian-angelic-language-modern-occultism",
    kind: "Journal",
    title: "Enochian: Angelic Language and the Modern Occult Revival",
    rationale:
      "The historical account of a constructed language - produced by John Dee and Edward Kelley in the late sixteenth century, published in London in 1659 - that carried its own account of origin with it and has been worked with ever since. It is the closest thing in the archive's library to what UT's own scripts are, four centuries earlier, and the natural place to read the two side by side.",
    basis: "documented",
    basisLabel: "Historical account of a constructed language",
    suggestedQuestion:
      "Enochian has a documented origin and publication history - how does that compare with how UT presents its own constructed alphabet?",
  },
];

export const LINGUISTICS_GAPS = [
  "The artist's account of the alphabet's origin is given in the room in the artist's own words: journals of incomprehensible text and alphabets remembered from dreams, re-discovered and re-membered in deep ecstatic states of trance.",
  "The published scripts are this project's own constructions. The archive's own assignment sets are the Codex LETTERS_HEBREW (22 entries) and LETTERS_LATIN (26) lattices.",
  "The Translinguistic Equation's record is written in mechanistic vocabulary - DNA, electron spin resonance, harmala alkaloids - and carries its mechanism literally. It is one of the clearest statements of what the Xenolinguistics is for.",
  "The references held with this room are the five works the archive keeps for it: Saussure, Ogden and Richards, Taylor's History of the Alphabet, Kaplan's Sefer Yetzirah and the 1659 True and Faithful Relation.",
  "Alien Information Theory is discussed inside the Journal piece it belongs to. It is not carried in this room's reference set, so the Oracle should say the archive does not hold it rather than attributing it.",
  "This room covers alphabetic writing and a small number of constructed scripts. Sign languages, tonal and click phonology, language acquisition and the quantitative methods of historical linguistics are not yet part of it.",
];

/**
 * Symbolism connections.
 *
 * The register discipline here is the one this subject most needs: an established
 * reference work on symbols is a CATALOGUE of interpretations, not evidence that an
 * interpretation holds. Jung, Cirlot, Eliade and Waite are cited as what they are.
 */
export const SYMBOLISM_CONNECTIONS: ResearchConnection[] = [
  {
    anchorSlug: "journal-tarot-symbolic-machine",
    href: "/journal/tarot-symbolic-machine-for-fate",
    kind: "Journal",
    title: "The Tarot: A Symbolic Machine for Mapping the Architecture of Fate",
    rationale:
      "The archive's own treatment of the Tarot as a structured symbolic system, and the clearest example in this room of a symbol set with an internal grammar - the cards carry relations rather than isolated meanings. It also carries documented history: the deck's appearance in fifteenth-century northern Italy as carte da trionfi, and the late-eighteenth-century origin of its esoteric reading, including the Egyptian attribution made then rather than found.",
    basis: "documented",
    basisLabel: "UT writing on this subject",
    suggestedQuestion:
      "Is the Tarot being described here as a system with an internal grammar, or as something that produces effects - and where does the archive draw that line?",
  },
  {
    anchorSlug: "codex-archive-major-arcana",
    href: "/codex/archive?system=MAJOR_ARCANA",
    kind: "Codex",
    title: "The Archive — MAJOR_ARCANA system (22 records)",
    rationale:
      "The archive's own twenty-two Major Arcana records, each carrying the correspondences UT assigns it. This is the lattice rather than a description of it, so an assignment can be opened and read on the record that makes it, and compared with the traditional attributions the same card carries elsewhere.",
    basis: "documented",
    basisLabel: "Catalogued in the archive's own MAJOR_ARCANA lattice",
    suggestedQuestion:
      "These Arcana records carry correspondence sets - which of those are traditional attributions the card already had, and which are this archive's own additions?",
  },
  {
    anchorSlug: "artwork-recursive-pantheism",
    href: "/gallery/recursive-pantheism",
    kind: "Artwork",
    title: "Universal Transmissions VIII — Recursive Pantheism",
    rationale:
      "The record states its influences by name - Athanasius Kircher and Robert Fludd - and describes an attempt to syncretise macro and micro, zodiac to chakra centres, and their correlation to organs, cymatic patterns and frequencies. Because the record names what influenced it, this is a documented case rather than an inferred one: the earlier syncretic tradition it names - itself a mixture of emblem, cosmology and correspondence - is stated by the record, not attributed to it here.",
    basis: "documented",
    basisLabel: "Influences named in the artwork's own record",
    suggestedQuestion:
      "The record names Kircher and Fludd - what is this piece taking from that earlier syncretic tradition, and what does it add that is UT's own?",
  },
  {
    anchorSlug: "artwork-trinary-transcendence",
    href: "/gallery/trinary-transcendence",
    kind: "Artwork",
    title: "Trinary Transcendence",
    rationale:
      "The record describes using archetypes of the trinity and the Trimurti to move beyond binary modes of awareness, and states it was made in a hypomanic state. That is the record's own account of the conditions the work came out of, and it is carried here as part of what the piece is.",
    basis: "thematic",
    basisLabel: "Tradition-specific archetypes, used as UT material",
    suggestedQuestion:
      "This draws on trinitarian and Trimurti archetypes - what is being borrowed from those traditions, and what does the piece do with them that the traditions do not?",
  },
  {
    anchorSlug: "artwork-ethera-24",
    href: "/gallery/ethera-24",
    kind: "Artwork",
    title: "ETHERA 24",
    rationale:
      "An exploration of the alchemical quintessence - the fifth element set beyond earth, water, fire and air. The four-element scheme and the fifth are a documented historical idea, while the record's own gloss of it as the universal solvent of consciousness is UT's reading of that idea. Both are visible here so neither is mistaken for the other.",
    basis: "thematic",
    basisLabel: "Historical element scheme, glossed by UT",
    suggestedQuestion:
      "The fifth element is a historical idea - which part of this is the alchemical scheme, and which is UT's own gloss on it?",
  },
  {
    anchorSlug: "artwork-polarity-modulation",
    href: "/gallery/polarity-modulation",
    kind: "Artwork",
    title: "Polarity Modulation",
    rationale:
      "The record's own words are \"the alchemical art of polarity management - the science of navigating between opposing forces to generate harmonic resonance within the personal energetic field\". Polar pairs have a documented place in alchemical and Hermetic writing. The energetic field, and the resonance the record says the practice generates in it, do not: this room places that part in the construction register, which is this room's classification rather than a statement about the artist's intent.",
    basis: "interpretation",
    basisLabel: "UT construction in alchemical vocabulary",
    suggestedQuestion:
      "How much of the polarity scheme here is historical alchemical writing, and how much is UT's own energetic construction?",
  },
  {
    anchorSlug: "journal-kybalion-hermetic-lineage",
    href: "/journal/the-kybalion-7-principles-hermetic-philosophy",
    kind: "Journal",
    title: "The Kybalion: The Seven Principles of Hermetic Philosophy Decoded",
    rationale:
      "The Archive's treatment of the seven principles, which is the modern Hermetic vocabulary a great deal of contemporary symbol work runs on. It is included for lineage, and with the same caveat the cymatics room carries: the Kybalion is an early-twentieth-century modern esoteric text, not an ancient source, and citing it does not make its principles older than they are.",
    basis: "documented",
    basisLabel: "UT writing, with the text's own dating stated",
    suggestedQuestion:
      "Draw out the Hermetic lineage the Kybalion belongs to - how do its principles live in this archive?",
  },
];

export const SYMBOLISM_GAPS = [
  "The archive's MAJOR_ARCANA lattice is its own set of twenty-two correspondences, read alongside the traditional attributions the same cards carry elsewhere.",
  "The Tarot's esoteric reading is a late-eighteenth-century development, and the Egyptian attribution made then belongs to that development. The archive names where the system came from and works with the system as it stands.",
  "The reference works here are the archive's library on this subject: Jung and von Franz, Cirlot, Eliade, and Waite's own exposition of the tarot.",
  "This room covers Western esoteric, emblematic and comparative symbol systems. Iconography of specific non-Western traditions in their own terms, semiotics as a formal discipline, and mathematical notation are not yet part of it.",
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
  linguistics: LINGUISTICS_CONNECTIONS,
  symbolism: SYMBOLISM_CONNECTIONS,
};

/** Honest absences per research topic. */
export const GAPS_BY_TOPIC: Record<string, string[]> = {
  cymatics: CYMATICS_GAPS,
  geometry: GEOMETRY_GAPS,
  linguistics: LINGUISTICS_GAPS,
  symbolism: SYMBOLISM_GAPS,
};
