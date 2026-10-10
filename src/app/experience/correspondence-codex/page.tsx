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
            The Codex in full — every system and every entry, open to browse, search and question without an account. Initiate opens the Codex II archive alongside it.
          </p>
        </div>

        <CodexLoader />

        <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
          {[
            "Guest: the entire codex — all 27 systems and all 824 records — open to browse, search and question, with no account.",
            "Free account: the same open access, held to your account so your membership is recognised when you return.",
            "Initiate: everything above, plus the Codex II archive — the behind-the-scenes process material held for members."
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
