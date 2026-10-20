"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import ZalgoText from "./ZalgoText";

/**
 * The map a visitor carries between rooms.
 *
 * Three entrances used to read almost identically — "Codex", the archive, and the experience
 * routes — so the menu now names what each one actually is and where it leads. Nothing moved:
 * every route keeps its address, and the dropdowns only ever ADD a way to reach a page that
 * was already published but had no door from the top level.
 */
interface NavChild {
  href: string;
  label: string;
  note?: string;
}
interface NavItem {
  href: string;
  label: string;
  /** Spoken name, when the visible label is shortened to keep the bar readable. */
  ariaLabel?: string;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Transmission" },
  { href: "/gallery", label: "Gallery" },
  { href: "/sanctum", label: "Shop", ariaLabel: "Sanctum · Shop" },
  {
    href: "/codex",
    label: "Codex",
    children: [
      { href: "/codex", label: "The Codex", note: "the film and the transmission" },
      { href: "/codex/archive", label: "Correspondence Archive", note: "every record, open to read" },
      { href: "/origin", label: "Origin", note: "where it came from" },
    ],
  },
  {
    href: "/research",
    label: "Research",
    children: [
      { href: "/research", label: "The Research", note: "all four rooms" },
      { href: "/research/cymatics", label: "Cymatics" },
      { href: "/research/linguistics", label: "Linguistics" },
      { href: "/research/symbolism", label: "Symbolism" },
      { href: "/research/geometry", label: "Geometry" },
    ],
  },
  { href: "/paths", label: "Paths" },
  {
    href: "/experience",
    label: "Experiences",
    children: [
      { href: "/experience", label: "The portal", note: "all five rooms" },
      { href: "/experience/universal-resonator", label: "Universal Resonator", note: "the instrument" },
      { href: "/experience/cymatic-3d", label: "Cymatic 3D", note: "sound made spatial" },
      { href: "/experience/cymatic-tonoscope", label: "Tonoscope", note: "the plate that shows sound" },
      { href: "/experience/correspondence-codex", label: "Correspondence Codex", note: "the archive, walkable" },
      { href: "/experience/correspondence-continuum", label: "Correspondence Continuum", note: "the long thread" },
    ],
  },
  { href: "/oracle", label: "Oracle" },
  {
    href: "/journal",
    label: "More",
    children: [
      { href: "/journal", label: "Journal", note: "the writing" },
      { href: "/connect", label: "Connect", note: "reach the studio" },
      { href: "/origin", label: "Origin", note: "where it came from" },
    ],
  },
];

