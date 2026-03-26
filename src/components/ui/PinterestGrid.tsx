"use client";

import { useEffect } from "react";

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
  const boardUrl = fallbackUrl || `https://www.pinterest.com/${boardSlug}/`;
  const [username, board] = boardSlug.split("/");

  useEffect(() => {
    // Load Pinterest's official widget embed script
    if (document.getElementById("pinterest-widget-lib")) return;

    const script = document.createElement("script");
    script.id = "pinterest-widget-lib";
    script.src = "//assets.pinterest.com/js/pinit.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [boardSlug]);

  return (
    <div className="w-full">
      {/* Pinterest official embed — works with pinit.js */}
      <a
        data-pin-do="embedBoard"
        dataPinBoard={board}
        dataPin-user={username}
        href={boardUrl}
        rel="noopener noreferrer"
        style={{ display: "block" }}
      >
        {/* Hidden fallback — Pinterest's JS will replace this */}
        <img
          src={`https://assets.pinterest.com/images/PinAutoPlayVideoAuga.png`}
          alt={`View ${subtitle} on Pinterest`}
          loading="lazy"
          style={{ display: "none" }}
        />
      </a>
      <div className="text-center mt-4">
        <a
          href={boardUrl}
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
