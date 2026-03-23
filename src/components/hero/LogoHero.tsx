"use client";

import { useRef, useEffect, useCallback } from "react";

interface LogoHeroProps {
  className?: string;
}

export function LogoHero({ className = "" }: LogoHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = {
      mx: 0.5,
      my: 0.5,
      time: 0,
      pulseTime: -10,
      particles: [] as Array<{
        x: number; y: number;
        vx: number; vy: number;
        life: number; hue: number;
      }>,
      logoImg: null as HTMLImageElement | null,
      logoLoaded: false,
    };

    // Load white SVG logo
    const img = new window.Image();
    img.onload = () => {
      state.logoImg = img;
      state.logoLoaded = true;
    };
    img.src = "/logo-white.svg";

    let W = 0, H = 0;
    let animId: number;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas!.parentElement!;
      W = parent.clientWidth;
      H = Math.min(W * 0.75, 600);
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function onMouseMove(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect();
      state.mx = (e.clientX - r.left) / r.width;
      state.my = (e.clientY - r.top) / r.height;
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      const t = e.touches[0];
      const r = canvas!.getBoundingClientRect();
      state.mx = (t.clientX - r.left) / r.width;
      state.my = (t.clientY - r.top) / r.height;
    }
    function onPulse() {
      state.pulseTime = state.time;
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        state.particles.push({
          x: W / 2,
          y: H / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          hue: 280 + Math.random() * 100,
        });
      }
    }
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("click", onPulse);
    canvas.addEventListener("touchstart", onPulse);

    // Offscreen canvas for tinting
    const tintCanvas = document.createElement("canvas");
    const tintCtx = tintCanvas.getContext("2d")!;

    function drawTintedLogo(
      targetCtx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      x: number, y: number,
      size: number,
      rotation: number,
      color: string,
      alpha: number
    ) {
      tintCanvas.width = size;
      tintCanvas.height = size;
      tintCtx.clearRect(0, 0, size, size);
      tintCtx.save();
      tintCtx.translate(size / 2, size / 2);
      tintCtx.rotate(rotation);
      // Scale viewBox from 100x100 to size
      const scale = size / 100;
      tintCtx.scale(scale, scale);
      // Draw SVG at 100x100
      const svgBlob = new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${img.getAttribute("src")}</svg>`], { type: "image/svg+xml" });
      // Can't re-use img.crossOrigin easily — use direct SVG drawing instead
      // Instead draw the fixed geometry
      drawUTSymbol(tintCtx, 50, 50, 50, rotation, "#ffffff", 1);
      tintCtx.restore();

      tintCtx.globalCompositeOperation = "source-in";
      tintCtx.fillStyle = color;
      tintCtx.fillRect(0, 0, size, size);
      tintCtx.globalCompositeOperation = "source-over";

      targetCtx.save();
      targetCtx.globalAlpha = alpha;
      targetCtx.drawImage(tintCanvas, x - size / 2, y - size / 2, size, size);
      targetCtx.restore();
    }

    // Draw UT trinary symbol directly on a ctx
    function drawUTSymbol(
      targetCtx: CanvasRenderingContext2D,
      cx: number, cy: number, r: number,
      rotation: number,
      stroke: string,
      lineWidth: number,
      fill?: string
    ) {
      targetCtx.save();
      targetCtx.translate(cx, cy);
      targetCtx.rotate(rotation);
      // The original SVG: outer circles at cy=28 relative to 50,50
      // So they sit above center. Let's match the geometry.
      const sy = -22; // shift up so center of the circle arrangement is at 0,0
      targetCtx.strokeStyle = stroke;
      targetCtx.lineWidth = lineWidth;
      targetCtx.beginPath();
      // First circle
      targetCtx.arc(0, sy, r * 0.22, 0, Math.PI * 2);
      targetCtx.stroke();
      // Second circle rotated 60deg
      targetCtx.save();
      targetCtx.rotate((Math.PI / 3));
      targetCtx.beginPath();
      targetCtx.arc(0, sy, r * 0.22, 0, Math.PI * 2);
      targetCtx.stroke();
      targetCtx.restore();
      // Central circle
      targetCtx.beginPath();
      targetCtx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
      targetCtx.stroke();
      // Dots at 6 positions around
      const dotR = r * 0.22;
      const angles = [0, 60, 120, 180, 240, 300].map(a => (a - 90) * Math.PI / 180);
      angles.forEach((angle, i) => {
        const dx = Math.cos(angle) * dotR;
        const dy = Math.sin(angle) * dotR;
        targetCtx.beginPath();
        targetCtx.arc(dx, dy, r * 0.03, 0, Math.PI * 2);
        targetCtx.fillStyle = stroke;
        targetCtx.fill();
      });
      // Hexagon inner
      const hR = r * 0.24;
      targetCtx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 90) * Math.PI / 180;
        const px = Math.cos(angle) * hR;
        const py = Math.sin(angle) * hR;
        if (i === 0) targetCtx.moveTo(px, py);
        else targetCtx.lineTo(px, py);
      }
      targetCtx.closePath();
      targetCtx.stroke();
      targetCtx.restore();
    }

    function frame() {
      state.time += 0.016;
      ctx!.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const logoSize = Math.min(W, H) * 0.5;

      const distX = (state.mx - 0.5) * 2;
      const distY = (state.my - 0.5) * 2;
      const dist = Math.sqrt(distX * distX + distY * distY);
      const aberration = 3 + dist * 15;

      const rotation = state.time * 0.08;

      // Background
      ctx!.fillStyle = "#050507";
      ctx!.fillRect(0, 0, W, H);

      // Ambient glow
      const glowIntensity = 0.06 + dist * 0.04 + Math.sin(state.time * 0.5) * 0.02;
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, logoSize * 0.9);
      grad.addColorStop(0, `rgba(147, 51, 234, ${glowIntensity})`);
      grad.addColorStop(0.4, `rgba(217, 70, 239, ${glowIntensity * 0.5})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, W, H);

      // Pulse ring
      const pulseAge = state.time - state.pulseTime;
      if (pulseAge > 0 && pulseAge < 2.5) {
        const pulseRadius = pulseAge * Math.min(W, H) * 0.35;
        const pulseAlpha = Math.max(0, 1 - pulseAge / 2.5);
        ctx!.beginPath();
        ctx!.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(217, 70, 239, ${pulseAlpha * 0.4})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.arc(cx, cy, pulseRadius * 0.8, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(34, 211, 238, ${pulseAlpha * 0.25})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
        if (pulseAge < 0.3) {
          const flashAlpha = (1 - pulseAge / 0.3) * 0.3;
          const flashGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, logoSize * 0.3);
          flashGrad.addColorStop(0, `rgba(212, 168, 71, ${flashAlpha})`);
          flashGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx!.fillStyle = flashGrad;
          ctx!.fillRect(0, 0, W, H);
        }
      }

      // Logo — magenta layer (offset toward cursor)
      ctx!.globalCompositeOperation = "screen";
      const s = logoSize * 0.9;
      tintCanvas.width = s; tintCanvas.height = s;
      tintCtx.clearRect(0, 0, s, s);
      drawUTSymbol(tintCtx, s/2, s/2, s/2, rotation, "#ffffff", 1.5);
      tintCtx.globalCompositeOperation = "source-in";
      tintCtx.fillStyle = `rgba(217, 70, 239, ${0.35 + dist * 0.35})`;
      tintCtx.fillRect(0, 0, s, s);
      tintCtx.globalCompositeOperation = "source-over";
      ctx!.globalAlpha = 1;
      ctx!.drawImage(tintCanvas, cx - aberration * distX - s/2, cy - aberration * distY - s/2);

      // Logo — cyan layer (offset opposite)
      tintCtx.clearRect(0, 0, s, s);
      drawUTSymbol(tintCtx, s/2, s/2, s/2, rotation, "#ffffff", 1.5);
      tintCtx.globalCompositeOperation = "source-in";
      tintCtx.fillStyle = `rgba(34, 211, 238, ${0.35 + dist * 0.35})`;
      tintCtx.fillRect(0, 0, s, s);
      tintCtx.globalCompositeOperation = "source-over";
      ctx!.drawImage(tintCanvas, cx + aberration * distX - s/2, cy + aberration * distY - s/2);

      // Logo — white center
      tintCtx.clearRect(0, 0, s, s);
      drawUTSymbol(tintCtx, s/2, s/2, s/2, rotation, "#ede9f6", 1.5);
      tintCtx.globalCompositeOperation = "source-in";
      tintCtx.fillStyle = "#ede9f6";
      tintCtx.fillRect(0, 0, s, s);
      tintCtx.globalCompositeOperation = "source-over";
      ctx!.globalAlpha = 0.85;
      ctx!.drawImage(tintCanvas, cx - s/2, cy - s/2);
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";

      // Glow halo
      ctx!.globalCompositeOperation = "screen";
      tintCtx.clearRect(0, 0, s, s);
      drawUTSymbol(tintCtx, s/2, s/2, s/2 * 1.02, rotation, "#d946ef", 1.5);
      tintCtx.globalCompositeOperation = "source-in";
      tintCtx.fillStyle = `rgba(217, 70, 239, ${0.08 + Math.sin(state.time * 1.5) * 0.04})`;
      tintCtx.fillRect(0, 0, s, s);
      tintCtx.globalCompositeOperation = "source-over";
      ctx!.drawImage(tintCanvas, cx - s/2, cy - s/2);
      ctx!.globalCompositeOperation = "source-over";

      // 12 orbiting points
      const orbitRadius = logoSize * 0.58;
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12 + state.time * 0.12;
        const ox = cx + Math.cos(angle) * orbitRadius;
        const oy = cy + Math.sin(angle) * orbitRadius;
        const twinkle = 0.12 + Math.sin(state.time * 2.5 + i * 0.8) * 0.08;
        const pointSize = 1.5 + Math.sin(state.time * 1.5 + i) * 0.5;
        const colors = [
          `rgba(217, 70, 239, ${twinkle})`,
          `rgba(147, 51, 234, ${twinkle})`,
          `rgba(34, 211, 238, ${twinkle})`,
        ];
        ctx!.beginPath();
        ctx!.arc(ox, oy, pointSize, 0, Math.PI * 2);
        ctx!.fillStyle = colors[i % 3];
        ctx!.fill();
      }

      // Particles
      state.particles = state.particles.filter((p) => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.98; p.vy *= 0.98;
        p.life -= 0.01;
        if (p.life <= 0) return false;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.life * 3, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.life * 0.6})`;
        ctx!.fill();
        return true;
      });

      // Scan line
      const scanY = (state.time * 35) % H;
      ctx!.fillStyle = "rgba(217, 70, 239, 0.012)";
      ctx!.fillRect(0, scanY - 1, W, 2);

      // CRT lines
      for (let i = 0; i < H; i += 3) {
        ctx!.fillStyle = "rgba(0, 0, 0, 0.018)";
        ctx!.fillRect(0, i, W, 1);
      }

      animId = requestAnimationFrame(frame);
    }

    frame();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("click", onPulse);
      canvas.removeEventListener("touchstart", onPulse);
    };
  }, []);

  return (
    <div className={`relative w-full ${className}`}>
      <canvas ref={canvasRef} className="block w-full cursor-crosshair" />
      <div
        className="absolute bottom-4 left-0 right-0 text-center font-mono text-[10px] tracking-[0.2em] pointer-events-none"
        style={{ color: "rgba(217, 70, 239, 0.3)" }}
      >
        INTERACT WITH THE TRANSMISSION
      </div>
    </div>
  );
}
