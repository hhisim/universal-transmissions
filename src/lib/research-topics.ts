/**
 * research-topics.ts — the authoritative research registry for UT research areas.
 *
 * A research topic is addressed by a STABLE IDENTIFIER only. The client's job is
 * to name which topic is being asked about; the title, summary, and permitted
 * source list are resolved here, on the server, from this record. Nothing
 * descriptive is ever accepted from the URL or the request body, so a forged
 * identifier can only ever produce an honest "unknown" state — never invented
 * research context.
 *
 * Every entry states its own epistemic standing, because the archive does not
 * treat "observed in a laboratory", "drawn from a historical text", and
 * "a UT interpretation" as the same kind of claim.
 */

import {
  CONNECTIONS_BY_TOPIC,
  type ConnectionBasis,
  type ResearchConnection,
} from "./research-connections";

export const RESEARCH_TOPIC_PREFIX = "research-v1:";

/** How a claim in this topic is supported. */
export type EvidenceKind =
  /** Physically observable, reproducible in an experiment. */
  | "observed"
  /** Stated by a named historical source we can point at. */
  | "historical"
  /** A UT artistic reading. Not a claim about the world. */
  | "interpretation"
  /** A shared subject, not a documented link. */
  | "thematic";

export interface ResearchSource {
  /** What this source actually is. */
  kind: "primary" | "historical" | "reference";
  label: string;
  url: string;
  /** Precisely what the destination supports, so the page cannot over-claim. */
  supports: string;
  /** UT's own material is never presented as an external citation. */
  internal?: boolean;
}

export interface ResearchTopic {
  id: string;
  /** Verified display title. Resolved on the server; never taken from the URL. */
  title: string;
  /** The canonical in-site route for this topic. */
  route: string;
  /** Bounded topic summary used for grounding. */
  summary: string;
  /** Permitted external references. Anything absent here is not citable. */
  sources: ResearchSource[];
  /** Editable suggested question. The visitor may rewrite or clear it. */
  suggestedQuestion: string;
}

