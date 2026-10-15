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
import { connectionEvidence, noEvidenceLine } from "./record-evidence";
/* The composed-message bounds, imported rather than restated: the summary is assembled
   against the same number the route enforces, so the two cannot drift apart. */
import { MAX_GRINDED_CHARS, MAX_QUESTION_CHARS } from "./oracle-conversation";

export const RESEARCH_TOPIC_PREFIX = "research-v1:";

/** How a claim in this topic is supported. */
export type EvidenceKind =
  /** Physically observable, reproducible in an experiment. */
  | "observed"
  /** Stated by a named historical source we can point at. */
  | "historical"
  /** A UT artistic reading, and part of the work's substance. */
  | "interpretation"
  /** A shared subject, not a documented link. */
  | "thematic";

export interface ResearchSource {
  /** What this source actually is. */
  kind: "primary" | "historical" | "reference";
  label: string;
  url: string;
  /** Precisely what the destination is, so the page can point at it honestly. */
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
    "Cymatics is the study of what sound looks like. A plate, a membrane or a liquid",
    "surface is driven at a resonant frequency, and the regions of greatest and least",
    "movement are rendered visible by a powder, a paste or a liquid. What appears is not",
    "decoration. It is the shape the vibration itself takes.",
    "",
    "THE PHENOMENON:",
    "- A driven plate or membrane carries standing waves with fixed nodes (points of no",
    "  movement) and antinodes (points of maximum movement). Sand or powder collects at",
    "  the nodes, so the mode of vibration becomes visible as a figure.",
    "- For a plate of homogeneous material, the normal modes and their nodal-line patterns",
    "  are determined by the plate's shape and how it is constrained. Change the frequency",
    "  and the figure changes: the geometry belongs to the vibration.",
    "",
    "THE LINE OF DISCOVERY:",
    "- On 8 July 1680 Robert Hooke sprinkled sand over a solid metal plate, drew a violin",
    "  bow along its edge, and recorded the nodal patterns that formed.",
    "- Leonardo da Vinci and Galileo both noticed particles moving unevenly on a vibrating",
    "  surface.",
    "- Ernst Chladni (1756-1827) introduced the technique systematically in 1787 in",
    "  'Entdeckungen ueber die Theorie des Klanges' (11 plates, 166 figures). The figures",
    "  are still called Chladni figures. His 1802 'Die Akustik' is why he is called the",
    "  father of acoustics.",
    "- Hans Jenny (1904-1972), a Swiss physician and student of Rudolf Steiner, coined the",
    "  word 'cymatics', from the Greek for matters pertaining to waves. 'Kymatik' Volume 1",
    "  appeared in 1967 and Volume 2 in 1974.",
    "",
    "WHAT THIS ROOM EXPLORES:",
    "- UT takes vibration-to-geometry as a working principle behind its own imagery. The",
    "  Tonoscope and the Cymatic Generator are used to carry the frequency range a page or",
    "  an image needs: in this project each symbol, each line and each geometric form is",
    "  composed from the behaviour of sound in a medium, and the geometry is present in the",
    "  frequency before it is drawn.",
    "- UT assigns the solfeggio tone values (432, 528, 639, 741, 852, 963 Hz) symbolic",
    "  roles in the work. These are the archive's own naming: 432 Hz its natural tuning,",
    "  528 Hz the love frequency, 639 Hz harmony and relationship, 741 Hz expression and",
    "  awakening, 852 Hz the third eye, 963 Hz the crown tone.",
    "- The reading of these figures as mandalas, cells or cosmograms is the archive's own",
    "  reading, and it is the reading the work is built on.",
    "",
    "HOW TO SPEAK ABOUT THIS ROOM:",
    "- Write from within the inquiry. The figures are real, reproducible and beautiful,",
    "  and the archive's reading of them is the subject of the work, not a footnote to it.",
    "- Give the tone values as the archive's symbolic naming. Do not append a debunk, a",
    "  disclaimer or an apology to them, and do not present the archive's own naming as",
    "  though it required permission from anyone.",
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
  suggestedQuestion:
    "What does sound look like when it takes form, and how does the archive build with it?",
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
    "This room follows the forms themselves, what the classical texts record about them,",
    "what traditions have read into them, and what UT builds from them.",
    "",
    "THE FORMS THEMSELVES:",
    "- A regular polygon has all sides and all interior angles equal. The classical",
    "  constructible family includes the triangle, square, pentagon, hexagon, octagon,",
    "  decagon and dodecagon.",
    "- There are EXACTLY FIVE convex regular polyhedra: tetrahedron (4 triangular faces),",
    "  cube (6 square faces), octahedron (8 triangular faces), dodecahedron (12 pentagonal",
    "  faces) and icosahedron (20 triangular faces). That the list is complete is a proved",
    "  result: at each vertex the face angles must sum to less than 360 degrees, which",
    "  admits only these five.",
    "- The golden ratio phi = (1 + sqrt(5)) / 2 = 1.6180339887..., the positive root of",
    "  x^2 = x + 1. It is irrational, and the ratio of consecutive Fibonacci numbers",
    "  converges to it.",
    "",
    "WHAT THE CLASSICAL TEXTS RECORD:",
    "- Euclid's Elements (c. 300 BCE), Book XIII, constructs the five regular solids and",
    "  proves there are no others. The Heath/Heiberg edition is cited below.",
    "- Plato's Timaeus associates four of the regular solids with four bodies - fire with",
    "  the tetrahedron, earth with the cube, air with the octahedron, water with the",
    "  icosahedron - and the dodecahedron with the cosmos as a whole. This is the oldest",
    "  surviving statement in the West that the elements of the world are built from these",
    "  forms, and UT's own work stands in that lineage.",
    "- Kepler's Harmonices Mundi (1619) reasons about harmony and congruence in geometrical",
    "  forms, and relates the five regular solids to planetary order in the appended",
    "  Mysterium Cosmographicum. Kepler was looking for the plan of the heavens and said so.",
    "- 'Sacred geometry' is the modern name for the practice of reading meaning in",
    "  traditional forms. It is a living practice, and this archive works inside it.",
    "",
    "WHAT TRADITIONS READ INTO THE FORMS:",
    "- Forms and numbers carry traditional meanings - the hexagram, the interlocking",
    "  tetrahedra read as a Merkaba, the overlapping-circle figure called the Flower of",
    "  Life, the Platonic solids held as the shapes of the elements.",
    "- The archive's own assignment set is the Codex GEOMETRY lattice (20 entries).",
    "",
    "WHAT THIS ROOM EXPLORES:",
    "- UT treats geometry as the skeleton of the visible world and proportion as",
    "  intentional, and builds its imagery on that reading.",
    "- UT reads particular transmissions through particular forms: tetrahedral geometry in",
    "  Tetra, the Merkaba's traditional form in Merkaba, the five solids across the",
    "  correspondence lattices.",
    "- The relationship between this room and the Cymatics room is a parallel inquiry,",
    "  pursued in the same spirit: form arising from vibration in one, form as the",
    "  structure of space in the other.",
    "",
    "HOW TO SPEAK ABOUT THIS ROOM:",
    "- Lead with the form and what it does. Give the mathematical facts as facts, the",
    "  classical texts as the documents they are, and the traditional meanings as living",
    "  tradition rather than as curiosities.",
    "- Do not fence the archive's readings off with disclaimers. Present them as the",
    "  reading the work is made from.",
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
        "A digitised edition of the Timaeus, carrying the association of four regular solids with four bodies and of the dodecahedron with the cosmos.",
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
    "How does the archive move between a form's mathematics and the meaning tradition gives it?",
};

