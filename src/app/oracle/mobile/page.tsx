"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";

const CosmicBackground = dynamic(() => import("@/components/oracle/CosmicBackground"), { ssr: false });

const CIPHER_MAP: Record<string, string> = {
  a:"ᔑ", b:"ʖ", c:"ᓵ", d:"↸", e:"ᒷ", f:"⎓", g:"⊣", h:"⍑", i:"╎", j:"⋮",
  k:"ꖌ", l:"ꖎ", m:"ᒲ", n:"リ", o:"𝙹", p:"¡", q:"ᑑ", r:"∷", s:"ᓭ", t:"ℸ",
  u:"⚍", v:"⍊", w:"∴", x:"⌇", y:"ǁ", z:"⨅", " ":" ", ".":"·", ",":"⸴",
  "?":"⸮", "!":"⁝", ":":"∵", ";":"⁞", "-":"⊢", "'":"'", "\"":"ˮ",
};

const NUM_MAP: Record<string, string> = {
  "0":"◌", "1":"𐤀", "2":"𐤁", "3":"𐤂", "4":"𐤃", "5":"𐤄",
  "6":"𐤅", "7":"𐤆", "8":"𐤇", "9":"𐤈",
};

const T: Record<string, Record<string, string>> = {
  en: {
    subtitle: "[ Universal Transmissions · Oracle Mobile ]",
    heading: "Consult Oracle",
    desc: "Mobile chamber. Direct transmission only.",
    begin: "Begin with a question",
    transmit: "TRANSMIT",
    placeholder: "Ask the Codex Oracle...",
    receiving: "RECEIVING TRANSMISSION",
    deepProc: "DEEP PROCESSING",
    engine: "Engine",
    fast: "FAST",
    deep: "DEEP",
    language: "Language",
    voice: "Voice",
    female: "FEMALE",
    male: "MALE",
    clear: "CLEAR",
    enterHint: "ENTER to send · SHIFT+ENTER for new line",
    you: "YOU",
    oracleLabel: "CODEX ORACLE",
    outputMode: "Output",
    normal: "STANDARD",
    xeno: "XENOLINGUISTIC",
    lemurian: "LEMURIAN",
    questionSeeds: "Question Seeds",
    decodeName: "Energetic signature of your name",
    decodeBtn: "DECODE",
    decodeHint: "Type any name to reveal its letter-by-letter energetic decode",
    mobileRoute: "Mobile Route",
    desktopRoute: "Open Desktop Lattice",
    goDeeper: "Go Deeper",
    enterVault: "Enter the Vault",
    getBook: "Get the Book",
  },
  tr: {
    subtitle: "[ Evrensel İletimler · Mobil Kehanet ]",
    heading: "Kehânete Danış",
    desc: "Mobil oda. Yalnızca doğrudan iletim.",
    begin: "Bir soruyla başlayın",
    transmit: "İLET",
    placeholder: "Kodeks Kehanetine sor...",
    receiving: "İLETİM ALINIYOR",
    deepProc: "DERİN İŞLEM",
    engine: "Motor",
    fast: "HIZLI",
    deep: "DERİN",
    language: "Dil",
    voice: "Ses",
    female: "KADIN",
    male: "ERKEK",
    clear: "TEMİZLE",
    enterHint: "ENTER gönder · SHIFT+ENTER yeni satır",
    you: "SEN",
    oracleLabel: "KODEKS KEHANETİ",
    outputMode: "Çıktı",
    normal: "STANDART",
    xeno: "KSENOLİNGÜİSTİK",
    lemurian: "LEMURYEN",
    questionSeeds: "Soru Tohumları",
    decodeName: "İsminin enerji imzası",
    decodeBtn: "ÇÖZ",
    decodeHint: "Harf harf enerji çözümlemesi için bir isim girin",
    mobileRoute: "Mobil Rota",
    desktopRoute: "Masaüstü Lattice Aç",
    goDeeper: "Daha Derine",
    enterVault: "Kasaya Gir",
    getBook: "Kitabı Al",
  },
  ru: {
    subtitle: "[ Универсальные Трансляции · Мобильный Оракул ]",
    heading: "Обратиться к Оракулу",
    desc: "Мобильная камера. Только прямая передача.",
    begin: "Начните с вопроса",
    transmit: "ПЕРЕДАТЬ",
    placeholder: "Спросите Оракула Кодекса...",
    receiving: "ПРИЁМ ПЕРЕДАЧИ",
    deepProc: "ГЛУБОКАЯ ОБРАБОТКА",
    engine: "Движок",
    fast: "БЫСТРО",
    deep: "ГЛУБОКО",
    language: "Язык",
    voice: "Голос",
    female: "ЖЕНСКИЙ",
    male: "МУЖСКОЙ",
    clear: "ОЧИСТИТЬ",
    enterHint: "ENTER отправить · SHIFT+ENTER строка",
    you: "ВЫ",
    oracleLabel: "ОРАКУЛ КОДЕКСА",
    outputMode: "Вывод",
    normal: "СТАНДАРТ",
    xeno: "КСЕНОЛИНГВИСТ",
    lemurian: "ЛЕМУРИЙСКИЙ",
    questionSeeds: "Зерна Вопроса",
    decodeName: "Энергетическая подпись имени",
    decodeBtn: "РАСШИФРОВАТЬ",
    decodeHint: "Введите имя для побуквенной расшифровки",
    mobileRoute: "Мобильный Маршрут",
    desktopRoute: "Открыть Desktop Lattice",
    goDeeper: "Глубже",
    enterVault: "Войти",
    getBook: "Книгу",
  },
};

