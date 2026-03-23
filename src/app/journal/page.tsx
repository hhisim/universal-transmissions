import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Dispatches from the inner planes — writings on symbolism, sacred geometry, and the Codex Oracle by Hakan Hisim.",
};

const POSTS = [
  {
    slug: "codex-volume-ii-begins",
    title: "Universal Transmissions Codex Volume II begins",
    date: "2024-12-23",
    excerpt:
      "After a 6 month hiatus, I have taken a deep dive into the second volume of the Codex. During meditation and lucid dreams the structure and contents came to me — including a new Lemurian alphabet of 33 morphemes, the twilight dark theme exploring multi-dimensional navigation, Lucid realms, and Astral bio-mechanics.",
    tags: ["codex", "volume-ii", "lemurian", "alphabet", "xenolinguistics"],
  },
  {
    slug: "bio-energetic-vortexes-no7-spirit",
    title: "Bio-Energetic Vortexes No.7 — Spirit (Crown Chakra)",
    date: "2022-10-11",
    excerpt:
      "Yesterday that 7-year voyage ended, and the cycle was completed as I finished creating Bio-Energetic Vortexes No.7 — Spirit. The final seventh seal was particularly challenging because I experienced this gateway's full-blown epic power last year in 2021 — during a series of awakenings into states of Samadhi.",
    tags: ["bio-energetic-vortexes", "chakra", "sahasrara", "kundalini", "samadhi", "spirit"],
  },
  {
    slug: "vitruvian-spirit",
    title: "Universal Transmissions XI — Vitruvian Spirit (Seeding the New Renaissance)",
    date: "2021-01-21",
    excerpt:
      "A homage to the masters of antiquity who have inspired generations to create and innovate, it is a celebration of the human spirit and imagination. This piece is not about gender — it contains a message of balance, of the power of the divine feminine and masculine and of the balanced trinity within us all.",
    tags: ["universal-transmissions", "vitruvian", "renaissance", "balance", "divine-feminine"],
  },
  {
    slug: "codex-100",
    title: "The Universal Transmissions Codex's first 100-page test print!",
    date: "2022-10-13",
    excerpt:
      "I am very excited and inspired as I enter into the last half of completing the Codex. This test print turned out to be of exceptional quality and is an important milestone in the evolution of this project. The Codex, when complete, will be 300+ pages of esoteric oddity.",
    tags: ["codex", "print", "milestone", "production"],
  },
  {
    slug: "recursive-pantheism",
    title: "Universal Transmissions VIII — Recursive Pantheism",
    date: "2017-10-19",
    excerpt:
      "Finally finished number VIII — very much influenced and inspired by the works of Athanasius Kircher and Robert Fludd. An attempt to syncretise the relation between the macro and micro, the signs of the zodiac to chakra centers and their correlation to organs, cymatic patterns and frequencies.",
    tags: ["universal-transmissions", "kircher", "fludd", "zodiac", "chakra", "cymatics"],
  },
  {
    slug: "codex-kickstarter",
    title: "The Universal Transmissions Codex Vol. 1 Kickstarter campaign is live within 72 hours!",
    date: "2023-08-18",
    excerpt:
      "Finally, 'The Book' will be available to purchase at a discounted price for the duration of the Kickstarter campaign. On top of that, there will also be an additional early bird discount available for the first 3 days of the campaign!",
    tags: ["codex", "kickstarter", "launch", "crowdfunding"],
  },
  {
    slug: "codex-funded",
    title: "Funded in 24 hours! Codex Vol.1 off to the printers!",
    date: "2023-09-26",
    excerpt:
      "Thank you all so much. I want to remind every single one of you that this would not have happened without you! Once all the funds are collected (15 days) we will begin the printing and production process, which would take an additional 2-3 weeks.",
    tags: ["codex", "kickstarter", "funded", "production"],
  },
  {
    slug: "trivium-method",
    title: "Trivium Method",
    date: "2019-04-22",
    excerpt:
      "Finished another transmission, inspired by the Trivium and Quadrivium learning methods of antiquity, and blended with acquired wisdom imparted from hyperdimensional gnosis.",
    tags: ["trivium", "quadrivium", "education", "antiquity", "sacred-geometry"],
  },
  {
    slug: "twilight-transmissions-trinary",
    title: "Twilight Transmissions: Trinary Transcendence",
    date: "2020-08-31",
    excerpt:
      "On integration of transcendental practices in relation to Trinary consciousness. Utilizing archetypes of the trinity and Trimurti to aid in transcending Binary modes of awareness. Created during a hypomanic state.",
    tags: ["twilight-transmissions", "trinary", "trinity", "consciousness", "transcendence"],
  },
  {
    slug: "toroidal-tantra",
    title: "Toroidal Tantra",
    date: "2019-04-26",
    excerpt:
      "Just finished another transmission on the nature of true tantric self love and its effect on the energetic vortexes through Ida, Pingala and Sushumna's relation to the cosmic serpent. Bridges the Universal Transmissions and Bio-Energetic Vortexes series together.",
    tags: ["toroidal-tantra", "tantra", "kundalini", "cosmic-serpent", "bio-energetic-vortexes"],
  },
];

export default function JournalPage() {
  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          {/* Header */}
          <SectionReveal>
            <div className="text-center mb-16 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>
                [ Dispatches from the Inner Planes ]
              </p>
              <h1 className="font-display text-4xl md:text-6xl glow-cyan mb-4">
                <ZalgoText text="Journal" intensity="moderate" />
              </h1>
              <p className="font-body text-lg max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
                Writings on sacred geometry, symbolism, cymatics, and the living oracle.
              </p>
            </div>
          </SectionReveal>

          {/* Posts */}
          <div className="max-w-3xl mx-auto space-y-8">
            {POSTS.map((post, i) => (
              <SectionReveal key={post.slug} delay={i * 0.05}>
                <Link
                  href={`/journal/${post.slug}`}
                  className="ut-card block p-8 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
                        {post.date}
                      </p>
                      <h2 className="font-heading text-lg tracking-wider group-hover:text-[var(--ut-cyan)] transition-colors" style={{ color: "var(--ut-white)" }}>
                        <ZalgoText text={post.title} intensity="subtle" />
                      </h2>
                    </div>
                    <span className="font-mono text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--ut-cyan)" }}>
                      →
                    </span>
                  </div>
                  <p className="font-body text-base leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.75 }}>
                    {post.excerpt}
                  </p>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 border"
                        style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-white-dim)", opacity: 0.4 }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              </SectionReveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
