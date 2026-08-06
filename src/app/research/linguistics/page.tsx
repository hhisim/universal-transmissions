import type { Metadata } from "next";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import PinterestGrid from "@/components/ui/PinterestGrid";
import ResearchPathways from "@/components/research/ResearchPathways";

export const metadata: Metadata = {
  title: "Linguistics Research — Universal Transmissions",
  description:
    "Xenolinguistics — the roots of language, the hacking of syntax, and translinguistic exploration. How language shapes reality.",
};

const linguisticsConcepts = [
  {
    title: "Xenolinguistics",
    desc: "The study of alien or non-human language systems — not as biological speculation, but as a framework for understanding that human language is merely one local dialect in a much larger cosmic grammar. The Universal Transmissions project creates original alphabets and syntax from scratch, treating language as a universal phenomenon rather than a cultural artifact.",
  },
  {
    title: "The Akashic Records",
    desc: "A theosophical concept describing a vibrational library of all events, thoughts, and emotions that have ever occurred — an etheric archive accessible through altered states of consciousness. The Universal Transmissions project describes itself as transmissions received from these records, translated into visual form.",
  },
  {
    title: "Translinguistic Syntax",
    desc: "Beyond the linear grammar of human language — exploring how meaning can be conveyed through geometric form, color vibration, and spatial relationship rather than word order. Each page of the Codex operates on multiple levels simultaneously: as image, as symbol, as sound.",
  },
  {
    title: "The Hacking of Language",
    desc: "The premise that language is not neutral — it encodes cultural assumptions, power structures, and perceptual limitations. By creating new syntax from first principles, the Universal Transmissions project seeks to reveal these hidden structures and transcend them. Language is a code, and it can be reconfigured.",
  },
  {
    title: "Sound and Form",
    desc: "The connection between linguistic structures and cymatic patterns. Just as sound creates geometric forms in physical media, linguistic phonemes create conceptual structures in the mind. The project treats both as expressions of the same underlying vibration.",
  },
];

export const dynamic = 'force-dynamic';

