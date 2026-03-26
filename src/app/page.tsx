import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import HomeVideo from "@/components/ui/HomeVideo";
import { artworks } from "@/data/artworks";
import Image from 'next/image';

const LogoHero = dynamic(
  () => import("@/components/hero/LogoHero").then((m) => m.LogoHero),
  { ssr: false, loading: () => <div className="h-screen bg-ut-void" /> }
);

export const metadata: Metadata = {
  title: "Universal Transmissions — Visual Alchemy by Hakan Hisim",
  description:
    "A pan-dimensional manuscript containing universal transmissions based on concepts of transcending syntax and linguistics. Art, codex, and the language of the divine.",
};

const featuredArtworks = [
  artworks.find((a) => a.slug === "crown-chakra")!,
  artworks.find((a) => a.slug === "prismatic-equation")!,
  artworks.find((a) => a.slug === "twilight-pantheism")!,
  artworks.find((a) => a.slug === "vitruvian-spirit")!,
]

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main style={{ background: "var(--ut-black)" }}>

        {/* ── HERO — Interactive Logo ──────────────────── */}
        <section className="relative flex flex-col items-center overflow-hidden" style={{ height: "60vh" }}>
          <div className="absolute inset-0">
            <LogoHero />
          </div>
          <div className="relative z-10 text-center px-6" style={{ marginTop: "42vh" }}>
            <h1
              className="font-display text-4xl md:text-6xl lg:text-7xl tracking-[0.1em] mb-4 ut-gradient-text"
              style={{ color: "var(--ut-white)" }}
            >
              <ZalgoText text="Universal Transmissions" intensity="moderate" />
            </h1>
            <p
              className="font-body text-base md:text-lg italic mb-8"
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
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div
              className="w-[1px] h-12"
              style={{
                background: "linear-gradient(to bottom, transparent, var(--ut-magenta), transparent)",
              }}
            />
          </div>
        </section>

        {/* ── VIDEO — Square Cloudinary player ─────────── */}
        <section className="relative py-12 flex items-center justify-center">
          <HomeVideo />
        </section>

        {/* ── MANIFESTO ───────────────────────────────── */}
        <section className="py-16">
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
        <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                  style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                >
                  [ Selected Transmissions ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text="From the Archive" intensity="subtle" />
                </h2>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredArtworks.slice(0, 2).map((artwork, i) => (
                <SectionReveal key={artwork.id} delay={i * 0.15}>
                  <Link
                    href={`/gallery/${artwork.slug}`}
                    className="artwork-card ut-card block overflow-hidden group"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={artwork.images[0]}
                        alt={artwork.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="artwork-card-overlay">
                        <p
                          className="font-heading text-sm tracking-widest uppercase"
                          style={{ color: "var(--ut-cyan)" }}
                        >
                          View Transmission →
                        </p>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3
                        className="font-heading text-base tracking-wider mb-1"
                        style={{ color: "var(--ut-white)" }}
                      >
                        {artwork.title}
                      </h3>
                      <p
                        className="font-mono text-[10px]"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                      >
                        {artwork.medium} · {artwork.year}
                      </p>
                    </div>
                  </Link>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.2}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {featuredArtworks.slice(2).map((artwork, i) => (
                  <Link
                    key={artwork.id}
                    href={`/gallery/${artwork.slug}`}
                    className="artwork-card ut-card block overflow-hidden group"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={artwork.images[0]}
                        alt={artwork.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="artwork-card-overlay">
                        <p
                          className="font-heading text-sm tracking-widest uppercase"
                          style={{ color: "var(--ut-cyan)" }}
                        >
                          View Transmission →
                        </p>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3
                        className="font-heading text-base tracking-wider mb-1"
                        style={{ color: "var(--ut-white)" }}
                      >
                        {artwork.title}
                      </h3>
                      <p
                        className="font-mono text-[10px]"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                      >
                        {artwork.medium} · {artwork.year}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionReveal>

            <SectionReveal delay={0.3}>
              <div className="text-center mt-12">
                <Link href="/gallery" className="btn-secondary">
                  View All Transmissions
                </Link>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────── */}
        <section
          className="py-32 text-center"
          style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <span style={{ color: "var(--ut-magenta)" }}>
                <ZalgoText
                  text="The transmission never ends."
                  intensity="moderate"
                  className="font-display text-2xl md:text-4xl block mb-6"
                />
              </span>
              <Link href="/gallery" className="btn-primary">
                Enter the Archive
              </Link>
            </SectionReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
