"use client";

import { useRef, useEffect } from "react";

interface Star { x: number; y: number; r: number; phase: number; speed: number; brightness: number }
interface Comet { x: number; y: number; angle: number; speed: number; length: number; life: number; maxLife: number; active: boolean }
interface Glyph { x: number; y: number; vx: number; vy: number; size: number; rotation: number; rotSpeed: number; type: number; opacity: number }

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0, animId = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight * 3; // tall for scrolling pages
    };
    resize();
    window.addEventListener("resize", resize);

    // Stars
    const stars: Star[] = Array.from({ length: 200 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.8 + 0.3,
      brightness: Math.random() * 0.5 + 0.2,
    }));

    // Comet (rare)
    const comet: Comet = { x: 0, y: 0, angle: 0, speed: 0, length: 0, life: 0, maxLife: 0, active: false };
    let cometTimer = Math.random() * 600 + 400; // frames until next comet

    const spawnComet = () => {
      comet.x = Math.random() * w * 0.3;
      comet.y = Math.random() * h * 0.4;
      comet.angle = Math.random() * 0.4 + 0.3; // ~20-40 degrees
      comet.speed = Math.random() * 3 + 2;
      comet.length = Math.random() * 80 + 40;
      comet.life = 0;
      comet.maxLife = Math.random() * 120 + 80;
      comet.active = true;
    };

    // Subtle geometry glyphs (very small, drifting)
    const glyphs: Glyph[] = Array.from({ length: 8 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.1,
      size: Math.random() * 6 + 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.005,
      type: Math.floor(Math.random() * 4), // 0=triangle 1=square 2=hexagon 3=circle
      opacity: Math.random() * 0.06 + 0.02,
    }));

    const drawGlyph = (g: Glyph) => {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rotation);
      ctx.strokeStyle = `rgba(147, 51, 234, ${g.opacity})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const s = g.size;
      if (g.type === 0) { // triangle
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.866, s * 0.5); ctx.lineTo(-s * 0.866, s * 0.5); ctx.closePath();
      } else if (g.type === 1) { // square
        ctx.rect(-s / 2, -s / 2, s, s);
      } else if (g.type === 2) { // hexagon
        for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 6; ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * s, Math.sin(a) * s); } ctx.closePath();
      } else { // circle
        ctx.arc(0, 0, s, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.restore();
    };

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;

      // Stars
      for (const star of stars) {
        const twinkle = Math.sin(frame * 0.02 * star.speed + star.phase) * 0.5 + 0.5;
        const alpha = star.brightness * twinkle;
        // Color variation: mostly white, some with purple/cyan tint
        const hue = star.phase > 4 ? 280 : star.phase > 3 ? 190 : 0;
        const sat = hue === 0 ? "0%" : "40%";
        ctx.fillStyle = `hsla(${hue}, ${sat}, 85%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Comet
      cometTimer--;
      if (cometTimer <= 0 && !comet.active) {
        spawnComet();
        cometTimer = Math.random() * 900 + 500;
      }
      if (comet.active) {
        comet.life++;
        const progress = comet.life / comet.maxLife;
        const fadeIn = Math.min(progress * 4, 1);
        const fadeOut = Math.max(1 - (progress - 0.7) / 0.3, 0);
        const alpha = Math.min(fadeIn, fadeOut) * 0.5;

        const cx = comet.x + Math.cos(comet.angle) * comet.speed * comet.life;
        const cy = comet.y + Math.sin(comet.angle) * comet.speed * comet.life;
        const tx = cx - Math.cos(comet.angle) * comet.length;
        const ty = cy - Math.sin(comet.angle) * comet.length;

        const grad = ctx.createLinearGradient(cx, cy, tx, ty);
        grad.addColorStop(0, `rgba(217, 70, 239, ${alpha})`);
        grad.addColorStop(0.3, `rgba(34, 211, 238, ${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(34, 211, 238, 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Head glow
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();

        if (comet.life >= comet.maxLife) comet.active = false;
      }

      // Geometry glyphs
      for (const g of glyphs) {
        g.x += g.vx;
        g.y += g.vy;
        g.rotation += g.rotSpeed;
        // Wrap around
        if (g.x < -20) g.x = w + 20;
        if (g.x > w + 20) g.x = -20;
        if (g.y < -20) g.y = h + 20;
        if (g.y > h + 20) g.y = -20;
        drawGlyph(g);
      }

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
