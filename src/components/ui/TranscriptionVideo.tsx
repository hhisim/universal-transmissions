"use client";

import { useState, useRef } from "react";

interface Props {
  videoId: string;
  title: string;
}

export default function TranscriptionVideo({ videoId, title }: Props) {
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const toggleSound = () => {
    if (!playing) {
      // Start playback with sound ON
      setPlaying(true);
      setMuted(false);
      if (iframeRef.current) {
        iframeRef.current.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&enablejsapi=1&modestbranding=1&rel=0&showinfo=0&color=white`;
      }
    } else {
      // Toggle mute on/off using YouTube API
      const newMuted = !muted;
      setMuted(newMuted);
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: newMuted ? "mute" : "unmute", args: [] }),
            "https://www.youtube.com"
          );
        } catch (e) {
          // Fallback: reload iframe
          if (iframeRef.current) {
            iframeRef.current.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${newMuted ? 1 : 0}&enablejsapi=1&modestbranding=1&rel=0&showinfo=0&color=white`;
          }
        }
      }
    }
  };

  const startPlayback = () => {
    setPlaying(true);
    setMuted(true); // Start muted
    if (iframeRef.current) {
      iframeRef.current.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&modestbranding=1&rel=0&showinfo=0&color=white`;
    }
  };

  const stopPlayback = () => {
    setPlaying(false);
    if (iframeRef.current) {
      iframeRef.current.src = "";
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        background: "var(--ut-void)",
        border: "1px solid rgba(217,70,239,0.15)",
        borderRadius: "4px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Gradient border overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(217,70,239,0.1) 0%, transparent 50%, rgba(34,211,238,0.1) 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Window chrome header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "linear-gradient(180deg, rgba(217,70,239,0.08) 0%, rgba(217,70,239,0.03) 100%)",
          borderBottom: "1px solid rgba(217,70,239,0.12)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(239,68,68,0.6)" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(251,191,36,0.6)" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(52,211,153,0.6)" }} />
          </div>
          {/* Title */}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "var(--ut-cyan)",
              opacity: 0.8,
            }}
          >
            TRANSCRIPTION PROCESS
          </span>
        </div>
        {/* Protocol badge */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            letterSpacing: "0.2em",
            color: "var(--ut-magenta)",
            opacity: 0.4,
            border: "1px solid rgba(217,70,239,0.2)",
            padding: "4px 8px",
            borderRadius: "2px",
          }}
        >
          UT MEDIA PROTOCOL
        </div>
      </div>

      {/* Video container */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          background: "#000",
        }}
      >
        {!playing ? (
          <>
            {/* Thumbnail */}
            <img
              src={thumbnailUrl}
              alt={title}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "brightness(0.5) saturate(0.7)",
              }}
            />
            {/* Play button */}
            <button
              onClick={startPlayback}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "rgba(217,70,239,0.15)",
                  border: "2px solid rgba(217,70,239,0.4)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                }}
              >
                <svg width={28} height={28} viewBox="0 0 24 24" fill="rgba(217,70,239,0.9)">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
            {/* Bottom info bar */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "20px",
                background: "linear-gradient(to top, rgba(5,5,7,0.95) 0%, transparent 100%)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--ut-cyan)",
                  opacity: 0.6,
                  marginBottom: "4px",
                }}
              >
                Transcription Process
              </p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "14px",
                  color: "var(--ut-white)",
                  margin: 0,
                }}
              >
                {title}
              </p>
            </div>
          </>
        ) : (
          <iframe
            ref={iframeRef}
            title={title}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muted ? 1 : 0}&enablejsapi=1&modestbranding=1&rel=0&showinfo=0&color=white`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        )}
      </div>

      {/* Controls bar */}
      {playing && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "rgba(0,0,0,0.6)",
            borderTop: "1px solid rgba(217,70,239,0.06)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <button
            onClick={toggleSound}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: "4px",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(217,70,239,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {muted ? (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="rgba(217,70,239,0.6)">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="rgba(34,211,238,0.8)">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: muted ? "rgba(217,70,239,0.5)" : "rgba(34,211,238,0.7)",
              }}
            >
              {muted ? "MUTED" : "SOUND ON"}
            </span>
          </button>
          <button
            onClick={stopPlayback}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(217,70,239,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="rgba(217,70,239,0.4)">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      )}

      {/* Scan line effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* Corner accents */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 20,
          height: 20,
          borderTop: "2px solid var(--ut-cyan)",
          borderLeft: "2px solid var(--ut-cyan)",
          opacity: 0.3,
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 20,
          height: 20,
          borderTop: "2px solid var(--ut-magenta)",
          borderRight: "2px solid var(--ut-magenta)",
          opacity: 0.3,
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 20,
          height: 20,
          borderBottom: "2px solid var(--ut-magenta)",
          borderLeft: "2px solid var(--ut-magenta)",
          opacity: 0.3,
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 20,
          height: 20,
          borderBottom: "2px solid var(--ut-cyan)",
          borderRight: "2px solid var(--ut-cyan)",
          opacity: 0.3,
          zIndex: 2,
        }}
      />
    </div>
  );
}