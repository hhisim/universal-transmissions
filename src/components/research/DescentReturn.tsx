import Link from "next/link";
import { resolveRecordArrival } from "@/lib/research-descents";

/**
 * DescentReturn — the way back to the authored stop a visitor came from.
 *
 * Batch 40. Following a record should preserve the visitor's place: stops 2 and 3 of "Sound into Form"
 * open a Journal piece and an artwork, and both used to receive the context and show nothing.
 *
 * This is a SUPPLEMENT, never a replacement. It writes nothing — no storage, no cookie, no history
 * entry — so the Gallery's collection return and the Journal's search/filter return keep their own
 * saved context untouched. It renders only when the resolved stop's destination is the record actually
 * being served, so an unknown path, an unavailable stop, a malformed number or another record's
 * context produces no arrival claim and no control.
 */
export default function DescentReturn({
  recordPath,
  accent,
  searchParams,
}: {
  /** The canonical pathname of the record being served, e.g. `/gallery/hyperdimensional-harmonics`. */
  recordPath: string;
  accent: string;
  searchParams?: { path?: string; stop?: string };
}) {
  const { context } = resolveRecordArrival(recordPath, searchParams ?? {});
  if (!context) return null;

  return (
    <div
      className="container-ut pt-6 pb-2"
      data-descent-arrival={context.pathSlug}
      data-descent-stop={context.number}
    >
      <div className="max-w-5xl mx-auto">
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          style={{ border: `1px solid ${accent}2e`, background: "rgba(255,255,255,0.02)" }}
        >
          <p
            className="font-mono text-[10px] tracking-[0.3em] uppercase m-0"
            style={{ color: "var(--ut-white-dim)", opacity: 0.75 }}
          >
            Arrived from {context.pathTitle} · stop {context.number} of {context.total}
          </p>
          <Link
            href={context.href}
            className="inline-flex items-center font-mono text-[10px] tracking-[0.25em] uppercase px-3"
            style={{ color: "var(--ut-black)", background: accent, minHeight: 44, alignItems: "center" }}
            data-descent-return={context.pathSlug}
          >
            ← Return to stop {context.number}
          </Link>
        </div>
      </div>
    </div>
  );
}
