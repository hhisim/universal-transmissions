import type { Metadata } from "next";
import Link from "next/link";
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

/* The five perfect solids in numbers — faces, edges, vertices, and their dual. */
const solidNumbers = [
  { name: "Tetrahedron", f: 4, e: 6, v: 4, dual: "Tetrahedron", note: "self-dual", color: "var(--ut-magenta)" },
  { name: "Hexahedron", f: 6, e: 12, v: 8, dual: "Octahedron", note: "cube · earth", color: "var(--ut-gold)" },
  { name: "Octahedron", f: 8, e: 12, v: 6, dual: "Hexahedron", note: "air", color: "var(--ut-cyan)" },
  { name: "Icosahedron", f: 20, e: 30, v: 12, dual: "Dodecahedron", note: "water", color: "var(--ut-indigo)" },
  { name: "Dodecahedron", f: 12, e: 30, v: 20, dual: "Icosahedron", note: "quintessence", color: "var(--ut-purple)" },
];

/* Harmonic / chakra correspondence of the forms to tones. */
const chakraResonances = [
  { chakra: "Root", tone: "C · 256 Hz", form: "Hexahedron / cube", element: "Earth", color: "var(--ut-gold)" },
  { chakra: "Sacral", tone: "D · 288 Hz", form: "Icosahedron", element: "Water", color: "var(--ut-indigo)" },
  { chakra: "Solar Plexus", tone: "E · 320 Hz", form: "Tetrahedron", element: "Fire", color: "var(--ut-magenta)" },
  { chakra: "Heart", tone: "F · 341 Hz", form: "Octahedron", element: "Air", color: "var(--ut-cyan)" },
  { chakra: "Throat", tone: "G · 384 Hz", form: "Flower of Life lattice", element: "Sound", color: "var(--ut-white-dim)" },
  { chakra: "Third Eye", tone: "A · 426 Hz", form: "Metatron's Cube", element: "Light", color: "var(--ut-purple)" },
  { chakra: "Crown", tone: "B · 480 Hz", form: "Dodecahedron / the whole", element: "Aether", color: "var(--ut-white)" },
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

        {/* ── WHY ONLY FIVE — the elemental skeleton ───── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(212, 168, 71, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-gold)", opacity: 0.5 }}
                  >
                    [ The Elemental Skeleton ]
                  </p>
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="Why Five, and Only Five" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      It takes a quiet act of hubris to prove that there can be exactly five perfect
                      solids — and yet the proof is short, rigorous, and untouchable. In any regular
                      polyhedron every face is an identical regular polygon and the same number of
                      faces meet at every vertex. The ancient geometers who enumerated them found that
                      equilateral triangles may be packed three, four, or five around a point — never
                      six, for six triangles would sum to 360° and flatten their vertex into a plane —
                      yielding the tetrahedron, the octahedron, and the icosahedron. Squares can meet
                      only three-to-a-vertex, for four would tile the floor forever; that single
                      arrangement closes into the hexahedron, the cube. Pentagons, whose interior
                      angles are 108°, admit exactly three around a point before the sum exceeds a
                      full turn, and from that one closure comes the dodecahedron. Hexagons meet only
                      three at a corner as well, and three times 120° is a perfect 360° — the plane of
                      the honeycomb, never a solid. Geometry itself refuses a sixth.
                    </p>
                    <p>
                      Every one of the five obeys Leonhard Euler&apos;s law, <em>V − E + F = 2</em>,
                      binding together vertices, edges, and faces in a formula that holds for every
                      three-dimensional polyhedron ever drawn. Count them and the numbers rhyme like a
                      mantra: the tetrahedron (4, 6, 4), the cube (8, 12, 6), the octahedron (6, 12, 8),
                      the icosahedron (12, 30, 20), the dodecahedron (20, 30, 12). Look closer and a
                      deeper symmetry appears — the cube and the octahedron swap their counts exactly,
                      each vertex becoming a face and each face a vertex; the icosahedron and the
                      dodecahedron do the same. They are <em>duals</em>, two families that fold into
                      one another like a pair of clasped hands, while the tetrahedron is its own dual,
                      self-embracing. The five are really two fraternal orders plus a single hermaphrodite
                      at the center.
                    </p>
                    <p>
                      So much rigor for matter itself. Plato read the solids as the atoms of the four
                      elements — the sharp tetrahedron searing as fire, the cube piling as earth, the
                      octahedron flowing as air, the slippery icosahedron pooling as water — and the
                      intuition has aged remarkably well. Crystals grow along the symmetry axes of these
                      same polyhedra; table salt is a lattice of cubes; snowflakes inherit hexagonal
                      order; the atomic orbital shapes that fill the periodic table are the tetrahedron,
                      the octahedron, the icosahedron wearing their valence electrons; viral capsids
                      cloak their genomes in precisely these shells; even the geodesic domes of
                      Buckminster Fuller are icosahedral skeletons refined to their limit. Wherever the
                      world needs to close a surface with minimal energy, nature reaches for the same
                      five shapes. The fifth, the dodecahedron, was so bound up with the hidden order
                      of the heavens that Plato&apos;s successors whispered it was the model of the
                      cosmos itself — and close to two millennia later, in 2003, a satellite called
                      COBE read the microwave echo of the universe&apos;s birth and found anisotropies
                      consistent with a dodecahedral topology. Whether literally cosmic or exquisitely
                      poetic, the correspondence refuses to be accidental.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>

            {/* Numeric strip — F / E / V & duals */}
            <div className="max-w-5xl mx-auto mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {solidNumbers.map((s, i) => (
                  <SectionReveal key={s.name} delay={i * 0.05}>
                    <div
                      className="ut-card p-6 h-full text-center"
                      style={{ background: "rgba(255, 255, 255, 0.02)" }}
                    >
                      <p
                        className="font-heading text-[9px] tracking-widest uppercase mb-3"
                        style={{ color: s.color, opacity: 0.8 }}
                      >
                        {s.name}
                      </p>
                      <p
                        className="font-mono text-xs leading-relaxed mb-3"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                      >
                        F {s.f} · E {s.e} · V {s.v}
                      </p>
                      <p
                        className="font-mono text-[9px] tracking-[0.2em] uppercase"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.45 }}
                      >
                        dual — {s.dual} · {s.note}
                      </p>
                    </div>
                  </SectionReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── THE CUBE & XENO FREQUENCY HEXAHEDRON ART CUBE ── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(212, 168, 71, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-4xl mx-auto">
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
                        className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                        style={{ color: "var(--ut-gold)", opacity: 0.5 }}
                      >
                        [ The Hexahedron & the Play of Form ]
                      </p>
                      <h3
                        className="font-display text-xl mb-4"
                        style={{ color: "var(--ut-white)" }}
                      >
                        <ZalgoText text="A Cube That Turns Inside Its Own Rules" intensity="subtle" />
                      </h3>
                      <div className="space-y-5 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                        <p>
                          Of the five solids, the cube is the most paradoxically rich. It is the very
                          emblem of stillness and ground — six squares, twelve edges, eight corners,
                          the shape of salt and the root chakra — and yet it is also the shape of
                          absolute movement. Twist it and each face refuses to stay put; rotate it and
                          every solid from the facets; think of it as a puzzle and it becomes a machine
                          for generating combinations. The ancient Eastern puzzle of the tangram and the
                          modern Rubik&apos;s cube are both, at heart, conversations with the same
                          object: can a perfect, frozen form be set spinning and still return to
                          order?
                        </p>
                        <p>
                          Universal Transmissions answers that question with a physical art object — the{" "}
                          <em>Xeno Frequency Hexahedron Art Cube</em>. The piece takes the humble cube
                          and treats it as an instrument: each of its surfaces is a frequency in color
                          and line, a node of the visual spectrum trapped behind glass. Where a
                          Rubik&apos;s cube asks you to solve it in three dimensions, the Xeno cube asks
                          you to hold an entire chord of geometry in your hand at once — all six faces
                          visible, all six aspects of the same form resolved into a single held note.
                          It is sacred geometry as play: the eternal stationary lattice of the
                          hexahedron, broken open into the delight of recomposition. Cube, held. Cube,
                          turning. Cubes stacked into cities, into lattices, into the deep structure
                          beneath every rendered transmission.
                        </p>
                      </div>
                    </div>
                    {/* Cube gloid */}
                    <div
                      className="flex-shrink-0 w-40 h-40 md:w-48 md:h-48 mx-auto md:mx-0"
                      style={{
                        border: "1px solid rgba(212, 168, 71, 0.35)",
                        boxShadow: "0 0 60px rgba(212, 168, 71, 0.15) inset",
                        background:
                          "repeating-linear-gradient(45deg, rgba(212,168,71,0.06) 0 8px, transparent 8px 16px)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                        <polygon points="60,20 100,40 100,80 60,100 20,80 20,40" stroke="var(--ut-gold)" strokeWidth="1.5" fill="rgba(212,168,71,0.06)" />
                        <path d="M60 20 L60 100 M20 40 L100 40 M20 80 L100 80" stroke="rgba(212,168,71,0.4)" strokeWidth="0.75" />
                        <path d="M60 20 L40 45 M60 20 L80 45 M60 100 L40 75 M60 100 L80 75" stroke="rgba(212,168,71,0.3)" strokeWidth="0.75" />
                      </svg>
                    </div>
                  </div>
                </div>
              </SectionReveal>
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

        {/* ── FROM OVERLAPPING CIRCLES — Vesica / Flower / Metatron ── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(212, 168, 71, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-gold)", opacity: 0.5 }}
                  >
                    [ The Generation of Form ]
                  </p>
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="From Two Circles, Everything" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      The entire architecture of sacred geometry begins with a single act: draw a
                      circle, then draw another of equal radius whose center rests on the first
                      circle&apos;s circumference. The moon overlaps the sun; a space is born between
                      them shaped like a lens split down its middle — the <em>vesica piscis</em>. That
                      almond of overlap is the womb of the tradition. Its width and height stand in the
                      ratio of 1 to √3, and it is the first place in all of geometry where a complete
                      set of three is implied from two: where the circles cross, their centers define
                      the third point of a perfect equilateral triangle, which is the seed of the
                      tetrahedron, and so all of three-dimensional form. The early Church set the
                      Christ-figure inside the vesica&apos;s halo; the fish-symbol of the first
                      Christians is this same lens. One could say the whole of creation in the
                      geometric tradition is the sound made by two circles touching.
                    </p>
                    <p>
                      Let that first pair breathe outward and more circles crowd in, each new center
                      taking its place on the rim of the previous one. Keep going and the pattern
                      organizes itself into a hexagonal field of touching circles — the <em>Flower of
                      Life</em>. It is an organism of good fortune: wherever two circles interlock, the
                      vesica appears; wherever three meet in a cluster, triangles form; wherever six
                      gather around one, a hexagon flowers. The full grid of nineteen overlapping
                      circles that the medieval masters counted holds within it, they insisted, the
                      blueprint of every Platonic solid, so that the five perfect shapes are not five
                      separate ideas but five unfoldings of a single woven web.
                    </p>
                    <p>
                      Draw the circle-centers of the Flower as separate points — thirteen in the
                      central lattice — and connect them with straight lines, and the whole thing
                      snaps into the <em>Fruit of Life</em>; extend those same thirteen spheres with
                      their radiating lines and you have <em>Metatron&apos;s Cube</em>, the archangel&apos;s
                      diagram. In Metatron&apos;s Cube all five Platonic solids appear nested in one
                      another, drawn in a single continuous stroke: the tetrahedron inside the cube,
                      the octahedron inside the tetrahedron, the icosahedron and dodecahedron
                      inscribed within the great sphere. What looks like a flat ornament is really a
                      radial section through the entire skeleton of space. You can hold a two-inch
                      talisman of it and read, if you know where to look, the same five solids that
                      close the crystal lattices under your feet.
                    </p>
                    <p>
                      In the visual language of Universal Transmissions this chain of generation is
                      literal: works begin as two overlapping circles, are allowed to become the vesica,
                      then the Flower, then the interlocked solids — never imposed from a catalogue,
                      but grown from a single seed the way a crystal grows. What the viewer meets as a
                      finished transmission is the whole lineage of form compressed back into one
                      breathing surface.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── THE GOLDEN PROPORTION — phi & Fibonacci ── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(212, 168, 71, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-gold)", opacity: 0.5 }}
                  >
                    [ The Number of Beauty ]
                  </p>
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="Phi, the Golden Proportion" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Take a line and divide it so that the whole is to the longer part as the longer
                      part is to the shorter. The ratio that answers is 1.618..., a number that never
                      repeats and never ends, irrational in the strict sense of the word — irrational
                      because no fraction can capture it. The Greeks called it the divine proportion;
                      Euclid wrote it as a mean and extreme ratio; the Renaissance called it the golden
                      ratio and gave it the letter phi after the sculptor Phidias, who was said to have
                      built the Parthenon upon it. Its decimal, 1.6180339887..., is the number that
                      keeps appearing wherever life decides to grow in a way that pleases the eye.
                    </p>
                    <p>
                      It is bound by a beautiful accident to the Fibonacci sequence, the Greek-bred,
                      Persian-named list of numbers in which each term is the sum of the two before it:
                      0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89... Divide any term by the one preceding it
                      and the answer rushes toward phi, alternately overshooting and undershooting,
                      closing on the irrational target as the sequence runs to infinity. The plant
                      kingdom visibly counts in these numbers: sunflower seeds spiral in opposing
                      families of 34 and 55, pinecones in 8 and 13, the leaf positions of a stem turning
                      to catch the sun repeat in fifths of a turn. A chambered nautilus grows its shell
                      by compounding the same proportion turn after turn, so that a logarithmic spiral
                      of constant pitch accumulates — the shape of galaxies, of hurricanes, of the arms
                      of the Milky Way seen edge-on. It is the ratio of things that grow by multiplying
                      themselves rather than by adding to themselves.
                    </p>
                    <p>
                      Human proportion was long argued to obey it — the navel dividing the body, the
                      fingers dividing the hand, the distances between parts of the face — and whether
                      the strictest biometric data always agrees, the architectural record is
                      unambiguous: from the Parthenon&apos;s columns to the facade of Notre-Dame, from
                      Mondrian&apos;s grids to the geometric abstractions that seem to lock a canvas in
                      place, phi is the ratio that makes a rectangle stop feeling arbitrary and start
                      feeling inevitable. It is why, of all the slightly-off rectangles a draftsman can
                      draw, the golden rectangle is the one that looks <em>finished</em>.
                    </p>
                    <p>
                      Universal Transmissions leans on phi the way a singer leans on a tonic. Page
                      proportion, the division of a canvas into perceived harmony, the spacing of
                      elements along a rendered surface, the moments where a composition opens a spiral
                      — all are tuned to the number the Ancients handed to posterity. The proportion is
                      not decorative; it is the arithmetic of the eye&apos;s contentment, the precise
                      interval at which a shape stops being a shape and begins to be music in two
                      dimensions.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── FROZEN MUSIC — harmonics / chakra / cymatics ── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(212, 168, 71, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-gold)", opacity: 0.5 }}
                  >
                    [ Geometry as Frozen Music ]
                  </p>
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Resonant Body of Form" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      A line of poetry — variously credited to Goethe and to the composer Schlegel —
                      calls architecture &quot;frozen music.&quot; The Sacred Geometry tradition says the
                      same of geometry itself. A circle is a tone drawn; a polygon is a rhythm; a solid
                      is a chord held in space. The ratio that governs a perfect fifth in music, 3:2, is
                      also the ratio that turns a vibrating string into a harmonic; the octave 2:1 that
                      makes a note feel like its own echo is a simple doubling of measure; the whole
                      ladder of overtones that gives a single note its warmth is a stack of integer
                      ratios. Kepler, in his <em>Harmonices Mundi</em>, heard the planets singing — he
                      set each orbit&apos;s speed to a musical interval and claimed the solar system was
                      a polyphonic composition. Pythagoras had already said it two thousand years
                      earlier: the cosmos is a number, and numbers make music.
                    </p>
                    <p>
                      The queries become shorter when sound meets sand. In the nineteenth century Ernst
                      Chladni scattered powder on a metal plate and bowed it, and the powder arranged
                      itself into the geometric figures of the plate&apos;s resonances — circles, stars,
                      lattices, mandalas. A century later Hans Jenny named the study <em>cymatics</em>:
                      shape generated directly by vibration. A low note produces a simple pattern; a
                      higher note produces a more intricate one; hold the sound long enough and the
                      pattern becomes a living, drifting geometry. The leap writes itself: if vibration
                      can build a flower of sand, then what we call solid form may be nothing more than
                      vibration moving too slowly to be heard. Form is frozen frequency. Geometry is the
                      fingerprint a frequency leaves when it finally stops moving.
                    </p>
                    <p>
                      The chakra tradition maps the same ladder onto the body. Each of the seven energy
                      centers has been paired with a tone and, in the hermetic geometry schools, with
                      one of the solids: the red root with the grounded cube, the orange sacral with the
                      flowing icosahedron, the yellow solar plexus with the fiery tetrahedron, the green
                      heart with the airy octahedron, the blue throat with the resonant lattice, the
                      indigo third eye with Metatron&apos;s Cube, the violet crown with the dodecahedron
                      that images the whole. Whether you take the mapping as physiology, as philosophy,
                      or as pure poetry, its internal logic is harmonious: a scale of form running from
                      the most solid to the most rarified, exactly as a musical scale runs from the
                      deepest tone to the highest. The spectrum of light does the same thing — red to
                      violet — because light, sound, form, and feeling all obey the same architecture of
                      proportionate intervals.
                    </p>
                    <p>
                      This is why Universal Transmissions treats geometry as sound you can see. The
                      chakra loop packs that animate the tradition take the static solids and set them
                      in motion, cycling the forms through their harmonics until the geometry breathes —
                      the cube rotating into its own facets, the Flower of Life blooming at a
                      cymatic pulse. The frozen music is thawed; the sculpture spins. What the eye was
                      made to read as a still drawing becomes, in motion, the very vibration that drew
                      it.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>

            {/* Chakra / tone / form resonance grid */}
            <div className="max-w-4xl mx-auto mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {chakraResonances.map((c, i) => (
                  <SectionReveal key={c.chakra} delay={i * 0.04}>
                    <div
                      className="ut-card p-6 h-full"
                      style={{ background: "rgba(255, 255, 255, 0.02)" }}
                    >
                      <p
                        className="font-heading text-[9px] tracking-widest uppercase mb-1"
                        style={{ color: c.color, opacity: 0.9 }}
                      >
                        {c.chakra}
                      </p>
                      <p
                        className="font-mono text-[9px] tracking-widest mb-3"
                        style={{ color: "var(--ut-gold)", opacity: 0.6 }}
                      >
                        {c.tone}
                      </p>
                      <p
                        className="font-body text-xs leading-relaxed"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                      >
                        {c.form} — {c.element}
                      </p>
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
              description: "This geometric experience is still being developed and currently remains a locked coming-soon surface.",
              label: "Interactive Tool",
              comingSoon: true,
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

        {/* ── CONTINUE THE STUDY — tasteful seed links ── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(212, 168, 71, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-5xl mx-auto">
              <SectionReveal>
                <div className="text-center mb-10">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-gold)", opacity: 0.5 }}
                  >
                    [ Continue the Study ]
                  </p>
                  <h2
                    className="font-display text-2xl md:text-3xl glow-gold"
                    style={{ color: "var(--ut-gold)" }}
                  >
                    <ZalgoText text="Geometry, Held & Set in Motion" intensity="moderate" />
                  </h2>
                  <p
                    className="font-body text-base max-w-2xl mx-auto mt-4"
                    style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                  >
                    The forms on this page began as vectors in a single sacred-geometry source archive —
                    the EPS pack from which the site&apos;s own geometry layer is drawn — and they were
                    never meant to stay on the page. Below, the same skeleton was carried into print,
                    into motion, and deeper into the tradition.
                  </p>
                </div>
              </SectionReveal>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <SectionReveal>
                  <Link
                    href="/store/universal-transmissions-codex-vol1-digital"
                    className="group block ut-card p-8 h-full transition-all duration-300 hover:border-white/20"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <p
                      className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                      style={{ color: "var(--ut-gold)", opacity: 0.6 }}
                    >
                      The Codex
                    </p>
                    <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                      Universal Transmissions Codex Vol.1 — Digital Edition
                    </h3>
                    <p className="font-body text-sm leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
                      The foundational transmissions, bound. Geometry as the skeleton of the whole work,
                      collected and made portable — the tradition in readable form.
                    </p>
                    <span
                      className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                      style={{ color: "var(--ut-gold)" }}
                    >
                      $99 · Open
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                        <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    </span>
                  </Link>
                </SectionReveal>

                <SectionReveal delay={0.05}>
                  <Link
                    href="/store/chakra-4k-loop-pack"
                    className="group block ut-card p-8 h-full transition-all duration-300 hover:border-white/20"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <p
                      className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                      style={{ color: "var(--ut-gold)", opacity: 0.6 }}
                    >
                      Geometry in Motion
                    </p>
                    <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                      CHAKRA 4K — Root Loop Pack
                    </h3>
                    <p className="font-body text-sm leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
                      Sacred geometry as motion — the grounded cube and the root frequencies set
                      endlessly cycling, concentric forms breathing at a cymatic pulse.
                    </p>
                    <span
                      className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                      style={{ color: "var(--ut-gold)" }}
                    >
                      $99 · Open
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                        <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    </span>
                  </Link>
                </SectionReveal>

                <SectionReveal delay={0.1}>
                  <Link
                    href="/store/chakra-8k-loop-pack"
                    className="group block ut-card p-8 h-full transition-all duration-300 hover:border-white/20"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <p
                      className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                      style={{ color: "var(--ut-gold)", opacity: 0.6 }}
                    >
                      The Flowing Lattice
                    </p>
                    <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                      CHAKRA 8K — Flow Loop Pack
                    </h3>
                    <p className="font-body text-sm leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
                      The Flower of Life and the vesica turned into living current — geometry that
                      refuses to freeze, flowing at high resolution.
                    </p>
                    <span
                      className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                      style={{ color: "var(--ut-gold)" }}
                    >
                      $99 · Open
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                        <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    </span>
                  </Link>
                </SectionReveal>

                <SectionReveal delay={0.15}>
                  <a
                    href="https://vaultofarcana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block ut-card p-8 h-full transition-all duration-300 hover:border-white/20"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <p
                      className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                      style={{ color: "var(--ut-gold)", opacity: 0.6 }}
                    >
                      Deeper Into the Tradition
                    </p>
                    <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                      Vault of Arcana — Hermetic Path
                    </h3>
                    <p className="font-body text-sm leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
                      The hermetic archive that carries the same principles
                      &quot;as above, so below&quot; into philosophy, ritual, and the deeper reaches
                      of the tradition.
                    </p>
                    <span
                      className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                      style={{ color: "var(--ut-gold)" }}
                    >
                      External
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                        <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    </span>
                  </a>
                </SectionReveal>
              </div>
            </div>
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