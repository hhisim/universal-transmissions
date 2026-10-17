"use client";

/**
 * CodexVideoCard — Batch 31.
 *
 * The presented page mounted thirteen YouTube iframes as it loaded: measured on production that
 * was 13 frames, 13 third-party requests and about 610 KB of the page's transfer, all of it for
 * videos a visitor may never play. The brief asks that media remain opt-in, so the frame is not
 * mounted until the visitor asks for it.
 *
 * The gate is a button, not a picture of a player: a poster image would itself be a request to a
 * third party, which is most of what this is avoiding. It is a real control, reachable by keyboard,
 * with a visible focus ring, and it disappears the moment the frame takes its place.
 */

import { useState } from "react";

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
            <span className="ut-video-gate-mark" aria-hidden="true">
              ▶
            </span>
            <span className="ut-video-gate-label">Load video</span>
            <span className="ut-video-gate-note">Nothing is requested until you press this.</span>
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
