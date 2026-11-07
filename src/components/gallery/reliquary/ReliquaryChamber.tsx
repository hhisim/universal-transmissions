"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { artworks } from "@/data/artworks";
import "./chamber.css";

/* ─────────────────────────────────────────────────────────────
   The Reliquary — M1.1 vertical slice.

   Geometry: 24 stone segments on a circle of radius 1400 world
   units, 1500 tall. Each plate-bearing segment carries two works
   (salon hanging): a large lower work and a smaller upper one.

   Light: oculus above → bronze bar per work → spill on the stone
   → pool on the floor. One authored spectral breach at −58°
   breaks the radial symmetry.

   Interaction: a work lifts from its own screen rectangle to the
   ceremonial position — the origin is a measured DOMRect, never a
   guessed centre point.
   ───────────────────────────────────────────────────────────── */

const SEGMENTS = 12;
const RADIUS = 1300;
const SEG_W = Math.round((2 * Math.PI * RADIUS) / SEGMENTS); // ≈ 366

type Work = (typeof artworks)[number];
type Tier = { w: number; top: number; niche: number };

const TIERS: { lower: Tier; upper: Tier } = {
  lower: { w: 560, top: 60, niche: 760 },
  upper: { w: 340, top: 24, niche: 470 },
};
const BREACH_DEG = -58;

/** 8 plate-bearing positions on the 15° grid, from −52.5° to +52.5°. */
const PLATE_ANGLES = [-75, -45, -15, 15, 45, 75];

const pick = (n: number) => {
  const step = Math.max(1, Math.floor(artworks.length / n));
  const out: Work[] = [];
  for (let i = 0; i < artworks.length && out.length < n; i += step) out.push(artworks[i]);
  return out;
};

function segmentStyle(deg: number) {
  const d = Math.abs(((deg - BREACH_DEG + 540) % 360) - 180);
  const breach = Math.max(0, 1 - d / 60);
  return {
    transform: `rotateY(${deg}deg) translateZ(-${RADIUS}px)`,
    ["--seg-tint" as string]: breach > 0.3 ? "#1a2233" : "#171127",
    ["--seg-lum" as string]: (0.84 + breach * 0.36).toFixed(3),
  } as React.CSSProperties;
}

