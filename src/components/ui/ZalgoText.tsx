"use client";

import { useMemo } from "react";

/* ────────────────────────────────────────────────────────────
   ZalgoText — corrupts text with combining diacritical marks
   ──────────────────────────────────────────────────────────── */

const ZALGO_UP = [
  "\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0305", "\u0306", "\u0307",
  "\u0308", "\u0309", "\u030A", "\u030B", "\u030C", "\u030D", "\u030E", "\u030F",
  "\u0310", "\u0311", "\u0312", "\u0313", "\u0314", "\u0315", "\u031A",
];

const ZALGO_DOWN = [
  "\u0316", "\u0317", "\u0318", "\u0319", "\u031C", "\u031D", "\u031E", "\u031F",
  "\u0320", "\u0321", "\u0322", "\u0323", "\u0324", "\u0325", "\u0326", "\u0327",
  "\u0328", "\u0329", "\u032A", "\u032B", "\u032C", "\u032D", "\u032E", "\u032F",
  "\u0330", "\u0331", "\u0332", "\u0333",
];

const ZALGO_MID = [
  "\u0323", "\u0334", "\u0335", "\u0336", "\u0337", "\u0338",
  "\u0339", "\u033A", "\u033B", "\u033C", "\u033D", "\u033E", "\u033F",
  "\u0340", "\u0341", "\u0342", "\u0343", "\u0344", "\u0345", "\u0346",
];

type Intensity = "subtle" | "moderate" | "heavy";

function randomOf(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function zalgofy(char: string, intensity: Intensity): string {
  if (char === " ") return char;

  const counts: Record<Intensity, { up: number; down: number; mid: number }> = {
    subtle: { up: 1, down: 0, mid: 0 },
    moderate: { up: 2, down: 1, mid: 1 },
    heavy: { up: 4, down: 3, mid: 2 },
  };

  const { up, down, mid } = counts[intensity];
  let result = "";

  for (let i = 0; i < up; i++) result += randomOf(ZALGO_UP);
  for (let i = 0; i < mid; i++) result += randomOf(ZALGO_MID);
  result += char;
  for (let i = 0; i < down; i++) result += randomOf(ZALGO_DOWN);

  return result;
}

interface ZalgoTextProps {
  text: string;
  intensity?: Intensity;
  className?: string;
  animate?: boolean;
}

export default function ZalgoText({
  text,
  intensity = "moderate",
  className = "",
  animate = false,
}: ZalgoTextProps) {
  const zalgod = useMemo(
    () =>
      text
        .split("")
        .map((char) => zalgofy(char, intensity))
        .join(""),
    [text, intensity]
  );

  if (animate) {
    return (
      <span className={`zalgo-animate ${className}`} data-text={text}>
        {zalgod}
      </span>
    );
  }

  return (
    <span className={className} aria-label={text}>
      {zalgod}
    </span>
  );
}
