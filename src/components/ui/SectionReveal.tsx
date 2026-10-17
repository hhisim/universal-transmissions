"use client";

/**
 * SectionReveal — Batch 30.
 *
 * The released component shipped `opacity: 0` as an INLINE style in the prerendered HTML and
 * waited for an intersection observer to clear it, so visibility was conditional on the observer
 * firing. Measured on the released gallery, 32 of 35 artwork cards were still at opacity 0 with
 * the grid on screen; the same wrapper is what left every section of the experience portal
 * invisible until the mechanism was replaced there.
 *
 * The wrapper is now VISIBLE BY DEFAULT and the animation is additive. The keyframes run when the
 * section enters view; the element's resting style is already the final state. If the animation
 * never runs — no observer, a throttled frame, a background tab, a script that fails — the
 * content is simply present, which is what the page's own HTML already claims it to be.
 *
 * The offset is passed to the stylesheet as custom properties so the whole effect lives in CSS,
 * and reduced-motion and no-script visitors get the content with no animation at all (see the
 * `[data-reveal]` rules in globals.css).
 */

import { useRef } from "react";
import type { CSSProperties } from "react";
import { useInView } from "framer-motion";

interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

/** Same directions the released component used: `left` enters from the right, and so on. */
const OFFSETS: Record<string, [number, number]> = {
  up: [0, 40],
  down: [0, -40],
  left: [40, 0],
  right: [-40, 0],
  none: [0, 0],
};

export default function SectionReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [x, y] = OFFSETS[direction] ?? OFFSETS.up;

  return (
    <div
      ref={ref}
      className={className}
      /* "shown" starts the animation; "true" is the same element at rest and fully visible. */
      data-reveal={isInView ? "shown" : "true"}
      style={
        {
          "--rv-x": `${x}px`,
          "--rv-y": `${y}px`,
          /* Held short: with a fill mode of `both` the delay is time spent at the start of the
             animation, and a long one is a long time to ask a visitor to wait. */
          animationDelay: `${Math.min(delay, 0.3)}s`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