const CYMATICS: ResearchTopic = {
  id: "cymatics",
  title: "Cymatics",
  route: "/research/cymatics",
  summary: [
    "Cymatics concerns the visible effects of vibration: patterns made visible when a",
    "plate, membrane or liquid surface is driven at a resonant frequency and the",
    "regions of greatest and least movement are rendered by a powder, paste or liquid.",
    "",
    "OBSERVED (experimentally demonstrated and reproducible):",
    "- A driven plate or membrane carries standing waves with fixed nodes (points of no",
    "  movement) and antinodes (points of maximum movement). Sand or powder collects at",
    "  the nodes, so the vibration mode becomes visible.",
    "- For a plate of homogeneous material, the normal modes and their nodal-line",
    "  patterns are determined by the plate's shape and how it is constrained.",
    "",
    "HISTORICAL (reported by APS News, a 2017 historical overview; only the",
    "  dates that overview states are given here):",
    "- On 8 July 1680 Robert Hooke sprinkled sand over a solid metal plate, drew",
    "  a violin bow along its edge and recorded the nodal patterns that formed.",
    "  The overview notes no mention of Hooke appears in Chladni's writings.",
    "- Leonardo da Vinci and Galileo both noticed particles moving unevenly on a",
    "  vibrating surface. Neither left a dated account, so none is given here.",
    "- Ernst Chladni (1756-1827) introduced the technique systematically in 1787 in",
    "  'Entdeckungen ueber die Theorie des Klanges' (11 plates, 166 figures). The",
    "  figures are still called",
    "  Chladni figures. His 1802 'Die Akustik' is why he is called the father of acoustics.",
    "- Hans Jenny (1904-1972), a Swiss physician and Rudolf Steiner student, coined the",
    "  word 'cymatics', from the Greek for matters pertaining to waves. The 2001 revised",
    "  edition lists 'Kymatik' Volume 1, 1967 and Volume 2, 1974; Jenny died in 1972.",
    "",
    "UT ARTISTIC INTERPRETATION (a reading of the material, not a claim about it):",
    "- UT treats vibration-to-geometry as the working principle behind its own imagery.",
    "- UT assigns the solfeggio tone values (432, 528, 639, 741, 852, 963 Hz) symbolic",
    "  roles in the work. These assignments are UT's own symbolic scheme.",
    "",
    "IMPORTANT UNCERTAINTY, stated plainly:",
    "- The tone values above are symbolic in UT. There is no established evidence that",
    "  528 Hz repairs DNA, or that any specific frequency heals or treats disease. The",
    "  'DNA repair' and 'miracle frequency' claims circulate widely and are not",
    "  supported by the experimental literature.",
    "- Chladni's and Jenny's patterns are real and reproducible. The interpretive leap",
    "  from a physical pattern to a mandala, a cell, or a meaning is an analogy, not an",
    "  experimental result. When answering, keep that distinction: the standing wave",
    "  and the nodal pattern are observed; any larger claim built on the pattern is",
    "  interpretation.",
    "- Jenny ruled the interpretive step out himself: the work was to proceed on",
    "  strictly empirical and phenomenological lines, with all interpretative or",
    "  analogical thinking out of place (his words, printed p.20 / PDF p.18).",
  ].join("\n"),
  sources: [
    {
      kind: "historical",
      label: "Chladni, Entdeckungen über die Theorie des Klanges (1787)",
      url: "https://archive.org/details/entdeckungenuber00chla",
      supports:
        "Chladni's original treatise, digitised. The catalogue record confirms the title, the author (Chladni, 1756-1827) and the 1787 Leipzig imprint, and the volume carries the plates still called Chladni figures.",
      },
    {
      kind: "primary",
      label: "Jenny, Cymatics: A Study of Wave Phenomena and Vibration",
      url: "https://monoskop.org/images/3/31/Jenny_Hans_Cymatics_A_Study_of_Wave_Phenomena_and_Vibration_Vol_1_2001.pdf",
      supports:
        "The compiled Jenny volumes, including the 'Kymatik' work. Supports the coining of the term, the 1967 first volume, and Jenny's own experiments. It also supports Jenny's own insistence that the work stay empirical and that interpretation be held out, stated at printed p.20 (PDF p.18). No force-field claim by Jenny is recorded here: that phrase does not appear in the accessible portion of the text.",
    },
    {
      kind: "reference",
      label: "American Physical Society — The First Experiments that Inspired 18th-Century Chladni Figures",
      url: "https://www.aps.org/apsnews/2017/07/first-experiments-chladni-figures",
      supports:
        "A physical-society account of Chladni's figures and the particle mechanism, and of his 1802 Die Akustik.",
    },
  ],
  suggestedQuestion: "What does a cymatics experiment actually show, and where does the interpretation begin?",
};

/**
 * Geometry. The second registered research room.
 *
 * Four registers are kept apart on purpose, because this subject is where they are
 * most often merged: what is MATHEMATICALLY true of a form, what a HISTORICAL
 * DOCUMENT records, what a TRADITION assigns it, and what UT READS into it. Sources
 * are cited only for the first two.
 */
