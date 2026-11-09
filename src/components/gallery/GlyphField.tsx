"use client";

/**
 * GlyphField — the decorative composition behind the Gallery title.
 *
 * The house treatment garbles its headings with combining marks, which is legible as an image
 * and not as a word. Here the marks stop being the title and become architecture: a deterministic
 * field of circles, chords and star polygons drawn behind clean type. The geometry is derived from
 * the same 4/8/12-fold order the artworks are built on, so it belongs to the collection rather
 * than decorating it. aria-hidden, no text, no interaction.
 */

const RINGS = [1, 0.78, 0.56, 0.34, 0.16];

function starPoints(cx: number, cy: number, r: number, points: number, inner: number, rotate = -90) {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? r : r * inner;
    const angle = ((rotate + (i * 180) / points) * Math.PI) / 180;
    out.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`);
  }
  return out.join(" ");
}

export default function GlyphField({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`ut-glyphfield ${className}`}
      viewBox="0 0 1200 620"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="ut-glyph-fade" cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="62%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="ut-glyph-mask">
          <rect width="1200" height="620" fill="url(#ut-glyph-fade)" />
        </mask>
      </defs>

      <g mask="url(#ut-glyph-mask)" fill="none" stroke="currentColor">
        {RINGS.map((r, i) => (
          <circle key={`c${i}`} cx="600" cy="286" r={240 * r} strokeWidth={i === 0 ? 0.7 : 0.45} opacity={0.5 - i * 0.07} />
        ))}

        {/* twelve-fold: the dominant angular order measured in MERKABA and INDRA'S NET */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = ((i * 30 - 90) * Math.PI) / 180;
          return (
            <line
              key={`sp${i}`}
              x1={600 + Math.cos(a) * 62}
              y1={286 + Math.sin(a) * 62}
              x2={600 + Math.cos(a) * 250}
              y2={286 + Math.sin(a) * 250}
              strokeWidth={0.4}
              opacity={0.34}
            />
          );
        })}

        <polygon points={starPoints(600, 286, 240, 12, 0.62)} strokeWidth={0.6} opacity={0.42} />
        <polygon points={starPoints(600, 286, 168, 8, 0.55, -90 + 22.5)} strokeWidth={0.5} opacity={0.34} />
        <polygon points={starPoints(600, 286, 104, 4, 0.5)} strokeWidth={0.5} opacity={0.28} />

        {/* two quiet chords that give the field a horizon instead of perfect radial symmetry */}
        <line x1="120" y1="286" x2="1080" y2="286" strokeWidth={0.35} opacity={0.22} />
        <line x1="600" y1="46" x2="600" y2="560" strokeWidth={0.35} opacity={0.16} />
      </g>
    </svg>
  );
}
