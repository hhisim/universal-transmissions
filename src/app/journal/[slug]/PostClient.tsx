"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { blogPosts, getPostBySlug, getRelatedPosts, type BlogPost } from "@/data/blog-posts";
import { extractFirstImage } from "@/data/blog-posts";
import PageBackground from "@/components/scenes/PageBackground";

// ─── YouTube embed component ───────────────────────────────────────────────────

function YouTubeEmbed({ url }: { url: string }) {
  // Extract video ID from various YouTube URL formats
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return null;
  const videoId = match[1];

  return (
    <div className="relative w-full overflow-hidden rounded" style={{ aspectRatio: "16/9", maxHeight: "70vh" }}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
        title="Embedded video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        style={{ border: 0 }}
        loading="lazy"
      />
    </div>
  );
}

// ─── Content with YouTube embeds ───────────────────────────────────────────────

function ProcessedContent({ content }: { content: string }) {
  // Split content by YouTube URLs and render embeds
  const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+[^\n]*/gi;
  const YOUTUBE_SHORT = /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})[^\n]*/gi;

  const parts: { type: "text" | "youtube"; value: string }[] = [];
  let lastIndex = 0;

  // Find all YouTube URLs
  const combinedRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\n]*/gi;
  let match;

  while ((match = combinedRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    const urlMatch = content.slice(match.index).match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\n]*/);
    if (urlMatch) {
      parts.push({ type: "youtube", value: urlMatch[0] });
      lastIndex = match.index + urlMatch[0].length;
    } else {
      lastIndex = match.index + match[0].length;
    }
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <MarkdownRenderer content={content} />
    ;
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === "youtube" ? (
          <div key={i} className="my-10">
            <YouTubeEmbed url={part.value} />
          </div>
        ) : (
          <MarkdownRenderer key={i} content={part.value} />

                )
      )}
    </>
  );
}

// ─── Post Client ─────────────────────────────────────────────────────────────

