"use client";

import ResearchConnections from "./ResearchConnections";
import type { ResearchConnection } from "@/lib/research-connections";
import { CYMATICS_GAPS } from "@/lib/research-connections";

/**
 * The Cymatics room's connections surface.
 *
 * This is the RELEASED entry point, kept as its own component so the page contract
 * and the Cymatics visual identity do not move. The behaviour lives in the shared
 * ResearchConnections component, which both rooms now render against the same
 * registry and the same exact-resolution Oracle anchor contract — so a card in
 * either room sends an identifier the server resolves the same way.
 */
export default function CymaticsConnections({
  connections,
  topicSlug,
  returnHref,
}: {
  connections: ResearchConnection[];
  /** The owning research topic, so each card can address its own Oracle anchor. */
  topicSlug: string;
  returnHref: string;
}) {
  return (
    <ResearchConnections
      connections={connections}
      gaps={CYMATICS_GAPS}
      topicSlug={topicSlug}
      returnHref={returnHref}
      topicTitle="Cymatics"
      eyebrow="[ Connections in the Archive ]"
      heading="Where This Already Runs"
      intro="Cymatics is not a topic that lives on one page. It already runs through the Journal, the artwork records, the Codex and the instruments. Each link below says why it belongs and how strongly it is supported — a shared keyword is not treated as a relationship. Open a destination to read it, or take any single connection into the Oracle as its own context."
      accent="var(--ut-cyan)"
      tint="rgba(34, 211, 238, 0.02)"
      border="rgba(34, 211, 238, 0.08)"
      topBorder="rgba(34, 211, 238, 0.06)"
      glowClass="glow-cyan"
      sectionAttrs={{ "data-cymatics-connections": "true" }}
    />
  );
}
