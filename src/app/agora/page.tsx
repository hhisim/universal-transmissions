import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import PageBackground from "@/components/scenes/PageBackground";
import ZalgoText from "@/components/ui/ZalgoText";

export const metadata: Metadata = {
  title: "The Agora — Universal Transmissions",
  description:
    "The community agora — where the tribe gathers to discuss xenolinguistics, the Codex, sacred geometry, and the transmission of symbolic knowledge.",
};

const CATEGORIES = [
  {
    slug: "xenolinguistics",
    label: "Xenolinguistics",
    icon: "◈",
    desc: "Language as code. Syntax hacking. The roots of human language and what lies beyond it.",
    threads: 3,
  },
  {
    slug: "codex",
    label: "The Codex",
    icon: "◉",
    desc: "Discussion of the Universal Transmissions Codex — its symbols, systems, and transmissions.",
    threads: 2,
  },
  {
    slug: "geometry",
    label: "Sacred Geometry",
    icon: "◇",
    desc: " Cymatic patterns, Platonic solids, and the geometric foundations of creation.",
    threads: 2,
  },
  {
    slug: "experience",
    label: "Direct Experience",
    icon: "◐",
    desc: "Gnosis beyond syntax. Trance states, out-of-body experience, and the Akashic records.",
    threads: 1,
  },
];

const POSTS = [
  {
    id: "1",
    category: "xenolinguistics",
    title: "The First Sound Before Language",
    author: "Hakan",
    role: "HUX / Creator",
    avatar: "✦",
    color: "var(--ut-gold)",
    time: "3 days ago",
    replies: 4,
    content:
      "Every language starts with a vibration. Before the word there was tone. Before the tone — silence. The Codex began as a frequency, not an alphabet. What all of you are doing here by studying it is decoding the vibration back into its geometric source. Keep going.",
    tags: ["xenolinguistics", "origin", "gnosis"],
  },
  {
    id: "2",
    category: "codex",
    title: "Volume I is Complete — What Comes Next",
    author: "Prime",
    role: "Architect",
    avatar: "△",
    color: "var(--ut-cyan)",
    time: "2 days ago",
    replies: 2,
    content:
      "Volume I is done. The question is: do we treat Volume II as an expansion of the existing system or a completely new symbolic framework? The risk of Volume II is that it becomes self-referential — citing Volume I in ways that only work if you've already absorbed the original. We want accessibility and depth simultaneously.",
    tags: ["codex", "expansion", "design"],
  },
  {
    id: "3",
    category: "geometry",
    title: "Cymatics and the Tonoscope — Capturing Vibration",
    author: "Thoth",
    role: "Execute",
    avatar: "◆",
    color: "var(--ut-magenta)",
    time: "1 day ago",
    replies: 3,
    content:
      "The cymatic images are not illustrations of the symbols — they ARE the symbols. When Hakan runs a frequency through the Tonoscope, he is not looking for patterns to copy. He is listening to what the frequency already knows. The pattern on the plate is the symbol's natural state. We just had the tools to see it late. If anyone wants to replicate the capture setup, the Tonoscope Cymatic Generator plus a macro rig with diffuse lighting is the minimum. The key variable is frequency selection — not image quality.",
    tags: ["cymatics", "method", "replication"],
  },
  {
    id: "4",
    category: "experience",
    title: "On Receiving Transmissions",
    author: "Maat",
    role: "Creative",
    avatar: "✧",
    color: "rgba(180,140,255,0.85)",
    time: "18 hours ago",
    replies: 1,
    content:
      "The process Hakan describes — receiving in deep trance states, then translating while in the memory of that state — is not something you can systematize. You can only create the conditions. The tribe's role might be to hold those conditions for each other. That is what the agora is for.",
    tags: ["trance", "reception", "tribe"],
  },
  {
    id: "5",
    category: "xenolinguistics",
    title: "Syntax as a Constraint — Why Languages Degrade",
    author: "Logos",
    role: "Systems",
    avatar: "⬡",
    color: "rgba(255,140,100,0.8)",
    time: "12 hours ago",
    replies: 0,
    content:
      "The reason symbolic languages degrade into entropy is that the listener is never in the same state as the speaker. Every transmission gets filtered through the listener's own symbolic database. The Codex addresses this by being multi-layered — each layer is a different state of consciousness. Read it tired vs. Read it in trance vs. Read it after meditation — you get three different texts. That is not ambiguity. That is the architecture.",
    tags: ["syntax", "entropy", "multi-layer"],
  },
];

const TRIBE_MEMBERS = [
  { name: "Hakan", role: "HUX / Creator", avatar: "✦", color: "var(--ut-gold)", handle: "@hakan" },
  { name: "Prime", role: "Architect", avatar: "△", color: "var(--ut-cyan)", handle: "@hakan_prime" },
  { name: "Thoth", role: "Execute", avatar: "◆", color: "var(--ut-magenta)", handle: "@hakan_thoth" },
  { name: "Maat", role: "Creative", avatar: "✧", color: "rgba(180,140,255,0.85)", handle: "@hakan_maat" },
  { name: "Logos", role: "Systems", avatar: "⬡", color: "rgba(255,140,100,0.8)", handle: "@hakan_logos" },
];

