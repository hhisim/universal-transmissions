"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { LightboxOverlay } from "@/components/gallery/Lightbox";
import {
  CODEX_PREVIEWS,
  previewAspect,
  previewCounter,
  zoomCeilingFor,
} from "@/lib/codex-spreads";

/**
 * CodexSpreads — the public preview imagery, shown whole, openable for inspection.
 *
 * The released strip cropped every spread into a 3:4 box (`object-cover`), so the visitor never saw
 * a page as it is. Each thumbnail now occupies its own ratio and contains the whole image; opening
 * one hands the shipped Lightbox overlay the whole published set, so previous/next walk the previews,
 * Escape closes, zoom stops where the source resolution stops, and closing returns the visitor to
 * the same place on the page with focus back on the control they used.
 *
 * Loading discipline: the thumbnails request resized variants through next/image, and the full asset
 * is fetched only when a preview is opened. The viewer preloads neighbours at idle while it is open —
 * never while the page is closed.
 */
export default function CodexSpreads() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(0);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const openPreview = useCallback((index: number) => {
    scrollRef.current = typeof window !== "undefined" ? window.scrollY : 0;
    setCurrentIndex(index);
    setOpenIndex(index);
  }, []);

  const closeViewer = useCallback(() => {
    const returnIndex = currentIndex;
    const y = scrollRef.current;
    setOpenIndex(null);
    /* Restore the place, then the control: the overlay restores focus to whatever opened it, and
       this makes the scroll restoration explicit rather than incidental. */
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: "auto" });
        triggerRefs.current[returnIndex]?.focus({ preventScroll: true });
      });
    }
  }, [currentIndex]);

  const images = CODEX_PREVIEWS.map((p) => p.src);
  const opened = openIndex === null ? null : CODEX_PREVIEWS[openIndex] ?? null;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {CODEX_PREVIEWS.map((preview, index) => (
          <figure key={preview.id} className="m-0">
            <button
              type="button"
              ref={(el) => {
                triggerRefs.current[index] = el;
              }}
              onClick={() => openPreview(index)}
              aria-label={`Open ${preview.label} (${preview.width} × ${preview.height}) for inspection`}
              className="group block w-full overflow-hidden border transition-colors focus-visible:ring-2"
              style={{ borderColor: "rgba(201,162,39,0.22)", background: "#050508" }}
            >
              <div className="relative w-full" style={{ aspectRatio: String(previewAspect(preview)) }}>
                <Image
                  src={preview.src}
                  alt={`Universal Transmissions Codex — ${preview.label}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  /* Resized variants are generated from the shipped asset; the original is only
                     fetched by the viewer. */
                />
              </div>
            </button>
            <figcaption
              className="mt-2 flex items-center justify-between font-mono text-[8px] tracking-[0.2em] uppercase"
              style={{ color: "var(--ut-white-faint)" }}
            >
              <span>{preview.label}</span>
              <span style={{ opacity: 0.6 }}>
                {preview.width}×{preview.height}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {opened && typeof document !== "undefined" &&
        createPortal(
          <LightboxOverlay
            images={images}
            currentIndex={currentIndex}
            onClose={closeViewer}
            onNavigate={setCurrentIndex}
            title="Universal Transmissions Codex"
            positionOf={(index) => index + 1}
            maxZoom={zoomCeilingFor(opened)}
          />,
          document.body
        )}
    </div>
  );
}

/** Re-exported for the page's caption, so the count on screen comes from the published set. */
export const CODEX_PREVIEW_COUNT = CODEX_PREVIEWS.length;
export { previewCounter };
