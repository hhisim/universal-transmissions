"use client";

/**
 * Progressive detail explorer — Batch 3 pilot.
 *
 * Invariants this component is built to hold:
 *  - An unrevealed detail is NOT MOUNTED, so it cannot begin an image request.
 *    Hiding an already-mounted gallery with CSS would not satisfy this.
 *  - Revealed batches are never unmounted, so scroll position and previously
 *    revealed content survive every further activation.
 *  - Revealed order always equals the registry order, and every original detail
 *    is reachable exactly once.
 *  - Thumbnails go through next/image so the browser negotiates a resized
 *    variant; the full-resolution original is requested only on inspection.
 *  - The first batch is part of the server-rendered HTML.
 *
 * Inspection reuses the site's existing <Lightbox> overlay.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Lightbox, { type LightboxItem } from "@/components/gallery/Lightbox";

/** Details revealed per activation. */
const BATCH_SIZE = 6;

export interface ProgressiveDetail {
  /** Registry path exactly as declared in src/data/artworks.ts. */
  src: string;
  /** 1-based position in the artwork's complete detail list. */
  registryIndex: number;
}

interface ProgressiveDetailExplorerProps {
  details: ProgressiveDetail[];
  /**
   * Registry indices (1-based) revealed on first paint. The pilot supplies a
   * curated, visually representative set here rather than a blind prefix.
   */
  initialRegistryIndices: number[];
  title: string;
  label?: string;
}

