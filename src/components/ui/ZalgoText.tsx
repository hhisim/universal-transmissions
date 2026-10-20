"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { burstPlan, corrupt, type GlyphIntensity } from "@/lib/glyph-burst";
import { startBurst, windowScheduler } from "@/lib/glyph-burst-runner";

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
    playedRef.current = true;

    let disposed = false;
    const mql =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    const runner = startBurst({
      plan: burstPlan(intensity),
      scheduler: windowScheduler(window),
      environment: {
        /* Read live, not sampled once: the runner re-checks these at playback start and on every
           step, so a preference or visibility change that arrives later still stops the sequence. */
        isReducedMotion: () => (mql ? mql.matches : false),
        isHidden: () => document.visibilityState === "hidden",
      },
      onPhase: (next) => {
        if (!disposed) setPhase(next);
      },
    });

    /* Both of these call the same cancellation path, which settles the title, clears the pending
       idle callback and timer, and forbids any later phase. Clearing the displayed phase alone was
       the bug: the scheduled sequence survived and the next phase reappeared. */
    const onVisibility = () => {
      if (document.visibilityState === "hidden") runner.cancel();
    };
    const onPreference = () => {
      if (mql && mql.matches) runner.cancel();
    };

    document.addEventListener("visibilitychange", onVisibility);
    if (mql && typeof mql.addEventListener === "function") mql.addEventListener("change", onPreference);

    return () => {
      disposed = true;
      runner.cancel();
      document.removeEventListener("visibilitychange", onVisibility);
      if (mql && typeof mql.removeEventListener === "function") mql.removeEventListener("change", onPreference);
    };
  }, [mode, intensity]);

  if (mode === "burst") {
    const active = phase !== null;
    return (
      <span
        className={`ut-title-burst ${className}`.trim()}
        data-glyph-burst={active ? "active" : "settled"}
        style={{ position: "relative" }}
      >
        {/* The words, as this element's own text node — not a nested span. The headings using this
            component are gradient-clipped (`background-clip: text` on the h1), and that clip reaches
            this element's own text. A nested span inside a positioned wrapper is not painted through
            the ancestor's clip, which made the title invisible at rest. */}
        {text}
        {/* Decoration only: absolutely positioned, so it cannot move anything, and silent.
            -webkit-text-fill-color is set explicitly because the headings using this component are
            gradient-clipped (`ut-gradient-text` paints its own text transparent and fills it from a
            background on the h1). An absolutely positioned layer is outside that background's text
            flow, so without an explicit fill it inherits transparency and paints nothing. */}
        {active && (
          <span
            aria-hidden="true"
            data-glyph-decoration="true"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              pointerEvents: "none",
              color: "inherit",
              WebkitTextFillColor: "currentColor",
            }}
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
