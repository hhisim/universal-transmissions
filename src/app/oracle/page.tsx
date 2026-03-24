"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";

// ─── Config ────────────────────────────────────────────────────
const API_URL = "http://204.168.154.237:8002";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "tr", label: "TR" },
  { code: "ru", label: "RU" },
];

const MODES = [
  { id: "oracle", label: "Oracle" },
  { id: "decipher", label: "Decipher" },
  { id: "correspondence", label: "Correspond" },
  { id: "etymology", label: "Linguistic Mystic" },
  { id: "meditation", label: "Meditate" },
];

const QUICK_PROMPTS = [
  "What is Page 6 about?",
  "What is the meaning of Page 24?",
  "What does the cube represent on Page 39?",
  "Decode the word NOMMO letter by letter",
  "What correspondences connect Pages 12 and 45?",
];

const RIGHT_MENU = [
  { q: "What is Page 6 about?", color: "gold" },
  { q: "Decode the name ŠURPU", color: "magenta" },
  { q: "Map correspondences for Page 12", color: "purple" },
  { q: "What symbols repeat across the Codex?", color: "cyan" },
  { q: "Guide me through a meditation on Page 33", color: "green" },
];

const ASK_ABOUT = [
  "Any of the 150 Codex pages",
  "Symbols & alphabets",
  "Page names & meanings",
  "Energetic meaning of words",
  "Cross-references & correspondences",
];

// ─── Types ───────────────────────────────────────────────────────
interface Message {
  role: "user" | "oracle";
  text: string;
}

