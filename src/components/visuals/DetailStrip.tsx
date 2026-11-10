/**
 * DetailStrip — a frieze cut from one work, composed rather than arranged.
 *
 * The first version put three equal crops in a row with a caption under each. It read as three
 * thumbnails, which is the thing the brief explicitly rules out: pictures bolted onto a page.
 * This is a single plate instead — one dominant crop, a tall middle cut and a small square inset at
 * three different scales, joined by hairlines, with one index line and one caption. The eye enters
 * at the large crop and travels right through the smaller ones, the way it already travels through
 * the prose underneath.
 *
 * Deterministic geometry, no measurement at runtime, lazy images, and the room's accent throughout
 * so the plate belongs to the page it sits on.
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
  const [a, b, c] = files;
  const frame = (src: string, pos: string, extra: React.CSSProperties) => (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        border: `1px solid color-mix(in oklab, ${accent} 22%, rgba(255,255,255,0.05))`,
        background: "#05050a",
        ...extra,
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
          objectPosition: pos,
          transform: "scale(1.04)",
          opacity: 0.86,
          filter: "saturate(0.94) contrast(1.05)",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, color-mix(in oklab, ${accent} 7%, transparent), rgba(5,5,10,0.32))`,
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );

  return (
    <figure aria-label={`${work} — detail crops`} style={{ margin: "0 0 2.25rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            color: `color-mix(in oklab, ${accent} 55%, rgba(255,255,255,0.78))`,
          }}
        >
          Plate — {work}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)" }}
        >
          {files.length.toString().padStart(2, "0")} cuts
        </span>
      </div>

      {/* 12 columns: 7 / 3 / 2, each dropped a little further than the last */}
      <div
        className="grid grid-cols-12 gap-2"
        style={{
          aspectRatio: "16 / 7",
          borderTop: `1px solid color-mix(in oklab, ${accent} 34%, transparent)`,
          paddingTop: 8,
        }}
      >
        <div className="col-span-7">{frame(a, "48% 42%", {})}</div>
        <div className="col-span-3" style={{ marginTop: 18 }}>
          {frame(b, "40% 55%", {})}
        </div>
        <div className="col-span-2" style={{ marginTop: 44 }}>
          {frame(c, "55% 38%", {})}
        </div>
      </div>

      <figcaption
        className="font-mono"
        style={{
          marginTop: 8,
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: `color-mix(in oklab, ${accent} 34%, rgba(255,255,255,0.66))`,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span>{work} — details 01–0{Math.min(3, files.length)}</span>
        <span style={{ opacity: 0.62 }}>Detail crops from the archive series</span>
      </figcaption>
    </figure>
  );
}
