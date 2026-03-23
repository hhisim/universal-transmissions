import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";

export const metadata: Metadata = {
  title: "The Codex",
  description:
    "The Codex Oracle — a complete symbolic divination system encoded in sacred geometry and visual language. Explore Volume I and II.",
};

const RotatingMerkaba = dynamic(
  () => import("@/components/three/RotatingMerkaba"),
  { ssr: false, loading: () => <div className="w-full" style={{ minHeight: "400px", background: "#050508" }} /> }
);

export default function CodexPage() {
  return (
    <>
      <Navigation />
      <main style={{ background: "var(--ut-black)" }}>

        {/* ── CODEX HERO ─────────────────────────────────────── */}
        <section className="relative min-h-[80vh] flex items-center overflow-hidden">
          {/* Background Merkaba */}
          <div className="absolute inset-0 opacity-30">
            <RotatingMerkaba />
          </div>

          <div className="container-ut relative z-10 py-32">
            <div className="max-w-3xl">
              <SectionReveal>
                <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>
                  [ Sacred Text / Symbolic Oracle ]
                </p>
              </SectionReveal>
              <SectionReveal delay={0.2}>
                <h1 className="font-display text-5xl md:text-7xl mb-6 glow-gold" style={{ color: "var(--ut-gold)" }}>
                  <ZalgoText text="CODEX" intensity="heavy" />
                </h1>
              </SectionReveal>
              <SectionReveal delay={0.4}>
                <h2 className="font-heading text-xl md:text-2xl tracking-[0.3em] uppercase mb-8" style={{ color: "var(--ut-white-dim)" }}>
                  <ZalgoText text="ORACLE" intensity="moderate" />
                </h2>
              </SectionReveal>
              <SectionReveal delay={0.6}>
                <p className="font-body text-xl leading-relaxed mb-10" style={{ color: "var(--ut-white-dim)" }}>
                  A complete symbolic divination system. The Codex speaks in the
                  language of light — sacred geometry, archetype, and the
                  living diagram of existence.
                </p>
              </SectionReveal>
              <SectionReveal delay={0.8}>
                <div className="flex flex-wrap gap-4">
                  <a href="#volume-1" className="btn-gold">
                    <ZalgoText text="Volume I — The Foundation" intensity="subtle" />
                  </a>
                  <a href="#volume-2" className="btn-primary">
                    <ZalgoText text="Volume II — The Ascension" intensity="subtle" />
                  </a>
                </div>
              </SectionReveal>
            </div>
          </div>

          {/* Sacred geometry corner decorations */}
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

        {/* ── VOLUME I — WARM ZONE ──────────────────────────── */}
        <section id="volume-1" className="section-pad codex-vol1-zone" style={{ background: "var(--codex1-bg)" }}>
          <div className="container-ut">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <SectionReveal direction="right">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--codex1-gold)" }}>
                    [ Volume I / The Foundation ]
                  </p>
                  <h2 className="font-display text-4xl md:text-5xl mb-6" style={{ color: "var(--codex1-gold)" }}>
                    <ZalgoText text="The Foundation" intensity="moderate" />
                  </h2>
                  <p className="font-body text-lg leading-relaxed mb-6" style={{ color: "var(--codex1-cream)", opacity: 0.85 }}>
                    The opening movement of the Codex. Volume I establishes the
                    symbolic alphabet — the 78 primary archetypes, the five
                    elements, and the foundational geometry of the oracle system.
                  </p>
                  <p className="font-body text-base mb-8" style={{ color: "var(--codex1-cream)", opacity: 0.6 }}>
                    Amber · Gold · Parchment. The warmth of ancient knowledge,
                    preserved in light.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <a
                      href="https://vaultofarcana.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold"
                      style={{ borderColor: "var(--codex1-gold)", color: "var(--codex1-gold)" }}
                    >
                      <ZalgoText text="Access Volume I" intensity="subtle" />
                    </a>
                    <Link href="/store" className="btn-gold" style={{ borderColor: "var(--codex1-gold)", color: "var(--codex1-gold)", opacity: 0.7 }}>
                      <ZalgoText text="Purchase Book" intensity="subtle" />
                    </Link>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal direction="left" delay={0.2}>
                <div className="relative aspect-[3/4] glow-border-gold overflow-hidden" style={{ borderColor: "rgba(201, 162, 39, 0.25)" }}>
                  <Image
                    src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80"
                    alt="Codex Oracle Volume I"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  {/* Gold overlay tint */}
                  <div className="absolute inset-0" style={{ background: "rgba(201, 162, 39, 0.05)" }} />
                </div>
              </SectionReveal>
            </div>

            {/* Volume I spread gallery */}
            <SectionReveal delay={0.3}>
              <div className="mt-20">
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-6 text-center" style={{ color: "var(--codex1-gold)", opacity: 0.6 }}>
                  [ Page Spreads ]
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=400&q=70",
                    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=70",
                    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=70",
                    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=70",
                  ].map((src, i) => (
                    <div key={i} className="relative aspect-[3/4] overflow-hidden border" style={{ borderColor: "rgba(201,162,39,0.2)" }}>
                      <Image src={src} alt={`Codex spread ${i + 1}`} fill className="object-cover" sizes="25vw" />
                    </div>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── VOLUME II — CYAN ZONE ─────────────────────────── */}
        <section id="volume-2" className="section-pad codex-vol2-zone" style={{ background: "var(--ut-black)" }}>
          <div className="container-ut">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <SectionReveal direction="left">
                <div className="relative aspect-[3/4] glow-border-cyan overflow-hidden order-2 lg:order-1" style={{ borderColor: "rgba(0,229,255,0.2)" }}>
                  <Image
                    src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80"
                    alt="Codex Oracle Volume II"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0" style={{ background: "rgba(0,229,255,0.03)" }} />
                </div>
              </SectionReveal>

              <SectionReveal direction="right" delay={0.15} className="order-1 lg:order-2">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>
                    [ Volume II / The Ascension ]
                  </p>
                  <h2 className="font-display text-4xl md:text-5xl mb-6 glow-cyan" style={{ color: "var(--ut-cyan)" }}>
                    <ZalgoText text="The Ascension" intensity="moderate" />
                  </h2>
                  <p className="font-body text-lg leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)" }}>
                    The advanced tiers of the Codex. Volume II opens the higher
                    chambers — dimensional gates, planetary sigils, and the
                    language of frequencies that precede creation itself.
                  </p>
                  <p className="font-body text-base mb-8" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    Cyan · Electric · Technological. The codebase of light,
                    transmitted from the future-past.
                  </p>
                  <a
                    href="https://vaultofarcana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <ZalgoText text="Access Volume II" intensity="subtle" />
                  </a>
                </div>
              </SectionReveal>
            </div>

            {/* YouTube embed */}
            <SectionReveal delay={0.3}>
              <div className="mt-20">
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-6 text-center" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
                  [ Codex Documentary ]
                </p>
                <div className="relative aspect-video max-w-3xl mx-auto glow-border-cyan" style={{ borderColor: "rgba(0,229,255,0.2)" }}>
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/?listType=search&list=Codex+Oracle+Hakan+Hisim"
                    title="Codex Oracle"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── CODEX AT VAULT OF ARCANA ──────────────────────── */}
        <section className="section-pad relative" style={{ background: "var(--ut-surface)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center max-w-2xl mx-auto">
                <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>
                  [ Interactive Oracle ]
                </p>
                <h2 className="font-display text-3xl mb-6" style={{ color: "var(--ut-white)" }}>
                  Live at Vault of Arcana
                </h2>
                <p className="font-body text-lg leading-relaxed mb-8" style={{ color: "var(--ut-white-dim)" }}>
                  The full Codex Oracle runs live at vaultofarcana.com — pull spreads,
                  browse archetypes, explore the complete symbolic web.
                </p>
                <a
                  href="https://vaultofarcana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  <ZalgoText text="Open Vault of Arcana →" intensity="subtle" />
                </a>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