const GEOMETRY: ResearchTopic = {
  id: "geometry",
  title: "Geometry",
  route: "/research/geometry",
  summary: [
    "Geometry concerns the properties, construction and relations of figures in space.",
    "This room holds four registers apart, because they are the ones most often merged.",
    "",
    "MATHEMATICAL (properties of the forms themselves, independent of any reading):",
    "- A regular polygon has all sides and all interior angles equal. The classical",
    "  constructible family includes the triangle, square, pentagon, hexagon, octagon,",
    "  decagon and dodecagon.",
    "- There are EXACTLY FIVE convex regular polyhedra: tetrahedron (4 triangular faces),",
    "  cube (6 square faces), octahedron (8 triangular faces), dodecahedron (12 pentagonal",
    "  faces) and icosahedron (20 triangular faces). That the list is complete is a proved",
    "  result, not an aesthetic preference: at each vertex the face angles must sum to less",
    "  than 360 degrees, which admits only these five.",
    "- The golden ratio phi = (1 + sqrt(5)) / 2 = 1.6180339887..., the positive root of",
    "  x^2 = x + 1. It is irrational. The ratio of consecutive Fibonacci numbers converges",
    "  to it.",
    "",
    "HISTORICAL (recorded by a named document we can point at):",
    "- Euclid's Elements (c. 300 BCE), Book XIII, constructs the five regular solids and",
    "  proves there are no others. The Heath/Heiberg edition is cited below; the volume",
    "  digitised there is the one covering Books X-XIII.",
    "- Plato's Timaeus associates four of the regular solids with four bodies - fire with",
    "  the tetrahedron, earth with the cube, air with the octahedron, water with the",
    "  icosahedron - and the dodecahedron with the cosmos as a whole. This is a documented",
    "  philosophical scheme, not an experimental finding.",
    "- Kepler's Harmonices Mundi (1619) reasons about harmony and congruence in geometrical",
    "  forms and about the five regular solids in relation to planetary order (the appended",
    "  Mysterium Cosmographicum). It is cited as a historical document of that reasoning,",
    "  not as evidence for the scheme.",
    "- 'Sacred geometry' is a modern term for a modern practice of reading meaning into",
    "  traditional forms. It is not a classical category.",
    "",
    "TRADITIONAL SYMBOLISM (assignments carried by a tradition, not properties of a form):",
    "- Forms and numbers carry traditional meanings - the hexagram, the interlocking",
    "  tetrahedra read as a Merkaba, the overlapping-circle figure called the Flower of Life.",
    "- These are assignments. A hexagon is not Venus; the correspondence is a reading a",
    "  tradition makes, and this archive keeps it in this register.",
    "- The archive's own assignment set is the Codex GEOMETRY lattice (20 entries), which",
    "  is UT symbolic material and not a geometric reference.",
    "",
    "UT ARTISTIC INTERPRETATION (a reading this project makes, not a claim about the world):",
    "- UT treats geometry as the skeleton of the visible world and proportion as",
    "  intentional, and builds its imagery on that reading.",
    "- UT reads particular transmissions through particular forms (tetrahedral geometry in",
    "  Tetra, the Merkaba's traditional form in Merkaba).",
    "",
    "IMPORTANT LIMITS, stated plainly:",
    "- Visual resemblance between two figures does not establish a shared mechanism. A",
    "  nodal pattern produced by standing waves and a drawn figure can look alike and arise",
    "  from entirely different causes; this archive holds no experiment in which a geometric",
    "  construction emerges from vibration. The relationship between this room and the",
    "  cymatics room is a PARALLEL INQUIRY and is labelled as such.",
    "- A symbolic correspondence is not a mathematical property, and a mathematical",
    "  property carries no meaning by itself. State which register a statement belongs to.",
    "- Do not present a UT reading, or a traditional assignment, as a result of measurement.",
  ].join("\n"),
  sources: [
    {
      kind: "historical",
      label: "Euclid, The Thirteen Books of the Elements (Heath/Heiberg, 1908) — Books X–XIII",
      url: "https://archive.org/details/thirteenbookseu03heibgoog",
      supports:
        "The Heiberg edition in Heath's translation, digitised from Harvard's copy: the description states this volume carries Books X–XIII and an appendix. Book XIII is where the five regular solids are constructed and proved to be exactly five.",
    },
    {
      kind: "historical",
      label: "Plato, Timaeus (Archer-Hind edition)",
      url: "https://archive.org/details/timaeusofplato00platiala",
      supports:
        "A digitised edition of the Timaeus. It is cited only for the documented association of four regular solids with four bodies and of the dodecahedron with the cosmos — a philosophical scheme stated in the text, not an experimental result.",
    },
    {
      kind: "primary",
      label: "Kepler, Ioannis Keppleri Harmonices mundi libri V (1619)",
      url: "https://archive.org/details/ioanniskepplerih00kepl",
      supports:
        "The 1619 edition, digitised. The catalogue title records that the volume carries the Harmonices mundi and, appended, the Mysterium cosmographicum — the work whose title states its argument from the five regular solids ('ex quinque corporibus regularibus'). Cited as a historical document of that reasoning.",
    },
  ],
  suggestedQuestion:
    "Which of these statements about a geometric form is a property of the form, and which is a meaning a tradition or this archive assigns to it?",
};

