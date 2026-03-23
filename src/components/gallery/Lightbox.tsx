"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

interface LightboxProps {
  mainImage: string;
  title: string;
}

interface ImageThumbProps {
  src: string;
  alt: string;
}


export default function Lightbox({ mainImage, title }: LightboxProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      {/* Main image wrapper — click opens lightbox */}
      <div
        className="relative aspect-square cursor-zoom-in overflow-hidden glow-border-magenta"
        style={{ borderColor: "rgba(217,70,239,0.15)" }}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={`View ${title} fullscreen`}
      >
        <Image
          src={mainImage}
          alt={title}
          fill
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
        <LightboxOverlay src={mainImage} title={title} onClose={() => setOpen(false)} />,
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
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-500 hover:scale-105"
          sizes="144px"
        />
      </div>
      {mounted && open && createPortal(
        <LightboxOverlay src={src} title={alt} onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

/* ── Internal overlay ── */
function LightboxOverlay({
  src,
  title,
  onClose,
}: {
  src: string;
  title: string;
  onClose: () => void;
}) {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  // Keyboard close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(5,5,7,0.95)" }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-6 right-6 z-10 p-2 font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--ut-white-dim)" }}
        onClick={onClose}
        aria-label="Close"
      >
        ✕ Close
      </button>

      {/* Image */}
      <div
        className="relative w-full h-full flex items-center justify-center p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
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
