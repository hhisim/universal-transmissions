"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

export interface LightboxItem {
  src: string;
  /** 1-based canonical registry position, independent of display order. */
  registryIndex: number;
}

interface LightboxProps {
  images: string[];
  /**
   * The complete collection the viewer may navigate. When supplied, navigation
   * is not limited to the thumbnails that happen to be revealed: Previous/Next
   * walk the whole archive and the counter describes THAT collection, so a
   * "n / 6" counter can never be shown while browsing 42 originals.
   */
  items?: LightboxItem[];
  /** Canonical 1-based position of the detail being opened. */
  initialRegistryIndex?: number;
  title: string;
  /**
   * Zero-based index to open at. Omitted keeps the existing behaviour of
   * always opening on the first image.
   */
  initialIndex?: number;
  /**
   * When supplied, the overlay calls this instead of managing its own open
   * state. Used by callers that own the open/close lifecycle so focus can be
   * returned to the control that opened it.
   */
  onRequestClose?: () => void;
}

interface ImageThumbProps {
  src: string;
  alt: string;
}

type LoadState = "idle" | "loading" | "ready" | "error";

export default function Lightbox({
  images,
  items,
  initialRegistryIndex,
  title,
  initialIndex,
  onRequestClose,
}: LightboxProps) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex ?? 0);
  const [mounted, setMounted] = useState(false);

  /** Effective navigation set: the full collection when provided. */
  const collection: string[] = items?.length ? items.map((i) => i.src) : images;
  /** Canonical 1-based position for the entry at a given index. */
  const positionOf = useCallback(
    (index: number) => items?.[index]?.registryIndex ?? index + 1,
    [items]
  );
  /** Resolve the entry to open: canonical identity first, then explicit index. */
  const openAt =
    items?.length && initialRegistryIndex !== undefined
      ? Math.max(
          0,
          items.findIndex((i) => i.registryIndex === initialRegistryIndex)
        )
      : (initialIndex ?? 0);

  useEffect(() => { setMounted(true); }, []);

  /* Controlled mode: the parent owns visibility and closing. */
  useEffect(() => {
    if (onRequestClose && openAt >= 0) setCurrentIndex(openAt);
  }, [onRequestClose, openAt]);

  const handleOpen = () => {
    setCurrentIndex(openAt);
    setOpen(true);
  };

  const handleClose = useCallback(() => {
    if (onRequestClose) onRequestClose();
    else setOpen(false);
  }, [onRequestClose]);

  const isControlled = onRequestClose !== undefined;
  const visible = isControlled ? true : open;

  return (
    <>
      {/* Main image wrapper — click opens lightbox */}
      <div
        className="relative aspect-square cursor-zoom-in overflow-hidden glow-border-magenta"
        style={{ borderColor: "rgba(217,70,239,0.15)" }}
        onClick={handleOpen}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        role="button"
        tabIndex={0}
        aria-label={`View ${title} fullscreen`}
      >
        <Image
          src={images[0]}
          alt={title}
          fill
          unoptimized={true}
          className="object-cover chromatic-hover"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        {/* Zoom hint */}
        <div
          className="absolute bottom-4 right-4 font-mono text-[9px] tracking-widest uppercase opacity-0 hover:opacity-100 transition-opacity"
          style={{ color: "var(--ut-magenta)" }}
        >
          Click to enlarge
        </div>
      </div>

      {/* Lightbox portal */}
      {mounted && visible && createPortal(
        <LightboxOverlay
          images={collection}
          currentIndex={currentIndex}
          onClose={handleClose}
          onNavigate={(idx) => setCurrentIndex(idx)}
          title={title}
          positionOf={positionOf}
        />,
        document.body
      )}
    </>
  );
}

export function ImageThumb({ src, alt }: ImageThumbProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <div
        className="w-full h-full cursor-zoom-in overflow-hidden"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={`View ${alt} fullscreen`}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
      </div>
      {mounted && open && createPortal(
        <LightboxOverlay
          images={[src]}
          currentIndex={0}
          onClose={() => setOpen(false)}
          onNavigate={() => {}}
          title={alt}
          positionOf={() => 1}
        />,
        document.body
      )}
    </>
  );
}

