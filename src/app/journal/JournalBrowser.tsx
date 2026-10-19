"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SectionReveal from "@/components/ui/SectionReveal";
import LikeButton from "@/components/ui/LikeButton";
import CommentSection from "@/components/ui/CommentSection";
import { blogPosts, type BlogPost } from "@/data/blog-posts";
import { JOURNAL_HERO_IMAGES } from "@/data/journal-hero-images";
import {
  TAGS_SHOWN_INITIALLY,
  deriveCategories,
  deriveTagFacets,
  deriveYears,
  filterJournal,
  heroImageFor,
  journalHref,
  parseJournalState,
  pageSlice,
  plainTitle,
  postsWithImagery,
  type JournalState,
} from "@/lib/journal-browse";
import { artworkRecordsForJournal } from "@/lib/journal-artworks";
import { readSavedPosition, returnScrollTarget, withSavedPosition } from "@/lib/gallery-collection";

const POSITIONS_KEY = "ut-journal-positions";

/**
 * The collection. Server-rendered from the address it was requested with, so the response already
 * contains the search field, the filters and the article links; after hydration the same state is
 * applied without a round trip. Every control is a real link or a GET form, so the page still works
 * when the script does not.
 */
export default function JournalBrowser({
  initialState,
  totalRecords,
}: {
  initialState: JournalState;
  totalRecords: number;
}) {
  const [state, setState] = useState<JournalState>(initialState);
  const [queryInput, setQueryInput] = useState(initialState.q);
  const [showAllTags, setShowAllTags] = useState(false);

  /* The address follows the view without asking the server for it again. */
  const apply = useCallback((next: JournalState, mode: "push" | "replace" = "push") => {
    setState(next);
    const href = journalHref(next);
    try {
      if (mode === "push") window.history.pushState({ journal: true }, "", href);
      else window.history.replaceState({ journal: true }, "", href);
    } catch {
      /* if the address cannot be updated the view still changes */
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const parsed = parseFromLocation();
      setState(parsed);
      setQueryInput(parsed.q);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* Typing replaces rather than pushes: one history entry per keystroke is noise. Discrete filters
     push, so Back walks the views the visitor actually chose. */
  useEffect(() => {
    const trimmed = queryInput.trim();
    if (trimmed === state.q) return;
    const timer = setTimeout(() => apply({ ...state, q: trimmed, page: 1 }, "replace"), 300);
    return () => clearTimeout(timer);
  }, [queryInput, state, apply]);

  const results = useMemo(() => filterJournal(blogPosts, state), [state]);
  const { items, page, pageCount } = pageSlice(results, state.page);
  const years = useMemo(() => deriveYears(), []);
  const categories = useMemo(() => deriveCategories(), []);
  const facets = useMemo(() => deriveTagFacets(), []);

  /* The selected facet is always on screen: a direct alias address resolves to the canonical facet,
     and that facet must be visible even when it is not among the first eighteen. */
  const visibleTags = useMemo(() => {
    const head = facets.slice(0, TAGS_SHOWN_INITIALLY);
    if (!state.tag || head.some((f) => f.tag === state.tag)) return head;
    const active = facets.find((f) => f.tag === state.tag);
    return active ? [active, ...head] : head;
  }, [facets, state.tag]);

  const filtered = Boolean(state.q || state.year || state.tag || state.category !== "all");
  const isEntrance = !filtered && page === 1;
  const featured = useMemo(() => postsWithImagery(blogPosts, JOURNAL_HERO_IMAGES).slice(0, 4), []);

  const returnAddressFor = (slug: string) => `${journalHref(state)}#j-${slug}`;

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#j-")) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    const anchor = returnScrollTarget(target.getBoundingClientRect().top + window.scrollY);
    let top = anchor;
    try {
      const saved = readSavedPosition(sessionStorage.getItem(POSITIONS_KEY), journalHref(state), hash.slice(3));
      if (saved && Math.abs(saved.y - anchor) <= 600) top = saved.y;
    } catch {
      /* storage is a convenience, never a requirement */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }, [state]);

  const rememberPlace = (slug: string) => {
    try {
      sessionStorage.setItem(
        POSITIONS_KEY,
        withSavedPosition(sessionStorage.getItem(POSITIONS_KEY), journalHref(state), {
          y: Math.round(window.scrollY),
          work: slug,
        })
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {/* Search first: it is the control a returning visitor reaches for. */}
      <SectionReveal delay={0.05}>
        <form role="search" method="get" action="/journal" className="mb-6" onSubmit={(event) => {
          event.preventDefault();
          apply({ ...state, q: queryInput.trim(), page: 1 }, "push");
        }}>
          {state.category !== "all" && <input type="hidden" name="category" value={state.category} />}
          {state.year && <input type="hidden" name="year" value={state.year} />}
          {state.tag && <input type="hidden" name="tag" value={state.tag} />}
          <label htmlFor="journal-search" className="sr-only">
            Search the Journal by title, excerpt or tag
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="journal-search"
              name="q"
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search titles, excerpts and tags…"
              autoComplete="off"
              className="flex-1 bg-transparent border px-4 py-3 font-body text-base outline-none focus-visible:ring-2"
              style={{ borderColor: "rgba(0,229,255,0.25)", color: "var(--ut-white)", caretColor: "var(--ut-cyan)" }}
            />
            <button
              type="submit"
              className="font-mono text-[10px] tracking-[0.25em] uppercase px-5 py-3 border transition-colors focus-visible:ring-2"
              style={{ borderColor: "rgba(0,229,255,0.35)", color: "var(--ut-cyan)", background: "rgba(0,229,255,0.05)" }}
            >
              Search
            </button>
            {filtered && (
              <Link
                href="/journal"
                onClick={(event) => {
                  event.preventDefault();
                  setQueryInput("");
                  apply({ q: "", year: null, tag: null, category: "all", page: 1 }, "push");
                }}
                className="font-mono text-[10px] tracking-[0.25em] uppercase px-5 py-3 border transition-colors focus-visible:ring-2 text-center"
                style={{ borderColor: "rgba(217,70,239,0.3)", color: "var(--ut-magenta)" }}
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </SectionReveal>

      {/* Entrance — the whole archive only */}
      {isEntrance && featured.length > 0 && (
        <SectionReveal delay={0.06}>
          <div className="mb-12 grid grid-cols-1 lg:grid-cols-5 gap-5">
            <FeaturedCard post={featured[0]} returnAddress={returnAddressFor(featured[0].slug)} onOpen={rememberPlace} />
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {featured.slice(1, 4).map((post) => (
                <TileCard key={post.slug} post={post} returnAddress={returnAddressFor(post.slug)} onOpen={rememberPlace} />
              ))}
            </div>
          </div>
        </SectionReveal>
      )}

      {/* Collections */}
      <SectionReveal delay={0.08}>
        <div className="flex flex-wrap gap-2 justify-center mb-4" role="group" aria-label="Filter by collection">
          {categories.map(({ key, label, count }) => (
            <FilterLink
              key={key}
              href={journalHref({ ...state, category: key, page: 1 })}
              active={state.category === key}
              onClick={() => apply({ ...state, category: key, page: 1 })}
              label={`${label} ${count}`}
            />
          ))}
        </div>
      </SectionReveal>

      {/* Years, derived */}
      <SectionReveal delay={0.1}>
        <div className="flex flex-wrap gap-2 justify-center mb-5" role="group" aria-label="Filter by year">
          <FilterLink
            href={journalHref({ ...state, year: null, page: 1 })}
            active={!state.year}
            onClick={() => apply({ ...state, year: null, page: 1 })}
            label="All years"
            tone="magenta"
            small
          />
          {years.map(({ year, count }) => (
            <FilterLink
              key={year}
              href={journalHref({ ...state, year, page: 1 })}
              active={state.year === year}
              onClick={() => apply({ ...state, year: state.year === year ? null : year, page: 1 })}
              label={`${year} ${count}`}
              tone="magenta"
              small
            />
          ))}
        </div>
      </SectionReveal>

      {/* The tag bank, folded */}
      <SectionReveal delay={0.12}>
        <div className="mb-8 text-center">
          <div className="flex flex-wrap gap-2 justify-center" id="journal-tag-bank" role="group" aria-label="Filter by tag">
            <FilterLink
              href={journalHref({ ...state, tag: null, page: 1 })}
              active={!state.tag}
              onClick={() => apply({ ...state, tag: null, page: 1 })}
              label="Any tag"
              small
            />
            {(showAllTags ? facets : visibleTags).map(({ tag, label, count }) => {
              const active = state.tag === tag;
              return (
                <FilterLink
                  key={tag}
                  href={journalHref({ ...state, tag: active ? null : tag, page: 1 })}
                  active={active}
                  onClick={() => apply({ ...state, tag: active ? null : tag, page: 1 })}
                  label={`${label} ${count}`}
                  small
                />
              );
            })}
          </div>
          <button
            type="button"
            aria-expanded={showAllTags}
            aria-controls="journal-tag-bank"
            onClick={() => setShowAllTags((open) => !open)}
            className="mt-4 font-mono text-[9px] tracking-[0.25em] uppercase underline-offset-4 hover:underline focus-visible:ring-2 px-2 py-1"
            style={{ color: "var(--ut-white-faint)" }}
          >
            {showAllTags ? "Fold the tag bank" : `Browse all ${facets.length} tags`}
          </button>
        </div>
      </SectionReveal>

      <SectionReveal delay={0.14}>
        <p className="font-mono text-[9px] tracking-widest uppercase mb-8 text-center" style={{ color: "var(--ut-white-faint)" }}>
          {results.length} of {totalRecords} {results.length === 1 ? "transmission" : "transmissions"}
          {state.category !== "all" ? ` · ${state.category === "voa" ? "Vault of Arcana" : "Personal Codex Logs"}` : ""}
          {state.year ? ` · ${state.year}` : ""}
          {state.tag ? ` · #${state.tag}` : ""}
          {state.q ? ` · “${state.q}”` : ""}
          {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
        </p>
      </SectionReveal>

      {items.length === 0 ? (
        <SectionReveal>
          <div className="ut-card text-center px-6 py-14">
            <p className="font-heading text-lg mb-3" style={{ color: "var(--ut-white)" }}>
              Nothing answers that combination
            </p>
            <p className="font-body text-sm max-w-md mx-auto mb-6" style={{ color: "var(--ut-white-dim)" }}>
              No records answer that yet. Clear a filter, or search a word from a title you remember.
            </p>
            <Link
              href="/journal"
              onClick={(event) => {
                event.preventDefault();
                setQueryInput("");
                apply({ q: "", year: null, tag: null, category: "all", page: 1 }, "push");
              }}
              className="font-mono text-[10px] tracking-[0.25em] uppercase px-5 py-2 border"
              style={{ borderColor: "rgba(0,229,255,0.3)", color: "var(--ut-cyan)" }}
            >
              Show all records
            </Link>
          </div>
        </SectionReveal>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {items.map((post, index) => (
            <SectionReveal key={post.slug} delay={Math.min(index, 6) * 0.03}>
              <PostCard
                post={post}
                heroImage={heroImageFor(post, JOURNAL_HERO_IMAGES)}
                returnAddress={returnAddressFor(post.slug)}
                onOpen={rememberPlace}
                anchorId={`j-${post.slug}`}
              />
            </SectionReveal>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <SectionReveal delay={0.18}>
          <nav className="flex items-center justify-center gap-2 flex-wrap" aria-label="Journal pages">
            <PageLink
              href={journalHref({ ...state, page: Math.max(1, page - 1) })}
              disabled={page === 1}
              onClick={() => apply({ ...state, page: Math.max(1, page - 1) })}
              label="← Prev"
              wide
            />
            {Array.from({ length: pageCount }, (_, idx) => idx + 1).map((number) => (
              <PageLink
                key={number}
                href={journalHref({ ...state, page: number })}
                current={page === number}
                onClick={() => apply({ ...state, page: number })}
                label={String(number)}
                square
              />
            ))}
            <PageLink
              href={journalHref({ ...state, page: Math.min(pageCount, page + 1) })}
              disabled={page === pageCount}
              onClick={() => apply({ ...state, page: Math.min(pageCount, page + 1) })}
              label="Next →"
              wide
            />
          </nav>
        </SectionReveal>
      )}
    </>
  );
}

function parseFromLocation(): JournalState {
  try {
    return parseJournalState(new URLSearchParams(window.location.search));
  } catch {
    return { q: "", year: null, tag: null, category: "all", page: 1 };
  }
}

/* ── controls ──────────────────────────────────────────────────────────────────────── */

function toneStyle(active: boolean, tone: "cyan" | "magenta", small: boolean) {
  const rgb = tone === "cyan" ? "0,229,255" : "217,70,239";
  return {
    borderColor: active ? `var(--ut-${tone})` : `rgba(${rgb},0.15)`,
    color: active ? `var(--ut-${tone})` : small ? "var(--ut-white-dim)" : `rgba(${rgb},0.5)`,
    background: active ? `rgba(${rgb},0.06)` : "transparent",
  } as React.CSSProperties;
}

function FilterLink({
  href,
  active,
  onClick,
  label,
  tone = "cyan",
  small = false,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "cyan" | "magenta";
  small?: boolean;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "true" : undefined}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`font-mono ${small ? "text-[9] px-3 py-1" : "text-[10] px-4 py-2"} tracking-widest uppercase border transition-colors focus-visible:ring-2`}
      style={toneStyle(active, tone, small)}
    >
      {label}
    </a>
  );
}

function PageLink({
  href,
  onClick,
  label,
  current = false,
  disabled = false,
  square = false,
  wide = false,
}: {
  href: string;
  onClick: () => void;
  label: string;
  current?: boolean;
  disabled?: boolean;
  square?: boolean;
  wide?: boolean;
}) {
  const cls = square
    ? "font-mono text-[10px] w-8 h-8 flex items-center justify-center border"
    : "font-mono text-[10px] tracking-widest uppercase px-4 py-2 border";
  if (disabled) {
    return <span className={`${cls} opacity-30`} style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-cyan)" }}>{label}</span>;
  }
  return (
    <a
      href={href}
      aria-current={current ? "page" : undefined}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`${cls} transition-colors focus-visible:ring-2 ${wide ? "" : ""}`}
      style={
        square
          ? {
              borderColor: current ? "var(--ut-cyan)" : "rgba(0,229,255,0.15)",
              color: current ? "var(--ut-cyan)" : "var(--ut-white-faint)",
              background: current ? "rgba(0,229,255,0.06)" : "transparent",
            }
          : { borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-cyan)" }
      }
    >
      {label}
    </a>
  );
}

/* ── cards ────────────────────────────────────────────────────────────────────────── */

function dateLabel(publishedAt: string): string {
  return new Date(publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** The featured record: the image is shown whole and the caption sits beside it, not over it. */
function FeaturedCard({
  post,
  returnAddress,
  onOpen,
}: {
  post: BlogPost;
  returnAddress: string;
  onOpen: (slug: string) => void;
}) {
  const image = heroImageFor(post, JOURNAL_HERO_IMAGES);
  const documented = artworkRecordsForJournal(post.slug);
  return (
    <div className="ut-card overflow-hidden lg:col-span-3" style={{ padding: 0 }}>
      <Link
        href={`/journal/${post.slug}?from=${encodeURIComponent(returnAddress)}`}
        onClick={() => onOpen(post.slug)}
        className="block focus-visible:outline-none focus-visible:ring-2"
      >
        {image && (
          <div className="w-full" style={{ background: "#04050a" }}>
            <Image
              src={image}
              alt={plainTitle(post.title)}
              width={1200}
              height={900}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="w-full h-auto block"
              unoptimized
            />
          </div>
        )}
        <div className="p-5">
          <p className="font-mono text-[8px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--ut-cyan)" }}>
            {dateLabel(post.publishedAt)} · {post.readTime}
          </p>
          <h2
            className="font-heading text-xl md:text-2xl leading-snug mb-2"
            style={{ color: "var(--ut-white)" }}
            dangerouslySetInnerHTML={{ __html: post.title }}
          />
          <p className="font-body text-sm leading-relaxed mb-3 line-clamp-2" style={{ color: "var(--ut-white-dim)" }}>
            {post.excerpt}
          </p>
          {documented.length > 0 && (
            <p className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-gold, #d4a847)" }}>
              Documents {documented[0].title}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

/** The three companion tiles: image above, caption beneath, so neither is read through the other. */
function TileCard({
  post,
  returnAddress,
  onOpen,
}: {
  post: BlogPost;
  returnAddress: string;
  onOpen: (slug: string) => void;
}) {
  const image = heroImageFor(post, JOURNAL_HERO_IMAGES);
  return (
    <Link
      href={`/journal/${post.slug}?from=${encodeURIComponent(returnAddress)}`}
      onClick={() => onOpen(post.slug)}
      className="ut-card group block overflow-hidden h-full focus-visible:outline-none focus-visible:ring-2"
      style={{ padding: 0 }}
    >
      <div className="aspect-video relative overflow-hidden" style={{ background: "#04050a" }}>
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 1024px) 50vw, 25vw"
            className="object-cover object-center"
            unoptimized
          />
        )}
      </div>
      <div className="px-4 py-3">
        <p className="font-mono text-[8px] tracking-[0.25em] uppercase mb-1" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
          {dateLabel(post.publishedAt)}
        </p>
        <p
          className="font-heading text-[11px] leading-snug line-clamp-2"
          style={{ color: "var(--ut-white)" }}
          dangerouslySetInnerHTML={{ __html: post.title }}
        />
      </div>
    </Link>
  );
}

function PostCard({
  post,
  heroImage,
  returnAddress,
  onOpen,
  anchorId,
}: {
  post: BlogPost;
  heroImage?: string;
  returnAddress: string;
  onOpen: (slug: string) => void;
  anchorId: string;
}) {
  const [imgError, setImgError] = useState(false);
  const documented = artworkRecordsForJournal(post.slug);
  return (
    <article id={anchorId} className="ut-card overflow-hidden group" style={{ padding: 0 }}>
      <Link
        href={`/journal/${post.slug}?from=${encodeURIComponent(returnAddress)}`}
        onClick={() => onOpen(post.slug)}
        className="block focus-visible:outline-none focus-visible:ring-2"
      >
        <div className="aspect-video relative overflow-hidden">
          {heroImage && !imgError ? (
            <Image
              src={heroImage}
              alt=""
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(217,70,239,0.18), rgba(0,229,255,0.12) 60%, transparent)" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.1))" }} />
          <div className="absolute top-3 right-3">
            <span className="font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-1 bg-black/40 backdrop-blur-sm" style={{ color: "var(--ut-white-faint)" }}>
              {post.readTime}
            </span>
          </div>
        </div>
        <div className="p-5">
          <p className="font-mono text-[8px] tracking-[0.25em] uppercase mb-2" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
            {dateLabel(post.publishedAt)}
          </p>
          <h2
            className="font-heading text-base tracking-wider mb-3 leading-snug"
            style={{ color: "var(--ut-white)" }}
            dangerouslySetInnerHTML={{ __html: post.title }}
          />
          <p className="font-body text-sm leading-relaxed mb-3 line-clamp-3" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
            {post.excerpt}
          </p>
          {documented.length > 0 && (
            <p className="font-mono text-[8px] tracking-widest uppercase mb-3" style={{ color: "var(--ut-gold, #d4a847)" }}>
              Documents {documented[0].title}
            </p>
          )}
          <div className="flex gap-1.5 flex-wrap">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-mono text-[7px] tracking-widest uppercase px-1.5 py-0.5 border"
                style={{ borderColor: "rgba(0,229,255,0.1)", color: "var(--ut-white-faint)", opacity: 0.5 }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Link>
      <div className="px-5 pb-4 flex items-center justify-between">
        <span className="font-mono text-xs" style={{ color: "var(--ut-cyan)" }}>
          Read →
        </span>
        <div className="flex items-center gap-2">
          <LikeButton itemId={`journal-${post.slug}`} />
          <CommentSection itemId={`journal-${post.slug}`} itemType="journal" />
        </div>
      </div>
    </article>
  );
}
