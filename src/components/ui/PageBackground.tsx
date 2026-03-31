"use client";

import { useEffect, useRef } from "react";

const GLYPHS = [
  "\u0300","\u0301","\u0302","\u0303","\u0308","\u030A",
  "\u030B","\u030C","\u0311","\u0312","\u0313","\u0314",
  "\u0316","\u0317","\u0323","\u0324","\u0325","\u0327",
  "\u0330","\u0331","\u0334","\u0335","\u0336",
  "᚛","᚜","⍟","⎈","◬","⬡","⏣","⌬","☿","♃","♄",
  "⊹","⊕","⊗","⦿","⧫","∞","◎","⟐","⟡",
  "△","▽","◇","○","□","⬠","⬡","⬢",
  "🜁","🜂","🜃","🜄","🜔","🝆",
];

interface GlyphDrop {
  x: number;
  y: number;
  speed: number;
  char: string;
  opacity: number;
  size: number;
}

interface Star {
  x: number;
  y: number;
  s: number;
  b: number;
  speed: number;
}

interface PageBackgroundProps {
  suppress?: boolean;
}

// Shared flag: set true by scene PageBackground to kill the ambient layout canvas
export let layoutBgSuppressed = false;

export default function PageBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layoutBgSuppressed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, t = 0, rafId = 0;
    const stars: Star[] = [];
    const drops: GlyphDrop[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      const r = devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * r;
      canvas.height = H * r;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(r, 0, 0, r, 0, 0);

      stars.length = 0;
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          s: 0.3 + Math.random() * 1.2,
          b: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 1.5,
        });
      }

      drops.length = 0;
      const cols = Math.floor(W / 32);
      for (let i = 0; i < cols; i++) {
        drops.push({
          x: (i / cols) * W + Math.random() * 16,
          y: Math.random() * H,
          speed: 0.12 + Math.random() * 0.28,
          char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          opacity: 0.008 + Math.random() * 0.014,
          size: 9 + Math.random() * 5,
        });
      }
    }

    function frame() {
      if (!ctx) return;
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      // Glyph rain
      for (const d of drops) {
        d.y += d.speed;
        if (d.y > H + 15) {
          d.y = -15;
          d.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          d.opacity = 0.008 + Math.random() * 0.014;
        }
        ctx.save();
        ctx.globalAlpha = d.opacity;
        ctx.fillStyle = "#d946ef";
        ctx.font = d.size + "px monospace";
        ctx.fillText(d.char, d.x, d.y);
        ctx.restore();
      }

      // Stars
      for (const s of stars) {
        const bri = 0.08 + Math.sin(t * s.speed + s.b) * 0.07;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        const gold = Math.random() > 0.9;
        ctx.fillStyle = gold
          ? `rgba(212,168,71,${bri})`
          : `rgba(237,233,246,${bri})`;
        ctx.fill();
      }

      // Subtle nebula top-right
      const nb1 = ctx.createRadialGradient(W * 0.75, H * 0.2, 0, W * 0.75, H * 0.2, W * 0.35);
      nb1.addColorStop(0, "rgba(147,51,234,0.018)");
      nb1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = nb1;
      ctx.fillRect(0, 0, W, H);

      // Subtle nebula bottom-left
      const nb2 = ctx.createRadialGradient(W * 0.2, H * 0.8, 0, W * 0.2, H * 0.8, W * 0.28);
      nb2.addColorStop(0, "rgba(34,211,238,0.012)");
      nb2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = nb2;
      ctx.fillRect(0, 0, W, H);

      // Moving scan line
      const sy = (t * 18) % H;
      ctx.fillStyle = "rgba(217,70,239,0.004)";
      ctx.fillRect(0, sy - 1, W, 2);

      rafId = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  );
}
