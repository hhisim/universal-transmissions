import type { Metadata } from "next";
import { Suspense } from "react";
import PageBackground from "@/components/scenes/PageBackground";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { blogPosts } from "@/data/blog-posts";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_URL, seoDescription, seoTitle } from "@/lib/seo";
import JournalBrowser from "./JournalBrowser";

export const revalidate = 300;

export const metadata: Metadata = {
  title: seoTitle("Journal"),
  description: seoDescription(
    "Dispatches from the inner planes: process records, research essays and studio logs from the making of Universal Transmissions — searchable by title, excerpt, tag and year."
  ),
  alternates: { canonical: `${SITE_URL}/journal` },
  openGraph: {
    title: seoTitle("Journal"),
    description: seoDescription(
      "Process records, research essays and studio logs from the making of Universal Transmissions."
    ),
    url: `${SITE_URL}/journal`,
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE) }],
  },
};

export default function JournalPage() {
  return (
    <>
      <PageBackground variant="journal" />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          <SectionReveal>
            <div className="text-center mb-14 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>
                [ Dispatches from the Inner Planes ]
              </p>
              <h1 className="font-display text-5xl md:text-7xl glow-cyan mb-6">
                <ZalgoText text="Journal" intensity="moderate" />
              </h1>
              <p className="font-body text-lg max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
                Writings on symbolism, sacred geometry, cymatics, and the living oracle — co-authored by Prime + Hakan.
              </p>
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase mt-6" style={{ color: "var(--ut-white-faint)" }}>
                {blogPosts.length} transmissions · searchable by title, excerpt and tag
              </p>
            </div>
          </SectionReveal>

          {/* The browser reads the address; this shell stays static so the archive is indexable. */}
          <Suspense
            fallback={
              <p className="font-mono text-[9px] tracking-widest uppercase text-center" style={{ color: "var(--ut-white-faint)" }}>
                Opening the archive…
              </p>
            }
          >
            <JournalBrowser />
          </Suspense>
        </div>
      </main>
    </>
  );
}
