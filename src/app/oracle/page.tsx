"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import { motion } from "framer-motion";
import ZalgoText from "@/components/ui/ZalgoText";

const CosmicBackground = dynamic(() => import("@/components/oracle/CosmicBackground"), { ssr: false });

/* ═══════════════════════════════════════════════════════════
   i18n — compact (same as v3, abbreviated for space)
   ═══════════════════════════════════════════════════════════ */
const T: Record<string, Record<string, string>> = {
  en: {
    subtitle: "[ Universal Transmissions · Codex Oracle ]", heading: "Consult Oracle",
    desc: "150 pages of xenolinguistic art, transcendent geometry, and hyperdimensional transmissions — decoded through five data layers, a pan-dimensional linguistic mystic, and a 577-entry correspondence codex. The dataset constantly evolving every day, the algorithm reinventing itself through a recursive novelty engine.",
    begin: "Begin with a question about the Codex", transmit: "TRANSMIT", placeholder: "Ask the Codex Oracle...",
    receiving: "RECEIVING TRANSMISSION", deepProc: "DEEP PROCESSING",
    engine: "Engine", fast: "FAST", deep: "DEEP", language: "Language", voice: "Voice", female: "FEMALE", male: "MALE",
    clear: "CLEAR", goDeeper: "Go Deeper",
    goDesc: "The Codex Oracle is one gateway. Vault of Arcana holds six living traditions — Tao, Tarot, Tantra, Entheogens, Dreamwalker, and the Codex — with more awakening.",
    enterVault: "Enter the Vault", getBook: "Get the Book",
    guestLimit: "Guest · {n}/10 today", freeLimit: "Free · {n}/25 today", initiateActive: "Initiate · Unlimited",
    upgrade: "UPGRADE", enterHint: "ENTER to send · SHIFT+ENTER for new line",
    you: "YOU", oracleLabel: "CODEX ORACLE",
    decodeName: "Energetic signature of your name", decodeBtn: "DECODE", decodeHint: "Type any name to reveal its letter-by-letter energetic decode",
    corrLink: "View in Correspondence Codex →",
  },
  tr: {
    subtitle: "[ Evrensel İletimler · Kodeks Kehaneti ]", heading: "Kehânete Danış",
    desc: "150 sayfa ksenolinguistik sanat, aşkın geometri ve hiperboyutsal iletimler — beş veri katmanı, pan-boyutsal bir dilbilim mistik ve 577 girişli bir korespondens kodeksi aracılığıyla deşifre edildi.",
    begin: "Kodeks hakkında bir soru ile başlayın", transmit: "İLET", placeholder: "Kodeks Kehanetine sor...",
    receiving: "İLETİM ALINIYOR", deepProc: "DERİN İŞLEM",
    engine: "Motor", fast: "HIZLI", deep: "DERİN", language: "Dil", voice: "Ses", female: "KADIN", male: "ERKEK",
    clear: "TEMİZLE", goDeeper: "Daha Derine",
    goDesc: "Kodeks Kehaneti tek bir kapıdır. Vault of Arcana altı canlı geleneği barındırır.",
    enterVault: "Kasaya Gir", getBook: "Kitabı Al",
    guestLimit: "Misafir · {n}/10 bugün", freeLimit: "Ücretsiz · {n}/25 bugün", initiateActive: "Mürit · Sınırsız",
    upgrade: "YÜKSELT", enterHint: "ENTER gönder · SHIFT+ENTER yeni satır",
    you: "SEN", oracleLabel: "KODEKS KEHANETİ",
    decodeName: "İsminin enerji imzası", decodeBtn: "ÇÖZ", decodeHint: "Harf harf enerji çözümlemesi için bir isim girin",
    corrLink: "Korrespondans Kodeksinde görüntüle →",
  },
  ru: {
    subtitle: "[ Универсальные Трансляции · Оракул Кодекса ]", heading: "Обратиться к Оракулу",
    desc: "150 страниц ксенолингвистического искусства, трансцендентной геометрии и гипердименсиональных передач.",
    begin: "Начните с вопроса о Кодексе", transmit: "ПЕРЕДАТЬ", placeholder: "Спросите Оракула Кодекса...",
    receiving: "ПРИЁМ ПЕРЕДАЧИ", deepProc: "ГЛУБОКАЯ ОБРАБОТКА",
    engine: "Движок", fast: "БЫСТРО", deep: "ГЛУБОКО", language: "Язык", voice: "Голос", female: "ЖЕНСКИЙ", male: "МУЖСКОЙ",
    clear: "ОЧИСТИТЬ", goDeeper: "Глубже",
    goDesc: "Оракул Кодекса — лишь одни врата.",
    enterVault: "Войти", getBook: "Книгу",
    guestLimit: "Гость · {n}/10", freeLimit: "Бесплатно · {n}/25", initiateActive: "Посвящённый · ∞",
    upgrade: "УЛУЧШИТЬ", enterHint: "ENTER отправить · SHIFT+ENTER строка",
    you: "ВЫ", oracleLabel: "ОРАКУЛ КОДЕКСА",
    decodeName: "Энергетическая подпись имени", decodeBtn: "РАСШИФРОВАТЬ", decodeHint: "Введите имя для побуквенной расшифровки",
    corrLink: "Открыть в Кодексе Соответствий →",
  },
};

