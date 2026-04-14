"use client";

import { useState } from "react";
import Image from "next/image";
import ZalgoText from "@/components/ui/ZalgoText";
import SectionReveal from "@/components/ui/SectionReveal";

// Maps page number -> actual image filename in public/images/codex2/
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

// ─── CODEX2 Gallery Data — from PAGE INFO.txt (exact) ─────────
// Topics extracted from TITLE field of PAGE INFO.txt
const GALLERY_ITEMS = [
  {
    id: 1,
    page: 151,
    title: "Introduction to multi-planar navigation",
    description: "The continuation of an ineffable odyssey, 150 more dark theme pages of the twilight variation exploring themes of multi-dimensional navigation, Lucid realms, Astral bio-mechanics, Xeno-Tinctures, flora and near death cartography.\n\nExpect more updates very soon coupled with strange videos as usual.\n\nAlso more about Oracles and Card decks, so very soon!",
    tags: "#universaltransmissions #xenolinguistics #codex #mapping #navigation #codex2 #visionaryart #psychedelic",
    topic: "Introduction to multi-planar navigation",
  },
  {
    id: 2,
    page: 152,
    title: "Astral Cartography: Arching through spectrums of consciousness",
    description: "Anubis and the exploration of the Archontic path",
    tags: "#universaltransmissions #xenolinguistics #codex #mapping #navigation #codex2 #visionaryart #psychedelic #astralcartography #archon #anubis",
    topic: "Astral Cartography: Arching through spectrums of consciousness",
  },
  {
    id: 3,
    page: 153,
    title: "Navigation: Meta-molecular synthesis of trance states",
    description: "Imbibing hyperdimensional wave functions as consciousness altering phenomes",
    tags: "#codex #codex2.0 #universaltransmissions #kemet #molecular #metamaterial #ancientfuture",
    topic: "Navigation: Meta-molecular synthesis of trance states",
  },
  {
    id: 4,
    page: 154,
    title: "Navigation: Propagation of Parallel Projections through Hyperspace",
    description: "On navigating Multiverse modes with psycho-somatic probability engines",
    tags: "#universaltransmissions #xenolinguistics #codex #mapping #navigation #codex2 #visionaryart #psychedelic #astralcartography #multiverse #parallelreality #projection #hyperspace",
    topic: "Navigation: Propagation of Parallel Projections through Hyperspace",
  },
  {
    id: 5,
    page: 155,
    title: "Navigation (Exploratory): Probability steering via reality navigation networks",
    description: "On the impossible mechanics of dimension hopping",
    tags: "#Universaltransmissions #codex #codex2 #realitytransurfing #alternatereality #realitynavigation #visionaryart #psychedelic",
    topic: "Navigation (Exploratory): Probability steering via reality navigation networks",
  },
  {
    id: 6,
    page: 156,
    title: "Threshold Transformations & Evolutionary Portals",
    description: "Many thanks to Sakari @omnigeometry for creating such amazing software which was used to generate geometric structures on this page",
    tags: "#Universaltransmissions #codex #codex2 #portalevolution #realitynavigation #visionaryart #psychedelic #alphaandomega #xenolinguistics #spinratio #omnigeometry",
    topic: "Threshold Transformations & Evolutionary Portals",
  },
  {
    id: 7,
    page: 157,
    title: "Navigation: Tangential Telemetry of Time Dilation",
    description: "The effects to time dilation on Euclidean and Non-Euclidean existential modalities",
    tags: "#codex #codex2 #universaltransmissions #xenolinguistics #telemetry #timedilation #psychedelic #visionaryart #alternatereality",
    topic: "Navigation: Tangential Telemetry of Time Dilation",
  },
  {
    id: 8,
    page: 158,
    title: "Navigation: Exploration: Anatomical Structures & Cymatic correlations to hyperdimensional egregors",
    description: "Hyperdimensional entities and their cymatic expression patterns.",
    tags: "#codex #codex2 #universaltransmissions #hyperspacemanual #egregoreanatomy #cymatics #75hz #anatomyofthebodyofgod #visionaryart #psychedelic",
    topic: "Navigation: Exploration: Anatomical Structures & Cymatic correlations to hyperdimensional egregors",
  },
  {
    id: 9,
    page: 159,
    title: "Hypernode: Celestial cradle",
    description: "Half a gram of starlit spice,\nHalf a drop of Tikal,\nThat's the way the visions flow,\nPop! Goes the weasel.",
    tags: "#celestialcradle #cosmicnursery #xenolinguistics #DMT #hyperspace #kundalini #cosmicbirth #visionaryart #psychedelic #popgoestheweasel",
    topic: "Hypernode: Celestial cradle",
  },
  {
    id: 10,
    page: 160,
    title: "Navigation: On steering the tornado between the portals of life and death",
    description: '"We created the end" - Death is a human invention.',
    tags: "#codex #codex2 #universaltransmissions #tornadosteering #life #death #birth #rebirth #portals #dmt #visionaryart #psychedelic",
    topic: "Navigation: On steering the tornado between the portals of life and death",
  },
  {
    id: 11,
    page: 161,
    title: "Calibration: On balancing the Archontic spectrum to design experiential modalities.",
    description: "The architects /// Frequency manipulation, correspondence mapping and reality creation dynamics",
    tags: "#CODEX #codex2 #universaltransmissions #theartchitects #spectrum #archons #hyperspace #dmt #tryptaminerealms #hyperspatialdesign #visionaryart #psychedelic #spinratio",
    topic: "Calibration: On balancing the Archontic spectrum to design experiential modalities.",
  },
  {
    id: 12,
    page: 162,
    title: "Calibration: On balancing the Archontic spectrum to design experiential modalities.",
    description: "(Frequency patterns generated with a cymatic tonoscope oscillator)",
    tags: "#codex #codex2 #universaltransmissions #cymatics #frequencies #super-sentience #visionaryart #psychedelic #dmt #tryptaminevibrations #visiblesound #hiddendimension",
    topic: "Calibration: On balancing the Archontic spectrum to design experiential modalities.",
  },
  {
    id: 13,
    page: 163,
    title: "Calibration: Frequency mapping to translinguistic artifacts",
    description: "This happens all too often!",
    tags: "#codex #codex2 #universaltransmissions #cymatics #frequencies #super-sentience #visionaryart #psychedelic #dmt #tryptaminevibrations #visiblesound #hiddendimension",
    topic: "Calibration: Frequency mapping to translinguistic artifacts",
  },
  {
    id: 14,
    page: 164,
    title: "Alchemical: Radiolaria",
    description: "Radiolarian re compositions, compounded with xenobotanical psychotropic formulations for the purposes of non-ordinary excursions.",
    tags: "#codex #codex2 #universaltransmissions #radiolaria #xenobotanical #alchemy #xenolinguistics #psychotropic #dmt #psychedelic #visionaryart #trancestates",
    topic: "Alchemical: Radiolaria",
  },
  {
    id: 15,
    page: 165,
    title: "Alchemical: Radiolaria II",
    description: "Radiolarian re compositions, compounded with xenobotanical psychotropic formulations for the purposes of non-ordinary excursions.",
    tags: "#codex #codex2 #universaltransmissions #radiolaria #xenobotanical #alchemy #xenolinguistics #psychotropic #dmt #psychedelic #visionaryart #trancestates",
    topic: "Alchemical: Radiolaria II",
  },
  {
    id: 16,
    page: 166,
    title: "Alchemical: Radiolaria III",
    description: "Radiolarian re compositions, compounded with xenobotanical psychotropic formulations for the purposes of non-ordinary excursions.",
    tags: "#codex #codex2 #universaltransmissions #radiolaria #xenobotanical #alchemy #xenolinguistics #psychotropic #dmt #psychedelic #visionaryart #trancestates",
    topic: "Alchemical: Radiolaria III",
  },
  {
    id: 17,
    page: 167,
    title: "Contact: The Gatekeepers",
    description: "As I pierced through the hyperbolic membrane of hyperspace, the gatekeepers stood ready, poised to test my resolve to venture further. Their silent voices resonated in shimmering cellophane frequencies, as it adjusted the cosmic dials with an otherworldly rhythm.",
    tags: "#codex #codex2 #breakthrough #universaltransmissions #dmt #hyperspace #tryptaminerealms #xenolinguistics #visiblelanguage #machineelf #cinema4d #rodin3d #magnific #zbrush #psychedelic #visionaryart",
    topic: "Contact: The Gatekeepers",
  },
  {
    id: 18,
    page: 168,
    title: "Communication: Non-local transmissions - Telemetry of Translingual Minds.",
    description: "Communication as key communion",
    tags: "#codex #codex2 #universaltransmissions #xenolinguistics #translinguitics #telepathy #visionaryart #psychedelic #timedilation #wormhole #treeoflife #kaballah #temporalmapping",
    topic: "Communication: Non-local transmissions - Telemetry of Translingual Minds.",
  },
  {
    id: 19,
    page: 169,
    title: "Cultivation: On the seeding of whirling worlds with woven words.",
    description: "On cultivating extraction methods from the Prima Materia",
    tags: "#codex #codex2 #universaltransmissions #worldseeding #worldweaving #xenolinguistics #visionaryart #psychedelic #esotericart #chickenoregg #cosmicegg #primamateria",
    topic: "Cultivation: On the seeding of whirling worlds with woven words.",
  },
  {
    id: 20,
    page: 170,
    title: "Cultivation: Sowing seeds of...",
    description: "On cultivating extraction methods from the Prima Materia",
    tags: "#codex #codex2 #universaltransmissions #worldseeding #worldweaving #xenolinguistics #visionaryart #psychedelic #esotericart #chickenoregg #cosmicegg #primamateria",
    topic: "Cultivation: Sowing seeds of...",
  },
  {
    id: 21,
    page: 171,
    title: "Transformation: Non-linear evolutionary applications of recursive pan-dimensional seeding practices",
    description: "Non-local transformation methods // using the Philosophers Stone",
    tags: "#codex #codex2 #universaltransmissions #xenolinguistics #theseeders #seedingreality #transformation #non-linear #dmt #visionaryart #psychedelic #esotericart #archonticspectrum",
    topic: "Transformation: Non-linear evolutionary applications of recursive pan-dimensional seeding practices",
  },
  {
    id: 22,
    page: 172,
    title: "Simulation: Non-linear recursive mapping",
    description: "Non-linear recursive mapping points between translinguistic simulacra and pan-dimensional Usumgal breeding practices",
    tags: "#codex #codex2 #universaltransmissions #xenolinguistics #theseeders #seedingreality #transformation #non-linear #dmt #visionaryart #psychedelic #esotericart #archonticspectrum",
    topic: "Simulation: Non-linear recursive mapping",
  },
  {
    id: 23,
    page: 173,
    title: "Locomotion: Toplogical locomotion dynamics",
    description: "Topology of serpentine meridian pathways in relation to planetary spheres via portals of near improbability.",
    tags: "#codex #codex2 #universaltransmissions #xenolinguistics #meridians #dmt #visionaryart #psychedelic #kundalini #chakras #planetaryspheres",
    topic: "Locomotion: Toplogical locomotion dynamics",
  },
];

