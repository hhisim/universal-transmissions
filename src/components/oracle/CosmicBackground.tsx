"use client";

import { useCallback, useEffect, useRef } from "react";

type MousePoint = { x: number; y: number };

interface Props {
  isProcessing?: boolean;
  mousePos?: MousePoint;
}

const BACKGROUND_SRC = "/oracle/codex-oracle-bg-animation.html";

export default function CosmicBackground({
  isProcessing = false,
  mousePos = { x: 0, y: 0 },
}: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const postBackgroundState = useCallback(() => {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) return;
    frameWindow.postMessage(
      {
        type: "oracle-mouse",
        x: mousePos.x,
        y: mousePos.y,
        processing: isProcessing,
      },
      window.location.origin
    );
  }, [isProcessing, mousePos.x, mousePos.y]);

  useEffect(() => {
    postBackgroundState();
  }, [postBackgroundState]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black"
    >
      <iframe
        ref={frameRef}
        src={BACKGROUND_SRC}
        title="Codex Oracle background animation"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full border-0"
        onLoad={postBackgroundState}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0) 32%, rgba(0,0,0,0.74) 100%)',
          mixBlendMode: 'normal',
          opacity: 1,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
          opacity: 0.34,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isProcessing
            ? 'radial-gradient(circle at 50% 28%, rgba(217,70,239,0.08), transparent 36%), radial-gradient(circle at 50% 72%, rgba(0,212,255,0.05), transparent 34%)'
            : 'radial-gradient(circle at 50% 20%, rgba(217,70,239,0.04), transparent 30%), radial-gradient(circle at 50% 80%, rgba(0,212,255,0.03), transparent 28%)',
          transition: 'background 220ms ease',
        }}
      />
    </div>
  );
}