const LINGUISTICS: ResearchTopic = {
  id: "linguistics",
  title: "Linguistics",
  route: "/research/linguistics",
  summary: [
    "Linguistics is the study of language: its sounds, structures, acquisition, change",
    "and writing. Four registers are held apart here, because they are most often merged.",
    "",
    "ESTABLISHED LINGUISTIC KNOWLEDGE:",
    "- Language is studied as a system of signs. Saussure's sign as signifier and signified,",
    "  and his distinction between a language at a moment and across time, are foundational.",
    "- Writing is a technology invented more than once. Alphabetic writing is one family",
    "  among several, alongside syllabic and logographic systems.",
    "- Speech and writing are separate systems; many languages have no writing system.",
    "- Monogenesis - that all languages descend from one ancestral language - is NOT an",
    "  established result. It has been argued for; it is not settled.",
    "",
    "HISTORICAL (recorded by a named document):",
    "- The earliest writing systems are documented independently in Mesopotamia, Egypt and",
    "  China. The Vinca signs of south-east Europe (from c. 5500 BCE) are older marks, and",
    "  whether they are writing at all is debated - cited as an open question, not a first",
    "  script.",
    "- Enochian is a constructed language with a documented origin: produced by John Dee and",
    "  Edward Kelley in the late sixteenth century, published by Meric Casaubon in 1659. Its",
    "  date, authorship and publication are recorded; the account given FOR it is not.",
    "- The Sefer Yetzirah is a Hebrew text of the first millennium CE assigning the letters",
    "  roles in creation, and carrying letter associations through its commentary tradition.",
    "",
    "TRADITION-SPECIFIC SYMBOLIC ASSOCIATIONS:",
    "- The Hebrew letters carry number, planet and element assignments through the Sefer",
    "  Yetzirah and the Kabbalistic tradition. These are assignments held within a textual",
    "  tradition, not properties of the letters and not findings of linguistic analysis.",
    "- The Tetragrammaton is the four-letter Hebrew name of God; treating it as a portal",
    "  into meaning is a traditional and UT reading, not a linguistic finding.",
    "- The archive's own assignment sets are the Codex LETTERS_HEBREW (22 entries) and",
    "  LETTERS_LATIN (26) lattices - UT symbolic material, not linguistic reference works.",
    "",
    "UT ARTISTIC AND XENOLINGUISTIC CONSTRUCTIONS:",
    "- UT designs its own scripts and alphabet. They are artistic constructions: designed",
    "  systems, not recovered, decoded, channelled or historical languages.",
    "- UT makes work about a Translinguistic subject - language as carrier of consciousness,",
    "  the Noosphere, language shaping perception. These are its own constructions.",
    "",
    "IMPORTANT LIMITS, stated plainly:",
    "- Resemblance between a UT glyph and an older sign is NOT evidence of descent,",
    "  borrowing or decipherment.",
    "- No physical mechanism is claimed for any UT script. Where a record uses mechanistic",
    "  vocabulary (DNA, electron spin resonance, alkaloids) that is part of an artwork's",
    "  construction, not a modelled process.",
    "- That all languages share a single root is a UT reading where it appears, not the",
    "  position of linguistics, and this room does not present it as one.",
    "- Do not present a tradition-specific letter assignment as a property of the letter, or",
    "  a UT construction as a historical language.",
  ].join("\n"),
  sources: [
    {
      kind: "reference",
      label: "Saussure, Course in General Linguistics (Bally & Sechehaye, eds.)",
      url: "https://archive.org/details/courseingenerall00ferd",
      supports:
        "The catalogue record identifies the Course in General Linguistics by Saussure, edited by Bally and Sechehaye. Cited only for the two foundational claims attributed to the discipline above: the sign as signifier and signified, and the study of a language at a moment versus across time.",
    },
    {
      kind: "reference",
      label: "Ogden & Richards, The Meaning of Meaning (1923)",
      url: "https://archive.org/details/meaningofmeaning00ogde",
      supports:
        "Catalogued as the 1923 study of the influence of language upon thought, by Ogden and Richards. Cited for the semiotic treatment of meaning this room refers to. Its presence supports that the work exists and takes that position, not that its arguments are correct.",
    },
    {
      kind: "historical",
      label: "Isaac Taylor, The History of the Alphabet (1899)",
      url: "https://archive.org/details/historyofalphabe02tayluoft",
      supports:
        "A nineteenth-century account of the origin and development of letters, catalogued under Isaac Taylor. Cited as a historical document of how alphabetic descent was argued at the time. It is dated scholarship, not current comparative linguistics.",
    },
    {
      kind: "primary",
      label: "Sefer Yetzirah (Hebrew text, first millennium CE)",
      url: "https://archive.org/details/sefer-yetzirah",
      supports:
        "A digitised Sefer Yetzirah, cited as the text carrying the letter assignments this room places in the tradition register. A reference to the text is not a claim that its assignments are correct or describe anything beyond the tradition holding them.",
    },
    {
      kind: "historical",
      label: "John Dee, A true and faithful relation... (London, 1659)",
      url: "https://archive.org/details/b30324282_0002",
      supports:
        "The 1659 publication of the Dee and Kelley material, catalogued under Dee. Cited for the documented date, authorship and publication of the Enochian material - not for the account it gives of the language's origin, which a historical register cannot settle.",
    },
  ],
  suggestedQuestion:
    "Which statements on this page are established linguistics, which are historical accounts, which are tradition-specific letter associations, and which are UT's own constructions?",
};

