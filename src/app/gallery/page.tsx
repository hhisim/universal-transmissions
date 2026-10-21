import { Suspense } from "react";
import type { Metadata } from "next";
import GalleryClient from "./GalleryClient";
import StaticCollection from "@/components/gallery/StaticCollection";
import PageBackground from "@/components/scenes/PageBackground";
export const revalidate = 300; // ISR: rebuilt via CDN cache every 5 min

export const metadata: Metadata = {
  alternates: { canonical: "/gallery" },
  title: "Gallery",
  description:
    "Browse the complete collection of Universal Transmissions artwork — sacred geometry, symbolic prints, and visual transmissions.",
};

export default function GalleryPage() {
  return (
    <>
      {/* One atmosphere. The released page stacked two particle fields here, and the artwork
          section then covered both with an opaque sheet; the second canvas was work nobody
          could see. The sheet is now translucent, so the field reads faintly behind the works
          while every card and control keeps its own opaque surface. */}
      <PageBackground variant="gallery" />
      <main className="pt-24 pb-20 ut-foreground" style={{ background: "rgba(4,3,9,0.74)" }}>
        <div className="container-ut">
          {/* The browse state lives in the URL, which is read on the client, so this section
              prerenders as a fallback. That fallback is the collection itself — every work, in
              the page's own HTML — and the interactive grid replaces it once it runs. */}
          <Suspense fallback={<StaticCollection />}>
            <GalleryClient />
          </Suspense>
        </div>
      </main>
    </>
  );
}