function MobileNavGroup({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: (href: string) => boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li>
      <div className="flex items-center justify-between gap-2">
        <Link
          href={item.href}
          className="flex-1 py-2.5"
          style={{ color: isActive(item.href) ? "var(--ut-magenta)" : "rgba(237,233,246,0.7)" }}
          aria-current={isActive(item.href) ? "page" : undefined}
          aria-label={item.label}
        >
          <ZalgoText text={item.label} intensity="subtle" />
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-2 -mr-2"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} ${item.label} destinations`}
          style={{ color: "rgba(237,233,246,0.45)" }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 8 8"
            fill="none"
            aria-hidden="true"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {expanded && (
        <ul className="ml-4 pb-2 flex flex-col gap-0.5">
          {item.children!.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className="block py-2 text-[13px]"
                style={{ color: isActive(child.href) ? "var(--ut-magenta)" : "rgba(237,233,246,0.55)" }}
                aria-current={isActive(child.href) ? "page" : undefined}
                aria-label={child.label}
              >
                {child.label}
                {child.note ? (
                  <span className="block text-[10px] mt-0.5" style={{ color: "rgba(237,233,246,0.3)" }}>
                    {child.note}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function NavLink({
  href,
  label,
  ariaLabel,
  active,
}: {
  href: string;
  label: string;
  ariaLabel?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="nav-link group relative"
      style={{ color: active ? "var(--ut-magenta)" : undefined }}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel ?? label}
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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [memberOpen, setMemberOpen] = useState(false);

  const navRef = useRef<HTMLUListElement>(null);
  const memberRef = useRef<HTMLLIElement>(null);

  // Close any open dropdown on outside click or Escape.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) setMemberOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenGroup(null);
        setMemberOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Close the mobile menu and every dropdown on route change.
  useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10, 9, 14, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(217, 70, 239, 0.06)",
      }}
    >
      <span aria-hidden="true" className="skip-to-content-target" />
      <style>{`
        header .nav-link:focus-visible,
        header .nav-constellation:focus-visible,
        header button:focus-visible,
        header ul[role="menu"] a:focus-visible,
        header [role="menuitem"]:focus-visible {
          outline: 2px solid #22d3ee;
          outline-offset: 3px;
          border-radius: 2px;
        }
      `}</style>
      <nav className="container-ut flex items-center justify-between h-16" aria-label="Primary">
        <Link href="/" className="flex flex-col items-start">
          <span className="font-display text-sm tracking-widest" style={{ color: "var(--ut-magenta)" }}>
            UT
          </span>
          <span className="font-heading text-[9px] tracking-[0.3em] uppercase" style={{ color: "var(--ut-white-dim)" }}>
            Universal Transmissions
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden lg:flex items-center gap-5" ref={navRef}>
          {NAV_ITEMS.map((item) => {
            if (!item.children) {
              return (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    label={item.label}
                    ariaLabel={item.ariaLabel}
                    active={isActive(item.href)}
                  />
                </li>
              );
            }
            const open = openGroup === item.label;
            return (
              <li
                key={item.href}
                className="relative"
                onMouseEnter={() => setOpenGroup(item.label)}
                onMouseLeave={() => setOpenGroup((v) => (v === item.label ? null : v))}
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup((v) => (v === item.label ? null : item.label))}
                  className="nav-link group flex items-center gap-1 cursor-pointer"
                  aria-expanded={open}
                  aria-haspopup="menu"
                  aria-label={`${item.label} — ${open ? "hide" : "show"} destinations`}
                  style={{ color: isActive(item.href) ? "var(--ut-magenta)" : undefined }}
                >
                  <span className="group-hover:hidden">
                    <ZalgoText text={item.label} intensity="subtle" />
                  </span>
                  <span className="hidden group-hover:inline">
                    <ZalgoText text={item.label} intensity="moderate" />
                  </span>
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="none"
                    aria-hidden="true"
                    className="ml-1 opacity-50 group-hover:opacity-80 transition-opacity"
                    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
                  >
                    <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </button>

                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      role="menu"
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 border"
                      style={{
                        width: item.label === "Experiences" ? 268 : 232,
                        background: "rgba(10, 9, 14, 0.97)",
                        backdropFilter: "blur(16px)",
                        borderColor: "rgba(217, 70, 239, 0.15)",
                        boxShadow: "0 0 40px rgba(147, 51, 234, 0.15), 0 8px 32px rgba(0,0,0,0.6)",
                      }}
                    >
                      <div className="p-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            className="flex flex-col gap-0.5 w-full text-left px-4 py-2.5 font-body text-[13px] transition-all hover:text-white"
                            style={{ color: isActive(child.href) ? "var(--ut-magenta)" : "rgba(237,233,246,0.72)" }}
                            onClick={() => setOpenGroup(null)}
                            aria-current={isActive(child.href) ? "page" : undefined}
                            aria-label={child.note ? `${child.label} — ${child.note}` : child.label}
                          >
                            <span className="flex items-center gap-2">
                              <span aria-hidden="true" style={{ color: "rgba(217,70,239,0.45)" }}>›</span>
                              {child.label}
                            </span>
                            {child.note ? (
                              <span className="pl-5 text-[10px] leading-snug" style={{ color: "rgba(237,233,246,0.32)" }}>
                                {child.note}
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              aria-haspopup="menu"
              aria-label="Member account"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                style={{ filter: "drop-shadow(0 0 6px rgba(0,229,255,0.6)) drop-shadow(0 0 12px rgba(212,168,71,0.4))" }}
                className="transition-all duration-300 group-hover:opacity-100 opacity-70"
              >
                <style>{`
                  @keyframes logoSpin {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
                <g style={{ animation: "logoSpin 20s linear infinite", transformOrigin: "50px 50px" }}>
                  <circle cx="50" cy="28" r="22" stroke="#00e5ff" strokeWidth="1.5" fill="none" opacity="0.9" />
                  <circle cx="50" cy="28" r="22" stroke="#d4a847" strokeWidth="1.5" fill="none" opacity="0.6" transform="rotate(60 50 50)" />
                  <circle cx="50" cy="50" r="12" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.8" />
                  <circle cx="50" cy="28" r="3" fill="#00e5ff" opacity="0.9" />
                  <circle cx="69" cy="39" r="3" fill="#d4a847" opacity="0.9" />
                  <circle cx="69" cy="61" r="3" fill="#00e5ff" opacity="0.9" />
                  <circle cx="50" cy="72" r="3" fill="#d4a847" opacity="0.9" />
                  <circle cx="31" cy="61" r="3" fill="#00e5ff" opacity="0.9" />
                  <circle cx="31" cy="39" r="3" fill="#d4a847" opacity="0.9" />
                  <polygon points="50,38 62,44 62,56 50,62 38,56 38,44" stroke="#00e5ff" strokeWidth="0.75" fill="none" opacity="0.4" />
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
                  role="menu"
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
                      href="/login"
                      role="menuitem"
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
                        style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)", color: "#22d3ee" }}
                        aria-hidden="true"
                      >
                        →
                      </span>
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      role="menuitem"
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
                        style={{ background: "rgba(217,70,239,0.12)", border: "1px solid rgba(217,70,239,0.2)", color: "var(--ut-magenta)" }}
                        aria-hidden="true"
                      >
                        +
                      </span>
                      Create Account
                    </Link>
                    <div className="h-px mx-3 my-1" style={{ background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.2), transparent)" }} />
                    <Link
                      href="/sanctum/member"
                      role="menuitem"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 font-body text-[12px] transition-all hover:text-white"
                      style={{ color: "rgba(237,233,246,0.45)" }}
                      onClick={() => setMemberOpen(false)}
                    >
                      <span aria-hidden="true">⬡</span> Member Portal
                    </Link>
                    <Link
                      href="/sanctum"
                      role="menuitem"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 font-body text-[12px] transition-all hover:text-white"
                      style={{ color: "rgba(237,233,246,0.45)" }}
                      onClick={() => setMemberOpen(false)}
                    >
                      <span aria-hidden="true">◇</span> Sanctum
                    </Link>
                    <Link
                      href="/oracle/plans"
                      role="menuitem"
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 font-body text-[12px] transition-all hover:text-white"
                      style={{ color: "rgba(237,233,246,0.45)" }}
                      onClick={() => setMemberOpen(false)}
                    >
                      <span aria-hidden="true">◇</span> Oracle Access
                    </Link>
                  </div>
                  <div className="h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(217,70,239,0.3) 50%, transparent 100%)" }} />
                </motion.div>
              )}
            </AnimatePresence>
          </li>

          {/* External links */}
          <li className="nav-external border-l border-white/10 pl-5 flex items-center gap-3">
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
          className="lg:hidden grid place-items-center"
          style={{ minWidth: 44, minHeight: 44 }}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
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
            style={{ background: "rgba(10, 9, 14, 0.95)", borderBottom: "1px solid rgba(217, 70, 239, 0.06)" }}
          >
            <ul className="flex flex-col p-6 gap-1">
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <MobileNavGroup key={item.href} item={item} isActive={isActive} />
                ) : (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block py-2.5"
                      style={{ color: isActive(item.href) ? "var(--ut-magenta)" : "rgba(237,233,246,0.7)" }}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      aria-label={item.ariaLabel ?? item.label}
                    >
                      <ZalgoText text={item.label} intensity="subtle" />
                    </Link>
                  </li>
                )
              )}

              <li className="border-t border-white/10 pt-4 mt-2 flex flex-col gap-3">
                <Link href="/sanctum/member" className="nav-constellation">Member Portal</Link>
                <a href="https://vaultofarcana.com" target="_blank" rel="noopener noreferrer" className="nav-constellation">
                  Vault of Arcana ↗
                </a>
                <a href="https://hakanhisim.net" target="_blank" rel="noopener noreferrer" className="nav-constellation">
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
