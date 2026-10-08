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
    "HISTORICAL (attested in primary documents):",
    "- Robert Hooke observed nodal patterns on a glass plate with flour in 1680.",
    "- Galileo Galilei made comparable observations around 1630.",
    "- Ernst Chladni (1756-1827) introduced the technique systematically in 1787 in",
    "  'Entdeckungen ueber die Theorie des Klanges'. The figures are still called",
    "  Chladni figures. His 1802 'Die Akustik' is why he is called the father of acoustics.",
    "- Hans Jenny (1904-1972), a Swiss physician and Rudolf Steiner student, coined the",
    "  word 'cymatics' and published 'Kymatik' in 1967, with the second volume in 1972.",
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
    "- Jenny himself held that the forms were a manifestation of an invisible force",
    "  field. That is his stated belief, and it is not a measurement.",
  ].join("\n"),
  sources: [
    {
      kind: "historical",
      label: "Chladni, Entdeckungen über die Theorie des Klanges (1787)",
      url: "https://gallica.bnf.fr/ark:/12148/bd6t57722568.texteImage",
      supports:
        "Chladni's original treatise, digitised by the Bibliothèque nationale de France. Supports the 1787 date, the plates-and-sand method, and the figures still called Chladni figures.",
      },
    {
      kind: "primary",
      label: "Jenny, Cymatics: A Study of Wave Phenomena and Vibration",
      url: "https://monoskop.org/images/3/31/Jenny_Hans_Cymatics_A_Study_of_Wave_Phenomena_and_Vibration_Vol_1_2001.pdf",
      supports:
        "The compiled Jenny volumes, including the 'Kymatik' work. Supports the coining of the term, the 1967 first volume, and Jenny's own experiments. It is also where Jenny's force-field interpretation appears — as his belief, not as a measurement.",
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

const REGISTRY: Record<string, ResearchTopic> = {
  cymatics: CYMATICS,
};

/** Public identifier for a topic, e.g. `research-v1:cymatics`. */
export function researchTopicId(slug: string): string {
  return `${RESEARCH_TOPIC_PREFIX}${slug}`;
}

export function researchTopicSlugs(): string[] {
  return Object.keys(REGISTRY);
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
  ].join("\n");
}
