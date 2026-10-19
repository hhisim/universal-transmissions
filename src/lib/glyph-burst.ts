/**
 * glyph-burst.ts — the deliberate glyph transformation, and when it is allowed to happen.
 *
 * The site has one typography system (`ZalgoText`). Its released behaviour is *permanent*
 * corruption: every character carries combining marks for as long as the page is open. That is the
 * indiscriminate part. The artist's intent is a readable title that becomes xenolinguistic for a
 * moment and then resolves — distortion that says something because it is rare.
 *
 * This module holds the parts that must be provable without a browser: the corruption itself
 * (deterministic, so server and client cannot disagree), the burst schedule, and the guard that
 * decides whether a transformation may happen at all.
 *
 * Nothing here is random. The same text at the same intensity always corrupts identically, which is
 * what keeps the server-rendered and hydrated markup identical.
 */

export type GlyphIntensity = "subtle" | "moderate" | "heavy";

const UP = [
  "\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0305", "\u0306", "\u0307",
  "\u0308", "\u0309", "\u030A", "\u030B", "\u030C", "\u030D", "\u030E", "\u030F",
  "\u0310", "\u0311", "\u0312", "\u0313", "\u0314", "\u0315", "\u031A",
];

const DOWN = [
  "\u0316", "\u0317", "\u0318", "\u0319", "\u031C", "\u031D", "\u031E", "\u031F",
  "\u0320", "\u0321", "\u0322", "\u0323", "\u0324", "\u0325", "\u0326", "\u0327",
  "\u0328", "\u0329", "\u032A", "\u032B", "\u032C", "\u032D", "\u032E", "\u032F",
  "\u0330", "\u0331", "\u0332", "\u0333",
];

const MID = [
  "\u0323", "\u0334", "\u0335", "\u0336", "\u0337", "\u0338",
  "\u0339", "\u033A", "\u033B", "\u033C", "\u033D", "\u033E", "\u033F",
  "\u0340", "\u0341", "\u0342", "\u0343", "\u0344", "\u0345", "\u0346",
];

const COUNTS: Record<GlyphIntensity, { up: number; down: number; mid: number }> = {
  subtle: { up: 1, down: 0, mid: 0 },
  moderate: { up: 2, down: 1, mid: 1 },
  heavy: { up: 4, down: 3, mid: 2 },
};

/** Seeded LCG — deterministic, no Math.random(), identical on server and client. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * The seed for a title. It is the formula the released component already used, so every existing
 * `static` title keeps exactly the marks it had; the burst mode reuses it, which means a title's
 * corruption is the same whether it is permanent or momentary.
 */
export function seedFor(text: string, intensity: GlyphIntensity): number {
  return (text.length * 31 + intensity.length * 17) >>> 0;
}

/**
 * Corrupt a string with combining marks. Spaces and existing whitespace are left alone so the words
 * stay where they were.
 */
export function corrupt(text: string, intensity: GlyphIntensity, seed?: number): string {
  const rng = seededRandom(typeof seed === "number" ? seed : seedFor(text, intensity));
  const counts = COUNTS[intensity] ?? COUNTS.moderate;
  let out = "";
  for (const char of text) {
    if (char === " " || char === "\n" || char === "\t") {
      out += char;
      continue;
    }
    for (let i = 0; i < counts.up; i += 1) out += UP[Math.floor(rng() * UP.length)];
    for (let i = 0; i < counts.mid; i += 1) out += MID[Math.floor(rng() * MID.length)];
    out += char;
    for (let i = 0; i < counts.down; i += 1) out += DOWN[Math.floor(rng() * DOWN.length)];
  }
  return out;
}

export interface BurstPhase {
  intensity: GlyphIntensity;
  /** How long the title holds this phase. */
  ms: number;
}

/**
 * The schedule: a short crest, the peak, then a fall that resolves. Total is measured in a single
 * second or less — long enough to be seen, short enough that reading is never blocked.
 */
export function burstPlan(peak: GlyphIntensity): BurstPhase[] {
  if (peak === "subtle") return [{ intensity: "subtle", ms: 320 }];
  if (peak === "heavy") {
    return [
      { intensity: "subtle", ms: 120 },
      { intensity: "moderate", ms: 180 },
      { intensity: "heavy", ms: 260 },
      { intensity: "moderate", ms: 180 },
      { intensity: "subtle", ms: 140 },
    ];
  }
  return [
    { intensity: "subtle", ms: 140 },
    { intensity: "moderate", ms: 420 },
    { intensity: "subtle", ms: 140 },
  ];
}

/** Total time the title spends transformed. */
export function burstDuration(peak: GlyphIntensity): number {
  return burstPlan(peak).reduce((total, phase) => total + phase.ms, 0);
}

export interface BurstGuards {
  /** The visitor asked for reduced motion. */
  reducedMotion: boolean;
  /** The document is hidden (background tab, minimised). */
  hidden: boolean;
  /** This title has already played its burst on this visit. */
  alreadyPlayed: boolean;
}

/**
 * Transformation is allowed only when all three hold: the visitor has not asked for stillness, the
 * page is actually being looked at, and this title has not already done it. A background tab never
 * transforms, so a title is never mid-distortion when the visitor switches to it.
 */
export function shouldBurst(guards: BurstGuards): boolean {
  return !guards.reducedMotion && !guards.hidden && !guards.alreadyPlayed;
}
