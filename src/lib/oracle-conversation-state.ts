/**
 * The conversation's own memory of itself, for the outward journey.
 *
 * The Oracle keeps its conversation in component state, so following a record into the archive
 * and coming back used to return the visitor to an empty room — the messages, the records beside
 * them and the selected-entry evidence were gone. This is the smallest repair that works: the
 * conversation is written to `sessionStorage` under one key and read back on mount.
 *
 * Lifespan, deliberately bounded:
 *   - one key, `ut.oracle.conversation.v2`, scoped to this browser tab's session;
 *   - cleared by the Oracle's own reset, and when the tab closes;
 *   - written only on this page, and only after an answer exists;
 *   - capped in both message count and characters, so a long session cannot fill the quota;
 *   - versioned, so a future shape change reads as nothing rather than as garbage.
 *
 * No account, no server storage, no conversation service: the transcript never leaves the tab.
 * Nothing here is trusted on the way back in — every field is re-validated, a record's
 * destination must be a same-site path, and evidence keeps only what the panel renders. Audio is
 * never stored: an object URL means nothing after a reload, and a pending playback flag would
 * claim speech that no longer exists.
 */
import { isEmptyLinkSet, type RecordLink, type RecordLinkSet } from "./record-link-types";

export const CONVERSATION_STATE_KEY = "ut.oracle.conversation.v2";
export const CONVERSATION_STATE_VERSION = 2;
export const MAX_RESTORED_MESSAGES = 40;
export const MAX_STATE_CHARS = 200_000;

/** One evidence field, as the panel renders it. */
export interface StoredEvidenceField {
  label: string;
  value: string;
}

/** The parts of the selected-entry evidence panel worth restoring. */
export interface StoredEvidence {
  entityId: string;
  entityType: string;
  title: string;
  system: string;
  sourceType: string;
  fields: StoredEvidenceField[];
  action: { label: string; href: string } | null;
}

/** The part of a message worth restoring. Audio object URLs and pending flags are not. */
export interface RestoredMessage {
  role: "user" | "oracle";
  text: string;
  mode?: string;
  outputMode?: string;
  records?: RecordLinkSet;
  /** The selected-entry evidence this answer was shown with, if any. */
  evidence?: StoredEvidence;
}

/**
 * The identifiers that opened the conversation.
 *
 * A visitor who returns to the SAME entry link is returning to the same conversation; a visitor
 * who arrives on a DIFFERENT one is not. Comparing this descriptor is what tells those apart, so
 * the mount decision never has to choose between discarding a conversation and restoring an
 * unrelated one into a new handoff.
 */
export interface ConversationSeed {
  q: string;
  artworkId: string;
  entryId: string;
  researchTopicId: string;
}

export interface StoredConversationState {
  msgs: RestoredMessage[];
  seed: ConversationSeed | null;
  /** The entry the visitor had selected, kept as a stable identifier only. */
  selectedEntryId: string | null;
}

interface Envelope {
  v: number;
  at: number;
  seed: ConversationSeed | null;
  selectedEntryId: string | null;
  msgs: RestoredMessage[];
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const boundedStr = (v: unknown, max: number): string => str(v).slice(0, max);

/** A link is only usable if it points somewhere on this site. */
function validHref(v: unknown): v is string {
  const h = str(v);
  return h.startsWith("/") && !h.startsWith("//") && !h.includes("\\");
}

function validLink(v: unknown): RecordLink | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const title = boundedStr(r.title, 300);
  const kind = str(r.kind);
  if (!title || !validHref(r.href)) return null;
  if (kind !== "Journal" && kind !== "Artwork" && kind !== "Correspondence") return null;
  const system = boundedStr(r.system, 80);
  return { id: boundedStr(r.id, 300), title, kind, ...(system ? { system } : {}), href: r.href };
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
      return options.length ? { name: boundedStr(group.name, 200), options } : null;
    })
    .filter((g): g is { name: string; options: RecordLink[] } => g !== null);
  const set = { resolved, ambiguous };
  return isEmptyLinkSet(set) ? undefined : set;
}

/** The evidence panel this answer was shown with, reduced to what that panel renders. */
function validEvidence(v: unknown): StoredEvidence | undefined {
  if (!v || typeof v !== "object") return undefined;
  const e = v as Record<string, unknown>;
  const title = boundedStr(e.title, 300);
  const entityId = boundedStr(e.entityId, 300);
  if (!title || !entityId) return undefined;
  const fields = (Array.isArray(e.fields) ? e.fields : [])
    .slice(0, 24)
    .map((f) => {
      if (!f || typeof f !== "object") return null;
      const field = f as { label?: unknown; value?: unknown };
      const label = boundedStr(field.label, 120);
      const value = boundedStr(field.value, 600);
      return label || value ? { label, value } : null;
    })
    .filter((f): f is StoredEvidenceField => f !== null);
  const rawAction =
    e.action && typeof e.action === "object" ? (e.action as { label?: unknown; href?: unknown }) : null;
  const action =
    rawAction && validHref(rawAction.href)
      ? { label: boundedStr(rawAction.label, 120), href: rawAction.href }
      : null;
  return {
    entityId,
    entityType: boundedStr(e.entityType, 80),
    title,
    system: boundedStr(e.system, 80),
    sourceType: boundedStr(e.sourceType, 80),
    fields,
    action,
  };
}

