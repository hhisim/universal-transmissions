import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { artworks } from "@/data/artworks";
import PageBackground from "@/components/scenes/PageBackground";

export const metadata: Metadata = {
  title: "Prismatic Transmissions",
  description:
    "Six transmissions rendered in prismatic twilight tones — where the visible spectrum bleeds into the invisible.",
};

const prismaticArtworks = artworks.filter((a) => a.tags.includes("prismatic"));

export default function PrismaticPage() {
  return (
    <>
<PageBackground variant="gallery" /> <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          {/* Header */}
          <SectionReveal>
            <div className="text-center mb-4 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>
                [ Prismatic Series ]
              </p>
              <h1 className="font-display text-4xl md:text-6xl glow-cyan mb-4">
                <ZalgoText text="Prismatic Transmissions" intensity="moderate" />
              </h1>
              <p className="font-body text-lg max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
                Six transmissions rendered in prismatic twilight tones — where the visible spectrum bleeds into the invisible. Each piece is a composite of digital painting, 3D rendering, fractal composition, and cymatic imagery.
              </p>
            </div>
          </SectionReveal>

          {/* Back to all */}
          <SectionReveal delay={0.05}>
            <div className="text-center mb-12">
              <Link
                href="/gallery"
                className="font-mono text-[10px] tracking-widest uppercase hover:text-[var(--ut-cyan)] transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                ← All Works
              </Link>
            </div>
          </SectionReveal>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {prismaticArtworks.map((artwork, i) => (
              <SectionReveal key={artwork.id} delay={i * 0.08}>
                <Link
                  href={`/gallery/${artwork.slug}`}
                  className="artwork-card ut-card block overflow-hidden group"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={artwork.images[0]}
                      alt={artwork.title}
                      fill
                      unoptimized={true}
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="artwork-card-overlay">
                      <div>
                        <p className="font-heading text-sm tracking-widest uppercase" style={{ color: "var(--ut-cyan)" }}>
                          View →
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h2 className="font-heading text-base tracking-wider mb-1" style={{ color: "var(--ut-white)" }}>
                      {artwork.title}
                    </h2>
                    <p className="font-mono text-[10px] mb-2" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
                      {artwork.medium} · {artwork.year}
                    </p>
                    {artwork.available && artwork.price && (
                      <p className="font-mono text-xs" style={{ color: "var(--ut-gold)" }}>
                        From ${artwork.price}
                      </p>
                    )}
                  </div>
                </Link>
              </SectionReveal>
            ))}
          </div>
        </div>
      </main>
</>
  );
}
