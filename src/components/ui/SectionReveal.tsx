"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export default function SectionReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const getInitial = () => {
    if (direction === "none") return { opacity: 0 };
    const base = { opacity: 0 };
    if (direction === "up" || direction === "down") return { ...base, y: direction === "up" ? 40 : -40 };
    if (direction === "left" || direction === "right") return { ...base, x: direction === "left" ? 40 : -40 };
    return base;
  };

  return (
    <motion.div
      ref={ref}
      initial={getInitial()}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : getInitial()}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
