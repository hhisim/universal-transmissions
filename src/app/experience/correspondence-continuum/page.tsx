"use client";

import ContinuumLoader from "./ContinuumLoader";

export default function CorrespondenceContinuumPage() {
  return (
    <section style={{ minHeight: "100vh", background: "transparent", paddingTop: 76, paddingBottom: 28 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 18px" }}>
        <div style={{ marginBottom: 10, padding: "12px 4px 0" }}>
          <div style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.25em", textTransform: "uppercase", fontSize: 10, color: "rgba(212,168,71,0.82)", marginBottom: 8 }}>
            Desktop symbolic workspace
          </div>
          <h1 style={{ margin: 0, color: "#f5e9ff", fontFamily: "Cinzel, serif", fontSize: "clamp(28px, 4vw, 42px)", letterSpacing: "0.08em" }}>
            The Correspondence Continuum
          </h1>
          <p style={{ margin: "10px 0 0", maxWidth: 1120, color: "rgba(237,233,246,0.72)", lineHeight: 1.62, fontSize: 15 }}>
            An immersive portal into the vast realms of esoteric cross-correspondences, weaving together 27 traditional systems through the lens of superintelligence to generate unique and revelatory insights for seekers, practitioners, neophytes, and adepts alike. Born from over 30 years of esoteric study, hyperdimensional experience, and a cross-platform multimedia distillation of alchemical wisdom, it stands as a living synthesis of symbolic knowledge, spiritual inquiry, and transformative revelation.
          </p>
        </div>
      </div>

      <div style={{ width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)", marginTop: 8 }}>
        <ContinuumLoader />
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "14px 18px 0" }}>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            "Best experienced on laptop or desktop. On phones, use the Correspondence Codex for the lighter mobile correspondence layer.",
            "Guest should be able to browse the real Continuum, open a limited set of entries, and perform a small number of compare / reveal actions. Free expands depth and saved pathways. Initiate unlocks the full matrix and unlimited synthesis."
          ].map((text, index) => (
            <div key={index} style={{ padding: "12px 14px", border: "1px solid rgba(212,168,71,0.14)", background: "rgba(17,15,26,0.42)", color: "rgba(237,233,246,0.78)", fontSize: 13, letterSpacing: "0.02em" }}>
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