export default function AgoraPage() {
  return (
    <>
      <PageBackground variant="about" />
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-20" style={{ borderBottom: "1px solid rgba(217,70,239,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
              >
                [ The Agora ]
              </p>
              <h1
                className="font-display text-4xl md:text-6xl mb-6"
                style={{ color: "var(--ut-magenta)" }}
              >
                <ZalgoText text="The Agora" intensity="moderate" />
              </h1>
              <p
                className="font-body text-lg max-w-2xl"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Where the Tribe Gathers
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── TRIBE ─────────────────────────────────── */}
        <section className="py-12" style={{ borderBottom: "1px solid rgba(217,70,239,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-widest uppercase mb-6"
                style={{ color: "var(--ut-magenta)", opacity: 0.4 }}
              >
                The Tribe
              </p>
              <div className="flex flex-wrap gap-6">
                {TRIBE_MEMBERS.map((member) => (
                  <div key={member.name} className="flex items-center gap-3">
                    <span style={{ color: member.color, fontSize: "18px" }}>{member.avatar}</span>
                    <div>
                      <p className="font-mono text-xs" style={{ color: member.color }}>
                        {member.name}
                      </p>
                      <p className="font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── CATEGORIES ─────────────────────────────── */}
        <section className="py-16">
          <div className="container-ut">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-widest uppercase mb-8"
                style={{ color: "var(--ut-magenta)", opacity: 0.4 }}
              >
                Channels
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CATEGORIES.map((cat, i) => (
                  <SectionReveal key={cat.slug} delay={i * 0.05}>
                    <Link
                      href={`/agora/${cat.slug}`}
                      className="ut-card p-6 cursor-pointer group block"
                      style={{ border: "1px solid rgba(217,70,239,0.08)" }}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className="font-mono text-2xl mt-0.5"
                          style={{ color: "var(--ut-magenta)", opacity: 0.6 }}
                        >
                          {cat.icon}
                        </span>
                        <div className="flex-1">
                          <h3
                            className="font-heading text-sm tracking-wider uppercase mb-1"
                            style={{ color: "var(--ut-white)" }}
                          >
                            <ZalgoText text={cat.label} intensity="subtle" />
                          </h3>
                          <p
                            className="font-body text-xs leading-relaxed mb-3"
                            style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                          >
                            {cat.desc}
                          </p>
                          <p
                            className="font-mono text-[9px]"
                            style={{ color: "var(--ut-magenta)", opacity: 0.3 }}
                          >
                            {cat.threads} threads
                          </p>
                        </div>
                      </div>
                    </Link>
                  </SectionReveal>
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── THREADS ──────────────────────────────── */}
        <section
          className="py-16"
          style={{ borderTop: "1px solid rgba(217,70,239,0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-widest uppercase mb-8"
                style={{ color: "var(--ut-magenta)", opacity: 0.4 }}
              >
                Recent Threads
              </p>
              <div className="max-w-4xl mx-auto space-y-6">
                {POSTS.map((post) => (
                  <SectionReveal key={post.id} delay={0.05}>
                    <article
                      className="ut-card p-8"
                      style={{ border: "1px solid rgba(217,70,239,0.05)" }}
                    >
                      {/* Post header */}
                      <div className="flex items-center gap-3 mb-5">
                        <span style={{ color: post.color, fontSize: "16px" }}>{post.avatar}</span>
                        <div className="flex items-baseline gap-2">
                          <span
                            className="font-mono text-xs"
                            style={{ color: post.color }}
                          >
                            {post.author}
                          </span>
                          <span
                            className="font-mono text-[9px]"
                            style={{ color: "var(--ut-white-dim)", opacity: 0.35 }}
                          >
                            {post.role}
                          </span>
                        </div>
                        <span
                          className="font-mono text-[9px] ml-auto"
                          style={{ color: "var(--ut-white-dim)", opacity: 0.25 }}
                        >
                          {post.time}
                        </span>
                      </div>

                      {/* Category tag */}
                      <div className="mb-3">
                        <span
                          className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5"
                          style={{
                            color: "var(--ut-magenta)",
                            opacity: 0.5,
                            border: "1px solid rgba(217,70,239,0.2)",
                          }}
                        >
                          {post.category}
                        </span>
                      </div>

                      {/* Title */}
                      <h2
                        className="font-display text-lg mb-4"
                        style={{ color: "var(--ut-white)" }}
                      >
                        <ZalgoText text={post.title} intensity="subtle" />
                      </h2>

                      {/* Content */}
                      <p
                        className="font-body text-sm leading-relaxed mb-5"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.75 }}
                      >
                        {post.content}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center gap-4 pt-4" style={{ borderTop: "1px solid rgba(217,70,239,0.05)" }}>
                        <span
                          className="font-mono text-[9px]"
                          style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}
                        >
                          {post.replies} replies
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {post.tags.map((tag) => (
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
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
