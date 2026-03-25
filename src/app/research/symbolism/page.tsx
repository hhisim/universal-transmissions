import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";

export const metadata: Metadata = {
  title: "Symbolism Research — Universal Transmissions",
  description:
    "Sacred symbolism — archetypes, sigils, and the hidden correspondences between all things. The universal language beneath culture.",
};

const symbolismConcepts = [
  {
    title: "Archetypes",
    desc: "Universal patterns of human experience — the Hero, the Mother, the Trickster, the Sage. Carl Jung identified these as the deep structures of the collective unconscious, shared across all cultures and all times. In Universal Transmissions, archetypes are encoded into visual form as composite symbols that layer multiple archetypal meanings into a single image.",
    icon: "◈",
  },
  {
    title: "Sigils",
    desc: "A sigil is a symbol charged with intention — a visual representation of desire, will, or purpose. In the magical tradition, sigils are created by converting words into abstract geometric forms. Universal Transmissions treats every artwork as a sigil — a charged symbol encoding specific frequencies and intentions into visual form.",
    icon: "⛤",
  },
  {
    title: "The Correspondence Engine",
    desc: "The hidden connections between all things — planets and metals, colors and emotions, numbers and archetypes. The Correspondence Codex maps these relationships, revealing that the universe operates as an interconnected web of symbolic resonance. This is the principle behind ceremonial magic, astrology, and the Great Work.",
    icon: "⇌",
  },
  {
    title: "Symbolic Language",
    desc: "Beyond written language, there exists a pre-linguistic symbolic grammar — a system of signs and correspondences that operates beneath the surface of all cultures. This is the language of myth, of dream, of art. It speaks to the parts of the mind that exist before culture and beyond it.",
    icon: "⌬",
  },
  {
    title: "The Unconscious Architecture",
    desc: "The psyche has structure — layered, geometric, fractal. Symbols are not arbitrary; they map the contours of consciousness itself. The artwork of Universal Transmissions is built on decades of mapping these inner architectures — and translating them into images that speak directly to the unconscious.",
    icon: "⬡",
  },
  {
    title: "The Great Arch",
    desc: "Hermetic philosophy teaches that as above, so below — the macrocosm mirrors the microcosm. Every symbol in Universal Transmissions operates on multiple levels simultaneously: as personal symbol, as cultural archetype, as cosmic principle. This is the Great Arch of symbolic resonance.",
    icon: "⧉",
  },
];