const MODES = [
  { id: "oracle", label: { en: "ORACLE", tr: "KEHANET", ru: "ОРАКУЛ" }, icon: "✦", c: "#d946ef" },
  { id: "decipher", label: { en: "DECIPHER", tr: "DEŞİFRE", ru: "ДЕШИФР" }, icon: "🜂", c: "#22d3ee" },
  { id: "tarot_arcana", label: { en: "ARCANA", tr: "ARCANA", ru: "АРКАНА" }, icon: "🂠", c: "#c026d3" },
  { id: "ginabul", label: { en: "GINA'ABUL", tr: "GINA'ABUL", ru: "ГИНА'АБУЛЬ" }, icon: "𒀭", c: "#d4a847" },
  { id: "etymology", label: { en: "LINGUISTICS", tr: "DİLBİLİM", ru: "ЛИНГВИСТ" }, icon: "🔤", c: "#f0c75e" },
  { id: "correspondence", label: { en: "CORRESPOND", tr: "KORESPOND", ru: "СООТВЕТСТВИЯ" }, icon: "🔗", c: "#9333ea" },
  { id: "meditation", label: { en: "MEDITATE", tr: "MEDİTASYON", ru: "МЕДИТАЦИЯ" }, icon: "◎", c: "#22c55e" },
  { id: "seeker", label: { en: "SEEKER", tr: "ARAYAN", ru: "ИСКАТЕЛЬ" }, icon: "✧", c: "#f59e0b" },
  { id: "quote", label: { en: "TRANSMISSION", tr: "İLETİM", ru: "ПЕРЕДАЧА" }, icon: "⚡", c: "#ec4899" },
];

const OUTPUT_MODES = [
  { id: "standard", label: "normal", c: "#22d3ee" },
  { id: "xenolinguistic", label: "xeno", c: "#d946ef" },
  { id: "lemurian", label: "lemurian", c: "#d4a847" },
];

const Q_POOL: Record<string, string[]> = {
  oracle: ["What is page 38 about?", "How does the Codex encode frequency?", "What does the Codex teach about consciousness?", "What symbols repeat across the Codex?"],
  decipher: ["Decipher page 6 — the Tesseract", "Decipher page 24 — the Cosmic Egg", "What is page 42 about?", "Decipher page 38"],
  tarot_arcana: ["Tarot archetype for page 6", "Which Major Arcana matches page 38?", "Tarot reading for page 24", "The Star archetype in the Codex"],
  ginabul: ["Decode ZU.AN.NA", "What does UB-ŠÀ-TÉŠ mean?", "Decode NU.MU.NA-DIŠTU", "What does DI.KU.MAH mean?"],
  etymology: ["Decode NOMMO letter by letter", "Energetic signature of MERKABA", "Decode HERMES", "What does the word CODEX encode energetically?"],
  correspondence: ["Merkaba correspondences", "What corresponds to the Tesseract?", "Tree of Life correspondences in the Codex", "Nommo correspondence network"],
  meditation: ["Meditation for page 6", "Breathwork for the Cosmic Egg", "Chakra activation for page 38", "Merkaba meditation"],
  seeker: ["I just got the book. Where to start?", "What is the Universal Transmissions Codex?", "What are the border glyphs?", "How should I read this book?"],
  quote: ["A transmission about consciousness", "A fragment about geometry", "A whisper from the Nommo", "An essence of the Merkaba"],
};

