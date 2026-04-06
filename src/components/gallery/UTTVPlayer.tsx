"use client";

import { useEffect, useRef, useState } from "react";

const PLAYLIST_ID = "PLCWmbE92exfkQgYC4phTXoRKyJ-ACXVem";

// YouTube player state constants
const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 };

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(v: number): void;
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => setShowControls(false), 2500);
  };

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
          mute: 1,
        },
        events: {
          onReady: (e) => {
            e.target.mute();
            e.target.playVideo();
            const d = e.target.getVideoData();
            setCurrentTitle(d?.title || "Universal Transmissions");
          },
          onStateChange: (e) => {
            if (e.data === YT_STATE.ENDED) playerRef.current?.nextVideo();
            if (e.data === YT_STATE.PLAYING) {
              setIsPlaying(true);
              const d = playerRef.current?.getVideoData();
              setCurrentTitle(d?.title || "Universal Transmissions");
            }
            if (e.data === YT_STATE.PAUSED) setIsPlaying(false);
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
      if (hideTimer.current) clearTimeout(hideTimer.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    scheduleHide();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
    scheduleHide();
  };

  return (
    <div
      className="relative w-full group"
      style={{ aspectRatio: "16/9", background: "#0a0a0a", overflow: "hidden" }}
      onMouseMove={scheduleHide}
      onMouseLeave={() => !isPlaying && setShowControls(false)}
    >
      {/* YouTube player */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* ── Top bar ── */}
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

      {/* ── Bottom info bar ── */}
      <div
        className="absolute inset-x-0 bottom-0 p-4"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
      >
        <div className="font-mono text-[11px] tracking-[0.2em] text-white/80 uppercase">
          {currentTitle}
        </div>
      </div>

      {/* ── Corner watermark ── */}
      <div className="absolute bottom-4 right-4 font-mono text-[9px] tracking-[0.25em] text-white/20 uppercase">
        Universal Transmissions
      </div>

      {/* ── Click-to-toggle-play area ── */}
      <button
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="absolute inset-0 w-full h-full cursor-pointer"
        style={{ background: "transparent" }}
      />

      {/* ── Play/Pause + Mute controls overlay ── */}
      <div
        className="absolute bottom-0 left-0 flex items-center gap-3 p-4 transition-opacity duration-300"
        style={{
          opacity: showControls || !isPlaying ? 1 : 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
        }}
      >
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.5)",
            color: "rgba(255,255,255,0.8)",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            /* Pause icon */
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="1" y="0" width="3.5" height="12" rx="1" />
              <rect x="7.5" y="0" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            /* Play icon */
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 1.5L10.5 6L2 10.5V1.5Z" />
            </svg>
          )}
        </button>

        {/* Mute / Unmute */}
        <button
          onClick={toggleMute}
          className="w-8 h-8 rounded flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(0,0,0,0.5)",
            color: isMuted ? "rgba(255,100,100,0.8)" : "rgba(255,255,255,0.8)",
          }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            /* Muted icon */
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            /* Volume icon */
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
