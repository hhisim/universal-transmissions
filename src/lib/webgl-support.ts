/**
 * webgl-support.ts — whether this browser can actually create a WebGL context.
 *
 * `/codex` rendered its hero, then replaced itself with an application-error screen whose console
 * ended in "Error creating WebGL context". The cause was not the book: the route mounts a decorative
 * three.js canvas in the hero, @react-three/fiber throws while creating the context when WebGL is
 * unavailable, and nothing caught it — so the decoration took the page down with it.
 *
 * The probe is separated here so the decision can be tested without a browser, and so a caller can
 * decide BEFORE mounting a canvas. It never throws: a browser that refuses a context is simply a
 * browser without one.
 */

export type CanvasFactory = () => {
  getContext: (id: string) => unknown;
} | null;

/** Matches the attribute set three.js/webgl asks for closely enough to be a real answer. */
const CONTEXT_IDS = ["webgl2", "webgl", "experimental-webgl"] as const;

/**
 * True only when a context object is actually returned. A factory that throws, returns null, or
 * returns an object whose `getContext` returns null is reported as unsupported.
 */
export function supportsWebGL(factory: CanvasFactory | null | undefined): boolean {
  if (typeof factory !== "function") return false;
  let canvas: ReturnType<CanvasFactory> = null;
  try {
    canvas = factory();
  } catch {
    return false;
  }
  if (!canvas || typeof canvas.getContext !== "function") return false;
  for (const id of CONTEXT_IDS) {
    try {
      if (canvas.getContext(id)) return true;
    } catch {
      /* a throwing getContext is a refusal, not a crash */
    }
  }
  return false;
}

/** The browser probe, kept out of render so it runs once on the client. */
export function browserSupportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  return supportsWebGL(() => {
    const canvas = document.createElement("canvas");
    return canvas as unknown as { getContext: (id: string) => unknown };
  });
}
