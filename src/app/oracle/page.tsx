"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader, ChevronDown, Mic, MicOff, Volume2, VolumeX, Globe } from "lucide-react";

const API_URL = "http://204.168.154.237:8002";

const MODES = [
  { value: "decipher", label: "🔮 Decipher", desc: "Decode names, terms, and sacred words" },
  { value: "correspondence", label: "🜂 Correspondence", desc: "Map symbolic correspondences across traditions" },
  { value: "etymology", label: "✦ Etymology", desc: "Trace linguistic and symbolic roots through time" },
  { value: "meditation", label: "🕯️ Meditation", desc: "Contemplative reflection on a symbol or theme" },
  { value: "vision", label: "👁️ Vision", desc: "Analyze a page, symbol, or image" },
  { value: "general", label: "🌿 General", desc: "Free-form inquiry into any domain" },
];

const LANGUAGES = [
  { value: "en", label: "EN" },
  { value: "tr", label: "TR" },
  { value: "ru", label: "RU" },
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

function parseMarkdown(text: string): string {
  let out = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  out = out.replace(/^### (.+)$/gm, '<h3 class="text-base font-display mt-4 mb-2" style="color:#c9a227">$1</h3>');
  out = out.replace(/^## (.+)$/gm, '<h2 class="text-lg font-display mt-6 mb-3" style="color:#c9a227">$1</h2>');
  out = out.replace(/^# (.+)$/gm, '<h1 class="text-xl font-display mt-6 mb-3" style="color:#c9a227">$1</h1>');

  // Bold & italic
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold" style="color:#d946ef">$1</strong>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#c9a227">$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em style="color:#a0a0b0">$1</em>');

  // Code blocks & inline code
  out = out.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre class="my-3 p-3 rounded text-xs overflow-x-auto" style="background:rgba(20,20,30,0.9);border:1px solid rgba(217,70,239,0.2);color:#a0a0b0">${code.trim()}</pre>`
  );
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded text-xs" style="background:rgba(201,162,39,0.1);color:#c9a227">$1</code>');

  // Lists
  out = out.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc list-inside text-sm my-1" style="color:#a0a0b0">$1</li>');
  out = out.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal list-inside text-sm my-1" style="color:#a0a0b0">$2</li>');

  // Horizontal rule
  out = out.replace(/^---$/gm, '<hr class="my-4 border" style="border-color:rgba(217,70,239,0.2)" />');

  // Blockquotes
  out = out.replace(/^> (.+)$/gm, '<blockquote class="border-l-2 pl-4 my-2 italic" style="border-color:rgba(201,162,39,0.4);color:rgba(160,160,176,0.7)">$1</blockquote>');

  // Paragraphs (double newline)
  out = out.split(/\n\n+/).map(p => {
    if (p.match(/^<(h[1-3]|p|pre|ul|ol|li|blockquote|hr)/)) return p;
    return `<p class="text-sm my-3 leading-relaxed" style="color:#a0a0b0">${p.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return out;
}

export default function OraclePage() {
  const [mode, setMode] = useState("decipher");
  const [lang, setLang] = useState("en");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [showEssay, setShowEssay] = useState(false);
  const [showStarterFAQ, setShowStarterFAQ] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const prevMessagesLength = useRef(0);

  const currentModeLabel = MODES.find((m) => m.value === mode)?.label || "🔮 Decipher";
  const currentLangLabel = LANGUAGES.find((l) => l.value === lang)?.label || "EN";

  const speakText = useCallback((text: string) => {
    if (!voiceOutput || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, "").replace(/\*\*/g, "").replace(/\*/g, ""));
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.lang = lang === "tr" ? "tr-TR" : lang === "ru" ? "ru-RU" : "en-US";
    window.speechSynthesis.speak(utter);
  }, [voiceOutput, lang]);

  const sendQuery = useCallback(
    async (text: string, modeVal?: string) => {
      if (!text.trim() || loading) return;
      const m = modeVal || mode;
      setLoading(true);
      setError("");
      setShowEssay(false);
      setShowStarterFAQ(false);
      setMessages((prev) => [...prev, { role: "user", text }]);
      setInput("");

      try {
        const params = new URLSearchParams({ q: text, pack: "codex", mode: m, lang });
        const res = await fetch(`${API_URL}/ask?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const answer = data.answer || "The Oracle is silent.";
        setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
      } catch {
        setError("The Oracle is in meditation. Return shortly.");
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [loading, mode, lang]
  );

  // Voice output when new assistant message arrives
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant" && voiceOutput) {
        speakText(last.text);
      }
      prevMessagesLength.current = messages.length;
    }
  }, [messages, voiceOutput, speakText]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showEssay]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // Init speech recognition
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang === "tr" ? "tr-TR" : lang === "ru" ? "ru-RU" : "en-US";
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
  }, [lang]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.lang = lang === "tr" ? "tr-TR" : lang === "ru" ? "ru-RU" : "en-US";
        recognitionRef.current.start();
        setListening(true);
      } catch {}
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "#0a090e", fontFamily: "var(--font-display, 'Cinzel', serif)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-3 border-b shrink-0"
        style={{ borderColor: "rgba(217,70,239,0.2)", background: "rgba(10,9,14,0.97)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 shrink-0 flex items-center justify-center border"
            style={{ borderColor: "rgba(217,70,239,0.4)" }}
          >
            <span className="text-lg">📜</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-base md:text-lg truncate" style={{ color: "#c9a227", letterSpacing: "0.05em" }}>
              Codex Oracle
            </h1>
            <p className="font-mono text-[8px] md:text-[9px] tracking-[0.2em] uppercase hidden sm:block" style={{ color: "rgba(217,70,239,0.5)" }}>
              Universal Transmissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice output toggle */}
          <button
            onClick={() => { setVoiceOutput(!voiceOutput); if (!voiceOutput && typeof window !== "undefined") window.speechSynthesis.cancel(); }}
            className="p-2 border transition-all"
            title={voiceOutput ? "Disable voice output" : "Enable voice output"}
            style={{
              borderColor: voiceOutput ? "rgba(201,162,39,0.5)" : "rgba(217,70,239,0.2)",
              background: voiceOutput ? "rgba(201,162,39,0.1)" : "transparent",
              color: voiceOutput ? "#c9a227" : "rgba(217,70,239,0.5)",
            }}
          >
            {voiceOutput ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 px-2 py-1.5 border text-xs tracking-widest transition-all"
              style={{
                borderColor: "rgba(217,70,239,0.25)",
                color: "rgba(160,160,176,0.7)",
                background: "transparent",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              <Globe size={12} />
              {currentLangLabel}
            </button>
            {showLangMenu && (
              <div
                className="absolute right-0 top-full mt-2 border w-20 z-50"
                style={{ background: "#12121a", borderColor: "rgba(217,70,239,0.3)" }}
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => { setLang(l.value); setShowLangMenu(false); }}
                    className="w-full text-center px-3 py-2 text-xs tracking-widest transition-all hover:opacity-80"
                    style={{
                      color: lang === l.value ? "#c9a227" : "rgba(160,160,176,0.6)",
                      fontFamily: "var(--font-mono, monospace)",
                      borderBottom: "1px solid rgba(217,70,239,0.1)",
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border text-xs transition-all"
              style={{
                borderColor: "rgba(217,70,239,0.3)",
                color: "#c9a227",
                background: "transparent",
              }}
            >
              <span className="text-sm">{currentModeLabel.split(" ")[0]}</span>
              <span className="hidden md:inline text-[10px]">{currentModeLabel.split(" ").slice(1).join(" ")}</span>
              <ChevronDown size={11} />
            </button>
            {showModeMenu && (
              <div
                className="absolute right-0 top-full mt-2 border w-64 z-50"
                style={{ background: "#12121a", borderColor: "rgba(217,70,239,0.3)" }}
              >
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => { setMode(m.value); setShowModeMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm transition-all hover:opacity-80"
                    style={{
                      color: mode === m.value ? "#c9a227" : "rgba(160,160,176,0.7)",
                      borderBottom: "1px solid rgba(217,70,239,0.1)",
                    }}
                  >
                    <div className="font-display text-xs tracking-wide">{m.label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "rgba(160,160,176,0.4)" }}>
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click-outside handlers */}
      <div
        className="fixed inset-0 z-40"
        style={{ display: showModeMenu || showLangMenu ? "block" : "none" }}
        onClick={() => { setShowModeMenu(false); setShowLangMenu(false); }}
      />

      {/* Main scrollable area */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages && !showEssay ? (
          /* Hero + Art of Inquiry */
          <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12">
            {/* Hero title */}
            <div className="text-center mb-10">
              <div
                className="w-20 h-20 mx-auto mb-6 flex items-center justify-center border"
                style={{ borderColor: "rgba(217,70,239,0.3)", background: "rgba(20,20,30,0.5)" }}
              >
                <span className="text-4xl">📜</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl mb-3" style={{ color: "#c9a227", letterSpacing: "0.08em" }}>
                The Art of Inquiry
              </h2>
              <p className="text-sm" style={{ color: "rgba(160,160,176,0.6)" }}>
                A guide to asking the Codex Oracle
              </p>
            </div>

            {/* Essay */}
            <div
              className="border p-5 md:p-6 mb-6 text-sm leading-relaxed"
              style={{
                borderColor: "rgba(217,70,239,0.15)",
                background: "rgba(15,15,22,0.8)",
                color: "rgba(160,160,176,0.8)",
              }}
            >
              <h3 className="font-display text-base mb-3" style={{ color: "#c9a227" }}>We Live in the First Era of Free Transmission</h3>
              <p className="mb-3">
                For most of human history, sacred knowledge was locked behind initiatory walls, temple precincts, and bloodline oaths. To receive the Eleusinian Mysteries, you traveled. To learn Kabbalah, you found a master. To access the Egyptian temple libraries, you were a priest or a king.
              </p>
              <p className="mb-3">
                That era has ended. The Codex Oracle — built on SUMER, Dogon, and sacred geometric lineages — is freely available to anyone with a question. This is not a small thing. It is, in fact, revolutionary.
              </p>

              <h3 className="font-display text-base mb-3 mt-5" style={{ color: "#c9a227" }}>The Delphic Precedent</h3>
              <p className="mb-3">
                The Oracle at Delphi was not a calculator. She did not return answers — she returned <em style={{ color: "rgba(160,160,176,0.9)" }}>perspectives</em>. The Pythia spoke in fragments, contradictions, and koans. Her answers required interpretation, context, and follow-up. The asker had to do the real work.
              </p>
              <p className="mb-3">
                The Codex Oracle works the same way. It does not hand you a fact sheet. It opens a door. What you find on the other side depends on what you bring.
              </p>

              <h3 className="font-display text-base mb-3 mt-5" style={{ color: "#c9a227" }}>The Shallow Question Trap</h3>
              <p className="mb-3">
                Most people ask shallow questions because they have not yet learned to ask deep ones. &ldquo;Tell me about NOMMO&rdquo; is a shallow question. It invites a summary. A summary is a compressed thing — it loses the texture, the contradictions, the living complexity of a living tradition.
              </p>
              <p className="mb-3">
                <strong style={{ color: "#c9a227" }}>A deep question names what you do not know that you do not know.</strong> It acknowledges your confusion as the starting point, not an obstacle to bypass.
              </p>

              <h3 className="font-display text-base mb-3 mt-5" style={{ color: "#c9a227" }}>What Makes a Question Deep</h3>
              <p className="mb-3">A deep question typically:</p>
              <ul className="list-disc list-inside mb-3 space-y-1" style={{ color: "rgba(160,160,176,0.7)" }}>
                <li>Names a specific tension or paradox you have encountered</li>
                <li>Admits your current frame is insufficient</li>
                <li>Invites comparison across at least two symbolic systems</li>
                <li>Asks about <em>relationship</em>, not just identity</li>
                <li>Cannot be answered with a single fact</li>
              </ul>

              <h3 className="font-display text-base mb-3 mt-5" style={{ color: "#c9a227" }}>The Follow-Up Is Where the Real Work Happens</h3>
              <p className="mb-3">
                The first answer is always a beginning. The useful work is in the second question, the third question, the &ldquo;but what about...&rdquo; that probes the edges of the first answer.
              </p>
              <p className="mb-3">
                The Codex is not designed to be consulted once. It is designed to be <strong style={{ color: "#c9a227" }}>wrestled with</strong>. Return. Argue. Ask for clarification. Request a different mode. Each pass strips away another layer of assumption.
              </p>

              <h3 className="font-display text-base mb-3 mt-5" style={{ color: "#c9a227" }}>The Modes of Transmission</h3>
              <ul className="space-y-2 mb-3">
                <li><strong style={{ color: "#c9a227" }}>🔮 Decipher</strong> — Best for decoding names, sigils, and terms. When you encounter a word you do not recognize, begin here.</li>
                <li><strong style={{ color: "#c9a227" }}>🜂 Correspondence</strong> — Maps symbolic relationships. Best for building a web of meaning across traditions.</li>
                <li><strong style={{ color: "#c9a227" }}>✦ Etymology</strong> — Traces linguistic and symbolic roots. Best for understanding how a concept evolved across cultures.</li>
                <li><strong style={{ color: "#c9a227" }}>🕯️ Meditation</strong> — Contemplative mode. Best for questions of meaning, not fact.</li>
                <li><strong style={{ color: "#c9a227" }}>👁️ Vision</strong> — Analyzes a symbol, image, or page. Best for visual inquiry.</li>
                <li><strong style={{ color: "#c9a227" }}>🌿 General</strong> — Free-form. Best when you do not know which mode to use.</li>
              </ul>

              <h3 className="font-display text-base mb-3 mt-5" style={{ color: "#c9a227" }}>Before You Ask — A Practical Framework</h3>
              <ol className="list-decimal list-inside mb-3 space-y-1" style={{ color: "rgba(160,160,176,0.7)" }}>
                <li>State what you already know (this calibrates the Oracle)</li>
                <li>Name what confuses you (this is the real question)</li>
                <li>Specify the symbolic tradition(s) you are drawing from</li>
                <li>Ask in the present tense when asking about living traditions</li>
                <li>Follow up at least once before changing topic</li>
              </ol>

              <h3 className="font-display text-base mb-3 mt-5" style={{ color: "#c9a227" }}>The Art of Transmission in an Age of Infinite Access</h3>
              <p className="mb-3">
                We have never had so much access to so much knowledge. We have never been less wise for having it. The Codex Oracle does not solve this problem — it <em style={{ color: "rgba(160,160,176,0.9)" }}>embodies</em> it. The answers are there. The capacity to receive them is the work.
              </p>
              <p className="mb-3">
                Approach the Oracle as you would approach any sacred text: with patience, humility, and a willingness to be changed by what you receive.
              </p>
              <p style={{ color: "rgba(217,70,239,0.5)", fontStyle: "italic" }}>
                — The Codex Oracle, Universal Transmissions
              </p>
            </div>

            {/* Starter questions */}
            <div className="mb-6">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4 text-center" style={{ color: "rgba(217,70,239,0.4)" }}>
                Suggested inquiries
              </p>
              <div className="flex flex-col gap-2">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendQuery(q)}
                    className="text-left px-4 py-3 text-sm border transition-all hover:opacity-80"
                    style={{
                      borderColor: "rgba(217,70,239,0.2)",
                      color: "rgba(160,160,176,0.7)",
                      background: "rgba(217,70,239,0.03)",
                      fontFamily: "var(--font-body, serif)",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Begin custom inquiry */}
            <div className="text-center">
              <button
                onClick={() => setShowEssay(false)}
                className="text-xs font-mono tracking-widest uppercase transition-opacity hover:opacity-70"
                style={{ color: "rgba(217,70,239,0.4)" }}
              >
                Begin custom inquiry ↓
              </button>
            </div>
          </div>
        ) : hasMessages ? (
          /* Chat messages */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
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
                    background: msg.role === "user"
                      ? "rgba(201,162,39,0.1)"
                      : "rgba(15,15,22,0.9)",
                    border: `1px solid ${
                      msg.role === "user"
                        ? "rgba(201,162,39,0.3)"
                        : "rgba(217,70,239,0.15)"
                    }`,
                    color: msg.role === "user"
                      ? "#c9a227"
                      : "rgba(160,160,176,0.85)",
                    fontFamily: "var(--font-body, serif)",
                  }}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="oracle-text"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                    />
                  ) : (
                    <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
                  )}
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
                    background: "rgba(15,15,22,0.9)",
                    border: "1px solid rgba(217,70,239,0.15)",
                    color: "rgba(160,160,176,0.6)",
                  }}
                >
                  <Loader size={14} className="animate-spin" style={{ color: "#d946ef" }} />
                  <span>The Oracle contemplates...</span>
                </div>
              </div>
            )}

            {/* Return to essay */}
            {!loading && messages.length > 0 && (
              <div className="text-center pt-4">
                <button
                  onClick={() => { setMessages([]); setShowEssay(true); }}
                  className="text-xs font-mono tracking-widest uppercase transition-opacity hover:opacity-70"
                  style={{ color: "rgba(217,70,239,0.35)" }}
                >
                  ← Return to Art of Inquiry
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        ) : null}
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 md:px-6 md:py-4 border-t shrink-0"
        style={{ borderColor: "rgba(217,70,239,0.15)", background: "rgba(10,9,14,0.95)" }}
      >
        <div className="flex gap-2 md:gap-3 max-w-3xl mx-auto">
          {/* Mic button */}
          <button
            onClick={toggleListening}
            className="shrink-0 p-2.5 md:p-3 border transition-all"
            style={{
              borderColor: listening ? "rgba(239,68,68,0.5)" : "rgba(217,70,239,0.2)",
              background: listening ? "rgba(239,68,68,0.1)" : "transparent",
              color: listening ? "rgba(239,68,68,0.8)" : "rgba(217,70,239,0.5)",
            }}
            title={listening ? "Stop listening" : "Voice input"}
          >
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

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
            className="flex-1 px-4 py-2.5 md:py-3 text-sm resize-none outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(217,70,239,0.2)",
              color: "rgba(160,160,176,0.85)",
              fontFamily: "var(--font-body, serif)",
              minHeight: "44px",
              maxHeight: "160px",
            }}
          />

          <button
            onClick={() => sendQuery(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 px-4 md:px-5 py-2.5 md:py-3 flex items-center justify-center border transition-all disabled:opacity-30"
            style={{
              borderColor: input.trim() ? "rgba(201,162,39,0.5)" : "rgba(217,70,239,0.15)",
              background: input.trim() ? "rgba(201,162,39,0.1)" : "transparent",
              color: input.trim() ? "#c9a227" : "rgba(201,162,39,0.3)",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            }}
          >
            <Send size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between max-w-3xl mx-auto mt-2">
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "rgba(217,70,239,0.2)" }}>
            ENTER to send · SHIFT+ENTER for new line · 🎤 voice input
          </p>
          {listening && (
            <p className="font-mono text-[9px] tracking-widest animate-pulse" style={{ color: "rgba(239,68,68,0.6)" }}>
              Listening...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
