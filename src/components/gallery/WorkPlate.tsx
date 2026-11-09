"use client";

/**
 * WorkPlate — Gallery M1.2.
 *
 * One work in the atlas. The plate is a real link to the work's own page, so
 * middle-click, open-in-new-tab and a JavaScript-less visitor all still reach
 * the artwork. When the client is running, a plain click opens the viewer
 * instead — the detail page stays the address, the viewer is the experience.
 *
 * The image takes the master's recorded proportions rather than a fixed window,
 * so no work is ever cropped to fit a grid.
 */

import Image from "next/image";
import Link from "next/link";
import type { Artwork } from "@/data/artworks";
import { ARTWORK_IMAGE_META } from "@/data/artwork-image-meta";

type Props = {
  artwork: Artwork;
  href: string;
  index: number;
  accent?: string;
  returned?: boolean;
  onOpen: (el?: HTMLElement | null) => void;
  onNavigate?: () => void;
};

export default function WorkPlate({
  artwork,
  href,
  index,
  accent,
  returned,
  onOpen,
  onNavigate,
}: Props) {
  const meta = ARTWORK_IMAGE_META[artwork.slug];
  const width = meta?.width ?? 1200;
  const height = meta?.height ?? 900;

  return (
    <Link
      href={href}
      className="ut-plate"
      data-work={artwork.slug}
      data-returned={returned ? "true" : undefined}
      style={{ ["--i" as string]: String(index % 9), ["--plate-glow" as string]: accent ?? "#cb4db5" }}
      onClick={(event) => {
        // let the browser do its own thing for modified clicks
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate?.();
        onOpen(event.currentTarget as HTMLElement);
      }}
    >
      <span className="ut-plate-frame">
        <Image
          src={artwork.images[0]}
          alt={artwork.title}
          width={width}
          height={height}
          sizes="(max-width: 820px) 92vw, (max-width: 1100px) 46vw, 34vw"
          priority={index < 3}
        />
        <span className="ut-plate-veil" aria-hidden="true" />
      </span>
      <span className="ut-plate-meta">
        <span className="ut-plate-index">{String(index + 1).padStart(2, "0")}</span>
        <span className="ut-plate-title">{artwork.title}</span>
        <span className="ut-plate-sub">
          {artwork.year}
          {artwork.medium ? ` · ${artwork.medium}` : ""}
        </span>
      </span>
    </Link>
  );
}
