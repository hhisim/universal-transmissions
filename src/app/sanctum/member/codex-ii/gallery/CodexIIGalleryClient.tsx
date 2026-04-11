"use client";

import { useState, useEffect, useRef } from "react";
import ZalgoText from "@/components/ui/ZalgoText";
import SectionReveal from "@/components/ui/SectionReveal";
import { ChevronLeft, ChevronRight, X, ZoomIn, Calendar, Tag } from "lucide-react";

// ─── CODEX2 Gallery Data — mapped to actual compressed images ─────────────────
const GALLERY_ITEMS = [
  {
    id: 1,
    page: 151,
    glyph: "A",
    category: "Foundation",
    title: "The First Grid Studies",
    date: "March 2025",
    description: "Early explorations of the 60-cell structure before any digital work. Pure pencil on paper — the genesis of every form that followed.",
    tags: ["foundation", "process", "pencil"],
  },
  {
    id: 2,
    page: 152,
    glyph: "B",
    category: "Frequency Mapping",
    title: "Cymatic Test Series — 528Hz",
    date: "April 2025",
    description: "Testing the 528Hz frequency against the primary geometric forms. How does the Tonoscope respond to the 'Miracle' frequency? Every cell was tested against this resonance.",
    tags: ["frequency", "528Hz", "cymatics"],
  },
  {
    id: 3,
    page: 153,
    glyph: "C",
    category: "Early Renders",
    title: "The First Digital Approximations",
    date: "April 2025",
    description: "The transition from paper to screen. Raw renders, before color grading, before the cymatic encoding — the geometry alone, stripped of everything ornamental.",
    tags: ["digital", "renders", "foundation"],
  },
  {
    id: 4,
    page: 154,
    glyph: "D",
    category: "Symbol Development",
    title: "From Glyph to Geometry",
    date: "April 2025",
    description: "How individual xenolinguistic glyphs evolved across the Codex II series. Each symbol had to pass through the cymatic filter before it was accepted into the final system.",
    tags: ["glyphs", "symbols", "xenolinguistics"],
  },
  {
    id: 5,
    page: 155,
    glyph: "E",
    category: "Color Studies",
    title: "The Spectral Palette",
    date: "May 2025",
    description: "Color palette explorations — which frequencies correspond to which spectral ranges, and why. A map of the full chromatic territory before decisions were made.",
    tags: ["color", "palette", "spectral"],
  },
  {
    id: 6,
    page: 156,
    glyph: "F",
    category: "Rejected Concepts",
    title: "The Discarded Series",
    date: "May 2025",
    description: "Forms that didn't make it into the final Codex. Every artist discards — here is the archaeology of those decisions, preserved in the raw state they were abandoned.",
    tags: ["rejected", "process", "behind-the-scenes"],
  },
  {
    id: 7,
    page: 157,
    glyph: "G",
    category: "Process Notes",
    title: "The Logic of Rejection",
    date: "May 2025",
    description: "What makes a form worth keeping versus discarding? The internal criteria, the aesthetic philosophy, the reasons — documented as they were formed in real-time.",
    tags: ["notes", "process", "philosophy"],
  },
  {
    id: 8,
    page: 158,
    glyph: "H",
    category: "Mathematical Notes",
    title: "The 60-Cell Structure",
    date: "June 2025",
    description: "Raw mathematical working documents — the geometry that underlies every Codex II piece. The 60-cell form was not chosen casually; it was arrived at through months of structural analysis.",
    tags: ["mathematics", "geometry", "structure"],
  },
  {
    id: 9,
    page: 159,
    glyph: "I",
    category: "Breakthrough Moments",
    title: "The Night It Came Together",
    date: "June 2025",
    description: "The moment when the entire system clicked — documented in real-time as it happened. Every piece of research suddenly resolving into a single coherent visual language.",
    tags: ["breakthrough", "milestone", "revelation"],
  },
  {
    id: 10,
    page: 160,
    glyph: "J",
    category: "Symbol Development",
    title: "The Xenolinguistic Cipher",
    date: "June 2025",
    description: "The development of the translinguistic glyph system — how the xenolinguistic alphabet was mapped onto the 60-cell geometry, creating a language that speaks geometry.",
    tags: ["xenolinguistics", "cipher", "language"],
  },
  {
    id: 11,
    page: 161,
    glyph: "K",
    category: "Doubts & Revisions",
    title: "The Second Thoughts",
    date: "July 2025",
    description: "Every piece was second-guessed at least once. The moments of doubt and what was done about them — including the pieces that were almost right, and the decisions that saved them.",
    tags: ["doubt", "revisions", "process"],
  },
  {
    id: 12,
    page: 162,
    glyph: "L",
    category: "Frequency Mapping",
    title: "Sacred Frequency Encoding",
    date: "July 2025",
    description: "The process of encoding the ten sacred frequencies into the visual field. Each geometry form carries its corresponding frequency signature — audible and visible.",
    tags: ["frequency", "encoding", "sacred"],
  },
  {
    id: 13,
    page: 163,
    glyph: "M",
    category: "Color Studies",
    title: "The Final Palette",
    date: "July 2025",
    description: "The resolved color system — a full chromatic mapping that ties every frequency to its spectral counterpart. The palette emerged only after the full geometry was confirmed.",
    tags: ["color", "final", "chromatic"],
  },
  {
    id: 14,
    page: 164,
    glyph: "N",
    category: "Early Renders",
    title: "Pre-Cymatic Versions",
    date: "August 2025",
    description: "The versions before cymatic encoding — before the frequency data was layered onto the geometry. Some of these were better. Some were not. All were necessary.",
    tags: ["renders", "pre-cymatic", "versions"],
  },
  {
    id: 15,
    page: 165,
    glyph: "O",
    category: "Breakthrough Moments",
    title: "The Breakthrough Series",
    date: "August 2025",
    description: "The series of images that marked the turning point — where the system stopped being a collection of ideas and became a unified visual language. The point of no return.",
    tags: ["breakthrough", "series", "turning point"],
  },
  {
    id: 16,
    page: 166,
    glyph: "P",
    category: "Foundation",
    title: "The Architecture of Codex II",
    date: "August 2025",
    description: "An overview of the full structural framework — how all 23 pages connect, relate, and speak to each other as a complete system rather than individual pieces.",
    tags: ["architecture", "structure", "overview"],
  },
  {
    id: 17,
    page: 167,
    glyph: "Q",
    category: "Symbol Development",
    title: "Glyph Refinements",
    date: "September 2025",
    description: "The refinement phase — where rough glyph ideas became the precise geometric markers that identify each element in the system. The difference between a symbol and a glyph.",
    tags: ["glyphs", "refinement", "precision"],
  },
  {
    id: 18,
    page: 168,
    glyph: "R",
    category: "Breakthrough Moments",
    title: "The Breathing Page",
    date: "September 2025",
    description: "Page 168 — the 'breathing' version. The augmented reality dimension beginning to emerge. Where the static image becomes alive when you know how to look.",
    tags: ["AR", "breathing", "augmented reality"],
  },
  {
    id: 19,
    page: 169,
    glyph: "S",
    category: "Rejected Concepts",
    title: "The Almost-Finals",
    date: "October 2025",
    description: "Pieces that were nearly done — finished in every way except the one that mattered. The final distance between good and right, documented in the differences.",
    tags: ["almost-final", "rejected", "refinement"],
  },
  {
    id: 20,
    page: 170,
    glyph: "T",
    category: "Process Notes",
    title: "Working Notes — October",
    date: "October 2025",
    description: "The last stage of working notes — the final decisions, the last-minute changes, the things that had to be right even if no one else would notice.",
    tags: ["notes", "final", "documentation"],
  },
  {
    id: 21,
    page: 171,
    glyph: "U",
    category: "Mathematical Notes",
    title: "The 60-Cell — Final Form",
    date: "October 2025",
    description: "The resolved mathematical structure — everything confirmed, everything consistent, the geometry locked into its final, irreducible form. The foundation for all that follows.",
    tags: ["geometry", "60-cell", "final"],
  },
  {
    id: 22,
    page: 172,
    glyph: "V",
    category: "Color Studies",
    title: "Final Color Grades",
    date: "November 2025",
    description: "The final color grading pass — the last layer of decision-making on every piece. Color is not decoration. It is the frequency made visible.",
    tags: ["color", "final grade", "chromatic"],
  },
  {
    id: 23,
    page: 173,
    glyph: "W",
    category: "Foundation",
    title: "The Codex II Complete",
    date: "November 2025",
    description: "Page 173 — the completion marker. The final statement of the entire system. Every frequency encoded. Every geometry resolved. Every symbol grounded in cymatic data.",
    tags: ["completion", "final", "codex II"],
  },
];

