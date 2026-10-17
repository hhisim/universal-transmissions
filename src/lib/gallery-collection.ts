/**
 * gallery-collection.ts — the collection's own metadata, derived rather than declared.
 *
 * The released gallery carried its groups by hand: a hardcoded list of six "prismatic" slugs
 * that had drifted from the registry (the `prismatic` tag names five), a series filter that
 * excluded one tag by hand, and a random shuffle for order. Every grouping here is read out
 * of the artwork registry itself, so a work added to `src/data/artworks.ts` appears in the
 * right place with the right count and nothing has to be remembered separately.
 *
 * Three things are derived, and none of them is invented:
 *
 *  1. SERIES — the tags the registry already uses for its multi-work groupings. The label is
 *     the registry's own series name. A work that carries none of them is not forced into a
 *     series it does not belong to; it is available under "All works" and counted in the
 *     honest remainder group. A work can be in more than one series, which is why the series
 *     counts do not sum to the collection size.
 *
 *  2. ORIENTATION AND ASPECT — read from `ARTWORK_IMAGE_META`, which records what each master
 *     already is. The released grid rendered every work into a fixed 4:5 box, cropping
 *     landscape pieces and portrait pieces alike.
 *
 *  3. SEARCH AND ORDER — match and order over fields the registry already carries (title,
 *     series, medium, year, description). Order is deterministic: the registry's own order,
 *     or a sort the visitor chooses. It is never random, so returning to the gallery returns
 *     a visitor to the same collection in the same order.
 */

import { artworks, type Artwork } from "@/data/artworks";
import { ARTWORK_IMAGE_META } from "@/data/artwork-image-meta";

/** The series names the registry already uses, in the order the archive lists them. */
const SERIES_DEFS: { tag: string; label: string }[] = [
  { tag: "universal-transmissions", label: "Universal Transmissions" },
  { tag: "bio-energetic-vortexes", label: "Bio-Energetic Vortexes" },
  { tag: "prismatic", label: "Prismatic Transmissions" },
  { tag: "twilight-transmissions", label: "Twilight Transmissions" },
];

const SERIES_TAGS = SERIES_DEFS.map((d) => d.tag);

export interface GallerySeries {
  /** Stable id used in the URL, e.g. `?series=bio-energetic-vortexes`. */
  id: string;
  label: string;
  /** How many works the registry files under this series. */
  count: number;
}

/** The collection, in registry order — the archive's own sequence. */
export const COLLECTION: Artwork[] = artworks;

export const COLLECTION_SIZE = artworks.length;

/** Series with their counts, plus the honest remainder for works in no named series. */
export function gallerySeries(): GallerySeries[] {
  const out: GallerySeries[] = SERIES_DEFS.map((d) => ({
    id: d.tag,
    label: d.label,
    count: artworks.filter((a) => a.tags.includes(d.tag)).length,
  }));
  const remainder = artworks.filter((a) => !a.tags.some((t) => SERIES_TAGS.includes(t))).length;
  if (remainder > 0) {
    out.push({ id: "other", label: "Other works", count: remainder });
  }
  return out;
}

/** Works in a series, by id. `other` is derived as "carries no series tag". */
export function worksInSeries(seriesId: string): Artwork[] {
  if (seriesId === "all" || !seriesId) return artworks;
  if (seriesId === "other") {
    return artworks.filter((a) => !a.tags.some((t) => SERIES_TAGS.includes(t)));
  }
  return artworks.filter((a) => a.tags.includes(seriesId));
}

export type Orientation = "landscape" | "portrait" | "square";

/**
 * A master's orientation, read from the recorded dimensions of the file itself.
 * Returns null when the registry records no size for the work (one work, `tesseract`,
 * has no entry) — that absence is reported as an absence rather than guessed at, so the
 * work is never placed in a bucket its own record does not support.
 */
export function orientationOf(slug: string): Orientation | null {
  const meta = ARTWORK_IMAGE_META[slug];
  if (!meta) return null;
  if (meta.width === meta.height) return "square";
  return meta.width > meta.height ? "landscape" : "portrait";
}

