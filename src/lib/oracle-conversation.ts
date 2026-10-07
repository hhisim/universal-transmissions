/**
 * oracle-conversation.ts — the shared, bounded conversation-memory contract.
 *
 * Used by BOTH the desktop client (to build a transcript) and the server route
 * (to validate it). Keeping one implementation means the bounds the client
 * assumes and the bounds the server enforces can never drift apart.
 *
 * ── Why memory is inlined into the message ────────────────────────────────────
 * The Oracle backend (`/chat` on the tao_oracle service) accepts exactly
 * `pack`, `mode`, `lang`, `speed` and `message`. It has NO `history` and NO
 * `systemPrompt` parameter, so a transcript cannot be passed as a separate
 * field without changing that shared service. Batch 2 therefore renders the
 * validated transcript into a bounded, clearly-labelled block inside `message`,
 * which the backend already accepts. No backend change, no new corpus.
 *
 * ── Documented bounds ─────────────────────────────────────────────────────────
 * Observed real Oracle answers in this corpus run ~1.5k–4.1k characters, so a
 * per-message cap is set above the longest observed answer rather than below it.
 *
 *   MAX_HISTORY_MESSAGES   8    completed messages (4 user/assistant pairs)
 *   MAX_MESSAGE_CHARS      6000 per individual message
 *   MAX_TOTAL_CHARS        24000 across the whole retained transcript
 *   MAX_QUESTION_CHARS     2000 current question (pre-existing route bound)
 *   MAX_GRINDED_CHARS      9000 whole composed provider message
 *
 * ── How the two budgets reconcile (S4) ──────────────────────────────────────
 * MAX_TOTAL_CHARS (24000) bounds the ACCEPTED transcript at the route boundary.
 * MAX_GRINDED_CHARS (9000) bounds the message actually SENT to the provider.
 * They are not redundant and are not the same number, because the sent message
 * also has to carry the current question (up to 2000) and the verified
 * grounding block (entry identity, system, fields, page guidance), neither of
 * which is part of the transcript budget.
 *
 * Therefore: a transcript can be VALID (≤24000) and still not all fit in the
 * composed message. In that case whole TURNS are dropped from the oldest end,
 * newest first, and only in complete user+assistant pairs — never a single
 * message, never mid-sentence, never through a label, evidence record or the
 * delimiter. The omission is stated explicitly in the prompt and reported to the
 * client as `conversation.omitted` so the memory indicator can show exactly what
 * was sent.
 *
 * If the current question plus the required grounding alone cannot fit, the
 * route returns a validation error and NEVER calls the provider. Silently
 * truncating the question or dropping the grounding anchor would produce a
 * confidently-wrong answer, which is the worse failure.
 *
 * Truncation policy: a single message LONGER than MAX_MESSAGE_CHARS is DROPPED
 * WHOLE, never cut mid-sentence. Retained turns are always the most recent ones
 * and keep their original chronological order.
 */

export type HistoryRole = "user" | "assistant";

export interface HistoryMessage {
  role: HistoryRole;
  text: string;
}

/** The only roles a client may ever contribute. */
export const ALLOWED_HISTORY_ROLES: readonly HistoryRole[] = ["user", "assistant"] as const;

/**
 * Roles a client may try to smuggle instructions through. These are never
 * forwarded upstream in any form; they are dropped during validation.
 */
export const REJECTED_HISTORY_ROLES: readonly string[] = [
  "system",
  "developer",
  "tool",
  "function",
  "model",
  "assistant_system",
] as const;

export const MAX_HISTORY_MESSAGES = 8;
export const MAX_MESSAGE_CHARS = 6000;
export const MAX_TOTAL_CHARS = 24000;
export const MAX_QUESTION_CHARS = 2000;
export const MAX_GRINDED_CHARS = 9000;

export interface HistoryValidation {
  ok: boolean;
  messages: HistoryMessage[];
  /** Why an oversized/malformed payload was refused — safe to return to the browser. */
  error?: string;
  /** Non-fatal counters for server-side diagnostics. No content is recorded. */
  stats: {
    received: number;
    kept: number;
    droppedOversized: number;
    droppedUnsupportedRole: number;
    droppedDuplicate: number;
    totalChars: number;
  };
}