/* ═══════════════════════════════════════════════════════════
   MODES
   ═══════════════════════════════════════════════════════════ */
const MODES = [
  { id: "oracle",         label: { en: "ORACLE", tr: "KEHANET", ru: "ОРАКУЛ" },            icon: "✦", c: "#d946ef" },
  { id: "decipher",       label: { en: "DECIPHER", tr: "DEŞİFRE", ru: "ДЕШИФР" },           icon: "🜂", c: "#22d3ee" },
  { id: "tarot_arcana",   label: { en: "TAROT ARCANA", tr: "TAROT ARCANA", ru: "ТАРО" },    icon: "🂠", c: "#c026d3" },
  { id: "ginabul",        label: { en: "GINA'ABUL", tr: "GINA'ABUL", ru: "ГИНА'АБУЛЬ" },    icon: "𒀭", c: "#d4a847" },
  { id: "etymology",      label: { en: "LINGUISTICS", tr: "DİLBİLİM", ru: "ЛИНГВИСТ" },     icon: "🔤", c: "#f0c75e" },
  { id: "correspondence", label: { en: "CORRESPOND", tr: "KORESPOND", ru: "СООТВЕТСТВИЯ" },  icon: "🔗", c: "#9333ea" },
  { id: "meditation",     label: { en: "MEDITATE", tr: "MEDİTASYON", ru: "МЕДИТАЦИЯ" },      icon: "◎", c: "#22c55e" },
  { id: "seeker",         label: { en: "SEEKER", tr: "ARAYAN", ru: "ИСКАТЕЛЬ" },             icon: "✧", c: "#f59e0b" },
  { id: "quote",          label: { en: "TRANSMISSION", tr: "İLETİM", ru: "ПЕРЕДАЧА" },       icon: "⚡", c: "#ec4899" },
];

/* ═══════════════════════════════════════════════════════════
   COMPREHENSIVE ROTATING QUESTION POOLS
   Shows 3 random questions per mode on each load
   ═══════════════════════════════════════════════════════════ */
