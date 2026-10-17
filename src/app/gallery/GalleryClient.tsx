"use client";

/**
 * GalleryClient — Batch 30, the collection as a browsable collection.
 *
 * What the released gallery did, measured on production before this was written:
 *
 *  -  ORDER WAS RANDOM. `artworks.sort(() => Math.random() - 0.5)` ran on every render: two
 *     consecutive loads produced two different sequences, and returning from a work landed the
 *     visitor in a different collection than the one they left.
 *  -  EVERY WORK WAS CROPPED. Each card forced a 4:5 box with `object-cover` while the masters
 *     are 1000×1000, 1200×902, 1500×1128, 1000×1330 — landscape pieces lost their sides.
 *  -  NO RESIZED PREVIEW. `unoptimized` served the raw master for every card.
 *  -  NO COUNTS, NO SEARCH, NO SHAREABLE STATE. The filter lived only in React state, so it was
 *     not in the URL, could not be shared, and Back to the gallery lost it.
 *  -  CONTENT DEPENDED ON A REVEAL. 32 of 35 cards sat at opacity 0 until an observer fired.
 *  -  A 900ms FAKE LOAD. A skeleton stood in front of a grid that was already in memory.
 *
 * This composes the collection from the registry instead. Every grouping, count, aspect and order
 * comes from `@/lib/gallery-collection`, which reads the artwork data and the recorded master
 * dimensions. The browse state lives in the URL, so it is shareable and Back restores it.
 *
 * The return journey is the part that needed the most care. Three things were wrong in the first
 * cut of it, all of which this file now does properly:
 *
 *  1.  The mount-time URL writer rebuilt the address from the four narrowing values only, which
 *      DROPPED the `work` marker the return link had just supplied — so returning from a work
 *      restored the collection but not the work. The marker is now carried through, but only
 *      after being checked against the registry's published slugs.
 *  2.  The saved position was one global scroll offset. Any earlier visit could therefore put a
 *      visitor somewhere unrelated. A position now belongs to the collection it was taken in,
 *      and records the work it was taken from (see `browseSignature` / `readSavedPosition`).
 *  3.  The work marker was interpolated straight into a DOM selector. It is validated first, and
 *      the lookup scans the cards rather than building a selector from page-supplied text.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import UTTVPlayer from "@/components/gallery/UTTVPlayer";
import TransmissionStream from "@/components/gallery/TransmissionStream";
import DriveGrid from "@/components/gallery/DriveGrid";
import WorkCard from "@/components/gallery/WorkCard";
import CollectionHead from "@/components/gallery/CollectionHead";
import { connectionsForArtwork } from "@/lib/artwork-connections";
import {
  COLLECTION_SIZE,
  SORTS,
  browseQuery,
  browseSignature,
  gallerySeries,
  orientationCounts,
  parseBrowseState,
  readSavedPosition,
  returnScrollTarget,
  validWorkSlug,
  visibleWorks,
  withSavedPosition,
  type GallerySort,
  type Orientation,
} from "@/lib/gallery-collection";
import { artworks } from "@/data/artworks";

/** Positions are kept per collection, so one visit cannot answer for another. */
const POSITIONS_KEY = "ut:gallery:positions";

const ORIENTATION_LABELS: { id: Orientation | "all"; label: string }[] = [
  { id: "all", label: "Any shape" },
  { id: "landscape", label: "Landscape" },
  { id: "portrait", label: "Portrait" },
  { id: "square", label: "Square" },
];

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
/** Spoken from the list that is actually rendered, so the sentence cannot outrun the count. */
const countWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

type Panel = "works" | "grid" | "stream";

