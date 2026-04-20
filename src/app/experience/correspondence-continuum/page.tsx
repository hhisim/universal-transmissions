"use client";

import ContinuumLoader from "./ContinuumLoader";

export default function CorrespondenceContinuumPage() {
  return (
    <section style={{ minHeight: "100vh", background: "transparent", paddingTop: 68, paddingBottom: 12 }}>
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 12px 8px" }}>
        <div style={{ padding: "6px 4px 8px" }}>
          <div style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.24em", textTransform: "uppercase", fontSize: 10, color: "rgba(212,168,71,0.82)", marginBottom: 6 }}>
            Desktop symbolic workspace
          </div>
          <h1 style={{ margin: 0, color: "#f5e9ff", fontFamily: "Cinzel, serif", fontSize: "clamp(26px, 3.6vw, 40px)", letterSpacing: "0.08em", lineHeight: 1.05 }}>
            The Correspondence Continuum
          </h1>
          <p style={{ margin: "8px 0 0", maxWidth: 1220, color: "rgba(237,233,246,0.68)", lineHeight: 1.52, fontSize: 14 }}>
            An immersive portal into the vast realms of esoteric cross-correspondences, weaving together 27 traditional systems through the lens of superintelligence to generate unique and revelatory insights for seekers, practitioners, neophytes, and adepts alike.
          </p>
        </div>
      </div>

      <div style={{ width: "100vw", marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}>
        <ContinuumLoader />
      </div>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "10px 12px 0" }}>
        <div style={{ padding: "10px 12px", border: "1px solid rgba(212,168,71,0.12)", background: "rgba(17,15,26,0.22)", color: "rgba(237,233,246,0.74)", fontSize: 12.5, letterSpacing: "0.02em" }}>
          Best experienced on laptop or desktop. On phones, use the Correspondence Codex for the lighter mobile correspondence layer. Guest should be able to browse the real Continuum, open a limited set of entries, and perform a small number of compare / reveal actions. Free expands depth and saved pathways. Initiate unlocks the full matrix and unlimited synthesis.
        </div>
      </div>
    </section>
  );
}
