"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface LogoHeroProps {
  className?: string;
}

// Zalgo combining characters + esoteric glyphs
const GLYPHS = [
  "\u0300", "\u0301", "\u0302", "\u0303", "\u0308", "\u030A",
  "\u030B", "\u030C", "\u0311", "\u0312", "\u0313", "\u0314",
  "\u0316", "\u0317", "\u0323", "\u0324", "\u0325", "\u0327",
  "\u0330", "\u0331", "\u0334", "\u0335", "\u0336",
  "᚛", "᚜", "⍟", "⎈", "◬", "⬡", "⏣", "⌬", "☿", "♃", "♄",
  "⊹", "⊕", "⊗", "⦿", "⧫", "∞", "◎", "⟐", "⟡",
  "△", "▽", "◇", "○", "□", "⬠", "⬡", "⬢",
  "🜁", "🜂", "🜃", "🜄", "🜔", "🝆",
];

interface GlyphDrop {
  x: number;
  y: number;
  speed: number;
  char: string;
  opacity: number;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
  size: number;
}

export function LogoHero({ className = "" }: LogoHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glyphCanvasRef = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [loaded, setLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const timeRef = useRef<number>(0);
  const pulseTimeRef = useRef<number>(0);
  const [pulseAge, setPulseAge] = useState(0);
  const pulseRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const flashAlphaRef = useRef(0);
  const glyphDropsRef = useRef<GlyphDrop[]>([]);
  const isMobileRef = useRef(false);
  const autoPulseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Trigger starburst at canvas center — DISABLED: removed click trigger
  const triggerStarburst = useCallback(() => {
    // Starburst removed from click — homepage no longer triggers on interaction
    // Kept as no-op to avoid breaking existing call sites
  }, []);

  // Init glyph drops
  const initGlyphs = useCallback((canvas: HTMLCanvasElement) => {
    const W = canvas.width;
    const H = canvas.height;
    const COLUMNS = Math.floor(W / 30);
    glyphDropsRef.current = [];
    for (let i = 0; i < COLUMNS; i++) {
      glyphDropsRef.current.push({
        x: (i / COLUMNS) * W + Math.random() * 15,
        y: Math.random() * H,
        speed: 0.3 + Math.random() * 0.7,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        opacity: 0.015 + Math.random() * 0.025,
        size: 10 + Math.random() * 6,
      });
    }
  }, []);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const glyphCanvas = glyphCanvasRef.current;
    if (!canvas || !glyphCanvas) return;
    const ctx = canvas.getContext("2d")!;
    const gCtx = glyphCanvas.getContext("2d")!;

    let rafId: number;
    let W = canvas.width;
    let H = canvas.height;

    function resize() {
      if (!containerRef.current || !canvas || !glyphCanvas) return;
      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;
      canvas.width = w;
      canvas.height = h;
      glyphCanvas.width = w;
      glyphCanvas.height = h;
      W = w;
      H = h;
      initGlyphs(glyphCanvas);
    }
    resize();
    window.addEventListener("resize", resize);

    function tick() {
      const c = canvas!;
      const g = glyphCanvas!;
      timeRef.current += 0.016;
      setRotation(timeRef.current * 0.08);

      // Update pulse age
      if (pulseRef.current) {
        const age = timeRef.current - pulseTimeRef.current;
        setPulseAge(age);
        if (age > 2.5) {
          pulseRef.current = false;
          setPulseAge(0);
        }
      } else {
        setPulseAge(0);
      }

      W = c.width;
      H = c.height;

      // ── Clear canvas ──────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      // ── Screen flash ──────────────────────────────────────────
      if (flashAlphaRef.current > 0) {
        ctx.save();
        ctx.globalAlpha = flashAlphaRef.current;
        ctx.fillStyle = "#d946ef";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        flashAlphaRef.current *= 0.92;
        if (flashAlphaRef.current < 0.005) flashAlphaRef.current = 0;
      }

      // ── Pulse rings (3 layers: magenta, gold, cyan) ───────────
      const cx = W / 2;
      const cy = H / 2;
      const logoSize = Math.min(W, H) * 0.29;

      if (pulseRef.current && pulseAge > 0 && pulseAge < 3) {
        const alpha = Math.max(0, 1 - pulseAge / 3);

        // Ring 1 — magenta (fast)
        const r1 = pulseAge * Math.min(W, H) * 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, r1, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(217, 70, 239, ${alpha * 0.5})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Ring 2 — gold (medium)
        const r2 = pulseAge * Math.min(W, H) * 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, r2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212, 168, 71, ${alpha * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ring 3 — cyan (slow)
        const r3 = pulseAge * Math.min(W, H) * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, r3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Geometric flash — star tetrahedron at center (brief)
        if (pulseAge < 0.5) {
          const flashAlpha = (1 - pulseAge / 0.5) * 0.3;
          const triSize = pulseAge * logoSize * 0.8;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(timeRef.current * 0.5);
          ctx.strokeStyle = `rgba(212, 168, 71, ${flashAlpha})`;
          ctx.lineWidth = 1;
          // Upward triangle
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
            const method = i === 0 ? "moveTo" : "lineTo";
            ctx[method](Math.cos(a) * triSize, Math.sin(a) * triSize);
          }
          ctx.closePath();
          ctx.stroke();
          // Downward triangle
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI * 2) / 3 + Math.PI / 2;
            const method = i === 0 ? "moveTo" : "lineTo";
            ctx[method](Math.cos(a) * triSize, Math.sin(a) * triSize);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      }

      // ── Particles with trails ─────────────────────────────────
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= 0.008;
        if (p.life <= 0) return false;

        // Glow halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.size * 3) * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.life * 0.08})`;
        ctx.fill();

        // Core particle
        const sz = p.size * p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.life * 0.7})`;
        ctx.fill();

        return true;
      });

      rafId = requestAnimationFrame(tick);
    }

    // ── Glyph rain render loop (separate, slower) ────────────────
    function tickGlyphs() {
      if (!glyphCanvas) return;
      const Wg = glyphCanvas.width;
      const Hg = glyphCanvas.height;
      gCtx.clearRect(0, 0, Wg, Hg);

      for (const drop of glyphDropsRef.current) {
        drop.y += drop.speed;
        if (drop.y > Hg + 20) {
          drop.y = -20;
          drop.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          drop.opacity = 0.015 + Math.random() * 0.025;
        }
        gCtx.save();
        gCtx.globalAlpha = drop.opacity;
        gCtx.fillStyle = "#d946ef";
        gCtx.font = `${drop.size}px monospace`;
        gCtx.fillText(drop.char, drop.x, drop.y);
        gCtx.restore();
      }
    }

    rafId = requestAnimationFrame(tick);
    const glyphInterval = setInterval(tickGlyphs, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(glyphInterval);
      window.removeEventListener("resize", resize);
    };
  }, [initGlyphs]);

  // Mouse/touch events
  useEffect(() => {
    isMobileRef.current = /Mobi|Android/i.test(navigator.userAgent);

    function onMouseMove(e: MouseEvent) {
      const parent = containerRef.current;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      setMouse({
        x: (e.clientX - r.left) / r.width,
        y: (e.clientY - r.top) / r.height,
      });
    }
    function onTouchMove(e: TouchEvent) {
      // Allow native scroll — do NOT preventDefault
      const t = e.touches[0];
      const parent = containerRef.current;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      setMouse({ x: (t.clientX - r.left) / r.width, y: (t.clientY - r.top) / r.height });
    }
    function onClick(e: MouseEvent) {
      // Click starburst disabled — removed
    }
    function onTouchStart(e: TouchEvent) {
      // Touch starburst disabled — removed
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("click", onClick);
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    // Auto-pulse removed — no longer using starburst
    // if (isMobileRef.current) {
    //   autoPulseTimerRef.current = setInterval(() => {
    //     triggerStarburst();
    //   }, 8000);
    // }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onTouchStart);
      if (autoPulseTimerRef.current) clearInterval(autoPulseTimerRef.current);
    };
  }, [triggerStarburst]);

  const distX = (mouse.x - 0.5) * 2;
  const distY = (mouse.y - 0.5) * 2;
  const dist = Math.sqrt(distX * distX + distY * distY);
  const aberration = Math.min(2 + dist * 12, 20);
  const rotDeg = rotation * (180 / Math.PI);
  const pulseScale = 60 + pulseAge * 300;
  const pulseOpacity = Math.max(0, 0.6 - pulseAge * 0.22);
  const showPulseRing = pulseRef.current && pulseAge > 0 && pulseAge < 2.5;

  return (
    <div
      ref={containerRef}
      className={`relative w-full cursor-crosshair ${className}`}
      style={{ height: "58vh", background: "#0a090e" }}
    >
      {/* ── Glyph rain canvas — sized to logo area only ── */}
      <canvas
        ref={glyphCanvasRef}
        className="absolute pointer-events-none"
        style={{
          zIndex: 0,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* ── Particle/flash canvas — sized to logo area only ── */}
      <canvas
        ref={canvasRef}
        className="absolute pointer-events-none"
        style={{
          zIndex: 10,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* ── SVG colour-matrix tint filters ── */}
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
        <defs>
          <filter id="magentaTint" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix"
              values="0 0 0 0 0.85  0 0 0 0 0.18  0 0 0 0 0.94  0 0 0 1 0" />
          </filter>
          <filter id="cyanTint" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix"
              values="0 0 0 0 0.13  0 0 0 0 0.83  0 0 0 0 0.93  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>

      {/* ── Ambient glow ── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          zIndex: 1,
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(147,51,234,${0.05 + dist * 0.03}) 0%, transparent 70%)`,
        }}
      />

      {/* ── Pulse ring (CSS fallback for the ring, canvas handles the rest) ── */}
      {showPulseRing && (
        <div
          className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
          style={{
            zIndex: 11,
            width: pulseScale,
            height: pulseScale,
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(217,70,239,0.6)",
            opacity: pulseOpacity,
          }}
        />
      )}

      {/* ── LOGO — 3-layer chromatic aberration stack ── */}
      <div
        className="absolute flex items-center justify-center"
        style={{ inset: 0, zIndex: 5 }}
      >
        <div
          className="relative"
          style={{
            width: "58%",
            maxWidth: 540,
            aspectRatio: "1",
            transform: `rotate(${rotDeg}deg)`,
          }}
        >
          {/* MAGENTA layer */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${-aberration * distX * 1.5}px, ${-aberration * distY * 0.5}px)`,
              opacity: 0.45 + dist * 0.35,
              mixBlendMode: "screen",
            }}
          >
            <img
              src="/logo-white.svg"
              alt=""
              className="w-full h-full"
              style={{ filter: "url(#magentaTint)" }}
              onLoad={() => setLoaded(true)}
            />
          </div>

          {/* CYAN layer */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${aberration * distX * 1.5}px, ${aberration * distY * 0.5}px)`,
              opacity: 0.45 + dist * 0.35,
              mixBlendMode: "screen",
            }}
          >
            <img
              src="/logo-white.svg"
              alt=""
              className="w-full h-full"
              style={{ filter: "url(#cyanTint)" }}
            />
          </div>

          {/* WHITE centre */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.92 }}>
            <img src="/logo-white.svg" alt="" className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* ── Orbiting dots ── */}
      <OrbitingDots rotation={rotDeg} />

      {/* ── Scan line ── */}
      <div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          zIndex: 6,
          background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.12), transparent)",
          top: `${((timeRef.current * 35) % 100)}%`,
        }}
      />

      {/* ── CRT scanline texture ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 7,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 3px)",
        }}
      />


    </div>
  );
}

function OrbitingDots({ rotation }: { rotation: number }) {
  const count = 12;
  const colors = ["#d946ef", "#9333ea", "#22d3ee"];

  return (
    <div
      className="absolute flex items-center justify-center pointer-events-none"
      style={{ inset: 0, zIndex: 5 }}
    >
      <div
        className="relative rounded-full"
        style={{
          width: "58%",
          maxWidth: 540,
          aspectRatio: "1",
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {Array.from({ length: count }).map((_, i) => {
          const baseAngle = (i * 360) / count;
          const delay = (i * 0.4).toFixed(2);
          const size = 3 + (i % 3) * 1.2;
          const orbitR = "30%";
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                background: colors[i % 3],
                boxShadow: `0 0 ${size * 2}px ${colors[i % 3]}`,
                left: "50%",
                top: "50%",
                marginLeft: -(size / 2),
                marginTop: -(size / 2),
                transformOrigin: "0 0",
                transform: `rotate(${baseAngle}deg) translateX(${orbitR})`,
                opacity: 0.25 + (i % 3) * 0.05,
                animation: `dot-orbit${i % 4} ${7 + (i % 3) * 0.5}s linear infinite`,
                animationDelay: `-${delay}s`,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes dot-orbit0 {
          from { transform: rotate(0deg) translateX(30%); }
          to   { transform: rotate(360deg) translateX(30%); }
        }
        @keyframes dot-orbit1 {
          from { transform: rotate(0deg) translateX(30%); }
          to   { transform: rotate(360deg) translateX(30%); }
        }
        @keyframes dot-orbit2 {
          from { transform: rotate(0deg) translateX(30%); }
          to   { transform: rotate(360deg) translateX(30%); }
        }
        @keyframes dot-orbit3 {
          from { transform: rotate(0deg) translateX(30%); }
          to   { transform: rotate(360deg) translateX(30%); }
        }
      `}</style>
    </div>
  );
}