const SYMBOLISM: ResearchTopic = {
  id: "symbolism",
  title: "Symbolism",
  route: "/research/symbolism",
  summary: [
    "Symbolism concerns the use of one thing to stand for another: emblems, figures,",
    "colours, numbers, and the systems that organise them. This room holds four",
    "registers apart, because this is the subject where they are most easily confused.",
    "",
    "ESTABLISHED KNOWLEDGE (what can be said without adopting a tradition's claims):",
    "- A symbol's meaning is conventional, not intrinsic. Nothing is a symbol by itself;",
    "  it becomes one within a group that takes it so, and the same figure means unrelated",
    "  things in unrelated traditions.",
    "- In semiotics, a distinction is drawn between an icon (which resembles), an index",
    "  (which is caused by what it points to) and a symbol (which is connected by",
    "  convention). That distinction is analytic vocabulary, and it is useful here for a",
    "  reason: it is exactly the distinction that resemblance-based arguments skip.",
    "- Symbols change meaning historically. An emblem that once carried one sense can carry",
    "  an opposite one a few centuries later, which is why 'the meaning of X' is rarely a",
    "  well-formed question without naming a tradition and a period.",
    "",
    "HISTORICAL (recorded by a named document we can point at):",
    "- Comparative works of the nineteenth and twentieth centuries - Frazer's Golden Bough",
    "  among them - assembled symbolic material across cultures and argued for patterns.",
    "  Their methods and conclusions have since been heavily criticised within anthropology,",
    "  and they are cited here as historical documents of that project, not as evidence.",
    "- The Tarot's symbolic reading has a documented modern history. Court de Gebelin's",
    "  eighteenth-century claim that the cards preserved Egyptian wisdom is a claim made at",
    "  that time, not a finding; the cards' documented origins lie in fifteenth-century Italy.",
    "- Jung's late work on symbols and the archetypes popularised the idea of universal",
    "  symbolic structures. Jungian archetypes are a psychological framework, and they are",
    "  not an established empirical result of experimental psychology.",
    "",
    "TRADITION-SPECIFIC SYMBOLIC ASSOCIATIONS (assignments carried by a tradition):",
    "- Element schemes, planetary attributions, and colour and number correspondences are",
    "  handed down within traditions - Hermetic, alchemical, Kabbalistic and others. The",
    "  four-element scheme with a fifth quintessence is a documented historical idea.",
    "- These are assignments. A colour is not a planet; the correspondence is a reading a",
    "  tradition makes and holds.",
    "- The archive's own assignment sets are the Codex lattices - MAJOR_ARCANA (22 entries),",
    "  COLORS (16), ALCHEMY (12) and DEITIES (202) among them. These are UT symbolic",
    "  material, not reference works, and the archive assigns the meanings.",
    "",
    "UT ARTISTIC INTERPRETATION (a reading this project makes, not a claim about the world):",
    "- UT builds its imagery on symbolic correspondence, treating related figures as",
    "  expressions of a single structure, and its records state when influences are named.",
    "- Where a UT record uses the vocabulary of mechanism - fields, frequencies, resonance -",
    "  the vocabulary is part of the construction. No physical effect is being claimed.",
    "",
    "IMPORTANT LIMITS, stated plainly:",
    "- Resemblance between symbols is not evidence of common origin, shared meaning or a",
    "  universal archetype. This room does not treat a likeness as a link.",
    "- A catalogue of symbols - Cirlot, Jung, Eliade - records what symbols have been taken",
    "  to mean. It is not evidence that any reading is correct.",
    "- Nothing on this page is a measurement. The archive's lattices assign meanings; they",
    "  do not detect or verify anything.",
  ].join("\n"),
  sources: [
    {
      kind: "reference",
      label: "Jung (ed.), Man and His Symbols",
      url: "https://archive.org/details/man-and-his-symbols-by-carl-jung",
      supports:
        "Catalogued as Man and His Symbols, the late Jung's presentation of his approach. Cited for the existence and shape of the Jungian framework described above - not as evidence that archetypes are established structures.",
    },
    {
      kind: "reference",
      label: "Cirlot, A Dictionary of Symbols",
      url: "https://archive.org/details/dictionaryofsymb0000cirl",
      supports:
        "Catalogued as A Dictionary of Symbols by Juan Eduardo Cirlot. Cited as an example of the catalogue form itself - a work recording what symbols have been taken to mean across traditions. Its presence supports what such a catalogue does, not any entry in it.",
    },
    {
      kind: "reference",
      label: "Eliade, Images and Symbols",
      url: "https://archive.org/details/in.gov.ignca.11012",
      supports:
        "Catalogued as Images and Symbols by Mircea Eliade. Cited for the comparative-religion treatment referred to above. Eliade's comparative method has since been heavily criticised; the reference is to the work's position, not its authority.",
    },
    {
      kind: "primary",
      label: "A. E. Waite, The Pictorial Key to the Tarot",
      url: "https://archive.org/details/pictorialkeytota0000unse_b9d6",
      supports:
        "Catalogued as The Pictorial Key to the Tarot by Arthur Edward Waite - a tarot system's exposition by one of the deck's own authors. Cited as a system stating itself in its own terms, and as the primary source for how that symbolic set organises meaning.",
    },
  ],
  suggestedQuestion:
    "Which statements on this page are established knowledge about how symbols work, which are historical accounts of symbolic traditions, which are tradition-specific assignations, and which are UT's own interpretations?",
};

