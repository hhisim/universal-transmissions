SHA: 1233230b9dfad3947a380ef140e933f20ddd61a7
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import PageBackground from "@/components/scenes/PageBackground";

// ============================================================
// CODEX ORACLE PAGE — Complete, self-contained, production-ready
// File: src/app/oracle/page.tsx
//
// PRIME: DELETE the current oracle/page.tsx entirely.
// Replace with THIS FILE. Do not modify anything.
// ============================================================

// --- Zalgo ---
const MA = ["\u0300","\u0301","\u0302","\u0303","\u0308","\u030A","\u030C","\u0311","\u0313"];
const MB = ["\u0316","\u0323","\u0325","\u0330","\u0331","\u0345"];
function zg(t: string, a: number, b: number): string {
  return t.split("").map(c => {
    if (c === " ") return c;
    let r = c;
    for (let i = 0; i < a; i++) r += MA[~~(Math.random() * MA.length)];
    for (let i = 0; i < b; i++) r += MB[~~(Math.random() * MB.length)];
    return r;
  }).join("");
}

// --- Types ---
interface Msg { role: "user" | "oracle"; text: string; mode?: string; }

// --- Data ---
const MODES = [
  { id: "oracle", label: "ORACLE", c: "#d946ef" },
  { id: "decipher", label: "DECIPHER", c: "#22d3ee" },
  { id: "correspond", label: "CORRESPOND", c: "#9333ea" },
  { id: "linguistic", label: "LINGUISTIC MYSTIC", c: "#d4a847" },
  { id: "meditate", label: "MEDITATE", c: "#22c55e" },
];
const PROMPTS = [
  "What is Page 6 about?",
  "Decode the word NOMMU",
  "What correspondences connect Pages 12 and 45?",
  "Guide me through a meditation on Page 33",
  "What symbols repeat across the Codex?",
];
const MENU = [
  { q: "What is Page 6 about?", c: "#d4a847" },
  { q: "Decode the name ŠURPU", c: "#d946ef" },
  { q: "Map correspondences for Page 12", c: "#9333ea" },
  { q: "What symbols repeat across the Codex?", c: "#22d3ee" },
  { q: "Meditation on Page 33", c: "#22c55e" },
];
const BGL = ["\u25B3","\u25BD","\u25C7","\u2726","\u269B","\u2609","\u221E","\u25CE","\u2BC5","\u16DA","\u16DE","\u29EB","\u0300","\u0301","\u0334"];

// ============================================================
// BACKGROUND CANVAS
// ============================================================
function useBg(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const cx = cv.getContext("2d");
    if (!cx) return;
    let W = 0, H = 0, t = 0, af = 0;
    type S = { x: number; y: number; s: number; b: number; sp: number };
    type D = { x: number; y: number; sp: number; ch: string; op: number; sz: number };
    const stars: S[] = [], drops: D[] = [];

    function resize() {
      const r = devicePixelRatio || 1, p = cv!.parentElement;
      if (!p) return;
      W = p.clientWidth; H = p.clientHeight;
      cv!.width = W * r; cv!.height = H * r;
      cv!.style.width = W + "px"; cv!.style.height = H + "px";
      cx!.setTransform(r, 0, 0, r, 0, 0);
      stars.length = 0; drops.length = 0;
      for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.3 + Math.random() * 1.2, b: Math.random() * Math.PI * 2, sp: 0.5 + Math.random() * 2 });
      for (let i = 0; i < ~~(W / 35); i++) drops.push({ x: i * 35 + Math.random() * 17, y: Math.random() * H, sp: 0.15 + Math.random() * 0.35, ch: BGL[~~(Math.random() * BGL.length)], op: 0.012 + Math.random() * 0.018, sz: 9 + Math.random() * 4 });
    }
    resize(); window.addEventListener("resize", resize);

    function frame() {
      t += 0.016; cx!.clearRect(0, 0, W, H);
      for (const d of drops) { d.y += d.sp; if (d.y > H + 15) { d.y = -15; d.ch = BGL[~~(Math.random() * BGL.length)]; d.op = 0.012 + Math.random() * 0.018; } cx!.save(); cx!.globalAlpha = d.op; cx!.fillStyle = "#d946ef"; cx!.font = d.sz + "px monospace"; cx!.fillText(d.ch, d.x, d.y); cx!.restore(); }
      for (const s of stars) { const b = 0.12 + Math.sin(t * s.sp + s.b) * 0.1; cx!.beginPath(); cx!.arc(s.x, s.y, s.s, 0, Math.PI * 2); cx!.fillStyle = Math.random() > 0.88 ? `rgba(212,168,71,${b})` : `rgba(237,233,246,${b})`; cx!.fill(); }
      const n1 = cx!.createRadialGradient(W * 0.7, H * 0.25, 0, W * 0.7, H * 0.25, W * 0.4); n1.addColorStop(0, "rgba(147,51,234,0.025)"); n1.addColorStop(1, "rgba(0,0,0,0)"); cx!.fillStyle = n1; cx!.fillRect(0, 0, W, H);
      const n2 = cx!.createRadialGradient(W * 0.2, H * 0.75, 0, W * 0.2, H * 0.75, W * 0.3); n2.addColorStop(0, "rgba(34,211,238,0.015)"); n2.addColorStop(1, "rgba(0,0,0,0)"); cx!.fillStyle = n2; cx!.fillRect(0, 0, W, H);
      const sy = (t * 25) % H; cx!.fillStyle = "rgba(217,70,239,0.006)"; cx!.fillRect(0, sy - 1, W, 2);
      for (let i = 0; i < H; i += 3) { cx!.fillStyle = "rgba(0,0,0,0.012)"; cx!.fillRect(0, i, W, 1); }
      af = requestAnimationFrame(frame);
    }
    frame();
    return () => { cancelAnimationFrame(af); window.removeEventListener("resize", resize); };
  }, [ref]);
}

