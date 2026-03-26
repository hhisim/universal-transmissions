"use client";

import { useEffect, useState } from "react";

interface Pin {
  id: string;
  images: {
    "236x": { width: number; height: number; url: string };
    "564x": { width: number; height: number; url: string };
  };
  link: string | null;
  description: string;
}

interface BoardData {
  pins: Pin[];
}

interface PinterestGridProps {
  boardSlug?: string;   // e.g. "hakanhisim/typography-symbols"
  fallbackUrl?: string; // e.g. "https://www.pinterest.com/hakanhisim/typography-symbols/"
  title?: string;
  subtitle?: string;
}

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  fallbackUrl,
  title = "Visual Reference Archive",
  subtitle = "Typography & Symbols",
}: PinterestGridProps) {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://api.pinterest.com/v3/pidgets/boards/${boardSlug}/pins/`)
      .then((r) => r.json())
      .then((data: BoardData) => {
        setPins(data.pins || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [boardSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--ut-cyan, var(--ut-magenta))", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const defaultFallback = fallbackUrl || `https://www.pinterest.com/${boardSlug}/`;

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
      {pins.map((pin) => (
        <a
          key={pin.id}
          href={pin.link || defaultFallback}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden break-inside-avoid rounded-sm"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          <img
            src={pin.images["564x"]?.url || pin.images["236x"]?.url}
            alt={pin.description || subtitle}
            className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
