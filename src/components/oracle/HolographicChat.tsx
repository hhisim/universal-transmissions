"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface HolographicChatProps {
  children: React.ReactNode;
  modeColor: string;
}

export default function HolographicChat({ children, modeColor }: HolographicChatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springConfig = { damping: 20, stiffness: 300 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), springConfig);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const [scanline, setScanline] = useState(0);
  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame = (frame + 1) % 100;
      setScanline(frame);
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); x.set(0); y.set(0); }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      className="relative"
    >
      {/* Holographic border glow */}
      <div 
        className="absolute -inset-[1px] rounded-lg opacity-50 blur-sm"
        style={{
          background: `linear-gradient(45deg, ${modeColor}22, transparent, ${modeColor}44, transparent)`,
          animation: "holoRotate 4s linear infinite",
        }}
      />
      
      {/* Main container */}
      <div 
        className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden"
        style={{
          boxShadow: `
            0 0 40px ${modeColor}10,
            inset 0 0 40px ${modeColor}05,
            0 20px 60px rgba(0,0,0,0.8)
          `,
        }}
      >
        {/* Scanlines */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 opacity-20"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              ${modeColor}10 2px,
              ${modeColor}10 4px
            )`,
            backgroundPosition: `0 ${scanline}%`,
            transition: "background-position 0.1s linear",
          }}
        />
        
        {/* Chromatic aberration on edges */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 mix-blend-screen opacity-30"
          style={{
            background: `
              linear-gradient(90deg, ${modeColor}20 0%, transparent 10%, transparent 90%, ${modeColor}20 100%),
              linear-gradient(0deg, ${modeColor}10 0%, transparent 10%, transparent 90%, ${modeColor}10 100%)
            `,
          }}
        />
        
        {/* Content */}
        <div className="relative z-20">
          {children}
        </div>
      </div>
      
      {/* Floating particles around container */}
      {isHovered && <AmbientParticles color={modeColor} />}
    </motion.div>
  );
}

function AmbientParticles({ color }: { color: string }) {
  return (
    <div className="absolute -inset-20 pointer-events-none overflow-visible">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 10px ${color}`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}
