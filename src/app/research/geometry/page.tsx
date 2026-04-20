import type { Metadata } from "next";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import PinterestGrid from "@/components/ui/PinterestGrid";
import ResearchPathways from "@/components/research/ResearchPathways";

export const metadata: Metadata = {
  title: "Geometry Research — Universal Transmissions",
  description:
    "Sacred geometry — the skeleton of the visible world. Platonic solids, Flower of Life, Metatron's Cube, and the golden ratio that underlies all creation.",
};

const platonicSolids = [
  {
    name: "Tetrahedron",
    faces: "4 Triangles",
    element: "Fire",
    desc: "The simplest of the Platonic solids — four triangular faces representing the primal fire of transformation. Associated with the solar plexus chakra and the will.",
    color: "var(--ut-magenta)",
  },
  {
    name: "Hexahedron",
    faces: "6 Squares",
    element: "Earth",
    desc: "The cube — grounded, stable, foundational. Associated with the root chakra and the material world. The shape of crystals, salt, and the fundamental building block of matter.",
    color: "var(--ut-gold)",
  },
  {
    name: "Octahedron",
    faces: "8 Triangles",
    element: "Air",
    desc: "Eight triangular faces representing the element of air. Associated with the heart chakra and the breath of life. Its dual is another octahedron — air reflected in air.",
    color: "var(--ut-cyan)",
  },
  {
    name: "Icosahedron",
    faces: "20 Triangles",
    element: "Water",
    desc: "Twenty triangular faces representing the fluid element of water. Associated with the sacral chakra and the principle of flow. The most spherical of the Platonic solids.",
    color: "var(--ut-indigo)",
  },
  {
    name: "Dodecahedron",
    faces: "12 Pentagons",
    element: "Ether",
    desc: "Twelve pentagonal faces — the shape associated with the cosmos itself, the aether, the quintessence. Often omitted from simpler treatments of sacred geometry, it represents the fifth element beyond earth, air, fire, and water.",
    color: "var(--ut-purple)",
  },
];

const geometryPatterns = [
  {
    title: "Flower of Life",
    desc: "A sacred geometry pattern of overlapping circles arranged in a hexagonal grid — containing every regular polyhedron, every Platonic solid, and the seed of all geometric forms. Found in temples across Egypt, Greece, and throughout the ancient world.",
    symbol: "◉",
  },
  {
    title: "Metatron's Cube",
    desc: "The vector equilibrium — thirteen circles placed with center points on the boundaries of a central circle. When connected with straight lines, all five Platonic solids emerge. Named for the archangel Metatron, the sphere of the divine presence.",
    symbol: "⬡",
  },
  {
    title: "Golden Ratio",
    desc: "Phi (φ) = 1.618... — the ratio that defines beauty, found in the spiral of galaxies and the proportions of the human body. The mathematical foundation of sacred architecture, from the Parthenon to the Cathedral of Notre-Dame.",
    symbol: "φ",
  },
  {
    title: "Sri Yantra",
    desc: "The king of yantras — nine interlocking triangles forming a web of perfect geometric equilibrium. Each triangle points inward, meeting at a central point (bindu) that represents the source of all creation.",
    symbol: "✧",
  },
];

