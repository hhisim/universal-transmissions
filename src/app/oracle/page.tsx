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

/* ═══════════════════════════════════════════════════════════
   MODES
   ═══════════════════════════════════════════════════════════ */

const MODES = [
  { id: "oracle",         label: "ORACLE",        icon: "✦", c: "#d946ef",
    desc: "Poetic synthesis — the Codex speaking through geometry, myth, and vibration." },
  { id: "decipher",       label: "DECIPHER",       icon: "🜂", c: "#22d3ee",
    desc: "Structured page decryption: transmission → mechanics → integration → essence." },
  { id: "ginabul",        label: "GINA'ABUL",      icon: "𒀭", c: "#d4a847",
    desc: "Decode the Sumerian-derived page names via the Gina'abul lexicon." },
  { id: "etymology",      label: "LINGUISTICS",    icon: "🔤", c: "#f0c75e",
    desc: "Letter-by-letter alphabet decoding and esoteric linguistic analysis." },
  { id: "correspondence", label: "CORRESPOND",     icon: "🔗", c: "#9333ea",
    desc: "Cross-reference symbols across pages, planets, tarot, runes, and traditions." },
  { id: "meditation",     label: "MEDITATE",       icon: "◎", c: "#22c55e",
    desc: "Guided contemplative practice anchored in a specific page." },
  { id: "seeker",         label: "SEEKER",         icon: "✧", c: "#f59e0b",
    desc: "Accessible entry point — no jargon, just clear guidance." },
  { id: "scholar",        label: "SCHOLAR",        icon: "📚", c: "#3b82f6",
    desc: "Source-cited academic analysis with references to the archive." },
  { id: "quote",          label: "TRANSMISSION",   icon: "⚡", c: "#ec4899",
    desc: "A single oracular fragment — compressed, resonant, alive." },
];

/* ═══════════════════════════════════════════════════════════
   STARTER QUESTIONS per mode
   ═══════════════════════════════════════════════════════════ */

const STARTERS: Record<string, string[]> = {
  oracle: [
    "What is the Codex teaching about consciousness and geometry?",
    "What is page 38 about?",
    "What symbols repeat across the 150 pages?",
    "How does the Codex encode frequency as a creative force?",
  ],
  decipher: [
    "Decipher page 6 — the Tesseract",
    "Decipher page 24 — the Cosmic Egg",
    "What is page 70 about?",
    "Decipher page 9 — the Light-Body Core",
  ],
  ginabul: [
    "Decode ZU.AN.NA",
    "What does UB-ŠÀ-TÉŠ mean?",
    "Decode NU.MU.NA-DIŠTU",
    "What does ZI.ŠAG.KA mean?",
  ],
  etymology: [
    "Decode the word NOMMO letter by letter",
    "What is the energetic signature of MERKABA?",
    "Analyze the alphabet philosophy of the Codex",
    "What does each letter of ANUNNAKI encode?",
  ],
  correspondence: [
    "What correspondences connect the Merkaba and the Tree of Life?",
    "Map the planetary rulers across the Codex pages",
    "What crystals and deities share the frequency of page 24?",
    "Trace the Flower of Life through the correspondence web",
  ],
  meditation: [
    "Guide me through a meditation on page 6",
    "Create a breathwork practice for the Cosmic Egg",
    "A contemplation for the Nommo transmission",
    "Grounding practice connected to page 9",
  ],
  seeker: [
    "I just got the book. Where do I start?",
    "What is the Universal Transmissions Codex?",
    "How do the 150 pages connect to each other?",
    "What are the glyphs around the borders?",
  ],
  scholar: [
    "What Dogon cosmological knowledge is embedded in the Codex?",
    "Compare the Codex's Sumerian mythology with Sitchin and Parks",
    "How does Schwaller de Lubicz's work relate to the geometry?",
    "Trace the Hermetic influences across the pages",
  ],
  quote: [
    "A transmission about consciousness",
    "A fragment about sacred geometry",
    "A whisper from the Nommo",
    "An essence from the Cosmic Egg",
  ],
};

