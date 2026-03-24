"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

// Drive folder from the original iframe embed
const DRIVE_FOLDER_ID = "1eUgyNtZdFBykgUi8HWl1CIFLOPO79hxj";
const DRIVE_API_KEY = "AIzaSyCHYh-1nR1-k6c-ymz0rLFf6QaCTFxQUiw";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  description?: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
  };
}

async function listDriveFiles(): Promise<DriveFile[]> {
  const fields = "files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,description,imageMediaMetadata)";
  const url = `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&fields=${encodeURIComponent(fields)}&key=${DRIVE_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
  const data = await res.json();
  return (data.files || []).filter((f: DriveFile) =>
    f.mimeType.startsWith("image/")
  );
}

function StreamCard({ file, index }: { file: DriveFile; index: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const thumbUrl = file.thumbnailLink
    ? file.thumbnailLink.replace("=d", "=w800")
    : null;

  const displayUrl = thumbUrl || file.webContentLink || "";

  return (
    <div
      className="group relative overflow-hidden rounded-sm"
      style={{
        background: "var(--ut-surface)",
        border: "1px solid rgba(217, 70, 239, 0.08)",
        transition: "all 0.4s ease",
        animationDelay: `${index * 0.06}s`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(217, 70, 239, 0.3)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 30px rgba(217, 70, 239, 0.15), 0 0 60px rgba(34, 211, 238, 0.05)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(217, 70, 239, 0.08)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Glow accent top */}
      <div
        className="absolute top-0 left-0 right-0 h-px z-10"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.4), rgba(147,51,234,0.6), rgba(99,102,241,0.6), rgba(34,211,238,0.4), transparent)",
        }}
      />

      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-[#050507]">
        {!error && displayUrl ? (
          <Image
            src={displayUrl}
            alt={file.name}
            fill
            className={`object-cover transition-all duration-700 ${loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-[rgba(217,70,239,0.2)]" style={{ borderTopColor: "var(--ut-magenta)" }}>
              <svg viewBox="0 0 24 24" className="animate-spin w-full h-full text-[var(--ut-magenta)]" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )}

        {/* Loading shimmer */}
        {!loaded && !error && (
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(217,70,239,0.05)] via-transparent to-[rgba(34,211,238,0.05)] animate-pulse" />
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(217,70,239,0.12) 0%, rgba(34,211,238,0.08) 50%, rgba(147,51,234,0.12) 100%)",
          }}
        >
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{
                background: "rgba(217,70,239,0.15)",
                border: "1px solid rgba(217,70,239,0.3)",
              }}
            >
              <svg className="w-5 h-5" style={{ color: "var(--ut-magenta)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <p
              className="font-mono text-[9px] tracking-[0.3em] uppercase"
              style={{ color: "var(--ut-magenta)" }}
            >
              View Full
            </p>
          </div>
        </div>
      </div>

      {/* Card info */}
      <div className="p-3">
        <p
          className="font-mono text-[9px] tracking-[0.2em] uppercase truncate"
          style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
        >
          {file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")}
        </p>
      </div>

      {/* Bottom glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px z-10"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.3), rgba(99,102,241,0.5), rgba(147,51,234,0.3), transparent)",
        }}
      />
    </div>
  );
}

function StreamScroller({ files }: { files: DriveFile[] }) {
  const [offset, setOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Continuous scroll animation
  useEffect(() => {
    if (isPaused || files.length === 0) return;
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % files.length);
    }, 80);
    return () => clearInterval(interval);
  }, [isPaused, files.length]);

  if (files.length === 0) return null;

  // Build a seamless loop: original + duplicate
  const looped = [...files, ...files];
  const visibleCount = 5;
  const start = offset % files.length;

  return (
    <div
      className="relative overflow-hidden py-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fade edges */}
      <div
        className="absolute top-0 bottom-0 left-0 z-10 pointer-events-none"
        style={{ width: "80px", background: "linear-gradient(90deg, var(--ut-black), transparent)" }}
      />
      <div
        className="absolute top-0 bottom-0 right-0 z-10 pointer-events-none"
        style={{ width: "80px", background: "linear-gradient(-90deg, var(--ut-black), transparent)" }}
      />

      {/* Scrolling track */}
      <div
        ref={containerRef}
        className="flex gap-4 transition-transform duration-100"
        style={{ width: "max-content" }}
      >
        {looped.slice(start, start + visibleCount + 1).map((file, i) => (
          <div
            key={`${file.id}-${i}`}
            className="flex-shrink-0 w-[280px] md:w-[320px]"
          >
            <StreamCard file={file} index={i} />
          </div>
        ))}
      </div>

      {/* Pause indicator */}
      {isPaused && (
        <div
          className="absolute top-3 right-3 font-mono text-[8px] tracking-[0.3em] uppercase px-2 py-1 rounded-sm"
          style={{
            background: "rgba(217,70,239,0.1)",
            border: "1px solid rgba(217,70,239,0.2)",
            color: "var(--ut-magenta)",
          }}
        >
          PAUSED
        </div>
      )}
    </div>
  );
}

export default function TransmissionStream() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"stream" | "grid">("stream");

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const f = await listDriveFiles();
      setFiles(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transmissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return (
    <div>
      {/* Section header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3 mb-4">
          <div
            className="h-px"
            style={{
              width: "40px",
              background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.5))",
            }}
          />
          <p
            className="font-mono text-[10px] tracking-[0.4em] uppercase"
            style={{ color: "var(--ut-cyan)" }}
          >
            [ Live Transmission Stream ]
          </p>
          <div
            className="h-px"
            style={{
              width: "40px",
              background: "linear-gradient(90deg, rgba(34,211,238,0.5), transparent)",
            }}
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setView("stream")}
            className="font-mono text-[9px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-sm transition-all"
            style={{
              background: view === "stream" ? "rgba(217,70,239,0.1)" : "transparent",
              border: `1px solid ${view === "stream" ? "rgba(217,70,239,0.4)" : "rgba(217,70,239,0.08)"}`,
              color: view === "stream" ? "var(--ut-magenta)" : "var(--ut-white-dim)",
            }}
          >
            Stream
          </button>
          <button
            onClick={() => setView("grid")}
            className="font-mono text-[9px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-sm transition-all"
            style={{
              background: view === "grid" ? "rgba(34,211,238,0.1)" : "transparent",
              border: `1px solid ${view === "grid" ? "rgba(34,211,238,0.4)" : "rgba(34,211,238,0.08)"}`,
              color: view === "grid" ? "var(--ut-cyan)" : "var(--ut-white-dim)",
            }}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative w-12 h-12">
            <div
              className="absolute inset-0 rounded-full border"
              style={{ borderColor: "rgba(217,70,239,0.1)" }}
            />
            <div
              className="absolute inset-0 rounded-full border-t-2 animate-spin"
              style={{ borderColor: "var(--ut-magenta)", borderTopColor: "transparent" }}
            />
            <div
              className="absolute inset-2 rounded-full border"
              style={{ borderColor: "rgba(34,211,238,0.1)" }}
            />
            <div
              className="absolute inset-2 rounded-full border-b-2 animate-spin"
              style={{
                borderColor: "rgba(34,211,238,0.6)",
                borderBottomColor: "transparent",
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            />
          </div>
          <p
            className="font-mono text-[9px] tracking-[0.4em] uppercase animate-pulse"
            style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
          >
            Receiving transmissions...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-3 rounded-sm mb-4"
            style={{
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-mono text-xs" style={{ color: "#f87171" }}>
              {error}
            </p>
          </div>
          <button
            onClick={loadFiles}
            className="font-mono text-[9px] tracking-[0.3em] uppercase px-4 py-2 rounded-sm transition-all hover:opacity-80"
            style={{
              background: "rgba(217,70,239,0.1)",
              border: "1px solid rgba(217,70,239,0.3)",
              color: "var(--ut-magenta)",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stream view */}
      {!loading && !error && files.length > 0 && view === "stream" && (
        <StreamScroller files={files} />
      )}

      {/* Grid view */}
      {!loading && !error && files.length > 0 && view === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file, i) => (
            <StreamCard key={file.id} file={file} index={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && files.length === 0 && (
        <div className="text-center py-24">
          <p
            className="font-heading text-lg mb-2"
            style={{ color: "var(--ut-white-dim)" }}
          >
            No transmissions found
          </p>
          <p
            className="font-mono text-[10px] tracking-[0.2em]"
            style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}
          >
            The stream is silent. Check back soon.
          </p>
        </div>
      )}

      {/* Spectrum divider bottom */}
      <div className="divider-spectrum mt-12" />
    </div>
  );
}
