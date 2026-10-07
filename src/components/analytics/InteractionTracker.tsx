"use client";

import { useEffect } from "react";
import { trackUtEvent } from "@/lib/analytics";

/* Only a short, static UI token may be recorded as a label — never prose, a
   prompt, or an answer. Previously this fell back to button/anchor textContent,
   which is unbounded page copy. Anything non-token-shaped is simply dropped
   server-side, and dropping it here avoids sending it at all. */
function tokenLabel(value: string | null | undefined): string | undefined {
  const raw = (value || "").trim();
  return /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,47}$/.test(raw) ? raw : undefined;
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
          entity_type: button.dataset.analyticsEntityType,
          entity_id: button.dataset.analyticsEntityId,
          product_id: button.dataset.analyticsProductId,
          sku: button.dataset.analyticsSku,
          post_slug: button.dataset.analyticsPostSlug,
          meta: {
            label: tokenLabel(button.dataset.analyticsLabel),
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
        // Canonical pathname only. The previous `url.href` carried `?q=<prompt>`
        // for artwork -> Oracle links.
        target_url: url.pathname,
        // Public, stable ids when the markup declares them.
        entity_type: anchor.dataset.analyticsEntityType,
        entity_id: anchor.dataset.analyticsEntityId,
        product_id: anchor.dataset.analyticsProductId,
        sku: anchor.dataset.analyticsSku,
        post_slug: anchor.dataset.analyticsPostSlug,
        meta: {
          label: tokenLabel(anchor.dataset.analyticsLabel),
        },
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