export default function PostClient({ slug }: { slug: string }) {
  const post = getPostBySlug(slug);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  const handleCopyLink = useCallback(() => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href).then(() => setCopied(true));
    }
  }, []);

  if (!post) {
    return (
      <>
        <Navigation />
        <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
          <div className="container-ut text-center">
            <h1 className="font-display text-3xl mb-4" style={{ color: "var(--ut-cyan)" }}>Transmission Not Found</h1>
            <Link href="/journal" className="font-mono text-sm tracking-widest uppercase" style={{ color: "var(--ut-magenta)" }}>
              ← Return to Journal
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const related = getRelatedPosts(post.slug, 3);
  const headings = extractHeadings(post.content);
  const heroImage = extractFirstImage(post.content);

  const idx = blogPosts.findIndex((p) => p.slug === post.slug);
  const prevPost = idx > 0 ? blogPosts[idx - 1] : null;
  const nextPost = idx < blogPosts.length - 1 ? blogPosts[idx + 1] : null;

  const dateLabel = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const gradientMap: Record<string, string> = {
    "from-fuchsia-900 via-violet-900 to-black": "from-fuchsia-950 via-violet-950 to-black",
    "from-cyan-950 via-blue-950 to-black": "from-cyan-950 via-blue-950 to-black",
    "from-slate-900 via-zinc-900 to-black": "from-slate-900 via-zinc-900 to-black",
    "from-indigo-950 via-purple-950 to-black": "from-indigo-950 via-purple-950 to-black",
    "from-amber-950 via-orange-950 to-black": "from-amber-950 via-orange-950 to-black",
    "from-orange-900 via-red-900 to-black": "from-orange-900 via-red-950 to-black",
    "from-emerald-950 via-teal-900 to-black": "from-emerald-950 via-teal-950 to-black",
    "from-sky-950 via-indigo-950 to-black": "from-sky-950 via-indigo-950 to-black",
    "from-yellow-900 via-amber-900 to-black": "from-yellow-900 via-amber-950 to-black",
    "from-violet-950 via-purple-950 to-black": "from-violet-950 via-purple-950 to-black",
    "from-red-950 via-rose-950 to-black": "from-red-950 via-rose-950 to-black",
    "from-teal-950 via-cyan-950 to-black": "from-teal-950 via-cyan-950 to-black",
    "from-zinc-800 via-neutral-900 to-black": "from-zinc-800 via-neutral-900 to-black",
    "from-purple-950 via-fuchsia-900 to-black": "from-purple-950 via-fuchsia-950 to-black",
    "from-red-950 via-orange-900 to-black": "from-red-950 via-orange-950 to-black",
    "from-emerald-950 via-green-900 to-black": "from-emerald-950 via-green-950 to-black",
  };
  const heroGradient = gradientMap[post.hero_gradient] ?? post.hero_gradient;

  return (
    <>
      <Navigation />
        <PageBackground variant="journal" />
      <main style={{ background: "var(--ut-black)" }}>
        {/* ── Hero ── */}
        <div className="relative overflow-hidden" style={{ minHeight: "65vh" }}>
          {/* Background: image + gradient overlay */}
          {heroImage ? (
            <div className="absolute inset-0">
              <Image
                src={heroImage}
                alt=""
                fill
                className="object-cover object-center"
                sizes="100vw"
                priority
                style={{ opacity: 0.55 }}
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${heroGradient}`} style={{ opacity: 0.75 }} />
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  backgroundSize: "200px",
                }}
              />
            </div>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${heroGradient}`} style={{ opacity: 0.9 }} />
          )}

          <div className="relative container-ut pt-32 pb-24">
            <SectionReveal>
              <Link
                href="/journal"
                className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase mb-12 hover:opacity-80 transition-opacity"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                ← Journal
              </Link>
            </SectionReveal>

            <div className="max-w-4xl">
              <SectionReveal delay={0.1}>
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: "var(--ut-cyan)" }}>
                    {dateLabel}
                  </span>
                  <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
                  <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {post.readTime}
                  </span>
                  <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
                  <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {post.author}
                  </span>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.2}>
                <h1 className="font-display text-4xl md:text-6xl mb-6" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text={post.title} intensity="moderate" />
                </h1>
              </SectionReveal>

              <SectionReveal delay={0.3}>
                <div className="flex gap-2 flex-wrap">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border"
                      style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </SectionReveal>
            </div>
          </div>
        </div>

        {/* ── Article body ── */}
        <div className="container-ut py-16">
          <div className="flex gap-12">
            {/* Sticky TOC sidebar */}
            {headings.length > 2 && (
              <aside className="hidden lg:block w-56 flex-shrink-0">
                <div className="sticky top-32">
                  <p className="font-mono text-[8px] tracking-[0.3em] uppercase mb-4" style={{ color: "var(--ut-white-faint)" }}>
                    Contents
                  </p>
                  <nav className="space-y-1">
                    {headings
                      .filter((h) => h.level <= 3)
                      .map((h, i) => (
                        <a
                          key={i}
                          href={`#${h.id}`}
                          className="block font-mono text-[10px] leading-relaxed transition-colors hover:text-[var(--ut-cyan)]"
                          style={{
                            color: h.level === 2 ? "var(--ut-white-dim)" : "var(--ut-white-faint)",
                            paddingLeft: h.level === 3 ? "0.75rem" : "0",
                          }}
                        >
                          {h.text}
                        </a>
                      ))}
                  </nav>
                </div>
              </aside>
            )}

            {/* Main article */}
            <article className="flex-1 min-w-0 max-w-3xl">
              {/* Lead excerpt */}
              <SectionReveal>
                <p
                  className="font-body text-xl leading-relaxed mb-10"
                  style={{
                    color: "var(--ut-white-dim)",
                    borderLeft: "2px solid var(--ut-magenta)",
                    paddingLeft: "1.5rem",
                  }}
                >
                  {post.excerpt}
                </p>
              </SectionReveal>

              {/* Full content (with YouTube embeds) */}
              <SectionReveal delay={0.1}>
                <ProcessedContent content={post.content} />
              </SectionReveal>

              {/* Share */}
              <SectionReveal delay={0.2}>
                <div className="flex items-center gap-4 mt-12 pt-8 border-t" style={{ borderColor: "rgba(0,229,255,0.06)" }}>
                  <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>
                    Share:
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-all hover:border-[var(--ut-cyan)]"
                    style={{
                      borderColor: copied ? "var(--ut-cyan)" : "rgba(0,229,255,0.15)",
                      color: copied ? "var(--ut-cyan)" : "var(--ut-white-dim)",
                    }}
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </SectionReveal>

              {/* Prev / Next */}
              {(prevPost || nextPost) && (
                <SectionReveal delay={0.25}>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    {prevPost ? (
                      <Link href={`/journal/${prevPost.slug}`} className="ut-card block p-5 group" style={{ textDecoration: "none" }}>
                        <p className="font-mono text-[8px] tracking-widest uppercase mb-2" style={{ color: "var(--ut-white-faint)" }}>← Previous</p>
                        <p className="font-heading text-sm tracking-wider" style={{ color: "var(--ut-white)" }}>{prevPost.title}</p>
                      </Link>
                    ) : <div />}
                    {nextPost ? (
                      <Link href={`/journal/${nextPost.slug}`} className="ut-card block p-5 text-right group" style={{ textDecoration: "none" }}>
                        <p className="font-mono text-[8px] tracking-widest uppercase mb-2" style={{ color: "var(--ut-white-faint)" }}>Next →</p>
                        <p className="font-heading text-sm tracking-wider" style={{ color: "var(--ut-white)" }}>{nextPost.title}</p>
                      </Link>
                    ) : <div />}
                  </div>
                </SectionReveal>
              )}

              {/* Related posts */}
              {related.length > 0 && (
                <SectionReveal delay={0.3}>
                  <div className="mt-16">
                    <div className="sacred-divider mb-12" />
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-8 text-center" style={{ color: "var(--ut-white-faint)" }}>
                      Related Transmissions
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {related.map((rp) => (
                        <Link key={rp.slug} href={`/journal/${rp.slug}`} className="ut-card block p-4 group">
                          <p className="font-mono text-[8px] tracking-widest uppercase mb-2" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
                            {new Date(rp.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="font-heading text-sm tracking-wider leading-snug" style={{ color: "var(--ut-white)" }}>
                            {rp.title}
                          </p>
                          <p className="font-mono text-[8px] mt-2" style={{ color: "var(--ut-white-faint)", opacity: 0.5 }}>
                            {rp.readTime}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </SectionReveal>
              )}

              {/* ASK THE ORACLE CTA */}
              <SectionReveal delay={0.35}>
                <div
                  className="mt-12 p-6 border"
                  style={{
                    borderColor: "rgba(147,51,234,0.15)",
                    background: "rgba(147,51,234,0.03)",
                  }}
                >
                  <div className="font-heading text-[11px] tracking-[0.2em] mb-2" style={{ color: "rgba(147,51,234,0.7)" }}>
                    ASK THE ORACLE
                  </div>
                  <p className="font-body text-sm leading-relaxed mb-4" style={{ color: "rgba(237,233,246,0.5)" }}>
                    Explore the symbolism, geometry, and hidden correspondences within this transmission through the living intelligence of Vault of Arcana.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <a href="/oracle" className="font-heading text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-all hover:border-[rgba(212,168,71,0.5)]" style={{ borderColor: "rgba(212,168,71,0.25)", background: "rgba(212,168,71,0.05)", color: "rgba(212,168,71,0.8)" }}>
                      CODEX ORACLE
                    </a>
                    <a href="https://www.vaultofarcana.com/chat" target="_blank" rel="noopener noreferrer" className="font-heading text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-all hover:border-[rgba(0,229,255,0.5)]" style={{ borderColor: "rgba(0,229,255,0.2)", background: "rgba(0,229,255,0.03)", color: "rgba(0,229,255,0.6)" }}>
                      VAULT OF ARCANA →
                    </a>
                  </div>
                </div>
              </SectionReveal>

              {/* Back to journal */}
              <SectionReveal delay={0.4}>
                <div className="text-center mt-10">
                  <Link
                    href="/journal"
                    className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase px-6 py-3 border transition-all hover:border-[var(--ut-cyan)]"
                    style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-white-dim)" }}
                  >
                    ← All Transmissions
                  </Link>
                </div>
              </SectionReveal>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── TOC extraction ────────────────────────────────────────────────────────────

function extractHeadings(content: string): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      headings.push({ level, text, id });
    }
  }
  return headings;
}
