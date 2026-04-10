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

const EXCLUSIVE_CONTENT = [
  {
    id: "video-1",
    type: "video",
    category: "Long-Form Process",
    title: "The Full Ritual of Making",
    subtitle: "2h 17m",
    description:
      "An unbroken session of Hakan working through a complete Codex II piece — from the first pencil mark to the final signature. No cuts, no commentary. Just the act of making. Available exclusively here.",
    badge: "New",
    duration: "2h 17m",
    videoUrl: "#",
  },
  {
    id: "video-2",
    type: "video",
    category: "Foundation",
    title: "How I Learned to See Geometry",
    subtitle: "41m",
    description:
      "The years of training, the failures, the way the eye learns to parse sacred geometry in the world around us. The foundation behind all the work.",
    badge: null,
    duration: "41m",
    videoUrl: "#",
  },
  {
    id: "notes-1",
    type: "notes",
    category: "Personal Notes",
    title: "The Codex II Decision Log",
    subtitle: "47 entries",
    description:
      "Hakan's personal decision log for every piece in Codex II — why it was made, what almost replaced it, what was cut, and the one thing he would change now. Raw, unedited, deeply personal.",
    badge: null,
    galleryUrl: "/sanctum/member/codex-ii/gallery",
  },
  {
    id: "video-3",
    type: "video",
    category: "Breakdown",
    title: "Dismantling the 60-Cell — Frame by Frame",
    subtitle: "1h 03m",
    description:
      "A forensic analysis of the central structure underlying Codex II. Every connection, every relationship, every mathematical dependency explained.",
    badge: null,
    duration: "1h 03m",
    videoUrl: "#",
  },
  {
    id: "notes-2",
    type: "notes",
    category: "Personal Notes",
    title: "Frequencies I Did Not Use",
    subtitle: "31 entries",
    description:
      "Every frequency Hakan tested and rejected for Codex II, with notes on why each one didn't fit the system. A map of what was tried and why it fell away.",
    badge: "Deep Cut",
    galleryUrl: "/sanctum/member/codex-ii/gallery",
  },
  {
    id: "video-4",
    type: "video",
    category: "Audio Analysis",
    title: "The Sound of Geometry",
    subtitle: "28m",
    description:
      "An audio exploration of what the Cymatic Engine produces when fed the frequency data from various Codex II pieces. A sonic companion to the visual work.",
    badge: null,
    duration: "28m",
    videoUrl: "#",
  },
];

const PHILOSOPHY_QUOTES = [
  {
    text: "The piece you almost didn't finish is usually the one that matters most.",
    context: "On the final stretch of Codex II, July 2025",
  },
  {
    text: "I threw away more good ideas in this series than most artists use in a lifetime.",
    context: "On the quantity of exploration that went into Codex II",
  },
  {
    text: "Geometry is just time made visible.",
    context: "On the nature of the 60-cell structure",
  },
  {
    text: "The system teaches you what it wants to be. You just have to be willing to be wrong.",
    context: "On the collaborative nature of working with sacred geometry",
  },
];

