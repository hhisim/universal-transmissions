/**
 * The conversation's own memory of itself, for the outward journey.
 *
 * The Oracle keeps its conversation in component state, so following a record into the archive
 * and coming back used to return the visitor to an empty room — the messages, and the records
 * beside them, were gone. This is the smallest repair that works: the conversation is written
 * to `sessionStorage` under one key and read back on mount.
 *
 * Lifespan, deliberately bounded:
 *   - one key, `ut.oracle.conversation.v1`, scoped to this browser tab's session;
 *   - cleared by the Oracle's own reset, and when the tab closes;
 *   - written only on this page, and only after an answer exists;
 *   - capped in both message count and characters, so a long session cannot fill the quota;
 *   - versioned, so a future shape change reads as nothing rather than as garbage.
 *
 * No account, no server storage, no conversation service: the transcript never leaves the tab.
 * Nothing here is trusted on the way back in — every field is re-validated, and a record's
 * destination must be a same-site path, so a hand-edited store cannot put an arbitrary URL
 * behind a link the visitor is invited to click.
 */
import { isEmptyLinkSet, type RecordLink, type RecordLinkSet } from "./record-link-types";

export const CONVERSATION_STATE_KEY = "ut.oracle.conversation.v1";
export const CONVERSATION_STATE_VERSION = 1;
export const MAX_RESTORED_MESSAGES = 40;
export const MAX_STATE_CHARS = 200_000;

/** The part of a message worth restoring. Audio object URLs and pending flags are not. */
export interface RestoredMessage {
  role: "user" | "oracle";
  text: string;
  mode?: string;
  outputMode?: string;
  records?: RecordLinkSet;
}

interface Envelope {
  v: number;
  at: number;
  msgs: RestoredMessage[];
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** A record link is only usable if it points somewhere on this site. */
function validHref(v: unknown): v is string {
  const h = str(v);
  return h.startsWith("/") && !h.startsWith("//") && !h.includes("\\");
}

function validLink(v: unknown): RecordLink | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const title = str(r.title).slice(0, 300);
  const kind = str(r.kind);
  if (!title || !validHref(r.href)) return null;
  if (kind !== "Journal" && kind !== "Artwork" && kind !== "Correspondence") return null;
  const system = str(r.system).slice(0, 80);
  return {
    id: str(r.id).slice(0, 300),
    title,
    kind,
    ...(system ? { system } : {}),
    href: r.href,
  };
}

function validLinkSet(v: unknown): RecordLinkSet | undefined {
  if (!v || typeof v !== "object") return undefined;
  const s = v as { resolved?: unknown; ambiguous?: unknown };
  const resolved = (Array.isArray(s.resolved) ? s.resolved : [])
    .map(validLink)
    .filter((l): l is RecordLink => l !== null);
  const ambiguous = (Array.isArray(s.ambiguous) ? s.ambiguous : [])
    .map((g) => {
      if (!g || typeof g !== "object") return null;
      const group = g as { name?: unknown; options?: unknown };
      const options = (Array.isArray(group.options) ? group.options : [])
        .map(validLink)
        .filter((l): l is RecordLink => l !== null);
      return options.length ? { name: str(group.name).slice(0, 200), options } : null;
    })
    .filter((g): g is { name: string; options: RecordLink[] } => g !== null);
  const set = { resolved, ambiguous };
  return isEmptyLinkSet(set) ? undefined : set;
}

/**
 * The messages worth keeping. Returns null when there is nothing to keep, so a cleared
 * conversation leaves no stale record behind.
 */
export function serializeConversation(msgs: readonly unknown[]): string | null {
  const kept: RestoredMessage[] = [];
  for (const m of msgs) {
    if (!m || typeof m !== "object") continue;
    const msg = m as Record<string, unknown>;
    const role = msg.role === "user" || msg.role === "oracle" ? msg.role : null;
    const text = str(msg.text);
    if (!role || !text) continue;
    const records = validLinkSet(msg.records);
    kept.push({
      role,
      text,
      ...(str(msg.mode) ? { mode: str(msg.mode) } : {}),
      ...(str(msg.outputMode) ? { outputMode: str(msg.outputMode) } : {}),
      ...(records ? { records } : {}),
    });
  }
  if (!kept.length) return null;
  const envelope: Envelope = {
    v: CONVERSATION_STATE_VERSION,
    at: Date.now(),
    msgs: kept.slice(-MAX_RESTORED_MESSAGES),
  };
  const json = JSON.stringify(envelope);
  if (json.length > MAX_STATE_CHARS) {
    // Keep the most recent turns rather than dropping it all.
    envelope.msgs = envelope.msgs.slice(-Math.floor(MAX_RESTORED_MESSAGES / 2));
    const smaller = JSON.stringify(envelope);
    if (smaller.length > MAX_STATE_CHARS) return null;
    return smaller;
  }
  return json;
}

/** Read back a conversation. Anything unrecognised reads as no conversation, never as a guess. */
export function restoreConversation(raw: string | null | undefined): RestoredMessage[] {
  if (!raw || typeof raw !== "string") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const env = parsed as { v?: unknown; msgs?: unknown };
  if (env.v !== CONVERSATION_STATE_VERSION) return [];
  if (!Array.isArray(env.msgs)) return [];
  const out: RestoredMessage[] = [];
  for (const m of env.msgs.slice(-MAX_RESTORED_MESSAGES)) {
    if (!m || typeof m !== "object") continue;
    const msg = m as Record<string, unknown>;
    const role = msg.role === "user" || msg.role === "oracle" ? msg.role : null;
    const text = str(msg.text);
    if (!role || !text) continue;
    const records = validLinkSet(msg.records);
    out.push({
      role,
      text,
      ...(str(msg.mode) ? { mode: str(msg.mode) } : {}),
      ...(str(msg.outputMode) ? { outputMode: str(msg.outputMode) } : {}),
      ...(records ? { records } : {}),
    });
  }
  return out;
}

/**
 * Append an answer, giving it its OWN records and no one else's.
 *
 * This is the seam that keeps an answer's links attached to that answer. It copies the list
 * rather than appending in place, and it never touches an earlier message: a later subject
 * change must not rewrite what an earlier answer offered, and a later answer must not inherit
 * the records of the one before it.
 */
export function appendAnswer<T extends { role: "user" | "oracle"; text: string }>(
  msgs: readonly T[],
  answer: T
): T[] {
  const next = msgs.map((m) => ({ ...m }));
  next.push({ ...answer });
  return next;
}

/** The tab's own store, guarded: a private-mode or full store must not break the Oracle. */
export function readStoredConversation(): RestoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return restoreConversation(window.sessionStorage.getItem(CONVERSATION_STATE_KEY));
  } catch {
    return [];
  }
}

export function writeStoredConversation(msgs: readonly unknown[]): void {
  if (typeof window === "undefined") return;
  try {
    const json = serializeConversation(msgs);
    if (json === null) window.sessionStorage.removeItem(CONVERSATION_STATE_KEY);
    else window.sessionStorage.setItem(CONVERSATION_STATE_KEY, json);
  } catch {
    /* a store that refuses writes leaves the Oracle working, just without the memory */
  }
}

export function clearStoredConversation(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CONVERSATION_STATE_KEY);
  } catch {
    /* nothing to do */
  }
}
