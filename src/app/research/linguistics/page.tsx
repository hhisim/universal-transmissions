import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";

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

export default function ResearchLinguisticsPage() {
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

      </main>
      <Footer />
    </>
  );
}
