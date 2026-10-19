/**
 * journal-browse.ts — the Journal's directory state, derived from its own records.
 *
 * The released index held its filters in component state only. The year filter worked on screen but
 * never reached the address, so a filtered view could not be linked, refreshed or returned to; the
 * article's "← Journal" link pointed at bare `/journal` and dropped the selection. This module is the
 * single owner of that state: one parser, one serialiser, one filter and one set of derived counts,
 * used by the index, the result cards and the article's return link.
 *
 * Everything here is DERIVED from `blogPosts`: years, categories, tags and counts. The released page
 * carried a hardcoded `ALL_YEARS` list that included a year the archive has no records for; that list
 * is not reproduced.
 *
 * Tag aliases are deliberately short and explicit. Every entry is a spelling variant of the same
 * referent, recorded because the archive itself carries both spellings across its eras. Source tags
 * are never rewritten: a record keeps exactly the tag it shipped with, and an alias only widens what
 * a browse selection matches. Similar-looking tags that name different things are NOT listed.
 */

import { blogPosts, type BlogPost } from "@/data/blog-posts";

export const JOURNAL_PAGE_SIZE = 12;
export const MAX_QUERY_LENGTH = 80;
export const MAX_TAG_LENGTH = 48;
export const MAX_RETURN_LENGTH = 400;
/** How many tags the index shows before the rest is disclosed. */
export const TAGS_SHOWN_INITIALLY = 18;

export type JournalCategory = "all" | "voa" | "personal";

export interface JournalState {
  q: string;
  year: string | null;
  tag: string | null;
  category: JournalCategory;
  page: number;
}

export const EMPTY_JOURNAL_STATE: JournalState = {
  q: "",
  year: null,
  tag: null,
  category: "all",
  page: 1,
};

/**
 * Reviewed browse aliases: minor spelling → the spelling the archive uses most.
 * chakras→chakra (19 records), athenor→athanor, daoism→taoism (7), nei-dan→neidan.
 * These are the same referent spelled differently; nothing else in the tag bank is merged.
 */
export const TAG_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  chakras: "chakra",
  athenor: "athanor",
  daoism: "taoism",
  "nei-dan": "neidan",
});

/** The canonical browse key for a tag (alias folded onto its dominant spelling). */
export function canonicalTagKey(tag: string): string {
  const key = String(tag || "").trim().toLowerCase();
  return TAG_ALIASES[key] ?? key;
}

/** Every source spelling that belongs to one browse key, canonical first. */
export function tagGroup(tag: string): string[] {
  const key = canonicalTagKey(tag);
  const members = Object.keys(TAG_ALIASES).filter((alias) => TAG_ALIASES[alias] === key);
  return [key, ...members];
}

/* ── Reading the address ─────────────────────────────────────────────────────────────── */

interface ParamReader {
  get(key: string): string | null;
}

function readParam(params: ParamReader | null | undefined, key: string): string {
  if (!params || typeof params.get !== "function") return "";
  try {
    const value = params.get(key);
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

export function parseJournalState(params: ParamReader | null | undefined): JournalState {
  const q = readParam(params, "q").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);

  const yearRaw = readParam(params, "year").trim();
  const year = /^\d{4}$/.test(yearRaw) ? yearRaw : null;

  /* An unknown tag is KEPT, not dropped: a shared address asking for a tag the archive does not
     carry should say so with an empty result, not silently widen to everything. */
  const tagRaw = readParam(params, "tag").trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
  const tag = /^[a-z0-9][a-z0-9 _-]*$/.test(tagRaw) ? tagRaw : null;

  const categoryRaw = readParam(params, "category").trim().toLowerCase();
  const category: JournalCategory =
    categoryRaw === "voa" || categoryRaw === "personal" ? categoryRaw : "all";

  const pageRaw = readParam(params, "page").trim();
  const pageNumber = Number.parseInt(pageRaw, 10);
  const page = Number.isFinite(pageNumber) && pageNumber >= 1 ? Math.min(pageNumber, 10_000) : 1;

  return { q, year, tag, category, page };
}

/* ── Writing the address ─────────────────────────────────────────────────────────────── */

export function journalSearchString(state: JournalState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.category !== "all") params.set("category", state.category);
  if (state.year) params.set("year", state.year);
  if (state.tag) params.set("tag", state.tag);
  if (state.page > 1) params.set("page", String(state.page));
  return params.toString();
}

