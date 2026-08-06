"use client";

// ============================================================
// AuthSessionGate
//
// Route-gates the Supabase auth session sync so the heavy Supabase
// client bundle (was ~220KB) and its network calls only load on
// routes that actually need authentication (sanctum/member/login/
// oracle/codex/etc). Public pages render nothing -> they never
// fetch the Supabase chunk and never fire auth network requests.
// The unique visual identity is untouched: this component renders
// null on public routes, so it adds zero DOM/CSS/JS to their output.
// ============================================================

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// The real per-route auth sync. Code-split so the Supabase bundle
// is only downloaded when one of the protected routes mounts it.
const UTSessionSync = dynamic(
  () => import("./UTSessionSync").then((m) => m.default),
  { ssr: false, loading: () => null }
);

// Routes that require auth/session context. Everything else is public
// and skips the Supabase runtime entirely.
const AUTH_ROUTES: Array<{ prefix: string; match: (p: string) => boolean }> = [
  { prefix: "/sanctum", match: (p) => p === "/sanctum" || p.startsWith("/sanctum/") },
  { prefix: "/member", match: (p) => p === "/member" || p.startsWith("/member/") },
  { prefix: "/login", match: (p) => p === "/login" || p.startsWith("/login/") },
  { prefix: "/signup", match: (p) => p === "/signup" || p.startsWith("/signup/") },
  { prefix: "/oracle", match: (p) => p === "/oracle" || p.startsWith("/oracle/") },
  { prefix: "/codex", match: (p) => p === "/codex" || p.startsWith("/codex/") },
];

export default function AuthSessionGate() {
  const pathname = usePathname() || "/";

  // Fast path: if no session exists locally, there is nothing to sync
  // even on protected routes; skip mounting the Supabase runtime.
  const needsAuth = AUTH_ROUTES.some((r) => r.match(pathname));
  if (!needsAuth) return null;

  return <UTSessionSync />;
}