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
import { resolveNamedRecords, type NamedRecordResolution } from '@/lib/named-record-resolver';
import { recordLinksFor } from '@/lib/record-links';

/** Marker the backend seam recognises, so the referent is never mistaken for grounding. */
const SUBJECT_MARKER = "Current subject of this conversation:";
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

    /* ANCHOR EXCLUSIVITY — one active anchor per request.
       A research topic that was REQUESTED is the active anchor whether or not it
       resolved: when it resolves it grounds the answer, and when it does not it
       occupies the anchor slot as an honest unavailable disclosure. In both cases
       the correspondence entry and the artwork are DISPLACED records — known,
       resolvable, and deliberately not used. They therefore contribute no
       grounding, no permitted citation href and no evidence. This is the same
       rule the artwork branch already applied to an unresolved topic; it now
       applies to the entry as well, so no channel can disagree with another.

       Note the asymmetry, which is deliberate: only a RESOLVED record can be
       displaced. An identifier that failed to resolve has no record to displace,
       so its honest "unavailable" instruction is still grounded — unless a
       research anchor is claiming the slot, in which case the research block has
       already told the model to answer from the general corpus. */
    const entryDisplaced = entry !== null && researchRequested;
    const activeAnchor: 'research' | 'entry' | 'artwork' | 'none' =
      researchRequested ? 'research' : entry ? 'entry' : artwork ? 'artwork' : 'none';

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

    if (entry && !entryDisplaced) {
      groundingParts.push(entry.promptBlock);
    }

    /* ── Named-record resolution (a FALLBACK, never an override) ───────────────
       A record can also be reached by NAME. Until now only a SELECTED record was
       grounded, so a visitor who typed "Follow Aleph through its element, colour
       and frequency" reached the provider with no record at all — and the backend
       cannot compensate, because the record lives in this dataset, not in its
       corpus. Resolving here happens BEFORE the backend's broad semantic retrieval,
       reusing the same identifier scheme and the same server-side resolver as a
       selected record, so named and selected produce identical grounding.

       It applies only when the visitor selected NOTHING (`!entry` and no research
       topic), so an explicit anchor stays authoritative and can never be
       overridden by a name that merely appears in the question. */
    // `entityId` presence, NOT `entry`: an identifier the visitor SUPPLIED but that
    // failed to resolve must stay a failed selection. Inferring a record from the
    // question here would silently substitute a different record for the one chosen.
    const explicitSelectionSupplied =
      typeof entityId === "string" && entityId.trim().length > 0;
    let namedRecords: NamedRecordResolution | null = null;
    if (!entry && !explicitSelectionSupplied && !researchRequested) {
      const named = resolveNamedRecords(question, conversation);
      const subject = named.subject;
      /* The visitor's CURRENT SUBJECT, carried separately from the literal question, from any
      record grounding and from the transcript. A subject the correspondence registry does not
      carry is still their subject — it is never dressed up as an invented record, and the
      registry's silence is never reported as the absence of the subject from the archive. */
      if (subject && subject.kind === "subject" && subject.carried && subject.text) {
      groundingParts.push(
      `${SUBJECT_MARKER} "${subject.text}"\n` +
      `Keep ${subject.text} as the subject of this conversation. The correspondence registry ` +
      `carries no record for it — do not invent one, and do not present it as a correspondence ` +
      `entry. That silence is the registry's own: never tell the visitor that ${subject.text} is ` +
      `absent from the archive, its books, its artworks or its Journal. Continue about ` +
      `${subject.text} using the conversation above and any material below. Do not substitute ` +
      `an unrelated archive page, and do not treat a pronoun in the question as a word to decode.`
      );
      }
      if (named.blocks.length) {
        namedRecords = named;
        groundingParts.push(...named.blocks);
      }
    }

    /* ── Codex page questions ──────────────────────────────────────────────────
       Page-anchored retrieval only covers pages 1-200. When the visitor names a
       page we state that bound honestly instead of letting another page or a
       different book stand in for it. */
    const pageRef = extractPageReference(question);
    if (pageRef !== null) {
      groundingParts.push(pageReferenceGuidance(pageRef));
    }

    // A displaced record's resolution state is irrelevant to this answer: the
    // research block already tells the model to answer from the general corpus.
    // Two competing "the selected entry is unavailable" instructions would only
    // compete for attention, so only the active anchor's state is grounded.
    if (entityNotice && !entryDisplaced) {
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
    // Only the active anchor may be cited. A displaced entry's href is not
    // permitted here, so the model cannot attach it to an answer it was never
    // shown the grounds for.
    const allowedHrefs = entry && !entryDisplaced && entry.action ? [entry.action.href] : [];
    const answer = stripUnverifiedCitations(data.response || data.answer || '', allowedHrefs);

    const total = timings.reduce((sum, t) => sum + t.ms, 0);

    return NextResponse.json({
      response: answer,
      /* A capped fragment is never presented as a finished answer. The backend flags it
         and marks the text itself; this carries the flag through so the site can say so
         in its own words rather than leaving the visitor to notice a mid-sentence end. */
      answerTruncated: data.answer_truncated === true,
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
      // Which record actually grounded this answer. The client uses it to decide
      // whether an evidence panel is truthful, so it is never client-inferred.
      activeAnchor,
      // Server-resolved evidence for the ACTIVE anchor only, rendered compactly by
      // the client. A displaced entry gets no evidence object: showing its fields
      // and inspect action beside an answer the model never saw it in would be
      // fabricated support.
      evidence: entry && !entryDisplaced
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
      // A resolved record that was displaced is NOT unknown and NOT absent. It is
      // reported as displaced so a client can say "not used" rather than
      // "unavailable" — the record exists; the precedence rule skipped it.
      entityStatus: entryDisplaced ? 'displaced' : entry ? 'resolved' : resolution.status,
      // Enough to name the skipped record honestly, without its fields or its
      // action: it is a disclosure, not evidence.
      displacedEntry: entryDisplaced && entry
        ? {
            entityId: entry.entityId,
            entityType: entry.entityType,
            title: entry.title,
            system: entry.system,
          }
        : null,
      // Records reached by NAME in this question. Reported so the client, the tests
      // and a reviewer can see exactly which record grounded the answer, and that an
      // ambiguous name was REPORTED rather than silently resolved to one record.
      namedRecords: namedRecords
        ? {
            ids: namedRecords.ids,
            ambiguous: namedRecords.ambiguous.map((item) => ({
              name: item.name,
              matches: item.matches.map((m) => m.id),
            })),
          }
        : null,
      /* The same resolution, as the visitor can use it: every record the answer was grounded on,
         with its own title, its kind and the page it lives on. Derived from the identities
         above and the registries that own them — never from the model's prose, and never a
         guessed slug. Null when the question named no record, so an unknown subject acquires
         no card. */
      recordLinks: recordLinksFor(namedRecords),
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
