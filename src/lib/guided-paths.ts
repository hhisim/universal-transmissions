/**
 * Guided explorations through material that already exists.
 *
 * A path is an ORDER over records the archive already holds. It adds two things and
 * nothing else:
 *
 *   - `encounter`  what the visitor is meeting at this stop, in this path's terms;
 *   - `transition` the reading that carries the inquiry from this stop to the next.
 *
 * Everything a visitor acts on - the record's title, its route, its basis, its label and
 * its Oracle question - is RESOLVED FROM THE EXISTING REGISTRIES at render time. Nothing
 * is retyped here, so a path cannot drift out of step with the room it draws on, and no
 * new Oracle identifier is introduced: every stop addresses either `research-v1:<room>`
 * or `research-v1:<room>/connection/<anchor>`, exactly the contracts the rooms already
 * publish.
 *
 * Transitions are CURATED READINGS. They are marked as such wherever they appear, because
 * the order of a path is an editorial act: it chooses a descent, a lineage or a resonance
 * the archive makes, and that reading belongs to the path. Each stop's own record carries
 * its own account; the transition is how this path walks between them.
 */

import {
  researchConnectionTopicId,
  researchTopicId,
  resolveResearchTopic,
} from "./research-topics";
import { CONNECTIONS_BY_TOPIC } from "./research-connections";

export interface PathStop {
  /** Room slug. The stop's record is resolved from this room's registry. */
  topic: string;
  /**
   * Connection anchor within that room. Absent means the stop IS the room itself, which
   * resolves to `research-v1:<topic>` rather than to one of its connections.
   */
  anchor?: string;
  /** What the visitor is encountering, in this path's terms. */
  encounter: string;
  /**
   * The curated reading that carries the inquiry to the next stop. Omitted on the last
   * stop: an ending does not need a bridge.
   */
  transition?: string;
}

export interface GuidedPath {
  slug: string;
  title: string;
  /** One line naming the movement this path traces. */
  theme: string;
  /** What the path is for, and what it is not. */
  summary: string;
  stops: PathStop[];
}

