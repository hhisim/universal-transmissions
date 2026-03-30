"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

const DRIVE_FOLDER_ID = "1eUgyNtZdFBykgUi8HWl1CIFLOPO79hxj";

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

const DRIVE_API_KEY = "AIzaSyCHYh-1nR1-k6c-ymz0rLFf6QaCTFxQUiw";

async function listDriveFiles(): Promise<DriveFile[]> {
  // Pass key as query param so the server-side route can use it for the Drive API
  const keyParam = process.env.NEXT_PUBLIC_DRIVE_API_KEY ? `?key=${process.env.NEXT_PUBLIC_DRIVE_API_KEY}` : "";
  const res = await fetch(`/api/drive${keyParam}`);
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.files || [];
}

function DriveCard({ file, index }: { file: DriveFile; index: number }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const thumbUrl = file.thumbnailLink
    ? file.thumbnailLink.replace("=d", "=w800")
    : null;

  const displayUrl = thumbUrl || file.webContentLink || "";

  return (
    <div
      className="group relative flex-shrink-0 w-[260px] md:w-[300px]"
      style={{
        background: "var(--ut-surface)",
        border: "1px solid rgba(217,70,239,0.1)",
        transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        animationDelay: `${index * 0.06}s`,
        borderRadius: "2px",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(217,70,239,0.4)";
        el.style.boxShadow = "0 0 40px rgba(217,70,239,0.2), 0 0 80px rgba(147,51,234,0.1), inset 0 0 30px rgba(217,70,239,0.05)";
        el.style.transform = "translateY(-6px) scale(1.02)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(217,70,239,0.1)";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0) scale(1)";
      }}
    >
      {/* Spectrum glow top */}
      <div
        className="absolute top-0 left-0 right-0 h-px z-10"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(217,70,239,0.5) 20%, rgba(147,51,234,0.8) 40%, rgba(99,102,241,0.9) 50%, rgba(147,51,234,0.8) 60%, rgba(217,70,239,0.5) 80%, transparent 100%)",
          boxShadow: "0 0 12px rgba(217,70,239,0.4)",
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
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: "linear-gradient(135deg, rgba(217,70,239,0.08) 0%, transparent 50%, rgba(34,211,238,0.05) 100%)",
            }}
          />
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(217,70,239,0.15) 0%, rgba(147,51,234,0.1) 40%, rgba(99,102,241,0.1) 60%, rgba(34,211,238,0.15) 100%)",
          }}
        >
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center backdrop-blur-sm"
              style={{
                background: "rgba(217,70,239,0.12)",
                border: "1px solid rgba(217,70,239,0.35)",
                boxShadow: "0 0 20px rgba(217,70,239,0.2)",
              }}
            >
              <svg className="w-6 h-6" style={{ color: "var(--ut-magenta)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <p
              className="font-mono text-[9px] tracking-[0.35em] uppercase"
              style={{ color: "var(--ut-magenta)" }}
            >
              View Full
            </p>
          </div>
        </div>
      </div>

      {/* Card info */}
      <div
        className="p-3 relative"
        style={{
          background: "linear-gradient(180deg, rgba(5,5,7,0.8) 0%, rgba(5,5,7,0.95) 100%)",
        }}
      >
        <p
          className="font-mono text-[9px] tracking-[0.2em] uppercase truncate"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          {file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")}
        </p>
      </div>

      {/* Spectrum glow bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px z-10"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.5) 20%, rgba(99,102,241,0.9) 40%, rgba(147,51,234,0.8) 50%, rgba(99,102,241,0.9) 60%, rgba(34,211,238,0.5) 80%, transparent 100%)",
          boxShadow: "0 0 12px rgba(34,211,238,0.3)",
        }}
      />
    </div>
  );
}

export default function DriveGrid() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div
          className="h-px mx-auto mb-6"
          style={{
            maxWidth: "240px",
            background: "linear-gradient(90deg, transparent 0%, rgba(217,70,239,0.7) 20%, rgba(147,51,234,0.9) 40%, rgba(99,102,241,0.95) 50%, rgba(147,51,234,0.9) 60%, rgba(217,70,239,0.7) 80%, transparent 100%)",
            boxShadow: "0 0 15px rgba(147,51,234,0.3)",
          }}
        />

        <p
          className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4"
          style={{ color: "var(--ut-cyan)" }}
        >
          [ Google Drive Archive ]
        </p>

        <h2
          className="font-display text-3xl md:text-4xl mb-4 text-gradient-magenta"
          style={{
            textShadow: "0 0 40px rgba(217,70,239,0.3)",
          }}
        >
          Transmission Matrix
        </h2>

        {/* Spectrum line bottom of header */}
        <div
          className="h-px mx-auto"
          style={{
            maxWidth: "240px",
            background: "linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.7) 20%, rgba(99,102,241,0.95) 40%, rgba(147,51,234,0.9) 50%, rgba(99,102,241,0.95) 60%, rgba(34,211,238,0.7) 80%, transparent 100%)",
            boxShadow: "0 0 15px rgba(34,211,238,0.3)",
          }}
        />

      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative w-14 h-14">
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
            style={{ color: "rgba(255,255,255,0.35)" }}
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
            className="font-mono text-[9px] tracking-[0.3em] uppercase px-4 py-2 transition-all hover:opacity-80"
            style={{
              background: "rgba(217,70,239,0.1)",
              border: "1px solid rgba(217,70,239,0.3)",
              color: "var(--ut-magenta)",
              borderRadius: "2px",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid view — always shown */}
      {!loading && !error && files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file, i) => (
            <DriveCard key={file.id} file={file} index={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && files.length === 0 && (
        <div className="text-center py-24">
          <p
            className="font-heading text-lg mb-2"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            No transmissions found
          </p>
          <p
            className="font-mono text-[10px] tracking-[0.2em]"
            style={{ color: "rgba(255,255,255,0.3)" }}
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
