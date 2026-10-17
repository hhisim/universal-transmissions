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
 * This composes the collection from the registry instead. Every grouping, count, aspect and
 * order comes from `@/lib/gallery-collection`, which reads the artwork data and the recorded
 * master dimensions. The browse state lives in the URL, so it is shareable and Back restores it.
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
  gallerySeries,
  orientationCounts,
  parseBrowseState,
  visibleWorks,
  type GallerySort,
  type Orientation,
} from "@/lib/gallery-collection";
import { artworks } from "@/data/artworks";

/** Where the visitor's scroll position is kept so returning restores the place they were reading. */
const SCROLL_KEY = "ut:gallery:scroll";

const ORIENTATION_LABELS: { id: Orientation | "all"; label: string }[] = [
  { id: "all", label: "Any shape" },
  { id: "landscape", label: "Landscape" },
  { id: "portrait", label: "Portrait" },
  { id: "square", label: "Square" },
];

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
  const [returnedTo, setReturnedTo] = useState<string | null>(initial.work ?? null);

  const seriesList = useMemo(() => gallerySeries(), []);
  const orientCounts = useMemo(() => orientationCounts(), []);
  const featured = useMemo(() => artworks.filter((a) => a.featured).slice(0, 4), []);

  const state = useMemo(
    () => ({ series, q, sort, work: null, orientation }),
    [series, q, sort, orientation]
  );
  const shown = useMemo(() => visibleWorks(state), [state]);

  const narrowing = series !== "all" || Boolean(q) || orientation !== "all" || sort !== "registry";

  /* ── the browse state lives in the URL ─────────────────────────────────────
     Written with `replace` so a narrowing does not fill the Back button with steps the
     visitor never took. Because the state is IN the URL, coming back from a work restores
     it exactly, whether the visitor used our link or the browser's own Back. */
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
    urlTimer.current = setTimeout(() => writeUrl(browseQuery({ series, q, sort, orientation })), delay);
    return () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    };
  }, [series, q, sort, orientation, initial.q, writeUrl]);

  /* Browser Back/Forward is the one case where the URL leads and the state follows. */
  useEffect(() => {
    const onPop = () => {
      const s = parseBrowseState(new URLSearchParams(window.location.search));
      setSeries(s.series);
      setQ(s.q);
      setSort(s.sort);
      setOrientation(s.orientation);
      if (s.work) setReturnedTo(s.work);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ── coming back to the collection ─────────────────────────────────────────
     The card stores where the visitor was standing; the return link carries `work`, and the
     gallery puts them back at that work, in that position. */
  const rememberPlace = useCallback(() => {
    try {
      sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)));
    } catch {
      /* a browser with storage disabled still gets the URL state, just not the exact offset */
    }
  }, []);

  useEffect(() => {
    if (!returnedTo) return;
    const el = document.querySelector(`[data-work="${returnedTo}"]`);
    if (!el) return;
    let saved: number | null = null;
    try {
      const raw = sessionStorage.getItem(SCROLL_KEY);
      saved = raw ? parseInt(raw, 10) : null;
    } catch {
      saved = null;
    }
    window.scrollTo({ top: saved ?? Math.max(0, (el as HTMLElement).offsetTop - 120), behavior: "instant" as ScrollBehavior });
  }, [returnedTo, shown.length]);

  const clearAll = () => {
    setSeries("all");
    setQ("");
    setSort("registry");
    setOrientation("all");
  };

  return (
    <>

      <CollectionHead />

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
          <span className="ut-collection-row" style={{ marginLeft: "auto" }}>
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
          </span>
        </div>
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
          {/* A way in that does not stand in front of the collection. */}
          {!narrowing && featured.length > 0 && (
            <section className="ut-begin" data-gallery-begin="true">
              <p className="ut-collection-count" style={{ color: "var(--ut-gold)" }}>
                Begin here
              </p>
              <p className="ut-collection-lede" style={{ margin: "0.5rem 0 0", fontSize: "0.95rem" }}>
                Five works the archive marks as its own starting points. The complete collection
                follows — nothing is held back.
              </p>
              <div className="ut-begin-row">
                {featured.map((a) => (
                  <Link
                    key={a.id}
                    href={`/gallery/${a.slug}${browseQuery({ series, q, sort, orientation })}`}
                    className="ut-begin-card"
                    onClick={rememberPlace}
                  >
                    <span className="ut-begin-thumb">
                      <Image src={a.images[0]} alt="" fill sizes="60px" style={{ objectFit: "cover" }} />
                    </span>
                    <span className="ut-begin-title">{a.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

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
                  href={`/gallery/${a.slug}${browseQuery({ series, q, sort, orientation })}`}
                  returned={returnedTo === a.slug}
                  records={connectionsForArtwork(a.slug).length}
                  onNavigate={rememberPlace}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
