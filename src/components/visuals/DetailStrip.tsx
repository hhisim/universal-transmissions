/**
 * DetailStrip — a frieze of detail crops from the room's own work.
 *
 * The room interiors are long stretches of prose in a centred column: sound arguments, but the
 * page stops being a Living Grimoire page and becomes a document for several screens at a time.
 * This is the counterweight — three detail crops from a work that belongs to the room, cut hard,
 * staggered so it reads as a plate held above the text rather than three thumbnails in a row.
 *
 * It sits INSIDE the reading column at the head of a section, so it introduces the argument that
 * follows instead of interrupting it. Captions are part of the plate, not bolted underneath it.
 * Images are lazy: nothing loads until the strip is near the viewport.
 */

export default function DetailStrip({
  files,
  work,
  accent,
}: {
  files: string[];
  work: string;
  accent: string;
}) {
  const offsets = [0, 18, 6];

  return (
    <figure
      aria-label={`${work} — detail crops`}
      style={{
        margin: "0 0 2.5rem",
        padding: "0.9rem 0 0",
        borderTop: `1px solid color-mix(in oklab, ${accent} 26%, transparent)`,
      }}
    >
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
        {files.slice(0, 3).map((src, i) => (
          <div
            key={src}
            style={{
              flex: i === 1 ? "1.35 1 0" : "1 1 0",
              transform: `translateY(${offsets[i] ?? 0}px)`,
              minWidth: 0,
            }}
          >
            <div
              style={{
                position: "relative",
                aspectRatio: i === 1 ? "16 / 11" : "4 / 3",
                overflow: "hidden",
                border: `1px solid color-mix(in oklab, ${accent} 20%, rgba(255,255,255,0.06))`,
                background: "#05050a",
              }}
            >
              <img
                src={src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `${40 + i * 10}% ${45 + i * 5}%`,
                  transform: "scale(1.06)",
                  opacity: 0.82,
                  filter: "saturate(0.92) contrast(1.04)",
                }}
              />
              {/* the crop is held under the room's colour so it belongs to the page, not to a gallery */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, color-mix(in oklab, ${accent} 8%, transparent), rgba(5,5,10,0.34))`,
                  mixBlendMode: "soft-light",
                }}
              />
            </div>
            <figcaption
              className="font-mono"
              style={{
                marginTop: 6,
                fontSize: 8,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: `color-mix(in oklab, ${accent} 55%, rgba(255,255,255,0.6))`,
                opacity: 0.75,
                lineHeight: 1.5,
              }}
            >
              {work} · detail {String(i + 1).padStart(2, "0")}
            </figcaption>
          </div>
        ))}
      </div>
    </figure>
  );
}
