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
  meta?: Record<string, Primitive>;
};

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
    path: payload.path || `${window.location.pathname}${window.location.search}`,
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
