"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

interface LightboxProps {
  images: string[];
  title: string;
}

interface ImageThumbProps {
  src: string;
  alt: string;
}


export default function Lightbox({ images, title }: LightboxProps) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Reset index when opening
  const handleOpen = () => {
    setCurrentIndex(0);
    setOpen(true);
  };

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
      {mounted && open && createPortal(
        <LightboxOverlay
          images={images}
          currentIndex={currentIndex}
          onClose={() => setOpen(false)}
          onNavigate={(idx) => setCurrentIndex(idx)}
          title={title}
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
}: {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  title: string;
}) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;
  const currentSrc = images[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, currentIndex, hasPrev, hasNext, onNavigate]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrev) onNavigate(currentIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNext) onNavigate(currentIndex + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(5,5,7,0.95)" }}
      onClick={onClose}
    >
      {/* Counter */}
      {images.length > 1 && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--ut-white-dim)" }}
        >
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Close button */}
      <button
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
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 font-mono text-lg transition-opacity"
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
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 font-mono text-lg transition-opacity"
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
        className="relative w-full h-full flex items-center justify-center p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={currentSrc}
          src={currentSrc}
          alt={`${title} ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          style={{
            maxWidth: "90vw",
            maxHeight: "90vh",
            boxShadow: "0 0 80px rgba(217,70,239,0.15), 0 0 200px rgba(147,51,234,0.08)",
          }}
        />
      </div>

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
