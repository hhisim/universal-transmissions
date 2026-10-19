"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { burstPlan, corrupt, shouldBurst, type GlyphIntensity } from "@/lib/glyph-burst";

/* ────────────────────────────────────────────────────────────
   ZalgoText — the site's only glyph typography system.

   Two modes.

   `static` (default, released behaviour, unchanged) — the text carries combining marks permanently.
   Every existing caller keeps exactly what it had.

   `burst` — the readable title is the title. It is what the server renders, what a visitor sees
   while the page loads, what they see with JavaScript disabled, and what a screen reader announces
   at every moment. Shortly after mount — only if the visitor has not asked for reduced motion and
   the tab is actually visible — an aria-hidden decorative layer replaces it, passes through the
   intensity schedule, and resolves back to the plain words.

   The decoration is never the accessible name: it is `aria-hidden`, and the readable span stays in
   the accessibility tree (transparent, not removed) while the burst runs. No tabindex is added, so
   headings gain no keyboard stops. Corruptions are seeded, so server and client cannot disagree.
   ──────────────────────────────────────────────────────────── */

interface ZalgoTextProps {
  text: string;
  intensity?: GlyphIntensity;
  className?: string;
  animate?: boolean;
  /** "static" keeps permanent corruption; "burst" transforms briefly and settles readable. */
  mode?: "static" | "burst";
}

export default function ZalgoText({
  text,
  intensity = "moderate",
  className = "",
  animate = false,
  mode = "static",
}: ZalgoTextProps) {
  const zalgod = useMemo(() => corrupt(text, intensity), [text, intensity]);

  /** null = at rest (the default, and the only state the server ever renders). */
  const [phase, setPhase] = useState<GlyphIntensity | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    if (mode !== "burst" || playedRef.current) return;

    const reducedMotion =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    if (
      !shouldBurst({
        reducedMotion,
        hidden: typeof document !== "undefined" && document.visibilityState === "hidden",
        alreadyPlayed: false,
      })
    ) {
      return;
    }

    playedRef.current = true;
    const plan = burstPlan(intensity);
    let index = 0;
    let timer: number | undefined;
    let cancelled = false;

    const step = () => {
      if (cancelled) return;
      /* If the tab goes away mid-burst the title resolves at once, so it is never caught
         mid-distortion when the visitor returns. */
      if (document.visibilityState === "hidden" || index >= plan.length) {
        setPhase(null);
        return;
      }
      const current = plan[index];
      setPhase(current.intensity);
      index += 1;
      timer = window.setTimeout(step, current.ms);
    };

    step();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") setPhase(null);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, intensity]);

  if (mode === "burst") {
    const active = phase !== null;
    return (
      <span
        className={`ut-title-burst ${className}`.trim()}
        data-glyph-burst={active ? "active" : "settled"}
        style={{ position: "relative", display: "inline-block" }}
      >
        {/* The words. Always present, always the accessible name, never replaced. */}
        <span style={{ opacity: active ? 0 : 1 }}>{text}</span>
        {/* Decoration only. Absolutely positioned, so it cannot move anything, and silent. */}
        {active && (
          <span
            aria-hidden="true"
            data-glyph-decoration="true"
            style={{ position: "absolute", left: 0, top: 0, right: 0, pointerEvents: "none" }}
          >
            {corrupt(text, phase)}
          </span>
        )}
      </span>
    );
  }

  if (animate) {
    return (
      <span className={`zalgo-animate ${className}`} data-text={text}>
        {zalgod}
      </span>
    );
  }

  return (
    <span className={className} aria-label={text}>
      {zalgod}
    </span>
  );
}
