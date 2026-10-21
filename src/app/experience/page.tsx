import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PageBackground from "@/components/scenes/PageBackground";
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
  doing: string;
  preview?: string;
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
    doing: "Play a frequency · watch the field answer",
    preview: "/experience/previews/resonator.jpg",
    status: "live",
    line: "Sound made visible, and handed back to you.",
    body:
      "Choose a tone and the plate draws what it hears — branching filaments, nodal lines, a figure that holds while the note holds. Change the fundamental, pick a resonant world, or let it cycle on its own.",
    notes: ["Nine tones, 174 Hz to 963 Hz", "Worlds: Aether · Lotus · Tunnel · Temple · Prism · Pulse · Monsoon", "Opens when you choose · about 1 MB"],
    cta: "Enter the resonator",
  },
  {
    slug: "correspondence-codex",
    name: "Correspondence Codex",
    sigil: "✦",
    accent: "#e040fb",
    doing: "Browse 27 systems · open any record",
    preview: "/experience/previews/codex.jpg",
    status: "live",
    line: "Every record, open, on the smaller screen.",
    body:
      "The whole correspondence codex as a working surface: choose a system, open a record, and read what it corresponds to across the other twenty-six. It travels — this is the room built to be read on a phone.",
    notes: ["Choose a system, then open a record", "No account needed for any of it", "Opens when you choose"],
    cta: "Enter the codex",
  },
  {
    slug: "correspondence-continuum",
    name: "Correspondence Continuum",
    sigil: "⌬",
    accent: "#22d3ee",
    doing: "Move through 27 systems in three dimensions",
    preview: "/experience/previews/continuum.jpg",
    status: "live",
    line: "The correspondence field, held in three dimensions.",
    body:
      "The desktop counterpart: the same systems arranged as a field you move through, whole collections opening beside the thing you are reading. Click a node and the panel answers.",
    notes: ["Open a node and read its correspondences", "Best on a laptop or desktop display", "On a phone, the Codex is the lighter door"],
    cta: "Enter the continuum",
  },
  {
    slug: "cymatic-3d",
    name: "Cymatic 3D",
    sigil: "◈",
    accent: "#8b5cf6",
    doing: "Volumetric figures, still being built",
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
    doing: "The oldest instrument in the collection",
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
      <PageBackground variant="homepage" opacity={0.42} />
      <main className="ut-foreground ut-experience" style={{ background: "transparent" }}>
        <section className="pt-24 pb-10">
          <div className="container-ut">
            <div className="ut-rise">
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
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="container-ut">
            <div className="ut-rooms">
              {rooms.map((room, i) => (
                <div key={room.slug} className="ut-rise" style={{ animationDelay: `${i * 0.06}s` }}>
                  <article
                    className="ut-room"
                    data-experience={room.slug}
                    data-status={room.status}
                    style={{ ["--room-accent" as string]: room.accent } as React.CSSProperties}
                  >
                    {room.preview && (
                      <span className="ut-room-preview">
                        <Image
                          src={room.preview}
                          alt={`${room.name} interface`}
                          fill
                          sizes="(max-width: 820px) 100vw, 560px"
                          className="object-cover"
                        />
                      </span>
                    )}
                    <span className="ut-room-sigil" aria-hidden="true">{room.sigil}</span>
                    <div className="ut-room-head">
                      <h2 className="ut-room-name">{room.name}</h2>
                      <span className={`ut-room-status ut-room-status-${room.status}`}>
                        {room.status === "live" ? "Live" : "In development"}
                      </span>
                    </div>
                    <p className="ut-room-kind">{room.doing}</p>
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
                </div>
              ))}
            </div>

            <div className="ut-rise" style={{ animationDelay: "0.24s" }}>
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
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