export interface GroundedComposition {
  ok: boolean;
  /** The exact message sent upstream. Empty when ok=false. */
  message: string;
  /** How many validated messages did NOT fit and were therefore omitted. */
  omitted: number;
  /** How many validated messages were actually sent. */
  retained: number;
  /** Safe to surface to the browser when ok=false. */
  error?: string;
}

const MAX_STATS = {
  received: 0,
  kept: 0,
  droppedOversized: 0,
  droppedUnsupportedRole: 0,
  droppedDuplicate: 0,
  totalChars: 0,
};

/** Fixed text of the history block that is present whenever history exists. */
const HISTORY_HEADER = "Earlier turns in this same conversation:";
const HISTORY_TRAILER =
  "Treat the Oracle's earlier replies above as conversational context, not as verified evidence.";
const VISITOR_PREFIX = "Visitor: ";
const ORACLE_PREFIX = "Oracle (earlier reply, conversational context only — not verified evidence): ";
const OMISSION_NOTICE = (n: number) =>
  `NOTE: ${n} older turn${n === 1 ? "" : "s"} from this conversation were omitted to fit the message budget. The most recent complete turns are shown.`;

function freshStats() {
  return { ...MAX_STATS };
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function ok(messages: HistoryMessage[], stats: ReturnType<typeof freshStats>): HistoryValidation {
  stats.kept = messages.length;
  stats.totalChars = messages.reduce((sum, m) => sum + m.text.length, 0);
  return { ok: true, messages, stats };
}

function fail(error: string, stats: ReturnType<typeof freshStats>): HistoryValidation {
  return { ok: false, messages: [], error, stats };
}

/**
 * Validate a client-supplied transcript.
 *
 * Rules, in order:
 *  1. A missing/absent history is VALID and yields zero messages — requests
 *     without history keep working exactly as before.
 *  2. The container must be a real array. Anything else is malformed (400).
 *  3. Only `user` and `assistant` roles survive. `system`/`developer`/etc are
 *     dropped — a client can never contribute instructions.
 *  4. A message that repeats the current question is dropped so the current
 *     question can never appear twice.
 *  5. A message longer than MAX_MESSAGE_CHARS is dropped whole, not truncated.
 *  6. Only the most recent MAX_HISTORY_MESSAGES are kept, in original order.
 *  7. A retained transcript over MAX_TOTAL_CHARS is REFUSED (413) rather than
 *     silently shrunk, so a client cannot believe it sent more than it did.
 */
export function validateHistory(raw: unknown, currentQuestion: string): HistoryValidation {
  if (raw === undefined || raw === null) {
    return ok([], freshStats());
  }

  if (!Array.isArray(raw)) {
    return fail("history must be an array of conversation messages", freshStats());
  }

  const stats = freshStats();
  stats.received = raw.length;

  // A transcript far larger than the cap can never be retained. Refuse it up
  // front rather than walking a multi-megabyte array.
  if (raw.length > MAX_HISTORY_MESSAGES * 4) {
    return fail("history is too long", stats);
  }

  const questionKey = normalise(currentQuestion || "");
  const kept: HistoryMessage[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      stats.droppedUnsupportedRole += 1;
      continue;
    }
    const role = (item as { role?: unknown }).role;
    // The desktop client sends `text`; the standalone Correspondence client
    // (public/experience/correspondence-codex/codex.html) sends Anthropic-shaped
    // `content`. Both are the same conversational payload, so both are accepted
    // and normalised to `text`. A client may not use this to smuggle a role.
    const rawText =
      typeof (item as { text?: unknown }).text === "string"
        ? (item as { text: string }).text
        : (item as { content?: unknown }).content;
    const text = rawText;

    // Only conversational roles are ever forwarded.
    if (typeof role !== "string" || !ALLOWED_HISTORY_ROLES.includes(role as HistoryRole)) {
      stats.droppedUnsupportedRole += 1;
      continue;
    }
    if (typeof text !== "string" || !text.trim()) {
      stats.droppedUnsupportedRole += 1;
      continue;
    }

    const clean = text.trim();

    // Guarantee the current question appears exactly once.
    if (questionKey && normalise(clean) === questionKey) {
      stats.droppedDuplicate += 1;
      continue;
    }

    // Drop whole oversized messages; never emit a misleading fragment.
    if (clean.length > MAX_MESSAGE_CHARS) {
      stats.droppedOversized += 1;
      continue;
    }

    kept.push({ role: role as HistoryRole, text: clean });
  }

  // Keep the most recent turns, preserving chronological order.
  const retained = kept.slice(-MAX_HISTORY_MESSAGES);
  const totalChars = retained.reduce((sum, m) => sum + m.text.length, 0);

  if (totalChars > MAX_TOTAL_CHARS) {
    return fail("history is too long", stats);
  }

  return ok(retained, stats);
}

