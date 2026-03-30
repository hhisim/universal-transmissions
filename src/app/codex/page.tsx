import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import HomeVideo from "@/components/ui/HomeVideo";
import PageBackground from "@/components/scenes/PageBackground";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import RotatingMerkaba from "@/components/three/RotatingMerkaba";

export const metadata: Metadata = {
  title: "The Codex — Universal Transmissions",
  description:
    "The Universal Transmissions Codex — 150 pages of symbolic art, sacred geometry, and visionary experience. A book unlike any other. Available in physical and digital editions.",
};

// Video data extracted from /memory/01-Projects/ut-website/video/Codex Videos/
// 12 .md files scanned; 4 contain unique YouTube embeds
const videos = [
  {
    youtubeId: "ECAFuxZpyK0",
    title: "Codex Stream 01 — Compilation Capture 01",
    description:
      "Workflow time lapse recorded at 3AM under red monitor light. The creation process of the Universal Transmissions Codex in its earliest form.",
  },
  {
    youtubeId: "gSqdxDWO278",
    title: "Codex Stream 01 — Compilation Capture 03",
    description:
      "Workflow time lapse and creation process of the Universal Transmissions Codex — documenting the encoding sessions and symbolic rendering.",
  },
  {
    youtubeId: "N0p65Q3dz4Y",
    title: "Codex Stream 01 — Compilation Capture 07",
    description:
      "Further documentation of the Codex creation process — timelapse recordings of the symbol encoding and sacred geometry rendering.",
  },
  {
    youtubeId: "r7nvYvklpYE",
    title: "ETHERA 24 — The First Phygital Universal Transmissions Collection",
    description:
      "The launch of ETHERA 24 — the first phygital Universal Transmissions collection. NFT minting, whitelist access, and the integration of physical Codex with digital ownership.",
  },
];

