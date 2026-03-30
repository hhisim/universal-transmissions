"use client";

import Script from "next/script";

interface PinterestGridProps {
  boardSlug?: string;
  title?: string;
  subtitle?: string;
}

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  title,
  subtitle,
}: PinterestGridProps) {
  const boardUrl = `https://www.pinterest.com/${boardSlug}/`;

  return (
    <div className="w-full">
      {title && (
        <div className="mb-6 text-center">
          <h2 className="font-heading text-2xl text-oracle-gold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-oracle-gold/60">{subtitle}</p>}
        </div>
      )}

      <a
        data-pin-do="embedBoard"
        data-pin-board-width="1400"
        data-pin-board-scale="1.6"
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
