"use client";

/**
 * ReturnToBrowse — Batch 30.
 *
 * The released artwork page offered one way back: a plain link to `/gallery`. A visitor who had
 * narrowed the collection to a series, searched for a word or changed the order arrived at a
 * work and then lost all of it, because the browse state only ever lived in React state on the
 * gallery page.
 *
 * The gallery now puts that state in the URL and the card carries it here, so this reads the
 * address the visitor actually arrived on and offers it back — including the `work` marker, so
 * the gallery returns them to this piece rather than to the top of the collection.
 *
 * It reads `window.location.search` rather than the router's search params on purpose: the
 * artwork pages are prerendered, and reading search params through the router would opt all 35
 * of them out of static rendering for the sake of one link. Until this mounts, it renders the
 * plain "All works" link, which is correct with or without JavaScript.
 *
 * It deliberately does not import the artwork registry: the labels are a small local map, so
 * opening a work does not pull the whole collection into that page's bundle.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const SERIES_LABELS: Record<string, string> = {
  "universal-transmissions": "Universal Transmissions",
  "bio-energetic-vortexes": "Bio-Energetic Vortexes",
  prismatic: "Prismatic Transmissions",
  "twilight-transmissions": "Twilight Transmissions",
  other: "Other works",
};

const SORT_LABELS: Record<string, string> = {
  newest: "newest first",
  oldest: "oldest first",
  title: "title A–Z",
};

export default function ReturnToBrowse({ slug }: { slug: string }) {
  const [href, setHref] = useState("/gallery");
  const [description, setDescription] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    /* The narrowing the card carried. `work` is added back, so the collection opens at this
       piece in the position the visitor left. */
    const carried = new URLSearchParams();
    for (const key of ["series", "q", "sort", "orientation"]) {
      const v = p.get(key);
      if (v) carried.set(key, v);
    }
    carried.set("work", slug);
    setHref(`/gallery?${carried.toString()}`);

    const parts: string[] = [];
    const series = p.get("series");
    if (series) parts.push(SERIES_LABELS[series] ?? series);
    const q = p.get("q");
    if (q) parts.push(`“${q}”`);
    const orientation = p.get("orientation");
    if (orientation) parts.push(orientation);
    const sort = p.get("sort");
    if (sort && SORT_LABELS[sort]) parts.push(SORT_LABELS[sort]);
    setDescription(parts.length ? parts.join(" · ") : null);
  }, [slug]);

  return (
    <div className="flex flex-col items-start gap-1" data-return-to-browse="true">
      <Link href={href} className="btn-secondary" data-return-link="true">
        ← BACK TO THE COLLECTION
      </Link>
      {description && (
        <span
          className="font-mono text-[9px] tracking-[0.15em] uppercase"
          style={{ color: "var(--ut-white-faint)" }}
          data-return-context={description}
        >
          Returning you to {description}
        </span>
      )}
    </div>
  );
}
