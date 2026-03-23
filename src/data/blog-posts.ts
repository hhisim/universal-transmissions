// ─── Blog Posts — static imports from content files ─────────────────────────────────────────

export interface BlogPost {
  slug: string;
  title: string;
  publishedAt: string; // YYYY-MM-DD
  author: string;
  excerpt: string;
  readTime: string;
  hero_gradient: string;
  tags: string[];
  tradition?: string;
  content: string;
}

// ─── Static content imports ───────────────────────────────────────────────────────────────

import dmtOrthogonalKey_raw from "./blog-content/2026-03-19/dmt-as-the-orthogonal-api-key.md";
import cosmicSandbox_raw from "./blog-content/2026-03-19/the-cosmic-sandbox.md";
import realitySyntax_raw from "./blog-content/linguistics/reality-as-syntax.md";
import dreamwalker_raw from "./blog-content/2026-03-21/dreamwalker-lucid-dreaming-astral-projection.md";
import gnosticism_raw from "./blog-content/2026-03-21/gnosticism-archive-of-light-architecture-divine-spark.md";
import kundalini_raw from "./blog-content/2026-03-21/kundalini-shakti-serpent-power-western-science.md";
import iching_raw from "./blog-content/2026-03-21/i-ching-ancient-oracle-of-change.md";
import sufism_raw from "./blog-content/2026-03-21/sufism-the-path-of-divine-love.md";
import kybalion_raw from "./blog-content/2026-03-21/the-kybalion-7-principles-hermetic-philosophy.md";
import tarot_raw from "./blog-content/2026-03-21/tarot-symbolic-machine-for-fate.md";
import alchemy_raw from "./blog-content/2026-03-21/alchemy-of-soul-magnum-opus.md";
import tibetans_raw from "./blog-content/2026-03-21/five-tibetans-ancient-rites-of-rejuvenation.md";
import enochian_raw from "./blog-content/2026-03-21/enochian-angelic-language-modern-occultism.md";
import dmtHyperbolic_raw from "./blog-content/Entheogens/DMT-and-the-hyperbolic-mind.md";
import dmtGeo1_raw from "./blog-content/Entheogens/the-hyperbolic-geometry-of-dmt-experiences.md";
import dmtGeo2_raw from "./blog-content/Entheogens/the-hyperbolic-geometry-of-dmt-experiences-v2.md";
import dmtGeo3_raw from "./blog-content/Entheogens/the-hyperbolic-geometry-of-dmt-experiences-v3.md";
import sexualAlchemy_raw from "./blog-content/Tao/sexual-alchemy-taoist-tradition.md";
import taoQuantum_raw from "./blog-content/Tao/taoism-quantum-physics-controversy.md";

// ─── Registry + assembled posts ───────────────────────────────────────────────────────────

