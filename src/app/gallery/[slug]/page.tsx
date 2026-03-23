import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { artworks, getArtwork } from "@/data/artworks";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artwork = getArtwork(params.slug);
  if (!artwork) return { title: "Not Found" };
  return {
    title: artwork.title,
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
        <div className="container-ut">
          {/* Breadcrumb */}
          <SectionReveal>
            <div className="flex items-center gap-2 mb-8 font-mono text-[10px]" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
              <Link href="/gallery" className="hover:text-[var(--ut-cyan)] transition-colors">Gallery</Link>
              <span>/</span>
              <span>{artwork.title}</span>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Image gallery */}
            <SectionReveal direction="left">
              <div>
                <div className="relative aspect-square glow-border-cyan mb-4" style={{ borderColor: "rgba(0,229,255,0.2)" }}>
                  <Image
                    src={artwork.images[0]}
                    alt={artwork.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                {/* Detail strip — horizontal scroll */}
                {artwork.images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {artwork.images.map((img, i) => (
                      <div key={i} className="relative flex-shrink-0 w-20 h-20 border" style={{ borderColor: "rgba(0,229,255,0.15)" }}>
                        <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionReveal>

            {/* Info */}
            <SectionReveal direction="right" delay={0.15}>
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--ut-cyan)" }}>
                  [{artwork.id}]
                </p>
                <h1 className="font-display text-3xl md:text-4xl mb-4 glow-cyan" style={{ color: "var(--ut-cyan)" }}>
                  <ZalgoText text={artwork.title} intensity="subtle" />
                </h1>

                <div className="flex flex-wrap gap-4 mb-8 font-mono text-[10px]" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                  <span>{artwork.year}</span>
                  <span>·</span>
                  <span>{artwork.medium}</span>
                </div>

                <div className="sacred-divider mb-8" />

                <p className="font-body text-lg leading-relaxed mb-8" style={{ color: "var(--ut-white-dim)" }}>
                  {artwork.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-10">
                  {artwork.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border"
                      style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white-dim)", opacity: 0.5 }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Price + CTA */}
                {artwork.available ? (
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {artwork.price && (
                      <p className="font-display text-2xl" style={{ color: "var(--ut-gold)" }}>
                        ${artwork.price}
                      </p>
                    )}
                    <Link href="/store" className="btn-primary">
                      <ZalgoText text="Purchase Print" intensity="subtle" />
                    </Link>
                  </div>
                ) : (
                  <p className="font-mono text-sm" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                    [ Currently not available ]
                  </p>
                )}
              </div>
            </SectionReveal>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
