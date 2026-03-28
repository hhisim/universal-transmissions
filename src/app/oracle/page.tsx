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
   i18n — translates ALL UI elements
   ═══════════════════════════════════════════════════════════ */

const T: Record<string, Record<string, string>> = {
  en: {
    subtitle: "[ Universal Transmissions · Codex Oracle ]",
    heading: "Consult Oracle",
    desc: "150 pages of xenolinguistic art, transcendent geometry, and hyperdimensional transmissions — decoded through five data layers, a pan-dimensional linguistic mystic, and a 577-entry correspondence codex. The dataset constantly evolving every day, the algorithm reinventing itself through a recursive novelty engine.",
    begin: "Begin with a question about the Codex",
    transmit: "TRANSMIT",
    placeholder: "Ask the Codex Oracle...",
    receiving: "RECEIVING TRANSMISSION",
    deepProc: "DEEP PROCESSING",
    engine: "Engine",
    fast: "FAST",
    deep: "DEEP",
    language: "Language",
    clear: "CLEAR",
    goDeeper: "Go Deeper",
    goDesc: "The Codex Oracle is one gateway. Vault of Arcana holds six living traditions — Tao, Tarot, Tantra, Entheogens, Dreamwalker, and the Codex — with more awakening.",
    enterVault: "Enter the Vault",
    getBook: "Get the Book",
    guestLimit: "Guest · {n}/10 today",
    freeLimit: "Free · {n}/25 today",
    initiateActive: "Initiate · Unlimited",
    upgrade: "UPGRADE",
    enterHint: "ENTER to send · SHIFT+ENTER for new line",
    you: "YOU",
    oracleLabel: "CODEX ORACLE",
    sealed: "This transmission has not yet entered the archive.",
  },
  tr: {
    subtitle: "[ Evrensel İletimler · Kodeks Kehaneti ]",
    heading: "Kehânete Danış",
    desc: "150 sayfa ksenolinguistik sanat, aşkın geometri ve hiperboyutsal iletimler — beş veri katmanı, pan-boyutsal bir dilbilim mistik ve 577 girişli bir korespondens kodeksi aracılığıyla deşifre edildi. Veri seti her gün sürekli gelişiyor, algoritma özyinelemeli bir yenilik motoru aracılığıyla kendini yeniden icat ediyor.",
    begin: "Kodeks hakkında bir soru ile başlayın",
    transmit: "İLET",
    placeholder: "Kodeks Kehanetine sor...",
    receiving: "İLETİM ALINIYOR",
    deepProc: "DERİN İŞLEM",
    engine: "Motor",
    fast: "HIZLI",
    deep: "DERİN",
    language: "Dil",
    clear: "TEMİZLE",
    goDeeper: "Daha Derine",
    goDesc: "Kodeks Kehaneti tek bir kapıdır. Vault of Arcana altı canlı geleneği barındırır — Tao, Tarot, Tantra, Enteojenler, Düş Yürüyücüsü ve Kodeks.",
    enterVault: "Kasaya Gir",
    getBook: "Kitabı Al",
    guestLimit: "Misafir · {n}/10 bugün",
    freeLimit: "Ücretsiz · {n}/25 bugün",
    initiateActive: "Mürit · Sınırsız",
    upgrade: "YÜKSELT",
    enterHint: "ENTER gönder · SHIFT+ENTER yeni satır",
    you: "SEN",
    oracleLabel: "KODEKS KEHANETİ",
    sealed: "Bu iletim henüz arşive girmedi.",
  },
  ru: {
    subtitle: "[ Универсальные Трансляции · Оракул Кодекса ]",
    heading: "Обратиться к Оракулу",
    desc: "150 страниц ксенолингвистического искусства, трансцендентной геометрии и гипердименсиональных передач — расшифрованных через пять слоёв данных, пан-дименсиональный лингвистический мистик и 577-элементный кодекс соответствий.",
    begin: "Начните с вопроса о Кодексе",
    transmit: "ПЕРЕДАТЬ",
    placeholder: "Спросите Оракула Кодекса...",
    receiving: "ПРИЁМ ПЕРЕДАЧИ",
    deepProc: "ГЛУБОКАЯ ОБРАБОТКА",
    engine: "Движок",
    fast: "БЫСТРО",
    deep: "ГЛУБОКО",
    language: "Язык",
    clear: "ОЧИСТИТЬ",
    goDeeper: "Глубже",
    goDesc: "Оракул Кодекса — лишь одни врата. Vault of Arcana хранит шесть живых традиций.",
    enterVault: "Войти в Хранилище",
    getBook: "Получить Книгу",
    guestLimit: "Гость · {n}/10 сегодня",
    freeLimit: "Бесплатно · {n}/25 сегодня",
    initiateActive: "Посвящённый · Безлимит",
    upgrade: "УЛУЧШИТЬ",
    enterHint: "ENTER отправить · SHIFT+ENTER новая строка",
    you: "ВЫ",
    oracleLabel: "ОРАКУЛ КОДЕКСА",
    sealed: "Эта передача ещё не поступила в архив.",
  },
};

