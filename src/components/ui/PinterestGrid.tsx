"use client";

import { useEffect, useState } from "react";

interface PinterestPin {
  id: string;
  images: { "564x": { url: string }; "236x": { url: string } };
  link: string | null;
  description: string;
}

interface PinterestGridProps {
  boardSlug?: string;
  fallbackUrl?: string;
  subtitle?: string;
}

// Pinterest's unauthenticated widget API
const PINTEREST_WIDGET = (slug: string) =>
  `https://api.pinterest.com/v3/pidgets/boards/${slug}/pins/`;

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  fallbackUrl = `https://www.pinterest.com/${boardSlug}/`,
  subtitle = "Visual Reference Archive",
}: PinterestGridProps) {
  const [pins, setPins] = useState<PinterestPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(PINTEREST_WIDGET(boardSlug))
      .then((r) => r.json())
      .then((data: { data?: { pins?: PinterestPin[] } }) => {
        const pins = data?.data?.pins ?? [];
        setPins(pins);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [boardSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--ut-magenta)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (error || pins.length === 0) {
    return (
      <div className="text-center py-12">
        <p
          className="font-mono text-[10px] tracking-widest uppercase mb-4"
          style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}
        >
          {error ? "Board unavailable" : "No pins found"}
        </p>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] tracking-widest uppercase"
          style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}
        >
          View on Pinterest →
        </a>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Masonry-style image grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {pins.map((pin) => (
          <a
            key={pin.id}
            href={pin.link || fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden break-inside-avoid rounded-sm"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
            <img
              src={pin.images["564x"]?.url || pin.images["236x"]?.url}
              alt={pin.description || subtitle}
              className="w-full h-auto object-cover hover:opacity-80 transition-opacity duration-300"
              loading="lazy"
            />
          </a>
        ))}
      </div>

      <div className="text-center mt-6">
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] tracking-widest uppercase hover:opacity-70 transition-opacity"
          style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}
        >
          View all on Pinterest →
        </a>
      </div>
    </div>
  );
}
