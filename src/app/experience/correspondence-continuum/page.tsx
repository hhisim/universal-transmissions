"use client";

import EmbeddedExperienceFrame from "@/components/experience/EmbeddedExperienceFrame";

export default function CorrespondenceContinuumPage() {
  return (
    <EmbeddedExperienceFrame
      title="Correspondence Continuum"
      src="https://codex-deploy-phi.vercel.app"
      introEyebrow="Desktop symbolic workspace"
      introTitle="The Correspondence Continuum"
      introDescription="A denser correspondence environment for deeper synthesis across archetypes, frequencies, geometry, and mythic systems. All users should feel the same world; what changes by tier is depth, advanced actions, saved pathways, and synthesis power — not arbitrary system removal."
      notices={[
        {
          tone: "warning",
          text: "Best experienced on laptop or desktop. On phones, use the Correspondence Codex instead for a lighter mobile-first interface that still feels real.",
        },
        {
          tone: "info",
          text: "Guest should be able to browse the real Continuum, open a limited set of entries, and perform a small number of compare / reveal actions. Free expands depth and saved pathways. Initiate unlocks the full matrix and unlimited synthesis.",
        },
      ]}
      timeoutMs={12000}
      externalHref="https://codex-deploy-phi.vercel.app"
      fallbackHref="/experience/correspondence-codex"
      fallbackLabel="Open mobile Codex"
    />
  );
}
