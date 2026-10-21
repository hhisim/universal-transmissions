/**
 * Covers we publish at a portrait ratio.
 *
 * The article hero is a wide banner by default. A tall cover carries its own subject and caption,
 * so it is shown whole instead of being cropped to that banner. Listing the asset here keeps the
 * decision deterministic at render time and avoids reading the filesystem inside a route handler,
 * which would pull the whole public directory into the function bundle.
 */
const TALL_COVER_ASSETS = new Set<string>([
  "/journal/voa-20260922/fasting-of-the-heart-zhuangzi-attention/cover.png",
]);

export function isTallCover(heroImage: string | undefined): boolean {
  return Boolean(heroImage && TALL_COVER_ASSETS.has(heroImage));
}
