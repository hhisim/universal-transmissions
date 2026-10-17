"use client";

/**
 * CodexVideoCard — Batch 31.
 *
 * The presented page mounted thirteen YouTube iframes as it loaded: measured on production that
 * was 13 frames, 13 third-party requests and about 610 KB of the page's transfer, all of it for
 * videos a visitor may never play. The brief asks that media remain opt-in, so the frame is not
 * mounted until the visitor asks for it.
 *
 * Each gate now carries a still from its own video, served from this site: the images were taken
 * once and saved under `public/codex/video/`, so thirteen distinguishable frames cost the page no
 * third-party request and no player. The gate is a real control, reachable by keyboard, with a
 * visible focus ring, and it is replaced the moment the frame takes its place.
 */

import { useState } from "react";
import Image from "next/image";

interface CodexVideoCardProps {
  youtubeId: string;
  title: string;
  description: string;
  index: number;
  total: number;
}

export default function CodexVideoCard({
  youtubeId,
  title,
  description,
  index,
  total,
}: CodexVideoCardProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className="video-card relative overflow-hidden rounded"
      data-codex-video={youtubeId}
      data-video-state={playing ? "playing" : "gated"}
      style={{ background: "var(--ut-black)", border: "1px solid rgba(212,168,71,0.12)" }}
    >
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            style={{ border: 0 }}
          />
        ) : (
          <button
            type="button"
            className="ut-video-gate"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
            data-video-gate={youtubeId}
          >
            <Image
              src={`/codex/video/${youtubeId}.jpg`}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="ut-video-still"
              data-video-still={youtubeId}
            />
            <span className="ut-video-scrim" aria-hidden="true" />
            <span className="ut-video-gate-inner">
              <span className="ut-video-gate-mark" aria-hidden="true">
                ▶
              </span>
              <span className="ut-video-gate-label">Play</span>
            </span>
          </button>
        )}
      </div>

      <div className="p-5">
        <p
          className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
          style={{ color: "var(--ut-gold)", opacity: 0.6 }}
        >
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
        <h3 className="font-heading text-sm tracking-[0.1em] uppercase mb-2" style={{ color: "var(--ut-white)" }}>
          {title}
        </h3>
        <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
          {description}
        </p>
      </div>
    </div>
  );
}
