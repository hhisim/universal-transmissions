"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { supabase } from "@/lib/supabase-client";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function MemberLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push("/sanctum/member");
      }
    });
  }, [router]);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/sanctum/member");
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMagicLinkLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/sanctum/member`,
      },
    });

    if (error) {
      setError(error.message);
      setMagicLinkLoading(false);
    } else {
      setMagicLinkSent(true);
      setMagicLinkLoading(false);
    }
  }

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20 min-h-screen" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut max-w-lg mx-auto">
          <SectionReveal>
            <div className="text-center mb-12 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                [ Member Access ]
              </p>
              <h1 className="font-display text-3xl md:text-4xl mb-4">
                <ZalgoText text="Enter the Sanctum" intensity="moderate" />
              </h1>
              <p className="font-body text-base" style={{ color: "var(--ut-white-dim)" }}>
                Access your orders and the Oracle.
              </p>
            </div>
          </SectionReveal>

          {magicLinkSent ? (
            <SectionReveal>
              <div className="p-8 border glow-border-cyan" style={{ borderColor: "rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.03)" }}>
                <div className="text-center">
                  <div className="text-4xl mb-4">✉</div>
                  <h2 className="font-heading text-xl mb-3" style={{ color: "var(--ut-cyan)" }}>
                    <ZalgoText text="Link Dispatched" intensity="subtle" />
                  </h2>
                  <p className="font-body text-base" style={{ color: "var(--ut-white-dim)" }}>
                    Check <strong>{email}</strong> for a magic link. It expires in 1 hour.
                  </p>
                  <button
                    onClick={() => setMagicLinkSent(false)}
                    className="mt-6 font-mono text-[10px] tracking-widest uppercase underline underline-offset-4"
                    style={{ color: "var(--ut-gold)", opacity: 0.7 }}
                  >
                    Use password instead
                  </button>
                </div>
              </div>
            </SectionReveal>
          ) : (
            <SectionReveal delay={0.1}>
              <div
                className="p-8 border"
                style={{ borderColor: "rgba(212,168,71,0.15)", background: "var(--ut-surface)" }}
              >
                {/* Magic link form */}
                <form onSubmit={handleMagicLink} className="mb-8">
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                    Magic Link
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="flex-1 px-4 py-3 bg-transparent border font-mono text-sm"
                      style={{ borderColor: "rgba(212,168,71,0.2)", color: "var(--ut-white)" }}
                    />
                    <button
                      type="submit"
                      disabled={magicLinkLoading || !email}
                      className="btn-gold text-xs px-4 py-3 disabled:opacity-40"
                    >
                      {magicLinkLoading ? "..." : "Send Link"}
                    </button>
                  </div>
                </form>

                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,168,71,0.2), transparent)" }} />
                  <span className="font-mono text-[9px] tracking-widest" style={{ color: "var(--ut-white-faint)" }}>OR</span>
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,168,71,0.2), transparent)" }} />
                </div>

                {/* Password login */}
                <form onSubmit={handlePasswordLogin}>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                    Password
                  </p>
                  <div className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      required
                      className="w-full px-4 py-3 bg-transparent border font-mono text-sm"
                      style={{ borderColor: "rgba(212,168,71,0.2)", color: "var(--ut-white)" }}
                    />
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-4 py-3 pr-12 bg-transparent border font-mono text-sm"
                        style={{ borderColor: "rgba(212,168,71,0.2)", color: "var(--ut-white)" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                        style={{ color: "var(--ut-white-dim)" }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {error && (
                      <p className="font-mono text-xs p-3 border" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444", background: "rgba(239,68,68,0.05)" }}>
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !email || !password}
                      className="w-full btn-gold justify-center text-sm py-4 disabled:opacity-40"
                    >
                      <LogIn size={14} className="mr-2" />
                      {loading ? "Authenticating..." : "Enter Sanctum"}
                    </button>
                  </div>
                </form>
              </div>
            </SectionReveal>
          )}

          <SectionReveal delay={0.2}>
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
