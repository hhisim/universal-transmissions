import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import PinterestGrid from "@/components/ui/PinterestGrid";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cymatics Research — Universal Transmissions",
  description:
    "The science of visible sound and vibration — Chladni patterns, standing waves, sacred geometry, and the Tonoscope. How frequency creates form.",
};

const FREQUENCIES = [
  { freq: 174, name: "Foundation",   note: "F2", desc: "The substrate of biological matter",    color: "var(--ut-gold)" },
  { freq: 285, name: "Repair",      note: "C3", desc: "Influences tissue regeneration",        color: "var(--ut-cyan)" },
  { freq: 396, name: "Liberation", note: "G3", desc: "Releases fear and ancestral guilt",    color: "var(--ut-purple)" },
  { freq: 417, name: "Change",     note: "G#3", desc: "Facilitates moments of transformation", color: "var(--ut-cyan-deep)" },
  { freq: 432, name: "Harmonic",   note: "A4", desc: "Natural tuning of the cosmos",        color: "var(--ut-gold)" },
  { freq: 528, name: "Miracle",    note: "C5", desc: "The love frequency, DNA restoration",   color: "var(--ut-magenta)" },
  { freq: 639, name: "Harmony",    note: "D5", desc: "Relationships and connection",          color: "var(--ut-cyan)" },
  { freq: 741, name: "Intuition",   note: "F#5", desc: "Awakening inner knowing",              color: "var(--ut-purple)" },
  { freq: 852, name: "Third Eye",   note: "G#5", desc: "Return to spiritual order",            color: "var(--ut-cyan-deep)" },
  { freq: 963, name: "Crown",       note: "B5", desc: "Pure tone, source contact",              color: "var(--ut-gold)" },
];

// Sacred geometry glyphs as inline SVGs (UT aesthetic)
const GlyphCymatic = ({ size = 64, opacity = 0.6 }: { size?: number; opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {[8,13,18,23,28].map((r, i) => (
      <circle key={r} cx="32" cy="32" r={r} stroke="currentColor" strokeWidth="0.8" fill="none" opacity={opacity - i * 0.08}/>
    ))}
    {[0,45,90,135,180,225,270,315].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return <line key={deg} x1="32" y1="32" x2={32 + 28 * Math.cos(rad)} y2={32 + 28 * Math.sin(rad)} stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>;
    })}
    <circle cx="32" cy="32" r="2.5" fill="currentColor"/>
  </svg>
);

const GlyphUT = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="18" r="10" stroke="#22d3ee" strokeWidth="1.2" opacity="0.9"/>
    <circle cx="47" cy="39" r="10" stroke="#d4a847" strokeWidth="1.2" opacity="0.7" transform="rotate(60 32 32)"/>
    <circle cx="17" cy="39" r="10" stroke="#22d3ee" strokeWidth="1.2" opacity="0.7" transform="rotate(-60 32 32)"/>
    <circle cx="32" cy="32" r="5" stroke="#d4a847" strokeWidth="0.8" fill="none" opacity="0.8"/>
    {[[32,18],[47,39],[17,39]].map(([cx,cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="2" fill={i === 1 ? '#d4a847' : '#22d3ee'} opacity="0.9"/>
    ))}
  </svg>
);

const GlyphMerkaba = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="32,8 52,50 12,50" stroke="#d4a847" strokeWidth="1.2" fill="none" opacity="0.8"/>
    <polygon points="32,56 52,14 12,14" stroke="#22d3ee" strokeWidth="1.2" fill="none" opacity="0.6"/>
    <polygon points="32,20 42,44 22,44" stroke="#d946ef" strokeWidth="0.8" fill="none" opacity="0.5"/>
    <polygon points="32,44 42,20 22,20" stroke="#d946ef" strokeWidth="0.8" fill="none" opacity="0.5"/>
    <circle cx="32" cy="32" r="2" fill="#d4a847"/>
  </svg>
);

