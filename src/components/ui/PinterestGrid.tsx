"use client";

import { useEffect, useRef, useState } from "react";

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
  title?: string;
  subtitle?: string;
}

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  title,
  subtitle,
}: PinterestGridProps) {
  const [pins, setPins] = useState<PinterestPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPins() {
      try {
        const res = await fetch(`/api/pinterest-board?board=${encodeURIComponent(boardSlug)}`);
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        setPins(data.pins || []);
      } catch (err) {
        setError("Could not load images.");
        console.error("PinterestGrid:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPins();
  }, [boardSlug]);

  // Distribute pins across N columns for masonry effect
  const columnCount = 3;
  const columns: PinterestPin[][] = Array.from({ length: columnCount }, () => []);
  pins.forEach((pin, i) => {
    columns[i % columnCount].push(pin);
  });

  return (
    <div ref={containerRef} className="w-full">
      {title && (
        <div className="mb-6 text-center">
          {title && <h2 className="font-heading text-2xl text-oracle-gold">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-oracle-gold/60">{subtitle}</p>}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-oracle-gold/50">
          <span>Loading images...</span>
        </div>
      )}

      {error && !loading && (
        <div className="py-12 text-center text-oracle-gold/60 text-sm">{error}</div>
      )}

      {!loading && !error && pins.length === 0 && (
        <div className="py-12 text-center text-oracle-gold/60 text-sm">No images found.</div>
      )}

      {!loading && !error && pins.length > 0 && (
        <div className="flex gap-3">
          {columns.map((col, ci) => (
            <div key={ci} className="flex-1 flex flex-col gap-3">
              {col.map((pin) => {
                const img = pin.images["564x"] || pin.images["236x"];
                if (!img?.url) return null;
                return (
                  <a
                    key={pin.id}
                    href={pin.link || `#`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-sm"
                    title={pin.description || ""}
                  >
                    <img
                      src={img.url}
                      alt={pin.description || "Pinterest image"}
                      className="w-full h-auto object-cover hover:opacity-80 transition-opacity duration-300"
                      loading="lazy"
                    />
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
