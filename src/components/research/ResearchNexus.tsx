"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ResearchConnection } from "@/lib/research-connections";
import { BASIS_STYLE } from "./basis-style";

export interface NexusItem {
  topicSlug: string;
  topicTitle: string;
  topicRoute: string;
  anchorSlug: string;
  anchorId: string;
  connection: ResearchConnection;
  /** The references behind this relationship's room, shown so a visitor can see what it
   *  rests on rather than being told it is well sourced. */
  sources: Array<{ kind: string; label: string; url: string; internal?: boolean }>;
}

const keyOf = (i: NexusItem) => `${i.topicSlug}:${i.anchorSlug}`;

/**
 * Choosing a relationship, and inspecting it.
 *
 * A compact list on one side; the chosen relationship opened out beside it with what it
 * connects, why it connects, how well it is supported, the records behind it and where
 * to go next. On a narrow screen the list sits above the panel and the same controls
 * are reachable by keyboard.
 *
 * The list is a set of real buttons, so Tab and Enter work with no scripting at all, and
 * Up/Down move between relationships the way a list should. The panel is announced when
 * it changes. Nothing here fetches anything: every relationship is already in the page's
 * own data, so first paint stays light.
 */
export default function ResearchNexus({ items }: { items: NexusItem[] }) {
  const rooms = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach((i) => seen.set(i.topicSlug, i.topicTitle));
    return Array.from(seen.entries()).map(([slug, title]) => ({ slug, title }));
  }, [items]);

  const [room, setRoom] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(() => (items[0] ? keyOf(items[0]) : ""));
  const listRef = useRef<HTMLUListElement | null>(null);

  const shown = room ? items.filter((i) => i.topicSlug === room) : items;
  // Narrowing the list can hide the chosen relationship; fall back to the first one
  // still on screen rather than leaving an empty panel.
  const current = shown.find((i) => keyOf(i) === selected) ?? shown[0] ?? null;

  useEffect(() => {
    if (current && keyOf(current) !== selected) setSelected(keyOf(current));
  }, [current, selected]);

  function move(delta: number) {
    if (!shown.length || !current) return;
    const at = shown.findIndex((i) => keyOf(i) === keyOf(current));
    const next = shown[(at + delta + shown.length) % shown.length];
    setSelected(keyOf(next));
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-nexus-relationship="${next.anchorSlug}"]`)
      ?.focus();
  }

  return (
    <div data-research-nexus="true">
      {/* ── narrow by room ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-2 mb-6"
        role="group"
        aria-label="Narrow the relationships by room"
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
          Everything ({items.length})
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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5">
        {/* ── the compact list ─────────────────────────────────────────────── */}
        <ul
          ref={listRef}
          className="space-y-2"
          aria-label="Relationships to explore"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
            if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
          }}
        >
          {shown.map((i) => {
            const on = current !== null && keyOf(i) === keyOf(current);
            const c = i.connection;
            return (
              <li key={keyOf(i)}>
                <button
                  type="button"
                  onClick={() => setSelected(keyOf(i))}
                  aria-pressed={on}
                  data-nexus-relationship={i.anchorSlug}
                  data-nexus-room={i.topicSlug}
                  className="w-full text-left ut-card px-4 py-3 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                  style={{
                    background: on ? "rgba(147, 51, 234, 0.07)" : "rgba(147, 51, 234, 0.02)",
                    borderColor: on ? "rgba(147, 51, 234, 0.45)" : undefined,
                  }}
                >
                  <span
                    className="block font-mono text-[9px] tracking-[0.25em] uppercase mb-1"
                    style={{ color: BASIS_STYLE[c.basis].color, opacity: 0.8 }}
                  >
                    {i.topicTitle} · {c.kind}
                  </span>
                  <span
                    className="block font-body text-[13px] leading-snug"
                    style={{ color: "var(--ut-white)", opacity: on ? 1 : 0.8 }}
                  >
                    {c.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* ── the inspector ────────────────────────────────────────────────── */}
        {current ? (
          <div
            data-nexus-inspector={current.anchorSlug}
            className="ut-card p-6"
            style={{ background: "rgba(147, 51, 234, 0.03)" }}
            aria-live="polite"
          >
            <span
              className="inline-block font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-1 mb-3 border"
              style={{
                borderColor: BASIS_STYLE[current.connection.basis].color,
                color: BASIS_STYLE[current.connection.basis].color,
              }}
              data-nexus-basis={current.connection.basis}
            >
              {BASIS_STYLE[current.connection.basis].label}
            </span>
            <h3
              className="font-display text-lg md:text-xl mb-1"
              style={{ color: "var(--ut-white)" }}
            >
              {current.connection.title}
            </h3>
            <p
              className="font-mono text-[9px] tracking-[0.2em] uppercase mb-5"
              style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
            >
              {current.connection.kind} · in {current.topicTitle}
            </p>

            <dl className="space-y-4 mb-5">
              <div>
                <dt
                  className="font-mono text-[9px] tracking-[0.25em] uppercase mb-1"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                >
                  What it connects
                </dt>
                <dd>
                  <Link
                    href={current.connection.href}
                    data-nexus-destination={current.anchorSlug}
                    className="font-mono text-[12px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                    style={{ color: "var(--ut-cyan)" }}
                  >
                    {current.connection.href}
                  </Link>
                </dd>
              </div>
              <div>
                <dt
                  className="font-mono text-[9px] tracking-[0.25em] uppercase mb-1"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                >
                  Why it connects
                </dt>
                <dd
                  className="font-body text-[13px] leading-relaxed"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}
                >
                  {current.connection.rationale}
                </dd>
              </div>
              <div>
                <dt
                  className="font-mono text-[9px] tracking-[0.25em] uppercase mb-1"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
                >
                  How well it is supported
                </dt>
                <dd
                  className="font-body text-[13px] leading-relaxed"
                  style={{ color: BASIS_STYLE[current.connection.basis].color, opacity: 0.9 }}
                >
                  {current.connection.basisLabel}
                </dd>
                <dd
                  className="font-body text-[12px] leading-relaxed mt-1"
                  style={{ color: "var(--ut-white-faint)", opacity: 0.65 }}
                >
                  {BASIS_STYLE[current.connection.basis].note}
                </dd>
              </div>
            </dl>

            {current.connection.destinationNote ? (
              <p
                className="font-mono text-[10px] leading-relaxed mb-5 break-words"
                style={{ color: "var(--ut-white-faint)", opacity: 0.7 }}
                data-nexus-destination-note={current.anchorSlug}
              >
                Finding your way there: {current.connection.destinationNote}
              </p>
            ) : null}

            {/* The records behind the relationship. */}
            <div className="mb-5" data-nexus-records={current.anchorSlug}>
              <p
                className="font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
                style={{ color: "var(--ut-white-faint)", opacity: 0.6 }}
              >
                The records behind it
              </p>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={current.connection.href}
                    className="font-body text-[13px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                    style={{ color: "var(--ut-cyan)" }}
                  >
                    {current.connection.title}
                  </Link>
                  <span
                    className="font-mono text-[10px] ml-2"
                    style={{ color: "var(--ut-white-faint)", opacity: 0.55 }}
                  >
                    the {current.connection.kind.toLowerCase()} itself
                  </span>
                </li>
                <li>
                  <Link
                    href={current.topicRoute}
                    className="font-body text-[13px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                    style={{ color: "var(--ut-cyan)" }}
                  >
                    {current.topicTitle}
                  </Link>
                  <span
                    className="font-mono text-[10px] ml-2"
                    style={{ color: "var(--ut-white-faint)", opacity: 0.55 }}
                  >
                    the room it belongs to
                  </span>
                </li>
                {current.sources
                  .filter((s) => !s.internal)
                  .map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-[13px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                        style={{ color: "var(--ut-gold)" }}
                      >
                        {s.label}
                      </a>
                      <span
                        className="font-mono text-[10px] ml-2"
                        style={{ color: "var(--ut-white-faint)", opacity: 0.55 }}
                      >
                        {s.kind} source
                      </span>
                    </li>
                  ))}
              </ul>
            </div>

            <div
              className="pt-4 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ borderTop: "1px solid rgba(147, 51, 234, 0.1)" }}
            >
              <Link
                href={current.connection.href}
                className="font-mono text-[9px] tracking-[0.2em] uppercase shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                style={{ color: "var(--ut-cyan)", opacity: 0.9 }}
              >
                Open the record →
              </Link>
              <Link
                href={
                  `/oracle?view=desktop&researchTopicId=${encodeURIComponent(current.anchorId)}` +
                  `&from=${encodeURIComponent("/research")}` +
                  `&q=${encodeURIComponent(current.connection.suggestedQuestion)}`
                }
                data-nexus-oracle={current.anchorSlug}
                className="font-mono text-[9px] tracking-[0.2em] uppercase shrink-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan"
                style={{ color: "var(--ut-purple)", opacity: 0.9 }}
              >
                Ask the Oracle about this →
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
