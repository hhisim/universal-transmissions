"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Crown, Zap, Star, CreditCard, ExternalLink, LogOut, Check } from "lucide-react";
import PageBackground from "@/components/scenes/PageBackground";

type Plan = "guest" | "free" | "initiate";

const PLAN_META: Record<Plan, { icon: typeof Star; color: string; label: string; sub: string }> = {
  guest: { icon: Star, color: "rgba(107,101,128,0.5)", label: "Guest", sub: "No account" },
  free:  { icon: Zap,  color: "#22d3ee", label: "Free Account", sub: "25 questions/day" },
  initiate: { icon: Crown, color: "#d4a847", label: "Initiate", sub: "$3.99/month" },
};

export default function MemberPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("guest");
  const [status, setStatus] = useState<string>("inactive");
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/billing/session")
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          setEmail(d.email ?? null);
          setPlan(d.plan as Plan ?? "guest");
          setStatus(d.subscription_status ?? "inactive");
          setPeriodEnd(d.current_period_end ?? null);
          setSignedIn(true);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!signInEmail.trim()) return;
    setSigningIn(true);
    try {
      const result = await signIn("email", {
        email: signInEmail.trim(),
        redirect: false,
        callbackUrl: "/member",
      });
      if (result?.error) {
        alert("Sign-in failed. Please try again.");
        setSigningIn(false);
      }
      // If ok, the page will reload with the session
    } catch {
      alert("Sign-in failed. Please try again.");
      setSigningIn(false);
    }
  }

  async function handleManageBilling() {
    setLoading(true);
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const d = await r.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        alert("Could not open billing portal. Please try again.");
      }
    } catch {
      alert("Billing portal failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const Icon = PLAN_META[plan].icon;
  const meta = PLAN_META[plan];

  // ── NOT LOGGED IN ────────────────────────────────────────────────────────
  if (!signedIn) {
    return (
      <div style={{ minHeight: "100vh", paddingTop: 100, background: "#0a090e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 440, width: "100%", margin: "0 24px", textAlign: "center" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, margin: "0 auto 20px", border: "1px solid rgba(217,70,239,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Star size={24} color="rgba(217,70,239,0.4)" />
              <PageBackground variant="homepage" />
            </div>
            <h1 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 28, letterSpacing: "0.08em", color: "#ede9f6", marginBottom: 12 }}>Member Access</h1>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: "rgba(237,233,246,0.4)", lineHeight: 1.7 }}>
              Sign in to access your Codex Oracle membership, manage your subscription, and view your usage.
            </p>
          </div>

          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              value={signInEmail}
              onChange={e => setSignInEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                background: "rgba(17,15,26,0.8)",
                border: "1px solid rgba(217,70,239,0.15)",
                color: "#ede9f6",
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 16,
                outline: "none",
                textAlign: "center",
              }}
            />
            <button
              type="submit"
              disabled={signingIn}
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid rgba(217,70,239,0.3)",
                background: signingIn ? "rgba(217,70,239,0.05)" : "rgba(217,70,239,0.06)",
                color: signingIn ? "rgba(217,70,239,0.5)" : "#d946ef",
                fontFamily: "Cinzel, serif",
                fontSize: 10,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                cursor: signingIn ? "wait" : "pointer",
                transition: "all 0.3s",
              }}
            >
              {signingIn ? "Sending link..." : "Send magic link"}
            </button>
          </form>

          <p style={{ marginTop: 16, fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(237,233,246,0.2)", lineHeight: 1.6 }}>
            A sign-in link will be sent to your email. No password needed.
          </p>

          <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <Link href="/pricing" style={{ fontFamily: "Cinzel, serif", fontSize: 9, letterSpacing: "0.2em", color: "rgba(237,233,246,0.3)", textDecoration: "none", textTransform: "uppercase" }}>
              View all plans →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── LOGGED IN ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", paddingTop: 100, background: "#0a090e" }}>
      {/* Background glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 600, height: 300, background: `radial-gradient(ellipse, ${meta.color}08 0%, transparent 70%)` }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 10, letterSpacing: "0.3em", color: "rgba(212,168,71,0.4)", marginBottom: 16 }}>[ MEMBER PORTAL ]</div>
          <h1 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(24px, 5vw, 36px)", letterSpacing: "0.08em", color: "#ede9f6", marginBottom: 8 }}>Your Account</h1>
          {email && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: "rgba(237,233,246,0.35)" }}>{email}</p>
          )}
        </div>

        {/* Plan card */}
        <div style={{
          padding: "32px 28px",
          border: `1px solid ${meta.color}30`,
          background: `linear-gradient(160deg, ${meta.color}06 0%, rgba(10,9,14,0.95) 60%)`,
          backdropFilter: "blur(12px)",
          marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, border: `1px solid ${meta.color}40`, background: `${meta.color}0a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={20} color={meta.color} />
            </div>
            <div>
              <div style={{ fontFamily: "Cinzel, serif", fontSize: 18, letterSpacing: "0.1em", color: meta.color, marginBottom: 2 }}>{meta.label}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "rgba(237,233,246,0.35)" }}>{meta.sub}</div>
            </div>
            {plan === "initiate" && (
              <div style={{ marginLeft: "auto", padding: "4px 12px", border: "1px solid rgba(212,168,71,0.3)", background: "rgba(212,168,71,0.06)", fontFamily: "Cinzel, serif", fontSize: 8, letterSpacing: "0.15em", color: "#d4a847", textTransform: "uppercase" }}>
                Active
              </div>
            )}
          </div>

          {/* Status details for initiate */}
          {plan === "initiate" && (
            <div style={{ padding: "14px 16px", border: "1px solid rgba(255,255,255,0.04)", background: "rgba(17,15,26,0.4)", marginBottom: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.12em", color: "rgba(237,233,246,0.3)", marginBottom: 8, textTransform: "uppercase" }}>Subscription Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {status === "active" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check size={12} color="#22c55e" />
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "rgba(237,233,246,0.6)" }}>Subscription active</span>
                  </div>
                )}
                {status === "past_due" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "#f59e0b" }}>Payment past due — please update your payment method</span>
                  </div>
                )}
                {periodEnd && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(237,233,246,0.35)" }}>
                      {status === "canceled" ? "Access until" : "Next billing"}: {new Date(periodEnd).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {plan === "initiate" ? (
              <button
                onClick={handleManageBilling}
                disabled={loading}
                style={{
                  flex: 1,
                  minWidth: 160,
                  padding: "12px 20px",
                  border: "1px solid rgba(212,168,71,0.3)",
                  background: "rgba(212,168,71,0.05)",
                  color: "#d4a847",
                  fontFamily: "Cinzel, serif",
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: loading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.3s",
                }}
              >
                <CreditCard size={12} />
                {loading ? "Loading..." : "Manage Billing"}
                <ExternalLink size={10} />
              </button>
            ) : (
              <Link
                href="/pricing"
                style={{
                  flex: 1,
                  minWidth: 160,
                  padding: "12px 20px",
                  border: `1px solid ${meta.color}40`,
                  background: `${meta.color}06`,
                  color: meta.color,
                  fontFamily: "Cinzel, serif",
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {plan === "guest" ? "Create Free Account" : "Upgrade to Initiate"}
              </Link>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { href: "/oracle", label: "Go to Codex Oracle", sub: "Ask questions, decipher pages, explore correspondences", color: "#d946ef" },
            { href: "/pricing", label: "View All Plans", sub: "Compare Guest, Free, and Initiate tiers", color: "rgba(237,233,246,0.35)" },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                border: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(17,15,26,0.3)",
                textDecoration: "none",
                transition: "all 0.3s",
              }}
            >
              <div>
                <div style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: "0.1em", color: link.color, marginBottom: 2 }}>{link.label}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "rgba(237,233,246,0.3)" }}>{link.sub}</div>
              </div>
              <span style={{ color: "rgba(237,233,246,0.2)", fontSize: 16 }}>→</span>
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                padding: "8px 20px",
                border: "1px solid rgba(255,255,255,0.06)",
                background: "transparent",
                color: "rgba(237,233,246,0.25)",
                fontFamily: "Cinzel, serif",
                fontSize: 9,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <LogOut size={10} />
              Sign Out
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