// UTGLYPH character map — maps glyph letters to their image files
const GLYPH_MAP: Record<string, string> = {
  A: "a-(10).png", B: "b-(10).png", C: "c-(10).png",
  D: "d-(10).png", E: "e-(10).png", F: "f-(10).png",
  G: "g-(10).png", H: "h-(10).png", I: "i-(10).png",
  J: "j-(10).png", K: "k-(10).png", L: "l-(10).png",
  M: "m-(10).png", N: "n-(10).png", O: "o-(10).png",
  P: "p-(10).png", Q: "q-(10).png", R: "r-(10).png",
  S: "s-(10).png", T: "t-(10).png", U: "u-(10).png",
  V: "v-(10).png", W: "w-(10).png", X: "x-(10).png",
  Y: "y-(10).png", Z: "z-(10).png",
};

const CATEGORIES = ["All", "Foundation", "Frequency Mapping", "Early Renders", "Symbol Development", "Color Studies", "Rejected Concepts", "Process Notes", "Mathematical Notes", "Breakthrough Moments", "Doubts & Revisions"];

export default function CodexIIGalleryClient() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const [hoveredGlyph, setHoveredGlyph] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = selectedCategory === "All"
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((i) => i.category === selectedCategory);

  const navigate = (dir: 1 | -1) => {
    if (lightboxIndex === null) return;
    const newIndex = (lightboxIndex + dir + filtered.length) % filtered.length;
    setLightboxIndex(newIndex);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, filtered.length]);

  const current = lightboxIndex !== null ? filtered[lightboxIndex] : null;
  const currentGlyphFile = current ? GLYPH_MAP[current.glyph] : null;

  return (
    <>
      <style>{`
        @keyframes glyphFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes glyphPulse {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.12; }
        }
        @keyframes glyphDrift {
          0% { transform: translateX(0px); }
          100% { transform: translateX(40px); }
        }
        @keyframes pageReveal {
          from { clip-path: inset(0 100% 0 0); opacity: 0; }
          to { clip-path: inset(0 0% 0 0); opacity: 1; }
        }
        @keyframes scanLine {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        .glyph-decor { animation: glyphPulse 4s ease-in-out infinite; }
        .glyph-drift { animation: glyphDrift 20s linear infinite; }
        .glyph-float { animation: glyphFloat 6s ease-in-out infinite; }
        .page-reveal { animation: pageReveal 0.8s ease-out forwards; }
        .scanline::after {
          content: '';
          position: absolute;
          left: 0; width: 100%; height: 2px;
          background: linear-gradient(to right, transparent, rgba(217,70,239,0.3), transparent);
          animation: scanLine 3s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <main className="pt-24 pb-20 min-h-screen" style={{ background: "var(--ut-black)" }}>

        {/* ── BACKGROUND GLYPH GRID ─────────────────── */}
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden z-0"
          aria-hidden="true"
        >
          {/* Scattered glyphs as watermark decorations */}
          {["A","B","C","D","E","F","G","H","I","J"].map((g, i) => (
            <div
              key={g}
              className="absolute glyph-decor"
              style={{
                left: `${5 + i * 10}%`,
                top: `${10 + (i % 3) * 30}%`,
                opacity: 0.05,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              <img
                src={`/images/utglyphs/${GLYPH_MAP[g]}`}
                alt=""
                width={80}
                height={80}
                style={{ objectFit: "contain" }}
              />
            </div>
          ))}
          {["K","L","M","N","O","P","Q","R","S","T"].map((g, i) => (
            <div
              key={g}
              className="absolute glyph-drift"
              style={{
                right: `${5 + i * 9}%`,
                top: `${15 + (i % 4) * 22}%`,
                opacity: 0.04,
                animationDelay: `${i * 0.6}s`,
              }}
            >
              <img
                src={`/images/utglyphs/${GLYPH_MAP[g]}`}
                alt=""
                width={100}
                height={100}
                style={{ objectFit: "contain" }}
              />
            </div>
          ))}
        </div>

        {/* ── HEADER ─────────────────────────────────── */}
        <section
          className="py-20 relative"
          style={{ borderBottom: "1px solid rgba(217,70,239,0.08)", zIndex: 1 }}
        >
          {/* Glyph watermark behind title */}
          <div
            className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5 glyph-float hidden lg:block"
            style={{ animationDelay: "0.5s" }}
          >
            <img
              src="/images/utglyphs/s-(10).png"
              alt=""
              width={200}
              height={200}
              style={{ objectFit: "contain" }}
            />
          </div>

          <div className="container-ut">
            <SectionReveal>
              {/* Glyph identifier for section label */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/images/utglyphs/a-(10).png"
                  alt=""
                  width={24}
                  height={24}
                  style={{ opacity: 0.6, objectFit: "contain" }}
                />
                <span className="font-mono text-[9px] tracking-[0.5em] uppercase" style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>
                  [ Codex II · Process Archive ]
                </span>
                <span className="font-mono text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-full border" style={{ borderColor: "rgba(212,168,71,0.4)", color: "var(--ut-gold)" }}>
                  Initiate+
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl mb-4" style={{ color: "var(--ut-magenta)" }}>
                <ZalgoText text="Behind the Veil" intensity="moderate" />
              </h1>

              <p className="font-body text-base max-w-2xl leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                Hakan&apos;s process journal — raw working documents, abandoned sketches, breakthrough moments,
                and the logic behind every decision made in the creation of Codex Vol. II.
                <span className="font-mono text-xs ml-3" style={{ color: "var(--ut-gold)", opacity: 0.4 }}>
                  {GALLERY_ITEMS.length} pages · {new Date().getFullYear()}
                </span>
              </p>

              {/* Scroll hint */}
              <div className="flex items-center gap-2">
                <img src="/images/utglyphs/b-(10).png" alt="" width={16} height={16} style={{ opacity: 0.4, objectFit: "contain" }} />
                <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                  Scroll to explore · Click any page to open
                </span>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── CATEGORY FILTER ──────────────────────── */}
        <section className="py-8 relative" style={{ zIndex: 1 }}>
          <div className="container-ut">
            <div className="flex gap-2 flex-wrap mb-8">
              {CATEGORIES.map((cat, i) => {
                const glyph = String.fromCharCode(65 + i); // A, B, C...
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="ut-btn px-4 py-2 font-mono text-[10px] uppercase flex items-center gap-2"
                    style={{
                      borderColor: selectedCategory === cat ? "var(--ut-magenta)" : "rgba(217,70,239,0.15)",
                      color: selectedCategory === cat ? "var(--ut-magenta)" : "var(--ut-white-dim)",
                      background: selectedCategory === cat ? "rgba(217,70,239,0.12)" : "transparent",
                      opacity: selectedCategory === cat ? 1 : 0.45,
                    }}
                  >
                    {cat !== "All" && (
                      <img
                        src={`/images/utglyphs/${glyph.toLowerCase()}-(10).png`}
                        alt=""
                        width={12}
                        height={12}
                        style={{ objectFit: "contain", opacity: selectedCategory === cat ? 0.8 : 0.4 }}
                      />
                    )}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PAGE GRID ────────────────────────────── */}
        <section className="pb-16 relative" style={{ zIndex: 1 }}>
          <div className="container-ut">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((item, i) => {
                const imgSrc = `/images/codex2/page-${item.page}.jpg`;
                const glyphSrc = GLYPH_MAP[item.glyph]
                  ? `/images/utglyphs/${GLYPH_MAP[item.glyph]}`
                  : null;
                const loaded = imageLoaded[item.id];

                return (
                  <SectionReveal key={item.id} delay={i * 0.04}>
                    <div
                      className="ut-card overflow-hidden group cursor-pointer transition-all hover:-translate-y-2 relative"
                      style={{
                        borderColor: "rgba(217,70,239,0.12)",
                        transition: "all 0.3s ease",
                      }}
                      onClick={() => setLightboxIndex(i)}
                    >
                      {/* Image */}
                      <div
                        className="relative w-full aspect-[3/4] overflow-hidden"
                        style={{ background: "linear-gradient(135deg, rgba(217,70,239,0.06) 0%, rgba(34,211,238,0.02) 100%)" }}
                      >
                        {/* Loading shimmer */}
                        {!loaded && (
                          <div
                            className="absolute inset-0 animate-pulse"
                            style={{ background: "linear-gradient(90deg, rgba(217,70,239,0.04) 0%, rgba(217,70,239,0.08) 50%, rgba(217,70,239,0.04) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }}
                          />
                        )}

                        <img
                          src={imgSrc}
                          alt={`Page ${item.page} — ${item.title}`}
                          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                          style={{ opacity: loaded ? 1 : 0 }}
                          onLoad={() => setImageLoaded(prev => ({ ...prev, [item.id]: true }))}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />

                        {/* Glyph watermark on hover */}
                        {glyphSrc && (
                          <div
                            className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
                            style={{ opacity: 0, transition: "opacity 0.3s" }}
                            onMouseEnter={() => setHoveredGlyph(item.glyph)}
                            onMouseLeave={() => setHoveredGlyph(null)}
                          >
                            <img
                              src={glyphSrc}
                              alt=""
                              width={80}
                              height={80}
                              className="object-contain opacity-20 group-hover:opacity-40 transition-opacity duration-300"
                            />
                          </div>
                        )}

                        {/* Page number badge */}
                        <div
                          className="absolute top-3 left-3 px-3 py-1 flex items-center gap-2"
                          style={{
                            background: "rgba(0,0,0,0.7)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(217,70,239,0.3)",
                          }}
                        >
                          {glyphSrc && (
                            <img src={glyphSrc} alt="" width={12} height={12} style={{ objectFit: "contain", opacity: 0.7 }} />
                          )}
                          <span className="font-mono text-[9px] tracking-widest" style={{ color: "var(--ut-magenta)" }}>
                            {String(item.page).padStart(3, "0")}
                          </span>
                        </div>

                        {/* Zoom hint */}
                        <div
                          className="absolute bottom-3 right-3 p-2 transition-all duration-300 group-hover:opacity-100"
                          style={{
                            background: "rgba(0,0,0,0.6)",
                            backdropFilter: "blur(6px)",
                            opacity: 0,
                          }}
                        >
                          <ZoomIn size={14} style={{ color: "var(--ut-magenta)" }} />
                        </div>

                        {/* Hover scanline effect */}
                        <div className="absolute inset-0 scanline pointer-events-none" style={{ opacity: 0 }} />
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(217,70,239,0.1)",
                              color: "var(--ut-magenta)",
                              opacity: 0.7,
                            }}
                          >
                            {item.category}
                          </span>
                        </div>
                        <h3 className="font-display text-sm leading-snug" style={{ color: "var(--ut-white)" }}>
                          <ZalgoText text={item.title} intensity="subtle" />
                        </h3>
                        <div className="flex items-center gap-1" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                          <Calendar size={10} />
                          <span className="font-mono text-[9px]">{item.date}</span>
                        </div>
                      </div>
                    </div>
                  </SectionReveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PROCESS QUOTE ────────────────────────── */}
        <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.06)", zIndex: 1, position: "relative" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="max-w-2xl mx-auto text-center space-y-4">
                <div className="flex items-center justify-center gap-3 opacity-20">
                  <img src="/images/utglyphs/s-(10).png" alt="" width={20} height={20} style={{ objectFit: "contain" }} />
                  <img src="/images/utglyphs/c-(10).png" alt="" width={16} height={16} style={{ objectFit: "contain" }} />
                  <img src="/images/utglyphs/r-(10).png" alt="" width={14} height={14} style={{ objectFit: "contain" }} />
                  <img src="/images/utglyphs/o-(10).png" alt="" width={12} height={12} style={{ objectFit: "contain" }} />
                  <img src="/images/utglyphs/l-(10).png" alt="" width={10} height={10} style={{ objectFit: "contain" }} />
                </div>
                <div className="font-display text-xl leading-relaxed" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text="Every piece I discard teaches me why the ones I keep are worth keeping." intensity="subtle" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <img src="/images/utglyphs/h-(10).png" alt="" width={16} height={16} style={{ objectFit: "contain", opacity: 0.3 }} />
                  <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                    — Hakan Hisim · Process Journal · Codex Vol. II
                  </p>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>
      </main>

      {/* ── LIGHTBOX ──────────────────────────────── */}
      {lightboxIndex !== null && current && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(16px)" }}
          onClick={() => setLightboxIndex(null)}
        >
          {/* Decorative background glyph */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <img
              src={currentGlyphFile ? `/images/utglyphs/${currentGlyphFile}` : `/images/utglyphs/a-(10).png`}
              alt=""
              width={400}
              height={400}
              style={{ opacity: 0.03, objectFit: "contain" }}
            />
          </div>

          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            className="absolute top-4 right-4 z-10 p-2 ut-btn"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--ut-white-dim)" }}
          >
            <X size={16} />
          </button>

          {/* Prev/Next */}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 ut-btn hidden md:flex"
            style={{ borderColor: "rgba(217,70,239,0.2)", color: "var(--ut-magenta)" }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 ut-btn hidden md:flex"
            style={{ borderColor: "rgba(217,70,239,0.2)", color: "var(--ut-magenta)" }}
          >
            <ChevronRight size={20} />
          </button>

          {/* Main lightbox panel */}
          <div
            className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto ut-card p-0"
            style={{ borderColor: "rgba(217,70,239,0.25)", background: "var(--ut-black)", backgroundImage: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Page number + glyph bar */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
              style={{
                background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid rgba(217,70,239,0.1)",
              }}
            >
              <div className="flex items-center gap-3">
                {/* Glyph identifier */}
                {currentGlyphFile && (
                  <img
                    src={`/images/utglyphs/${currentGlyphFile}`}
                    alt=""
                    width={24}
                    height={24}
                    style={{ objectFit: "contain", opacity: 0.6 }}
                  />
                )}
                <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: "var(--ut-magenta)", opacity: 0.7 }}>
                  {String(current.page).padStart(3, "0")}
                </span>
                <span className="font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                  /{String(filtered.length).padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                  {lightboxIndex + 1} / {filtered.length}
                </span>
                <button
                  onClick={() => navigate(1)}
                  className="p-1"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Image */}
            <div
              className="relative w-full"
              style={{ background: "linear-gradient(135deg, rgba(217,70,239,0.04) 0%, rgba(34,211,238,0.02) 100%)" }}
            >
              <img
                src={`/images/codex2/page-${current.page}.jpg`}
                alt={`Page ${current.page} — ${current.title}`}
                className="w-full h-auto block"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
              {/* Decorative glyph corner */}
              {currentGlyphFile && (
                <div className="absolute bottom-4 right-4 opacity-10">
                  <img
                    src={`/images/utglyphs/${currentGlyphFile}`}
                    alt=""
                    width={60}
                    height={60}
                    style={{ objectFit: "contain" }}
                  />
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="p-6 md:p-8 space-y-4">
              {/* Category + Glyph */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentGlyphFile && (
                  <img
                    src={`/images/utglyphs/${currentGlyphFile}`}
                    alt=""
                    width={16}
                    height={16}
                    style={{ objectFit: "contain", opacity: 0.6 }}
                  />
                )}
                <span
                  className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(217,70,239,0.1)", color: "var(--ut-magenta)", opacity: 0.7 }}
                >
                  {current.category}
                </span>
                <span className="flex items-center gap-1 font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                  <Calendar size={9} />
                  {current.date}
                </span>
              </div>

              <h2 className="font-display text-2xl md:text-3xl" style={{ color: "var(--ut-white)" }}>
                <ZalgoText text={current.title} intensity="subtle" />
              </h2>

              <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.8 }}>
                {current.description}
              </p>

              {/* Tags */}
              <div className="flex gap-1.5 flex-wrap pt-2" style={{ borderTop: "1px solid rgba(217,70,239,0.08)" }}>
                {current.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1"
                    style={{ background: "rgba(217,70,239,0.08)", color: "var(--ut-magenta)", opacity: 0.5 }}
                  >
                    <Tag size={8} />
                    {tag}
                  </span>
                ))}
              </div>

              {/* Glyph page identifier */}
              <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid rgba(217,70,239,0.06)" }}>
                {currentGlyphFile && (
                  <img
                    src={`/images/utglyphs/${currentGlyphFile}`}
                    alt=""
                    width={28}
                    height={28}
                    style={{ objectFit: "contain", opacity: 0.4 }}
                  />
                )}
                <div>
                  <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-gold)", opacity: 0.3 }}>
                    Process Reference
                  </span>
                  <div className="font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                    Page {current.page} · Glyph {current.glyph} · {current.date}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </>
  );
}
