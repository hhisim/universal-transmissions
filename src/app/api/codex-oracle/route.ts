import { NextRequest, NextResponse } from "next/server";
import {
  composeGroundedMessage,
  MAX_QUESTION_CHARS,
  validateHistory,
  type HistoryMessage,
} from "@/lib/oracle-conversation";

const ORACLE_BACKEND = "http://204.168.154.237:8001/chat";

/**
 * Standalone Correspondence chat.
 *
 * Previously this route forwarded a client-supplied `systemPrompt` and an
 * unvalidated `history` straight to the backend, so a client could inject
 * instructions through the privileged `systemPrompt` slot. Batch 2 closes that
 * path: `systemPrompt` is no longer accepted or forwarded in any form, and history
 * now goes through the shared validator.
 *
 * Working behaviour is preserved — responses stay in the Anthropic-compatible
 * shape this client expects, and requests without history keep working.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // `systemPrompt` is deliberately NOT destructured and NOT forwarded. A client
    // can never contribute system or developer instructions through this route.
    const { pack = "codex", mode = "oracle", lang = "en", speed = 1, message, history } = body;

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }
    const question = message.trim();
    if (question.length > MAX_QUESTION_CHARS) {
      return NextResponse.json({ error: "Question is too long" }, { status: 413 });
    }

    const validation = validateHistory(history, question);
    if (!validation.ok) {
      const tooLong = validation.error === "history is too long";
      return NextResponse.json(
        { error: tooLong ? "Conversation history is too long." : "Invalid conversation history." },
        { status: tooLong ? 413 : 400 }
      );
    }
    const conversation: HistoryMessage[] = validation.messages;

    const composed = composeGroundedMessage({ history: conversation, question });
    // Refuse before calling the provider when even the question alone will not
    // fit, rather than truncating the visitor's own words.
    if (!composed.ok) {
      return NextResponse.json(
        { error: composed.error || "Request is too long to send." },
        { status: 413 }
      );
    }

    const response = await fetch(ORACLE_BACKEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack,
        mode,
        lang,
        speed,
        message: composed.message,
      }),
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