const FOLLOWUPS: Record<string, Record<string, string[]>> = {
  oracle: { en: ["Go deeper", "Shadow aspect?", "Connected pages?"], tr: ["Daha derine", "Gölge yönü?", "Bağlı sayfalar?"], ru: ["Глубже", "Тень?", "Связи?"] },
  decipher: { en: ["Etymology of the name", "Meditation for this page", "Tarot connection"], tr: ["İsmin etimolojisi", "Meditasyon", "Tarot"], ru: ["Этимология", "Медитация", "Таро"] },
  tarot_arcana: { en: ["Decipher this page", "Correspondence web", "Meditation"], tr: ["Deşifre et", "Korrespondans", "Meditasyon"], ru: ["Дешифровка", "Соответствия", "Медитация"] },
  ginabul: { en: ["Decipher this page", "Letter-by-letter decode", "Connected names"], tr: ["Deşifre et", "Harf harf çöz", "Bağlı isimler"], ru: ["Дешифровка", "По буквам", "Имена"] },
  etymology: { en: ["Gina'abul decode", "Decipher the page", "Connected names"], tr: ["Gina'abul çöz", "Deşifre et", "Bağlı isimler"], ru: ["Гина'абул", "Дешифровка", "Связанные имена"] },
  correspondence: { en: ["Decipher this", "Meditate on this", "Tarot archetype"], tr: ["Deşifre et", "Medite et", "Tarot"], ru: ["Дешифровка", "Медитация", "Таро"] },
  meditation: { en: ["Decipher the page", "Go deeper", "Connected practice"], tr: ["Deşifre et", "Daha derine", "Pratik"], ru: ["Дешифровка", "Глубже", "Практика"] },
  seeker: { en: ["Tell me more", "Which page?", "How does this connect?"], tr: ["Daha anlat", "Hangi sayfa?", "Nasıl bağlanır?"], ru: ["Расскажи", "Страница?", "Как?"] },
  quote: { en: ["Another transmission", "Decipher this", "Go deeper"], tr: ["Başka iletim", "Deşifre et", "Derine"], ru: ["Ещё", "Дешифруй", "Глубже"] },
};

type Msg = { role: "user" | "oracle"; text: string; mode?: string; audioUrl?: string; outputMode?: string };

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function encryptXeno(text: string): string {
  return text.toLowerCase().split("").map((char) => CIPHER_MAP[char] || char).join("");
}

function toLemurianText(text: string): string {
  return text.split("").map((char) => NUM_MAP[char] || char).join("");
}

function MobileBubble({ msg, modeColor, lang, outputMode }: { msg: Msg; modeColor: string; lang: string; outputMode: string }) {
  const t = T[lang] || T.en;
  const isOracle = msg.role === "oracle";
  const oMode = msg.outputMode || outputMode;
  const displayText = !isOracle ? msg.text : oMode === "xenolinguistic" ? encryptXeno(msg.text) : oMode === "lemurian" ? toLemurianText(msg.text) : msg.text;

  return (
    <div
      style={{
        padding: "14px 15px",
        borderRadius: 8,
        marginBottom: 12,
        border: `1px solid ${isOracle ? modeColor + "30" : "rgba(255,255,255,0.08)"}`,
        background: isOracle ? `${modeColor}14` : "rgba(255,255,255,0.03)",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 10,
          color: isOracle ? modeColor : "rgba(237,233,246,0.56)",
        }}
      >
        {isOracle ? t.oracleLabel : t.you}
      </div>
      <div
        style={{
          color: "rgba(237,233,246,0.92)",
          fontFamily: oMode === "lemurian" ? "'Times New Roman', serif" : "'Cormorant Garamond', serif",
          fontSize: oMode === "xenolinguistic" ? 19 : 17,
          lineHeight: oMode === "xenolinguistic" ? 1.95 : 1.72,
          letterSpacing: oMode === "xenolinguistic" ? "0.06em" : oMode === "lemurian" ? "0.1em" : "normal",
          wordBreak: "break-word",
        }}
      >
        {isOracle ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown> : <span>{msg.text}</span>}
      </div>
      {isOracle && msg.audioUrl ? <audio controls src={msg.audioUrl} style={{ width: "100%", marginTop: 12, height: 34 }} /> : null}
    </div>
  );
}

