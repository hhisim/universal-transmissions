import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { artworks, getArtwork } from "@/data/artworks";
import ArtworkHero from "@/components/gallery/ArtworkHero";
import ProgressiveDetailExplorer from "@/components/gallery/ProgressiveDetailExplorer";
import GalleryItemActions from "@/components/gallery/GalleryItemActions";
import ReturnToBrowse from "@/components/gallery/ReturnToBrowse";
import DescentReturn from "@/components/research/DescentReturn";
import PageBackground from "@/components/scenes/PageBackground";
import TranscriptionVideo from "@/components/ui/TranscriptionVideo";
import { ARTWORK_CONNECTION_GAPS, connectionsForArtwork } from "@/lib/artwork-connections";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_URL, seoDescription, seoTitle } from "@/lib/seo";
export const revalidate = 300;

/**
 * Batch 3 pilot scope. Exactly one artwork uses the progressive explorer; every
 * other artwork keeps its existing horizontal strip and behaviour untouched
 * until the pilot is reviewed.
 */
const PROGRESSIVE_PILOT_SLUG = "vitruvian-spirit";

/**
 * Registry indices (1-based, matching the order in src/data/artworks.ts) revealed
 * on first paint. Chosen by inspecting the series: they span the poster/lettering
 * plate (#1), the frontal face (#2), the globe (#3), the open triangular-panel
 * geometry (#35), the full-body mandala figure (#37) and the sparse spiral emblem
 * (#38). Remaining near-duplicate portrait and text-plate variants are held back
 * for later batches. No detail is removed: all 42 remain reachable.
 */
const PILOT_INITIAL_DETAIL_INDICES = [1, 2, 3, 35, 37, 38];