/** A seed is compared, never trusted: normalised and bounded here and on the way back in. */
export function seedFrom(input: Partial<Record<keyof ConversationSeed, unknown>>): ConversationSeed {
  return {
    q: boundedStr(input.q, 1200).trim(),
    artworkId: boundedStr(input.artworkId, 300).trim(),
    entryId: boundedStr(input.entryId, 300).trim(),
    researchTopicId: boundedStr(input.researchTopicId, 300).trim(),
  };
}

/** True when no identifier opened this conversation — an ordinary visit to the Oracle. */
export function isEmptySeed(seed: ConversationSeed | null | undefined): boolean {
  if (!seed) return true;
  return !seed.q && !seed.artworkId && !seed.entryId && !seed.researchTopicId;
}

export function sameSeed(
  a: ConversationSeed | null | undefined,
  b: ConversationSeed | null | undefined
): boolean {
  if (!a || !b) return false;
  return (
    a.q === b.q && a.artworkId === b.artworkId && a.entryId === b.entryId && a.researchTopicId === b.researchTopicId
  );
}

export type RestoreReason = "nothing-stored" | "returning" | "same-handoff" | "new-intent";

export interface RestoreDecision {
  /** Read the stored conversation back into the interface. */
  restore: boolean;
  /** Discard the stored conversation: a genuinely different handoff is starting. */
  clear: boolean;
  reason: RestoreReason;
}

/**
 * The mount decision, deliberately separate from the effect that carries it out.
 *
 *   nothing stored        -> nothing to restore, nothing to clear
 *   arrived with no seed  -> the visitor came back to the conversation; restore it
 *   the SAME seed         -> they returned through the same entry link; restore it
 *   a DIFFERENT seed      -> a genuinely new handoff; clear it and apply its selection and draft
 *
 * Clearing only on a DIFFERENT seed is the point: returning to the same `?q=` URL is not a new
 * intent, and treating it as one threw the conversation away. Restoring on an EMPTY seed is the
 * other half: a plain visit to /oracle is the visitor coming back, not a new handoff.
 */
export function decideRestore(
  storedSeed: ConversationSeed | null | undefined,
  incomingSeed: ConversationSeed
): RestoreDecision {
  if (storedSeed === null || storedSeed === undefined) {
    return { restore: false, clear: false, reason: "nothing-stored" };
  }
  if (isEmptySeed(incomingSeed)) {
    return { restore: true, clear: false, reason: "returning" };
  }
  if (sameSeed(storedSeed, incomingSeed)) {
    return { restore: true, clear: false, reason: "same-handoff" };
  }
  return { restore: false, clear: true, reason: "new-intent" };
}

export type SelectionSource = "url" | "stored" | "none";

/**
 * Which entry is selected after a mount or a return.
 *
 * An identifier in the URL is the visitor's current explicit selection and always wins — an
 * unknown one included, so it stays unknown instead of being quietly replaced by whatever was
 * selected last time. The stored selection is only a fallback for a return that carries none.
 */
export function resolveSelectedEntry(
  urlEntryId: string | null | undefined,
  storedEntryId: string | null | undefined
): { selected: string | null; source: SelectionSource } {
  const url = str(urlEntryId).trim();
  if (url) return { selected: url, source: "url" };
  const stored = str(storedEntryId).trim();
  if (stored) return { selected: stored, source: "stored" };
  return { selected: null, source: "none" };
}

function keepMessage(msg: Record<string, unknown>): RestoredMessage | null {
  const role = msg.role === "user" || msg.role === "oracle" ? msg.role : null;
  const text = str(msg.text);
  if (!role || !text) return null;
  const records = validLinkSet(msg.records);
  const evidence = role === "oracle" ? validEvidence(msg.evidence) : undefined;
  return {
    role,
    text,
    ...(str(msg.mode) ? { mode: str(msg.mode) } : {}),
    ...(str(msg.outputMode) ? { outputMode: str(msg.outputMode) } : {}),
    ...(records ? { records } : {}),
    ...(evidence ? { evidence } : {}),
  };
}

/**
 * The messages worth keeping. Returns null when there is nothing to keep, so a cleared
 * conversation leaves no stale record behind.
 */
