/**
 * Covers we publish at a portrait ratio, with their intrinsic size.
 *
 * The article hero is a wide banner by default. A tall cover carries its own subject and caption, so it
 * gets its own reading layout instead. Listing the asset here keeps the decision deterministic at render
 * time and avoids reading the filesystem inside a route handler, which would pull the whole public
 * directory into the function bundle.
 */
export const TALL_COVERS: Record<string, { width: number; height: number }> = {
  "/journal/voa-20260922/fasting-of-the-heart-zhuangzi-attention/cover.png": {
    width: 1024,
    height: 1536,
  },
};

export function isTallCover(heroImage: string | undefined): boolean {
  return Boolean(heroImage && TALL_COVERS[heroImage]);
}

export function tallCoverSize(heroImage: string | undefined): { width: number; height: number } {
  return (heroImage && TALL_COVERS[heroImage]) || { width: 1200, height: 630 };
}
