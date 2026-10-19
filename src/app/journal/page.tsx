import type { Metadata } from "next";
import PageBackground from "@/components/scenes/PageBackground";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { blogPosts } from "@/data/blog-posts";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_URL, seoDescription, seoTitle } from "@/lib/seo";
import { parseJournalState, type JournalState } from "@/lib/journal-browse";
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

interface Props {
  searchParams?: Record<string, string | string[] | undefined>;
}

/**
 * The address is read HERE, on the server, and the whole collection — search field, filters and
 * article links — is part of the response.
 *
 * The previous shape read it on the client behind a Suspense boundary, so the served HTML held the
 * heading and "Opening the archive…" and nothing else: no article links, no search form, and a
 * filtered address arrived unfiltered. Reading `searchParams` makes this route render per request,
 * which is the price of that: an address arrives already filtered, and a visitor without JavaScript
 * still receives the archive and can still search, because every control is a real link or a GET
 * form. After hydration, changes are applied without a round trip.
 */
export default function JournalPage({ searchParams }: Props) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string") params.set(key, first);
  }
  const state: JournalState = parseJournalState(params);

  return (
    <>
      <PageBackground variant="journal" />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          <SectionReveal>
            <div className="text-center mb-12 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>
                [ Dispatches from the Inner Planes ]
              </p>
              <h1 className="font-display text-5xl md:text-7xl glow-cyan mb-6">
                <ZalgoText text="Journal" intensity="moderate" />
              </h1>
              <p className="font-body text-lg max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
                Writings on symbolism, sacred geometry, cymatics, and the living oracle — co-authored by Prime + Hakan.
              </p>
            </div>
          </SectionReveal>

          <JournalBrowser initialState={state} totalRecords={blogPosts.length} />
        </div>
      </main>
    </>
  );
}
