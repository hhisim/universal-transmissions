"use client";

import EmbeddedExperienceFrame from "@/components/experience/EmbeddedExperienceFrame";

export default function CorrespondenceContinuumPage() {
  return (
    <EmbeddedExperienceFrame
      title="Correspondence Continuum"
      src="https://codex-deploy-phi.vercel.app"
      introEyebrow="Desktop symbolic workspace"
      introTitle="The Correspondence Continuum"
      introDescription="A denser correspondence environment for deeper synthesis across archetypes, frequencies, geometry, and mythic systems. This surface is meant for larger screens and longer-form symbolic work."
      notices={[
        {
          tone: "warning",
          text: "Best experienced on laptop or desktop. On phones, use the Correspondence Codex instead for a lighter mobile-first interface.",
        },
        {
          tone: "info",
          text: "The Continuum is the heavier research workspace. The Correspondence Codex is the lighter mobile-access layer.",
        },
      ]}
      timeoutMs={12000}
      externalHref="https://codex-deploy-phi.vercel.app"
      fallbackHref="/experience/correspondence-codex"
      fallbackLabel="Open mobile Codex"
    />
  );
}
