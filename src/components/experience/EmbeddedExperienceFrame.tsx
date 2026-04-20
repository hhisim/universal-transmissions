"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type ExperienceNotice = {
  tone?: "info" | "warning" | "accent";
  text: string;
};

type EmbeddedExperienceFrameProps = {
  title: string;
  src: string;
  introEyebrow: string;
  introTitle: string;
  introDescription: string;
  notices?: ExperienceNotice[];
  timeoutMs?: number;
  externalHref?: string;
  fallbackHref?: string;
  fallbackLabel?: string;
};

const toneStyles: Record<NonNullable<ExperienceNotice["tone"]>, { border: string; bg: string; text: string }> = {
  info: {
    border: "rgba(34,211,238,0.2)",
    bg: "rgba(34,211,238,0.08)",
    text: "#a5f3fc",
  },
  warning: {
    border: "rgba(245,158,11,0.25)",
    bg: "rgba(245,158,11,0.08)",
    text: "#fcd34d",
  },
  accent: {
    border: "rgba(217,70,239,0.22)",
    bg: "rgba(217,70,239,0.08)",
    text: "#f0abfc",
  },
};

export default function EmbeddedExperienceFrame({
  title,
  src,
  introEyebrow,
  introTitle,
  introDescription,
  notices = [],
  timeoutMs = 12000,
  externalHref,
  fallbackHref,
  fallbackLabel = "Open alternate experience",
}: EmbeddedExperienceFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [reloadKey, timeoutMs, src]);

  const frameSrc = useMemo(() => {
    const divider = src.includes("?") ? "&" : "?";
    return `${src}${divider}embed_ts=${reloadKey}`;
  }, [src, reloadKey]);

  return (
    <section
      style={{
        minHeight: "100vh",
        background: "#02020a",
        paddingTop: 96,
        paddingBottom: 40,
      }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 20px" }}>
        <div
          style={{
            marginBottom: 18,
            padding: "18px 20px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(8,8,16,0.8)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              fontSize: 10,
              color: "rgba(212,168,71,0.82)",
              marginBottom: 10,
            }}
          >
            {introEyebrow}
          </div>
          <h1
            style={{
              margin: 0,
              color: "#f5e9ff",
              fontFamily: "Cinzel, serif",
              fontSize: "clamp(28px, 4vw, 42px)",
              letterSpacing: "0.08em",
            }}
          >
            {introTitle}
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 920,
              color: "rgba(237,233,246,0.72)",
              lineHeight: 1.7,
              fontSize: 15,
            }}
          >
            {introDescription}
          </p>
        </div>

        {notices.length > 0 && (
          <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
            {notices.map((notice, index) => {
              const tone = toneStyles[notice.tone ?? "info"];
              return (
                <div
                  key={`${notice.text}-${index}`}
                  style={{
                    padding: "12px 14px",
                    border: `1px solid ${tone.border}`,
                    background: tone.bg,
                    color: tone.text,
                    fontSize: 13,
                    letterSpacing: "0.02em",
                  }}
                >
                  {notice.text}
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            position: "relative",
            minHeight: "calc(100vh - 250px)",
            border: "1px solid rgba(212,168,71,0.12)",
            background: "#02020a",
            overflow: "hidden",
          }}
        >
          {!loaded && !timedOut && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(2,2,10,0.94)",
                zIndex: 2,
                textAlign: "center",
                padding: 24,
              }}
            >
              <div>
                <div style={{ fontSize: 42, marginBottom: 16, color: "#e040fb" }}>⬡</div>
                <div
                  style={{
                    fontFamily: "Cinzel, serif",
                    color: "#e040fb",
                    letterSpacing: "0.2em",
                    fontSize: 13,
                    textTransform: "uppercase",
                  }}
                >
                  Loading {title}
                </div>
              </div>
            </div>
          )}

          {timedOut && !loaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(2,2,10,0.97)",
                zIndex: 3,
                padding: 24,
              }}
            >
              <div
                style={{
                  maxWidth: 560,
                  textAlign: "center",
                  border: "1px solid rgba(217,70,239,0.22)",
                  background: "rgba(20,10,30,0.78)",
                  padding: "24px 22px",
                }}
              >
                <div
                  style={{
                    fontFamily: "Cinzel, serif",
                    color: "#f0abfc",
                    letterSpacing: "0.15em",
                    fontSize: 12,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Experience not responding yet
                </div>
                <p style={{ margin: 0, color: "rgba(237,233,246,0.78)", lineHeight: 1.7, fontSize: 14 }}>
                  {title} took too long to load. Retry the embed, or open the alternate route while the full experience initializes.
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginTop: 18,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setReloadKey((value) => value + 1)}
                    style={{
                      padding: "10px 16px",
                      background: "rgba(217,70,239,0.14)",
                      border: "1px solid rgba(217,70,239,0.3)",
                      color: "#f5d0fe",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      fontSize: 11,
                    }}
                  >
                    Retry
                  </button>
                  {fallbackHref && (
                    <Link
                      href={fallbackHref}
                      style={{
                        padding: "10px 16px",
                        background: "rgba(34,211,238,0.12)",
                        border: "1px solid rgba(34,211,238,0.25)",
                        color: "#a5f3fc",
                        textDecoration: "none",
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        fontSize: 11,
                      }}
                    >
                      {fallbackLabel}
                    </Link>
                  )}
                  {externalHref && (
                    <a
                      href={externalHref}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "10px 16px",
                        background: "rgba(212,168,71,0.12)",
                        border: "1px solid rgba(212,168,71,0.25)",
                        color: "#fcd34d",
                        textDecoration: "none",
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        fontSize: 11,
                      }}
                    >
                      Open external
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <iframe
            key={frameSrc}
            src={frameSrc}
            title={title}
            style={{
              width: "100%",
              minHeight: "calc(100vh - 250px)",
              height: "calc(100vh - 250px)",
              border: "none",
              display: "block",
              background: "#02020a",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.25s ease",
            }}
            allow="microphone; autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
            onLoad={() => {
              setLoaded(true);
              setTimedOut(false);
            }}
          />
        </div>
      </div>
    </section>
  );
}
