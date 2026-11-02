/**
 * Digital delivery.
 *
 * Universal Transmissions sells digital editions, but until now nothing in the project could give a
 * buyer the thing they paid for: there is no download route, no storage bucket, no entitlement, and
 * no artifact in the repository. A $99 purchase therefore recorded a `paid` order and delivered
 * nothing — and worse, the recovery path used to stamp such an order `fulfilled`, asserting a
 * delivery that had never happened.
 *
 * This module is the missing half of the contract:
 *
 *   payment  →  order is `paid`
 *   access   →  buyer is identified, the order is theirs, the asset exists
 *   delivery →  a short-lived signed URL is issued, and only then is the order `fulfilled`
 *
 * The asset map is deliberately explicit. A product with no entry here is not deliverable, and the
 * route says so instead of pretending. When the editions are uploaded to the private bucket, adding
 * the path here is the only change needed.
 */

export const DIGITAL_BUCKET = "ut-digital";

/** How long a download link stays valid. Long enough to start a download, short enough that a
 *  leaked URL is not a permanent entitlement. */
export const DOWNLOAD_TTL_SECONDS = 15 * 60;

export type DigitalAsset = {
  /** Path inside DIGITAL_BUCKET. */
  path: string;
  /** Shown to the buyer so the file is recognisable. */
  filename: string;
};

/**
 * Product id → stored object.
 *
 * Empty of real entries on purpose: no edition file exists in the repository or in storage yet, and
 * inventing a path would produce a route that signs URLs to nothing. Populate once uploaded.
 */
export const DIGITAL_ASSETS: Record<string, DigitalAsset> = {
  // "codex-digital": { path: "codex-vol1-digital.pdf", filename: "Universal-Transmissions-Codex-Vol1-Digital.pdf" },
};

export function assetFor(productId: string | null | undefined): DigitalAsset | null {
  if (!productId) return null;
  return DIGITAL_ASSETS[productId] ?? null;
}

/** True when a product can actually be delivered today — used to keep us from selling air. */
export function isDeliverable(productId: string | null | undefined): boolean {
  return assetFor(productId) !== null;
}
