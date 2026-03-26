"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import ZalgoText from "./ZalgoText";

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

export default function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const researchRef = useRef<HTMLLIElement>(null);
  const memberRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!researchOpen && !memberOpen) return;
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
  }, [researchOpen, memberOpen]);

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
                <li key={link.href} ref={researchRef} className="relative">
                  <button
                    onClick={() => { setResearchOpen((v) => !v); setMemberOpen(false); }}
                    className="nav-link group flex items-center gap-1"
                  >
                    <span className="group-hover:hidden">
                      <ZalgoText text={link.label} intensity="subtle" />
                    </span>
                    <span className="hidden group-hover:inline">
                      <ZalgoText text={link.label} intensity="moderate" />
                    </span>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="ml-1 opacity-50 group-hover:opacity-80 transition-opacity">
                      <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </button>
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
                              style={{ color: "rgba(237,233,246,0.6)" }}
                              onClick={() => { setResearchOpen(false); setOpen(false); }}
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
            const active = pathname === link.href;
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

          {/* Member dropdown */}
          <li ref={memberRef} className="relative">
            <button
              onClick={() => { setMemberOpen((v) => !v); setResearchOpen(false); }}
              className="flex items-center gap-2 group"
              aria-label="Member account"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className="transition-all duration-300 group-hover:scale-110"
              >
                <polygon
                  points="9.2,2.0 14.8,2.0 19.0,6.2 19.0,11.8 14.8,16.0 9.2,16.0 5.0,11.8 5.0,6.2"
                  stroke="rgba(217,70,239,0.4)"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  fill="rgba(217,70,239,0.04)"
                  className="transition-all duration-300 group-hover:stroke-[rgba(217,70,239,0.8)] group-hover:fill-[rgba(217,70,239,0.1)]"
                />
                <polygon
                  points="10.3,6.1 13.7,6.1 16.1,8.5 16.1,12.0 13.7,14.4 10.3,14.4 7.9,12.0 7.9,8.5"
                  stroke="rgba(217,70,239,0.15)"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                  fill="none"
                />
                <circle
                  cx="12"
                  cy="9.5"
                  r="1.8"
                  fill="rgba(217,70,239,0.5)"
                  className="transition-all duration-300 group-hover:fill-[rgba(217,70,239,0.9)]"
                />
                <path
                  d="M8.5 14.5 C8.5 12.5 10.5 11.5 12 11.5 C13.5 11.5 15.5 12.5 15.5 14.5"
                  stroke="rgba(217,70,239,0.5)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-300 group-hover:stroke-[rgba(217,70,239,0.9)]"
                />
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
                      className="flex items-center gap-3 w-full text-left px-4 py-3 font-body text-[13px] transition-all hover:text-white group/si"
                      style={{ color: "rgba(237,233,246,0.6)" }}
                      onClick={() => setOpen(false)}
                    >
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all"
                        style={{
                          background: "rgba(217,70,239,0.1)",
                          border: "1px solid rgba(217,70,239,0.2)",
                          color: "var(--ut-magenta)",
                        }}
                      >
                        →
                      </span>
                      Sign In
                    </Link>
                    <div
                      className="h-px mx-3 my-1"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.2), transparent)",
                      }}
                    />
                    <Link
                      href="/sanctum/member"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 font-body text-[12px] transition-all hover:text-white"
                      style={{ color: "rgba(237,233,246,0.45)" }}
                      onClick={() => setOpen(false)}
                    >
                      <span>⬡</span> Member Portal
                    </Link>
                    <Link
                      href="/sanctum/member/oracle"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 font-body text-[12px] transition-all hover:text-white"
                      style={{ color: "rgba(237,233,246,0.45)" }}
                      onClick={() => setOpen(false)}
                    >
                      <span>◇</span> Oracle Access
                    </Link>
                  </div>
                  <div
                    className="h-px"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(217,70,239,0.3) 50%, transparent 100%)",
                    }}
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
            className="lg:hidden overflow-hidden"
            style={{
              background: "rgba(10, 9, 14, 0.95)",
              borderBottom: "1px solid rgba(217, 70, 239, 0.06)",
            }}
          >
            <ul className="flex flex-col p-6 gap-4">
              {NAV_LINKS.map((link) => {
                if (link.href === "/research") {
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="nav-link block"
                      >
                        <ZalgoText text={link.label} intensity="subtle" />
                      </Link>
                      <ul className="ml-4 mt-2 flex flex-col gap-2">
                        {RESEARCH_ITEMS.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className="nav-link block text-[13px] opacity-70"
                              style={{ color: "rgba(237,233,246,0.5)" }}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }
                const active = pathname === link.href;
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
