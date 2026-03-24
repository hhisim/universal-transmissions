"use client";

import { useState } from "react";

const DRIVE_FOLDER_ID = "1UIelmYFpfX9g2TcK-Ji7F35TpiY13fFt";
const DRIVE_API_KEY = "AIzaSyCHYh-1nR1-k6c-ymz0rLFf6QaCTFxQUiw";

type ViewMode = "stream" | "grid";

export default function TransmissionStream() {
  const [viewMode, setViewMode] = useState<ViewMode>("stream");
  const [error, setError] = useState(false);

  // Build the iframe URL — same source as the working gallery on hakanhisim.net
  const iframeUrl =
    `https://lovely-fox-1e7ead.netlify.app/?folder=${DRIVE_FOLDER_ID}&key=${DRIVE_API_KEY}&tw=240&gap=10&mcols=${viewMode === "grid" ? 3 : 2}`;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="flex items-center gap-3 text-red-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="font-mono text-sm uppercase tracking-widest">Drive API Error — Please retry</span>
        </div>
        <button
          onClick={() => setError(false)}
          className="font-mono text-xs tracking-widest uppercase px-6 py-2 border cursor-pointer transition-all hover:bg-white/5"
          style={{ borderColor: "rgba(217,70,239,0.4)", color: "var(--ut-magenta)" }}
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* View mode toggle */}
      <div className="flex justify-center gap-4 mb-6">
        {(["stream", "grid"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="font-mono text-xs tracking-widest uppercase px-6 py-2 border transition-all cursor-pointer"
            style={{
              borderColor: viewMode === mode ? "var(--ut-magenta)" : "rgba(217,70,239,0.2)",
              background: viewMode === mode ? "rgba(217,70,239,0.1)" : "transparent",
              color: viewMode === mode ? "var(--ut-magenta)" : "rgba(237,233,246,0.4)",
            }}
          >
            {mode === "stream" ? "STREAM" : "GRID"}
          </button>
        ))}
      </div>

      {/* Drive gallery iframe — same working source as hakanhisim.net */}
      <iframe
        key={viewMode}
        src={iframeUrl}
        title="Transmission Stream"
        loading="lazy"
        style={{
          display: "block",
          width: "100%",
          height: "1400px",
          border: "none",
          margin: "0",
          background: "transparent",
        }}
        onError={() => setError(true)}
      />
    </div>
  );
}
