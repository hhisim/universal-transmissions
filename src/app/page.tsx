import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
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
        <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <LogoHero />
          </div>
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
        <section className="relative py-24 flex items-center justify-center">
          <style>{`
            .video-wrapper {
              position: relative;
              width: 500px;
              height: 500px;
              border-radius: 16px;
              overflow: hidden;
              background: #000;
            }
            video {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }
            .controls {
              position: absolute;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              display: flex;
              gap: 12px;
              opacity: 0;
              transition: opacity 0.3s ease;
              z-index: 10;
            }
            .video-wrapper:hover .controls {
              opacity: 1;
            }
            @media (pointer: coarse) {
              .controls { opacity: 1; }
            }
            .ctrl-btn {
              width: 48px;
              height: 48px;
              border: none;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.15);
              backdrop-filter: blur(10px);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
            }
            .ctrl-btn:hover {
              background: rgba(255, 255, 255, 0.25);
              transform: scale(1.05);
            }
            .ctrl-btn:active { transform: scale(0.95); }
            .ctrl-btn svg { width: 20px; height: 20px; fill: white; }
            .click-overlay {
              position: absolute;
              inset: 0;
              cursor: pointer;
              z-index: 5;
            }
            .paused-indicator {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) scale(0);
              width: 80px;
              height: 80px;
              background: rgba(255, 255, 255, 0.15);
              backdrop-filter: blur(10px);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.3s ease;
              pointer-events: none;
            }
            .paused-indicator.show { transform: translate(-50%, -50%) scale(1); }
            .paused-indicator svg { width: 32px; height: 32px; margin-left: 4px; }
          `}</style>
          <div className="video-wrapper">
            <video
              id="homeVideo"
              autoPlay
              muted
              loop
              playsInline
              poster="https://res.cloudinary.com/dvkxsh4ve/video/upload/so_0,w_500,h_500,c_fill/v1774508909/Page_168_an%C4%B1m_2_3_kitq9c.jpg"
            >
              <source
                src="https://res.cloudinary.com/dvkxsh4ve/video/upload/w_500,h_500,c_fill/v1774508909/Page_168_an%C4%B1m_2_3_kitq9c.mp4"
                type="video/mp4"
              />
            </video>
            <div className="click-overlay" id="clickOverlay" />
            <div className="paused-indicator" id="pauseIndicator">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <div className="controls">
              <button className="ctrl-btn" id="playBtn" aria-label="Play/Pause">
                <svg id="playIcon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                <svg id="pauseIcon" viewBox="0 0 24 24" style={{display:"none"}}><path d="M8 5v14l11-7z"/></svg>
              </button>
              <button className="ctrl-btn" id="muteBtn" aria-label="Mute/Unmute">
                <svg id="muteIcon" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                <svg id="soundIcon" viewBox="0 0 24 24" style={{display:"none"}}><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              </button>
            </div>
          </div>
          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              var video = document.getElementById('homeVideo');
              var clickOverlay = document.getElementById('clickOverlay');
              var playBtn = document.getElementById('playBtn');
              var muteBtn = document.getElementById('muteBtn');
              var playIcon = document.getElementById('playIcon');
              var pauseIcon = document.getElementById('pauseIcon');
              var muteIcon = document.getElementById('muteIcon');
              var soundIcon = document.getElementById('soundIcon');
              var pauseIndicator = document.getElementById('pauseIndicator');

              function togglePlay() {
                if (video.paused) {
                  video.play();
                  playIcon.style.display = 'none';
                  pauseIcon.style.display = 'block';
                  pauseIndicator.classList.remove('show');
                } else {
                  video.pause();
                  playIcon.style.display = 'block';
                  pauseIcon.style.display = 'none';
                  pauseIndicator.classList.add('show');
                }
              }

              function toggleMute() {
                video.muted = !video.muted;
                if (video.muted) {
                  muteIcon.style.display = 'block';
                  soundIcon.style.display = 'none';
                } else {
                  muteIcon.style.display = 'none';
                  soundIcon.style.display = 'block';
                }
              }

              clickOverlay.addEventListener('click', togglePlay);
              playBtn.addEventListener('click', function(e) { e.stopPropagation(); togglePlay(); });
              muteBtn.addEventListener('click', function(e) { e.stopPropagation(); toggleMute(); });
              pauseIcon.style.display = 'none';
              soundIcon.style.display = 'none';
            })();
          `}} />
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
