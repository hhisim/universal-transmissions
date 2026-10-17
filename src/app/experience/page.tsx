import type { Metadata } from "next";
import Link from "next/link";
import PageBackground from "@/components/scenes/PageBackground";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { allRegisteredConnections } from "@/lib/research-topics";

export const metadata: Metadata = {
  alternates: { canonical: "/experience" },
  title: "The Experience Portal",
  description:
    "Five rooms built from the same archive: the Universal Resonator, the Cymatic 3D engine, the Cymatic Tonoscope, the Correspondence Codex and the Correspondence Continuum.",
};

/**
 * The portal.
 *
 * A reading page, and only a reading page. Nothing here is mounted on arrival:
 * no iframe, no instrument bundle, no worker, no audio graph, and no microphone
 * request. Each room's payload is requested for the first time when a visitor
 * chooses to enter it from its own page.
 *
 * Two of the five rooms are honest about being unfinished, because they are.
 */
type Room = {
  slug: string;
  name: string;
  sigil: string;
  accent: string;
  kind: string;
  status: "live" | "building";
  line: string;
  body: string;
  notes: string[];
  cta: string;
};

const ROOMS: Room[] = [
  {
    slug: "universal-resonator",
    name: "Universal Resonator",
    sigil: "≋",
    accent: "#d4a847",
    kind: "WebGL plate · Web Audio · solver worker",
    status: "live",
    line: "Sound made visible, and handed back to you.",
    body:
      "A resonant plate you play. Feed it a tone and a solver turns what it hears into standing figures; move them, hold one, or let the field keep turning on its own. The microphone is yours to switch on from inside the instrument — it is never requested from out here.",
    notes: ["Keyboard and touch controls inside", "≈ 1 MB, launched when you choose", "Leave it and the graphics and audio stop with it"],
    cta: "Enter the resonator",
  },
  {
    slug: "correspondence-codex",
    name: "Correspondence Codex",
    sigil: "✦",
    accent: "#e040fb",
    kind: "Full codex surface · mobile-first",
    status: "live",
    line: "Every record, open, on the smaller screen.",
    body:
      "The whole correspondence codex as a working surface: all twenty-seven systems and every record in them, browsable, searchable and open to question without an account. This is the room that travels — it is built to be usable on a phone.",
    notes: ["No account needed to read any of it", "Opens in place; leave and it unloads", "Initiate adds the Codex II process archive"],
    cta: "Enter the codex",
  },
  {
    slug: "correspondence-continuum",
    name: "Correspondence Continuum",
    sigil: "⌬",
    accent: "#22d3ee",
    kind: "Three.js workspace · built for a large screen",
    status: "live",
    line: "The correspondence field, held in three dimensions.",
    body:
      "The desktop counterpart: the same twenty-seven systems arranged as a field you move through, with whole collections opened beside the thing you are reading. It wants space — a laptop or a large display — and it rewards wandering.",
    notes: ["Extended by three.js, so it loads its own engine", "Best on a laptop or desktop display", "On a phone, the Codex is the lighter door"],
    cta: "Enter the continuum",
  },
  {
    slug: "cymatic-3d",
    name: "Cymatic 3D",
    sigil: "◈",
    accent: "#8b5cf6",
    kind: "Volumetric cymatic engine",
    status: "building",
    line: "A cymatic environment with depth.",
    body:
      "The plate given volume: figures that form in three dimensions rather than on a surface. The engine is still being built, so the room shows its place in the portal rather than pretending to be a finished tool.",
    notes: ["In development", "The card stays so the portal reads whole"],
    cta: "See where it stands",
  },
  {
    slug: "cymatic-tonoscope",
    name: "Cymatic Tonoscope",
    sigil: "◎",
    accent: "#22d3ee",
    kind: "The plate that shows sound",
    status: "building",
    line: "The oldest instrument in the collection.",
    body:
      "A tonoscope is a surface that draws what a voice does to it — the plainest possible demonstration of sound becoming form. This one is still in development.",
    notes: ["In development", "The card stays so the portal reads whole"],
    cta: "See where it stands",
  },
];

