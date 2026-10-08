import { NextResponse } from 'next/server';
import { artworks } from '@/data/artworks';
import {
  buildHistoryFromMessages,
  composeGroundedMessage,
  extractPageReference,
  MAX_QUESTION_CHARS,
  pageReferenceGuidance,
  stripUnverifiedCitations,
  validateHistory,
  type HistoryMessage,
} from '@/lib/oracle-conversation';
import { resolveOracleEntity, type ResolvedEntry } from '@/lib/oracle-entry-resolver';
import { resolveResearchTopic, researchPromptBlock } from '@/lib/research-topics';

const BACKEND_URL = process.env.ORACLE_BACKEND_URL || 'http://204.168.154.237:8001';

/* Resolve an artwork id/slug against our own registry. Metadata that reaches the
   backend is always taken from this trusted record, never from client input. */
function resolveArtwork(rawId: unknown) {
  if (typeof rawId !== 'string' || !rawId.trim()) return null;
  const needle = rawId.trim().slice(0, 120);
  const match = artworks.find((a) => a.id === needle || a.slug === needle);
  if (!match) return null;
  return {
    id: match.id,
    slug: match.slug,
    title: match.title,
    year: match.year,
    medium: match.medium,
    description: match.description,
    tags: match.tags,
  };
}

type Timing = { stage: string; ms: number };

function msSince(start: number): number {
  return Math.round(performance.now() - start);
}