/** How many works the registry records in each orientation, and how many it does not. */
export function orientationCounts(): Record<Orientation | "unrecorded", number> {
  const out: Record<Orientation | "unrecorded", number> = {
    landscape: 0,
    portrait: 0,
    square: 0,
    unrecorded: 0,
  };
  for (const a of artworks) {
    const o = orientationOf(a.slug);
    if (o) out[o] += 1;
    else out.unrecorded += 1;
  }
  return out;
}

/**
 * The work's own aspect ratio, as a CSS value, or null when no size is recorded.
 * Null is not replaced with a guess: a card with no recorded ratio shows the work
 * contained inside a neutral box, so nothing is ever cropped to fit a claim.
 */
export function aspectOf(slug: string): string | null {
  const meta = ARTWORK_IMAGE_META[slug];
  if (!meta) return null;
  return `${meta.width} / ${meta.height}`;
}

/** True when the registry gives this work a transcription film. */
export function isAnimated(artwork: Artwork): boolean {
  return Boolean(artwork.transcriptionVideoId);
}

export type GallerySort = "registry" | "newest" | "oldest" | "title";

export const SORTS: { id: GallerySort; label: string }[] = [
  { id: "registry", label: "Archive order" },
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "title", label: "Title A–Z" },
];

export function isSort(value: string | null): value is GallerySort {
  return value === "registry" || value === "newest" || value === "oldest" || value === "title";
}

/**
 * Search over the fields the registry carries. A word has to appear in one of them; this
 * does not read meaning into a work, it matches what the archive already says about it.
 */
export function searchWorks(list: Artwork[], query: string): Artwork[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const terms = q.split(/\s+/).filter(Boolean);
  return list.filter((a) => {
    const haystack = [a.title, a.medium, String(a.year), a.description, ...a.tags]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

/** Deterministic ordering. Ties fall back to registry order so the result never reshuffles. */
export function sortWorks(list: Artwork[], sort: GallerySort): Artwork[] {
  const indexed = list.map((a, i) => ({ a, i }));
  const byIndex = (x: { i: number }, y: { i: number }) => x.i - y.i;
  switch (sort) {
    case "newest":
      return indexed.sort((x, y) => y.a.year - x.a.year || byIndex(x, y)).map((e) => e.a);
    case "oldest":
      return indexed.sort((x, y) => x.a.year - y.a.year || byIndex(x, y)).map((e) => e.a);
    case "title":
      return indexed.sort((x, y) => x.a.title.localeCompare(y.a.title) || byIndex(x, y)).map((e) => e.a);
    case "registry":
    default:
      return indexed.sort(byIndex).map((e) => e.a);
  }
}

export interface BrowseState {
  series: string;
  q: string;
  sort: GallerySort;
  /** The work the visitor came back to, if the URL named one. */
  work: string | null;
  orientation: Orientation | "all";
}

/** Read browse state out of a URL query. Unknown values fall back rather than error. */
export function parseBrowseState(params: URLSearchParams | { get(k: string): string | null }): BrowseState {
  const series = params.get("series") ?? "all";
  const known = new Set(["all", ...gallerySeries().map((s) => s.id)]);
  const sortRaw = params.get("sort");
  const orientRaw = params.get("orientation");
  return {
    series: known.has(series) ? series : "all",
    q: (params.get("q") ?? "").slice(0, 120),
    sort: isSort(sortRaw) ? sortRaw : "registry",
    work: params.get("work"),
    orientation:
      orientRaw === "landscape" || orientRaw === "portrait" || orientRaw === "square" ? orientRaw : "all",
  };
}

/** The canonical query for a browse state — the shareable, restorable address. */
export function browseQuery(state: Partial<BrowseState>): string {
  const p = new URLSearchParams();
  if (state.series && state.series !== "all") p.set("series", state.series);
  if (state.q) p.set("q", state.q);
  if (state.sort && state.sort !== "registry") p.set("sort", state.sort);
  if (state.orientation && state.orientation !== "all") p.set("orientation", state.orientation);
  if (state.work) p.set("work", state.work);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** The collection after the visitor's narrowing, in the order they will see it. */
export function visibleWorks(state: BrowseState): Artwork[] {
  let list = worksInSeries(state.series);
  if (state.orientation !== "all") {
    list = list.filter((a) => orientationOf(a.slug) === state.orientation);
  }
  list = searchWorks(list, state.q);
  return sortWorks(list, state.sort);
}