/**
 * A connection anchor is a ResearchTopic like any other, so the Oracle keeps ONE
 * contract: a stable identifier, resolved server-side against an exact key. No
 * second registry, no second parameter, no second resolver.
 *
 * The anchor is DERIVED from the connection record itself, so a connection cannot
 * exist with an Oracle entry that disagrees with its displayed rationale, title or
 * destination - the same data feeds both.
 */
export const CONNECTION_ANCHOR_SEGMENT = "/connection/";

/** One sentence per basis, so the summary states the standing in words. */
const BASIS_SENTENCE: Record<ConnectionBasis, string> = {
  documented:
    "DOCUMENTED - a UT record names this relationship directly (the archive's own writing, or the destination record's own description). It is not an external or scientific citation.",
  interpretation:
    "UT ARTISTIC INTERPRETATION - a reading this project makes. Not a claim about how the world behaves.",
  thematic:
    "THEMATIC ASSOCIATION - a shared subject or idea held as context. It is not a sourced link.",
};

/** Registry key for a connection anchor, e.g. `cymatics/connection/<slug>`. */
export function connectionRegistryKey(topicSlug: string, anchorSlug: string): string {
  return `${topicSlug}${CONNECTION_ANCHOR_SEGMENT}${anchorSlug}`;
}

/** Public identifier for a connection anchor, e.g. `research-v1:cymatics/connection/<slug>`. */
export function researchConnectionTopicId(topicSlug: string, anchorSlug: string): string {
  return `${RESEARCH_TOPIC_PREFIX}${connectionRegistryKey(topicSlug, anchorSlug)}`;
}

