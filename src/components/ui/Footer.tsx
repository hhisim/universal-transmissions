"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const FOOTER_LINKS = [
  { href: "/", label: "Transmission" },
  { href: "/gallery", label: "Gallery" },
  { href: "/codex", label: "Codex" },
  { href: "/sanctum", label: "Sanctum" },
  { href: "/journal", label: "Journal" },
  { href: "/connect", label: "Connect" },
];

// ─── Newsletter signup ──────────────────────────────────────────
function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
        setMessage("You're in the transmission.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Signup failed.");
      }
    } catch {
      setStatus("error");
      setMessage("Connection lost. Try again.");
    }
  };

  return (
    <div>
      <h4 className="font-heading text-xs tracking-[0.25em] uppercase mb-4" style={{ color: "var(--ut-gold)" }}>
        Join the Transmission
      </h4>
      <p className="font-body text-sm leading-relaxed mb-4" style={{ color: "var(--ut-white-dim)" }}>
        Occasional dispatches. No spam. Ever.
      </p>
      {status === "success" ? (
        <p className="font-mono text-[11px]" style={{ color: "rgba(34,211,238,0.7)" }}>
          ✦ {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@frequency.com"
            required
            className="font-body text-sm px-4 py-2.5 w-full outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(212,168,71,0.2)",
              color: "#ede9f6",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,168,71,0.5)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(212,168,71,0.08)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(212,168,71,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="font-heading text-[10px] tracking-[0.2em] uppercase py-2.5 w-full border transition-all disabled:opacity-40"
            style={{
              borderColor: "rgba(212,168,71,0.3)",
              background: "rgba(212,168,71,0.06)",
              color: "rgba(212,168,71,0.8)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,168,71,0.7)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,168,71,0.3)"; }}
          >
            {status === "loading" ? "TRANSMITTING..." : "JOIN THE SIGNAL"}
          </button>
          {status === "error" && (
            <p className="font-mono text-[10px]" style={{ color: "rgba(239,68,68,0.7)" }}>
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export default function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        borderColor: "rgba(217, 70, 239, 0.06)",
        background: "var(--ut-black)",
      }}
    >
      <div className="container-ut py-12">
        {/* Spectrum divider */}
        <div className="divider-spectrum mb-12" />

        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="block mb-4">
              <span
                className="font-display text-2xl glow-magenta"
                style={{ color: "var(--ut-magenta)" }}
              >
                UT
              </span>
              <p
                className="font-heading text-[9px] tracking-[0.3em] uppercase mt-1"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Universal Transmissions
              </p>
            </Link>
            <p
              className="font-body text-sm leading-relaxed"
              style={{ color: "var(--ut-white-dim)" }}
            >
              The visual lexicon of hidden knowledge. Sacred geometry,
              xenolinguistics, and the architecture of consciousness.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="font-heading text-xs tracking-[0.25em] uppercase mb-4"
              style={{ color: "var(--ut-gold)" }}
            >
              Navigate
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm transition-colors"
                    style={{ color: "var(--ut-white-dim)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--ut-magenta)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--ut-white-dim)")
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <NewsletterSignup />

          {/* Constellation */}
          <div>
            <h4
              className="font-heading text-xs tracking-[0.25em] uppercase mb-4"
              style={{ color: "var(--ut-gold)" }}
            >
              Constellation
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://vaultofarcana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-body text-sm transition-colors"
                  style={{ color: "var(--ut-white-dim)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--ut-magenta)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--ut-white-dim)")
                  }
                >
                  Vault of Arcana ↗
                </a>
                <p className="font-body text-xs mt-0.5" style={{ color: "var(--ut-white-faint)" }}>
                  The Oracle & Living Mystery School
                </p>
              </li>
              <li>
                <a
                  href="https://codexoracle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-body text-sm transition-colors"
                  style={{ color: "var(--ut-white-dim)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--ut-magenta)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--ut-white-dim)")
                  }
                >
                  Codex Oracle ↗
                </a>
                <p className="font-body text-xs mt-0.5" style={{ color: "var(--ut-white-faint)" }}>
                  Decipher the Universal Codex
                </p>
              </li>
              <li>
                <a
                  href="https://hakanhisim.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-body text-sm transition-colors"
                  style={{ color: "var(--ut-white-dim)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--ut-magenta)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--ut-white-dim)")
                  }
                >
                  Hakan Hisim ↗
                </a>
                <p className="font-body text-xs mt-0.5" style={{ color: "var(--ut-white-faint)" }}>
                  Complete Art Portfolio
                </p>
              </li>
            </ul>
          </div>
        </div>

        {/* Spectrum divider before bottom bar */}
        <div className="divider-spectrum mb-6" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <p
            className="font-mono text-[10px] tracking-wider"
            style={{ color: "var(--ut-white-faint)" }}
          >
            © {new Date().getFullYear()} Universal Transmissions — Hakan Hisim.
            All transmissions reserved.
          </p>
          <p
            className="font-mono text-[10px] tracking-[0.2em] ut-gradient-text"
            style={{ fontSize: "0.65rem" }}
          >
            SIGNAL LOCKED · FREQUENCY ACTIVE · NODE: universal-transmissions.net
          </p>
        </div>
      </div>
    </footer>
  );
}
