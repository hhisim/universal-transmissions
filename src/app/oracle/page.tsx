"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

// ============================================================
// ORACLE PAGE — Complete self-contained component
// File: src/app/oracle/page.tsx
//
// INSTRUCTIONS FOR PRIME:
// 1. Delete the ENTIRE current oracle/page.tsx
// 2. Replace with THIS FILE exactly as-is
// 3. Do NOT modify, "improve", or refactor any part of this code
// 4. Do NOT add emoji anywhere
// 5. Do NOT add border-radius to any element
// 6. Deploy and verify it matches the visual reference HTML
// ============================================================

// --- Zalgo generator (self-contained, no external import) ---
const MARKS_ABOVE = [
  "\u0300","\u0301","\u0302","\u0303","\u0304","\u0306",
  "\u0307","\u0308","\u030A","\u030B","\u030C","\u0311","\u0313",
];
const MARKS_BELOW = [
  "\u0316","\u0317","\u0323","\u0324","\u0325","\u0327",
  "\u0330","\u0331","\u0345",
];

function zalgoify(text: string, above: number, below: number): string {
  return text.split("").map((c) => {
    if (c === " ") return c;
    let r = c;
    for (let i = 0; i < above; i++) r += MARKS_ABOVE[Math.floor(Math.random() * MARKS_ABOVE.length)];
    for (let i = 0; i < below; i++) r += MARKS_BELOW[Math.floor(Math.random() * MARKS_BELOW.length)];
    return r;
  }).join("");
}

// --- Types ---
interface ChatMessage {
  role: "user" | "oracle";
  content: string;
  mode?: string;
}

// --- Constants ---
const MODES = [
  { id: "oracle", label: "ORACLE", color: "#d946ef", desc: "Poetic synthesis" },
  { id: "decipher", label: "DECIPHER", color: "#22d3ee", desc: "Page decryption" },
  { id: "correspond", label: "CORRESPOND", color: "#9333ea", desc: "Symbol cross-reference" },
  { id: "linguistic", label: "LINGUISTIC MYSTIC", color: "#d4a847", desc: "Name & word decoding" },
  { id: "meditate", label: "MEDITATE", color: "#22c55e", desc: "Page contemplation" },
] as const;

const QUICK_PROMPTS = [
  "What is Page 6 about?",
  "What is the meaning of Page 24?",
  "What does the cube represent on Page 39?",
  "Decode the word NOMMU letter by letter",
  "What correspondences connect Pages 12 and 45?",
];

const MENU_ITEMS = [
  { q: "What is Page 6 about?", color: "#d4a847" },
  { q: "Decode the name ŠURPU", color: "#d946ef" },
  { q: "Map correspondences for Page 12", color: "#9333ea" },
  { q: "What symbols repeat across the Codex?", color: "#22d3ee" },
  { q: "Guide me through a meditation on Page 33", color: "#22c55e" },
];

// --- Background glyph characters ---
const BG_GLYPHS = [
  "\u0300","\u0301","\u0334","\u25B3","\u25BD","\u25C7",
  "\u2726","\u269B","\u2609","\u221E","\u25CE","\u2BC5",
  "\u16DA","\u16DE","\u29EB","\u2BC6",
];