interface Props {
  params: { slug: string };
  searchParams?: { path?: string; stop?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artwork = getArtwork(params.slug);
  if (!artwork) return { title: "Not Found", robots: { index: false, follow: false } };
  const canonicalUrl = `${SITE_URL}/gallery/${artwork.slug}`;
  const socialImage = artwork.detailImages?.[0] || DEFAULT_OG_IMAGE;
  const imageUrl = absoluteUrl(socialImage);
  const metaTitle = seoTitle(artwork.title);
  const metaDescription = seoDescription(artwork.description);
  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: "website",
      url: canonicalUrl,
      images: [{ url: imageUrl, alt: artwork.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: [imageUrl],
    },
  };
}

export function generateStaticParams() {
  return artworks.map((a) => ({ slug: a.slug }));
}

export default function ArtworkDetailPage({ params, searchParams }: Props) {
  const artwork = getArtwork(params.slug);
  if (!artwork) notFound();

  /* Batch 18: the records that already belong to this work. Derived from Journal records
     that name it and from research rooms that already list it, so nothing is asserted
     here that is not asserted somewhere the archive can be checked against. */
  const connections = connectionsForArtwork(artwork.slug);
  const gaps = ARTWORK_CONNECTION_GAPS[artwork.slug] ?? [];

  return (
    <>
<PageBackground variant="gallery" />
      <main className="pt-24 pb-20 ut-foreground ut-gallery">

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
        <DescentReturn
          recordPath={`/gallery/${artwork.slug}`}
          accent="var(--ut-cyan)"
          searchParams={searchParams}
        />

        <div className="container-ut">
          <SectionReveal>
            {/* Batch 18: the artwork leads. A resized derivative arrives first and the
                full-resolution master is requested only on inspection — the approach the
                Vitruvian Spirit pilot proved for detail tiles, extended to the main work. */}
            <ArtworkHero src={artwork.images[0]} title={artwork.title} slug={artwork.slug} />
          </SectionReveal>
        </div>

        {/* ── DETAIL STRIP ─────────────────────────────── */}
        {artwork.detailImages.length > 0 && (
          <div className="container-ut mt-6">
            <SectionReveal>
              {/* Batch 18: the pilot's approach now runs for every work, not one.
                  Previously only Vitruvian Spirit was progressive; every other artwork
                  mounted its whole detail strip at once, so a 37-detail work pulled all
                  37 thumbnails on first paint. Unrevealed details are never mounted, so
                  they cannot start a request. The pilot keeps its curated seed; the rest
                  seed from the registry head, which is the honest default when no
                  curation exists for a work. */}
              <ProgressiveDetailExplorer
                title={artwork.title}
                details={artwork.detailImages.map((src, i) => ({
                  src,
                  registryIndex: i + 1,
                }))}
                initialRegistryIndices={
                  artwork.slug === PROGRESSIVE_PILOT_SLUG
                    ? PILOT_INITIAL_DETAIL_INDICES
                    : artwork.detailImages.slice(0, 6).map((_, i) => i + 1)
                }
              />
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
                <div className="mb-6">
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

                {/* Like button */}
                <GalleryItemActions slug={artwork.slug} />
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

        {/* ── LOOP PACK LINKS (root-chakra & sacral-chakra) ── */}
        {(artwork.slug === "root-chakra" || artwork.slug === "sacral-chakra") && (
          <div className="container-ut mt-8">
            <SectionReveal>
              <div
                className="ut-card p-6 border"
                style={{ borderColor: "rgba(217,70,239,0.1)" }}
              >
                <p
                  className="font-mono text-[9px] tracking-[0.2em] uppercase mb-3"
                  style={{ color: "var(--ut-gold)" }}
                >
                  Related Transmission
                </p>
                <p
                  className="font-body text-sm mb-4"
                  style={{ color: "var(--ut-white-dim)" }}
                >
                  {artwork.slug === "root-chakra"
                    ? "MEDITATION LOOP PACK — 4K Root Chakra Frequencies"
                    : "MEDITATION LOOP PACK — 8K Sacral Chakra Frequencies"}
                </p>
                <Link
                  href={
                    artwork.slug === "root-chakra"
                      ? "/sanctum/chakra-4k-loop-pack"
                      : "/sanctum/chakra-8k-loop-pack"
                  }
                  className="btn-gold"
                >
                  Get the Loop Pack →
                </Link>
              </div>
            </SectionReveal>
          </div>
        )}

        {/* ── TRANSCRIPTION VIDEO ─────────────────── */}
        {artwork.transcriptionVideoId && (
          <div className="container-ut mt-12">
            <SectionReveal>
              <TranscriptionVideo
                videoId={artwork.transcriptionVideoId}
                title={artwork.title}
              />
            </SectionReveal>
          </div>
        )}

        {/* ── ARCHIVE CONNECTIONS ───────────────────────── */}
        {/* Batch 18. Every entry is a record that already exists and is pointed at here;
            nothing is inferred from subject matter. The `basis` tells the visitor whether
            a link is documented in a record, a shared subject, or a UT interpretation,
            so the artwork's own recorded description is never blended with a reading. */}
        {(connections.length > 0 || gaps.length > 0) && (
          <div className="container-ut mt-12">
            <SectionReveal>
              <div className="border-t pt-8" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                  <h2
                    className="font-mono text-[9px] tracking-[0.15em] uppercase"
                    style={{ color: "rgba(212,168,71,0.4)" }}
                    data-artwork-connections="true"
                  >
                    IN THIS ARCHIVE
                  </h2>
                  <span className="font-mono text-[9px]" style={{ color: "var(--ut-white-faint)" }}>
                    {connections.length} related {connections.length === 1 ? "record" : "records"}
                  </span>
                </div>
                <p className="font-body text-sm mb-6" style={{ color: "rgba(237,233,246,0.4)" }}>
                  Records elsewhere in the archive that belong to this work. Each states why it
                  belongs and on what basis, so the work&apos;s recorded description stays
                  separate from an interpretation placed on it.
                </p>

                <ul className="flex flex-col gap-4">
                  {connections.map((c) => (
                    <li
                      key={c.anchorSlug}
                      className="ut-card p-5 border"
                      style={{ borderColor: "rgba(217,70,239,0.1)" }}
                      data-artwork-connection={c.anchorSlug}
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                        <span
                          className="font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 border"
                          style={{ borderColor: "rgba(212,168,71,0.25)", color: "var(--ut-gold)" }}
                          data-connection-kind={c.kind.toLowerCase()}
                        >
                          {c.kind}
                        </span>
                        <span
                          className="font-mono text-[9px] tracking-[0.15em] uppercase"
                          style={{ color: "var(--ut-white-faint)" }}
                          data-connection-basis={c.basis}
                        >
                          {c.basisLabel}
                        </span>
                      </div>
                      <p className="font-body text-sm mb-2" style={{ color: "var(--ut-white)" }}>
                        {c.title}
                      </p>
                      <p className="font-body text-xs mb-3" style={{ color: "var(--ut-white-dim)" }}>
                        {c.rationale}
                      </p>
                      <Link
                        href={c.href}
                        className="font-mono text-[9px] tracking-[0.2em] uppercase oracle-link"
                      >
                        Open this record →
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Honest absences: a missing record is stated, never filled with a near miss. */}
                {gaps.map((g) => (
                  <p
                    key={g}
                    className="font-mono text-[9px] mt-4 leading-relaxed"
                    style={{ color: "var(--ut-white-faint)" }}
                    data-connection-gap="true"
                  >
                    {g}
                  </p>
                ))}
              </div>
            </SectionReveal>
          </div>
        )}

        {/* ── ASK THE ORACLE ─────────────────────────── */}
        <div className="container-ut mt-12">
          <SectionReveal>
            <div
              className="border-t pt-8"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="font-mono text-[9px] tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(212,168,71,0.4)" }}>
                EXPLORE THIS TRANSMISSION
              </div>
              <p className="font-body text-sm mb-3" style={{ color: "rgba(237,233,246,0.4)" }}>
                Ask the Codex Oracle about the symbolism, geometry, and hidden correspondences within this piece.
              </p>
              <a
                href={`/oracle?view=desktop&artworkId=${encodeURIComponent(artwork.id)}&from=${encodeURIComponent(`/gallery/${artwork.slug}`)}&q=${encodeURIComponent(`Tell me about ${artwork.title}`)}`}
                className="font-heading text-[10px] tracking-[0.2em] uppercase oracle-link"
                data-artwork-oracle="true"
              >
                ASK THE ORACLE ABOUT THIS PIECE →
              </a>
            </div>
          </SectionReveal>
        </div>

        {/* ── NAVIGATE BACK ────────────────────────────── */}
        <div className="container-ut mt-10">
          <SectionReveal>
            <div
              className="border-t flex justify-between items-center pt-8"
              style={{ borderColor: "rgba(217,70,239,0.06)" }}
            >
              <ReturnToBrowse slug={artwork.slug} />
              <Link href="/codex" className="btn-secondary">
                EXPLORE THE CODEX →
              </Link>
            </div>
          </SectionReveal>
        </div>

      </main>
</>
  );
}
