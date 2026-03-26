import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { artworks } from "@/data/artworks";

export const metadata: Metadata = {
  title: "Origin — Universal Transmissions",
  description:
    "The origin story of Universal Transmissions — the Apex Being, Adam Kadmon artwork series, xenolinguistics research, and the narrative essence of the project.",
};

// Apex Being artwork slugs — match actual data/artworks.ts
const APEX_BEING_SLUGS = [
  "vitruvian-spirit",
  "vehicular-dynamics",
  "indras-net",
  "tetra",
  "merkaba",
  "higher-access",
  "tesseract",
  "recursive-pantheism",
];

export default function OriginPage() {
  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-20" style={{ borderBottom: "1px solid rgba(0,229,255,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
              >
                [ Origin ]
              </p>
              <h1
                className="font-display text-4xl md:text-6xl glow-cyan mb-6"
                style={{ color: "var(--ut-cyan)" }}
              >
                <ZalgoText text="Origin" intensity="moderate" />
              </h1>
              <p
                className="font-body text-lg max-w-2xl"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Narrative · Essence
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── THE PROJECT ────────────────────────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="max-w-4xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10">
                  <h3
                    className="font-display text-xl mb-4"
                    style={{ color: "var(--ut-cyan)" }}
                  >
                    <ZalgoText text="The Project" intensity="subtle" />
                  </h3>
                  <p
                    className="font-body text-base leading-relaxed mb-6"
                    style={{ color: "var(--ut-white-dim)" }}
                  >
                    The roots of the Universal Transmissions Codex go back to childhood — where Hakan Hisim
                    would fill journals with incomprehensible text and alphabets remembered from dreams,
                    pairing them with strange imagery. This is a practice most children experience in some form.
                  </p>
                  <p
                    className="font-body text-base leading-relaxed mb-6"
                    style={{ color: "var(--ut-white-dim)" }}
                  >
                    As he grew and disconnected from inner self, those journals were forgotten. Until he
                    re-discovered and re-membered them in deep ecstatic states of trance. The
                    Xenolinguistics became a bridge to connect childhood and present experience.
                  </p>
                  <p
                    className="font-body text-base leading-relaxed"
                    style={{ color: "var(--ut-white-dim)" }}
                  >
                    Almost exactly 10 years later, the first volume of the Codex has manifested. The Codex is
                    not meant to be read — it is meant to be experienced. It is an intentionally crafted
                    enigma which creates a bold statement by its existence alone:{' '}
                    <em style={{ color: "var(--ut-gold)" }}>
                      Knowledge is borrowed, and Gnosis is absolute.
                    </em>
                  </p>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(0,229,255,0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="text-center mb-16">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                  >
                    [ Frequently Asked ]
                  </p>
                  <h2
                    className="font-display text-3xl md:text-4xl glow-cyan"
                    style={{ color: "var(--ut-cyan)" }}
                  >
                    <ZalgoText text="Common Questions" intensity="moderate" />
                  </h2>
                </div>
              </SectionReveal>

              <div className="space-y-6">
                {[
                  {
                    q: "Are these real languages? Can they be deciphered?",
                    a: "The roots of all languages in every human culture lead us to a singular source which appears to have indeed been hacked quite a long time ago — and then again several times throughout Woman's Mystery and Man's History. The Universal Transmissions project invites you to look deeper into the roots of language — you may be surprised with what you will find.",
                  },
                  {
                    q: "What is the Codex?",
                    a: "The Universal Transmissions Codex is a 150-page manuscript containing original alphabets, geometric systems, and symbolic transmissions. It is not meant to be read in the conventional sense — it is meant to be experienced. The act of 'learning' via reading is acquired and assumed until it is experienced. Gnosis is the distillation of experience.",
                  },
                  {
                    q: "What are the symbols in the artworks?",
                    a: "The symbols are a mix of original invented syntax, sacred geometric forms, and references to esoteric traditions. Many are inspired by cymatic patterns — visualizations of sound frequencies captured through a Tonoscope. The project treats language as a code that can be hacked, transcended, and reconfigured.",
                  },
                  {
                    q: "Are these artworks inspired by aliens or extraterrestrials?",
                    a: "The Bio-Energetic Vortexes series explores the chakra system of 'apex beings and hyper-dimensional alien lifeforms' — not as literal biological speculation, but as a symbolic framework for understanding energy dynamics that transcend the human body as the sole reference point.",
                  },
                  {
                    q: "What software is used to create the artworks?",
                    a: "Each transmission is a composite of digital painting, 3D rendering, and fractal composition — primarily using Adobe Photoshop, Cinema 4D, Zbrush, Adobe Illustrator, Ultra Fractal, and Mandelbulb 3D. The cymatic imagery is created using a Tonoscope Cymatic Generator to capture and portray the range of frequencies needed within each artwork.",
                  },
                  {
                    q: "How can I purchase prints or the Codex?",
                    a: "The Transmission Hub (store) contains the physical Codex, digital PDF edition, Chakra loop packs, and the limited edition Art Cube. High-quality archival prints are available through the store as well.",
                  },
                  {
                    q: "Is there a video of the Codex creation process?",
                    a: "Yes — creation process videos are available on the Universal Transmissions website and YouTube channel. These time-lapse recordings capture the entire 10+ hour creation process compressed into minutes, with audio commentary on the ideas and techniques used.",
                  },
                  {
                    q: "What is Cymatics?",
                    a: "Cymatics is the study of visible sound and vibration — typically patterns formed by placing sand, water, or other materials on a plate or membrane and then vibrating it at different frequencies. The Universal Transmissions project uses a Tonoscope Cymatic Generator to capture and portray the range of frequencies needed within each artwork.",
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

              <SectionReveal delay={0.4}>
                <div className="text-center mt-12">
                  <p
                    className="font-body text-sm mb-4"
                    style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                  >
                    Still have questions? Reach out through the Connect page.
                  </p>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── APEX BEING / ADAM KADMON ──────────────── AFTER FAQ */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(0,229,255,0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-5xl mx-auto">

              <SectionReveal>
                <div className="text-center mb-16">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-gold)", opacity: 0.6 }}
                  >
                    [ Research ]
                  </p>
                  <h2
                    className="font-display text-3xl md:text-4xl"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Apex Being — Adam Kadmon" intensity="moderate" />
                  </h2>
                </div>
              </SectionReveal>

              {/* Research text */}
              <SectionReveal>
                <div
                  className="ut-card p-10 mb-12"
                  style={{ background: "rgba(0,229,255,0.02)", border: "1px solid rgba(0,229,255,0.06)" }}
                >
                  <p
                    className="font-mono text-[9px] tracking-widest uppercase mb-4"
                    style={{ color: "var(--ut-gold)", opacity: 0.6 }}
                  >
                    Studies and Research Regarding the Artwork — Vehicular Dynamics
                  </p>
                  <h3
                    className="font-display text-2xl mb-6"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="Adam Kadmon" intensity="subtle" />
                  </h3>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      <strong style={{ color: "var(--ut-cyan)" }}>Kadmon</strong> comes from
                      &apos;Azoth&apos; — the primordial substance from which Prima Materia or First Matter was formed.
                      The Adam Kadmon was described as having a two-fold manifestation:
                    </p>
                    <ol className="space-y-3 ml-4" style={{ listStyleType: "decimal" }}>
                      <li>
                        A divine pattern or schematic — a &apos;Light Body&apos; of macrocosmic proportions
                      </li>
                      <li>
                        A formulation of that sacred patterning into a being that was supra-physical, and from
                        which the &apos;Adamic Race was spawned.&apos;
                      </li>
                    </ol>
                    <p>
                      From the Azoth or primitive air in which the supernal world was created, the Adam Kadmon
                      took substance as the &apos;Kosmic Man.&apos; The Universal Transmissions project explores
                      this divine blueprint through the lens of xenolinguistics, cymatics, and sacred geometry.
                    </p>
                  </div>
                </div>
              </SectionReveal>

              {/* Visual reference images — 4 per row from actual project */}
              <SectionReveal>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {APEX_BEING_SLUGS.map((slug) => {
                    const artwork = artworks.find((a) => a.slug === slug);
                    if (!artwork) return null;
                    return (
                      <a
                        key={slug}
                        href={`/gallery/${slug}`}
                        className="group block"
                        style={{ textDecoration: "none" }}
                      >
                        <div
                          className="aspect-square overflow-hidden ut-card relative"
                          style={{ background: "rgba(0,0,0,0.4)" }}
                        >
                          <img
                            src={artwork.images[0]}
                            alt={artwork.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div
                            className="absolute inset-0 flex items-end p-2"
                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }}
                          >
                            <span
                              className="font-mono text-[8px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              style={{ color: "var(--ut-cyan)" }}
                            >
                              {artwork.title.split("—")[1]?.trim() ?? artwork.title}
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </SectionReveal>