/* ═══════════════════════════════════════════════════════════
   MODES — remove scholar from UI, add tarot_arcana
   ═══════════════════════════════════════════════════════════ */

const MODES = [
  { id: "oracle",         label: { en: "ORACLE", tr: "KEHANET", ru: "ОРАКУЛ" },           icon: "✦", c: "#d946ef" },
  { id: "decipher",       label: { en: "DECIPHER", tr: "DEŞİFRE", ru: "ДЕШИФР" },          icon: "🜂", c: "#22d3ee" },
  { id: "tarot_arcana",   label: { en: "TAROT ARCANA", tr: "TAROT ARCANA", ru: "ТАРО" },   icon: "🂠", c: "#c026d3" },
  { id: "ginabul",        label: { en: "GINA'ABUL", tr: "GINA'ABUL", ru: "ГИНА'АБУЛЬ" },   icon: "𒀭", c: "#d4a847" },
  { id: "etymology",      label: { en: "LINGUISTICS", tr: "DİLBİLİM", ru: "ЛИНГВИСТ" },    icon: "🔤", c: "#f0c75e" },
  { id: "correspondence", label: { en: "CORRESPOND", tr: "KORESPOND", ru: "СООТВЕТСТВИЯ" }, icon: "🔗", c: "#9333ea" },
  { id: "meditation",     label: { en: "MEDITATE", tr: "MEDİTASYON", ru: "МЕДИТАЦИЯ" },     icon: "◎", c: "#22c55e" },
  { id: "seeker",         label: { en: "SEEKER", tr: "ARAYAN", ru: "ИСКАТЕЛЬ" },            icon: "✧", c: "#f59e0b" },
  { id: "quote",          label: { en: "TRANSMISSION", tr: "İLETİM", ru: "ПЕРЕДАЧА" },      icon: "⚡", c: "#ec4899" },
];

