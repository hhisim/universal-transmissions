"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ResearchConnection } from "@/lib/research-connections";
import { BASIS_STYLE } from "./basis-style";

export interface NexusItem {
  topicSlug: string;
  topicTitle: string;
  topicRoute: string;
  anchorSlug: string;
  anchorId: string;
  connection: ResearchConnection;
}

/**
 * The Research Nexus's relationship explorer.
 *
 * A visitor picks a relationship — or a room to narrow by — and is shown, for that
 * relationship: what it connects, why it connects, its evidential basis, and where
 * exploration continues.
 *
 * Interaction is real and keyboard-first: the room filter is a set of <button
 * aria-pressed>, and every destination is an ordinary <Link>. Nothing is revealed on
 * hover alone, and nothing depends on a pointer. There is no fetch and no dependency
 * beyond React state, so first paint stays light.
 */
export default function ResearchNexus({ items }: { items: NexusItem[] }) {
  const rooms = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach((i) => seen.set(i.topicSlug, i.topicTitle));
    return Array.from(seen.entries()).map(([slug, title]) => ({ slug, title }));
  }, [items]);

  const [room, setRoom] = useState<string | null>(null);
  const shown = room ? items.filter((i) => i.topicSlug === room) : items;

  return (
    <div data-research-nexus="true">
      <div
        className="flex flex-wrap items-center gap-2 mb-6"
        role="group"
        aria-label="Narrow the relationships by research room"
      >
        <button
          type="button"
          onClick={() => setRoom(null)}
          aria-pressed={room === null}
          data-nexus-filter="all"
          className="font-mono text-[9px] tracking-[0.25em] uppercase px-3 py-2 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
          style={{
            borderColor: room === null ? "var(--ut-purple)" : "var(--ut-border)",
            color: room === null ? "var(--ut-purple)" : "var(--ut-white-faint)",
          }}
        >
          All rooms ({items.length})
        </button>
        {rooms.map((r) => {
          const on = room === r.slug;
          const count = items.filter((i) => i.topicSlug === r.slug).length;
          return (
            <button
              key={r.slug}
              type="button"
              onClick={() => setRoom(on ? null : r.slug)}
              aria-pressed={on}
              data-nexus-filter={r.slug}
              className="font-mono text-[9px] tracking-[0.25em] uppercase px-3 py-2 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
              style={{
                borderColor: on ? "var(--ut-purple)" : "var(--ut-border)",
                color: on ? "var(--ut-purple)" : "var(--ut-white-faint)",
              }}
            >
              {r.title} ({count})
            </button>
          );
        })}
        <span
          className="font-mono text-[9px] tracking-[0.2em] uppercase"
          style={{ color: "var(--ut-white-faint)", opacity: 0.5 }}
          aria-live="polite"
        >
          showing {shown.length} of {items.length}
        </span>
      </div>

      <ul className="space-y-4">
        {shown.map((i) => {
          const c = i.connection;
          const oracleHref =
            `/oracle?view=desktop&researchTopicId=${encodeURIComponent(i.anchorId)}` +
            `&from=${encodeURIComponent("/research")}` +
            `&q=${encodeURIComponent(c.suggestedQuestion)}`;
          return (
            <li
              key={`${i.topicSlug}:${i.anchorSlug}`}
              data-nexus-relationship={i.anchorSlug}
              data-nexus-room={i.topicSlug}
              className="ut-card p-6"
              style={{ background: "rgba(147, 51, 234, 0.02)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-4 mb-2">
                <span
                  className="font-mono text-[9px] tracking-[0.25em] uppercase break-words"
                  style={{ color: BASIS_STYLE[c.basis].color, opacity: 0.75 }}
                >
                  {c.kind} · {BASIS_STYLE[c.basis].label}
                </span>
                <Link
                  href={i.topicRoute}
                  className="font-mono text-[9px] tracking-[0.2em] uppercase min-w-0 break-words focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                >
                  in {i.topicTitle} →
                </Link>
              </div>

              <h3
                className="font-display text-base md:text-lg mb-3"
                style={{ color: "var(--ut-white)" }}
              >
                {c.title}
              </h3>

              <dl className="space-y-2 mb-4">
                <div>
                  <dt
                    className="font-mono text-[9px] tracking-[0.25em] uppercase"
                    style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                  >
                    What it connects
                  </dt>
                  <dd>
                    <Link
                      href={c.href}
                      data-nexus-destination={i.anchorSlug}
                      className="font-body text-[13px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                      style={{ color: "var(--ut-cyan)" }}
                    >
                      {c.href}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt
                    className="font-mono text-[9px] tracking-[0.25em] uppercase"
                    style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                  >
                    Why it connects
                  </dt>
                  <dd
                    className="font-body text-[13px] leading-relaxed"
                    style={{ color: "var(--ut-white-dim)", opacity: 0.75 }}
                  >
                    {c.rationale}
                  </dd>
                </div>
                <div>
                  <dt
                    className="font-mono text-[9px] tracking-[0.25em] uppercase"
                    style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                  >
                    Its evidential basis
                  </dt>
                  <dd
                    className="font-body text-[13px] leading-relaxed"
                    style={{ color: BASIS_STYLE[c.basis].color, opacity: 0.85 }}
                    data-nexus-basis={c.basis}
                  >
                    {c.basisLabel} — {BASIS_STYLE[c.basis].note}
                  </dd>
                </div>
              </dl>

              {c.destinationNote ? (
                <p
                  className="font-mono text-[10px] leading-relaxed mb-4 break-words"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
                  data-nexus-destination-note={i.anchorSlug}
                >
                  Finding it once you are there: {c.destinationNote}
                </p>
              ) : null}

              <div
                className="pt-4 flex flex-col sm:flex-row sm:items-center gap-3"
                style={{ borderTop: "1px solid rgba(147, 51, 234, 0.1)" }}
              >
                <span
                  className="font-mono text-[9px] tracking-[0.25em] uppercase shrink-0"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                >
                  Continue
                </span>
                <Link
                  href={c.href}
                  className="font-mono text-[9px] tracking-[0.2em] uppercase shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                  style={{ color: "var(--ut-cyan)", opacity: 0.9 }}
                >
                  Open the record →
                </Link>
                <Link
                  href={oracleHref}
                  data-nexus-oracle={i.anchorSlug}
                  className="font-mono text-[9px] tracking-[0.2em] uppercase shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                  style={{ color: "var(--ut-purple)", opacity: 0.9 }}
                >
                  Ask the Oracle about this →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