export default function ReliquaryChamber() {
  const lowerWorks = useMemo(() => pick(6), []);
  const upperWorks = useMemo(() => {
    const step = Math.max(1, Math.floor(artworks.length / 12));
    const all: Work[] = [];
    for (let i = step; i < artworks.length && all.length < 12; i += step) all.push(artworks[i]);
    return all.slice(6, 12);
  }, []);

  const [selected, setSelected] = useState<Work | null>(null);
  const [phase, setPhase] = useState<"idle" | "lift" | "focus">("idle");
  const [box, setBox] = useState<{ left: number; top: number; width: number } | null>(null);
  const liftRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<{ left: number; top: number; width: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const ceremonialBox = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(vw * 0.92, 880);
    return { left: (vw - width) / 2, top: Math.max(56, vh * 0.12), width };
  }, []);

  const open = useCallback(
    (work: Work, el: HTMLElement) => {
      const img = el.querySelector("img") ?? el;
      const r = img.getBoundingClientRect();
      const origin = { left: r.left, top: r.top, width: r.width };
      originRef.current = origin;
      setSelected(work);
      setBox(origin);
      setPhase("lift");
      // paint the origin frame, then move — otherwise the browser skips the transition
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setBox(ceremonialBox()))
      );
    },
    [ceremonialBox]
  );

  const close = useCallback(() => {
    const origin = originRef.current;
    if (!origin) {
      setSelected(null);
      setPhase("idle");
      return;
    }
    setPhase("lift");
    setBox(origin);
    const finish = () => {
      setSelected(null);
      setPhase("idle");
      setBox(null);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else window.setTimeout(finish, 660);
  }, []);

  useEffect(() => {
    if (phase !== "lift" || !liftRef.current) return;
    const el = liftRef.current;
    const toFocus = () => setPhase("focus");
    el.addEventListener("transitionend", toFocus, { once: true });
    const t = window.setTimeout(toFocus, 820);
    return () => {
      el.removeEventListener("transitionend", toFocus);
      window.clearTimeout(t);
    };
  }, [phase]);

  useEffect(() => {
    document.body.classList.add("rel-open");
    return () => document.body.classList.remove("rel-open");
  }, []);

  useEffect(() => {
    if (phase !== "focus") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [phase, close]);

  return (
    <div className="rel-root" data-phase={phase === "focus" ? "focus" : "rest"}>
      <div className="rel-scene">
        <div className={`rel-rig${phase === "focus" ? " is-dim" : ""}`}>
          <div className="rel-ceil" />
          <div className="rel-oculus" />
          <div className="rel-haze" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <i
                key={i}
                style={{
                  width: `${460 + i * 160}px`,
                  height: `${460 + i * 160}px`,
                  top: `${-880 + 130 + i * 108}px`,
                  opacity: 0.46 - i * 0.06,
                  filter: `blur(${18 + i * 5}px)`,
                }}
              />
            ))}
          </div>
          <div className="rel-floor" />
          <div className="rel-pool" />

          {Array.from({ length: SEGMENTS }).map((_, s) => {
            const deg = (s * 360) / SEGMENTS + 360 / SEGMENTS / 2;
            const signed = deg > 180 ? deg - 360 : deg;
            const slot = PLATE_ANGLES.findIndex((a) => Math.abs(a - signed) < 0.01);
            const lower = slot >= 0 ? lowerWorks[slot] : null;
            const upper = slot >= 0 ? upperWorks[slot] : null;
            return (
              <div key={s} className="rel-seg" style={segmentStyle(deg)}>
                <div className="face">
                  <div className="courses" />
                  <div className="grain" />
                  <div className="glyphs" />
                </div>
                <span className="rel-pilaster" aria-hidden="true" />
                <span className="rel-cornice" aria-hidden="true" />
                <span className="rel-skirting" aria-hidden="true" />

                {lower && (
                  <Hanging
                    work={lower}
                    tier={TIERS.lower}
                    selectedId={selected?.id}
                    onOpen={open}
                    priority
                  />
                )}
                {upper && (
                  <Hanging
                    work={upper}
                    tier={TIERS.upper}
                    selectedId={selected?.id}
                    onOpen={open}
                    priority={false}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`rel-hud${phase === "focus" ? " is-dim" : ""}`}>
        <div>
          <div className="no">IV · THE RELIQUARY</div>
          <div className="title">Works held in a circle</div>
        </div>
        <div className="no" style={{ textAlign: "right" }}>
          {artworks.length} WORKS · INDEX BELOW
        </div>
      </div>

      <a className="rel-back" href="/gallery">← The Gallery</a>

      <div className={`rel-index${phase === "focus" ? " is-dim" : ""}`}>
        <details>
          <summary>All {artworks.length} works · index</summary>
          <ul>
            {artworks.map((w) => (
              <li key={w.id}>
                <a href={`/gallery/${w.slug}`}>
                  {w.title} <span style={{ opacity: 0.45 }}>· {w.year}</span>
                </a>
              </li>
            ))}
          </ul>
        </details>
      </div>

      {selected && box && (
        <div
          ref={liftRef}
          className="rel-lift"
          style={{ left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px` }}
        >
          <img src={selected.images[0]} alt="" />
        </div>
      )}

      {phase === "focus" && selected && (
        <div className="rel-focus">
          <div className="rel-card">
            <div className="series">{selected.medium}</div>
            <h2>{selected.title}</h2>
            <div className="meta">
              {selected.year} · 1 of {artworks.length}
            </div>
            <div className="rule" />
            <p className="desc">{selected.description}</p>
            <div className="rel-actions">
              <a href={`/gallery/${selected.slug}`}>View the work</a>
              <button ref={closeRef} onClick={close} type="button">
                Return to the chamber
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Hanging({
  work,
  tier,
  selectedId,
  onOpen,
  priority,
}: {
  work: Work;
  tier: Tier;
  selectedId?: string;
  onOpen: (w: Work, el: HTMLElement) => void;
  priority: boolean;
}) {
  return (
    <>
      <div
        className="rel-cast"
        style={{ width: tier.w * 1.15, height: tier.niche, top: `calc(${tier.top}% + 26px)` }}
      />
      <div
        className="rel-wash"
        style={{ width: tier.w * 2.1, height: tier.niche * 1.5, top: `${tier.top}%` }}
      />
      <div
        className="rel-niche"
        style={{ width: tier.w + 84, height: tier.niche, top: `${tier.top}%` }}
      />
      <div
        className="rel-lamp"
        style={{ width: tier.w * 0.66, top: `calc(${tier.top}% - ${tier.niche / 2 + 34}px)` }}
      />
      <a
        className="rel-plate"
        href={`/gallery/${work.slug}`}
        aria-label={`${work.title}, ${work.year}`}
        style={{ width: tier.w, top: `${tier.top}%`, opacity: selectedId === work.id ? 0 : 1 }}
        onClick={(e) => {
          e.preventDefault();
          onOpen(work, e.currentTarget);
        }}
      >
        <span className="mount" />
        <span className="mat" />
        <img
          src={work.images[0]}
          alt={`${work.title} (${work.year})`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
        <span className="glass" />
      </a>
    </>
  );
}
