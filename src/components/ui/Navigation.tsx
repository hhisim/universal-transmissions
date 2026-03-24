"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ExternalLink } from "lucide-react";
import ZalgoText from "./ZalgoText";

const NAV_LINKS = [
  { href: "/", label: "Transmission" },
  { href: "/gallery", label: "Gallery" },
  { href: "/codex", label: "Codex" },
  { href: "/about", label: "About" },
  { href: "/oracle", label: "Oracle" },
  { href: "/sanctum", label: "Sanctum" },
  { href: "/sanctum/member", label: "Member" },
  { href: "/journal", label: "Journal" },
  { href: "/connect", label: "Connect" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10, 9, 14, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(217, 70, 239, 0.06)",
      }}
    >
      <nav className="container-ut flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-start">
          <span
            className="font-display text-sm tracking-widest"
            style={{ color: "var(--ut-magenta)" }}
          >
            UT
          </span>
          <span
            className="font-heading text-[9px] tracking-[0.3em] uppercase"
            style={{ color: "var(--ut-white-dim)" }}
          >
            Universal Transmissions
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href ||
              (link.href === "/sanctum" && pathname === "/store");
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="nav-link group relative"
                  style={{ color: active ? "var(--ut-magenta)" : undefined }}
                >
                  {active ? (
                    <ZalgoText text={link.label} intensity="subtle" />
                  ) : (
                    <span className="group-hover:hidden">
                      <ZalgoText text={link.label} intensity="subtle" />
                    </span>
                  )}
                  <span className="hidden group-hover:inline">
                    <ZalgoText text={link.label} intensity="moderate" />
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Constellation links */}
          <li
            className="border-l border-white/10 pl-6 flex items-center gap-4"
          >
            <a
              href="https://vaultofarcana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-constellation"
            >
              Vault of Arcana ↗
            </a>
            <a
              href="https://hakanhisim.net"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-constellation"
            >
              Hakan Hisim ↗
            </a>
          </li>
        </ul>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
            style={{
              background: "rgba(10, 9, 14, 0.95)",
              borderBottom: "1px solid rgba(217, 70, 239, 0.06)",
            }}
          >
            <ul className="flex flex-col p-6 gap-4">
              {NAV_LINKS.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href === "/sanctum" && pathname === "/store");
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="nav-link block"
                      style={{ color: active ? "var(--ut-magenta)" : undefined }}
                    >
                      <ZalgoText text={link.label} intensity="subtle" />
                    </Link>
                  </li>
                );
              })}
              <li className="border-t border-white/10 pt-4 mt-2 flex flex-col gap-3">
                <a
                  href="https://vaultofarcana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-constellation"
                >
                  Vault of Arcana ↗
                </a>
                <a
                  href="https://hakanhisim.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-constellation"
                >
                  Hakan Hisim ↗
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
