"use client";

import Link from "next/link";
import { useState } from "react";
import type { ResearchConnection } from "@/lib/research-connections";
import { CYMATICS_GAPS } from "@/lib/research-connections";
import { researchConnectionTopicId } from "@/lib/research-topics";

const BASIS_STYLE: Record<
  ResearchConnection["basis"],
  { label: string; color: string; note: string }
> = {
  documented: {
    label: "Documented reference",
    color: "var(--ut-cyan)",
    note: "Named in an existing UT record or written about directly in the Journal.",
  },
  interpretation: {
    label: "UT interpretation",
    color: "var(--ut-magenta)",
    note: "A reading this project makes. Not a claim about how the world behaves.",
  },
  thematic: {
    label: "Thematic association",
    color: "var(--ut-gold)",
    note: "A shared subject or idea. Useful as context; not a sourced link.",
  },
};

export default function CymaticsConnections({
  connections,
  topicSlug,
  returnHref,
}: {
  connections: ResearchConnection[];
  /** The owning research topic, so each card can address its own Oracle anchor. */
  topicSlug: string;
  returnHref: string;
}) {
  const [openBasis, setOpenBasis] = useState<ResearchConnection["basis"] | null>(null);

  return (
    <section
      id="connections"
      className="py-20 scroll-mt-24"
      style={{ borderTop: "1px solid rgba(34, 211, 238, 0.06)" }}
      data-cymatics-connections="true"
    >
      <div className="container-ut">
        <div className="max-w-3xl mx-auto">
          <p
            className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
            style={{ color: "var(--ut-cyan)", opacity: 0.5 }}
          >
            [ Connections in the Archive ]
          </p>
          <h2
            className="font-display text-2xl md:text-3xl glow-cyan mb-4"
            style={{ color: "var(--ut-cyan)" }}
          >
            Where This Already Runs
          </h2>
          <p
            className="font-body text-sm leading-relaxed mb-8"
            style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
          >
            Cymatics is not a topic that lives on one page. It already runs through the
            Journal, the artwork records, the Codex and the instruments. Each link below says
            why it belongs and how strongly it is supported — a shared keyword is not treated
            as a relationship. Open a destination to read it, or take any single connection
            into the Oracle as its own context.
          </p>

          {/* Basis legend: makes the epistemic scale readable before the list. */}
          <div
            className="ut-card p-5 mb-8"
            style={{ background: "rgba(34, 211, 238, 0.02)" }}
          >
            <p
              className="font-mono text-[9px] tracking-[0.25em] uppercase mb-3"
              style={{ color: "var(--ut-white-faint)" }}
            >
              How these links are labelled
            </p>
            <ul className="space-y-2">
              {(Object.keys(BASIS_STYLE) as ResearchConnection["basis"][]).map((b) => (
                <li key={b} className="flex flex-col sm:flex-row sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenBasis(openBasis === b ? null : b)}
                    aria-expanded={openBasis === b}
                    className="font-mono text-[9px] tracking-[0.2em] uppercase text-left shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                    style={{ color: BASIS_STYLE[b].color }}
                  >
                    {openBasis === b ? "−" : "+"} {BASIS_STYLE[b].label}
                  </button>
                  <span
                    className="font-body text-[11px] leading-relaxed"
                    style={{
                      color: "var(--ut-white-faint)",
                      display: openBasis === b ? "block" : "none",
                    }}
                  >
                    {BASIS_STYLE[b].note}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="space-y-4">
            {connections.map((c) => {
              // The anchor id comes from the registry helper, so the identifier this
              // card sends is the same key the server resolves — never hand-written.
              const anchorId = researchConnectionTopicId(topicSlug, c.anchorSlug);
              const oracleHref =
                `/oracle?view=desktop&researchTopicId=${encodeURIComponent(anchorId)}` +
                `&from=${encodeURIComponent(returnHref)}` +
                `&q=${encodeURIComponent(c.suggestedQuestion)}`;
              return (
                <li
                  key={c.href}
                  data-connection-anchor={c.anchorSlug}
                  className="ut-card p-6 transition-all duration-300 hover:border-cyan/20"
                  style={{ background: "rgba(34, 211, 238, 0.02)" }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-4 mb-2">
                    <span
                      className="font-mono text-[9px] tracking-[0.25em] uppercase break-words"
                      style={{ color: BASIS_STYLE[c.basis].color, opacity: 0.75 }}
                    >
                      {c.kind} · {BASIS_STYLE[c.basis].label}
                    </span>
                    <span
                      className="font-mono text-[9px] tracking-[0.2em] uppercase min-w-0 break-words"
                      style={{ color: "var(--ut-white-faint)", opacity: 0.55 }}
                    >
                      {c.basisLabel}
                    </span>
                  </div>

                  {/* The destination is a real link; the Oracle entry is a SIBLING link,
                      never nested inside it, so both stay separately focusable. */}
                  <Link
                    href={c.href}
                    data-connection-basis={c.basis}
                    className="group block focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                  >
                    <h3
                      className="font-display text-base md:text-lg mb-2 group-hover:text-cyan transition-colors"
                      style={{ color: "var(--ut-white)" }}
                    >
                      {c.title}
                    </h3>
                    <p
                      className="font-body text-[13px] leading-relaxed"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      {c.rationale}
                    </p>
                  </Link>

                  {/* A destination that cannot be reached directly states how to
                      reach it, rather than letting the card imply the link lands
                      on it. Plain text, not a third link. */}
                  {c.destinationNote ? (
                    <p
                      data-connection-destination-note={c.anchorSlug}
                      className="font-mono text-[10px] leading-relaxed mt-3 break-words"
                      style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
                    >
                      Finding it once you are there: {c.destinationNote}
                    </p>
                  ) : null}

                  <div
                    className="mt-5 pt-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    style={{ borderTop: "1px solid rgba(34, 211, 238, 0.08)" }}
                  >
                    <Link
                      href={oracleHref}
                      data-connection-oracle={c.anchorSlug}
                      className="font-mono text-[9px] tracking-[0.2em] uppercase shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                      style={{ color: "var(--ut-cyan)", opacity: 0.9 }}
                    >
                      Ask the Oracle about this connection →
                    </Link>
                    <span
                      className="font-mono text-[9px] leading-relaxed"
                      style={{ color: "var(--ut-white-faint)", opacity: 0.55 }}
                    >
                      Opens with: “{c.suggestedQuestion}”
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Honest absences, stated rather than padded out with thin links. */}
          <div
            className="ut-card p-6 mt-8"
            style={{ borderColor: "rgba(34, 211, 238, 0.1)" }}
          >
            <p
              className="font-mono text-[9px] tracking-[0.25em] uppercase mb-3"
              style={{ color: "var(--ut-white-faint)" }}
            >
              What this section does not claim
            </p>
            <ul className="space-y-2">
              {CYMATICS_GAPS.map((gap) => (
                <li
                  key={gap}
                  className="font-body text-[12px] leading-relaxed"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
                >
                  — {gap}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
