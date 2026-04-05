import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import PageBackground from "@/components/scenes/PageBackground";
import ZalgoText from "@/components/ui/ZalgoText";
import { supabase } from "@/lib/supabase-client";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const CATEGORIES: Record<string, { label: string; desc: string }> = {
    xenolinguistics: { label: "Xenolinguistics", desc: "Language as code. Syntax hacking." },
    codex: { label: "The Codex", desc: "The Codex — symbols, systems, and transmissions." },
    geometry: { label: "Sacred Geometry", desc: "Cymatic patterns and sacred geometry." },
    experience: { label: "Direct Experience", desc: "Gnosis beyond syntax." },
  };
  const cat = CATEGORIES[category] ?? { label: category, desc: "" };
  return {
    title: `${cat.label} — The Agora — Universal Transmissions`,
    description: cat.desc,
  };
}

const CATEGORY_DATA: Record<string, { label: string; icon: string; desc: string }> = {
  xenolinguistics: { label: "Xenolinguistics", icon: "◈", desc: "Language as code. Syntax hacking. The roots of human language and what lies beyond it." },
  codex: { label: "The Codex", icon: "◉", desc: "Discussion of the Universal Transmissions Codex — its symbols, systems, and transmissions." },
  geometry: { label: "Sacred Geometry", icon: "◇", desc: "Cymatic patterns, Platonic solids, and the geometric foundations of creation." },
  experience: { label: "Direct Experience", icon: "◐", desc: "Gnosis beyond syntax. Trance states, out-of-body experience, and the Akashic records." },
};

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = CATEGORY_DATA[category];

  if (!cat) {
    return (
      <>
        <PageBackground variant="about" />
        <Navigation />
        <main className="pt-24 pb-20">
          <div className="container-ut">
            <div className="text-center py-20">
              <p className="font-mono text-sm" style={{ color: "var(--ut-white-dim)" }}>Channel not found.</p>
              <Link href="/agora" className="font-mono text-xs mt-4 inline-block" style={{ color: "var(--ut-magenta)" }}>
                Back to The Agora
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const { data: threads } = await supabase
    .from("agora_threads")
    .select("id, category, title, author, role, avatar, color, time_ago, replies, content, tags")
    .eq("category", category)
    .order("created_at", { ascending: false });

  const categoryPosts = threads ?? [];

  return (
    <>
      <PageBackground variant="about" />
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-16" style={{ borderBottom: "1px solid rgba(217,70,239,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <Link
                href="/agora"
                className="font-mono text-[9px] tracking-widest uppercase mb-6 inline-block"
                style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
              >
                ← The Agora
              </Link>
              <div className="flex items-center gap-4 mt-4">
                <span className="font-mono text-3xl" style={{ color: "var(--ut-magenta)", opacity: 0.6 }}>
                  {cat.icon}
                </span>
                <div>
                  <h1 className="font-display text-3xl md:text-4xl" style={{ color: "var(--ut-magenta)" }}>
                    <ZalgoText text={cat.label} intensity="moderate" />
                  </h1>
                  <p className="font-body text-sm mt-1" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
                    {cat.desc}
                  </p>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── THREADS ──────────────────────────────── */}
        <section className="py-16">
          <div className="container-ut">
            <div className="max-w-4xl mx-auto space-y-6">
              {categoryPosts.length === 0 ? (
                <SectionReveal>
                  <div className="ut-card p-12 text-center">
                    <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                      No threads yet in this channel.
                    </p>
                  </div>
                </SectionReveal>
              ) : (
                categoryPosts.map((post, i) => (
                  <SectionReveal key={post.id} delay={i * 0.05}>
                    <article className="ut-card p-8" style={{ border: "1px solid rgba(217,70,239,0.05)" }}>
                      <div className="flex items-center gap-3 mb-5">
                        <span style={{ color: post.color, fontSize: "16px" }}>{post.avatar}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs" style={{ color: post.color }}>
                            {post.author}
                          </span>
                          <span className="font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.35 }}>
                            {post.role}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] ml-auto" style={{ color: "var(--ut-white-dim)", opacity: 0.25 }}>
                          {post.time_ago}
                        </span>
                      </div>

                      <h2 className="font-display text-lg mb-4" style={{ color: "var(--ut-white)" }}>
                        <ZalgoText text={post.title} intensity="subtle" />
                      </h2>

                      <p className="font-body text-sm leading-relaxed mb-5" style={{ color: "var(--ut-white-dim)", opacity: 0.75 }}>
                        {post.content}
                      </p>

                      <div className="flex items-center gap-4 pt-4" style={{ borderTop: "1px solid rgba(217,70,239,0.05)" }}>
                        <span className="font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                          {post.replies} replies
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {(post.tags ?? []).map((tag: string) => (
                            <span
                              key={tag}
                              className="font-mono text-[9px] px-2 py-0.5"
                              style={{
                                color: "var(--ut-white-dim)",
                                opacity: 0.2,
                                border: "1px solid rgba(255,255,255,0.1)",
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  </SectionReveal>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
