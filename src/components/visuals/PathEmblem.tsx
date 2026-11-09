/**
 * PathEmblem — one authored mark per guided path.
 *
 * The paths index was three text cards in a row: no way to tell the routes apart at a glance and
 * a lot of empty black rectangle around short copy. Each path now carries a mark drawn from its
 * own subject and a detail crop of a work that already belongs to that subject:
 *
 *   sound-into-form            nodal rings over Hyperdimensional Harmonics
 *   language-into-glyph        a glyph constellation over Linguistic Mystic
 *   symbol-into-correspondence an orbital correspondence map over Tetragrammaton
 *
 * The crop is composited INSIDE the mark's frame rather than placed beside the text, so the figure
 * is part of the card's composition. Deterministic geometry only — no Math.random at render, so
 * server and client agree and nothing hydrates differently.
 */

export type PathEmblemSlug = "sound-into-form" | "language-into-glyph" | "symbol-into-correspondence";

const MARKS: Record<
  PathEmblemSlug,
  { accent: string; artwork: string; work: string; label: string }
> = {
  "sound-into-form": {
    accent: "#00e5ff",
    artwork: "/artworks/hyperdimensional-harmonics/main.jpg",
    work: "Hyperdimensional Harmonics",
    label: "nodal field",
  },
  "language-into-glyph": {
    accent: "#a855f7",
    artwork: "/artworks/linguistic-mystic/main.jpg",
    work: "Linguistic Mystic",
    label: "glyph constellation",
  },
  "symbol-into-correspondence": {
    accent: "#d4a847",
    artwork: "/artworks/tetragrammaton/main.jpg",
    work: "Tetragrammaton",
    label: "correspondence map",
  },
};

function NodalField({ accent }: { accent: string }) {
  return (
    <g fill="none" stroke={accent} strokeWidth="0.7">
      {[0.22, 0.4, 0.58, 0.76, 0.94].map((r, i) => (
        <ellipse key={r} cx="100" cy="100" rx={96 * r} ry={96 * r} opacity={0.5 - i * 0.06} strokeDasharray={i % 2 ? "2 4" : undefined} />
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * 12}
            y1={100 + Math.sin(a) * 12}
            x2={100 + Math.cos(a) * 92}
            y2={100 + Math.sin(a) * 92}
            opacity="0.18"
          />
        );
      })}
    </g>
  );
}

function GlyphConstellation({ accent }: { accent: string }) {
  // fixed, authored positions — a constellation, not a scatter
  const pts = [
    [42, 44], [78, 30], [118, 52], [152, 38],
    [60, 88], [104, 82], [146, 96], [38, 132],
    [88, 124], [132, 140], [166, 118], [70, 166], [124, 172],
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [4, 7], [7, 8], [8, 9], [9, 10], [8, 11], [11, 12], [12, 9]];
  return (
    <g stroke={accent} fill="none">
      {edges.map(([a, b], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} strokeWidth="0.5" opacity="0.28" />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 2.1 : 1.2} fill={accent} opacity={i % 3 === 0 ? 0.85 : 0.5} />
      ))}
    </g>
  );
}

function CorrespondenceMap({ accent }: { accent: string }) {
  return (
    <g fill="none" stroke={accent}>
      <circle cx="100" cy="100" r="86" strokeWidth="0.6" opacity="0.3" />
      <circle cx="100" cy="100" r="58" strokeWidth="0.6" opacity="0.26" strokeDasharray="3 5" />
      <circle cx="100" cy="100" r="30" strokeWidth="0.6" opacity="0.32" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const b = a + Math.PI / 2;
        return (
          <g key={i}>
            <line
              x1={100 + Math.cos(a) * 30}
              y1={100 + Math.sin(a) * 30}
              x2={100 + Math.cos(b) * 86}
              y2={100 + Math.sin(b) * 86}
              strokeWidth="0.45"
              opacity="0.22"
            />
            <circle cx={100 + Math.cos(a) * 86} cy={100 + Math.sin(a) * 86} r="1.8" fill={accent} opacity="0.8" />
          </g>
        );
      })}
      <circle cx="100" cy="100" r="3" fill={accent} opacity="0.9" />
    </g>
  );
}

export default function PathEmblem({ slug }: { slug: PathEmblemSlug }) {
  const mark = MARKS[slug];
  if (!mark) return null;

  return (
    <figure
      className="ut-path-emblem"
      style={{
        position: "relative",
        margin: 0,
        aspectRatio: "1",
        width: "100%",
        maxWidth: 260,
        overflow: "hidden",
        border: `1px solid color-mix(in oklab, ${mark.accent} 34%, transparent)`,
        background: "#05050a",
        isolation: "isolate",
      }}
    >
      {/* the work itself, cropped hard and held back so it reads as material, not as a picture */}
      <img
        src={mark.artwork}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "50% 42%",
          transform: "scale(1.55)",
          opacity: 0.42,
          filter: "saturate(0.85) contrast(1.05)",
          mixBlendMode: "screen",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, color-mix(in oklab, ${mark.accent} 16%, transparent) 0%, transparent 68%), linear-gradient(180deg, rgba(5,5,10,0.35), rgba(5,5,10,0.82))`,
        }}
      />
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        focusable="false"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {slug === "sound-into-form" && <NodalField accent={mark.accent} />}
        {slug === "language-into-glyph" && <GlyphConstellation accent={mark.accent} />}
        {slug === "symbol-into-correspondence" && <CorrespondenceMap accent={mark.accent} />}
      </svg>
      <figcaption
        className="font-mono"
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: 8,
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: `color-mix(in oklab, ${mark.accent} 40%, white)`,
          opacity: 0.95,
          lineHeight: 1.55,
          textShadow: "0 1px 6px rgba(0,0,0,0.95)",
        }}
      >
        {mark.label}
        <br />
        <span style={{ opacity: 0.78 }}>{mark.work}</span>
      </figcaption>
    </figure>
  );
}