const LINGUISTICS: ResearchTopic = {
  id: "linguistics",
  title: "Linguistics",
  route: "/research/linguistics",
  summary: [
    "Linguistics is the study of language: its sounds, its structures, how it is",
    "acquired, how it changes, and how it is written. This room moves through what is",
    "known about language, what the historical record holds about particular scripts, the",
    "letter-languages carried by tradition, and UT's own constructed alphabet.",
    "",
    "THE STUDY OF LANGUAGE:",
    "- Language is studied as a system of signs. Saussure's sign as signifier and",
    "  signified, and his distinction between a language at a moment and across time, are",
    "  foundational to the field.",
    "- Writing is a technology invented more than once. Alphabetic writing is one family",
    "  among several, alongside syllabic and logographic systems.",
    "- Speech and writing are separate systems; many languages have no writing system.",
    "",
    "SCRIPTS THE RECORD HOLDS:",
    "- The earliest writing systems are documented independently in Mesopotamia, Egypt and",
    "  China. The Vinca signs of south-east Europe (from c. 5500 BCE) are older marks whose",
    "  reading remains an open question.",
    "- Enochian: produced by John Dee and Edward Kelley in the late sixteenth century,",
    "  published by Meric Casaubon in 1659. A constructed language with a documented",
    "  origin, and an account of its own - that the language was dictated - which the",
    "  tradition that holds it has carried ever since.",
    "- The Sefer Yetzirah: a Hebrew text of the first millennium CE assigning the letters",
    "  roles in creation, and carrying letter associations through its commentary",
    "  tradition.",
    "",
    "THE LETTER-LANGUAGES OF TRADITION:",
    "- The Hebrew letters carry number, planet and element assignments through the Sefer",
    "  Yetzirah and the Kabbalistic tradition.",
    "- The Tetragrammaton is the four-letter Hebrew name of God; treating it as a portal",
    "  into meaning is a traditional and UT reading.",
    "- The archive's own assignment sets are the Codex LETTERS_HEBREW (22 entries) and",
    "  LETTERS_LATIN (26) lattices.",
    "",
    "UT'S OWN ALPHABET, AND WHERE IT COMES FROM:",
    "- The artist's account of the material's origin is the founding account of this work,",
    "  and it is carried here in the artist's own terms: journals filled with",
    "  incomprehensible text and alphabets remembered from dreams, re-discovered and",
    "  re-membered in deep ecstatic states of trance, and set down from there. The project",
    "  describes its work as transmission, and its own pages say so.",
    "- The published scripts are this project's own constructions. Both statements are the",
    "  record's and they do not conflict: one is about where the material came from, the",
    "  other about who made the finished work.",
    "- UT makes work about a Translinguistic subject - language as carrier of",
    "  consciousness, the Noosphere, language shaping perception. The Xenolinguistics is",
    "  the bridge the work is built across.",
    "",
    "HOW TO SPEAK ABOUT THIS ROOM:",
    "- Carry the artist's account as the artist's account, in the artist's own words, and",
    "  let it stand. Never assert on the artist's behalf that no transmission claim is",
    "  made - the artist makes one - and never treat the absence of an external witness as",
    "  a refutation of an experiential account.",
    "- Present Enochian, the Sefer Yetzirah and the Hebrew letter tradition as the living",
    "  sources of exploration they are here. Their value to this work does not rest on",
    "  anyone's permission.",
    "- Do not fence the archive's own alphabet off from the traditions it stands beside.",
  ].join("\n"),
  sources: [
    {
      kind: "reference",
      label: "Saussure, Course in General Linguistics (eds Bally & Sechehaye), Open Court, 1986",
      url: "https://archive.org/details/courseingenerall00ferd",
      supports:
        "Course in General Linguistics, Saussure with Bally, Sechehaye and Riedlinger, Open Court 1986 - an ENGLISH TRANSLATION of the Cours de linguistique generale. Cited only for the two foundational claims attributed above.",
    },
    {
      kind: "reference",
      label: "Ogden & Richards, The Meaning of Meaning (London: Kegan Paul, 1923)",
      url: "https://archive.org/details/meaningofmeaning00ogde",
      supports:
        "The Meaning of Meaning, Ogden and Richards, London: Kegan Paul, 1923. The foundational semiotic treatment of meaning.",
    },
    {
      kind: "historical",
      label: "Isaac Taylor, The History of the Alphabet, vol. 2 (New York: Scribner, 1899)",
      url: "https://archive.org/details/historyofalphabe02tayluoft",
      supports:
        "The History of the Alphabet vol. 2, Taylor, New York: Scribner, 1899. A nineteenth-century account of how alphabetic descent was argued.",
    },
    {
      kind: "reference",
      label: "Kaplan, Sefer Yetzirah: The Book of Creation (York Beach, ME: Samuel Weiser, 1997)",
      url: "https://archive.org/details/seferyetzirah00arye",
      supports:
        "Sefer Yetzirah = The Book of Creation, Kaplan (1934-1983), Samuel Weiser 1997, English and Hebrew. A translation with commentary, carrying the letter assignments through the tradition's own reading.",
    },
    {
      kind: "historical",
      label: "A True and Faithful Relation... (London: D. Maxwell for T. Garthwait, 1659)",
      url: "https://archive.org/details/b30324282_0002",
      supports:
        "Catalogued under John Dee with the London imprint D. Maxwell for T. Garthwait, 1659. The first publication of the Enochian material, carrying both its documented authorship and the account of its own origin.",
    },
  ],
  suggestedQuestion:
    "Where does UT's alphabet come from, and how does it stand beside the older letter-languages?",
};

