"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import ZalgoText from "./ZalgoText";

function MobileResearchItem({ isActive }: { isActive: (href: string) => boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li>
      <div className="flex flex-col">
        <Link
          href="/research"
          className="flex items-center justify-between w-full text-left py-2.5"
          style={{ color: isActive("/research") ? "var(--ut-magenta)" : "rgba(237,233,246,0.7)" }}
        >
          <ZalgoText text="Research" intensity="subtle" />
          <button
            onClick={(e) => { e.preventDefault(); setExpanded((v) => !v); }}
            className="p-1"
            aria-label="Toggle submenu"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 8 8"
              fill="none"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </Link>
        {expanded && (
          <ul className="ml-4 pb-2 flex flex-col gap-0.5">
            {RESEARCH_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block py-2 text-[13px]"
                  style={{ color: isActive(item.href) ? "var(--ut-magenta)" : "rgba(237,233,246,0.5)" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

const NAV_LINKS = [
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

const RESEARCH_ITEMS = [
  { href: "/research/cymatics", label: "Cymatics" },
  { href: "/research/linguistics", label: "Linguistics" },
  { href: "/research/symbolism", label: "Symbolism" },
  { href: "/research/geometry", label: "Geometry" },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="nav-link group relative"
      style={{ color: active ? "var(--ut-magenta)" : undefined }}
    >
      {active ? (
        <ZalgoText text={label} intensity="subtle" />
      ) : (
        <span className="group-hover:hidden">
          <ZalgoText text={label} intensity="subtle" />
        </span>
      )}
      <span className="hidden group-hover:inline">
        <ZalgoText text={label} intensity="moderate" />
      </span>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);

  const researchRef = useRef<HTMLLIElement>(null);
  const memberRef = useRef<HTMLLIElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (researchRef.current && !researchRef.current.contains(e.target as Node)) {
        setResearchOpen(false);
      }
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) {
        setMemberOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

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
          <span className="font-display text-sm tracking-widest" style={{ color: "var(--ut-magenta)" }}>
            UT
          </span>
          <span className="font-heading text-[9px] tracking-[0.3em] uppercase" style={{ color: "var(--ut-white-dim)" }}>
            Universal Transmissions
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((link) => {
            if (link.href === "/research") {
              return (
                <li
                  key={link.href}
                  ref={researchRef}
                  className="relative"
                  onMouseEnter={() => setResearchOpen(true)}
                  onMouseLeave={() => setResearchOpen(false)}
                >
                  <Link
                    href="/research"
                    className="nav-link group flex items-center gap-1 cursor-pointer"
                  >
                    <span className="group-hover:hidden">
                      <ZalgoText text={link.label} intensity="subtle" />
                    </span>
                    <span className="hidden group-hover:inline">
                      <ZalgoText text={link.label} intensity="moderate" />
                    </span>
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      fill="none"
                      className="ml-1 opacity-50 group-hover:opacity-80 transition-opacity"
                      style={{
                        transform: researchOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </Link>

                  <AnimatePresence>
                    {researchOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-44 border"
                        style={{
                          background: "rgba(10, 9, 14, 0.97)",
                          backdropFilter: "blur(16px)",
                          borderColor: "rgba(217, 70, 239, 0.15)",
                          boxShadow: "0 0 40px rgba(147, 51, 234, 0.15), 0 8px 32px rgba(0,0,0,0.6)",
                        }}
                      >
                        <div className="p-1">
                          {RESEARCH_ITEMS.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="flex items-center gap-2 w-full text-left px-4 py-2.5 font-body text-[13px] transition-all hover:text-white"
                              style={{
                                color: isActive(item.href) ? "var(--ut-magenta)" : "rgba(237,233,246,0.6)",
                              }}
                              onClick={() => setResearchOpen(false)}
                            >
                              <span style={{ color: "rgba(217,70,239,0.4)" }}>›</span>
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            }
            return (
              <li key={link.href}>
                <NavLink href={link.href} label={link.label} active={isActive(link.href)} />
              </li>
            );
          })}

          {/* Member dropdown */}
          <li
            ref={memberRef}
            className="relative"
            onMouseEnter={() => setMemberOpen(true)}
            onMouseLeave={() => setMemberOpen(false)}
          >
            <button
              onClick={() => setMemberOpen((v) => !v)}
              className="flex items-center gap-2 group cursor-pointer"
              aria-expanded={memberOpen}
              aria-label="Member account"
            >
              {/* UT Trinary Logo — spinning */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.6)) drop-shadow(0 0 12px rgba(212,168,71,0.4))' }}
                className="transition-all duration-300 group-hover:opacity-100 opacity-70"
              >
                <style>{`
                  @keyframes logoSpin {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>

                {/* Spinning logo group */}
                <g style={{ animation: 'logoSpin 20s linear infinite', transformOrigin: '50px 50px' }}>
                  {/* Cyan outer ring */}
                  <circle cx="50" cy="28" r="22" stroke="#00e5ff" strokeWidth="1.5" fill="none" opacity="0.9"/>
                  {/* Gold outer ring (rotated 60 deg) */}
                  <circle cx="50" cy="28" r="22" stroke="#d4a847" strokeWidth="1.5" fill="none" opacity="0.6" transform="rotate(60 50 50)"/>
                  {/* Central unified core */}
                  <circle cx="50" cy="50" r="12" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.8"/>
                  {/* Trinary dots */}
                  <circle cx="50" cy="28" r="3" fill="#00e5ff" opacity="0.9"/>
                  <circle cx="69" cy="39" r="3" fill="#d4a847" opacity="0.9"/>
                  <circle cx="69" cy="61" r="3" fill="#00e5ff" opacity="0.9"/>
                  <circle cx="50" cy="72" r="3" fill="#d4a847" opacity="0.9"/>
                  <circle cx="31" cy="61" r="3" fill="#00e5ff" opacity="0.9"/>
                  <circle cx="31" cy="39" r="3" fill="#d4a847" opacity="0.9"/>
                  {/* Inner hexagon geometry */}
                  <polygon points="50,38 62,44 62,56 50,62 38,56 38,44" stroke="#00e5ff" strokeWidth="0.75" fill="none" opacity="0.4"/>
                </g>
              </svg>
            </button>

            <AnimatePresence>
              {memberOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-3 w-52 border"
                  style={{
                    background: "rgba(10, 9, 14, 0.97)",
                    backdropFilter: "blur(16px)",
                    borderColor: "rgba(217, 70, 239, 0.15)",
                    boxShadow: "0 0 40px rgba(147, 51, 234, 0.15), 0 8px 32px rgba(0,0,0,0.6)",
                  }}
                >
                  <div className="p-1">
                    <Link
                      href="/sanctum/member/login"
                      className="flex items-center gap-3 w-full text-left px-4 py-3 font-body text-[13px] transition-all hover:opacity-90"
                      style={{
                        color: "#22d3ee",
                        background: "rgba(34,211,238,0.06)",
                        borderRadius: "8px",
                        border: "1px solid rgba(34,211,238,0.25)",
                      }}
                      onClick={() => setMemberOpen(false)}
                    >
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: "rgba(34,211,238,0.1)",
                          border: "1px solid rgba(34,211,238,0.2)",
                          color: "#22d3ee",
                        }}
                      >
                        →
                      </span>
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 font-body text-[13px] transition-all hover:opacity-90"
                      style={{
                        color: "rgba(237,233,246,0.6)",
                        background: "rgba(217,70,239,0.06)",
                        borderRadius: "8px",
                        border: "1px solid rgba(217,70,239,0.18)",
                      }}
                      onClick={() => setMemberOpen(false)}
                    >
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: "rgba(217,70,239,0.12)",
                          border: "1px solid rgba(217,70,239,0.2)",
                          color: "var(--ut-magenta)",
                        }}
                      >
                        +
                      </span>
                      Create Account
                    </Link>
                    <div
                      className="h-px mx-3 my-1"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.2), transparent)" }}
                    />
                    <Link
                      href="/sanctum/member"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 font-body text-[12px] transition-all hover:text-white"
                      style={{ color: "rgba(237,233,246,0.45)" }}
                      onClick={() => setMemberOpen(false)}
                    >
                      <span>⬡</span> Member Portal
                    </Link>
                    <Link
                      href="/oracle/plans"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 font-body text-[12px] transition-all hover:text-white"
                      style={{ color: "rgba(237,233,246,0.45)" }}
                      onClick={() => setMemberOpen(false)}
                    >
                      <span>◇</span> Oracle Access
                    </Link>
                  </div>
                  <div
                    className="h-px"
                    style={{ background: "linear-gradient(90deg, transparent 0%, rgba(217,70,239,0.3) 50%, transparent 100%)" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </li>

          {/* External links */}
          <li className="border-l border-white/10 pl-6 flex items-center gap-4">
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
          className="lg:hidden p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden"
            style={{
              background: "rgba(10, 9, 14, 0.95)",
              borderBottom: "1px solid rgba(217, 70, 239, 0.06)",
            }}
          >
            <ul className="flex flex-col p-6 gap-1">
              {NAV_LINKS.map((link) => {
                if (link.href === "/research") {
                  return <MobileResearchItem key={link.href} isActive={isActive} />;
                }
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block py-2.5"
                      style={{ color: isActive(link.href) ? "var(--ut-magenta)" : "rgba(237,233,246,0.7)" }}
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
