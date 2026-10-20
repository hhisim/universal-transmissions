/**
 * research-descents.ts — which guided descents actually visit a research room.
 *
 * Batch 21 authored the descents and the rooms separately: a path's stop names a room, but the room
 * itself never learned which paths walk through it. Inbound, a stop's link was the room's plain route
 * (`/research/cymatics`), so the visitor arrived with no way back to the descent they were reading and
 * no sign that one existed.
 *
 * Everything here is DERIVED from the authored registry in `guided-paths.ts`. Nothing is listed by
 * hand, so a stop cannot advertise a room it does not visit, and a room cannot advertise a descent that
 * does not visit it. Adding, removing or reordering a stop changes these answers automatically.
 *
 * The inbound context is validated against the same registry — and against the room that is actually
 * being served. An unknown path, an out-of-range stop, or a stop that belongs to a different room is
 * REFUSED rather than reported, because a return control that does not return where it says is worse
 * than no return control at all.
 */

import { GUIDED_PATHS, findGuidedPath, resolvePath, type GuidedPath } from "./guided-paths";

/** One authored stop that visits a room. */
export interface DescentStop {
  pathSlug: string;
  pathTitle: string;
  pathTheme: string;
  /** The AUTHORED stop number, never an array position. */
  number: number;
  total: number;
  /** The room slug this stop names. */
  topic: string;
  anchor: string | null;
  encounter: string;
  /** The stop's own record title, from the registry. */
  title: string;
  /** Where the visitor goes to read that stop: the path, at that authored number. */
  href: string;
}

/** The address of an authored stop. Numbers are identity, so they travel in the URL as authored. */
export function stopHref(pathSlug: string, number: number): string {
  return `/paths/${pathSlug}?stop=${number}`;
}

/**
 /**
  * Does this resolved stop actually OPEN the room it names?
  *
  * A stop carries the room it belongs to (`topic`), but its destination is a separate fact: the stop
  * for a Journal piece, an artwork, an instrument or a Codex selection names the same room while opening
  * something else entirely. Only a destination that IS the room counts as a visit.
  */
 export function opensRoom(href: string, topic: string): boolean {
   const [withoutQuery] = href.split("#");
   const [pathname] = withoutQuery.split("?");
   return pathname.replace(/\/+$/, "") === `/research/${topic}`;
 }

 /** Every authored stop, across every path, that actually OPENS `topic`.
 *
 * Derived by resolving each path and comparing the resolved stop's room. A stop whose connection
 * anchor fails to resolve is skipped exactly as the path page skips it, so this list can never
 * advertise a stop the path refuses to open.
 */
export function descentsForRoom(topic: string): DescentStop[] {
  const out: DescentStop[] = [];
  for (const path of GUIDED_PATHS) {
    const { stops } = resolvePath(path);
    for (const stop of stops) {
      /* The DESTINATION decides, not the room the stop merely belongs to. */
      if (!opensRoom(stop.href, topic)) continue;
      out.push({
        pathSlug: path.slug,
        pathTitle: path.title,
        pathTheme: path.theme,
        number: stop.number,
        total: stop.total,
        topic: stop.topic,
        anchor: stop.anchor,
        encounter: stop.encounter,
        title: stop.title,
        href: stopHref(path.slug, stop.number),
      });
    }
  }
  return out;
}

/** The descent context a room was opened from, once it has been proved. */
export interface DescentContext {
  pathSlug: string;
  pathTitle: string;
  number: number;
  total: number;
  /** The address that returns to exactly this authored stop. */
  href: string;
}

/** Strip query, fragment and trailing slashes so destinations compare by identity, not by decoration. */
function normalise(href: string): string {
  return href.split("#")[0].split("?")[0].replace(/\/+$/, "");
}

function contextFor(path: GuidedPath, stop: { number: number; topic: string }): DescentContext {
  return {
    pathSlug: path.slug,
    pathTitle: path.title,
    number: stop.number,
    total: path.stops.length,
    href: stopHref(path.slug, stop.number),
  };
}