export function journalHref(state: JournalState): string {
  const query = journalSearchString(state);
  return query ? `/journal?${query}` : "/journal";
}

/**
 * A return address is only usable when it names THIS archive.
 *
 * The site already validates internal return targets the same way elsewhere (leading slash, no
 * protocol-relative `//`, no backslash). Journal returns are narrowed further: the destination must
 * be `/journal` or `/journal?...` and nothing else, so a crafted `from` cannot bounce a visitor into
 * another surface or an off-site address.
 */
export function safeJournalReturn(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > MAX_RETURN_LENGTH) return null;
  if (!value.startsWith("/journal")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  if (value !== "/journal" && !value.startsWith("/journal?")) return null;
  return value;
}

/* ── Searching and filtering ─────────────────────────────────────────────────────────── */

/** Titles carry authored inline markup; it must not become part of the searchable text. */
export function plainTitle(title: string): string {
  return String(title || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The fields a visitor can search: the post's own title, excerpt and tags. */
export function searchableText(post: BlogPost): string {
  return [plainTitle(post.title), post.excerpt, (post.tags || []).join(" "), post.tradition ?? ""]
    .join(" ")
    .toLowerCase();
}

export function matchesQuery(post: BlogPost, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = searchableText(post);
  return tokens.every((token) => haystack.includes(token));
}

export function postHasTag(post: BlogPost, tag: string): boolean {
  const group = tagGroup(tag);
  return (post.tags || []).some((t) => group.includes(String(t).trim().toLowerCase()));
}

/** Stable order: newest first, ties broken by slug so pagination cannot shuffle between renders. */
export function sortJournal(posts: readonly BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const byDate = String(b.publishedAt).localeCompare(String(a.publishedAt));
    return byDate !== 0 ? byDate : a.slug.localeCompare(b.slug);
  });
}

export function filterJournal(
  posts: readonly BlogPost[],
  state: JournalState
): BlogPost[] {
  const matched = posts.filter((post) => {
    if (state.category === "voa" && !post.tradition) return false;
    if (state.category === "personal" && post.tradition) return false;
    if (state.year && !String(post.publishedAt).startsWith(state.year)) return false;
    if (state.tag && !postHasTag(post, state.tag)) return false;
    if (state.q && !matchesQuery(post, state.q)) return false;
    return true;
  });
  return sortJournal(matched);
}

export function pageCountFor(total: number, pageSize: number = JOURNAL_PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageSlice<T>(
  items: readonly T[],
  page: number,
  pageSize: number = JOURNAL_PAGE_SIZE
): { items: T[]; page: number; pageCount: number } {
  const pageCount = pageCountFor(items.length, pageSize);
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, pageCount };
}

/* ── Counts, derived from the records themselves ─────────────────────────────────────── */

export interface TagFacet {
  /** The browse key: the spelling a selection is written as. */
  tag: string;
  /** How the index labels it (the spelling the archive uses most). */
  label: string;
  count: number;
}

export function deriveTagFacets(posts: readonly BlogPost[] = blogPosts): TagFacet[] {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const post of posts) {
    for (const raw of post.tags || []) {
      const source = String(raw).trim().toLowerCase();
      if (!source) continue;
      const key = canonicalTagKey(source);
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!labels.has(key) || source === key) labels.set(key, key);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, label: labels.get(tag) ?? tag, count }))
    .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag));
}

export function deriveYears(posts: readonly BlogPost[] = blogPosts): { year: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const year = String(post.publishedAt).slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    counts.set(year, (counts.get(year) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year.localeCompare(a.year));
}

export function deriveCategories(
  posts: readonly BlogPost[] = blogPosts
): { key: JournalCategory; label: string; count: number }[] {
  const voa = posts.filter((p) => p.tradition).length;
  return [
    { key: "all", label: "All records", count: posts.length },
    { key: "voa", label: "Vault of Arcana", count: voa },
    { key: "personal", label: "Personal Codex Logs", count: posts.length - voa },
  ];
}

/** The records that carry imagery, newest first — the entrance leads with these. */
export function postsWithImagery(
  posts: readonly BlogPost[],
  images: Readonly<Record<string, string>>
): BlogPost[] {
  return sortJournal(posts).filter((post) => Boolean(post.heroImage || images[post.slug]));
}

export function heroImageFor(post: BlogPost, images: Readonly<Record<string, string>>): string | undefined {
  return post.heroImage || images[post.slug];
}
