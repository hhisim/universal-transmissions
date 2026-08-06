import type { Metadata } from "next";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import PinterestGrid from "@/components/ui/PinterestGrid";
import ResearchPathways from "@/components/research/ResearchPathways";

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
<PageBackground variant="symbolism" /> <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

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
                      This is why a single glyph can outlive the civilization that carved it, and why
                      an icon can still move us thousands of years after its original meaning has been
                      forgotten. The symbol does not require translation because it was never written
                      in a language. It was written in the structure of mind itself — the one structure
                      shared by every consciousness that has ever looked up at the same moon, the same
                      sun, the same turning wheel of the sky.
                    </p>
                    <p>
                      A symbol is best understood as an event rather than an object. When truly
                      attended to, it does something to the psyche: it rearranges attention, it
                      surfaces what was latent, it connects an inner pattern to an outer image. The
                      great mystical traditions agree on this — the symbol is not a signpost pointing
                      at a truth, but a lens through which the truth is momentarily made visible.
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

        {/* ── ARCHETYPES — THE GRAMMAR OF THE UNCONSCIOUS ── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(147, 51, 234, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                    style={{ color: "var(--ut-purple)", opacity: 0.5 }}
                  >
                    [ From the Collective Unconscious ]
                  </p>
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="Archetypes — The Universal Grammar of the Unconscious" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      If the unconscious has a language, its grammar is the archetype. Carl Jung,
                      who spent a lifetime mapping the interior, came to recognize that beneath the
                      personal storehouse of individual memory there lay a deeper stratum — the
                      collective unconscious — populated not by personal incidents but by universal
                      figures: the Hero who descends into darkness and returns transformed, the
                      Mother who nourishes and devours, the Trickster who subverts order, the Sage
                      who holds the key, the Shadow we will not look at directly, and the Self that
                      laboriously reconciles all of these oppositions into a gathered whole.
                    </p>
                    <p>
                      These are not characters in the usual sense. They are pattern-fields of human
                      experience, and they recur with astonishing fidelity across cultures that never
                      traded a single word with one another. An Australian elder, a Norse skald, and a
                      Mexican curandera describe the same inner terrain because they are describing
                      the same shared architecture. This is why Jung called the archetype the
                      &quot;instinct of the imagination&quot; — it is as biologically grounded as the urge to
                      breathe, yet expresses itself entirely in image and narrative.
                    </p>
                    <p>
                      The symbol is the coin in which this currency circulates. Where the archetype
                      is the underlying structure, the symbol is its manifestation in the visible
                      world — the specific image, story, or object through which the archetype is
                      momentarily grasped. It is precise, then, to say that symbolism is the currency
                      of the unconscious: the unconscious does not think in propositions, it thinks in
                      symbols, and every symbol is a local exchange of a universal pattern.
                    </p>
                    <p>
                      This is why symbol work is genuinely dangerous and genuinely transformative. A
                      symbol that reaches the archetypal level does not entertain the psyche — it
                      activates it. It calls up energies that are older than the individual and wider
                      than the ego. The alchemists understood this when they warned that the work
                      transforms the worker as much as the matter; so does the ritual tradition, in
                      which certain symbols are not merely contemplated but are treated as alive.
                    </p>
                    <p>
                      In creating composite images, Universal Transmissions layers multiple
                      archetypes into a single form — the Hero journeying through the Mother-world, the
                      Trickster dancing at the edge of the Shadow — so that a single visual frame can
                      hold a complete mythic territory. The image becomes an archetypal constellation:
                      a sky-chart of inner figures arranged exactly as the psyche wishes them to be
                      seen, in the moment of their highest coherence.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── SIGILS — THE ACT OF CREATION ───────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(147, 51, 234, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                    style={{ color: "var(--ut-purple)", opacity: 0.5 }}
                  >
                    [ Transmission by Design ]
                  </p>
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="Sigils — The Act of Symbol-Creation as Active Transmission" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      A sigil is a symbol that was not discovered but made — and its making is the
                      transmission. Unlike the great inherited archetypes, a sigil begins as personal
                      material: a desire, an intention, a name. In the classic ritual method, the
                      letters of a stated intention are reduced, compressed, and rearranged into an
                      abstract monogram so degraded that the original words finally vanish into pure
                      geometry. What remains is a charge frozen in form.
                    </p>
                    <p>
                      The key insight is that this act of reduction is itself the technology. By
                      stripping language down to shape, the intention is removed from the purely verbal
                      register of the mind — the anxious, self-critical, reasoning register — and
                      deposited into the imagistic register where the unconscious actually operates.
                      The sigil is a message smuggled past the censor of the conscious mind and handed
                      directly to the deep self, which alone is capable of acting on it.
                    </p>
                    <p>
                      This is why sigils are said to be most potent when they are, in a sense,
                      forgotten. Once the sigil is charged and released, the conscious mind is asked to
                      let it go, precisely because that mind would otherwise interfere — second-guess,
                      censor, dilute. The unconscious does the work quietly, in its own symbolic idiom.
                      The sigil is thus an instance of communication by trust: the maker sends a
                      message across a divide, and then refrains from checking whether it arrived.
                    </p>
                    <p>
                      Universal Transmissions treats every artwork as exactly this kind of operation —
                      a sigil at cultural scale. Each piece begins as an intention or an inner state,
                      is reduced through a disciplined visual language, and is released into the world
                      as a charged form. The viewer does not need to know what was encoded to be
                      affected by it. That is the whole point: a sigil does its work precisely when the
                      conscious mind does not intercept it.
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

        {/* ── DOCTRINE OF CORRESPONDENCES ───────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(147, 51, 234, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                    style={{ color: "var(--ut-purple)", opacity: 0.5 }}
                  >
                    [ As Above, So Below ]
                  </p>
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Doctrine of Correspondences" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      The doctrine of correspondences is the oldest and most ambitious claim in the
                      esoteric tradition: that every level of reality is a reflection of every other.
                      The Smaragdine Tablet — a text so terse it has generated millennia of commentary —
                      states it in a single clause: &quot;That which is above is like that which is below.&quot;
                      This is not a metaphor but a description of architecture. The universe is
                      understood as a chain of nested mirrors, each plane — cosmic, planetary,
                      elemental, alchemical, astrological, geometric, bodily, psychic — repeating the
                      same form at a different scale.
                    </p>
                    <p>
                      Because of this, a correspondence system reads as a single interlocking lattice
                      rather than a collection of separate tables. The planet Mars corresponds to the
                      metal iron, to the element fire, to the color red, to the astrological sign of
                      action and aggression, to the geometric principle of force, to the bodily organ
                      of savage impulse. None of these is a separate fact. They are the same fact
                      manifesting through seven lenses. To know one node is, cryptically, to be on the
                      way to knowing them all — because each carries the fingerprint of the whole.
                    </p>
                    <p>
                      The four traditional elements form their own sub-lattice: Earth as the fixed, the
                      body, the number whose density anchors form; Water as the flowing, the emotion,
                      the receptive vessel; Air as the thinking, the swift, the mediating breath; Fire as
                      the transformative, the will, the consuming and illuminating principle. These are
                      not substances but modes of being, and every symbol can be read for which mode it
                      animates. Alchemy then superimposes a process-grammar: nigredo (blackening,
                      dissolution), albedo (whitening, purification), citrinitas (yellowing, awakening),
                      rubedo (reddening, completion). A single symbol can be indexed against both grids
                      at once — its elemental allegiance and its station on the Great Work.
                    </p>
                    <p>
                      Geometry supplies the binding syntax. The point that expands into the circle, the
                      circle that contains the triangle, the triangle that resolves into the square, the
                      square that turns the spiral — each form is a statement about the relationship
                      between unity and multiplicity. The circle is infinity made conditionally visible;
                      the triangle is the trinity of thesis, antithesis, synthesis; the cross is the
                      intersection of the vertical and horizontal — spirit and matter meeting at a
                      point. When these forms are stacked, as in the great sigils and planetary seals,
                      the symbol becomes a complete sentence in the language of the cosmos, readable in
                      a single glance.
                    </p>
                    <p>
                      It is the interlock — not any single correspondence — that lends the system its
                      strange power and its seductive coherence. Astrology says the position of Saturn
                      mirrors an inner constriction of the will; alchemy says lead is the metal of that
                      same inertia awaiting transmutation; geometry says the cube is its form. Three
                      traditions, one shape, one teaching. This redundancy across independent systems
                      is precisely what makes correspondence-thinking feel less like superstition and
                      more like the detection of a genuinely recurring pattern — as if the universe
                      could not stop writing the same message in every available script.
                    </p>
                    <p>
                      The practical consequence for the maker of symbols is enormous: if the
                      correspondences hold, then an image need not be explained to be understood. The
                      artist choosing a red square, a Saturnian magenta, a fire-triangle, and a cube is
                      not making four separate aesthetic decisions. They are reaching for the same node
                      through four channels, and aligning them produces resonance — the sense, felt
                      rather than reasoned, that the image is somehow true and somehow consistent,
                      however abstract it appears.
                    </p>
                    <p>
                      This is the doctrine the Correspondence Codex Companion is built to serve — a
                      physical index of exactly these interlocking chains, assembled so the corresponder
                      can move fluently between planetary, elemental, alchemical, astrological, and
                      geometric registers without losing the thread.
                    </p>
                  </div>

                  {/* Paired seed — Companion card */}
                  <div
                    className="mt-8 ut-card p-8"
                    style={{
                      background: "linear-gradient(135deg, rgba(147, 51, 234, 0.08) 0%, rgba(10, 9, 14, 0.8) 100%)",
                    }}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                      <div className="flex-1">
                        <p
                          className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                          style={{ color: "var(--ut-purple)", opacity: 0.6 }}
                        >
                          [ A Working Index ]
                        </p>
                        <h3
                          className="font-display text-lg mb-2"
                          style={{ color: "var(--ut-white)" }}
                        >
                          Correspondence Codex Companion
                        </h3>
                        <p
                          className="font-body text-sm leading-relaxed mb-2"
                          style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
                        >
                          The physical index to this entire lattice — planetary, elemental,
                          alchemical, astrological, and geometric chains bound into one navigable
                          reference. $7.77.
                        </p>
                        <span
                          className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                          style={{ color: "var(--ut-purple)" }}
                        >
                          Open
                          <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                            <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                          </svg>
                        </span>
                      </div>
                      <a
                        href="/store/correspondence-codex-companion"
                        className="btn-primary flex-shrink-0"
                        style={{ borderColor: "rgba(147, 51, 234, 0.4)", color: "var(--ut-purple)" }}
                      >
                        Get the Companion
                      </a>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── THE SYMBOL AS COMPRESSION ─────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(147, 51, 234, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                    style={{ color: "var(--ut-purple)", opacity: 0.5 }}
                  >
                    [ Densest Meaning ]
                  </p>
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Symbol as Compression" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Think of the symbol as the universe&apos;s most efficient file format. A rune, a
                      seal, a mandala, a single standing stone — each is a volume of meaning compressed
                      into a glyph. The reason these forms endure is not that they were simple but that
                      they were maximally dense: an entire mythology, a complete cosmology, an ethics
                      and a psychology, all folded into a shape that a hand can trace in a single
                      gesture.
                    </p>
                    <p>
                      Consider what a swastika held for the cultures that sanctified it — before its
                      hijacking — or what the infinity symbol holds in a single ribbon, or what the
                      Seal of Solomon / Star of David holds in two interlocked triangles: the above and
                      the below, spirit and matter, fire and water, the reconciliation of opposites
                      stated in two lines. This is compression as the esotericists actually practiced
                      it. The symbol does not abbreviate a story; it concentrates a whole mode of
                      thought into a trigger that, when unfolded by a prepared mind, releases the full
                      meaning again — the way a seed carries the entire tree.
                    </p>
                    <p>
                      The consequence is that a symbol is more than information — it is a program. It
                      carries within it the instructions for its own unrolling. A true symbol is
                      generative: the more it is contemplated, the more it yields, because each
                      contemplation re-runs the entire compressed logic from a slightly different
                      angle. This is why the deep traditions insist on returning to the same symbols
                      for a lifetime rather than collecting new ones. A symbol that can be exhausted
                      was never a symbol — it was a sign, a fixed reference. A genuine symbol is
                      inexhaustible, because its compression contains more than any single unpacking
                      can retrieve.
                    </p>
                    <p>
                      This is also what distinguishes the esoteric from the merely decorative. A
                      decoration is worn outward, all surface. A symbol with true depth cannot be
                      fully read from the outside; it requires something of the reader — a willingness
                      to be worked upon in turn. The symbol compresses meaning, but it also decompresses
                      the one who gazes. Both operations run at once, and both are required for the
                      exchange to be complete.
                    </p>
                    <p>
                      The artwork of Universal Transmissions is built around this economics of meaning:
                      forms are stripped to their essential geometry precisely so that maximum mythic
                      payload can be carried with minimum visual noise. A piece must be legible at a
                      glance and inexhaustible at length — a diagram and a runemark simultaneously,
                      holding an entire mythological territory in a single glyph.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── THE SITE AS SYMBOLIC INDEX ────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(147, 51, 234, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                    style={{ color: "var(--ut-purple)", opacity: 0.5 }}
                  >
                    [ The Living Index ]
                  </p>
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="See With Symbols — The Site as a Working Index" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Everything on this site is arranged as a symbolic system in its own right — and
                      that arrangement is itself the teaching. The mandalas, the chakra wheels, the
                      planet-and-correspondence-laden imagery, the very color language of these pages
                      (purple for the crown and the higher registers, gold for the transmuted and the
                      sovereign) — all of it functions as a working symbolic index. You are not reading
                      about symbols here; you are standing inside one, and every scroll is a traversal.
                    </p>
                    <p>
                      The Correspondence Codex on this site is the lighter, faster surface of that
                      index — the route designed for quick exploration. It lets you begin not from a
                      theory but from a word, a color, a planet, an archetype, and follow its threads
                      outward into the lattice. It is the index you consult when you want to move,
                      rather than merely contemplate. The deeper, broader mapping lives in the
                      desktop-oriented Correspondence Continuum, and the interpretive engine — the
                      surface that answers a question posed directly to the symbolic system — waits in
                      the Oracle.
                    </p>
                    <p>
                      Beneath and beyond this site lies the deeper tradition at Vault of Arcana, where
                      the esoteric systems are curated as digital oracles: Tarot, Kabbalah, Tantra,
                      Sufism, Chaos Magick, Dreamwalker, Entheogen, and Taoism. Each tradition is a
                      different dialect of the same universal grammar described on this page — a
                      distinct way of compressing, arranging, and transmitting the archetypal content.
                      Tarot compresses the heroic and life-stage arc into seventy-eight layered glyphs;
                      Kabbalah compresses it into the branching structure of the Tree; Tantra into the
                      ascending play of energies; Chaos Magick into the pragmatic, self-authorized
                      construction of fresh sigils; the Entheogen wave into the dissolution and
                      reintegration of the boundary self; Taoism into the yielding, wayless flow of the
                      Tao. Read side by side, they are not rival systems but dialects of one language —
                      the very language this page exists to name.
                    </p>
                    <p>
                      The point of such an index is that it eventually dissolves itself. You do not need
                      the map once you have walked the terrain often enough that the correspondences
                      become second nature — once you begin to see, spontaneously, the Mars in a piece
                      of iron, the compression in a simple glyph, the above shining through the below.
                      At that point the site is not the destination; it is the doorway. The symbolism
                      was never the point. What the symbolism points to is.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        <ResearchPathways
          eyebrow="[ From Symbol into Correspondence ]"
          title="Move from Symbolism into the Engine"
          description="This page names the symbolic principles. The live site lets you traverse them through correspondence tools, divination, and the artwork archive itself."
          accent="var(--ut-purple)"
          links={[
            {
              href: "/experience/correspondence-codex",
              title: "Correspondence Codex",
              description: "Traverse symbols, archetypes, frequencies, and associations through the lighter symbolic index.",
              label: "Index Surface",
            },
            {
              href: "/experience/correspondence-continuum",
              title: "Correspondence Continuum",
              description: "Use the deeper desktop-oriented correspondence surface for broader symbolic mapping.",
              label: "Deep Mapping",
            },
            {
              href: "/oracle",
              title: "The Oracle",
              description: "Ask the symbolic system to interpret a question, name, pattern, or transmission directly.",
              label: "Oracle Surface",
            },
            {
              href: "/gallery/prismatic",
              title: "Prismatic Gallery",
              description: "See how symbolic correspondences resolve visually inside finished image systems.",
              label: "Related Archive",
            },
          ]}
        />

        {/* ── CONTINUE THE STUDY ────────────────────── */}
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
                  [ Continue the Study ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text="From Symbol to Working System" intensity="subtle" />
                </h2>
                <p
                  className="font-body text-base max-w-3xl mx-auto mt-4"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
                >
                  This page is the naming of the language. These are the instruments by which it is
                  actually spoken — the index, the companion volume, and the deeper tradition that
                  curates the dialects.
                </p>
              </div>
            </SectionReveal>

            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <SectionReveal delay={0}>
                  <a
                    href="/experience/correspondence-codex"
                    className="group block ut-card p-8 h-full transition-all duration-300 hover:border-white/20"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <p
                      className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                      style={{ color: "var(--ut-purple)", opacity: 0.6 }}
                    >
                      [ Explore the Index ]
                    </p>
                    <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                      Correspondence Codex
                    </h3>
                    <p
                      className="font-body text-sm leading-relaxed mb-6"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
                    >
                      The lighter symbolic index on this site — begin from any word, planet, color, or
                      archetype and follow its threads through the lattice.
                    </p>
                    <span
                      className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                      style={{ color: "var(--ut-purple)" }}
                    >
                      Open
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                        <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    </span>
                  </a>
                </SectionReveal>

                <SectionReveal delay={0.05}>
                  <a
                    href="/store/correspondence-codex-companion"
                    className="group block ut-card p-8 h-full transition-all duration-300 hover:border-white/20"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(147, 51, 234, 0.08) 0%, rgba(10, 9, 14, 0.6) 100%)",
                    }}
                  >
                    <p
                      className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                      style={{ color: "var(--ut-purple)", opacity: 0.6 }}
                    >
                      [ Own the Index ]
                    </p>
                    <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                      Correspondence Codex Companion — $7.77
                    </h3>
                    <p
                      className="font-body text-sm leading-relaxed mb-6"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
                    >
                      The physical reference for the doctrine of correspondences — planetary,
                      elemental, alchemical, astrological, and geometric chains bound into one
                      navigable volume.
                    </p>
                    <span
                      className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                      style={{ color: "var(--ut-purple)" }}
                    >
                      Open
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                        <path d="M0 4H14M14 4L11 1M14 4L11 7" stroke="currentColor" strokeWidth="1" />
                      </svg>
                    </span>
                  </a>
                </SectionReveal>

                <SectionReveal delay={0.1}>
                  <a
                    href="https://vaultofarcana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block ut-card p-8 h-full transition-all duration-300 hover:border-white/20"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <p
                      className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3"
                      style={{ color: "var(--ut-purple)", opacity: 0.6 }}
                    >
                      [ The Deeper Tradition ]
                    </p>
                    <h3 className="font-display text-lg mb-3" style={{ color: "var(--ut-white)" }}>
                      Vault of Arcana
                    </h3>
                    <p
                      className="font-body text-sm leading-relaxed mb-6"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
                    >
                      The curated digital oracles — Tarot, Kabbalah, Tantra, Sufism, Chaos Magick,
                      Dreamwalker, Entheogen, and Taoism — each a dialect of the same universal grammar.
                    </p>
                    <span
                      className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase"
                      style={{ color: "var(--ut-purple)" }}
                    >
                      Open
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                  </a>
                </SectionReveal>
              </div>
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
                style={{ color: "var(--ut-purple)", opacity: 0.5 }}
              >
                [ Inspired Esoterica ]
              </p>
              <h2
                className="font-display text-2xl md:text-3xl"
                style={{ color: "var(--ut-purple)" }}
              >
                <ZalgoText text="Visual Reference Archive" intensity="moderate" />
              </h2>
            </div>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <PinterestGrid
              boardSlug="hakanhisim/inspired-esoterica"
              title="Visual Reference Archive"
              subtitle="Esoterica & Symbolism"
            />
          </SectionReveal>
        </div>
      </section>
</>
  );
}