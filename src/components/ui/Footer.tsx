"use client";

import { useState } from "react";
import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "Transmission" },
  { href: "/gallery", label: "Gallery" },
  { href: "/codex", label: "Codex" },
  { href: "/origin", label: "Origin" },
  { href: "/research", label: "Research" },
  { href: "/oracle", label: "Oracle" },
  { href: "/sanctum", label: "Sanctum" },
  { href: "/journal", label: "Journal" },
  { href: "/connect", label: "Connect" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMsg("You're in the signal. Welcome.");
        setEmail("");
      } else {
        setStatus("error");
        setMsg(data.error || "Signup failed.");
      }
    } catch {
      setStatus("error");
      setMsg("Connection error. Try again.");
    }
  }

  return (
    <footer className="border-t" style={{ borderColor: "rgba(217, 70, 239, 0.06)", background: "var(--ut-black)" }}>
      <div className="container-ut py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-6">
          {/* Brand */}
          <div>
            <Link href="/" className="block mb-2">
              <span className="font-display text-xl glow-magenta" style={{ color: "var(--ut-magenta)" }}>UT</span>
              <p className="font-heading text-[9px] tracking-[0.3em] uppercase mt-0.5" style={{ color: "var(--ut-white-dim)" }}>
                Universal Transmissions
              </p>
            </Link>
            <p className="font-body text-xs leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
              Sacred geometry, xenolinguistics &amp; the architecture of consciousness.
            </p>
          </div>
          {/* Navigate */}
          <div>
            <h4 className="font-heading text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: "var(--ut-gold)" }}>Navigate</h4>
            <ul className="space-y-1.5">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-body text-xs transition-colors" style={{ color: "var(--ut-white-dim)" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Constellation */}
          <div>
            <h4 className="font-heading text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: "var(--ut-gold)" }}>Constellation</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://vaultofarcana.com" target="_blank" rel="noopener noreferrer"
                  className="font-body text-xs transition-colors" style={{ color: "var(--ut-white-dim)" }}>
                  Vault of Arcana
                </a>
              </li>
              <li>
                <a href="https://www.vaultofarcana.com/chat" target="_blank" rel="noopener noreferrer"
                  className="font-body text-xs transition-colors" style={{ color: "var(--ut-white-dim)" }}>
                  Codex Oracle
                </a>
              </li>
              <li>
                <a href="https://hakanhisim.net" target="_blank" rel="noopener noreferrer"
                  className="font-body text-xs transition-colors" style={{ color: "var(--ut-white-dim)" }}>
                  Hakan Hisim
                </a>
              </li>
            </ul>
          </div>
          {/* Newsletter */}
          <div>
            <h4 className="font-heading text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: "var(--ut-gold)" }}>Join the Signal</h4>
            <p className="font-body text-xs mb-3" style={{ color: "var(--ut-white-dim)" }}>
              Occasional dispatches. No spam.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="your@frequency.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading" || status === "success"}
                className="font-body text-xs px-3 py-2 w-full outline-none transition-all disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(212,168,71,0.2)",
                  color: "#ede9f6",
                }}
              />
              {msg && (
                <p className="font-mono text-[9px]" style={{ color: status === "success" ? "var(--ut-cyan)" : "#ff6b6b" }}>
                  {msg}
                </p>
              )}
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="font-heading text-[9px] tracking-[0.2em] uppercase py-2 w-full border transition-all disabled:opacity-40"
                style={{
                  borderColor: "rgba(212,168,71,0.3)",
                  background: "rgba(212,168,71,0.06)",
                  color: "rgba(212,168,71,0.8)",
                }}
              >
                {status === "loading" ? "..." : status === "success" ? "In the signal" : "Subscribe"}
              </button>
            </form>
          </div>
        </div>
        <div className="divider-spectrum mb-4" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-mono text-[10px] tracking-wider" style={{ color: "var(--ut-white-faint)" }}>
            2026 Universal Transmissions — Hakan Hisim
          </p>
          <p className="font-mono text-[9px] tracking-[0.2em] ut-gradient-text">
            SIGNAL LOCKED · NODE: UT
          </p>
        </div>
      </div>
    </footer>
  );
}
