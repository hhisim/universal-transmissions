"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import TransmissionStream from "@/components/gallery/TransmissionStream";
import DriveGrid from "@/components/gallery/DriveGrid";
import { artworks } from "@/data/artworks";

const FILTERS = [
  { id: "all", label: "ALL" },
  { id: "universal-transmissions", label: "UNIVERSAL TRANSMISSIONS" },
  { id: "bio-energetic-vortexes", label: "BIO-ENERGETIC VORTEXES (CHAKRAS)" },
  { id: "prismatic", label: "PRISMATIC TRANSMISSIONS" },
  { id: "grid", label: "GRID" },
  { id: "stream", label: "UT TV" },
];

export default function GalleryClient() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredArtworks = artworks
    .filter((artwork) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "prismatic") {
        return (
          artwork.tags.includes("prismatic") ||
          artwork.tags.includes("twilight-transmissions")
        );
      }
      if (activeFilter === "universal-transmissions") {
        return (
          artwork.tags.includes("universal-transmissions") &&
          !artwork.tags.includes("bio-energetic-vortexes")
        );
      }
      if (activeFilter === "bio-energetic-vortexes") {
        return artwork.tags.includes("bio-energetic-vortexes");
      }
      return true;
    })
    .sort(() => Math.random() - 0.5);

  return (
    <>
      {/* Header */}
      <SectionReveal>
        <div className="text-center mb-16 pt-8">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>
            [ Transmission Archive ]
          </p>
          <h1 className="font-display text-4xl md:text-6xl glow-cyan mb-4">
            <ZalgoText text="Gallery" intensity="moderate" />
          </h1>
          <p className="font-body text-lg max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
            The complete visual lexicon. Each piece is a transmission —
            a message encoded in geometry, light, and sacred form.
          </p>
        </div>
      </SectionReveal>

      {/* Filter Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className="font-mono text-[9px] tracking-[0.2em] uppercase px-4 py-2 border transition-all"
            style={{
              borderColor:
                activeFilter === filter.id
                  ? "var(--ut-cyan)"
                  : "rgba(0,229,255,0.15)",
              color:
                activeFilter === filter.id
                  ? "var(--ut-cyan)"
                  : "var(--ut-white-dim)",
              background:
                activeFilter === filter.id
                  ? "rgba(0,229,255,0.05)"
                  : "transparent",
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Transmission Stream — YouTube playlist */}
      {activeFilter === "stream" && (
        <div className="mb-12 px-4 md:px-8">
          <TransmissionStream />
        </div>
      )}

      {/* Grid — Google Drive images */}
      {activeFilter === "grid" && (
        <div className="mb-12 px-4 md:px-8">
          <DriveGrid />
        </div>
      )}

      {/* Artwork grid */}
      {activeFilter !== "stream" && activeFilter !== "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtworks.map((artwork, i) => (
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
      )}
    </>
  );
}