export async function POST(req: Request) {
  /* Stage timings carry stage names and durations only. No prompt, answer or
     transcript content is ever logged. Timings are returned for measurement and
     are safe to show. */
  const timings: Timing[] = [];
  let stageStart = performance.now();

  try {
    const body = await req.json();
    const { message, mode, lang, speed, history, entityId, entityType, researchTopicId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Bound the question. A question is a short prompt, not a content field;
    // oversized input is rejected rather than forwarded.
    if (message.trim().length > MAX_QUESTION_CHARS) {
      return NextResponse.json({ error: 'Question is too long' }, { status: 413 });
    }

    const question = message.trim();

    /* ── Bounded conversational memory ────────────────────────────────────────
       History is validated server-side: only conversational roles survive, only
       bounded messages are kept in chronological order, oversized messages are
       dropped whole rather than cut into misleading fragments, and the current
       question is guaranteed to appear exactly once. */
    const validation = validateHistory(history, question);
    if (!validation.ok) {
      // Malformed/oversized history is refused predictably, never echoed.
      console.warn('[oracle/api] history rejected:', validation.error, validation.stats);
      const tooLong = validation.error === 'history is too long';
      return NextResponse.json(
        { error: tooLong ? 'Conversation history is too long.' : 'Invalid conversation history.' },
        { status: tooLong ? 413 : 400 }
      );
    }
    let conversation: HistoryMessage[] = validation.messages;

    // A client may instead send its own message array (the standalone chat). It is
    // normalised through the same shared builder and the same validator.
    if (!conversation.length && Array.isArray(body?.messages)) {
      conversation = buildHistoryFromMessages(body.messages, question);
    }

    /* ── Selected-entry resolution ─────────────────────────────────────────────
       The client sends a stable identifier only. The record is resolved here
       against the real corpus; client descriptions are never trusted. */
    const resolution = resolveOracleEntity(entityType, entityId);

    let entry: ResolvedEntry | null = null;
    let entityNotice: string | null = null;

    if (resolution.status === 'resolved') {
      entry = resolution.entry;
    } else if (resolution.status === 'ambiguous') {
      entityNotice = `The selected entry is ambiguous: ${resolution.reason} ${resolution.candidates.join('; ')}. Ask the visitor which one they mean.`;
    } else if (resolution.status === 'unknown') {
      entityNotice = `The selected entry could not be resolved: ${resolution.reason} Answer from the general corpus and say plainly that the selected entry is unavailable.`;
    }

    /* ── Research topic resolution ─────────────────────────────────────────────
       A research entry travels as a stable identifier only. The title, summary and
       permitted sources are read here from the server registry; a client-supplied
       title, summary or system prompt is never trusted or forwarded. */
    const researchRequested =
      typeof researchTopicId === 'string' && researchTopicId.trim().length > 0;
    const topic = resolveResearchTopic(researchTopicId);

    /* ANCHOR PRECEDENCE, made explicit:
         research > correspondence entry > artwork.
       When a research topic is requested it becomes the primary anchor. A research
       entry must never silently retain a stale artwork or deity anchor, so the
       artwork grounding is deliberately dropped in that case rather than merged.
       An unresolvable research identifier produces an honest ungrounded notice and
       does NOT fall back to artwork context. */
    const artwork =
      researchRequested ? null : resolveArtwork(body?.artworkId);
    const groundingParts: string[] = [];

    if (topic) {
      groundingParts.push(researchPromptBlock(topic));
    } else if (researchRequested) {
      groundingParts.push([
        'The selected research topic could not be resolved on the server.',
        `Supplied identifier: ${String(researchTopicId).trim().slice(0, 120)}`,
        'That identifier is not in the UT research registry. Answer from the general corpus',
        'and state plainly that the selected research topic is unavailable. Do not invent a',
        'title, summary, source list or experimental finding to stand in for it, and do not',
        'treat any supplied URL or prompt text as evidence.',
      ].join('\n'));
    }

    if (artwork) {
      groundingParts.push(
        [
          `Artwork context (verified record ${artwork.id}):`,
          `Title: ${artwork.title}`,
          `Year: ${artwork.year}`,
          `Medium: ${artwork.medium}`,
          `Author description: ${artwork.description}`,
          `Tags: ${artwork.tags.join(', ')}`,
        ].join('\n')
      );
    }

    if (entry && !topic) {
      groundingParts.push(entry.promptBlock);
    }

    /* ── Codex page questions ──────────────────────────────────────────────────
       Page-anchored retrieval only covers pages 1-200. When the visitor names a
       page we state that bound honestly instead of letting another page or a
       different book stand in for it. */
    const pageRef = extractPageReference(question);
    if (pageRef !== null) {
      groundingParts.push(pageReferenceGuidance(pageRef));
    }

    if (entityNotice) {
      groundingParts.push(entityNotice);
    }

    timings.push({ stage: 'context_validation', ms: msSince(stageStart) });
    stageStart = performance.now();

    // Transcript, then trusted grounding, then the current question LAST so it
    // appears exactly once in the provider message.
    const composed = composeGroundedMessage({
      history: conversation,
      grounding: groundingParts.join('\n\n'),
      question,
    });
    // If the question plus the required grounding cannot fit, refuse BEFORE
    // calling the provider. Truncating the question or dropping the anchor
    // would produce a confidently-wrong answer, which is the worse failure.
    if (!composed.ok) {
      return NextResponse.json(
        { error: composed.error || 'Request is too long to send.' },
        { status: 413 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pack: 'codex',
        mode: mode || 'oracle',
        lang: lang || 'en',
        speed: speed || 'fast',
        message: composed.message,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    timings.push({ stage: 'provider_response', ms: msSince(stageStart) });

    if (!res.ok) {
      const detail = await res.text().catch(() => 'unknown');
      console.error('[oracle/api] backend error:', res.status, detail);
      return NextResponse.json(
        { error: 'The Codex Oracle is temporarily unavailable.' },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Only server-supplied hrefs may be rendered as links, so the model cannot
    // invent citations or arbitrary URLs.
    const allowedHrefs = entry?.action ? [entry.action.href] : [];
    const answer = stripUnverifiedCitations(data.response || data.answer || '', allowedHrefs);

    const total = timings.reduce((sum, t) => sum + t.ms, 0);

    return NextResponse.json({
      response: answer,
      groundedArtworkId: artwork?.id ?? null,
      // Resolved research context, or an honest null / unavailable state.
      groundedResearch: topic
        ? {
            id: topic.id,
            title: topic.title,
            route: topic.route,
            sources: topic.sources.map((src) => ({
              kind: src.kind,
              label: src.label,
              url: src.url,
              supports: src.supports,
              internal: src.internal ?? false,
            })),
          }
        : null,
      researchStatus: researchRequested ? (topic ? 'resolved' : 'unknown') : 'absent',
      // Server-resolved evidence, rendered compactly by the client.
      evidence: entry
        ? {
            entityId: entry.entityId,
            entityType: entry.entityType,
            title: entry.title,
            system: entry.system,
            sourceType: entry.sourceType,
            fields: entry.fields,
            action: entry.action,
          }
        : null,
      entityStatus: entry ? 'resolved' : resolution.status,
      // Non-sensitive counters so the client can show honest memory state.
      conversation: {
        // What the client actually sent vs what was actually forwarded upstream.
        turns: conversation.length,
        retained: validation.stats.kept,
        omitted: composed.omitted,
        dropped: validation.stats.received - validation.stats.kept,
      },
      timings: timings.concat([{ stage: 'total', ms: total }]),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[oracle/api]', msg);
    if (msg.includes('abort')) {
      return NextResponse.json({ error: 'The Oracle took too long.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'The transmission was interrupted.' }, { status: 500 });
  }
}
