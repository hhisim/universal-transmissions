import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Research — Universal Transmissions",
  description:
    "The source material, investigations, and patterns that underlie every Universal Transmissions artwork — cymatics, linguistics, symbolism, and sacred geometry.",
};

const researchTopics = [
  {
    href: "/research/cymatics",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d="M4 20 Q12 10, 20 20 Q28 30, 36 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 20 Q12 30, 20 20 Q28 10, 36 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 20 L36 20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.6" />
      </svg>
    ),
    label: "Frequency · Form",
    title: "Cymatics",
    description:
      "The science of visible sound — how vibration shapes matter. Chladni patterns, standing waves, and the Tonoscope reveal the geometric language beneath all sound.",
    accent: "var(--ut-cyan)",
  },
  {
    href: "/research/linguistics",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="8" width="4" height="24" fill="currentColor" opacity="0.3" />
        <rect x="12" y="12" width="4" height="16" fill="currentColor" opacity="0.5" />
        <rect x="18" y="6" width="4" height="28" fill="currentColor" opacity="0.7" />
        <rect x="24" y="14" width="4" height="12" fill="currentColor" opacity="0.4" />
        <rect x="30" y="10" width="4" height="20" fill="currentColor" opacity="0.6" />
      </svg>
    ),
    label: "Language · Syntax",
    title: "Linguistics",
    description:
      "Xenolinguistics — the exploration of language as a universal phenomenon. Roots of human language, the hacking of syntax, and translinguistic transmission.",
    accent: "var(--ut-magenta)",
  },
  {
    href: "/research/symbolism",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d="M20 4 L20 36" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d="M4 20 L36 20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d="M9 9 L31 31" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <path d="M31 9 L9 31" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    label: "Archetypes · Correspondences",
    title: "Symbolism",
    description:
      "The universal language of symbols — archetypes, sigils, and the hidden correspondences between all things. The code beneath the code.",
    accent: "var(--ut-purple)",
  },
  {
    href: "/research/geometry",
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="20,4 36,32 4,32" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
        <polygon points="20,36 4,8 36,8" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      </svg>
    ),
    label: "Form · Proportion",
    title: "Geometry",
    description:
      "Sacred geometry — the skeleton of the visible world. Platonic solids, Flower of Life, Metatron's Cube, and the golden ratio that underlies all creation.",
    accent: "var(--ut-gold)",
  },
];

export default function ResearchPage() {
  return (
    <>
      <PageBackground variant="research" />
      <Navigation />
<main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── HERO ─────────────────────────────────── */}
        <section className="py-24 md:py-32 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(147, 51, 234, 0.12) 0%, transparent 60%)",
            }}
          />
          <div className="container-ut relative">
            <SectionReveal>
              <p
                className="font-mono text-[9px] tracking-[0.5em] uppercase mb-6"
                style={{ color: "var(--ut-purple)", opacity: 0.5 }}
              >
                [ Source Material ]
              </p>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <h1
                className="font-display text-5xl md:text-7xl lg:text-8xl tracking-[0.05em] ut-gradient-text mb-6"
                style={{ lineHeight: 1.1 }}
              >
                <ZalgoText text="THE RESEARCH" intensity="heavy" />
              </h1>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <p
                className="font-heading text-sm tracking-[0.4em] uppercase mb-10"
                style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
              >
                Frequency · Form · Language · Pattern
              </p>
            </SectionReveal>

            <SectionReveal delay={0.3}>
              <div className="max-w-3xl">
                <p
                  className="font-body text-lg md:text-xl leading-relaxed mb-6"
                  style={{ color: "var(--ut-white-dim)" }}
                >
                  Universal Transmissions is not merely an art series — it is the visual output of
                  decades of research into the hidden architecture of reality. These pages document
                  the source material, the investigations, and the patterns that underlie every
                  transmission.
                </p>
                <p
                  className="font-body text-lg md:text-xl leading-relaxed"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                >
                  Language is a code. Frequency creates form. Geometry is the skeleton of the visible
                  world. And symbolism is the currency of the unconscious mind.
                </p>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── DIVIDER ───────────────────────────────── */}
        <div className="container-ut">
          <div className="divider-spectrum" />
        </div>

        {/* ── RESEARCH TOPICS GRID ──────────────────── */}
        <section className="py-20">
          <div className="container-ut">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {researchTopics.map((topic, i) => (
                <SectionReveal key={topic.href} delay={i * 0.08}>
                  <Link
                    href={topic.href}
                    className="group block ut-card p-10 h-full transition-all duration-500"
                    style={
                      {
                        "--topic-accent": topic.accent,
                      } as React.CSSProperties
                    }
                  >
                    {/* Icon */}
                    <div
                      className="mb-6 transition-transform duration-500 group-hover:scale-110"
                      style={{ color: topic.accent }}
                    >
                      {topic.icon}
                    </div>

                    {/* Label */}
                    <p
                      className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3"
                      style={{ color: topic.accent, opacity: 0.6 }}
                    >
                      {topic.label}
                    </p>

                    {/* Title */}
                    <h2
                      className="font-display text-2xl md:text-3xl mb-4 transition-colors duration-500"
                      style={{ color: "var(--ut-white)" }}
                    >
                      <ZalgoText text={topic.title} intensity="subtle" />
                    </h2>

                    {/* Description */}
                    <p
                      className="font-body text-base leading-relaxed mb-6"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      {topic.description}
                    </p>

                    {/* CTA */}
                    <span
                      className="inline-flex items-center gap-2 font-heading text-[10px] tracking-[0.3em] uppercase transition-all duration-500"
                      style={{ color: topic.accent, opacity: 0.8 }}
                    >
                      Explore
                      <svg
                        width="16"
                        height="8"
                        viewBox="0 0 16 8"
                        fill="none"
                        className="transition-transform duration-500 group-hover:translate-x-2"
                      >
                        <path
                          d="M0 4H14M14 4L11 1M14 4L11 7"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                      </svg>
                    </span>
                  </Link>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CROSS-LINK TO VAULT ──────────────────── */}
        <section
          className="py-16"
          style={{ borderTop: "1px solid var(--ut-border)" }}
        >
          <div className="container-ut">
            <SectionReveal>
              <div
                className="ut-card p-10 md:p-14 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(10, 9, 14, 0.8) 100%)",
                }}
              >
                <p
                  className="font-mono text-[9px] tracking-[0.4em] uppercase mb-4"
                  style={{ color: "var(--ut-purple)", opacity: 0.5 }}
                >
                  [ The Living Archive ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl mb-4"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text="Deeper into the Tradition" intensity="subtle" />
                </h2>
                <p
                  className="font-body text-base max-w-xl mx-auto mb-8"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                >
                  These research areas draw from thirty years of immersion in esoteric tradition —
                  Hermetic philosophy, Tantric practice, sacred geometry, and the cartography of
                  consciousness. Explore the full archive at Vault of Arcana.
                </p>
                <a
                  href="https://vaultofarcana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Enter the Vault of Arcana
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 10L10 2M10 2H4M10 2V8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </a>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
