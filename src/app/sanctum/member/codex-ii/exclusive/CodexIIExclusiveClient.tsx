"use client";

import { useState, useEffect } from "react";
import ZalgoText from "@/components/ui/ZalgoText";
import SectionReveal from "@/components/ui/SectionReveal";
import {
  Play, BookOpen, MessageCircle, ChevronRight, Lock, ExternalLink,
  Clock, FileText, Video, Quote, Star
} from "lucide-react";

const EXCLUSIVE_CONTENT = [
  {
    id: "video-1",
    type: "video",
    category: "Long-Form Process",
    glyph: "V",
    title: "The Full Ritual of Making",
    subtitle: "2h 17m",
    badge: "New",
    description: "An unbroken session of Hakan working through a complete Codex II piece — from the first pencil mark to the final signature. No cuts, no commentary. Just the act of making. Available exclusively here.",
    tags: ["process", "long-form", "raw"],
  },
  {
    id: "video-2",
    type: "video",
    category: "Foundation",
    glyph: "R",
    title: "How I Learned to See Geometry",
    subtitle: "41m",
    badge: null,
    description: "The years of training, the failures, the way the eye learns to parse sacred geometry in the world around us. The foundation behind all the work — the personal history that made the Codex possible.",
    tags: ["geometry", "training", "foundation"],
  },
  {
    id: "notes-1",
    type: "notes",
    category: "Personal Notes",
    glyph: "N",
    title: "The Codex II Decision Log",
    subtitle: "47 entries",
    badge: null,
    description: "Hakan's personal decision log for every piece in Codex II — why it was made, what almost replaced it, what was cut, and the one thing he would change now. Raw, unedited, deeply personal.",
    tags: ["decisions", "process", "personal"],
  },
  {
    id: "video-3",
    type: "video",
    category: "Breakdown",
    glyph: "X",
    title: "Dismantling the 60-Cell — Frame by Frame",
    subtitle: "1h 03m",
    badge: null,
    description: "A forensic analysis of the central structure underlying Codex II. Every connection, every relationship, every mathematical dependency explained in granular detail.",
    tags: ["geometry", "analysis", "60-cell"],
  },
  {
    id: "notes-2",
    type: "notes",
    category: "Deep Cuts",
    glyph: "D",
    title: "Frequencies I Did Not Use",
    subtitle: "31 entries",
    badge: "Deep Cut",
    description: "Every frequency Hakan tested and rejected for Codex II, with notes on why each one didn't fit the system. A map of what was tried and why it fell away — the archaeology of a disciplined creative process.",
    tags: ["frequencies", "rejected", "research"],
  },
  {
    id: "video-4",
    type: "video",
    category: "Audio Analysis",
    glyph: "A",
    title: "The Sound of Geometry",
    subtitle: "28m",
    badge: null,
    description: "An audio exploration of what the Cymatic Engine produces when fed the frequency data from various Codex II pieces. A sonic companion to the visual work — geometry made audible.",
    tags: ["audio", "cymatics", "sound"],
  },
];

const PHILOSOPHY_QUOTES = [
  {
    text: "The piece you almost didn't finish is usually the one that matters most.",
    context: "On the final stretch of Codex II · July 2025",
    glyphs: ["T", "H", "E"],
  },
  {
    text: "I threw away more good ideas in this series than most artists use in a lifetime.",
    context: "On the quantity of exploration that went into Codex II",
    glyphs: ["I", "G", "M"],
  },
  {
    text: "Geometry is just time made visible.",
    context: "On the nature of the 60-cell structure",
    glyphs: ["G", "E", "O"],
  },
  {
    text: "The system teaches you what it wants to be. You just have to be willing to be wrong.",
    context: "On the collaborative nature of working with sacred geometry",
    glyphs: ["S", "Y", "S"],
  },
];

const GLYPH_MAP: Record<string, string> = {
  V: "v-(10).png", R: "r-(10).png", N: "n-(10).png",
  X: "x-(10).png", D: "d-(10).png", A: "a-(10).png",
  T: "t-(10).png", H: "h-(10).png", E: "e-(10).png",
  I: "i-(10).png", G: "g-(10).png", O: "o-(10).png",
  S: "s-(10).png", Y: "y-(10).png",
};

function GlyphIcon({ char, size = 14, opacity = 0.5 }: { char: string; size?: number; opacity?: number }) {
  const src = GLYPH_MAP[char];
  if (!src) return null;
  return (
    <img
      src={`/images/utglyphs/${src}`}
      alt=""
      width={size}
      height={size}
      style={{ objectFit: "contain", opacity }}
    />
  );
}

