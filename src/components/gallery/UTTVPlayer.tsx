"use client";

import { useEffect, useRef, useState } from "react";

const PLAYLIST_ID = "PLCWmbE92exfkQgYC4phTXoRKyJ-ACXVem";

interface Video {
  id: string;
  title: string;
}

const VIDEOS: Video[] = [
  { id: "ys6YjCXoIOs", title: "The Universal Transmissions Codex - Update" },
  { id: "SC89B4vlXkc", title: "The Universal Transmissions Codex - Update" },
  { id: "t5yiD0sxIug", title: "Making of Polarity Modulation and the essence of Union" },
  { id: "VybQIwW3bU0", title: "The Universal Transmissions Codex - Update" },
  { id: "E1yhN3FueSs", title: "Universal Transmissions Codex - 100 Page Test Print!" },
  { id: "BbO1VgyZq9M", title: "Making of Universal Transmissions Codex // CC05" },
  { id: "Owi-ooswzMM", title: "Making of Universal Transmissions Codex // CC04" },
  { id: "jLab4KnyU48", title: "Universal Transmissions Codex first test print" },
  { id: "gSqdxDWO278", title: "Making of Universal Transmissions Codex // CC03" },
  { id: "vC_UYkb3l0c", title: "Making of Universal Transmissions Codex // CC02" },
  { id: "ECAFuxZpyK0", title: "Making of Universal Transmissions Codex // CC01" },
  { id: "au9mPzB1dVM", title: "Making of Universal Transmissions Codex // CC06" },
  { id: "N0p65Q3dz4Y", title: "Codex Stream 01 // Compilation Capture 07" },
];

export default function UTTVPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTitle, setCurrentTitle] = useState("Loading...");
  const [isLive, setIsLive] = useState(false);
  const playerRef = useRef<YT.Player | null>(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;

      // Destroy existing player
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: VIDEOS[0].id,
        playerVars: {
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
            setCurrentTitle(VIDEOS[0].title);
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === YT.PlayerState.ENDED) {
              currentIndexRef.current =
                (currentIndexRef.current + 1) % VIDEOS.length;
              const nextIndex = currentIndexRef.current;
              const next = VIDEOS[nextIndex];
              setCurrentTitle(next.title);
              playerRef.current?.loadVideoById(next.id);
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
      {/* YouTube player container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Live badge */}
      <div
        className="absolute flex items-center gap-2 px-4 py-2 rounded-full"
        style={{
          top: "20px",
          left: "20px",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,0,0,0.3)",
        }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ background: "#ff0000", boxShadow: "0 0 8px #ff0000" }}
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

      {/* Animated schedule bar at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, #d946ef 0%, #22d3ee 50%, #d946ef 100%)",
          backgroundSize: "200% 100%",
          animation: "utv-gradient 4s linear infinite",
        }}
      />
      <style>{`
        @keyframes utv-gradient {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}
