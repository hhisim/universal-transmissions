"use client";

import { useRef, useEffect, useState } from "react";

export function LogoHero({ className = "" }: LogoHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [pulse, setPulse] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const timeRef = useRef<number>(0);
  const pulseTimeRef = useRef<number>(0);
  const [pulseAge, setPulseAge] = useState(0);

  useEffect(() => {
    let rafId: number;
    let lastPulseTime = 0;

    function tick() {
      timeRef.current += 0.016;
      setRotation(timeRef.current * 0.08);

      // Update pulse age for ring animation
      if (pulse) {
        const age = timeRef.current - pulseTimeRef.current;
        setPulseAge(age);
      } else {
        setPulseAge(0);
      }

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [pulse]);

  useEffect(() => {
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
      e.preventDefault();
      const t = e.touches[0];
      const parent = containerRef.current;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      setMouse({ x: (t.clientX - r.left) / r.width, y: (t.clientY - r.top) / r.height });
    }
    function onClick() {
      pulseTimeRef.current = timeRef.current;
      setPulse(true);
      setTimeout(() => setPulse(false), 2500);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("click", onClick);
    window.addEventListener("touchstart", onClick);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onClick);
    };
  }, []);

  // Normalised distance from centre 0–1
  const distX = (mouse.x - 0.5) * 2;
  const distY = (mouse.y - 0.5) * 2;
  const dist = Math.sqrt(distX * distX + distY * distY);
  const aberration = Math.min(2 + dist * 12, 20);
  const rotDeg = (rotation * 180) / Math.PI;

  // Pulse ring opacity/scale driven by pulseAge
  const pulseScale = 60 + pulseAge * 300;
  const pulseOpacity = Math.max(0, 0.6 - pulseAge * 0.22);
  const showPulseRing = pulse && pulseAge > 0 && pulseAge < 2.5;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden cursor-crosshair ${className}`}
      style={{ height: "75vh", minHeight: 400, background: "#050507" }}
    >
      {/* SVG colour-matrix tint filters */}
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

      {/* Ambient glow */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(147,51,234,${0.05 + dist * 0.03}) 0%, transparent 70%)`,
        }}
      />

      {/* Pulse ring — scales + fades */}
      {showPulseRing && (
        <div
          className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
          style={{
            width: pulseScale,
            height: pulseScale,
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(217,70,239,0.6)",
            opacity: pulseOpacity,
          }}
        />
      )}

      {/* LOGO — 3-layer chromatic aberration stack, all rotating together */}
      <div
        className="absolute flex items-center justify-center"
        style={{ inset: 0 }}
      >
        {/* Shared rotation wrapper — all 3 layers rotate as one */}
        <div
          className="relative"
          style={{
            width: "58%",
            maxWidth: 540,
            aspectRatio: "1",
            // Rotate the whole group
            transform: `rotate(${rotDeg}deg)`,
          }}
        >
          {/* MAGENTA layer — offset opposite to cursor direction */}
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

          {/* CYAN layer — offset toward cursor direction */}
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

          {/* WHITE centre — no offset, rotates with the group */}
          <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.92 }}>
            <img src="/logo-white.svg" alt="" className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* 12 orbiting dots — rotate with logo via same rotDeg */}
      <OrbitingDots rotation={rotDeg} />

      {/* Scan line — travels down the screen */}
      <div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.12), transparent)",
          top: `${((timeRef.current * 35) % 100)}%`,
        }}
      />

      {/* CRT scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 3px)",
        }}
      />

      {/* Hint text */}
      <div
        className="absolute bottom-8 left-0 right-0 text-center font-mono tracking-[0.25em] pointer-events-none select-none"
        style={{ fontSize: "9px", color: "rgba(217,70,239,0.2)" }}
      >
        INTERACT WITH THE TRANSMISSION
      </div>
    </div>
  );
}

interface LogoHeroProps {
  className?: string;
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
          // Orbit dots also rotate with the logo
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
                // Each dot orbits in its own CSS animation
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
