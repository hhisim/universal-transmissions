import type { Metadata } from "next";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import PinterestGrid from "@/components/ui/PinterestGrid";
import ResearchPathways from "@/components/research/ResearchPathways";
import CymaticsConnections from "@/components/research/CymaticsConnections";
import ResearchOraclePortal from "@/components/research/ResearchOraclePortal";
import { CYMATICS_CONNECTIONS } from "@/lib/research-connections";
import { resolveResearchTopic, researchTopicId } from "@/lib/research-topics";

export const metadata: Metadata = {
  alternates: { canonical: "/research/cymatics" },
  title: "Cymatics Research — Universal Transmissions",
  description:
    "The science of visible sound and vibration — Chladni patterns, standing waves, and the Tonoscope. How frequency creates form.",
};

/* Symbolic tone values. The note is what this archive assigns the tone, NOT a
   measured property of it. This is UT's own symbolic scheme; no therapeutic or
   healing effect is claimed or implied for any of these numbers. */
const frequencyData = [
  { freq: "432 Hz", note: "Natural tuning · Symbolic", color: "var(--ut-cyan)" },
  { freq: "528 Hz", note: "Love · Symbolic (no DNA claim)", color: "var(--ut-magenta)" },
  { freq: "639 Hz", note: "Harmony · Symbolic", color: "var(--ut-purple)" },
  { freq: "741 Hz", note: "Expression · Symbolic", color: "var(--ut-indigo)" },
  { freq: "852 Hz", note: "Intuition · Symbolic", color: "var(--ut-cyan-deep)" },
  { freq: "963 Hz", note: "Crown · Symbolic", color: "var(--ut-gold)" },
];

