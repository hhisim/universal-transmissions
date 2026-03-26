import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, mode, lang } = await req.json();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const params = new URLSearchParams({ q: message, mode: mode || 'oracle', lang: lang || 'en' });
    const res = await fetch(`http://204.168.154.237:8002/ask?${params}`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ response: data.answer || data.text || data.message || "" });
  } catch (err) {
    console.error('[oracle/api]', err);
    return NextResponse.json(
      { error: 'The transmission was interrupted.' },
      { status: 500 }
    );
  }
}