const FOLLOWUPS: Record<string, string[]> = {
  oracle: ["Go deeper on this page", "What is the shadow aspect?", "Connected pages?"],
  decipher: ["Etymology of the name", "Meditation for this page", "Correspondence web"],
  ginabul: ["Decipher this page", "Letter-by-letter decode", "Connected names"],
  etymology: ["Gina'abul name decode", "Correspondence web", "Decipher the page"],
  correspondence: ["Decipher this symbol", "Meditate on this", "Scholar analysis"],
  meditation: ["Decipher the page", "Go deeper", "Connected practice"],
  seeker: ["Tell me more", "What page should I look at?", "How does this connect?"],
  scholar: ["Source analysis", "Compare traditions", "Connected pages"],
  quote: ["Another transmission", "Decipher this", "Go deeper"],
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface Msg { role: "user" | "oracle"; text: string; mode?: string }

function ChatBubble({ msg, modeColor }: { msg: Msg; modeColor: string }) {
  const isOracle = msg.role === "oracle";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        marginBottom: 20, padding: "16px 20px",
        borderLeft: `2px solid ${isOracle ? modeColor + "44" : "rgba(34,211,238,0.15)"}`,
        background: isOracle ? modeColor + "06" : "rgba(34,211,238,0.02)",
      }}
    >
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        letterSpacing: "0.2em", textTransform: "uppercase",
        color: isOracle ? modeColor + "88" : "rgba(34,211,238,0.35)", marginBottom: 10,
      }}>
        {isOracle ? `CODEX ORACLE · ${MODES.find(m => m.id === msg.mode)?.label || "ORACLE"}` : "YOU"}
      </div>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif", fontSize: 17,
        lineHeight: 1.8, color: isOracle ? "var(--ut-white)" : "var(--ut-white-dim)",
      }}>
        {isOracle ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown> : msg.text}
      </div>
    </motion.div>
  );
}

