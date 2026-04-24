"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import ZalgoText from "@/components/ui/ZalgoText";
import SectionReveal from "@/components/ui/SectionReveal";
import OracleCorrespondenceDock from "@/components/oracle/OracleCorrespondenceDock";
import { buildOracleCodexContext, codexRowCount } from "@/codex/oracle-context";

const CosmicBackground = dynamic(() => import("@/components/oracle/CosmicBackground"), { ssr: false });

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const ALIEN_CHARS = "⍙⍚⍎⍑⍧⍨⍪⍫⍬⍭⍮⍯⍰⍱⍲⍳⍴⍵⍶⍷⍸⍹⍺⎀⎁⎂⎃⎄⎅⎆⎇⎈⎉⎊⎋⎌⎍⎎⎏⎐⎑⎒⎓⎔⎕╭╮╯╰╱╲╳╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌";

const CIPHER_MAP: Record<string, string> = {
  a:'ᔑ', b:'ʖ', c:'ᓵ', d:'↸', e:'ᒷ', f:'⎓', g:'⊣', h:'⍑', i:'╎', j:'⋮',
  k:'ꖌ', l:'ꖎ', m:'ᒲ', n:'リ', o:'𝙹', p:'¡', q:'ᑑ', r:'∷', s:'ᓭ', t:'ℸ',
  u:'⚍', v:'⍊', w:'∴', x:'⌇', y:'ǁ', z:'⨅', ' ':' ', '.':'·', ',':'⸴',
  '?':'⸮', '!':'⁝', ':':'∵', ';':'⁞', '-':'⊢', "'":"'", '"':'ˮ',
};

// Number → Unicode (for Lemurian mode since CODEX_2.ttf has no digits)
const NUM_MAP: Record<string, string> = {
  '0':'◌', '1':'𐤀', '2':'𐤁', '3':'𐤂', '4':'𐤃', '5':'𐤄',
  '6':'𐤅', '7':'𐤆', '8':'𐤇', '9':'𐤈',
};
// V12_MERGE_ANCHOR
// KEY MAP: short key → human-readable label (ported from correspondence-codex-v12.html)
const KM: Record<string, string> = {
  sys: 'System', e: 'Entry',
  al: 'Alchemy', ar: 'Archetypes', co: 'Colors', cr: 'Crystals',
  de: 'Deities', el: 'Element', fr: 'Frequency', gm: 'Geomancy',
  ge: 'Geometry', ic: 'I Ching', ka: 'Kabbalah',
  lh: 'Hebrew Letter', ll: 'Latin Letter',
  ma: 'Major Arcana', my: 'Mayan',
  me: 'Metal', mi: 'Minor Arcana',
  no: 'Note', nu: 'Number',
  ph: 'Physiology', pl: 'Planet', pt: 'Plant',
  ps: 'Platonic Solid',
  vi: 'Shadow / Vice', vr: 'Virtue',
  zo: 'Zodiac', ch: 'Chakra',
};

// labelOf — resolves any short key to its KM display label (defaults to key)
function labelOf(key: string): string {
  return KM[key] ?? key;
}

// Small display-order set derived from KM keys (safe — all keys guaranteed to exist in KM)
const KM_KEYS = Object.keys(KM);

/* ═══════════════════════════════════════════════════════════
   i18n
   ═══════════════════════════════════════════════════════════ */
const T: Record<string, Record<string, string>> = {
  en: {
    subtitle: "[ Universal Transmissions · Codex Oracle ]", heading: "̵̊̚C̭̣̆̒o̯̻̊̇n̶̘̉̉s̝̀̾̚ů̙̻̈l̙̂̾̕t̯ ̸́̀O̤̼̊̀r̴̨̓̐ȃ̘̃̾ċ̗̺̏ĺ̡̇͂e̟",
    desc: "150 pages of xenolinguistic art, transcendent geometry, and hyperdimensional transmissions — decoded through five data layers, a pan-dimensional linguistic mystic, and a 1000+ entry correspondence codex. The dataset constantly evolving every day, the algorithm reinventing itself through a recursive novelty engine.",
    begin: "Begin with a question about the Codex", transmit: "TRANSMIT", placeholder: "Ask the Codex Oracle...",
    receiving: "RECEIVING TRANSMISSION", deepProc: "DEEP PROCESSING",
    engine: "Engine", fast: "FAST", deep: "DEEP", language: "Language", voice: "Voice", female: "FEMALE", male: "MALE",
    clear: "CLEAR",
    goDeeper: "Go Deeper", goDesc: "The Codex Oracle is one gateway. Vault of Arcana holds six living traditions — Tao, Tarot, Tantra, Entheogens, Dreamwalker, and the Codex — with more awakening.",
    enterVault: "Enter the Vault", getBook: "Get the Book",
    guestLimit: "Guest · {n}/10 today", freeLimit: "Free · {n}/25 today", initiateActive: "Initiate · Unlimited",
    upgrade: "UPGRADE", enterHint: "ENTER to send · SHIFT+ENTER for new line",
    you: "YOU", oracleLabel: "CODEX ORACLE",
    decodeName: "Energetic signature of your name", decodeBtn: "DECODE", decodeHint: "Type any name to reveal its letter-by-letter energetic decode",
    corrLink: "View in Correspondence Codex →",
    outputMode: "Output", normal: "STANDARD", xeno: "XENOLINGUISTIC", lemurian: "LEMURIAN",
    transmission: "Transmission", questionSeeds: "Question Seeds", transmissionWell: "Transmission Well", modeLens: "Mode Lens",
    voiceOn: "Voice On", voiceOff: "Voice Off",
    decodePortal: "Decode Your Name",
  },
  tr: {
    subtitle: "[ Evrensel İletimler · Kodeks Kehaneti ]", heading: "Kehânete Danış",
    desc: "150 sayfa ksenolinguistik sanat, aşkın geometri ve hiperboyutsal iletimler — beş veri katmanı, pan-boyutsal bir dilbilim mistiği ve 1000+ girişli bir korespondans kodeksi aracılığıyla çözümlenir. Veri kümesi her gün sürekli evrilir; algoritma kendini yinelemeli bir yenilik motoru içinde yeniden icat eder.",
    begin: "Kodeks hakkında bir soru ile başlayın", transmit: "İLET", placeholder: "Kodeks Kehanetine sor...",
    receiving: "İLETİM ALINIYOR", deepProc: "DERİN İŞLEM",
    engine: "Motor", fast: "HIZLI", deep: "DERİN", language: "Dil", voice: "Ses", female: "KADIN", male: "ERKEK",
    clear: "TEMİZLE",
    goDeeper: "Daha Derine", goDesc: "Kodeks Kehaneti tek bir kapıdır. Vault of Arcana altı canlı geleneği barındırır.",
    enterVault: "Kasaya Gir", getBook: "Kitabı Al",
    guestLimit: "Misafir · {n}/10 bugün", freeLimit: "Ücretsiz · {n}/25 bugün", initiateActive: "Mürit · Sınırsız",
    upgrade: "YÜKSELT", enterHint: "ENTER gönder · SHIFT+ENTER yeni satır",
    you: "SEN", oracleLabel: "KODEKS KEHANETİ",
    decodeName: "İsminin enerji imzası", decodeBtn: "ÇÖZ", decodeHint: "Harf harf enerji çözümlemesi için bir isim girin",
    corrLink: "Korrespondans Kodeksinde görüntüle →",
    outputMode: "Çıktı", normal: "STANDART", xeno: "KSENOLİNGÜİSTİK", lemurian: "LEMURYEN",
    transmission: "İletim", questionSeeds: "Soru Tohumları", transmissionWell: "İletim Kuyusu", modeLens: "Mod Merceği",
    voiceOn: "Ses Açık", voiceOff: "Ses Kapalı",
    decodePortal: "İsmini Çözümle",
  },
  ru: {
    subtitle: "[ Универсальные Трансляции · Оракул Кодекса ]", heading: "Обратиться к Оракулу",
    desc: "150 страниц ксенолингвистического искусства, трансцендентной геометрии и гиперпространственных передач — расшифрованных через пять слоев данных, пан-измерительного лингвистического мистика и кодекс соответствий на 1000+ записей. Набор данных постоянно развивается каждый день, а алгоритм заново изобретает себя через рекурсивный двигатель новизны.",
    begin: "Начните с вопроса о Кодексе", transmit: "ПЕРЕДАТЬ", placeholder: "Спросите Оракула Кодекса...",
    receiving: "ПРИЁМ ПЕРЕДАЧИ", deepProc: "ГЛУБОКАЯ ОБРАБОТКА",
    engine: "Движок", fast: "БЫСТРО", deep: "ГЛУБОКО", language: "Язык", voice: "Голос", female: "ЖЕНСКИЙ", male: "МУЖСКОЙ",
    clear: "ОЧИСТИТЬ",
    goDeeper: "Глубже", goDesc: "Оракул Кодекса — лишь одни врата.",
    enterVault: "Войти", getBook: "Книгу",
    guestLimit: "Гость · {n}/10", freeLimit: "Бесплатно · {n}/25", initiateActive: "Посвящённый · ∞",
    upgrade: "УЛУЧШИТЬ", enterHint: "ENTER отправить · SHIFT+ENTER строка",
    you: "ВЫ", oracleLabel: "ОРАКУЛ КОДЕКСА",
    decodeName: "Энергетическая подпись имени", decodeBtn: "РАСШИФРОВАТЬ", decodeHint: "Введите имя для побуквенной расшифровки",
    corrLink: "Открыть в Кодексе Соответствий →",
    outputMode: "Вывод", normal: "СТАНДАРТ", xeno: "КСЕНОЛИНГВИСТ", lemurian: "ЛЕМУРИЙСКИЙ",
    transmission: "Передача", questionSeeds: "Зерна Вопроса", transmissionWell: "Колодец Передачи", modeLens: "Линза Режима",
    voiceOn: "Голос Вкл", voiceOff: "Голос Выкл",
    decodePortal: "Расшифровать Имя",
  },
};

