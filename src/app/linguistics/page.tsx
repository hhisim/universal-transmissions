import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";

export const metadata: Metadata = {
  title: "Xenolinguistics — Universal Transmissions",
  description:
    "Research into the roots of language, the hacking of syntax, and the translinguistic exploration of Universal Transmissions.",
};

export default function LinguisticsPage() {
  return (
    <>
      <Navigation />
     
      <PageBackground variant="research" /> <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-20" style={{ borderBottom: "1px solid rgba(0,229,255,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
                style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
              >
                [ Trans-Dimensional Linguistics ]
              </p>
              <h1
                className="font-display text-4xl md:text-6xl glow-cyan mb-6"
                style={{ color: "var(--ut-cyan)" }}
              >
                <ZalgoText text="Xenolinguistics" intensity="moderate" />
              </h1>
              <blockquote
                className="font-display text-lg md:text-xl max-w-2xl"
                style={{ color: "var(--ut-gold)" }}
              >
                <ZalgoText
                  text="Language is a code — and just like any code it can also be hacked"
                  intensity="subtle"
                />
              </blockquote>
            </SectionReveal>
          </div>
        </section>

        {/* ── MANIFESTO ─────────────────────────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <div className="ut-card p-10">
                  <h2
                    className="font-display text-xl mb-6"
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

              {/* DEW image from research */}
              <SectionReveal delay={0.2}>
                <div className="mt-8 overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <img
                    src="https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1508399265310-K72N21TXHJ2H3KMVSPVD/DEW.jpg"
                    alt="Linguistic research imagery"
                    className="w-full"
                  />
                </div>
              </SectionReveal>

              {/* Recursive pantheism image */}
              <SectionReveal delay={0.3}>
                <div className="mt-8 overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <img
                    src="https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1508399221910-FJ7INJBWVHMY8HLC2BBM/Recursive+pantheism+-+hacked+3.jpg"
                    alt="Recursive pantheism - language hacking"
                    className="w-full"
                  />
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── KEY CONCEPTS ───────────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(0,229,255,0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-16">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                >
                  [ Key Concepts ]
                </p>
                <h2
                  className="font-display text-3xl md:text-4xl glow-cyan"
                  style={{ color: "var(--ut-cyan)" }}
                >
                  <ZalgoText text="Core Linguistics" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
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
              ].map((concept, i) => (
                <SectionReveal key={concept.title} delay={i * 0.05}>
                  <div className="ut-card p-8">
                    <h3 className="font-heading text-sm tracking-wider uppercase mb-4" style={{ color: "var(--ut-cyan)" }}>
                      <ZalgoText text={concept.title} intensity="subtle" />
                    </h3>
                    <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      {concept.desc}
                    </p>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── REFERENCE IMAGES ───────────────────────── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(0,229,255,0.06)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
                >
                  [ Research References ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text="Visual Language Studies" intensity="moderate" />
                </h2>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1485380341979-ZPYYME478YGA8350NBIE/216ed5edb0cf582a7dc6e55845c0615d.jpg",
                "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1485380393944-S47XPODE1LAU7DN1UUUT/b22KRKr.png",
                "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1485380417312-1ZTWOP2MMAGBEARPX693/fewfew.jpg",
                "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1485380525348-492X9JMUYZHGUXHXBP4L/UNAkibU.jpg",
              ].map((src, i) => (
                <SectionReveal key={i} delay={i * 0.05}>
                  <div className="aspect-square overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <img src={src} alt="Linguistic research reference" className="w-full h-full object-cover" />
                  </div>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.3}>
              <div className="text-center mt-10">
                <p className="font-body text-sm mb-4" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                  Full research imagery available at the original Squarespace gallery.
                </p>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}