import type { Metadata } from "next";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import Link from "next/link";
import ResearchPathways from "@/components/research/ResearchPathways";
import ResearchNexus from "@/components/research/ResearchNexus";
import { RESEARCH_DOMAINS, allRegisteredConnections } from "@/lib/research-topics";
import { GUIDED_PATHS, resolvePath } from "@/lib/guided-paths";
export const revalidate = 300; // ISR: rebuilt via CDN cache every 5 min

export const metadata: Metadata = {
  alternates: { canonical: "/research" },
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

/**
 * What each domain actually is today, read from the registry rather than retyped.
 * Two of these four are registered rooms; two are reading pages. The cards say which.
 */
const DOMAIN_BY_ROUTE = new Map(RESEARCH_DOMAINS.map((d) => [d.route, d]));

export default function ResearchPage() {
  // Read from the registry, not retyped: the nexus shows the same relationships the
  // rooms themselves render, with the same identifiers, so nothing here can drift.
  const nexusItems = allRegisteredConnections().map((r) => ({
    topicSlug: r.topicSlug,
    topicTitle: r.topicTitle,
    topicRoute: r.topicRoute,
    anchorSlug: r.connection.anchorSlug,
    anchorId: r.anchorId,
    connection: r.connection,
    sources: r.sources.map((s) => ({
      kind: s.kind,
      label: s.label,
      url: s.url,
      internal: s.internal ?? false,
    })),
  }));

  /* Derived from the guided-paths registry, not retyped: the count shown here is the
     number of stops that actually RESOLVE, so the entry point cannot advertise a path
     the path page would render short. */
  const guidedPathEntries = GUIDED_PATHS.map((p) => ({
    slug: p.slug,
    title: p.title,
    theme: p.theme,
    count: resolvePath(p).stops.length,
  }));

  return (
    <>
      <PageBackground variant="research" />
      <PageBackground variant="homepage" opacity={0.4} />
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

                    {/* What this domain ACTUALLY is, from the registry. A reading page
                        is shown as a reading page rather than padded into a room. */}
                    {(() => {
                      const d = DOMAIN_BY_ROUTE.get(topic.href);
                      if (!d) return null;
                      return (
                        <div className="mb-6">
                          <span
                            className="font-mono text-[9px] tracking-[0.25em] uppercase inline-block px-2 py-1 mb-3 border"
                            style={{
                              borderColor: d.registered ? "rgba(147, 51, 234, 0.45)" : "var(--ut-border)",
                              color: d.registered ? "var(--ut-purple)" : "var(--ut-white-faint)",
                            }}
                            data-research-domain-state={d.slug}
                          >
                            {d.registered ? "Research room" : "Reading page — not yet a room"}
                          </span>
                          <p
                            className="font-mono text-[10px] leading-relaxed"
                            style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                            data-research-domain-standing={d.slug}
                          >
                            {d.standing}
                          </p>
                        </div>
                      );
                    })()}

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

        {/* ── GUIDED EXPLORATIONS — curated orders over the records above ──
            Derived from the same GUIDED_PATHS registry the paths themselves render, so a
            path that fails to resolve is counted here rather than advertised. */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(240, 199, 94, 0.08)" }}
          data-guided-paths-entry="true"
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-gold)", opacity: 0.6 }}
                >
                  [ Guided Explorations ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl mb-4"
                  style={{ color: "var(--ut-gold)" }}
                >
                  <ZalgoText text="Follow a Path" intensity="subtle" />
                </h2>
                <p
                  className="font-body text-sm leading-relaxed mb-8"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
                >
                  Three curated routes through the records on this page and the rooms below.
                  Each stop is an existing record with its own basis and its own Oracle
                  question; the reading that joins one stop to the next is marked as a curated
                  reading. You can move backward, jump to any stop, leave for ordinary
                  exploration and come back without losing your place.
                </p>
              </SectionReveal>

              <div className="grid gap-4">
                {guidedPathEntries.map(({ slug, title, theme, count }) => (
                  <SectionReveal key={slug}>
                    <Link
                      href={`/paths/${slug}`}
                      data-nexus-path={slug}
                      className="block p-5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                      style={{
                        border: "1px solid var(--ut-border)",
                        background: "rgba(255,255,255,0.015)",
                      }}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
                        <span
                          className="font-display text-lg md:text-xl tracking-[0.03em]"
                          style={{ color: "var(--ut-white)" }}
                        >
                          {title}
                        </span>
                        <span
                          className="font-mono text-[9px] tracking-[0.25em] uppercase"
                          style={{ color: "var(--ut-gold)", opacity: 0.75 }}
                        >
                          {count} stops
                        </span>
                      </div>
                      <p className="font-body text-[13px]" style={{ color: "var(--ut-white-dim)" }}>
                        {theme}
                      </p>
                    </Link>
                  </SectionReveal>
                ))}
              </div>

              <p className="mt-6">
                <Link
                  href="/paths"
                  className="font-mono text-[10px] tracking-[0.2em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                  style={{ color: "var(--ut-gold)", opacity: 0.85 }}
                >
                  See all three paths →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── CHOOSE A RELATIONSHIP — the nexus explorer ── */}
        <section
          className="py-20"
          style={{ borderTop: "1px solid rgba(147, 51, 234, 0.08)" }}
          data-research-nexus-section="true"
        >
          <div className="container-ut">
            <div className="max-w-3xl mx-auto">
              <SectionReveal>
                <p
                  className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
                  style={{ color: "var(--ut-purple)", opacity: 0.5 }}
                >
                  [ The Nexus ]
                </p>
                <h2
                  className="font-display text-2xl md:text-3xl glow-purple mb-4"
                  style={{ color: "var(--ut-purple)" }}
                >
                  <ZalgoText text="Choose a Relationship" intensity="subtle" />
                </h2>
                <p
                  className="font-body text-sm leading-relaxed mb-8"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
                >
                  Pick any connection the archive stands behind and open it up: what it links
                  to, why it is held, how well it is supported, and where to go next. Choose one
                  to read the record itself, or carry it into the Oracle and put your own
                  question to it.
                </p>
              </SectionReveal>

              <SectionReveal delay={0.1}>
                <ResearchNexus items={nexusItems} />
              </SectionReveal>

              <SectionReveal delay={0.15}>
                <p
                  className="font-mono text-[10px] leading-relaxed mt-8"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.55 }}
                  data-nexus-coverage-note="true"
                >
                  These are the connections the archive can currently stand behind: {nexusItems.length}{" "}
                  of them, across two research rooms. Linguistics and Symbolism are still reading
                  pages — they hold no explored connections yet, and none has been invented to
                  fill the gap.
                </p>
              </SectionReveal>
            </div>
          </div>
        </section>

        <ResearchPathways
          eyebrow="[ From Research into the Living Site ]"
          title="Follow the Research into the Actual Surfaces"
          description="These research threads are not standalone essays. They feed the Oracle, the Experience Portal, the living archive of artworks, and the journal that documents the work as it unfolds."
          accent="var(--ut-purple)"
          links={[
            {
              href: "/oracle",
              title: "The Oracle",
              description: "Take the symbolic and geometric material into the divinatory interface itself.",
              label: "Oracle Surface",
            },
            {
              href: "/experience/correspondence-codex",
              title: "Correspondence Codex",
              description: "Move from theory into the lighter symbolic index built for quick exploration.",
              label: "Experience Surface",
            },
            {
              href: "/gallery",
              title: "Gallery",
              description: "See how the research resolves into finished transmissions, series, and image systems.",
              label: "Archive Surface",
            },
            {
              href: "/journal",
              title: "Journal",
              description: "Read the making-of notes, transmissions, and process entries around the work.",
              label: "Process Surface",
            },
          ]}
        />

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
</>
  );
}
