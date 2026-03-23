export interface Artwork {
  id: string;
  slug: string;
  title: string;
  year: number;
  medium: string;
  description: string;
  images: string[];
  available: boolean;
  price?: number;
  prints?: boolean;
  tags: string[];
  featured?: boolean;
}

/* ─────────────────────────────────────────────────────────
   Universal Transmissions — Artwork Collection
   Sourced from Squarespace after migration
   ───────────────────────────────────────────────────────── */
export const artworks: Artwork[] = [
  // ═══════════════════════════════════════════════════
  // BIO-ENERGETIC VORTEXES SERIES
  // ═══════════════════════════════════════════════════
  {
    id: "bev-001",
    slug: "bio-energetic-vortexes-no1-root-root-chakra",
    title: "Bio-Energetic Vortexes No.1 - Root (Root Chakra)",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D, Ultra Fractal 5, Adobe Illustrator, Mandelbulb 3D",
    description:
      "The series 'Energy Vortexes' is an exploration of the main energy wheels, sagras or chakras of apex beings and hyper-dimensional alien lifeforms alike and their relation to the hyper-spatial topology of physical and non-corporeal organs. The first image of the Universal Transmissions Chakra series, depicting the Root Muladhara Chakra.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1501049101195-GS4PI1ZV7W309Y1IORIY/image-asset.jpeg",
    ],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "root", "muladhara", "sacred-geometry", "kundalini"],
    featured: true,
  },
  {
    id: "bev-002",
    slug: "bio-energetic-vortexes-no2-flow-sacral-chakra",
    title: "Bio-Energetic Vortexes No.2 - Flow (Sacral Chakra)",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator",
    description:
      "The second of seven from the Bio-Energetic Vortexes sub-series. Inspired by the sacral chakra and the energetic power of emotions. An exploration of the Svadhisthana Chakra and the fluid nature of emotional energy.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1502201374037-9S0T7ZMTZ26MWIJ9Q1XZ/Universal+Transmissions+-+Energy+Vortices+2+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "sacral", "svadhisthana", "emotions", "sacred-geometry"],
    featured: false,
  },
  {
    id: "bev-003",
    slug: "bio-energetic-vortexes-no3-power-solar-plexus-chakra",
    title: "Bio-Energetic Vortexes No.3 - Power (Solar Plexus Chakra)",
    year: 2017,
    medium: "Adobe Photoshop",
    description:
      "The third of seven from the Bio-Energetic Vortexes sub-series, inspired by the Solar Plexus Chakra and the energetic force of willpower. Visualizes Manipura Chakra and the fire of personal power.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1509525496784-NWHF5VJGUUF478XRG090/Universal+Transmissions+-+Bio-Energetic+Vortexes+3+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "solar-plexus", "manipura", "power", "willpower", "sacred-geometry"],
    featured: false,
  },
  {
    id: "bev-004",
    slug: "bio-energetic-vortexes-no4-love-heart-chakra",
    title: "Bio-Energetic Vortexes No.4 - Love (Heart Chakra)",
    year: 2017,
    medium: "Adobe Photoshop",
    description:
      "The fourth of seven from the Bio-Energetic Vortexes sub-series, inspired by the Anahata Heart Chakra and the universal energy of love and compassion. Visualizes the green heart center of the chakra system.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1511432976514-R6HCJBFVEV9C0PRGLPG8/Universal+Transmissions+-+Energy+Vortices+4+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "heart", "anahata", "love", "compassion", "sacred-geometry"],
    featured: false,
  },
  {
    id: "bev-005",
    slug: "bio-energetic-vortexes-no5-truth-throat-chakra",
    title: "Bio-Energetic Vortexes No.5 - Truth (Throat Chakra)",
    year: 2018,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "The fifth of seven from the Bio-Energetic Vortexes sub-series, based on language, linguistics, cymatics, frequencies and the communicative powers of the Vishuddha Throat Chakra. 'Every word you use today has grown up like a flower.'",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1531040209207-EQLYEGRMITXUFNTMQEJH/Bio-Energetic+Vortexes+Vol+5+-+Speak+-+WEB.jpg",
    ],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "throat", "vishuddha", "truth", "communication", "cymatics", "language"],
    featured: false,
  },
  {
    id: "bev-006",
    slug: "bio-energetic-vortexes-no6-insight-third-eye-chakra",
    title: "Bio-Energetic Vortexes No.6 - Insight (Third Eye Chakra)",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "The sixth of seven from the Bio-Energetic Vortexes sub-series. First artwork completed in 2020, depicting the Ajna Third Eye Chakra and the energetic force of clear vision and crystalline clarity implementation.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1579530339065-1Y0URXZKCKNFC5VDIJD1/Bio+Energetic+Vortexes+6+-+See+FINAL+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "third-eye", "ajna", "insight", "vision", "clarity", "sacred-geometry"],
    featured: false,
  },
  {
    id: "bev-007",
    slug: "bio-energetic-vortexes-no7-spirit-crown-chakra",
    title: "Bio-Energetic Vortexes No.7 - Spirit (Crown Chakra)",
    year: 2022,
    medium: "Adobe Photoshop",
    description:
      "The seventh and final seal of the Bio-Energetic Vortexes series. A personal rendition of the Sahasrara Crown Chakra. A visual journal entry into the intimate experience of the 'Thousand Petal Lotus' opening — a homage to basking in the glory of divine consciousness. Not an interpretation of Samadhi, but a direct transmission of the experience.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/6c65074a-6b5e-4d39-b53f-c121a0a1a3ff/Bio-Energetic+Vortexes+Vol+7+-+Spirit+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["bio-energetic-vortexes", "chakra", "crown", "sahasrara", "spirit", "kundalini", "samadhi", "divine", "sacred-geometry"],
    featured: true,
  },

  // ═══════════════════════════════════════════════════
  // UNIVERSAL TRANSMISSIONS MAIN SERIES
  // ═══════════════════════════════════════════════════
  {
    id: "ut-001",
    slug: "universal-transmissions-i-tetragrammaton",
    title: "Universal Transmissions I - Tetragrammaton",
    year: 2014,
    medium: "Adobe Photoshop, Cinema 4D, Zbrush, Adobe Illustrator, Mandelbulber, Ultra Fractal 5",
    description:
      "This is where it all began. The first image for the Universal Transmissions Codex. The first image of the series, and the image that gave birth to a unique style of art. The Tetragrammaton — the four-letter name of God — rendered as a portal into hidden dimensions of meaning.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1485381131655-RU1JVC1WS5BJZHQ4JIIA/MANUSCRIPT+6+-+Vehicular+Dynamics+print+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "tetragrammaton", "genesis", "sacred-geometry", "name-of-god"],
    featured: true,
  },
  {
    id: "ut-002",
    slug: "universal-transmissions-ii-tesseract",
    title: "Universal Transmissions II - Tesseract",
    year: 2015,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Of strange surfaces. The second installment explores the tesseract — the four-dimensional hypercube — as a geometric key to higher dimensional navigation. An attempt to visualize what cannot be seen in three dimensions.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1508389872229-ZS7B02NTKXY1G4X7IRWJ/Universal+Transmissions+VIII+-+Recursive+Pantheism+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "tesseract", "fourth-dimension", "hypercube", "sacred-geometry"],
    featured: false,
  },
  {
    id: "ut-003",
    slug: "universal-transmissions-iii-merkaba",
    title: "Universal Transmissions III - Merkaba",
    year: 2016,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "The third installment of the Universal Transmissions series, exploring the Merkaba — the divine light vehicle described in ancient esoteric traditions as a spiraling force of counter-rotating fields of light.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1485381886747-QPO5J5M7EYZL9M7CXE43/leomerkaba_6442216903_o.jpg",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "merkaba", "light-body", "sacred-geometry", "esoteric"],
    featured: false,
  },
  {
    id: "ut-004",
    slug: "universal-transmissions-iv-tetra",
    title: "Universal Transmissions IV - Tetra",
    year: 2016,
    medium: "Adobe Photoshop",
    description:
      "Strange things concerning hyperspherologies of the divine. The fourth installment explores tetrahedral geometry and its relationship to higher dimensional reality.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1485380393944-S47XPODE1LAU7DN1UUUT/b22KRKr.png",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "tetra", "tetrahedron", "sacred-geometry", "hyperspherology"],
    featured: false,
  },
  {
    id: "ut-005",
    slug: "universal-transmissions-v-higher-access",
    title: "Universal Transmissions V - Higher Access",
    year: 2017,
    medium: "Adobe Photoshop",
    description:
      "The Dark Page — on accessing higher dimensional realities. The fifth installment ventures into the liminal spaces between dimensions, exploring how consciousness can navigate beyond the physical body.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1485380406677-UVV93U8AEROS9439HEPR/K5lZMEF+%281%29.jpg",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "higher-access", "dimensional-travel", "astral", "esoteric"],
    featured: false,
  },
  {
    id: "ut-006",
    slug: "universal-transmissions-vi-vehicular-dynamics",
    title: "Universal Transmissions VI - Vehicular Dynamics",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Inspired by Trans-dimensional Linguistics, Esoteric literature on Out of Body Experiences, Dimensional Travel and the Akashic Records. 'Kadmon comes from Aveer Qadmon, meaning primitive air or Azoth.' A study on the Adam Kadmon — the cosmic man — and the divine pattern of the light body.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1485380341979-ZPYYME478YGA8350NBIE/216ed5edb0cf582a7dc6e55845c0615d.jpg",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "vehicular-dynamics", "adam-kadmon", "azoth", "light-body", "akashic"],
    featured: false,
  },
  {
    id: "ut-007",
    slug: "universal-transmissions-vii-external-womb",
    title: "Universal Transmissions VII - External Womb",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Hoodwinked. A transmission concerning the incubation of Artificial Matrices and external wombs — exploring the esoteric implications of technology as an extension of biological processes.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1487857420615-8U48R9D3XSR9L1M7X5JS/Universal+Transmissions+VII+-+External+Womb+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "external-womb", "artificial-matrix", "incubation", "technology"],
    featured: false,
  },
  {
    id: "ut-008",
    slug: "universal-transmissions-viii-recursive-pantheism",
    title: "Universal Transmissions VIII - Recursive Pantheism",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Very much influenced and inspired by the works of Athanasius Kircher and Robert Fludd. An attempt to syncretise the relation between the macro and micro, the signs of the zodiac to chakra centers and their correlation to organs, cymatic patterns and frequencies.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1508389872229-ZS7B02NTKXY1G4X7IRWJ/Universal+Transmissions+VIII+-+Recursive+Pantheism+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "recursive-pantheism", "kircher", "fludd", "zodiac", "chakra", "cymatics", "syncretism"],
    featured: true,
  },
  {
    id: "ut-009",
    slug: "universal-transmissions-ix-the-cosmic-egg",
    title: "Universal Transmissions IX - The Cosmic Egg",
    year: 2018,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Set the egg before you, the God in its beginning. And behold it. And incubate it with the magical warmth of your gaze. — C.G. Jung. The ninth installment, deeply inspired by the syncretic cosmologies of all ancient civilizations.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1546157346326-0PJZJ3N2VZCO1PMPWLU4/Cosmic+Egg+Final+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "cosmic-egg", "cosmology", "jung", "ancient-civilizations", "syncretism"],
    featured: false,
  },
  {
    id: "ut-010",
    slug: "universal-transmissions-x-vortex-dynamics",
    title: "Universal Transmissions X - Vortex Dynamics",
    year: 2019,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Transmission on Spiral Charge Compression and Phase Conjugation in relation to Sufi Ennealogy, Dervish dynamics and implosive bliss practices. 'Without self knowledge, without understanding the working and functions of his machine, man cannot be free.' — G.I. Gurdjieff",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1574074425940-SUNYXG5ZTLJQNTUDVFO6/Vortex+Dynamics+-+FINAL.jpg",
    ],
    available: true,
    prints: true,
    tags: ["universal-transmissions", "vortex-dynamics", "sufism", "dervish", "spiral", "phase-conjugation", "gurdjieff"],
    featured: false,
  },
  {
    id: "ut-011",
    slug: "universal-transmissions-xi-vitruvian-spirit",
    title: "Universal Transmissions XI - Vitruvian Spirit (Seeding the New Renaissance)",
    year: 2021,
    medium: "Adobe Photoshop",
    description:
      "A homage to the masters of antiquity who have inspired generations to create and innovate, a celebration of the human spirit and imagination. This piece is not about gender — it contains a message of balance, of the power of the divine feminine and masculine and of the balanced trinity within us all. 'We are the exemplar, the immaculate conception, the apex being, we are the Mercurial Bodhisattva.'",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1611215062413-UQZIED1RN0GSTIMUOREG/Vitr%C4%B1vian+Spirit+2021+-+Seeding+the+new+rennaisiance+FINAL+-+web3.jpg",
    ],
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
    slug: "twilight-transmissions",
    title: "Twilight Transmissions",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Another spin-off sub series of Universal Transmissions. Prismatic renditions of the classic style, exploring the liminal space between day and night, known and unknown.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1598859117362-LRJ3AGPFBGUZRVLVZ461/Trinary+Transcendance+FINAL+-+WEB.jpg",
    ],
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
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1598859117362-LRJ3AGPFBGUZRVLVZ461/Trinary+Transcendance+FINAL+-+WEB.jpg",
    ],
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
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1585562689902-K6W2Q5X3LMJAV8ZK1C7I/Hyperdimensional+Harmonics+-+web.jpg",
    ],
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
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1580807494423-GZDDQ1ABOT3L6P4R9ODE/Translinguistic+Equation+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["twilight-transmissions", "translinguistic", "DNA", "cymatics", "language", "quantum"],
    featured: false,
  },
  {
    id: "tw-005",
    slug: "translinguistic-imprint",
    title: "Translinguistic Imprint",
    year: 2021,
    medium: "Adobe Photoshop, Cinema 4D, Zbrush, Mandelbulb 3D",
    description:
      "Without words, it reached into the fabric of my being. The language of thought dissolved as only the imprint remained, pulsing alive with ineffable meaning.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1609484158752-KHZGEHOPFHZ67WNW0TUS/immaculate+conception+-+web2.jpg",
    ],
    available: true,
    prints: true,
    tags: ["twilight-transmissions", "translinguistic", "imprint", "ineffable", "language"],
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
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1609484158752-KHZGEHOPFHZ67WNW0TUS/immaculate+conception+-+web2.jpg",
    ],
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
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1609484158752-KHZGEHOPFHZ67WNW0TUS/immaculate+conception+-+web2.jpg",
    ],
    available: true,
    prints: true,
    tags: ["enchanted-essence", "twilight-transmissions", "self-knowledge", "enlightenment"],
    featured: false,
  },
  {
    id: "sw-003",
    slug: "frequency-tuner",
    title: "Frequency Tuner",
    year: 2017,
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Ultra Fractal 5",
    description:
      "A standard, run of the mill, hyper-dimensional Frequency Tuner. An exploration of the instrument through which consciousness calibrates itself to the frequencies of higher dimensions.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1508389872229-ZS7B02NTKXY1G4X7IRWJ/Universal+Transmissions+VIII+-+Recursive+Pantheism+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["frequency-tuner", "frequency", "cymatics", "tuning", "hyper-dimensional"],
    featured: false,
  },
  {
    id: "sw-004",
    slug: "reversible-ratio",
    title: "Reversible Ratio",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator",
    description:
      "Regarding the Non-dual Inversion Principles of solid state and wave form embeddability. A gift to all Universal Transmissions Patrons exploring the mathematical beauty of inversion and non-duality.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1606736643609-GC8A964VCK98ILY0CAWL/Reversible+Ratio+-+HAKAN+HISIM+-+web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["reversible-ratio", "non-dual", "inversion", "wave-form", "mathematics"],
    featured: false,
  },
  {
    id: "sw-005",
    slug: "toroidal-tantra",
    title: "Toroidal Tantra",
    year: 2019,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "On the nature of true tantric self love and its effect on the energetic vortexes through Ida, Pingala and Sushumna's relation to the cosmic serpent. Toroidal Tantra bridges the Universal Transmissions and Bio-Energetic Vortexes series together into a cohesive narrative.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1556277131994-U5V3BVKW946JARF803JF/Torroidal+Tantra.jpg",
    ],
    available: true,
    prints: true,
    tags: ["toroidal-tantra", "torus", "tantra", "kundalini", "ida-pingala", "sushumna", "cosmic-serpent", "bio-energetic-vortexes"],
    featured: false,
  },
  {
    id: "sw-006",
    slug: "trivium-method",
    title: "Trivium Method",
    year: 2019,
    medium: "Adobe Photoshop, Cinema 4D, Adobe Illustrator, Ultra Fractal 5, Mandelbulb 3D",
    description:
      "Inspired by the Trivium and Quadrivium learning methods of antiquity, and blended with acquired wisdom imparted from hyperdimensional gnosis. The three arts of the Trivium — Grammar, Logic, Rhetoric — visualized as geometric transmission.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1555939109518-4CHT0IGVVM4E8A8B7NV7/Trivium-method+---web.jpg",
    ],
    available: true,
    prints: true,
    tags: ["trivium", "quadrivium", "grammar", "logic", "rhetoric", "antiquity", "sacred-geometry"],
    featured: false,
  },
  {
    id: "sw-007",
    slug: "linguistic-mystic",
    title: "Linguistic Mystic",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D, Corel Painter, Adobe Illustrator",
    description:
      "Inspired by the age old Strophariad Mystic mentors of Translinguistic syntax, that launched legendary ludicrous lexicons of language into the Noosphere. A study in the mystic relationship between language, consciousness and the cosmos.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1580713726361-Q3KF05BA7PA2B67CVT3H/image-asset.jpeg",
    ],
    available: true,
    prints: true,
    tags: ["linguistic-mystic", "xenolinguistics", "noosphere", "language", "mystic"],
    featured: false,
  },
  {
    id: "sw-008",
    slug: "twilight-pantheism",
    title: "Twilight Pantheism",
    year: 2020,
    medium: "Adobe Photoshop, Cinema 4D",
    description:
      "Exploring the divine immanence within the natural world, rendered in the prismatic twilight tones of the Twilight Transmissions series.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1598859117362-LRJ3AGPFBGUZRVLVZ461/Trinary+Transcendance+FINAL+-+WEB.jpg",
    ],
    available: true,
    prints: true,
    tags: ["twilight-pantheism", "pantheism", "twilight-transmissions", "divine", "nature"],
    featured: false,
  },
];

export function getArtwork(slug: string): Artwork | undefined {
  return artworks.find((a) => a.slug === slug);
}

export function getFeaturedArtworks(): Artwork[] {
  return artworks.filter((a) => a.featured);
}