export function serializeConversation(msgs: readonly unknown[]): string | null {
  const kept: RestoredMessage[] = [];
  for (const m of msgs) {
    if (!m || typeof m !== "object") continue;
    const kept1 = keepMessage(m as Record<string, unknown>);
    if (kept1) kept.push(kept1);
  }
  if (!kept.length) return null;
  const envelope: Envelope = {
    v: CONVERSATION_STATE_VERSION,
    at: Date.now(),
    seed: null,
    selectedEntryId: null,
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

/** The whole state, handoff and selection included. Null when there is nothing worth keeping. */
export function serializeConversationState(state: {
  msgs: readonly unknown[];
  seed?: ConversationSeed | null;
  selectedEntryId?: string | null;
}): string | null {
  const base = serializeConversation(state.msgs);
  if (base === null) return null;
  if (!state.seed && !state.selectedEntryId) return base;
  const envelope = JSON.parse(base) as Envelope;
  envelope.seed = state.seed ? seedFrom(state.seed) : null;
  envelope.selectedEntryId = str(state.selectedEntryId).trim() || null;
  const json = JSON.stringify(envelope);
  return json.length > MAX_STATE_CHARS ? base : json;
}

function readEnvelope(raw: string | null | undefined): Envelope | null {
  if (!raw || typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const env = parsed as Partial<Envelope>;
  if (env.v !== CONVERSATION_STATE_VERSION) return null;
  if (!Array.isArray(env.msgs)) return null;
  return env as Envelope;
}

function restoreMessages(raw: unknown): RestoredMessage[] {
  const out: RestoredMessage[] = [];
  for (const m of (Array.isArray(raw) ? raw : []).slice(-MAX_RESTORED_MESSAGES)) {
    if (!m || typeof m !== "object") continue;
    const kept = keepMessage(m as Record<string, unknown>);
    if (kept) out.push(kept);
  }
  return out;
}

/** Read back a conversation. Anything unrecognised reads as no conversation, never as a guess. */
export function restoreConversation(raw: string | null | undefined): RestoredMessage[] {
  const env = readEnvelope(raw);
  return env ? restoreMessages(env.msgs) : [];
}

/** Read back the whole state: the messages, the handoff that opened them, and the selection. */
export function restoreConversationState(raw: string | null | undefined): StoredConversationState | null {
  const env = readEnvelope(raw);
  if (!env) return null;
  const msgs = restoreMessages(env.msgs);
  if (!msgs.length) return null;
  const seed = env.seed && typeof env.seed === "object" ? seedFrom(env.seed) : null;
  const selectedEntryId = boundedStr(env.selectedEntryId, 300).trim() || null;
  return { msgs, seed, selectedEntryId };
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
export function readStoredConversation(): StoredConversationState | null {
  if (typeof window === "undefined") return null;
  try {
    return restoreConversationState(window.sessionStorage.getItem(CONVERSATION_STATE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredConversation(
  msgs: readonly unknown[],
  seed?: ConversationSeed | null,
  selectedEntryId?: string | null
): void {
  if (typeof window === "undefined") return;
  try {
    const json = serializeConversationState({
      msgs,
      seed: seed ?? null,
      selectedEntryId: selectedEntryId ?? null,
    });
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

/**
 * The mount decision and the state it applies to, in one place.
 *
 * Kept as a pure function of (stored state, what the URL says, the seed in it) so the behaviour
 * the mount effect actually performs can be exercised without a browser: the effect below is a
 * thin wrapper that performs this result.
 */
export interface MountPlan {
  msgs: RestoredMessage[];
  selectedEntryId: string | null;
  selectionSource: SelectionSource;
  clear: boolean;
  reason: RestoreReason;
  /**
   * The conversation's ORIGINATING handoff — what the store must keep for it.
   *
   * On a restore this is the seed the conversation was OPENED by, never the seed of the URL the
   * visitor happened to return through. A plain return to /oracle carries no identifiers, and
   * writing that empty seed over the originating one would make the original entry link look like
   * a different handoff next time — and clear the conversation it belongs to.
   *
   * It is replaced only when a genuinely different handoff begins, or when a new conversation
   * starts: in both cases the plan's seed is the incoming one.
   */
  seed: ConversationSeed;
}

export function planMount(
  stored: StoredConversationState | null,
  incomingSeed: ConversationSeed,
  urlEntryId: string | null
): MountPlan {
  const decision = decideRestore(stored ? stored.seed : null, incomingSeed);
  if (!decision.restore || !stored) {
    return {
      msgs: [],
      // A new handoff applies the identifier it arrived with, and nothing else.
      selectedEntryId: str(urlEntryId).trim() || null,
      selectionSource: str(urlEntryId).trim() ? "url" : "none",
      clear: decision.clear,
      reason: decision.reason,
      // Nothing was restored, so the conversation starts under the handoff it arrived with —
      // empty when it arrived with none.
      seed: incomingSeed,
    };
  }
  const selection = resolveSelectedEntry(urlEntryId, stored.selectedEntryId);
  return {
    msgs: stored.msgs,
    selectedEntryId: selection.selected,
    selectionSource: selection.source,
    clear: false,
    reason: decision.reason,
    // The conversation keeps the handoff it was opened by, whatever URL brought the visitor back.
    seed: stored.seed ?? seedFrom({}),
  };
}
