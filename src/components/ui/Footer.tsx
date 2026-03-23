"use client";

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
                  href="https://codexorcle.org"
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
