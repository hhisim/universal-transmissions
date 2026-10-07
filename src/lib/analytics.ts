"use client";

import { track as vercelTrack } from "@vercel/analytics/react";

type Primitive = string | number | boolean | null | undefined;

export type UtAnalyticsPayload = {
  event_name: string;
  category?: string;
  action?: string;
  placement?: string;
  path?: string;
  target_url?: string;
  product_id?: string;
  sku?: string;
  post_slug?: string;
  referrer?: string;
  /** Stable public entity id (e.g. artwork id). Never free text. */
  entity_id?: string;
  /** Entity kind, e.g. "artwork". Never free text. */
  entity_type?: string;
  meta?: Record<string, Primitive>;
};

/* Stable, non-identifying entity tokens are safe to record. Anything else that
   arrives in a URL query (notably `q`, a visitor's own question) is NOT. */
const ALLOWED_ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

function sanitizedEntityId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return ALLOWED_ENTITY_ID.test(trimmed) ? trimmed : undefined;
}

/** Only the pathname is ever recorded: query strings can contain prompts. */
function sanitizedPath(explicit?: string): string {
  const raw = explicit ?? (typeof window === "undefined" ? "" : window.location.pathname);
  try {
    return new URL(raw, window.location.origin).pathname.slice(0, 500);
  } catch {
    return String(raw).split("?")[0].slice(0, 500);
  }
}

const SESSION_KEY = "ut_analytics_session_id";

function getSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const generated =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

function vercelProperties(payload: UtAnalyticsPayload): Record<string, Primitive> {
  const props: Record<string, Primitive> = {
    category: payload.category,
    action: payload.action,
    placement: payload.placement,
    path: payload.path,
    target_url: payload.target_url,
    product_id: payload.product_id,
    sku: payload.sku,
    post_slug: payload.post_slug,
    entity_id: sanitizedEntityId(payload.entity_id),
    entity_type: payload.entity_type,
  };

  for (const [key, value] of Object.entries(payload.meta || {})) {
    props[`meta_${key}`] = value;
  }

  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));
}

export function trackUtEvent(payload: UtAnalyticsPayload): void {
  if (typeof window === "undefined" || !payload.event_name) return;

  const enriched: UtAnalyticsPayload & { session_id?: string; user_agent?: string } = {
    ...payload,
    // Was `pathname + search`, which persisted any `?q=` prompt verbatim.
    path: sanitizedPath(payload.path),
    target_url: payload.target_url ? sanitizedPath(payload.target_url) : undefined,
    entity_id: sanitizedEntityId(payload.entity_id),
    referrer: payload.referrer ?? document.referrer,
    session_id: getSessionId(),
    user_agent: navigator.userAgent,
  };

  try {
    vercelTrack(payload.event_name, vercelProperties(enriched));
  } catch {
    // Analytics must never interrupt the experience.
  }

  try {
    const body = JSON.stringify(enriched);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/event", blob);
      return;
    }

    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Ignore client-side telemetry failures.
  }
}
