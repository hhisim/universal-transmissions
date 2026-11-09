"use client";

/**
 * WorkViewer — Gallery M1.2, refined.
 *
 * The selection state of the collection. The work is already the richest object on screen, so
 * the viewer gives it the whole field, answers it in its own measured colour, and puts the record
 * beside it in reading order — where you are in the collection, what the work is called, when and
 * how it was made, what it is about, and only then the way to the full page.
 *
 * Each control names the work it goes to, so stepping is a choice rather than a guess. Escape
 * closes, arrows step, and the caller returns focus to the plate that opened it.
 */

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Artwork } from "@/data/artworks";
import { ARTWORK_IMAGE_META } from "@/data/artwork-image-meta";
import { spectrumFor } from "@/data/artwork-spectrum";

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
  const previousWork = index > 0 ? works[index - 1] : null;
  const nextWork = index < works.length - 1 ? works[index + 1] : null;

  const step = useCallback(
    (delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= works.length) return;
      onStep(target);
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, step]);

  if (!work) return null;

  const meta = ARTWORK_IMAGE_META[work.slug];
  const width = meta?.width ?? 1200;
  const height = meta?.height ?? 900;
  const spectrum = spectrumFor(work.slug);

  return (
    <div
      className="ut-viewer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ut-viewer-title"
      data-gallery-viewer="true"
      data-viewer-slug={work.slug}
      style={{ ["--work-glow" as string]: spectrum.glow, ["--work-accent" as string]: spectrum.accent }}
    >
      <div className="ut-viewer-stage">
        <span className="ut-viewer-field" aria-hidden="true" />

        <figure className="ut-viewer-plate" key={work.slug}>
          <Image
            src={work.images[0]}
            alt={work.title}
            width={width}
            height={height}
            sizes="(max-width: 1100px) 92vw, 68vw"
            priority
          />
        </figure>

        <button
          type="button"
          className="ut-viewer-nav"
          data-dir="prev"
          onClick={() => step(-1)}
          disabled={!previousWork}
          aria-label={previousWork ? `Previous work: ${previousWork.title}` : "No previous work"}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          type="button"
          className="ut-viewer-nav"
          data-dir="next"
          onClick={() => step(1)}
          disabled={!nextWork}
          aria-label={nextWork ? `Next work: ${nextWork.title}` : "No next work"}
        >
          <span aria-hidden="true">→</span>
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
        Close <span aria-hidden="true">✕</span>
      </button>

      <aside className="ut-viewer-aside">
        <div className="ut-viewer-position">
          <span className="ut-viewer-count">
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span aria-hidden="true"> / </span>
            {String(works.length).padStart(2, "0")}
          </span>
          <span className="ut-viewer-progress" aria-hidden="true">
            <span style={{ transform: `scaleX(${(index + 1) / works.length})` }} />
          </span>
        </div>

        <h2 className="ut-viewer-title" id="ut-viewer-title">
          {work.title}
        </h2>

        <p className="ut-viewer-meta">
          <span>{work.year}</span>
          <span aria-hidden="true">·</span>
          <span>{work.medium}</span>
        </p>

        <p className="ut-viewer-desc">{work.description}</p>

        <div className="ut-viewer-actions">
          <Link className="ut-viewer-open" href={hrefFor(work.slug)} data-viewer-open={work.slug}>
            Open full work <span aria-hidden="true">→</span>
          </Link>
        </div>

        <nav className="ut-viewer-steps" aria-label="Browse the collection">
          <button type="button" className="ut-viewer-step" onClick={() => step(-1)} disabled={!previousWork}>
            <span className="ut-viewer-step-dir" aria-hidden="true">←</span>
            <span className="ut-viewer-step-label">{previousWork ? previousWork.title : "Start of collection"}</span>
          </button>
          <button type="button" className="ut-viewer-step" onClick={() => step(1)} disabled={!nextWork}>
            <span className="ut-viewer-step-label">{nextWork ? nextWork.title : "End of collection"}</span>
            <span className="ut-viewer-step-dir" aria-hidden="true">→</span>
          </button>
        </nav>
      </aside>
    </div>
  );
}
