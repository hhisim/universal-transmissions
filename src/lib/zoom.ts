/**
 * zoom.ts — one rule for how far an image may be enlarged, shared by every control.
 *
 * The viewer had two answers: the keyboard and the +/- buttons multiplied by 1.5 and clamped to
 * `maxZoom`, but the Zoom-in button decided its own disabled state against a hardcoded 4. A 640px
 * spread therefore offered a button that stayed enabled past its own ceiling, and a 900px cover
 * offered one that disabled early. Worse, the ceiling itself was resolved once, when the viewer
 * opened, so moving from the cover to a spread kept 250% while moving the other way kept 200%.
 *
 * These helpers are pure so the same arithmetic can be asserted without a browser.
 */

/** The gallery's ceiling. Unchanged: its originals are large and 4x is its established behaviour. */
export const DEFAULT_ZOOM_CEILING = 4;

const EPSILON = 1e-6;

/** A ceiling that is missing, non-finite or not above 1 collapses to 1 (no enlargement). */
export function normaliseCeiling(ceiling: number | null | undefined): number {
  if (typeof ceiling !== "number" || !Number.isFinite(ceiling) || ceiling <= 1) return 1;
  return ceiling;
}

/** Clamp a zoom factor into [1, ceiling]. */
export function clampZoom(zoom: number, ceiling: number | null | undefined): number {
  const top = normaliseCeiling(ceiling);
  if (typeof zoom !== "number" || !Number.isFinite(zoom)) return 1;
  return Math.min(top, Math.max(1, zoom));
}

/** Multiply, then clamp — the only way a zoom level is ever produced. */
export function zoomBy(zoom: number, ceiling: number | null | undefined, factor: number): number {
  if (typeof factor !== "number" || !Number.isFinite(factor) || factor <= 0) return clampZoom(zoom, ceiling);
  return clampZoom(zoom * factor, ceiling);
}

export function canZoomIn(zoom: number, ceiling: number | null | undefined): boolean {
  return clampZoom(zoom, ceiling) < normaliseCeiling(ceiling) - EPSILON;
}

export function canZoomOut(zoom: number): boolean {
  return zoom > 1 + EPSILON;
}

/** True when the viewer is at (or past) its ceiling, so a control can say so. */
export function atCeiling(zoom: number, ceiling: number | null | undefined): boolean {
  return !canZoomIn(zoom, ceiling);
}
