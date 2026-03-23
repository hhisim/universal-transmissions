"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { blogPosts, getAllTags } from "@/data/blog-posts";

const POSTS_PER_PAGE = 10;

export default function JournalPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const allTags = getAllTags();

  const filteredPosts = useMemo(() => {
    if (!activeTag) return blogPosts;
    return blogPosts.filter((p) => p.tags.includes(activeTag));
  }, [activeTag]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  function handleTagFilter(tag: string | null) {
    setActiveTag(tag);
    setPage(1);
  }

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          {/* Hero Header */}
          <SectionReveal>
            <div className="text-center mb-16 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>
                [ Dispatches from the Inner Planes ]
              </p>
              <h1 className="font-display text-5xl md:text-7xl glow-cyan mb-6">
                <ZalgoText text="Journal" intensity="moderate" />
              </h1>
              <p className="font-body text-lg max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
                Writings on symbolism, sacred geometry, cymatics, and the living oracle — co-authored by Prime + Hakan.
              </p>
            </div>
          </SectionReveal>

          {/* Tag filter */}
          <SectionReveal delay={0.1}>
            <div className="flex flex-wrap gap-2 justify-center mb-12">
              <button
                onClick={() => handleTagFilter(null)}
                className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-all"
                style={{
                  borderColor: !activeTag ? "var(--ut-cyan)" : "rgba(0,229,255,0.15)",
                  color: !activeTag ? "var(--ut-cyan)" : "var(--ut-white-dim)",
                  background: !activeTag ? "rgba(0,229,255,0.06)" : "transparent",
                  opacity: !activeTag ? 1 : 0.5,
                }}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagFilter(tag)}
                  className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-all"
                  style={{
                    borderColor: activeTag === tag ? "var(--ut-magenta)" : "rgba(217,70,239,0.15)",
                    color: activeTag === tag ? "var(--ut-magenta)" : "var(--ut-white-dim)",
                    background: activeTag === tag ? "rgba(217,70,239,0.06)" : "transparent",
                    opacity: activeTag === tag ? 1 : 0.5,
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </SectionReveal>

          {/* Post count */}
          <SectionReveal delay={0.15}>
            <p className="font-mono text-[9px] tracking-widest uppercase mb-8 text-center" style={{ color: "var(--ut-white-faint)" }}>
              {filteredPosts.length} {filteredPosts.length === 1 ? "transmission" : "transmissions"}
            </p>
          </SectionReveal>

          {/* Posts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {paginatedPosts.map((post, i) => (
              <SectionReveal key={post.slug} delay={i * 0.04}>
                <PostCard post={post} />
              </SectionReveal>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <SectionReveal delay={0.2}>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-all disabled:opacity-30"
                  style={{
                    borderColor: "rgba(0,229,255,0.15)",
                    color: "var(--ut-cyan)",
                  }}
                >
                  ← Prev
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPage(idx + 1)}
                      className="font-mono text-[10px] w-8 h-8 flex items-center justify-center border transition-all"
                      style={{
                        borderColor: page === idx + 1 ? "var(--ut-cyan)" : "rgba(0,229,255,0.15)",
                        color: page === idx + 1 ? "var(--ut-cyan)" : "var(--ut-white-faint)",
                        background: page === idx + 1 ? "rgba(0,229,255,0.06)" : "transparent",
                      }}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-all disabled:opacity-30"
                  style={{
                    borderColor: "rgba(0,229,255,0.15)",
                    color: "var(--ut-cyan)",
                  }}
                >
                  Next →
                </button>
              </div>
            </SectionReveal>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── Post Card ─────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: (typeof blogPosts)[0] }) {
  const gradientMap: Record<string, string> = {
    "from-fuchsia-900 via-violet-900 to-black": "from-fuchsia-900/60 via-violet-900/40 to-transparent",
    "from-cyan-950 via-blue-950 to-black": "from-cyan-950/60 via-blue-950/40 to-transparent",
    "from-slate-900 via-zinc-900 to-black": "from-slate-900/60 via-zinc-900/40 to-transparent",
    "from-indigo-950 via-purple-950 to-black": "from-indigo-950/60 via-purple-950/40 to-transparent",
    "from-amber-950 via-orange-950 to-black": "from-amber-950/60 via-orange-950/40 to-transparent",
    "from-orange-900 via-red-900 to-black": "from-orange-900/60 via-red-900/40 to-transparent",
    "from-emerald-950 via-teal-900 to-black": "from-emerald-950/60 via-teal-900/40 to-transparent",
    "from-sky-950 via-indigo-950 to-black": "from-sky-950/60 via-indigo-950/40 to-transparent",
    "from-yellow-900 via-amber-900 to-black": "from-yellow-900/60 via-amber-900/40 to-transparent",
    "from-violet-950 via-purple-950 to-black": "from-violet-950/60 via-purple-950/40 to-transparent",
    "from-red-950 via-rose-950 to-black": "from-red-950/60 via-rose-950/40 to-transparent",
    "from-teal-950 via-cyan-950 to-black": "from-teal-950/60 via-cyan-950/40 to-transparent",
    "from-zinc-800 via-neutral-900 to-black": "from-zinc-800/60 via-neutral-900/40 to-transparent",
    "from-purple-950 via-fuchsia-900 to-black": "from-purple-950/60 via-fuchsia-900/40 to-transparent",
    "from-red-950 via-orange-900 to-black": "from-red-950/60 via-orange-900/40 to-transparent",
    "from-emerald-950 via-green-900 to-black": "from-emerald-950/60 via-green-900/40 to-transparent",
  };

  const cardGradient = gradientMap[post.hero_gradient] ?? "from-slate-900/60 via-zinc-900/40 to-transparent";

  const dateLabel = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link href={`/journal/${post.slug}`} className="ut-card block overflow-hidden group" style={{ padding: 0 }}>
      {/* Hero gradient band */}
      <div className={`h-24 bg-gradient-to-br ${cardGradient} relative flex items-end p-4`}>
        <div className="absolute inset-0 opacity-20" style={{
          background: `linear-gradient(to bottom, transparent 60%, var(--ut-black))`,
        }} />
        <span className="font-mono text-[8px] tracking-[0.2em] uppercase" style={{ color: "var(--ut-white-faint)" }}>
          {post.readTime}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="font-mono text-[8px] tracking-[0.25em] uppercase mb-2" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
          {dateLabel}
        </p>
        <h2
          className="font-heading text-base tracking-wider mb-3 leading-snug"
          style={{ color: "var(--ut-white)", transition: "color 0.3s" }}
          dangerouslySetInnerHTML={{ __html: post.title }}
        />
        <p className="font-body text-sm leading-relaxed mb-4 line-clamp-3" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
          {post.excerpt}
        </p>
        {/* Tags */}
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
        {/* Arrow */}
        <div className="mt-3 text-right">
          <span className="font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--ut-cyan)" }}>
            Read →
          </span>
        </div>
      </div>
    </Link>
  );
}
