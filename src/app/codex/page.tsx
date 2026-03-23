import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";

export const metadata: Metadata = {
  title: "The Codex — Universal Transmissions",
  description:
    "The Universal Transmissions Codex — 150 pages of symbolic art, sacred geometry, and visionary experience. A book unlike any other. Available in physical and digital editions.",
};

export default function CodexPage() {
  return (
    <>
      <Navigation />
      <main style={{ background: "var(--ut-black)" }}>

        {/* ── CODEX HERO ─────────────────────────────────────── */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
          <div className="container-ut relative z-10 py-32">
            <div className="max-w-3xl">
              <SectionReveal>
                <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>
                  [ Sacred Text / Symbolic Art ]
                </p>
              </SectionReveal>
              <SectionReveal delay={0.2}>
                <h1 className="font-display text-5xl md:text-7xl mb-4 glow-gold" style={{ color: "var(--ut-gold)" }}>
                  <ZalgoText text="CODEX" intensity="heavy" />
                </h1>
              </SectionReveal>
              <SectionReveal delay={0.35}>
                <p className="font-heading text-lg md:text-xl tracking-[0.2em] uppercase mb-8" style={{ color: "var(--ut-white-dim)" }}>
                  Universal Transmissions — Volume I
                </p>
              </SectionReveal>
              <SectionReveal delay={0.5}>
                <p className="font-body text-xl leading-relaxed mb-10" style={{ color: "var(--ut-white-dim)" }}>
                  150 pages of symbolic art, sacred geometry, and visionary experience.
                  Some liken it to The Voynich Manuscript meets a cyberpunk grimoire.
                  It is more than a book — it is a condensed collection of a decade&apos;s
                  obsessive creative transmission, bound into one artifact.
                </p>
              </SectionReveal>
              <SectionReveal delay={0.7}>
                <div className="flex flex-wrap gap-4">
                  <Link href="/sanctum" className="btn-gold">
                    Purchase the Book
                  </Link>
                  <a href="#about" className="btn-secondary">
                    About the Codex
                  </a>
                </div>
              </SectionReveal>
            </div>
          </div>

          {/* Background gradient */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(201,162,39,0.15) 0%, transparent 60%)" }} />
          </div>

          {/* Corner decorations */}
          <div className="absolute top-8 left-8 opacity-20">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <polygon points="30,5 55,50 5,50" stroke="#d4a847" strokeWidth="0.5" fill="none" />
              <circle cx="30" cy="30" r="20" stroke="#d4a847" strokeWidth="0.5" fill="none" />
            </svg>
          </div>
          <div className="absolute bottom-8 right-8 opacity-20">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <polygon points="30,5 55,50 5,50" stroke="#00e5ff" strokeWidth="0.5" fill="none" />
              <circle cx="30" cy="30" r="20" stroke="#00e5ff" strokeWidth="0.5" fill="none" />
            </svg>
          </div>
        </section>

        {/* ── ABOUT THE CODEX ──────────────────────────────── */}
        <section id="about" className="section-pad" style={{ background: "var(--ut-surface)" }}>
          <div className="container-ut">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <SectionReveal direction="right">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-gold)" }}>
                    [ The Book ]
                  </p>
                  <h2 className="font-display text-4xl md:text-5xl mb-6" style={{ color: "var(--ut-white)" }}>
                    <ZalgoText text="The Unwritten Book" intensity="moderate" />
                  </h2>
                  <p className="font-body text-lg leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.85 }}>
                    The Universal Transmissions Codex is not a book written — it is a
                    book woven. Created over a decade of obsessive creative practice,
                    it synthesizes linguistics, etymology, semiotics, sacred geometry,
                    and direct visionary experience into 150 pages of uncompromising
                    symbolic art.
                  </p>
                  <p className="font-body text-base mb-8" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    Amber · Gold · Parchment. The warmth of ancient knowledge,
                    preserved in light. Printed on premium paper, bound in a edition
                    that honors the work&apos;s obsession with quality.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/sanctum" className="btn-gold">
                      View Editions
                    </Link>
                    <Link href="/gallery" className="btn-secondary">
                      Explore the Art
                    </Link>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal direction="left" delay={0.2}>
                <div className="relative aspect-[3/4] glow-border-gold overflow-hidden" style={{ borderColor: "rgba(201, 162, 39, 0.25)" }}>
                  <Image
                    src="https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695716030627-DA8VQAVV957PCTDR65HG/07+-+web.jpg"
                    alt="Universal Transmissions Codex — Volume I"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0" style={{ background: "rgba(201, 162, 39, 0.05)" }} />
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── CODEX SPREADS ───────────────────────────────── */}
        <section className="section-pad" style={{ background: "var(--ut-black)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                  [ Page Spreads ]
                </p>
                <h2 className="font-display text-3xl" style={{ color: "var(--ut-white)" }}>
                  Inside the Codex
                </h2>
              </div>
            </SectionReveal>
            <SectionReveal delay={0.2}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695716028160-GLGK345HL9EDGQT5VO2A/06+-+web.jpg",
                  "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695716022944-4KZHZAT7PLZ1LQB8EP1V/02+-+web.jpg",
                  "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695716011205-95Z64JF0N4JOSXFYJ13T/03+-+web.jpg",
                  "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695718380540-INT53Y12EC86JNY3N7TP/Page+146.jpg",
                ].map((src, i) => (
                  <div key={i} className="relative aspect-[3/4] overflow-hidden border" style={{ borderColor: "rgba(201,162,39,0.2)" }}>
                    <Image src={src} alt={`Codex spread ${i + 1}`} fill className="object-cover" sizes="25vw" />
                  </div>
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── PURCHASE CTA ────────────────────────────────── */}
        <section className="section-pad" style={{ background: "var(--codex1-bg, var(--ut-surface))" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center max-w-2xl mx-auto">
                <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>
                  [ Available Now ]
                </p>
                <h2 className="font-display text-3xl md:text-4xl mb-6" style={{ color: "var(--ut-white)" }}>
                  Own the Artifact
                </h2>
                <p className="font-body text-lg leading-relaxed mb-10" style={{ color: "var(--ut-white-dim)" }}>
                  Physical edition — premium print, gold foil, handnumbered.
                  Digital edition — high-resolution PDF, every page intact.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link href="/sanctum" className="btn-gold">
                    Purchase — Sanctum Store
                  </Link>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