export default function CodexPage() {
  return (
    <>
      <Navigation />
      <PageBackground variant="codex" />
<main style={{ background: "var(--ut-black)" }}>

        {/* ── CODEX HERO ─────────────────────────────────────── */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
          {/* 3D Merkaba background */}
          <div className="absolute inset-0 opacity-30">
            <RotatingMerkaba />
          </div>

          <div className="container-ut relative z-10 py-32">
            <div className="max-w-3xl">
              <SectionReveal>
                <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>
                  [ 150 Pages · Xenolinguistic Art · Sacred Geometry ]
                </p>
              </SectionReveal>
              <SectionReveal delay={0.2}>
                <h1 className="font-display text-5xl md:text-7xl mb-6 ut-gradient-text">
                  <ZalgoText text="THE CODEX" intensity="heavy" />
                </h1>
              </SectionReveal>
              <SectionReveal delay={0.35}>
                <p className="font-heading text-lg md:text-xl tracking-[0.2em] uppercase mb-10" style={{ color: "var(--ut-white-dim)" }}>
                  A Pan-Dimensional Manuscript
                </p>
              </SectionReveal>
              <SectionReveal delay={0.5}>
                <p className="font-body text-lg leading-relaxed mb-10 max-w-2xl" style={{ color: "var(--ut-white-dim)" }}>
                  Ten years of encoding. A lifetime of remembering. The Codex is not
                  meant to be read — it is meant to be experienced. 150 pages of
                  xenolinguistic art, sacred geometry, and symbolic systems that
                  defy conventional reading.
                </p>
              </SectionReveal>
              <SectionReveal delay={0.7}>
                <div className="flex flex-wrap gap-4">
                  <Link href="/sanctum" className="btn-gold">
                    Acquire the Codex
                  </Link>
                  <a href="#behind-the-codex" className="btn-secondary">
                    Watch the Process
                  </a>
                </div>
              </SectionReveal>
            </div>
          </div>

          {/* Background gradient */}
          <div className="absolute inset-0">
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(201,162,39,0.08) 0%, transparent 55%)" }} />
          </div>

          {/* Corner decorations */}
          <div className="absolute top-8 left-8 opacity-15">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <polygon points="30,5 55,50 5,50" stroke="#d4a847" strokeWidth="0.5" fill="none" />
              <circle cx="30" cy="30" r="20" stroke="#d4a847" strokeWidth="0.5" fill="none" />
            </svg>
          </div>
          <div className="absolute bottom-8 right-8 opacity-15">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <polygon points="30,5 55,50 5,50" stroke="#22d3ee" strokeWidth="0.5" fill="none" />
              <circle cx="30" cy="30" r="20" stroke="#22d3ee" strokeWidth="0.5" fill="none" />
            </svg>
          </div>
        </section>

        {/* ── DIVIDER ───────────────────────────────────────── */}
        <div className="divider-spectrum" />

        {/* ── VOL 1 SECTION ─────────────────────────────────── */}
        <section
          className="section-pad codex-vol1-zone"
          style={{ background: "var(--codex1-bg)", color: "var(--codex1-cream)" }}
        >
          <div className="container-ut">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <SectionReveal direction="right">
                <div>
                  <p
                    className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3"
                    style={{ color: "var(--codex1-gold)" }}
                  >
                    [ Volume I — The Foundation ]
                  </p>
                  <h2
                    className="font-display text-4xl md:text-5xl mb-6 ut-gradient-text"
                    style={{ color: "var(--codex1-cream)" }}
                  >
                    <ZalgoText text="Universal Transmissions Codex Vol. 1" intensity="moderate" />
                  </h2>
                  <p
                    className="font-body text-lg leading-relaxed mb-6"
                    style={{ color: "var(--codex1-cream)", opacity: 0.85 }}
                  >
                    Ten years of encoding. A lifetime of remembering. The first volume of
                    the Universal Transmissions Codex is 150 pages of xenolinguistic art —
                    alphabets remembered from ecstatic trance states, sacred geometry
                    rendered at fractal resolution, and symbolic systems that defy
                    conventional reading. This is not a book. It is a distillation of
                    consciousness into physical form.
                  </p>
                  <p
                    className="font-body text-base mb-8"
                    style={{ color: "var(--codex1-gold)", opacity: 0.7 }}
                  >
                    PUR-bound on museum-grade semi-gloss art paper with fabric head and
                    tail bands and a soft fabric bookmark. Every copy hand-inspected.
                    Every page a transmission.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/sanctum" className="btn-gold">
                      Acquire the Codex — $215
                    </Link>
                    <Link href="/sanctum" className="btn-secondary">
                      Digital Edition — $99
                    </Link>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal direction="left" delay={0.2}>
                <div
                  className="relative aspect-[3/4] overflow-hidden glow-border-gold"
                  style={{ borderColor: "rgba(201,162,39,0.25)" }}
                >
                  <Image
                    src="https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695716030627-DA8VQAVV957PCTDR65HG/07+-+web.jpg"
                    alt="Universal Transmissions Codex — Volume I"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "rgba(201,162,39,0.06)" }}
                  />
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── CODEX SPREADS ──────────────────────────────────── */}
        <section className="section-pad" style={{ background: "var(--ut-black)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p
                  className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
                  style={{ color: "var(--codex1-gold)", opacity: 0.6 }}
                >
                  [ Page Spreads ]
                </p>
                <h2 className="font-display text-3xl ut-gradient-text" style={{ color: "var(--ut-white)" }}>
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
                  <div
                    key={i}
                    className="relative aspect-[3/4] overflow-hidden border"
                    style={{ borderColor: "rgba(201,162,39,0.2)" }}
                  >
                    <Image
                      src={src}
                      alt={`Codex spread ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="25vw"
                    />
                  </div>
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── VOL 2 SECTION ─────────────────────────────────── */}
        <section
          className="section-pad"
          style={{ background: "var(--codex2-bg)" }}
        >
          <div className="container-ut">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <SectionReveal direction="right">
                <div
                  className="relative overflow-hidden"
                  style={{ borderColor: "rgba(34,211,238,0.2)" }}
                >
                  <HomeVideo />
                  <div
                    className="absolute inset-0"
                    style={{ background: "rgba(34,211,238,0.05)" }}
                  />
                </div>
              </SectionReveal>

              <SectionReveal direction="left" delay={0.2}>
                <div>
                  <p
                    className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3"
                    style={{ color: "var(--codex2-cyan)" }}
                  >
                    [ Volume II — The Ascension ]
                  </p>
                  <h2
                    className="font-display text-4xl md:text-5xl mb-6"
                    style={{ color: "var(--codex2-silver)" }}
                  >
                    <ZalgoText text="Volume II — The Ascension" intensity="moderate" />
                  </h2>
                  <p
                    className="font-body text-lg leading-relaxed mb-6"
                    style={{ color: "var(--codex2-silver)", opacity: 0.85 }}
                  >
                    After a period of deep incubation — meditation, lucid dreaming, and
                    the arrival of new life — the structure of Volume II has revealed
                    itself. Thirty-three new morphemes. A new alphabet. A new code. The
                    second volume ascends from where the first left off, carrying the
                    transmission into territories that the first volume could only point
                    toward.
                  </p>
                  <p
                    className="font-body text-base mb-8"
                    style={{ color: "var(--codex2-cyan)", opacity: 0.7 }}
                  >
                    Volume II is currently in active creation. Follow the Journal for
                    updates on the manifestation process.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/journal" className="btn-secondary" style={{ borderColor: "rgba(34,211,238,0.3)", color: "var(--codex2-cyan)" }}>
                      Follow the Journal
                    </Link>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── DIVIDER ───────────────────────────────────────── */}
        <div className="divider-spectrum" />

        {/* ── BEHIND THE CODEX — VIDEOS ─────────────────────── */}
        <section
          id="behind-the-codex"
          className="section-pad"
          style={{ background: "var(--ut-surface)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-16">
                <p
                  className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4"
                  style={{ color: "var(--ut-gold)" }}
                >
                  [ Process & Documentation ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl mb-4 ut-gradient-text"
                  style={{ color: "var(--ut-white)" }}
                >
                  Behind the Codex — Process & Videos
                </h2>
                <p
                  className="font-body text-lg max-w-xl mx-auto"
                  style={{ color: "var(--ut-white-dim)" }}
                >
                  The Codex was not written — it was woven. These recordings document
                  the process, the timelapses, and the emergence of the transmission
                  across years of devoted creation.
                </p>
              </div>
            </SectionReveal>

            {/* Video Grid — 3 columns desktop, 1 mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((video, i) => (
                <SectionReveal key={video.youtubeId} delay={i * 0.1}>
                  <div
                    className="video-card relative overflow-hidden rounded"
                    style={{
                      background: "var(--ut-black)",
                      border: "1px solid rgba(212,168,71,0.12)",
                    }}
                  >
                    {/* YouTube Embed — 16:9 aspect ratio container */}
                    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                        style={{ border: 0 }}
                      />
                    </div>

                    {/* Video Info */}
                    <div className="p-5">
                      <p
                        className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
                        style={{ color: "var(--ut-gold)", opacity: 0.6 }}
                      >
                        {String(i + 1).padStart(2, "0")} / {String(videos.length).padStart(2, "0")}
                      </p>
                      <h3
                        className="font-heading text-sm tracking-[0.1em] uppercase mb-2"
                        style={{ color: "var(--ut-white)" }}
                      >
                        {video.title}
                      </h3>
                      <p
                        className="font-body text-sm leading-relaxed"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                      >
                        {video.description}
                      </p>
                    </div>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── PURCHASE CTA ─────────────────────────────────── */}
        <section className="section-pad" style={{ background: "var(--codex1-bg)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center max-w-2xl mx-auto">
                <p
                  className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4"
                  style={{ color: "var(--codex1-gold)" }}
                >
                  [ Available Now ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl mb-6"
                  style={{ color: "var(--codex1-cream)" }}
                >
                  <ZalgoText text="Own the Artifact" intensity="subtle" />
                </h2>
                <p
                  className="font-body text-lg leading-relaxed mb-10"
                  style={{ color: "var(--codex1-cream)", opacity: 0.8 }}
                >
                  Physical edition — museum-grade PUR binding, gold foil, hand-inspected.
                  Digital edition — high-resolution PDF, every page intact.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link href="/sanctum" className="btn-gold">
                    Acquire the Codex
                  </Link>
                  <Link href="/sanctum" className="btn-secondary">
                    Digital Edition
                  </Link>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── DECIPHER THE CODEX ──────────────────────────── */}
        <section className="py-16 px-6 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="font-heading text-[11px] tracking-[0.25em] mb-3" style={{ color: "rgba(212,168,71,0.5)" }}>
            [ DECIPHER THE CODEX ]
          </div>
          <h2 className="font-heading text-2xl tracking-[0.12em] mb-4" style={{ color: "var(--ut-white)" }}>
            Own a copy? Unlock its secrets.
          </h2>
          <p className="font-body text-lg mb-8 max-w-xl mx-auto" style={{ color: "rgba(237,233,246,0.5)" }}>
            The Codex Oracle is a specialized intelligence that analyzes and interprets
            every page, symbol, and transmission within the Universal Transmissions Codex.
            Photograph a page. Ask a question. Receive a multi-layered decryption.
          </p>
          <a href="/oracle" className="btn-gold">
            ACTIVATE THE CODEX ORACLE
          </a>
        </section>

      </main>
      <Footer />
    </>
  );
}
