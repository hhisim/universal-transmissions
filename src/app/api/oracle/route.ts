import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ORACLE_BACKEND_URL || 'http://204.168.154.237:8002';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, mode, lang, speed } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
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
        message: message.trim(),
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
    return NextResponse.json({ response: data.response || data.answer || '' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[oracle/api]', msg);
    if (msg.includes('abort')) {
      return NextResponse.json({ error: 'The Oracle took too long.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'The transmission was interrupted.' }, { status: 500 });
  }
}
