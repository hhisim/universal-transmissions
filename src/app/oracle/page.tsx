"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import PageBackground from "@/components/scenes/PageBackground";

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

interface Msg { role: "user" | "oracle"; text: string; mode?: string; }

const MODES = [
  { id: "oracle",      label: "ORACLE",             c: "#d946ef" },
  { id: "decipher",     label: "DECIPHER",           c: "#22d3ee" },
  { id: "correspond",   label: "CORRESPOND",         c: "#9333ea" },
  { id: "linguistic",   label: "LINGUISTIC MYSTIC",  c: "#d4a847" },
  { id: "meditate",     label: "MEDITATE",           c: "#22c55e" },
];
const PROMPTS = [
  "What is Page 6 about?",
  "Decode the word NOMMU",
  "What correspondences connect Pages 12 and 45?",
  "Guide me through a meditation on Page 33",
  "What symbols repeat across the Codex?",
];
const MENU = [
  { q: "What is Page 6 about?",             c: "#d4a847" },
  { q: "Decode the name SURPU",              c: "#d946ef" },
  { q: "Map correspondences for Page 12",   c: "#9333ea" },
  { q: "What symbols repeat across the Codex?", c: "#22d3ee" },
  { q: "Meditation on Page 33",              c: "#22c55e" },
];