export default function CodexIIExclusivePage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuote, setActiveQuote] = useState(0);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/sanctum/member/login");
        return;
      }
      setSession(data.session);
      fetchProfile(data.session.user.email || "");
    });

    const interval = setInterval(() => {
      setActiveQuote((q) => (q + 1) % PHILOSOPHY_QUOTES.length);
    }, 6000);
    return () => clearInterval(interval);
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

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="pt-24 min-h-screen flex items-center justify-center" style={{ background: "var(--ut-black)" }}>
          <div className="w-8 h-8 border-2 border-t-transparent animate-spin rounded-full" style={{ borderColor: "var(--ut-magenta)", borderTopColor: "transparent" }} />
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
              <ZalgoText text="The Inner Transmission" intensity="moderate" />
            </h2>
            <p className="font-body text-base mb-6" style={{ color: "var(--ut-white-dim)" }}>
              These long-form materials are reserved for Initiate and Master members. Upgrade your membership to unlock.
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
                <ZalgoText text="The Inner Transmission" intensity="moderate" />
              </h1>
              <p className="font-body text-base max-w-2xl" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                Long-form videos, personal notes, and process materials that exist nowhere else. This is the unfiltered making of Codex Vol. II — available only to those who have walked through the outer gates.
              </p>
            </SectionReveal>
          </div>
        </section>

        {/* ── PHILOSOPHY ROTATOR ─────────────────── */}
        <section className="py-12" style={{ borderBottom: "1px solid rgba(217,70,239,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div
                className="p-10 border text-center min-h-[160px] flex flex-col items-center justify-center"
                style={{
                  borderColor: "rgba(217,70,239,0.12)",
                  background: "linear-gradient(135deg, rgba(217,70,239,0.04) 0%, rgba(0,0,0,0) 100%)",
                }}
              >
                <div className="font-display text-xl md:text-2xl mb-4 leading-relaxed" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text={`"${PHILOSOPHY_QUOTES[activeQuote].text}"`} intensity="subtle" />
                </div>
                <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                  — Hakan Hisim · {PHILOSOPHY_QUOTES[activeQuote].context}
                </p>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── CONTENT LIST ─────────────────────────── */}
        <section className="py-12">
          <div className="container-ut">
            <div className="space-y-6">
              {EXCLUSIVE_CONTENT.map((item, i) => (
                <SectionReveal key={item.id} delay={i * 0.08}>
                  <div
                    className="p-8 border ut-card"
                    style={{ borderColor: "rgba(217,70,239,0.12)" }}
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Icon */}
                      <div className="hidden md:flex flex-col items-center">
                        <div
                          className="w-16 h-16 border flex items-center justify-center"
                          style={{
                            borderColor: "rgba(217,70,239,0.3)",
                            background: "rgba(217,70,239,0.05)",
                          }}
                        >
                          {item.type === "video" ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ut-magenta)" strokeWidth="1.5">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ut-gold)" strokeWidth="1.5">
                              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                            </svg>
                          )}
                        </div>
                        {item.duration && (
                          <span className="font-mono text-[9px] tracking-widest uppercase mt-2" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                            {item.duration}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-1" style={{ color: "var(--ut-magenta)", opacity: 0.6 }}>
                              {item.category}
                            </p>
                            <h3 className="font-display text-xl" style={{ color: "var(--ut-white)" }}>
                              <ZalgoText text={item.title} intensity="subtle" />
                            </h3>
                            {item.subtitle && (
                              <p className="font-mono text-[10px] mt-1" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          {item.badge && (
                            <span className="font-mono text-[9px] tracking-widest uppercase px-3 py-1 rounded-full border shrink-0"
                              style={{ borderColor: "rgba(212,168,71,0.5)", color: "var(--ut-gold)" }}>
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                          {item.description}
                        </p>

                        <div className="flex items-center gap-4 pt-2">
                          {item.type === "video" && item.videoUrl && (
                            <button className="btn-primary text-xs px-6 py-2 inline-flex items-center gap-2">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                              </svg>
                              Watch Now
                            </button>
                          )}
                          {item.type === "notes" && (
                            <a
                              href={item.galleryUrl}
                              className="btn-primary text-xs px-6 py-2 inline-flex items-center gap-2"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                              </svg>
                              Browse Notes
                            </a>
                          )}
                          {item.type === "video" && !item.videoUrl && (
                            <span className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 border"
                              style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--ut-white-dim)", opacity: 0.3 }}>
                              Processing — Available Soon
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── ASK HAKAN ──────────────────────────── */}
        <section className="py-16" style={{ borderTop: "1px solid rgba(217,70,239,0.06)" }}>
          <div className="container-ut">
            <SectionReveal>
              <div
                className="p-10 border text-center"
                style={{ borderColor: "rgba(212,168,71,0.15)", background: "linear-gradient(135deg, rgba(212,168,71,0.04) 0%, rgba(0,0,0,0) 100%)" }}
              >
                <svg width="36" height="36" className="mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="var(--ut-gold)" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <h3 className="font-display text-xl mb-3" style={{ color: "var(--ut-white)" }}>
                  <ZalgoText text="Questions About the Materials?" intensity="subtle" />
                </h3>
                <p className="font-body text-sm max-w-md mx-auto mb-5" style={{ color: "var(--ut-white-dim)" }}>
                  Have a question about the process, a decision, or the work itself? Hakan reads and responds to messages from Initiate and Master members first.
                </p>
                <a href="/sanctum/member#messages" className="btn-primary text-xs px-6 py-2 inline-flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send a Message
                </a>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
