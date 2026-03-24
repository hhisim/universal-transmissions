"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { supabase } from "@/lib/supabase-client";
import { LogOut, User, Eye, Package } from "lucide-react";

export default function MemberPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/sanctum/member/login");
      } else {
        setSession(data.session);
        fetchMemberData(data.session.user.email || '');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/sanctum/member/login");
      } else {
        setSession(session);
        fetchMemberData(session.user.email || '');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function fetchMemberData(email: string) {
    try {
      const res = await fetch(`/api/member?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setMemberData(data);
      }
    } catch (e) {
      console.error("Failed to fetch member data:", e);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/sanctum/member/login");
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="pt-24 pb-20 min-h-screen flex items-center justify-center" style={{ background: "var(--ut-black)" }}>
          <div className="text-center">
            <div className="font-mono text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>
              Authenticating...
            </div>
            <div className="w-8 h-8 border-2 border-t-transparent mx-auto animate-spin" style={{ borderColor: "var(--ut-gold)", borderTopColor: "transparent" }} />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20 min-h-screen" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut max-w-3xl mx-auto">
          {/* Header */}
          <SectionReveal>
            <div className="text-center mb-12 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                [ Member Sanctum ]
              </p>
              <h1 className="font-display text-4xl md:text-5xl mb-4">
                <ZalgoText text="Welcome Back" intensity="moderate" />
              </h1>
              {session?.user && (
                <p className="font-body text-base" style={{ color: "var(--ut-white-dim)" }}>
                  {session.user.email}
                </p>
              )}
            </div>
          </SectionReveal>

          {/* Member Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Oracle Access */}
            <SectionReveal delay={0.1}>
              <div
                className="p-8 border glow-border-magenta ut-card group cursor-pointer"
                style={{ borderColor: "rgba(217,70,239,0.2)" }}
                onClick={() => router.push("/sanctum/member/oracle")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 flex items-center justify-center border"
                    style={{ borderColor: "rgba(217,70,239,0.3)", background: "rgba(217,70,239,0.05)" }}
                  >
                    <Eye size={22} style={{ color: "var(--ut-magenta)" }} />
                  </div>
                  <div>
                    <h2 className="font-heading text-base tracking-wider" style={{ color: "var(--ut-magenta)" }}>
                      <ZalgoText text="The Oracle" intensity="subtle" />
                    </h2>
                    <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>
                      Custom Transmission
                    </p>
                  </div>
                </div>
                <p className="font-body text-sm leading-relaxed mb-4" style={{ color: "var(--ut-white-dim)" }}>
                  Access the custom Oracle — your personal divination system built for Universal Transmissions.
                </p>
                <div className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2">
                  Access Oracle
                </div>
              </div>
            </SectionReveal>

            {/* Order History */}
            <SectionReveal delay={0.2}>
              <div
                className="p-8 border glow-border-gold ut-card-gold group cursor-pointer"
                style={{ borderColor: "rgba(212,168,71,0.2)" }}
                onClick={() => router.push("/sanctum/orders")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 flex items-center justify-center border"
                    style={{ borderColor: "rgba(212,168,71,0.3)", background: "rgba(212,168,71,0.05)" }}
                  >
                    <Package size={22} style={{ color: "var(--ut-gold)" }} />
                  </div>
                  <div>
                    <h2 className="font-heading text-base tracking-wider" style={{ color: "var(--ut-gold)" }}>
                      <ZalgoText text="Order History" intensity="subtle" />
                    </h2>
                    <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>
                      Transmissions Log
                    </p>
                  </div>
                </div>
                <p className="font-body text-sm leading-relaxed mb-4" style={{ color: "var(--ut-white-dim)" }}>
                  View all your past orders, downloads, and shipping status.
                </p>
                <div className="btn-gold text-xs py-2 px-4 inline-flex items-center gap-2">
                  View Orders
                </div>
              </div>
            </SectionReveal>
          </div>

          {/* Account info */}
          <SectionReveal delay={0.3}>
            <div className="mt-8 p-6 border" style={{ borderColor: "rgba(217,70,239,0.08)" }}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center border"
                    style={{ borderColor: "rgba(217,70,239,0.2)" }}
                  >
                    <User size={18} style={{ color: "var(--ut-white-dim)" }} />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>
                      Account
                    </p>
                    <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)" }}>
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-all hover:border-white/30"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--ut-white-dim)" }}
                >
                  <LogOut size={12} />
                  Sign Out
                </button>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.4}>
            <div className="mt-8 text-center">
              <Link href="/sanctum" className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                ← Return to Sanctum
              </Link>
            </div>
          </SectionReveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
