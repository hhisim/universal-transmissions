import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ORACLE_BACKEND_URL || 'http://204.168.154.237:8002';

export async function POST(req: Request) {
  try {
    const { text, lang, voice } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text' }, { status: 400 });
    }

    // Strip markdown/emoji before TTS
    const clean = text
      .replace(/[#*_🜂⚛🧭🔐✧✦✶◎𒀭🔗🂠⚡🔤]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .slice(0, 3000);

    const params = new URLSearchParams({
      text: clean,
      lang: lang || 'en',
      voice: voice || 'hd',
    });

    const res = await fetch(`${BACKEND_URL}/tts?${params}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'TTS unavailable' }, { status: 502 });
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/ogg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[oracle/tts]', err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
