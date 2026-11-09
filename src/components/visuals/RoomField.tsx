/**
 * RoomField — the room's subject at the scale of the room's own opening.
 *
 * The four research rooms opened as a Zalgo title, an epigraph and a paragraph of body copy in a
 * wide dark section: correct, but the subject itself was nowhere on the page until the diagrams
 * further down. Each room now opens with its own material — a masked crop of a work that belongs to
 * the room, under the room's subject geometry:
 *
 *   cymatics    nodal rings, dashed half-orders and wave traces      Hyperdimensional Harmonics
 *   symbolism   orbital rings with correspondence chords             Tetragrammaton
 *   linguistics glyph rows resolving into a constellation            Linguistic Mystic
 *   geometry    square, circle, triads and construction axes         Vitruvian Spirit
 *
 * It sits to the right of the opening, masked to nothing at its edges, behind the copy and inert to
 * the pointer. Desktop only: on narrow screens the section is a single column and there is no free
 * space for it to occupy without pushing the reading.
 */

import SubjectField, { type SubjectVariant } from "./SubjectField";

const WORKS: Record<SubjectVariant, { artwork: string; work: string }> = {
  cymatics: { artwork: "/artworks/hyperdimensional-harmonics/main.jpg", work: "Hyperdimensional Harmonics" },
  symbolism: { artwork: "/artworks/tetragrammaton/main.jpg", work: "Tetragrammaton" },
  linguistics: { artwork: "/artworks/linguistic-mystic/main.jpg", work: "Linguistic Mystic" },
  geometry: { artwork: "/artworks/vitruvian-spirit/main.jpg", work: "Vitruvian Spirit" },
};

export default function RoomField({
  variant,
  accent,
}: {
  variant: SubjectVariant;
  accent: string;
}) {
  const work = WORKS[variant];

  return (
    <div
      aria-hidden="true"
      className="hidden md:block"
      style={{
        position: "absolute",
        right: "-8%",
        top: "-14%",
        width: "58%",
        height: "128%",
        pointerEvents: "none",
        overflow: "hidden",
        maskImage:
          "radial-gradient(ellipse 78% 72% at 58% 44%, black 0%, rgba(0,0,0,0.55) 52%, transparent 84%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 78% 72% at 58% 44%, black 0%, rgba(0,0,0,0.55) 52%, transparent 84%)",
      }}
    >
      {/* the work, cropped hard: material for the room rather than a picture in it */}
      <img
        src={work.artwork}
        alt=""
        loading="lazy"
        decoding="async"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "52% 40%",
          transform: "scale(1.18)",
          opacity: 0.34,
          filter: "saturate(0.9) contrast(1.06)",
          mixBlendMode: "screen",
        }}
      />

      {/* the subject geometry, over the work */}
      <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
        <SubjectField variant={variant} accent={accent} opacity={0.62} />
      </div>

      {/* a single hairline tying the field to the room's copy edge */}
      <div
        style={{
          position: "absolute",
          left: "18%",
          top: "12%",
          bottom: "12%",
          width: 1,
          background: `linear-gradient(180deg, transparent, color-mix(in oklab, ${accent} 40%, transparent), transparent)`,
          opacity: 0.5,
        }}
      />
    </div>
  );
}
