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
 * Every authored stop, across every path, that visits `topic`.
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
      if (stop.topic !== topic) continue;
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

export interface DescentContextResult {
  /** Present only when the context was proved against the registry AND this room. */
  context: DescentContext | null;
  /** Why a supplied context was refused. Absent when none was supplied or it was accepted. */
  refused?: "unknown-path" | "out-of-range" | "unavailable-stop" | "other-room";
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

  const rawStop = (params.stop ?? "").trim();
  const total = path.stops.length;
  const requested = rawStop === "" ? 1 : Number.parseInt(rawStop, 10);
  if (!Number.isFinite(requested) || requested < 1 || requested > total) {
    return { context: null, refused: "out-of-range" };
  }

  const { stops } = resolvePath(path);
  /* Authored number, not array position — the same rule the path page itself follows. */
  const stop = stops.find((s) => s.number === requested);
  if (!stop) return { context: null, refused: "unavailable-stop" };
  if (stop.topic !== topic) return { context: null, refused: "other-room" };

  return {
    context: {
      pathSlug: path.slug,
      pathTitle: path.title,
      number: stop.number,
      total,
      href: stopHref(path.slug, stop.number),
    },
  };
}
