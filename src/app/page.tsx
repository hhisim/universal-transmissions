import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import HomeVideo from "@/components/ui/HomeVideo";
import GlitchTagline from "@/components/ui/GlitchTagline";
import PageBackground from "@/components/scenes/PageBackground";
import { artworks } from "@/data/artworks";
import { getProduct } from "@/data/products";
import { GUIDED_PATHS } from "@/lib/guided-paths";
import { RESEARCH_DOMAINS, allRegisteredConnections } from "@/lib/research-topics";
import { CORPUS_SUMMARY, corpusRecordsClause } from "@/lib/corpus-summary";
import Image from "next/image";

const LogoHero = dynamic(
  () => import("@/components/hero/LogoHero").then((m) => m.LogoHero),
  { ssr: false, loading: () => <div className="h-screen bg-ut-void" /> }
);

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Visual Alchemy by Hakan Hisim",
  description:
    "Explore Hakan Hisim's visual alchemy: sacred geometry, symbolic art, the Universal Transmissions codex, and the language of the divine.",
};

const featuredArtworks = [
  artworks.find((a) => a.slug === "vitruvian-spirit")!,
  artworks.find((a) => a.slug === "crown-chakra")!,
  artworks.find((a) => a.slug === "prismatic-equation")!,
  artworks.find((a) => a.slug === "twilight-pantheism")!,
];

/**
 * The physical and digital editions, read from the products registry so a price or an
 * availability shown here cannot drift from the product a visitor actually buys.
 */
const codexPhysical = getProduct("universal-transmissions-codex-vol1-physical");
const codexDigital = getProduct("universal-transmissions-codex-vol1-digital");

/**
 * The ways into the world. Every count here is derived from the registry that owns it,
 * so a door cannot advertise a number the world does not actually hold.
 */
const DOORS = [
  {
    glyph: "❖",
    name: "The Codex",
    line: "The manuscript itself — 150 pages of xenolinguistic art, bound and available.",
    count: codexPhysical ? `from $${codexPhysical.price}` : "the book",
    href: "/codex",
    tint: "var(--ut-gold)",
  },
  {
    glyph: "◈",
    name: "The Gallery",
    line: "The transmissions themselves — each a door with its own record behind it.",
    count: `${artworks.length} works`,
    href: "/gallery",
    tint: "var(--ut-cyan)",
  },
  {
    glyph: "⌬",
    name: "The Research",
    line: "The rooms beneath the images: cymatics, linguistics, symbolism, geometry.",
    count: `${RESEARCH_DOMAINS.length} rooms`,
    href: "/research",
    tint: "var(--ut-magenta)",
  },
  {
    glyph: "✦",
    name: "Correspondence Archive",
    line: "The database behind the work — every record, open to read and to question.",
    count: `${CORPUS_SUMMARY.distinctIdentities} records · ${CORPUS_SUMMARY.systemCount} systems`,
    href: "/codex/archive",
    tint: "#a855f7",
  },
  {
    glyph: "⟁",
    name: "Guided Descents",
    line: "Curated orderings through material that already exists, one encounter at a time.",
    count: `${GUIDED_PATHS.length} paths`,
    href: "/paths",
    tint: "#8b5cf6",
  },
  {
    glyph: "◉",
    name: "The Oracle",
    line: "Ask, and be answered from the archive — with the records themselves beside the reply.",
    count: "a conversation",
    href: "/oracle",
    tint: "#22d3ee",
  },
  {
    glyph: "≋",
    name: "The Resonator",
    line: "The instrument at the end of the sound-into-form descent. It is built to be looked at.",
    count: "an instrument",
    href: "/experience/universal-resonator",
    tint: "#d4a847",
  },
];

/**
 * The thread is not chosen prose — it is a relationship the archive already records.
 *
 * `allRegisteredConnections()` is the same registry the research rooms publish from, so this
 * picks a real anchor: an artwork that a room names, with the basis the registry states for it.
 * If the registry ever stops naming it, the thread disappears rather than lying.
 */
