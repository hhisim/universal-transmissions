import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type EventBody = Record<string, unknown>;

function text(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/* Query strings can carry a visitor's own question (`?q=...`) on routes such as
   the Oracle. Only the pathname is ever persisted. */
function pathOnly(value: unknown, max = 500): string | null {
  const raw = text(value, 2000);
  if (!raw) return null;
  const withoutQuery = raw.split("?")[0].split("#")[0];
  return withoutQuery ? withoutQuery.slice(0, max) : null;
}

/* Stable entity tokens only; free text is rejected outright. */
const ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

function entityId(value: unknown): string | null {
  const raw = text(value, 120);
  if (!raw || !ENTITY_ID.test(raw)) return null;
  return raw;
}



function meta(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => ["string", "number", "boolean"].includes(typeof v) || v === null)
      .slice(0, 30)
      .map(([k, v]) => [k.slice(0, 80), typeof v === "string" ? v.slice(0, 500) : (v as string | number | boolean | null)])
  );
}

export async function POST(req: NextRequest) {
  let body: EventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = text(body.event_name, 80);
  if (!eventName) return NextResponse.json({ ok: false, error: "Missing event_name" }, { status: 400 });

  const row = {
    event_name: eventName,
    category: text(body.category, 80),
    action: text(body.action, 80),
    placement: text(body.placement, 120),
    path: pathOnly(body.path, 500),
    target_url: pathOnly(body.target_url, 1000),
    entity_id: entityId(body.entity_id),
    entity_type: entityId(body.entity_type),
    product_id: text(body.product_id, 120),
    sku: text(body.sku, 120),
    post_slug: text(body.post_slug, 160),
    session_id: text(body.session_id, 120),
    referrer: pathOnly(body.referrer, 1000),
    user_agent: text(body.user_agent || req.headers.get("user-agent"), 500),
    meta: meta(body.meta),
  };

  try {
    const { error } = await supabaseAdmin.from("ut_analytics_events").insert(row);
    if (error) throw error;
  } catch (error) {
    console.error("UT analytics insert failed", error);
    // Preserve the client contract: analytics must never break navigation or checkout.
    return NextResponse.json({ ok: true, stored: false });
  }

  return NextResponse.json({ ok: true, stored: true });
}
