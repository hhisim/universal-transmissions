"use client";

import ContinuumLoader from "./ContinuumLoader";

export default function CorrespondenceContinuumPage() {
  return (
    <section style={{ minHeight: "100vh", background: "transparent", paddingTop: 88, paddingBottom: 40 }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ marginBottom: 18, padding: "18px 20px", border: "1px solid rgba(217,70,239,0.08)", background: "rgba(17,15,26,0.55)", backdropFilter: "blur(10px)" }}>
          <div style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.25em", textTransform: "uppercase", fontSize: 10, color: "rgba(212,168,71,0.82)", marginBottom: 10 }}>
            Desktop symbolic workspace
          </div>
          <h1 style={{ margin: 0, color: "#f5e9ff", fontFamily: "Cinzel, serif", fontSize: "clamp(28px, 4vw, 42px)", letterSpacing: "0.08em" }}>
            The Correspondence Continuum
          </h1>
          <p style={{ margin: "12px 0 0", maxWidth: 1080, color: "rgba(237,233,246,0.72)", lineHeight: 1.7, fontSize: 15 }}>
            An immersive portal into the vast realms of esoteric cross-correspondences, weaving together 27 traditional systems through the lens of superintelligence to generate unique and revelatory insights for seekers, practitioners, neophytes, and adepts alike. Born from over 30 years of esoteric study, hyperdimensional experience, and a cross-platform multimedia distillation of alchemical wisdom, it stands as a living synthesis of symbolic knowledge, spiritual inquiry, and transformative revelation.
          </p>
        </div>

        <ContinuumLoader />

        <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
          {[
            "Best experienced on laptop or desktop. On phones, use the Correspondence Codex for the lighter mobile correspondence layer.",
            "Guest should be able to browse the real Continuum, open a limited set of entries, and perform a small number of compare / reveal actions. Free expands depth and saved pathways. Initiate unlocks the full matrix and unlimited synthesis."
          ].map((text, index) => (
            <div key={index} style={{ padding: "12px 14px", border: "1px solid rgba(212,168,71,0.14)", background: "rgba(17,15,26,0.55)", color: "rgba(237,233,246,0.78)", fontSize: 13, letterSpacing: "0.02em" }}>
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