export default function OraclePage() {
  const [mode, setMode] = useState("oracle");
  const [lang, setLang] = useState("en");
  const [speed, setSpeed] = useState<"fast" | "deep">("fast");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const currentMode = MODES.find(m => m.id === mode) || MODES[0];
  const starters = STARTERS[mode] || STARTERS.oracle;
  const followups = FOLLOWUPS[mode] || FOLLOWUPS.oracle;
  const hasMessages = msgs.length > 0;

  const send = useCallback(async (text?: string) => {
    const m = (text || input).trim();
    if (!m || loading) return;
    setInput("");
    setMsgs(p => [...p, { role: "user", text: m }]);
    setLoading(true);
    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: m, mode, lang, speed }),
      });
      const data = await res.json();
      const answer = data.response || data.answer || "";
      setMsgs(p => [...p, {
        role: "oracle",
        text: answer || "The Oracle is contemplating. Please try again.",
        mode,
      }]);
    } catch {
      setMsgs(p => [...p, { role: "oracle", text: "The transmission was interrupted.", mode }]);
    } finally { setLoading(false); }
  }, [input, mode, lang, speed, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      <Navigation />
      <PageBackground variant="oracle" />
      <main style={{ background: "var(--ut-black)" }}>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }} className="container-ut text-center pt-32 pb-8">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3"
            style={{ color: "rgba(212,168,71,0.5)" }}>
            [ Universal Transmissions · Codex Oracle ]
          </p>
          <h1 className="font-display text-4xl md:text-6xl mb-4" style={{ color: "var(--ut-white)" }}>
            <ZalgoText text="Consult Oracle" intensity="moderate" />
          </h1>
          <p className="font-body text-lg max-w-2xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
            150 pages of xenolinguistic art, sacred geometry, and symbolic transmissions —
            decoded through five data layers, the Gina'abul lexicon, and a 577-entry correspondence codex.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.15 }}>

        {/* ── Mode Selector ── */}
        <div className="container-ut pb-4">
          <div className="flex flex-wrap justify-center gap-2">
            {MODES.map(mo => (
              <button key={mo.id} onClick={() => setMode(mo.id)}
                className="font-heading text-[9px] md:text-[10px] tracking-[0.18em] uppercase px-4 py-2 border transition-all duration-300"
                style={{
                  borderColor: mode === mo.id ? mo.c + "66" : "rgba(255,255,255,0.06)",
                  color: mode === mo.id ? mo.c : "var(--ut-white-faint)",
                  background: mode === mo.id ? mo.c + "0a" : "transparent",
                  boxShadow: mode === mo.id ? `0 0 20px ${mo.c}08, inset 0 0 20px ${mo.c}04` : "none",
                }}>
                <span style={{ marginRight: 6, fontSize: 11 }}>{mo.icon}</span>{mo.label}
              </button>
            ))}
          </div>
          <div className="mt-3 text-center">
            <span className="font-mono text-[9px] tracking-wide" style={{ color: currentMode.c, opacity: 0.55 }}>
              {currentMode.desc}
            </span>
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className="container-ut pb-8">
          <div className="ut-card p-0 overflow-hidden" style={{ borderColor: currentMode.c + "12" }}>
            <div ref={chatRef} style={{ minHeight: 400, maxHeight: 560, overflowY: "auto", padding: "24px 24px 16px" }}>
              {/* Empty state */}
              {!hasMessages && (
                <div className="text-center py-12">
                  <div style={{
                    width: 52, height: 52, margin: "0 auto 16px",
                    border: `1px solid ${currentMode.c}22`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  }}>
                    <span style={{ color: currentMode.c + "66" }}>{currentMode.icon}</span>
                  </div>
                  <p className="font-heading text-sm tracking-wider mb-5" style={{ color: "var(--ut-white-dim)" }}>
                    Begin with a question about the Codex
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                    {starters.map(q => (
                      <button key={q} onClick={() => send(q)}
                        className="font-body text-sm px-4 py-2 border transition-all duration-200 hover:border-[rgba(217,70,239,0.35)]"
                        style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)", background: "transparent" }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {msgs.map((m, i) => (
                <ChatBubble key={i} msg={m} modeColor={MODES.find(x => x.id === (m.mode || mode))?.c || currentMode.c} />
              ))}

              {/* Loading */}
              {loading && (
                <div style={{
                  padding: "16px 20px", marginBottom: 16,
                  borderLeft: `2px solid ${currentMode.c}33`, background: currentMode.c + "04",
                }}>
                  <div className="font-mono text-[9px] tracking-[0.2em] mb-3" style={{ color: currentMode.c + "55" }}>
                    CODEX ORACLE · {speed === "deep" ? "DEEP PROCESSING" : "RECEIVING TRANSMISSION"}...
                  </div>
                  <div className="flex gap-2">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <span key={i} style={{
                        width: 6, height: 6, background: currentMode.c, borderRadius: "50%",
                        animation: "oraclePulse 1.5s ease-in-out infinite", animationDelay: `${delay}s`,
                        display: "block", opacity: 0.6,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-ups */}
              {hasMessages && !loading && msgs[msgs.length - 1]?.role === "oracle" && (
                <div className="flex flex-wrap gap-2 mt-2 mb-4">
                  {followups.map(f => (
                    <button key={f} onClick={() => send(f)}
                      className="font-mono text-[8px] tracking-widest uppercase px-3 py-1.5 border transition-all hover:border-[rgba(217,70,239,0.3)]"
                      style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)", background: "transparent" }}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div style={{ padding: "0 24px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex gap-3 items-end mt-4">
                <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Ask the Codex Oracle..."
                  className="flex-1 bg-[rgba(17,15,26,0.6)] border px-4 py-3 font-body text-base text-[var(--ut-white)] resize-none outline-none transition-all focus:border-[rgba(217,70,239,0.25)]"
                  style={{ borderColor: "rgba(255,255,255,0.06)", minHeight: 48 }}
                />
                <button onClick={() => send()} disabled={loading || !input.trim()}
                  className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all"
                  style={{
                    borderColor: currentMode.c + "55", color: currentMode.c, background: currentMode.c + "08",
                    opacity: loading || !input.trim() ? 0.3 : 1,
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  }}>
                  TRANSMIT
                </button>
              </div>
              <div className="mt-2 text-center font-mono text-[8px] tracking-widest" style={{ color: "rgba(237,233,246,0.08)" }}>
                ENTER to send · SHIFT+ENTER for new line
              </div>
            </div>
          </div>
        </div>

        {/* ── Settings: Speed · Language · Clear ── */}
        <div className="container-ut pb-8">
          <div className="flex flex-wrap gap-6 items-center justify-center">

            {/* ⚡ Speed Toggle ⚡ */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>
                Engine
              </span>
              <div className="flex gap-1">
                <button onClick={() => setSpeed("fast")}
                  className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all duration-300"
                  style={{
                    borderColor: speed === "fast" ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.06)",
                    color: speed === "fast" ? "#22d3ee" : "var(--ut-white-faint)",
                    background: speed === "fast" ? "rgba(34,211,238,0.08)" : "transparent",
                    boxShadow: speed === "fast" ? "0 0 12px rgba(34,211,238,0.1)" : "none",
                  }}>
                  ⚡ FAST
                </button>
                <button onClick={() => setSpeed("deep")}
                  className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all duration-300"
                  style={{
                    borderColor: speed === "deep" ? "rgba(147,51,234,0.5)" : "rgba(255,255,255,0.06)",
                    color: speed === "deep" ? "#9333ea" : "var(--ut-white-faint)",
                    background: speed === "deep" ? "rgba(147,51,234,0.08)" : "transparent",
                    boxShadow: speed === "deep" ? "0 0 12px rgba(147,51,234,0.1)" : "none",
                  }}>
                  ◈ DEEP
                </button>
              </div>
              <span className="font-mono text-[7px] tracking-wide" style={{
                color: speed === "fast" ? "rgba(34,211,238,0.35)" : "rgba(147,51,234,0.35)",
              }}>
                {speed === "fast" ? "~10s · Qwen Flash" : "~45s · MiniMax Deep"}
              </span>
            </div>

            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.06)" }} />

            {/* Language */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>
                Language
              </span>
              <div className="flex gap-1">
                {(["en", "tr", "ru"] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className="font-mono text-[9px] tracking-widest uppercase px-2.5 py-1.5 border transition-all"
                    style={{
                      borderColor: lang === l ? "var(--ut-magenta)" + "44" : "rgba(255,255,255,0.06)",
                      color: lang === l ? "var(--ut-magenta)" : "var(--ut-white-faint)",
                      background: lang === l ? "rgba(217,70,239,0.06)" : "transparent",
                    }}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.06)" }} />

            {/* Clear */}
            <button onClick={() => setMsgs([])}
              className="font-mono text-[8px] tracking-widest uppercase px-3 py-1.5 border transition-all hover:border-[rgba(255,255,255,0.15)]"
              style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)" }}>
              CLEAR
            </button>
          </div>
        </div>

        {/* ── Go Deeper CTA ── */}
        <SectionReveal>
          <div className="container-ut pb-20 text-center">
            <div className="sacred-divider mb-12" />
            <div className="font-heading text-xl tracking-widest mb-4" style={{ color: "var(--ut-gold)" }}>
              Go Deeper
            </div>
            <p className="font-body text-base max-w-lg mx-auto mb-8" style={{ color: "var(--ut-white-dim)", lineHeight: 1.7 }}>
              The Codex Oracle is one gateway. Vault of Arcana holds six living traditions —
              Tao, Tarot, Tantra, Entheogens, Dreamwalker, and the Codex — with more awakening.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="https://www.vaultofarcana.com"
                className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all hover:border-[rgba(217,70,239,0.5)]"
                style={{ borderColor: "rgba(217,70,239,0.25)", background: "rgba(217,70,239,0.04)", color: "rgba(217,70,239,0.7)" }}>
                Enter the Vault
              </a>
              <a href="/store"
                className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all hover:border-[rgba(212,168,71,0.5)]"
                style={{ borderColor: "rgba(212,168,71,0.25)", background: "rgba(212,168,71,0.03)", color: "rgba(212,168,71,0.7)" }}>
                Get the Book
              </a>
            </div>
          </div>
        </SectionReveal>
        </motion.div>

      </main>
      <Footer />
      <style>{`
        @keyframes oraclePulse {
          0%, 100% { opacity: 0.25; transform: scale(0.9); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: rgba(10,9,14,0.5); }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #c026d3 0%, #d946ef 20%, #f0c75e 45%, #22d3ee 75%, #22d3ee 100%);
          border-radius: 3px;
        }
      `}</style>
    </>
  );
}