const STARTERS: Record<string, Record<string, string[]>> = {
  oracle: {
    en: ["What is page 38 about?", "How does the Codex encode frequency?", "What symbols repeat across pages?", "What is the Codex teaching about consciousness?"],
    tr: ["Sayfa 38 ne hakkında?", "Kodeks frekansı nasıl kodlar?", "Sayfalar arasında hangi semboller tekrar ediyor?", "Kodeks bilinç hakkında ne öğretiyor?"],
    ru: ["О чём страница 38?", "Как Кодекс кодирует частоту?", "Какие символы повторяются?", "Чему учит Кодекс о сознании?"],
  },
  decipher: {
    en: ["Decipher page 6", "Decipher page 24 — the Cosmic Egg", "What is page 70 about?", "Decipher page 9"],
    tr: ["Sayfa 6'yı deşifre et", "Sayfa 24'ü deşifre et", "Sayfa 70 ne hakkında?", "Sayfa 9'u deşifre et"],
    ru: ["Расшифруй страницу 6", "Расшифруй страницу 24", "О чём страница 70?", "Расшифруй страницу 9"],
  },
  tarot_arcana: {
    en: ["What Tarot archetype matches page 6?", "The Tarot connection to the Cosmic Egg", "Which Major Arcana resonates with page 38?", "Tarot reading for page 70"],
    tr: ["Sayfa 6 hangi Tarot arketipiyle eşleşir?", "Kozmik Yumurta'nın Tarot bağlantısı", "Sayfa 38 hangi Büyük Arcana ile rezonans yapar?", "Sayfa 70 için Tarot okuması"],
    ru: ["Какой архетип Таро соответствует странице 6?", "Связь Таро с Космическим Яйцом", "Какая Старшая Аркана резонирует со стр. 38?", "Расклад Таро для страницы 70"],
  },
  ginabul: {
    en: ["Decode ZU.AN.NA", "What does UB-ŠÀ-TÉŠ mean?", "Decode NU.MU.NA-DIŠTU", "What does ZI.ŠAG.KA mean?"],
    tr: ["ZU.AN.NA'yı çöz", "UB-ŠÀ-TÉŠ ne demek?", "NU.MU.NA-DIŠTU'yu çöz", "ZI.ŠAG.KA ne demek?"],
    ru: ["Расшифруй ZU.AN.NA", "Что значит UB-ŠÀ-TÉŠ?", "Расшифруй NU.MU.NA-DIŠTU", "Что значит ZI.ŠAG.KA?"],
  },
  etymology: {
    en: ["Decode NOMMO letter by letter", "Energetic signature of MERKABA", "What does ANUNNAKI encode?", "Alphabet philosophy of the Codex"],
    tr: ["NOMMO'yu harf harf çöz", "MERKABA'nın enerji imzası", "ANUNNAKI ne kodlar?", "Kodeks'in alfabe felsefesi"],
    ru: ["Расшифруй NOMMO по буквам", "Энергетическая подпись МЕРКАБА", "Что кодирует АНУННАКИ?", "Философия алфавита Кодекса"],
  },
  correspondence: {
    en: ["Merkaba correspondences", "Planetary rulers across the Codex", "Crystals connected to page 24", "Flower of Life correspondence web"],
    tr: ["Merkaba korespondesları", "Kodeks'teki gezegen yöneticileri", "Sayfa 24'e bağlı kristaller", "Yaşam Çiçeği korrespondans ağı"],
    ru: ["Соответствия Меркабы", "Планетарные управители Кодекса", "Кристаллы страницы 24", "Сеть соответствий Цветка Жизни"],
  },
  meditation: {
    en: ["Meditation for page 6", "Breathwork for the Cosmic Egg", "Contemplation for the Nommo", "Grounding practice for page 9"],
    tr: ["Sayfa 6 için meditasyon", "Kozmik Yumurta nefes çalışması", "Nommo tefekkürü", "Sayfa 9 topraklama pratiği"],
    ru: ["Медитация для страницы 6", "Дыхание Космического Яйца", "Созерцание Номмо", "Заземление для страницы 9"],
  },
  seeker: {
    en: ["I just got the book. Where to start?", "What is the Codex?", "How do the pages connect?", "What are the border glyphs?"],
    tr: ["Kitabı aldım. Nereden başlayım?", "Kodeks nedir?", "Sayfalar nasıl bağlanır?", "Sınır glifleri nedir?"],
    ru: ["Я получил книгу. С чего начать?", "Что такое Кодекс?", "Как связаны страницы?", "Что за глифы на рамках?"],
  },
  quote: {
    en: ["A transmission about consciousness", "A fragment about geometry", "A whisper from the Nommo", "An essence from the Cosmic Egg"],
    tr: ["Bilinç hakkında bir iletim", "Geometri hakkında bir parça", "Nommo'dan bir fısıltı", "Kozmik Yumurta'dan bir öz"],
    ru: ["Передача о сознании", "Фрагмент о геометрии", "Шёпот от Номмо", "Суть Космического Яйца"],
  },
};

