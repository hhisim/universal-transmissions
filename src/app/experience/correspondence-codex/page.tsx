"use client";

import CodexLoader from "./CodexLoader";

export default function CodexPage() {
  return (
    <section style={{ minHeight: "100vh", background: "transparent", paddingTop: 88, paddingBottom: 40 }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 20px" }}>

        <div style={{ marginBottom: 18, padding: "18px 20px", border: "1px solid rgba(217,70,239,0.08)", background: "rgba(17,15,26,0.55)", backdropFilter: "blur(10px)" }}>
          <div style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.25em", textTransform: "uppercase", fontSize: 10, color: "rgba(212,168,71,0.82)", marginBottom: 10 }}>
            Mobile correspondence layer
          </div>
          <h1 style={{ margin: 0, color: "#f5e9ff", fontFamily: "Cinzel, serif", fontSize: "clamp(28px, 4vw, 42px)", letterSpacing: "0.08em" }}>
            The UT Correspondence Codex
          </h1>
          <p style={{ margin: "12px 0 0", maxWidth: 980, color: "rgba(237,233,246,0.72)", lineHeight: 1.7, fontSize: 15 }}>
            A visually complete but corpus-limited explorer. Guests should feel the reality of the Codex, free accounts should gain broader traversal and a few deeper actions, and Initiate opens the full correspondence matrix with deeper ritual interaction.
          </p>
        </div>

        <CodexLoader />

        <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
          {[
            "Guest: full visual environment, all systems visible, teaser-state corpus access, and a small number of real interactions.",
            "Free account: broader corpus access, favorites / bookmarks, limited compare and oracle-style reveals, and a small saved-history layer.",
            "Initiate: full matrix access, unlimited deep reveals, resonance, synthesis, saved trails, and advanced traversal."
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
