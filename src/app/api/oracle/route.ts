import { NextResponse } from 'next/server';
import { artworks } from '@/data/artworks';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, mode, lang, speed } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const artwork = resolveArtwork(body?.artworkId);
    // Only registry-verified metadata is prepended. An unknown id is ignored
    // rather than echoed back, so URL text cannot pose as archive evidence.
    const groundedMessage = artwork
      ? [
          `Artwork context (verified record ${artwork.id}):`,
          `Title: ${artwork.title}`,
          `Year: ${artwork.year}`,
          `Medium: ${artwork.medium}`,
          `Author description: ${artwork.description}`,
          `Tags: ${artwork.tags.join(', ')}`,
          '',
          `Question: ${message.trim()}`,
        ].join('\n')
      : message.trim();

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
        message: groundedMessage,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const detail = await res.text().catch(() => 'unknown');
      console.error('[oracle/api] backend error:', res.status, detail);
      return NextResponse.json(
        { error: 'The Codex Oracle is temporarily unavailable.' },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      response: data.response || data.answer || '',
      groundedArtworkId: artwork?.id ?? null,
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
