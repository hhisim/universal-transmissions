import { createBrowserClient } from "@supabase/ssr";

/**
 * The browser session must live in **cookies**, not localStorage.
 *
 * The site signs members in here (`/login`), but every server-side gate — Codex II, the
 * usage routes, the middleware refresh — reads cookies through `@supabase/ssr`. A plain
 * `createClient` keeps the session in localStorage only, so the server never sees it and a
 * signed-in paid member is treated as a stranger. `createBrowserClient` writes the same
 * cookie the server and middleware already read, so one sign-in is enough everywhere.
 */

const supabaseUrl: string =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.UT_SUPABASE_URL ?? "";
const supabaseAnonKey: string =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.UT_SUPABASE_ANON_KEY ?? "";

// A module-scope throw here breaks `next build` on any machine without the public env
// (it fails while prerendering /login and /account). The deployment always provides these;
// when a build host does not, fall back to a placeholder that constructs cleanly so the
// bundle can be produced, and say so loudly at runtime instead of dying at import time.
const envMissing = !supabaseUrl || !supabaseAnonKey;
if (envMissing && process.env.NODE_ENV !== "production") {
  console.warn("[supabase-client] public Supabase env missing — using placeholder client");
}

export const supabase = createBrowserClient(
  supabaseUrl || "https://placeholder.invalid",
  supabaseAnonKey || "placeholder-anon-key",
  {
  cookieOptions: {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  },
});

/**
 * One-time migration for members who signed in before this change.
 *
 * Those sessions live in localStorage under `sb-<ref>-auth-token`, where the server
 * could never see them. On the first load after the switch, hand the stored tokens to
 * the cookie-backed client with setSession() — the same call a fresh sign-in makes — so
 * an existing member is not silently logged out. Failure is harmless: the member simply
 * signs in again.
 */
if (typeof window !== "undefined") {
  try {
    const projectRef = new URL(supabaseUrl || "https://placeholder.invalid").hostname.split(".")[0];
    const legacyKey = `sb-${projectRef}-auth-token`;
    const legacy = window.localStorage.getItem(legacyKey);
    const alreadyCookied = document.cookie.includes(legacyKey);
    if (legacy && !alreadyCookied) {
      const parsed = JSON.parse(legacy) as { access_token?: string; refresh_token?: string };
      if (parsed?.access_token && parsed?.refresh_token) {
        void supabase.auth
          .setSession({ access_token: parsed.access_token, refresh_token: parsed.refresh_token })
          .then(({ error }) => {
            if (!error) window.localStorage.removeItem(legacyKey);
          });
      }
    }
  } catch {
    /* a malformed legacy entry is not worth surfacing to the member */
  }
}