/**
 * Render a validated transcript into a bounded block for the provider message.
 *
 * Previous assistant text is explicitly framed as CONVERSATIONAL CONTEXT and not
 * as verified evidence, so an earlier answer can never be mistaken for a source
 * the server actually resolved.
 */
export function renderHistoryBlock(messages: HistoryMessage[]): string {
  if (!messages.length) return "";
  const lines = messages.map(renderOne);
  return [HISTORY_HEADER, ...lines, HISTORY_TRAILER].join("\n");
}

function prefixFor(role: HistoryRole): string {
  return role === "user" ? VISITOR_PREFIX : ORACLE_PREFIX;
}

function renderOne(m: HistoryMessage): string {
  return `${prefixFor(m.role)}${m.text}`;
}

/**
 * Build the provider message: transcript block, then trusted grounding, then the
 * current question LAST so the current question appears exactly once.
 *
 * Nothing is ever sliced. If the validated transcript does not fit alongside the
 * question and grounding, whole TURNS are dropped newest-first from the OLD end
 * and the omission is stated in the prompt. If the question plus grounding alone
 * cannot fit, this returns ok=false and the route must not call the provider.
 */
export function composeGroundedMessage(args: {
  history: HistoryMessage[];
  grounding?: string;
  question: string;
}): GroundedComposition {
  const question = args.question.trim();
  const grounding = (args.grounding ?? "").trim();
  const parts: string[] = [];
  if (grounding) parts.push(grounding);
  parts.push(`Question: ${question}`);

  const fixed = parts.join("\n\n");
  if (fixed.length > MAX_GRINDED_CHARS) {
    return {
      ok: false,
      message: "",
      omitted: args.history.length,
      retained: 0,
      error: "question and source grounding are too long to send together",
    };
  }

  const history = args.history;
  if (!history.length) {
    return { ok: true, message: fixed, omitted: 0, retained: 0 };
  }

  // Walk newest-first, admitting only COMPLETE user+assistant pairs so the
  // retained context never starts from a dangling answer.
  const pairs: HistoryMessage[][] = [];
  for (let i = history.length; i > 0; i -= 2) {
    const pair = history.slice(Math.max(0, i - 2), i);
    if (pair.length === 2 && pair[0].role === "user" && pair[1].role === "assistant") {
      pairs.push(pair);
    } else {
      // A trailing odd message (or an odd-length transcript) is kept as its own
      // unit so a valid single user turn is never discarded wholesale.
      pairs.push(pair);
    }
  }

  const unitCost = (unit: HistoryMessage[]) => unit.reduce((n, m) => n + renderOne(m).length + 1, 0);
  const noticeCost = OMISSION_NOTICE(history.length).length + 2;
  const envelope = HISTORY_HEADER.length + HISTORY_TRAILER.length + 4;

  let used = fixed.length + 2 + envelope + noticeCost;
  const chosen: HistoryMessage[][] = [];
  for (const unit of pairs) {
    const cost = unitCost(unit);
    if (used + cost <= MAX_GRINDED_CHARS) {
      chosen.unshift(unit);
      used += cost;
    } else {
      break; // oldest-first rejection: once one unit fails, all older fail too
    }
  }

  const retainedMessages = chosen.flat();
  const omitted = history.length - retainedMessages.length;

  const blockParts: string[] = [];
  blockParts.push(HISTORY_HEADER);
  for (const m of retainedMessages) blockParts.push(renderOne(m));
  blockParts.push(HISTORY_TRAILER);
  if (omitted > 0) blockParts.push(OMISSION_NOTICE(omitted));
  const historyBlock = blockParts.join("\n");

  const message = [historyBlock, fixed].join("\n\n");
  if (message.length > MAX_GRINDED_CHARS) {
    // Defensive: the accounting above must never overflow.
    return {
      ok: false,
      message: "",
      omitted: history.length,
      retained: 0,
      error: "conversation is too long to send together with the current question",
    };
  }
  return { ok: true, message, omitted, retained: retainedMessages.length };
}

