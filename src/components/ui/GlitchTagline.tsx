"use client";

import { useState, useEffect } from "react";

const texts = [
  "Decoding the source code of reality // one transmission at a time",
  "Language is a code that yearns to be hacked",
];

export default function GlitchTagline() {
  const [index, setIndex] = useState(0);
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitching(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % texts.length);
        setGlitching(false);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className="font-body text-base md:text-lg italic mb-8 relative"
      style={{ color: "var(--ut-gold)" }}
    >
      <span
        style={{
          display: "inline-block",
          animation: glitching ? "glitch-flip 0.3s ease" : "none",
        }}
      >
        {texts[index]}
      </span>
      <style jsx>{`
        @keyframes glitch-flip {
          0% { opacity: 1; transform: skewX(0deg); }
          20% { opacity: 0.3; transform: skewX(-5deg) translateX(-2px); filter: hue-rotate(90deg); }
          40% { opacity: 0.8; transform: skewX(3deg) translateX(2px); color: var(--ut-magenta); }
          60% { opacity: 0.4; transform: skewX(-2deg); filter: hue-rotate(-90deg); }
          80% { opacity: 0.9; transform: skewX(1deg); color: var(--ut-cyan); }
          100% { opacity: 1; transform: skewX(0deg); filter: none; }
        }
      `}</style>
    </p>
  );
}
