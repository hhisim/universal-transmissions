"use client";

import { useEffect } from "react";
import { trackUtEvent } from "@/lib/analytics";

function cleanLabel(value: string | null | undefined): string | undefined {
  const label = (value || "").replace(/\s+/g, " ").trim();
  return label ? label.slice(0, 120) : undefined;
}

function eventNameForUrl(url: URL): string {
  const path = url.pathname;
  if (path.startsWith("/store") || path.startsWith("/sanctum")) return "store_click";
  if (path.startsWith("/oracle")) return "oracle_click";
  if (path.startsWith("/newsletter")) return "newsletter_click";
  if (path.startsWith("/experience/correspondence")) return "correspondence_click";
  if (url.hostname.includes("vaultofarcana.com")) return "voa_outbound_click";
  if (url.hostname && typeof window !== "undefined" && url.hostname !== window.location.hostname) return "outbound_click";
  return "cta_click";
}

export default function InteractionTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const button = target.closest<HTMLElement>("button[data-analytics-event]");
      if (button) {
        trackUtEvent({
          event_name: button.dataset.analyticsEvent || "button_click",
          category: button.dataset.analyticsCategory || "button",
          action: button.dataset.analyticsAction || "click",
          placement: button.dataset.analyticsPlacement,
          product_id: button.dataset.analyticsProductId,
          sku: button.dataset.analyticsSku,
          post_slug: button.dataset.analyticsPostSlug,
          meta: {
            label: cleanLabel(button.dataset.analyticsLabel || button.textContent),
          },
        });
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      trackUtEvent({
        event_name: anchor.dataset.analyticsEvent || eventNameForUrl(url),
        category: anchor.dataset.analyticsCategory || (url.hostname === window.location.hostname ? "internal_link" : "outbound_link"),
        action: anchor.dataset.analyticsAction || "click",
        placement: anchor.dataset.analyticsPlacement,
        target_url: url.href,
        product_id: anchor.dataset.analyticsProductId,
        sku: anchor.dataset.analyticsSku,
        post_slug: anchor.dataset.analyticsPostSlug,
        meta: {
          label: cleanLabel(anchor.dataset.analyticsLabel || anchor.textContent),
        },
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