export default function OraclePage() {
  const [mode, setMode] = useState("oracle");
  const [lang, setLang] = useState("en");
  const [voice, setVoice] = useState(true);
  const [gender, setGender] = useState<"f"|"m">("f");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [zt, setZt] = useState("CODEX ORACLE");
  const [tier, setTier] = useState<"guest"|"free"|"initiate">("guest");
  const [usage, setUsage] = useState<{used:number;limit:number}|null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setZt(zg("CODEX ORACLE", 1, 1));
    const t = setInterval(() => setZt(zg("CODEX ORACLE", 1, 1)), 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    fetch("/api/billing/session")
      .then(r => r.json())
      .then(d => { if (d.authenticated) setTier(d.plan || "guest"); })
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
        setMsgs(p => [...p, { role: "oracle", text: d.error || "Daily limit reached.", mode }]);
        return;
      }
      if (d.plan) setTier(d.plan as "guest"|"free"|"initiate");
      if (d.usage) setUsage(d.usage);
      setMsgs(p => [...p, { role: "oracle", text: d.response || d.text || d.message || "The Oracle is contemplating...", mode }]);
    } catch {
      setMsgs(p => [...p, { role: "oracle", text: "The transmission was interrupted.", mode }]);
    } finally { setLoading(false); }
  }, [input, mode, lang, msgs]);

  const kd = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const ml = (id: string) => MODES.find(m => m.id === id)?.label || "ORACLE";
  const has = msgs.length > 0;
  const labelStyle = { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(237,233,246,0.25)", textTransform: "uppercase" as const, marginBottom: 8 };
  const borderFaint = "1px solid rgba(255,255,255,0.04)";

  return (
    <div style={{ background: "transparent", minHeight: "100vh" }}>
      <PageBackground variant="oracle" />
      <Navigation />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", paddingTop: 32, paddingBottom: 24 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.3em", color: "rgba(212,168,71,0.5)", marginBottom: 10 }}>[ CODEX ORACLE ]</p>
          <h1 style={{
            fontFamily: "'Cinzel Decorative', Cinzel, serif",
            fontSize: "clamp(26px, 5vw, 44px)",
            letterSpacing: "0.08em",
            background: "linear-gradient(135deg, #d946ef 0%, #d4a847 35%, #9333ea 65%, #22d3ee 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: 10,
          }}>{zt}</h1>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontStyle: "italic", color: "rgba(237,233,246,0.35)", marginBottom: 16 }}>
            Decipher the pages. Decode the names. Map the correspondences.
          </p>
          <div style={{ width: 260, height: 1, margin: "0 auto", background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.4), rgba(212,168,71,0.6), rgba(147,51,234,0.4), transparent)" }} />
        </div>

        {/* Tier Banner */}
        {tier === "guest" && (
          <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "12px 20px", border: "1px solid rgba(217,70,239,0.2)", background: "rgba(217,70,239,0.04)", textAlign: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(217,70,239,0.7)", textTransform: "uppercase" }}>
              Guest — {usage ? `${usage.used}/${usage.limit}` : "10"} questions remaining today
            </span>
            <a href="/pricing" style={{ fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.2em", color: "#d946ef", textDecoration: "none", marginLeft: 12 }}>Create free account</a>
          </div>
        )}
        {tier === "free" && (
          <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "12px 20px", border: "1px solid rgba(212,168,71,0.2)", background: "rgba(212,168,71,0.04)", textAlign: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.15em", color: "rgba(212,168,71,0.7)", textTransform: "uppercase" }}>
              Free — {usage ? `${usage.used}/${usage.limit}` : "25"} questions remaining
            </span>
            <a href="/pricing" style={{ fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.2em", color: "#d4a847", textDecoration: "none", marginLeft: 12 }}>Unlock Initiate</a>
          </div>
        )}
        {tier === "initiate" && (
          <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "10px 20px", border: "1px solid rgba(147,51,234,0.12)", background: "rgba(147,51,234,0.03)", textAlign: "center" }}>
            <a href="https://vaultofarcana.com/chat" target="_blank" rel="noopener noreferrer" style={{ fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.2em", color: "rgba(147,51,234,0.5)", textDecoration: "none" }}>Initiate active — Explore Vault of Arcana</a>
          </div>
        )}

        {/* Mode Buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {MODES.map(mo => (
            <button
              key={mo.id}
              onClick={() => setMode(mo.id)}
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                padding: "10px 18px",
                border: `1px solid ${mode === mo.id ? mo.c + "55" : "rgba(255,255,255,0.08)"}`,
                background: mode === mo.id ? mo.c + "0a" : "transparent",
                color: mode === mo.id ? mo.c : "rgba(237,233,246,0.35)",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              {mo.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", borderTop: borderFaint, minHeight: 520 }}>

            {/* Left Sidebar */}
            <div style={{ width: 210, flexShrink: 0, borderRight: borderFaint, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={labelStyle}>Language</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["en","tr","ru"] as const).map(l => (
                    <button key={l} onClick={() => setLang(l)}
                      style={{ padding: "5px 12px", border: `1px solid ${lang === l ? "rgba(217,70,239,0.3)" : "rgba(255,255,255,0.06)"}`, background: lang === l ? "rgba(217,70,239,0.08)" : "transparent", color: lang === l ? "#d946ef" : "rgba(237,233,246,0.25)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.3s" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Voice</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button onClick={() => setVoice(!voice)}
                    style={{ padding: "5px 14px", border: `1px solid ${voice ? "rgba(34,211,238,0.3)" : "rgba(255,255,255,0.06)"}`, background: voice ? "rgba(34,211,238,0.06)" : "transparent", color: voice ? "#22d3ee" : "rgba(237,233,246,0.25)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, cursor: "pointer", transition: "all 0.3s" }}>
                    {voice ? "ON" : "OFF"}
                  </button>
                  {voice && (
                    <div style={{ display: "flex", gap: 4, flex: 1 }}>
                      {(["f","m"] as const).map(g => (
                        <button key={g} onClick={() => setGender(g)}
                          style={{ flex: 1, padding: "4px 0", textAlign: "center", border: `1px solid ${gender === g ? "rgba(212,168,71,0.3)" : "rgba(255,255,255,0.06)"}`, background: gender === g ? "rgba(212,168,71,0.08)" : "transparent", color: gender === g ? "#d4a847" : "rgba(237,233,246,0.25)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, cursor: "pointer", transition: "all 0.3s" }}>
                          {g === "f" ? "F" : "M"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ borderTop: borderFaint, paddingTop: 12 }}>
                <div style={labelStyle}>Active: <span style={{ color: MODES.find(m=>m.id===mode)?.c }}>{ml(mode)}</span></div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(237,233,246,0.25)", lineHeight: 1.65 }}>
                  {mode === "oracle" && "Poetic synthesis of page symbolism, geometry, and hidden meaning."}
                  {mode === "decipher" && "Structured decryption with geometric, linguistic, and correspondence layers."}
                  {mode === "correspond" && "Cross-reference symbols across pages, traditions, planets, and archetypes."}
                  {mode === "linguistic" && "Decode any word or name letter by letter through the alphabet ontology."}
                  {mode === "meditate" && "Guided contemplative practice connected to a specific Codex page."}
                </div>
              </div>
              <div style={{ marginTop: "auto", borderTop: borderFaint, paddingTop: 12 }}>
                <div style={labelStyle}>Ask About</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(237,233,246,0.3)", lineHeight: 1.85 }}>
                  {["Any of the 150 Codex pages", "Symbols & alphabets", "Page names & meanings", "Energetic meaning of words", "Correspondences & cross-references"].map(t => <div key={t}>✦ {t}</div>)}
                </div>
              </div>
            </div>

            {/* Center Chat */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div ref={chatRef} style={{ flex: 1, padding: 20, overflowY: "auto", maxHeight: 420 }}>
                {!has && (
                  <div style={{ textAlign: "center", padding: "40px 16px" }}>
                    <div style={{ width: 48, height: 48, margin: "0 auto 16px", border: "1px solid rgba(217,70,239,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "rgba(217,70,239,0.4)", fontSize: 18 }}>✦</span>
                    </div>
                    <div style={{ fontFamily: "Cinzel, serif", fontSize: 15, letterSpacing: "0.1em", color: "rgba(237,233,246,0.5)", marginBottom: 12 }}>Begin with a question about the Codex</div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "rgba(237,233,246,0.2)", lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
                      150 pages of xenolinguistic art, sacred geometry, and symbolic transmissions. Ask about any page, decode a name, or explore the correspondence web.
                    </p>
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} style={{ marginBottom: 16, padding: m.role === "oracle" ? "14px 16px" : "10px 14px", borderLeft: `2px solid ${m.role === "oracle" ? "rgba(217,70,239,0.3)" : "rgba(34,211,238,0.2)"}`, background: m.role === "oracle" ? "rgba(217,70,239,0.025)" : "rgba(34,211,238,0.02)" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.15em", color: m.role === "oracle" ? "rgba(217,70,239,0.4)" : "rgba(34,211,238,0.35)", marginBottom: m.role === "oracle" ? 8 : 4 }}>
                      {m.role === "oracle" ? `CODEX ORACLE · ${ml(m.mode || "oracle")} MODE` : "YOU"}
                    </div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: m.role === "oracle" ? 16 : 15, lineHeight: 1.75, color: m.role === "oracle" ? "#ede9f6" : "rgba(237,233,246,0.65)", whiteSpace: "pre-wrap" }}>
                      {m.role === "oracle" ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown> : <span>{m.text}</span>}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ marginBottom: 16, padding: "14px 16px", borderLeft: "2px solid rgba(217,70,239,0.3)", background: "rgba(217,70,239,0.025)" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.15em", color: "rgba(217,70,239,0.4)", marginBottom: 8 }}>CODEX ORACLE · RECEIVING...</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[0, 0.15, 0.3].map((d, i) => (
                        <span key={i} style={{ width: 6, height: 6, background: ["#d946ef","#9333ea","#22d3ee"][i], borderRadius: "50%", animation: `pulse 1.5s ease-in-out infinite`, animationDelay: d + "s" }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!has && (
                <div style={{ padding: "0 20px 8px" }}>
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10 }}>
                    {PROMPTS.map(p => (
                      <button key={p} onClick={() => send(p)}
                        style={{ flexShrink: 0, padding: "7px 12px", border: "1px solid rgba(255,255,255,0.05)", background: "rgba(17,15,26,0.4)", color: "rgba(237,233,246,0.3)", fontFamily: "'Cormorant Garamond', serif", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "0 20px 12px" }}>
                <textarea
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={kd}
                  placeholder="Ask the Codex Oracle..."
                  style={{ flex: 1, background: "rgba(17,15,26,0.6)", border: "1px solid rgba(217,70,239,0.1)", padding: "11px 14px", fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: "#ede9f6", resize: "none", outline: "none", minHeight: 44 }}
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  style={{
                    padding: "11px 22px",
                    border: "1px solid rgba(212,168,71,0.3)",
                    background: "rgba(212,168,71,0.05)",
                    fontFamily: "Cinzel, serif",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#d4a847",
                    cursor: "pointer",
                    opacity: loading || !input.trim() ? 0.35 : 1,
                  }}
                >
                  TRANSMIT
                </button>
              </div>
              <div style={{ textAlign: "center", paddingBottom: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.12em", color: "rgba(237,233,246,0.12)" }}>ENTER to send · SHIFT+ENTER for new line</div>
            </div>

            {/* Right Sidebar */}
            <div style={{ width: 200, flexShrink: 0, borderLeft: borderFaint, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ ...labelStyle, color: "rgba(212,168,71,0.4)" }}>Codex Oracle Menu</div>
              {MENU.map(m => (
                <button key={m.q} onClick={() => send(m.q)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", border: "1px solid rgba(255,255,255,0.04)", background: "rgba(17,15,26,0.3)", color: "rgba(237,233,246,0.5)", fontFamily: "'Cormorant Garamond', serif", fontSize: 13, cursor: "pointer", lineHeight: 1.5, marginBottom: 4 }}>
                  <span style={{ color: m.c, marginRight: 6 }}>♦</span>{m.q}
                </button>
              ))}
              <div style={{ marginTop: "auto", borderTop: borderFaint, paddingTop: 12 }}>
                <div style={{ ...labelStyle, color: "rgba(237,233,246,0.2)" }}>Explore More</div>
                {[
                  { href: "https://vaultofarcana.com/chat", label: "Vault of Arcana", c: "rgba(34,211,238,0.4)" },
                  { href: "https://vaultofarcana.com", label: "Codex Oracle", c: "rgba(212,168,71,0.4)" },
                  { href: "https://vaultofarcana.com/correspondence-engine", label: "Correspondence Engine", c: "rgba(147,51,234,0.4)" },
                ].map(l => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                    style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: l.c, textDecoration: "none", marginBottom: 4 }}>{l.label} </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Go Deeper */}
        <div style={{ textAlign: "center", padding: "60px 20px 40px" }}>
          <div style={{ width: 200, height: 1, margin: "0 auto 32px", background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.3), rgba(212,168,71,0.5), transparent)" }} />
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 20, letterSpacing: "0.12em", color: "#d4a847", marginBottom: 12 }}>Go Deeper</div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: "rgba(237,233,246,0.4)", maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.7 }}>
            The Codex Oracle is one gateway. Vault of Arcana holds six living traditions — Tao, Tarot, Tantra, Entheogens, Dreamwalker, and the Codex — with more awakening.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <a href="https://www.vaultofarcana.com/chat"
              style={{ padding: "12px 28px", border: "1px solid rgba(217,70,239,0.3)", color: "#d946ef", fontFamily: "Cinzel, serif", fontSize: 10, letterSpacing: "0.2em", textDecoration: "none" }}>ENTER THE VAULT</a>
            <a href="https://www.vaultofarcana.com/pricing"
              style={{ padding: "12px 28px", border: "1px solid rgba(212,168,71,0.3)", color: "#d4a847", fontFamily: "Cinzel, serif", fontSize: 10, letterSpacing: "0.2em", textDecoration: "none" }}>VIEW PLANS</a>
          </div>
        </div>

      </div>

      <Footer />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:rgba(10,9,14,0.5)}
        ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(217,70,239,0.2),rgba(212,168,71,0.2));border-radius:3px}
        @media(max-width:1024px){
          div[style*="width: 210px"],div[style*="width: 200px"]{display:none!important}
        }
      `}</style>
    </div>
  );
}
