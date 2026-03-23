import Link from "next/link";
import { ExternalLink } from "lucide-react";

const FOOTER_LINKS = [
  { href: "/", label: "Transmission" },
  { href: "/gallery", label: "Gallery" },
  { href: "/codex", label: "Codex" },
  { href: "/store", label: "Store" },
  { href: "/journal", label: "Journal" },
  { href: "/connect", label: "Connect" },
];

export default function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        borderColor: "rgba(0, 229, 255, 0.06)",
        background: "var(--ut-black)",
      }}
    >
      <div className="container-ut py-12">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="block mb-4">
              <span
                className="font-display text-2xl glow-cyan"
                style={{ color: "var(--ut-cyan)" }}
              >
                UT
              </span>
              <p
                className="font-heading text-[10px] tracking-[0.3em] uppercase mt-1"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Universal Transmissions
              </p>
            </Link>
            <p
              className="font-body text-sm leading-relaxed"
              style={{ color: "var(--ut-white-dim)" }}
            >
              The visual lexicon of hidden knowledge. Sacred geometry, symbolic
              art, and cosmic transmission from the inner planes.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="font-heading text-xs tracking-[0.25em] uppercase mb-4"
              style={{ color: "var(--ut-gold)" }}
            >
              Navigation
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm transition-colors hover:text-[var(--ut-cyan)]"
                    style={{ color: "var(--ut-white-dim)" }}
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
                  className="flex items-center gap-2 font-body text-sm transition-colors hover:text-[var(--ut-cyan)]"
                  style={{ color: "var(--ut-white-dim)" }}
                >
                  Vault of Arcana
                  <ExternalLink size={11} />
                </a>
                <p
                  className="font-body text-xs mt-0.5"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                >
                  Symbolic divination & esoteric archive
                </p>
              </li>
              <li>
                <a
                  href="https://hakanhisim.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-body text-sm transition-colors hover:text-[var(--ut-cyan)]"
                  style={{ color: "var(--ut-white-dim)" }}
                >
                  Hakan Hisim
                  <ExternalLink size={11} />
                </a>
                <p
                  className="font-body text-xs mt-0.5"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                >
                  Artist · System Builder · Oracle
                </p>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="border-t pt-6 flex flex-col md:flex-row justify-between items-center gap-3"
          style={{ borderColor: "rgba(0,229,255,0.06)" }}
        >
          <p
            className="font-mono text-[10px] tracking-wider"
            style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}
          >
            © {new Date().getFullYear()} Universal Transmissions / Hakan Hisim.
            All transmissions reserved.
          </p>
          <p
            className="font-mono text-[10px]"
            style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}
          >
            SIGNAL LOCKED · FREQUENCY ACTIVE
          </p>
        </div>
      </div>
    </footer>
  );
}
