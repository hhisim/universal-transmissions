import { NextRequest, NextResponse } from "next/server";

// ============================================================
// Oracle API Route
// File: src/app/api/oracle/route.ts
//
// This connects the UT oracle frontend to the Codex Oracle backend.
// Set CODEX_ORACLE_API_URL and CODEX_ORACLE_API_KEY in Vercel env vars.
//
// If the backend isn't ready yet, this returns a placeholder response
// so the frontend can be tested visually.
// ============================================================

const ORACLE_API_URL = process.env.CODEX_ORACLE_API_URL;
const ORACLE_API_KEY = process.env.CODEX_ORACLE_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { message, mode, language, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // If backend is configured, proxy the request
    if (ORACLE_API_URL && ORACLE_API_KEY) {
      const response = await fetch(`${ORACLE_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ORACLE_API_KEY}`,
        },
        body: JSON.stringify({
          pack: "codex",
          mode: mode || "oracle",
          lang: language || "en",
          message,
          history: history || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Oracle backend returned ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Fallback: placeholder response for visual testing
    const modeLabel = (mode || "oracle").toUpperCase();
    const placeholder = `[${modeLabel} MODE — Backend not yet connected]\n\nThe Codex Oracle received your transmission: "${message}"\n\nTo activate the oracle, set CODEX_ORACLE_API_URL and CODEX_ORACLE_API_KEY in your Vercel environment variables. The oracle backend (codex_oracle_module_v2) must be deployed and accessible.\n\nOnce connected, this response will be replaced with live oracle analysis including page interpretations, alphabet decoding, correspondence mapping, and symbolic synthesis.`;

    return NextResponse.json({ response: placeholder });
  } catch (error: unknown) {
    console.error("Oracle API error:", error);
    return NextResponse.json(
      { error: "The Oracle is currently unavailable. Please try again." },
      { status: 500 }
    );
  }
}
