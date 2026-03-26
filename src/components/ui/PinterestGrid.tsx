"use client";

import { useEffect, useRef } from "react";

interface PinterestGridProps {
  boardSlug?: string;
  fallbackUrl?: string;
  title?: string;
  subtitle?: string;
}

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  fallbackUrl,
  subtitle = "Visual Reference Archive",
}: PinterestGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Build the Pinterest widget URL (their JS-free embed)
    const boardUrl = fallbackUrl || `https://www.pinterest.com/${boardSlug}/`;

    // Use Pinterest's official embed iframe
    const iframe = document.createElement("iframe");
    iframe.src = `https://assets.pinterest.com/ext/embed.html?boards=BOARD&url=${encodeURIComponent(boardUrl)}`;
    iframe.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      border: none; overflow: hidden;
    `;
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("title", `Pinterest: ${subtitle}`);
    iframe.setAttribute("scrolling", "yes");
    iframe.setAttribute("frameBorder", "0");

    containerRef.current.innerHTML = "";
    containerRef.current.style.position = "relative";
    containerRef.current.style.minHeight = "500px";
    containerRef.current.appendChild(iframe);
  }, [boardSlug, fallbackUrl, subtitle]);

  return (
    <div className="w-full">
      <div ref={containerRef} className="w-full" style={{ minHeight: "500px" }}>
        {/* Loading state — iframe loads asynchronously */}
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--ut-magenta)", borderTopColor: "transparent" }}
          />
        </div>
      </div>
      <div className="text-center mt-4">
        <a
          href={fallbackUrl || `https://www.pinterest.com/${boardSlug}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] tracking-widest uppercase"
          style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}
        >
          View all on Pinterest →
        </a>
      </div>
    </div>
  );
}
