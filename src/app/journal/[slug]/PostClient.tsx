"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { getPostBySlug, getRelatedPosts } from "@/data/blog-posts";

interface PostClientProps { slug: string; }

function extractYouTubeId(text: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^\s&?#]+)/,
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^\s&?#]+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

function YouTubeEmbed({ url }: { url: string }) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return (
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <iframe
        className="absolute inset-0 w-full h-full rounded-sm"
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default function PostClient({ slug }: PostClientProps) {
  const [post, setPost] = useState(getPostBySlug(slug));
  const [related, setRelated] = useState(getRelatedPosts(slug, 3));

  useEffect(() => {
    setPost(getPostBySlug(slug));
    setRelated(getRelatedPosts(slug, 3));
    window.scrollTo(0, 0);
  }, [slug]);

  if (!post) {
    return (
      <>
        <Navigation />
        <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
          <div className="container-ut text-center py-32">
            <h1 className="font-display text-4xl" style={{ color: "var(--ut-white)" }}>Post not found</h1>
            <Link href="/journal" className="btn-secondary mt-8 inline-block">← Back to Journal</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Auto-detect YouTube URLs in content
  const contentLines = post.content.split("\n");
  const processedContent: Array<{type: "text"|"youtube", content: string}> = [];
  for (const line of contentLines) {
    const ytId = extractYouTubeId(line.trim());
    if (ytId) {
      processedContent.push({ type: "youtube", content: `https://www.youtube.com/watch?v=${ytId}` });
    } else {
      processedContent.push({ type: "text", content: line });
    }
  }

  return (
    <>
      <Navigation />
      <main style={{ background: "var(--ut-black)" }}>
        {/* Hero */}
        <div
          className="relative overflow-hidden"
          style={{ minHeight: "65vh" }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-br from-purple-950 via-fuchsia-950 to-black"
            style={{ opacity: 0.9 }}
          />
          <div className="relative container-ut pt-32 pb-24">
            <div className="max-w-4xl">
              <SectionReveal>
                <a
                  className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase mb-12 hover:opacity-80 transition-opacity"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                  href="/journal"
                >
                  ← Journal
                </a>
              </SectionReveal>

              <SectionReveal>
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span
                    className="font-mono text-[9px] tracking-[0.3em] uppercase"
                    style={{ color: "var(--ut-cyan)" }}
                  >
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
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

              <SectionReveal>
                <h1
                  className="font-display text-4xl md:text-6xl mb-6"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text={post.title} intensity="moderate" />
                </h1>
              </SectionReveal>

              <SectionReveal>
                <div className="flex gap-2 flex-wrap">
                  {post.tags.map((tag: string) => (
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

        {/* Content */}
        <div className="container-ut py-16">
          <div className="flex gap-12">
            <article className="flex-1 min-w-0 max-w-3xl">
              {/* Excerpt */}
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

              {/* Content blocks — detect video vs text */}
              {processedContent.map((block, i) =>
                block.type === "youtube" ? (
                  <SectionReveal key={i}>
                    <div className="mb-8">
                      <YouTubeEmbed url={block.content} />
                    </div>
                  </SectionReveal>
                ) : block.content.trim() ? (
                  <SectionReveal key={i}>
                    <div className="markdown-body mb-6">
                      <p
                        className="font-body text-[1.1875rem] leading-[1.85]"
                        style={{ color: "var(--ut-white-dim)" }}
                      >
                        {block.content}
                      </p>
                    </div>
                  </SectionReveal>
                ) : null
              )}

              {/* Navigation */}
              <SectionReveal>
                <div className="flex items-center gap-4 mt-12 pt-8 border-t" style={{ borderColor: "rgba(0,229,255,0.06)" }}>
                  <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>
                    Share:
                  </span>
                  <button
                    className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-all hover:border-[var(--ut-cyan)]"
                    style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-white-dim)" }}
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                  >
                    Copy Link
                  </button>
                </div>
              </SectionReveal>

              {/* Prev / Next */}
              <SectionReveal>
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {post.prev && (
                    <Link href={`/journal/${post.prev.slug}`} className="ut-card block p-5 group">
                      <p className="font-mono text-[8px] tracking-widest uppercase mb-2" style={{ color: "var(--ut-white-faint)" }}>
                        ← Previous
                      </p>
                      <p className="font-heading text-sm tracking-wider" style={{ color: "var(--ut-white)" }}>
                        {post.prev.title}
                      </p>
                    </Link>
                  )}
                  {post.next && (
                    <Link href={`/journal/${post.next.slug}`} className="ut-card block p-5 text-right group">
                      <p className="font-mono text-[8px] tracking-widest uppercase mb-2" style={{ color: "var(--ut-white-faint)" }}>
                        Next →
                      </p>
                      <p className="font-heading text-sm tracking-wider" style={{ color: "var(--ut-white)" }}>
                        {post.next.title}
                      </p>
                    </Link>
                  )}
                </div>
              </SectionReveal>

              {/* Related */}
              {related.length > 0 && (
                <SectionReveal>
                  <div className="mt-16">
                    <div className="sacred-divider mb-12" />
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-8 text-center" style={{ color: "var(--ut-white-faint)" }}>
                      Related Transmissions
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {related.map((rel: any) => (
                        <Link key={rel.slug} href={`/journal/${rel.slug}`} className="ut-card block p-4 group">
                          <p className="font-mono text-[8px] tracking-widest uppercase mb-2" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
                            {new Date(rel.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                          <p className="font-heading text-sm tracking-wider leading-snug" style={{ color: "var(--ut-white)" }}>
                            {rel.title}
                          </p>
                          <p className="font-mono text-[8px] mt-2" style={{ color: "var(--ut-white-faint)", opacity: 0.5 }}>
                            {rel.readTime}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </SectionReveal>
              )}

              {/* CTA */}
              <SectionReveal>
                <div className="mt-16 p-6 border" style={{ borderColor: "rgba(147,51,234,0.15)", background: "rgba(147,51,234,0.03)" }}>
                  <div className="font-heading text-[11px] tracking-[0.2em] mb-2" style={{ color: "rgba(147,51,234,0.7)" }}>
                    ASK THE ORACLE
                  </div>
                  <p className="font-body text-sm leading-relaxed mb-4" style={{ color: "rgba(237,233,246,0.5)" }}>
                    Explore the symbolism, geometry, and hidden correspondences within this transmission through the living intelligence of Vault of Arcana.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Link href="/oracle" className="font-heading text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-all hover:border-[rgba(212,168,71,0.5)]"
                      style={{ borderColor: "rgba(212,168,71,0.25)", background: "rgba(212,168,71,0.05)", color: "rgba(212,168,71,0.8)" }}>
                      CODEX ORACLE
                    </Link>
                    <a href="https://www.vaultofarcana.com/chat" target="_blank" rel="noopener noreferrer"
                      className="font-heading text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-all hover:border-[rgba(0,229,255,0.5)]"
                      style={{ borderColor: "rgba(0,229,255,0.2)", background: "rgba(0,229,255,0.03)", color: "rgba(0,229,255,0.6)" }}>
                      VAULT OF ARCANA →
                    </a>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal>
                <div className="text-center mt-10">
                  <Link href="/journal" className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase px-6 py-3 border transition-all hover:border-[var(--ut-cyan)]"
                    style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-white-dim)" }}
                    href="/journal">
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