// ============================================================
// BACKGROUND CANVAS ANIMATION
// ============================================================
function useOracleBackground(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, t = 0, animId = 0;

    interface Star { x: number; y: number; s: number; b: number; sp: number; }
    interface GlyphDrop { x: number; y: number; sp: number; ch: string; op: number; sz: number; }

    const stars: Star[] = [];
    const drops: GlyphDrop[] = [];

    function resize() {
      const r = devicePixelRatio || 1;
      const p = canvas!.parentElement;
      if (!p) return;
      W = p.clientWidth;
      H = p.clientHeight;
      canvas!.width = W * r;
      canvas!.height = H * r;
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      ctx!.setTransform(r, 0, 0, r, 0, 0);

      stars.length = 0;
      drops.length = 0;
      for (let i = 0; i < 100; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          s: 0.3 + Math.random() * 1.2,
          b: Math.random() * Math.PI * 2,
          sp: 0.5 + Math.random() * 2,
        });
      }
      for (let i = 0; i < Math.floor(W / 35); i++) {
        drops.push({
          x: i * 35 + Math.random() * 17, y: Math.random() * H,
          sp: 0.15 + Math.random() * 0.35,
          ch: BG_GLYPHS[Math.floor(Math.random() * BG_GLYPHS.length)],
          op: 0.012 + Math.random() * 0.018,
          sz: 9 + Math.random() * 4,
        });
      }
    }

    resize();
    window.addEventListener("resize", resize);

    function frame() {
      t += 0.016;
      ctx!.clearRect(0, 0, W, H);

      // Glyph rain
      for (const d of drops) {
        d.y += d.sp;
        if (d.y > H + 15) {
          d.y = -15;
          d.ch = BG_GLYPHS[Math.floor(Math.random() * BG_GLYPHS.length)];
          d.op = 0.012 + Math.random() * 0.018;
        }
        ctx!.save();
        ctx!.globalAlpha = d.op;
        ctx!.fillStyle = "#d946ef";
        ctx!.font = d.sz + "px monospace";
        ctx!.fillText(d.ch, d.x, d.y);
        ctx!.restore();
      }

      // Stars
      for (const s of stars) {
        const bri = 0.12 + Math.sin(t * s.sp + s.b) * 0.1;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        const isGold = Math.random() > 0.88;
        ctx!.fillStyle = isGold
          ? `rgba(212,168,71,${bri})`
          : `rgba(237,233,246,${bri})`;
        ctx!.fill();
      }

      // Nebula cloud 1 (purple, top-right)
      const nb1 = ctx!.createRadialGradient(W * 0.7, H * 0.25, 0, W * 0.7, H * 0.25, W * 0.4);
      nb1.addColorStop(0, "rgba(147,51,234,0.025)");
      nb1.addColorStop(0.5, "rgba(217,70,239,0.008)");
      nb1.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = nb1;
      ctx!.fillRect(0, 0, W, H);

      // Nebula cloud 2 (cyan, bottom-left)
      const nb2 = ctx!.createRadialGradient(W * 0.2, H * 0.75, 0, W * 0.2, H * 0.75, W * 0.3);
      nb2.addColorStop(0, "rgba(34,211,238,0.015)");
      nb2.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = nb2;
      ctx!.fillRect(0, 0, W, H);

      // Moving scan line
      const sy = (t * 25) % H;
      ctx!.fillStyle = "rgba(217,70,239,0.006)";
      ctx!.fillRect(0, sy - 1, W, 2);

      // CRT lines
      for (let i = 0; i < H; i += 3) {
        ctx!.fillStyle = "rgba(0,0,0,0.012)";
        ctx!.fillRect(0, i, W, 1);
      }

      animId = requestAnimationFrame(frame);
    }

    frame();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef]);
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function OraclePage() {
  // --- State ---
  const [activeMode, setActiveMode] = useState("oracle");
  const [language, setLanguage] = useState("en");
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [zalgoTitle, setZalgoTitle] = useState("CODEX ORACLE");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- Background animation ---
  useOracleBackground(canvasRef);

  // --- Animated Zalgo title ---
  useEffect(() => {
    setZalgoTitle(zalgoify("CODEX ORACLE", 1, 1));
    const timer = setInterval(() => {
      setZalgoTitle(zalgoify("CODEX ORACLE", 1, 1));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // --- Scroll chat to bottom ---
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Send message ---
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || inputValue).trim();
    if (!msg) return;
    setInputValue("");

    const userMsg: ChatMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          mode: activeMode,
          language,
          history: messages.slice(-10),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const oracleMsg: ChatMessage = {
          role: "oracle",
          content: data.response || data.text || data.message || "The Oracle is contemplating...",
          mode: activeMode,
        };
        setMessages((prev) => [...prev, oracleMsg]);
      } else {
        setMessages((prev) => [...prev, {
          role: "oracle",
          content: "The transmission was interrupted. Please try again.",
          mode: activeMode,
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "oracle",
        content: "The Oracle is currently unreachable. Check your connection and try again.",
        mode: activeMode,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, activeMode, language, messages]);

  // --- Key handler ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // --- Get mode label ---
  const getModeLabel = (id: string) => MODES.find((m) => m.id === id)?.label || "ORACLE";

  const hasMessages = messages.length > 0;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen pt-20 pb-0">
      {/* Background canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <div className="relative" style={{ zIndex: 1 }}>
        {/* ====== PAGE HEADER — matches Gallery page pattern ====== */}
        <div className="text-center px-6 pt-8 pb-2">
          <div
            className="font-heading text-[11px] tracking-[0.25em] mb-3"
            style={{ color: "rgba(212, 168, 71, 0.5)" }}
          >
            [ SACRED TEXT / SYMBOLIC ORACLE ]
          </div>

          {/* Zalgo title with gradient */}
          <h1
            className="font-display text-4xl md:text-5xl tracking-[0.08em] mb-3 transition-opacity duration-1000"
            style={{
              background: "linear-gradient(135deg, #d946ef 0%, #d4a847 35%, #9333ea 65%, #22d3ee 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {zalgoTitle}
          </h1>

          <p className="font-body text-lg italic mb-6" style={{ color: "rgba(237, 233, 246, 0.35)" }}>
            Decipher the pages. Decode the names. Map the correspondences.
          </p>

          {/* Spectrum divider */}
          <div
            className="mx-auto mb-6"
            style={{
              width: 260,
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.3), rgba(212,168,71,0.5), rgba(147,51,234,0.3), rgba(34,211,238,0.3), transparent)",
            }}
          />
        </div>

        {/* ====== MODE BUTTONS — matches Gallery filter button pattern ====== */}
        <div className="flex justify-center gap-2 px-6 pb-6 flex-wrap">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className="font-heading text-[10px] md:text-[11px] tracking-[0.2em] uppercase px-4 md:px-5 py-2.5 border transition-all duration-300"
              style={{
                borderColor: activeMode === mode.id ? mode.color + "55" : "rgba(255,255,255,0.08)",
                background: activeMode === mode.id ? mode.color + "0a" : "transparent",
                color: activeMode === mode.id ? mode.color : "rgba(237,233,246,0.35)",
              }}
              onMouseEnter={(e) => {
                if (activeMode !== mode.id) {
                  e.currentTarget.style.color = "rgba(237,233,246,0.6)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeMode !== mode.id) {
                  e.currentTarget.style.color = "rgba(237,233,246,0.35)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* ====== THREE-COLUMN LAYOUT ====== */}
        <div
          className="max-w-7xl mx-auto flex"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)", minHeight: 520 }}
        >
          {/* ---- LEFT SIDEBAR ---- */}
          <div
            className="hidden lg:flex flex-col gap-5 p-5 flex-shrink-0"
            style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.04)" }}
          >
            {/* Language */}
            <div>
              <div className="font-mono text-[9px] tracking-[0.15em] uppercase mb-2" style={{ color: "rgba(237,233,246,0.25)" }}>
                Language
              </div>
              <div className="flex gap-1">
                {(["en", "tr", "ru"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className="px-3 py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase border transition-all duration-300"
                    style={{
                      borderColor: language === lang ? "rgba(217,70,239,0.3)" : "rgba(255,255,255,0.06)",
                      background: language === lang ? "rgba(217,70,239,0.08)" : "transparent",
                      color: language === lang ? "#d946ef" : "rgba(237,233,246,0.25)",
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice */}
            <div>
              <div className="font-mono text-[9px] tracking-[0.15em] uppercase mb-2" style={{ color: "rgba(237,233,246,0.25)" }}>
                Voice
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceOn(!voiceOn)}
                  className="px-4 py-1.5 font-mono text-[9px] tracking-[0.08em] border transition-all duration-300"
                  style={{
                    borderColor: voiceOn ? "rgba(34,211,238,0.3)" : "rgba(255,255,255,0.06)",
                    background: voiceOn ? "rgba(34,211,238,0.06)" : "transparent",
                    color: voiceOn ? "#22d3ee" : "rgba(237,233,246,0.25)",
                  }}
                >
                  {voiceOn ? "ON" : "OFF"}
                </button>
                {voiceOn && (
                  <div className="flex gap-1 flex-1">
                    {(["female", "male"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setVoiceGender(g)}
                        className="flex-1 py-1 text-center font-mono text-[9px] border transition-all duration-300"
                        style={{
                          borderColor: voiceGender === g ? "rgba(212,168,71,0.3)" : "rgba(255,255,255,0.06)",
                          background: voiceGender === g ? "rgba(212,168,71,0.08)" : "transparent",
                          color: voiceGender === g ? "#d4a847" : "rgba(237,233,246,0.25)",
                        }}
                      >
                        {g === "female" ? "♀ FEM" : "♂ MAL"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mode descriptions */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
              <div className="font-mono text-[9px] tracking-[0.15em] uppercase mb-2" style={{ color: "rgba(237,233,246,0.25)" }}>
                Active Mode
              </div>
              {MODES.map((mode) => (
                <div
                  key={mode.id}
                  className="mb-1 font-body text-[13px] leading-relaxed transition-opacity duration-300"
                  style={{
                    color: activeMode === mode.id ? mode.color : "rgba(237,233,246,0.15)",
                    opacity: activeMode === mode.id ? 1 : 0.5,
                  }}
                >
                  {activeMode === mode.id && "▸ "}{mode.label}
                  {activeMode === mode.id && (
                    <span style={{ color: "rgba(237,233,246,0.3)", marginLeft: 6, fontSize: 11 }}>
                      — {mode.desc}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Ask About */}
            <div className="mt-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
              <div className="font-mono text-[9px] tracking-[0.15em] uppercase mb-2" style={{ color: "rgba(237,233,246,0.25)" }}>
                Ask About
              </div>
              <div className="font-body text-[13px] leading-relaxed" style={{ color: "rgba(237,233,246,0.3)" }}>
                <div className="mb-1">✦ Any of the 150 Codex pages</div>
                <div className="mb-1">✦ Symbols &amp; alphabets</div>
                <div className="mb-1">✦ Page names &amp; meanings</div>
                <div className="mb-1">✦ Energetic meaning of words</div>
                <div>✦ Cross-references &amp; correspondences</div>
              </div>
            </div>
          </div>

          {/* ---- CENTER — Chat Area ---- */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat messages */}
            <div
              ref={chatRef}
              className="flex-1 p-5 overflow-y-auto"
              style={{ maxHeight: 420 }}
            >
              {/* Welcome state */}
              {!hasMessages && (
                <div className="text-center py-10 px-4">
                  <div
                    className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border"
                    style={{ borderColor: "rgba(217,70,239,0.15)" }}
                  >
                    <span style={{ color: "rgba(217,70,239,0.4)", fontSize: 18 }}>✦</span>
                  </div>
                  <div className="font-heading text-base tracking-[0.1em] mb-3" style={{ color: "rgba(237,233,246,0.5)" }}>
                    Begin with a question about the Codex
                  </div>
                  <p className="font-body text-sm leading-relaxed max-w-sm mx-auto" style={{ color: "rgba(237,233,246,0.2)" }}>
                    150 pages of xenolinguistic art, sacred geometry, and symbolic transmissions.
                    Ask about any page, decode a name, or explore the correspondence web.
                  </p>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="mb-4 px-3.5 py-2.5" style={{ borderLeft: "2px solid rgba(34,211,238,0.2)", background: "rgba(34,211,238,0.02)" }}>
                      <div className="font-mono text-[8px] tracking-[0.15em] mb-1" style={{ color: "rgba(34,211,238,0.35)" }}>
                        YOU
                      </div>
                      <div className="font-body text-[15px] leading-relaxed" style={{ color: "rgba(237,233,246,0.65)" }}>
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 px-4 py-3.5" style={{ borderLeft: "2px solid rgba(217,70,239,0.3)", background: "rgba(217,70,239,0.025)" }}>
                      <div className="font-mono text-[8px] tracking-[0.15em] mb-2" style={{ color: "rgba(217,70,239,0.4)" }}>
                        CODEX ORACLE · {getModeLabel(msg.mode || "oracle")} MODE
                      </div>
                      <div className="font-body text-base leading-[1.75]" style={{ color: "#ede9f6" }}>
                        {msg.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="mb-4 px-4 py-3.5" style={{ borderLeft: "2px solid rgba(217,70,239,0.3)", background: "rgba(217,70,239,0.025)" }}>
                  <div className="font-mono text-[8px] tracking-[0.15em] mb-2" style={{ color: "rgba(217,70,239,0.4)" }}>
                    CODEX ORACLE · RECEIVING TRANSMISSION...
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 animate-pulse" style={{ background: "#d946ef" }} />
                    <span className="w-1.5 h-1.5 animate-pulse" style={{ background: "#9333ea", animationDelay: "0.15s" }} />
                    <span className="w-1.5 h-1.5 animate-pulse" style={{ background: "#22d3ee", animationDelay: "0.3s" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompts */}
            {!hasMessages && (
              <div className="px-5 pb-2">
                <div className="flex gap-1.5 overflow-x-auto pb-2.5" style={{ scrollbarWidth: "none" }}>
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="flex-shrink-0 px-3 py-2 border font-body text-[13px] transition-all duration-300 whitespace-nowrap"
                      style={{
                        borderColor: "rgba(255,255,255,0.05)",
                        background: "rgba(17,15,26,0.4)",
                        color: "rgba(237,233,246,0.3)",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(212,168,71,0.2)";
                        e.currentTarget.style.color = "rgba(237,233,246,0.6)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.color = "rgba(237,233,246,0.3)";
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="flex gap-2 items-end px-5 pb-4">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the Codex Oracle..."
                className="flex-1 font-body text-base resize-none outline-none transition-all duration-300"
                style={{
                  background: "rgba(17,15,26,0.6)",
                  border: "1px solid rgba(217,70,239,0.1)",
                  padding: "11px 14px",
                  color: "#ede9f6",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(217,70,239,0.3)";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(217,70,239,0.06)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(217,70,239,0.1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !inputValue.trim()}
                className="relative overflow-hidden font-heading text-[10px] tracking-[0.2em] transition-all duration-300 disabled:opacity-30"
                style={{
                  padding: "11px 22px",
                  border: "1px solid rgba(212,168,71,0.3)",
                  background: "rgba(212,168,71,0.05)",
                  color: "#d4a847",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212,168,71,0.6)";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(212,168,71,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212,168,71,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                TRANSMIT
                {/* Gloss sweep */}
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(110deg, transparent 30%, rgba(212,168,71,0.08) 50%, transparent 70%)",
                    animation: "gloss 3s ease-in-out infinite",
                  }}
                />
              </button>
            </div>
            <div className="text-center pb-3 font-mono text-[8px] tracking-[0.12em]" style={{ color: "rgba(237,233,246,0.12)" }}>
              ENTER to send · SHIFT+ENTER for new line
            </div>
          </div>

          {/* ---- RIGHT SIDEBAR ---- */}
          <div
            className="hidden xl:flex flex-col p-5 flex-shrink-0"
            style={{ width: 200, borderLeft: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="font-mono text-[9px] tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(212,168,71,0.4)" }}>
              Codex Oracle Menu
            </div>

            {/* Menu items */}
            {MENU_ITEMS.map((item) => (
              <button
                key={item.q}
                onClick={() => sendMessage(item.q)}
                className="block w-full text-left mb-1.5 p-2.5 border font-body text-[13px] leading-relaxed transition-all duration-300"
                style={{
                  borderColor: "rgba(255,255,255,0.04)",
                  background: "rgba(17,15,26,0.3)",
                  color: "rgba(237,233,246,0.5)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = item.color + "33";
                  e.currentTarget.style.color = "rgba(237,233,246,0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "rgba(237,233,246,0.5)";
                }}
              >
                <span style={{ color: item.color, marginRight: 6 }}>♦</span>
                {item.q}
              </button>
            ))}

            {/* Constellation links */}
            <div className="mt-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
              <div className="font-mono text-[9px] tracking-[0.15em] uppercase mb-1.5" style={{ color: "rgba(237,233,246,0.2)" }}>
                Explore More
              </div>
              <a
                href="https://vaultofarcana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-body text-xs mb-1 transition-colors duration-300"
                style={{ color: "rgba(34,211,238,0.4)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(34,211,238,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(34,211,238,0.4)"; }}
              >
                Vault of Arcana ↗
              </a>
              <a
                href="https://codexoracle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-body text-xs mb-1 transition-colors duration-300"
                style={{ color: "rgba(212,168,71,0.4)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(212,168,71,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(212,168,71,0.4)"; }}
              >
                Codex Oracle ↗
              </a>
              <a
                href="https://vaultofarcana.com/correspondence-engine"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-body text-xs transition-colors duration-300"
                style={{ color: "rgba(147,51,234,0.4)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(147,51,234,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(147,51,234,0.4)"; }}
              >
                Correspondence Engine ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Gloss animation keyframe — injected once */}
      <style jsx global>{`
        @keyframes gloss {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