/* ── Internal overlay with gallery navigation ── */
function LightboxOverlay({
  images,
  currentIndex,
  onClose,
  onNavigate,
  title,
  positionOf,
}: {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  title: string;
  /** Canonical 1-based registry position for the entry at an index. */
  positionOf: (index: number) => number;
}) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;
  const currentSrc = images[currentIndex];

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [statusMsg, setStatusMsg] = useState("");

  const prefersReducedMotion = usePrefersReducedMotion();

  /**
   * Preload the neighbouring originals at idle. This only runs while the viewer
   * is open, so it cannot turn an unopened detail into a request during page
   * load; it simply keeps Previous/Next responsive across a large collection.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const idle = (cb: () => void) => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: unknown) => number })
        .requestIdleCallback;
      if (ric) ric(cb, { timeout: 1500 });
      else window.setTimeout(cb, 400);
    };
    idle(() => {
      for (const i of [currentIndex - 1, currentIndex + 1]) {
        const src = images[i];
        if (!src) continue;
        const im = new window.Image();
        im.decoding = "async";
        im.src = src;
      }
    });
  }, [images, currentIndex]);

  /* Capture the element that had focus before the overlay opened. */
  useEffect(() => {
    returnFocusRef.current = (document.activeElement as HTMLElement) || null;
    /* Move focus into the dialog so screen readers and Tab stay inside it. */
    closeRef.current?.focus();
  }, []);

  /* Reset zoom/pan and load state whenever the displayed image changes. */
  useEffect(() => {
    dragState.current = null;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setLoadState("loading");
  }, [currentSrc]);

  /* Keyboard navigation */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        onNavigate(currentIndex - 1);
        return;
      }
      if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNavigate(currentIndex + 1);
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => clamp(z * 1.5, 1, 4));
        return;
      }
      if (e.key === "-") {
        e.preventDefault();
        setZoom((z) => clamp(z / 1.5, 1, 4));
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        dragState.current = null;
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, currentIndex, hasPrev, hasNext, onNavigate]);

  /* Focus containment: keep Tab inside the dialog while it is open. */
  useEffect(() => {
    const root = dialogRef.current;
    if (!root) return;
    /* Captured as a const so TypeScript keeps the non-null narrowing inside the
       nested listener, which it does not do across a closure for a `let`. */
    const dialog = root;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        /* Forward wrap. The `!dialog.contains(active)` arm also recovers focus
           if it has ended up outside the dialog (autofill, extensions, a stray
           programmatic focus), which otherwise lets Tab continue into the page
           behind the modal. */
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  /* Return focus to the activating control when the overlay unmounts. */
  useEffect(() => {
    return () => {
      const target = returnFocusRef.current;
      if (target && document.contains(target)) {
        window.requestAnimationFrame(() => target.focus());
      }
    };
  }, []);

  /* Pointer panning, only meaningful while zoomed. */
  const dragState = useRef<{ active: boolean; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d || !d.active) return;
    setPan({
      x: d.originX + (e.clientX - d.startX),
      y: d.originY + (e.clientY - d.startY),
    });
  };
  const onPointerUp = () => {
    if (dragState.current) dragState.current.active = false;
  };

  const zoomIn = () => setZoom((z) => clamp(z * 1.5, 1, 4));
  const zoomOut = () => setZoom((z) => clamp(z / 1.5, 1, 4));
  /**
   * Restores the fitted view. Clears the drag state as well: leaving a stale
   * pan offset behind means the next drag resumes from the old origin and the
   * image appears to jump.
   */
  const resetView = () => {
    dragState.current = null;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrev) onNavigate(currentIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNext) onNavigate(currentIndex + 1);
  };

  const transition = prefersReducedMotion ? "none" : undefined;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={
          images.length > 1
            ? `${title}, detail ${positionOf(currentIndex)} of ${images.length}`
            : title
        }
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(5,5,7,0.95)", touchAction: zoom > 1 ? "none" : undefined }}
      onClick={onClose}
    >
      {/* Counter — always shown when navigating a set, so identity is explicit */}
      {images.length > 1 && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest uppercase pointer-events-none text-center"
          style={{ color: "var(--ut-white-dim)" }}
          data-lightbox-counter="true"
        >
          {/* Canonical registry position, so a non-consecutive seeded set reports
              the true detail number rather than its display slot. */}
          <span data-lightbox-position="true">
            {positionOf(currentIndex)} / {images.length}
          </span>
          <span className="block mt-1 text-[9px] opacity-60" style={{ color: "var(--ut-white-faint)" }}>
            {title}
          </span>
        </div>
      )}

      {/* Close button */}
      <button
        ref={closeRef}
        type="button"
        className="absolute top-6 right-6 z-10 p-2 font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--ut-white-dim)" }}
        onClick={onClose}
        aria-label="Close"
      >
        ✕ Close
      </button>

      {/* Prev button */}
      {images.length > 1 && (
        <button
          type="button"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-3 min-w-[44px] min-h-[44px] font-mono text-lg transition-opacity"
          style={{ color: "var(--ut-white-dim)" }}
          onClick={handlePrev}
          aria-label="Previous image"
          disabled={!hasPrev}
        >
          ‹
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          type="button"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-3 min-w-[44px] min-h-[44px] font-mono text-lg transition-opacity"
          style={{ color: "var(--ut-white-dim)" }}
          onClick={handleNext}
          aria-label="Next image"
          disabled={!hasNext}
        >
          ›
        </button>
      )}

      {/* Image */}
      <div
        className="relative w-full h-full flex items-center justify-center p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {loadState === "loading" && (
          <div
            className="absolute font-mono text-[10px] tracking-[0.25em] uppercase"
            style={{ color: "var(--ut-white-faint)" }}
            role="status"
            data-lightbox-loading="true"
          >
            Loading image…
          </div>
        )}

        {loadState === "error" ? (
          <div className="text-center px-4" data-lightbox-error="true">
            <p
              className="font-mono text-[10px] tracking-[0.25em] uppercase mb-3"
              style={{ color: "var(--ut-magenta)" }}
            >
              Image unavailable
            </p>
            <p
              className="font-mono text-[9px] mb-4 break-all"
              style={{ color: "var(--ut-white-faint)" }}
            >
              {currentSrc}
            </p>
            <button type="button" className="btn-secondary" onClick={() => setLoadState("loading")}>
              Retry
            </button>
          </div>
        ) : (
          <div
            ref={imageWrapRef}
            className="relative max-w-full max-h-full"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: transition === "none" ? "none" : "transform 160ms ease-out",
              cursor: zoom > 1 ? (dragState.current?.active ? "grabbing" : "grab") : "zoom-in",
              willChange: zoom > 1 ? "transform" : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={currentSrc}
              src={currentSrc}
              alt={`${title} ${currentIndex + 1}`}
              onLoad={() => setLoadState("ready")}
              onError={() => setLoadState("error")}
              className="max-w-full max-h-full object-contain"
              style={{
                maxWidth: zoom > 1 ? "none" : "90vw",
                maxHeight: zoom > 1 ? "none" : "90vh",
                boxShadow: "0 0 80px rgba(217,70,239,0.15), 0 0 200px rgba(147,51,234,0.08)",
                display: loadState === "ready" ? "block" : "none",
              }}
            />
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div
        className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="px-3 py-2 font-mono text-xs min-w-[44px] min-h-[44px]"
          style={{ color: "var(--ut-white-dim)", border: "1px solid rgba(217,70,239,0.2)" }}
          onClick={zoomOut}
          aria-label="Zoom out"
          disabled={zoom <= 1}
        >
          −
        </button>
        <button
          type="button"
          className="px-3 py-2 font-mono text-[10px] tracking-widest min-h-[44px]"
          style={{ color: "var(--ut-white-faint)", border: "1px solid rgba(217,70,239,0.2)" }}
          onClick={resetView}
          aria-label="Reset zoom"
          data-lightbox-zoom="true"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="px-3 py-2 font-mono text-xs min-w-[44px] min-h-[44px]"
          style={{ color: "var(--ut-white-dim)", border: "1px solid rgba(217,70,239,0.2)" }}
          onClick={zoomIn}
          aria-label="Zoom in"
          disabled={zoom >= 4}
        >
          +
        </button>
      </div>

      {/* Live region for zoom/load announcements */}
      <div className="sr-only" role="status" aria-live="polite">{statusMsg}</div>

      {/* Chromatic fringe effect on the overlay edges */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: "inset 0 0 120px rgba(217,70,239,0.06)",
        }}
      />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setReduced(mq?.matches ?? false);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq?.addEventListener?.("change", listener);
    return () => mq?.removeEventListener?.("change", listener);
  }, []);
  return reduced;
}
