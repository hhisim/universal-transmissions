import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { artworks } from "@/data/artworks";

export const metadata: Metadata = {
  title: "Universal Transmissions — Visual Alchemy by Hakan Hisim",
  description:
    "A pan-dimensional manuscript containing universal transmissions based on concepts of transcending syntax and linguistics. Art, codex, and the language of the divine.",
};

/* Featured artworks for homepage display */
const featuredArtworks = artworks.filter((a) => a.featured).slice(0, 4);

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main style={{ background: "var(--ut-black)" }}>

        {/* ── HERO ─────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(var(--ut-cyan) 1px, transparent 1px),
                linear-gradient(90deg, var(--ut-cyan) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />
          {/* Radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,229,255,0.06) 0%, transparent 70%)",
            }}
          />

          <div className="container-ut relative z-10 text-center py-32">
            <SectionReveal>
              {/* Pre-title */}
              <p
                className="font-mono text-[10px] tracking-[0.5em] uppercase mb-6"
                style={{ color: "var(--ut-cyan)", opacity: 0.7 }}
              >
                [ Pan-Dimensional Manuscript ]
              </p>

              {/* Main title */}
              <h1
                className="font-display text-5xl md:text-7xl lg:text-8xl mb-6 glow-cyan"
                style={{ color: "var(--ut-cyan)" }}
              >
                <ZalgoText text="Universal Transmissions" intensity="moderate" />
              </h1>

              {/* Tagline */}
              <p
                className="font-heading text-lg md:text-2xl tracking-widest uppercase mb-4"
                style={{ color: "var(--ut-gold)" }}
              >
                <ZalgoText
                  text="Language is a code — and it can be hacked"
                  intensity="subtle"
                />
              </p>

              <p
                className="font-body text-base md:text-lg max-w-2xl mx-auto mb-12"
                style={{ color: "var(--ut-white-dim)" }}
              >
                An ongoing project of esoteric art, xenolinguistics, cymatics, and the
                visual exploration of consciousness. A gateway to new dimensions of
                innerstanding.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/gallery" className="ut-button-primary">
                  <ZalgoText text="Enter the Gallery" intensity="subtle" />
                </Link>
                <Link href="/codex" className="ut-button-secondary">
                  <ZalgoText text="Explore the Codex" intensity="subtle" />
                </Link>
              </div>
            </SectionReveal>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
            <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-cyan)" }}>
              Scroll
            </p>
            <div
              className="w-px h-8"
              style={{
                background: "linear-gradient(to bottom, var(--ut-cyan), transparent)",
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
                  style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                >
                  [ The Transmission ]
                </p>
                <blockquote
                  className="font-display text-2xl md:text-3xl leading-relaxed mb-8"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText
                    text="Embracing the notion of transcending syntax and linguistics, UT delves into the playful exploration of language as both a construct and a medium for transcendence."
                    intensity="subtle"
                  />
                </blockquote>
                <p className="font-body text-base" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                  Inspired by Trans-dimensional Linguistics and the esoteric realms of Out of Body Experiences, Dimensional Travel, and the Akashic Records — the UT collection serves as gateways to new dimensions of innerstanding.
                </p>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── FEATURED ARTWORKS ─────────────────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(0,229,255,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-16">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                >
                  [ Featured Transmissions ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl glow-cyan"
                  style={{ color: "var(--ut-cyan)" }}
                >
                  <ZalgoText text="Selected Works" intensity="moderate" />
                </h2>
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
                        style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                      >
                        {artwork.year}
                      </p>
                      <h3
                        className="font-heading text-sm tracking-wider group-hover:text-[var(--ut-cyan)] transition-colors"
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
                <Link href="/gallery" className="ut-button-secondary">
                  <ZalgoText text="View All Transmissions" intensity="subtle" />
                </Link>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── SERIES OVERVIEW ──────────────────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(0,229,255,0.04)" }}>
          <div className="container-ut">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Universal Transmissions",
                  desc: "The original series — 11 transmissions exploring language, geometry, and consciousness through a unique visual language.",
                  href: "/gallery",
                  label: "11 Works",
                },
                {
                  title: "Bio-Energetic Vortexes",
                  desc: "Seven visualizations of the chakra system — from Root to Crown — as seen through the lens of hyper-dimensional alien anatomy.",
                  href: "/gallery",
                  label: "7 Works",
                },
                {
                  title: "Twilight Transmissions",
                  desc: "Prismatic spin-off series exploring the liminal space between known and unknown, rendered in twilight tones.",
                  href: "/gallery",
                  label: "5+ Works",
                },
              ].map((series, i) => (
                <SectionReveal key={series.title} delay={i * 0.1}>
                  <Link
                    href={series.href}
                    className="ut-card group p-8 block"
                  >
                    <p
                      className="font-mono text-[9px] tracking-widest uppercase mb-3"
                      style={{ color: "var(--ut-gold)", opacity: 0.7 }}
                    >
                      {series.label}
                    </p>
                    <h3
                      className="font-display text-xl mb-3 group-hover:text-[var(--ut-cyan)] transition-colors"
                      style={{ color: "var(--ut-white)" }}
                    >
                      <ZalgoText text={series.title} intensity="subtle" />
                    </h3>
                    <p
                      className="font-body text-sm leading-relaxed"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
                    >
                      {series.desc}
                    </p>
                    <div className="mt-4 font-mono text-xs" style={{ color: "var(--ut-cyan)", opacity: 0.4 }}>
                      Explore →
                    </div>
                  </Link>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CODEX CALLOUT ────────────────────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(0,229,255,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div
                className="ut-card p-12 text-center"
                style={{
                  background: "rgba(0,229,255,0.03)",
                  border: "1px solid rgba(0,229,255,0.08)",
                }}
              >
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                  style={{ color: "var(--ut-gold)", opacity: 0.7 }}
                >
                  [ The Codex ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl mb-6"
                  style={{ color: "var(--ut-cyan)" }}
                >
                  <ZalgoText
                    text="The Unwritten Book that cannot be read"
                    intensity="moderate"
                  />
                </h2>
                <p
                  className="font-body text-base max-w-2xl mx-auto mb-8"
                  style={{ color: "var(--ut-white-dim)" }}
                >
                  A 150-page manuscript of bizarre beauty — more than a book, it is a
                  condensed collection of high quality art prints woven into existence with
                  childlike fascination towards linguistics, etymology, and visionary experience.
                  The Codex is not meant to be read. It is meant to be experienced.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href="/codex" className="ut-button-primary">
                    <ZalgoText text="Discover the Codex" intensity="subtle" />
                  </Link>
                  <Link href="/store" className="ut-button-secondary">
                    <ZalgoText text="Transmission Hub" intensity="subtle" />
                  </Link>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────── */}
        <section className="py-24" style={{ borderTop: "1px solid rgba(0,229,255,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-16">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                >
                  [ Frequent Inquiries ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl glow-cyan"
                  style={{ color: "var(--ut-cyan)" }}
                >
                  <ZalgoText text="Common Questions" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="max-w-3xl mx-auto space-y-6">
              {[
                {
                  q: "Are the artworks available as prints?",
                  a: "Yes. Most artworks in the Universal Transmissions collection are available as high-quality archival prints. Visit the Transmission Hub to see available sizes and formats.",
                },
                {
                  q: "What is the Universal Transmissions Codex?",
                  a: "The Codex is a 150-page manuscript unlike any other — part art book, part esoteric artifact. It contains original alphabets, geometric systems, and symbolic transmissions. It is a book meant to be experienced, not read.",
                },
                {
                  q: "How are the artworks created?",
                  a: "Each transmission is a composite of digital painting, 3D rendering, and fractal composition — primarily using Adobe Photoshop, Cinema 4D, and Ultra Fractal, among other tools.",
                },
                {
                  q: "What inspires the Universal Transmissions work?",
                  a: "The project draws from cymatics, xenolinguistics, sacred geometry, out-of-body experiences, and the Akashic Records. The core premise: language is a code that can be transcended.",
                },
                {
                  q: "Is the Codex available digitally?",
                  a: "Yes — both the physical hardcover edition and a digital PDF edition are available through the Transmission Hub.",
                },
              ].map((faq, i) => (
                <SectionReveal key={i} delay={i * 0.05}>
                  <div className="ut-card p-8">
                    <h3
                      className="font-heading text-sm tracking-wider uppercase mb-3"
                      style={{ color: "var(--ut-cyan)" }}
                    >
                      <ZalgoText text={faq.q} intensity="subtle" />
                    </h3>
                    <p
                      className="font-body text-sm leading-relaxed"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      {faq.a}
                    </p>
                  </div>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.3}>
              <div className="text-center mt-10">
                <Link href="/about" className="ut-button-secondary">
                  <ZalgoText text="Read More in the About Page" intensity="subtle" />
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
