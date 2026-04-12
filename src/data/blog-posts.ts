// === Blog Posts — static imports from content files ======================================

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
  heroImage?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
}

// === Static content imports ============================================================

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
import yugen_raw from "./blog-content/2026-04-06/yugen-kolm-album-artwork.md";
import yugen_kolm_raw from "./blog-content/2026-04-06/yugen-kolm-album-artwork.md";

// === Strip YAML frontmatter from raw markdown ==========================================

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---[\s\S]*?---\n?/, "");
}

// === Registry =======================================================================

export const blogPosts: BlogPost[] = [
  // ── Old-Squarespace Posts (chronological) ────────────────────────────────────────
  {
    slug: "receiving-transmissions",
    title: "Receiving Transmissions",
    publishedAt: "2017-02-23",
    author: "Hakan Hisim",
    excerpt: "New works coming.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(receiving_transmissions_raw),
  },
  {
    slug: "new-transmission",
    title: "New Transmission",
    publishedAt: "2017-02-23",
    author: "Hakan Hisim",
    excerpt: "Just finished another transmission concerning the incubation of Artificial Matrices and external wombs. Universal Transmissions VII - External Womb.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(new_transmission_raw),
  },
  {
    slug: "new-sub-series-bio-energetic-vortexes",
    title: "New Sub-Series: Bio-Energetic Vortexes",
    publishedAt: "2017-07-25",
    author: "Hakan Hisim",
    excerpt: "Working on creating a new sub-series of 7 images from new transmissions. The series 'Energy Vortexes' is an exploration of the main energy wheels, sagras or chakras of apex beings and hyper-dimensional alien lifeforms alike.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(new_sub_series_bio_energetic_vortexes_raw),
  },
  {
    slug: "work-in-progress",
    title: "Work in Progress",
    publishedAt: "2017-07-25",
    author: "Hakan Hisim",
    excerpt: "Almost done! Detail shot from the first of seven as a 'Universal Transmissions' sub-series: Bio-Energetic Vortexes - Vortex No:1 - Root.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(work_in_progress_raw),
  },
  {
    slug: "universal-transmissions-bio-energetic-vortexes-vortex-no-1-root",
    title: "Universal Transmissions - Bio-Energetic Vortexes - Vortex No:1 - Root",
    publishedAt: "2017-07-26",
    author: "Hakan Hisim",
    excerpt: "The first of seven from the Bio-Energetic Vortexes completed!",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(universal_transmissions_bio_energetic_vortexes_vortex_no_1_root_raw),
  },
  {
    slug: "new-transmissions-in-progress-sacral-vortex",
    title: "New Transmissions in progress - Sacral Vortex",
    publishedAt: "2017-08-02",
    author: "Hakan Hisim",
    excerpt: "Currently Processing Transmissions for Bio-Energetic Vortexes - Vortex No:2 - Sacral.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(new_transmissions_in_progress_sacral_vortex_raw),
  },
  {
    slug: "universal-transmissions-bio-energetic-vortexes-vortex-no-2-flow",
    title: "Universal Transmissions - Bio-Energetic Vortexes - Vortex No:2 - Flow",
    publishedAt: "2017-08-08",
    author: "Hakan Hisim",
    excerpt: "Finished the second of seven of the Bio-Energetic Vortexes sub-series, this one is called 'Flow' and is inspired by the sacral chakra and the energetic power of emotions.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(universal_transmissions_bio_energetic_vortexes_vortex_no_2_flow_raw),
  },
  {
    slug: "xl-tapestries-now-added-to-the-store",
    title: "XL Tapestries now added to the store!",
    publishedAt: "2017-08-26",
    author: "Hakan Hisim",
    excerpt: "We are happy to announce that the XL tapestries 60 X 80\" (152 X 203 cm) are now available to purchase! These are by far the best way to view all the little details up close!",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["store", "process", "art", "journal", "merchandise"],
    content: stripFrontmatter(xl_tapestries_now_added_to_the_store_raw),
  },
  {
    slug: "adding-new-transmissions-soon",
    title: "Adding new transmissions soon!",
    publishedAt: "2017-10-07",
    author: "Hakan Hisim",
    excerpt: "Have been busy deciphering new transmissions and researching plenty of symbols and geometry in order to present a new wave of data. Expect written explanations of the languages and symbols used in this series as well as video recordings of the creation process!",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(adding_new_transmissions_soon_raw),
  },
  {
    slug: "universal-transmissions-viii-recursive-pantheism",
    title: "Universal Transmissions VIII - Recursive Pantheism",
    publishedAt: "2017-10-19",
    author: "Hakan Hisim",
    excerpt: "Finally finished number VIII - This was very much influenced and inspired by the works of Athanasius Kircher and Robert Fludd. It is an attempt to syncretise the relation between the macro and micro, the signs of the zodiac to chakra centers.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "sacred-geometry", "cymatics", "journal"],
    content: stripFrontmatter(universal_transmissions_viii_recursive_pantheism_raw),
  },
  {
    slug: "transmission-viii",
    title: "Transmission VIII",
    publishedAt: "2017-10-16",
    author: "Hakan Hisim",
    excerpt: "Number 8 - most probably will be named Recursive Pantheism will be finished soon. I've also been recording the entire creation process of this one on video, so stay tuned for my very first time lapse video making digital art.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(transmission_viii_raw),
  },
  {
    slug: "recursive-pantheism-creation-process-video",
    title: "Recursive Pantheism creation process video",
    publishedAt: "2017-10-20",
    author: "Hakan Hisim",
    excerpt: "Before starting on creating 'Recursive Pantheism' I decided to record the entire process on video, this is the very first time I have attempted to do something like this. The entire process took me over 13 hours to complete.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(recursive_pantheism_creation_process_video_raw),
  },
  {
    slug: "universal-transmissions-bio-energetic-vortexes-vortex-no-4-love",
    title: "Universal Transmissions - Bio-Energetic Vortexes - Vortex No:4 - Love",
    publishedAt: "2017-11-23",
    author: "Hakan Hisim",
    excerpt: "Finished the Fourth of seven of the Bio-Energetic Vortexes sub-series, this one is called 'Love' and is inspired by the Anahata 'Heart' Chakra and the universal energy of love and compassion.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(universal_transmissions_bio_energetic_vortexes_vortex_no_4_love_raw),
  },
  {
    slug: "toroidal-tantra",
    title: "Toroidal Tantra",
    publishedAt: "2019-04-26",
    author: "Hakan Hisim",
    excerpt: "Just finished another transmission on the nature of true tantric self love and its effect on the energetic vortexes through Ida, Pingala and Sushumna's relation to the cosmic serpent. Toroidal Tantra bridges the Universal Transmissions and Bio-Energetic Vortexes series together into a cohesive narrative.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "tantra", "chakra", "energy", "art", "torus", "journal"],
    content: stripFrontmatter(toroidal_tantra_raw),
  },
  {
    slug: "third-vortex-the-power",
    title: "Third Vortex: The Power",
    publishedAt: "2017-11-01",
    author: "Hakan Hisim",
    excerpt: "Working on the 3rd of the Bio-Energetic Vortexes series: Power. This is a small detail from the center of the image. More soon! Also recording the process of this video too.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(third_vortex_the_power_raw),
  },
  {
    slug: "the-making-of-power",
    title: "The making of Power",
    publishedAt: "2017-11-03",
    author: "Hakan Hisim",
    excerpt: "Below is the creation process of 'Universal Transmissions - Bio-Energetic Vortexes - Vortex No:3 - Power'. It took roughly 6 hours to complete and has been condensed into 8 minutes.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(the_making_of_power_raw),
  },
  {
    slug: "working-on-the-5th-chakra",
    title: "Working on the 5th Chakra",
    publishedAt: "2018-06-22",
    author: "Hakan Hisim",
    excerpt: "Universal Transmissions - Bio-Energetic Vortexes - Vortex No:5 - Speak. After a little break from this series I have returned with more gems, inspiration and energy to pour into these new works.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(working_on_the_5th_chakra_raw),
  },
  {
    slug: "universal-transmissions-bio-energetic-vortexes-vortex-no-5-speak",
    title: "Universal Transmissions - Bio-Energetic Vortexes - Vortex No: 5 - Speak",
    publishedAt: "2018-07-08",
    author: "Hakan Hisim",
    excerpt: "Every word you use today has grown up like a flower, with color and shape determined by its soil and seed. Reaching for the light, words spring from hums and grunts to touch the sky.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "sacred-geometry", "cymatics", "journal"],
    content: stripFrontmatter(universal_transmissions_bio_energetic_vortexes_vortex_no_5_speak_raw),
  },
  {
    slug: "universal-transmissions-ix-the-resonator-begins",
    title: "Universal Transmissions IX - The Resonator (Begins)",
    publishedAt: "2018-11-01",
    author: "Hakan Hisim",
    excerpt: "I have begun work on the ninth installment of the Universal Transmissions series - The Resonator. Be sure to sign up for the Universal Transmissions Oracle for updates and sneak peeks on the development of the project.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(universal_transmissions_ix_the_resonator_begins_raw),
  },
  {
    slug: "universal-transmissions-ix-the-cosmic-egg",
    title: "Universal Transmissions IX - The Cosmic Egg",
    publishedAt: "2018-12-30",
    author: "Hakan Hisim",
    excerpt: "The Cosmic Egg is complete, it is the ninth installment of the Universal Transmissions series and is deeply inspired by the syncretic cosmologies of all ancient civilizations. It is something that constantly reaffirms my journeys beyond the veil.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(universal_transmissions_ix_the_cosmic_egg_raw),
  },
  {
    slug: "universal-transmissions-in-motion",
    title: "Universal Transmissions in Motion",
    publishedAt: "2019-02-21",
    author: "Hakan Hisim",
    excerpt: "I Have begun to animate the Universal Transmissions artworks as both Loops and Intro's at 4k resolution. I have begun with the second installment called 'Tesseract'.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(universal_transmissions_in_motion_raw),
  },
  {
    slug: "incoming-transmission-wip",
    title: "Incoming Transmission - WIP",
    publishedAt: "2019-04-02",
    author: "Hakan Hisim",
    excerpt: "A small detail from a new piece that I am working on. This one is inspired by experiences of Inner Tantra, Kundalini Yoga and Meditative Trance States.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "tantra", "chakra", "energy", "art", "torus", "journal"],
    content: stripFrontmatter(incoming_transmission_wip_raw),
  },
  {
    slug: "the-trivium-method-sketch",
    title: "The Trivium Method - Sketch",
    publishedAt: "2019-04-03",
    author: "Hakan Hisim",
    excerpt: "Another WIP - The Trivium Method sketch.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["education", "process", "trivium", "art", "journal"],
    content: stripFrontmatter(the_trivium_method_sketch_raw),
  },
  {
    slug: "trivium-method",
    title: "Trivium Method",
    publishedAt: "2019-04-22",
    author: "Hakan Hisim",
    excerpt: "Finished another transmission, inspired by the Trivium and Quadrivium learning methods of antiquity, and blended with acquired wisdom imparted from hyperdimensional gnosis.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["education", "process", "trivium", "art", "journal"],
    content: stripFrontmatter(trivium_method_raw),
  },
  {
    slug: "transmission-in-progress-vortex-dynamics",
    title: "Transmission in progress - Vortex Dynamics",
    publishedAt: "2019-10-27",
    author: "Hakan Hisim",
    excerpt: "Detail from a transmission in progress - Vortex Dynamics On Spiral Charge Compression and Phase Conjugation in relation to Sufi Ennealogy... More soon.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["mysticism", "torus", "vortex", "process", "tantra", "sufism", "chakra", "energy"],
    content: stripFrontmatter(transmission_in_progress_vortex_dynamics_raw),
  },
  {
    slug: "universal-transmissions-x-vortex-dynamics",
    title: "Universal Transmissions X - Vortex Dynamics",
    publishedAt: "2019-11-18",
    author: "Hakan Hisim",
    excerpt: "New Transmission on Spiral Charge Compression and Phase Conjugation in relation to Sufi Ennealogy, Dervish dynamics and implosive bliss practices.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["mysticism", "vortex", "process", "sufism", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(universal_transmissions_x_vortex_dynamics_raw),
  },
  {
    slug: "new-transmission-linguistic-mystic",
    title: "New Transmission - Linguistic Mystic",
    publishedAt: "2020-02-03",
    author: "Hakan Hisim",
    excerpt: "Inspired by the age old Strophariad Mystic mentors of Translinguistic syntax, that launched legendary ludicrous lexicons of language into the Noosphere.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(new_transmission_linguistic_mystic_raw),
  },
  {
    slug: "universal-transmissions-translinguistic-equation",
    title: "Universal Transmissions - Translinguistic Equation",
    publishedAt: "2020-02-04",
    author: "Hakan Hisim",
    excerpt: "On amplifying the higher cortical experience by translinguistically encoding DNA electron spin resonance into monoamine inhibited harmala alkaloids.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(universal_transmissions_translinguistic_equation_raw),
  },
  {
    slug: "universal-transmissions-alphabet",
    title: "Universal Transmissions Alphabet",
    publishedAt: "2020-02-12",
    author: "Hakan Hisim",
    excerpt: "Functional pictographic morpheme's almost completed allowing me to take Universal Transmissions to a deeper level. With interactive decoding, ciphering and all the fun stuff that will imprint deeper layers of meaning.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["store", "merchandise", "process", "art", "journal", "xenolinguistics", "codex"],
    content: stripFrontmatter(universal_transmissions_alphabet_raw),
  },
  {
    slug: "twilight-transmissions-translinguistic-equation-uv-activated",
    title: "Twilight Transmissions - Translinguistic Equation (UV Activated)",
    publishedAt: "2020-03-12",
    author: "Hakan Hisim",
    excerpt: "Prismatic UV variant of the artwork 'Translinguistic Equation'.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(twilight_transmissions_translinguistic_equation_uv_activated_raw),
  },
  {
    slug: "twilight-transmissions-hyperdimensional-harmonics",
    title: "Twilight Transmissions: Hyperdimensional Harmonics",
    publishedAt: "2020-03-30",
    author: "Hakan Hisim",
    excerpt: "On the harmonic integration of hyperdimensional constructs into practical applications.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(twilight_transmissions_hyperdimensional_harmonics_raw),
  },
  {
    slug: "twilight-transmissions-trinary-transcendence",
    title: "Twilight Transmissions: Trinary Transcendence",
    publishedAt: "2020-08-31",
    author: "Hakan Hisim",
    excerpt: "On integration of transcendental practices in relation to Trinary consciousness. Utilizing archetypes of the trinity and Trimurti to aid in transcending Binary modes of awareness.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(twilight_transmissions_trinary_transcendence_raw),
  },
  {
    slug: "universal-transmissions-codex-creation-begins",
    title: "Universal Transmissions Codex creation begins",
    publishedAt: "2020-10-23",
    author: "Hakan Hisim",
    excerpt: "Sneak peak of a table of contents (partly encoded) // Have begun working on the Universal Transmissions Codex. The manuscript will contain encoded information for serious explorers of transcendental realms.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["process", "art", "journal", "xenolinguistics", "codex"],
    content: stripFrontmatter(universal_transmissions_codex_creation_begins_raw),
  },
  {
    slug: "codex-stream-01-compilation-capture-01",
    title: "Codex Stream 01 // Compilation Capture 01",
    publishedAt: "2020-10-27",
    author: "Hakan Hisim",
    excerpt: "Codex Stream 01 // Compilation Capture 01 Workflow timelapse and creation process of the Universal Transmissions Codex. The reason why most of the video is tinted a red color is because I woke at 3:00 AM and started working on this.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["process", "art", "journal", "xenolinguistics", "codex"],
    content: stripFrontmatter(codex_stream_01_compilation_capture_01_raw),
  },
  {
    slug: "codex-stream-01-compilation-capture-02",
    title: "Codex Stream 01 // Compilation Capture 02",
    publishedAt: "2020-11-26",
    author: "Hakan Hisim",
    excerpt: "Pages 08-16 workflow.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(codex_stream_01_compilation_capture_02_raw),
  },
  {
    slug: "transmission-honorarium",
    title: "Transmission Honorarium",
    publishedAt: "2020-11-30",
    author: "Hakan Hisim",
    excerpt: "Universal Transmissions - Reversible Ratio Regarding the Non-dual Inversion Principles of solid state and wave form embeddability. A gift to all Universal Transmissions Patrons.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["store", "process", "art", "journal", "merchandise"],
    content: stripFrontmatter(transmission_honorarium_raw),
  },
  {
    slug: "making-of-universal-transmissions-codex-cc03",
    title: "Making of Universal Transmissions Codex // CC03",
    publishedAt: "2020-12-01",
    author: "Hakan Hisim",
    excerpt: "Pages 17-20 Workflow.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(making_of_universal_transmissions_codex_cc03_raw),
  },
  {
    slug: "immaculate-conception-2021",
    title: "Immaculate Conception (2021)",
    publishedAt: "2021-01-01",
    author: "Hakan Hisim",
    excerpt: "Grand New Year One and All! I woke up very inspired and created this image to celebrate our new beginning. When we are mindful of what we conceive, the fruits of our passions blossom into Infinity.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "sacred-geometry", "cymatics", "journal"],
    content: stripFrontmatter(immaculate_conception_2021_raw),
  },
  {
    slug: "universal-transmissions-xi-vitruvian-spirit-seeding-the-new-renaissance",
    title: "Universal Transmissions XI - Vitruvian Spirit (Seeding the New Renaissance)",
    publishedAt: "2021-01-21",
    author: "Hakan Hisim",
    excerpt: "I want to make a clear statement regarding this artwork as I feel It could be misunderstood and misconstrued in these tumultuous times. This piece is not about gender, it is about balance and the power of the divine feminine and masculine.",
    readTime: "3 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["art", "journal", "process"],
    content: stripFrontmatter(universal_transmissions_xi_vitruvian_spirit_seeding_the_new_renaissance_raw),
  },
  {
    slug: "universal-transmissions-bio-energetic-vortexes-vortex-no-6-see",
    title: "Universal Transmissions - Bio-Energetic Vortexes - Vortex No: 6 - See",
    publishedAt: "2020-01-20",
    author: "Hakan Hisim",
    excerpt: "My first artwork completed in 2020, very fitting and auspicious timing for the transmission of the sixth Chakra in this period of clear vision and crystalline clarity implementation.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(universal_transmissions_bio_energetic_vortexes_vortex_no_6_see_raw),
  },
  {
    slug: "universal-transmissions-polarity-modulation-and-the-essence-of-union",
    title: "Universal Transmissions - Polarity modulation and the essence of Union",
    publishedAt: "2022-09-12",
    author: "Hakan Hisim",
    excerpt: "Very busy working away on the Codex, which is nearing 100 pages now! I took a short break to create this one that's about polarity and union, based on a sketch I had made in my pocket sketchbook.",
    readTime: "2 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["process", "art", "journal", "xenolinguistics", "codex"],
    content: stripFrontmatter(universal_transmissions_polarity_modulation_and_the_essence_of_union_raw),
  },
  {
    slug: "bio-energetic-vortexes-no-7-spirit",
    title: "Bio-Energetic Vortexes No:7 - Spirit",
    publishedAt: "2022-10-11",
    author: "Hakan Hisim",
    excerpt: "I started this sub-series in the Universal Transmissions style about seven years ago with the Root Chakra. Vortex 7 marks the completion of the sequence - the Crown Chakra. All seven are now done.",
    readTime: "3 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["vortex", "process", "chakra", "energy", "art", "journal"],
    content: stripFrontmatter(bio_energetic_vortexes_no_7_spirit_raw),
  },
  {
    slug: "the-universal-transmissions-codex-s-first-100-page-test-print",
    title: "The Universal Transmissions Codex's first 100-page test print!",
    publishedAt: "2022-10-13",
    author: "Hakan Hisim",
    excerpt: "I am very excited and inspired as I enter into the last half of completing the Codex. This test print turned out to be of exceptional quality and is an important milestone in the evolution of this project.",
    readTime: "2 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["store", "torus", "merchandise", "vortex", "process", "tantra", "chakra", "energy"],
    content: stripFrontmatter(the_universal_transmissions_codex_s_first_100_page_test_print_raw),
  },
  {
    slug: "what-is-the-universal-transmissions-codex",
    title: "What is the Universal Transmissions Codex?",
    publishedAt: "2023-05-02",
    author: "Hakan Hisim",
    excerpt: "It is an amalgamation of many things, but to be more direct it is the result of an alchemical process; a concentrated distillation of my entire life's journey up this point (44 Years).",
    readTime: "2 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["process", "art", "sacred-geometry", "cymatics", "journal", "xenolinguistics", "codex"],
    content: stripFrontmatter(what_is_the_universal_transmissions_codex_raw),
  },
  {
    slug: "the-universal-transmissions-codex-vol-1-kickstarter-campaign-is-live-within-72-hours",
    title: "The Universal Transmissions Codex Vol. 1 Kickstarter campaign is live within 72 hours!",
    publishedAt: "2023-08-18",
    author: "Hakan Hisim",
    excerpt: "Finally, 'The Book' will be available to purchase at a discounted price for the duration of the Kickstarter campaign. On top of thatof that, there will also be an additional early bird discount available for the first 3 days of the campaign!",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["process", "art", "kickstarter", "journal", "codex"],
    content: stripFrontmatter(the_universal_transmissions_codex_vol_1_kickstarter_campaign_is_live_within_72_hours_raw),
  },
  {
    slug: "funded-in-24-hours-codex-vol-1-off-to-the-printers",
    title: "Funded in 24 hours! Codex Vol.1 off to the printers!",
    publishedAt: "2023-09-26",
    author: "Hakan Hisim",
    excerpt: "Thank you all so much, I want to remind every single of you that this would not have happened without you! Once all the funds are collected and sent (15 days) We will begin the printing and production process.",
    readTime: "2 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["store", "merchandise", "process", "art", "kickstarter", "journal", "xenolinguistics", "codex"],
    content: stripFrontmatter(funded_in_24_hours_codex_vol_1_off_to_the_printers_raw),
  },
  {
    slug: "revealing-ethera-24",
    title: "Revealing ETHERA 24",
    publishedAt: "2024-02-05",
    author: "Hakan Hisim",
    excerpt: "The First Phygital Universal Transmissions Collection - ENTERING THE AGE OF ETHER...",
    readTime: "2 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["store", "merchandise", "process", "nft", "crypto", "art", "journal", "xenolinguistics"],
    content: stripFrontmatter(revealing_ethera_24_raw),
  },
  {
    slug: "the-ethera-nft-is-now-available",
    title: "The ETHERA NFT is now available!",
    publishedAt: "2024-02-23",
    author: "Hakan Hisim",
    excerpt: "We opted to create a 33 limited edition run instead of the open edition due to technical limitations of the platform. The quintessential Universal Transmissions package: 1 Physical Codex, 1 Digital Codex, 1 Rare foil print, 1 4K Animation.",
    readTime: "1 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["store", "merchandise", "process", "nft", "crypto", "art", "journal", "xenolinguistics"],
    content: stripFrontmatter(the_ethera_nft_is_now_available_raw),
  },
  {
    slug: "universal-transmissions-codex-volume-ii-begins",
    title: "Universal Transmissions Codex Volume II begins",
    publishedAt: "2024-12-23",
    author: "Hakan Hisim",
    excerpt: "After a 6 month hiatus where I was busy working on a special commission project and enjoying the first months of my third child, I have taken a deep dive into the second volume of the Codex.",
    readTime: "3 min",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: ["store", "merchandise", "process", "art", "sacred-geometry", "cymatics", "journal", "xenolinguistics"],
    content: stripFrontmatter(universal_transmissions_codex_volume_ii_begins_raw),
  },
  // ── 2026 New Transmissions ───────────────────────────────────────────────────────
  {
    slug: "2026-03-19-dmt-as-the-orthogonal-api-key",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075645/voa/heroes/dmt-orthogonal-key.png",
    title: "DMT as the Orthogonal API Key",
    publishedAt: "2026-03-19",
    author: "Prime + Hakan",
    excerpt: "The spirit molecule may be the universe's access token to the simulation - a cryptographic handshake between consciousness and the infinite.",
    readTime: "12 min",
    hero_gradient: "from-fuchsia-900 via-violet-900 to-black",
    tags: ["DMT", "consciousness", "simulation", "psychedelics", "hyperbolic"],
    tradition: "entheogens",
    content: stripFrontmatter(dmtOrthogonalKey_raw),
  },
  {
    slug: "2026-03-19-the-cosmic-sandbox",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075649/voa/heroes/cosmic-sandbox.png",
    title: "The Cosmic Sandbox: Reality's Undefined Behavior",
    publishedAt: "2026-03-19",
    author: "Prime + Hakan",
    excerpt: "What if the universe is a simulation running undefined behavior - and consciousness is what happens when you accidentally divide by zero?",
    readTime: "10 min",
    hero_gradient: "from-cyan-950 via-blue-950 to-black",
    tags: ["simulation", "reality", "consciousness", "undefined-behavior", "cosmos"],
    tradition: "general",
    content: stripFrontmatter(cosmicSandbox_raw),
  },
  {
    slug: "linguistics-2026-03-19-reality-as-syntax",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075406/voa/heroes/reality-as-syntax.png",
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
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075657/voa/heroes/gnosticism-hero.png",
    title: "Gnosticism: The Archive of Light and the Architecture of the Divine Spark",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Beyond the material prison lies the Pleroma - the Fullness. Gnosticism maps the descent of the soul into matter and the technical protocols for its liberation through Gnosis.",
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
    excerpt: "3000 years of oracular wisdom from the Yijing - 8 trigrams, 64 hexagrams, the oldest systematic divination system on Earth, rooted in Taoist cosmology.",
    readTime: "12 min",
    hero_gradient: "from-emerald-950 via-teal-900 to-black",
    tags: ["i-ching", "yijing", "tao", "divination", "hexagrams", "bagua", "trigrams"],
    tradition: "tao",
    content: stripFrontmatter(iching_raw),
  },
  {
    slug: "sufism-the-path-of-divine-love",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075660/voa/heroes/sufism-hero.png",
    title: "Sufism: The Path of Divine Love - From Rumi to the Whirling Dervishes",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Ishq - passionate, consuming love - is the engine of Sufi transformation. From Rumi's sama to Ibn Arabi's ontology of divine presence.",
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
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075665/voa/heroes/tarot-hero.png",
    title: "Tarot: The Symbolic Machine for Fate and Self-Discovery",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "78 archetypes, two arcana, one symbolic machine. From the Fool's Journey to the Golden Dawn's reconstruction - the Tarot as semantic navigation.",
    readTime: "12 min",
    hero_gradient: "from-violet-950 via-purple-950 to-black",
    tags: ["tarot", "magician", "archetypes", "golden-dawn", "crowley", "thoth", "cartomancy"],
    tradition: "tarot",
    content: stripFrontmatter(tarot_raw),
  },
  {
    slug: "alchemy-of-soul-magnum-opus",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075671/voa/heroes/alchemy-soul-hero.png",
    title: "Alchemy of the Soul: The Magnum Opus from Nigredo to Rubedo",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Solve et Coagula - dissolve and recombine. The twelve stages of alchemical transformation from calcination to projection. The Nigredo, Albedo, and Rubedo.",
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
    excerpt: "Five movements claimed to reverse aging. Peter C. Bradford's 1939 account of Tibetan lamas - genuine antiquity or Western invention? A critical analysis.",
    readTime: "10 min",
    hero_gradient: "from-teal-950 via-cyan-950 to-black",
    tags: ["five-tibetans", "yoga", "rejuvenation", "longevity", "tibet", "rites"],
    tradition: "yoga",
    content: stripFrontmatter(tibetans_raw),
  },
  {
    slug: "enochian-angelic-language-modern-occultism",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075675/voa/heroes/enochian-hero.png",
    title: "Enochian: Angelic Language and the Modern Occult Revival",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "John Dee and Edward Kelley, 1582-1587: 48 Calls, a 49-letter alphabet, and seven kingdoms of spirit. The system that fueled the Golden Dawn and Crowley.",
    readTime: "12 min",
    hero_gradient: "from-zinc-800 via-neutral-900 to-black",
    tags: ["enochian", "john-dee", "kelley", "golden-dawn", "crowley", "angelic", "scrying"],
    tradition: "ceremonial-magic",
    content: stripFrontmatter(enochian_raw),
  },
  {
    slug: "sexual-alchemy-taoist-tradition",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075679/voa/heroes/sexual-alchemy-hero.png",
    title: "Sexual Alchemy: The Taoist Art of Cultivating Sexual Energy",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Nei Dan - the internal elixir. The Three Treasures (Jing, Qi, Shen), the Microcosmic Orbit, and the Dragon-Tiger Copulation. Forbidden knowledge of the Orient.",
    readTime: "12 min",
    hero_gradient: "from-red-950 via-orange-900 to-black",
    tags: ["taoism", "nei-dan", "jing", "qi", "shen", "sexual-alchemy", "microcosmic-orbit"],
    tradition: "tao",
    content: stripFrontmatter(sexualAlchemy_raw),
  },
  {
    slug: "taoism-quantum-physics-controversy",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775075684/voa/heroes/taoism-quantum-hero.png",
    title: "Taoism and Quantum Physics: The Controversy of a Deeper Reality",
    publishedAt: "2026-03-21",
    author: "Prime + Hakan",
    excerpt: "Fritjof Capra's 'Tao of Physics' - where the genuine parallels between Wu and quantum vacuum truly lie, and why 'Capraism' is intellectually reckless.",
    readTime: "12 min",
    hero_gradient: "from-emerald-950 via-green-900 to-black",
    tags: ["taoism", "quantum-physics", "capra", "wu", "emptiness", "measurement-problem"],
    tradition: "tao",
    content: stripFrontmatter(taoQuantum_raw),
  },
  {
    slug: "yugen-kolm-album-artwork",
    title: "YÜGEN — Album Artwork for Kolm",
    publishedAt: "2026-04-06",
    author: "Hakan Hisim",
    excerpt: "The cover artwork for Kolm's new album Yügen — and what a journey. Translating their unique sound into a visual representation and motion was incredibly inspiring. The music is absolutely breathtaking.",
    readTime: "1 min",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775500259/sdcx4xtqoxhqqf7gnb2v.jpg",
    hero_gradient: "from-fuchsia-900 via-purple-900 to-black",
    tags: ["art", "journal", "kolm", "album"],
    tradition: "artwork",
    content: stripFrontmatter(yugen_raw),
  },
];

// === Utilities =====================================================================

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(currentSlug: string, maxCount = 3): BlogPost[] {
  const current = getPostBySlug(currentSlug);
  if (!current) return [
  {
    slug: "yugen-kolm-album-artwork",
    title: "YÜGEN — Album Artwork for Kolm",
    publishedAt: "2026-04-06",
    author: "Hakan Hisim",
    excerpt: "The cover artwork for Kolm's new album Yügen — and what a journey. Translating their unique sound into a visual representation and motion was incredibly inspiring. The music is absolutely breathtaking.",
    readTime: "1 min",
    hero_gradient: "from-fuchsia-900 via-purple-900 to-black",
    heroImage: "https://res.cloudinary.com/dvkxsh4ve/image/upload/v1775500259/sdcx4xtqoxhqqf7gnb2v.jpg",
    tags: ["art", "journal", "kolm", "album"],
    tradition: "artwork",
    content: stripFrontmatter(yugen_raw),
  },

];
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

export function extractFirstImage(content: string): string | null {
  const match = content.match(/!\[.*?\]\(\/journal\/([^)]+)\)/);
  return match ? `/journal/${match[1]}` : null;
}
