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
  const rootRef = useRef<HTMLSpanElement | null>(null);
  /* The decoration must sit exactly on the title and wrap where the title wraps, without contributing
     any layout of its own. It is absolutely positioned, so its anchoring has to be measured — and
     measured again after fonts load or the layout changes. */
  const [overlayBox, setOverlayBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (mode !== "burst" || playedRef.current) return;
    playedRef.current = true;

    let disposed = false;
    let measureFrame: number | undefined;

    /* Anchoring is measured from the decoration's offsetParent, so scroll position does not matter
       and the number stays valid while the burst runs. */
    const measure = () => {
      const el = rootRef.current;
      if (disposed || !el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const anchor = el.offsetParent as HTMLElement | null;
      const base = anchor ? anchor.getBoundingClientRect() : { left: 0, top: 0 };
      const borderLeft = anchor ? anchor.clientLeft : 0;
      const borderTop = anchor ? anchor.clientTop : 0;
      setOverlayBox({
        left: Math.round(rect.left - base.left - borderLeft),
        top: Math.round(rect.top - base.top - borderTop),
        width: Math.round(rect.width),
      });
    };
    const remeasure = () => {
      if (measureFrame !== undefined) window.cancelAnimationFrame(measureFrame);
      measureFrame = window.requestAnimationFrame(measure);
    };

    measure();
    /* Late font loading and responsive changes both move the title; the decoration follows. */
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(remeasure).catch(() => {});
    }
    window.addEventListener("resize", remeasure);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(remeasure) : null;
    if (observer && rootRef.current) observer.observe(rootRef.current);

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
      if (measureFrame !== undefined) window.cancelAnimationFrame(measureFrame);
      window.removeEventListener("resize", remeasure);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (mql && typeof mql.removeEventListener === "function") mql.removeEventListener("change", onPreference);
    };
  }, [mode, intensity]);

  if (mode === "burst") {
    const active = phase !== null;
    return (
      <span
        ref={rootRef}
        className={`ut-title-burst ${className}`.trim()}
        data-glyph-burst={active ? "active" : "settled"}
      >
        {/* Decoration first, in a zero-width inline box, so it starts at the title's left edge and
            occupies no space of its own. Nothing here is positioned: a positioned wrapper stops the
            ancestor's `background-clip: text` from painting its glyphs, which made the title
            invisible at rest. The explicit text fill is likewise required — these headings paint
            their text transparent and fill it from a gradient on the h1, and an inline-block's own
            text is not filled by that clip. */}
        {active && overlayBox && (
          <span
            aria-hidden="true"
            data-glyph-decoration="true"
            style={{
              /* Out of flow: contributes no width, no height and no baseline, so the line box and the
                 content below it never move. */
              position: "absolute",
              top: overlayBox.top,
              left: overlayBox.left,
              width: overlayBox.width,
              whiteSpace: "normal",
              pointerEvents: "none",
              color: "inherit",
              WebkitTextFillColor: "currentColor",
            }}
          >
            {corrupt(text, phase)}
          </span>
        )}
        {/* The words, as this element's own text node: the ancestor's text clip reaches it. */}
        {text}
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
