"use client";

import EmbeddedExperienceFrame from "@/components/experience/EmbeddedExperienceFrame";

export default function CodexPage() {
  return (
    <EmbeddedExperienceFrame
      title="Correspondence Codex"
      src="/experience/correspondence-codex/codex.html"
      introEyebrow="Mobile correspondence layer"
      introTitle="The UT Correspondence Codex"
      introDescription="A lighter, faster symbolic index for mobile and quick-reference use. This is the easier-access correspondence surface built to be more available than the full Continuum while still linking back into the wider Oracle and research system."
      notices={[
        {
          tone: "accent",
          text: "Recommended for mobile and quick lookup sessions. If you want the denser desktop workspace, use the Correspondence Continuum.",
        },
        {
          tone: "info",
          text: "This lighter Codex surface is intended to remain more freely accessible than the Continuum tier.",
        },
      ]}
      timeoutMs={10000}
      fallbackHref="/oracle"
      fallbackLabel="Open Oracle instead"
    />
  );
}
