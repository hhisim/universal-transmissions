"use client";

import { useRef, useEffect, useState } from "react";

interface LogoHeroProps {
  className?: string;
}

export function LogoHero({ className = "" }: LogoHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const mouseRef = useRef(mouse);
  const timeRef = useRef(0);
  const pulseTimeRef = useRef(-10);
  const particlesRef = useRef<Array<{
    x: number; y: number;
    vx: number; vy: number;
    life: number; hue: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let W = 0, H = 0;
    let animId: number;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas!.parentElement!;
      W = parent.clientWidth;
      H = Math.min(W * 0.75, 600);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function onMouseMove(e: MouseEvent) {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      mouseRef.current = { x, y };
      setMouse({ x, y });
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      const x = (t.clientX - r.left) / r.width;
      const y = (t.clientY - r.top) / r.height;
      mouseRef.current = { x, y };
      setMouse({ x, y });
    }
    function onPulse() {
      pulseTimeRef.current = timeRef.current;
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particlesRef.current.push({
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

    // ─── Load the real SVG logo ───────────────────────────
    const img = new window.Image();
    let svgLoaded = false;

    // We'll draw the SVG by rendering it to an offscreen canvas
    // after it loads. Use the actual /logo-white.svg path.
    const tmpCanvas = document.createElement("canvas");
    const tmpCtx = tmpCanvas.getContext("2d")!;

    img.onload = () => {
      svgLoaded = true;
    };
    img.src = "/logo-white.svg";

    // ─── Draw the real UT symbol path (from SVG data) ───
    // We parse the SVG path data directly so we don't depend
    // on the img loading cross-origin.
    // The three groups in logo-white.svg:
    // Group 1 (upper): circles + center circle + 6 dots + hexagon
    // Group 2 (left wing): similar
    // Group 3 (right wing): similar
    // Scale to a 200x200 coordinate system for drawing.

    type PathCmd = ["M" | "L" | "C" | "Z" | "A" | "m" | "l" | "c" | "a" | "s" | "S" | "h" | "v", ...number[]];

    function drawGroup(
      ctx: CanvasRenderingContext2D,
      cx: number, cy: number,
      scale: number,
      stroke: string,
      lineWidth: number,
      rotation: number,
      alpha: number
    ) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = alpha;

      // ── The logo-white.svg paths (converted from 0-1000 viewBox to -100 to +100)
      const s = scale;

      // Helper: execute SVG path commands on ctx
      function path(cmd: PathCmd) {
        switch (cmd[0]) {
          case "M": ctx.moveTo(cmd[1] * s, cmd[2] * s); break;
          case "L": ctx.lineTo(cmd[1] * s, cmd[2] * s); break;
          case "Z": ctx.closePath(); break;
          case "C": ctx.bezierCurveTo(cmd[1]*s,cmd[2]*s, cmd[3]*s,cmd[4]*s, cmd[5]*s,cmd[6]*s); break;
          case "m": ctx.moveTo((cmd[1]) * s, (cmd[2]) * s); break;
          case "l": ctx.lineTo((cmd[1]) * s, (cmd[2]) * s); break;
          case "Z": ctx.closePath(); break;
          default: break;
        }
      }

      // We hard-code the three-orb arrangement from the SVG.
      // The logo has three main circle-cluster groups arranged in a triangle,
      // connected by lines. Each group has: 1 large circle, 1 smaller circle,
      // a cluster of small dots, and connecting lines.

      // Since exact path parsing is complex, we render the SVG as an image.
      // Draw the loaded SVG onto tmpCanvas, then composite.
    }

    // Better approach: draw the SVG using the img element rendered
    // to an offscreen canvas, then composite.
    function renderSvgToCtx(
      targetCtx: CanvasRenderingContext2D,
      x: number, y: number,
      size: number,
      rotation: number,
      color: string,
      alpha: number,
      aberrationX: number,
      aberrationY: number
    ) {
      if (!svgLoaded) return;
      tmpCanvas.width = size;
      tmpCanvas.height = size;
      tmpCtx.clearRect(0, 0, size, size);
      tmpCtx.save();
      tmpCtx.translate(size / 2, size / 2);
      tmpCtx.rotate(rotation);
      tmpCtx.drawImage(img, -size / 2, -size / 2, size, size);
      tmpCtx.restore();

      // Tint with color using composite
      tmpCtx.save();
      tmpCtx.globalCompositeOperation = "source-in";
      tmpCtx.fillStyle = color;
      tmpCtx.fillRect(0, 0, size, size);
      tmpCtx.restore();

      targetCtx.save();
      targetCtx.globalAlpha = alpha;
      targetCtx.drawImage(tmpCanvas, x - aberrationX - size / 2, y - aberrationY - size / 2);
      targetCtx.restore();
    }

    function frame() {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const m = mouseRef.current;

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const logoSize = Math.min(W, H) * 0.55;

      const distX = (m.x - 0.5) * 2;
      const distY = (m.y - 0.5) * 2;
      const dist = Math.sqrt(distX * distX + distY * distY);
      const aberration = 3 + dist * 14;

      const rotation = t * 0.08;

      // Background
      ctx.fillStyle = "#050507";
      ctx.fillRect(0, 0, W, H);

      // Ambient glow
      const glowIntensity = 0.07 + dist * 0.04 + Math.sin(t * 0.5) * 0.02;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, logoSize * 0.9);
      grad.addColorStop(0, `rgba(147, 51, 234, ${glowIntensity})`);
      grad.addColorStop(0.4, `rgba(217, 70, 239, ${glowIntensity * 0.5})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Pulse ring
      const pulseAge = t - pulseTimeRef.current;
      if (pulseAge > 0 && pulseAge < 2.5) {
        const pr = pulseAge * Math.min(W, H) * 0.35;
        const pa = Math.max(0, 1 - pulseAge / 2.5);
        ctx.beginPath();
        ctx.arc(cx, cy, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(217, 70, 239, ${pa * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, pr * 0.8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${pa * 0.25})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        if (pulseAge < 0.3) {
          const fa = (1 - pulseAge / 0.3) * 0.3;
          const fGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, logoSize * 0.3);
          fGrad.addColorStop(0, `rgba(212, 168, 71, ${fa})`);
          fGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = fGrad;
          ctx.fillRect(0, 0, W, H);
        }
      }

      if (svgLoaded) {
        // Draw the real SVG logo — chromatic aberration layers
        ctx.globalCompositeOperation = "screen";

        // Magenta layer (aberrated toward cursor)
        renderSvgToCtx(ctx, cx - aberration * distX, cy - aberration * distY,
          logoSize, rotation, "rgba(217,70,239,0.9)", 0.4 + dist * 0.4, 0, 0);

        // Cyan layer (aberrated opposite)
        renderSvgToCtx(ctx, cx + aberration * distX, cy + aberration * distY,
          logoSize, rotation, "rgba(34,211,238,0.9)", 0.4 + dist * 0.4, 0, 0);

        // White center (no aberration)
        renderSvgToCtx(ctx, cx, cy,
          logoSize, rotation, "#f5f0ff", 0.85, 0, 0);

        ctx.globalCompositeOperation = "source-over";

        // Glow halo
        ctx.globalCompositeOperation = "screen";
        renderSvgToCtx(ctx, cx, cy,
          logoSize * 1.04, rotation, "rgba(217,70,239,1)", 0.07 + Math.sin(t * 1.5) * 0.03, 0, 0);
        ctx.globalCompositeOperation = "source-over";
      } else {
        // Fallback: draw placeholder circles while SVG loads
        ctx.globalCompositeOperation = "screen";
        const s = logoSize * 0.5;
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
          const ox = cx + Math.cos(angle) * s * 0.4;
          const oy = cy + Math.sin(angle) * s * 0.4;
          ctx.beginPath();
          ctx.arc(ox, oy, s * 0.3, 0, Math.PI * 2);
          ctx.strokeStyle = i === 0 ? "rgba(217,70,239,0.6)" : i === 1 ? "rgba(34,211,238,0.6)" : "rgba(212,168,71,0.6)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.15, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(237,233,254,0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }

      // 12 orbiting points
      const orbitRadius = logoSize * 0.58;
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12 + t * 0.12;
        const ox = cx + Math.cos(angle) * orbitRadius;
        const oy = cy + Math.sin(angle) * orbitRadius;
        const twinkle = 0.12 + Math.sin(t * 2.5 + i * 0.8) * 0.08;
        const pointSize = 1.5 + Math.sin(t * 1.5 + i) * 0.5;
        const colors = ["rgba(217,70,239," + twinkle + ")", "rgba(147,51,234," + twinkle + ")", "rgba(34,211,238," + twinkle + ")"];
        ctx.beginPath();
        ctx.arc(ox, oy, pointSize, 0, Math.PI * 2);
        ctx.fillStyle = colors[i % 3];
        ctx.fill();
      }

      // Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.98; p.vy *= 0.98;
        p.life -= 0.01;
        if (p.life <= 0) return false;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.life * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,65%,${p.life * 0.6})`;
        ctx.fill();
        return true;
      });

      // Scan line
      const scanY = (t * 35) % H;
      ctx.fillStyle = "rgba(217,70,239,0.012)";
      ctx.fillRect(0, scanY - 1, W, 2);

      // CRT lines
      for (let i = 0; i < H; i += 3) {
        ctx.fillStyle = "rgba(0,0,0,0.018)";
        ctx.fillRect(0, i, W, 1);
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
        style={{ color: "rgba(217,70,239,0.3)" }}
      >
        INTERACT WITH THE TRANSMISSION
      </div>
    </div>
  );
}