/* ═══════════════════════════════════════════════════════════
   MODES (existing + 2 new output modes)
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

const OUTPUT_MODES = [
  { id: "standard", label: "normal", c: "#22d3ee" },
  { id: "xenolinguistic", label: "xeno", c: "#d946ef" },
  { id: "lemurian", label: "lemurian", c: "#d4a847" },
];

const SEED_CARD_COLORS = ["#d946ef", "#22d3ee", "#d4a847", "#22c55e", "#f59e0b", "#ec4899"];

/* ═══════════════════════════════════════════════════════════
   QUESTION POOLS (unchanged)
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

type LatticeMeta = {
  status: "cold" | "loading" | "ready" | "offline";
  rows: number;
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function encryptXeno(text: string): string {
  return text.toLowerCase().split("").map(c => CIPHER_MAP[c] || c).join("");
}

function toLemurianText(text: string): string {
  return text.split("").map(c => {
    if (NUM_MAP[c]) return NUM_MAP[c];
    return c;
  }).join("");
}

/* ═══════════════════════════════════════════════════════════
   BOOT SEQUENCE — Xeno text decodes to English
   ═══════════════════════════════════════════════════════════ */
function BootDecryptLine({ text, active, done, delay }: { text: string; active: boolean; done: boolean; delay: number }) {
  const [display, setDisplay] = useState("");
  const [decrypted, setDecrypted] = useState(false);

  useEffect(() => {
    if (!active && !done) {
      setDisplay(text.replace(/./g, () => ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)]));
      return;
    }
    if (done) { setDisplay(text); setDecrypted(true); return; }

    let iteration = 0;
    const length = text.length;
    setDisplay(text.replace(/./g, () => ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)]));

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplay(
          text.split("").map((char, idx) => {
            if (idx < iteration) return char;
            return ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)];
          }).join("")
        );
        if (iteration >= length) { clearInterval(interval); setDecrypted(true); }
        iteration += 0.8;
      }, 25);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [active, done, text, delay]);

  return (
    <span className={`transition-all duration-500 ${decrypted ? "text-cyan-300" : active ? "text-fuchsia-400" : "text-white/20"}`}
      style={{ textShadow: active && !decrypted ? "0 0 20px rgba(217,70,239,0.8)" : decrypted ? "0 0 12px rgba(34,211,238,0.5)" : "none" }}>
      {display}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   DECRYPT TEXT — Oracle response decode animation
   with rainbow hue rotation
   ═══════════════════════════════════════════════════════════ */
function DecryptText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [display, setDisplay] = useState("");
  const [progress, setProgress] = useState(0);
  const [hue, setHue] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let iteration = 0;
    const length = text.length;
    let hueVal = 0;

    const interval = setInterval(() => {
      hueVal = (hueVal + 12) % 360; // Fast hue rotation
      setHue(hueVal);

      setDisplay(
        text.split("").map((char, idx) => {
          if (char === " ") return " ";
          if (idx < iteration) return char;
          return ALIEN_CHARS[Math.floor(Math.random() * ALIEN_CHARS.length)];
        }).join("")
      );

      setProgress(Math.min(iteration / length, 1));

      if (iteration >= length) {
        clearInterval(interval);
        setDisplay(text);
        setProgress(1);
        onCompleteRef.current?.();
      }
      iteration += 0.6;
    }, 18);

    return () => clearInterval(interval);
  }, [text]);

  const isComplete = progress >= 1;

  return (
    <span
      className="transition-all duration-300"
      style={{
        color: isComplete ? "var(--ut-white, #ede9f6)" : `hsl(${hue}, 85%, 70%)`,
        textShadow: isComplete
          ? "none"
          : `0 0 12px hsl(${hue}, 100%, 50%), 0 0 30px hsl(${(hue + 60) % 360}, 100%, 40%)`,
        filter: isComplete ? "none" : `hue-rotate(${hue}deg)`,
      }}
    >
      {display}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   GLITCH TITLE — mouse-reactive chromatic aberration
   ═══════════════════════════════════════════════════════════ */
function GlitchTitle({ text, mousePos }: { text: string; mousePos: { x: number; y: number } }) {
  const intensity = useMemo(() => {
    const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
    const cy = 200;
    const dist = Math.sqrt(Math.pow(mousePos.x - cx, 2) + Math.pow(mousePos.y - cy, 2));
    return Math.min(dist / 150, 6);
  }, [mousePos]);

  return (
    <span className="glitch-title-wrap relative inline-block">
      <span className="glitch-title-r absolute inset-0"
        style={{
          color: "#ff003c",
          clipPath: `inset(${Math.random() * 10}% 0 ${Math.random() * 10}% 0)`,
          transform: `translate(${intensity * 0.8}px, ${-intensity * 0.3}px)`,
          opacity: Math.min(intensity * 0.15, 0.6),
          mixBlendMode: "screen",
          transition: "transform 0.1s ease-out, opacity 0.15s",
        }}>
        <ZalgoText text={text} intensity="moderate" />
      </span>
      <span className="glitch-title-b absolute inset-0"
        style={{
          color: "#00e5ff",
          clipPath: `inset(${Math.random() * 10}% 0 ${Math.random() * 10}% 0)`,
          transform: `translate(${-intensity * 0.6}px, ${intensity * 0.4}px)`,
          opacity: Math.min(intensity * 0.12, 0.5),
          mixBlendMode: "screen",
          transition: "transform 0.1s ease-out, opacity 0.15s",
        }}>
        <ZalgoText text={text} intensity="moderate" />
      </span>
      <span className="relative z-10" style={{ color: "var(--ut-white, #ede9f6)" }}>
        <ZalgoText text={text} intensity="moderate" />
      </span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   FREQUENCY VISUALIZER — Organic waveform
   ═══════════════════════════════════════════════════════════ */
function ChromaticWavelength({ isActive, color }: { isActive: boolean; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(isActive);
  useEffect(() => { activeRef.current = isActive; }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    let animId = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const active = activeRef.current;
      ctx.clearRect(0, 0, w, h);
      time += active ? 0.085 : 0.018;

      const hue = (time * (active ? 180 : 45)) % 360;
      const layers = active ? 6 : 3;
      for (let l = 0; l < layers; l++) {
        const amp = active ? (18 + l * 5 + Math.sin(time * 2.4 + l) * 12) : (4 + l * 2 + Math.sin(time + l) * 2);
        const freq = 0.018 + l * 0.006;
        const phase = time * (1.8 + l * 0.38);
        const alpha = active ? (0.72 - l * 0.09) : (0.2 - l * 0.035);

        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        for (let x = 0; x <= w; x += 2) {
          const noise = Math.sin(x * 0.055 + time * 4.1 + l) * (active ? 5 : 1);
          const fold = Math.sin(x * 0.012 - time * 1.7 + l) * (active ? 8 : 2);
          const y = h / 2 + Math.sin(x * freq + phase) * amp + noise + fold;
          ctx.lineTo(x, y);
        }
        const layerHue = (hue + l * 46) % 360;
        ctx.strokeStyle = active
          ? `hsla(${layerHue}, 100%, ${62 + (l % 2) * 10}%, ${alpha})`
          : color + (Math.floor(alpha * 255)).toString(16).padStart(2, "0");
        ctx.lineWidth = active ? Math.max(0.75, 2.2 - l * 0.22) : 0.8;
        ctx.shadowBlur = active ? 24 : 6;
        ctx.shadowColor = active ? `hsl(${(layerHue + 24) % 360}, 100%, 62%)` : color;
        ctx.stroke();
      }

      // Center line glow
      if (active) {
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.18, `hsla(${hue},100%,62%,0.12)`);
        grad.addColorStop(0.5, `hsla(${(hue + 90) % 360},100%,68%,0.34)`);
        grad.addColorStop(0.82, `hsla(${(hue + 180) % 360},100%,62%,0.12)`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, h / 2 - 1, w, 2);
      }

      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [color]);

  return <canvas ref={canvasRef} width={900} height={110} className="w-full h-full chromatic-wave" />;
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
   CHAT BUBBLE — with decrypt animation + output mode support
   ═══════════════════════════════════════════════════════════ */
interface Msg { role: "user" | "oracle"; text: string; mode?: string; audioUrl?: string; outputMode?: string }

function ChatBubble({
  msg,
  modeColor,
  lang,
  outputMode,
  onDecodingChange,
}: {
  msg: Msg;
  modeColor: string;
  lang: string;
  outputMode: string;
  onDecodingChange?: (active: boolean) => void;
}) {
  const isOracle = msg.role === "oracle";
  const t = T[lang] || T.en;
  const ml = (MODES.find(m => m.id === msg.mode)?.label as Record<string, string>)?.[lang] || "ORACLE";
  const [decryptDone, setDecryptDone] = useState(false);
  const oMode = msg.outputMode || outputMode;

  // Determine display text based on output mode
  const displayText = useMemo(() => {
    if (!isOracle) return msg.text;
    if (oMode === "xenolinguistic") return encryptXeno(msg.text);
    return msg.text;
  }, [msg.text, isOracle, oMode]);

  const isLemurian = oMode === "lemurian" && isOracle;
  const isXeno = oMode === "xenolinguistic" && isOracle;
  const completeDecode = () => {
    setDecryptDone(true);
    onDecodingChange?.(false);
  };

  useEffect(() => {
    if (!isOracle || decryptDone || isLemurian) return;
    onDecodingChange?.(true);
    return () => onDecodingChange?.(false);
  }, [decryptDone, isLemurian, isOracle, onDecodingChange]);

  return (
    <motion.div initial={{ opacity: 0, y: 16, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.5 }}
      style={{ marginBottom: 24, position: "relative" }}>

      {/* Ambient glow line */}
      {isOracle && (
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${modeColor}44, transparent)` }} />
      )}

      <div style={{
        padding: "20px 24px",
        borderLeft: `2px solid ${isOracle ? modeColor + "55" : "rgba(34,211,238,0.15)"}`,
        background: isOracle ? modeColor + "08" : "rgba(34,211,238,0.02)",
        backdropFilter: "blur(8px)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Oracle scan line */}
        {isOracle && !decryptDone && (
          <div className="oracle-scan-line" style={{ background: `linear-gradient(90deg, transparent, ${modeColor}33, transparent)` }} />
        )}

        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: isOracle ? modeColor + "88" : "rgba(34,211,238,0.35)", marginBottom: 12 }}>
          {isOracle ? (
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                {t.oracleLabel} · {ml}
              </span>
              {isXeno && <span className="text-fuchsia-400/60">[ XENOLINGUISTIC ]</span>}
              {isLemurian && <span className="text-amber-400/60">[ LEMURIAN SCRIPT ]</span>}
            </span>
          ) : t.you}
        </div>

        <div style={{
          fontFamily: isLemurian ? "'CODEX2', 'Cormorant Garamond', serif" : "'Cormorant Garamond', serif",
          fontSize: isLemurian ? 22 : isXeno ? 20 : 17,
          lineHeight: isLemurian ? 2.2 : isXeno ? 2 : 1.8,
          color: isOracle ? "var(--ut-white, #ede9f6)" : "var(--ut-white-dim, #ede9f6aa)",
          letterSpacing: isLemurian ? "0.15em" : isXeno ? "0.08em" : "normal",
        }}>
          {isOracle ? (
            isXeno ? (
              // Xeno mode: decode into encrypted glyph text with subtle glow
              <span className="xeno-output" style={{ textShadow: `0 0 8px ${modeColor}66, 0 0 20px ${modeColor}22` }}>
                {decryptDone ? displayText : <DecryptText text={displayText} onComplete={completeDecode} />}
              </span>
            ) : isLemurian ? (
              // Lemurian mode: CODEX_2 font + number substitution
              <span className="lemurian-output" style={{ textShadow: `0 0 10px rgba(212,168,71,0.4), 0 0 30px rgba(212,168,71,0.15)` }}>
                {toLemurianText(displayText)}
              </span>
            ) : decryptDone ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            ) : (
              // Standard: decrypt animation
              <DecryptText text={displayText} onComplete={completeDecode} />
            )
          ) : (
            <span>{msg.text}</span>
          )}
        </div>

        {/* Xeno mode — provide original text toggle */}
        {isXeno && (
          <details className="mt-4 group">
            <summary className="font-mono text-[8px] tracking-widest cursor-pointer select-none"
              style={{ color: modeColor + "55" }}>
              ▸ PLAINTEXT TRANSLATION
            </summary>
            <div className="mt-2 pt-2 font-serif text-sm leading-relaxed" style={{ borderTop: `1px solid ${modeColor}15`, color: "var(--ut-white-dim, #ede9f6aa)" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            </div>
          </details>
        )}

        {/* Lemurian mode — provide original text toggle */}
        {isLemurian && (
          <details className="mt-4 group">
            <summary className="font-mono text-[8px] tracking-widest cursor-pointer select-none"
              style={{ color: "rgba(212,168,71,0.4)" }}>
              ▸ DECODE TO MODERN SCRIPT
            </summary>
            <div className="mt-2 pt-2 font-serif text-sm leading-relaxed" style={{ borderTop: "1px solid rgba(212,168,71,0.1)", color: "var(--ut-white-dim, #ede9f6aa)" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            </div>
          </details>
        )}

        {/* Standard mode — render markdown after decrypt */}
        {isOracle && msg.audioUrl && <AudioPlayer src={msg.audioUrl} color={modeColor} />}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function OraclePage() {
  const [booted, setBooted] = useState(false);
  const [bootPhase, setBootPhase] = useState(-1);
  const [mode, setMode] = useState("oracle");
  const [outputMode, setOutputMode] = useState("standard");
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [latticeMeta, setLatticeMeta] = useState<LatticeMeta>({ status: "cold", rows: 0 });
  const [answerAnimating, setAnswerAnimating] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const t = T[lang] || T.en;
  const currentMode = MODES.find(m => m.id === mode) || MODES[0];
  const followups = (FOLLOWUPS[mode] || FOLLOWUPS.oracle)[lang] || (FOLLOWUPS[mode] || FOLLOWUPS.oracle).en;
  const hasMessages = msgs.length > 0;
  const limit = tier === "initiate" ? Infinity : tier === "free" ? 25 : 10;
  const atLimit = questionsUsed >= limit;

  const starters = useMemo(() => pickRandom(Q_POOL[mode] || Q_POOL.oracle, 4), [mode]);

  /* ── Boot sequence ── */
  useEffect(() => {
    let current = 0;
    const total = 5;
    const interval = setInterval(() => {
      if (current < total) {
        setBootPhase(current);
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => setBooted(true), 1200);
      }
    }, 900);
    return () => clearInterval(interval);
  }, []);

  /* ── Mouse tracking ── */
  useEffect(() => {
    const handle = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  /* ── Scroll ── */
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    setLatticeMeta({ status: "ready", rows: codexRowCount() });
  }, []);

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
      let apiMessage = m;
      if (useMode === "correspondence") {
        try {
          const latticeContext = buildOracleCodexContext(m);
          if (latticeContext) {
            apiMessage = [
              `Question: ${m}`,
              "Use this shared COR CODEX data model as primary source material. Select only the strongest coherent correspondences and turn them into human symbolic intelligence, not an inventory dump.",
              latticeContext,
            ].join("\n\n");
          }
        } catch {
          setLatticeMeta((meta) => ({ ...meta, status: "offline" }));
        }
      }
      const res = await fetch("/api/oracle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: apiMessage, mode: useMode, lang, speed }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || `Oracle API returned ${res.status}`);
      }
      const answer = data.response || data.answer || "";
      const audioUrl = answer ? await fetchTTS(answer) : "";
      setMsgs(p => [...p, { role: "oracle", text: answer || "This transmission has not yet entered the archive.", mode: useMode, audioUrl, outputMode }]);
      setQuestionsUsed(q => q + 1);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      setMsgs(p => [...p, { role: "oracle", text: detail ? `The transmission was interrupted. ${detail}` : "The transmission was interrupted.", mode: useMode, outputMode }]);
    } finally { setLoading(false); }
  }, [input, mode, lang, speed, loading, atLimit, fetchTTS, outputMode]);

  const lastOracleText = useMemo(() => {
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i].role === "oracle") return msgs[i].text;
    }
    return "";
  }, [msgs]);

  const seedOracleFromDock = useCallback((prompt: string) => {
    setMode("correspondence");
    setInput(prompt);
  }, []);

  const askOracleFromDock = useCallback((prompt: string) => {
    setMode("correspondence");
    send(prompt, "correspondence");
  }, [send]);

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

  const BOOT_LINES = [
    "ESTABLISHING SECURE NEURAL LINK...",
    "CALIBRATING GINA'ABUL LINGUISTIC MATRIX...",
    "LOADING 577 CODEX CORRESPONDENCES...",
    "ALIGNING RUBIK LATTICE SURFACES...",
    "CODEX ORACLE TRANSMISSION ONLINE",
  ];

  /* ═══════════════════════════════════════════════
     BOOT SCREEN
     ═══════════════════════════════════════════════ */
  if (!booted) {
    return (
      <div className="h-screen w-screen bg-[#020103] flex flex-col items-center justify-center overflow-hidden relative">
        <CosmicBackground />
        {/* CRT overlay */}
        <div className="fixed inset-0 z-40 pointer-events-none opacity-20 mix-blend-overlay"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)", backgroundSize: "100% 4px" }} />
        <div className="fixed inset-0 z-40 pointer-events-none" style={{ boxShadow: "inset 0 0 120px rgba(0,0,0,0.9)" }} />

        <div className="max-w-2xl w-full px-8 relative z-10">
          {/* Fingerprint icon */}
          <div className="flex justify-center mb-10">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d946ef" strokeWidth="1" className="animate-pulse opacity-50">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          </div>

          {/* Boot lines */}
          <div className="space-y-5">
            {BOOT_LINES.map((line, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: bootPhase >= i ? 1 : 0.15, x: bootPhase >= i ? 0 : -30 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="font-mono text-sm md:text-base tracking-[0.15em] flex items-start gap-4">
                <span className="text-white/25 tabular-nums whitespace-nowrap">[{(i * 0.1234).toFixed(4)}]</span>
                <BootDecryptLine text={line} active={bootPhase === i} done={bootPhase > i} delay={200} />
              </motion.div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-10 h-px bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: "linear-gradient(90deg, #22d3ee, #d946ef, #d4a847)" }}
              initial={{ width: 0 }}
              animate={{ width: `${((bootPhase + 1) / 5) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: bootPhase >= 4 ? 1 : 0 }}
            className="text-center font-mono text-[9px] tracking-[0.4em] text-white/20 mt-6 uppercase">
            Xeno-Hexahedronal Nexium Matrix // Node 45632.9328.1
          </motion.p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     MAIN INTERFACE
     ═══════════════════════════════════════════════ */
  return (
    <>
      <CosmicBackground isProcessing={loading} mousePos={mousePos} />

      {/* Overlays */}
      <div className="fixed inset-0 z-[5] pointer-events-none opacity-25 mix-blend-overlay"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)", backgroundSize: "100% 4px" }} />
      <div className="fixed inset-0 z-[5] pointer-events-none" style={{ boxShadow: "inset 0 0 150px rgba(0,0,0,0.8)" }} />

      <main style={{ background: "transparent", position: "relative", zIndex: 1 }}>

        {/* ═══ Header ═══ */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="container-ut text-left pt-6 md:pt-8 pb-4 px-4 md:px-6 border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: "rgba(212,168,71,0.45)" }}>
            {t.subtitle}
          </p>
          <h1 className="font-display text-3xl md:text-5xl mb-3 uppercase tracking-[0.16em]">
            <GlitchTitle text={t.heading} mousePos={mousePos} />
          </h1>
          <p className="font-body text-sm md:text-base max-w-3xl" style={{ color: "var(--ut-white-dim, #ede9f688)", lineHeight: 1.6 }}>
            {t.desc}
          </p>

          {/* Frequency visualizer — always visible, reactive to loading state */}
        </motion.div>

        <motion.div className="oracle-flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.15 }}>

        {mode === "etymology" && (
          <div className="container-ut pb-4 oracle-decode-strip">
            <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
              <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") decodeName(); }}
                placeholder={t.decodeName}
                className="flex-1 bg-[rgba(17,15,26,0.5)] border px-4 py-2.5 font-body text-base outline-none transition-all focus:border-[rgba(240,199,94,0.3)]"
                style={{ borderColor: "rgba(240,199,94,0.15)", color: "var(--ut-white, #ede9f6)" }} />
              <button onClick={decodeName} disabled={!nameInput.trim()}
                className="font-heading text-[9px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-all"
                style={{ borderColor: "rgba(240,199,94,0.4)", color: "#f0c75e", background: "rgba(240,199,94,0.06)", opacity: nameInput.trim() ? 1 : 0.3 }}>
                {t.decodeBtn}
              </button>
            </div>
            <p className="text-center mt-2 font-mono text-[8px] tracking-wider" style={{ color: "rgba(240,199,94,0.3)" }}>{t.decodeHint}</p>
          </div>
        )}

        {/* ═══ Main Chat Area ═══ */}
        <div className="container-ut pb-6 oracle-chat-container">
          <OracleCorrespondenceDock
            color={currentMode.c}
            mode={mode}
            rows={latticeMeta.rows || codexRowCount()}
            status={latticeMeta.status}
            lastOracleText={lastOracleText}
            onSeedOracle={seedOracleFromDock}
            onAskOracle={askOracleFromDock}
            onSetMode={setMode}
          >
            <div className="oracle-oracle-column">
              <div className="oracle-inline-controls">
                <div className="oracle-inline-block">
                  <div className="oracle-shell-kicker">{t.transmission}</div>
                  <div className="oracle-inline-output-row">
                    {OUTPUT_MODES.map(om => (
                      <button key={om.id} onClick={() => setOutputMode(om.id)}
                        className="oracle-output-button"
                        data-active={outputMode === om.id ? "true" : "false"}
                        style={{ ["--rail-color" as any]: om.c } as React.CSSProperties}>
                        <span className="cdot" style={{ background: om.c, boxShadow: `0 0 5px ${om.c}` }} />
                        <strong>{(t as any)[om.label] || om.label.toUpperCase()}</strong>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="oracle-inline-block">
                  <div className="oracle-shell-kicker">{t.engine}</div>
                  <div className="oracle-rail-toggle-row">
                    <button onClick={() => setSpeed("fast")} data-active={speed === "fast"}>{t.fast}</button>
                    <button onClick={() => setSpeed("deep")} data-active={speed === "deep"}>{t.deep}</button>
                    {(["en", "tr", "ru"] as const).map(l => (
                      <button key={l} onClick={() => setLang(l)} data-active={lang === l}>{l.toUpperCase()}</button>
                    ))}
                    <button onClick={() => { setVoiceOn(!voiceOn); if (voiceOn) window.speechSynthesis?.cancel(); }} data-active={voiceOn}>{voiceOn ? t.voiceOn : t.voiceOff}</button>
                  </div>
                </div>
                <div className="oracle-inline-block oracle-inline-name">
                  <div className="oracle-shell-kicker">{t.decodePortal}</div>
                  <div className="oracle-inline-name-form">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") decodeName(); }}
                      placeholder={t.decodeName}
                      className="oracle-inline-name-input"
                    />
                    <button onClick={decodeName} disabled={!nameInput.trim()} className="oracle-inline-name-button">
                      {t.decodeBtn}
                    </button>
                  </div>
                  <p className="oracle-inline-name-hint">{t.decodeHint}</p>
                </div>
              </div>

              <div className="oracle-question-seed-deck" aria-label={t.questionSeeds}>
                <div className="oracle-question-seed-head">
                  <span>{t.questionSeeds}</span>
                  <em>{(currentMode.label as Record<string, string>)[lang] || (currentMode.label as Record<string, string>).en}</em>
                </div>
                <div className="oracle-question-seed-grid">
                  {starters.map((q, i) => {
                    const seedColor = SEED_CARD_COLORS[i % SEED_CARD_COLORS.length];
                    return (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        disabled={atLimit}
                        className="oracle-seed-button oracle-seed-card"
                        style={{ ["--seed-color" as any]: seedColor } as React.CSSProperties}
                      >
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <strong>{q}</strong>
                      </button>
                    );
                  })}
                </div>
              </div>

            {/* CENTER: Chat panel — glass morphism */}
            <div className="flex-1 overflow-hidden oracle-chat-glass-card" style={{
              border: `1px solid ${currentMode.c}12`,
              background: "rgba(8, 7, 12, 0.46)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: `0 0 60px ${currentMode.c}08, inset 0 0 40px rgba(0,0,0,0.3)`,
            }}>
              {/* Top edge glow */}
              <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${currentMode.c}33, transparent)` }} />
              <div className="oracle-chat-card-head">
                <div>
                  <div className="oracle-shell-kicker">{t.transmissionWell}</div>
                  <strong>{t.oracleLabel}</strong>
                </div>
                <div className="oracle-chat-current" style={{ color: currentMode.c, borderColor: currentMode.c + "44", background: currentMode.c + "08" }}>
                  <span>{currentMode.icon}</span>
                  <span>{(currentMode.label as Record<string, string>)[lang] || (currentMode.label as Record<string, string>).en}</span>
                </div>
              </div>
              <div className="oracle-spectrum-ribbon oracle-mode-ribbon">
                <span>{t.modeLens}</span>
                {MODES.map(mo => (
                  <button key={mo.id} onClick={() => setMode(mo.id)}
                    className="oracle-ribbon-mode"
                    data-active={mode === mo.id ? "true" : "false"}
                    style={{ ["--rail-color" as any]: mo.c } as React.CSSProperties}>
                    <span>{mo.icon}</span>
                    <strong>{(mo.label as Record<string, string>)[lang] || (mo.label as Record<string, string>).en}</strong>
                  </button>
                ))}
              </div>

              <div ref={chatRef} className="oracle-scroll" style={{ minHeight: 420, maxHeight: "min(680px, 62vh)", overflowY: "auto", padding: "24px 26px 14px" }}>
                {!hasMessages && (
                  <div className="text-center py-16">
                    <div style={{ width: 56, height: 56, margin: "0 auto 16px", border: `1px solid ${currentMode.c}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: `${currentMode.c}05` }}>
                      <span style={{ color: currentMode.c + "66" }}>{currentMode.icon}</span>
                    </div>
                    <p className="font-heading text-sm tracking-wider mb-5" style={{ color: "var(--ut-white-dim, #ede9f6aa)" }}>{t.begin}</p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto lg:hidden">
                      {starters.map(q => (
                        <button key={q} onClick={() => send(q)}
                          className="font-body text-sm px-4 py-2 border hover:border-[rgba(217,70,239,0.3)]"
                          style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}

                {msgs.map((m, i) => (
                  <ChatBubble key={i} msg={m} modeColor={MODES.find(x => x.id === (m.mode || mode))?.c || currentMode.c} lang={lang} outputMode={m.outputMode || outputMode} onDecodingChange={setAnswerAnimating} />
                ))}

                {/* Processing indicator */}
                {loading && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ padding: "20px 24px", marginBottom: 20, borderLeft: `2px solid ${currentMode.c}44`, background: currentMode.c + "06" }}>
                    <div className="font-mono text-[9px] tracking-[0.2em] mb-3 flex items-center gap-3" style={{ color: currentMode.c + "77" }}>
                      <span className="flex gap-1.5">
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ background: currentMode.c, animation: `oracleP 1.4s ease-in-out infinite`, animationDelay: `${d}s` }} />
                        ))}
                      </span>
                      {t.oracleLabel} · {speed === "deep" ? t.deepProc : t.receiving}...
                    </div>
                    {/* Mini frequency visualizer in loading state */}
                    <div className="h-8 opacity-60">
                      <ChromaticWavelength isActive={true} color={currentMode.c} />
                    </div>
                  </motion.div>
                )}

                {/* Mobile follow-ups */}
                {hasMessages && !loading && msgs[msgs.length - 1]?.role === "oracle" && (
                  <div className="lg:hidden flex flex-wrap gap-2 mt-2 mb-2">
                    {followups.map((f, i) => (
                      <button key={i} onClick={() => send(f)} className="font-mono text-[8px] tracking-widest uppercase px-3 py-1.5 border hover:border-[rgba(217,70,239,0.3)]"
                        style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{f}</button>
                    ))}
                    {(mode === "correspondence" || mode === "tarot_arcana" || mode === "oracle") && (
                      <a href="https://vaultofarcana.com/correspondence-engine" target="_blank" rel="noopener"
                        className="font-mono text-[8px] tracking-wider px-3 py-1.5 border" style={{ borderColor: "rgba(147,51,234,0.15)", color: "#9333ea", opacity: 0.7 }}>{t.corrLink}</a>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ Input ═══ */}
              <div style={{ padding: "0 24px 20px", borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                {atLimit && (
                  <div className="text-center py-3">
                    <span className="font-mono text-[9px]" style={{ color: "#f59e0b" }}>{tier === "guest" ? "Daily limit reached. Create a free account for 25/day." : "Daily limit reached."}</span>
                    {tier !== "initiate" && <a href="/pricing" className="ml-3 font-mono text-[9px] tracking-widest uppercase" style={{ color: "#d946ef" }}>{t.upgrade}</a>}
                  </div>
                )}
                <div className="flex gap-3 items-end mt-4">
                  <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={kd}
                    placeholder={t.placeholder} disabled={atLimit}
                    className="flex-1 bg-[rgba(17,15,26,0.4)] border px-4 py-3 font-body text-base resize-none outline-none transition-all focus:border-[rgba(217,70,239,0.25)]"
                    style={{ borderColor: "rgba(255,255,255,0.06)", minHeight: 48, color: "var(--ut-white, #ede9f6)", backdropFilter: "blur(8px)" }} />
                  <button onClick={() => send()} disabled={loading || !input.trim() || atLimit}
                    className="font-heading text-[10px] tracking-[0.2em] uppercase px-6 py-3 border transition-all relative overflow-hidden group"
                    style={{ borderColor: currentMode.c + "55", color: currentMode.c, background: currentMode.c + "08", opacity: loading || !input.trim() || atLimit ? 0.3 : 1, cursor: loading || !input.trim() || atLimit ? "not-allowed" : "pointer" }}>
                    <span className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative z-10">{t.transmit}</span>
                  </button>
                </div>
                <div className="mt-3 h-14 rounded-[6px] border border-white/5 bg-black/20 px-2 py-1 overflow-hidden">
                  <ChromaticWavelength isActive={loading || answerAnimating} color={currentMode.c} />
                </div>
                <div className="mt-2 text-center font-mono text-[8px] tracking-widest" style={{ color: "rgba(237,233,246,0.08)" }}>{t.enterHint}</div>
              </div>
            </div>

            </div>
          </OracleCorrespondenceDock>
        </div>

        {/* ═══ Settings ═══ */}
        <div className="container-ut pb-8 oracle-settings-strip">
          <div className="flex flex-wrap gap-4 md:gap-5 items-center justify-center">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{t.engine}</span>
              <button onClick={() => setSpeed("fast")} className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                style={{ borderColor: speed === "fast" ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.06)", color: speed === "fast" ? "#22d3ee" : "var(--ut-white-faint, rgba(237,233,246,0.25))", background: speed === "fast" ? "rgba(34,211,238,0.08)" : "transparent" }}>⚡ {t.fast}</button>
              <button onClick={() => setSpeed("deep")} className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                style={{ borderColor: speed === "deep" ? "rgba(147,51,234,0.5)" : "rgba(255,255,255,0.06)", color: speed === "deep" ? "#9333ea" : "var(--ut-white-faint, rgba(237,233,246,0.25))", background: speed === "deep" ? "rgba(147,51,234,0.08)" : "transparent" }}>◈ {t.deep}</button>
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{t.language}</span>
              {(["en", "tr", "ru"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} className="font-mono text-[9px] tracking-widest uppercase px-2.5 py-1.5 border transition-all"
                  style={{ borderColor: lang === l ? "var(--ut-magenta, #d946ef)44" : "rgba(255,255,255,0.06)", color: lang === l ? "var(--ut-magenta, #d946ef)" : "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{l.toUpperCase()}</button>
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{t.voice}</span>
              <button onClick={() => { setVoiceOn(!voiceOn); if (voiceOn) window.speechSynthesis?.cancel(); }} className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border transition-all"
                style={{ borderColor: voiceOn ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.06)", color: voiceOn ? "#22d3ee" : "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{voiceOn ? "🔊 ON" : "🔇 OFF"}</button>
              {voiceOn && (<>
                <button onClick={() => setVoiceGender("f")} className="font-mono text-[9px] px-2.5 py-1 border transition-all"
                  style={{ borderColor: voiceGender === "f" ? "rgba(212,168,71,0.4)" : "rgba(255,255,255,0.06)", color: voiceGender === "f" ? "#d4a847" : "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{t.female}</button>
                <button onClick={() => setVoiceGender("m")} className="font-mono text-[9px] px-2.5 py-1 border transition-all"
                  style={{ borderColor: voiceGender === "m" ? "rgba(212,168,71,0.4)" : "rgba(255,255,255,0.06)", color: voiceGender === "m" ? "#d4a847" : "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{t.male}</button>
              </>)}
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            <span className="font-mono text-[8px] tracking-widest" style={{ color: "rgba(212,168,71,0.45)" }}>
              {tier === "initiate" ? t.initiateActive : tier === "free" ? t.freeLimit.replace("{n}", String(questionsUsed)) : t.guestLimit.replace("{n}", String(questionsUsed))}
            </span>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />
            <button onClick={() => setMsgs([])} className="font-mono text-[8px] tracking-widest uppercase px-3 py-1.5 border transition-all hover:border-[rgba(255,255,255,0.15)]"
              style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--ut-white-faint, rgba(237,233,246,0.25))" }}>{t.clear}</button>
          </div>

          {/* Shell info line */}
          <div className="mt-3 flex justify-center">
            <div className="flex items-center gap-4">
              {["NODE 45632.9328.1", "·", "XENO-HEXAHEDRONAL NEXIUM MATRIX", "·", "COR CODEX v2.1"].map((segment, i) => (
                <span key={i}
                  style={{
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    fontSize: i === 0 || i === 4 ? '7px' : '6.5px',
                    letterSpacing: '0.38em',
                    textTransform: 'uppercase',
                    color: i % 2 === 0
                      ? 'rgba(237,233,246,0.07)'
                      : 'rgba(212,168,71,0.08)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                  {segment}
                </span>
              ))}
            </div>
          </div>
        </div>
        <SectionReveal>
          <div className="container-ut pb-20 text-center">
            <div className="sacred-divider mb-12" />
            <div className="font-heading text-xl tracking-widest mb-4" style={{ color: "var(--ut-gold, #d4a847)" }}>{t.goDeeper}</div>
            <p className="font-body text-base max-w-lg mx-auto mb-8" style={{ color: "var(--ut-white-dim, #ede9f6aa)", lineHeight: 1.7 }}>{t.goDesc}</p>
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

      {/* ═══ Styles ═══ */}
      <style>{`
        /* CODEX_2 Lemurian font */
        @font-face {
          font-family: 'CODEX2';
          src: url('/fonts/CODEX_2.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        /* Oracle animations */
        @keyframes oracleP {
          0%, 100% { opacity: 0.25; transform: scale(0.8); }
          50% { opacity: 0.9; transform: scale(1.2); }
        }

        @keyframes scanLine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .oracle-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          animation: scanLine 2s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }

        /* Xeno output glow pulse */
        .xeno-output {
          animation: xenoPulse 3s ease-in-out infinite;
        }
        @keyframes xenoPulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }

        /* Lemurian output sacred shimmer */
        .lemurian-output {
          animation: lemurianShimmer 4s ease-in-out infinite;
        }
        @keyframes lemurianShimmer {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.15); }
        }

        /* Scrollbar */
        .oracle-scroll::-webkit-scrollbar { width: 5px; }
        .oracle-scroll::-webkit-scrollbar-track { background: rgba(10,9,14,0.3); }
        .oracle-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #d946ef, #facc15, #22d3ee, #d946ef);
          background-size: 100% 300%;
          border-radius: 3px;
          animation: oracleScrollbarHue 2.2s linear infinite;
        }
        .oracle-scroll {
          scrollbar-width: thin;
          scrollbar-color: #d946ef rgba(10,9,14,0.3);
        }
        @keyframes oracleScrollbarHue {
          0% { background-position: 0% 0%; filter: hue-rotate(0deg); }
          100% { background-position: 0% 300%; filter: hue-rotate(360deg); }
        }
        .chromatic-wave {
          filter: saturate(1.6) contrast(1.2) drop-shadow(0 0 10px rgba(217,70,239,0.32));
        }

        .oracle-flow {
          display: flex;
          flex-direction: column;
        }
        .oracle-flow > * {
          order: 20;
        }
        .oracle-chat-container {
          order: 1;
          padding-top: 12px;
          width: min(1680px, calc(100vw - 48px));
          max-width: none !important;
        }
        .oracle-decode-strip {
          order: 3;
        }
        .oracle-settings-strip {
          order: 5;
          display: none;
        }
        .oracle-chat-container > .flex {
          align-items: stretch;
        }
        .oracle-chat-glass-card {
          position: relative;
          border-radius: 14px;
          min-width: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.035), 0 0 42px rgba(0,0,0,0.24);
        }
        .oracle-oracle-column {
          min-width: 0;
          display: grid;
          gap: 12px;
        }
        .oracle-inline-controls {
          display: grid;
          grid-template-columns: minmax(220px,.72fr) minmax(300px,1fr) minmax(280px,.92fr);
          gap: 10px;
        }
        .oracle-inline-block {
          min-width: 0;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(9,8,16,0.58), rgba(0,0,0,0.28));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 9px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .oracle-inline-name-form {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 7px;
        }
        .oracle-inline-name-input {
          min-width: 0;
          border: 1px solid rgba(240,199,94,0.16);
          border-radius: 8px;
          background: rgba(17,15,26,0.46);
          color: var(--ut-white, #ede9f6);
          padding: 10px 12px;
          outline: none;
          font-size: 14px;
          line-height: 1.2;
        }
        .oracle-inline-name-button {
          border: 1px solid rgba(240,199,94,0.34);
          border-radius: 8px;
          background: rgba(240,199,94,0.08);
          color: #f0c75e;
          padding: 0 14px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .oracle-inline-name-button:disabled {
          opacity: 0.35;
        }
        .oracle-inline-name-hint {
          margin-top: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.1em;
          line-height: 1.5;
          color: rgba(240,199,94,0.42);
          text-transform: uppercase;
        }
        .oracle-inline-output-row {
          display: flex;
          gap: 5px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .oracle-inline-output-row::-webkit-scrollbar {
          display: none;
        }
        .oracle-inline-output-row .oracle-output-button {
          flex: 0 0 auto;
        }
        .oracle-question-seed-deck {
          position: relative;
          z-index: 1;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          background:
            radial-gradient(circle at 12% 0%, rgba(34,211,238,0.08), transparent 34%),
            radial-gradient(circle at 92% 10%, rgba(217,70,239,0.11), transparent 34%),
            linear-gradient(180deg, rgba(9,8,16,0.58), rgba(0,0,0,0.28));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 12px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 0 30px rgba(0,0,0,0.16);
        }
        .oracle-question-seed-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .oracle-question-seed-head span,
        .oracle-question-seed-head em {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(212,168,71,0.58);
          font-style: normal;
        }
        .oracle-question-seed-head em {
          color: rgba(237,233,246,0.3);
          text-align: right;
        }
        .oracle-question-seed-grid {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 9px;
        }
        .oracle-chat-glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background:
            radial-gradient(circle at 18% 0%, rgba(34,211,238,0.08), transparent 32%),
            radial-gradient(circle at 88% 8%, rgba(217,70,239,0.12), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.035), transparent 26%);
        }
        .oracle-chat-card-head {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 18px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.055);
        }
        .oracle-chat-card-head strong {
          display: block;
          font-family: 'Cinzel', serif;
          font-size: 14px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(237,233,246,0.9);
        }
        .oracle-chat-current {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid;
          border-radius: 999px;
          padding: 7px 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .oracle-spectrum-ribbon {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 8px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          background: rgba(255,255,255,0.015);
          scrollbar-width: none;
        }
        .oracle-spectrum-ribbon::-webkit-scrollbar {
          display: none;
        }
        .oracle-spectrum-ribbon > span {
          flex-shrink: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(237,233,246,0.22);
        }
        .oracle-mode-ribbon {
          gap: 6px;
        }
        .oracle-ribbon-mode {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 999px;
          background: rgba(255,255,255,0.025);
          color: rgba(237,233,246,0.48);
          padding: 7px 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: all .18s ease;
        }
        .oracle-ribbon-mode[data-active='true'],
        .oracle-ribbon-mode:hover {
          border-color: color-mix(in srgb, var(--rail-color) 54%, transparent);
          color: rgba(237,233,246,0.94);
          background: color-mix(in srgb, var(--rail-color) 11%, transparent);
          box-shadow: 0 0 16px color-mix(in srgb, var(--rail-color) 14%, transparent);
        }
        .oracle-mobile-controls {
          display: none;
          position: relative;
          z-index: 1;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          background: rgba(0,0,0,0.18);
        }
        .oracle-mobile-mode-row {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .oracle-mobile-mode-row + .oracle-mobile-mode-row {
          margin-top: 7px;
        }
        .oracle-mobile-mode-row::-webkit-scrollbar {
          display: none;
        }
        .oracle-mobile-mode-row button {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 999px;
          background: rgba(255,255,255,0.025);
          color: rgba(237,233,246,0.48);
          padding: 7px 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .oracle-mobile-mode-row button[data-active='true'] {
          border-color: color-mix(in srgb, var(--rail-color) 54%, transparent);
          color: rgba(237,233,246,0.94);
          background: color-mix(in srgb, var(--rail-color) 11%, transparent);
        }
        .oracle-chat-rail {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(9,8,16,0.64), rgba(0,0,0,0.34));
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          padding: 12px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 0 28px rgba(0,0,0,0.18);
        }
        .oracle-rail-section {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 7px;
        }
        .oracle-rail-mode-stack,
        .oracle-output-stack {
          display: grid;
          gap: 6px;
        }
        .oracle-rail-mode,
        .oracle-output-button,
        .oracle-seed-button,
        .oracle-followup-button,
        .oracle-followup-link,
        .oracle-rail-toggle-row button,
        .oracle-rail-footer button {
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 8px;
          background: rgba(255,255,255,0.025);
          color: rgba(237,233,246,0.54);
          transition: border-color .18s ease, color .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .oracle-rail-mode,
        .oracle-output-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 9px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-align: left;
        }
        .oracle-rail-mode strong,
        .oracle-output-button strong {
          font-weight: 500;
        }
        .oracle-rail-mode[data-active='true'],
        .oracle-output-button[data-active='true'],
        .oracle-rail-mode:hover,
        .oracle-output-button:hover {
          border-color: color-mix(in srgb, var(--rail-color) 54%, transparent);
          color: rgba(237,233,246,0.95);
          background: color-mix(in srgb, var(--rail-color) 11%, transparent);
          box-shadow: 0 0 16px color-mix(in srgb, var(--rail-color) 14%, transparent);
        }
        .oracle-seed-button,
        .oracle-followup-button,
        .oracle-followup-link {
          display: block;
          width: 100%;
          padding: 9px 10px;
          text-align: left;
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          line-height: 1.25;
        }
        .oracle-seed-card {
          --seed-color: #d946ef;
          min-height: 92px;
          display: grid;
          align-content: space-between;
          gap: 12px;
          padding: 13px 14px;
          border-color: color-mix(in srgb, var(--seed-color) 45%, rgba(255,255,255,0.08));
          background:
            radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--seed-color) 22%, transparent), transparent 44%),
            linear-gradient(135deg, color-mix(in srgb, var(--seed-color) 10%, rgba(0,0,0,0.42)), rgba(0,0,0,0.24));
          box-shadow: inset 2px 0 0 color-mix(in srgb, var(--seed-color) 80%, transparent);
          color: rgba(237,233,246,0.82);
        }
        .oracle-seed-card span {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.18em;
          color: color-mix(in srgb, var(--seed-color) 76%, rgba(237,233,246,0.5));
        }
        .oracle-seed-card strong {
          font-weight: 500;
          color: rgba(237,233,246,0.9);
        }
        .oracle-followup-button,
        .oracle-followup-link {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .oracle-seed-button:hover,
        .oracle-followup-button:hover,
        .oracle-followup-link:hover {
          border-color: color-mix(in srgb, var(--seed-color, #d946ef) 70%, rgba(255,255,255,0.12));
          color: rgba(237,233,246,0.86);
          background: color-mix(in srgb, var(--seed-color, #d946ef) 12%, rgba(0,0,0,0.3));
        }
        .oracle-rail-toggle-row {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .oracle-rail-toggle-row button {
          flex: 1 1 auto;
          padding: 6px 7px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }
        .oracle-rail-toggle-row button[data-active='true'] {
          border-color: rgba(34,211,238,0.38);
          color: #22d3ee;
          background: rgba(34,211,238,0.07);
        }
        .oracle-live-results p,
        .oracle-rail-footer span {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.12em;
          line-height: 1.55;
          text-transform: uppercase;
          color: rgba(237,233,246,0.28);
        }
        .oracle-rail-footer {
          margin-top: auto;
          display: grid;
          gap: 7px;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 9px;
        }
        .oracle-rail-footer button {
          padding: 7px 9px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        @media (max-width: 1023px) {
          .oracle-chat-glass-card {
            border-radius: 12px;
          }
          .oracle-settings-strip {
            display: block;
          }
          .oracle-inline-controls {
            grid-template-columns: 1fr;
          }
          .oracle-question-seed-grid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
          .oracle-chat-container {
            width: min(100%, calc(100vw - 24px));
          }
        }
        @media (max-width: 640px) {
          .oracle-question-seed-grid {
            grid-template-columns: 1fr;
          }
          .oracle-seed-card {
            min-height: 74px;
          }
        }

        /* Glitch title */
        .glitch-title-wrap {
          cursor: default;
        }
        .glitch-title-wrap:hover .glitch-title-r,
        .glitch-title-wrap:hover .glitch-title-b {
          animation: glitchFlicker 0.3s ease-in-out;
        }
        @keyframes glitchFlicker {
          0%, 100% { opacity: 0; }
          10%, 30%, 50%, 70%, 90% { opacity: 0.6; }
          20%, 40%, 60%, 80% { opacity: 0; }
        }

        /* Output mode chips — v12 system */
        .chip {
          white-space: nowrap;
          padding: 5px 12px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: transparent;
          font-family: 'Cinzel', serif;
          font-size: 8px;
          letter-spacing: 0.12em;
          color: rgba(237, 233, 246, 0.32);
          cursor: pointer;
          border-radius: 20px;
          transition: all 0.18s;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .chip[data-active="true"] {
          border-color: var(--chip-color, #d946ef);
          color: #ede9f6;
          background: rgba(224, 64, 251, 0.07);
          box-shadow: 0 0 10px rgba(224, 64, 251, 0.18);
        }
        .chip .cdot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
          background: rgba(237, 233, 246, 0.2);
          transition: background 0.18s, box-shadow 0.18s;
        }
        .chip[data-active="true"] .cdot {
          background: var(--chip-color, #d946ef);
          box-shadow: 0 0 5px var(--chip-color, #d946ef);
        }
        .chip-bar {
          display: flex;
          gap: 5px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .chip-bar::-webkit-scrollbar { display: none; }

        .oracle-shell-wrap {
          position: relative;
        }
        .oracle-shell-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.95fr);
          gap: 12px;
          margin-top: 6px;
        }
        .oracle-shell-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(9,8,16,0.78), rgba(6,6,14,0.64));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 14px;
          padding: 14px 15px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 0 30px rgba(0,0,0,0.18);
        }
        .oracle-shell-card::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at top right, rgba(217,70,239,0.12), transparent 35%), radial-gradient(circle at bottom left, rgba(0,212,255,0.08), transparent 28%);
          opacity: 0.9;
        }
        .oracle-shell-kicker {
          position: relative;
          z-index: 1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgba(212,168,71,0.56);
          margin-bottom: 8px;
        }
        .oracle-shell-title-row {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .oracle-shell-title {
          font-family: 'Cinzel', serif;
          font-size: 15px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(237,233,246,0.92);
        }
        .oracle-shell-status {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(237,233,246,0.4);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.03);
        }
        .oracle-shell-status[data-processing='true'] {
          color: #d946ef;
          border-color: rgba(217,70,239,0.28);
          box-shadow: 0 0 16px rgba(217,70,239,0.14);
        }
        .oracle-shell-copy {
          position: relative;
          z-index: 1;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          line-height: 1.62;
          color: rgba(237,233,246,0.72);
          max-width: 46rem;
        }
        .oracle-shell-stats {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
        .oracle-stat {
          min-width: 78px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.025);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .oracle-stat-n {
          font-family: 'Cinzel', serif;
          font-size: 16px;
          line-height: 1;
          color: #e040fb;
        }
        .oracle-stat-l {
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(237,233,246,0.34);
        }
        .oracle-shell-chips {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .oracle-shell-chip {
          --shell-accent: #d946ef;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          color: rgba(237,233,246,0.56);
          font-family: 'Cinzel', serif;
          font-size: 8px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          transition: all 0.18s ease;
        }
        .oracle-shell-chip-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--shell-accent);
          box-shadow: 0 0 8px var(--shell-accent);
          opacity: 0.85;
        }
        .oracle-shell-chip[data-active='true'] {
          border-color: color-mix(in srgb, var(--shell-accent) 55%, transparent);
          color: rgba(237,233,246,0.96);
          background: color-mix(in srgb, var(--shell-accent) 12%, transparent);
          box-shadow: 0 0 18px color-mix(in srgb, var(--shell-accent) 18%, transparent);
        }
        .oracle-shell-footnote {
          position: relative;
          z-index: 1;
          margin-top: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 7px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(237,233,246,0.28);
          line-height: 1.5;
        }
        @media (max-width: 920px) {
          .oracle-shell-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .oracle-shell-card { padding: 12px 12px; }
          .oracle-shell-title { font-size: 13px; }
          .oracle-shell-copy { font-size: 13px; }
          .oracle-shell-stats { gap: 8px; }
          .oracle-stat { min-width: calc(33.333% - 6px); flex: 1 1 0; }
        }

        /* Selection colors */
        ::selection {
          background: rgba(34, 211, 238, 0.2);
          color: #22d3ee;
        }
      `}</style>
    </>
  );

}
