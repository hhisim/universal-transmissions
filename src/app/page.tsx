import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { artworks } from "@/data/artworks";

const LogoHero = dynamic(
  () => import("@/components/hero/LogoHero").then((m) => m.LogoHero),
  { ssr: false, loading: () => <div className="h-screen bg-ut-void" /> }
);

export const metadata: Metadata = {
  title: "Universal Transmissions — Visual Alchemy by Hakan Hisim",
  description:
    "A pan-dimensional manuscript containing universal transmissions based on concepts of transcending syntax and linguistics. Art, codex, and the language of the divine.",
};

const featuredArtworks = artworks.filter((a) => a.featured).slice(0, 4);

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main style={{ background: "var(--ut-black)" }}>

        {/* ── HERO — Interactive Logo ──────────────────── */}
        <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
          {/* Interactive logo canvas fills the hero */}
          <div className="absolute inset-0">
            <LogoHero />
          </div>

          {/* Text content — BELOW the logo, centered */}
          <div className="relative z-10 text-center px-6 mt-[52vh]">
            <h1
              className="font-display text-4xl md:text-6xl lg:text-7xl tracking-[0.1em] mb-6 ut-gradient-text"
              style={{ color: "var(--ut-white)" }}
            >
              <ZalgoText text="Universal Transmissions" intensity="moderate" />
            </h1>
            <p
              className="font-body text-lg md:text-xl italic mb-10"
              style={{ color: "var(--ut-gold)" }}
            >
              Language is a code — and it can be hacked
            </p>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              <Link href="/gallery" className="btn-primary">
                ENTER THE GALLERY
              </Link>
              <Link href="/codex" className="btn-secondary">
                DISCOVER THE CODEX
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div
              className="w-[1px] h-12"
              style={{
                background: "linear-gradient(to bottom, transparent, var(--ut-magenta), transparent)",
              }}
            />
          </div>
        </section>

        {/* ── MANIFESTO ───────────────────────────────── */}
        <section className="py-24">
          <div className="container-ut">
            <div className="max-w-3xl mx-auto text-center">
              <SectionReveal>
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-6"
                  style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                >
                  [ The Transmission ]
                </p>
                <blockquote
                  className="font-display text-2xl md:text-3xl leading-relaxed mb-8"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText
                    text="Embracing the notion of transcending syntax and linguistics, Universal Transmissions delves into the playful exploration of language as both a construct and a medium for transcendence."
                    intensity="subtle"
                  />
                </blockquote>
                <p
                  className="font-body text-base"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                >
                  Inspired by trans-dimensional linguistics and the esoteric realms of out-of-body experience, dimensional travel, and the Akashic Records — the UT collection serves as gateways to new dimensions of innerstanding. Each transmission is a composite of digital painting, 3D rendering, fractal composition, and symbolic encoding — created through a process that began with journals of incomprehensible text remembered from childhood dreams.
                </p>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── FEATURED ARTWORKS ─────────────────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-16">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                >
                  [ Featured Transmissions ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl glow-spectrum"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text="Selected Works" intensity="moderate" />
                </h2>
                <p className="font-body text-base mt-3" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                  Each piece is a transmission — a message encoded in geometry, light, and sacred form.
                </p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredArtworks.map((artwork, i) => (
                <SectionReveal key={artwork.id} delay={i * 0.1}>
                  <Link
                    href={`/gallery/${artwork.slug}`}
                    className="ut-card group block overflow-hidden"
                  >
                    <div
                      className="aspect-square overflow-hidden"
                      style={{ background: "rgba(0,0,0,0.4)" }}
                    >
                      <img
                        src={artwork.images[0]}
                        alt={artwork.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-6">
                      <p
                        className="font-mono text-[9px] tracking-widest uppercase mb-2"
                        style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                      >
                        {artwork.year}
                      </p>
                      <h3
                        className="font-heading text-sm tracking-wider"
                        style={{ color: "var(--ut-white)" }}
                      >
                        <ZalgoText text={artwork.title} intensity="subtle" />
                      </h3>
                    </div>
                  </Link>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.4}>
              <div className="text-center mt-12">
                <Link href="/gallery" className="btn-secondary">
                  VIEW ALL TRANSMISSIONS
                </Link>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── SERIES OVERVIEW ──────────────────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Universal Transmissions",
                  desc: "The original series — eleven transmissions exploring language, geometry, and consciousness through a unique visual lexicon. Each piece is a self-contained universe of xenolinguistic code, sacred geometry, and dimensional mapping.",
                  href: "/gallery",
                  label: "11 Works",
                },
                {
                  title: "Bio-Energetic Vortexes",
                  desc: "Seven visualizations of the human energy system — from Root to Crown — as perceived through hyper-dimensional vision. Each chakra rendered as a living mandala of fractal complexity and symbolic depth.",
                  href: "/gallery",
                  label: "7 Works",
                },
                {
                  title: "Twilight Transmissions",
                  desc: "A prismatic series exploring the liminal frequencies between known and unknown, rendered in twilight tones where the visible spectrum bleeds into the invisible.",
                  href: "/gallery",
                  label: "5+ Works",
                },
              ].map((series, i) => (
                <SectionReveal key={series.title} delay={i * 0.1}>
                  <Link href={series.href} className="ut-card-gold group p-8 block">
                    <p
                      className="font-mono text-[9px] tracking-widest uppercase mb-3"
                      style={{ color: "var(--ut-gold)", opacity: 0.7 }}
                    >
                      {series.label}
                    </p>
                    <h3
                      className="font-display text-xl mb-3"
                      style={{ color: "var(--ut-white)" }}
                    >
                      <ZalgoText text={series.title} intensity="subtle" />
                    </h3>
                    <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                      {series.desc}
                    </p>
                  </Link>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CODEX CALLOUT ────────────────────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div
                className="ut-card p-12 text-center"
                style={{ background: "rgba(217,70,239,0.03)", border: "1px solid rgba(217,70,239,0.08)" }}
              >
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                  style={{ color: "var(--ut-gold)", opacity: 0.7 }}
                >
                  [ The Codex ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl mb-6 glow-spectrum"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText
                    text="The Unwritten Book That Cannot Be Read"
                    intensity="moderate"
                  />
                </h2>
                <p
                  className="font-body text-base max-w-2xl mx-auto mb-8"
                  style={{ color: "var(--ut-white-dim)" }}
                >
                  A 150-page manuscript of bizarre beauty — more than a book, it is a condensed collection of high-quality art prints woven into existence through a childlike fascination with linguistics, etymology, and visionary experience. The Codex is not meant to be read. It is meant to be experienced. Ten years of devotion. A lifetime of dreaming. 150 pages of encoded wonder.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href="/codex" className="btn-gold">
                    DISCOVER THE CODEX
                  </Link>
                  <Link href="/sanctum" className="btn-secondary">
                    VISIT THE SANCTUM
                  </Link>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── THE SOURCE — VoA Cross-link ─────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                >
                  [ The Source ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl glow-spectrum"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text="Where the Transmissions Begin" intensity="moderate" />
                </h2>
                <p className="font-body text-base mt-4 max-w-2xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
                  Universal Transmissions is the visual output of thirty years of immersion in esoteric tradition — Hermetic philosophy, Tantric practice, Taoist contemplation, sacred geometry, and the cartography of consciousness. That accumulated knowledge now lives as an interactive oracle and living mystery school.
                </p>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <SectionReveal delay={0.1}>
                <a
                  href="https://vaultofarcana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ut-card p-8 block group"
                >
                  <p className="font-mono text-[9px] tracking-widest uppercase mb-3" style={{ color: "var(--ut-magenta)", opacity: 0.7 }}>
                    ↗ Enter
                  </p>
                  <h3 className="font-display text-xl mb-3" style={{ color: "var(--ut-white)" }}>
                    <ZalgoText text="The Oracle" intensity="subtle" />
                  </h3>
                  <p className="font-body text-sm leading-relaxed mb-5" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                    Ask questions of a curated intelligence shaped by rare esoteric archives. Four living traditions — Tao, Tarot, Tantra, and Entheogenic wisdom — with more awakening.
                  </p>
                  <span className="btn-primary text-xs py-3 px-6">CONSULT THE ORACLE</span>
                </a>
              </SectionReveal>

              <SectionReveal delay={0.2}>
                <a
                  href="https://vaultofarcana.com/correspondence-engine"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ut-card p-8 block group"
                >
                  <p className="font-mono text-[9px] tracking-widest uppercase mb-3" style={{ color: "var(--ut-gold)", opacity: 0.7 }}>
                    ↗ Explore
                  </p>
                  <h3 className="font-display text-xl mb-3" style={{ color: "var(--ut-white)" }}>
                    <ZalgoText text="Correspondence Codex" intensity="subtle" />
                  </h3>
                  <p className="font-body text-sm leading-relaxed mb-5" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                    A symbolic cross-reference engine mapping the hidden connections between traditions, elements, planets, chakras, and archetypes.
                  </p>
                  <span className="btn-gold text-xs py-3 px-6">EXPLORE CORRESPONDENCES</span>
                </a>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-16">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                >
                  [ Frequent Inquiries ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl glow-spectrum"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text="Common Questions" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="max-w-3xl mx-auto space-y-6">
              {[
                {
                  q: "What are the written languages in these artworks?",
                  a: "The languages are an amalgamation of various alphabets and symbols — some sourced from ancient scripts found through research, others brought back from journeys out of the body into higher and lower dimensional realms. They resonate with many people because they hint at a prototype or archetypal xenolinguistic alphabet encoded within the fabric of reality — glimpsed in parts during dreams, trance states, and deep meditation.",
                },
                {
                  q: "Does the language actually mean anything?",
                  a: "Meaning is a tricky thing. These images contain both language and symbols used in artistically aesthetic ways, and also contain encoded information transcribed from remembered experiences during trance states. Language is the prime component in the manifestation of reality.",
                },
                {
                  q: "What is the Universal Transmissions Codex?",
                  a: "The Codex is the result of an alchemical process — a concentrated distillation of an entire life's journey. It is a book that cannot be read, and its purpose is NOT to be read. 150 high-quality art prints bound together in the highest quality PUR binding on museum-grade semi-gloss paper.",
                },
                {
                  q: "Are the artworks available as prints?",
                  a: "Yes. Most works in the collection are available as high-quality archival giclée prints, tapestries, and stretched canvas. Every print is signed by the artist. Visit the Sanctum for current availability.",
                },
                {
                  q: "What is Vault of Arcana?",
                  a: "Vault of Arcana is a living mystery school — an interactive oracle and archive built from the same thirty years of esoteric research that produced Universal Transmissions. Where UT is the visual output, VoA is the knowledge architecture.",
                },
                {
                  q: "Are you an alien?",
                  a: "No — just a human being experiencing the magnificent wonder of our multidimensional realities, like everyone else on this exquisite planet.",
                },
              ].map((faq, i) => (
                <SectionReveal key={i} delay={i * 0.05}>
                  <div className="ut-card p-8">
                    <h3
                      className="font-heading text-sm tracking-wider uppercase mb-3"
                      style={{ color: "var(--ut-magenta)" }}
                    >
                      <ZalgoText text={faq.q} intensity="subtle" />
                    </h3>
                    <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      {faq.a}
                    </p>
                  </div>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.3}>
              <div className="text-center mt-10">
                <Link href="/about" className="btn-secondary">
                  READ MORE IN THE ABOUT PAGE
                </Link>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