export default function ResearchCymaticsPage() {
  /* Resolved here, on the server, from the authoritative registry. This page holds a
     fixed stable identifier; nothing descriptive ever arrives from the URL. */
  const cymaticsTopic = resolveResearchTopic(researchTopicId("cymatics"));
  if (!cymaticsTopic) {
    throw new Error("Cymatics research topic is missing from the research registry.");
  }

  return (
    <>
<PageBackground variant="cymatics" /> <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

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
                      Cymatics concerns the visible effects of vibration: patterns made visible by
                      placing sand, water or another material on a plate or membrane and then
                      vibrating it at a resonant frequency. The word itself is modern — it was
                      <strong>coined by Hans Jenny</strong> in the mid-twentieth century from the
                      Greek <em>kŭma</em>, &apos;wave&apos;. It is not an ancient term, and it was not
                      Pythagoras&apos; word.
                    </p>
                    <p>
                      Each frequency produces a unique geometric pattern — circles become squares, squares
                      become fractals. The same principles that govern the rings of Saturn and the spiral
                      of a nautilus shell are at play: standing waves, nodes, and interference patterns
                      create the visual language of vibration itself.
                    </p>
                    <p>
                      <strong>UT artistic interpretation.</strong> In this project cymatics is treated
                      as a working principle rather than a decorative reference: frequency and geometry
                      are the vocabulary the imagery is built from. That is a choice this archive has
                      made about its own work. It is a claim about the artwork, not a discovery about
                      sound.
                    </p>
                    <p>
                      <strong>What the experiment does not show.</strong> A cymatic pattern is
                      genuinely observed and genuinely reproducible. What the pattern does
                      <em>not</em> establish is that vibration originates form, heals the body, or
                      carries a fixed meaning. The step from a nodal figure to a mandala, a cell or a
                      symbol is an analogy made by an observer. In Jenny&apos;s own account those forms
                      seemed to manifest an invisible force field — that was his stated belief, and
                      it was not a measurement.
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
                      Ernst Chladni (1756–1827) introduced the method systematically, in 1787, in
                      <em>Entdeckungen über die Theorie des Klanges</em> — scattering fine sand on
                      smooth plates and drawing a violin bow across the edge. The powder collects at
                      the nodes, so the mode of vibration becomes a visible figure. Galileo had made
                      comparable observations around 1630 and Robert Hooke saw nodal patterns on a
                      glass plate in 1680; the figures are still called Chladni figures.
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
                      When a wave reflects back on itself it forms a standing wave: fixed points of
                      maximum movement called antinodes, and fixed points of no movement called
                      nodes. For a plate of uniform material, the normal modes of vibration and their
                      nodal-line patterns are determined by the plate&apos;s shape and by how it is
                      held — which is why the same frequency produces a different figure on a
                      different plate.
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
                <p
                  className="font-mono text-[10px] leading-relaxed mt-6"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.72 }}
                >
                  <strong>How to read this table.</strong> These six tone values are a symbolic
                  system used in this archive, and the labels are UT&apos;s own assignments. There is
                  no established evidence that any frequency in this table repairs DNA, treats
                  illness, or produces a measurable effect on the body; claims of that kind
                  circulate widely but are not supported by the experimental literature. What
                  <em>is</em> experimentally established is narrower and more interesting: driven
                  plates and membranes produce reproducible standing-wave figures, and those
                  figures are governed by geometry.
                </p>
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
                      A tonoscope is a cymatic instrument that makes sound visible: a membrane is
                      covered with a fine light material and darkened from behind, so the standing-wave
                      figure can be seen directly. It works on the same principle as the sand plate.
                      The instrument in this project&apos;s portal vision is <strong>not yet built</strong>
                      — the tonoscope and volumetric cymatic routes linked below are unfinished
                      coming-soon surfaces, and nothing here should be read as a working instrument.
                    </p>
                    <p>
                      Each chakra, each organ, each geometric form in the Universal Transmissions
                      project is associated with a specific frequency — captured through the tonoscope
                      and encoded into the visual structure of the artwork. The result is art that
                      doesn&apos;t merely <em>represent</em> sound, but is a direct visualization of it.
                    </p>
                    <p>
                      <strong>UT artistic interpretation.</strong> In this project the chakra tone
                      values — 528 Hz, 639 Hz, 741 Hz, 963 Hz — are given symbolic roles and carried
                      into the visual structure of the work. That assignment is this archive&apos;s own
                      framework, and it is held in the Correspondence Codex as well as in the art. It
                      is not a claim that those frequencies do anything measurable.
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

        {/* ── CYMATICS AS VIBRATIONAL COSMOLOGY (FABLE-5 ENRICHMENT) ────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <h2
                  className="font-display text-2xl mb-8"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text="Sound as the First Geometry" intensity="subtle" />
                </h2>
                <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                  <p>
                    Before there was matter there was ratio. When a vibrating source drives a
                    membrane, the sand does not scatter randomly — it organizes itself into
                    lattices of astonishing symmetry, and the pattern is not chosen: it is
                    <em>derived</em>. Square forms billow from one note, six-fold rosettes from
                    another, and the transition between them is instantaneous and discrete, as if
                    the geometry were already latent in the frequency itself. Whether that settles any
                    ancient claim about number being the substrate of the visible world is a
                    metaphysical question the experiment does not answer: it shows that geometry
                    governs the pattern on a driven plate, and that is all.
                  </p>
                  <p>
                    Pythagoras heard this as the <em>harmony of the spheres</em>: the planets, each
                    on its own orbital ratio, striking a chord whose mathematics is audible to those
                    who learn to listen with number. Kepler, three centuries later, tried to
                    reconstruct that celestial score, and believed the five perfect solids were the
                    tuning-pins of the cosmos. Hans Jenny, in <em>Kymatik</em> (1967), carried the claim to
                    the lab bench by showing that a single tone can be "tuned" through an entire
                    family of living, crystalline forms — some recognizably cellular, mandalic,
                    even approximating organic motion. In the working library behind this project,
                    Dan Winter&apos;s <em>Alphabet of the H)Eart(H</em> carries the thread forward,
                    reading the golden-mean compression of the heart&apos;s field as a cymatic
                    signature — the same wave-becoming-form principle, relocated from the plate to
                    the body.
                  </p>
                  <p>
                    This matters for art because it dissolves the boundary between the audible and
                    the visible. If a frequency can beget a flower, then a painter or a generator of
                    images is, in a precise sense, composing in the same field a musician composes
                    in. The Universal Transmissions works treat every glyph and curve as a frozen
                    sonority — a wave arrested at the crest of its own resonance. The chakra tones
                    (528 Hz the heart, 639 Hz harmony, 741 Hz awakening, 963 Hz crown) are not
                    decorative memos appended to the imagery; they are the load-bearing
                    frequencies, the ones the whole structure is tuned to, so that the finished
                    image behaves more like an instrument than a picture. When you animate that
                    image, you are not adding motion to a form — you are letting the wave continue,
                    letting the sand keep dancing after the bow has left the plate.
                  </p>
                  <p>
                    The deeper principle is transduction: energy does not vanish between one state
                    and another, it changes its cloak. Sound becomes sand-pattern becomes geometry
                    becomes symbol becomes intention. What cymatics teaches is that there is no dead
                    end in this chain — every frequency is looking for its form, and every form is
                    waiting to be sung. To study cymatics is to learn fluency in that middle
                    alphabet, the one that sits exactly between a thought and a thing.
                  </p>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── CONTINUE THE STUDY: SEEDING — CHAKRA LOOP PACKS ─────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="max-w-3xl mx-auto text-center mb-10">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                >
                  [ From Frequency into Form ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl glow-cyan"
                  style={{ color: "var(--ut-cyan)" }}
                >
                  <ZalgoText text="Continue the Study in Motion" intensity="moderate" />
                </h2>
                <p
                  className="font-body text-base max-w-xl mx-auto mt-4"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                >
                  Cymatics resolved into living image. The same oscillating fields that raise
                  sand-patterns are animated and set to loop — geometry let back into time.
                </p>
              </div>
            </SectionReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
              <SectionReveal delay={0.1}>
                <a
                  href="/store/chakra-4k-loop-pack"
                  className="group block ut-card p-8 h-full transition-all duration-300 hover:border-cyan/20"
                  style={{ background: "rgba(34, 211, 238, 0.02)" }}
                >
                  <p className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
                    Loop Pack · Root
                  </p>
                  <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                    CHAKRA 4K
                  </h3>
                  <p className="font-body text-sm leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
                    13 videos, 30-second loops in 4K and 2K — the chakra works animated into
                    living, looping geometry and color fields.
                  </p>
                  <span className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--ut-cyan)" }}>
                    Open
                    <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                      <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </span>
                </a>
              </SectionReveal>
              <SectionReveal delay={0.2}>
                <a
                  href="/store/chakra-8k-loop-pack"
                  className="group block ut-card p-8 h-full transition-all duration-300 hover:border-cyan/20"
                  style={{ background: "rgba(34, 211, 238, 0.02)" }}
                >
                  <p className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
                    Loop Pack · Flow
                  </p>
                  <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                    CHAKRA 8K
                  </h3>
                  <p className="font-body text-sm leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
                    16 videos, 60-second loops in 8K, 4K and 2K — deeper flow and finer detail for
                    the moving geometry that began as static frequency maps.
                  </p>
                  <span className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--ut-cyan)" }}>
                    Open
                    <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                      <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </span>
                </a>
              </SectionReveal>
            </div>
            <SectionReveal delay={0.3}>
              <div className="text-center mt-10">
                <a
                  href="/store/universal-transmissions-codex-vol1-digital"
                  className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                  style={{ color: "var(--ut-cyan)", opacity: 0.8 }}
                >
                  Or carry the full visual language in the Codex
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </a>
              </div>
            </SectionReveal>
          </div>
        </section>

        <CymaticsConnections connections={CYMATICS_CONNECTIONS} />

        <section className="py-16" style={{ borderTop: "1px solid var(--ut-border)" }}>
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <ResearchOraclePortal topic={cymaticsTopic} returnHref="/research/cymatics" />
            </div>
          </div>
        </section>

        <ResearchPathways
          eyebrow="[ From Frequency into Experience ]"
          title="Take Cymatics into the Live Instruments"
          description="Cymatics on UT is not just historical reference. It becomes playable in the Tonoscope, volumetric in the 3D engine, and visible across the transmissions archive."
          accent="var(--ut-cyan)"
          links={[
            {
              href: "/experience/cymatic-tonoscope",
              title: "Cymatic Tonoscope",
              description: "This instrument remains part of the portal vision, but it is still locked as an unfinished coming-soon build.",
              label: "Interactive Tool",
              comingSoon: true,
            },
            {
              href: "/experience/cymatic-3d",
              title: "3D Cymatic Engine",
              description: "This volumetric engine is still under construction and should be treated as a coming-soon portal surface.",
              label: "Interactive Tool",
              comingSoon: true,
            },
            {
              href: "/journal",
              title: "Journal Entries",
              description: "Trace how sound, vibration, and form show up in the process writing around new transmissions.",
              label: "Process Archive",
            },
            {
              href: "/gallery/bio-energetic-vortexes",
              title: "Bio-Energetic Vortexes",
              description: "See one of the clearest series where frequency-thinking drives the image architecture.",
              label: "Related Series",
            },
          ]}
        />

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
</>
  );
}