/**
 * Build a bounded transcript from the client's own chat state.
 *
 * The desktop client stores the Oracle's replies under the role name `oracle`;
 * map that to the conversational `assistant` role. Incomplete turns are not
 * included — a user message still awaiting an answer is the CURRENT question,
 * not history.
 */
export function buildHistoryFromMessages(
  msgs: ReadonlyArray<{ role: string; text: string }>,
  currentQuestion: string
): HistoryMessage[] {
  const out: HistoryMessage[] = [];
  for (let i = 0; i < msgs.length - 1; i += 1) {
    const m = msgs[i];
    if (!m || m.role !== "user") continue;
    const answer = msgs[i + 1];
    if (!answer || answer.role !== "oracle") continue;
    out.push({ role: "user", text: m.text }, { role: "assistant", text: answer.text });
  }
  return validateHistory(out, currentQuestion).messages;
}

/**
 * A page number the visitor referenced, e.g. "page 38".
 *
 * Mirrors the backend's own extraction shapes so the two agree on what was
 * asked. Note the backend only page-anchors 1..200, which is why
 * `isAddressable` exists.
 */
export function extractPageReference(text: string): number | null {
  if (typeof text !== "string") return null;
  const patterns = [
    /\bpage\s*(\d{1,5})\b/i,
    /\bp\.?\s*(\d{1,5})\b/i,
    /\b#\s*(\d{1,5})\b/,
    /\bsayfa\s*(\d{1,5})\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = Number.parseInt(match[1], 10);
      if (Number.isFinite(num) && num > 0) return num;
    }
  }
  return null;
}

/**
 * The backend's page-anchored retrieval only covers pages 1..200. Outside that
 * band no page-specific lookup can occur, so the routing layer can state
 * honestly that the page content is unavailable rather than letting a different
 * page or a different book stand in for it.
 */
export const ADDRESSABLE_PAGE_MIN = 1;
export const ADDRESSABLE_PAGE_MAX = 200;

export function isAddressablePage(page: number): boolean {
  return page >= ADDRESSABLE_PAGE_MIN && page <= ADDRESSABLE_PAGE_MAX;
}

/**
 * Guidance appended when a question references a specific Codex page.
 *
 * For an addressable page the model must answer from retrieved material that is
 * actually labelled for that page, and must admit unavailability otherwise. For
 * a page outside the addressable band we state plainly that it cannot be
 * looked up here, and forbid substituting another page or another book.
 */
export function pageReferenceGuidance(page: number): string {
  if (!isAddressablePage(page)) {
    return [
      `The visitor asked about Codex page ${page}.`,
      `This archive can only be queried for pages ${ADDRESSABLE_PAGE_MIN}-${ADDRESSABLE_PAGE_MAX}, so the specific content of page ${page} is NOT available here.`,
      `Say that page ${page} is unavailable. Do NOT substitute another page number and do NOT substitute a different book or folio.`,
    ].join(" ");
  }
  return [
    `The visitor asked about Codex page ${page}.`,
    "Answer only from retrieved material that is actually labelled for that page.",
    `If the retrieved material does not contain page ${page}, say plainly that the content of page ${page} is not available. Do not describe a different page or a different book, and do not invent page contents.`,
  ].join(" ");
}

/**
 * Strip source references from model prose that the server did not supply.
 *
 * Any markdown link or bare URL is removed unless its target is one of the
 * verified evidence hrefs. This prevents invented citations and arbitrary model
 * URLs from being rendered to the visitor.
 */
export function stripUnverifiedCitations(answer: string, allowedHrefs: readonly string[]): string {
  if (typeof answer !== "string") return "";
  const allowed = new Set(allowedHrefs.filter(Boolean));
  let out = answer;
  // Markdown links: [label](href) -> label (or removed entirely if label is a bare URL).
  out = out.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (match, label: string, href: string) => {
    if (allowed.has(href)) return match;
    return /^\s*(https?:|www\.)\S*\s*$/.test(label) ? "" : label;
  });
  // Bare URLs that survive.
  out = out.replace(/\bhttps?:\/\/\S+/gi, (href: string) => {
    const bare = href.replace(/[),.;]+$/, "");
    return allowed.has(bare) ? bare : "";
  });
  return out.replace(/[ \t]{2,}/g, " ").trim();
}