export default function GalleryClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initial = useMemo(() => parseBrowseState(searchParams), [searchParams]);
  const [series, setSeries] = useState(initial.series);
  const [q, setQ] = useState(initial.q);
  const [sort, setSort] = useState<GallerySort>(initial.sort);
  const [orientation, setOrientation] = useState<Orientation | "all">(initial.orientation);
  const [panel, setPanel] = useState<Panel>("works");
  /* Only a work the registry publishes may become a return marker — a malformed or unknown
     value in the address leaves the collection fully usable instead of pointing at nothing. */
  const [returnedTo, setReturnedTo] = useState<string | null>(() => validWorkSlug(initial.work));

  const seriesList = useMemo(() => gallerySeries(), []);
  const orientCounts = useMemo(() => orientationCounts(), []);
  const featured = useMemo(() => artworks.filter((a) => a.featured), []);

  const state = useMemo(
    () => ({ series, q, sort, work: null, orientation }),
    [series, q, sort, orientation]
  );
  const shown = useMemo(() => visibleWorks(state), [state]);

  const narrowing = series !== "all" || Boolean(q) || orientation !== "all" || sort !== "registry";
  const signature = browseSignature({ series, q, sort, orientation });

  /* ── the browse state lives in the URL ─────────────────────────────────────
     Written with `replace` so a narrowing does not fill the Back button with steps the visitor
     never took. The return marker travels with it: rebuilding the address without `work` is what
     stripped it, so a refresh after a return keeps the target. */
  const writeUrl = useCallback(
    (qs: string) => {
      const target = qs ? `${pathname}${qs}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router]
  );

  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    /* The search box writes on a short delay; the other controls write immediately. */
    if (urlTimer.current) clearTimeout(urlTimer.current);
    const delay = q === initial.q ? 0 : 220;
    urlTimer.current = setTimeout(
      () => writeUrl(browseQuery({ series, q, sort, orientation, work: returnedTo })),
      delay
    );
    return () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    };
  }, [series, q, sort, orientation, returnedTo, initial.q, writeUrl]);

  /* Browser Back/Forward is the one case where the URL leads and the state follows. */
  useEffect(() => {
    const onPop = () => {
      const s = parseBrowseState(new URLSearchParams(window.location.search));
      setSeries(s.series);
      setQ(s.q);
      setSort(s.sort);
      setOrientation(s.orientation);
      setReturnedTo(validWorkSlug(s.work));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ── coming back to the collection ─────────────────────────────────────────
     Leaving a work records where the visitor was standing, in the collection they were standing
     in, and which work they left from. */
  const rememberPlace = useCallback(
    (slug: string) => {
      try {
        const raw = sessionStorage.getItem(POSITIONS_KEY);
        sessionStorage.setItem(
          POSITIONS_KEY,
          withSavedPosition(raw, signature, { y: Math.round(window.scrollY), work: slug })
        );
      } catch {
        /* storage disabled: the URL still carries the collection, the work and the order */
      }
    },
    [signature]
  );

  /* Putting them back. A saved position is used only when it belongs to this collection and was
     not taken while leaving a different work; otherwise the named work itself is brought into
     view. Neither path can be answered by an unrelated earlier visit. */
  useEffect(() => {
    if (!returnedTo) return;
    let saved: number | null = null;
    try {
      const entry = readSavedPosition(sessionStorage.getItem(POSITIONS_KEY), signature, returnedTo);
      saved = entry ? entry.y : null;
    } catch {
      saved = null;
    }
    if (saved !== null) {
      window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior });
      return;
    }
    /* Scanned, not selected: the marker never becomes part of a CSS selector. */
    const card = Array.from(document.querySelectorAll<HTMLElement>("[data-work]")).find(
      (el) => el.getAttribute("data-work") === returnedTo
    );
    if (!card) return;

    /* Document coordinates. `card.offsetTop` is measured from the card's offset parent — the
       collection grid, which is `position: relative` — so it omits wherever the grid itself sits
       in the page: the first card reports 0 while the grid may begin a thousand pixels down, and
       a return built from it landed at the top of the document. */
    const place = () => {
      const top = window.scrollY + card.getBoundingClientRect().top;
      window.scrollTo({ top: returnScrollTarget(top), behavior: "instant" as ScrollBehavior });
    };
    place();

    /* One correction after the lazy artwork above the card has taken its space: without it a
       later-row work is placed by the layout as it stood before those images arrived. */
    const settle = window.setTimeout(place, 400);
    return () => window.clearTimeout(settle);
  }, [returnedTo, signature, shown.length]);

  const clearAll = () => {
    setSeries("all");
    setQ("");
    setSort("registry");
    setOrientation("all");
  };

  const cardHref = (slug: string) =>
    `/gallery/${slug}${browseQuery({ series, q, sort, orientation })}`;

  return (
    <>
      <CollectionHead />

      {/* ── THE OPENING IS ARTWORK ─────────────────────────────────────────
          The works the archive marks as its own starting points, directly under the title so the
          first thing on the page is art rather than controls. The sentence is built from the list
          that is rendered. */}
      {panel === "works" && !narrowing && featured.length > 0 && (
        <section className="ut-begin" data-gallery-begin="true" data-gallery-begin-count={featured.length}>
          <div className="ut-begin-head">
            <p className="ut-collection-count" style={{ color: "var(--ut-gold)" }}>
              Begin here
            </p>
            <p className="ut-begin-say" data-gallery-begin-say="true">
              {countWord(featured.length).replace(/^./, (c) => c.toUpperCase())} works the archive marks as
              its own starting points — the complete collection follows, nothing held back.
            </p>
          </div>
          <div className="ut-begin-strip">
            {featured.map((a) => (
              <Link
                key={a.id}
                href={cardHref(a.slug)}
                className="ut-begin-tile"
                onClick={() => rememberPlace(a.slug)}
                data-begin-work={a.slug}
              >
                <span className="ut-begin-thumb">
                  <Image
                    src={a.images[0]}
                    alt={a.title}
                    fill
                    sizes="(max-width: 640px) 40vw, 180px"
                    style={{ objectFit: "cover" }}
                  />
                </span>
                <span className="ut-begin-title">{a.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── CONTROLS ───────────────────────────────────────── */}
      <div className="ut-collection-controls">
        <div className="ut-collection-row">
          <label className="ut-collection-label" htmlFor="gallery-search">
            Find a work
          </label>
          <input
            id="gallery-search"
            className="ut-search"
            type="search"
            value={q}
            placeholder="Title, series, year, medium…"
            onChange={(e) => {
              setQ(e.target.value);
              setPanel("works");
            }}
            data-gallery-search="true"
          />
          <label className="ut-collection-label" htmlFor="gallery-sort">
            Order
          </label>
          <select
            id="gallery-sort"
            className="ut-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as GallerySort)}
            data-gallery-sort="true"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ut-collection-row">
          <span className="ut-collection-label" id="gallery-series-label">
            Series
          </span>
          <div className="ut-collection-row" role="group" aria-labelledby="gallery-series-label" data-gallery-series="true">
            <button
              type="button"
              className="ut-chip"
              aria-pressed={series === "all"}
              onClick={() => {
                setSeries("all");
                setPanel("works");
              }}
            >
              All works<span className="ut-chip-count">{COLLECTION_SIZE}</span>
            </button>
            {seriesList.map((s) => (
              <button
                key={s.id}
                type="button"
                className="ut-chip"
                aria-pressed={series === s.id}
                onClick={() => {
                  setSeries(s.id);
                  setPanel("works");
                }}
                data-series={s.id}
              >
                {s.label}
                <span className="ut-chip-count">{s.count}</span>
              </button>
            ))}
          </div>
        </div>

        <details className="ut-refine" data-gallery-refine="true">
          <summary className="ut-refine-summary">
            Shape, rooms and more
            {orientation !== "all" && <span className="ut-chip-count">{orientation}</span>}
          </summary>
          <div className="ut-collection-row">
            <span className="ut-collection-label" id="gallery-shape-label">
              Shape
            </span>
            <div className="ut-collection-row" role="group" aria-labelledby="gallery-shape-label">
              {ORIENTATION_LABELS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="ut-chip"
                  aria-pressed={orientation === o.id}
                  onClick={() => {
                    setOrientation(o.id);
                    setPanel("works");
                  }}
                  data-orientation-filter={o.id}
                >
                  {o.label}
                  {o.id !== "all" && (
                    <span className="ut-chip-count">{orientCounts[o.id as Orientation]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="ut-collection-row">
            <span className="ut-collection-label">Other rooms</span>
            <button
              type="button"
              className="ut-chip"
              aria-pressed={panel === "grid"}
              onClick={() => setPanel(panel === "grid" ? "works" : "grid")}
            >
              Grid
            </button>
            <button
              type="button"
              className="ut-chip"
              aria-pressed={panel === "stream"}
              onClick={() => setPanel(panel === "stream" ? "works" : "stream")}
            >
              Stream
            </button>
          </div>
        </details>
      </div>

      {/* ── OTHER ROOMS (preserved) ─────────────────────────── */}
      {panel === "grid" && (
        <div style={{ position: "relative", zIndex: 1, marginBottom: "2rem" }} data-gallery-panel="grid">
          <DriveGrid />
        </div>
      )}
      {panel === "stream" && (
        <div style={{ position: "relative", zIndex: 1, marginBottom: "2rem" }} data-gallery-panel="stream">
          <UTTVPlayer />
          <TransmissionStream />
        </div>
      )}

      {panel === "works" && (
        <>
          <div className="ut-collection-summary" data-gallery-summary="true">
            <span data-gallery-shown={shown.length}>
              Showing {shown.length} of {COLLECTION_SIZE}
            </span>
            {series !== "all" && (
              <span>
                ·{" "}
                {seriesList.find((s) => s.id === series)?.label ?? series}
              </span>
            )}
            {orientation !== "all" && <span>· {orientation}</span>}
            {sort !== "registry" && <span>· {SORTS.find((s) => s.id === sort)?.label}</span>}
            {q && <span>· “{q}”</span>}
            {narrowing && (
              <button type="button" className="ut-chip" onClick={clearAll} style={{ marginLeft: "auto" }}>
                Clear
              </button>
            )}
          </div>

          {shown.length === 0 ? (
            <p
              className="font-body"
              style={{ color: "var(--ut-white-dim)", position: "relative", zIndex: 1 }}
              data-gallery-empty="true"
            >
              Nothing in the collection matches that.{" "}
              <button type="button" className="ut-chip" onClick={clearAll}>
                Show all {COLLECTION_SIZE} works
              </button>
            </p>
          ) : (
            <div className="ut-collection" data-gallery-grid="true">
              {shown.map((a) => (
                <WorkCard
                  key={a.id}
                  artwork={a}
                  href={cardHref(a.slug)}
                  returned={returnedTo === a.slug}
                  records={connectionsForArtwork(a.slug).length}
                  onNavigate={() => rememberPlace(a.slug)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
