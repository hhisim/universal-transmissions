"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader, ChevronDown, Mic, MicOff, Volume2, VolumeX, Globe } from "lucide-react";

const API_URL = "http://204.168.154.237:8002";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "tr", label: "TR" },
  { code: "ru", label: "RU" },
];

const ORACLE_MODES = [
  { id: "oracle", icon: "🔮", label: "Oracle" },
  { id: "decipher", icon: "⚛", label: "Decipher" },
  { id: "correspondence", icon: "🔗", label: "Correspond" },
  { id: "etymology", icon: "📜", label: "Etymology" },
  { id: "meditation", icon: "🧘", label: "Meditate" },
  { id: "scholar", icon: "📖", label: "Scholar" },
  { id: "seeker", icon: "🌱", label: "Seeker" },
  { id: "quote", icon: "✦", label: "Quote" },
  { id: "vision", icon: "👁", label: "Vision" },
];

const STARTER_QUESTIONS = [
  "What does NOMMO mean in the Dogon tradition?",
  "Trace the correspondence of the Merkaba",
  "Analyze the geometry of the Seed of Life",
  "What is the energetic signature of ŠURPU?",
  "Map all correspondences for the Sun",
];

interface Message {
  role: "user" | "oracle";
  text: string;
}

function parseMarkdown(text: string): string {
  let out = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  out = out.replace(/^### (.+)$/gm, '<h3 class="text-base font-display mt-4 mb-2" style="color:#c9a227">$1</h3>');
  out = out.replace(/^## (.+)$/gm, '<h2 class="text-lg font-display mt-6 mb-3" style="color:#c9a227">$1</h2>');
  out = out.replace(/^# (.+)$/gm, '<h1 class="text-xl font-display mt-6 mb-3" style="color:#c9a227">$1</h1>');
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong style="color:#d946ef">$1</strong>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#c9a227">$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em style="color:#a0a0b0">$1</em>');
  out = out.replace(/```([\s\S]*?)```/g, '<pre class="my-3 p-3 rounded text-xs overflow-x-auto" style="background:rgba(20,20,30,0.9);border:1px solid rgba(217,70,239,0.2);color:#a0a0b0">$1</pre>');
  out = out.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded text-xs" style="background:rgba(201,162,39,0.1);color:#c9a227">$1</code>');
  out = out.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc list-inside text-sm my-1" style="color:#a0a0b0">$1</li>');
  out = out.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal list-inside text-sm my-1" style="color:#a0a0b0">$2</li>');
  out = out.replace(/^---$/gm, '<hr class="my-4" style="border-color:rgba(217,70,239,0.2)" />');
  out = out.replace(/^> (.+)$/gm, '<blockquote class="border-l-2 pl-4 my-2 italic" style="border-color:rgba(201,162,39,0.4);color:rgba(160,160,176,0.7)">$1</blockquote>');
  out = out.split(/\n\n+/).map(p => {
    if (p.match(/^<(h[1-3]|p|pre|ul|ol|li|blockquote|hr)/)) return p;
    return `<p class="text-sm my-3 leading-relaxed" style="color:#a0a0b0">${p.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return out;
}

export default function OraclePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("oracle");
  const [language, setLanguage] = useState("en");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognizing = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      isRecognizing.current = false;
    };
    recognition.onerror = () => { isRecognizing.current = false; };
    recognition.onend = () => { isRecognizing.current = false; };
    recognitionRef.current = recognition;
  }, [language]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
    utterance.rate = 0.9;
    utterance.pitch = voiceGender === "female" ? 1.1 : 0.9;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled, voiceGender, language]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setInput("");
    setLoading(true);

    const userMsg: Message = { role: "user", text: userText };
    setMessages(prev => [...prev, userMsg]);

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
      setMessages(prev => [...prev, oracleMsg]);
      speak(oracleText);
    } catch (err) {
      const errMsg: Message = { role: "oracle", text: "The Oracle is currently unreachable. Please try again." };
      setMessages(prev => [...prev, errMsg]);
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

  const toggleVoice = () => {
    setVoiceEnabled(prev => {
      if (prev) window.speechSynthesis.cancel();
      return !prev;
    });
  };

  const toggleMic = () => {
    if (!recognitionRef.current || isRecognizing.current) return;
    isRecognizing.current = true;
    recognitionRef.current.start();
  };

  const activeModeData = ORACLE_MODES.find(m => m.id === mode);

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background: "linear-gradient(135deg, #0a090e 0%, #12101a 50%, #0d0a14 100%)",
        fontFamily: "var(--font-display, 'Cinzel', serif)",
      }}
    >
      {/* Scan-line overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-30 opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-3 border-b shrink-0 z-20"
        style={{
          borderColor: "rgba(217,70,239,0.2)",
          background: "rgba(10,9,14,0.97)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center border shrink-0"
            style={{ borderColor: "rgba(217,70,239,0.4)" }}
          >
            <span className="text-lg">📜</span>
          </div>
          <div>
            <h1 className="font-display text-base md:text-lg truncate" style={{ color: "#c9a227", letterSpacing: "0.05em" }}>
              Codex Oracle
            </h1>
            <p className="font-mono text-[8px] md:text-[9px] tracking-[0.2em] uppercase hidden sm:block" style={{ color: "rgba(217,70,239,0.5)" }}>
              Universal Transmissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="flex gap-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className="px-2 py-1 font-mono text-[10px] tracking-wider rounded transition-all"
                style={{
                  background: language === lang.code ? "rgba(217,70,239,0.15)" : "transparent",
                  color: language === lang.code ? "#d946ef" : "rgba(160,160,176,0.5)",
                  border: `1px solid ${language === lang.code ? "rgba(217,70,239,0.3)" : "rgba(217,70,239,0.1)"}`,
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Voice gender */}
          {voiceEnabled && (
            <button
              onClick={() => setVoiceGender(g => g === "female" ? "male" : "female")}
              className="p-2 text-sm transition-all"
              style={{ color: "rgba(160,160,176,0.6)" }}
              title={`Voice: ${voiceGender}`}
            >
              {voiceGender === "female" ? "♀" : "♂"}
            </button>
          )}

          {/* Voice toggle */}
          <button
            onClick={toggleVoice}
            className="p-2 rounded-full transition-all"
            style={{
              background: voiceEnabled ? "rgba(34,211,238,0.1)" : "transparent",
              color: voiceEnabled ? "#22d3ee" : "rgba(160,160,176,0.4)",
              border: `1px solid ${voiceEnabled ? "rgba(34,211,238,0.3)" : "rgba(217,70,239,0.1)"}`,
            }}
            title={voiceEnabled ? "Voice on" : "Voice off"}
          >
            {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto shrink-0"
        style={{ borderColor: "rgba(217,70,239,0.08)", background: "rgba(10,9,14,0.8)" }}
      >
        <div className="flex gap-1.5 whitespace-nowrap">
          {ORACLE_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[10px] tracking-wider transition-all"
              style={{
                background: mode === m.id ? "rgba(217,70,239,0.12)" : "transparent",
                color: mode === m.id ? "#d946ef" : "rgba(160,160,176,0.45)",
                border: `1px solid ${mode === m.id ? "rgba(217,70,239,0.35)" : "rgba(217,70,239,0.08)"}`,
              }}
            >
              <span>{m.icon}</span>
              <span className="hidden md:inline">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="text-center mb-8 mt-12">
              <div
                className="w-20 h-20 mx-auto mb-6 flex items-center justify-center border"
                style={{ borderColor: "rgba(217,70,239,0.3)", background: "rgba(20,20,30,0.5)" }}
              >
                <span className="text-4xl">🔮</span>
              </div>
              <h2 className="font-display text-2xl mb-3" style={{ color: "#c9a227", letterSpacing: "0.08em" }}>
                The Codex Oracle
              </h2>
              <p className="text-sm mb-8" style={{ color: "rgba(160,160,176,0.5)" }}>
                Ask a question. Receive perspective.
              </p>
              <div className="flex flex-col gap-2 max-w-sm mx-auto">
                {STARTER_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left px-4 py-3 text-sm border rounded transition-all hover:opacity-80"
                    style={{
                      borderColor: "rgba(217,70,239,0.2)",
                      color: "rgba(160,160,176,0.7)",
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
            <div key={i} className="mb-4">
              {msg.role === "user" ? (
                <div
                  className="px-4 py-3 rounded-r-lg"
                  style={{
                    background: "rgba(34,211,238,0.05)",
                    borderLeft: "2px solid rgba(34,211,238,0.3)",
                    color: "rgba(160,160,176,0.85)",
                  }}
                >
                  <p className="text-sm font-medium mb-1" style={{ color: "#22d3ee" }}>You</p>
                  <p className="text-sm">{msg.text}</p>
                </div>
              ) : (
                <div
                  className="px-4 py-3 rounded-r-lg"
                  style={{
                    background: "rgba(217,70,239,0.03)",
                    borderLeft: "2px solid rgba(217,70,239,0.3)",
                    color: "rgba(160,160,176,0.9)",
                  }}
                >
                  <p className="text-sm font-medium mb-2" style={{ color: "#d946ef" }}>
                    {activeModeData?.icon} {activeModeData?.label}
                  </p>
                  <div
                    className="text-sm leading-relaxed oracle-response"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                  />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 px-4 py-3" style={{ color: "rgba(160,160,176,0.5)" }}>
              <Loader size={16} className="animate-spin" />
              <span className="text-sm">The Oracle is consulting...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="px-4 py-3 md:px-6 md:py-4 border-t shrink-0"
        style={{ borderColor: "rgba(217,70,239,0.1)", background: "rgba(10,9,14,0.95)" }}
      >
        <div className="flex gap-2 md:gap-3 max-w-3xl mx-auto">
          {/* Mic button */}
          <button
            onClick={toggleMic}
            className="shrink-0 p-2.5 md:p-3 rounded-full transition-all"
            style={{
              border: "1px solid rgba(217,70,239,0.2)",
              color: "rgba(217,70,239,0.5)",
              background: "transparent",
            }}
            title="Voice input"
          >
            <Mic size={16} />
          </button>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Codex Oracle..."
            rows={1}
            className="flex-1 px-4 py-2.5 md:py-3 text-sm resize-none outline-none rounded"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(217,70,239,0.2)",
              color: "rgba(160,160,176,0.85)",
              fontFamily: "var(--font-body, serif)",
              maxHeight: "160px",
            }}
          />

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 px-4 md:px-5 py-2.5 md:py-3 flex items-center justify-center rounded transition-all"
            style={{
              border: "1px solid rgba(201,162,39,0.3)",
              background: input.trim() && !loading ? "rgba(201,162,39,0.1)" : "transparent",
              color: input.trim() && !loading ? "#c9a227" : "rgba(201,162,39,0.3)",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            }}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="flex items-center max-w-3xl mx-auto mt-2 font-mono text-[9px] tracking-widest" style={{ color: "rgba(217,70,239,0.2)" }}>
          ENTER to send · SHIFT+ENTER for new line · 🎤 voice input
        </p>
      </div>

      <style>{`
        .oracle-response h3 { font-family: var(--font-heading); font-size: 0.8rem; letter-spacing: 0.15em; text-transform: uppercase; color: #c9a227; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .oracle-response h2 { font-family: var(--font-display); font-size: 1.1rem; color: #c9a227; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .oracle-response pre { background: rgba(20,20,30,0.9); border: 1px solid rgba(217,70,239,0.15); border-radius: 4px; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
        .oracle-response code { background: rgba(201,162,39,0.08); color: #c9a227; padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.85em; }
        .oracle-response blockquote { border-left: 2px solid rgba(201,162,39,0.4); padding-left: 1rem; font-style: italic; color: rgba(160,160,176,0.7); margin: 1rem 0; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