const Q_POOL: Record<string, string[]> = {
  oracle: [
    "What is page 38 about?", "What is the Codex teaching about consciousness?",
    "How does the Codex encode frequency?", "What symbols repeat across all 150 pages?",
    "What is the relationship between geometry and awareness in the Codex?",
    "What does the Codex say about the Flower of Life?", "What is page 55 about?",
    "How does water function as a symbol in the Codex?", "What is the role of sound in creation according to the Codex?",
    "What does the Codex reveal about DNA and sacred geometry?", "What is page 12 about?",
    "How do the border glyphs activate each page?", "What is page 42 about?",
    "What is the central teaching of pages 30-40?", "How does the Codex connect Egypt to Sumer?",
  ],
  decipher: [
    "Decipher page 6 — the Tesseract", "Decipher page 24 — the Cosmic Egg",
    "What is page 70 about?", "Decipher page 9 — the Light-Body Core",
    "Decipher page 12", "Decipher page 38", "Decipher page 55",
    "What is page 42 about?", "Decipher page 33", "Decipher page 15",
    "What is page 60 about?", "Decipher page 45", "Decipher page 3",
  ],
  tarot_arcana: [
    "Tarot archetype for page 6", "Which Major Arcana matches page 38?",
    "Tarot reading for page 24", "The Fool's connection to the Codex",
    "Which Arcana matches page 70?", "Tarot reading for the Tesseract page",
    "How does The Tower relate to any Codex page?", "Which page embodies The High Priestess?",
    "Death card connection to the Codex", "The Star archetype in the Codex",
  ],
  ginabul: [
    "Decode ZU.AN.NA", "What does UB-ŠÀ-TÉŠ mean?",
    "Decode NU.MU.NA-DIŠTU", "What does ZI.ŠAG.KA mean?",
    "Decode ŠÁR-TU GIBIL", "What does MU.NA.DIŠTU encode?",
    "Decode the name of page 12", "What does DI.KU.MAH mean?",
  ],
  etymology: [
    "Decode NOMMO letter by letter", "Energetic signature of MERKABA",
    "What does ANUNNAKI encode?", "Decode SOPHIA letter by letter",
    "Energetic signature of THOTH", "Decode OSIRIS",
    "What is the letter-by-letter meaning of KUNDALINI?", "Decode HERMES",
    "Energetic signature of ENKI", "Decode INANNA letter by letter",
    "What does the word CODEX encode energetically?", "Decode FIBONACCI",
  ],
  correspondence: [
    "Merkaba correspondences", "Crystals connected to page 24",
    "Flower of Life correspondence web", "Planetary rulers across the Codex",
    "What corresponds to the Tesseract?", "Nommo correspondence network",
    "What crystals, plants and deities connect to page 38?",
    "Tree of Life correspondences in the Codex", "Star of David correspondence web",
  ],
  meditation: [
    "Meditation for page 6", "Breathwork for the Cosmic Egg",
    "Grounding practice for page 9", "Contemplation for the Nommo page",
    "Chakra activation for page 38", "Visualization for the Tesseract",
    "Kundalini practice connected to the Codex", "Merkaba meditation",
    "Breathwork for page 24", "Sound meditation for page 55",
  ],
  seeker: [
    "I just got the book. Where to start?", "What is the Universal Transmissions Codex?",
    "What are the border glyphs?", "How do the 150 pages connect?",
    "What traditions does the Codex draw from?", "Is this book about sacred geometry?",
    "What is the Gina'abul language?", "Who are the Nommo?",
    "What does the Codex say about consciousness?", "How should I read this book?",
  ],
  quote: [
    "A transmission about consciousness", "A fragment about geometry",
    "A whisper from the Nommo", "An essence from the Cosmic Egg",
    "A transmission about the Tesseract", "A whisper about frequency",
    "A fragment about the spiral", "An essence of the Merkaba",
    "A transmission about water and stars", "A whisper from the deep archive",
  ],
};

