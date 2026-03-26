"use client";

import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "Transmission" },
  { href: "/gallery", label: "Gallery" },
  { href: "/codex", label: "Codex" },
  { href: "/origin", label: "Origin" },
  { href: "/research", label: "Research" },
  { href: "/linguistics", label: "Linguistics" },
  { href: "/cymatics", label: "Cymatics" },
  { href: "/oracle", label: "Oracle" },
  { href: "/sanctum", label: "Sanctum" },
  { href: "/journal", label: "Journal" },
  { href: "/connect", label: "Connect" },
];

export default function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "rgba(217, 70, 239, 0.06)", background: "var(--ut-black)" }}>
      <div className="container-ut py-12">
        <div className="divider-spectrum mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <Link href="/" className="block mb-4">
              <span className="font-display text-2xl glow-magenta" style={{ color: "var(--ut-magenta)" }}>UT</span>
              <p className="font-heading text-[9px] tracking-[0.3em] uppercase mt-1" style={{ color: "var(--ut-white-dim)" }}>
                Universal Transmissions
              </p>
            </Link>
            <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ut-white-dim)" }}>
              The visual lexicon of hidden knowledge. Sacred geometry, xenolinguistics, and the architecture of consciousness.
            </p>
          </div>
          <div>
            <h4 className="font-heading text-xs tracking-[0.25em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>Navigate</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-body text-sm transition-colors" style={{ color: "var(--ut-white-dim)" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-heading text-xs tracking-[0.25em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>Join the Transmission</h4>
            <p className="font-body text-sm leading-relaxed mb-4" style={{ color: "var(--ut-white-dim)" }}>
              Occasional dispatches. No spam. Ever.
            </p>
            <form className="flex flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="your@frequency.com"
                required
                className="font-body text-sm px-4 py-2.5 w-full outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(212,168,71,0.2)",
                  color: "#ede9f6",
                }}
              />
              <button
                type="submit"
                className="font-heading text-[10px] tracking-[0.2em] uppercase py-2.5 w-full border transition-all disabled:opacity-40"
                style={{
                  borderColor: "rgba(212,168,71,0.3)",
                  background: "rgba(212,168,71,0.06)",
                  color: "rgba(212,168,71,0.8)",
                }}
              >
                JOIN THE SIGNAL
              </button>
            </form>
          </div>
          <div>
            <h4 className="font-heading text-xs tracking-[0.25em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>Constellation</h4>
            <ul className="space-y-3">
              <li>
                <a href="https://vaultofarcana.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 font-body text-sm transition-colors" style={{ color: "var(--ut-white-dim)" }}>
                  Vault of Arcana ↗
                </a>
                <p className="font-body text-xs mt-0.5" style={{ color: "var(--ut-white-faint)" }}>
                  The Oracle & Living Mystery School
                </p>
              </li>
              <li>
                <a href="https://www.vaultofarcana.com/chat" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 font-body text-sm transition-colors" style={{ color: "var(--ut-white-dim)" }}>
                  Codex Oracle ↗
                </a>
                <p className="font-body text-xs mt-0.5" style={{ color: "var(--ut-white-faint)" }}>
                  Decipher the Universal Codex
                </p>
              </li>
              <li>
                <a href="https://hakanhisim.net" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 font-body text-sm transition-colors" style={{ color: "var(--ut-white-dim)" }}>
                  Hakan Hisim ↗
                </a>
                <p className="font-body text-xs mt-0.5" style={{ color: "var(--ut-white-faint)" }}>
                  Complete Art Portfolio
                </p>
              </li>
            </ul>
          </div>
        </div>
        <div className="divider-spectrum mb-6" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-mono text-[10px] tracking-wider" style={{ color: "var(--ut-white-faint)" }}>
            © 2026 Universal Transmissions — Hakan Hisim. All transmissions reserved.
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] ut-gradient-text" style={{ fontSize: "0.65rem" }}>
            SIGNAL LOCKED · FREQUENCY ACTIVE · NODE: universal-transmissions.net
          </p>
        </div>
      </div>
    </footer>
  );
}
