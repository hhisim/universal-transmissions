"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import { blogPosts, getAllTags } from "@/data/blog-posts";

const POSTS_PER_PAGE = 12;

// Map slug -> first image from content (computed offline)
const HERO_IMAGES: Record<string, string> = {
  "adding-new-transmissions-soon": "/journal/adding-new-transmissions-soon-1.jpg",
  "bio-energetic-vortexes-no-7-spirit": "/journal/bio-energetic-vortexes-no-7-spirit-1.jpg",
  "codex-stream-01-compilation-capture-01": "/journal/codex-stream-01-compilation-capture-01-1.jpeg",
  "codex-stream-01-compilation-capture-02": "/journal/codex-stream-01-compilation-capture-02-1.jpg",
  "the-universal-transmissions-codex-s-first-100-page-test-print": "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1665665489882-R07CAKBG2F1EFLAEXDPQ/codex+mockup.jpg?format=2500w",
  "the-universal-transmissions-codex-vol-1-kickstarter-campaign-is-live-within-72-hours": "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1692354961663-D0J7IGHQWCDYD8NTTF9X/12+-+web.jpg?format=2500w",
  "immaculate-conception-2021": "/journal/immaculate-conception-2021-1.jpg",
  "incoming-transmission-wip": "/journal/incoming-transmission-wip-1.jpg",
  "making-of-universal-transmissions-codex-cc03": "/journal/making-of-universal-transmissions-codex-cc03-1.jpg",
  "new-sub-series-bio-energetic-vortexes": "/journal/new-sub-series-bio-energetic-vortexes-1.jpeg",
  "new-transmission": "/journal/new-transmission-1.jpg",
  "new-transmission-linguistic-mystic": "/journal/new-transmission-linguistic-mystic-1.jpeg",
  "new-transmissions-in-progress-sacral-vortex": "/journal/new-transmissions-in-progress-sacral-vortex-1.jpeg",
  "receiving-transmissions": "/journal/receiving-transmissions-1.jpeg",
  "revealing-ethera-24": "/journal/revealing-ethera-24-1.png",
  "the-ethera-nft-is-now-available": "/journal/the-ethera-nft-is-now-available-1.jpg",
  
  "funded-in-24-hours-codex-vol-1-off-to-the-printers": "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/64a4a2fc-a051-4c9b-be23-676ab9c53d08/funded.jpg",
  "the-universal-transmissions-codex-s-first-100-page-test-print": "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1665665489882-R07CAKBG2F1EFLAEXDPQ/codex+mockup.jpg?format=2500w",
  "the-universal-transmissions-codex-vol-1-kickstarter-campaign-is-live-within-72-hours": "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1692354961663-D0J7IGHQWCDYD8NTTF9X/12+-+web.jpg?format=2500w",
  "third-vortex-the-power": "/journal/third-vortex-the-power-1.jpg",
  "toroidal-tantra": "/journal/toroidal-tantra-1.jpg",
  "transmission-honorarium": "/journal/transmission-honorarium-1.jpg",
  "transmission-in-progress-vortex-dynamics": "/journal/transmission-in-progress-vortex-dynamics-1.jpg",
  "transmission-viii": "/journal/transmission-viii-1.jpg",
  "trivium-method": "/journal/trivium-method-1.jpg",
  "twilight-transmissions-hyperdimensional-harmonics": "/journal/twilight-transmissions-hyperdimensional-harmonics-1.jpg",
  "twilight-transmissions-translinguistic-equation-uv-activated": "/journal/twilight-transmissions-translinguistic-equation-uv-activated-1.jpg",
  "twilight-transmissions-trinary-transcendence": "/journal/twilight-transmissions-trinary-transcendence-1.jpg",
  "universal-transmissions-alphabet": "/journal/universal-transmissions-alphabet-1.png",
  "universal-transmissions-bio-energetic-vortexes-vortex-no-1-root": "/journal/universal-transmissions-bio-energetic-vortexes-vortex-no-1-root-1.jpeg",
  "universal-transmissions-bio-energetic-vortexes-vortex-no-2-flow": "/journal/universal-transmissions-bio-energetic-vortexes-vortex-no-2-flow-1.jpg",
  "universal-transmissions-bio-energetic-vortexes-vortex-no-3-power": "/journal/universal-transmissions-bio-energetic-vortexes-vortex-no-3-power-1.jpg",
  "universal-transmissions-bio-energetic-vortexes-vortex-no-4-love": "/journal/universal-transmissions-bio-energetic-vortexes-vortex-no-4-love-1.jpg",
  "universal-transmissions-bio-energetic-vortexes-vortex-no-5-speak": "/journal/universal-transmissions-bio-energetic-vortexes-vortex-no-5-speak-1.jpg",
  "universal-transmissions-bio-energetic-vortexes-vortex-no-6-see": "/journal/universal-transmissions-bio-energetic-vortexes-vortex-no-6-see-1.jpg",
  "universal-transmissions-codex-creation-begins": "/journal/universal-transmissions-codex-creation-begins-1.jpg",
  "universal-transmissions-codex-volume-ii-begins": "/journal/universal-transmissions-codex-volume-ii-begins-1.jpg",
  "universal-transmissions-ix-the-cosmic-egg": "/journal/universal-transmissions-ix-the-cosmic-egg-1.jpg",
  "universal-transmissions-polarity-modulation-and-the-essence-of-union": "/journal/universal-transmissions-polarity-modulation-and-the-essence-of-union-1.jpg",
  "universal-transmissions-translinguistic-equation": "/journal/universal-transmissions-translinguistic-equation-1.jpg",
  "universal-transmissions-viii-recursive-pantheism": "/journal/universal-transmissions-viii-recursive-pantheism-1.jpg",
  "universal-transmissions-x-vortex-dynamics": "/journal/universal-transmissions-x-vortex-dynamics-1.jpg",
  "universal-transmissions-xi-vitruvian-spirit-seeding-the-new-renaissance": "/journal/universal-transmissions-xi-vitruvian-spirit-seeding-the-new-renaissance-1.jpg",
  "work-in-progress": "/journal/work-in-progress-1.jpg",
  "working-on-the-5th-chakra": "/journal/working-on-the-5th-chakra-1.jpg",
  "xl-tapestries-now-added-to-the-store": "/journal/xl-tapestries-now-added-to-the-store-1.jpg",
};

