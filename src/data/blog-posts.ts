// ─── Blog Posts — static imports from content files ─────────────────────────────────────────

export interface BlogPost {
  slug: string;
  title: string;
  publishedAt: string;
  author: string;
  excerpt: string;
  readTime: string;
  hero_gradient: string;
  tags: string[];
  tradition?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
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
import sexualAlchemy_raw from "./blog-content/Tao/sexual-alchemy-taoist-tradition.md";
import taoQuantum_raw from "./blog-content/Tao/taoism-quantum-physics-controversy.md";
import adding_new_transmissions_soon_raw from "./blog-content/old-squarespace/adding-new-transmissions-soon.md";
import bio_energetic_vortexes_no_7_spirit_raw from "./blog-content/old-squarespace/bio-energetic-vortexes-no-7-spirit.md";
import codex_stream_01_compilation_capture_01_raw from "./blog-content/old-squarespace/codex-stream-01-compilation-capture-01.md";
import codex_stream_01_compilation_capture_02_raw from "./blog-content/old-squarespace/codex-stream-01-compilation-capture-02.md";
import funded_in_24_hours_codex_vol_1_off_to_the_printers_raw from "./blog-content/old-squarespace/funded-in-24-hours-codex-vol-1-off-to-the-printers.md";
import immaculate_conception_2021_raw from "./blog-content/old-squarespace/immaculate-conception-2021.md";
import incoming_transmission_wip_raw from "./blog-content/old-squarespace/incoming-transmission-wip.md";
import making_of_universal_transmissions_codex_cc03_raw from "./blog-content/old-squarespace/making-of-universal-transmissions-codex-cc03.md";
import new_sub_series_bio_energetic_vortexes_raw from "./blog-content/old-squarespace/new-sub-series-bio-energetic-vortexes.md";
import new_transmission_linguistic_mystic_raw from "./blog-content/old-squarespace/new-transmission-linguistic-mystic.md";
import new_transmission_raw from "./blog-content/old-squarespace/new-transmission.md";
import new_transmissions_in_progress_sacral_vortex_raw from "./blog-content/old-squarespace/new-transmissions-in-progress-sacral-vortex.md";
import receiving_transmissions_raw from "./blog-content/old-squarespace/receiving-transmissions.md";
import recursive_pantheism_creation_process_video_raw from "./blog-content/old-squarespace/recursive-pantheism-creation-process-video.md";
import revealing_ethera_24_raw from "./blog-content/old-squarespace/revealing-ethera-24.md";
import the_ethera_nft_is_now_available_raw from "./blog-content/old-squarespace/the-ethera-nft-is-now-available.md";
import the_making_of_power_raw from "./blog-content/old-squarespace/the-making-of-power.md";
import the_trivium_method_sketch_raw from "./blog-content/old-squarespace/the-trivium-method-sketch.md";
import the_universal_transmissions_codex_s_first_100_page_test_print_raw from "./blog-content/old-squarespace/the-universal-transmissions-codex-s-first-100-page-test-print.md";
import the_universal_transmissions_codex_vol_1_kickstarter_campaign_is_live_within_72_hours_raw from "./blog-content/old-squarespace/the-universal-transmissions-codex-vol-1-kickstarter-campaign-is-live-within-72-hours.md";
import third_vortex_the_power_raw from "./blog-content/old-squarespace/third-vortex-the-power.md";
import toroidal_tantra_raw from "./blog-content/old-squarespace/toroidal-tantra.md";
import transmission_honorarium_raw from "./blog-content/old-squarespace/transmission-honorarium.md";
import transmission_in_progress_vortex_dynamics_raw from "./blog-content/old-squarespace/transmission-in-progress-vortex-dynamics.md";
import transmission_viii_raw from "./blog-content/old-squarespace/transmission-viii.md";
import trivium_method_raw from "./blog-content/old-squarespace/trivium-method.md";
import twilight_transmissions_hyperdimensional_harmonics_raw from "./blog-content/old-squarespace/twilight-transmissions-hyperdimensional-harmonics.md";
import twilight_transmissions_translinguistic_equation_uv_activated_raw from "./blog-content/old-squarespace/twilight-transmissions-translinguistic-equation-uv-activated.md";
import twilight_transmissions_trinary_transcendence_raw from "./blog-content/old-squarespace/twilight-transmissions-trinary-transcendence.md";
import universal_transmissions_alphabet_raw from "./blog-content/old-squarespace/universal-transmissions-alphabet.md";
import universal_transmissions_bio_energetic_vortexes_vortex_no_1_root_raw from "./blog-content/old-squarespace/universal-transmissions-bio-energetic-vortexes-vortex-no-1-root.md";
import universal_transmissions_bio_energetic_vortexes_vortex_no_2_flow_raw from "./blog-content/old-squarespace/universal-transmissions-bio-energetic-vortexes-vortex-no-2-flow.md";
import universal_transmissions_bio_energetic_vortexes_vortex_no_3_power_raw from "./blog-content/old-squarespace/universal-transmissions-bio-energetic-vortexes-vortex-no-3-power.md";
import universal_transmissions_bio_energetic_vortexes_vortex_no_4_love_raw from "./blog-content/old-squarespace/universal-transmissions-bio-energetic-vortexes-vortex-no-4-love.md";
import universal_transmissions_bio_energetic_vortexes_vortex_no_5_speak_raw from "./blog-content/old-squarespace/universal-transmissions-bio-energetic-vortexes-vortex-no-5-speak.md";
import universal_transmissions_bio_energetic_vortexes_vortex_no_6_see_raw from "./blog-content/old-squarespace/universal-transmissions-bio-energetic-vortexes-vortex-no-6-see.md";
import universal_transmissions_codex_creation_begins_raw from "./blog-content/old-squarespace/universal-transmissions-codex-creation-begins.md";
import universal_transmissions_codex_volume_ii_begins_raw from "./blog-content/old-squarespace/universal-transmissions-codex-volume-ii-begins.md";
import universal_transmissions_in_motion_raw from "./blog-content/old-squarespace/universal-transmissions-in-motion.md";
import universal_transmissions_ix_the_cosmic_egg_raw from "./blog-content/old-squarespace/universal-transmissions-ix-the-cosmic-egg.md";
import universal_transmissions_ix_the_resonator_begins_raw from "./blog-content/old-squarespace/universal-transmissions-ix-the-resonator-begins.md";
import universal_transmissions_polarity_modulation_and_the_essence_of_union_raw from "./blog-content/old-squarespace/universal-transmissions-polarity-modulation-and-the-essence-of-union.md";
import universal_transmissions_translinguistic_equation_raw from "./blog-content/old-squarespace/universal-transmissions-translinguistic-equation.md";
import universal_transmissions_viii_recursive_pantheism_raw from "./blog-content/old-squarespace/universal-transmissions-viii-recursive-pantheism.md";
import universal_transmissions_xi_vitruvian_spirit_seeding_the_new_renaissance_raw from "./blog-content/old-squarespace/universal-transmissions-xi-vitruvian-spirit-seeding-the-new-renaissance.md";
import universal_transmissions_x_vortex_dynamics_raw from "./blog-content/old-squarespace/universal-transmissions-x-vortex-dynamics.md";
import what_is_the_universal_transmissions_codex_raw from "./blog-content/old-squarespace/what-is-the-universal-transmissions-codex.md";
import work_in_progress_raw from "./blog-content/old-squarespace/work-in-progress.md";
import working_on_the_5th_chakra_raw from "./blog-content/old-squarespace/working-on-the-5th-chakra.md";
import xl_tapestries_now_added_to_the_store_raw from "./blog-content/old-squarespace/xl-tapestries-now-added-to-the-store.md";

// ─── Strip YAML frontmatter from raw markdown ─────────────────────────────────────────────

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---[\s\S]*?---\n?/, "");
}

