import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";

const POSTS: Record<string, { title: string; date: string; content: string; tags: string[] }> = {
  "on-sacred-geometry": {
    title: "On Sacred Geometry and the Language of Light",
    date: "2024-09-12",
    tags: ["sacred-geometry", "theory"],
    content: `Sacred geometry is not a belief system. It is the observation that certain proportional relationships occur so consistently across nature, architecture, and symbol that they appear to be woven into the structure of reality itself.

The Flower of Life pattern — sixty-one overlapping circles — appears in the Temple of Osiris in Abydos, in the Forbidden City in Beijing, and in the cellular structure of certain organic compounds. The golden ratio spirals of the nautilus shell mirror the spiral arms of the Milky Way. These are not coincidences. They are resonances.

When an artist works with these forms, they are not inventing. They are tuning — adjusting the frequency of their work until it resonates with the underlying structure of the world. The result is art that feels *inevitable*. Art that seems to have always existed, waiting to be found.

This is the language of light: geometry that speaks directly to the deeper mind, bypassing the rational faculty and its endless objections. Sacred geometry does not argue. It transmits.`,
  },
  "the-codex-as-living-oracle": {
    title: "The Codex as Living Oracle",
    date: "2024-07-03",
    tags: ["codex", "divination", "theory"],
    content: `Unlike a tarot deck with fixed imagery, the Codex Oracle is a generative system — every spread is a unique intersection of geometry, archetype, and the question asked. The oracle does not predict. It illuminates.

The 78 archetypes of the Codex are not characters in a story. They are *dimensions of meaning* — lens through which any situation can be examined. When you pull a spread, you are not receiving a verdict. You are receiving a set of coordinates within a vast semantic space. The geometry of the spread determines which regions of meaning are activated.

A three-card spread triangulates: past-influences, present-condition, future-trajectory. But the same three positions could be: conscious-surface, unconscious-depth, symbolic-resolution. The meaning is not fixed. It is *located* — and then explored.

The Codex works because it is honest about what it is: a symbolic mirror, not a crystal ball. It reflects what you bring to it. The deeper you go, the more it reveals.`,
  },
  "signal-and-noise": {
    title: "Signal and Noise — On Art as Transmission",
    date: "2024-04-18",
    tags: ["art", "theory", "transmission"],
    content: `Every artwork is a transmission. The question is whether the receiver is tuned to the frequency.

Sacred art does not illustrate — it encodes. It places information inside a form that can bypass the rational mind and speak directly to the deeper chambers. The viewer does not *see* the meaning. The viewer *experiences* it, often without knowing why.

The challenge of sacred art is that it must operate on two levels simultaneously: it must be visually compelling enough to arrest attention, and symbolically dense enough to reward sustained looking. Most art succeeds at one and fails at the other. The great transmissions do both.

This is why I work with geometry. The circle, the triangle, the square — these are not decorations. They are the structural language of reality itself. To draw them with intention, with knowledge of their deeper relationships, is to participate in the ongoing transmission of the cosmos.

Signal or noise. The receiver determines which.`,
  },
};

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = POSTS[params.slug];
  if (!post) return { title: "Not Found" };
  return { title: post.title, description: post.content.slice(0, 160) };
}

export default function JournalPostPage({ params }: Props) {
  const post = POSTS[params.slug];
  if (!post) return null;

  const paragraphs = post.content.split("\n\n").filter(Boolean);

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <article className="container-ut max-w-3xl">
          {/* Back */}
          <SectionReveal>
            <Link href="/journal" className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase mb-12 hover:text-[var(--ut-cyan)] transition-colors" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
              ← Journal
            </Link>
          </SectionReveal>

          {/* Header */}
          <SectionReveal>
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--ut-cyan)", opacity: 0.6 }}>
              {post.date}
            </p>
            <h1 className="font-display text-3xl md:text-4xl mb-8 glow-cyan" style={{ color: "var(--ut-cyan)" }}>
              <ZalgoText text={post.title} intensity="subtle" />
            </h1>
            <div className="sacred-divider mb-12" />
          </SectionReveal>

          {/* Content */}
          {paragraphs.map((para, i) => (
            <SectionReveal key={i} delay={i * 0.05}>
              <p className="font-body text-lg leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)" }}>
                {para}
              </p>
            </SectionReveal>
          ))}

          {/* Tags */}
          <SectionReveal delay={0.2}>
            <div className="flex gap-2 flex-wrap mt-12 pt-8 border-t" style={{ borderColor: "rgba(0,229,255,0.06)" }}>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 border"
                  style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-white-dim)", opacity: 0.4 }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </SectionReveal>
        </article>
      </main>
      <Footer />
    </>
  );
}
