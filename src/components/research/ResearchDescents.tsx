import Link from "next/link";
import { descentsForRoom, resolveDescentContext } from "@/lib/research-descents";

/**
 * ResearchDescents — the descents that actually visit this room, and the way back to one.
 *
 * Two facts, kept separate:
 *
 *   - INBOUND, if the visitor arrived from an authored stop, they get one clear control back to that
 *     exact path and stop number. It appears only when the context has been proved against the
 *     registry and against this room, so it never claims an arrival that did not happen.
 *   - ALWAYS, the room states which descents walk through it. These are derived from the authored
 *     paths at render time; the room does not keep a list of its own.
 *
 * Nothing here invents a relationship, a path or a stop: every link resolves to an authored number in
 * the existing registry, and the numbers shown are the authored ones.
 */
export default function ResearchDescents({
  topic,
  accent,
  searchParams,
}: {
  /** The room being served. Inbound context is checked against this. */
  topic: string;
  accent: string;
  searchParams?: { path?: string; stop?: string };
}) {
  const descents = descentsForRoom(topic);
  if (descents.length === 0) return null;

  const { context } = resolveDescentContext(topic, searchParams ?? {});

  return (
    <section
      className="py-16"
      style={{ borderTop: `1px solid ${accent}22` }}
      aria-labelledby="descents-heading"
      data-descents-room={topic}
      data-descent-context={context ? `${context.pathSlug}:${context.number}` : "none"}
    >
      <div className="container-ut">
        <div className="max-w-4xl mx-auto">
          <p
            className="font-mono text-[9px] tracking-[0.5em] uppercase mb-3"
            style={{ color: accent, opacity: 0.55 }}
          >
            [ Guided descents ]
          </p>
          <h2
            id="descents-heading"
            className="font-display text-xl md:text-2xl mb-4"
            style={{ color: "var(--ut-white)" }}
          >
            Descents through this room
          </h2>

          {context ? (
            <p className="font-body text-base mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}>
              You arrived from{" "}
              <strong style={{ color: "var(--ut-white)", fontWeight: 600 }}>{context.pathTitle}</strong>, stop{" "}
              {context.number} of {context.total}.
            </p>
          ) : (
            <p className="font-body text-base mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
              {descents.length === 1
                ? "One authored descent passes through this room."
                : `${descents.length} authored descents pass through this room.`}{" "}
              Each stop is an existing record; the order is the path&rsquo;s editorial reading.
            </p>
          )}

          {context && (
            <p className="mb-8">
              <Link
                href={context.href}
                className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] uppercase px-4"
                style={{
                  color: "var(--ut-black)",
                  background: accent,
                  minHeight: 44,
                  alignItems: "center",
                }}
                data-descent-return={context.pathSlug}
              >
                ← Return to {context.pathTitle}, stop {context.number}
              </Link>
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {descents.map((d) => (
              <li key={`${d.pathSlug}:${d.number}`}>
                <Link
                  href={d.href}
                  className="block p-4 transition-colors"
                  style={{
                    border: `1px solid ${accent}26`,
                    background: "rgba(255,255,255,0.02)",
                    minHeight: 44,
                  }}
                >
                  <span
                    className="font-mono text-[9px] tracking-[0.35em] uppercase block mb-1"
                    style={{ color: accent, opacity: 0.65 }}
                  >
                    {d.pathTitle} · stop {d.number} of {d.total}
                  </span>
                  <span className="font-display text-base block mb-1" style={{ color: "var(--ut-white)" }}>
                    {d.title}
                  </span>
                  <span
                    className="font-body text-sm leading-relaxed block"
                    style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}
                  >
                    {d.encounter}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
