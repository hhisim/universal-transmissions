"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import PageBackground from "@/components/scenes/PageBackground";
import SectionReveal from "@/components/ui/SectionReveal";
import { motion } from "framer-motion";
import ZalgoText from "@/components/ui/ZalgoText";

const API_URL = process.env.NEXT_PUBLIC_ORACLE_API_URL ?? "http://204.168.154.237:8002";
const API_KEY = process.env.NEXT_PUBLIC_ORACLE_API_KEY ?? "prime-oracle-key-2026";

const MODES = [
  { id: "oracle",     label: "ORACLE",            c: "#d946ef" },
  { id: "decipher",   label: "DECIPHER",          c: "#22d3ee" },
  { id: "correspond", label: "CORRESPOND",         c: "#9333ea" },
  { id: "etymology",  label: "LINGUISTIC MYSTIC",  c: "#d4a847" },
  { id: "meditate",   label: "MEDITATE",           c: "#22c55e" },
];

const PROMPTS = [
  "What is Page 6 about?",
  "Decode the word NOMMU",
  "What correspondences connect Pages 12 and 45?",
  "Guide me through a meditation on Page 33",
  "What symbols repeat across the Codex?",
];

const MODE_DESCRIPTIONS: Record<string, string> = {
  oracle:     "Poetic synthesis of page symbolism, geometry, and hidden meaning.",
  decipher:   "Structured decryption with geometric, linguistic, and correspondence layers.",
  correspond: "Cross-reference symbols across pages, traditions, planets, and archetypes.",
  etymology:  "Decode any word or name letter by letter through the alphabet ontology.",
  meditate:   "Guided contemplative practice connected to a specific Codex page.",
};

interface Msg { role: "user" | "oracle"; text: string; mode?: string; }

function ChatBubble({ msg, modeLabel }: { msg: Msg; modeLabel: string }) {
  const isOracle = msg.role === "oracle";
  const borderColor = isOracle ? "rgba(217,70,239,0.25)" : "rgba(34,211,238,0.2)";
  const bg = isOracle ? "rgba(217,70,239,0.04)" : "rgba(34,211,238,0.02)";
  const labelColor = isOracle ? "rgba(217,70,239,0.5)" : "rgba(34,211,238,0.4)";
  const textColor = isOracle ? "var(--ut-white)" : "rgba(237,233,246,0.7)";

  return (
    <div style={{ marginBottom: 16, padding: "14px 16px", borderLeft: `2px solid ${borderColor}`, background: bg }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.15em", color: labelColor, marginBottom: 8 }}>
        {isOracle ? `CODEX ORACLE · ${modeLabel}` : "YOU"}
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, lineHeight: 1.75, color: textColor, whiteSpace: "pre-wrap" }}>
        {isOracle ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown> : msg.text}
      </div>
    </div>
  );
}