/**
 * Locate the AUTHORED stop a pair names, with strict parsing and no array-position guessing.
 * Returns either the stop or the reason it cannot be used. Shared by every arrival check so they
 * cannot drift apart.
 */
function locateStop(
  path: GuidedPath,
  params: { stop?: string }
):
  | { stop: { number: number; topic: string; href: string; title: string } }
  | { refused: "malformed-stop" | "out-of-range" | "unavailable-stop" } {
  const rawStop = params.stop ?? "";
  /* No trimming: " 1", "1 ", "01", "1.5", "+1", "1garbage" and "" are all malformed here. */
  if (!/^[1-9]\d*$/.test(rawStop)) return { refused: "malformed-stop" };
  const requested = Number(rawStop);
  if (requested > path.stops.length) return { refused: "out-of-range" };
  const { stops } = resolvePath(path);
  const stop = stops.find((s) => s.number === requested);
  if (!stop) return { refused: "unavailable-stop" };
  return { stop: { number: stop.number, topic: stop.topic, href: stop.href, title: stop.title } };
}

export interface DescentContextResult {
  /** Present only when the context was proved against the registry AND this room. */
  context: DescentContext | null;
  /** Why a supplied context was refused. Absent when none was supplied or it was accepted. */
  refused?:
    | "unknown-path"
    | "malformed-stop"
    | "out-of-range"
    | "unavailable-stop"
    | "other-record";
}

/**
 * Prove an inbound `?path=&stop=` pair against the registry and against the room being served.
 *
 * Accepts only: a path slug that exists, a stop number inside that path's authored range, a stop that
 * resolves, and a stop whose room is `topic`. Anything else is refused by name, and the caller must
 * fall back to the derived list without claiming an arrival.
 */
export function resolveDescentContext(
  topic: string,
  params: { path?: string; stop?: string }
): DescentContextResult {
  const rawPath = (params.path ?? "").trim();
  if (!rawPath) return { context: null };

  const path: GuidedPath | null = findGuidedPath(rawPath);
  if (!path) return { context: null, refused: "unknown-path" };

  /* STRICT: an arrival claim needs a well-formed authored number. `1garbage`, `1.5`, `+1`, ` 1` and a
     missing value are refused rather than coerced — `parseInt` would have read `1garbage` as 1. The
     path page's own selection keeps its lenient behaviour; this is only about claiming an arrival. */
  const found = locateStop(path, params);
  if ("refused" in found) return { context: null, refused: found.refused };

  /* A stop that belongs to this room but opens another record did not bring the visitor here. */
  if (!opensRoom(found.stop.href, topic)) return { context: null, refused: "other-record" };

  return { context: contextFor(path, found.stop) };
}

/**
 * Prove an inbound `?path=&stop=` pair against the registry for ANY served record: a Journal article,
 * an artwork, a room. The stop's resolved destination must be exactly the record being served.
 *
 * Batch 40: following a record should preserve the visitor's place. Stops 2 and 3 of "Sound into Form"
 * open a Journal piece and an artwork; both used to receive the context and show nothing.
 */
export function resolveRecordArrival(
  recordPath: string,
  params: { path?: string; stop?: string }
): DescentContextResult {
  const rawPath = (params.path ?? "").trim();
  if (!rawPath) return { context: null };

  const path = findGuidedPath(rawPath);
  if (!path) return { context: null, refused: "unknown-path" };

  const found = locateStop(path, params);
  if ("refused" in found) return { context: null, refused: found.refused };

  /* Compare normalised destinations: the stop must open THIS record, not merely a same-shaped one. */
  if (normalise(found.stop.href) !== normalise(recordPath)) {
    return { context: null, refused: "other-record" };
  }
  return { context: contextFor(path, found.stop) };
}