export default function ResearchCymaticsPage() {
  return (
    <>
      <Navigation />
      <PageBackground variant="cymatics" />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HERO ─────────────────────────────────── */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 0%, rgba(34, 211, 238, 0.1) 0%, transparent 60%)",
            }}/>
          <div className="container-ut relative">

            {/* Decorative glyph row */}
            <div className="flex items-center gap-8 mb-8 opacity-20" style={{ color: "var(--ut-cyan)" }}>
              <GlyphUT size={36}/><GlyphCymatic size={32}/><GlyphMerkaba size={36}/>
              <GlyphUT size={32}/><GlyphCymatic size={36}/><GlyphMerkaba size={32}/>
              <GlyphUT size={36}/><GlyphCymatic size={32}/><GlyphMerkaba size={36}/>
            </div>

            <SectionReveal>
              <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>
                [ Research — Frequency & Form ]
              </p>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <h1 className="font-display text-5xl md:text-7xl glow-cyan mb-6 leading-none"
                style={{ color: "var(--ut-cyan)" }}>
                <ZalgoText text="Cymatics" intensity="moderate" />
              </h1>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <blockquote className="font-display text-lg md:text-xl max-w-2xl mb-8"
                style={{ color: "var(--ut-gold)" }}>
                <ZalgoText text="The price the Gods exact for this Gift of Song is that we become what we sing." intensity="subtle" />
                <footer className="font-mono text-[10px] tracking-widest uppercase mt-3" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
                  — Pythagoras
                </footer>
              </blockquote>
            </SectionReveal>

            <SectionReveal delay={0.3}>
              <p className="font-body text-lg max-w-3xl leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                Cymatics is the study of visible sound — the geometric patterns that emerge when frequency shapes matter.
                From Chladni&apos;s 18th-century experiments to the modern Tonoscope, this research area explores how sound creates form —
                and how that principle is encoded into every Universal Transmissions artwork.
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
                  <h2 className="font-display text-2xl mb-8" style={{ color: "var(--ut-white)" }}>
                    <ZalgoText text="What is Cymatics?" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Cymatics comes from the Greek <em>kyma</em> meaning &apos;wave.&apos; It is the study of visible sound and
                      vibration — patterns formed by placing sand, water, or other materials on a plate or membrane and vibrating it
                      at different frequencies. The same principles that govern the rings of Saturn and the spiral of a nautilus shell
                      are at play: standing waves, nodes, and interference patterns create the visual language of vibration itself.
                    </p>
                    <p>
                      Hans Jenny coined the term in 1967, combining <em>kyma</em> (wave) with <em>ta kymatika</em> (matters of the wave).
                      His landmark two-volume work, <em>Kymatik</em>, contains over 400 photographs of standing-wave patterns, demonstrating
                      the universal relationship between sound and geometry. Each frequency produces a unique geometric pattern —
                      circles become squares, squares become fractals.
                    </p>
                    <p>
                      In the Universal Transmissions project, cymatics is not merely an aesthetic choice — it is a fundamental building block.
                      The Tonoscope Cymatic Generator captures and portrays the range of frequencies needed within a single page or image.
                      Each symbol, each line, each geometric form is grounded in the physics of actual sound.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── SACRED FREQUENCY MAP ───────────────────── */}
        <section className="py-20" style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>
                  [ The Frequencies ]
                </p>
                <h2 className="font-display text-2xl md:text-3xl glow-cyan" style={{ color: "var(--ut-cyan)" }}>
                  <ZalgoText text="Sacred Frequency Map" intensity="moderate" />
                </h2>
                <p className="font-body text-sm mt-3 max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                  Ten frequencies most referenced in sound healing traditions. Each carries a distinct geometry when made visible.
                </p>
              </div>
            </SectionReveal>

            <div className="max-w-4xl mx-auto">
              <SectionReveal delay={0.1}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {FREQUENCIES.map((f) => (
                    <div key={f.freq}
                      className="ut-card p-4 text-center transition-all duration-200 hover:-translate-y-0.5"
                      style={{ background: "rgba(34, 211, 238, 0.02)" }}>
                      <div className="font-display text-2xl mb-1" style={{ color: f.color }}>
                        {f.freq}<span className="text-sm opacity-60">Hz</span>
                      </div>
                      <div className="text-xs font-medium text-[var(--ut-white)] mb-0.5">{f.name}</div>
                      <div className="text-[9px] text-[var(--ut-white-dim)] opacity-50 mb-1">{f.note}</div>
                      <div className="text-[9px] text-[var(--ut-white-dim)] opacity-50 leading-tight">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── CHLADNI + THE TONOSCOPE ──────────────── */}
        <section className="py-20" style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}>
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="ut-card p-8" style={{ background: "rgba(34, 211, 238, 0.02)" }}>
                    <h3 className="font-heading text-xs tracking-[0.3em] uppercase mb-4" style={{ color: "var(--ut-cyan)" }}>
                      Chladni Plates
                    </h3>
                    <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      Ernst Chladni (1756–1827) pioneered the visualization of vibrational patterns, sprinkling sand on metal
                      plates and drawing a bow across their edges. The sand dances to the nodes — the points of stillness
                      between waves — revealing the hidden geometry of sound.
                    </p>
                  </div>
                  <div className="ut-card p-8" style={{ background: "rgba(34, 211, 238, 0.02)" }}>
                    <h3 className="font-heading text-xs tracking-[0.3em] uppercase mb-4" style={{ color: "var(--ut-cyan)" }}>
                      Standing Waves
                    </h3>
                    <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      When a wave reflects back on itself, it creates a standing wave — points of maximum amplitude
                      (antinodes) and points of no movement (nodes). These patterns are the foundation of all resonant
                      systems, from atoms to galaxies.
                    </p>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.1}>
                <div className="ut-card p-10 md:p-14">
                  <div className="flex items-start gap-6 mb-8">
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.3)" }}>
                      <GlyphCymatic size={40} opacity={0.8}/>
                    </div>
                    <div>
                      <h2 className="font-display text-2xl mb-2" style={{ color: "var(--ut-white)" }}>
                        <ZalgoText text="The Tonoscope" intensity="subtle" />
                      </h2>
                      <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                        The instrument that makes sound visible
                      </p>
                    </div>
                  </div>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      The Tonoscope is a cymatic instrument that makes sound visible. Developed from principles laid out
                      by Hans Jenny in his seminal work on cymatics, the tonoscope reveals the geometric patterns that
                      underlie all sound vibration.
                    </p>
                    <p>
                      Frequencies like 528Hz (the &apos;Love frequency&apos;), 639Hz (harmony and relationships), 741Hz (expression
                      and awakening), and 963Hz (the &apos;God frequency&apos; or crown chakra tone) are all embedded into the visual
                      field of every Universal Transmissions artwork. Each chakra, each organ, each geometric form is
                      associated with a specific frequency — captured through the tonoscope and encoded into the visual
                      structure.
                    </p>
                    <p>
                      The result is art that doesn&apos;t merely <em>represent</em> sound, but is a direct visualization of it —
                      a geometric fingerprint of vibration itself.
                    </p>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.2}>
                <div className="mt-8 overflow-hidden glow-border-cyan" style={{ background: "rgba(0,0,0,0.4)" }}>
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

        {/* ── HANS JENNY QUOTE ─────────────────────── */}
        <section className="py-16" style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="max-w-2xl mx-auto text-center">
                <div className="flex justify-center mb-6 opacity-40" style={{ color: "var(--ut-cyan)" }}>
                  <GlyphMerkaba size={56}/>
                </div>
                <blockquote className="font-display text-xl md:text-2xl leading-relaxed mb-4"
                  style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text="The same vibrating system which creates sound also creates light." intensity="subtle" />
                </blockquote>
                <footer className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                  Hans Jenny — Kymatik, 1967
                </footer>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── TOOL CARDS ─────────────────────────────── */}
        <section className="py-20" style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>
                  [ Experience Portal ]
                </p>
                <h2 className="font-display text-2xl md:text-3xl glow-cyan" style={{ color: "var(--ut-cyan)" }}>
                  <ZalgoText text="Interactive Cymatic Tools" intensity="moderate" />
                </h2>
                <p className="font-body text-sm mt-3 max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                  Take the theory into your own hands. These instruments let you explore cymatic geometry in real-time.
                </p>
              </div>
            </SectionReveal>

            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cymatic Tonoscope */}
                <SectionReveal delay={0.1}>
                  <a
                    href="/experience/cymatic-tonoscope"
                    className="ut-card p-8 block group transition-all hover:-translate-y-1"
                    style={{ borderColor: "rgba(34, 211, 238, 0.15)", background: "rgba(34, 211, 238, 0.02)" }}
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div
                        className="w-14 h-14 border flex items-center justify-center"
                        style={{ borderColor: "rgba(34, 211, 238, 0.3)", background: "rgba(34, 211, 238, 0.08)" }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ut-cyan)" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10"/>
                          <circle cx="12" cy="12" r="6" opacity="0.6"/>
                          <circle cx="12" cy="12" r="2" fill="currentColor"/>
                          {[0, 60, 120, 180, 240, 300].map((deg) => {
                            const rad = (deg * Math.PI) / 180;
                            return <line key={deg} x1="12" y1="12" x2={12 + 10 * Math.cos(rad)} y2={12 + 10 * Math.sin(rad)} stroke="currentColor" strokeWidth="0.5" opacity="0.3"/>;
                          })}
                        </svg>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] tracking-widest uppercase mb-1" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>Tool 01</div>
                        <h3 className="font-display text-base" style={{ color: "var(--ut-cyan)" }}>Cymatic Tonoscope</h3>
                      </div>
                    </div>
                    <p className="font-body text-sm leading-relaxed mb-5" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      Full 2D cymatic field generator. Select sacred frequencies, choose your plate type, and watch the Chladni patterns emerge. Record video snapshots and export your patterns.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border" style={{ borderColor: "rgba(34, 211, 238, 0.3)", color: "var(--ut-cyan)", opacity: 0.6 }}>
                        Use Tool
                        <svg className="inline ml-1" width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div className="font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>Sand · Water · Metal</div>
                    </div>
                  </a>
                </SectionReveal>

                {/* 3D Cymatic Engine */}
                <SectionReveal delay={0.2}>
                  <a
                    href="/experience/cymatic-3d"
                    className="ut-card p-8 block group transition-all hover:-translate-y-1"
                    style={{ borderColor: "rgba(217, 70, 239, 0.15)", background: "rgba(217, 70, 239, 0.02)" }}
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div
                        className="w-14 h-14 border flex items-center justify-center"
                        style={{ borderColor: "rgba(217, 70, 239, 0.3)", background: "rgba(217, 70, 239, 0.08)" }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ut-magenta)" strokeWidth="1.5">
                          <path d="M12 2L22 8V16L12 22L2 16V8L12 2Z"/>
                          <path d="M12 22V8" opacity="0.5"/>
                          <path d="M22 8L12 14L2 8" opacity="0.5"/>
                          <path d="M2 16L12 10L22 16" opacity="0.5"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] tracking-widest uppercase mb-1" style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>Tool 02</div>
                        <h3 className="font-display text-base" style={{ color: "var(--ut-magenta)" }}>3D Cymatic Engine</h3>
                      </div>
                    </div>
                    <p className="font-body text-sm leading-relaxed mb-5" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      Three.js volumetric cymatic visualization — sacred geometry standing waves in three-dimensional space. Includes Resonance Weaver, Sequencer, and Translation Chamber modes.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border" style={{ borderColor: "rgba(217, 70, 239, 0.3)", color: "var(--ut-magenta)", opacity: 0.6 }}>
                        Use Tool
                        <svg className="inline ml-1" width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div className="font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>Three.js · 3 Modes</div>
                    </div>
                  </a>
                </SectionReveal>
              </div>
            </div>
          </div>
        </section>

        {/* ── CROSS-LINK TO VoA ─────────────────────── */}
        <section className="py-16" style={{ borderTop: "1px solid var(--ut-border)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="ut-card p-10 md:p-14"
                style={{ background: "linear-gradient(135deg, rgba(34, 211, 238, 0.05) 0%, rgba(10, 9, 14, 0.8) 100%)" }}>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                  <div className="flex-1">
                    <p className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>
                      [ Vault of Arcana ]
                    </p>
                    <h3 className="font-display text-xl mb-3" style={{ color: "var(--ut-white)" }}>
                      <ZalgoText text="Sound & Vibration Traditions" intensity="subtle" />
                    </h3>
                    <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      Explore the full sound and vibration archive at Vault of Arcana — deeper into the traditions of
                      sacred sound, healing frequencies, and the cosmology of vibration that underlies all matter.
                    </p>
                  </div>
                  <a href="https://vaultofarcana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-shrink-0"
                    style={{ borderColor: "rgba(34, 211, 238, 0.4)", color: "var(--ut-cyan)" }}>
                    Explore the full sound & vibration archive
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </a>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>

      {/* ── PINTEREST BOARD ──────────────────────── */}
      <section className="py-16" style={{ background: "var(--ut-black)", borderTop: "1px solid var(--ut-border)" }}>
        <div className="container-ut">
          <SectionReveal>
            <div className="text-center mb-10">
              <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>
                [ Cymatics & Frequencies ]
              </p>
              <h2 className="font-display text-2xl md:text-3xl" style={{ color: "var(--ut-cyan)" }}>
                <ZalgoText text="Visual Reference Archive" intensity="moderate" />
              </h2>
            </div>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <PinterestGrid boardSlug="hakanhisim/frequencies" title="Visual Reference Archive" subtitle="Cymatics & Frequencies"/>
          </SectionReveal>
        </div>
      </section>

      <Footer />
    </>
  );
}
