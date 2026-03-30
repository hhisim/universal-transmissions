"use client";

import { useEffect, useState } from "react";

interface PinterestGridProps {
  boardSlug?: string;
  title?: string;
  subtitle?: string;
}

// Board configurations mapped by board slug
const BOARD_CONFIG: Record<string, { username: string; board: string }> = {
  "hakanhisim/typography-symbols": { username: "hakanhisim", board: "typography-symbols" },
  "hakanhisim/frequencies": { username: "hakanhisim", board: "frequencies" },
  "hakanhisim/geometrika": { username: "hakanhisim", board: "geometrika" },
  "hakanhisim/inspired-esoterica": { username: "hakanhisim", board: "inspired-esoterica" },
};

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  title,
  subtitle,
}: PinterestGridProps) {
  const [images, setImages] = useState<{ src: string; link: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const config = BOARD_CONFIG[boardSlug] ?? { username: "hakanhisim", board: boardSlug };

  useEffect(() => {
    const rssUrl = `https://www.pinterest.com/${config.username}/${config.board}.rss`;
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== "ok" || !data.items) throw new Error();
        const imgs = data.items
          .map((item: { description: string; link: string }) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(item.description, "text/html");
            const img = doc.querySelector("img");
            return img?.src ? { src: img.src, link: item.link } : null;
          })
          .filter(Boolean) as { src: string; link: string }[];
        setImages(imgs);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [boardSlug]);

  return (
    <div className="w-full">
      {title && (
        <div className="mb-6 text-center">
          <h2 className="font-heading text-2xl text-oracle-gold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-oracle-gold/60">{subtitle}</p>}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-oracle-gold/40 font-mono text-sm">
          Loading...
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-400 text-sm">
          Unable to load board.{" "}
          <a
            href={`https://www.pinterest.com/${config.username}/${config.board}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            View on Pinterest
          </a>
        </div>
      )}

      {!loading && !error && (
        <div
          className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4"
          style={{ columnFill: "auto" }}
        >
          {images.map((img, idx) => (
            <a
              key={idx}
              href={img.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-inside-avoid overflow-hidden rounded-lg transition-transform duration-300 hover:-translate-y-1"
            >
              <img
                src={img.src}
                alt=""
                loading="lazy"
                className="w-full h-auto object-cover rounded-lg"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
