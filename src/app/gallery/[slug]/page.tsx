import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { artworks, getArtwork } from "@/data/artworks";
import Lightbox from "@/components/gallery/Lightbox";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artwork = getArtwork(params.slug);
  if (!artwork) return { title: "Not Found" };
  return {
    title: `${artwork.title} — Universal Transmissions`,
    description: artwork.description,
  };
}

export function generateStaticParams() {
  return artworks.map((a) => ({ slug: a.slug }));
}

export default function ArtworkDetailPage({ params }: Props) {
  const artwork = getArtwork(params.slug);
  if (!artwork) notFound();

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>

        {/* ── BREADCRUMB ───────────────────────────────── */}
        <div className="container-ut pt-8 pb-4">
          <div
            className="flex items-center gap-2 mb-6 font-mono text-[10px] tracking-widest uppercase"
            style={{ color: "var(--ut-white-faint)" }}
          >
            <Link href="/gallery" className="hover:text-[var(--ut-magenta)] transition-colors">
              Gallery
            </Link>
            <span style={{ color: "var(--ut-white-faint)", opacity: 0.3 }}>›</span>
            <span className="truncate">{artwork.title}</span>
          </div>
        </div>

        {/* ── MAIN ARTWORK ─────────────────────────────── */}
        <div className="container-ut">
          <SectionReveal>
            <Lightbox
              mainImage={artwork.images[0]}
              title={artwork.title}
            />
          </SectionReveal>
        </div>

        {/* ── DETAIL STRIP ─────────────────────────────── */}
        {artwork.detailImages.length > 0 && (
          <div className="container-ut mt-6">
            <SectionReveal>
              <div>
                <div
                  className="flex items-center gap-3 mb-4 font-mono text-[10px] tracking-[0.25em] uppercase"
                  style={{ color: "var(--ut-white-faint)" }}
                >
                  <span>Detail Views</span>
                  <span style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>—</span>
                  <span>Scroll →</span>
                </div>
                <div
                  className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {artwork.detailImages.map((img, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 w-28 h-28 md:w-36 md:h-36 relative overflow-hidden border chromatic-hover snap-start"
                      style={{
                        borderColor: "rgba(217,70,239,0.12)",
                        borderRadius: "2px",
                      }}
                    >
                      <Lightbox.ImageThumb
                        src={img}
                        alt={`${artwork.title} detail ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </div>
        )}

        {/* ── INFO SECTION ─────────────────────────────── */}
        <div className="container-ut mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: Title + Description */}
            <SectionReveal direction="left">
              <div>
                <p
                  className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
                  style={{ color: "var(--ut-magenta)", opacity: 0.6 }}
                >
                  [{artwork.id}]
                </p>
                <h1
                  className="font-display text-3xl md:text-4xl lg:text-5xl mb-6 leading-tight ut-gradient-text"
                  style={{ color: "var(--ut-white)" }}
                >
                  <ZalgoText text={artwork.title} intensity="moderate" />
                </h1>

                <div className="divider-spectrum mb-8" />

                <p
                  className="font-body text-lg leading-relaxed mb-8"
                  style={{ color: "var(--ut-white-dim)" }}
                >
                  {artwork.description}
                </p>

                {/* Series link */}
                <div className="mb-8">
                  <p
                    className="font-mono text-[10px] tracking-widest uppercase mb-2"
                    style={{ color: "var(--ut-white-faint)" }}
                  >
                    Series
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {artwork.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border"
                        style={{
                          borderColor: "rgba(217,70,239,0.15)",
                          color: "var(--ut-white-dim)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </SectionReveal>

            {/* Right: Metadata + CTA */}
            <SectionReveal direction="right" delay={0.15}>
              <div
                className="ut-card p-8"
                style={{ borderColor: "rgba(217,70,239,0.1)" }}
              >
                {/* Metadata grid */}
                <div className="space-y-4 mb-10">
                  {[
                    { label: "Year", value: String(artwork.year) },
                    { label: "Medium", value: artwork.medium },
                    { label: "Availability", value: artwork.available ? "Available as archival print" : "Not currently available" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <p
                        className="font-mono text-[9px] tracking-[0.2em] uppercase"
                        style={{ color: "var(--ut-white-faint)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="font-body text-sm"
                        style={{ color: "var(--ut-white-dim)" }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="divider-spectrum mb-8" />

                {/* Purchase CTA */}
                {artwork.available ? (
                  <div className="flex flex-col gap-4">
                    {artwork.price && (
                      <p
                        className="font-display text-3xl"
                        style={{ color: "var(--ut-gold)" }}
                      >
                        From ${artwork.price}
                      </p>
                    )}
                    <Link href="/sanctum" className="btn-gold w-full justify-center text-center">
                      ACQUIRE THIS TRANSMISSION
                    </Link>
                    <p
                      className="font-mono text-[9px] text-center"
                      style={{ color: "var(--ut-white-faint)" }}
                    >
                      Hand-signed · Archival quality · Worldwide shipping
                    </p>
                  </div>
                ) : (
                  <p
                    className="font-mono text-sm text-center"
                    style={{ color: "var(--ut-white-faint)" }}
                  >
                    [ Currently not available ]
                  </p>
                )}
              </div>
            </SectionReveal>
          </div>
        </div>

        {/* ── NAVIGATE BACK ────────────────────────────── */}
        <div className="container-ut mt-16">
          <SectionReveal>
            <div
              className="border-t flex justify-between items-center pt-8"
              style={{ borderColor: "rgba(217,70,239,0.06)" }}
            >
              <Link href="/gallery" className="btn-secondary">
                ← BACK TO GALLERY
              </Link>
              <Link href="/codex" className="btn-secondary">
                EXPLORE THE CODEX →
              </Link>
            </div>
          </SectionReveal>
        </div>

      </main>
      <Footer />
    </>
  );
}
