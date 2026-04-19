import { NextRequest, NextResponse } from "next/server";

const ORACLE_BACKEND = "http://204.168.154.237:8001/chat";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pack = "codex", mode = "oracle", lang = "en", speed = 1, message, systemPrompt, history } = body;

    const response = await fetch(ORACLE_BACKEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack, mode, lang, speed, message, systemPrompt, history }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Oracle backend error", details: await response.text() },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Return in Anthropic-compatible format
    return NextResponse.json({
      content: [{ text: data.content || data.response || JSON.stringify(data) }],
      stop_reason: "stop_sequence",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
