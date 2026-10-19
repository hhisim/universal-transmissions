"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
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
  pageSlice,
  parseJournalState,
  postsWithImagery,
  type JournalState,
} from "@/lib/journal-browse";
import { artworkRecordsForJournal } from "@/lib/journal-artworks";
import { readSavedPosition, returnScrollTarget, withSavedPosition } from "@/lib/gallery-collection";

const POSITIONS_KEY = "ut-journal-positions";

const EMPTY_MESSAGE =
  "No records answer that yet. Clear a filter, or search a word from a title you remember.";

export default function JournalBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  const paramsKey = params?.toString() ?? "";
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const state = useMemo(() => parseJournalState(params), [paramsKey]);

  const [queryInput, setQueryInput] = useState(state.q);
  useEffect(() => {
    setQueryInput(state.q);
  }, [state.q]);

  const go = useCallback(
    (next: Partial<JournalState>, mode: "push" | "replace" = "push") => {
      const merged: JournalState = { ...state, ...next };
      const href = journalHref(merged);
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, state]
  );

  /* Typing replaces rather than pushes: a search box should not fill the Back stack with
     one entry per keystroke. Discrete filters and pages do push, so Back walks the visits. */
  useEffect(() => {
    const trimmed = queryInput.trim();
    if (trimmed === state.q) return;
    const timer = setTimeout(() => go({ q: trimmed, page: 1 }, "replace"), 300);
    return () => clearTimeout(timer);
  }, [queryInput, state.q, go]);

  const results = useMemo(() => filterJournal(blogPosts, state), [state]);
  const { items, page, pageCount } = pageSlice(results, state.page);
  const years = useMemo(() => deriveYears(), []);
  const categories = useMemo(() => deriveCategories(), []);
  const facets = useMemo(() => deriveTagFacets(), []);
  const [showAllTags, setShowAllTags] = useState(false);

  const filtered = Boolean(state.q || state.year || state.tag || state.category !== "all");
  const isEntrance = !filtered && page === 1;
  const visibleTags = useMemo(() => {
    const head = facets.slice(0, TAGS_SHOWN_INITIALLY);
    if (!state.tag || head.some((f) => f.tag === state.tag)) return head;
    const active = facets.find((f) => f.tag === state.tag);
    return active ? [active, ...head] : head;
  }, [facets, state.tag, showAllTags]);

  /* A return lands on the record it left from, in the collection it left from. */
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#j-")) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    const anchor = returnScrollTarget(target.getBoundingClientRect().top + window.scrollY);
    let top = anchor;
    try {
      const saved = readSavedPosition(sessionStorage.getItem(POSITIONS_KEY), paramsKey, hash.slice(3));
      /* A saved position is only useful when it is actually near the record: a reader who opened the
         card from the top of the page saved y=0, and honouring that would return them to the top with
         the card they left from still off screen. Outside that window the card's own anchor wins. */
      if (saved && Math.abs(saved.y - anchor) <= 600) top = saved.y;
    } catch {
      /* storage is a convenience, never a requirement */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    /* Runs once per arrival; the hash is the arrival's own instruction. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rememberPlace = (slug: string) => {
    try {
      const raw = sessionStorage.getItem(POSITIONS_KEY);
      sessionStorage.setItem(
        POSITIONS_KEY,
        withSavedPosition(raw, paramsKey, { y: Math.round(window.scrollY), work: slug })
      );
    } catch {
      /* ignore */
    }
  };

  /* The address an article offers back to this exact view, anchored on the record it was opened from. */
  const returnAddressFor = (slug: string) => `${journalHref(state)}#j-${slug}`;

  const featured = useMemo(() => postsWithImagery(blogPosts, JOURNAL_HERO_IMAGES).slice(0, 4), []);

  return (
    <>
      {/* Search — the first thing a returning visitor reaches for */}
      <SectionReveal delay={0.05}>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            go({ q: queryInput.trim(), page: 1 });
          }}
          className="mb-6"
        >
          <label htmlFor="journal-search" className="sr-only">
            Search the Journal by title, excerpt or tag
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="journal-search"
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Search titles, excerpts and tags…"
              autoComplete="off"
              className="flex-1 bg-transparent border px-4 py-3 font-body text-base outline-none focus-visible:ring-2"
              style={{
                borderColor: "rgba(0,229,255,0.25)",
                color: "var(--ut-white)",
                caretColor: "var(--ut-cyan)",
              }}
            />
            <button
              type="submit"
              className="font-mono text-[10px] tracking-[0.25em] uppercase px-5 py-3 border transition-colors focus-visible:ring-2"
              style={{ borderColor: "rgba(0,229,255,0.35)", color: "var(--ut-cyan)", background: "rgba(0,229,255,0.05)" }}
            >
              Search
            </button>
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setQueryInput("");
                  router.push("/journal", { scroll: false });
                }}
                className="font-mono text-[10px] tracking-[0.25em] uppercase px-5 py-3 border transition-colors focus-visible:ring-2"
                style={{ borderColor: "rgba(217,70,239,0.3)", color: "var(--ut-magenta)" }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </SectionReveal>

      {/* Entrance — only when the visitor is looking at the whole archive */}
      {isEntrance && featured.length > 0 && (
        <SectionReveal>
          <div className="mb-14 grid grid-cols-1 lg:grid-cols-5 gap-5">
            <EntranceCard post={featured[0]} className="lg:col-span-3" returnAddress={returnAddressFor(featured[0].slug)} onOpen={rememberPlace} tall />
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {featured.slice(1, 4).map((post) => (
                <EntranceCard key={post.slug} post={post} returnAddress={returnAddressFor(post.slug)} onOpen={rememberPlace} />
              ))}
            </div>
          </div>
        </SectionReveal>
      )}

      {/* Category + year, both derived from the records */}
      <SectionReveal delay={0.08}>
        <div className="flex flex-wrap gap-2 justify-center mb-4" role="group" aria-label="Filter by collection">
          {categories.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              aria-pressed={state.category === key}
              onClick={() => go({ category: key, page: 1 })}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-colors focus-visible:ring-2"
              style={{
                borderColor: state.category === key ? "var(--ut-cyan)" : "rgba(0,229,255,0.2)",
                color: state.category === key ? "var(--ut-cyan)" : "rgba(0,229,255,0.5)",
                background: state.category === key ? "rgba(0,229,255,0.08)" : "transparent",
              }}
            >
              {label} <span style={{ opacity: 0.55 }}>{count}</span>
            </button>
          ))}
        </div>
      </SectionReveal>

      <SectionReveal delay={0.1}>
        <div className="flex flex-wrap gap-2 justify-center mb-5" role="group" aria-label="Filter by year">
          <button
            type="button"
            aria-pressed={!state.year}
            onClick={() => go({ year: null, page: 1 })}
            className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-colors focus-visible:ring-2"
            style={{
              borderColor: !state.year ? "var(--ut-magenta)" : "rgba(217,70,239,0.15)",
              color: !state.year ? "var(--ut-magenta)" : "var(--ut-white-dim)",
              background: !state.year ? "rgba(217,70,239,0.06)" : "transparent",
            }}
          >
            All years
          </button>
          {years.map(({ year, count }) => (
            <button
              key={year}
              type="button"
              aria-pressed={state.year === year}
              onClick={() => go({ year: state.year === year ? null : year, page: 1 })}
              className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-colors focus-visible:ring-2"
              style={{
                borderColor: state.year === year ? "var(--ut-magenta)" : "rgba(217,70,239,0.15)",
                color: state.year === year ? "var(--ut-magenta)" : "var(--ut-white-dim)",
                background: state.year === year ? "rgba(217,70,239,0.06)" : "transparent",
              }}
            >
              {year} <span style={{ opacity: 0.55 }}>{count}</span>
            </button>
          ))}
        </div>
      </SectionReveal>

      {/* The tag bank, folded. 200+ tags as a wall buries the archive behind its own index. */}
      <SectionReveal delay={0.12}>
        <div className="mb-8 text-center">
          <div className="flex flex-wrap gap-2 justify-center" id="journal-tag-bank" role="group" aria-label="Filter by tag">
            <button
              type="button"
              aria-pressed={!state.tag}
              onClick={() => go({ tag: null, page: 1 })}
              className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-colors focus-visible:ring-2"
              style={{
                borderColor: !state.tag ? "var(--ut-cyan)" : "rgba(0,229,255,0.15)",
                color: !state.tag ? "var(--ut-cyan)" : "var(--ut-white-dim)",
                background: !state.tag ? "rgba(0,229,255,0.06)" : "transparent",
              }}
            >
              Any tag
            </button>
            {(showAllTags ? facets : visibleTags).map(({ tag, label, count }) => (
              <button
                key={tag}
                type="button"
                aria-pressed={state.tag === tag}
                aria-controls="journal-tag-bank"
                onClick={() => go({ tag: state.tag === tag ? null : tag, page: 1 })}
                className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-colors focus-visible:ring-2"
                style={{
                  borderColor: state.tag === tag ? "var(--ut-cyan)" : "rgba(0,229,255,0.15)",
                  color: state.tag === tag ? "var(--ut-cyan)" : "var(--ut-white-dim)",
                  background: state.tag === tag ? "rgba(0,229,255,0.06)" : "transparent",
                }}
              >
                {label} <span style={{ opacity: 0.5 }}>{count}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={showAllTags}
            onClick={() => setShowAllTags((open) => !open)}
            className="mt-4 font-mono text-[9px] tracking-[0.25em] uppercase underline-offset-4 hover:underline focus-visible:ring-2 px-2 py-1"
            style={{ color: "var(--ut-white-faint)" }}
          >
            {showAllTags ? "Fold the tag bank" : `Browse all ${facets.length} tags`}
          </button>
        </div>
      </SectionReveal>

      {/* Derived count — never a stored number */}
      <SectionReveal delay={0.14}>
        <p className="font-mono text-[9px] tracking-widest uppercase mb-8 text-center" style={{ color: "var(--ut-white-faint)" }}>
          {results.length} {results.length === 1 ? "transmission" : "transmissions"}
          {state.category !== "all" ? ` · ${state.category === "voa" ? "Vault of Arcana" : "Personal Codex Logs"}` : ""}
          {state.year ? ` · ${state.year}` : ""}
          {state.tag ? ` · #${state.tag}` : ""}
          {state.q ? ` · “${state.q}”` : ""}
        </p>
      </SectionReveal>

      {items.length === 0 ? (
        <SectionReveal>
          <div className="ut-card text-center px-6 py-14">
            <p className="font-heading text-lg mb-3" style={{ color: "var(--ut-white)" }}>
              Nothing answers that combination
            </p>
            <p className="font-body text-sm max-w-md mx-auto mb-6" style={{ color: "var(--ut-white-dim)" }}>
              {EMPTY_MESSAGE}
            </p>
            <Link
              href="/journal"
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
          <nav className="flex items-center justify-center gap-3 flex-wrap" aria-label="Journal pages">
            <button
              type="button"
              onClick={() => go({ page: Math.max(1, page - 1) })}
              disabled={page === 1}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-colors disabled:opacity-30 focus-visible:ring-2"
              style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-cyan)" }}
            >
              ← Prev
            </button>
            {Array.from({ length: pageCount }, (_, idx) => idx + 1).map((number) => (
              <button
                key={number}
                type="button"
                aria-current={page === number ? "page" : undefined}
                onClick={() => go({ page: number })}
                className="font-mono text-[10px] w-8 h-8 flex items-center justify-center border transition-colors focus-visible:ring-2"
                style={{
                  borderColor: page === number ? "var(--ut-cyan)" : "rgba(0,229,255,0.15)",
                  color: page === number ? "var(--ut-cyan)" : "var(--ut-white-faint)",
                  background: page === number ? "rgba(0,229,255,0.06)" : "transparent",
                }}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              onClick={() => go({ page: Math.min(pageCount, page + 1) })}
              disabled={page === pageCount}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-colors disabled:opacity-30 focus-visible:ring-2"
              style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-cyan)" }}
            >
              Next →
            </button>
          </nav>
        </SectionReveal>
      )}
    </>
  );
}

/* ── Cards ──────────────────────────────────────────────────────────────────────────── */

function dateLabel(publishedAt: string): string {
  return new Date(publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function EntranceCard({
  post,
  className = "",
  returnAddress,
  onOpen,
  tall = false,
}: {
  post: BlogPost;
  className?: string;
  returnAddress: string;
  onOpen: (slug: string) => void;
  tall?: boolean;
}) {
  const image = heroImageFor(post, JOURNAL_HERO_IMAGES);
  const documented = artworkRecordsForJournal(post.slug);
  return (
    <Link
      href={`/journal/${post.slug}?from=${encodeURIComponent(returnAddress)}`}
      onClick={() => onOpen(post.slug)}
      className={`ut-card group block overflow-hidden relative ${className}`}
      style={{ padding: 0, minHeight: tall ? 380 : 150 }}
      aria-label={`${post.title.replace(/<[^>]*>/g, "")} — ${dateLabel(post.publishedAt)}`}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes={tall ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 1024px) 50vw, 25vw"}
          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
          unoptimized
        />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%)" }} />
      <div className="relative h-full flex flex-col justify-end p-5">
        <p className="font-mono text-[8px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--ut-cyan)" }}>
          {dateLabel(post.publishedAt)} · {post.readTime}
        </p>
        <h2
          className={`font-heading ${tall ? "text-xl md:text-2xl" : "text-sm"} leading-snug mb-2`}
          style={{ color: "var(--ut-white)" }}
          dangerouslySetInnerHTML={{ __html: post.title }}
        />
        {tall && (
          <p className="font-body text-sm leading-relaxed mb-3 line-clamp-2" style={{ color: "var(--ut-white-dim)" }}>
            {post.excerpt}
          </p>
        )}
        {documented.length > 0 && (
          <p className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-gold, #d4a847)" }}>
            Documents {documented[0].title}
          </p>
        )}
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
