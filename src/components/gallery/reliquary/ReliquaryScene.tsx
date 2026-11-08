"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { artworks } from "@/data/artworks";
import "./chamber.css";

/**
 * M1.1B — the Reliquary as a WebGL architectural proof.
 *
 * Rendering lives in `chamber3d.ts` and is loaded only in the browser. The DOM
 * keeps what it is good at: real links, keyboard order, aria labels, the plaque
 * and the lift overlay. Each artwork is an <a> positioned over its projected
 * mesh, so selection still starts from the work's actual screen rectangle.
 */

const SLUGS = ["merkaba", "tetragrammaton", "tesseract"] as const;

type Box = { left: number; top: number; width: number };
type Rect = { slug: string; left: number; top: number; width: number; height: number };

export default function ReliquaryScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chamberRef = useRef<{ dispose: () => void; plateRects: () => Rect[]; focusOn: (s: string | null) => void; stats: () => { calls: number; triangles: number; textures: number } } | null>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [stats, setStats] = useState<{ calls: number; triangles: number; textures: number } | null>(null);

  const [selected, setSelected] = useState<(typeof artworks)[number] | null>(null);
  const [phase, setPhase] = useState<"idle" | "lift" | "focus">("idle");
  const [box, setBox] = useState<Box | null>(null);
  const originRef = useRef<Box | null>(null);
  const liftRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const works = SLUGS.map((s) => artworks.find((a) => a.slug === s)).filter(Boolean) as (typeof artworks)[number][];

  useEffect(() => {
    document.body.classList.add("rel-open");
    return () => document.body.classList.remove("rel-open");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hasWebGL = (() => {
      try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {
        return false;
      }
    })();
    if (!hasWebGL) {
      setFallback(true);
      return;
    }

    import("./chamber3d").then(({ createChamber }) => {
      if (cancelled || !canvas) return;
      const mobile = window.matchMedia("(max-width: 760px)").matches;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const params = new URLSearchParams(window.location.search);
      const lite = params.get("lite") === "1";
      const freeze = params.get("freeze") === "1";
      const chamber = createChamber(canvas, {
        works: works.map((w) => ({ slug: w.slug, image: w.images[0] })),
        mobile,
        reducedMotion: reduced,
        lite,
        freeze,
      });
      chamberRef.current = chamber;
      const sync = () => setRects(chamber.plateRects());
      sync();
      window.addEventListener("resize", sync);
      setTimeout(() => setReady(true), 350);
      setTimeout(() => setStats(chamber.stats()), 800);
      (chamber as unknown as { _sync?: () => void })._sync = sync;
      (canvas as unknown as { _off?: () => void })._off = () => window.removeEventListener("resize", sync);
    }).catch((err) => { console.error("chamber mount failed", err); setFallback(true); });

    return () => {
      cancelled = true;
      const off = (canvas as unknown as { _off?: () => void })._off;
      off?.();
      chamberRef.current?.dispose();
      chamberRef.current = null;
    };
    // works are derived from static data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ceremonialBox = useCallback((): Box => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(vw * 0.92, vw > 1100 ? 900 : vw * 0.92);
    return { left: (vw - width) / 2, top: Math.max(48, vh * 0.1), width };
  }, []);

  const open = useCallback(
    (work: (typeof artworks)[number], el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const origin = { left: r.left, top: r.top, width: r.width };
      originRef.current = origin;
      setSelected(work);
      setBox(origin);
      setPhase("lift");
      chamberRef.current?.focusOn(work.slug);
      requestAnimationFrame(() => requestAnimationFrame(() => setBox(ceremonialBox())));
    },
    [ceremonialBox]
  );

  const close = useCallback(() => {
    const origin = originRef.current;
    chamberRef.current?.focusOn(null);
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
    else window.setTimeout(finish, 680);
  }, []);

  useEffect(() => {
    if (phase !== "lift" || !liftRef.current) return;
    const el = liftRef.current;
    const toFocus = () => setPhase("focus");
    el.addEventListener("transitionend", toFocus, { once: true });
    const t = window.setTimeout(toFocus, 850);
    return () => {
      el.removeEventListener("transitionend", toFocus);
      window.clearTimeout(t);
    };
  }, [phase]);

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
      <canvas ref={canvasRef} className="rel-canvas" aria-hidden="true" />

      {!ready && !fallback && (
        <div className="rel-boot" aria-hidden="true">
          <span>Opening the chamber</span>
        </div>
      )}

      {/* the three works, as real links over the projected meshes */}
      {rects.map((r) => {
        const work = works.find((w) => w.slug === r.slug);
        if (!work) return null;
        return (
          <a
            key={r.slug}
            className="rel-hit"
            href={`/gallery/${work.slug}`}
            aria-label={`${work.title}, ${work.year}`}
            style={{
              left: `${r.left}px`,
              top: `${r.top}px`,
              width: `${r.width}px`,
              height: `${r.height}px`,
              opacity: selected?.slug === work.slug ? 0 : 1,
              pointerEvents: phase === "focus" ? "none" : "auto",
            }}
            onClick={(e) => {
              e.preventDefault();
              open(work, e.currentTarget);
            }}
          >
            <span className="rel-hit-dot" aria-hidden="true" />
          </a>
        );
      })}

      <div className="rel-hud">
        <div>
          <div className="no">IV · THE RELIQUARY</div>
          <div className="title">Three bays, one light</div>
        </div>
        <div className="no" style={{ textAlign: "right" }}>
          {artworks.length} WORKS
        </div>
      </div>

      <a className="rel-back" href="/gallery">
        ← The Gallery
      </a>

      <div className="rel-index">
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

      {fallback && (
        <div className="rel-fallback">
          <p>
            This chamber needs WebGL. Every work remains available in the{" "}
            <a href="/gallery">gallery</a> and in the index below.
          </p>
        </div>
      )}

      {selected && box && (
        <div ref={liftRef} className="rel-lift" style={{ left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px` }}>
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

      <div className="rel-stats" aria-hidden="true">
        {stats ? `${stats.calls} draws · ${Math.round(stats.triangles / 1000)}k tris` : "compiling"}
      </div>
    </div>
  );
}
