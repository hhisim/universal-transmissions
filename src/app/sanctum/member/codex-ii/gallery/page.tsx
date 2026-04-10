"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Placeholder gallery items — these come from the Codex II notes process
const GALLERY_ITEMS = [
  {
    id: 1,
    category: "Foundation Sketches",
    title: "The First Grid Studies",
    date: "March 2025",
    description: "Early explorations of the 60-cell structure before any digital work. Pure pencil on paper.",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035600-XRK9BH3K7P3J5R2M8T4Q/Codex-II-Foundation-Sketches.jpg",
    tags: ["foundation", "process", "sketches"],
  },
  {
    id: 2,
    category: "Frequency Mapping",
    title: "Cymatic Test Series — 528Hz",
    date: "April 2025",
    description: "Testing the 528Hz frequency against the primary geometric forms. How does the Tonoscope respond to the 'Miracle' frequency?",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035601-YLQ2BR5C8N6M4K9P1W3R/Codex-II-528Hz-Tests.jpg",
    tags: ["frequency", "528Hz", "cymatics"],
  },
  {
    id: 3,
    category: "Rejected Concepts",
    title: "The Discarded Series",
    date: "April 2025",
    description: "Forms that didn't make it into the final Codex. Every artist discards — here is the archaeology of those decisions.",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035602-CZM7KT4W9N2L5Q8R1Y6H/Codex-II-Rejected-Concepts.jpg",
    tags: ["rejected", "process", "behind-the-scenes"],
  },
  {
    id: 4,
    category: "Early Renders",
    title: "First Digital Approximations",
    date: "May 2025",
    description: "The transition from paper to screen. Raw renders, before color grading, before the cymatic encoding.",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035603-HJ8KP2N5W7L4M9R6T2Q/Codex-II-Early-Renders.jpg",
    tags: ["renders", "digital", "process"],
  },
  {
    id: 5,
    category: "Process Notes",
    title: "The Logic of Rejection",
    date: "May 2025",
    description: "What makes a form worth keeping versus discarding? The internal criteria, the aesthetic philosophy, the reasons.",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035604-RT5MW8L2N4K9P3Q6Y1H/Codex-II-Process-Notes.jpg",
    tags: ["notes", "process", "philosophy"],
  },
  {
    id: 6,
    category: "Symbol Development",
    title: "From Glyph to Geometry",
    date: "June 2025",
    description: "How individual xenolinguistic glyphs evolved across the Codex II series. The transformation from concept to symbol.",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035605-YQ1H6T3M7K9N2L5W8R4/Codex-II-Symbol-Development.jpg",
    tags: ["symbols", "glyphs", "development"],
  },
  {
    id: 7,
    category: "Color Studies",
    title: "The Spectral Palette",
    date: "June 2025",
    description: "Color palette explorations — which frequencies correspond to which spectral ranges, and why.",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035606-MK4T8W2L5N9H7Q3R1Y6/Codex-II-Color-Studies.jpg",
    tags: ["color", "palette", "spectral"],
  },
  {
    id: 8,
    category: "Mathematical Notes",
    title: "The 60-Cell Structure",
    date: "July 2025",
    description: "Raw mathematical working documents — the geometry that underlies every Codex II piece.",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035607-LN9T5K3M7W1R8Y4Q2H6/Codex-II-Math-Notes.jpg",
    tags: ["mathematics", "geometry", "structure"],
  },
  {
    id: 9,
    category: "Breakthrough Moments",
    title: "The Night It Came Together",
    date: "July 2025",
    description: "The moment when the entire system clicked — documented in real-time as it happened.",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035608-PH2R6Y9M4K8L1N7T3W5/Codex-II-Breakthrough.jpg",
    tags: ["breakthrough", "milestone", "revelation"],
  },
  {
    id: 10,
    category: "Doubts & Revisions",
    title: "The Second Thoughts",
    date: "August 2025",
    description: "Every piece was second-guessed at least once. The moments of doubt and what was done about them.",
    image: "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1744021035609-WR3Y8T1N5L7H2Q9M6K4/Codex-II-Doubts.jpg",
    tags: ["doubt", "revisions", "process"],
  },
];