export default function OraclePage() {
  const [mode, setMode] = useState("oracle");
  const [lang, setLang] = useState("en");
  const [voice, setVoice] = useState(true);
  const [gender, setGender] = useState<"f"|"m">("f");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<"guest"|"free"|"initiate">("guest");
  const [usage, setUsage] = useState<{used:number; limit:number}|null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

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
      // Call the VPS backend directly from the client (bypasses serverless timeout)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      const r = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ pack: "codex", mode, lang, message: m, history: msgs.slice(-10) }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const d = await r.json();
      const responseText = d.response || d.text || d.message || d.reply || "";
      setMsgs(p => [...p, { role: "oracle", text: responseText || "The Oracle is contemplating...", mode }]);
    } catch (e) {
      const errMsg = e instanceof Error && e.name === "AbortError"
        ? "The Oracle took too long to respond. Please try again."
        : "The transmission was interrupted.";
      setMsgs(p => [...p, { role: "oracle", text: errMsg, mode }]);
    } finally { setLoading(false); }
  }, [input, mode, lang, msgs]);

  const kd = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const has = msgs.length > 0;
  const modeLabel = MODES.find(m => m.id === mode)?.label || "ORACLE";
  const currentModeColor = MODES.find(m => m.id === mode)?.c || "#d946ef";

  return (
    <>
      <Navigation />
      <PageBackground variant="oracle" />

      <main style={{ background: "var(--ut-black)" }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="container-ut text-center pt-32 pb-12"
        >
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "rgba(212,168,71,0.5)" }}>
              [ Codex Oracle ]
            </p>
            <h1 className="font-display text-4xl md:text-6xl mb-4" style={{ color: "var(--ut-white)" }}>
              <ZalgoText text="Consult Oracle" intensity="moderate" />
            </h1>
            <p className="font-body text-lg max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
              150 pages of xenolinguistic art, sacred geometry, and symbolic transmissions.
              Ask about any page, decode a name, or explore the correspondence web.
            </p>
        </motion.div>

        {/* Oracle body — animates in as one unit on page load */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
        >

        {/* Mode selector */}
        <div className="container-ut pb-6">
          <div className="flex flex-wrap justify-center gap-3">
            {MODES.map(mo => (
              <button
                key={mo.id}
                onClick={() => setMode(mo.id)}
                className="font-heading text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-all"
                style={{
                  borderColor: mode === mo.id ? mo.c + "88" : "rgba(255,255,255,0.08)",
                  color: mode === mo.id ? mo.c : "var(--ut-white-faint)",
                  background: mode === mo.id ? mo.c + "0a" : "transparent",
                }}
              >
                {mo.label}
              </button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <span className="font-mono text-[9px]" style={{ color: currentModeColor, opacity: 0.6 }}>
              {MODE_DESCRIPTIONS[mode]}
            </span>
          </div>
        </div>

        {/* Chat area — full width */}
        <div className="container-ut pb-8">
          <div className="ut-card p-0 overflow-hidden" style={{ borderColor: "rgba(217,70,239,0.08)" }}>

            {/* Chat history */}
            <div ref={chatRef} style={{ minHeight: 380, maxHeight: 520, overflowY: "auto", padding: "20px 24px" }}>
              {!has && (
                <div className="text-center py-10">
                  <div style={{ width: 48, height: 48, margin: "0 auto 14px", border: "1px solid rgba(217,70,239,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "rgba(217,70,239,0.4)", fontSize: 18 }}>✦</span>
                  </div>
                  <p className="font-heading text-sm tracking-wider mb-3" style={{ color: "var(--ut-white-dim)" }}>
                    Begin with a question about the Codex
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {PROMPTS.map(p => (
                      <button key={p} onClick={() => send(p)}
                        className="font-body text-sm px-4 py-2 border transition-all hover:border-[rgba(217,70,239,0.4)]"
                        style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)", background: "transparent" }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <ChatBubble key={i} msg={m} modeLabel={m.mode ? (MODES.find(x => x.id === m.mode)?.label || "ORACLE") : modeLabel} />
              ))}
              {loading && (
                <div style={{ padding: "14px 16px", borderLeft: "2px solid rgba(217,70,239,0.3)", background: "rgba(217,70,239,0.025)", marginBottom: 16 }}>
                  <div className="font-mono text-[8px] tracking-[0.15em] mb-3" style={{ color: "rgba(217,70,239,0.4)" }}>CODEX ORACLE · RECEIVING...</div>
                  <div className="flex gap-2">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <span key={i} style={{ width: 6, height: 6, background: ["#d946ef","#9333ea","#22d3ee"][i], borderRadius: "50%", animation: `pulse 1.5s ease-in-out infinite`, animationDelay: `${delay}s`, display: "block" }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input bar */}
            <div style={{ padding: "0 24px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex gap-3 items-end mt-4">
                <textarea
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={kd}
                  placeholder="Ask the Codex Oracle..."
                  className="flex-1 bg-[rgba(17,15,26,0.6)] border px-4 py-3 font-body text-base text-[var(--ut-white)] resize-none outline-none"
                  style={{ borderColor: "rgba(217,70,239,0.12)", minHeight: 48 }}
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all"
                  style={{
                    borderColor: "rgba(212,168,71,0.35)",
                    color: "#d4a847",
                    background: "rgba(212,168,71,0.05)",
                    opacity: loading || !input.trim() ? 0.35 : 1,
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  TRANSMIT
                </button>
              </div>
              <div className="mt-2 text-center font-mono text-[8px] tracking-widest" style={{ color: "rgba(237,233,246,0.1)" }}>
                ENTER to send · SHIFT+ENTER for new line
              </div>
            </div>
          </div>
        </div>

        {/* Settings row */}
        <div className="container-ut pb-12">
          <div className="flex flex-wrap gap-6 items-center justify-center">
            {/* Language */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>Language</span>
              <div className="flex gap-1">
                {(["en","tr","ru"] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className="font-mono text-[9px] tracking-widest uppercase px-2.5 py-1.5 border transition-all"
                    style={{
                      borderColor: lang === l ? "rgba(217,70,239,0.4)" : "rgba(255,255,255,0.06)",
                      color: lang === l ? "#d946ef" : "var(--ut-white-faint)",
                      background: lang === l ? "rgba(217,70,239,0.08)" : "transparent",
                    }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.06)" }} />
            {/* Voice */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>Voice</span>
              <button onClick={() => setVoice(!voice)}
                className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                style={{
                  borderColor: voice ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.06)",
                  color: voice ? "#22d3ee" : "var(--ut-white-faint)",
                  background: voice ? "rgba(34,211,238,0.06)" : "transparent",
                }}>
                {voice ? "ON" : "OFF"}
              </button>
              {voice && (
                <div className="flex gap-1">
                  {(["f","m"] as const).map(g => (
                    <button key={g} onClick={() => setGender(g)}
                      className="font-mono text-[9px] px-2.5 py-1 border transition-all"
                      style={{
                        borderColor: gender === g ? "rgba(212,168,71,0.4)" : "rgba(255,255,255,0.06)",
                        color: gender === g ? "#d4a847" : "var(--ut-white-faint)",
                        background: gender === g ? "rgba(212,168,71,0.06)" : "transparent",
                      }}>
                      {g === "f" ? "FEMALE" : "MALE"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.06)" }} />
            {/* Tier info */}
            <div className="font-mono text-[8px] tracking-widest" style={{ color: "var(--ut-white-faint)" }}>
              {tier === "guest" && <span style={{ color: "rgba(217,70,239,0.5)" }}>Guest — {usage ? `${usage.used}/${usage.limit}` : "10"}/day</span>}
              {tier === "free" && <span style={{ color: "rgba(212,168,71,0.5)" }}>Free — {usage ? `${usage.used}/${usage.limit}` : "25"}/day</span>}
              {tier === "initiate" && <span style={{ color: "rgba(147,51,234,0.5)" }}>Initiate active</span>}
            </div>
          </div>
        </div>

        {/* Go Deeper CTA */}
        <SectionReveal>
          <div className="container-ut pb-20 text-center">
            <div className="sacred-divider mb-12" />
            <div className="font-heading text-xl tracking-widest mb-4" style={{ color: "var(--ut-gold)" }}>
              Go Deeper
            </div>
            <p className="font-body text-base max-w-lg mx-auto mb-8" style={{ color: "var(--ut-white-dim)", lineHeight: 1.7 }}>
              The Codex Oracle is one gateway. Vault of Arcana holds six living traditions — Tao, Tarot, Tantra, Entheogens, Dreamwalker, and the Codex — with more awakening.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="https://www.vaultofarcana.com/chat"
                className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all hover:border-[rgba(217,70,239,0.5)]"
                style={{ borderColor: "rgba(217,70,239,0.25)", background: "rgba(217,70,239,0.04)", color: "rgba(217,70,239,0.7)" }}>
                Enter the Vault
              </a>
              <a href="https://www.vaultofarcana.com/pricing"
                className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all hover:border-[rgba(212,168,71,0.5)]"
                style={{ borderColor: "rgba(212,168,71,0.25)", background: "rgba(212,168,71,0.03)", color: "rgba(212,168,71,0.7)" }}>
                View Plans
              </a>
            </div>
          </div>
        </SectionReveal>
        </motion.div>

      </main>

      <Footer />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:rgba(10,9,14,0.5)}
        ::-webkit-scrollbar-thumb{background:linear-gradient(to right,#c026d3 0%,#d946ef 20%,#f0c75e 45%,#22d3ee 75%,#22d3ee 100%);border-radius:3px}
      `}</style>
    </>
  );
}