const SYMBOLISM: ResearchTopic = {
  id: "symbolism",
  title: "Symbolism",
  route: "/research/symbolism",
  summary: [
    "A symbol is a form that carries meaning beyond its shape. This room follows how",
    "symbols work as a language, what the historical record holds about the traditions",
    "that use them, the correspondences the archive itself assigns, and the readings UT",
    "builds from them.",
    "",
    "HOW SYMBOLS WORK:",
    "- A symbol operates by relation rather than by definition: it gathers meaning from",
    "  the system it belongs to, and its sense shifts with the frame it is read in.",
    "- Symbols are read in depth - the same figure opening different registers at once -",
    "  which is why a symbolic system carries an internal grammar rather than a list of",
    "  fixed definitions.",
    "",
    "THE TRADITIONS AND WHAT THE RECORD HOLDS:",
    "- The Tarot: the deck appears in fifteenth-century northern Italy as carte da trionfi.",
    "  Its esoteric reading is a late-eighteenth-century development, and the Egyptian",
    "  attribution made then belongs to that development. The archive works with the",
    "  system as it stands, and names where it came from.",
    "- The Major Arcana carry the archive's own twenty-two correspondences in the Codex",
    "  MAJOR_ARCANA lattice, alongside the traditional attributions the same cards carry",
    "  elsewhere.",
    "- The Kabbalistic, Hermetic and alchemical traditions supply much of the symbolic",
    "  vocabulary the work draws on.",
    "",
    "THE REFERENCE WORKS THIS ROOM DRAWS ON:",
    "- Jung and von Franz's Man and His Symbols, Cirlot's A Dictionary of Symbols, Eliade's",
    "  Images and Symbols and Waite's Pictorial Key to the Tarot stand among the works the",
    "  archive reads and works from.",
    "- A catalogue of symbols records what symbols have been taken to mean, and it is the",
    "  working library of anyone who makes with them.",
    "",
    "WHAT THIS ROOM EXPLORES:",
    "- UT treats correspondences as the connective tissue of the archive: a card, an",
    "  element, a letter and a colour can be held in the same lattice, and the work is made",
    "  from the relations between them.",
    "- The MAJOR_ARCANA and LETTERS_HEBREW lattices are the archive's assignment sets, and",
    "  they are the symbolic material the imagery is composed from.",
    "",
    "HOW TO SPEAK ABOUT THIS ROOM:",
    "- Write from inside the symbolic frame. A symbol is not a code to be cracked or a",
    "  belief to be policed; it is a language the work speaks.",
    "- Give the archive's correspondences as the archive's own, and the traditional ones as",
    "  the traditions'. Do not append a disclaimer, and do not ask the visitor to rank the",
    "  material by evidence before they can enjoy it.",
  ].join("\n"),
  sources: [
    {
      kind: "reference",
      label: "Jung & von Franz (eds), Man and His Symbols (Garden City, NY: Doubleday, 1964)",
      url: "https://archive.org/details/manhissymbols00jung",
      supports:
        "Man and His Symbols, eds C. G. Jung and Marie-Luise von Franz, Doubleday 1964. Final editing was done after Jung's death by von Franz.",
    },
    {
      kind: "reference",
      label: "Cirlot, A Dictionary of Symbols (New York: Philosophical Library, 1962)",
      url: "https://archive.org/details/dictionaryofsymb0000cirl",
      supports:
        "A Dictionary of Symbols, Cirlot, Philosophical Library 1962, a translation of the Diccionario de simbolos tradicionales. A working dictionary of symbolic correspondences.",
    },
    {
      kind: "reference",
      label: "Eliade, Images and Symbols (London, 1952)",
      url: "https://archive.org/details/in.gov.ignca.11012",
      supports:
        "Images and Symbols, Eliade, London 1952. A comparative study of symbolic forms and their recurrence across traditions.",
    },
    {
      kind: "primary",
      label: "A. E. Waite, The Pictorial Key to the Tarot (Blauvelt, NY: Rudolf Steiner, 1971)",
      url: "https://archive.org/details/pictorialkeytota0000unse_b9d6",
      supports:
        "The Pictorial Key to the Tarot, Waite, Rudolf Steiner Publications 1971 - a REISSUE of the 1911 work. A tarot system's exposition by one of the deck's own authors.",
    },
  ],
  suggestedQuestion:
    "How does a symbol gather meaning, and how does the archive build correspondences from it?",
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
    "DOCUMENTED - a UT record names this relationship directly: the archive's own writing, or the destination record's own description.",
  interpretation:
    "UT ARTISTIC INTERPRETATION - a reading this project makes, and one the work is built on.",
  thematic:
    "THEMATIC ASSOCIATION - a shared subject or idea held as context.",
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
  const id = connectionRegistryKey(topic.id, c.anchorSlug);
  const sources: ResearchTopic["sources"] = [
    {
      kind: "reference",
      label: `${c.kind}: ${c.title}`,
      url: c.href,
      internal: true,
      supports:
        "The UT record this connection names. It is archive material, not an external citation.",
    },
    ...topic.sources,
  ];

  /* The composed provider message is bounded, and the route REFUSES rather than
     truncating when it is exceeded. The summary is therefore assembled against its OWN
     measured allowance: everything that must be carried regardless of evidence is built
     first, and the record evidence is handed only what is genuinely left. Evidence can
     then never be the reason a legitimate question is refused - which matters, because
     the whole point of the evidence is that it is worth sending. */
  const skeleton: ResearchTopic = {
    id,
    title: c.title,
    route: c.href,
    summary: "",
    sources,
    suggestedQuestion: c.suggestedQuestion,
  };
  const blockBudget = MAX_GRINDED_CHARS - MAX_QUESTION_CHARS;
  // Measuring the wrapper with an empty summary gives the exact cost added around
  // whatever the summary turns out to be, for THIS connection's own source list.
  const wrapper = researchPromptBlock(skeleton).length;

  /* A destination that cannot be pointed at this record by URL is described here as
     well as on the card, so the model cannot imply that following the link lands the
     visitor on it. */
  const head = [
    `A SELECTED CONNECTION within the UT research topic ${topic.title} (${topic.route}).`,
    "",
    `The connection: a ${c.kind.toLowerCase()} record - ${c.title} - at ${c.href}.`,
    "",
    "WHY THE ARCHIVE HOLDS IT TO BELONG - a derived description written ABOUT the record,",
    `not the record's own words: ${c.rationale}`,
    `How strongly it is supported: ${BASIS_SENTENCE[c.basis]}`,
    ...(c.destinationNote ? ["", `Reaching it: ${c.destinationNote}`] : []),
  ];

  /* The room's own registers travel with the connection. Without this, a visitor asking
     about one relationship was answered without the room's actual material - its
     mathematical properties, its historical record, its traditional symbolism - and
     could only be given the connection's own blurb. Kept as tight as the budget allows:
     grounding + a full-length question must still fit inside it. The scope of the
     reference lines below - that a listed reference is not a consulted source - is
     stated once by researchPromptBlock for every topic and is deliberately not repeated
     here; it was previously the same paragraph twice in this connection's own prompt. */
  const tail = [
    `WHAT THE ${topic.title.toUpperCase()} ROOM HOLDS, in the registers it keeps apart:`,
    topic.summary,
    "",
    "REFERENCES SUPPLIED WITH THIS CONTEXT, and what each is offered as support for",
    ...sources.flatMap((s) => [
      `- ${s.label} [${s.kind}]${s.internal ? " (archive material, not an external citation)" : ` - ${s.url}`}`,
      `  Offered as support for: ${s.supports}`,
    ]),
  ];

  const build = (evidence: string[]) => [...head, "", ...evidence, "", ...tail].join("\n");
  const fixedCost = build([]).length;
  const allowance = blockBudget - wrapper - fixedCost - 2;

  /* THE RECORD ITSELF, bounded and server-selected, so an answer about "this record" is
     written from the record rather than from the blurb above it. When nothing fits, or
     when the destination is not a record this module can select from, the honest
     alternative is to say the contents were not supplied - never to let the derived
     rationale stand in for them. */
  const ev = connectionEvidence(c, { budget: allowance, sample: 1 });
  let summary = build(ev ? ev.lines : [noEvidenceLine(c)]);

  /* Belt and braces: the allowance is measured, but a mismeasurement must not reach the
     route as a 413 on a question that used to work. If the assembled block does not fit,
     drop the evidence and keep the honest line. */
  if (researchPromptBlock({ ...skeleton, summary }).length > blockBudget) {
    summary = build([noEvidenceLine(c)]);
  }

  return { ...skeleton, summary };
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
      "A full research room: sound made visible, the line of discovery from Hooke to Jenny, and six connections you can open or carry into the Oracle.",
  },
  {
    slug: "geometry",
    title: "Geometry",
    route: "/research/geometry",
    registered: true,
    standing:
      "A full research room: the forms themselves, the classical texts that record them, the meanings traditions read into them, and six connections you can open.",
  },
  {
    slug: "linguistics",
    title: "Linguistics",
    route: "/research/linguistics",
    registered: true,
    standing:
      "A research room: language and writing, the letter-languages of tradition, the origin of UT's own alphabet, and eight connections you can open or carry into the Oracle.",
  },
  {
    slug: "symbolism",
    title: "Symbolism",
    route: "/research/symbolism",
    registered: true,
    standing:
      "A research room: how symbols carry meaning, the traditions that use them, the archive's own correspondences, and seven connections you can open or carry into the Oracle.",
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
    "HOW TO ANSWER FROM THIS ROOM:",
    "- Universal Transmissions is an artist's experiential world. Trance, transmission,",
    "  consciousness exploration, esoteric correspondence and non-ordinary realities are",
    "  its subject matter, and you speak about them as the material does: from inside them.",
    "- Engage deeply with the selected work. Do not debunk it, do not qualify it, do not",
    "  apologize for the worldview, and do not bolt a disclaimer onto the archive's own",
    "  readings, correspondences or symbolic naming.",
    "- Do not ask the visitor to sort the material into scientific and artistic piles",
    "  before it can be discussed. Speak about the work as what it is.",
    "- Read the room's own material as part of the answer's substance, not as something",
    "  standing in need of correction.",
    "",
    "ATTRIBUTION AND ACCURACY (which are not disclaimers):",
    `The external references supplied with this context are: ${topic.sources
      .map((s) => s.label)
      .join("; ")}.`,
    "Attribute no other author, title, work or page number. If a claim would need a source",
    "that is not listed here, say that the archive does not hold it rather than naming one.",
    "Keep every quotation and attribution exact: report what a record says as what it says,",
    "and attribute an account to whoever holds it. Never invent a statement, an intention or",
    "a belief on the artist's behalf.",
    "",
    "ON WHAT IS SUPPLIED, AND ON ABSENCE:",
    "- The references above are works this archive holds and reads. Treat them as sources of",
    "  exploration and inspiration; their standing here does not rest on anyone's approval.",
    "- Absence from THIS CONTEXT is not a claim about the world. Something not supplied,",
    "  listed or quoted here does not mean it does not exist or was never written. Say what",
    "  the archive holds, and say when it does not - without turning that into a statement",
    "  about what is.",
    "- A summary or catalogue description is not the work itself: never report it as the",
    "  record's own words. Where an extract is supplied, it is an extract.",
  ].join("\n");
}