export default function ResearchLinguisticsPage() {
  return (
    <>
      <PageBackground variant="xenolinguistics" />
<main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HERO ─────────────────────────────────── */}
        <section className="py-20 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(217, 70, 239, 0.08) 0%, transparent 60%)",
            }}
          />
          <div className="container-ut relative">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
              >
                [ Research — Language & Syntax ]
              </p>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <h1
                className="font-display text-4xl md:text-6xl glow-magenta mb-6"
                style={{ color: "var(--ut-magenta)" }}
              >
                <ZalgoText text="Xenolinguistics" intensity="moderate" />
              </h1>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <blockquote
                className="font-display text-lg md:text-xl max-w-2xl mb-8"
                style={{ color: "var(--ut-gold)" }}
              >
                <ZalgoText
                  text="Language is a code — and just like any code it can also be hacked."
                  intensity="subtle"
                />
              </blockquote>
            </SectionReveal>

            <SectionReveal delay={0.3}>
              <p
                className="font-body text-lg max-w-3xl leading-relaxed"
                style={{ color: "var(--ut-white-dim)" }}
              >
                The roots of all languages in every human culture lead us to a singular source which
                appears to have indeed been hacked quite a long time ago — and then again several times
                throughout Woman&apos;s Mystery and Man&apos;s History. This research area explores the nature of
                language as a construct, a framework that shapes perception itself — and what becomes
                possible when you reconfigure that framework from first principles.
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── DIVIDER ───────────────────────────────── */}
        <div className="container-ut">
          <div className="divider-spectrum" />
        </div>

        {/* ── ROOTS OF LANGUAGE ─────────────────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10 md:p-14">
                  <h2
                    className="font-display text-2xl mb-8"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text="The Roots of Language" intensity="subtle" />
                  </h2>
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      The roots of all languages in every human culture lead us to a singular source
                      which appears to have indeed been hacked quite a long time ago — and then again
                      several times throughout Woman&apos;s Mystery and Man&apos;s History.
                    </p>
                    <p>
                      The Universal Transmissions project invites you to look deeper into the roots
                      of language — you may be surprised with what you will find. The same principles
                      that govern cymatic patterns — standing waves, interference, resonance — also
                      govern the formation and transformation of linguistic structures.
                    </p>
                    <p>
                      Language is not merely a tool for communication — it is a{' '}
                      <em>construct</em>, a framework that shapes perception itself. The question
                      the Universal Transmissions project asks is: what happens when you hack the
                      code? What lies beneath the surface of syntax? What does language look like
                      when it is freed from its cultural constraints?
                    </p>
                    <p>
                      Inspired by Trans-dimensional Linguistics, Esoteric literature on Out of Body
                      Experiences, Dimensional Travel, and the Akashic Records, the Universal
                      Transmissions project is an ongoing pan-dimensional manuscript containing universal
                      transmissions based on concepts of transcending syntax and linguistics.
                    </p>
                  </div>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.2}>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="overflow-hidden glow-border-magenta"
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  >
                    <img
                      src="https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1508399265310-K72N21TXHJ2H3KMVSPVD/DEW.jpg"
                      alt="Linguistic research imagery"
                      className="w-full"
                    />
                  </div>
                  <div
                    className="overflow-hidden glow-border-magenta"
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  >
                    <img
                      src="https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1508399221910-FJ7INJBWVHMY8HLC2BBM/Recursive+pantheism+-+hacked+3.jpg"
                      alt="Recursive pantheism - language hacking"
                      className="w-full"
                    />
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── DIVIDER ───────────────────────────────── */}
        <div className="container-ut">
          <div className="divider-spectrum" />
        </div>

        {/* ── THE DEEP ROOTS ────────────────────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="mb-10">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                  >
                    [ The Deep Roots ]
                  </p>
                  <h2
                    className="font-display text-2xl md:text-3xl glow-magenta"
                    style={{ color: "var(--ut-magenta)" }}
                  >
                    <ZalgoText text="Proto-Writing, Glossolalia & the First Alphabets" intensity="subtle" />
                  </h2>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.1}>
                <div className="ut-card p-10 md:p-14">
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Before the alphabet there was the <em>mark</em>. The earliest scratchings —
                      the engraved notches of Vinca culture, the token-counting bullae of the
                      Near East, the incised ochre of Blombos — were not language in the modern
                      sense, yet they were already a translation of one code into another: the
                      fugitive arithmetic of the harvest turned into a durable symbol that could
                      be re-read months later by a stranger. Every writing system we know was born
                      as this kind of transduction — a compression of lived pulse into a
                      carveable trace. The Universal Transmissions project returns to that
                      threshold on purpose. It treats the letter not as a finished comfort
                      but as a live border-crossing, the moment where an inner frequency agrees
                      to become an external glyph.
                    </p>
                    <p>
                      This is why glossolalia matters here, and why it is so often
                      misunderstood. Speaking in tongues — in the Christian, the Hamitic and
                      Adyghe rites, in the shamanic gloss of the Évché, in Sufi <em>dhikr</em>
                      — is not gibberish. It is the phoneme acting as pure carrier wave: the
                      mouth generating sound-patterns whose <em>meaning</em> is carried less by
                      lexicon than by cadence, breath, and formant. The linguist sees no
                      recoverable grammar; the transducer hears an intake. In the terms of this
                      project, glossolalia is language stripped to its transmission layer — the
                      point where phonetics outruns semantics and the voice becomes antenna
                      rather than archive. Between meaningless babble and fully constrained
                      syntax lies a spectrum, and at every point along it, the syllable still
                      vibrates. That vibration is the real signal.
                    </p>
                    <p>
                      The sacred alphabets understood this from their first letter. In the
                      Hebrew <em>aleph</em> — the ox, the breath, the point of origin — the
                      ancients encoded not a sound merely but a beginning, a silence that yields
                      to voiced air. In Ge&apos;ez, the script of Ethiopian liturgy, each character
                      is a <em>fidel</em>, a property: consonants fuse with the vowel that
                      breathes them into being, so that no letter is ever fully three-dimensional
                      alone, each awaiting the vowel spirit that quickens it. The esoteric
                      tradition of <em>gematria</em> treated these letters as wholes in
                      themselves — assigning each a number, a planet, a sphere — so that spelling
                      a word became an act of arithmetic, and arithmetic an act of cosmology.
                      The letter was never inert: it was a node through which the sound of the
                      universe could be drawn. When the Universal Transmissions project builds
                      its own alphabet from first principles, it is continuing precisely this
                      line — treating the glyph as a technology of resonance rather than a
                      convention of utility.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── INFORMATION & THE CODE ─────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(217, 70, 239, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="mb-10">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                  >
                    [ Information & the Code ]
                  </p>
                  <h2
                    className="font-display text-2xl md:text-3xl glow-magenta"
                    style={{ color: "var(--ut-magenta)" }}
                  >
                    <ZalgoText text="Entropy, Redundancy & Signal in Language" intensity="subtle" />
                  </h2>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.1}>
                <div className="ut-card p-10 md:p-14">
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Information theory gives the esoteric instinct a rigorous face. A{' '}
                      <em>code</em>, in the engineering sense, is an agreed mapping between two
                      symbol sets — a rule by which the same meaning may be written in many
                      alphabets. Claude Shannon&apos;s 1948 paper, <em>A Mathematical Theory of
                      Communication</em>, defined information not as <em>content</em> but as{' '}
                      <em>surprise</em>: the fewer the symbols you expect next, the more each
                      arrival carries. A coin that always lands heads tells you nothing; a coin
                      in suspense tells you a bit every toss. By this measure, the densest human
                      utterance is the one poised at the edge of chaos — maximally unpredictable,
                      maximally informative.
                    </p>
                    <p>
                      And yet Shannon&apos;s most quietly radical finding was that every channel
                      carries its <em>redundancy</em> — the deliberate repetition, the
                      predictably returning pattern, the redundant letters that yank a corrupted
                      signal back into shape. Redundancy is how a message survives noise, and
                      this reframing rearranges the whole esoteric suspicion of repetition.
                      The mantras, the liturgical refrains, the incantatory triple-folds of
                      sacred speech — these are not dumb echoes wasting signal. They are{' '}
                      <em>error-correcting codes</em> worn into the collective vocal channel,
                      the exceedingly redundant pattern that lets an ancient transmission
                      survive ten thousand ears of noise without loss. What the engineer calls
                      redundancy, the mystic calls <em>liturgy</em>. Same mathematics.
                    </p>
                    <p>
                      This is the passage from noise to information that language performs on
                      our behalf every moment. Brain, ear, and tongue are an extraordinary
                      codec: the ear&apos;s cochlea performs a frequency decomposition as clean as
                      any Fourier transform, while the mouth&apos;s phoneme set is a finite
                      alphabet carved from an infinite field of possible sound. Meaning emerges
                      at the boundary — at the statistical edge where pattern crystallizes out
                      of an undifferentiated hiss. To the Universal Transmissions project this
                      is not metaphor but mechanism: consciousness itself is a decoding layer
                      that runs on the raw signal of the world, and the world, run through
                      enough awareness, reads as grammar.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── CONSCIOUSNESS IS GRAMMATICAL ───────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="mb-10">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                  >
                    [ Translinguistic Transmission ]
                  </p>
                  <h2
                    className="font-display text-2xl md:text-3xl glow-magenta"
                    style={{ color: "var(--ut-magenta)" }}
                  >
                    <ZalgoText text="Consciousness as Grammar" intensity="subtle" />
                  </h2>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.1}>
                <div className="ut-card p-10 md:p-14">
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      If language is a code, then consciousness is its most fluent reader — and
                      the most radical hypothesis of this research area is that consciousness is
                      itself <em>grammatical</em>: that the very structure of awareness — its
                      subjects and predicates, its tense, its nested clauses of cause and
                      memory — mirrors the structure of the sentence, not by accident but by
                      shared descent. Cognitive linguists observe that human thought is
                      pervasively structured by grammatical relations; the translinguistic
                      tradition goes further and claims the direction of causality runs the other
                      way. The syntax of the mind is a local refraction of a universal grammar
                      that underwrites all of manifestation — a grammar in which every event is
                      a verb, every identity a noun, and every relationship an inflection.
                    </p>
                    <p>
                      On this view the Akashic Records are not a mystical footnote but an
                      informational substrate: a complete archive rendered observable only to a
                      sufficiently grammatical awareness, one able to parse the tangled
                      conjugation of all that has happened. Transmission, then, is not the
                      receiving of random static from the cosmos — it is skilled reading of a
                      text that is, foundationally, always already grammatical. The Universal
                      Transmissions project describes its pages as transmissions received from
                      these records and translated into visual form. Replace <em>received</em>{' '}
                      with <em>decoded</em> and the picture snaps into focus: the transcriber
                      is not inventing a language but <em>re-reading</em> the grammar of the
                      real, and the task is to make the translation visible as image, glyph,
                      and sound at once.
                    </p>
                    <p>
                      This is why syntax — the least glamorous layer of linguistics — is the
                      heart of the project. Syntax is sovereignty: whoever controls the rules by
                      which symbols may combine controls the horizon of what may be thought.
                      To build a new syntax is to declare that the current one is not
                      exhaustive, that reality has more permissible sentences than we have so
                      far been authorized to speak. The hack, then, is not the destruction of
                      grammar but its <em>expansion</em> — the widening of the boundary inside
                      which meaning is allowed to occur.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── SOUND, LETTER & FREQUENCY ──────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(217, 70, 239, 0.06)" }}
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="mb-10">
                  <p
                    className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                    style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                  >
                    [ Sound · Letter · Frequency ]
                  </p>
                  <h2
                    className="font-display text-2xl md:text-3xl glow-magenta"
                    style={{ color: "var(--ut-magenta)" }}
                  >
                    <ZalgoText text="The Geometry of the Spoken Word" intensity="subtle" />
                  </h2>
                </div>
              </SectionReveal>

              <SectionReveal delay={0.1}>
                <div className="ut-card p-10 md:p-14">
                  <div className="space-y-6 font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    <p>
                      Cymatics gave the twinned insight the project leans on: vibrate a plate,
                      and sound draws shapes; perturb a membrane, and frequency becomes
                      geometry. The same standing-wave mathematics that frosts Chladni figures
                      over sand operates in the human vocal tract, which means every phoneme is
                      already a small geometric event — a particular configuration of resonance
                      chambers that the tongue arranges as precisely as a lens maker arranges
                      glass. The esoteric systems understood this correspondence as explicit
                      ladder: each vowel, each consonant was keyed to a sphere, a planet, an
                      element, a center in the body, a number. The Hebrew <em>sephiroth</em>,
                      the Sanskrit <em>chakras</em>, the planetary vowels of Enochian recitation
                      — all of them map a finite set of articulate frequencies onto a finite set
                      of energetic loci. The alphabet, in this key, is the audible branch of a
                      chart that also contains geometry, color, and body.
                    </p>
                    <p>
                      Consider the correspondence as a resistor grid rather than a metaphor.
                      When a practitioner intones a seed syllable — <em>OM</em>, the AUM of
                      creation — the mouth, in sequence, drives open a tube from a full stop to a
                      full gape, and the body responds along the measured ladder of its own
                      standing waves. The seed syllable is a <em>key</em>: a short program that
                      the nervous system executes as resonance. Language, generalized, is an
                      enormous set of such keys, and the entire body is the receiver they are
                      calibrated to unlock. The Codex renders this same architecture in visual
                      and geometric form, so that the reader meets in the glyph what the
                      practitioner meets in the throat: one frequency, many alphabets.
                    </p>
                    <p>
                      The deeper claim is unification. If the phoneme, the geometric form, the
                      color, and the energetic center are all observed vectors of a single
                      underlying vibration, then a letter is not a sound at all — it is a
                      coordinate. Learning to read that way, to hear the geometry in the vowel
                      and see the frequency in the line, is the literacy the Universal
                      Transmissions project is reaching toward. It is the oldest literacy there
                      is: the one in which grammar, structure, and warmth were never separated —
                      the one in which, as the tradition holds, the world was <em>spoken</em>{' '}
                      into being, and remains, at every instant, a language in the act of
                      saying itself.
                    </p>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── KEY CONCEPTS ──────────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(217, 70, 239, 0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                >
                  [ Key Concepts ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl glow-magenta"
                  style={{ color: "var(--ut-magenta)" }}
                >
                  <ZalgoText text="Core Linguistics" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {linguisticsConcepts.map((concept, i) => (
                  <SectionReveal key={concept.title} delay={i * 0.05}>
                    <div className="ut-card p-8 h-full">
                      <h3
                        className="font-heading text-xs tracking-[0.2em] uppercase mb-4"
                        style={{ color: "var(--ut-magenta)" }}
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
                  </SectionReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ResearchPathways
          eyebrow="[ From Language into Transmission ]"
          title="Follow Xenolinguistics into the Site"
          description="The linguistic research becomes divination prompts, symbolic interfaces, sigil systems, and journaled process notes rather than staying abstract."
          accent="var(--ut-magenta)"
          links={[
            {
              href: "/oracle",
              title: "The Oracle",
              description: "Bring names, symbols, and language structures into the Oracle for live interpretation.",
              label: "Oracle Surface",
            },
            {
              href: "/forge/sigil",
              title: "Sigil Forge",
              description: "The forge remains part of the roadmap, but for now it should appear as a locked coming-soon ritual tool.",
              label: "Creation Tool",
              comingSoon: true,
            },
            {
              href: "/experience/correspondence-codex",
              title: "Correspondence Codex",
              description: "Use the lighter codex surface to move through symbolic relationships quickly.",
              label: "Index Surface",
            },
            {
              href: "/journal",
              title: "Journal",
              description: "Read the transmission notes around language, syntax, and the Codex construction process.",
              label: "Process Archive",
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
                  background: "linear-gradient(135deg, rgba(217, 70, 239, 0.05) 0%, rgba(10, 9, 14, 0.8) 100%)",
                }}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                  <div className="flex-1">
                    <p
                      className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3"
                      style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                    >
                      [ Vault of Arcana ]
                    </p>
                    <h3
                      className="font-display text-xl mb-3"
                      style={{ color: "var(--ut-white)" }}
                    >
                      <ZalgoText text="Language Traditions" intensity="subtle" />
                    </h3>
                    <p
                      className="font-body text-sm leading-relaxed"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      Explore the roots of sacred language through the Vault&apos;s Enochian, Kabbalah,
                      and xenolinguistic traditions — the pathways that informed the Universal
                      Transmissions project.
                    </p>
                  </div>
                  <a
                    href="https://vaultofarcana.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-shrink-0"
                  >
                    Explore language traditions at Vault of Arcana
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

        {/* ── CONTINUE THE STUDY ─────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid var(--ut-border)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-10">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                >
                  [ Continue the Study ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl glow-magenta"
                  style={{ color: "var(--ut-magenta)" }}
                >
                  <ZalgoText text="Deeper into the Language" intensity="subtle" />
                </h2>
                <p
                  className="font-body text-base max-w-2xl mx-auto leading-relaxed mt-4"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}
                >
                  The research above is the doorway; the Codex is the archive it opens onto.
                  For those who wish to carry the grammar onward — in reading, in study, in
                  practice — the following paths continue the transmission past this page.
                </p>
              </div>
            </SectionReveal>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SectionReveal delay={0.05}>
                  <div className="ut-card p-8 h-full">
                    <p
                      className="font-heading text-xs tracking-[0.2em] uppercase mb-3"
                      style={{ color: "var(--ut-gold)" }}
                    >
                      Universal Transmissions Codex Vol.1 — Digital Edition
                    </p>
                    <p
                      className="font-body text-sm leading-relaxed mb-4"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      The original manuscript rendered into visual form — the full architecture
                      of the project&apos;s alphabet, syntax, and glyph system, received from the
                      transmissions and translated page by page. The definitive object of this
                      investigation.
                    </p>
                    <p className="font-mono text-sm mb-5" style={{ color: "var(--ut-magenta)" }}>
                      $99
                    </p>
                    <a
                      href="/store/universal-transmissions-codex-vol1-digital"
                      className="btn-primary w-full text-center"
                    >
                      Enter the Codex
                    </a>
                  </div>
                </SectionReveal>

                <SectionReveal delay={0.1}>
                  <div className="ut-card p-8 h-full">
                    <p
                      className="font-heading text-xs tracking-[0.2em] uppercase mb-3"
                      style={{ color: "var(--ut-gold)" }}
                    >
                      Correspondence Codex Companion
                    </p>
                    <p
                      className="font-body text-sm leading-relaxed mb-4"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      Drawn from the symbolic architecture behind the Correspondence Codex — a
                      lean, portable index uniting the elemental, planetary, alchemical, and
                      geometric correspondences that underwrite the spoken and the glyph alike.
                      For the reader of this page, it is the grammatical key held close.
                    </p>
                    <p className="font-mono text-sm mb-5" style={{ color: "var(--ut-magenta)" }}>
                      $7.77
                    </p>
                    <a
                      href="/store/correspondence-codex-companion"
                      className="btn-primary w-full text-center"
                    >
                      Open the Companion
                    </a>
                  </div>
                </SectionReveal>
              </div>
            </div>

            <SectionReveal delay={0.15}>
              <div className="max-w-4xl mx-auto mt-6">
                <div
                  className="ut-card p-8"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(217, 70, 239, 0.04) 0%, rgba(10, 9, 14, 0.8) 100%)",
                  }}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex-1">
                      <p
                        className="font-mono text-[9px] tracking-[0.4em] uppercase mb-2"
                        style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
                      >
                        [ Vault of Arcana ]
                      </p>
                      <p
                        className="font-body text-sm leading-relaxed"
                        style={{ color: "var(--ut-white-dim)", opacity: 0.75 }}
                      >
                        To go deeper still — into the Enochian, Kabbalah, and xenolinguistic
                        traditions that informed this project — step across into the Vault&apos;s
                        archival depths.
                      </p>
                    </div>
                    <a
                      href="https://vaultofarcana.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary flex-shrink-0"
                    >
                      Step deeper into the tradition
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
                style={{ color: "var(--ut-magenta)", opacity: 0.5 }}
              >
                [ Typography & Symbols ]
              </p>
              <h2
                className="font-display text-2xl md:text-3xl glow-magenta"
                style={{ color: "var(--ut-magenta)" }}
              >
                <ZalgoText text="Visual Reference Archive" intensity="moderate" />
              </h2>
            </div>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <PinterestGrid
              boardSlug="hakanhisim/typography-symbols"
              title="Visual Reference Archive"
              subtitle="Typography & Symbols"
            />
          </SectionReveal>
        </div>
      </section>
</>
  );
}