export default function OracleMobilePage() {
  const [mode, setMode] = useState("oracle");
  const [outputMode, setOutputMode] = useState("standard");
  const [lang, setLang] = useState("en");
  const [speed, setSpeed] = useState<"fast" | "deep">("fast");
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceGender, setVoiceGender] = useState<"f" | "m">("f");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const chatRef = useRef<HTMLDivElement>(null);

  const t = T[lang] || T.en;
  const currentMode = MODES.find((item) => item.id === mode) || MODES[0];
  const starters = useMemo(() => pickRandom(Q_POOL[mode] || Q_POOL.oracle, 4), [mode]);
  const followups = (FOLLOWUPS[mode] || FOLLOWUPS.oracle)[lang] || (FOLLOWUPS[mode] || FOLLOWUPS.oracle).en;

  useEffect(() => {
    const handle = (event: MouseEvent) => setMousePos({ x: event.clientX, y: event.clientY });
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const fetchTTS = useCallback(async (text: string) => {
    if (!voiceOn) return "";
    try {
      const response = await fetch("/api/oracle/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang, voice: voiceGender === "m" ? "standard" : "hd" }),
      });
      if (!response.ok) return "";
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return "";
    }
  }, [lang, voiceGender, voiceOn]);

  const send = useCallback(async (seedText?: string, forceMode?: string) => {
    const message = (seedText || input).trim();
    if (!message || loading) return;
    const useMode = forceMode || mode;

    setInput("");
    setMsgs((prev) => [...prev, { role: "user", text: message }]);
    setLoading(true);

    try {
      const response = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode: useMode, lang, speed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error || `Oracle API returned ${response.status}`);

      const answer = data.response || data.answer || "This transmission has not yet entered the archive.";
      const audioUrl = await fetchTTS(answer);
      setMsgs((prev) => [...prev, { role: "oracle", text: answer, mode: useMode, audioUrl, outputMode }]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The transmission was interrupted.";
      setMsgs((prev) => [...prev, { role: "oracle", text: detail, mode: useMode, outputMode }]);
    } finally {
      setLoading(false);
    }
  }, [fetchTTS, input, lang, loading, mode, outputMode, speed]);

  const decodeName = useCallback(() => {
    if (!nameInput.trim() || loading) return;
    const name = nameInput.trim().toUpperCase();
    setMode("etymology");
    void send(`Decode the name ${name} letter by letter using the alphabet ontology. Show the full table with Element, Shape, Chakra, Tarot, Rune, Alchemical, Hebrew, Deity for each letter. Then give the unified meaning and poetic definition.`, "etymology");
    setNameInput("");
  }, [loading, nameInput, send]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <>
      <CosmicBackground isProcessing={loading} mousePos={mousePos} />
      <div className="fixed inset-0 z-[5] pointer-events-none opacity-25 mix-blend-overlay" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)", backgroundSize: "100% 4px" }} />
      <main className="relative z-10 mx-auto min-h-screen max-w-md px-3 pb-36 pt-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(8,7,12,0.56)", backdropFilter: "blur(14px)", padding: "14px 14px 16px" }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(212,168,71,0.58)" }}>{t.mobileRoute}</span>
              <a href="/oracle/desktop" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(237,233,246,0.54)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 9px", background: "rgba(255,255,255,0.03)" }}>{t.desktopRoute}</a>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(212,168,71,0.45)", marginBottom: 12 }}>{t.subtitle}</p>
            <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 28, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(237,233,246,0.96)", marginBottom: 10 }}>{t.heading}</h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(237,233,246,0.76)" }}>{t.desc}</p>
          </div>
        </motion.div>

        <section style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(8,7,12,0.52)", backdropFilter: "blur(14px)", padding: 12 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(212,168,71,0.56)", marginBottom: 10 }}>{t.questionSeeds}</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
            {starters.map((seed, index) => (
              <button
                key={seed}
                onClick={() => void send(seed)}
                style={{
                  border: `1px solid ${MODES[index % MODES.length].c}55`,
                  borderRadius: 8,
                  padding: "11px 10px",
                  textAlign: "left",
                  background: `${MODES[index % MODES.length].c}12`,
                  color: "rgba(237,233,246,0.9)",
                  minHeight: 82,
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.14em", color: MODES[index % MODES.length].c, marginBottom: 8 }}>{String(index + 1).padStart(2, "0")}</div>
                <div style={{ fontSize: 14, lineHeight: 1.3 }}>{seed}</div>
              </button>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 12, border: "1px solid rgba(240,199,94,0.18)", borderRadius: 8, background: "linear-gradient(180deg, rgba(26,19,10,0.58), rgba(8,7,12,0.52))", backdropFilter: "blur(14px)", padding: 12 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(240,199,94,0.68)", marginBottom: 10 }}>{t.decodeName}</div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
            <input
              type="text"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); decodeName(); } }}
              placeholder={t.decodeName}
              style={{
                minWidth: 0,
                border: "1px solid rgba(240,199,94,0.18)",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                color: "rgba(237,233,246,0.92)",
                padding: "12px 13px",
                outline: "none",
              }}
            />
            <button
              onClick={decodeName}
              disabled={!nameInput.trim() || loading}
              style={{
                border: "1px solid rgba(240,199,94,0.4)",
                borderRadius: 8,
                background: "rgba(240,199,94,0.12)",
                color: "#f0c75e",
                padding: "0 14px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: !nameInput.trim() || loading ? 0.35 : 1,
              }}
            >
              {t.decodeBtn}
            </button>
          </div>
          <div style={{ marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: "0.1em", lineHeight: 1.5, textTransform: "uppercase", color: "rgba(240,199,94,0.42)" }}>{t.decodeHint}</div>
        </section>

        <section style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(8,7,12,0.52)", backdropFilter: "blur(14px)", padding: 12 }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              {MODES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  style={{
                    flex: "0 0 auto",
                    border: `1px solid ${mode === item.id ? item.c + "66" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 999,
                    padding: "8px 10px",
                    background: mode === item.id ? item.c + "12" : "rgba(255,255,255,0.03)",
                    color: mode === item.id ? item.c : "rgba(237,233,246,0.58)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.icon} {(item.label as Record<string, string>)[lang] || item.label.en}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingTop: 10 }}>
              {OUTPUT_MODES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setOutputMode(item.id)}
                  style={{
                    flex: "0 0 auto",
                    border: `1px solid ${outputMode === item.id ? item.c + "66" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 999,
                    padding: "7px 10px",
                    background: outputMode === item.id ? item.c + "12" : "rgba(255,255,255,0.03)",
                    color: outputMode === item.id ? "rgba(237,233,246,0.94)" : "rgba(237,233,246,0.58)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {(t as Record<string, string>)[item.label] || item.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(8,7,12,0.52)", backdropFilter: "blur(14px)", padding: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(237,233,246,0.44)", marginBottom: 6 }}>{t.engine}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setSpeed("fast")} style={{ flex: 1, border: `1px solid ${speed === "fast" ? "rgba(34,211,238,0.45)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "8px 0", background: speed === "fast" ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.03)", color: speed === "fast" ? "#22d3ee" : "rgba(237,233,246,0.54)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.12em" }}>{t.fast}</button>
                  <button onClick={() => setSpeed("deep")} style={{ flex: 1, border: `1px solid ${speed === "deep" ? "rgba(217,70,239,0.45)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "8px 0", background: speed === "deep" ? "rgba(217,70,239,0.12)" : "rgba(255,255,255,0.03)", color: speed === "deep" ? "#d946ef" : "rgba(237,233,246,0.54)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.12em" }}>{t.deep}</button>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(237,233,246,0.44)", marginBottom: 6 }}>{t.language}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["en", "tr", "ru"] as const).map((code) => (
                    <button key={code} onClick={() => setLang(code)} style={{ flex: 1, border: `1px solid ${lang === code ? "rgba(212,168,71,0.45)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "8px 0", background: lang === code ? "rgba(212,168,71,0.12)" : "rgba(255,255,255,0.03)", color: lang === code ? "#d4a847" : "rgba(237,233,246,0.54)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>{code}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => setVoiceOn((prev) => !prev)} style={{ flex: 1.4, border: `1px solid ${voiceOn ? "rgba(34,211,238,0.45)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "8px 10px", background: voiceOn ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.03)", color: voiceOn ? "#22d3ee" : "rgba(237,233,246,0.54)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>{t.voice}: {voiceOn ? "ON" : "OFF"}</button>
              <button onClick={() => setVoiceGender("f")} style={{ flex: 1, border: `1px solid ${voiceGender === "f" ? "rgba(212,168,71,0.45)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "8px 0", background: voiceGender === "f" ? "rgba(212,168,71,0.12)" : "rgba(255,255,255,0.03)", color: voiceGender === "f" ? "#d4a847" : "rgba(237,233,246,0.54)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.12em" }}>{t.female}</button>
              <button onClick={() => setVoiceGender("m")} style={{ flex: 1, border: `1px solid ${voiceGender === "m" ? "rgba(212,168,71,0.45)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "8px 0", background: voiceGender === "m" ? "rgba(212,168,71,0.12)" : "rgba(255,255,255,0.03)", color: voiceGender === "m" ? "#d4a847" : "rgba(237,233,246,0.54)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.12em" }}>{t.male}</button>
              <button onClick={() => setMsgs([])} style={{ flex: 0.8, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 0", background: "rgba(255,255,255,0.03)", color: "rgba(237,233,246,0.54)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.12em" }}>{t.clear}</button>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 12, border: `1px solid ${currentMode.c}22`, borderRadius: 8, background: "rgba(8,7,12,0.62)", backdropFilter: "blur(14px)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: currentMode.c }}>{t.oracleLabel}</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(237,233,246,0.9)" }}>{(currentMode.label as Record<string, string>)[lang] || currentMode.label.en}</div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(237,233,246,0.44)" }}>{loading ? (speed === "deep" ? t.deepProc : t.receiving) : t.begin}</div>
          </div>
          <div ref={chatRef} style={{ minHeight: 340, maxHeight: "52vh", overflowY: "auto", padding: 14 }}>
            {!msgs.length ? (
              <div style={{ minHeight: 260, display: "grid", placeItems: "center", textAlign: "center", color: "rgba(237,233,246,0.68)" }}>
                <div>
                  <div style={{ fontSize: 28, color: currentMode.c, marginBottom: 10 }}>{currentMode.icon}</div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, letterSpacing: "0.12em", textTransform: "uppercase" }}>{t.begin}</div>
                </div>
              </div>
            ) : null}
            {msgs.map((msg, index) => (
              <MobileBubble key={index} msg={msg} modeColor={MODES.find((item) => item.id === (msg.mode || mode))?.c || currentMode.c} lang={lang} outputMode={outputMode} />
            ))}
            {loading ? (
              <div style={{ padding: "14px 15px", borderRadius: 8, border: `1px solid ${currentMode.c}30`, background: `${currentMode.c}14`, color: currentMode.c, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                {t.oracleLabel} · {speed === "deep" ? t.deepProc : t.receiving}
              </div>
            ) : null}
            {msgs.length && !loading && msgs[msgs.length - 1]?.role === "oracle" ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {followups.map((item, index) => (
                  <button
                    key={`${item}-${index}`}
                    onClick={() => void send(item)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(237,233,246,0.6)",
                      padding: "8px 10px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 8,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>
        <section style={{ marginTop: 14, marginBottom: 10, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, background: "rgba(8,7,12,0.52)", backdropFilter: "blur(14px)", padding: 12 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(212,168,71,0.86)", marginBottom: 10 }}>{t.goDeeper}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href="https://www.vaultofarcana.com" style={{ flex: "1 1 150px", textAlign: "center", border: "1px solid rgba(217,70,239,0.24)", borderRadius: 8, padding: "11px 12px", background: "rgba(217,70,239,0.06)", color: "rgba(217,70,239,0.76)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}>{t.enterVault}</a>
            <a href="/store" style={{ flex: "1 1 140px", textAlign: "center", border: "1px solid rgba(212,168,71,0.24)", borderRadius: 8, padding: "11px 12px", background: "rgba(212,168,71,0.05)", color: "rgba(212,168,71,0.78)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}>{t.getBook}</a>
          </div>
        </section>
      </main>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, padding: "10px 12px 12px", background: "linear-gradient(180deg, rgba(2,1,3,0), rgba(2,1,3,0.84) 18%, rgba(2,1,3,0.96) 100%)" }}>
        <div style={{ maxWidth: 460, margin: "0 auto", border: `1px solid ${currentMode.c}22`, borderRadius: 8, background: "rgba(8,7,12,0.76)", backdropFilter: "blur(16px)", padding: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t.placeholder}
              style={{
                flex: 1,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                color: "rgba(237,233,246,0.92)",
                padding: "12px 13px",
                minHeight: 52,
                resize: "none",
                outline: "none",
              }}
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              style={{
                border: `1px solid ${currentMode.c}55`,
                borderRadius: 8,
                background: `${currentMode.c}16`,
                color: currentMode.c,
                padding: "0 16px",
                minHeight: 52,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: loading || !input.trim() ? 0.4 : 1,
              }}
            >
              {t.transmit}
            </button>
          </div>
          <div style={{ marginTop: 7, textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(237,233,246,0.34)" }}>{t.enterHint}</div>
        </div>
      </div>
    </>
  );
}
