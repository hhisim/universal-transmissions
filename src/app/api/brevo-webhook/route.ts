import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { applyDeliveryEvent } from "@/lib/order-outbox";

export const dynamic = "force-dynamic";

/**
 * Brevo delivery events → the notification outbox.
 *
 * "Brevo accepted the message" and "the mailbox took it" are different facts, so this never changes a
 * send state — it records the delivery outcome alongside it. A hard bounce or a spam complaint is
 * exactly the signal that a receipt never reached the buyer, and it was invisible before this route
 * existed.
 *
 * Authentication: Brevo signs nothing, so the endpoint requires a shared secret in the query string
 * (BREVO_WEBHOOK_TOKEN). Without it configured the route refuses everything rather than trusting
 * anonymous callers with the ability to mark mail as bounced.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.BREVO_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const provided = new URL(req.url).searchParams.get("token") ?? "";
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  /* Brevo posts either a single event or an array of them. */
  const events = Array.isArray(payload) ? payload : [payload];
  let applied = 0;

  for (const event of events) {
    const messageId: string | undefined = event?.["message-id"] ?? event?.messageId;
    const kind: string | undefined = event?.event;
    if (!messageId || !kind) continue;
    const ok = await applyDeliveryEvent(supabaseAdmin as never, { messageId, event: String(kind) });
    if (ok) applied += 1;
  }

  return NextResponse.json({ received: true, applied });
}
