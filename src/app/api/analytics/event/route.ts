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

/* ── Explicit allowlist (review item 6) ────────────────────────────────────
   These are the only event names / categories / actions / placements / entity
   types that may be persisted. Anything else is dropped rather than stored, so
   a future caller cannot introduce a new field or smuggle free text through an
   unexpected value. */
const ALLOWED_EVENTS = new Set([
  "button_click", "cta_click", "store_click", "oracle_click",
  "newsletter_click", "correspondence_click", "voa_outbound_click",
  "outbound_click", "internal_link", "outbound_link",
]);

const ALLOWED_CATEGORIES = new Set([
  "button", "internal_link", "outbound_link", "cta", "navigation", "form",
]);

const ALLOWED_ACTIONS = new Set([
  "click", "submit", "open", "toggle", "play", "pause", "select",
]);

const ALLOWED_PLACEMENTS = new Set([
  "header", "hero", "body", "footer", "sidebar", "inline", "modal", "cart",
]);

const ALLOWED_ENTITY_TYPES = new Set([
  "artwork", "journal_post", "product", "collection", "research_topic", "route",
]);

/* A "label" is a short static UI token, not prose and never a prompt or an
   answer. Reject anything with whitespace-heavy prose, punctuation, or length
   beyond a token. This is what stops user-entered copy from being stored. */
const LABEL_TOKEN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,47}$/;

function allowlisted(value: unknown, set: Set<string>, max = 80): string | null {
  const raw = text(value, max);
  if (!raw) return null;
  return set.has(raw) ? raw : null;
}

function labelToken(value: unknown): string | null {
  const raw = text(value, 48);
  if (!raw) return null;
  return LABEL_TOKEN.test(raw) ? raw : null;
}



/* Free-form metadata is no longer accepted. Only these keys may be stored, and
   `label` must look like a static UI token (see LABEL_TOKEN) — never prose, a
   prompt, or an answer. Unknown keys are dropped instead of persisted. */
const ALLOWED_META_KEYS = ["label"] as const;

function meta(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const key of ALLOWED_META_KEYS) {
    const raw = (value as Record<string, unknown>)[key];
    if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === "boolean") out[key] = raw;
    else if (typeof raw === "string") {
      const token = labelToken(raw);
      if (token) out[key] = token;
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  let body: EventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = allowlisted(body.event_name, ALLOWED_EVENTS);
  if (!eventName) {
    return NextResponse.json({ ok: false, error: "Unrecognised event_name" }, { status: 400 });
  }

  const row = {
    // event_name is validated above; the rest must match the allowlists or be
    // reduced to a bounded, query-free token. Nothing free-form is stored.
    event_name: eventName,
    category: allowlisted(body.category, ALLOWED_CATEGORIES),
    action: allowlisted(body.action, ALLOWED_ACTIONS),
    placement: allowlisted(body.placement, ALLOWED_PLACEMENTS),
    path: pathOnly(body.path, 500),
    target_url: pathOnly(body.target_url, 1000),
    entity_id: entityId(body.entity_id),
    entity_type: allowlisted(body.entity_type, ALLOWED_ENTITY_TYPES),
    product_id: entityId(body.product_id),
    sku: entityId(body.sku),
    post_slug: entityId(body.post_slug),
    session_id: entityId(body.session_id),
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
