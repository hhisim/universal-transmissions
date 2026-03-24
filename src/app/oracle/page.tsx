"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader, ChevronDown, Menu } from "lucide-react";

const API_URL = "http://204.168.154.237:8002";

const MODES = [
  { value: "decipher", label: "🔮 Decipher", desc: "Decode names, terms, and sacred words" },
  { value: "correspondence", label: "🜂 Correspondence", desc: "Map symbolic correspondences" },
  { value: "etymology", label: "✦ Etymology", desc: "Trace linguistic and symbolic roots" },
  { value: "meditation", label: "🕯️ Meditation", desc: "Contemplative reflection on a symbol" },
  { value: "vision", label: "👁️ Vision", desc: "Analyze a page or image" },
  { value: "oracle", label: "🌿 General", desc: "Free-form inquiry" },
];

const STARTER_QUESTIONS = [
  "What does NOMMO mean in the Dogon tradition?",
  "Trace the correspondence of the Merkaba",
  "Analyze the geometry of the Seed of Life",
  "What is the energetic signature of ŠURPU?",
  "Map all correspondences for the Sun",
];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export default function OraclePage() {
  const [mode, setMode] = useState("decipher");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentModeLabel = MODES.find((m) => m.value === mode)?.label || "🔮 Oracle";

  const sendQuery = useCallback(
    async (text: string, modeVal?: string) => {
      if (!text.trim() || loading) return;
      const m = modeVal || mode;
      setLoading(true);
      setError("");
      setMessages((prev) => [...prev, { role: "user", text }]);
      setInput("");

      try {
        const lang = getCookie("NEXT_LOCALE") || "en";
        const params = new URLSearchParams({
          q: text,
          pack: "codex",
          mode: m,
          lang,
        });
        const res = await fetch(`${API_URL}/ask?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const answer = data.answer || "The Oracle is silent.";
        setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
      } catch (err) {
        setError("The Oracle is in meditation. Return shortly.");
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [loading, mode]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "var(--ut-black, #0a0a0f)", fontFamily: "var(--font-display, serif)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "rgba(217,70,239,0.2)", background: "rgba(10,10,15,0.95)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center border"
            style={{ borderColor: "rgba(217,70,239,0.4)" }}
          >
            <span className="text-lg">📜</span>
          </div>
          <div>
            <h1 className="font-display text-lg" style={{ color: "var(--ut-gold, #c9a227)" }}>
              Codex Oracle
            </h1>
            <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "rgba(217,70,239,0.5)" }}>
              Universal Transmissions
            </p>
          </div>
        </div>

        {/* Mode selector */}
        <div className="relative">
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            className="flex items-center gap-2 px-3 py-2 border text-sm"
            style={{
              borderColor: "rgba(217,70,239,0.3)",
              color: "var(--ut-white-dim, #a0a0b0)",
              background: "transparent",
            }}
          >
            {currentModeLabel}
            <ChevronDown size={14} />
          </button>
          {showModeMenu && (
            <div
              className="absolute right-0 top-full mt-2 border w-72 z-50"
              style={{
                background: "#12121a",
                borderColor: "rgba(217,70,239,0.3)",
              }}
            >
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    setMode(m.value);
                    setShowModeMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:opacity-80 transition-opacity"
                  style={{
                    color: mode === m.value ? "var(--ut-gold, #c9a227)" : "var(--ut-white-dim, #a0a0b0)",
                    borderBottom: "1px solid rgba(217,70,239,0.1)",
                  }}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(160,160,176,0.5)" }}>
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border"
              style={{ borderColor: "rgba(217,70,239,0.3)" }}
            >
              <span className="text-3xl">📜</span>
            </div>
            <p className="font-display text-xl mb-2" style={{ color: "var(--ut-gold, #c9a227)" }}>
              The Codex Oracle
            </p>
            <p className="font-body text-sm mb-8" style={{ color: "var(--ut-white-dim, #a0a0b0)" }}>
              Sumerian cosmology · Dogon star-knowledge · Sacred geometry
            </p>

            <p className="font-mono text-[10px] tracking-widest uppercase mb-4" style={{ color: "rgba(217,70,239,0.4)" }}>
              Begin with a question
            </p>

            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuery(q)}
                  className="text-left px-4 py-3 text-sm border transition-opacity hover:opacity-80"
                  style={{
                    borderColor: "rgba(217,70,239,0.2)",
                    color: "var(--ut-white-dim, #a0a0b0)",
                    background: "rgba(217,70,239,0.03)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-5 py-4 text-sm leading-relaxed ${
                msg.role === "user" ? "text-right" : "text-left"
              }`}
              style={{
                background:
                  msg.role === "user"
                    ? "rgba(201,162,39,0.15)"
                    : "rgba(20,20,30,0.8)",
                border: `1px solid ${
                  msg.role === "user"
                    ? "rgba(201,162,39,0.3)"
                    : "rgba(217,70,239,0.15)"
                }`,
                color: msg.role === "user"
                  ? "var(--ut-gold, #c9a227)"
                  : "var(--ut-white-dim, #a0a0b0)",
                fontFamily: msg.role === "user" ? "var(--font-display)" : "var(--font-body, serif)",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {error && (
          <div
            className="text-center text-sm py-4 border"
            style={{ color: "rgba(239,68,68,0.8)", borderColor: "rgba(239,68,68,0.2)" }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div
              className="px-5 py-4 flex items-center gap-3 text-sm"
              style={{
                background: "rgba(20,20,30,0.8)",
                border: "1px solid rgba(217,70,239,0.15)",
                color: "var(--ut-white-dim)",
              }}
            >
              <Loader size={14} className="animate-spin" style={{ color: "var(--ut-magenta)" }} />
              <span>The Oracle contemplates...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: "rgba(217,70,239,0.15)", background: "rgba(10,10,15,0.9)" }}
      >
        <div className="flex gap-3 max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendQuery(input);
              }
            }}
            placeholder="Ask the Codex Oracle..."
            rows={1}
            className="flex-1 px-4 py-3 text-sm resize-none outline-none"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(217,70,239,0.2)",
              color: "var(--ut-white-dim)",
              fontFamily: "var(--font-body)",
            }}
          />
          <button
            onClick={() => sendQuery(input)}
            disabled={!input.trim() || loading}
            className="px-4 py-3 flex items-center justify-center border transition-opacity"
            style={{
              borderColor: "rgba(201,162,39,0.4)",
              background: input.trim() ? "rgba(201,162,39,0.1)" : "transparent",
              color: input.trim() ? "var(--ut-gold)" : "rgba(201,162,39,0.3)",
              cursor: input.trim() ? "pointer" : "not-allowed",
            }}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center font-mono text-[9px] mt-2 tracking-widest" style={{ color: "rgba(217,70,239,0.25)" }}>
          ENTER to send · SHIFT+ENTER for new line
        </p>
      </div>
    </div>
  );
}