const FOLLOWUPS: Record<string, Record<string, string[]>> = {
  oracle: { en: ["Go deeper", "Shadow aspect?", "Connected pages?"], tr: ["Daha derine", "Gölge yönü?", "Bağlı sayfalar?"], ru: ["Глубже", "Тень?", "Связи?"] },
  decipher: { en: ["Etymology of the name", "Meditation for this page", "Tarot connection"], tr: ["İsmin etimolojisi", "Meditasyon", "Tarot"], ru: ["Этимология", "Медитация", "Таро"] },
  tarot_arcana: { en: ["Decipher this page", "Correspondence web", "Meditation"], tr: ["Deşifre et", "Korrespondans", "Meditasyon"], ru: ["Дешифровка", "Соответствия", "Медитация"] },
  ginabul: { en: ["Decipher this page", "Letter-by-letter decode", "Connected names"], tr: ["Deşifre et", "Harf harf çöz", "Bağlı isimler"], ru: ["Дешифровка", "По буквам", "Имена"] },
  etymology: { en: ["Gina'abul decode", "Correspondence web", "Decipher the page"], tr: ["Gina'abul çöz", "Korrespondans", "Deşifre et"], ru: ["Гина'абул", "Соответствия", "Дешифровка"] },
  correspondence: { en: ["Decipher this", "Meditate on this", "Tarot archetype"], tr: ["Deşifre et", "Medite et", "Tarot"], ru: ["Дешифровка", "Медитация", "Таро"] },
  meditation: { en: ["Decipher the page", "Go deeper", "Connected practice"], tr: ["Deşifre et", "Daha derine", "Pratik"], ru: ["Дешифровка", "Глубже", "Практика"] },
  seeker: { en: ["Tell me more", "Which page?", "How does this connect?"], tr: ["Daha anlat", "Hangi sayfa?", "Nasıl bağlanır?"], ru: ["Расскажи", "Страница?", "Как?"] },
  quote: { en: ["Another transmission", "Decipher this", "Go deeper"], tr: ["Başka iletim", "Deşifre et", "Derine"], ru: ["Ещё", "Дешифруй", "Глубже"] },
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/* ═══════════════════════════════════════════════════════════
   AUDIO PLAYER — Google TTS via backend
   ═══════════════════════════════════════════════════════════ */
function AudioPlayer({ src, color }: { src: string; color: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onT = () => setProgress(a.currentTime);
    const onL = () => setDuration(a.duration);
    const onE = () => setPlaying(false);
    a.addEventListener("timeupdate", onT); a.addEventListener("loadedmetadata", onL); a.addEventListener("ended", onE);
    return () => { a.removeEventListener("timeupdate", onT); a.removeEventListener("loadedmetadata", onL); a.removeEventListener("ended", onE); };
  }, [src]);

  useEffect(() => { const a = audioRef.current; if (a && src) { a.load(); a.play().then(() => setPlaying(true)).catch(() => {}); } }, [src]);

  const toggle = () => { const a = audioRef.current; if (!a) return; if (playing) { a.pause(); setPlaying(false); } else { a.play().then(() => setPlaying(true)).catch(() => {}); } };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => { const a = audioRef.current; if (!a || !duration) return; const r = e.currentTarget.getBoundingClientRect(); a.currentTime = ((e.clientX - r.left) / r.width) * duration; };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  if (!src) return null;
  return (
    <div className="flex items-center gap-3 mt-3">
      <audio ref={audioRef} src={src} preload="auto" />
      <button onClick={toggle} style={{ color, fontSize: 16, cursor: "pointer", background: "none", border: "none", width: 28 }}>{playing ? "⏸" : "▶"}</button>
      <div onClick={seek} style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, cursor: "pointer" }}>
        <div style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.1s" }} />
      </div>
      <span className="font-mono text-[8px]" style={{ color: "var(--ut-white-faint)", minWidth: 40 }}>{fmt(progress)}/{fmt(duration)}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHAT BUBBLE
   ═══════════════════════════════════════════════════════════ */
interface Msg { role: "user" | "oracle"; text: string; mode?: string; audioUrl?: string }

