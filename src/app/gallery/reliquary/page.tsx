import type { Metadata } from "next";
import ReliquaryChamber from "@/components/gallery/reliquary/ReliquaryChamber";
import { artworks } from "@/data/artworks";

export const metadata: Metadata = {
  title: "The Reliquary — Universal Transmissions",
  description:
    "The Reliquary: the Universal Transmissions gallery as a circular chamber, the whole archive held in one room.",
  alternates: { canonical: "/gallery/reliquary" },
  openGraph: {
    title: "The Reliquary — Universal Transmissions",
    description: "The archive held in a circle.",
    images: [artworks[0]?.images?.[0] ?? "/artworks/root-chakra/main.jpg"],
  },
};

/**
 * M1.1 vertical slice. The chamber is a client component; this server route owns the
 * metadata and a plain list of every work so the page is still navigable without JS.
 */
export default function ReliquaryPage() {
  return (
    <main>
      <ReliquaryChamber />
      <noscript>
        <div style={{ padding: "96px 24px", color: "#eef0ff" }}>
          <h1 style={{ fontFamily: "Cinzel Decorative, serif", letterSpacing: ".3em" }}>
            The Reliquary
          </h1>
          <p style={{ opacity: 0.7, maxWidth: "60ch" }}>
            The chamber needs JavaScript. Every work remains available below.
          </p>
          <ul style={{ columns: 2, gap: "32px", marginTop: 24 }}>
            {artworks.map((w) => (
              <li key={w.id} style={{ marginBottom: 10 }}>
                <a href={`/gallery/${w.slug}`} style={{ color: "#d8b978" }}>
                  {w.title} · {w.year}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </noscript>
    </main>
  );
}
