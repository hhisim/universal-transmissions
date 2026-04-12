"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Mode {
  id: string;
  label: Record<string, string>;
  icon: string;
  c: string;
}

interface OrbitalModesProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
  lang: string;
  modes: Mode[];
}

export default function OrbitalModes({ currentMode, onModeChange, lang, modes }: OrbitalModesProps) {
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left - rect.width / 2) / 20,
          y: (e.clientY - rect.top - rect.height / 2) / 20,
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const radius = 140;
  const angleStep = (2 * Math.PI) / modes.length;

  return (
    <div 
      ref={containerRef}
      className="relative h-80 w-full flex items-center justify-center"
      style={{ perspective: "1000px" }}
    >
      {/* Central core */}
      <motion.div
        className="absolute w-24 h-24 rounded-full flex items-center justify-center z-10"
        style={{
          background: `radial-gradient(circle, ${modes.find(m => m.id === currentMode)?.c}40 0%, transparent 70%)`,
          boxShadow: `0 0 60px ${modes.find(m => m.id === currentMode)?.c}60`,
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: 360,
        }}
        transition={{
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
        }}
      >
        <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
          {modes.find(m => m.id === currentMode)?.icon}
        </span>
      </motion.div>

      {/* Orbital rings */}
      <div 
        className="absolute w-64 h-64 rounded-full border border-white/5"
        style={{
          transform: `rotateX(60deg) rotateZ(${mousePos.x}deg)`,
          transition: "transform 0.3s ease-out",
        }}
      />
      <div 
        className="absolute w-96 h-96 rounded-full border border-white/5"
        style={{
          transform: `rotateX(60deg) rotateZ(${-mousePos.x * 0.5}deg)`,
          transition: "transform 0.3s ease-out",
        }}
      />

      {/* Mode satellites */}
      {modes.map((mode, index) => {
        const angle = angleStep * index - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.6;
        
        const isActive = currentMode === mode.id;
        const isHovered = hoveredMode === mode.id;

        return (
          <motion.button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            onMouseEnter={() => setHoveredMode(mode.id)}
            onMouseLeave={() => setHoveredMode(null)}
            className="absolute flex flex-col items-center gap-2 group"
            style={{
              x,
              y,
              z: isActive ? 20 : 0,
            }}
            whileHover={{ scale: 1.2, z: 30 }}
            animate={{
              scale: isActive ? 1.1 : 1,
              filter: isActive ? `drop-shadow(0 0 20px ${mode.c})` : "none",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300"
              style={{
                borderColor: isActive ? mode.c : "rgba(255,255,255,0.1)",
                background: isActive ? `${mode.c}20` : "rgba(0,0,0,0.5)",
                boxShadow: isHovered ? `0 0 30px ${mode.c}60` : "none",
              }}
            >
              <span style={{ color: mode.c }}>{mode.icon}</span>
            </div>
            
            <motion.span
              className="text-[10px] uppercase tracking-widest font-mono whitespace-nowrap"
              style={{ color: isActive ? mode.c : "rgba(255,255,255,0.5)" }}
              animate={{ opacity: isActive || isHovered ? 1 : 0.6 }}
            >
              {mode.label[lang] || mode.label.en}
            </motion.span>

            {/* Connection line to center */}
            <svg
              className="absolute pointer-events-none"
              style={{
                width: `${Math.abs(x) * 2}px`,
                height: `${Math.abs(y) * 2}px`,
                left: x > 0 ? -Math.abs(x) : x,
                top: y > 0 ? -Math.abs(y) : y,
                opacity: isActive ? 0.3 : 0,
                transition: "opacity 0.3s",
              }}
            >
              <line
                x1={x > 0 ? 0 : Math.abs(x) * 2}
                y1={y > 0 ? 0 : Math.abs(y) * 2}
                x2={x > 0 ? Math.abs(x) * 2 : 0}
                y2={y > 0 ? Math.abs(y) * 2 : 0}
                stroke={mode.c}
                strokeWidth="1"
                strokeDasharray="4 4"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="8"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </line>
            </svg>
          </motion.button>
        );
      })}

      {/* Tooltip for hovered mode */}
      <AnimatePresence>
        {hoveredMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 text-center max-w-xs"
          >
            <p className="text-xs text-white/60 font-mono">
              {getModeDescription(hoveredMode)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getModeDescription(mode: string): string {
  const descs: Record<string, string> = {
    oracle: "Direct transmission from the Codex",
    decipher: "Decode specific page meanings",
    tarot_arcana: "Connect to Tarot archetypes",
    ginabul: "Sumerian Gina'abul language decoding",
    etymology: "Letter-by-letter energetic analysis",
    correspondence: "Sacred correspondences web",
    meditation: "Guided contemplative practices",
    seeker: "Guidance for new seekers",
    quote: "Fragments and transmissions",
  };
  return descs[mode] || "";
}
