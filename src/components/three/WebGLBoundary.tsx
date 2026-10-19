"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { browserSupportsWebGL } from "@/lib/webgl-support";

/**
 * WebGLBoundary — decoration must be allowed to fail on its own.
 *
 * Two independent guards, because there are two ways the hero broke the page:
 *
 *   1. No WebGL at all. @react-three/fiber throws while creating the context; the probe below means
 *      the canvas is never mounted, so nothing throws in the first place.
 *   2. A canvas that mounts and still throws (driver reset, context lost mid-flight, an extension
 *      that lied). The error boundary catches it and swaps in the fallback instead of unmounting the
 *      route — which is what turned a decorative triangle into an application-error screen.
 *
 * The fallback keeps the atmosphere: the same near-black field with a faint radial wash, drawn with
 * CSS, so a browser without WebGL sees a designed surface rather than a hole or a crash report.
 */

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    /* Reported, not rethrown: a decorative effect failing is not a page failure. */
    console.warn("Decorative 3D surface disabled:", error?.message ?? error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function AtmosphereFallback({ opacity = 0.3 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      data-webgl-fallback="true"
      className="w-full h-full"
      style={{
        opacity,
        background:
          "radial-gradient(circle at 50% 45%, rgba(212,168,71,0.18) 0%, rgba(0,229,255,0.10) 32%, rgba(217,70,239,0.06) 55%, transparent 72%), #050508",
      }}
    />
  );
}

export default function WebGLBoundary({
  children,
  fallback = <AtmosphereFallback />,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  /* Unknown during server rendering and on the first client paint: render nothing rather than
     guessing, so the canvas is never mounted on a browser that cannot support it. */
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(browserSupportsWebGL());
  }, []);

  if (supported === null) return <AtmosphereFallback />;
  if (!supported) return <>{fallback}</>;
  return <Boundary fallback={fallback}>{children}</Boundary>;
}
