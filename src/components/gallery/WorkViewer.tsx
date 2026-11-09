"use client";

/**
 * WorkViewer — Gallery M1.2.
 *
 * The selection state of the collection. It is deliberately not a 3D room: the
 * work is the only lit thing on the screen, at the largest size the viewport
 * allows, with its own words beside it. Escape closes, arrows step, and the
 * address still points at the work's real page so the visitor can leave the
 * viewer for the full record.
 *
 * Focus is sent to the close control on open and returned to the plate that
 * opened it on close, so keyboard users are never dropped at the top of the
 * document.
 */

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Artwork } from "@/data/artworks";
import { ARTWORK_IMAGE_META } from "@/data/artwork-image-meta";

type Props = {
  works: Artwork[];
  index: number;
  hrefFor: (slug: string) => string;
  onClose: () => void;
  onStep: (next: number) => void;
};

export default function WorkViewer({ works, index, hrefFor, onClose, onStep }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const work = works[index];

  const step = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= works.length) return;
      onStep(next);
    },
    [index, works.length, onStep]
  );

  useEffect(() => {
    closeRef.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, step]);

  if (!work) return null;

  const meta = ARTWORK_IMAGE_META[work.slug];
  const width = meta?.width ?? 1200;
  const height = meta?.height ?? 900;

  return (
    <div
      className="ut-viewer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ut-viewer-title"
      data-gallery-viewer="true"
      data-viewer-slug={work.slug}
    >
      <div className="ut-viewer-stage">
        <Image
          key={work.slug}
          src={work.images[0]}
          alt={work.title}
          width={width}
          height={height}
          sizes="(max-width: 1100px) 92vw, 70vw"
          priority
        />

        <button
          type="button"
          className="ut-viewer-nav"
          data-dir="prev"
          onClick={() => step(-1)}
          disabled={index === 0}
          aria-label="Previous work"
        >
          ←
        </button>
        <button
          type="button"
          className="ut-viewer-nav"
          data-dir="next"
          onClick={() => step(1)}
          disabled={index === works.length - 1}
          aria-label="Next work"
        >
          →
        </button>
      </div>

      <button
        type="button"
        ref={closeRef}
        className="ut-viewer-close"
        onClick={onClose}
        aria-label="Close preview"
        data-viewer-close="true"
      >
        Close ✕
      </button>

      <aside className="ut-viewer-aside">
        <p className="ut-viewer-kicker">
          {String(index + 1).padStart(2, "0")} / {String(works.length).padStart(2, "0")}
        </p>
        <h2 className="ut-viewer-title" id="ut-viewer-title">
          {work.title}
        </h2>
        <p className="ut-viewer-desc">{work.description}</p>

        <dl className="ut-viewer-facts">
          <div>
            <dt>Year</dt>
            <dd>{work.year}</dd>
          </div>
          <div>
            <dt>Medium</dt>
            <dd>{work.medium}</dd>
          </div>
          <div>
            <dt>Print</dt>
            <dd>{work.prints === false ? "Not available" : "Available"}</dd>
          </div>
        </dl>

        <div className="ut-viewer-actions">
          <Link className="ut-viewer-open" href={hrefFor(work.slug)} data-viewer-open={work.slug}>
            Open full work →
          </Link>
          <button type="button" className="ut-viewer-step" onClick={() => step(-1)} disabled={index === 0}>
            ← Prev
          </button>
          <button
            type="button"
            className="ut-viewer-step"
            onClick={() => step(1)}
            disabled={index === works.length - 1}
          >
            Next →
          </button>
        </div>
      </aside>
    </div>
  );
}
