"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ResearchTopic, ResearchSource } from "@/lib/research-topics";

/**
 * The contextual Oracle entry for a research topic.
 *
 * Two rules this component exists to keep:
 *  - The visitor's draft is THEIR text. It is seeded from the registry, it may be
 *    edited or cleared, and it is never overwritten by a rerender, a background
 *    response or a route change.
 *  - Nothing is submitted automatically. The visitor always presses the control.
 */
export default function ResearchOraclePortal({
  topic,
  returnHref,
}: {
  topic: ResearchTopic;
  returnHref: string;
}) {
  // Seeded once. `useState`'s initialiser runs only on first mount, so a later
  // prop change or rerender cannot clobber what the visitor has typed.
  const [draft, setDraft] = useState(topic.suggestedQuestion);
  const [dirty, setDirty] = useState(false);
  const seeded = useRef(topic.suggestedQuestion);
  const cleared = draft.trim().length === 0;

  // Re-seed only when the topic itself genuinely changes, and only if the visitor
  // has not touched the field.
  useEffect(() => {
    if (dirty) return;
    if (topic.suggestedQuestion === seeded.current) return;
    seeded.current = topic.suggestedQuestion;
    setDraft(topic.suggestedQuestion);
  }, [topic.id, topic.suggestedQuestion, dirty]);

  const oracleHref =
    `/oracle?view=desktop&researchTopicId=${encodeURIComponent(
      `research-v1:${topic.id}`
    )}&from=${encodeURIComponent(returnHref)}` + (cleared ? "" : `&q=${encodeURIComponent(draft)}`);

  return (
    <div
      className="ut-card p-8 md:p-10"
      data-research-oracle-portal="true"
      style={{
        background:
          "linear-gradient(135deg, rgba(34, 211, 238, 0.05) 0%, rgba(10, 9, 14, 0.85) 100%)",
      }}
    >
      <p
        className="font-mono text-[9px] tracking-[0.4em] uppercase mb-3"
        style={{ color: "var(--ut-cyan)", opacity: 0.55 }}
      >
        [ Codex Oracle ]
      </p>
      <h3
        className="font-display text-xl mb-3"
        style={{ color: "var(--ut-white)" }}
      >
        Ask the Oracle about {topic.title}
      </h3>

      {/* Context chip: the stable identifier is resolved on the server. The title
          shown here comes from the registry record, not from the URL. */}
      <div
        className="inline-flex flex-wrap items-center gap-2 mb-5"
        data-research-chip="true"
      >
        <span
          className="font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-1"
          style={{
            color: "var(--ut-cyan)",
            border: "1px solid rgba(34, 211, 238, 0.25)",
            background: "rgba(34, 211, 238, 0.06)",
          }}
        >
          Research context · {topic.title}
        </span>
        <span
          className="font-mono text-[9px] tracking-[0.15em] uppercase px-2 py-1"
          style={{
            color: "var(--ut-white-faint)",
            border: "1px solid rgba(237, 233, 246, 0.12)",
          }}
        >
          id research-v1:{topic.id}
        </span>
        <Link
          href={returnHref}
          data-research-return="true"
          className="font-mono text-[9px] tracking-[0.2em] uppercase"
          style={{ color: "var(--ut-gold)", opacity: 0.85 }}
        >
          ← Back to {topic.title}
        </Link>
      </div>

      <p
        className="font-body text-[13px] leading-relaxed mb-4"
        style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
      >
        The Oracle is given this topic&apos;s verified record — its title, a bounded
        summary and its permitted references — resolved on the server. It cannot be told a
        different title or a different set of sources from the link. The question below is
        a starting point you can rewrite or clear.
      </p>

      <label
        className="block font-mono text-[9px] tracking-[0.25em] uppercase mb-2"
        style={{ color: "var(--ut-white-faint)" }}
        htmlFor="research-oracle-draft"
      >
        Suggested question — editable, never submitted automatically
      </label>
      <textarea
        id="research-oracle-draft"
        data-research-draft="true"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        rows={3}
        placeholder="Write your own question, or clear this and ask from scratch."
        className="w-full mb-4 font-body text-sm"
        style={{
          background: "rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(34, 211, 238, 0.18)",
          color: "var(--ut-white-dim)",
          padding: "12px 14px",
          borderRadius: 2,
        }}
      />

      <div className="flex flex-wrap items-center gap-4">
        {cleared ? (
          <span
            data-research-empty="true"
            className="font-mono text-[9px] tracking-[0.2em] uppercase"
            style={{ color: "var(--ut-gold)", opacity: 0.8 }}
          >
            Draft cleared — open the Oracle and write your own question
          </span>
        ) : (
          <a
            href={oracleHref}
            data-research-oracle-link="true"
            className="btn-primary"
            style={{ borderColor: "rgba(34, 211, 238, 0.4)", color: "var(--ut-cyan)" }}
          >
            OPEN IN THE ORACLE →
          </a>
        )}
        <span
          className="font-mono text-[9px] tracking-[0.15em] uppercase"
          style={{ color: "var(--ut-white-faint)", opacity: 0.5 }}
        >
          {draft.length} characters
        </span>
      </div>

      <details className="mt-6">
        <summary
          className="font-mono text-[9px] tracking-[0.25em] uppercase cursor-pointer"
          style={{ color: "var(--ut-white-faint)" }}
        >
          What the Oracle is given about this topic
        </summary>
        <ul className="mt-4 space-y-3">
          {topic.sources.map((s: ResearchSource) => (
            <li key={s.url} className="leading-relaxed">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-[12px] underline"
                style={{ color: "var(--ut-cyan)", opacity: 0.85 }}
              >
                {s.label}
              </a>
              <p
                className="font-mono text-[10px] mt-1"
                style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
              >
                {s.kind.toUpperCase()} · supports: {s.supports}
              </p>
            </li>
          ))}
        </ul>
        <p
          className="font-mono text-[10px] mt-4 leading-relaxed"
          style={{ color: "var(--ut-white-faint)", opacity: 0.55 }}
        >
          These are the topic&apos;s references, listed honestly. They are not citations
          for any particular sentence the Oracle may produce: the model is given this
          summary, not the full text of each document.
        </p>
      </details>
    </div>
  );
}
