"use client";

import { useEffect, useRef, useState } from "react";

const PLAYLIST_ID = "PLCWmbE92exfkQgYC4phTXoRKyJ-ACXVem";

export default function UTTVPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTitle, setCurrentTitle] = useState("Loading...");
  const playerRef = useRef<YT.Player | null>(null);

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
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          mute: 1,
        },
        events: {
          onReady: (event: YT.OnReadyEvent) => {
            event.target.playVideo();
            const videoData = event.target.getVideoData();
            setCurrentTitle(videoData.title || "UT TV");
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === YT.PlayerState.ENDED) {
              playerRef.current?.nextVideo();
            }
            if (event.data === YT.PlayerState.PLAYING) {
              const videoData = playerRef.current?.getVideoData();
              setCurrentTitle(videoData?.title || "UT TV");
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#0a0a0a" }}>
      {/* YouTube player */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Live badge */}
      <div
        className="absolute flex items-center gap-2 px-4 py-2 rounded-full"
        style={{
          top: "20px",
          left: "20px",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(217,70,239,0.3)",
        }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ background: "#d946ef", boxShadow: "0 0 8px #d946ef" }}
        />
        <span
          className="font-mono text-xs font-bold tracking-widest uppercase"
          style={{ color: "white", letterSpacing: "0.15em" }}
        >
          UT TV
        </span>
      </div>

      {/* Now Playing */}
      <div
        className="absolute px-5 py-3 rounded-lg max-w-xs"
        style={{
          bottom: "20px",
          left: "20px",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p
          className="font-mono text-[9px] uppercase tracking-widest mb-1"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Now Playing
        </p>
        <p
          className="font-heading text-sm font-semibold leading-tight"
          style={{ color: "white" }}
        >
          {currentTitle}
        </p>
      </div>

      {/* Animated spectrum bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, #c026d3 0%, #d946ef 15%, #f0c75e 40%, #22d3ee 70%, #22d3ee 100%)",
          backgroundSize: "200% 100%",
          animation: "utv-spectrum 4s linear infinite",
        }}
      />
      <style>{`
        @keyframes utv-spectrum {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}