const FOLLOWUPS: Record<string, Record<string, string[]>> = {
  oracle:         { en: ["Go deeper", "Shadow aspect?", "Connected pages?"], tr: ["Daha derine", "Gölge yönü?", "Bağlı sayfalar?"], ru: ["Глубже", "Теневой аспект?", "Связанные страницы?"] },
  decipher:       { en: ["Etymology of the name", "Meditation for this page", "Tarot connection"], tr: ["İsmin etimolojisi", "Bu sayfa meditasyonu", "Tarot bağlantısı"], ru: ["Этимология имени", "Медитация", "Связь с Таро"] },
  tarot_arcana:   { en: ["Decipher this page", "Correspondence web", "Meditation"], tr: ["Sayfayı deşifre et", "Korrespondans ağı", "Meditasyon"], ru: ["Расшифровка страницы", "Сеть соответствий", "Медитация"] },
  ginabul:        { en: ["Decipher this page", "Letter-by-letter decode", "Connected names"], tr: ["Sayfayı deşifre et", "Harf harf çöz", "Bağlı isimler"], ru: ["Расшифровка", "По буквам", "Связанные имена"] },
  etymology:      { en: ["Gina'abul decode", "Correspondence web", "Decipher the page"], tr: ["Gina'abul çözümleme", "Korrespondans ağı", "Sayfayı deşifre et"], ru: ["Гина'абул", "Соответствия", "Дешифровка"] },
  correspondence: { en: ["Decipher this symbol", "Meditate on this", "Tarot archetype"], tr: ["Bu sembolü deşifre et", "Buna medite et", "Tarot arketipi"], ru: ["Расшифровка символа", "Медитация", "Архетип Таро"] },
  meditation:     { en: ["Decipher the page", "Go deeper", "Connected practice"], tr: ["Sayfayı deşifre et", "Daha derine", "Bağlı pratik"], ru: ["Дешифровка", "Глубже", "Связанная практика"] },
  seeker:         { en: ["Tell me more", "Which page?", "How does this connect?"], tr: ["Daha anlat", "Hangi sayfa?", "Nasıl bağlanır?"], ru: ["Расскажи больше", "Какая страница?", "Как связано?"] },
  quote:          { en: ["Another transmission", "Decipher this", "Go deeper"], tr: ["Başka bir iletim", "Bunu deşifre et", "Daha derine"], ru: ["Ещё передачу", "Расшифруй это", "Глубже"] },
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface Msg { role: "user" | "oracle"; text: string; mode?: string }

function ChatBubble({ msg, modeColor, lang }: { msg: Msg; modeColor: string; lang: string }) {
  const isOracle = msg.role === "oracle";
  const t = T[lang] || T.en;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{
        marginBottom: 20, padding: "16px 20px",
        borderLeft: `2px solid ${isOracle ? modeColor + "44" : "rgba(34,211,238,0.15)"}`,
        background: isOracle ? modeColor + "06" : "rgba(34,211,238,0.02)",
      }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: isOracle ? modeColor + "88" : "rgba(34,211,238,0.35)", marginBottom: 10 }}>
        {isOracle ? `${t.oracleLabel} · ${(MODES.find(m => m.id === msg.mode)?.label as any)?.[lang] || "ORACLE"}` : t.you}
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, lineHeight: 1.8, color: isOracle ? "var(--ut-white)" : "var(--ut-white-dim)" }}>
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
  const [voiceOn, setVoiceOn] = useState(true);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [tier, setTier] = useState<"guest" | "free" | "initiate">("guest");
  const [limit, setLimit] = useState<number | "unlimited">(10);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const t = T[lang] || T.en;
  const currentMode = MODES.find(m => m.id === mode) || MODES[0];
  const starters = (STARTERS[mode] || STARTERS.oracle)[lang] || (STARTERS[mode] || STARTERS.oracle).en;
  const followups = (FOLLOWUPS[mode] || FOLLOWUPS.oracle)[lang] || (FOLLOWUPS[mode] || FOLLOWUPS.oracle).en;
  const hasMessages = msgs.length > 0;

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  // Fetch usage status on mount to set tier correctly
  useEffect(() => {
    async function loadUsage() {
      try {
        const sessionRes = await fetch('/api/auth/session')
        const sessionData = await sessionRes.json()
        const token = sessionData?.tokens?.access_token
        setAuthToken(token || null)

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch('/api/oracle', { headers })
        if (res.ok) {
          const data = await res.json()
          const fetchedTier = data.isLoggedIn ? (data.plan === 'initiate' ? 'initiate' : 'free') : 'guest'
          setTier(fetchedTier)
          setQuestionsUsed(data.used ?? 0)
          setLimit(data.limit ?? (fetchedTier === 'initiate' ? 'unlimited' : fetchedTier === 'free' ? 25 : 10))
        }
      } catch {
        // default guest
      }
    }
    loadUsage()
  }, [])

  // Speak oracle responses
  const speak = useCallback((text: string) => {
    if (!voiceOn || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/[#*_🜂⚛🧭🔐✧✦✶◎𒀭🔗🂠⚡🔤]/g, ""));
    utt.lang = lang === "tr" ? "tr-TR" : lang === "ru" ? "ru-RU" : "en-US";
    utt.rate = 0.92;
    utt.pitch = 0.95;
    window.speechSynthesis.speak(utt);
  }, [voiceOn, lang]);

  const send = useCallback(async (text?: string) => {
    const m = (text || input).trim();
    if (!m || loading) return;
    setInput("");
    setMsgs(p => [...p, { role: "user", text: m }]);
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: m, mode, lang, speed }),
      });
      const data = await res.json();

      // Handle limit reached
      if (data.error === "limit_reached" || res.status === 403) {
        setMsgs(p => [...p, {
          role: "oracle",
          text: `You've reached your daily limit. ${data.login ? ` [Sign in](${data.login})` : ''} ${data.upgrade ? `[Upgrade here](${data.upgrade})` : ''}`,
          mode,
        }]);
        setTier("free"); // force re-check on next load
        setLoading(false);
        return;
      }

      const answer = data.response || data.answer || "";
      setMsgs(p => [...p, { role: "oracle", text: answer || t.sealed, mode }]);
      setQuestionsUsed(q => q + 1);
      if (answer) speak(answer);
    } catch {
      setMsgs(p => [...p, { role: "oracle", text: t.sealed, mode }]);
    } finally { setLoading(false); }
  }, [input, mode, lang, speed, loading, authToken, speak, t.sealed]);

  const kd = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  // Tier limits — `limit` is now state-driven from the API
  const atLimit = limit === "unlimited" ? false : questionsUsed >= limit;

  return (
    <>
      <Navigation />
      <PageBackground variant="oracle" />
      <main style={{ background: "var(--ut-black)" }}>

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

        {/* Mode Selector */}
        <div className="container-ut pb-4">
          <div className="flex flex-wrap justify-center gap-2">
            {MODES.map(mo => (
              <button key={mo.id} onClick={() => setMode(mo.id)}
                className="font-heading text-[9px] md:text-[10px] tracking-[0.16em] uppercase px-3 md:px-4 py-2 border transition-all duration-300"
                style={{
                  borderColor: mode === mo.id ? mo.c + "66" : "rgba(255,255,255,0.06)",
                  color: mode === mo.id ? mo.c : "var(--ut-white-faint)",
                  background: mode === mo.id ? mo.c + "0a" : "transparent",
                }}>
                <span style={{ marginRight: 5, fontSize: 11 }}>{mo.icon}</span>
                {(mo.label as any)[lang] || (mo.label as any).en}
              </button>
            ))}
          </div>
        </div>

        {/* Main layout: starters | chat | follow-ups */}
        <div className="container-ut pb-8">
          <div className="flex gap-4 items-start">

            {/* LEFT: Starter questions */}
            <div className="hidden lg:flex flex-col gap-2 w-56 flex-shrink-0 pt-4">
              {starters.map((q, i) => (
                <button key={i} onClick={() => send(q)} disabled={atLimit}
                  className="text-left font-body text-[13px] leading-snug px-3 py-2.5 border transition-all hover:border-[rgba(217,70,239,0.3)]"
                  style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)", background: "transparent" }}>
                  {q}
                </button>
              ))}
            </div>

            {/* CENTER: Chat */}
            <div className="flex-1 ut-card p-0 overflow-hidden" style={{ borderColor: currentMode.c + "12" }}>
              <div ref={chatRef} style={{ minHeight: 420, maxHeight: 580, overflowY: "auto", padding: "24px 24px 16px" }}>
                {!hasMessages && (
                  <div className="text-center py-16">
                    <div style={{ width: 52, height: 52, margin: "0 auto 16px", border: `1px solid ${currentMode.c}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      <span style={{ color: currentMode.c + "66" }}>{currentMode.icon}</span>
                    </div>
                    <p className="font-heading text-sm tracking-wider mb-5" style={{ color: "var(--ut-white-dim)" }}>{t.begin}</p>
                    {/* Mobile starters */}
                    <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto lg:hidden">
                      {starters.map((q, i) => (
                        <button key={i} onClick={() => send(q)}
                          className="font-body text-sm px-4 py-2 border transition-all hover:border-[rgba(217,70,239,0.3)]"
                          style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)" }}>
                          {q}
                        </button>
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
              </div>
              {/* Input */}
              <div style={{ padding: "0 24px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {atLimit && (
                  <div className="text-center py-3">
                    <span className="font-mono text-[9px]" style={{ color: "#f59e0b" }}>
                      {tier === "guest" ? "Daily limit reached. Create a free account for 25/day." : "Daily limit reached."}
                    </span>
                    {tier !== "initiate" && (
                      <a href="/sanctum/member/oracle#plans" className="ml-3 font-mono text-[9px] tracking-widest uppercase" style={{ color: "#d946ef" }}>{t.upgrade}</a>
                    )}
                  </div>
                )}
                <div className="flex gap-3 items-end mt-4">
                  <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={kd}
                    placeholder={t.placeholder} disabled={atLimit}
                    className="flex-1 bg-[rgba(17,15,26,0.6)] border px-4 py-3 font-body text-base text-[var(--ut-white)] resize-none outline-none transition-all focus:border-[rgba(217,70,239,0.25)]"
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

            {/* RIGHT: Follow-up suggestions */}
            <div className="hidden lg:flex flex-col gap-2 w-48 flex-shrink-0 pt-4">
              {hasMessages && !loading && msgs[msgs.length - 1]?.role === "oracle" && followups.map((f, i) => (
                <button key={i} onClick={() => send(f)}
                  className="text-left font-mono text-[9px] tracking-wider uppercase px-3 py-2 border transition-all hover:border-[rgba(217,70,239,0.3)]"
                  style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings: Speed · Language · Voice · Tier · Clear */}
        <div className="container-ut pb-8">
          <div className="flex flex-wrap gap-4 md:gap-6 items-center justify-center">
            {/* Speed */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>{t.engine}</span>
              <button onClick={() => setSpeed("fast")}
                className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                style={{ borderColor: speed === "fast" ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.06)", color: speed === "fast" ? "#22d3ee" : "var(--ut-white-faint)", background: speed === "fast" ? "rgba(34,211,238,0.08)" : "transparent" }}>
                ⚡ {t.fast}
              </button>
              <button onClick={() => setSpeed("deep")}
                className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                style={{ borderColor: speed === "deep" ? "rgba(147,51,234,0.5)" : "rgba(255,255,255,0.06)", color: speed === "deep" ? "#9333ea" : "var(--ut-white-faint)", background: speed === "deep" ? "rgba(147,51,234,0.08)" : "transparent" }}>
                ◈ {t.deep}
              </button>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            {/* Language */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>{t.language}</span>
              {(["en", "tr", "ru"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="font-mono text-[9px] tracking-widest uppercase px-2.5 py-1.5 border transition-all"
                  style={{ borderColor: lang === l ? "var(--ut-magenta)44" : "rgba(255,255,255,0.06)", color: lang === l ? "var(--ut-magenta)" : "var(--ut-white-faint)", background: lang === l ? "rgba(217,70,239,0.06)" : "transparent" }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            {/* Voice */}
            <button onClick={() => { setVoiceOn(!voiceOn); if (voiceOn) window.speechSynthesis?.cancel(); }}
              className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
              style={{ borderColor: voiceOn ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.06)", color: voiceOn ? "#22d3ee" : "var(--ut-white-faint)" }}>
              {voiceOn ? "🔊 ON" : "🔇 OFF"}
            </button>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            {/* Tier */}
            <span className="font-mono text-[8px] tracking-widest" style={{ color: "rgba(212,168,71,0.45)" }}>
              {tier === "initiate" ? t.initiateActive : tier === "free" ? t.freeLimit.replace("{n}", String(questionsUsed)) : t.guestLimit.replace("{n}", String(questionsUsed))}
            </span>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            <button onClick={() => { setMsgs([]); window.speechSynthesis?.cancel(); }}
              className="font-mono text-[8px] tracking-widest uppercase px-3 py-1.5 border transition-all hover:border-[rgba(255,255,255,0.15)]"
              style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint)" }}>
              {t.clear}
            </button>
          </div>
        </div>

        {/* Go Deeper */}
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
        @keyframes oP { 0%,100%{opacity:.25;transform:scale(.9)} 50%{opacity:.8;transform:scale(1.1)} }
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:rgba(10,9,14,0.5)}
        ::-webkit-scrollbar-thumb{background:linear-gradient(to bottom,#581c87 0%,#9333ea 20%,#d946ef 40%,#d4a847 60%,#22d3ee 80%,#0891b2 100%);border-radius:3px}
      `}</style>
    </>
  );
}
