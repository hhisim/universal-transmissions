// === UT → VOA Digital-Pack Funnel ==========================================================
// Maps UT journal posts to the VOA (vaultofarcana.com) digital packs most relevant to each
// essay's tradition. Rendered on the post page as a "go deeper / deeper correspondences"
// CTA card that funnels UT readers into the VOA shop.
//
// Pack pages live at https://www.vaultofarcana.com/shop/<sku> — SKUs pulled from the VOA
// shop catalog (lib/shop-catalog.ts).

export type VoaPackRef = {
  sku: string;
  title: string;
  price: string; // display string, e.g. "$29.99"
};

export type VoaPackInvite = {
  eyebrow: string;
  body: string;
  cta: string;
  packs: VoaPackRef[]; // 1–2 packs to surface
};

const shop = (sku: string) => `https://www.vaultofarcana.com/shop/${sku}`;

export const VOA_PACK_INVITES_BY_SLUG: Record<string, VoaPackInvite> = {
  // ── Tarot ────────────────────────────────────────────────────────────────
  "tarot-symbolic-machine-for-fate": {
    eyebrow: "GO DEEPER INTO THE TAROT",
    body: "Follow the archetypes, spreads, and thresholds from this transmission into a curated Tarot archive — decks, correspondence charts, and study material built for serious practice.",
    cta: "EXPLORE THE TAROT VAULT →",
    packs: [
      {
        sku: "etsy-1903856877",
        title: "Tarot Mega Bundle — 23GB Vault · 250+ Books, 260+ Decks",
        price: "$39.99",
      },
      {
        sku: "etsy-4543079786",
        title: "Complete Tarot Grimoire — Waite, Thoth & BOTA Study Library",
        price: "$9.99",
      },
    ],
  },

  // ── Dream / astral ───────────────────────────────────────────────────────
  "dreamwalker-lucid-dreaming-astral-projection": {
    eyebrow: "CONTINUE WITH DREAMWALKER",
    body: "Carry the imagery and threshold-work from this transmission into a deeper lucid-dreaming and astral-projection archive — manuals, frequencies, and rare source material.",
    cta: "ENTER THE DREAM ARCHIVE →",
    packs: [
      {
        sku: "etsy-4490122465",
        title: "Dreamwalker Oracle AI + 5.2GB Archive",
        price: "$9.99",
      },
      {
        sku: "etsy-1888688570",
        title: "Astral Projection & Lucid Dreaming MEGA Pack — 100GB",
        price: "$49.99",
      },
    ],
  },

  // ── Tao / I Ching ────────────────────────────────────────────────────────
  "i-ching-ancient-oracle-of-change": {
    eyebrow: "GO DEEPER WITH THE TAO",
    body: "Follow the change you are reading about into a dedicated Taoist archive — I Ching tradition, qi cultivation, inner alchemy, and the oracles that map the way of the Way.",
    cta: "OPEN THE TAO ARCHIVE →",
    packs: [
      {
        sku: "etsy-4471894787",
        title: "Tao Oracle AI + 3GB Taoist Archive",
        price: "$9.99",
      },
      {
        sku: "etsy-4543082389",
        title: "Taoist Inner Alchemy & Dream Practice Archive",
        price: "$10.99",
      },
    ],
  },

  "taoism-quantum-physics-controversy": {
    eyebrow: "CONTINUE WITH THE TAO",
    body: "Take the correspondence between Taoism and modern physics further with a dedicated Taoist archive — source texts, quantum-adjacent material, and contemplative practice.",
    cta: "OPEN THE TAO ARCHIVE →",
    packs: [
      {
        sku: "etsy-4471894787",
        title: "Tao Oracle AI + 3GB Taoist Archive",
        price: "$9.99",
      },
    ],
  },

  "sexual-alchemy-taoist-tradition": {
    eyebrow: "CONTINUE THE INNER ALCHEMY",
    body: "Deepen the Taoist inner-alchemy tradition from this transmission into its source archive — nei dan, qigong, cultivation practice and the classics that ground it.",
    cta: "OPEN THE INNER ALCHEMY ARCHIVE →",
    packs: [
      {
        sku: "etsy-4543082389",
        title: "Taoist Inner Alchemy & Dream Practice Archive",
        price: "$10.99",
      },
    ],
  },

  "taoist-microcosmic-orbit-inner-alchemy": {
    eyebrow: "OPEN THE TAO ARCHIVE",
    body: "Continue the orbit's source work with a compact Taoist shelf — the Dao De Jing, qi cultivation, inner alchemy, meditation, and the modern manuals that translate the map.",
    cta: "ENTER THE TAO SOURCE ARCHIVE →",
    packs: [
      {
        sku: "etsy-4471894787",
        title: "Tao Oracle AI + 3GB Taoist Archive",
        price: "$9.99",
      },
      {
        sku: "etsy-4543082389",
        title: "Taoist Inner Alchemy & Dream Practice Archive",
        price: "$10.99",
      },
    ],
  },

  // ── Alchemy / Hermetic ───────────────────────────────────────────────────
  "alchemy-of-soul-magnum-opus": {
    eyebrow: "EXPLORE THE CORRESPONDENCES",
    body: "Follow the cryptographic correspondences of alchemy, Kabbalah, and Hermetic thought into a dedicated archive — the Great Work, spagyrics, and primary source material.",
    cta: "ENTER THE ALCHEMICAL VAULT →",
    packs: [
      {
        sku: "etsy-1889783512",
        title: "21GB Alchemy Vault — 2750+ Rare Books & Manuscripts",
        price: "$39.99",
      },
      {
        sku: "etsy-4543073329",
        title: "Hermetic Alchemy Master Archive — 1,701 Files",
        price: "$11.99",
      },
    ],
  },

  "alchemical-vessel-athanor-technology-of-transformation": {
    eyebrow: "CONTINUE THE VESSEL STUDY",
    body: "Read the athanor, retort, and sealed vessel in a deeper primary-source archive — alchemical manuscripts, Hermetic texts, and the traditions of the Great Work.",
    cta: "ENTER THE ALCHEMICAL ARCHIVE →",
    packs: [
      {
        sku: "etsy-1889783512",
        title: "21GB Alchemy Vault — 2750+ Rare Books & Manuscripts",
        price: "$39.99",
      },
      {
        sku: "etsy-4543073329",
        title: "Hermetic Alchemy Master Archive — 1,701 Files",
        price: "$11.99",
      },
    ],
  },

  "the-kybalion-7-principles-hermetic-philosophy": {
    eyebrow: "FOLLOW THE PRINCIPLES",
    body: "Take the seven principles further into Hermetic source material — correspondence, vibration, polarity, and the great works of the tradition that anchors them.",
    cta: "OPEN THE HERMETIC ARCHIVE →",
    packs: [
      {
        sku: "etsy-4543073329",
        title: "Hermetic Alchemy Master Archive — 1,701 Files",
        price: "$11.99",
      },
    ],
  },

  // ── Kundalini / Tantra ───────────────────────────────────────────────────
  "kundalini-shakti-serpent-power-western-science": {
    eyebrow: "CONTINUE THE KUNDALINI STUDY",
    body: "Follow the serpent power from this transmission into a dedicated Tantra, chakra, and Kabbalah archive — cultivation practice and the sources that map the ascent.",
    cta: "ENTER THE TANTRA ARCHIVE →",
    packs: [
      {
        sku: "etsy-4543075975",
        title: "Kundalini & Tree of Life Master Archive — 277 Files",
        price: "$11.99",
      },
    ],
  },

  // ── Sufism ───────────────────────────────────────────────────────────────
  "sufism-the-path-of-divine-love": {
    eyebrow: "CONTINUE ON THE PATH OF LOVE",
    body: "Carry the devotional correspondence of Rumi, Ibn Arabi, and the Sufi tradition into a dedicated archive — zikr, Islamic mysticism, and the poets of the path.",
    cta: "OPEN THE SUFI ARCHIVE →",
    packs: [
      {
        sku: "etsy-4488453137",
        title: "Sufism Oracle AI + 3GB Sufi Archive",
        price: "$9.99",
      },
    ],
  },

  // ── Enochian ─────────────────────────────────────────────────────────────
  "enochian-angelic-language-modern-occultism": {
    eyebrow: "GO DEEPER INTO THE MACHINE OF ANGELS",
    body: "Follow Dee and Kelley's celestial language into a dedicated Enochian archive — the Keys, Calls, Tablets, Aethyrs, and ritual software that formalize the practice.",
    cta: "ENTER THE ENOCHIAN ARCHIVE →",
    packs: [
      {
        sku: "etsy-4308981590",
        title: "Enochian Magick Archive — 450+ Rare Books & Audio",
        price: "$29.99",
      },
    ],
  },

  // ── Gnosticism ───────────────────────────────────────────────────────────
  "gnosticism-archive-of-light-architecture-divine-spark": {
    eyebrow: "GO DEEPER INTO THE GNOSIS",
    body: "Follow the architecture of light from this transmission into a dedicated Gnostic archive — the Nag Hammadi, archons, and the scholars who walk the inner way.",
    cta: "OPEN THE GNOSTIC ARCHIVE →",
    packs: [
      {
        sku: "etsy-4306241391",
        title: "Gnosticism Digital Library — 180+ Rare eBooks & Lectures",
        price: "$29.99",
      },
    ],
  },

  // ── Entheogens ───────────────────────────────────────────────────────────
  "2026-03-19-dmt-as-the-orthogonal-api-key": {
    eyebrow: "CONTINUE THE ORTHOGONAL QUERY",
    body: "Follow the psychedelic correspondence from this transmission into a dedicated entheogen archive — ayahuasca, DMT, psilocybin, and the frameworks of the inner journey.",
    cta: "OPEN THE ENTHEOGEN ARCHIVE →",
    packs: [
      {
        sku: "etsy-4489018852",
        title: "Entheogen Oracle AI + 3GB Psychedelic Archive",
        price: "$9.99",
      },
    ],
  },

  // ── Sacred geometry / cosmology ──────────────────────────────────────────
  "2026-03-19-the-cosmic-sandbox": {
    eyebrow: "GO DEEPER INTO THE REALITY CODES",
    body: "Follow the simulation, geometry, and cosmology of this transmission into a dedicated sacred-geometry and esoteric archive — symbols, mandalas, and the golden ratio.",
    cta: "OPEN THE GEOMETRY VAULT →",
    packs: [
      {
        sku: "etsy-634858175",
        title: "Sacred Geometry VJ Loop Pack",
        price: "$125.77",
      },
      {
        sku: "etsy-4543080231",
        title: "Sacred Geometry Master Collection — 639 Files",
        price: "$12.99",
      },
    ],
  },

  // ── Five Tibetans / energy practice ──────────────────────────────────────
  "five-tibetans-ancient-rites-of-rejuvenation": {
    eyebrow: "CONTINUE THE RITES",
    body: "Carry the five rites and the energy practice from this transmission into a dedicated meditation and energy-cultivation archive — guided work, frequencies, and source method.",
    cta: "OPEN THE MEDITATION ARCHIVE →",
    packs: [
      {
        sku: "etsy-1906631935",
        title: "Meditation Mastery MEGA Pack — 43GB Ultimate Archive",
        price: "$24.99",
      },
    ],
  },

  // ── Hermetic / Corpus Hermeticum ──────────────────────────────────────────
  "corpus-hermeticum-poimandres-cosmic-human": {
    eyebrow: "ENTER THE HERMETIC SOURCE",
    body: "Carry the Poimandres reading into the wider Hermetic source tradition — rare texts, alchemical manuscripts, and the primary material behind the correspondence.",
    cta: "OPEN THE HERMETIC ARCHIVE →",
    packs: [
      {
        sku: "etsy-1890769318",
        title: "Grimoire & Occult eBook Archive — 13GB",
        price: "$29.99",
      },
      {
        sku: "etsy-4543073329",
        title: "Hermetic Alchemy Master Archive — 1,701 Files",
        price: "$11.99",
      },
    ],
  },

  // ── Kabbalah / Sefer Yetzirah / Tree of Life ──────────────────────────────
  "sefer-yetzirah-32-paths-of-wisdom": {
    eyebrow: "ENTER THE KABBALAH SOURCE",
    body: "Continue the thirty-two paths into the Zohar, the Tree of Life, gematria, and the primary texts that make the alphabet of creation a lived study.",
    cta: "OPEN THE KABBALAH ARCHIVE →",
    packs: [
      {
        sku: "etsy-4488658060",
        title: "Kabbalah Oracle AI + 4.3GB Sacred Archive",
        price: "$9.99",
      },
      {
        sku: "etsy-4302414623",
        title: "Kabbalah Qabalah Archive — 22GB",
        price: "$39.99",
      },
    ],
  },

  "kabbalah-tree-of-life-sefirot-explained": {
    eyebrow: "ENTER THE TREE OF LIFE",
    body: "Move from the diagram into a serious Kabbalah study: Zohar, sefirot, gematria, Hermetic Qabalah, and the texts that give the Tree its depth.",
    cta: "OPEN THE KABBALAH ARCHIVE →",
    packs: [
      {
        sku: "etsy-4488658060",
        title: "Kabbalah Oracle AI + 4.3GB Sacred Archive",
        price: "$9.99",
      },
      {
        sku: "etsy-4302414623",
        title: "Kabbalah Qabalah Archive — 22GB",
        price: "$39.99",
      },
    ],
  },

  // ── Picatrix / astral magic ───────────────────────────────────────────────
  "picatrix-technology-of-correspondence-astrological-magic": {
    eyebrow: "STUDY THE TECHNOLOGY OF CORRESPONDENCE",
    body: "Follow the Picatrix's astral logic into the grimoires, magical images, and source texts that document Western ritual technology without flattening it into superstition or slogan.",
    cta: "OPEN THE GRIMOIRE ARCHIVE →",
    packs: [
      {
        sku: "etsy-4543069477",
        title: "Complete Occult Grimoire — 7,596 Files",
        price: "$11.99",
      },
      {
        sku: "etsy-1890769318",
        title: "Grimoire & Occult eBook Archive — 13GB",
        price: "$29.99",
      },
    ],
  },

  "conference-of-the-birds-simurgh-map-of-self-recognition": {
    eyebrow: "CONTINUE THE SUFI TRANSMISSION",
    body: "Carry Attar's seven valleys into a wider archive of Sufi poetry, zikr, Ibn Arabi, Rumi, and Islamic mysticism — a source field for the search that changes the seeker.",
    cta: "OPEN THE SUFI ARCHIVE →",
    packs: [
      {
        sku: "etsy-4488453137",
        title: "Sufism Oracle AI + 3GB Sufi Archive",
        price: "$9.99",
      },
    ],
  },

  "cymatics-language-of-form": {
    eyebrow: "STUDY THE LANGUAGE OF FORM",
    body: "Continue the vibrating-plate method into a visual correspondence archive — sacred geometry, symbolic reference pages, and the Codex's working alphabet.",
    cta: "OPEN THE CORRESPONDENCE ARCHIVE →",
    packs: [
      {
        sku: "etsy-4513179705",
        title: "Correspondence Codex Companion PDF — 20 Printable Reference Pages",
        price: "$11.11",
      },
      {
        sku: "etsy-4543080231",
        title: "Sacred Geometry Master Collection — 639 Files",
        price: "$12.99",
      },
    ],
  },

  "walter-russell-universal-one-cosmology-of-light": {
    eyebrow: "CONTINUE THE DIAGRAM STUDY",
    body: "Follow Russell's light, polarity, and cosmic-chart vocabulary into a visual correspondence archive — geometry for comparative study, not a substitute for physical evidence.",
    cta: "OPEN THE GEOMETRY ARCHIVE →",
    packs: [
      {
        sku: "etsy-4543080231",
        title: "Sacred Geometry Master Collection — 639 Files",
        price: "$12.99",
      },
      {
        sku: "etsy-4513179705",
        title: "Correspondence Codex Companion PDF — 20 Printable Reference Pages",
        price: "$11.11",
      },
    ],
  },

  "rosicrucian-manifestos-public-secret-reformation": {
    eyebrow: "ENTER THE ROSICRUCIAN SOURCE ARCHIVE",
    body: "Follow the public secret into the wider Hermetic and grimoire field — manifestos, alchemical texts, and the early modern sources that make the Rose Cross a living question.",
    cta: "OPEN THE ROSICRUCIAN ARCHIVE →",
    packs: [
      {
        sku: "etsy-1890769318",
        title: "Grimoire & Occult eBook Archive — 13GB",
        price: "$29.99",
      },
      {
        sku: "etsy-4543073329",
        title: "Hermetic Alchemy Master Archive — 1,701 Files",
        price: "$11.99",
      },
    ],
  },
};

// Resolve a slug → invite, with a safe fallback to null.
export function getVoaPackInvite(slug: string): VoaPackInvite | null {
  const invite = VOA_PACK_INVITES_BY_SLUG[slug];
  if (!invite || !Array.isArray(invite.packs) || invite.packs.length === 0) return null;
  return invite;
}

export { shop };
