/**
 * WorkCard — Batch 30.
 *
 * One artwork as it appears in the collection. Deliberately a plain component rather than a
 * client one: the same card is rendered by the gallery's interactive grid AND inside the
 * collection that ships in the page's own HTML, so a visitor without JavaScript still gets every
 * work, with its real title, its real shape and a link to it.
 *
 * The card takes the work's recorded aspect ratio. It never crops: when the registry records no
 * size for a work, the card contains the image in a neutral box rather than inventing a shape
 * and cutting the piece to fit it.
 */

import Link from "next/link";
import Image from "next/image";
import LikeButton from "@/components/ui/LikeButton";
import CommentSection from "@/components/ui/CommentSection";
import { aspectOf, isAnimated, orientationOf } from "@/lib/gallery-collection";
import type { Artwork } from "@/data/artworks";

interface WorkCardProps {
  artwork: Artwork;
  /** Where the card leads — the browse state travels in this href. */
  href: string;
  /** True when the visitor has just come back to this work. */
  returned?: boolean;
  /** How many records elsewhere in the archive name this work. */
  records?: number;
  /** Client-only: remembers where the visitor was standing. */
  onNavigate?: () => void;
}

export default function WorkCard({ artwork, href, returned = false, records = 0, onNavigate }: WorkCardProps) {
  const aspect = aspectOf(artwork.slug);
  const orientation = orientationOf(artwork.slug) ?? "unrecorded";

  return (
    <article
      className="ut-work"
      data-work={artwork.slug}
      data-orientation={orientation}
      data-returned={returned ? "true" : "false"}
    >
      <Link
        href={href}
        className="ut-work-frame"
        style={{ aspectRatio: aspect ?? "4 / 3" }}
        onClick={onNavigate}
        aria-label={`${artwork.title} — open this work`}
      >
        <Image
          src={artwork.images[0]}
          alt={artwork.title}
          fill
          /* Measured against the grid this card sits in: three columns at desktop width make the box
             about 30.7vw, so the hint says 30vw rather than asking for a third of the viewport and
             fetching a variant larger than the box it fills. Two columns from 640 to 900px. */
          sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 30vw"
          style={{ objectFit: aspect ? "cover" : "contain" }}
          data-work-image={artwork.slug}
        />
      </Link>
      <div className="ut-work-body">
        <h2 className="ut-work-title">
          <Link href={href} onClick={onNavigate}>
            {artwork.title}
          </Link>
        </h2>
        <div className="ut-work-meta">
          <span>{artwork.year}</span>
          <span>·</span>
          <span>{orientation === "unrecorded" ? "shape unrecorded" : orientation}</span>
          {isAnimated(artwork) && (
            <>
              <span>·</span>
              <span style={{ color: "var(--ut-cyan)" }}>film</span>
            </>
          )}
          {records > 0 && (
            <>
              <span>·</span>
              <span>
                {records} {records === 1 ? "record" : "records"} in the archive
              </span>
            </>
          )}
        </div>
        <div className="ut-work-actions">
          <LikeButton itemId={`gallery-${artwork.slug}`} />
          <CommentSection itemId={`gallery-${artwork.slug}`} itemType="gallery" />
        </div>
      </div>
    </article>
  );
}
