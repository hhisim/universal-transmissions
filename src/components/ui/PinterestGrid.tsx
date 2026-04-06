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
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`;
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=20`;

    // Try codetabs proxy (full RSS with CORS support)
    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error("proxy failed");
        return res.text();
      })
      .then((xml) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "application/xml");
        const parseError = doc.querySelector("parsererror");
        if (parseError) throw new Error("xml parse error");
        const items = doc.querySelectorAll("item");
        if (items.length === 0) throw new Error("no items");
        const imgs: { src: string; link: string }[] = [];
        items.forEach((item) => {
          const description = item.querySelector("description")?.textContent ?? "";
          const link = item.querySelector("link")?.textContent ?? "";
          const imgDoc = new DOMParser().parseFromString(description, "text/html");
          const img = imgDoc.querySelector("img");
          if (img?.src) imgs.push({ src: img.src, link });
        });
        setImages(imgs);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to rss2json if proxy fails (limited to 10 items)
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
            href={`https://tr.pinterest.com/${config.username}/${config.board}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            View on Pinterest
          </a>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {images.map((img, idx) => (
            <a
              key={idx}
              href={img.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-md transition-transform duration-300 hover:-translate-y-1"
            >
              <img
                src={img.src}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover rounded-md"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