export default function ResearchGeometryPage() {
  return (
    <>
<PageBackground variant="geometry" /> <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HERO ─────────────────────────────────── */}
        <section className="py-20 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(212, 168, 71, 0.08) 0%, transparent 60%)",
            }}
          />
          <div className="container-ut relative">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                style={{ color: "var(--ut-gold)", opacity: 0.5 }}
              >
                [ Research — Form & Proportion ]
              </p>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <h1
                className="font-display text-4xl md:text-6xl glow-gold mb-6"
                style={{ color: "var(--ut-gold)" }}
              >
                <ZalgoText text="Sacred Geometry" intensity="moderate" />
              </h1>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <blockquote
                className="font-display text-lg md:text-xl max-w-2xl mb-8"
                style={{ color: "var(--ut-gold)" }}
              >
                <ZalgoText
                  text="Geometry is the foundation of all things — the invisible skeleton upon which the visible world is hung."
                  intensity="subtle"
                />
              </blockquote>
            </SectionReveal>

            <SectionReveal delay={0.3}>
              <p
                className="font-body text-lg max-w-3xl leading-relaxed"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Sacred geometry is the study of the geometric forms and proportional relationships
                that underlie all creation — from the atomic structure of crystals to the spiral
                arms of galaxies. Plato taught that these forms are the building blocks of reality
                itself — eternal, perfect, unchanging. This research area explores how that invisible
                geometry is encoded into the visual language of Universal Transmissions.
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── DIVIDER ───────────────────────────────── */}
        <div className="container-ut">
          <div className="divider-spectrum" />
        </div>

        {/* ── WHAT IS SACRED GEOMETRY ───────────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Skeleton of the Visible World" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Sacred geometry is not merely decorative mathematics — it is the invisible architecture
                      of reality itself. Long before humans discovered the Platonic solids, these forms
                      were already at work: in the structure of crystals, in the geometry of snowflakes,
                      in the spiral of shells and galaxies.
                    </p>
                    <p>
                      Plato associated each of the five regular polyhedra with an element: the tetrahedron
                      with fire, the cube with earth, the octahedron with air, the icosahedron with water,
                      and the dodecahedron with the cosmos (the quintessence, the fifth element beyond
                      the physical four).
                    </p>
                    <p>
                      In Universal Transmissions, sacred geometry is not applied as an aesthetic overlay
                      — it is the foundational structure of each work. The proportions, the relationships,
                      the angles — all are derived from these timeless forms. The result is artwork that
                      carries the resonance of the eternal geometric principles that underpin all matter.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── PLATONIC SOLIDS ───────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(212, 168, 71, 0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-gold)", opacity: 0.5 }}
                >
                  [ The Five Perfect Forms ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl glow-gold"
                  style={{ color: "var(--ut-gold)" }}
                >
                  <ZalgoText text="Platonic Solids" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {platonicSolids.map((solid, i) => (
                  <SectionReveal key={solid.name} delay={i * 0.05}>
                    <div
                      className="ut-card p-6 h-full text-center"
                      style={{ background: "rgba(212, 168, 71, 0.02)" }}
                    >
                      {/* Geometric icon */}
                      <div className="mb-4 flex justify-center">
                        {solid.faces.includes("Triangle") && solid.name !== "Icosahedron" ? (
                          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            {solid.name === "Tetrahedron" && (
                              <polygon
                                points="24,6 42,40 6,40"
                                stroke={solid.color}
                                strokeWidth="1.5"
                                fill="none"
                              />
                            )}
                            {solid.name === "Octahedron" && (
                              <>
                                <polygon points="24,6 42,27 24,48" stroke={solid.color} strokeWidth="1.5" fill="none" />
                                <polygon points="24,6 6,27 24,48" stroke={solid.color} strokeWidth="1.5" fill="none" />
                              </>
                            )}
                          </svg>
                        ) : solid.name === "Hexahedron" ? (
                          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <rect x="10" y="10" width="28" height="28" stroke={solid.color} strokeWidth="1.5" fill="none" />
                          </svg>
                        ) : solid.name === "Icosahedron" ? (
                          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <polygon points="24,6 42,16 38,38 10,38 6,16" stroke={solid.color} strokeWidth="1.5" fill="none" />
                          </svg>
                        ) : (
                          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <polygon points="24,4 44,16 38,40 10,40 4,16" stroke={solid.color} strokeWidth="1.5" fill="none" />
                          </svg>
                        )}
                      </div>

                      <h3
                        className="font-display text-sm mb-1"
                        style={{ color: solid.color }}
                      >
                        {solid.name}
                      </h3>
                      <p
                        className="font-mono text-[8px] tracking-widest uppercase mb-3"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                      >
                        {solid.faces}
                      </p>
                      <p
                        className="font-heading text-[9px] tracking-[0.2em] uppercase mb-3"
                        style={{ color: solid.color, opacity: 0.7 }}
                      >
                        {solid.element}
                      </p>
                      <p
                        className="font-body text-xs leading-relaxed"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
                      >
                        {solid.desc}
                      </p>
                    </div>
                  </SectionReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── GEOMETRY PATTERNS ─────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(212, 168, 71, 0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-gold)", opacity: 0.5 }}
                >
                  [ Key Patterns ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl glow-gold"
                  style={{ color: "var(--ut-gold)" }}
                >
                  <ZalgoText text="Sacred Geometry Patterns" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {geometryPatterns.map((pattern, i) => (
                  <SectionReveal key={pattern.title} delay={i * 0.05}>
                    <div className="ut-card p-8 h-full">
                      <div className="flex items-start gap-4">
                        <span
                          className="text-3xl flex-shrink-0"
                          style={{ color: "var(--ut-gold)", opacity: 0.7 }}
                        >
                          {pattern.symbol}
                        </span>
                        <div>
                          <h3
                            className="font-display text-lg mb-3"
                            style={{ color: "var(--ut-white)" }}
                          >
                            <ZalgoText text={pattern.title} intensity="subtle" />
                          </h3>
                          <p
                            className="font-body text-sm leading-relaxed"
                            style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                          >
                            {pattern.desc}
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

        {/* ── GEOMETRY IN UT ─────────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(212, 168, 71, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="Geometry in Universal Transmissions" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Sacred geometry is not merely a visual reference in the Universal Transmissions
                      project — it is the foundational architecture. Every artwork begins with geometric
                      construction: the Sri Yantra&apos;s interlocking triangles, the Flower of Life&apos;s
                      overlapping circles, Metatron&apos;s Cube and its hidden Platonic solids.
                    </p>
                    <p>
                      Works like <em>Tetragrammaton</em> encode the four-letter name of God through
                      geometric form. <em>The Merkaba</em> and <em>Hyperdimensional Harmonics</em> use
                      the star tetrahedron — two interlocking tetrahedrons rotating in opposite
                      directions — as their central geometric key. <em>Vitruvian Spirit</em> draws on
                      Leonardo&apos;s geometric study of human proportion.
                    </p>
                    <p>
                      The Toroidal Tantra series explores the torus — the fundamental geometry of energy
                      flow in the universe, found in magnetic fields, hurricanes, and the shape of the
                      galaxy. All of these forms share a common origin in the five Platonic solids and
                      their derivatives.
                    </p>
                  </div>

                  {/* Reference artworks */}
                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      "Tetragrammaton",
                      "The Merkaba",
                      "Hyperdimensional Harmonics",
                      "Vitruvian Spirit",
                    ].map((title) => (
                      <div
                        key={title}
                        className="ut-card p-4 text-center"
                        style={{ background: "rgba(212, 168, 71, 0.03)" }}
                      >
                        <p
                          className="font-heading text-[9px] tracking-widest uppercase"
                          style={{ color: "var(--ut-gold)", opacity: 0.7 }}
                        >
                          {title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        <ResearchPathways
          eyebrow="[ From Form into Transmission ]"
          title="Follow Geometry into the Live Work"
          description="Sacred geometry on UT is not just explanatory text. It appears in the artworks, animates the experience tools, and becomes a structural layer inside the Oracle and member archive."
          accent="var(--ut-gold)"
          links={[
            {
              href: "/experience/cymatic-3d",
              title: "3D Cymatic Engine",
              description: "Experience geometric resonance as animated volumetric form rather than static diagram.",
              label: "Interactive Tool",
            },
            {
              href: "/gallery",
              title: "Gallery",
              description: "See geometric frameworks embedded directly into the finished transmissions and series.",
              label: "Archive Surface",
            },
            {
              href: "/journal",
              title: "Journal",
              description: "Read the process material around construction, proportion, and the underlying forms.",
              label: "Process Archive",
            },
            {
              href: "/oracle",
              title: "The Oracle",
              description: "Bring geometric symbols and archetypal forms into the interpretive surface of the Oracle.",
              label: "Oracle Surface",
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
                  background: "linear-gradient(135deg, rgba(212, 168, 71, 0.05) 0%, rgba(10, 9, 14, 0.8) 100%)",
                }}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                  <div className="flex-1">
                    <p
                      className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3"
                      style={{ color: "var(--ut-gold)", opacity: 0.5 }}
                    >
                      [ Vault of Arcana ]
                    </p>
                    <h3
                      className="font-display text-xl mb-3"
                      style={{ color: "var(--ut-white)" }}
                    >
                      <ZalgoText text="Hermetic Philosophy & Sacred Geometry" intensity="subtle" />
                    </h3>
                    <p
                      className="font-body text-sm leading-relaxed"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      Sacred geometry is the foundation of Hermetic philosophy — the ancient tradition
                      that teaches &quot;as above, so below.&quot; Explore the Vault&apos;s Hermetic traditions
                      for deeper context on the geometric principles that underpin all creation.
                    </p>
                  </div>
                  <a
                    href="https://vaultofarcana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold flex-shrink-0"
                  >
                    Explore Hermetic traditions at Vault of Arcana
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
                style={{ color: "var(--ut-gold)", opacity: 0.5 }}
              >
                [ Geometrika ]
              </p>
              <h2
                className="font-display text-2xl md:text-3xl"
                style={{ color: "var(--ut-gold)" }}
              >
                <ZalgoText text="Visual Reference Archive" intensity="moderate" />
              </h2>
            </div>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <PinterestGrid
              boardSlug="hakanhisim/geometrika"
              title="Visual Reference Archive"
              subtitle="Geometry & Sacred Patterns"
            />
          </SectionReveal>
        </div>
      </section>
</>
  );
}
