import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import PinterestGrid from "@/components/ui/PinterestGrid";

export const metadata: Metadata = {
  title: "Cymatics Research — Universal Transmissions",
  description:
    "The science of visible sound and vibration — Chladni patterns, standing waves, and the Tonoscope. How frequency creates form.",
};

const frequencyData = [
  { freq: "432 Hz", note: "Natural Tuning · Nature's Frequency", color: "var(--ut-cyan)" },
  { freq: "528 Hz", note: "DNA Repair · Love Frequency", color: "var(--ut-magenta)" },
  { freq: "639 Hz", note: "Harmony · Relationships", color: "var(--ut-purple)" },
  { freq: "741 Hz", note: "Expression · Awakening", color: "var(--ut-indigo)" },
  { freq: "852 Hz", note: "Third Eye · Intuition", color: "var(--ut-cyan-deep)" },
  { freq: "963 Hz", note: "Crown · Pure Tone", color: "var(--ut-gold)" },
];

export default function ResearchCymaticsPage() {
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
                "radial-gradient(ellipse at 50% 0%, rgba(34, 211, 238, 0.08) 0%, transparent 60%)",
            }}
          />
          <div className="container-ut relative">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
              >
                [ Research — Frequency & Form ]
              </p>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <h1
                className="font-display text-4xl md:text-6xl glow-cyan mb-6"
                style={{ color: "var(--ut-cyan)" }}
              >
                <ZalgoText text="Cymatics" intensity="moderate" />
              </h1>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <blockquote
                className="font-display text-lg md:text-xl max-w-2xl mb-8"
                style={{ color: "var(--ut-gold)" }}
              >
                <ZalgoText
                  text="The price the God's exact for this Gift of Song is that we become what we sing."
                  intensity="subtle"
                />
                <footer
                  className="font-mono text-[10px] tracking-widest uppercase mt-3"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                >
                  — Pythagoras
                </footer>
              </blockquote>
            </SectionReveal>

            <SectionReveal delay={0.3}>
              <p
                className="font-body text-lg max-w-3xl leading-relaxed"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Cymatics is the study of visible sound and vibration — the geometric patterns that
                emerge when frequency shapes matter. From Chladni&apos;s 18th-century experiments to the
                modern Tonoscope, this research area explores how sound creates form — and how that
                principle is encoded into every Universal Transmissions artwork.
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── DIVIDER ───────────────────────────────── */}
        <div className="container-ut">
          <div className="divider-spectrum" />
        </div>

        {/* ── WHAT IS CYMATICS ──────────────────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="What is Cymatics?" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Cymatics comes from the Greek <em>kyma</em> meaning &apos;wave.&apos; It is the study of
                      visible sound and vibration — typically patterns formed by placing sand, water, or
                      other materials on a plate or membrane and then vibrating it at different
                      frequencies. The word comes from the Greek <em>kyma</em> meaning &apos;wave.&apos;
                    </p>
                    <p>
                      Each frequency produces a unique geometric pattern — circles become squares, squares
                      become fractals. The same principles that govern the rings of Saturn and the spiral
                      of a nautilus shell are at play: standing waves, nodes, and interference patterns
                      create the visual language of vibration itself.
                    </p>
                    <p>
                      In the Universal Transmissions project, cymatics is not merely an aesthetic choice
                      — it is a fundamental building block. The Tonoscope Cymatic Generator is used to
                      capture and portray the range of frequencies that are needed within a single page
                      or image. Each symbol, each line, each geometric form is grounded in the physics
                      of actual sound.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── CHLADNI PATTERNS ──────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="ut-card p-8" style={{ background: "rgba(34, 211, 238, 0.02)" }}>
                    <h3
                      className="font-heading text-xs tracking-[0.3em] uppercase mb-4"
                      style={{ color: "var(--ut-cyan)" }}
                    >
                      Chladni Plates
                    </h3>
                    <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      Ernst Chladni (1756–1827) pioneered the visualization of vibrational patterns,
                      sprinkling sand on metal plates and drawing a bow across their edges. The sand
                      dances to the nodes — the points of stillness between waves — revealing the
                      hidden geometry of sound.
                    </p>
                  </div>
                  <div className="ut-card p-8" style={{ background: "rgba(34, 211, 238, 0.02)" }}>
                    <h3
                      className="font-heading text-xs tracking-[0.3em] uppercase mb-4"
                      style={{ color: "var(--ut-cyan)" }}
                    >
                      Standing Waves
                    </h3>
                    <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      When a wave reflects back on itself, it creates a standing wave — points of
                      maximum amplitude (antinodes) and points of no movement (nodes). These patterns
                      are the foundation of all resonant systems, from atoms to galaxies.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── FREQUENCY TABLE ───────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                >
                  [ The Frequencies ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl glow-cyan"
                  style={{ color: "var(--ut-cyan)" }}
                >
                  <ZalgoText text="Frequency Map" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="max-w-3xl mx-auto">
              <SectionReveal delay={0.1}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {frequencyData.map((item) => (
                    <div
                      key={item.freq}
                      className="ut-card p-6 text-center"
                      style={{ background: "rgba(34, 211, 238, 0.02)" }}
                    >
                      <p
                        className="font-display text-xl mb-2"
                        style={{ color: item.color }}
                      >
                        {item.freq}
                      </p>
                      <p
                        className="font-mono text-[9px] tracking-widest uppercase"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                      >
                        {item.note}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── THE TONOSCOPE ─────────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Tonoscope" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      The Tonoscope is a cymatic instrument that makes sound visible. Developed from
                      principles laid out by Hans Jenny in his seminal work on cymatics, the tonoscope
                      reveals the geometric patterns that underlie all sound vibration.
                    </p>
                    <p>
                      Each chakra, each organ, each geometric form in the Universal Transmissions
                      project is associated with a specific frequency — captured through the tonoscope
                      and encoded into the visual structure of the artwork. The result is art that
                      doesn&apos;t merely <em>represent</em> sound, but is a direct visualization of it.
                    </p>
                    <p>
                      Frequencies like 528Hz (known as the &apos;Love frequency&apos;), 639Hz (harmony and
                      relationships), 741Hz (expression and awakening), and 963Hz (the &apos;God frequency&apos;
                      or crown chakra tone) are all embedded into the visual field of the artwork.
                    </p>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.2}>
                <div
                  className="mt-8 overflow-hidden glow-border-cyan"
                  style={{ background: "rgba(0,0,0,0.4)" }}
                >
                  <img
                    src="https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1508398128192-39XM5VNWXQ84FPPP1YTG/cymatics.jpg"
                    alt="Cymatics overview"
                    className="w-full"
                  />
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
                  background: "linear-gradient(135deg, rgba(34, 211, 238, 0.05) 0%, rgba(10, 9, 14, 0.8) 100%)",
                }}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                  <div className="flex-1">
                    <p
                      className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3"
                      style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                    >
                      [ Vault of Arcana ]
                    </p>
                    <h3
                      className="font-display text-xl mb-3"
                      style={{ color: "var(--ut-white)" }}
                    >
                      <ZalgoText text="Sound & Vibration Traditions" intensity="subtle" />
                    </h3>
                    <p
                      className="font-body text-sm leading-relaxed"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      Explore the full sound and vibration archive at Vault of Arcana — deeper into
                      the traditions of sacred sound, healing frequencies, and the cosmology of
                      vibration that underlies all matter.
                    </p>
                  </div>
                  <a
                    href="https://vaultofarcana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-shrink-0"
                    style={{ borderColor: "rgba(34, 211, 238, 0.4)", color: "var(--ut-cyan)" }}
                  >
                    Explore the full sound & vibration archive
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


      {/* ── PINTEREST BOARD (below footer) ─────────── */}
      <section
        className="py-16"
        style={{ background: "var(--ut-black)", borderTop: "1px solid var(--ut-border)" }}
      >
        <div className="container-ut">
          <SectionReveal>
            <div className="text-center mb-10">
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
              >
                [ Cymatics & Frequencies ]
              </p>
              <h2
                className="font-display text-2xl md:text-3xl"
                style={{ color: "var(--ut-cyan)" }}
              >
                <ZalgoText text="Visual Reference Archive" intensity="moderate" />
              </h2>
            </div>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <PinterestGrid
              boardSlug="hakanhisim/frequencies"
              title="Visual Reference Archive"
              subtitle="Cymatics & Frequencies"
            />
          </SectionReveal>
        </div>
      </section>

      <Footer />
    </>
  );
}