/** Rooms the archive itself names — derived, never asserted by this page. */
function registeredFor(href: string) {
  return allRegisteredConnections().filter((entry) => entry.connection.href === href);
}

export default function ExperienceIndexPage() {
  const rooms = ROOMS.map((room) => ({
    ...room,
    registered: registeredFor(`/experience/${room.slug}`),
  }));
  const live = rooms.filter((r) => r.status === "live").length;

  return (
    <>
      <PageBackground variant="homepage" opacity={0.5} />
      <main style={{ background: "transparent" }}>
        <section className="pt-24 pb-10">
          <div className="container-ut">
            <SectionReveal>
              <div className="ut-portal-head">
                <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4" style={{ color: "var(--ut-gold)", opacity: 0.62 }}>
                  [ Experience portal ]
                </p>
                <h1 className="font-display text-4xl md:text-6xl mb-4" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text="The Instruments" intensity="subtle" />
                </h1>
                <p className="ut-portal-lede">
                  Five rooms built from the same archive. Three of them are working instruments you can
                  play with; two are still being built, and say so. Nothing on this page starts by
                  itself — every room opens when you open it.
                </p>
                <p className="ut-portal-count">
                  {live} of {rooms.length} rooms are live · nothing loads until you enter
                </p>
              </div>
            </SectionReveal>
          </div>
        </section>

        <section className="pb-20">
          <div className="container-ut">
            <div className="ut-rooms">
              {rooms.map((room, i) => (
                <SectionReveal key={room.slug} delay={i * 0.05}>
                  <article
                    className="ut-room"
                    data-experience={room.slug}
                    data-status={room.status}
                    style={{ ["--room-accent" as string]: room.accent } as React.CSSProperties}
                  >
                    <span className="ut-room-sigil" aria-hidden="true">{room.sigil}</span>
                    <div className="ut-room-head">
                      <h2 className="ut-room-name">{room.name}</h2>
                      <span className={`ut-room-status ut-room-status-${room.status}`}>
                        {room.status === "live" ? "Live" : "In development"}
                      </span>
                    </div>
                    <p className="ut-room-kind">{room.kind}</p>
                    <p className="ut-room-line">{room.line}</p>
                    <p className="ut-room-body">{room.body}</p>
                    <ul className="ut-room-notes">
                      {room.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                    {room.registered.length > 0 && (
                      <p className="ut-room-registered">
                        Named in the archive:{" "}
                        {room.registered.map((entry, n) => (
                          <span key={entry.anchorId}>
                            {n > 0 && " · "}
                            <Link href={entry.topicRoute} className="ut-text-link">
                              {entry.topicTitle}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
                    <Link href={`/experience/${room.slug}`} className="ut-room-enter">
                      {room.cta} <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.2}>
              <div className="ut-portal-foot">
                <p>
                  Every room opens onto the same archive. Leave any of them and the instrument goes with
                  you — nothing keeps running in the background.
                </p>
                <div className="ut-portal-foot-links">
                  <Link href="/codex/archive" className="ut-text-link">read the archive →</Link>
                  <Link href="/paths" className="ut-text-link">take a guided descent →</Link>
                  <Link href="/research" className="ut-text-link">into the research rooms →</Link>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>
      </main>

      <style>{`
        .ut-portal-head { max-width: 780px; }
        .ut-portal-lede {
          font-family: var(--font-body, system-ui);
          font-size: 16px;
          line-height: 1.75;
          color: rgba(237, 233, 246, 0.78);
          margin: 0 0 14px;
        }
        .ut-portal-count {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(212, 168, 71, 0.7);
          margin: 0;
        }

        .ut-rooms { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 820px) { .ut-rooms { grid-template-columns: 1fr; } }

        .ut-room {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
          padding: 26px 24px 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--room-accent) 12%, transparent) 0%, transparent 58%),
            rgba(9, 8, 13, 0.88);
        }
        .ut-room:hover { border-color: color-mix(in srgb, var(--room-accent) 42%, transparent); }
        .ut-room-sigil {
          font-size: 22px;
          line-height: 1;
          color: var(--room-accent);
          text-shadow: 0 0 20px color-mix(in srgb, var(--room-accent) 45%, transparent);
        }
        .ut-room-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .ut-room-name {
          margin: 0;
          font-family: var(--font-display, serif);
          font-size: 21px;
          letter-spacing: 0.04em;
          color: var(--ut-white, #ede9f6);
        }
        .ut-room-status {
          font-family: var(--font-mono, monospace);
          font-size: 8.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          padding: 4px 8px;
          border: 1px solid currentColor;
          white-space: nowrap;
        }
        .ut-room-status-live { color: rgba(120, 220, 170, 0.9); }
        .ut-room-status-building { color: rgba(237, 233, 246, 0.42); }
        .ut-room-kind {
          margin: 0;
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--room-accent) 72%, rgba(237, 233, 246, 0.5));
        }
        .ut-room-line {
          margin: 2px 0 0;
          font-family: var(--font-display, serif);
          font-size: 15px;
          line-height: 1.5;
          color: rgba(237, 233, 246, 0.92);
        }
        .ut-room-body {
          margin: 0;
          font-family: var(--font-body, system-ui);
          font-size: 13.5px;
          line-height: 1.7;
          color: rgba(237, 233, 246, 0.72);
        }
        .ut-room-notes {
          list-style: none;
          margin: 4px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .ut-room-notes li {
          position: relative;
          padding-left: 14px;
          font-family: var(--font-mono, monospace);
          font-size: 9.5px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(237, 233, 246, 0.5);
        }
        .ut-room-notes li::before { content: "—"; position: absolute; left: 0; color: color-mix(in srgb, var(--room-accent) 60%, transparent); }
        .ut-room-registered {
          margin: 6px 0 0;
          font-family: var(--font-mono, monospace);
          font-size: 9.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(237, 233, 246, 0.46);
        }
        .ut-room-enter {
          margin-top: auto;
          padding-top: 14px;
          align-self: flex-start;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--room-accent);
          border-bottom: 1px solid color-mix(in srgb, var(--room-accent) 40%, transparent);
          transition: border-color 150ms ease, color 150ms ease;
        }
        .ut-room-enter:hover, .ut-room-enter:focus-visible {
          color: var(--ut-white, #ede9f6);
          border-color: var(--ut-white, #ede9f6);
        }
        .ut-room-enter:focus-visible { outline: 2px solid var(--room-accent); outline-offset: 3px; }
        .ut-room:focus-within { border-color: color-mix(in srgb, var(--room-accent) 42%, transparent); }

        .ut-portal-foot {
          margin-top: 30px;
          padding: 22px 24px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(9, 8, 13, 0.8);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .ut-portal-foot p {
          margin: 0;
          max-width: 620px;
          font-family: var(--font-body, system-ui);
          font-size: 14px;
          line-height: 1.7;
          color: rgba(237, 233, 246, 0.7);
        }
        .ut-portal-foot-links { display: flex; gap: 18px; flex-wrap: wrap; }

        .ut-text-link {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(237, 233, 246, 0.6);
          text-decoration: none;
          border-bottom: 1px solid rgba(237, 233, 246, 0.18);
          padding-bottom: 2px;
          transition: color 140ms ease, border-color 140ms ease;
        }
        .ut-text-link:hover, .ut-text-link:focus-visible {
          color: var(--ut-white, #ede9f6);
          border-color: var(--ut-magenta, #d946ef);
        }
        .ut-text-link:focus-visible { outline: 2px solid var(--ut-cyan, #22d3ee); outline-offset: 3px; }

        @media (prefers-reduced-motion: reduce) {
          .ut-room, .ut-room-enter, .ut-text-link { transition: none !important; }
        }
      `}</style>
    </>
  );
}
