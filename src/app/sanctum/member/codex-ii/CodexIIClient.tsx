"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import ZalgoText from "@/components/ui/ZalgoText";
import SectionReveal from "@/components/ui/SectionReveal";

const ACQUIRE_LINK = "https://universal-transmissions-gut8evxo4-hhisim-7214s-projects.vercel.app/sanctum/universal-transmissions-codex-vol1-physical";
const CORRESPONDENCES_LINK = "https://codex-deploy-phi.vercel.app/";

function getCodexImage(page: number): string {
  const map: Record<number, string> = {
    151: "/images/codex2/page-151.jpg",
    152: "/images/codex2/page-152---web.jpg",
    153: "/images/codex2/page-153---web.jpg",
    154: "/images/codex2/page-154---web.jpg",
    155: "/images/codex2/page-155---web.jpg",
    156: "/images/codex2/page-156---web.jpg",
    157: "/images/codex2/page-157---small.jpg",
    158: "/images/codex2/page-158---web.jpg",
    159: "/images/codex2/page-159---web.jpg",
    160: "/images/codex2/page-160---web3.jpg",
    161: "/images/codex2/page-161---web.jpg",
    162: "/images/codex2/page-162---web.jpg",
    163: "/images/codex2/page-163---web.jpg",
    164: "/images/codex2/page-164---web.jpg",
    165: "/images/codex2/page-165---web.jpg",
    166: "/images/codex2/page-166---web.jpg",
    167: "/images/codex2/page-167---web.jpg",
    168: "/images/codex2/page-168---web.jpg",
    169: "/images/codex2/page-169---web.jpg",
    170: "/images/codex2/page-170---web.jpg",
    171: "/images/codex2/page-171---web.jpg",
    172: "/images/codex2/page-172---web.jpg",
    173: "/images/codex2/page-173---web.jpg",
  };
  return map[page] ?? `/images/codex2/page-${page}.jpg`;
}

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
    tags: ["codex", "codex2", "universaltransmissions", "kemet", "molecular", "metamaterial", "ancientfuture"],
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
    tags: ["universaltransmissions", "codex", "codex2", "realitytransurfing", "alternatereality", "realitynavigation", "visionaryart", "psychedelic"],
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope",
    year: "2025",
  },
  {
    id: 6, page: 156, glyph: "F",
    title: "Threshold Transformations & Evolutionary Portals",
    description: "Many thanks to Sakari @omnigeometry for creating such amazing software which was used to generate geometric structures on this page.",
    tags: ["universaltransmissions", "codex", "codex2", "portalevolution", "realitynavigation", "visionaryart", "psychedelic", "alphaandomega", "xenolinguistics", "spinratio", "omnigeometry"],
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

  return (
    <main className="pb-20">

      {/* ── 4-COLUMN GRID (shown when no page is selected) ─── */}
      {selectedIndex === null && (
        <>
          {/* Section label */}
          <div className="container-ut pt-8 pb-4">
            <div className="flex items-center gap-3 mb-0">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: "var(--ut-white-faint)" }}>
                {GALLERY_ITEMS.length} Pages — Click to Open
              </span>
            </div>
          </div>

          {/* Grid */}
          <div className="container-ut pb-16">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {GALLERY_ITEMS.map((item, i) => {
                const glyphSrc = GLYPH_MAP[item.glyph];
                const loaded   = !!imageLoaded[item.id];
                const imgSrc   = getCodexImage(item.page);
                return (
                  <SectionReveal key={item.id} delay={i * 0.04}>
                    <div
                      className="ut-card overflow-hidden group cursor-pointer transition-all hover:-translate-y-1"
                      style={{ borderColor: "rgba(217,70,239,0.12)" }}
                      onClick={() => setSelectedIndex(i)}
                    >
                      {/* Image */}
                      <div className="relative w-full aspect-[3/4] overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(217,70,239,0.06) 0%, rgba(34,211,238,0.02) 100%)" }}>
                        {!loaded && (
                          <div
                            className="absolute inset-0 animate-pulse"
                            style={{ background: "rgba(217,70,239,0.05)" }}
                          />
                        )}
                        <Image
                          src={imgSrc}
                          alt={`Page ${item.page}`}
                          fill
                          unoptimized
                          className="object-cover"
                          style={{ opacity: loaded ? 1 : 0 }}
                          onLoad={() => setImageLoaded(prev => ({ ...prev, [item.id]: true }))}
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        {/* Glyph watermark */}
                        {glyphSrc && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0 }}>
                            <img src={`/images/utglyphs/${glyphSrc}`} alt="" width={60} height={60} className="object-contain opacity-20 group-hover:opacity-30 transition-opacity" />
                          </div>
                        )}
                        {/* Page badge */}
                        <div
                          className="absolute top-3 left-3 px-2 py-1 flex items-center gap-1.5"
                          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(217,70,239,0.3)" }}
                        >
                          {glyphSrc && <img src={`/images/utglyphs/${glyphSrc}`} alt="" width={10} height={10} style={{ objectFit: "contain", opacity: 0.7 }} />}
                          <span className="font-mono text-[9px] tracking-widest" style={{ color: "var(--ut-magenta)" }}>
                            {String(item.page).padStart(3, "0")}
                          </span>
                        </div>
                      </div>
                      {/* Title */}
                      <div className="p-3">
                        <h3 className="font-body text-[11px] leading-snug" style={{ color: "var(--ut-white-dim)" }}>
                          {item.title.length > 60 ? item.title.slice(0, 60) + "…" : item.title}
                        </h3>
                      </div>
                    </div>
                  </SectionReveal>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── INLINE VIEWER (when a page is selected) ─── */}
      {current !== null && (
        <>
          {/* Back button */}
          <div className="container-ut pt-8 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIndex(null)}
                className="font-mono text-[10px] tracking-widest uppercase transition-colors hover:text-[var(--ut-magenta)]"
                style={{ color: "var(--ut-white-faint)" }}
              >
                ← Back to Grid
              </button>
              <span style={{ color: "var(--ut-white-faint)", opacity: 0.3 }}>›</span>
              <span className="font-mono text-[10px] tracking-widest uppercase truncate" style={{ color: "var(--ut-white-faint)" }}>
                Page {current.page}
              </span>
            </div>
          </div>

          {/* ── MAIN IMAGE ──────────────────────────────────── */}
          <div className="container-ut">
            <SectionReveal>
              <div
                className="relative overflow-hidden cursor-pointer group"
                style={{ border: "1px solid rgba(217,70,239,0.15)", borderRadius: "2px" }}
                onClick={() => setSelectedIndex(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedIndex(null)}
                aria-label="Click to close"
              >
                <Image
                  src={getCodexImage(current.page)}
                  alt={`Page ${current.page} — ${current.title}`}
                  width={1200}
                  height={1200}
                  unoptimized
                  className="w-full h-auto block"
                  priority
                />
                {/* Page badge */}
                <div
                  className="absolute top-4 left-4 px-3 py-1.5 flex items-center gap-2"
                  style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(217,70,239,0.3)" }}
                >
                  <span className="font-mono text-[10px] tracking-widest" style={{ color: "var(--ut-magenta)" }}>
                    {String(current.page).padStart(3, "0")}
                  </span>
                </div>
                {/* Click hint */}
                <div
                  className="absolute bottom-4 right-4 font-mono text-[9px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--ut-magenta)" }}
                >
                  Click to close
                </div>
              </div>
            </SectionReveal>
          </div>

          {/* ── THUMBNAIL STRIP (all codex pages) ──────────── */}
          <div className="container-ut mt-6">
            <SectionReveal>
              <div>
                <div
                  className="flex items-center gap-3 mb-4 font-mono text-[10px] tracking-[0.25em] uppercase"
                  style={{ color: "var(--ut-white-faint)" }}
                >
                  <span>Detail Views</span>
                  <span style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>—</span>
                  <span>Scroll →</span>
                </div>
                <div
                  className="flex gap-2 overflow-x-auto pb-4 snap-x snap-mandatory gallery-carousel"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(217,70,239,0.2) transparent" }}
                >
                  {GALLERY_ITEMS.map((item, i) => {
                    const isActive = i === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-24 h-24 md:w-28 md:h-28 relative overflow-hidden snap-start transition-all duration-200"
                        style={{
                          border: `2px solid ${isActive ? "rgba(217,70,239,0.6)" : "rgba(217,70,239,0.12)"}`,
                          borderRadius: "2px",
                          cursor: "pointer",
                          opacity: isActive ? 1 : 0.55,
                        }}
                        onClick={() => setSelectedIndex(i)}
                      >
                        <Image
                          src={getCodexImage(item.page)}
                          alt={`Page ${item.page}`}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="112px"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionReveal>
          </div>

          {/* ── INFO SECTION (2-column, gallery-style) ─────── */}
          <div className="container-ut mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

              {/* Left: Title + Description */}
              <SectionReveal direction="left">
                <div>
                  <p
                    className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
                    style={{ color: "var(--ut-magenta)", opacity: 0.6 }}
                  >
                    [{String(current.page).padStart(3, "0")}]
                  </p>
                  <h1
                    className="font-display text-3xl md:text-4xl lg:text-5xl mb-6 leading-tight"
                    style={{ color: "var(--ut-white)" }}
                  >
                    <ZalgoText text={current.title} intensity="moderate" />
                  </h1>

                  <div className="divider-spectrum mb-8" />

                  <p
                    className="font-body text-base leading-relaxed mb-8"
                    style={{ color: "var(--ut-white-dim)", whiteSpace: "pre-line" }}
                  >
                    {current.description}
                  </p>

                  {/* Tags */}
                  <div className="mb-6">
                    <p
                      className="font-mono text-[10px] tracking-widest uppercase mb-2"
                      style={{ color: "var(--ut-white-faint)" }}
                    >
                      Series
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {current.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border"
                          style={{
                            borderColor: "rgba(217,70,239,0.15)",
                            color: "var(--ut-white-dim)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionReveal>

              {/* Right: Metadata + CTA */}
              <SectionReveal direction="right" delay={0.15}>
                <div
                  className="ut-card p-8"
                  style={{ borderColor: "rgba(217,70,239,0.1)" }}
                >
                  {/* Metadata */}
                  <div className="space-y-4 mb-10">
                    {[
                      { label: "Year",    value: current.year },
                      { label: "Medium",  value: current.medium },
                      { label: "Pages",   value: `Page ${current.page} of 173` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1">
                        <p
                          className="font-mono text-[9px] tracking-[0.2em] uppercase"
                          style={{ color: "var(--ut-white-faint)" }}
                        >
                          {label}
                        </p>
                        <p
                          className="font-body text-sm"
                          style={{ color: "var(--ut-white-dim)" }}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="divider-spectrum mb-8" />

                  {/* CTA Buttons */}
                  <div className="flex flex-col gap-3">
                    <a
                      href={ACQUIRE_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full justify-center text-center font-mono text-[10px] uppercase tracking-widest px-6 py-4 border transition-all hover:bg-[rgba(217,70,239,0.08)]"
                      style={{ borderColor: "rgba(212,168,71,0.5)", color: "var(--ut-gold)" }}
                    >
                      Acquire the Codex
                    </a>
                    <a
                      href={CORRESPONDENCES_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full justify-center text-center font-mono text-[10px] uppercase tracking-widest px-6 py-4 border transition-all hover:bg-[rgba(217,70,239,0.08)]"
                      style={{ borderColor: "rgba(217,70,239,0.25)", color: "var(--ut-magenta)" }}
                    >
                      Explore Correspondences
                    </a>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>

          {/* ── NAVIGATE BACK ────────────────────────────── */}
          <div className="container-ut mt-12">
            <SectionReveal>
              <div
                className="border-t flex justify-between items-center pt-8"
                style={{ borderColor: "rgba(217,70,239,0.06)" }}
              >
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="btn-secondary"
                >
                  ← Back to Grid
                </button>
              </div>
            </SectionReveal>
          </div>
        </>
      )}
    </main>
  );
}