const CATEGORIES = ["All", ...Array.from(new Set(GALLERY_ITEMS.map((i) => i.category)))];

export default function CodexIIGalleryPage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lightboxItem, setLightboxItem] = useState<typeof GALLERY_ITEMS[0] | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/sanctum/member/login");
        return;
      }
      setSession(data.session);
      fetchProfile(data.session.user.email || '');
    });
  }, [router]);

  async function fetchProfile(email: string) {
    const { data } = await supabase
      .from("profiles")
      .select("plan")
      .eq("email", email)
      .maybeSingle();
    setProfile(data);
    setLoading(false);
  }

  const isPaid = profile?.plan === "initiate" || profile?.plan === "master";

  const filtered = selectedCategory === "All"
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((i) => i.category === selectedCategory);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="pt-24 min-h-screen flex items-center justify-center" style={{ background: "var(--ut-black)" }}>
          <div className="w-8 h-8 border-2 border-t-transparent animate-spin rounded-full" style={{ borderColor: "var(--ut-gold)", borderTopColor: "transparent" }} />
        </main>
      </>
    );
  }

  if (!isPaid) {
    return (
      <>
        <Navigation />
        <main className="pt-24 min-h-screen flex items-center justify-center" style={{ background: "var(--ut-black)" }}>
          <div className="text-center max-w-lg px-4">
            <div className="w-16 h-16 border mx-auto mb-6 flex items-center justify-center" style={{ borderColor: "rgba(217,70,239,0.3)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ut-magenta)" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2 className="font-display text-2xl mb-4">
              <ZalgoText text="Behind the Veil" intensity="moderate" />
            </h2>
            <p className="font-body text-base mb-6" style={{ color: "var(--ut-white-dim)" }}>
              These notes are reserved for Initiate and Master members. Upgrade your membership to access the process archive.
            </p>
            <a href="/sanctum/member/experience" className="btn-primary px-8 py-3 inline-flex items-center gap-2 font-mono text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Upgrade Membership
            </a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PageBackground variant="cymatics" />
      <Navigation />
      <main className="pt-24 pb-20 min-h-screen" style={{ background: "var(--ut-black)" }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <section className="py-16" style={{ borderBottom: "1px solid rgba(217,70,239,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-[9px] tracking-[0.5em] uppercase" style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>[ Codex II ]</span>
                <span className="font-mono text-[9px] tracking-[0.3em] uppercase px-2 py-0.5 rounded-full border" style={{ borderColor: "rgba(212,168,71,0.4)", color: "var(--ut-gold)" }}>Initiate+</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl mb-4" style={{ color: "var(--ut-magenta)" }}>
                <ZalgoText text="Behind the Veil" intensity="moderate" />
              </h1>
              <p className="font-body text-base max-w-2xl" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                Hakan&apos;s process journal — raw working documents, abandoned sketches, breakthrough moments,
                and the logic behind every decision made in the creation of Codex Vol. II.
                <span className="font-mono text-xs ml-3" style={{ color: "var(--ut-gold)", opacity: 0.4 }}>
                  {GALLERY_ITEMS.length} entries
                </span>
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── CATEGORY FILTER ──────────────────────── */}
        <section className="py-8">
          <div className="container-ut">
            <div className="flex gap-2 flex-wrap mb-8">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="ut-btn px-5 py-2 font-mono text-[10px] uppercase"
                  style={{
                    borderColor: selectedCategory === cat ? "var(--ut-magenta)" : "rgba(217,70,239,0.15)",
                    color: selectedCategory === cat ? "var(--ut-magenta)" : "var(--ut-white-dim)",
                    background: selectedCategory === cat ? "rgba(217,70,239,0.1)" : "transparent",
                    opacity: selectedCategory === cat ? 1 : 0.5,
                  }}
                >{cat}</button>
              ))}
            </div>

            {/* ── GALLERY GRID ────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item, i) => (
                <SectionReveal key={item.id} delay={i * 0.05}>
                  <div
                    className="ut-card overflow-hidden group cursor-pointer transition-all hover:-translate-y-1"
                    style={{ borderColor: "rgba(217,70,239,0.12)" }}
                    onClick={() => setLightboxItem(item)}
                  >
                    {/* Image placeholder — shows decorative glyph */}
                    <div
                      className="w-full aspect-[4/3] flex items-center justify-center relative overflow-hidden"
                      style={{ background: "linear-gradient(135deg, rgba(217,70,239,0.08) 0%, rgba(34,211,238,0.04) 100%)" }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-20" style={{ color: "var(--ut-magenta)" }}>
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                          <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="0.8"/>
                          <circle cx="40" cy="40" r="25" stroke="currentColor" strokeWidth="0.8"/>
                          <circle cx="40" cy="40" r="15" stroke="currentColor" strokeWidth="0.8"/>
                          <circle cx="40" cy="40" r="5" stroke="currentColor" strokeWidth="1.2" fill="currentColor" opacity="0.3"/>
                          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                            const rad = (deg * Math.PI) / 180;
                            return <line key={deg} x1="40" y1="40" x2={40 + 35 * Math.cos(rad)} y2={40 + 35 * Math.sin(rad)} stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>;
                          })}
                        </svg>
                      </div>
                      <div className="text-center z-10 p-4">
                        <div className="font-display text-xs mb-1" style={{ color: "var(--ut-magenta)" }}>{item.category}</div>
                        <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>{item.date}</div>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-display text-base mb-2" style={{ color: "var(--ut-white)" }}>
                        <ZalgoText text={item.title} intensity="subtle" />
                      </h3>
                      <p className="font-body text-xs leading-relaxed mb-4" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                        {item.description}
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {item.tags.map((tag) => (
                          <span key={tag} className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(217,70,239,0.1)", color: "var(--ut-magenta)", opacity: 0.5 }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── PROCESS QUOTE ────────────────────────── */}
        <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div className="max-w-2xl mx-auto text-center">
                <div className="font-display text-xl mb-4 leading-relaxed" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text="Every piece I discard teaches me why the ones I keep are worth keeping." intensity="subtle" />
                </div>
                <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                  — Hakan Hisim · Process Journal · Codex Vol. II
                </p>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>

      {/* ── LIGHTBOX ──────────────────────────────── */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="ut-card max-w-2xl w-full p-8 max-h-[80vh] overflow-y-auto"
            style={{ borderColor: "rgba(217,70,239,0.3)", background: "var(--ut-black)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxItem(null)}
              className="ut-btn px-4 py-2 font-mono text-[10px] mb-6"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--ut-white-dim)" }}
            >Close</button>

            <div className="w-full aspect-[4/3] rounded-xl mb-6 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(217,70,239,0.1) 0%, rgba(34,211,238,0.05) 100%)" }}>
              <div className="opacity-20" style={{ color: "var(--ut-magenta)" }}>
                <svg width="120" height="120" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="0.8"/>
                  <circle cx="40" cy="40" r="25" stroke="currentColor" strokeWidth="0.8"/>
                  <circle cx="40" cy="40" r="15" stroke="currentColor" strokeWidth="0.8"/>
                  <circle cx="40" cy="40" r="5" fill="currentColor" opacity="0.4"/>
                  {[0,45,90,135,180,225,270,315].map((deg) => {
                    const rad = (deg * Math.PI) / 180;
                    return <line key={deg} x1="40" y1="40" x2={40+35*Math.cos(rad)} y2={40+35*Math.sin(rad)} stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>;
                  })}
                </svg>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="font-mono text-[9px] tracking-widest uppercase mb-1 block" style={{ color: "var(--ut-magenta)", opacity: 0.5 }}>{lightboxItem.category}</span>
                <h2 className="font-display text-2xl" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text={lightboxItem.title} intensity="subtle" />
                </h2>
              </div>
              <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
                {lightboxItem.description}
              </p>
              <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(217,70,239,0.1)" }}>
                <span className="font-mono text-[10px]" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>{lightboxItem.date}</span>
                <div className="flex gap-1 flex-wrap">
                  {lightboxItem.tags.map((tag) => (
                    <span key={tag} className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(217,70,239,0.1)", color: "var(--ut-magenta)", opacity: 0.5 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}