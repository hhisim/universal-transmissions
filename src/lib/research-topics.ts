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
      "The topic it was selected from carries its own standing, which still applies here:",
      "- OBSERVED means the pattern is experimentally demonstrated and reproducible.",
      "- HISTORICAL means a named primary document records it.",
      "- UT ARTISTIC INTERPRETATION means it is this project's reading, not a fact about the world.",
      "",
      "The external references listed with this entry belong to the TOPIC as a whole. This",
      "connection itself is a UT record, not an external citation, and nothing here asserts that",
      "an external source has endorsed the relationship.",
      "",
      `The ONLY external references supplied with this context are: ${topic.sources
        .map((s) => s.label)
        .join("; ")}. Do not attribute any other author, title, work or page number. If a`,
      "claim would need a source that is not listed here, say that the archive does not hold",
      "it rather than naming one.",
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
 * The standing line is the honest part: two of these are registered rooms with a
 * sourced summary and a curated connection registry, and two are reading pages with
 * neither. Presenting all four as equivalent rooms would be the easy lie.
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
      "A registered room: a server-resolved topic record with its own sourced summary, and six curated connections you can take into the Oracle.",
  },
  {
    slug: "geometry",
    title: "Geometry",
    route: "/research/geometry",
    registered: true,
    standing:
      "A registered room: a server-resolved topic record that keeps mathematical property, historical documentation, traditional symbolism and UT reading apart, with six curated connections.",
  },
  {
    slug: "linguistics",
    title: "Linguistics",
    route: "/research/linguistics",
    registered: false,
    standing:
      "A reading page, not yet a room: it carries no server-resolved topic record, no sourced bibliography and no curated connection registry, so nothing here can be taken into the Oracle as a selected context.",
  },
  {
    slug: "symbolism",
    title: "Symbolism",
    route: "/research/symbolism",
    registered: false,
    standing:
      "A reading page, not yet a room: it carries no server-resolved topic record, no sourced bibliography and no curated connection registry, so nothing here can be taken into the Oracle as a selected context.",
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
}> {
  return Object.entries(RESEARCH_TOPICS).flatMap(([slug, topic]) =>
    (CONNECTIONS_BY_TOPIC[slug] ?? []).map((connection) => ({
      topicSlug: slug,
      topicTitle: topic.title,
      topicRoute: topic.route,
      connection,
      anchorId: researchConnectionTopicId(slug, connection.anchorSlug),
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
    "- UT ARTISTIC INTERPRETATION means it is this project's reading, not a fact about the world.",
    "Do not present an interpretation or a symbolic frequency assignment as an experimental",
    "result, and do not offer medical or healing claims about specific frequencies.",
    `The ONLY external references supplied with this context are: ${topic.sources
      .map((s) => s.label)
      .join("; ")}. Do not attribute any other author, title, work or page number — if a claim`,
    "would need a source that is not listed here, say that the archive does not hold it.",
  ].join("\n");
}
