/**
 * StaticCollection — Batch 30.
 *
 * The complete collection as it exists in the page's own HTML, before any script runs.
 *
 * The gallery's narrowing, searching and ordering need the client, and a page that reads its
 * state from the URL is the case Next.js prerenders as a fallback. Without this, that fallback
 * IS the whole page for a visitor without JavaScript, and the works are absent from the HTML
 * entirely — which is what the first build of this batch produced until it was caught.
 *
 * So the fallback is the collection itself: every published work, in archive order, each with
 * its title, its recorded shape and a link to it. The interactive grid then replaces it on
 * hydration and adds narrowing, search, ordering and the addressable browse state. The works are
 * present either way, and nothing is reachable only through a script.
 */

import WorkCard from "@/components/gallery/WorkCard";
import CollectionHead from "@/components/gallery/CollectionHead";
import { artworks } from "@/data/artworks";
import { connectionsForArtwork } from "@/lib/artwork-connections";

export default function StaticCollection() {
  return (
    <>
      <CollectionHead />
      <p className="ut-collection-summary" data-gallery-static="true">
        <span>
          Showing all {artworks.length} works, in archive order
        </span>
      </p>
      <div className="ut-collection" data-gallery-grid="true">
        {artworks.map((a) => (
          <WorkCard
            key={a.id}
            artwork={a}
            href={`/gallery/${a.slug}`}
            records={connectionsForArtwork(a.slug).length}
          />
        ))}
      </div>
    </>
  );
}