export default function ResearchSymbolismPage() {
  return (
    <>
      <Navigation />
     
      <PageBackground variant="research" /> <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HERO ─────────────────────────────────── */}
        <section className="py-20 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(147, 51, 234, 0.1) 0%, transparent 60%)",
            }}
          />
          <div className="container-ut relative">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                style={{ color: "var(--ut-purple)", opacity: 0.5 }}
              >
                [ Research — Archetypes & Correspondences ]
              </p>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <h1
                className="font-display text-4xl md:text-6xl glow-purple mb-6"
                style={{ color: "var(--ut-purple)" }}
              >
                <ZalgoText text="Symbolism" intensity="moderate" />
              </h1>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <blockquote
                className="font-display text-lg md:text-xl max-w-2xl mb-8"
                style={{ color: "var(--ut-gold)" }}
              >
                <ZalgoText
                  text="The universe is not held together by force, but by consciousness — and consciousness speaks in symbols."
                  intensity="subtle"
                />
              </blockquote>
            </SectionReveal>

            <SectionReveal delay={0.3}>
              <p
                className="font-body text-lg max-w-3xl leading-relaxed"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Symbolism is the currency of the unconscious mind — the language that operates beneath
                culture, beneath language, beneath thought itself. This research area explores the
                universal grammar of symbols: archetypes, sigils, correspondences, and the hidden
                architecture of meaning that connects all things to all other things.
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── DIVIDER ───────────────────────────────── */}
        <div className="container-ut">
          <div className="divider-spectrum" />
        </div>

        {/* ── WHAT IS SYMBOLISM ─────────────────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Universal Language of Symbols" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Before there were words, there were symbols. The first human marks on cave walls
                      were not language — they were something more primal: an attempt to capture and
                      communicate meaning that exceeded the capacity of spoken words. That impulse
                      has never left us.
                    </p>
                    <p>
                      A symbol is not merely a picture. It is a charged vessel — a container for
                      meaning that exists prior to any specific interpretation. The circle means
                      wholeness. The triangle means element. The square means stability. These
                      associations are not learned culturally — they emerge from the structure
                      of human perception itself.
                    </p>
                    <p>
                      In the Universal Transmissions project, symbols are not decorative — they
                      are structural. Each artwork encodes specific frequencies of meaning through
                      the careful arrangement of geometric forms, each carrying its own symbolic
                      weight. The result is images that speak to the unconscious directly, bypassing
                      the rational mind and its endless interpretations.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── KEY CONCEPTS GRID ──────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(147, 51, 234, 0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-purple)", opacity: 0.5 }}
                >
                  [ Core Principles ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl glow-purple"
                  style={{ color: "var(--ut-purple)" }}
                >
                  <ZalgoText text="Symbolic Architecture" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {symbolismConcepts.map((concept, i) => (
                  <SectionReveal key={concept.title} delay={i * 0.05}>
                    <div className="ut-card p-8 h-full">
                      <div className="flex items-start gap-4">
                        <span
                          className="text-2xl flex-shrink-0 mt-1"
                          style={{ color: "var(--ut-purple)", opacity: 0.7 }}
                        >
                          {concept.icon}
                        </span>
                        <div>
                          <h3
                            className="font-heading text-xs tracking-[0.2em] uppercase mb-3"
                            style={{ color: "var(--ut-purple)" }}
                          >
                            <ZalgoText text={concept.title} intensity="subtle" />
                          </h3>
                          <p
                            className="font-body text-sm leading-relaxed"
                            style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                          >
                            {concept.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </SectionReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CORRESPONDENCE ENGINE ─────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(147, 51, 234, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Correspondence Engine" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed mb-8" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      The Correspondence Engine is a concept and tool that maps the hidden connections
                      between all symbolic systems — planets and metals, colors and emotions, numbers
                      and archetypes, sounds and chakra frequencies. It reveals that the universe
                      operates as an interconnected web of resonance, where nothing is truly separate
                      from anything else.
                    </p>
                    <p>
                      This is the principle behind Hermeticism (&quot;as above, so below&quot;), behind
                      ceremonial magic (where symbols are used to invoke specific energies), behind
                      astrology (where celestial movements reflect earthly events), and behind the
                      Great Work of alchemy (where base metals are transformed through symbolic
                      processes into gold).
                    </p>
                    <p>
                      Universal Transmissions treats the visual field as a correspondence engine —
                      a compressed map of symbolic relationships that can be read on multiple levels
                      simultaneously. The same image contains planetary correspondences, chakra
                      frequencies, elemental associations, and personal symbolic meaning — all woven
                      into a single visual form.
                    </p>
                  </div>

                  {/* Visual element — correspondence web */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { symbol: "☉", name: "Sun", correspond: "Gold · Life · Will" },
                      { symbol: "☿", name: "Mercury", correspond: "Quicksilver · Mind · Communication" },
                      { symbol: "☾", name: "Moon", correspond: "Silver · Intuition · Receptivity" },
                      { symbol: "♀", name: "Venus", correspond: "Copper · Love · Beauty" },
                      { symbol: "♂", name: "Mars", correspond: "Iron · Will · Action" },
                      { symbol: "♃", name: "Jupiter", correspond: "Tin · Expansion · Abundance" },
                      { symbol: "♄", name: "Saturn", correspond: "Lead · Limitation · Mastery" },
                      { symbol: "♆", name: "Neptune", correspond: "Platinum · Transcendence · Dreams" },
                      { symbol: "♇", name: "Pluto", correspond: "Uranium · Transformation · Power" },
                    ].map((item) => (
                      <div
                        key={item.symbol}
                        className="ut-card p-4 text-center"
                        style={{ background: "rgba(147, 51, 234, 0.03)" }}
                      >
                        <p
                          className="font-display text-xl mb-1"
                          style={{ color: "var(--ut-purple)" }}
                        >
                          {item.symbol}
                        </p>
                        <p
                          className="font-heading text-[10px] tracking-wider uppercase mb-1"
                          style={{ color: "var(--ut-white)" }}
                        >
                          {item.name}
                        </p>
                        <p
                          className="font-mono text-[8px] tracking-widest uppercase"
                          style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}
                        >
                          {item.correspond}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── CROSS-LINK TO VoA ─────────────────────── */}
        <section
          className="py-16"
          style={{ borderTop: "1px solid var(--ut-border)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div
                className="ut-card p-10 md:p-14"
                style={{
                  background: "linear-gradient(135deg, rgba(147, 51, 234, 0.08) 0%, rgba(10, 9, 14, 0.8) 100%)",
                }}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                  <div className="flex-1">
                    <p
                      className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3"
                      style={{ color: "var(--ut-purple)", opacity: 0.5 }}
                    >
                      [ Vault of Arcana ]
                    </p>
                    <h3
                      className="font-display text-xl mb-3"
                      style={{ color: "var(--ut-white)" }}
                    >
                      <ZalgoText text="The Correspondence Codex" intensity="subtle" />
                    </h3>
                    <p
                      className="font-body text-sm leading-relaxed"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      The Correspondence Engine at Vault of Arcana maps over 10,000+ symbolic
                      connections across traditions — Hermetic, Kabbalistic, Tantric, Taoist,
                      and more. Explore the hidden web of meaning that underlies all esoteric
                      systems.
                    </p>
                  </div>
                  <a
                    href="https://vaultofarcana.com/correspondence-engine"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-shrink-0"
                    style={{ borderColor: "rgba(147, 51, 234, 0.4)", color: "var(--ut-purple)" }}
                  >
                    Explore the Correspondence Engine
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 10L10 2M10 2H4M10 2V8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </a>
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