// ─── Registry ───────────────────────────────────────────────────────────────

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
    content: stripFrontmatter(dmtOrthogonalKey_raw),
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
    content: stripFrontmatter(cosmicSandbox_raw),
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
    content: stripFrontmatter(realitySyntax_raw),
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
    content: stripFrontmatter(dreamwalker_raw),
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
    content: stripFrontmatter(gnosticism_raw),
  },
  {
    slug: "kundalini-shakti-serpent-power-western-science",
    title: "Kundalini Shakti: The Serpent Power That Western Science Can't Explain",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Seven chakras. Seven seals. Seven levels of consciousness encoded in geometry, sound, and fire.",
    readTime: "12 min",
    hero_gradient: "from-orange-900 via-red-900 to-black",
    tags: ["kundalini", "chakras", "shakti", "tantra", "yoga", "shaivism"],
    tradition: "tantra",
    content: stripFrontmatter(kundalini_raw),
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
    content: stripFrontmatter(iching_raw),
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
    content: stripFrontmatter(sufism_raw),
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
    content: stripFrontmatter(kybalion_raw),
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
    content: stripFrontmatter(tarot_raw),
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
    content: stripFrontmatter(alchemy_raw),
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
    content: stripFrontmatter(tibetans_raw),
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
    content: stripFrontmatter(enochian_raw),
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
    content: stripFrontmatter(sexualAlchemy_raw),
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
    content: stripFrontmatter(taoQuantum_raw),
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
