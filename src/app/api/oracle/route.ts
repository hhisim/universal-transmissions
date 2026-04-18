import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ORACLE_BACKEND_URL || 'https://oracle.hakanhisim.net';

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
    const response = data.response || data.answer || '';

    if (data.error && !response) {
      console.error('[oracle/api] backend provider error:', data.error);
      return NextResponse.json({ error: data.error }, { status: 502 });
    }

    if (/all llm providers failed/i.test(response)) {
      console.error('[oracle/api] backend provider error:', response);
      return NextResponse.json({ error: response }, { status: 502 });
    }

    return NextResponse.json({ response });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[oracle/api]', msg);
    if (msg.includes('abort')) {
      return NextResponse.json({ error: 'The Oracle took too long.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'The transmission was interrupted.' }, { status: 500 });
  }
}