// ============================================================
// COMPONENT
// ============================================================
export default function OraclePage() {
  const [mode, setMode] = useState("oracle");
  const [lang, setLang] = useState("en");
  const [voice, setVoice] = useState(true);
  const [gender, setGender] = useState<"f"|"m">("f");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [zt, setZt] = useState("CODEX ORACLE");
  const [tier, setTier] = useState<"guest" | "free" | "initiate">("guest");
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useBg(cvRef);

  useEffect(() => { setZt(zg("CODEX ORACLE", 1, 1)); const t = setInterval(() => setZt(zg("CODEX ORACLE", 1, 1)), 4000); return () => clearInterval(t); }, []);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  // Fetch session on mount to determine tier
  useEffect(() => {
    fetch("/api/billing/session")
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          setTier(d.plan || "guest");
        }
      })
      .catch(() => {});
  }, []);

  const send = useCallback(async (text?: string) => {
    const m = (text || input).trim();
    if (!m) return;
    setInput("");
    setMsgs(p => [...p, { role: "user", text: m }]);
    setLoading(true);
    try {
      const r = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: m, mode, language: lang, history: msgs.slice(-10) }),
      });
      const d = await r.json();
      if (r.status === 429) {
        setMsgs(p => [...p, { role: "oracle", text: d.error || "Daily limit reached. Upgrade to Initiate for unlimited access.", mode }]);
        return;
      }
      if (d.plan) setTier(d.plan as "guest" | "free" | "initiate");
      if (d.usage) setUsage(d.usage);
      setMsgs(p => [...p, { role: "oracle", text: d.response || d.text || d.message || "The Oracle is contemplating...", mode }]);
    } catch {
      setMsgs(p => [...p, { role: "oracle", text: "The transmission was interrupted. Please try again.", mode }]);
    } finally { setLoading(false); }
  }, [input, mode, lang, msgs]);

  const kd = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const ml = (id: string) => MODES.find(m => m.id === id)?.label || "ORACLE";
  const has = msgs.length > 0;

  // Shared styles
  const borderFaint = "1px solid rgba(255,255,255,0.04)";
  const labelStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(237,233,246,0.25)", textTransform: "uppercase" as const, marginBottom: 8 };

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
    <PageBackground variant="oracle" />
    <Navigation />
    <div style={{ position: "relative", minHeight: "calc(100vh - 200px)" }}>
      {/* BG Canvas */}
      <canvas ref={cvRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>

        {/* HEADER */}
        <div style={{ textAlign: "center", paddingTop: 32, paddingBottom: 8 }}>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: "0.25em", color: "rgba(212,168,71,0.5)", marginBottom: 8 }}>[ CODEX ORACLE ]</div>
          <h1 style={{ fontFamily: "'Cinzel Decorative', Cinzel, serif", fontSize: "clamp(28px, 5vw, 48px)", letterSpacing: "0.08em", background: "linear-gradient(135deg, #d946ef 0%, #d4a847 35%, #9333ea 65%, #22d3ee 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 8, transition: "opacity 1s" }}>{zt}</h1>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: "italic", color: "rgba(237,233,246,0.35)", marginBottom: 20 }}>Decipher the pages. Decode the names. Map the correspondences.</p>
          <div style={{ width: 260, height: 1, margin: "0 auto 20px", background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.3), rgba(212,168,71,0.5), rgba(147,51,234,0.3), rgba(34,211,238,0.3), transparent)" }} />
        </div>

        {/* TIER BANNER */}
        {tier === "guest" && (
          <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "14px 20px", border: "1px solid rgba(217,70,239,0.2)", background: "rgba(217,70,239,0.04)", textAlign: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(217,70,239,0.7)", textTransform: "uppercase" }}>Guest — {usage ? `${usage.used}/${usage.limit}` : "10"} questions remaining today</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(237,233,246,0.4)", marginLeft: 12 }}>·</span>
            <a href="/pricing" style={{ fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.2em", color: "#d946ef", textDecoration: "none", marginLeft: 12, textTransform: "uppercase" }}>Create a free account for 25 questions/day →</a>
          </div>
        )}
        {tier === "free" && (
          <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "14px 20px", border: "1px solid rgba(212,168,71,0.2)", background: "rgba(212,168,71,0.04)", textAlign: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(212,168,71,0.7)", textTransform: "uppercase" }}>Free Account — {usage ? `${usage.used}/${usage.limit}` : "25"} questions remaining today</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(237,233,246,0.4)", marginLeft: 12 }}>·</span>
            <a href="/pricing" style={{ fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.2em", color: "#d4a847", textDecoration: "none", marginLeft: 12, textTransform: "uppercase" }}>Unlock unlimited with Initiate $3.99/mo →</a>
          </div>
        )}
        {tier === "initiate" && (
          <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "10px 20px", border: "1px solid rgba(147,51,234,0.12)", background: "rgba(147,51,234,0.03)", textAlign: "center" }}>
            <a href="https://vaultofarcana.com/chat" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.2em", color: "rgba(147,51,234,0.5)", textDecoration: "none", textTransform: "uppercase" }}>Initiate active — Explore Vault of Arcana for 5 more oracles →</a>
          </div>
        )}

        {/* MODE BUTTONS */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {MODES.map(mo => (
            <button key={mo.id} onClick={() => setMode(mo.id)} style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", padding: "10px 20px", border: `1px solid ${mode === mo.id ? mo.c + "55" : "rgba(255,255,255,0.08)"}`, background: mode === mo.id ? mo.c + "0a" : "transparent", color: mode === mo.id ? mo.c : "rgba(237,233,246,0.35)", cursor: "pointer", transition: "all 0.3s" }}>{mo.label}</button>
          ))}
        </div>

        {/* THREE COLUMN */}
        <div style={{ display: "flex", gap: 0, borderTop: borderFaint, minHeight: 520 }}>

          {/* LEFT */}
          <div style={{ width: 210, flexShrink: 0, borderRight: borderFaint, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={labelStyle}>Language</div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["en","tr","ru"] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)} style={{ padding: "5px 12px", border: `1px solid ${lang === l ? "rgba(217,70,239,0.3)" : "rgba(255,255,255,0.06)"}`, background: lang === l ? "rgba(217,70,239,0.08)" : "transparent", color: lang === l ? "#d946ef" : "rgba(237,233,246,0.25)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.3s" }}>{l}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={labelStyle}>Voice</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => setVoice(!voice)} style={{ padding: "5px 14px", border: `1px solid ${voice ? "rgba(34,211,238,0.3)" : "rgba(255,255,255,0.06)"}`, background: voice ? "rgba(34,211,238,0.06)" : "transparent", color: voice ? "#22d3ee" : "rgba(237,233,246,0.25)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, cursor: "pointer", transition: "all 0.3s" }}>{voice ? "ON" : "OFF"}</button>
                {voice && (
                  <div style={{ display: "flex", gap: 4, flex: 1 }}>
                    {(["f","m"] as const).map(g => (
                      <button key={g} onClick={() => setGender(g)} style={{ flex: 1, padding: "4px 0", textAlign: "center", border: `1px solid ${gender === g ? "rgba(212,168,71,0.3)" : "rgba(255,255,255,0.06)"}`, background: gender === g ? "rgba(212,168,71,0.08)" : "transparent", color: gender === g ? "#d4a847" : "rgba(237,233,246,0.25)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, cursor: "pointer", transition: "all 0.3s" }}>{g === "f" ? "♀ FEM" : "♂ MAL"}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: borderFaint, paddingTop: 12 }}>
              <div style={labelStyle}>Active: <span style={{ color: MODES.find(m=>m.id===mode)?.c }}>{ml(mode)}</span></div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(237,233,246,0.25)", lineHeight: 1.6 }}>
                {mode === "oracle" && "Poetic synthesis of page symbolism, geometry, and hidden meaning."}
                {mode === "decipher" && "Structured page decryption with geometric, linguistic, and correspondence layers."}
                {mode === "correspond" && "Cross-reference symbols across pages, traditions, planets, and archetypes."}
                {mode === "linguistic" && "Decode any word or name letter by letter through the alphabet ontology."}
                {mode === "meditate" && "Guided contemplative practice connected to a specific Codex page."}
              </div>
            </div>

            <div style={{ marginTop: "auto", borderTop: borderFaint, paddingTop: 12 }}>
              <div style={labelStyle}>Ask About</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(237,233,246,0.3)", lineHeight: 1.8 }}>
                {["Any of the 150 Codex pages", "Symbols & alphabets", "Page names & meanings", "Energetic meaning of words", "Correspondences & cross-references"].map(t => <div key={t}>✦ {t}</div>)}
              </div>
            </div>
          </div>

          {/* CENTER */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div ref={chatRef} style={{ flex: 1, padding: 20, overflowY: "auto", maxHeight: 420 }}>
              {!has && (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <div style={{ width: 48, height: 48, margin: "0 auto 16px", border: "1px solid rgba(217,70,239,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "rgba(217,70,239,0.4)", fontSize: 18 }}>✦</span></div>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: 16, letterSpacing: "0.1em", color: "rgba(237,233,246,0.5)", marginBottom: 12 }}>Begin with a question about the Codex</div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "rgba(237,233,246,0.2)", lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>150 pages of xenolinguistic art, sacred geometry, and symbolic transmissions. Ask about any page, decode a name, or explore the correspondence web.</p>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} style={{ marginBottom: 16, padding: m.role === "oracle" ? "14px 16px" : "10px 14px", borderLeft: `2px solid ${m.role === "oracle" ? "rgba(217,70,239,0.3)" : "rgba(34,211,238,0.2)"}`, background: m.role === "oracle" ? "rgba(217,70,239,0.025)" : "rgba(34,211,238,0.02)" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.15em", color: m.role === "oracle" ? "rgba(217,70,239,0.4)" : "rgba(34,211,238,0.35)", marginBottom: m.role === "oracle" ? 8 : 4 }}>
                    {m.role === "oracle" ? `CODEX ORACLE · ${ml(m.mode || "oracle")} MODE` : "YOU"}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: m.role === "oracle" ? 16 : 15, lineHeight: 1.75, color: m.role === "oracle" ? "#ede9f6" : "rgba(237,233,246,0.65)", whiteSpace: "pre-wrap" }}>
                    {m.role === "oracle" ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                    ) : (
                      <span>{m.text}</span>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ marginBottom: 16, padding: "14px 16px", borderLeft: "2px solid rgba(217,70,239,0.3)", background: "rgba(217,70,239,0.025)" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.15em", color: "rgba(217,70,239,0.4)", marginBottom: 8 }}>CODEX ORACLE · RECEIVING...</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0, 0.15, 0.3].map((d, i) => <span key={i} style={{ width: 6, height: 6, background: ["#d946ef","#9333ea","#22d3ee"][i], animation: "pulse 1.5s ease-in-out infinite", animationDelay: d + "s" }} />)}
                  </div>
                </div>
              )}
            </div>

            {!has && (
              <div style={{ padding: "0 20px 8px" }}>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10 }}>
                  {PROMPTS.map(p => (
                    <button key={p} onClick={() => send(p)} style={{ flexShrink: 0, padding: "7px 12px", border: "1px solid rgba(255,255,255,0.05)", background: "rgba(17,15,26,0.4)", color: "rgba(237,233,246,0.3)", fontFamily: "'Cormorant Garamond', serif", fontSize: 13, cursor: "pointer", transition: "all 0.3s", whiteSpace: "nowrap", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{p}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "0 20px 16px" }}>
              <textarea ref={el => { if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; } }} rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={kd} placeholder="Ask the Codex Oracle..." style={{ flex: 1, background: "rgba(17,15,26,0.6)", border: "1px solid rgba(217,70,239,0.1)", padding: "11px 14px", fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: "#ede9f6", resize: "none", outline: "none", transition: "all 0.3s" }} onFocus={e => { e.currentTarget.style.borderColor = "rgba(217,70,239,0.3)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(217,70,239,0.06)"; }} onBlur={e => { e.currentTarget.style.borderColor = "rgba(217,70,239,0.1)"; e.currentTarget.style.boxShadow = "none"; }} />
              <button onClick={() => send()} disabled={loading || !input.trim()} style={{ position: "relative", overflow: "hidden", padding: "11px 22px", border: "1px solid rgba(212,168,71,0.3)", background: "rgba(212,168,71,0.05)", fontFamily: "Cinzel, serif", fontSize: 10, letterSpacing: "0.2em", color: "#d4a847", cursor: "pointer", transition: "all 0.3s", opacity: loading || !input.trim() ? 0.3 : 1 }}>TRANSMIT<span style={{ position: "absolute", inset: 0, background: "linear-gradient(110deg, transparent 30%, rgba(212,168,71,0.08) 50%, transparent 70%)", animation: "gloss 3s ease-in-out infinite", pointerEvents: "none" }} /></button>
            </div>
            <div style={{ textAlign: "center", paddingBottom: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.12em", color: "rgba(237,233,246,0.12)" }}>ENTER to send · SHIFT+ENTER for new line</div>
          </div>

          {/* RIGHT */}
          <div style={{ width: 200, flexShrink: 0, borderLeft: borderFaint, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ ...labelStyle, color: "rgba(212,168,71,0.4)" }}>Codex Oracle Menu</div>
            {MENU.map(m => (
              <button key={m.q} onClick={() => send(m.q)} style={{ display: "block", width: "100%", textAlign: "left", padding: 10, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(17,15,26,0.3)", color: "rgba(237,233,246,0.5)", fontFamily: "'Cormorant Garamond', serif", fontSize: 13, cursor: "pointer", transition: "all 0.3s", lineHeight: 1.5, marginBottom: 4 }}><span style={{ color: m.c, marginRight: 6 }}>♦</span>{m.q}</button>
            ))}
            <div style={{ marginTop: "auto", borderTop: borderFaint, paddingTop: 12 }}>
              <div style={{ ...labelStyle, color: "rgba(237,233,246,0.2)" }}>Explore More</div>
              {[
                { href: "https://vaultofarcana.com/chat", label: "Vault of Arcana", c: "rgba(34,211,238,0.4)" },
                { href: "https://vaultofarcana.com", label: "Codex Oracle", c: "rgba(212,168,71,0.4)" },
                { href: "https://vaultofarcana.com/correspondence-engine", label: "Correspondence Engine", c: "rgba(147,51,234,0.4)" },
              ].map(l => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: l.c, textDecoration: "none", marginBottom: 4, transition: "color 0.3s" }}>{l.label} ↗</a>
              ))}
            </div>
          </div>
        </div>
    </div>
    <Footer />


        {/* GO DEEPER — VoA conversion */}
        <div style={{ textAlign: "center", padding: "60px 20px 40px", borderTop: borderFaint, marginTop: 0 }}>
          <div style={{ width: 200, height: 1, margin: "0 auto 32px", background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.3), rgba(212,168,71,0.5), transparent)" }} />
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 22, letterSpacing: "0.12em", color: "#d4a847", marginBottom: 12 }}>Go Deeper</div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: "rgba(237,233,246,0.4)", maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.7 }}>The Codex Oracle is one gateway. Vault of Arcana holds six living traditions — Tao, Tarot, Tantra, Entheogens, Dreamwalker, and the Codex — with more awakening.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <a href="https://www.vaultofarcana.com/chat" style={{ padding: "12px 28px", border: "1px solid rgba(217,70,239,0.3)", color: "#d946ef", fontFamily: "Cinzel, serif", fontSize: 10, letterSpacing: "0.2em", textDecoration: "none", transition: "all 0.3s" }}>ENTER THE VAULT</a>
            <a href="https://www.vaultofarcana.com/pricing" style={{ padding: "12px 28px", border: "1px solid rgba(212,168,71,0.3)", color: "#d4a847", fontFamily: "Cinzel, serif", fontSize: 10, letterSpacing: "0.2em", textDecoration: "none", transition: "all 0.3s" }}>VIEW PLANS</a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gloss { 0%,100%{transform:translateX(-100%)} 50%{transform:translateX(100%)} }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:rgba(10,9,14,0.5)}
        ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(217,70,239,0.2),rgba(212,168,71,0.2));border-radius:3px}
        @media(max-width:1024px){
          [style*="width: 210px"],[style*="width: 200px"]{display:none !important}
        }
        @media(max-width:768px){
          [style*="width: 210px"],[style*="width: 200px"]{display:none !important}
        }
      `}</style>
    </div>
  );
}


