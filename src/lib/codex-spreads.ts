/**
 * codex-spreads.ts — the public preview imagery the Codex page may show, and what it can support.
 *
 * The sources are the five files that already ship in `public/codex/book`: the cover and four
 * spreads. Nothing here is derived from a filename, and in particular no printed page number is
 * inferred — `spread-146.jpg` is not "page 146", it is the fourth available preview. Labels are
 * positional ("Cover", "Preview 1…4") because that is what the archive actually knows.
 *
 * The dimensions are the files' own pixel sizes, recorded so the viewer can show each image whole at
 * its true ratio and so enlargement stops where the pixels stop: a 640px-wide source magnified four
 * times is not inspection, it is blur.
 */

export interface CodexPreview {
  /** Stable id, used as the viewer key and for tests. */
  id: string;
  /** Public path — the shipped asset, untouched. */
  src: string;
  /** Positional label. Never a page number. */
  label: string;
  width: number;
  height: number;
}

export const CODEX_PREVIEWS: readonly CodexPreview[] = Object.freeze([
  { id: "vol1-cover", src: "/codex/book/vol1-cover.jpg", label: "Cover", width: 900, height: 830 },
  { id: "spread-06", src: "/codex/book/spread-06.jpg", label: "Preview 1", width: 640, height: 480 },
  { id: "spread-02", src: "/codex/book/spread-02.jpg", label: "Preview 2", width: 640, height: 437 },
  { id: "spread-03", src: "/codex/book/spread-03.jpg", label: "Preview 3", width: 640, height: 290 },
  { id: "spread-146", src: "/codex/book/spread-146.jpg", label: "Preview 4", width: 640, height: 640 },
]);

/** Ratio used for the thumbnail box, so a spread is never cropped to a house shape. */
export function previewAspect(preview: CodexPreview): number {
  if (!preview || !preview.width || !preview.height) return 1;
  return preview.width / preview.height;
}

/**
 * How far this source can honestly be enlarged.
 *
 * A 640px-wide spread is legible at 2x on a high-density display; beyond that the viewer is
 * magnifying JPEG artefacts. The 900px cover earns a little more. The ceiling is a property of the
 * asset, not of the window, so it does not change when the viewport does.
 */
export function zoomCeilingFor(preview: CodexPreview | null | undefined): number {
  if (!preview) return 1;
  return preview.width >= 900 ? 2.5 : 2;
}

/** The width the image should be allowed to occupy before any zoom, in CSS pixels. */
export function naturalWidthFor(preview: CodexPreview | null | undefined): number {
  if (!preview) return 1;
  return Math.max(1, Math.round(preview.width));
}

/** Index of a preview within the published set, or -1. */
export function previewIndex(previewId: string): number {
  return CODEX_PREVIEWS.findIndex((p) => p.id === previewId);
}

/** The counter shown in the viewer: "Preview 2 of 4" style, with the cover named. */
export function previewCounter(preview: CodexPreview, index: number, total: number): string {
  const name = preview.label;
  return `${name} — ${index + 1} of ${total}`;
}