export default function ProgressiveDetailExplorer({
  details,
  initialRegistryIndices,
  title,
  label = "Detail views",
}: ProgressiveDetailExplorerProps) {
  const total = details.length;

  /**
   * The revealed set is an explicit list, not a prefix: the pilot seeds a
   * curated selection. It is stored as a sorted set of registry positions and
   * always rendered in registry order.
   */
  const [revealed, setRevealed] = useState<number[]>(() => {
    const seed = new Set(initialRegistryIndices);
    return details.filter((d) => seed.has(d.registryIndex)).map((d) => d.registryIndex);
  });

  const prefersReducedMotion = usePrefersReducedMotion();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const revealedSet = useMemo(() => new Set(revealed), [revealed]);

  /**
   * Display order follows the REVEAL sequence, not registry order.
   *
   * Deriving this by filtering `details` would silently re-impose registry
   * order and move the seeded tiles (35, 37, 38) when a later batch is added,
   * even though the scroll position never changed. Each entry is looked up by
   * its canonical registry index; `registryIndex` is never derived from the
   * display slot, so identity and order stay independent.
   */
  const byRegistryIndex = useMemo(() => {
    const map = new Map<number, ProgressiveDetail>();
    for (const d of details) map.set(d.registryIndex, d);
    return map;
  }, [details]);

  const visible = useMemo(
    () =>
      revealed
        .map((registryIndex) => byRegistryIndex.get(registryIndex))
        .filter((d): d is ProgressiveDetail => d !== undefined),
    [revealed, byRegistryIndex]
  );

  /** Next un-revealed details, in registry order. */
  const pending = useMemo(
    () => details.filter((d) => !revealedSet.has(d.registryIndex)),
    [details, revealedSet]
  );

  /**
   * Appends the next un-revealed details in registry order.
   *
   * Order is deliberately NOT re-sorted on reveal. The seeded batch holds
   * non-consecutive registry positions (1,2,3,35,37,38); re-sorting would move
   * those already-visible thumbnails out from under the visitor when the next
   * batch arrives, even though the page scroll position never changes. Existing
   * tiles therefore keep their slot, and new ones are added after them.
   *
   * `registryIndex` remains the canonical identity in every case; it is never
   * derived from the display position.
   */
  const handleReveal = useCallback(() => {
    setRevealed((prev) => {
      const seen = new Set(prev);
      const additions: number[] = [];
      for (const d of details) {
        if (additions.length >= BATCH_SIZE) break;
        if (seen.has(d.registryIndex)) continue;
        additions.push(d.registryIndex);
      }
      return [...prev, ...additions];
    });
  }, [details]);

  const openDetail = useCallback((index: number) => {
    returnFocusRef.current = (document.activeElement as HTMLElement) || null;
    setLightboxIndex(index);
  }, []);

  const closeDetail = useCallback(() => {
    const trigger = lightboxIndex !== null ? triggerRefs.current[lightboxIndex] : null;
    setLightboxIndex(null);
    // Wait for the overlay to unmount before restoring focus to the page.
    window.requestAnimationFrame(() => {
      if (trigger && document.contains(trigger)) trigger.focus();
      else returnFocusRef.current?.focus?.();
    });
  }, [lightboxIndex]);

  // Escape closes even when focus has drifted off the overlay's own controls.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDetail();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxIndex, closeDetail]);

  /**
   * The viewer navigates the COMPLETE collection. Passing the whole registry
   * here is what lets Previous/Next reach all 42 originals while only six
   * thumbnails are mounted: the overlay requests the original for whichever
   * detail is being viewed, so mounting it is unnecessary.
   *
   * This does not cause eager fetching — the overlay renders a single <img> for
   * the current entry only, and neighbours are preloaded at idle.
   */
  const navigationItems: LightboxItem[] = useMemo(
    () => details.map((d) => ({ src: d.src, registryIndex: d.registryIndex })),
    [details]
  );
  const revealedSources = visible.map((d) => d.src);
  const remaining = pending.length;

  return (
    <section aria-label={label} data-gallery-progressive="true">
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4 font-mono text-[10px] tracking-[0.25em] uppercase"
        style={{ color: "var(--ut-white-faint)" }}
      >
        <span>Detail Views</span>
        <span style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>—</span>
        <span data-detail-count="true" aria-live="polite">
          {revealed.length} of {total} revealed
        </span>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-detail-grid="true">
        {visible.map((d, i) => {
          const position = d.registryIndex;
          const alt = `${title} detail ${position} of ${total}`;
          return (
            <li key={d.src}>
              <button
                type="button"
                ref={(el) => {
                  triggerRefs.current[i] = el;
                }}
                onClick={() => openDetail(i)}
                aria-label={`Inspect detail ${position} of ${total} of ${title}`}
                data-detail-position={position}
                className="group relative block w-full aspect-square overflow-hidden border chromatic-hover"
                style={{ borderColor: "rgba(217,70,239,0.12)", borderRadius: "2px" }}
              >
                <Image
                  src={d.src}
                  alt={alt}
                  fill
                  /* Responsive delivery: the browser selects a width from `sizes`
                     instead of downloading the ~400KB original for a small tile. */
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  quality={62}
                  className={
                    "ut-detail-img object-cover group-hover:scale-105" +
                    /* Honour prefers-reduced-motion: the hover scale is a
                       transform transition, so it must be suppressed too. */
                    (prefersReducedMotion
                      ? ""
                      : " transition-transform duration-500 motion-safe:transition-transform")
                  }
                />
                <span
                  className="absolute bottom-1 right-1 font-mono text-[9px] px-1.5 py-0.5 pointer-events-none"
                  style={{ background: "rgba(5,5,7,0.72)", color: "var(--ut-white-dim)" }}
                >
                  {position}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {remaining > 0 ? (
        <div className="mt-6 flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={handleReveal}
            data-explore-more="true"
            className="btn-secondary"
          >
            Explore more details
          </button>
          <p
            className="font-mono text-[9px] tracking-[0.2em] uppercase"
            style={{ color: "var(--ut-white-faint)" }}
            data-reveal-copy="true"
          >
            Showing {revealed.length} of {total} · Reveal{" "}
            {Math.min(BATCH_SIZE, remaining)} more
            {remaining > BATCH_SIZE ? ` (${remaining} unrevealed)` : ""}
          </p>
        </div>
      ) : (
        <p
          className="mt-6 font-mono text-[9px] tracking-[0.2em] uppercase"
          style={{ color: "var(--ut-white-faint)" }}
          data-detail-complete="true"
        >
          All {total} details revealed
        </p>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={revealedSources}
          items={navigationItems}
          initialRegistryIndex={visible[lightboxIndex]?.registryIndex}
          title={`${title} — details`}
          initialIndex={lightboxIndex}
          onRequestClose={closeDetail}
        />
      )}
    </section>
  );
}

/** Tracks prefers-reduced-motion so transform transitions can be suppressed. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", listener);
    return () => mq.removeEventListener?.("change", listener);
  }, []);
  return reduced;
}
