/**
 * CollectionHead — Batch 30.
 *
 * The gallery's opening statement, shared by the collection that ships in the page's own HTML and
 * by the interactive grid, so the two cannot describe the collection differently. The count is
 * read from the registry: it says how many works there are because that is how many there are.
 */

import ZalgoText from "@/components/ui/ZalgoText";
import { COLLECTION_SIZE, gallerySeries } from "@/lib/gallery-collection";

export default function CollectionHead() {
  const seriesCount = gallerySeries().filter((s) => s.id !== "other").length;

  return (
    <div className="ut-collection-head">
      <p className="ut-collection-count">
        [ {COLLECTION_SIZE} works · {seriesCount} series ]
      </p>
      <h1 className="font-display text-4xl md:text-6xl glow-cyan mb-4">
        <ZalgoText text="Gallery" intensity="moderate" />
      </h1>
      <p className="ut-collection-lede">
        The complete visual lexicon. Each piece is a transmission — a message encoded in
        geometry, light, and sacred form. Wander the whole collection, or go straight to a work.
      </p>
    </div>
  );
}
