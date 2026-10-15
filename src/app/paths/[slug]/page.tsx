import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageBackground from "@/components/scenes/PageBackground";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { BASIS_STYLE } from "@/components/research/basis-style";
import {
  findGuidedPath,
  guidedPathSlugs,
  resolvePath,
  selectStop,
  stopNeighbours,
  stopOracleHref,
} from "@/lib/guided-paths";

export const revalidate = 300;

interface Props {
  params: { slug: string };
  searchParams: { stop?: string };
}

export function generateStaticParams() {
  return guidedPathSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const path = findGuidedPath(params.slug);
  if (!path) return { title: "Not Found", robots: { index: false, follow: false } };
  return {
    alternates: { canonical: `/paths/${path.slug}` },
    title: `${path.title} — Guided Exploration — Universal Transmissions`,
    description: path.summary,
  };
}

export default function GuidedPathPage({ params, searchParams }: Props) {
  const path = findGuidedPath(params.slug);
  if (!path) notFound();

  const { stops, unresolved } = resolvePath(path);
  if (stops.length === 0) notFound();

  /* SELECTION IS BY AUTHORED NUMBER, NOT BY ARRAY POSITION.
     `stops` holds the AVAILABLE stops, so it is compacted whenever a stop fails to resolve.
     Indexing it with the URL's stop number would silently open a different record: with stop
     2 unavailable the surviving numbers are 1,3,4,5,6 and index 2 is stop 4, so ?stop=3
     would have shown stop 4. selectStop() resolves the authored number instead, and reports
     an unavailable stop as unavailable rather than falling through to a neighbour. */
  const selection = selectStop(path, searchParams.stop);
  const total = path.stops.length;
  const number = selection.state === "out-of-range" ? 1 : selection.number;
  const stop = selection.state === "available" ? selection.stop : null;
  const { previous, next } = stopNeighbours(path, number);

  const basis =
    stop && stop.basis ? BASIS_STYLE[stop.basis as keyof typeof BASIS_STYLE] : null;

  const stopHref = (n: number) => `/paths/${path.slug}?stop=${n}`;

  return (
    <>
      <PageBackground variant="research" />
      <PageBackground variant="homepage" opacity={0.4} />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        {/* ── HEADER: which path, which stop, how far along ─────────────── */}
        <section className="container-ut pt-10 pb-6">
          <nav
            className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-6"
            aria-label="Guided exploration"
          >
            <Link
              href="/paths"
              className="font-mono text-[9px] tracking-[0.25em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
              style={{ color: "var(--ut-white-faint)", opacity: 0.8 }}
            >
              ← All paths
            </Link>
            <Link
              href="/research"
              className="font-mono text-[9px] tracking-[0.25em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
              style={{ color: "var(--ut-purple)", opacity: 0.8 }}
            >
              Research Nexus
            </Link>
          </nav>

          <h1
            className="font-display text-3xl md:text-5xl tracking-[0.04em] ut-gradient-text mb-3"
            style={{ lineHeight: 1.1 }}
          >
            <ZalgoText text={path.title} intensity="subtle" />
          </h1>
          <p className="font-body text-sm md:text-base mb-6" style={{ color: "var(--ut-white-dim)" }}>
            {path.theme}
          </p>

          {/* Progress counts AUTHORED stops, so the total stays coherent when a stop is
              unavailable: the path still has six stops, one of which cannot be opened. */}
          <div data-path-progress className="mb-3">
            <div
              className="flex items-baseline justify-between gap-4 mb-2"
              style={{ color: "var(--ut-gold)" }}
            >
              <span className="font-mono text-[9px] tracking-[0.3em] uppercase">
                Stop {number} of {total}
              </span>
              <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ opacity: 0.6 }}>
                {path.title}
              </span>
            </div>
            {/* Static width. No animated fill, so reduced motion needs no exception. */}
            <div
              className="h-[2px] w-full"
              style={{ background: "rgba(255,255,255,0.08)" }}
              role="img"
              aria-label={`Stop ${number} of ${total}`}
            >
              <div
                className="h-[2px]"
                style={{
                  width: `${(number / total) * 100}%`,
                  background: "var(--ut-gold)",
                  opacity: 0.75,
                }}
              />
            </div>
          </div>
          {unresolved.length > 0 && (
            <p className="font-body text-[12px] mt-3" style={{ color: "var(--ut-magenta)" }}>
              Stop{unresolved.length > 1 ? "s" : ""} {unresolved.join(", ")} of this path could
              not be resolved against the current registries and cannot be opened. The numbers of
              the other stops are unchanged, and the path continues around them.
            </p>
          )}
        </section>

        {/* ── THE STOP ─────────────────────────────────────────────────── */}
        <section className="container-ut pb-8">
          {stop && (
          <SectionReveal key={stop.number}>
            <article
              data-path-stop={stop.number}
              data-path-anchor={stop.anchor ?? "room"}
              className="p-6 md:p-8"
              style={{ border: "1px solid var(--ut-border)", background: "rgba(255,255,255,0.015)" }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
                <span
                  className="font-mono text-[9px] tracking-[0.25em] uppercase"
                  style={{ color: "var(--ut-purple)", opacity: 0.8 }}
                >
                  {stop.number}. {stop.kind}
                </span>
                {basis && (
                  <span
                    data-basis-label={stop.basis}
                    className="font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-[2px]"
                    style={{ color: basis.color, border: `1px solid ${basis.color}`, opacity: 0.85 }}
                    title={basis.note}
                  >
                    {basis.label}
                  </span>
                )}
              </div>

              <h2
                className="font-display text-2xl md:text-3xl tracking-[0.03em] mb-4"
                style={{ color: "var(--ut-white)" }}
              >
                {stop.title}
              </h2>

              {/* what the visitor is encountering, in this path's terms */}
              <p className="font-body text-sm md:text-base leading-relaxed mb-5" style={{ color: "var(--ut-white)" }}>
                {stop.encounter}
              </p>

              {/* why this stop belongs — the registry's own wording and basis, not the path's */}
              {stop.rationale && (
                <div className="mb-5 pl-4" style={{ borderLeft: "1px solid var(--ut-border)" }}>
                  <p
                    className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
                    style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
                  >
                    Why this record belongs
                  </p>
                  <p
                    className="font-body text-[13px] leading-relaxed"
                    style={{ color: "var(--ut-white-dim)" }}
                  >
                    {stop.rationale}
                  </p>
                  {stop.basisLabel && (
                    <p
                      className="font-mono text-[9px] tracking-[0.15em] uppercase mt-2"
                      style={{ color: basis ? basis.color : "var(--ut-white-faint)", opacity: 0.8 }}
                    >
                      {stop.basisLabel}
                    </p>
                  )}
                </div>
              )}

              {/* the curated reading into the next stop, marked as a curated reading */}
              {stop.transition && (
                <div
                  data-curated-reading
                  className="mb-6 p-4"
                  style={{ border: "1px dashed rgba(240,199,94,0.28)", background: "rgba(240,199,94,0.03)" }}
                >
                  <p
                    className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
                    style={{ color: "var(--ut-gold)", opacity: 0.85 }}
                  >
                    Curated reading — into the next stop
                  </p>
                  <p className="font-body text-[13px] leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                    {stop.transition}
                  </p>
                </div>
              )}

              {/* the Oracle action, with the question this record opens with */}
              <div
                className="pt-5 flex flex-col gap-3"
                style={{ borderTop: "1px solid var(--ut-border)" }}
              >
                <p
                  className="font-mono text-[9px] tracking-[0.25em] uppercase"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
                >
                  Ask the Oracle about this record
                </p>
                <p className="font-body text-[13px] italic" style={{ color: "var(--ut-white-dim)" }}>
                  &ldquo;{stop.question}&rdquo;
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href={stopOracleHref(stop, path.slug)}
                    data-path-oracle={stop.anchor ?? "room"}
                    className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                    style={{ color: "var(--ut-cyan)", border: "1px solid rgba(34,211,238,0.35)" }}
                  >
                    Open in the Oracle →
                  </Link>
                  {/* leaving for ordinary exploration, without losing your place */}
                  <Link
                    href={stop.href}
                    data-path-destination={stop.anchor ?? "room"}
                    className="font-mono text-[10px] tracking-[0.2em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                    style={{ color: "var(--ut-white-dim)", opacity: 0.85 }}
                  >
                    Visit the record directly ↗
                  </Link>
                </div>
              </div>
            </article>
          </SectionReveal>
          )}

          {selection.state === "unavailable" && (
            <article
              data-path-unavailable={selection.number}
              className="p-6 md:p-8"
              style={{ border: "1px dashed rgba(230,80,200,0.35)", background: "rgba(230,80,200,0.02)" }}
            >
              <p
                className="font-mono text-[9px] tracking-[0.25em] uppercase mb-4"
                style={{ color: "var(--ut-magenta)", opacity: 0.9 }}
              >
                {selection.number}. Stop unavailable
              </p>
              <h2
                className="font-display text-2xl md:text-3xl tracking-[0.03em] mb-4"
                style={{ color: "var(--ut-white)" }}
              >
                This stop cannot be opened
              </h2>
              <p
                className="font-body text-sm md:text-base leading-relaxed mb-4"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Stop {selection.number} of this path could not be resolved against the current
                registries, so the record it names is not being shown. Nothing has been
                substituted in its place: that number still belongs to that stop, and this page
                will not present a neighbouring record under it.
              </p>
              <p className="font-body text-[13px]" style={{ color: "var(--ut-white-faint)" }}>
                The other stops keep their own numbers and remain open.
              </p>
            </article>
          )}

          {selection.state === "out-of-range" && (
            <article
              data-path-out-of-range
              className="p-6 md:p-8"
              style={{ border: "1px dashed var(--ut-border)", background: "rgba(255,255,255,0.015)" }}
            >
              <p
                className="font-mono text-[9px] tracking-[0.25em] uppercase mb-4"
                style={{ color: "var(--ut-white-faint)", opacity: 0.8 }}
              >
                No such stop
              </p>
              <h2
                className="font-display text-2xl md:text-3xl tracking-[0.03em] mb-4"
                style={{ color: "var(--ut-white)" }}
              >
                This path has {total} stops
              </h2>
              <p
                className="font-body text-sm md:text-base leading-relaxed mb-4"
                style={{ color: "var(--ut-white-dim)" }}
              >
                The stop requested is outside 1&ndash;{total}. Showing the beginning of the path
                instead, with its numbering unchanged.
              </p>
            </article>
          )}
        </section>

        {/* ── MOVEMENT ─────────────────────────────────────────────────── */}
        <section className="container-ut pb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {previous ? (
              <Link
                href={stopHref(previous.number)}
                data-path-prev={previous.number}
                className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                style={{ color: "var(--ut-white-dim)", border: "1px solid var(--ut-border)" }}
              >
                ← Stop {previous.number}
              </Link>
            ) : (
              <span
                className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2"
                style={{ color: "var(--ut-white-faint)", border: "1px solid var(--ut-border)", opacity: 0.5 }}
              >
                ← Start of path
              </span>
            )}

            {next ? (
              <Link
                href={stopHref(next.number)}
                data-path-next={next.number}
                className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                style={{ color: "var(--ut-gold)", border: "1px solid rgba(240,199,94,0.35)" }}
              >
                Next: {next.title} →
              </Link>
            ) : (
              <Link
                href="/paths"
                data-path-end
                className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                style={{ color: "var(--ut-gold)", border: "1px solid rgba(240,199,94,0.35)" }}
              >
                End of path — all paths →
              </Link>
            )}
          </div>
        </section>

        {/* ── CHOOSE ANOTHER STOP ──────────────────────────────────────── */}
        <section className="container-ut pb-10">
          <p
            className="font-mono text-[9px] tracking-[0.35em] uppercase mb-4"
            style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
          >
            [ Choose another stop ]
          </p>
          <ol className="grid gap-2" data-path-stops>
            {stops.map((s) => {
              const current = s.number === number;
              return (
                <li key={`${s.topic}-${s.anchor ?? "room"}`}>
                  <Link
                    href={stopHref(s.number)}
                    data-path-stop-link={s.number}
                    aria-current={current ? "step" : undefined}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 px-3 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                    style={{
                      border: `1px solid ${current ? "rgba(240,199,94,0.4)" : "transparent"}`,
                      background: current ? "rgba(240,199,94,0.04)" : "transparent",
                    }}
                  >
                    <span
                      className="font-mono text-[10px] w-5 text-right shrink-0"
                      style={{ color: current ? "var(--ut-gold)" : "var(--ut-purple)", opacity: 0.8 }}
                    >
                      {s.number}
                    </span>
                    <span className="font-body text-[13px]" style={{ color: "var(--ut-white-dim)" }}>
                      {s.title}
                    </span>
                    <span
                      className="font-mono text-[9px] tracking-[0.15em] uppercase"
                      style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                    >
                      {s.kind}
                    </span>
                    {current && (
                      <span
                        className="font-mono text-[9px] tracking-[0.15em] uppercase"
                        style={{ color: "var(--ut-gold)", opacity: 0.9 }}
                      >
                        — you are here
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
            {/* An unavailable stop keeps its row and its number, marked as unavailable, so the
                list still reads 1..N and no number silently disappears. */}
            {unresolved.map((n) => (
              <li key={`unavailable-${n}`}>
                <span
                  data-path-stop-unavailable={n}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 px-3"
                  style={{ border: "1px dashed rgba(230,80,200,0.3)" }}
                >
                  <span
                    className="font-mono text-[10px] w-5 text-right shrink-0"
                    style={{ color: "var(--ut-magenta)", opacity: 0.9 }}
                  >
                    {n}
                  </span>
                  <span className="font-body text-[13px]" style={{ color: "var(--ut-white-faint)" }}>
                    Unavailable — this stop&apos;s record could not be resolved
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── LEAVE FOR ORDINARY EXPLORATION ───────────────────────────── */}
        <section className="container-ut pb-16">
          <p
            className="font-mono text-[9px] tracking-[0.35em] uppercase mb-4"
            style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
          >
            [ Or explore on your own ]
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-3" data-path-exits>
            {[
              { href: "/research", label: "Research Nexus" },
              { href: "/gallery", label: "Gallery" },
              { href: "/codex/archive", label: "Codex archive" },
              { href: "/experience/universal-resonator", label: "The Resonator" },
              { href: "/journal", label: "Journal" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[10px] tracking-[0.2em] uppercase focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}
              >
                {l.label} ↗
              </Link>
            ))}
          </div>
          <p className="font-body text-[12px] mt-6 max-w-3xl" style={{ color: "var(--ut-white-faint)", opacity: 0.75 }}>
            This path is an editorial order over records the archive already keeps. Nothing here
            replaces a room: every stop links to its own record, and each room holds its own
            evidence and its own limits.
          </p>
        </section>
      </main>
    </>
  );
}