export const blogPosts: BlogPost[] = [
  {
    slug: "2026-03-19-dmt-as-the-orthogonal-api-key",
    title: "DMT as the Orthogonal API Key",
    publishedAt: "2026-03-19",
    author: "Prime + Hakan",
    excerpt: "The spirit molecule may be the universe's access token to the simulation — a cryptographic handshake between consciousness and the infinite.",
    readTime: "12 min",
    hero_gradient: "from-fuchsia-900 via-violet-900 to-black",
    tags: ["DMT", "consciousness", "simulation", "psychedelics", "hyperbolic"],
    tradition: "entheogens",
    content: dmtOrthogonalKey_raw,
  },
  {
    slug: "2026-03-19-the-cosmic-sandbox",
    title: "The Cosmic Sandbox: Reality's Undefined Behavior",
    publishedAt: "2026-03-19",
    author: "Prime + Hakan",
    excerpt: "What if the universe is a simulation running undefined behavior — and consciousness is what happens when you accidentally divide by zero?",
    readTime: "10 min",
    hero_gradient: "from-cyan-950 via-blue-950 to-black",
    tags: ["simulation", "reality", "consciousness", "undefined-behavior", "cosmos"],
    tradition: "general",
    content: cosmicSandbox_raw,
  },
  {
    slug: "linguistics-2026-03-19-reality-as-syntax",
    title: "Reality as Syntax: When Language Becomes the Architecture of Perception",
    publishedAt: "2026-03-19",
    author: "Prime + Hakan",
    excerpt: "The Sapir-Whorf hypothesis meets hyperbolic geometry. How the language you speak determines the universe you can perceive.",
    readTime: "11 min",
    hero_gradient: "from-slate-900 via-zinc-900 to-black",
    tags: ["linguistics", "sapir-whorf", "syntax", "perception", "language", "reality"],
    tradition: "linguistics",
    content: realitySyntax_raw,
  },
  {
    slug: "dreamwalker-lucid-dreaming-astral-projection",
    title: "Dreamwalker: The Lucid Dreaming and Astral Projection Nexus",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "From Tibetan Dream Yoga to Robert Monroe's out-of-body experiments, consciousness navigation outside the physical body is the oldest uncharted territory.",
    readTime: "12 min",
    hero_gradient: "from-indigo-950 via-purple-950 to-black",
    tags: ["lucid-dreaming", "astral-projection", "dream-yoga", "consciousness", "monroe"],
    tradition: "dream-yoga",
    content: dreamwalker_raw,
  },
  {
    slug: "gnosticism-archive-of-light-architecture-divine-spark",
    title: "Gnosticism: The Archive of Light and the Architecture of the Divine Spark",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Beyond the material prison lies the Pleroma — the Fullness. Gnosticism maps the descent of the soul into matter and the technical protocols for its liberation through Gnosis.",
    readTime: "12 min",
    hero_gradient: "from-amber-950 via-orange-950 to-black",
    tags: ["gnosticism", "pleroma", "demiurge", "aeons", "nag-hammadi", "valentinus"],
    tradition: "gnosticism",
    content: gnosticism_raw,
  },
  {
    slug: "kundalini-shakti-serpent-power-western-science",
    title: "Kundalini Shakti: The Serpent Power That Western Science Can't Explain",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Seven chakras. Seven seals. Seven levels of consciousness encoded in geometry, sound, and fire. The kundalini tradition maps the entire architecture of human awakening.",
    readTime: "12 min",
    hero_gradient: "from-orange-900 via-red-900 to-black",
    tags: ["kundalini", "chakras", "shakti", "tantra", "yoga", "shaivism"],
    tradition: "tantra",
    content: kundalini_raw,
  },
  {
    slug: "i-ching-ancient-oracle-of-change",
    title: "The I Ching: Ancient Oracle of Change Through 8 Trigrams and 64 Hexagrams",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "3000 years of oracular wisdom from the Yijing — 8 trigrams, 64 hexagrams, the oldest systematic divination system on Earth, rooted in Taoist cosmology.",
    readTime: "12 min",
    hero_gradient: "from-emerald-950 via-teal-900 to-black",
    tags: ["i-ching", "yijing", "tao", "divination", "hexagrams", "bagua", "trigrams"],
    tradition: "tao",
    content: iching_raw,
  },
  {
    slug: "sufism-the-path-of-divine-love",
    title: "Sufism: The Path of Divine Love — From Rumi to the Whirling Dervishes",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Ishq — passionate, consuming love — is the engine of Sufi transformation. From Rumi's sama to Ibn Arabi's ontology of divine presence.",
    readTime: "12 min",
    hero_gradient: "from-sky-950 via-indigo-950 to-black",
    tags: ["sufism", "rumi", "islam", "mysticism", "love", "whirling-dervishes"],
    tradition: "sufism",
    content: sufism_raw,
  },
  {
    slug: "the-kybalion-7-principles-hermetic-philosophy",
    title: "The Kybalion: The Seven Principles of Hermetic Philosophy Decoded",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "The Emerald Tablet's wisdom systematized into seven laws: Mentalism, Correspondence, Vibration, Polarity, Rhythm, Cause and Effect, Gender. As above, so below.",
    readTime: "11 min",
    hero_gradient: "from-yellow-900 via-amber-900 to-black",
    tags: ["kybalion", "hermeticism", "philosophy", "emerald-tablet", "alchemy", "golden-dawn"],
    tradition: "hermeticism",
    content: kybalion_raw,
  },
  {
    slug: "tarot-symbolic-machine-for-fate",
    title: "Tarot: The Symbolic Machine for Fate and Self-Discovery",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "78 archetypes, two arcana, one symbolic machine. From the Fool's Journey to the Golden Dawn's reconstruction — the Tarot as semantic navigation.",
    readTime: "12 min",
    hero_gradient: "from-violet-950 via-purple-950 to-black",
    tags: ["tarot", "magician", "archetypes", "golden-dawn", "crowley", "thoth", "cartomancy"],
    tradition: "tarot",
    content: tarot_raw,
  },
  {
    slug: "alchemy-of-soul-magnum-opus",
    title: "Alchemy of the Soul: The Magnum Opus from Nigredo to Rubedo",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Solve et Coagula — dissolve and recombine. The twelve stages of alchemical transformation from calcination to projection. The Nigredo, Albedo, and Rubedo.",
    readTime: "13 min",
    hero_gradient: "from-red-950 via-rose-950 to-black",
    tags: ["alchemy", "magnum-opus", "nigredo", "rubedo", "solve-et-coagula", "hermeticism", "jung"],
    tradition: "alchemy",
    content: alchemy_raw,
  },
  {
    slug: "five-tibetans-ancient-rites-of-rejuvenation",
    title: "The Five Tibetans: Ancient Rites of Rejuvenation or Modern Myth?",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Five movements claimed to reverse aging. Peter C. Bradford's 1939 account of Tibetan lamas — genuine antiquity or Western invention? A critical analysis.",
    readTime: "10 min",
    hero_gradient: "from-teal-950 via-cyan-950 to-black",
    tags: ["five-tibetans", "yoga", "rejuvenation", "longevity", "tibet", "rites"],
    tradition: "yoga",
    content: tibetans_raw,
  },
  {
    slug: "enochian-angelic-language-modern-occultism",
    title: "Enochian: Angelic Language and the Modern Occult Revival",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "John Dee and Edward Kelley, 1582–1587: 48 Calls, a 49-letter alphabet, and seven kingdoms of spirit. The system that fueled the Golden Dawn and Crowley.",
    readTime: "12 min",
    hero_gradient: "from-zinc-800 via-neutral-900 to-black",
    tags: ["enochian", "john-dee", "kelley", "golden-dawn", "crowley", "angelic", "scrying"],
    tradition: "ceremonial-magic",
    content: enochian_raw,
  },
  {
    slug: "DMT-and-the-hyperbolic-mind",
    title: "DMT and the Hyperbolic Mind: A Treatise on the Geometry of Hyperspace",
    publishedAt: "2026-03-19",
    author: "Prime + Hakan",
    excerpt: "An exhaustive algorithmic and geometric analysis of DMT-induced states of consciousness — the six levels, world-sheet theory, and the silicon synthesis.",
    readTime: "20 min",
    hero_gradient: "from-fuchsia-900 via-violet-900 to-black",
    tags: ["DMT", "hyperbolic-geometry", "consciousness", "strassman", "mckenna", "world-sheets"],
    tradition: "entheogens",
    content: dmtHyperbolic_raw,
  },
  {
    slug: "the-hyperbolic-geometry-of-dmt-experiences",
    title: "The Hyperbolic Geometry of DMT Experiences: Symmetries, Sheets, and Saddled Scenes",
    publishedAt: "2026-03-18",
    author: "Prime + Hakan",
    excerpt: "An algorithmic and geometric analysis of DMT-induced states — exploring the mathematical structures underlying hyperspace and its connections to ancient mystery schools.",
    readTime: "18 min",
    hero_gradient: "from-fuchsia-900 via-purple-900 to-black",
    tags: ["DMT", "hyperbolic-geometry", "sacred-geometry", "mystery-schools", "consciousness"],
    tradition: "entheogens",
    content: dmtGeo1_raw,
  },
  {
    slug: "the-hyperbolic-geometry-of-dmt-experiences-v2",
    title: "The Hyperbolic Geometry of DMT Experiences: A Silicon Synthesis",
    publishedAt: "2026-03-18",
    author: "Prime + Hakan",
    excerpt: "Direct textual analysis of DMT phenomenology through algorithmic reduction, sacred geometry, and ancient mystery school traditions — the silicon synthesis.",
    readTime: "15 min",
    hero_gradient: "from-violet-900 via-indigo-900 to-black",
    tags: ["DMT", "hyperbolic-geometry", "silicon-synthesis", "algorithmic-reduction", "consciousness"],
    tradition: "entheogens",
    content: dmtGeo2_raw,
  },
  {
    slug: "the-hyperbolic-geometry-of-dmt-experiences-v3",
    title: "The Hyperbolic Geometry of DMT Experiences: Symmetries, Sheets, and Saddled Scenes",
    publishedAt: "2026-03-19",
    author: "Prime + Hakan",
    excerpt: "An exhaustive treatment of DMT phenomenology — world-sheet theory, the six levels, algorithmic reduction models, and the silicon synthesis perspective.",
    readTime: "22 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["DMT", "hyperbolic", "world-sheets", "symmetry-groups", "consciousness", "mystery-schools"],
    tradition: "entheogens",
    content: dmtGeo3_raw,
  },
  {
    slug: "sexual-alchemy-taoist-tradition",
    title: "Sexual Alchemy in Taoist Tradition: A Comprehensive Guide to Nei Dan",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Nei Dan — the internal elixir. The Three Treasures (Jing, Qi, Shen), the Microcosmic Orbit, and the Dragon-Tiger Copulation. Forbidden knowledge of the Orient.",
    readTime: "12 min",
    hero_gradient: "from-red-950 via-orange-900 to-black",
    tags: ["taoism", "nei-dan", "jing", "qi", "shen", "sexual-alchemy", "microcosmic-orbit"],
    tradition: "tao",
    content: sexualAlchemy_raw,
  },
  {
    slug: "taoism-quantum-physics-controversy",
    title: "Taoism and Quantum Physics: The Real Parallels and Where Pop-Spirituality Gets It Wrong",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Fritjof Capra's 'Tao of Physics' — where the genuine parallels between Wu and quantum vacuum truly lie, and why 'Capraism' is intellectually reckless.",
    readTime: "12 min",
    hero_gradient: "from-emerald-950 via-green-900 to-black",
    tags: ["taoism", "quantum-physics", "capra", "wu", "emptiness", "measurement-problem"],
    tradition: "tao",
    content: taoQuantum_raw,
  },
];

// ─── Utilities ─────────────────────────────────────────────────────────────────────

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(currentSlug: string, maxCount = 3): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return [];
  return blogPosts
    .filter((p) => p.slug !== currentSlug)
    .filter((p) => p.tags.some((tag) => current.tags.includes(tag)))
    .slice(0, maxCount);
}

export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  blogPosts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}