export default function CodexIIExclusiveClient() {
  const [activeQuote, setActiveQuote] = useState(0);
  const [prevQuote, setPrevQuote] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setPrevQuote(activeQuote);
        setActiveQuote((q) => (q + 1) % PHILOSOPHY_QUOTES.length);
        setAnimating(false);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeQuote]);

  const quote = PHILOSOPHY_QUOTES[activeQuote];

  return (
    <>
      <style>{`
        @keyframes glyphFloat { 0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)} }
        @keyframes quoteIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes glyphSpin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        .glyph-float { animation: glyphFloat 5s ease-in-out infinite; }
        .quote-enter { animation: quoteIn 0.4s ease-out forwards; }
        .glyph-spin { animation: glyphSpin 20s linear infinite; }
        .glyph-pulse { animation: glyphFloat 3s ease-in-out infinite; }
      `}</style>

      <main className="pt-24 pb-20 min-h-screen" style={{ background: "var(--ut-black)" }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-20 relative" style={{ borderBottom: "1px solid rgba(217,70,239,0.06)", overflow: "hidden" }}>
          {/* Glyph watermark bg */}
          <div className="absolute right-0 top-0 h-full flex items-center pointer-events-none" aria-hidden="true">
            <img
              src="/images/utglyphs/s-(10).png"
              alt=""
              width={500}
              height={500}
              className="glyph-spin"
              style={{ opacity: 0.03, objectFit: "contain", marginRight: "-50px" }}
            />
          </div>
          <div className="absolute left-0 top-0 h-full flex items-center pointer-events-none" aria-hidden="true">
            <img
              src="/images/utglyphs/c-(10).png"
              alt=""
              width={300}
              height={300}
              className="glyph-float"
              style={{ opacity: 0.025, objectFit: "contain", marginLeft: "-30px", animationDelay: "1s" }}
            />
          </div>

          <div className="container-ut relative">
            <SectionReveal>
              <div className="flex items-center gap-3 mb-4">
                <GlyphIcon char="E" size={20} opacity={0.5} />
                <span className="font-mono text-[9px] tracking-[0.5em] uppercase" style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>
                  [ Codex II · Inner Transmission ]
                </span>
                <span className="font-mono text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-full border" style={{ borderColor: "rgba(212,168,71,0.4)", color: "var(--ut-gold)" }}>
                  Initiate+
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl mb-4" style={{ color: "var(--ut-magenta)" }}>
                <ZalgoText text="The Inner Transmission" intensity="moderate" />
              </h1>

              <p className="font-body text-base max-w-2xl leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                Long-form videos, personal notes, and process materials that exist nowhere else.
                This is the unfiltered making of Codex Vol. II — available only to those who have walked through the outer gates.
              </p>

              <div className="flex items-center gap-2">
                <GlyphIcon char="I" size={14} opacity={0.3} />
                <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                  {EXCLUSIVE_CONTENT.length} materials · Videos · Notes · Deep Cuts
                </span>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── PHILOSOPHY ROTATOR ─────────────────── */}
        <section className="py-12" style={{ borderBottom: "1px solid rgba(217,70,239,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div
                className="p-10 border text-center min-h-[160px] flex flex-col items-center justify-center relative overflow-hidden"
                style={{
                  borderColor: "rgba(217,70,239,0.12)",
                  background: "linear-gradient(135deg, rgba(217,70,239,0.04) 0%, rgba(0,0,0,0) 100%)",
                }}
              >
                {/* Corner glyphs */}
                <div className="absolute top-3 left-3" style={{ opacity: 0.1 }}>
                  <GlyphIcon char={quote.glyphs[0]} size={24} opacity={0.3} />
                </div>
                <div className="absolute bottom-3 right-3" style={{ opacity: 0.1 }}>
                  <GlyphIcon char={quote.glyphs[1]} size={24} opacity={0.3} />
                </div>

                {/* Glyph strip */}
                <div className="flex items-center gap-1 mb-6 opacity-30">
                  {quote.glyphs.map((g) => (
                    <GlyphIcon key={g} char={g} size={10} opacity={0.5} />
                  ))}
                </div>

                <div
                  key={activeQuote}
                  className="quote-enter font-display text-xl md:text-2xl mb-4 leading-relaxed max-w-2xl"
                  style={{ color: "var(--ut-white)" }}
                >
                  &ldquo;<ZalgoText text={quote.text} intensity="subtle" />&rdquo;
                </div>

                <div className="flex items-center gap-2">
                  <GlyphIcon char={quote.glyphs[2]} size={12} opacity={0.3} />
                  <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                    — Hakan Hisim · {quote.context}
                  </p>
                </div>
              </div>

              {/* Quote progress dots */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {PHILOSOPHY_QUOTES.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: i === activeQuote ? 20 : 6,
                      height: 6,
                      background: i === activeQuote ? "var(--ut-magenta)" : "rgba(217,70,239,0.2)",
                    }}
                  />
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── CONTENT LIST ─────────────────────────── */}
        <section className="py-12">
          <div className="container-ut">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-8">
              <GlyphIcon char="M" size={18} opacity={0.4} />
              <span className="font-mono text-[9px] tracking-[0.4em] uppercase" style={{ color: "var(--ut-gold)", opacity: 0.4 }}>
                The Materials
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(217,70,239,0.08)" }} />
            </div>

            <div className="space-y-6">
              {EXCLUSIVE_CONTENT.map((item, i) => {
                const glyphSrc = GLYPH_MAP[item.glyph]
                  ? `/images/utglyphs/${GLYPH_MAP[item.glyph]}`
                  : null;

                return (
                  <SectionReveal key={item.id} delay={i * 0.08}>
                    <div
                      className="p-6 md:p-8 border ut-card relative overflow-hidden group transition-all hover:border-opacity-60"
                      style={{
                        borderColor: "rgba(217,70,239,0.12)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {/* Glyph watermark bg */}
                      <div
                        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none"
                        aria-hidden="true"
                      >
                        {glyphSrc && (
                          <img
                            src={glyphSrc}
                            alt=""
                            width={200}
                            height={200}
                            style={{ objectFit: "contain" }}
                          />
                        )}
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 relative z-10">
                        {/* Icon column */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div
                            className="w-14 h-14 border flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                            style={{
                              borderColor: "rgba(217,70,239,0.3)",
                              background: "rgba(217,70,239,0.05)",
                            }}
                          >
                            {item.type === "video" ? (
                              <Play size={20} style={{ color: "var(--ut-magenta)" }} />
                            ) : (
                              <BookOpen size={20} style={{ color: "var(--ut-gold)" }} />
                            )}
                          </div>
                          {/* Glyph identifier */}
                          {glyphSrc && (
                            <img
                              src={glyphSrc}
                              alt=""
                              width={18}
                              height={18}
                              style={{ objectFit: "contain", opacity: 0.4 }}
                            />
                          )}
                          {item.subtitle && (
                            <span className="font-mono text-[8px] tracking-widest uppercase text-center leading-tight" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                              {item.subtitle}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-1 flex items-center gap-1.5" style={{ color: "var(--ut-magenta)", opacity: 0.6 }}>
                                {glyphSrc && (
                                  <img src={glyphSrc} alt="" width={10} height={10} style={{ objectFit: "contain", opacity: 0.6 }} />
                                )}
                                {item.category}
                              </p>
                              <h3 className="font-display text-xl" style={{ color: "var(--ut-white)" }}>
                                <ZalgoText text={item.title} intensity="subtle" />
                              </h3>
                            </div>
                            {item.badge && (
                              <span
                                className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 rounded-full border shrink-0 flex items-center gap-1"
                                style={{ borderColor: "rgba(212,168,71,0.5)", color: "var(--ut-gold)" }}
                              >
                                <Star size={8} />
                                {item.badge}
                              </span>
                            )}
                          </div>

                          <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                            {item.description}
                          </p>

                          {/* Tags */}
                          <div className="flex gap-1.5 flex-wrap">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1"
                                style={{ background: "rgba(217,70,239,0.08)", color: "var(--ut-magenta)", opacity: 0.4 }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* CTA */}
                          <div className="flex items-center gap-4 pt-2">
                            {item.type === "video" ? (
                              <button className="btn-primary text-xs px-5 py-2 inline-flex items-center gap-2 font-mono">
                                <Play size={11} />
                                Watch Now
                                <ChevronRight size={11} />
                              </button>
                            ) : (
                              <a
                                href="/sanctum/member/codex-ii/gallery"
                                className="btn-primary text-xs px-5 py-2 inline-flex items-center gap-2 font-mono"
                              >
                                <FileText size={11} />
                                Browse Notes
                                <ChevronRight size={11} />
                              </a>
                            )}
                            {item.type === "video" && (
                              <span className="flex items-center gap-1.5 font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                                <Clock size={9} />
                                {item.subtitle} · Coming Soon
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SectionReveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── ASK HAKAN ──────────────────────────── */}
        <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div
                className="p-10 border text-center relative overflow-hidden"
                style={{
                  borderColor: "rgba(212,168,71,0.15)",
                  background: "linear-gradient(135deg, rgba(212,168,71,0.04) 0%, rgba(0,0,0,0) 100%)",
                }}
              >
                {/* Corner glyphs */}
                <div className="absolute top-3 left-3" style={{ opacity: 0.08 }}>
                  <GlyphIcon char="H" size={30} opacity={0.3} />
                </div>
                <div className="absolute bottom-3 right-3" style={{ opacity: 0.08 }}>
                  <GlyphIcon char="K" size={30} opacity={0.3} />
                </div>

                <div className="flex items-center justify-center gap-3 mb-4" style={{ opacity: 0.3 }}>
                  <GlyphIcon char="M" size={16} opacity={0.5} />
                  <Quote size={18} style={{ color: "var(--ut-gold)" }} />
                  <GlyphIcon char="E" size={16} opacity={0.5} />
                </div>

                <h3 className="font-display text-xl mb-3" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text="Questions About the Materials?" intensity="subtle" />
                </h3>
                <p className="font-body text-sm max-w-md mx-auto mb-5" style={{ color: "var(--ut-white-dim)" }}>
                  Have a question about the process, a decision, or the work itself? Hakan reads and responds to messages from Initiate members first.
                </p>
                <a
                  href="/sanctum/member#messages"
                  className="btn-primary text-xs px-6 py-2 inline-flex items-center gap-2 font-mono"
                >
                  <MessageCircle size={12} />
                  Send a Message
                  <ChevronRight size={11} />
                </a>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>
    </>
  );
}
