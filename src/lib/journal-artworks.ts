/**
 * journal-artworks.ts — which artwork records a Journal post documents, read backwards.
 *
 * The relationship is NOT declared here. `artwork-connections.ts` already owns the claim, in one
 * direction: it names the Journal post that records each artwork, with the reason and the basis
 * attached. This module only asks that same registry the opposite question, so the Journal end cannot
 * disagree with the artwork page about whether a relationship exists — or about what kind of claim it
 * is. A post with no recorded artwork simply has none; a similar title is never enough to invent one.
 */

import { artworks } from "@/data/artworks";
import { journalConnectionsForArtwork } from "@/lib/artwork-connections";

export interface DocumentedArtwork {
  slug: string;
  title: string;
}

let index: Map<string, DocumentedArtwork[]> | null = null;

function buildIndex(): Map<string, DocumentedArtwork[]> {
  const map = new Map<string, DocumentedArtwork[]>();
  for (const artwork of artworks) {
    for (const connection of journalConnectionsForArtwork(artwork.slug)) {
      const match = /^\/journal\/([^?#]+)$/.exec(connection.href);
      if (!match) continue;
      const postSlug = decodeURIComponent(match[1]);
      const list = map.get(postSlug) ?? [];
      list.push({ slug: artwork.slug, title: artwork.title });
      map.set(postSlug, list);
    }
  }
  return map;
}

/** Artworks whose own record names this Journal post. Empty when none does. */
export function artworkRecordsForJournal(postSlug: string): DocumentedArtwork[] {
  if (!index) index = buildIndex();
  return index.get(postSlug) ?? [];
}

/** Every Journal post that documents at least one artwork, used for the entrance's studio shelf. */
export function journalPostsWithArtwork(): string[] {
  if (!index) index = buildIndex();
  return Array.from(index.keys());
}
