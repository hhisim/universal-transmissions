"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import ZalgoText from "@/components/ui/ZalgoText";
import SectionReveal from "@/components/ui/SectionReveal";
import { ChevronLeft, ChevronRight, X, ZoomIn, Calendar, ExternalLink } from "lucide-react";

const ACQUIRE_LINK = "https://universal-transmissions-gut8evxo4-hhisim-7214s-projects.vercel.app/sanctum/universal-transmissions-codex-vol1-physical";
const CORRESPONDENCES_LINK = "https://codex-deploy-phi.vercel.app/";

// ─── CODEX2 Gallery Data — from PAGE_INFO.txt ─────────────────
const GALLERY_ITEMS = [
  {
    id: 1, page: 151, glyph: "A",
    title: "Introduction to multi-planar navigation",
    description: "The continuation of an ineffable odyssey, 150 more dark theme pages of the twilight variation exploring themes of multi-dimensional navigation, Lucid realms, Astral bio-mechanics, Xeno-Tinctures, flora and near death cartography.\n\nExpect more updates very soon coupled with strange videos as usual.\n\nAlso more about Oracles and Card decks, so very soon!\n\nAugmented reality Inside...\n\nBe love,\nHakan.",
    tags: ["universaltransmissions", "xenolinguistics", "codex", "mapping", "navigation", "codex2", "visionaryart", "psychedelic"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 2, page: 152, glyph: "B",
    title: "Astral Cartography: Arching through spectrums of consciousness",
    description: "Anubis and the exploration of the Archontic path.",
    tags: ["universaltransmissions", "xenolinguistics", "codex", "mapping", "navigation", "codex2", "visionaryart", "psychedelic", "astralcartography", "archon", "anubis"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 3, page: 153, glyph: "C",
    title: "Navigation: Meta-molecular synthesis of trance states",
    description: "Imbibing hyperdimensional wave functions as consciousness altering phenomes.",
    tags: ["codex", "codex2.0", "universaltransmissions", "kemet", "molecular", "metamaterial", "ancientfuture"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 4, page: 154, glyph: "D",
    title: "Navigation: Propagation of Parallel Projections through Hyperspace",
    description: "On navigating Multiverse modes with psycho-somatic probability engines.",
    tags: ["universaltransmissions", "xenolinguistics", "codex", "mapping", "navigation", "codex2", "visionaryart", "psychedelic", "astralcartography", "multiverse", "parallelreality", "projection", "hyperspace"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 5, page: 155, glyph: "E",
    title: "Navigation (Exploratory): Probability steering via reality navigation networks",
    description: "On the impossible mechanics of dimension hopping.",
    tags: ["Universaltransmissions", "codex", "codex2", "realitytransurfing", "alternatereality", "realitynavigation", "visionaryart", "psychedelic"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 6, page: 156, glyph: "F",
    title: "Threshold Transformations & Evolutionary Portals",
    description: "Many thanks to Sakari @omnigeometry for creating such amazing software which was used to generate geometric structures on this page.",
    tags: ["Universaltransmissions", "codex", "codex2", "portalevolution", "realitynavigation", "visionaryart", "psychedelic", "alphaandomega", "xenolinguistics", "spinratio", "omnigeometry"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 7, page: 157, glyph: "G",
    title: "Navigation: Tangential Telemetry of Time Dilation",
    description: "The effects to time dilation on Euclidean and Non-Euclidean existential modalities.",
    tags: ["codex", "codex2", "universaltransmissions", "xenolinguistics", "telemetry", "timedilation", "psychedelic", "visionaryart", "alternatereality"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 8, page: 158, glyph: "H",
    title: "Navigation: Exploration: Anatomical Structures & Cymatic correlations to hyperdimensional egregors",
    description: "Hyperdimensional entities and their cymatic expression patterns.",
    tags: ["codex", "codex2", "universaltransmissions", "hyperspacemanual", "egregoreanatomy", "cymatics", "75hz", "anatomyofthebodyofgod", "visionaryart", "psychedelic"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 9, page: 159, glyph: "I",
    title: "Hypernode: Celestial cradle",
    description: "Half a gram of starlit spice,\nHalf a drop of Tikal,\nThat's the way the visions flow,\nPop! Goes the weasel.",
    tags: ["celestialcradle", "cosmicnursery", "xenolinguistics", "DMT", "hyperspace", "kundalini", "cosmicbirth", "visionaryart", "psychedelic", "popgoestheweasel"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 10, page: 160, glyph: "J",
    title: "Navigation: On steering the tornado between the portals of life and death",
    description: '"We created the end" — Death is a human invention.',
    tags: ["codex", "codex2", "universaltransmissions", "tornadosteering", "life", "death", "birth", "rebirth", "portals", "dmt", "visionaryart", "psychedelic"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 11, page: 161, glyph: "K",
    title: "Calibration: On balancing the Archontic spectrum to design experiential modalities.",
    description: "The architects /// Frequency manipulation, correspondence mapping and reality creation dynamics.",
    tags: ["CODEX", "codex2", "universaltransmissions", "theartchitects", "spectrum", "archons", "hyperspace", "dmt", "tryptaminerealms", "hyperspatialdesign", "visionaryart", "psychedelic", "spinratio"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 12, page: 162, glyph: "L",
    title: "Calibration: On balancing the Archontic spectrum to design experiential modalities.",
    description: "(Frequency patterns generated with a cymatic tonoscope oscillator)",
    tags: ["codex", "codex2", "universaltransmissions", "cymatics", "frequencies", "super-sentience", "visionaryart", "psychedelic", "dmt", "tryptaminevibrations", "visiblesound", "hiddendimension"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 13, page: 163, glyph: "M",
    title: "Calibration: Frequency mapping to translinguistic artifacts",
    description: "This happens all too often!",
    tags: ["codex", "codex2", "universaltransmissions", "cymatics", "frequencies", "super-sentience", "visionaryart", "psychedelic", "dmt", "tryptaminevibrations", "visiblesound", "hiddendimension"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 14, page: 164, glyph: "N",
    title: "Alchemical: Radiolaria",
    description: "Radiolarian re-compositions, compounded with xenobotanical psychotropic formulations for the purposes of non-ordinary excursions.",
    tags: ["codex", "codex2", "universaltransmissions", "radiolaria", "xenobotanical", "alchemy", "xenolinguistics", "psychotropic", "dmt", "psychedelic", "visionaryart", "trancestates"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 15, page: 165, glyph: "O",
    title: "Alchemical: Radiolaria II",
    description: "Radiolarian re-compositions, compounded with xenobotanical psychotropic formulations for the purposes of non-ordinary excursions.",
    tags: ["codex", "codex2", "universaltransmissions", "radiolaria", "xenobotanical", "alchemy", "xenolinguistics", "psychotropic", "dmt", "psychedelic", "visionaryart", "trancestates"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 16, page: 166, glyph: "P",
    title: "Alchemical: Radiolaria III",
    description: "Radiolarian re-compositions, compounded with xenobotanical psychotropic formulations for the purposes of non-ordinary excursions.",
    tags: ["codex", "codex2", "universaltransmissions", "radiolaria", "xenobotanical", "alchemy", "xenolinguistics", "psychotropic", "dmt", "psychedelic", "visionaryart", "trancestates"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 17, page: 167, glyph: "Q",
    title: "Contact: The Gatekeepers",
    description: "As I pierced through the hyperbolic membrane of hyperspace, the gatekeepers stood ready, poised to test my resolve to venture further. Their silent voices resonated in shimmering cellophane frequencies, as it adjusted the cosmic dials with an otherworldly rhythm.",
    tags: ["codex", "codex2", "breakthrough", "universaltransmissions", "dmt", "hyperspace", "tryptaminerealms", "xenolinguistics", "visiblelanguage", "machineelf", "cinema4d", "rodin3d", "magnific", "zbrush", "psychedelic", "visionaryart"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 18, page: 168, glyph: "R",
    title: "Communication: Non-local transmissions — Telemetry of Translingual Minds.",
    description: "Communication as key communion.",
    tags: ["codex", "codex2", "universaltransmissions", "xenolinguistics", "translinguitics", "telepathy", "visionaryart", "psychedelic", "timedilation", "wormhole", "treeoflife", "kaballah", "temporalmapping"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 19, page: 169, glyph: "S",
    title: "Cultivation: On the seeding of whirling worlds with woven words.",
    description: "On cultivating extraction methods from the Prima Materia.",
    tags: ["codex", "codex2", "universaltransmissions", "worldseeding", "worldweaving", "xenolinguistics", "visionaryart", "psychedelic", "esotericart", "chickenoregg", "cosmicegg", "primamateria"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 20, page: 170, glyph: "T",
    title: "Cultivation: Sowing seeds of...",
    description: "On cultivating extraction methods from the Prima Materia.",
    tags: ["codex", "codex2", "universaltransmissions", "worldseeding", "worldweaving", "xenolinguistics", "visionaryart", "psychedelic", "esotericart", "chickenoregg", "cosmicegg", "primamateria"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 21, page: 171, glyph: "U",
    title: "Transformation: Non-linear evolutionary applications of recursive pan-dimensional seeding practices",
    description: "Non-local transformation methods // using the Philosophers Stone.",
    tags: ["codex", "codex2", "universaltransmissions", "xenolinguistics", "theseeders", "seedingreality", "transformation", "non-linear", "dmt", "visionaryart", "psychedelic", "esotericart", "archonticspectrum"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 22, page: 172, glyph: "V",
    title: "Simulation: Non-linear recursive mapping",
    description: "Non-linear recursive mapping points between translinguistic simulacra and pan-dimensional Usumgal breeding practices.",
    tags: ["codex", "codex2", "universaltransmissions", "xenolinguistics", "theseeders", "seedingreality", "transformation", "non-linear", "dmt", "visionaryart", "psychedelic", "esotericart", "archonticspectrum"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 23, page: 173, glyph: "W",
    title: "Locomotion: Topological locomotion dynamics",
    description: "Topology of serpentine meridian pathways in relation to planetary spheres via portals of near improbability.",
    tags: ["codex", "codex2", "universaltransmissions", "xenolinguistics", "meridians", "dmt", "visionaryart", "psychedelic", "kundalini", "chakras", "planetaryspheres"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
];

// Glyph character map
const GLYPH_MAP: Record<string, string> = {
  A: "a-(10).png", B: "b-(10).png", C: "c-(10).png", D: "d-(10).png",
  E: "e-(10).png", F: "f-(10).png", G: "g-(10).png", H: "h-(10).png",
  I: "i-(10).png", J: "j-(10).png", K: "k-(10).png", L: "l-(10).png",
  M: "m-(10).png", N: "n-(10).png", O: "o-(10).png", P: "p-(10).png",
  Q: "q-(10).png", R: "r-(10).png", S: "s-(10).png", T: "t-(10).png",
  U: "u-(10).png", V: "v-(10).png", W: "w-(10).png",
};

export default function CodexIIClient() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation — only active when viewer is open
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSelectedIndex(i => ((i ?? 0) + 1) % GALLERY_ITEMS.length);
      if (e.key === "ArrowLeft")  setSelectedIndex(i => ((i ?? 0) - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length);
      if (e.key === "Escape")     setSelectedIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex]);

  const current  = selectedIndex !== null ? GALLERY_ITEMS[selectedIndex] : null;
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
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .glyph-decor { animation: glyphPulse 4s ease-in-out infinite; }
        .glyph-drift { animation: glyphDrift 20s linear infinite; }
        .glyph-float { animation: glyphFloat 6s ease-in-out infinite; }
        .codex-thumb-active {
          border-color: rgba(217,70,239,0.6) !important;
          box-shadow: 0 0 20px rgba(217,70,239,0.3);
        }
        .codex-thumb:hover {
          border-color: rgba(217,70,239,0.35) !important;
        }
        .codex-tag:hover {
          background: rgba(217,70,239,0.2) !important;
          opacity: 1 !important;
        }
      `}</style>

      <main className="pt-24 pb-20 min-h-screen" style={{ background: "var(--ut-black)" }}>

        {/* ── BACKGROUND GLYPH GRID ─────────────────── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          {["A","B","C","D","E","F","G","H","I","J"].map((g, i) => (
            <div key={g} className="absolute glyph-decor" style={{ left: `${5 + i * 10}%`, top: `${10 + (i % 3) * 30}%`, opacity: 0.05, animationDelay: `${i * 0.4}s` }}>
              <img src={`/images/utglyphs/${GLYPH_MAP[g]}`} alt="" width={80} height={80} style={{ objectFit: "contain" }} />
            </div>
          ))}
          {["K","L","M","N","O","P","Q","R","S","T"].map((g, i) => (
            <div key={g} className="absolute glyph-drift" style={{ right: `${5 + i * 9}%`, top: `${15 + (i % 4) * 22}%`, opacity: 0.04, animationDelay: `${i * 0.6}s` }}>
              <img src={`/images/utglyphs/${GLYPH_MAP[g]}`} alt="" width={100} height={100} style={{ objectFit: "contain" }} />
            </div>
          ))}
        </div>

        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-16 relative" style={{ borderBottom: "1px solid rgba(217,70,239,0.08)", zIndex: 1 }}>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5 glyph-float hidden lg:block">
            <img src="/images/utglyphs/s-(10).png" alt="" width={200} height={200} style={{ objectFit: "contain" }} />
          </div>
          <div className="container-ut">
            <SectionReveal>
              <div className="flex items-center gap-3 mb-4">
                <img src="/images/utglyphs/a-(10).png" alt="" width={24} height={24} style={{ opacity: 0.6, objectFit: "contain" }} />
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
              <p className="font-body text-base max-w-2xl leading-relaxed mb-4" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                The continuation of an ineffable odyssey — {GALLERY_ITEMS.length} pages of dark-theme exploration into multi-dimensional navigation, Lucid realms, Astral bio-mechanics, and beyond.
              </p>
              <div className="flex items-center gap-2">
                <img src="/images/utglyphs/b-(10).png" alt="" width={16} height={16} style={{ opacity: 0.4, objectFit: "contain" }} />
                <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                  {GALLERY_ITEMS.length} pages · Click any page to explore
                </span>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── LIGHTBOX VIEWER ───────────────────────── */}
        {current !== null && (
          <section className="py-8 relative" style={{ zIndex: 1 }}>
            <div className="container-ut">

              {/* ── MAIN IMAGE ────────────────────────── */}
              <div
                className="relative overflow-hidden mb-0 cursor-pointer group"
                style={{
                  background: "linear-gradient(135deg, rgba(217,70,239,0.06) 0%, rgba(34,211,238,0.02) 100%)",
                  border: "1px solid rgba(217,70,239,0.2)",
                  borderBottom: "none",
                }}
              >
                <img
                  src={`/images/codex2/page-${current!.page}.webp`}
                  alt={`Page ${current.page} — ${current.title}`}
                  className="w-full h-auto block"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {/* Decorative glyph corner */}
                {currentGlyphFile && (
                  <div className="absolute bottom-4 right-4 opacity-10 pointer-events-none">
                    <img src={`/images/utglyphs/${currentGlyphFile}`} alt="" width={80} height={80} style={{ objectFit: "contain" }} />
                  </div>
                )}
                {/* Page badge */}
                <div
                  className="absolute top-4 left-4 px-3 py-1.5 flex items-center gap-2"
                  style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(217,70,239,0.3)" }}
                >
                  {currentGlyphFile && (
                    <img src={`/images/utglyphs/${currentGlyphFile}`} alt="" width={14} height={14} style={{ objectFit: "contain", opacity: 0.7 }} />
                  )}
                  <span className="font-mono text-[10px] tracking-widest" style={{ color: "var(--ut-magenta)" }}>
                    {String(current.page).padStart(3, "0")}
                  </span>
                </div>
                {/* Prev / Next arrows */}
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex(i => ((i ?? 0) - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", border: "1px solid rgba(217,70,239,0.2)", color: "var(--ut-magenta)" }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex(i => ((i ?? 0) + 1) % GALLERY_ITEMS.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", border: "1px solid rgba(217,70,239,0.2)", color: "var(--ut-magenta)" }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* ── THUMBNAIL STRIP (all pages) ─── */}
              <div
                className="overflow-x-auto"
                style={{
                  background: "rgba(0,0,0,0.85)",
                  border: "1px solid rgba(217,70,239,0.2)",
                  borderTop: "1px solid rgba(217,70,239,0.08)",
                  borderBottom: "1px solid rgba(217,70,239,0.08)",
                }}
              >
                <div className="flex gap-2 px-4 py-3 min-w-max" ref={scrollRef}>
                  {GALLERY_ITEMS.map((item, i) => {
                    const isActive = i === selectedIndex;
                    const imgSrc   = `/images/codex2/page-${item.page}.webp`;
                    const glyphSrc = GLYPH_MAP[item.glyph];
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedIndex(i)}
                        className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 relative overflow-hidden border-2 transition-all duration-200 codex-thumb ${isActive ? "codex-thumb-active" : ""}`}
                        style={{
                          borderColor: isActive ? "rgba(217,70,239,0.6)" : "rgba(217,70,239,0.12)",
                          borderRadius: "2px",
                          background: "linear-gradient(135deg, rgba(217,70,239,0.04) 0%, rgba(34,211,238,0.01) 100%)",
                          padding: 0,
                        }}
                        title={`Page ${item.page}`}
                      >
                        <img
                          src={imgSrc}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ opacity: isActive ? 1 : 0.5 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <div
                          className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-1 py-0.5"
                          style={{ background: "rgba(0,0,0,0.75)" }}
                        >
                          {glyphSrc && (
                            <img src={`/images/utglyphs/${glyphSrc}`} alt="" width={10} height={10} style={{ objectFit: "contain", opacity: 0.6 }} />
                          )}
                          <span
                            className="font-mono text-[8px] tracking-widest"
                            style={{ color: isActive ? "var(--ut-magenta)" : "var(--ut-white-dim)", opacity: 0.9 }}
                          >
                            {String(item.page).padStart(3, "0")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── INFO PANEL ─────────────────────────── */}
              <div
                className="p-6 md:p-8 space-y-6"
                style={{
                  border: "1px solid rgba(217,70,239,0.2)",
                  borderTop: "none",
                  background: "rgba(0,0,0,0.7)",
                }}
              >
                {/* Top row: glyph + title + page counter */}
                <div className="flex items-start gap-4 flex-wrap">
                  {currentGlyphFile && (
                    <div className="flex-shrink-0 mt-1">
                      <img src={`/images/utglyphs/${currentGlyphFile}`} alt="" width={28} height={28} style={{ objectFit: "contain", opacity: 0.5 }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                        {String(current.page).padStart(3, "0")} · {current.year}
                      </span>
                      <span className="font-mono text-[9px]" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                        {selectedIndex! + 1} / {GALLERY_ITEMS.length}
                      </span>
                    </div>
                    <h2 className="font-display text-xl md:text-2xl leading-tight" style={{ color: "var(--ut-white)" }}>
                      <ZalgoText text={current.title} intensity="subtle" />
                    </h2>
                  </div>
                </div>

                {/* Medium */}
                <div>
                  <p className="font-mono text-[9px] tracking-widest uppercase mb-1" style={{ color: "var(--ut-white-dim)", opacity: 0.35 }}>
                    Medium
                  </p>
                  <p className="font-mono text-[10px] leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
                    {current.medium}
                  </p>
                </div>

                {/* Description text */}
                <p
                  className="font-body text-sm leading-relaxed"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.75, whiteSpace: "pre-line" }}
                >
                  {current.description}
                </p>

                {/* Tags */}
                <div className="flex gap-2 flex-wrap">
                  {current.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full codex-tag cursor-default transition-all"
                      style={{
                        background: "rgba(217,70,239,0.08)",
                        color: "var(--ut-magenta)",
                        opacity: 0.6,
                        border: "1px solid rgba(217,70,239,0.15)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3 pt-2 flex-wrap" style={{ borderTop: "1px solid rgba(217,70,239,0.08)" }}>
                  <a
                    href={ACQUIRE_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary px-6 py-3 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2"
                    style={{ background: "rgba(217,70,239,0.15)", border: "1px solid rgba(217,70,239,0.4)", color: "var(--ut-magenta)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    Acquire the Codex
                    <ExternalLink size={10} />
                  </a>
                  <a
                    href={CORRESPONDENCES_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ut-btn px-6 py-3 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2"
                    style={{ borderColor: "rgba(212,168,71,0.4)", color: "var(--ut-gold)" }}
                  >
                    Explore Correspondences
                    <ExternalLink size={10} />
                  </a>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* ── GRID VIEW (when no page is selected) ───── */}
        {selectedIndex === null && (
          <section className="pb-16 relative" style={{ zIndex: 1 }}>
            <div className="container-ut">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {GALLERY_ITEMS.map((item, i) => {
                  const glyphSrc = GLYPH_MAP[item.glyph];
                  const loaded  = imageLoaded[item.id];
                  const imgSrc   = `/images/codex2/page-${item.page}.webp`;
                  return (
                    <SectionReveal key={item.id} delay={i * 0.04}>
                      <div
                        className="ut-card overflow-hidden group cursor-pointer transition-all hover:-translate-y-2 relative"
                        style={{ borderColor: "rgba(217,70,239,0.12)", transition: "all 0.3s ease" }}
                        onClick={() => setSelectedIndex(i)}
                      >
                        {/* Image */}
                        <div className="relative w-full aspect-[3/4] overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(217,70,239,0.06) 0%, rgba(34,211,238,0.02) 100%)" }}>
                          {!loaded && (
                            <div className="absolute inset-0 animate-pulse" style={{ background: "linear-gradient(90deg, rgba(217,70,239,0.04) 0%, rgba(217,70,239,0.08) 50%, rgba(217,70,239,0.04) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
                          )}
                          <img
                            src={imgSrc}
                            alt=""
                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                            style={{ opacity: loaded ? 1 : 0 }}
                            onLoad={() => setImageLoaded(prev => ({ ...prev, [item.id]: true }))}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          {/* Glyph watermark */}
                          {glyphSrc && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0, transition: "opacity 0.3s" }}
                              onMouseEnter={() => {}} onMouseLeave={() => {}}>
                              <img src={`/images/utglyphs/${glyphSrc}`} alt="" width={80} height={80} className="object-contain opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
                            </div>
                          )}
                          {/* Page number badge */}
                          <div className="absolute top-3 left-3 px-3 py-1 flex items-center gap-2" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(217,70,239,0.3)" }}>
                            {glyphSrc && <img src={`/images/utglyphs/${glyphSrc}`} alt="" width={12} height={12} style={{ objectFit: "contain", opacity: 0.7 }} />}
                            <span className="font-mono text-[9px] tracking-widest" style={{ color: "var(--ut-magenta)" }}>{String(item.page).padStart(3, "0")}</span>
                          </div>
                          {/* Hover zoom hint */}
                          <div className="absolute bottom-3 right-3 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
                            <ZoomIn size={14} style={{ color: "var(--ut-magenta)" }} />
                          </div>
                        </div>
                        {/* Content */}
                        <div className="p-4 space-y-2">
                          <span className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full block" style={{ background: "rgba(217,70,239,0.1)", color: "var(--ut-magenta)", opacity: 0.7 }}>
                            {item.year}
                          </span>
                          <h3 className="font-display text-xs leading-snug" style={{ color: "var(--ut-white)" }}>
                            <ZalgoText text={item.title} intensity="subtle" />
                          </h3>
                        </div>
                      </div>
                    </SectionReveal>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── CLOSE BUTTON (when viewer open) ──────── */}
        {current !== null && (
          <div className="container-ut pb-8" style={{ zIndex: 1 }}>
            <button
              onClick={() => setSelectedIndex(null)}
              className="ut-btn px-6 py-3 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2"
              style={{ borderColor: "rgba(217,70,239,0.2)", color: "var(--ut-white-dim)" }}
            >
              <X size={12} />
              Close Viewer
            </button>
          </div>
        )}

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
    </>
  );
}