function ChatBubble({ msg, modeColor, lang }: { msg: Msg; modeColor: string; lang: string }) {
  const isOracle = msg.role === "oracle";
  const t = T[lang] || T.en;
  const ml = (MODES.find(m => m.id === msg.mode)?.label as Record<string, string>)?.[lang] || "ORACLE";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ marginBottom: 20, padding: "16px 20px", borderLeft: `2px solid ${isOracle ? modeColor + "44" : "rgba(34,211,238,0.15)"}`, background: isOracle ? modeColor + "05" : "rgba(34,211,238,0.02)" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: isOracle ? modeColor + "88" : "rgba(34,211,238,0.35)", marginBottom: 10 }}>
        {isOracle ? `${t.oracleLabel} · ${ml}` : t.you}
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, lineHeight: 1.8, color: isOracle ? "var(--ut-white)" : "var(--ut-white-dim)" }}>
        {isOracle ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown> : msg.text}
      </div>
      {isOracle && msg.audioUrl && <AudioPlayer src={msg.audioUrl} color={modeColor} />}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function OraclePage() {
  const [mode, setMode] = useState("oracle");
  const [lang, setLang] = useState("en");
  const [speed, setSpeed] = useState<"fast" | "deep">("fast");
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceGender, setVoiceGender] = useState<"f" | "m">("f");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [tier] = useState<"guest" | "free" | "initiate">("guest");
  const chatRef = useRef<HTMLDivElement>(null);

  const t = T[lang] || T.en;
  const currentMode = MODES.find(m => m.id === mode) || MODES[0];
  const followups = (FOLLOWUPS[mode] || FOLLOWUPS.oracle)[lang] || (FOLLOWUPS[mode] || FOLLOWUPS.oracle).en;
  const hasMessages = msgs.length > 0;
  const limit = tier === "initiate" ? Infinity : tier === "free" ? 25 : 10;
  const atLimit = questionsUsed >= limit;

  // Rotating questions — pick 3 random on mode change
  const starters = useMemo(() => pickRandom(Q_POOL[mode] || Q_POOL.oracle, 3), [mode]);

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  const fetchTTS = useCallback(async (text: string): Promise<string> => {
    if (!voiceOn) return "";
    try {
      const res = await fetch("/api/oracle/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang, voice: voiceGender === "m" ? "standard" : "hd" }) });
      if (!res.ok) return "";
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch { return ""; }
  }, [voiceOn, lang, voiceGender]);

  const send = useCallback(async (text?: string, forceMode?: string) => {
    const m = (text || input).trim();
    if (!m || loading || atLimit) return;
    setInput("");
    const useMode = forceMode || mode;
    setMsgs(p => [...p, { role: "user", text: m }]);
    setLoading(true);
    try {
      const res = await fetch("/api/oracle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: m, mode: useMode, lang, speed }) });
      const data = await res.json();
      const answer = data.response || data.answer || "";
      const audioUrl = answer ? await fetchTTS(answer) : "";
      setMsgs(p => [...p, { role: "oracle", text: answer || "This transmission has not yet entered the archive.", mode: useMode, audioUrl }]);
      setQuestionsUsed(q => q + 1);
    } catch {
      setMsgs(p => [...p, { role: "oracle", text: "The transmission was interrupted.", mode: useMode }]);
    } finally { setLoading(false); }
  }, [input, mode, lang, speed, loading, atLimit, fetchTTS]);

  // Name decode — forces etymology mode and explicit letter-by-letter instruction
  const decodeName = () => {
    if (!nameInput.trim()) return;
    const name = nameInput.trim().toUpperCase();
    setMode("etymology");
    send(
      `Decode the name ${name} letter by letter using the alphabet ontology. Show the full table with Element, Shape, Chakra, Tarot, Rune, Alchemical, Hebrew, Deity for each letter. Then give the unified meaning and poetic definition.`,
      "etymology"
    );
    setNameInput("");
  };

  const kd = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      <Navigation />
      <CosmicBackground />
      <main style={{ background: "transparent", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="container-ut text-center pt-32 pb-8">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "rgba(212,168,71,0.5)" }}>{t.subtitle}</p>
          <h1 className="font-display text-4xl md:text-6xl mb-4" style={{ color: "var(--ut-white)" }}>
            <ZalgoText text={t.heading} intensity="moderate" />
          </h1>
          <p className="font-body text-base max-w-2xl mx-auto" style={{ color: "var(--ut-white-dim)", lineHeight: 1.7 }}>{t.desc}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.15 }}>

        {/* Modes */}
        <div className="container-ut pb-4">
          <div className="flex flex-wrap justify-center gap-2">
            {MODES.map(mo => (
              <button key={mo.id} onClick={() => setMode(mo.id)}
                className="font-heading text-[9px] md:text-[10px] tracking-[0.16em] uppercase px-3 md:px-4 py-2 border transition-all duration-300"
                style={{ borderColor: mode === mo.id ? mo.c + "66" : "rgba(255,255,255,0.06)", color: mode === mo.id ? mo.c : "var(--ut-white-faint)", background: mode === mo.id ? mo.c + "0a" : "transparent" }}>
                <span style={{ marginRight: 5, fontSize: 11 }}>{mo.icon}</span>
                {(mo.label as Record<string, string>)[lang] || (mo.label as Record<string, string>).en}
              </button>
            ))}
          </div>
        </div>

        {/* Name Decoder (Linguistics mode) */}
        {mode === "etymology" && (
          <div className="container-ut pb-4">
            <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
              <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") decodeName(); }}
                placeholder={t.decodeName}
                className="flex-1 bg-[rgba(17,15,26,0.5)] border px-4 py-2.5 font-body text-base text-[var(--ut-white)] outline-none transition-all focus:border-[rgba(240,199,94,0.3)]"
                style={{ borderColor: "rgba(240,199,94,0.15)" }} />
              <button onClick={decodeName} disabled={!nameInput.trim()}
                className="font-heading text-[9px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-all"
                style={{ borderColor: "rgba(240,199,94,0.4)", color: "#f0c75e", background: "rgba(240,199,94,0.06)", opacity: nameInput.trim() ? 1 : 0.3 }}>
                {t.decodeBtn}
              </button>
            </div>
            <p className="text-center mt-2 font-mono text-[8px] tracking-wider" style={{ color: "rgba(240,199,94,0.3)" }}>{t.decodeHint}</p>
          </div>
        )}

        {/* Main: starters | chat | follow-ups */}
        <div className="container-ut pb-8">
          <div className="flex gap-4 items-start">

            {/* LEFT: Starters (rotating) */}
            <div className="hidden lg:flex flex-col gap-2 w-56 flex-shrink-0 pt-4">
              {starters.map((q, i) => (
                <button key={q} onClick={() => send(q)} disabled={atLimit}
                  className="text-left font-body text-[13px] leading-snug px-3 py-2.5 border transition-all hover:border-[rgba(217,70,239,0.3)]"
                  style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)", background: "rgba(10,9,14,0.4)" }}>
                  {q}
                </button>
              ))}
            </div>

            {/* CENTER: Chat — semi-transparent to show cosmic BG */}
            <div className="flex-1 overflow-hidden" style={{
              border: `1px solid ${currentMode.c}10`,
              background: "rgba(10, 9, 14, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}>
              <div ref={chatRef} className="oracle-scroll" style={{ minHeight: 420, maxHeight: 580, overflowY: "auto", padding: "24px 24px 16px" }}>
                {!hasMessages && (
                  <div className="text-center py-16">
                    <div style={{ width: 52, height: 52, margin: "0 auto 16px", border: `1px solid ${currentMode.c}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      <span style={{ color: currentMode.c + "66" }}>{currentMode.icon}</span>
                    </div>
                    <p className="font-heading text-sm tracking-wider mb-5" style={{ color: "var(--ut-white-dim)" }}>{t.begin}</p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto lg:hidden">
                      {starters.map(q => (
                        <button key={q} onClick={() => send(q)}
                          className="font-body text-sm px-4 py-2 border hover:border-[rgba(217,70,239,0.3)]"
                          style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)" }}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {msgs.map((m, i) => <ChatBubble key={i} msg={m} modeColor={MODES.find(x => x.id === (m.mode || mode))?.c || currentMode.c} lang={lang} />)}
                {loading && (
                  <div style={{ padding: "16px 20px", marginBottom: 16, borderLeft: `2px solid ${currentMode.c}33`, background: currentMode.c + "04" }}>
                    <div className="font-mono text-[9px] tracking-[0.2em] mb-3" style={{ color: currentMode.c + "55" }}>
                      {t.oracleLabel} · {speed === "deep" ? t.deepProc : t.receiving}...
                    </div>
                    <div className="flex gap-2">
                      {[0, 0.15, 0.3].map((d, i) => <span key={i} style={{ width: 6, height: 6, background: currentMode.c, borderRadius: "50%", animation: "oP 1.5s ease-in-out infinite", animationDelay: `${d}s`, display: "block", opacity: 0.6 }} />)}
                    </div>
                  </div>
                )}
                {/* Mobile follow-ups + corr link */}
                {hasMessages && !loading && msgs[msgs.length - 1]?.role === "oracle" && (
                  <div className="lg:hidden flex flex-wrap gap-2 mt-2 mb-2">
                    {followups.map((f, i) => (
                      <button key={i} onClick={() => send(f)} className="font-mono text-[8px] tracking-widest uppercase px-3 py-1.5 border hover:border-[rgba(217,70,239,0.3)]"
                        style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)" }}>{f}</button>
                    ))}
                    {(mode === "correspondence" || mode === "tarot_arcana" || mode === "oracle") && (
                      <a href="https://vaultofarcana.com/correspondence-engine" target="_blank" rel="noopener"
                        className="font-mono text-[8px] tracking-wider px-3 py-1.5 border" style={{ borderColor: "rgba(147,51,234,0.15)", color: "#9333ea", opacity: 0.7 }}>{t.corrLink}</a>
                    )}
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: "0 24px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {atLimit && (
                  <div className="text-center py-3">
                    <span className="font-mono text-[9px]" style={{ color: "#f59e0b" }}>{tier === "guest" ? "Daily limit reached. Create a free account for 25/day." : "Daily limit reached."}</span>
                    {tier !== "initiate" && <a href="/pricing" className="ml-3 font-mono text-[9px] tracking-widest uppercase" style={{ color: "#d946ef" }}>{t.upgrade}</a>}
                  </div>
                )}
                <div className="flex gap-3 items-end mt-4">
                  <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={kd}
                    placeholder={t.placeholder} disabled={atLimit}
                    className="flex-1 bg-[rgba(17,15,26,0.4)] border px-4 py-3 font-body text-base text-[var(--ut-white)] resize-none outline-none transition-all focus:border-[rgba(217,70,239,0.25)]"
                    style={{ borderColor: "rgba(255,255,255,0.06)", minHeight: 48 }} />
                  <button onClick={() => send()} disabled={loading || !input.trim() || atLimit}
                    className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all"
                    style={{ borderColor: currentMode.c + "55", color: currentMode.c, background: currentMode.c + "08", opacity: loading || !input.trim() || atLimit ? 0.3 : 1, cursor: loading || !input.trim() || atLimit ? "not-allowed" : "pointer" }}>
                    {t.transmit}
                  </button>
                </div>
                <div className="mt-2 text-center font-mono text-[8px] tracking-widest" style={{ color: "rgba(237,233,246,0.08)" }}>{t.enterHint}</div>
              </div>
            </div>

            {/* RIGHT: Follow-ups + Corr link */}
            <div className="hidden lg:flex flex-col gap-2 w-48 flex-shrink-0 pt-4">
              {hasMessages && !loading && msgs[msgs.length - 1]?.role === "oracle" && (<>
                {followups.map((f, i) => (
                  <button key={i} onClick={() => send(f)} className="text-left font-mono text-[9px] tracking-wider uppercase px-3 py-2 border transition-all hover:border-[rgba(217,70,239,0.3)]"
                    style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)", background: "rgba(10,9,14,0.4)" }}>{f}</button>
                ))}
                {(mode === "correspondence" || mode === "tarot_arcana" || mode === "oracle") && (
                  <a href="https://vaultofarcana.com/correspondence-engine" target="_blank" rel="noopener"
                    className="text-left font-mono text-[8px] tracking-wider px-3 py-2 border transition-all hover:border-[rgba(147,51,234,0.4)]"
                    style={{ borderColor: "rgba(147,51,234,0.15)", color: "#9333ea", opacity: 0.7, display: "block", background: "rgba(10,9,14,0.4)" }}>{t.corrLink}</a>
                )}
              </>)}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="container-ut pb-8">
          <div className="flex flex-wrap gap-4 md:gap-5 items-center justify-center">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>{t.engine}</span>
              <button onClick={() => setSpeed("fast")} className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                style={{ borderColor: speed === "fast" ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.06)", color: speed === "fast" ? "#22d3ee" : "var(--ut-white-faint)", background: speed === "fast" ? "rgba(34,211,238,0.08)" : "transparent" }}>⚡ {t.fast}</button>
              <button onClick={() => setSpeed("deep")} className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                style={{ borderColor: speed === "deep" ? "rgba(147,51,234,0.5)" : "rgba(255,255,255,0.06)", color: speed === "deep" ? "#9333ea" : "var(--ut-white-faint)", background: speed === "deep" ? "rgba(147,51,234,0.08)" : "transparent" }}>◈ {t.deep}</button>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>{t.language}</span>
              {(["en", "tr", "ru"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} className="font-mono text-[9px] tracking-widest uppercase px-2.5 py-1.5 border transition-all"
                  style={{ borderColor: lang === l ? "var(--ut-magenta)44" : "rgba(255,255,255,0.06)", color: lang === l ? "var(--ut-magenta)" : "var(--ut-white-faint)" }}>{l.toUpperCase()}</button>
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>{t.voice}</span>
              <button onClick={() => { setVoiceOn(!voiceOn); if (voiceOn) window.speechSynthesis?.cancel(); }} className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                style={{ borderColor: voiceOn ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.06)", color: voiceOn ? "#22d3ee" : "var(--ut-white-faint)" }}>{voiceOn ? "🔊 ON" : "🔇 OFF"}</button>
              {voiceOn && (<>
                <button onClick={() => setVoiceGender("f")} className="font-mono text-[9px] px-2.5 py-1 border transition-all"
                  style={{ borderColor: voiceGender === "f" ? "rgba(212,168,71,0.4)" : "rgba(255,255,255,0.06)", color: voiceGender === "f" ? "#d4a847" : "var(--ut-white-faint)" }}>{t.female}</button>
                <button onClick={() => setVoiceGender("m")} className="font-mono text-[9px] px-2.5 py-1 border transition-all"
                  style={{ borderColor: voiceGender === "m" ? "rgba(212,168,71,0.4)" : "rgba(255,255,255,0.06)", color: voiceGender === "m" ? "#d4a847" : "var(--ut-white-faint)" }}>{t.male}</button>
              </>)}
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            <span className="font-mono text-[8px] tracking-widest" style={{ color: "rgba(212,168,71,0.45)" }}>
              {tier === "initiate" ? t.initiateActive : tier === "free" ? t.freeLimit.replace("{n}", String(questionsUsed)) : t.guestLimit.replace("{n}", String(questionsUsed))}
            </span>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            <button onClick={() => setMsgs([])} className="font-mono text-[8px] tracking-widest uppercase px-3 py-1.5 border transition-all hover:border-[rgba(255,255,255,0.15)]"
              style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)" }}>{t.clear}</button>
          </div>
        </div>

        <SectionReveal>
          <div className="container-ut pb-20 text-center">
            <div className="sacred-divider mb-12" />
            <div className="font-heading text-xl tracking-widest mb-4" style={{ color: "var(--ut-gold)" }}>{t.goDeeper}</div>
            <p className="font-body text-base max-w-lg mx-auto mb-8" style={{ color: "var(--ut-white-dim)", lineHeight: 1.7 }}>{t.goDesc}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="https://www.vaultofarcana.com" className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all hover:border-[rgba(217,70,239,0.5)]"
                style={{ borderColor: "rgba(217,70,239,0.25)", background: "rgba(217,70,239,0.04)", color: "rgba(217,70,239,0.7)" }}>{t.enterVault}</a>
              <a href="/store" className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all hover:border-[rgba(212,168,71,0.5)]"
                style={{ borderColor: "rgba(212,168,71,0.25)", background: "rgba(212,168,71,0.03)", color: "rgba(212,168,71,0.7)" }}>{t.getBook}</a>
            </div>
          </div>
        </SectionReveal>
        </motion.div>
      </main>
      <Footer />
      <style>{`
        @keyframes oP{0%,100%{opacity:.25;transform:scale(.9)}50%{opacity:.8;transform:scale(1.1)}}
        .oracle-scroll::-webkit-scrollbar{width:5px}
        .oracle-scroll::-webkit-scrollbar-track{background:rgba(10,9,14,0.3)}
        .oracle-scroll::-webkit-scrollbar-thumb{background:linear-gradient(to bottom,#c026d3 0%,#9333ea 30%,#6366f1 50%,#22d3ee 75%,#0891b2 100%);border-radius:3px}
      `}</style>
    </>
  );
}
