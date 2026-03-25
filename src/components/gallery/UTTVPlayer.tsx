"use client";

import { useEffect, useRef, useState } from "react";

const PLAYLIST_ID = "PLCWmbE92exfkQgYC4phTXoRKyJ-ACXVem";

interface YTPlayer {
  playVideo(): void;
  nextVideo(): void;
  destroy(): void;
  getVideoData(): { title?: string; video_id?: string } | null;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLDivElement | string,
        opts: {
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function UTTVPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTitle, setCurrentTitle] = useState("Universal Transmissions");
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;
      if (playerRef.current) playerRef.current.destroy();

      playerRef.current = new window.YT.Player(containerRef.current, {
        playerVars: {
          listType: "playlist",
          list: PLAYLIST_ID,
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          color: "white",
        },
        events: {
          onReady: (e) => {
            e.target.playVideo();
            const d = e.target.getVideoData();
            setCurrentTitle(d?.title || "Universal Transmissions");
          },
          onStateChange: (e) => {
            if (e.data === 0) playerRef.current?.nextVideo();
            if (e.data === 1) {
              const d = playerRef.current?.getVideoData();
              setCurrentTitle(d?.title || "Universal Transmissions");
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#0a0a0a", overflow: "hidden" }}>
      {/* YouTube player — no controls shown */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* UT overlay — top bar */}
      <div
        className="absolute inset-x-0 top-0 p-4 flex items-center justify-between"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/60 uppercase">
            UT-TV Now Playing
          </span>
        </div>
        <div className="w-3 h-3 rounded-full border border-white/20" />
      </div>

      {/* UT overlay — bottom info bar */}
      <div
        className="absolute inset-x-0 bottom-0 p-4"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
      >
        <div className="font-mono text-[11px] tracking-[0.2em] text-white/80 uppercase">
          {currentTitle}
        </div>
      </div>

      {/* UT corner watermark */}
      <div className="absolute bottom-4 right-4 font-mono text-[9px] tracking-[0.25em] text-white/20 uppercase">
        Universal Transmissions
      </div>
    </div>
  );
}
