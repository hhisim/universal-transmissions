import Link from "next/link";
import SectionReveal from "@/components/ui/SectionReveal";
import ResonatorLoader from "./ResonatorLoader";
import { allRegisteredConnections, resolveResearchTopic } from "@/lib/research-topics";
import { BASIS_STYLE } from "@/components/research/basis-style";

const ANCHOR_SLUG = "instrument-universal-resonator";

/**
 * The instrument room.
 *
 * A reading page first. The instrument bundle is 960 KB of WebGL and audio and is NOT
 * referenced here at all - it is requested for the first time when the visitor launches
 * it, from ResonatorLoader. Everything on this page before that point is text, links
 * and the room's own registry data.
 */
export default function UniversalResonatorPage() {
  const entry = allRegisteredConnections().find(
    (r) => r.topicSlug === "cymatics" && r.connection.anchorSlug === ANCHOR_SLUG
  );
  const connection = entry?.connection;
  const anchorId = entry?.anchorId ?? `research-v1:cymatics/connection/${ANCHOR_SLUG}`;
  const topic = resolveResearchTopic(anchorId);
  const references = (topic?.sources ?? []).filter((s) => !s.internal);

  const oracleHref =
    `/oracle?view=desktop&researchTopicId=${encodeURIComponent(anchorId)}` +
    `&from=${encodeURIComponent("/experience/universal-resonator")}` +
    (connection ? `&q=${encodeURIComponent(connection.suggestedQuestion)}` : "");

  return (
    <div data-instrument-room="true">
      {/* ── the room, and the launch ─────────────────────────────────────────── */}
      <section className="py-16 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(147, 51, 234, 0.10) 0%, transparent 60%)",
          }}
        />
        <div className="container-ut relative">
          <SectionReveal>
            <Link
              href="/experience"
              className="font-mono text-[10px] tracking-[0.24em] uppercase mb-4 inline-block focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
              style={{ color: "var(--ut-cyan)" }}
            >
              ← All instruments
            </Link>
            <p
              className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4"
              style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
            >
              [ Research — Cymatics · Instrument ]
            </p>
          </SectionReveal>

          <SectionReveal delay={0.1}>
            <h1
              className="font-display text-4xl md:text-6xl mb-5"
              style={{ color: "var(--ut-white)" }}
            >
              The Universal Resonator
            </h1>
          </SectionReveal>

          <SectionReveal delay={0.15}>
            <p
              className="font-body text-base md:text-lg leading-relaxed max-w-3xl mb-8"
              style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}
            >
              The instrument of this room. Everywhere else in Cymatics the archive writes
              about a driven plate and what forms on it; here you drive one yourself —
              choose the mode, the frequency and the medium, and watch the nodal structure
              gather the sand. Keep reading first if you prefer: nothing below runs until
              you start it.
            </p>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <ResonatorLoader />
          </SectionReveal>

          <SectionReveal delay={0.25}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6">
              <Link
                href="/research/cymatics"
                data-instrument-return="true"
                className="font-mono text-[10px] tracking-[0.2em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                style={{ color: "var(--ut-cyan)" }}
              >
                ← Back to the Cymatics room
              </Link>
              <Link
                href="/research"
                className="font-mono text-[10px] tracking-[0.2em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                style={{ color: "var(--ut-white-faint)" }}
              >
                The research nexus
              </Link>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── what the model actually is ──────────────────────────────────────── */}
      <section className="py-14" data-instrument-model="true" style={{ borderTop: "1px solid var(--ut-border)" }}>
        <div className="container-ut">
          <SectionReveal>
            <h2
              className="font-display text-2xl md:text-3xl mb-4"
              style={{ color: "var(--ut-white)" }}
            >
              What the instrument is actually solving
            </h2>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
              <div className="ut-card p-6" style={{ background: "rgba(34, 211, 238, 0.03)" }}>
                <p
                  className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
                  style={{ color: "var(--ut-cyan)" }}
                >
                  The model
                </p>
                <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}>
                  A generating cosine plate or a Bessel membrane, evaluated live from the
                  current mode numbers, phase, interference and harmonic partials. The sand
                  is solved against that field: grains migrate off the moving antinodes and
                  settle into the nodal lines, which is the same thing a real plate does to
                  powder — here done in a model rather than on metal. A worker thread
                  computes 8,000 monitor grains and a field-distance contour from the same
                  model packet the main solve uses, so the 2D monitor is a diagnostic of the
                  live model and not a decorative thumbnail.
                </p>
              </div>
              <div className="ut-card p-6" style={{ background: "rgba(212, 168, 71, 0.03)" }}>
                <p
                  className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
                  style={{ color: "var(--ut-gold)" }}
                >
                  The model, and what it shows
                </p>
                <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}>
                  It is an idealised model, and the ideal is the point: the plate is
                  homogeneous and perfectly constrained, so what the instrument shows is the
                  structure of its own mathematics made visible — clean, exact, and repeating
                  as no sheet of metal, glass or drum skin ever quite will. Hold that beside a
                  real plate and you can see the difference the material makes: thickness,
                  damping, mounting and grain all bend the figure. The instrument is where the
                  figure itself can be watched in motion.
                </p>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── what this rests on ─────────────────────────────────────────────── */}
      <section className="py-14" data-instrument-references="true" style={{ borderTop: "1px solid var(--ut-border)" }}>
        <div className="container-ut">
          <SectionReveal>
            <h2
              className="font-display text-2xl md:text-3xl mb-3"
              style={{ color: "var(--ut-white)" }}
            >
              What this room is built on
            </h2>
            <p
              className="font-body text-sm leading-relaxed mb-6 max-w-3xl"
              style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
            >
              The Cymatics room&rsquo;s own references, carried here rather than copied, each
              with what it opens. They are the sources the inquiry stands on, listed so the
              material can be followed back to its originals.
            </p>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <ul className="space-y-3 max-w-4xl">
              {references.map((s) => (
                <li key={s.url} className="ut-card p-5">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                    style={{ color: "var(--ut-gold)" }}
                  >
                    {s.label}
                  </a>
                  <p
                    className="font-body text-[13px] leading-relaxed mt-2"
                    style={{ color: "var(--ut-white-faint)", opacity: 0.75 }}
                  >
                    {s.supports}
                  </p>
                </li>
              ))}
            </ul>
          </SectionReveal>

          {connection ? (
            <SectionReveal delay={0.15}>
              <div className="ut-card p-6 mt-6 max-w-4xl" data-instrument-connection="true">
                <span
                  className="inline-block font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-1 mb-3 border"
                  style={{
                    borderColor: BASIS_STYLE[connection.basis].color,
                    color: BASIS_STYLE[connection.basis].color,
                  }}
                >
                  {BASIS_STYLE[connection.basis].label}
                </span>
                <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}>
                  {connection.rationale}
                </p>
                {/* A destination that cannot simply be followed to the thing it names is
                    described rather than implied. */}
                <p
                  className="font-mono text-[10px] leading-relaxed mt-4"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
                >
                  Finding your way there: {connection.destinationNote}
                </p>
              </div>
            </SectionReveal>
          ) : null}
        </div>
      </section>

      {/* ── the Oracle, in this context ────────────────────────────────────── */}
      <section className="py-14" style={{ borderTop: "1px solid var(--ut-border)" }}>
        <div className="container-ut">
          <SectionReveal>
            <h2
              className="font-display text-2xl md:text-3xl mb-3"
              style={{ color: "var(--ut-white)" }}
            >
              Ask about the instrument
            </h2>
            <p
              className="font-body text-sm leading-relaxed mb-6 max-w-3xl"
              style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
            >
              The Oracle opens with this instrument as its subject — the room&rsquo;s facts,
              the model, and what each reference is offered for — so a question about the
              resonator is answered in the resonator&rsquo;s own terms rather than in
              generalities.
            </p>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                href={oracleHref}
                data-instrument-oracle="true"
                className="font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                style={{
                  borderColor: "var(--ut-purple)",
                  color: "var(--ut-purple)",
                  background: "rgba(147, 51, 234, 0.05)",
                }}
              >
                Open the Oracle in this context →
              </Link>
              {connection ? (
                <p
                  className="font-body text-[13px] italic max-w-xl"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
                >
                  It opens with: &ldquo;{connection.suggestedQuestion}&rdquo;
                </p>
              ) : null}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── third-party notices ────────────────────────────────────────────── */}
      <section className="py-10" style={{ borderTop: "1px solid var(--ut-border)" }}>
        <div className="container-ut">
          <p
            className="font-mono text-[10px] leading-relaxed"
            style={{ color: "var(--ut-white-faint)", opacity: 0.55 }}
          >
            The instrument bundles Three.js and is built with esbuild. Their notices travel
            with it at{" "}
            <a
              href="/experience/universal-resonator/THIRD_PARTY_NOTICES.txt"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--ut-cyan)" }}
            >
              THIRD_PARTY_NOTICES.txt
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
