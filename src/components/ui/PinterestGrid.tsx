"use client";

import { useEffect, useState } from "react";

interface PinterestPin {
  id: string;
  images: {
    "236x": { width: number; height: number; url: string };
    "564x": { width: number; height: number; url: string };
  };
  link: string | null;
  description: string;
}

interface PinterestGridProps {
  boardSlug?: string;
  fallbackUrl?: string;
  subtitle?: string;
}

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  fallbackUrl,
  subtitle = "Visual Reference Archive",
}: PinterestGridProps) {
  const [pins, setPins] = useState<PinterestPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const boardUrl = fallbackUrl || `https://www.pinterest.com/${boardSlug}/`;

  useEffect(() => {
    setLoading(true);
    setError(false);

    fetch(`/api/pinterest-board?board=${encodeURIComponent(boardSlug)}`)
      .then((r) => r.json())
      .then((data: { pins?: PinterestPin[]; error?: string }) => {
        if (data.error) {
          setError(true);
        } else {
          setPins(data.pins ?? []);
        }
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
          Board unavailable
        </p>
        <a
          href={boardUrl}
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
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {pins.map((pin) => (
          <a
            key={pin.id}
            href={pin.link || boardUrl}
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
          href={boardUrl}
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
