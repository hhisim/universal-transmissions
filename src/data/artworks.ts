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
    detailImages: Array.from({ length: 18 }, (_, i) => `${BASE}/root-chakra/details/Universal-Transmissions-I---Tetragrammaton---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 9 }, (_, i) => `${BASE}/sacral-chakra/details/Universal-Transmissions-II---Tesseract---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 13 }, (_, i) => `${BASE}/solar-plexus-chakra/details/Universal-Transmissions-III---Merkaba---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 11 }, (_, i) => `${BASE}/heart-chakra/details/Universal-Transmissions-IV---Tetra---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 23 }, (_, i) => `${BASE}/throat-chakra/details/Universal-Transmissions-V---Higher-Access---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 27 }, (_, i) => `${BASE}/third-eye-chakra/details/Universal-Transmissions-VI---Vehicular-Dynamics---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 27 }, (_, i) => `${BASE}/crown-chakra/details/Universal-Transmissions-VII---External-Womb---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 5 }, (_, i) => `${BASE}/tetragrammaton/details/MANUSCRIPT ${i + 1} - web.jpg`),
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
    detailImages: Array.from({ length: 5 }, (_, i) => `${BASE}/merkaba/details/Universal-Transmissions-III---Merkaba---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 7 }, (_, i) => `${BASE}/tetra/details/Universal-Transmissions-IV---Tetra---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 7 }, (_, i) => `${BASE}/higher-access/details/Universal-Transmissions-V---Higher-Access---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 5 }, (_, i) => `${BASE}/vehicular-dynamics/details/Universal-Transmissions-VI---Vehicular-Dynamics---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 6 }, (_, i) => `${BASE}/external-womb/details/Universal-Transmissions-VII---External-Womb---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 13 }, (_, i) => `${BASE}/recursive-pantheism/details/Universal-Transmissions-VIII---Recursive-Pantheism---Detaill-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 35 }, (_, i) => `${BASE}/cosmic-egg/details/Universal-Transmissions-IX---The-Cosmic-Egg---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 20 }, (_, i) => `${BASE}/vortex-dynamics/details/Universal-Transmissions-X---Vortex-Dynamics---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 42 }, (_, i) => `${BASE}/vitruvian-spirit/details/Universal-Transmissions-XI---Vitruvian-Spirit---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 9 }, (_, i) => `${BASE}/prismatic-equation/details/Prismatic-Equation---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 20 }, (_, i) => `${BASE}/trinary-transcendence/details/Universal-Transmissions-XII---Trinary-Transcendence---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 42 }, (_, i) => `${BASE}/hyperdimensional-harmonics/details/Universal-Transmissions-XIII---Hyperdimensional-Harmonics---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 14 }, (_, i) => `${BASE}/translinguistic-equation/details/Universal-Transmissions-XIV---Translinguistic-Equation---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
    available: true,
    prints: true,
    tags: ["twilight-transmissions", "translinguistic", "DNA", "cymatics", "language", "quantum"],
    featured: false,
  },
  {
    id: "tw-005",
    slug: "immaculate-conception",
    title: "Translinguistic Imprint",
    year: 2021,
    medium: "Adobe Photoshop, Cinema 4D, Zbrush, Mandelbulb 3D",
    description:
      "Without words, it reached into the fabric of my being. The language of thought dissolved as only the imprint remained, pulsing alive with ineffable meaning.",
    images: [`${BASE}/immaculate-conception/main.jpg`],
    detailImages: Array.from({ length: 2 }, (_, i) => `${BASE}/immaculate-conception/details/Universal-Transmissions-XV---Immaculate-Conception---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
    available: true,
    prints: true,
    tags: ["twilight-transmissions", "translinguistic", "imprint", "ineffable", "language"],
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
    detailImages: Array.from({ length: 6 }, (_, i) => `${BASE}/caelestis-lupus/details/Universal-Transmissions-XVI---Caelestis-Lupus---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 12 }, (_, i) => `${BASE}/enchanted-essence/details/Universal-Transmissions-XVII---Enchanted-Essence---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 12 }, (_, i) => `${BASE}/ethera-24/details/ETHERA-24---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 6 }, (_, i) => `${BASE}/frequency-tuner/details/Frequency-Tuner---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 15 }, (_, i) => `${BASE}/reversible-ratio/details/Reversible-Ratio---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 16 }, (_, i) => `${BASE}/torroidal-tantra/details/Universal-Transmissions-XVIII---Toroidal-Tantra---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 7 }, (_, i) => `${BASE}/trivium-method/details/Universal-Transmissions-XIX---Trivium-Method---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 11 }, (_, i) => `${BASE}/linguistic-mystic/details/Universal-Transmissions-XX---Linguistic-Mystic---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 28 }, (_, i) => `${BASE}/polarity-modulation/details/Universal-Transmissions-XXI---Polarity-Modulation---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
    detailImages: Array.from({ length: 8 }, (_, i) => `${BASE}/indras-net/details/in${i + 1}.jpg`),
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
    detailImages: Array.from({ length: 10 }, (_, i) => `${BASE}/innerstellar-telemetry/details/Innerstellar-Telemetry---Detail-${String(i + 1).padStart(2, "0")}.jpg`),
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
