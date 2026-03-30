"use client";

import { useEffect, useState } from "react";

interface PinterestPin {
  id: string;
  images: { "236x": { url: string }; "564x": { url: string } };
  link: string | null;
  description: string;
}

interface PinterestGridProps {
  boardSlug?: string;
  fallbackUrl?: string;
  title?: string;
  subtitle?: string;
}

// Pinterest boards have an RSS feed at this URL format
function getBoardRSSUrl(boardSlug: string): string {
  return `https://www.pinterest.com/${boardSlug}/feed.rss`;
}

// Map board slugs to their RSS-friendly usernames
const BOARD_USERNAME_MAP: Record<string, string> = {
  "hakanhisim/typography-symbols": "hakanhisim",
  "hakanhisim/frequencies": "hakanhisim",
  "hakanhisim/geometrika": "hakanhisim",
  "hakanhisim/inspired-esoterica": "hakanhisim",
  "hakanhisim/radiolaria": "hakanhisim",
  "hakanhisim/codex": "hakanhisim",
  "hakanhisim/astronomy": "hakanhisim",
};

function parseRSSFeed(xmlText: string): PinterestPin[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const items = doc.querySelectorAll("item");
    const pins: PinterestPin[] = [];

    items.forEach((item) => {
      const link = item.querySelector("link")?.textContent || "";
      const description = item.querySelector("description")?.textContent || "";

      // Extract image from media:content or enclosure
      const mediaContent = item.querySelector("media\\:content, content");
      const enclosure = item.querySelector("enclosure");

      let imageUrl = "";
      if (mediaContent?.getAttribute("url")) {
        imageUrl = mediaContent.getAttribute("url") || "";
      } else if (enclosure?.getAttribute("url")) {
        imageUrl = enclosure.getAttribute("url") || "";
      }

      if (!imageUrl && description) {
        // Try to extract from description HTML
        const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
        if (imgMatch) imageUrl = imgMatch[1];
      }

      if (imageUrl) {
        // Pinterest CDN images - convert to small sizes
        const largeUrl = imageUrl.replace(/\?.*$/, "");

        pins.push({
          id: link.split("/").pop() || Math.random().toString(),
          images: {
            "236x": { url: largeUrl + "?h=236&w=236&fit=crop" },
            "564x": { url: largeUrl + "?h=564&w=564&fit=crop" },
          },
          link,
          description: description.replace(/<[^>]+>/g, "").slice(0, 200),
        });
      }
    });

    return pins;
  } catch {
    return [];
  }
}

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  fallbackUrl,
  title,
  subtitle = "Visual Reference Archive",
}: PinterestGridProps) {
  const [pins, setPins] = useState<PinterestPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const boardUrl = fallbackUrl || `https://www.pinterest.com/${boardSlug}/`;

  useEffect(() => {
    setLoading(true);
    setError(false);

    const username = BOARD_USERNAME_MAP[boardSlug] || boardSlug.split("/")[0];
    const rssUrl = `https://www.pinterest.com/${username}/${boardSlug.split("/")[1]}/feed.rss`;

    fetch(rssUrl)
      .then((r) => {
        if (!r.ok) throw new Error("Feed not found");
        return r.text();
      })
      .then((xmlText) => {
        const parsed = parseRSSFeed(xmlText);
        if (parsed.length === 0) throw new Error("No pins found");
        setPins(parsed);
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
      <div className="columns-12 gap-2 space-y-2">
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
              src={pin.images["236x"]?.url}
              alt={pin.description || subtitle}
              className="w-full h-auto object-cover hover:opacity-80 transition-opacity duration-300"
              loading="lazy"
            />
          </a>
        ))}
      </div>
      <p
        className="font-mono text-[9px] text-center mt-6 tracking-widest uppercase"
        style={{ color: "var(--ut-white-dim)", opacity: 0.25 }}
      >
        {pins.length} images from this board
      </p>
    </div>
  );
}