function connectionTopic(topic: ResearchTopic, c: ResearchConnection): ResearchTopic {
  return {
    id: connectionRegistryKey(topic.id, c.anchorSlug),
    // The destination record's own title. Never prose written for this page.
    title: c.title,
    route: c.href,
    summary: [
      `A SELECTED CONNECTION within the UT research topic ${topic.title} (${topic.route}).`,
      "",
      `The connection: a ${c.kind.toLowerCase()} record - ${c.title} - at ${c.href}.`,
      `Why the archive holds it to belong: ${c.rationale}`,
      `How strongly it is supported: ${BASIS_SENTENCE[c.basis]}`,
      /* A destination that cannot be pointed at this record by URL is described
         here as well as on the card, so the model cannot imply that following
         the link lands the visitor on it. */
      ...(c.destinationNote ? ["", `Reaching it: ${c.destinationNote}`] : []),
      "",
      /* The room's own registers travel with the connection. Without this, a visitor
         asking about one relationship was answered without the room's actual material -
         its mathematical properties, its historical record, its traditional symbolism -
         and could only be given the connection's own blurb. Kept as tight as the
         MAX_GRINDED_CHARS budget allows: grounding + a full-length question must still
         fit inside it, since the route refuses rather than truncate. */
      "",
      `WHAT THE ${topic.title.toUpperCase()} ROOM HOLDS, in the registers it keeps apart:`,
      topic.summary,
      "",
      /* The references, each with the catalogue's own statement of what it supports. */
      "REFERENCES SUPPLIED WITH THIS CONTEXT, and what each is offered as support for",
      ...topic.sources.flatMap((s) => [
        `- ${s.label} [${s.kind}]${s.internal ? " (archive material, not an external citation)" : ` - ${s.url}`}`,
        `  Offered as support for: ${s.supports}`,
      ]),
      "",
      "Those lines are SCOPE, NOT CONTENTS: the archive has not read these works on your",
      "behalf, and nothing should be presented as consulted, quoted or verified against a",
      "source on the strength of that description. A mathematical property is established",
      "by proof, a historical claim by the named document, a traditional correspondence by",
      "the tradition that makes it, and a UT reading by this project - keep the four apart.",
      "Attribute no other author, title, work or page number. If a claim would need a source",
      "that is not listed above, say the archive does not hold it rather than naming one.",
    ].join("\n"),
    sources: [
      {
        kind: "reference",
        label: `${c.kind}: ${c.title}`,
        url: c.href,
        internal: true,
        supports:
          "The UT record this connection names. It is archive material, not an external citation.",
      },
      ...topic.sources,
    ],
    suggestedQuestion: c.suggestedQuestion,
  };
}

/**
 * Every REGISTERED research room. A room is registered when it has a server-resolved
 * topic record here. A domain that has a page but no record is not a room, and the
 * nexus states that rather than presenting it as one.
 */
const RESEARCH_TOPICS: Record<string, ResearchTopic> = {
  cymatics: CYMATICS,
  geometry: GEOMETRY,
  linguistics: LINGUISTICS,
  symbolism: SYMBOLISM,
};

/**
 * Connection anchors for EVERY registered room, derived from the same records the
 * room's own page renders. One registry and one exact-resolution contract for both
 * rooms: the identifier a card sends is the key the server resolves, whichever room
 * it came from.
 */
const CONNECTION_TOPICS: Record<string, ResearchTopic> = Object.fromEntries(
  Object.entries(RESEARCH_TOPICS).flatMap(([slug, topic]) =>
    (CONNECTIONS_BY_TOPIC[slug] ?? []).map((c) => [
      connectionRegistryKey(slug, c.anchorSlug),
      connectionTopic(topic, c),
    ])
  )
);

const REGISTRY: Record<string, ResearchTopic> = {
  ...RESEARCH_TOPICS,
  ...CONNECTION_TOPICS,
};

/** Topic slugs only - a connection anchor is not a topic of its own. */
const TOPIC_SLUGS = Object.keys(RESEARCH_TOPICS);

/** Is this slug a registered research room (as opposed to a page that is only a reading)? */
export function isRegisteredRoom(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(RESEARCH_TOPICS, slug);
}

/**
 * The four research domains the site presents, with what each one ACTUALLY is today.
 * The standing line is the honest part, and it is kept current rather than flattering:
 * each of these is now a registered room with a sourced summary and a curated
 * connection registry, and each standing says what its summary actually separates.
 */
export interface ResearchDomain {
  slug: string;
  title: string;
  route: string;
  registered: boolean;
  /** Plain statement of what the visitor will and will not find there. */
  standing: string;
}