export const GUIDED_PATHS: GuidedPath[] = [
  {
    slug: "sound-into-form",
    title: "Sound into Form",
    theme: "Vibration, and the moment it becomes something you can look at.",
    summary:
      "Six stops between a vibrating surface and a measured figure. Every stop is an existing record: two rooms, two Journal pieces, an artwork and the Resonator. The path follows how the archive has taken up the old claim that sound carries form - from the plate that shows it, through the diagrams that argue it, to the instrument built to make it visible.",
    stops: [
      {
        topic: "cymatics",
        encounter:
          "The inquiry opens in the room where sound becomes visible: what a vibrating surface shows, and the figures it leaves behind.",
        transition:
          "Before the pattern is read, look at what the archive says produced it. The next stop is the archive's own account of vibration becoming legible.",
      },
      {
        topic: "cymatics",
        anchor: "journal-cymatics-language-of-form",
        encounter: "The archive's own long-form account of vibration learning to spell.",
        transition:
          "From the account to an object: the next stop is an artwork named for harmonics rather than for an image, which is a claim about what it depicts.",
      },
      {
        topic: "cymatics",
        anchor: "artwork-hyperdimensional-harmonics",
        encounter: "An artwork whose title puts harmonics ahead of any figure it shows.",
        transition:
          "The path has been read so far. Its one operable stop comes next - the place where the visitor can drive the phenomenon rather than read about it.",
      },
      {
        topic: "cymatics",
        anchor: "instrument-universal-resonator",
        encounter:
          "The Universal Resonator, and the only stop on this path the visitor can operate. What it does is shown; what it does not do is stated.",
        transition:
          "Leaving the instrument, the path turns to a historical figure who drew cosmology as a diagram of light - a documented case of form carrying a claim about the universe.",
      },
      {
        topic: "geometry",
        anchor: "journal-walter-russell-universal-one",
        encounter: "Walter Russell's The Universal One, examined as a cosmology rendered as diagram.",
        transition:
          "The last stop is the room where form is treated as something with properties rather than as an image - the place this inquiry has been heading.",
      },
      {
        topic: "geometry",
        encounter:
          "Geometry, where figure is examined for what it is and is not. The path ends here deliberately: it does not close the question, it hands it to a room built to hold it.",
      },
    ],
  },
  {
    slug: "language-into-glyph",
    title: "Language into Glyph",
    theme: "From established linguistics to a script the project is still building.",
    summary:
      "Six stops across the linguistics room's own material: the room, two Journal pieces, two artworks and a Codex system view. The path follows a single thread - how a language is made, what it is made to carry, and what happens when it is treated as a living system rather than a code - from the oldest recorded script in the archive's library to the alphabet the project built for itself. It ends inside the Codex, where the correspondences the archive records can be read one at a time.",
    stops: [
      {
        topic: "linguistics",
        encounter:
          "The room opens where the discipline is: the sign, the difference between a language at a moment and across time, and what linguistics does not hold.",
        transition:
          "From the discipline to the project's own object. The next stop is the archive's note on the alphabet it is building.",
      },
      {
        topic: "linguistics",
        anchor: "journal-universal-transmissions-alphabet",
        encounter:
          "The archive's own short note on its constructed alphabet - a process entry, not a treatise.",
        transition:
          "The alphabet is a design. The next stop is an artwork that states its mechanism in its own vocabulary - the archive at its most literal about what language is for.",
      },
      {
        topic: "linguistics",
        anchor: "artwork-translinguistic-equation",
        encounter:
          "An artwork written in mechanistic terms - spin resonance, alkaloids. It is the clearest statement in the archive of language treated as an operating system rather than a description of one.",
        transition:
          "From a mechanism stated as text to a figure stated as image, and to the artist's own account of where the piece came from.",
      },
      {
        topic: "linguistics",
        anchor: "artwork-linguistic-mystic",
        encounter:
          "Linguistic Mystic, with its record quoted rather than paraphrased - including what it says about the mentors it names.",
        transition:
          "The next stop is the counter-example that matters: a constructed language with a real date, named authors and a publication history.",
      },
      {
        topic: "linguistics",
        anchor: "journal-enochian-angelic-language",
        encounter:
          "Enochian, recorded as produced by Dee and Kelley and published in London in 1659 - an invented script that nonetheless has provenance.",
        transition:
          "The path ends in the archive itself. Having kept design apart from descent, the visitor can now read the letter correspondences the archive records.",
      },
      {
        topic: "linguistics",
        anchor: "codex-archive-hebrew-letters",
        encounter:
          "The Codex archive's Hebrew letters view - the recorded correspondences themselves, where a tradition's assignments can be read as assignments.",
      },
    ],
  },
  {
    slug: "symbol-into-correspondence",
    title: "Symbol into Correspondence",
    theme: "From a symbol read in context to a correspondence the archive records.",
    summary:
      "Six stops from the symbolism room into the Codex and back out through three artworks. The path takes one figure at a time and lets every stop deepen it - the card, its number, the planet and element it is bound to, and the artwork that carries it into form. Read in order, the correspondences stop being a list and start reading as a language.",
    stops: [
      {
        topic: "symbolism",
        encounter:
          "The room opens on symbols that carry relations rather than isolated meanings, and on a figure whose sense changes with the system it is read in.",
        transition:
          "The first worked example is a set with an internal grammar and a documented history - including an origin story that was made rather than found.",
      },
      {
        topic: "symbolism",
        anchor: "journal-tarot-symbolic-machine",
        encounter:
          "The Tarot examined as a structured system, and as a case whose Egyptian attribution is dated to the eighteenth century rather than to antiquity.",
        transition:
          "From a system in prose to the archive's own records for it. The next stop is where those correspondences are actually stored.",
      },
      {
        topic: "symbolism",
        anchor: "codex-archive-major-arcana",
        encounter:
          "The Codex archive's Major Arcana view: the archive's recorded correspondences for a 22-record system.",
        transition:
          "Leaving the archive's tables, the path turns to artworks, where a symbol is carried into an image. This is where UT interpretation openly replaces documented correspondence.",
      },
      {
        topic: "symbolism",
        anchor: "artwork-ethera-24",
        encounter:
          "ETHERA 24, where a documented historical scheme and the record's own gloss of it sit in the same sentence and are separable.",
        transition:
          "The next artwork names its influences outright, which makes it a documented case rather than an inferred one.",
      },
      {
        topic: "symbolism",
        anchor: "artwork-recursive-pantheism",
        encounter:
          "Recursive Pantheism, which states by name what it was influenced and inspired by.",
        transition:
          "One more stop, to show the register moving the other way: polarity and trinary structure, where the scheme is traditional and the energy is not.",
      },
      {
        topic: "symbolism",
        anchor: "artwork-trinary-transcendence",
        encounter:
          "Trinary Transcendence, and the deliberately narrow attributions of an artwork made in unusual circumstances.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ resolution */

export interface ResolvedStop {
  /** 1-based position, for display. */
  number: number;
  total: number;
  topic: string;
  anchor: string | null;
  encounter: string;
  transition: string | null;
  /** The record's own title, from the registry. */
  title: string;
  /** Artwork / Journal / Codex / Instrument / Research room. */
  kind: string;
  /** The record's own route, kept available as an ordinary destination. */
  href: string;
  /** The registry's reason this record belongs - the archive's wording, not the path's. */
  rationale: string | null;
  /** documented | interpretation | thematic, when the record states one. */
  basis: string | null;
  basisLabel: string | null;
  /** The registry's question for this record. */
  question: string;
  /** The exact identifier the Oracle resolves. */
  oracleId: string;
}

export function findGuidedPath(slug: string): GuidedPath | null {
  return GUIDED_PATHS.find((p) => p.slug === slug) ?? null;
}

export function guidedPathSlugs(): string[] {
  return GUIDED_PATHS.map((p) => p.slug);
}

/**
 * Resolve one stop against the live registries.
 *
 * Returns null when the room is not registered or the anchor is no longer published.
 * The caller must render that as an honest absence - never as an empty card, and never
 * by substituting a nearby record.
 */
export function resolveStop(path: GuidedPath, index: number): ResolvedStop | null {
  const stop = path.stops[index];
  if (!stop) return null;
  /* Resolved through the same public resolver the server uses for a URL-supplied
     identifier, so a path can never point at a room the Oracle would not accept. */
  const topic = resolveResearchTopic(researchTopicId(stop.topic));
  if (!topic) return null;

  if (!stop.anchor) {
    return {
      number: index + 1,
      total: path.stops.length,
      topic: stop.topic,
      anchor: null,
      encounter: stop.encounter,
      transition: stop.transition ?? null,
      title: topic.title,
      kind: "Research room",
      href: topic.route,
      rationale: null,
      basis: null,
      basisLabel: null,
      question: topic.suggestedQuestion,
      oracleId: researchTopicId(stop.topic),
    };
  }

  const connection = (CONNECTIONS_BY_TOPIC[stop.topic] ?? []).find(
    (c) => c.anchorSlug === stop.anchor
  );
  if (!connection) return null;

  return {
    number: index + 1,
    total: path.stops.length,
    topic: stop.topic,
    anchor: stop.anchor,
    encounter: stop.encounter,
    transition: stop.transition ?? null,
    title: connection.title,
    kind: connection.kind,
    href: connection.href,
    rationale: connection.rationale,
    basis: connection.basis,
    basisLabel: connection.basisLabel,
    question: connection.suggestedQuestion,
    oracleId: researchConnectionTopicId(stop.topic, stop.anchor),
  };
}

/** Every stop of a path, resolved. Unresolvable stops are reported, not hidden. */
export function resolvePath(path: GuidedPath): {
  stops: ResolvedStop[];
  unresolved: number[];
} {
  const stops: ResolvedStop[] = [];
  const unresolved: number[] = [];
  path.stops.forEach((_, i) => {
    const r = resolveStop(path, i);
    if (r) stops.push(r);
    else unresolved.push(i + 1);
  });
  return { stops, unresolved };
}

/**
 * What the URL asked for, in AUTHORED stop numbers.
 *
 * Authored numbers are identity, not array positions. `resolvePath` drops stops that fail
 * to resolve, so `stops[3]` is not stop 3 once anything before it is missing - with stop 2
 * unavailable the surviving numbers are 1,3,4,5,6 and the array index 2 holds stop 4.
 * Selection therefore goes through the authored number, never through the position.
 */
export type StopSelection =
  | { state: "available"; number: number; total: number; stop: ResolvedStop }
  | { state: "unavailable"; number: number; total: number }
  | { state: "out-of-range"; total: number };

/** The authored number the URL asked for. Anything unparseable is stop 1. */
export function requestedStopNumber(raw: string | undefined, total: number): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, total);
}

/**
 * Select a stop by its AUTHORED number.
 *
 * An unavailable stop returns `unavailable` and substitutes NOTHING: falling through to a
 * neighbouring record would present one stop's identity under another stop's number, which
 * is exactly the mismatch this replaces. Out-of-range is separated from unavailable because
 * they are different facts and deserve different wording.
 */
export function selectStop(path: GuidedPath, raw: string | undefined): StopSelection {
  const total = path.stops.length;
  const n = Number.parseInt(raw ?? "1", 10);
  if (Number.isFinite(n) && (n < 1 || n > total)) return { state: "out-of-range", total };
  const number = requestedStopNumber(raw, total);
  const stop = resolveStop(path, number - 1);
  return stop
    ? { state: "available", number, total, stop }
    : { state: "unavailable", number, total };
}

/**
 * The nearest AVAILABLE stops either side of an authored number.
 *
 * Neighbours skip unavailable stops rather than pointing at them, so a previous/next link
 * can never lead to a dead or substituted stop. Each neighbour keeps its own number, so the
 * Oracle return URL it produces is that stop's own.
 */
export function stopNeighbours(
  path: GuidedPath,
  number: number
): { previous: ResolvedStop | null; next: ResolvedStop | null } {
  const { stops } = resolvePath(path);
  const below = stops.filter((s) => s.number < number);
  const above = stops.filter((s) => s.number > number);
  return {
    previous: below.length ? below[below.length - 1] : null,
    next: above.length ? above[0] : null,
  };
}

/**
 * The Oracle link for a stop.
 *
 * `from` carries the path AND the stop, which the Oracle already returns verbatim as its
 * trusted return target - so the visitor lands back on the same stop of the same path with
 * no new parameter and no change to the Oracle route.
 */
export function stopOracleHref(stop: ResolvedStop, pathSlug: string): string {
  const from = `/paths/${pathSlug}?stop=${stop.number}`;
  return (
    `/oracle?view=desktop&researchTopicId=${encodeURIComponent(stop.oracleId)}` +
    `&from=${encodeURIComponent(from)}` +
    `&q=${encodeURIComponent(stop.question)}`
  );
}
