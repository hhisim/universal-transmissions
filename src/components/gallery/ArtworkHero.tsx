"use client";

/**
 * ArtworkHero — Batch 18. The artwork leads, and it arrives promptly.
 *
 * It extends the approach the Vitruvian Spirit pilot already proved for DETAIL tiles to
 * the main artwork, which the pilot left on the old path.
 *
 * Invariants this component is built to hold:
 *
 *  - The first thing a visitor receives is a RESIZED DERIVATIVE, served by next/image,
 *    not the master. The released hero passed `unoptimized` and `priority`, so a visitor
 *    downloaded the whole original (466KB-1.25MB) before seeing anything.
 *  - The master is requested only when the visitor asks to inspect. That is the whole
 *    point: fetching a full-resolution original and calling it "progressive" while a
 *    spinner covers it is not progressive loading, it is a large download with a delay
 *    in front of it. Here the preview IS the payload, and the master is opt-in.
 *  - The artwork is never cropped. The released hero rendered every work into a fixed
 *    square with `object-cover`, which cuts the sides off a landscape piece (vitruvian
 *    spirit is 1.55:1) and the top and bottom off a portrait one (cosmic egg is 0.75:1).
 *    The box now takes the master's own aspect ratio, taken from the master files.
 *  - Inspection and zoom reuse the released <Lightbox> overlay rather than a second
 *    implementation, so there is one set of keyboard and zoom behaviours to trust.
 *  - A failed preview says so plainly and offers a retry; it does not leave a broken
 *    image or an endless "loading" claim on screen.
 */

import { useState } from "react";
import Image from "next/image";
import Lightbox from "@/components/gallery/Lightbox";
import { ARTWORK_IMAGE_META } from "@/data/artwork-image-meta";

interface ArtworkHeroProps {
  /** Registry path of the master, exactly as declared in src/data/artworks.ts. */
  src: string;
  title: string;
  slug: string;
}

export default function ArtworkHero({ src, title, slug }: ArtworkHeroProps) {
  const [inspecting, setInspecting] = useState(false);
  const [failed, setFailed] = useState(false);
  const meta = ARTWORK_IMAGE_META[slug];
  const aspect = meta ? `${meta.width} / ${meta.height}` : "1 / 1";

  return (
    <section data-artwork-hero="true" data-hero-state={inspecting ? "full" : "preview"}>
      <div
        className="relative w-full overflow-hidden glow-border-magenta"
        style={{ aspectRatio: aspect, borderColor: "rgba(217,70,239,0.15)" }}
        data-hero-frame="true"
      >
        {failed ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
            data-hero-error="true"
          >
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: "var(--ut-magenta)" }}>
              Preview unavailable
            </p>
            <p className="font-mono text-[9px] break-all" style={{ color: "var(--ut-white-faint)" }}>
              {src}
            </p>
            <button type="button" className="btn-secondary" onClick={() => setFailed(false)}>
              Retry
            </button>
          </div>
        ) : (
          <Image
            src={src}
            alt={title}
            fill
            priority
            /* No `unoptimized`: this is the change. The browser gets a resized variant
               in avif/webp chosen from `sizes`, not the 1.55:1 master. */
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 70vw"
            quality={72}
            onError={() => setFailed(true)}
            data-hero-preview="true"
            className="object-contain"
          />
        )}
      </div>

      {/* Inspection controls — the only thing that requests the master. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => setInspecting(true)}
          data-hero-inspect="true"
          className="btn-secondary"
          aria-label={`Inspect ${title} at full resolution`}
        >
          Inspect at full resolution
        </button>
        <p
          className="font-mono text-[9px] tracking-[0.2em] uppercase"
          style={{ color: "var(--ut-white-faint)" }}
          data-hero-caption="true"
        >
          {/* These dimensions are the ORIGINAL's, so the caption says so. The stored file is
              this size; what is served here is a smaller resized variant, and the full-size
              file is fetched only on inspection. */}
          {meta
            ? `Original ${meta.width}×${meta.height} · a resized preview is served here · full-size file loads on inspection`
            : "A resized preview is served here · full-size file loads on inspection"}
        </p>
      </div>

      {inspecting && (
        <Lightbox
          images={[src]}
          title={title}
          onRequestClose={() => setInspecting(false)}
        />
      )}
    </section>
  );
}
