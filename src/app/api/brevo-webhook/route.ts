import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
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
 * Authentication is a shared secret carried in a HEADER, never in the URL. A token in a query string
 * is written into access logs, proxies, analytics and browser history by default; a header is not.
 * Two forms are accepted because Brevo supports both when you register a webhook:
 *
 *   1. custom header        → `x-ut-webhook-secret: <secret>`
 *   2. Basic auth in the    → `Authorization: Basic base64(user:pass)`
 *      webhook's URL
 *
 * Both are compared in constant time. With no secret configured the route refuses every call rather
 * than trusting anonymous callers with the ability to mark mail as bounced.
 */

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function presentedSecret(req: NextRequest): string | null {
  const direct = req.headers.get("x-ut-webhook-secret");
  if (direct) return direct;

  const auth = req.headers.get("authorization") || "";
  const match = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(auth);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    /* Passwords may themselves contain ':'; everything after the first one is the password. */
    const password = sep === -1 ? decoded : decoded.slice(sep + 1);
    return password || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const provided = presentedSecret(req);
  if (!provided || !safeEqual(provided, expected)) {
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
    try {
      const ok = await applyDeliveryEvent(supabaseAdmin as never, { messageId, event: String(kind) });
      if (ok) applied += 1;
    } catch (err) {
      /* One bad event must not make Brevo redeliver the whole batch forever; the failure is logged
         and the ledger can be reconciled from Brevo itself. */
      console.error("brevo-webhook: could not apply event", kind, err);
    }
  }

  return NextResponse.json({ received: true, applied });
}