export default function CodexIIClient() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});

  const current = selectedIndex !== null ? GALLERY_ITEMS[selectedIndex] : null;

  return (
    <main className="pb-20">

      {/* ── 4-COLUMN GRID ─────────────────────────────────────── */}
      {selectedIndex === null && (
        <>
          <div className="container-ut pt-8 pb-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: "var(--ut-white-faint)" }}>
                {GALLERY_ITEMS.length} Pages — Click to Open
              </span>
            </div>
          </div>

          <div className="container-ut pb-16">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {GALLERY_ITEMS.map((item, i) => {
                const loaded  = !!imageLoaded[item.id];
                const imgSrc  = getCodexImage(item.page);
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
                          <div className="absolute inset-0 animate-pulse" style={{ background: "rgba(217,70,239,0.05)" }} />
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
                        {/* Page badge */}
                        <div
                          className="absolute top-3 left-3 px-2 py-1"
                          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(217,70,239,0.3)" }}
                        >
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

      {/* ── INLINE VIEWER ─────────────────────────────────────── */}
      {current !== null && (
        <>
          {/* Back breadcrumb */}
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

          {/* Main image */}
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
                <div
                  className="absolute top-4 left-4 px-3 py-1.5"
                  style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", border: "1px solid rgba(217,70,239,0.3)" }}
                >
                  <span className="font-mono text-[10px] tracking-widest" style={{ color: "var(--ut-magenta)" }}>
                    {String(current.page).padStart(3, "0")}
                  </span>
                </div>
                <div
                  className="absolute bottom-4 right-4 font-mono text-[9px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--ut-magenta)" }}
                >
                  Click to close
                </div>
              </div>
            </SectionReveal>
          </div>

          {/* Thumbnail strip — all 23 pages */}
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
                  className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory gallery-carousel"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(217,70,239,0.2) transparent" }}
                >
                  {GALLERY_ITEMS.map((item, i) => {
                    const isActive = i === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-24 h-24 md:w-28 md:h-28 relative overflow-hidden snap-start transition-all duration-200"
                        style={{
                          border: `2px solid ${isActive ? "rgba(217,70,239,0.85)" : "rgba(217,70,239,0.12)"}`,
                          borderRadius: "2px",
                          cursor: "pointer",
                          opacity: isActive ? 1 : 0.55,
                          boxShadow: isActive ? "0 0 12px rgba(217,70,239,0.4)" : "none",
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

          {/* ── INFO SECTION — matches PAGE INFO.txt RIGHT BOX ──── */}
          <div className="container-ut mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

              {/* Left: Title + Description + Tags */}
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
                    <ZalgoText text={current.title} intensity="subtle" />
                  </h1>

                  <div className="divider-spectrum mb-8" />

                  <p
                    className="font-body text-base leading-relaxed mb-8"
                    style={{ color: "var(--ut-white-dim)", whiteSpace: "pre-line" }}
                  >
                    {current.description}
                  </p>

                  {/* Tags — exact from PAGE INFO.txt */}
                  <div>
                    <p
                      className="font-mono text-[10px] tracking-widest uppercase mb-2"
                      style={{ color: "var(--ut-white-faint)" }}
                    >
                      Tags
                    </p>
                    <p
                      className="font-mono text-[9px] leading-relaxed"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}
                    >
                      {current.tags}
                    </p>
                  </div>
                </div>
              </SectionReveal>

              {/* Right: RIGHT BOX — exact from PAGE INFO.txt */}
              <SectionReveal direction="right" delay={0.15}>
                <div
                  className="ut-card p-8"
                  style={{ borderColor: "rgba(217,70,239,0.1)" }}
                >
                  {/* Metadata — exact fields from PAGE INFO.txt */}
                  <div className="space-y-5 mb-10">
                    <div className="flex flex-col gap-1">
                      <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--ut-white-faint)" }}>
                        YEAR
                      </p>
                      <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)" }}>
                        2025
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--ut-white-faint)" }}>
                        MEDIUM
                      </p>
                      <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)" }}>
                        Adobe Photoshop, Cinema 4D, Adobe Illustrator, Painter, Various Fractal Generators, Zbrush, Cymatic Tonoscope
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--ut-white-faint)" }}>
                        TOPIC
                      </p>
                      <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)" }}>
                        {current.topic}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: "var(--ut-white-faint)" }}>
                        PAGE
                      </p>
                      <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)" }}>
                        {current.page}
                      </p>
                    </div>
                  </div>

                  <div className="divider-spectrum mb-8" />

                  {/* CTA — exact from PAGE INFO.txt */}
                  <div className="flex flex-col gap-3">
                    <a
                      href="https://universal-transmissions-gut8evxo4-hhisim-7214s-projects.vercel.app/sanctum/universal-transmissions-codex-vol1-physical"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold w-full justify-center text-center"
                    >
                      Acquire the Codex
                    </a>
                    <a
                      href="https://codex-deploy-phi.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary w-full justify-center text-center"
                    >
                      Explore Correspondences
                    </a>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>

          {/* Back button */}
          <div className="container-ut mt-12">
            <SectionReveal>
              <div className="border-t flex justify-between items-center pt-8" style={{ borderColor: "rgba(217,70,239,0.06)" }}>
                <button onClick={() => setSelectedIndex(null)} className="btn-secondary">
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