export const RESEARCH_DOMAINS: ResearchDomain[] = [
  {
    slug: "cymatics",
    title: "Cymatics",
    route: "/research/cymatics",
    registered: true,
    standing:
      "A full research room: a sourced overview of the subject, and six connections you can open or carry into the Oracle.",
  },
  {
    slug: "geometry",
    title: "Geometry",
    route: "/research/geometry",
    registered: true,
    standing:
      "A full research room: a sourced overview that keeps mathematical property, historical documentation, traditional symbolism and UT reading apart, with six connections you can open.",
  },
  {
    slug: "linguistics",
    title: "Linguistics",
    route: "/research/linguistics",
    registered: true,
    standing:
      "A research room: a sourced overview that keeps established linguistics, historical accounts, tradition-specific letter associations and UT's own xenolinguistic constructions apart, with eight connections you can open or carry into the Oracle.",
  },
  {
    slug: "symbolism",
    title: "Symbolism",
    route: "/research/symbolism",
    registered: true,
    standing:
      "A research room: a sourced overview that keeps established knowledge about symbols, historical accounts of symbolic traditions, tradition-specific assignments and UT's own readings apart, with seven connections you can open or carry into the Oracle.",
  },
];

/** Every registered connection, with the room it belongs to. Powers the nexus. */
export function allRegisteredConnections(): Array<{
  topicSlug: string;
  topicTitle: string;
  topicRoute: string;
  connection: ResearchConnection;
  /** The identifier its Oracle anchor answers to — the same key the server resolves. */
  anchorId: string;
  /** The references behind this relationship's room, so the nexus can show what it
   *  rests on instead of asking the visitor to take it on trust. */
  sources: ResearchSource[];
}> {
  return Object.entries(RESEARCH_TOPICS).flatMap(([slug, topic]) =>
    (CONNECTIONS_BY_TOPIC[slug] ?? []).map((connection) => ({
      topicSlug: slug,
      topicTitle: topic.title,
      topicRoute: topic.route,
      connection,
      anchorId: researchConnectionTopicId(slug, connection.anchorSlug),
      sources: topic.sources,
    }))
  );
}

/** Public identifier for a topic, e.g. `research-v1:cymatics`. */
export function researchTopicId(slug: string): string {
  return `${RESEARCH_TOPIC_PREFIX}${slug}`;
}

export function researchTopicSlugs(): string[] {
  return [...TOPIC_SLUGS];
}

/**
 * Resolve a client-supplied research identifier against this registry.
 * Returns null for anything not genuinely present. A forged slug, a guessed
 * title or a client-supplied summary can never produce a record.
 */
export function resolveResearchTopic(rawId: unknown): ResearchTopic | null {
  if (typeof rawId !== "string") return null;
  const id = rawId.trim().slice(0, 120);
  if (!id) return null;
  const slug = id.startsWith(RESEARCH_TOPIC_PREFIX)
    ? id.slice(RESEARCH_TOPIC_PREFIX.length)
    : id;
  // Registry keys are exact slugs; no fuzzy matching, no substring fallback.
  return Object.prototype.hasOwnProperty.call(REGISTRY, slug) ? REGISTRY[slug] : null;
}

/** Bounded prompt block: the verified summary, nothing from the client. */
export function researchPromptBlock(topic: ResearchTopic): string {
  return [
    `Selected UT research topic (verified server-side, id ${topic.id}):`,
    `Title: ${topic.title}`,
    `Canonical route: ${topic.route}`,
    "",
    topic.summary,
    "",
    "Source discipline:",
    "- OBSERVED means the pattern is experimentally demonstrated and reproducible.",
    "- HISTORICAL means a named primary document records it.",
    "- TRADITION-SPECIFIC means the association is carried by a tradition, text or corpus.",
    "  It is an assignment someone holds, not a property of the thing it is assigned to.",
    "- UT ARTISTIC INTERPRETATION means it is this project's reading, not a fact about the world.",
    "Do not present an interpretation, a tradition-specific assignment or a symbolic frequency",
    "assignment as an experimental result, and do not offer medical or healing claims about",
    "specific frequencies.",
    `The ONLY external references supplied with this context are: ${topic.sources
      .map((s) => s.label)
      .join("; ")}. Do not attribute any other author, title, work or page number — if a claim`,
    "would need a source that is not listed here, say that the archive does not hold it.",
    "",
    "A reference being listed means the archive holds it as a permitted citation. It is NOT",
    "a claim that this archive has read, consulted or verified the work, and it is never a",
    "claim that the work endorses a UT reading. The scope each reference supports is stated",
    "where the references are listed; do not extend a citation beyond that scope.",
    "Treat a catalogue record as evidence that a work exists and says what is quoted -",
    "not as evidence for any claim the visitor is asking about.",
  ].join("\n");
}
