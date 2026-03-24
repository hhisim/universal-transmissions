export interface Artwork {
  id: string;
  slug: string;
  title: string;
  year: number;
  medium: string;
  description: string;
  images: string[];
  detailImages: string[];
  available: boolean;
  price?: number;
  prints?: boolean;
  tags: string[];
  featured?: boolean;
}

/* ─────────────────────────────────────────────────────────
   Universal Transmissions — Artwork Collection
   Images served locally from /artworks/[slug]/main.jpg + details/
   ───────────────────────────────────────────────────────── */

const BASE = "/artworks";

export const artworks: Artwork[] = [
  // ═══════════════════════════════════════════════════
  // BIO-ENERGETIC VORTEXES SERIES (7)
  // ═══════════════════════════════════════════════════
  {
    id: "bev-001",
    slug: "root-chakra",
    title: "Bio-Energetic Vortexes No.1 — Root (Muladhara Chakra)",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D, Ultra Fractal 5, Adobe Illustrator, Mandelbulb 3D",
    description:
      "The series 'Energy Vortexes' is an exploration of the main energy wheels, sagras or chakras of apex beings and hyper-dimensional alien lifeforms alike and their relation to the hyper-spatial topology of physical and non-corporeal organs. The first image of the Universal Transmissions Chakra series, depicting the Root Muladhara Chakra.",
    images: [`${BASE}/root-chakra/main.jpg`],
    detailImages: ["/artworks/root-chakra/details/ROOT1.jpg", "/artworks/root-chakra/details/ROOT10.jpg", "/artworks/root-chakra/details/ROOT11.jpg", "/artworks/root-chakra/details/ROOT12.jpg", "/artworks/root-chakra/details/ROOT13.jpg", "/artworks/root-chakra/details/ROOT14.jpg", "/artworks/root-chakra/details/ROOT15.jpg", "/artworks/root-chakra/details/ROOT16.jpg", "/artworks/root-chakra/details/ROOT17.jpg", "/artworks/root-chakra/details/ROOT18.jpg", "/artworks/root-chakra/details/ROOT2.jpg", "/artworks/root-chakra/details/ROOT3.jpg", "/artworks/root-chakra/details/ROOT4.jpg", "/artworks/root-chakra/details/ROOT5.jpg", "/artworks/root-chakra/details/ROOT6.jpg", "/artworks/root-chakra/details/ROOT7.jpg", "/artworks/root-chakra/details/ROOT8.jpg", "/artworks/root-chakra/details/ROOT9.jpg"],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "root", "muladhara", "sacred-geometry", "kundalini"],
    featured: true,
  },
  {
    id: "bev-002",
    slug: "sacral-chakra",
    title: "Bio-Energetic Vortexes No.2 — Flow (Sacral Chakra)",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator",
    description:
      "The second of seven from the Bio-Energetic Vortexes sub-series. Inspired by the sacral chakra and the energetic power of emotions. An exploration of the Svadhisthana Chakra and the fluid nature of emotional energy.",
    images: [`${BASE}/sacral-chakra/main.jpg`],
    detailImages: ["/artworks/sacral-chakra/details/FLOW1.jpg", "/artworks/sacral-chakra/details/FLOW2.jpg", "/artworks/sacral-chakra/details/FLOW3.jpg", "/artworks/sacral-chakra/details/FLOW4.jpg", "/artworks/sacral-chakra/details/FLOW5.jpg", "/artworks/sacral-chakra/details/FLOW6.jpg", "/artworks/sacral-chakra/details/FLOW7.jpg", "/artworks/sacral-chakra/details/FLOW8.jpg", "/artworks/sacral-chakra/details/FLOW9.jpg"],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "sacral", "svadhisthana", "emotions", "sacred-geometry"],
    featured: false,
  },
  {
    id: "bev-003",
    slug: "solar-plexus-chakra",
    title: "Bio-Energetic Vortexes No.3 — Power (Manipura Chakra)",
    year: 2017,
    medium: "Adobe Photoshop",
    description:
      "The third of seven from the Bio-Energetic Vortexes sub-series, inspired by the Solar Plexus Chakra and the energetic force of willpower. Visualizes Manipura Chakra and the fire of personal power.",
    images: [`${BASE}/solar-plexus-chakra/main.jpg`],
    detailImages: ["/artworks/solar-plexus-chakra/details/SOLAR1.jpg", "/artworks/solar-plexus-chakra/details/SOLAR10.jpg", "/artworks/solar-plexus-chakra/details/SOLAR11.jpg", "/artworks/solar-plexus-chakra/details/SOLAR12.jpg", "/artworks/solar-plexus-chakra/details/SOLAR13.jpg", "/artworks/solar-plexus-chakra/details/SOLAR2.jpg", "/artworks/solar-plexus-chakra/details/SOLAR3.jpg", "/artworks/solar-plexus-chakra/details/SOLAR4.jpg", "/artworks/solar-plexus-chakra/details/SOLAR5.jpg", "/artworks/solar-plexus-chakra/details/SOLAR6.jpg", "/artworks/solar-plexus-chakra/details/SOLAR7.jpg", "/artworks/solar-plexus-chakra/details/SOLAR8.jpg", "/artworks/solar-plexus-chakra/details/SOLAR9.jpg"],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "solar-plexus", "manipura", "power", "willpower", "sacred-geometry"],
    featured: false,
  },
  {
    id: "bev-004",
    slug: "heart-chakra",
    title: "Bio-Energetic Vortexes No.4 — Love (Anahata Chakra)",
    year: 2017,
    medium: "Adobe Photoshop",
    description:
      "The fourth of seven from the Bio-Energetic Vortexes sub-series, inspired by the Anahata Heart Chakra and the universal energy of love and compassion. Visualizes the green heart center of the chakra system.",
    images: [`${BASE}/heart-chakra/main.jpg`],
    detailImages: ["/artworks/heart-chakra/details/LOVE1.jpg", "/artworks/heart-chakra/details/LOVE10.jpg", "/artworks/heart-chakra/details/LOVE11.jpg", "/artworks/heart-chakra/details/LOVE2.jpg", "/artworks/heart-chakra/details/LOVE3.jpg", "/artworks/heart-chakra/details/LOVE4.jpg", "/artworks/heart-chakra/details/LOVE5.jpg", "/artworks/heart-chakra/details/LOVE6.jpg", "/artworks/heart-chakra/details/LOVE7.jpg", "/artworks/heart-chakra/details/LOVE8.jpg", "/artworks/heart-chakra/details/LOVE9.jpg"],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "heart", "anahata", "love", "compassion", "sacred-geometry"],
    featured: false,
  },
  {
    id: "bev-005",
    slug: "throat-chakra",
    title: "Bio-Energetic Vortexes No.5 — Truth (Vishuddha Chakra)",
    year: 2018,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "The fifth of seven from the Bio-Energetic Vortexes sub-series, based on language, linguistics, cymatics, frequencies and the communicative powers of the Vishuddha Throat Chakra. 'Every word you use today has grown up like a flower.'",
    images: [`${BASE}/throat-chakra/main.jpg`],
    detailImages: ["/artworks/throat-chakra/details/SPEAK1.jpg", "/artworks/throat-chakra/details/SPEAK10.jpg", "/artworks/throat-chakra/details/SPEAK11.jpg", "/artworks/throat-chakra/details/SPEAK12.jpg", "/artworks/throat-chakra/details/SPEAK13.jpg", "/artworks/throat-chakra/details/SPEAK14.jpg", "/artworks/throat-chakra/details/SPEAK15.jpg", "/artworks/throat-chakra/details/SPEAK16.jpg", "/artworks/throat-chakra/details/SPEAK17.jpg", "/artworks/throat-chakra/details/SPEAK18.jpg", "/artworks/throat-chakra/details/SPEAK19.jpg", "/artworks/throat-chakra/details/SPEAK2.jpg", "/artworks/throat-chakra/details/SPEAK20.jpg", "/artworks/throat-chakra/details/SPEAK21.jpg", "/artworks/throat-chakra/details/SPEAK22.jpg", "/artworks/throat-chakra/details/SPEAK23.jpg", "/artworks/throat-chakra/details/SPEAK3.jpg", "/artworks/throat-chakra/details/SPEAK4.jpg", "/artworks/throat-chakra/details/SPEAK5.jpg", "/artworks/throat-chakra/details/SPEAK6.jpg", "/artworks/throat-chakra/details/SPEAK7.jpg", "/artworks/throat-chakra/details/SPEAK8.jpg", "/artworks/throat-chakra/details/SPEAK9.jpg"],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "throat", "vishuddha", "truth", "communication", "cymatics", "language"],
    featured: false,
  },
  {
    id: "bev-006",
    slug: "third-eye-chakra",
    title: "Bio-Energetic Vortexes No.6 — Insight (Ajna Chakra)",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "The sixth of seven from the Bio-Energetic Vortexes sub-series. First artwork completed in 2020, depicting the Ajna Third Eye Chakra and the energetic force of clear vision and crystalline clarity implementation.",
    images: [`${BASE}/third-eye-chakra/main.jpg`],
    detailImages: ["/artworks/third-eye-chakra/details/SEE1.jpg", "/artworks/third-eye-chakra/details/SEE10.jpg", "/artworks/third-eye-chakra/details/SEE11.jpg", "/artworks/third-eye-chakra/details/SEE12.jpg", "/artworks/third-eye-chakra/details/SEE13.jpg", "/artworks/third-eye-chakra/details/SEE14.jpg", "/artworks/third-eye-chakra/details/SEE15.jpg", "/artworks/third-eye-chakra/details/SEE16.jpg", "/artworks/third-eye-chakra/details/SEE17.jpg", "/artworks/third-eye-chakra/details/SEE18.jpg", "/artworks/third-eye-chakra/details/SEE19.jpg", "/artworks/third-eye-chakra/details/SEE2.jpg", "/artworks/third-eye-chakra/details/SEE20.jpg", "/artworks/third-eye-chakra/details/SEE21.jpg", "/artworks/third-eye-chakra/details/SEE22.jpg", "/artworks/third-eye-chakra/details/SEE23.jpg", "/artworks/third-eye-chakra/details/SEE24.jpg", "/artworks/third-eye-chakra/details/SEE25.jpg", "/artworks/third-eye-chakra/details/SEE26.jpg", "/artworks/third-eye-chakra/details/SEE27.jpg", "/artworks/third-eye-chakra/details/SEE3.jpg", "/artworks/third-eye-chakra/details/SEE4.jpg", "/artworks/third-eye-chakra/details/SEE5.jpg", "/artworks/third-eye-chakra/details/SEE6.jpg", "/artworks/third-eye-chakra/details/SEE7.jpg", "/artworks/third-eye-chakra/details/SEE8.jpg", "/artworks/third-eye-chakra/details/SEE9.jpg"],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "third-eye", "ajna", "insight", "vision", "clarity", "sacred-geometry"],
    featured: false,
  },
  {
    id: "bev-007",
    slug: "crown-chakra",
    title: "Bio-Energetic Vortexes No.7 — Spirit (Sahasrara Chakra)",
    year: 2022,
    medium: "Adobe Photoshop",
    description:
      "The seventh and final seal of the Bio-Energetic Vortexes series. A personal rendition of the Sahasrara Crown Chakra. A visual journal entry into the intimate experience of the 'Thousand Petal Lotus' opening — a homage to basking in the glory of divine consciousness. Not an interpretation of Samadhi, but a direct transmission of the experience.",
    images: [`${BASE}/crown-chakra/main.jpg`],
    detailImages: ["/artworks/crown-chakra/details/SPIRIT1.jpg", "/artworks/crown-chakra/details/SPIRIT10.jpg", "/artworks/crown-chakra/details/SPIRIT11.jpg", "/artworks/crown-chakra/details/SPIRIT12.jpg", "/artworks/crown-chakra/details/SPIRIT13.jpg", "/artworks/crown-chakra/details/SPIRIT14.jpg", "/artworks/crown-chakra/details/SPIRIT15.jpg", "/artworks/crown-chakra/details/SPIRIT16.jpg", "/artworks/crown-chakra/details/SPIRIT17.jpg", "/artworks/crown-chakra/details/SPIRIT18.jpg", "/artworks/crown-chakra/details/SPIRIT19.jpg", "/artworks/crown-chakra/details/SPIRIT2.jpg", "/artworks/crown-chakra/details/SPIRIT20.jpg", "/artworks/crown-chakra/details/SPIRIT21.jpg", "/artworks/crown-chakra/details/SPIRIT22.jpg", "/artworks/crown-chakra/details/SPIRIT23.jpg", "/artworks/crown-chakra/details/SPIRIT24.jpg", "/artworks/crown-chakra/details/SPIRIT25.jpg", "/artworks/crown-chakra/details/SPIRIT26.jpg", "/artworks/crown-chakra/details/SPIRIT27.jpg", "/artworks/crown-chakra/details/SPIRIT3.jpg", "/artworks/crown-chakra/details/SPIRIT4.jpg", "/artworks/crown-chakra/details/SPIRIT5.jpg", "/artworks/crown-chakra/details/SPIRIT6.jpg", "/artworks/crown-chakra/details/SPIRIT7.jpg", "/artworks/crown-chakra/details/SPIRIT8.jpg", "/artworks/crown-chakra/details/SPIRIT9.jpg"],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "crown", "sahasrara", "spirit", "kundalini", "samadhi", "divine", "sacred-geometry"],
    featured: true,
  },

  // ═══════════════════════════════════════════════════
  // UNIVERSAL TRANSMISSIONS MAIN SERIES (11)
  // ═══════════════════════════════════════════════════
  {
    id: "ut-001",
    slug: "tetragrammaton",
    title: "Universal Transmissions I — Tetragrammaton",
    year: 2014,
    medium: "Adobe Photoshop, Cinema 4D, Zbrush, Adobe Illustrator, Mandelbulber, Ultra Fractal 5",
    description:
      "This is where it all began. The first image for the Universal Transmissions Codex. The first image of the series, and the image that gave birth to a unique style of art. The Tetragrammaton — the four-letter name of God — rendered as a portal into hidden dimensions of meaning.",
    images: [`${BASE}/tetragrammaton/main.jpg`],
    detailImages: ["/artworks/tetragrammaton/details/Universal-Tranmissions-I---Tetragrammaton-01.jpg", "/artworks/tetragrammaton/details/Universal-Tranmissions-I---Tetragrammaton-02.jpg", "/artworks/tetragrammaton/details/Universal-Tranmissions-I---Tetragrammaton-03.jpg", "/artworks/tetragrammaton/details/Universal-Tranmissions-I---Tetragrammaton-04.jpg", "/artworks/tetragrammaton/details/Universal-Tranmissions-I---Tetragrammaton-05.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "tetragrammaton", "genesis", "sacred-geometry", "name-of-god"],
    featured: true,
  },
  {
    id: "ut-002",
    slug: "tesseract",
    title: "Universal Transmissions II — Tesseract",
    year: 2015,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Of strange surfaces. The second installment explores the tesseract — the four-dimensional hypercube — as a geometric key to higher dimensional navigation. An attempt to visualize what cannot be seen in three dimensions.",
    images: [`${BASE}/tessetact/main.jpg`],
    detailImages: Array.from({ length: 4 }, (_, i) => `${BASE}/tessetact/details/Universal-Transmissions-II---Tesseract---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
    available: true,
    prints: true,
    tags: ["universal-transmissions", "tesseract", "fourth-dimension", "hypercube", "sacred-geometry"],
    featured: false,
  },
  {
    id: "ut-003",
    slug: "merkaba",
    title: "Universal Transmissions III — Merkaba",
    year: 2016,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "The third installment of the Universal Transmissions series, exploring the Merkaba — the divine light vehicle described in ancient esoteric traditions as a spiraling force of counter-rotating fields of light.",
    images: [`${BASE}/merkaba/main.jpg`],
    detailImages: ["/artworks/merkaba/details/Universal-Tranmissions-IV---Merkaba-01.jpg", "/artworks/merkaba/details/Universal-Tranmissions-IV---Merkaba-02.jpg", "/artworks/merkaba/details/Universal-Tranmissions-IV---Merkaba-03.jpg", "/artworks/merkaba/details/Universal-Tranmissions-IV---Merkaba-04.jpg", "/artworks/merkaba/details/Universal-Tranmissions-IV---Merkaba-05.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "merkaba", "light-body", "sacred-geometry", "esoteric"],
    featured: false,
  },
  {
    id: "ut-004",
    slug: "tetra",
    title: "Universal Transmissions IV — Tetra",
    year: 2016,
    medium: "Adobe Photoshop",
    description:
      "Strange things concerning hyperspherologies of the divine. The fourth installment explores tetrahedral geometry and its relationship to higher dimensional reality.",
    images: [`${BASE}/tetra/main.jpg`],
    detailImages: ["/artworks/tetra/details/Universal-Tranmissions-III---Tetra-01.jpg", "/artworks/tetra/details/Universal-Tranmissions-III---Tetra-02.jpg", "/artworks/tetra/details/Universal-Tranmissions-III---Tetra-03.jpg", "/artworks/tetra/details/Universal-Tranmissions-III---Tetra-04.jpg", "/artworks/tetra/details/Universal-Tranmissions-III---Tetra-05.jpg", "/artworks/tetra/details/Universal-Tranmissions-III---Tetra-06.jpg", "/artworks/tetra/details/Universal-Tranmissions-III---Tetra-07.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "tetra", "tetrahedron", "sacred-geometry", "hyperspherology"],
    featured: false,
  },
  {
    id: "ut-005",
    slug: "higher-access",
    title: "Universal Transmissions V — Higher Access",
    year: 2017,
    medium: "Adobe Photoshop",
    description:
      "The Dark Page — on accessing higher dimensional realities. The fifth installment ventures into the liminal spaces between dimensions, exploring how consciousness can navigate beyond the physical body.",
    images: [`${BASE}/higher-access/main.jpg`],
    detailImages: ["/artworks/higher-access/details/Universal-Tranmissions-V---Higher-Access-01.jpg", "/artworks/higher-access/details/Universal-Tranmissions-V---Higher-Access-02.jpg", "/artworks/higher-access/details/Universal-Tranmissions-V---Higher-Access-03.jpg", "/artworks/higher-access/details/Universal-Tranmissions-V---Higher-Access-04.jpg", "/artworks/higher-access/details/Universal-Tranmissions-V---Higher-Access-05.jpg", "/artworks/higher-access/details/Universal-Tranmissions-V---Higher-Access-06.jpg", "/artworks/higher-access/details/Universal-Tranmissions-V---Higher-Access-07.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "higher-access", "dimensional-travel", "astral", "esoteric"],
    featured: false,
  },
  {
    id: "ut-006",
    slug: "vehicular-dynamics",
    title: "Universal Transmissions VI — Vehicular Dynamics",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Inspired by Trans-dimensional Linguistics, Esoteric literature on Out of Body Experiences, Dimensional Travel and the Akashic Records. 'Kadmon comes from Aveer Qadmon, meaning primitive air or Azoth.' A study on the Adam Kadmon — the cosmic man — and the divine pattern of the light body.",
    images: [`${BASE}/vehicular-dynamics/main.jpg`],
    detailImages: ["/artworks/vehicular-dynamics/details/Universal-Transmissions-VI---Vehicular-Dynamics---Detail-1.jpg", "/artworks/vehicular-dynamics/details/Universal-Transmissions-VI---Vehicular-Dynamics---Detail-2.jpg", "/artworks/vehicular-dynamics/details/Universal-Transmissions-VI---Vehicular-Dynamics---Detail-3.jpg", "/artworks/vehicular-dynamics/details/ut1.jpg", "/artworks/vehicular-dynamics/details/ut2.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "vehicular-dynamics", "adam-kadmon", "azoth", "light-body", "akashic"],
    featured: false,
  },
  {
    id: "ut-007",
    slug: "external-womb",
    title: "Universal Transmissions VII — External Womb",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Hoodwinked. A transmission concerning the incubation of Artificial Matrices and external wombs — exploring the esoteric implications of technology as an extension of biological processes.",
    images: [`${BASE}/external-womb/main.jpg`],
    detailImages: ["/artworks/external-womb/details/Universal-Transmissions-VII---External-Womb---Detail-01.jpg", "/artworks/external-womb/details/Universal-Transmissions-VII---External-Womb---Detail-02.jpg", "/artworks/external-womb/details/Universal-Transmissions-VII---External-Womb---Detail-03.jpg", "/artworks/external-womb/details/Universal-Transmissions-VII---External-Womb---Detail-04.jpg", "/artworks/external-womb/details/Universal-Transmissions-VII---External-Womb---Detail-05.jpg", "/artworks/external-womb/details/Universal-Transmissions-VII---External-Womb---Detail-06.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "external-womb", "artificial-matrix", "incubation", "technology"],
    featured: false,
  },
  {
    id: "ut-008",
    slug: "recursive-pantheism",
    title: "Universal Transmissions VIII — Recursive Pantheism",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Very much influenced and inspired by the works of Athanasius Kircher and Robert Fludd. An attempt to syncretise the relation between the macro and micro, the signs of the zodiac to chakra centers and their correlation to organs, cymatic patterns and frequencies.",
    images: [`${BASE}/recursive-pantheism/main.jpg`],
    detailImages: ["/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-01.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-02.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-03.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-04.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-05.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-06.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-07.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-08.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-09.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-10.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-11.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-12.jpg", "/artworks/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-13.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "recursive-pantheism", "kircher", "fludd", "zodiac", "chakra", "cymatics", "syncretism"],
    featured: true,
  },
  {
    id: "ut-009",
    slug: "cosmic-egg",
    title: "Universal Transmissions IX — The Cosmic Egg",
    year: 2018,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Set the egg before you, the God in its beginning. And behold it. And incubate it with the magical warmth of your gaze. — C.G. Jung. The ninth installment, deeply inspired by the syncretic cosmologies of all ancient civilizations.",
    images: [`${BASE}/cosmic-egg/main.jpg`],
    detailImages: ["/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-01.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-02.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-03.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-04.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-05.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-06.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-07.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-08.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-09.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-10.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-11.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-12.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-13.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-14.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-15.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-16.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-17.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-18.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-19.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-20.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-21.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-22.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-23.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-24.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-25.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-26.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-27.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-28.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-29.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-30.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-31.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-32.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-33.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-34.jpg", "/artworks/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-35.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "cosmic-egg", "cosmology", "jung", "ancient-civilizations", "syncretism"],
    featured: false,
  },
  {
    id: "ut-010",
    slug: "vortex-dynamics",
    title: "Universal Transmissions X — Vortex Dynamics",
    year: 2019,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Transmission on Spiral Charge Compression and Phase Conjugation in relation to Sufi Ennealogy, Dervish dynamics and implosive bliss practices. 'Without self knowledge, without understanding the working and functions of his machine, man cannot be free.' — G.I. Gurdjieff",
    images: [`${BASE}/vortex-dynamics/main.jpg`],
    detailImages: ["/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-01.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-02.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-03.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-04.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-05.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-06.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-07.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-08.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-09.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-10.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-11.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-12.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-13.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-14.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-15.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-16.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-17.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-18.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-19.jpg", "/artworks/vortex-dynamics/details/Vortex-Dynamics---Detail-20.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "vortex-dynamics", "sufism", "dervish", "spiral", "phase-conjugation", "gurdjieff"],
    featured: false,
  },
  {
    id: "ut-011",
    slug: "vitruvian-spirit",
    title: "Universal Transmissions XI — Vitruvian Spirit (Seeding the New Renaissance)",
    year: 2021,
    medium: "Adobe Photoshop",
    description:
      "A homage to the masters of antiquity who have inspired generations to create and innovate, a celebration of the human spirit and imagination. This piece is not about gender — it contains a message of balance, of the power of the divine feminine and masculine and of the balanced trinity within us all. 'We are the exemplar, the immaculate conception, the apex being, we are the Mercurial Bodhisattva.'",
    images: [`${BASE}/vitruvian-spirit/main.jpg`],
    detailImages: ["/artworks/vitruvian-spirit/details/vs MEME.jpg", "/artworks/vitruvian-spirit/details/vs1.jpg", "/artworks/vitruvian-spirit/details/vs10.jpg", "/artworks/vitruvian-spirit/details/vs11.jpg", "/artworks/vitruvian-spirit/details/vs12.jpg", "/artworks/vitruvian-spirit/details/vs13.jpg", "/artworks/vitruvian-spirit/details/vs14.jpg", "/artworks/vitruvian-spirit/details/vs15.jpg", "/artworks/vitruvian-spirit/details/vs16.jpg", "/artworks/vitruvian-spirit/details/vs17.jpg", "/artworks/vitruvian-spirit/details/vs18.jpg", "/artworks/vitruvian-spirit/details/vs19.jpg", "/artworks/vitruvian-spirit/details/vs2.jpg", "/artworks/vitruvian-spirit/details/vs20.jpg", "/artworks/vitruvian-spirit/details/vs21.jpg", "/artworks/vitruvian-spirit/details/vs22.jpg", "/artworks/vitruvian-spirit/details/vs23.jpg", "/artworks/vitruvian-spirit/details/vs24.jpg", "/artworks/vitruvian-spirit/details/vs25.jpg", "/artworks/vitruvian-spirit/details/vs26.jpg", "/artworks/vitruvian-spirit/details/vs27.jpg", "/artworks/vitruvian-spirit/details/vs28.jpg", "/artworks/vitruvian-spirit/details/vs29.jpg", "/artworks/vitruvian-spirit/details/vs3.jpg", "/artworks/vitruvian-spirit/details/vs30.jpg", "/artworks/vitruvian-spirit/details/vs31.jpg", "/artworks/vitruvian-spirit/details/vs32.jpg", "/artworks/vitruvian-spirit/details/vs33.jpg", "/artworks/vitruvian-spirit/details/vs34.jpg", "/artworks/vitruvian-spirit/details/vs35.jpg", "/artworks/vitruvian-spirit/details/vs36.jpg", "/artworks/vitruvian-spirit/details/vs37.jpg", "/artworks/vitruvian-spirit/details/vs38.jpg", "/artworks/vitruvian-spirit/details/vs39.jpg", "/artworks/vitruvian-spirit/details/vs4.jpg", "/artworks/vitruvian-spirit/details/vs40.jpg", "/artworks/vitruvian-spirit/details/vs41.jpg", "/artworks/vitruvian-spirit/details/vs5.jpg", "/artworks/vitruvian-spirit/details/vs6.jpg", "/artworks/vitruvian-spirit/details/vs7.jpg", "/artworks/vitruvian-spirit/details/vs8.jpg", "/artworks/vitruvian-spirit/details/vs9.jpg"],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "vitruvian", "renaissance", "balance", "divine-feminine", "divine-masculine", "androgen"],
    featured: true,
  },

  // ═══════════════════════════════════════════════════
  // TWILIGHT TRANSMISSIONS SERIES
  // ═══════════════════════════════════════════════════
  {
    id: "tw-001",
    slug: "prismatic-equation",
    title: "Prismatic Equation",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Another spin-off sub series of Universal Transmissions. Prismatic renditions of the classic style, exploring the liminal space between day and night, known and unknown.",
    images: [`${BASE}/prismatic-equation/main.jpg`],
    detailImages: ["/artworks/prismatic-equation/details/pe1.jpg", "/artworks/prismatic-equation/details/pe2.jpg", "/artworks/prismatic-equation/details/pe3.jpg", "/artworks/prismatic-equation/details/pe4.jpg", "/artworks/prismatic-equation/details/pe5.jpg", "/artworks/prismatic-equation/details/pe6.jpg", "/artworks/prismatic-equation/details/pe7.jpg", "/artworks/prismatic-equation/details/pe8.jpg", "/artworks/prismatic-equation/details/pe9.jpg"],
    available: true,
    prints: true,
    tags: ["twilight-transmissions", "prismatic", "spin-off", "sacred-geometry"],
    featured: false,
  },
  {
    id: "tw-002",
    slug: "trinary-transcendence",
    title: "Trinary Transcendence",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "On the integration of transcendental practices in relation to Trinary consciousness. Utilizing archetypes of the trinity and Trimurti to aid in transcending Binary modes of awareness. Created during a hypomanic state — exploring the space beyond duality.",
    images: [`${BASE}/trinary-transcendence/main.jpg`],
    detailImages: ["/artworks/trinary-transcendence/details/tt1.jpg", "/artworks/trinary-transcendence/details/tt10.jpg", "/artworks/trinary-transcendence/details/tt11.jpg", "/artworks/trinary-transcendence/details/tt12.jpg", "/artworks/trinary-transcendence/details/tt13.jpg", "/artworks/trinary-transcendence/details/tt14.jpg", "/artworks/trinary-transcendence/details/tt15.jpg", "/artworks/trinary-transcendence/details/tt16.jpg", "/artworks/trinary-transcendence/details/tt17.jpg", "/artworks/trinary-transcendence/details/tt18.jpg", "/artworks/trinary-transcendence/details/tt19.jpg", "/artworks/trinary-transcendence/details/tt2.jpg", "/artworks/trinary-transcendence/details/tt20.jpg", "/artworks/trinary-transcendence/details/tt3.jpg", "/artworks/trinary-transcendence/details/tt4.jpg", "/artworks/trinary-transcendence/details/tt5.jpg", "/artworks/trinary-transcendence/details/tt6.jpg", "/artworks/trinary-transcendence/details/tt7.jpg", "/artworks/trinary-transcendence/details/tt8.jpg", "/artworks/trinary-transcendence/details/tt9.jpg"],
    available: true,
    prints: true,
    tags: ["twilight-transmissions", "trinary", "trinity", "trimurti", "transcendence", "binary", "consciousness"],
    featured: false,
  },
  {
    id: "tw-003",
    slug: "hyperdimensional-harmonics",
    title: "Hyperdimensional Harmonics",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D, Corel Painter, Adobe Illustrator",
    description:
      "Knowledge is finding the door, Experience is walking through it. On the harmonic integration of hyperdimensional constructs into practical applications.",
    images: [`${BASE}/hyperdimensional-harmonics/main.jpg`],
    detailImages: ["/artworks/hyperdimensional-harmonics/details/hh1.jpg", "/artworks/hyperdimensional-harmonics/details/hh2.jpg", "/artworks/hyperdimensional-harmonics/details/hh3.jpg", "/artworks/hyperdimensional-harmonics/details/hh4.jpg", "/artworks/hyperdimensional-harmonics/details/hh5.jpg", "/artworks/hyperdimensional-harmonics/details/hh6.jpg"],
    available: true,
    prints: true,
    tags: ["twilight-transmissions", "hyperdimensional", "harmonics", "frequency", "sacred-geometry"],
    featured: false,
  },
  {
    id: "tw-004",
    slug: "translinguistic-equation",
    title: "Translinguistic Equation",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D, Corel Painter, Adobe Illustrator",
    description:
      "On amplifying the higher cortical experience by translinguistically encoding DNA electron spin resonance into monoamine inhibited harmala alkaloids. A visualization of language as a living quantum field.",
    images: [`${BASE}/translinguistic-equation/main.jpg`],
    detailImages: ["/artworks/translinguistic-equation/details/translinguistic-equation-detail-01.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-02.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-03.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-04.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-05.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-06.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-07.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-08.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-09.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-10.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-11.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-12.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-13.jpg", "/artworks/translinguistic-equation/details/translinguistic-equation-detail-14.jpg"],
    available: true,
    prints: true,
    tags: ["translinguistic", "DNA", "cymatics", "language", "quantum"],
    featured: false,
  },
  {
    id: "tw-005",
    slug: "immaculate-conception",
    title: "Immaculate Conception",
    year: 2021,
    medium: "Adobe Photoshop, Cinema 4D, Zbrush, Mandelbulb 3D",
    description:
      "Without words, it reached into the fabric of my being. The language of thought dissolved as only the imprint remained, pulsing alive with ineffable meaning.",
    images: [`${BASE}/immaculate-conception/main.jpg`],
    detailImages: ["/artworks/immaculate-conception/details/ic1.jpg", "/artworks/immaculate-conception/details/ic2.jpg"],
    available: true,
    prints: true,
    tags: ["twilight-transmissions", "imprint", "ineffable", "language"],
    featured: false,
  },
  {
    id: "tw-006",
    slug: "twilight-pantheism",
    title: "Twilight Pantheism",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Exploring the divine immanence within the natural world, rendered in the prismatic twilight tones of the Twilight Transmissions series.",
    images: [`${BASE}/twilight-pantheism/main.jpg`],
    detailImages: [],
    available: true,
    prints: true,
    tags: ["twilight-pantheism", "pantheism", "twilight-transmissions", "divine", "nature"],
    featured: false,
  },

  // ═══════════════════════════════════════════════════
  // STANDALONE WORKS
  // ═══════════════════════════════════════════════════
  {
    id: "sw-001",
    slug: "caelestis-lupus",
    title: "Caelestis Lupus",
    year: 2022,
    medium: "Adobe Photoshop",
    description:
      "The first digital work of 2022 started off as the 27th page of the Universal Transmissions Codex. Created together with the artist's then 6-year-old son Ates, who suggested the wolf subject. Many ideas and elements in this piece are his ideas and suggestions, as well as some of the encoded texts within the image. A peak bliss experience — a true honor to continue a family tradition of fostering the love of art.",
    images: [`${BASE}/caelestis-lupus/main.jpg`],
    detailImages: ["/artworks/caelestis-lupus/details/CL1.jpg", "/artworks/caelestis-lupus/details/CL2.jpg", "/artworks/caelestis-lupus/details/CL3.jpg", "/artworks/caelestis-lupus/details/CL4.jpg", "/artworks/caelestis-lupus/details/CL5.jpg", "/artworks/caelestis-lupus/details/CL6.jpg"],
    available: true,
    prints: true,
    tags: ["caelestis-lupus", "wolf", "codex", "family", "collaboration"],
    featured: false,
  },
  {
    id: "sw-002",
    slug: "enchanted-essence",
    title: "Enchanted Essence",
    year: 2021,
    medium: "Adobe Photoshop, Cinema 4D, Mandelbulb 3D",
    description:
      "Mastering and knowing others is strength and wisdom, mastering and knowing your self is true power and enlightenment.",
    images: [`${BASE}/enchanted-essence/main.jpg`],
    detailImages: ["/artworks/enchanted-essence/details/ee1.jpg", "/artworks/enchanted-essence/details/ee10.jpg", "/artworks/enchanted-essence/details/ee11.jpg", "/artworks/enchanted-essence/details/ee12.jpg", "/artworks/enchanted-essence/details/ee2.jpg", "/artworks/enchanted-essence/details/ee3.jpg", "/artworks/enchanted-essence/details/ee4.jpg", "/artworks/enchanted-essence/details/ee5.jpg", "/artworks/enchanted-essence/details/ee6.jpg", "/artworks/enchanted-essence/details/ee7.jpg", "/artworks/enchanted-essence/details/ee8.jpg", "/artworks/enchanted-essence/details/ee9.jpg"],
    available: true,
    prints: true,
    tags: ["enchanted-essence", "twilight-transmissions", "self-knowledge", "enlightenment"],
    featured: false,
  },
  {
    id: "sw-003",
    slug: "ethera-24",
    title: "ETHERA 24",
    year: 2022,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "The universal solvent of consciousness. An exploration of the alchemical ETHERA principle — the fifth element beyond earth, water, fire, and air.",
    images: [`${BASE}/ethera-24/main.jpg`],
    detailImages: ["/artworks/ethera-24/details/eth1.jpg", "/artworks/ethera-24/details/eth10.jpg", "/artworks/ethera-24/details/eth11.jpg", "/artworks/ethera-24/details/eth12.jpg", "/artworks/ethera-24/details/eth2.jpg", "/artworks/ethera-24/details/eth3.jpg", "/artworks/ethera-24/details/eth4.jpg", "/artworks/ethera-24/details/eth5.jpg", "/artworks/ethera-24/details/eth6.jpg", "/artworks/ethera-24/details/eth7.jpg", "/artworks/ethera-24/details/eth8.jpg", "/artworks/ethera-24/details/eth9.jpg"],
    available: true,
    prints: true,
    tags: ["ethera", "alchemy", "fifth-element", "ether", "consciousness"],
    featured: false,
  },
  {
    id: "sw-004",
    slug: "frequency-tuner",
    title: "Frequency Tuner",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Ultra Fractal 5",
    description:
      "A standard, run of the mill, hyper-dimensional Frequency Tuner. An exploration of the instrument through which consciousness calibrates itself to the frequencies of higher dimensions.",
    images: [`${BASE}/frequency-tuner/main.jpg`],
    detailImages: ["/artworks/frequency-tuner/details/ft1.jpg", "/artworks/frequency-tuner/details/ft2.jpg", "/artworks/frequency-tuner/details/ft3.jpg", "/artworks/frequency-tuner/details/ft4.jpg", "/artworks/frequency-tuner/details/ft5.jpg", "/artworks/frequency-tuner/details/ft6.jpg"],
    available: true,
    prints: true,
    tags: ["frequency-tuner", "frequency", "cymatics", "tuning", "hyper-dimensional"],
    featured: false,
  },
  {
    id: "sw-005",
    slug: "reversible-ratio",
    title: "Reversible Ratio",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator",
    description:
      "Regarding the Non-dual Inversion Principles of solid state and wave form embeddability. A gift to all Universal Transmissions Patrons exploring the mathematical beauty of inversion and non-duality.",
    images: [`${BASE}/reversible-ratio/main.jpg`],
    detailImages: ["/artworks/reversible-ratio/details/RATIO1.jpg", "/artworks/reversible-ratio/details/RATIO10.jpg", "/artworks/reversible-ratio/details/RATIO11.jpg", "/artworks/reversible-ratio/details/RATIO12.jpg", "/artworks/reversible-ratio/details/RATIO13.jpg", "/artworks/reversible-ratio/details/RATIO14.jpg", "/artworks/reversible-ratio/details/RATIO15.jpg", "/artworks/reversible-ratio/details/RATIO2.jpg", "/artworks/reversible-ratio/details/RATIO3.jpg", "/artworks/reversible-ratio/details/RATIO4.jpg", "/artworks/reversible-ratio/details/RATIO5.jpg", "/artworks/reversible-ratio/details/RATIO6.jpg", "/artworks/reversible-ratio/details/RATIO7.jpg", "/artworks/reversible-ratio/details/RATIO8.jpg", "/artworks/reversible-ratio/details/RATIO9.jpg"],
    available: true,
    prints: true,
    tags: ["reversible-ratio", "non-dual", "inversion", "wave-form", "mathematics"],
    featured: false,
  },
  {
    id: "sw-006",
    slug: "torroidal-tantra",
    title: "Toroidal Tantra",
    year: 2019,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "On the nature of true tantric self love and its effect on the energetic vortexes through Ida, Pingala and Sushumna's relation to the cosmic serpent. Toroidal Tantra bridges the Universal Transmissions and Bio-Energetic Vortexes series together into a cohesive narrative.",
    images: [`${BASE}/torroidal-tantra/main.jpg`],
    detailImages: ["/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-01.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-02.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-03.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-04.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-05.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-06.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-07.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-08.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-09.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-10.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-11.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-12.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-13.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-14.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-15.jpg", "/artworks/torroidal-tantra/details/Torroidal-Tantra---Detail-16.jpg"],
    available: true,
    prints: true,
    tags: ["toroidal-tantra", "torus", "tantra", "kundalini", "ida-pingala", "sushumna", "cosmic-serpent", "bio-energetic-vortexes"],
    featured: false,
  },
  {
    id: "sw-007",
    slug: "trivium-method",
    title: "Trivium Method",
    year: 2019,
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Ultra Fractal 5, Mandelbulb 3D",
    description:
      "Inspired by the Trivium and Quadrivium learning methods of antiquity, and blended with acquired wisdom imparted from hyperdimensional gnosis. The three arts of the Trivium — Grammar, Logic, Rhetoric — visualized as geometric transmission.",
    images: [`${BASE}/trivium-method/main.jpg`],
    detailImages: ["/artworks/trivium-method/details/Trivium-Method-Detail-01.jpg", "/artworks/trivium-method/details/Trivium-Method-Detail-02.jpg", "/artworks/trivium-method/details/Trivium-Method-Detail-03.jpg", "/artworks/trivium-method/details/Trivium-Method-Detail-04.jpg", "/artworks/trivium-method/details/Trivium-Method-Detail-05.jpg", "/artworks/trivium-method/details/Trivium-Method-Detail-06.jpg", "/artworks/trivium-method/details/Trivium-Method-Detail-07.jpg"],
    available: true,
    prints: true,
    tags: ["trivium", "quadrivium", "grammar", "logic", "rhetoric", "antiquity", "sacred-geometry"],
    featured: false,
  },
  {
    id: "sw-008",
    slug: "linguistic-mystic",
    title: "Linguistic Mystic",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D, Corel Painter, Adobe Illustrator",
    description:
      "Inspired by the age old Strophariad Mystic mentors of Translinguistic syntax, that launched legendary ludicrous lexicons of language into the Noosphere. A study in the mystic relationship between language, consciousness and the cosmos.",
    images: [`${BASE}/linguistic-mystic/main.jpg`],
    detailImages: ["/artworks/linguistic-mystic/details/lm1.jpg", "/artworks/linguistic-mystic/details/lm10.jpg", "/artworks/linguistic-mystic/details/lm11.jpg", "/artworks/linguistic-mystic/details/lm2.jpg", "/artworks/linguistic-mystic/details/lm3.jpg", "/artworks/linguistic-mystic/details/lm4.jpg", "/artworks/linguistic-mystic/details/lm5.jpg", "/artworks/linguistic-mystic/details/lm6.jpg", "/artworks/linguistic-mystic/details/lm7.jpg", "/artworks/linguistic-mystic/details/lm8.jpg", "/artworks/linguistic-mystic/details/lm9.jpg"],
    available: true,
    prints: true,
    tags: ["linguistic-mystic", "xenolinguistics", "noosphere", "language", "mystic"],
    featured: false,
  },
  {
    id: "sw-009",
    slug: "polarity-modulation",
    title: "Polarity Modulation",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "On the alchemical art of polarity management — the science of navigating between opposing forces to generate harmonic resonance within the personal energetic field.",
    images: [`${BASE}/polarity-modulation/main.jpg`],
    detailImages: ["/artworks/polarity-modulation/details/pm1.jpg", "/artworks/polarity-modulation/details/pm10.jpg", "/artworks/polarity-modulation/details/pm11.jpg", "/artworks/polarity-modulation/details/pm12.jpg", "/artworks/polarity-modulation/details/pm13.jpg", "/artworks/polarity-modulation/details/pm14.jpg", "/artworks/polarity-modulation/details/pm15.jpg", "/artworks/polarity-modulation/details/pm16.jpg", "/artworks/polarity-modulation/details/pm17.jpg", "/artworks/polarity-modulation/details/pm18.jpg", "/artworks/polarity-modulation/details/pm19.jpg", "/artworks/polarity-modulation/details/pm2.jpg", "/artworks/polarity-modulation/details/pm20.jpg", "/artworks/polarity-modulation/details/pm21.jpg", "/artworks/polarity-modulation/details/pm22.jpg", "/artworks/polarity-modulation/details/pm23.jpg", "/artworks/polarity-modulation/details/pm24.jpg", "/artworks/polarity-modulation/details/pm25.jpg", "/artworks/polarity-modulation/details/pm26.jpg", "/artworks/polarity-modulation/details/pm27.jpg", "/artworks/polarity-modulation/details/pm3.jpg", "/artworks/polarity-modulation/details/pm4.jpg", "/artworks/polarity-modulation/details/pm5.jpg", "/artworks/polarity-modulation/details/pm6.jpg", "/artworks/polarity-modulation/details/pm7.jpg", "/artworks/polarity-modulation/details/pm8.jpg", "/artworks/polarity-modulation/details/pm9.jpg", "/artworks/polarity-modulation/details/yin yang 2.jpg"],
    available: true,
    prints: true,
    tags: ["polarity-modulation", "alchemy", "polarity", "resonance", "energy"],
    featured: false,
  },
  {
    id: "sw-010",
    slug: "indras-net",
    title: "Indra's Net",
    year: 2019,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Every jewel reflects all the others. An exploration of Indra's Net — the infinite web of interconnection that underlies all existence, where every node contains the whole.",
    images: [`${BASE}/indras-net/main.jpg`],
    detailImages: ["/artworks/indras-net/details/in1.jpg", "/artworks/indras-net/details/in2.jpg", "/artworks/indras-net/details/in3.jpg", "/artworks/indras-net/details/in4.jpg", "/artworks/indras-net/details/in5.jpg", "/artworks/indras-net/details/in6.jpg", "/artworks/indras-net/details/in7.jpg", "/artworks/indras-net/details/in8.jpg"],
    available: true,
    prints: true,
    tags: ["indras-net", " Indra", "interconnection", "Buddhism", "sacred-geometry", "web"],
    featured: false,
  },
  {
    id: "sw-011",
    slug: "innerstellar-telemetry",
    title: "Innerstellar Telemetry",
    year: 2022,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Mapping the inner cosmos. Telemetry data from deep inner space exploration — the cartography of consciousness as it navigates the constellations of the psyche.",
    images: [`${BASE}/innerstellar-telemetry/main.jpg`],
    detailImages: ["/artworks/innerstellar-telemetry/details/IT1.jpg", "/artworks/innerstellar-telemetry/details/IT10.jpg", "/artworks/innerstellar-telemetry/details/IT2.jpg", "/artworks/innerstellar-telemetry/details/IT3.jpg", "/artworks/innerstellar-telemetry/details/IT4.jpg", "/artworks/innerstellar-telemetry/details/IT5.jpg", "/artworks/innerstellar-telemetry/details/IT6.jpg", "/artworks/innerstellar-telemetry/details/IT7.jpg", "/artworks/innerstellar-telemetry/details/IT8.jpg", "/artworks/innerstellar-telemetry/details/IT9.jpg"],
    available: true,
    prints: true,
    tags: ["innerstellar", "telemetry", "consciousness", "cartography", "psyche"],
    featured: false,
  },
];

export function getArtwork(slug: string): Artwork | undefined {
  return artworks.find((a) => a.slug === slug);
}

export function getFeaturedArtworks(): Artwork[] {
  return artworks.filter((a) => a.featured);
}
