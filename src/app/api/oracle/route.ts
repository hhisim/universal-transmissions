import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, mode, lang } = await req.json();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const res = await fetch('https://oracle.hakanhisim.net/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: 'codex', mode, lang, message }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[oracle/api]', err);
    return NextResponse.json(
      { error: 'The transmission was interrupted.' },
      { status: 500 }
    );
  }
}
