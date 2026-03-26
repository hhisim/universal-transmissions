"use client";

import Script from "next/script";
import { useRef } from "react";

interface PinterestGridProps {
  boardSlug?: string;
  fallbackUrl?: string;
  title?: string;
  subtitle?: string;
}

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  fallbackUrl,
}: PinterestGridProps) {
  const boardUrl = fallbackUrl || `https://www.pinterest.com/${boardSlug}/`;
  const containerRef = useRef<HTMLDivElement>(null);

  // Pinterest official embed — data-pin-board-scale controls image size
  // 1 = smallest (most columns), higher = larger images
  return (
    <div ref={containerRef} className="w-full">
      <a
        data-pin-do="embedBoard"
        data-pin-board-width="1400"
        data-pin-board-scale="1"
        href={boardUrl}
      />
      <Script
        async
        defer
        strategy="lazyOnload"
        src="//assets.pinterest.com/js/pinit.js"
      />
    </div>
  );
}