function buildThread() {
  const entry = allRegisteredConnections().find((e) => e.connection.kind === "Artwork");
  if (!entry) return null;
  const slug = entry.connection.href.replace(/^\/gallery\//, "");
  const work = artworks.find((a) => a.slug === slug);
  if (!work) return null;
  const descents = GUIDED_PATHS.filter((path) =>
    path.stops.some((stop) => stop.topic === entry.topicSlug)
  );
  return { entry, work, descents };
}

export default function HomePage() {
  const firstPath = GUIDED_PATHS[0];
  const openingStop = firstPath?.stops[0];
  const thread = buildThread();
  const threadWork = thread?.work;
  const threadConnection = thread?.entry;
  const threadDescents = thread?.descents ?? [];
  const entranceWorks = featuredArtworks.slice(0, 4);
  // The same contract the gallery's own button uses: the artwork's identifier, a suggested
  // question about it, and a return target that comes back to this page.
  const oracleHref = threadWork
    ? "/oracle?view=desktop" +
      "&artworkId=" + encodeURIComponent(threadWork.id) +
      "&from=" + encodeURIComponent("/") +
      "&q=" + encodeURIComponent("Tell me about " + threadWork.title)
    : "/oracle";

  return (
    <>
      {/* The field is atmosphere, not content: it steps back so text and controls read. */}
      <PageBackground variant="homepage" opacity={0.5} />
      <main style={{ background: "var(--ut-black)" }}>
        <div style={{ paddingTop: 2, paddingBottom: 2, textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "var(--ut-black)", backdropFilter: "blur(10px)" }}>
          <p style={{ margin: 0, fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#f5e9ff", opacity: 0.82, animation: "utPortalRespectShift 8s linear infinite" }}>
            Signal mode — the portal, tuned for the phone in your hand. Fast. Readable. Still strange. The Codex, the Gallery and the records are a touch away.
          </p>
        </div>

        {/* ── HERO — the threshold ─────────────────────── */}
        <section className="ut-hero">
          <div className="ut-hero-emblem" aria-hidden="true">
            <LogoHero />
          </div>
          <div className="ut-hero-copy lg-margin lg-illuminated">
            <h1
              className="font-display text-4xl md:text-6xl lg:text-7xl tracking-[0.1em] ut-gradient-text"
              style={{ color: "var(--ut-white)" }}
            >
              <ZalgoText text="Universal Transmissions" intensity="moderate" />
            </h1>
            <GlitchTagline />
            <div className="ut-hero-actions">
              <Link href="/codex" className="lg-action lg-action--gold">
                DISCOVER THE CODEX
              </Link>
              <Link href="/gallery" className="lg-action lg-action--magenta">
                ENTER THE GALLERY
              </Link>
            </div>
            <p className="ut-hero-secondary">
              <Link href="/codex/archive">Search the Correspondence Archive</Link>
              <span aria-hidden="true">·</span>
              <Link href="/paths">Take a guided descent</Link>
            </p>
            <p className="ut-hero-note">
              The artistic project of Hakan Hisim — paintings, archival prints and a manuscript ten
              years in the making, with {CORPUS_SUMMARY.distinctIdentities} correspondence records
              and the instruments built from them beside it.
            </p>
          </div>
        </section>

        {/* ── THE ENTRANCE — the work itself, before any explanation ── */}
        <section className="ut-entrance" aria-label="Works in this archive">
          <ul className="ut-entrance-strip">
            {entranceWorks.map((work) => (
              <li key={work.id}>
                <Link href={`/gallery/${work.slug}`} className="ut-entrance-work">
                  <span className="ut-entrance-frame">
                    <Image
                      src={work.images[0]}
                      alt={work.title}
                      fill
                      sizes="(max-width: 640px) 44vw, (max-width: 1100px) 23vw, 250px"
                      className="object-contain"
                    />
                  </span>
                  <span className="ut-entrance-label">{work.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── THE BOOK — the manuscript itself, and how to own it ── */}
        <section className="ut-book lg-codex" aria-labelledby="ut-book-h">
          <div className="container-ut">
            <div className="ut-book-grid">
              <div className="ut-book-plates">
                <span className="ut-book-plate ut-book-cover">
                  <Image
                    src="/codex/book/vol1-cover.jpg"
                    alt="Universal Transmissions Codex Vol.1 — the cover"
                    fill
                    sizes="(max-width: 900px) 68vw, 360px"
                    className="object-contain"
                  />
                </span>
                <span className="ut-book-plate ut-book-spread">
                  <Image
                    src="/codex/book/spread-06.jpg"
                    alt="A spread from inside the Codex"
                    fill
                    sizes="(max-width: 900px) 46vw, 240px"
                    className="object-contain"
                  />
                </span>
              </div>

              <div className="ut-book-copy">
                <p className="ut-book-kicker">[ The Book ]</p>
                <h2 id="ut-book-h" className="font-display text-3xl md:text-5xl mb-5" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text="The Universal Transmissions Codex" intensity="subtle" />
                </h2>
                <p className="ut-book-lede">
                  150 pages of xenolinguistic art — alphabets remembered from ecstatic trance states,
                  sacred geometry rendered at fractal resolution, and symbolic systems that defy
                  conventional reading. PUR-bound on museum-grade semi-gloss art paper, every copy
                  hand-inspected.
                </p>

                {/* Prices and availability come from the products registry, so what is shown here is
                    what the product page charges. */}
                {codexPhysical?.available && (
                  <div className="ut-book-actions">
                    <Link
                      href={`/sanctum/${codexPhysical.slug}`}
                      className="btn-gold"
                      data-acquire="codex-physical"
                    >
                      Acquire the Physical Edition — ${codexPhysical.price}
                    </Link>
                    {codexDigital?.available && (
                      <Link
                        href={`/sanctum/${codexDigital.slug}`}
                        className="btn-secondary"
                        data-acquire="codex-digital"
                      >
                        Digital Edition — ${codexDigital.price}
                      </Link>
                    )}
                  </div>
                )}
                <p className="ut-book-more">
                  <Link href="/codex">Read about the book and its making →</Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── THE MOVING IMAGE (on demand: no video bytes on the initial path) ── */}
        <section className="relative py-12 flex items-center justify-center">
          <HomeVideo />
        </section>

        {/* ── SIX WAYS IN ──────────────────────────────── */}
        <section className="py-16" id="ways-in" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-10 max-w-3xl mx-auto">
                <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4" style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>
                  [ One world, six ways in ]
                </p>
                <h2 className="font-display text-3xl md:text-4xl mb-4" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text="Nothing here is separate" intensity="subtle" />
                </h2>
                <p className="font-body text-base" style={{ color: "var(--ut-white-dim)", opacity: 0.72 }}>
                  The galleries, the rooms, the records, the paths and the instruments are one archive
                  read at different depths. Begin anywhere; every door leads into the same world.
                </p>
              </div>
            </SectionReveal>

            <div className="ut-doors">
              {DOORS.map((door, i) => (
                <SectionReveal key={door.name} delay={i * 0.06}>
                  <Link
                    href={door.href}
                    className="ut-door"
                    style={{ ["--door-tint" as string]: door.tint } as React.CSSProperties}
                  >
                    <span className="ut-door-glyph" aria-hidden="true">{door.glyph}</span>
                    <span className="ut-door-body">
                      <span className="ut-door-name">{door.name}</span>
                      <span className="ut-door-line">{door.line}</span>
                    </span>
                    <span className="ut-door-foot">
                      <span className="ut-door-count">{door.count}</span>
                      <span className="ut-door-go" aria-hidden="true">→</span>
                    </span>
                  </Link>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── BEGIN HERE — a real curated descent ──────── */}
        {firstPath && (
          <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
            <div className="container-ut">
              <SectionReveal>
                <div className="ut-begin">
                  <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                    [ If you would rather be led ]
                  </p>
                  <h2 className="font-display text-3xl md:text-4xl mb-3" style={{ color: "var(--ut-white)" }}>
                    {firstPath.title}
                  </h2>
                  <p className="font-body text-base mb-4" style={{ color: "var(--ut-white-dim)", opacity: 0.78 }}>
                    {firstPath.theme}
                  </p>
                  {openingStop && (
                    <p className="ut-begin-encounter">{openingStop.encounter}</p>
                  )}
                  <div className="ut-begin-actions">
                    <Link href={`/paths/${firstPath.slug}`} className="btn-primary">
                      WALK THIS PATH · {firstPath.stops.length} STOPS
                    </Link>
                    <Link href="/paths" className="ut-text-link">
                      all guided descents →
                    </Link>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </section>
        )}

        {/* ── A THREAD — a relationship the registry already records ── */}
        {threadWork && threadConnection && (
          <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
            <div className="container-ut">
              <SectionReveal>
                <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-6" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>
                  [ Follow one thread ]
                </p>
                <div className="ut-thread">
                  <Link href={`/gallery/${threadWork.slug}`} className="ut-thread-work">
                    <span className="ut-thread-frame">
                      <Image
                        src={threadWork.images[0]}
                        alt={threadWork.title}
                        fill
                        sizes="(max-width: 860px) 100vw, 420px"
                        className="object-cover"
                      />
                    </span>
                    <span className="ut-thread-caption">
                      <strong>{threadWork.title}</strong>
                      <em>{threadWork.medium} · {threadWork.year}</em>
                    </span>
                  </Link>

                  <div className="ut-thread-steps">
                    <p className="ut-thread-intro">
                      Not a suggestion — a relationship the archive already records. The room{" "}
                      <strong>{threadConnection.topicTitle}</strong> names this work, and the registry
                      states the basis: <em>{threadConnection.connection.basisLabel}</em>.
                    </p>
                    <ol className="ut-thread-list">
                      <li>
                        <span className="ut-thread-step">01</span>
                        <span>
                          <strong>Look</strong> — the work itself, in the gallery.
                          <Link href={`/gallery/${threadWork.slug}`} className="ut-text-link"> open it →</Link>
                        </span>
                      </li>
                      <li>
                        <span className="ut-thread-step">02</span>
                        <span>
                          <strong>The room that names it</strong> — {threadConnection.topicTitle}.
                          <Link href={threadConnection.topicRoute} className="ut-text-link"> enter the room →</Link>
                        </span>
                      </li>
                      <li>
                        <span className="ut-thread-step">03</span>
                        <span>
                          <strong>Ask about this work</strong> — opens the Oracle already speaking
                          about it, with the way back here.
                          <Link href={oracleHref} className="ut-text-link"> ask the Oracle →</Link>
                        </span>
                      </li>
                      {threadDescents.length > 0 && (
                        <li>
                          <span className="ut-thread-step">04</span>
                          <span>
                            <strong>Keep going</strong> —{" "}
                            {threadDescents.length === 1
                              ? "one guided descent passes"
                              : `${threadDescents.length} guided descents pass`}{" "}
                            through this room.
                            <Link href={`/paths/${threadDescents[0].slug}`} className="ut-text-link">
                              {" "}{threadDescents[0].title} →
                            </Link>
                          </span>
                        </li>
                      )}
                    </ol>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </section>
        )}

        {/* ── MANIFESTO ───────────────────────────────── */}
        <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <div className="max-w-3xl mx-auto text-center">
              <SectionReveal>
                <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-6" style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>
                  [ The Transmission ]
                </p>
                <blockquote className="font-display text-2xl md:text-3xl leading-relaxed mb-8" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText
                    text="Embracing the notion of transcending syntax and linguistics, Universal Transmissions delves into the playful exploration of language as both a construct and a medium for transcendence."
                    intensity="subtle"
                  />
                </blockquote>
                <p className="font-body text-base" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                  Inspired by trans-dimensional linguistics and the esoteric realms of out-of-body experience, dimensional travel, and the Akashic Records — the UT collection serves as gateways to new dimensions of innerstanding. Each transmission is a composite of digital painting, 3D rendering, fractal composition, and symbolic encoding — created through a process that began with journals of incomprehensible text remembered from childhood dreams.
                </p>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── FEATURED ARTWORKS ─────────────────────────── */}
        <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="text-center mb-12">
                <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4" style={{ color: "var(--ut-cyan)", opacity: 0.5 }}>
                  [ Selected Transmissions ]
                </p>
                <h2 className="font-display text-3xl md:text-4xl" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text="From the Archive" intensity="subtle" />
                </h2>
              </div>
            </SectionReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredArtworks.slice(0, 2).map((artwork, i) => (
                <SectionReveal key={artwork.id} delay={i * 0.15}>
                  <Link href={`/gallery/${artwork.slug}`} className="artwork-card ut-card block overflow-hidden group">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={artwork.images[0]}
                        alt={artwork.title}
                        fill
                        unoptimized={true}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="artwork-card-overlay">
                        <p className="font-heading text-sm tracking-widest uppercase" style={{ color: "var(--ut-cyan)" }}>
                          View Transmission →
                        </p>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-heading text-base tracking-wider mb-1" style={{ color: "var(--ut-white)" }}>
                        {artwork.title}
                      </h3>
                      <p className="font-mono text-[10px]" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
                        {artwork.medium} · {artwork.year}
                      </p>
                    </div>
                  </Link>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal delay={0.2}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {featuredArtworks.slice(2).map((artwork) => (
                  <Link key={artwork.id} href={`/gallery/${artwork.slug}`} className="artwork-card ut-card block overflow-hidden group">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={artwork.images[0]}
                        alt={artwork.title}
                        fill
                        unoptimized={true}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="artwork-card-overlay">
                        <p className="font-heading text-sm tracking-widest uppercase" style={{ color: "var(--ut-cyan)" }}>
                          View Transmission →
                        </p>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-heading text-base tracking-wider mb-1" style={{ color: "var(--ut-white)" }}>
                        {artwork.title}
                      </h3>
                      <p className="font-mono text-[10px]" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
                        {artwork.medium} · {artwork.year}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionReveal>

            <SectionReveal delay={0.3}>
              <div className="text-center mt-12">
                <Link href="/gallery" className="btn-secondary">
                  View All Transmissions
                </Link>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── THE ARCHIVE IS OPEN (replaces the old tier grid) ── */}
        <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="ut-open">
                <p className="font-mono text-[9px] tracking-[0.5em] uppercase mb-4" style={{ color: "var(--ut-gold)", opacity: 0.55 }}>
                  [ Access ]
                </p>
                <p className="ut-open-line">
                  The correspondence archive is open to everyone — every record, searchable and
                  answerable without an account. An account keeps your place; it does not unlock the world.
                </p>
                <div className="ut-open-actions">
                  <Link href="/codex/archive" className="ut-text-link">read the archive →</Link>
                  <Link href="/signup" className="ut-text-link">keep your place →</Link>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────── */}
        <section className="py-32 text-center" style={{ borderTop: "1px solid rgba(217,70,239,0.04)" }}>
          <div className="container-ut">
            <SectionReveal>
              <h2 className="font-display text-3xl md:text-5xl glow-gold mb-6" style={{ color: "var(--ut-gold)" }}>
                <ZalgoText text="The transmission never ends." intensity="moderate" />
              </h2>
              <p className="text-sm md:text-base text-white/60 max-w-xl mx-auto mb-8 leading-relaxed">
                150 pages of xenolinguistic art, transcendent geometry, and hyperdimensional transmissions — decoded through five data layers, a pan-dimensional linguistic mystic. {corpusRecordsClause()}. The dataset is constantly evolving every day, the algorithm reinventing itself through a recursive novelty engine.
              </p>
              <Link href="/oracle" className="btn-primary">
                Consult the Oracle
              </Link>
            </SectionReveal>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes utPortalRespectShift {
          0% { color: hsl(0, 100%, 78%); text-shadow: 0 0 14px hsla(0,100%,60%,0.32); }
          25% { color: hsl(90, 100%, 76%); text-shadow: 0 0 14px hsla(90,100%,60%,0.32); }
          50% { color: hsl(190, 100%, 78%); text-shadow: 0 0 14px hsla(190,100%,60%,0.32); }
          75% { color: hsl(280, 100%, 80%); text-shadow: 0 0 14px hsla(280,100%,60%,0.32); }
          100% { color: hsl(360, 100%, 78%); text-shadow: 0 0 14px hsla(360,100%,60%,0.32); }
        }

        .ut-doors {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        @media (max-width: 900px) { .ut-doors { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px) { .ut-doors { grid-template-columns: 1fr; } }

        .ut-doors, .ut-begin, .ut-thread, .ut-open, .ut-entrance { position: relative; z-index: 1; }
        .ut-door {
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
          padding: 22px 20px 18px;
          border: 1px solid rgba(255,255,255,0.09);
          background:
            radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, var(--door-tint) 12%, transparent) 0%, transparent 55%),
            rgba(9, 8, 13, 0.88);
          text-decoration: none;
          transition: border-color 160ms ease, transform 160ms ease, background 160ms ease;
        }
        .ut-door:hover, .ut-door:focus-visible {
          border-color: color-mix(in srgb, var(--door-tint) 45%, transparent);
          transform: translateY(-2px);
        }
        .ut-door:focus-visible { outline: 2px solid var(--door-tint); outline-offset: 3px; }

        .ut-door-glyph {
          font-size: 20px;
          line-height: 1;
          color: var(--door-tint);
          opacity: 0.9;
          text-shadow: 0 0 18px color-mix(in srgb, var(--door-tint) 45%, transparent);
        }
        .ut-door-body { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .ut-door-name {
          font-family: var(--font-display, serif);
          font-size: 17px;
          letter-spacing: 0.06em;
          color: var(--ut-white, #ede9f6);
        }
        .ut-door-line {
          font-family: var(--font-body, system-ui);
          font-size: 13px;
          line-height: 1.55;
          color: rgba(237,233,246,0.74);
        }
        .ut-door-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .ut-door-count {
          font-family: var(--font-mono, monospace);
          font-size: 9.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--door-tint) 82%, white 8%);
        }
        .ut-door-go { color: rgba(237,233,246,0.35); transition: transform 160ms ease, color 160ms ease; }
        .ut-door:hover .ut-door-go { transform: translateX(3px); color: var(--door-tint); }

        .ut-begin {
          max-width: 720px;
          margin: 0 auto;
          padding: 30px 28px;
          border: 1px solid rgba(240,199,94,0.18);
          background:
            radial-gradient(120% 140% at 50% 0%, rgba(240,199,94,0.07) 0%, transparent 60%),
            rgba(9, 8, 13, 0.86);
          text-align: center;
        }
        .ut-begin-encounter {
          font-family: var(--font-body, system-ui);
          font-size: 14px;
          line-height: 1.7;
          color: rgba(237,233,246,0.72);
          border-left: 1px solid rgba(240,199,94,0.35);
          padding-left: 16px;
          text-align: left;
          margin: 0 auto 20px;
          max-width: 560px;
        }
        .ut-begin-actions { display: flex; align-items: center; justify-content: center; gap: 18px; flex-wrap: wrap; }

        .ut-text-link {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(237,233,246,0.6);
          text-decoration: none;
          border-bottom: 1px solid rgba(237,233,246,0.18);
          padding-bottom: 2px;
          transition: color 140ms ease, border-color 140ms ease;
        }
        .ut-text-link:hover, .ut-text-link:focus-visible {
          color: var(--ut-white, #ede9f6);
          border-color: var(--ut-magenta, #d946ef);
        }
        .ut-text-link:focus-visible { outline: 2px solid var(--ut-cyan, #22d3ee); outline-offset: 3px; }

        .ut-thread {
          display: grid;
          grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
          gap: 34px;
          align-items: start;
        }
        @media (max-width: 860px) { .ut-thread { grid-template-columns: 1fr; gap: 24px; } }

        .ut-thread-work { display: block; text-decoration: none; }
        .ut-thread-frame {
          position: relative;
          display: block;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .ut-thread-work:hover .ut-thread-frame { border-color: rgba(34,211,238,0.4); }
        .ut-thread-caption { display: block; padding-top: 12px; }
        .ut-thread-caption strong {
          display: block;
          font-family: var(--font-heading, sans-serif);
          font-size: 13px;
          letter-spacing: 0.04em;
          color: var(--ut-white, #ede9f6);
        }
        .ut-thread-caption em {
          display: block;
          margin-top: 4px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-style: normal;
          color: rgba(237,233,246,0.45);
        }
        .ut-thread-intro {
          font-family: var(--font-body, system-ui);
          font-size: 14px;
          line-height: 1.7;
          color: rgba(237,233,246,0.82);
          margin: 0 0 18px;
          padding: 14px 16px;
          border: 1px solid rgba(34, 211, 238, 0.16);
          background: rgba(9, 8, 13, 0.86);
        }
        .ut-thread-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
        .ut-thread-list li {
          display: flex;
          gap: 14px;
          align-items: baseline;
          font-family: var(--font-body, system-ui);
          font-size: 14px;
          line-height: 1.6;
          color: rgba(237,233,246,0.8);
          background: rgba(9, 8, 13, 0.78);
          padding: 12px 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .ut-thread-list li:last-child { border-bottom: none; padding-bottom: 0; }
        .ut-thread-list strong { color: var(--ut-white, #ede9f6); font-weight: 500; }
        .ut-thread-step {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.2em;
          color: rgba(34,211,238,0.7);
          flex: 0 0 auto;
        }

        .ut-open {
          max-width: 660px;
          margin: 0 auto;
          text-align: center;
        }
        .ut-open-line {
          font-family: var(--font-body, system-ui);
          font-size: 15px;
          line-height: 1.75;
          color: rgba(237,233,246,0.7);
          margin: 0 0 18px;
        }
        .ut-open-actions { display: flex; justify-content: center; gap: 22px; flex-wrap: wrap; }

        /* ── The threshold ────────────────────────────────────────────────
           The old hero was a fixed 60vh box with its copy pushed down by a 42vh
           margin, so the title, tagline and actions were clipped once the
           viewport was shorter than the sum of the two. The copy is now laid
           out instead of offset: the section grows to fit it, and the emblem
           takes the space above. */
        .ut-hero {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          min-height: clamp(520px, 76vh, 840px);
          padding-bottom: clamp(22px, 4vh, 52px);
          overflow: hidden;
        }
        .ut-hero-emblem { position: absolute; left: 0; right: 0; top: 0; bottom: 34%; z-index: 0; }
        .ut-hero-copy {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
          padding: 0 20px;
          background: radial-gradient(130% 100% at 50% 100%, rgba(6,5,10,0.86) 0%, rgba(6,5,10,0.45) 58%, transparent 100%);
        }
        .ut-book { padding: 4rem 0 3rem; border-top: 1px solid rgba(212,168,71,0.10); }
        .ut-book-grid { display: grid; grid-template-columns: minmax(0,0.95fr) minmax(0,1fr);
          gap: clamp(1.5rem, 4vw, 3.5rem); align-items: center; }
        .ut-book-plates { position: relative; display: grid;
          grid-template-columns: minmax(0,1.35fr) minmax(0,0.85fr); gap: 14px; align-items: center; }
        .ut-book-plate { position: relative; display: block; overflow: hidden;
          border: 1px solid rgba(212,168,71,0.22); box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
        .ut-book-cover { aspect-ratio: 900 / 830; }
        .ut-book-spread { aspect-ratio: 4 / 3; transform: translateY(-8%); }
        .ut-book-kicker { font-family: var(--font-mono, monospace); font-size: 10px;
          letter-spacing: 0.42em; text-transform: uppercase; color: var(--ut-gold); margin: 0 0 12px; }
        .ut-book-lede { font-size: 1.05rem; line-height: 1.75; color: var(--ut-white-dim);
          max-width: 46ch; margin: 0 0 24px; }
        .ut-book-actions { display: flex; flex-wrap: wrap; gap: 12px; }
        .ut-book-more { margin: 18px 0 0; font-family: var(--font-mono, monospace); font-size: 10px;
          letter-spacing: 0.18em; text-transform: uppercase; }
        .ut-book-more a { color: rgba(237,233,246,0.66); text-decoration: none;
          border-bottom: 1px solid rgba(212,168,71,0.35); padding-bottom: 2px; }
        .ut-book-more a:hover, .ut-book-more a:focus-visible { color: var(--ut-gold); }
        @media (max-width: 900px) {
          .ut-book { padding: 2.75rem 0 2rem; }
          .ut-book-grid { grid-template-columns: minmax(0,1fr); gap: 1.75rem; }
          .ut-book-actions { flex-direction: column; align-items: stretch; }
          .ut-book-actions a { text-align: center; }
        }
        .ut-hero-actions { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
        .ut-hero-secondary {
          display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: baseline;
          margin: 0; font-family: var(--font-mono, monospace); font-size: 10px;
          letter-spacing: 0.18em; text-transform: uppercase;
        }
        .ut-hero-secondary a { color: rgba(237,233,246,0.62); text-decoration: none;
          border-bottom: 1px solid rgba(34,211,238,0.3); padding-bottom: 2px; }
        .ut-hero-secondary a:hover, .ut-hero-secondary a:focus-visible { color: #22d3ee; }
        .ut-hero-secondary span { color: rgba(237,233,246,0.3); }
        .ut-hero-note {
          margin: 0;
          max-width: 620px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          line-height: 1.7;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(237, 233, 246, 0.62);
        }
        @media (max-width: 640px) {
          .ut-hero { min-height: clamp(440px, 84vh, 700px); }
          .ut-hero-emblem { bottom: 46%; }
          .ut-hero-note { font-size: 9px; letter-spacing: 0.12em; }
        }

        /* ── The entrance: real work, before any explanation ───────────── */
        .ut-entrance { padding: 8px 0 30px; }
        .ut-entrance-strip {
          list-style: none;
          margin: 0 auto;
          padding: 0 16px;
          max-width: 1200px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 900px) {
          .ut-entrance-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        }
        .ut-entrance-work { display: block; text-decoration: none; }
        .ut-entrance-frame {
          position: relative;
          display: block;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .ut-entrance-work:hover .ut-entrance-frame { border-color: rgba(34, 211, 238, 0.4); }
        .ut-entrance-work:focus-visible .ut-entrance-frame { outline: 2px solid #22d3ee; outline-offset: 2px; }
        .ut-entrance-label {
          display: block;
          margin-top: 8px;
          font-family: var(--font-heading, sans-serif);
          font-size: 10px;
          line-height: 1.4;
          letter-spacing: 0.03em;
          color: rgba(237, 233, 246, 0.6);
        }

        @media (prefers-reduced-motion: reduce) {
          .ut-door, .ut-door-go, .ut-text-link { transition: none !important; }
          .ut-door:hover, .ut-door:focus-visible { transform: none !important; }
          .ut-door:hover .ut-door-go { transform: none !important; }
          .ut-doors, .ut-thread { animation: none !important; }
        }
      `}</style>
    </>
  );
}