const ALL_YEARS = ['2026', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];

export default function JournalPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'voa' | 'personal'>('all');
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const allTags = getAllTags();

  const filteredPosts = useMemo(() => {
    let posts = blogPosts;
    if (activeCategory === 'voa') posts = posts.filter((p) => p.tradition);
    if (activeCategory === 'personal') posts = posts.filter((p) => !p.tradition);
    if (activeTag) posts = posts.filter((p) => p.tags.includes(activeTag));
    if (activeYear) posts = posts.filter((p) => p.publishedAt.startsWith(activeYear));
    return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }, [activeTag, activeCategory, activeYear]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  function handleTagFilter(tag: string | null) {
    setActiveTag(tag);
    setPage(1);
  }

  return (
    <>
      <PageBackground variant="journal" />
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

          {/* Category filter */}
          <SectionReveal delay={0.1}>
            <div className="flex gap-3 justify-center mb-6">
              {[
                { key: 'all', label: 'All' },
                { key: 'voa', label: 'Vault of Arcana' },
                { key: 'personal', label: 'Personal Codex Logs' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setActiveCategory(key as typeof activeCategory); setPage(1) }}
                  className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-all"
                  style={{
                    borderColor: activeCategory === key ? "var(--ut-cyan)" : "rgba(0,229,255,0.2)",
                    color: activeCategory === key ? "var(--ut-cyan)" : "rgba(0,229,255,0.5)",
                    background: activeCategory === key ? "rgba(0,229,255,0.08)" : "transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </SectionReveal>

          {/* Year filter */}
          <SectionReveal delay={0.12}>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <button
                onClick={() => { setActiveYear(null); setPage(1); }}
                className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-all"
                style={{
                  borderColor: !activeYear ? "var(--ut-magenta)" : "rgba(217,70,239,0.15)",
                  color: !activeYear ? "var(--ut-magenta)" : "var(--ut-white-dim)",
                  background: !activeYear ? "rgba(217,70,239,0.06)" : "transparent",
                }}
              >
                All Years
              </button>
              {ALL_YEARS.map((year) => (
                <button
                  key={year}
                  onClick={() => { setActiveYear(year); setPage(1); }}
                  className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-all"
                  style={{
                    borderColor: activeYear === year ? "var(--ut-magenta)" : "rgba(217,70,239,0.15)",
                    color: activeYear === year ? "var(--ut-magenta)" : "var(--ut-white-dim)",
                    background: activeYear === year ? "rgba(217,70,239,0.06)" : "transparent",
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          </SectionReveal>

          {/* Tag filter */}
          <SectionReveal delay={0.15}>
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              <button
                onClick={() => handleTagFilter(null)}
                className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border transition-all"
                style={{
                  borderColor: !activeTag ? "var(--ut-cyan)" : "rgba(0,229,255,0.15)",
                  color: !activeTag ? "var(--ut-cyan)" : "var(--ut-white-dim)",
                  background: !activeTag ? "rgba(0,229,255,0.06)" : "transparent",
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
                    borderColor: activeTag === tag ? "var(--ut-cyan)" : "rgba(0,229,255,0.15)",
                    color: activeTag === tag ? "var(--ut-cyan)" : "var(--ut-white-dim)",
                    background: activeTag === tag ? "rgba(0,229,255,0.06)" : "transparent",
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
              {activeYear ? ` · ${activeYear}` : ''}
              {activeTag ? ` · #${activeTag}` : ''}
            </p>
          </SectionReveal>

          {/* Posts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {paginatedPosts.map((post, i) => (
              <SectionReveal key={post.slug} delay={i * 0.04}>
                <PostCard post={post} heroImage={HERO_IMAGES[post.slug]} />
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
                  style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-cyan)" }}
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
                  style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-cyan)" }}
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

function PostCard({ post, heroImage }: { post: (typeof blogPosts)[0]; heroImage?: string }) {
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
      {/* Hero image or gradient band */}
      <div className="h-40 relative overflow-hidden">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={post.title}
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${cardGradient}`} />
        )}
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {/* Read time badge */}
        <div className="absolute top-3 right-3">
          <span className="font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-1 bg-black/40 backdrop-blur-sm" style={{ color: "var(--ut-white-faint)" }}>
            {post.readTime}
          </span>
        </div>
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