// ─── Markdown Parser ────────────────────────────────────────────
function parseOracleText(text: string): string {
  let out = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Section headers with alchemical symbols
  out = out.replace(
    /^🜂 (.+)$/gm,
    '<span class="section-header">🜂 $1</span>'
  );
  out = out.replace(
    /^⚛ (.+)$/gm,
    '<span class="section-header">⚛ $1</span>'
  );
  out = out.replace(
    /^📜 (.+)$/gm,
    '<span class="section-header">📜 $1</span>'
  );

  // Bold
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="text-cyan-300">$1</strong>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#d4a847]">$1</strong>');

  // Italic
  out = out.replace(/\*(.+?)\*/g, '<em class="text-white/50">$1</em>');

  // Code blocks
  out = out.replace(
    /```([\s\S]*?)```/g,
    '<pre class="oracle-pre">$1</pre>'
  );
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="oracle-code">$1</code>'
  );

  // Lists
  out = out.replace(/^- (.+)$/gm, '<li class="oracle-li">$1</li>');
  out = out.replace(/^(\d+)\. (.+)$/gm, '<li class="oracle-li-num">$2</li>');

  // Dividers
  out = out.replace(/^✧$/gm, '<span class="text-[#d4a847] mx-2">✧</span>');
  out = out.replace(/^───$/gm, '<hr class="oracle-hr" />');

  // Paragraphs
  out = out.split(/\n\n+/).map((block) => {
    if (
      block.match(/^<(h[1-3]|p|pre|ul|ol|li|blockquote|hr|span)/)
    )
      return block;
    return `<p class="oracle-p">${block.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return out;
}

// ─── Oracle Scene (canvas animation) ────────────────────────────
function OracleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    let animId = 0;
    let scanY = 0;

    // Stars
    const STARS: { x: number; y: number; size: number; base: number; phase: number; isGold: boolean }[] = [];
    // Glyph drops
    const GLYPHS_LIST = [
      "\u0300", "\u0301", "\u0302", "\u0303", "\u0308", "\u030A",
      "\u030B", "\u030C", "\u0311", "\u0312", "\u0313", "\u0314",
      "\u0316", "\u0317", "\u0323", "\u0324", "\u0325", "\u0327",
      "\u0330", "\u0331", "\u0334", "\u0335", "\u0336",
      "᚛", "᚜", "⍟", "⎈", "◬", "⬡", "⏣", "⌬", "☿", "♃", "♄",
      "⊹", "⊕", "⊗", "⦿", "⧫", "∞", "◎", "⟐", "⟡",
      "△", "▽", "◇", "○", "□", "⬠", "⬡", "⬢",
      "🜁", "🜂", "🜃", "🜄", "🜔", "🝆",
    ];
    const DROPS: { x: number; y: number; speed: number; char: string; opacity: number; size: number }[] = [];

    function resize() {
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = W;
      canvas!.height = H;
      // Init stars
      STARS.length = 0;
      for (let i = 0; i < 120; i++) {
        STARS.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: 0.3 + Math.random() * 1.2,
          base: 0.3 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          isGold: Math.random() > 0.85,
        });
      }
      // Init glyph drops
      DROPS.length = 0;
      const cols = Math.floor(W / 35);
      for (let i = 0; i < cols; i++) {
        DROPS.push({
          x: (i / cols) * W + Math.random() * 15,
          y: Math.random() * H,
          speed: 0.15 + Math.random() * 0.2,
          char: GLYPHS_LIST[Math.floor(Math.random() * GLYPHS_LIST.length)],
          opacity: 0.012 + Math.random() * 0.006,
          size: 10 + Math.random() * 6,
        });
      }
    }

    function draw(ts: number) {
      ctx!.fillStyle = "#0a090e";
      ctx!.fillRect(0, 0, W, H);

      // Nebula 1 — purple top-right
      const n1 = ctx!.createRadialGradient(W * 0.78, H * 0.2, 0, W * 0.78, H * 0.2, W * 0.4);
      n1.addColorStop(0, "rgba(147,51,234,0.025)");
      n1.addColorStop(1, "transparent");
      ctx!.fillStyle = n1;
      ctx!.fillRect(0, 0, W, H);

      // Nebula 2 — cyan bottom-left
      const n2 = ctx!.createRadialGradient(W * 0.15, H * 0.85, 0, W * 0.15, H * 0.85, W * 0.3);
      n2.addColorStop(0, "rgba(34,211,238,0.015)");
      n2.addColorStop(1, "transparent");
      ctx!.fillStyle = n2;
      ctx!.fillRect(0, 0, W, H);

      // CRT lines
      ctx!.fillStyle = "rgba(0,0,0,0.012)";
      for (let y = 0; y < H; y += 3) {
        ctx!.fillRect(0, y, W, 1);
      }

      // Stars
      for (const s of STARS) {
        const bright = s.base + Math.sin(ts * 0.001 + s.phase) * 0.25;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fillStyle = s.isGold
          ? `rgba(212,168,71,${bright})`
          : `rgba(237,233,246,${bright})`;
        ctx!.fill();
      }

      // Scan line
      scanY = (scanY + 0.4) % H;
      ctx!.fillStyle = "rgba(217,70,239,0.006)";
      ctx!.fillRect(0, scanY, W, 2);

      // Glyph rain (behind everything)
      ctx!.font = `${14}px monospace`;
      for (const drop of DROPS) {
        drop.y += drop.speed;
        if (drop.y > H + 20) {
          drop.y = -20;
          drop.char = GLYPHS_LIST[Math.floor(Math.random() * GLYPHS_LIST.length)];
          drop.opacity = 0.012 + Math.random() * 0.006;
        }
        ctx!.save();
        ctx!.globalAlpha = drop.opacity;
        ctx!.fillStyle = "#d946ef";
        ctx!.font = `${drop.size}px monospace`;
        ctx!.fillText(drop.char, drop.x, drop.y);
        ctx!.restore();
      }

      animId = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none", zIndex: 0 }}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function OraclePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("oracle");
  const [language, setLanguage] = useState("en");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const speak = useCallback((text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "ru" ? "ru-RU" : language === "tr" ? "tr-TR" : "en-US";
    utterance.pitch = voiceGender === "female" ? 1.1 : 0.9;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled, voiceGender, language]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setInput("");
    setLoading(true);

    const userMsg: Message = { role: "user", text: userText };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const params = new URLSearchParams({
        q: userText,
        pack: "codex",
        mode,
        lang: language,
      });
      const res = await fetch(`${API_URL}/ask?${params}`);
      if (!res.ok) throw new Error("Oracle unavailable");
      const data = await res.json();
      const oracleText = data.answer || data.response || "The Oracle is silent.";
      const oracleMsg: Message = { role: "oracle", text: oracleText };
      setMessages((prev) => [...prev, oracleMsg]);
      speak(oracleText);
    } catch {
      const errMsg: Message = { role: "oracle", text: "The Oracle is currently unreachable. Please try again." };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const modeColor: Record<string, string> = {
    oracle: "#d946ef",
    decipher: "#22d3ee",
    correspondence: "#9333ea",
    etymology: "#d4a847",
    meditation: "#22c55e",
  };

  const rightColor: Record<string, string> = {
    gold: "#d4a847",
    magenta: "#d946ef",
    purple: "#9333ea",
    cyan: "#22d3ee",
    green: "#22c55e",
  };

  return (
    <>
      <Navigation />
      <main className="relative min-h-screen" style={{ background: "#0a090e" }}>
        <OracleCanvas />

        <div className="relative z-10 pt-24 pb-20">
          {/* Top bar */}
          <div className="max-w-6xl mx-auto px-4 mb-0">
            <div className="border-b" style={{ borderColor: "rgba(217,70,239,0.15)" }}>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {/* Mobile menu toggle */}
                  <button
                    className="md:hidden p-2"
                    style={{ color: "rgba(217,70,239,0.5)" }}
                    onClick={() => setShowLeftPanel(!showLeftPanel)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                  <h1 className="font-display text-2xl tracking-[0.15em]" style={{ color: "#d946ef" }}>
                    CODEX ORACLE
                  </h1>
                </div>
                <span className="font-mono text-[9px] tracking-[0.3em] hidden md:block" style={{ color: "rgba(237,233,246,0.25)" }}>
                  UNIVERSAL TRANSMISSIONS
                </span>
              </div>

              {/* Subtitle + divider */}
              <div className="text-center py-5">
                <p className="font-display text-base tracking-[0.2em] mb-4" style={{
                  background: "linear-gradient(135deg, #d946ef 0%, #d4a847 35%, #9333ea 65%, #22d3ee 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  CODEX ORACLE
                </p>
                <p className="font-body text-sm mb-4" style={{ color: "rgba(237,233,246,0.4)" }}>
                  Decipher the pages. Decode the names. Map the correspondences.
                </p>
                <div className="h-px mx-auto max-w-xs" style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(217,70,239,0.5) 20%, rgba(212,168,71,0.7) 50%, rgba(147,51,234,0.5) 80%, transparent 100%)",
                }} />
              </div>
            </div>
          </div>

          {/* Three-column layout */}
          <div className="max-w-6xl mx-auto px-4 mt-0">
            <div className="flex gap-0 min-h-[600px]">

              {/* LEFT SIDEBAR — 220px */}
              <aside
                className={`
                  w-[220px] flex-shrink-0 border-r p-4 flex flex-col gap-5
                  ${showLeftPanel ? "block" : "hidden"} md:block
                `}
                style={{ borderColor: "rgba(217,70,239,0.08)", background: "rgba(17,15,26,0.4)" }}
              >
                {/* Language */}
                <div>
                  <div className="font-mono text-[9px] tracking-[0.3em] mb-2" style={{ color: "rgba(237,233,246,0.25)" }}>LANGUAGE</div>
                  <div className="flex gap-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className="font-mono text-[10px] tracking-wider px-3 py-1.5 border transition-all"
                        style={{
                          borderColor: language === lang.code ? "rgba(217,70,239,0.5)" : "rgba(217,70,239,0.1)",
                          background: language === lang.code ? "rgba(217,70,239,0.08)" : "transparent",
                          color: language === lang.code ? "#d946ef" : "rgba(237,233,246,0.35)",
                        }}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice */}
                <div>
                  <div className="font-mono text-[9px] tracking-[0.3em] mb-2" style={{ color: "rgba(237,233,246,0.25)" }}>VOICE</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className="font-mono text-[10px] tracking-wider px-3 py-1.5 border transition-all"
                      style={{
                        borderColor: voiceEnabled ? "rgba(34,211,238,0.5)" : "rgba(217,70,239,0.1)",
                        background: voiceEnabled ? "rgba(34,211,238,0.06)" : "transparent",
                        color: voiceEnabled ? "#22d3ee" : "rgba(237,233,246,0.35)",
                      }}
                    >
                      {voiceEnabled ? "ON" : "OFF"}
                    </button>
                    {voiceEnabled && (
                      <button
                        onClick={() => setVoiceGender(voiceGender === "female" ? "male" : "female")}
                        className="font-mono text-[10px] tracking-wider px-3 py-1.5 border transition-all"
                        style={{
                          borderColor: "rgba(34,211,238,0.3)",
                          color: "rgba(237,233,246,0.4)",
                        }}
                      >
                        {voiceGender === "female" ? "♀" : "♂"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <div className="font-mono text-[9px] tracking-[0.3em] mb-2" style={{ color: "rgba(237,233,246,0.25)" }}>MODE</div>
                  <div className="flex flex-col gap-1">
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className="font-mono text-[10px] tracking-wider px-3 py-2 border text-left transition-all"
                        style={{
                          borderColor: mode === m.id ? `${modeColor[m.id]}50` : "rgba(217,70,239,0.08)",
                          background: mode === m.id ? `${modeColor[m.id]}0a` : "transparent",
                          color: mode === m.id ? modeColor[m.id] : "rgba(237,233,246,0.35)",
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ask About */}
                <div>
                  <div className="font-mono text-[9px] tracking-[0.3em] mb-2" style={{ color: "rgba(237,233,246,0.25)" }}>ASK ABOUT</div>
                  <div className="flex flex-col gap-1">
                    {ASK_ABOUT.map((item) => (
                      <div key={item} className="flex items-center gap-2 font-body text-[11px]" style={{ color: "rgba(237,233,246,0.3)" }}>
                        <span style={{ color: "#d4a847" }}>✦</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              {/* CENTER — flex:1 */}
              <div className="flex-1 flex flex-col min-w-0">

                {/* Chat messages */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                  style={{ maxHeight: "55vh", scrollbarWidth: "thin", scrollbarColor: "rgba(217,70,239,0.4) rgba(0,0,0,0.2)" }}
                >
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="font-display text-sm tracking-[0.2em] mb-3" style={{ color: "rgba(237,233,246,0.3)" }}>
                        ✦ THE CODEX AWAITS ✦
                      </div>
                      <div className="font-body text-sm leading-relaxed" style={{ color: "rgba(237,233,246,0.35)" }}>
                        Select a mode, then ask about any page, symbol, name, or correspondence from the Universal Transmissions Codex.
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i}>
                      {msg.role === "user" ? (
                        <div>
                          <div className="font-mono text-[8px] tracking-[0.2em] mb-1" style={{ color: "rgba(34,211,238,0.35)" }}>YOU</div>
                          <div
                            className="font-body text-base leading-relaxed"
                            style={{
                              color: "rgba(237,233,246,0.7)",
                              padding: "10px 14px",
                              borderLeft: "2px solid rgba(34,211,238,0.2)",
                              background: "rgba(34,211,238,0.02)",
                            }}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-mono text-[8px] tracking-[0.2em] mb-1" style={{ color: "rgba(217,70,239,0.4)" }}>
                            CODEX ORACLE · {mode.toUpperCase()} MODE
                          </div>
                          <div
                            className="font-body text-base leading-[1.8]"
                            style={{
                              color: "#ede9f6",
                              padding: "14px 16px",
                              borderLeft: "2px solid rgba(217,70,239,0.3)",
                              background: "rgba(217,70,239,0.025)",
                            }}
                          >
                            <style>{`
                              .section-header { font-family: Cinzel, serif; font-size: 11px; letter-spacing: 0.12em; color: #d4a847; display: block; margin: 10px 0 6px; }
                              .oracle-pre { background: rgba(20,20,30,0.9); border: 1px solid rgba(217,70,239,0.2); color: rgba(237,233,246,0.6); padding: 12px; margin: 8px 0; font-family: JetBrains Mono, monospace; font-size: 12px; overflow-x: auto; }
                              .oracle-code { background: rgba(201,162,39,0.1); color: #d4a847; padding: 1px 5px; font-family: JetBrains Mono, monospace; font-size: 12px; }
                              .oracle-li { list-style: disc; margin-left: 16px; color: rgba(237,233,246,0.5); font-size: 14px; }
                              .oracle-li-num { list-style: decimal; margin-left: 16px; color: rgba(237,233,246,0.5); font-size: 14px; }
                              .oracle-p { color: rgba(237,233,246,0.7); margin: 0 0 8px; }
                              .oracle-hr { border: none; border-top: 1px solid rgba(217,70,239,0.15); margin: 12px 0; }
                            `}</style>
                            <div dangerouslySetInnerHTML={{ __html: parseOracleText(msg.text) }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div>
                      <div className="font-mono text-[8px] tracking-[0.2em] mb-1" style={{ color: "rgba(217,70,239,0.4)" }}>
                        CODEX ORACLE · {mode.toUpperCase()} MODE
                      </div>
                      <div
                        className="font-body text-base"
                        style={{
                          padding: "14px 16px",
                          borderLeft: "2px solid rgba(217,70,239,0.3)",
                          background: "rgba(217,70,239,0.025)",
                          color: "rgba(237,233,246,0.4)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#d946ef", animation: "pulse-dot 1.5s ease-in-out infinite" }} />
                          <span className="font-mono text-xs tracking-wider">THE ORACLE IS TRANSMITTING</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick prompts */}
                <div
                  className="flex gap-2 overflow-x-auto px-4 py-3"
                  style={{
                    borderTop: "1px solid rgba(217,70,239,0.08)",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(217,70,239,0.3) transparent",
                  }}
                >
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="flex-shrink-0 font-body text-[12px] px-4 py-2 border transition-all"
                      style={{
                        borderColor: "rgba(217,70,239,0.12)",
                        color: "rgba(237,233,246,0.4)",
                        background: "rgba(17,15,26,0.6)",
                        borderRadius: 0,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Input area */}
                <div className="p-4" style={{ borderTop: "1px solid rgba(217,70,239,0.08)" }}>
                  <div className="flex gap-3">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask the Codex..."
                      rows={2}
                      className="flex-1 font-body text-base px-4 py-3 resize-none border"
                      style={{
                        background: "rgba(17,15,26,0.8)",
                        borderColor: "rgba(217,70,239,0.15)",
                        color: "#ede9f6",
                        borderRadius: 0,
                        outline: "none",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "rgba(217,70,239,0.4)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "rgba(217,70,239,0.15)"; }}
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={loading}
                      className="relative overflow-hidden font-display text-[10px] tracking-[0.2em] px-6 py-3 border transition-all flex-shrink-0"
                      style={{
                        borderColor: "rgba(212,168,71,0.5)",
                        background: "rgba(212,168,71,0.08)",
                        color: "#d4a847",
                        borderRadius: 0,
                      }}
                    >
                      TRANSMIT
                    </button>
                  </div>
                  <div className="font-mono text-[9px] mt-2" style={{ color: "rgba(237,233,246,0.2)" }}>
                    ENTER to send · SHIFT+ENTER for new line
                  </div>
                </div>
              </div>

              {/* RIGHT SIDEBAR — 200px */}
              <aside
                className="hidden md:flex w-[200px] flex-shrink-0 border-l p-4 flex-col gap-5"
                style={{ borderColor: "rgba(217,70,239,0.08)", background: "rgba(17,15,26,0.4)" }}
              >
                <div>
                  <div className="font-mono text-[9px] tracking-[0.3em] mb-3" style={{ color: "rgba(237,233,246,0.25)" }}>MENU</div>
                  <div className="flex flex-col gap-2">
                    {RIGHT_MENU.map((item) => (
                      <button
                        key={item.q}
                        onClick={() => sendMessage(item.q)}
                        className="font-body text-[11px] text-left flex items-center gap-2 py-1 transition-all"
                        style={{ color: "rgba(237,233,246,0.35)" }}
                      >
                        <span style={{ color: rightColor[item.color] }}>◆</span>
                        <span className="hover:text-white">{item.q}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[9px] tracking-[0.3em] mb-3" style={{ color: "rgba(237,233,246,0.25)" }}>EXPLORE</div>
                  <div className="flex flex-col gap-2">
                    <a
                      href="https://www.vaultofarcana.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-[11px] flex items-center gap-2 hover:text-white transition-all"
                      style={{ color: "rgba(237,233,246,0.3)" }}
                    >
                      <span style={{ color: "#d946ef" }}>↗</span> VoA
                    </a>
                    <a
                      href="https://www.universal-transmissions.com/codex"
                      className="font-body text-[11px] flex items-center gap-2 hover:text-white transition-all"
                      style={{ color: "rgba(237,233,246,0.3)" }}
                    >
                      <span style={{ color: "#d946ef" }}>↗</span> Codex
                    </a>
                    <a
                      href="https://www.universal-transmissions.com/inquiry"
                      className="font-body text-[11px] flex items-center gap-2 hover:text-white transition-all"
                      style={{ color: "rgba(237,233,246,0.3)" }}
                    >
                      <span style={{ color: "#d946ef" }}>↗</span> Art of Inquiry
                    </a>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
