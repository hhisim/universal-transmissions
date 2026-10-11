/**
 * Verified caller identity.
 *
 * A decoded JWT payload is NOT identity. Any client can craft
 * `header.<base64 {"email":"someone@example.com"}>.signature` and a naive
 * base64 decode will happily return that address, so decoding must never be
 * treated as authentication.
 *
 * This module resolves identity ONLY from a source that verifies the credential:
 *
 *   1. A Supabase access token, validated by Supabase itself at /auth/v1/user.
 *      Supabase checks the JWT signature; a forged or unsigned token is
 *      rejected there with 403 bad_jwt and yields no identity here.
 *   2. The NextAuth session, verified from the signed session cookie by
 *      auth() using NEXTAUTH_SECRET.
 *
 * Everything else — request bodies, query strings, client-supplied email,
 * user id, plan or Stripe customer id — is untrusted input and is never an
 * authorization claim.
 */

import { auth } from "@/lib/auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type IdentitySource = "supabase" | "nextauth";

export interface VerifiedIdentity {
  /** Normalised (trimmed, lower-cased) address taken from the verified credential. */
  email: string;
  /** Which verification mechanism established it. */
  source: IdentitySource;
  /**
   * The Supabase auth user id, present only when the credential actually was a
   * Supabase access token. It is never derived from an email lookup, and it is
   * absent for NextAuth sessions, whose JWT strategy carries only the address —
   * so callers must treat `undefined` as "no verified uuid available" rather
   * than substituting one.
   */
  userId?: string;
}

/** Strip control characters and normalise an address coming from a credential. */
function normaliseEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .toLowerCase();
}

/** Extract the Bearer token, if the caller sent one. */
export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

/**
 * Resolve the caller's identity from a signature-verified source, or null.
 *
 * Returns null when nothing verifies. Callers must treat null as anonymous and
 * must not fall back to any client-supplied value.
 */
export async function resolveVerifiedIdentity(
  request: Request
): Promise<VerifiedIdentity | null> {
  const token = bearerToken(request);

  if (token && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const user = (await res.json()) as { email?: string | null; id?: string | null };
        const email = normaliseEmail(user?.email);
        if (email) {
          // `id` comes from Supabase's own verified user record, so it is a
          // trustworthy uuid; it is simply absent when Supabase does not send one.
          const userId = typeof user?.id === "string" && user.id.trim() ? user.id.trim() : undefined;
          return { email, source: "supabase", userId };
        }
      }
      // A present-but-invalid token is not an identity; fall through to NextAuth.
    } catch {
      // A verification failure must never authenticate anyone.
    }
  }

  try {
    const session = await auth();
    const email = normaliseEmail(session?.user?.email);
    if (email) return { email, source: "nextauth" };
  } catch {
    // fail closed
  }

  return null;
}

/** Convenience wrapper for callers that only need the verified address. */
export async function resolveVerifiedEmail(request: Request): Promise<string | null> {
  const identity = await resolveVerifiedIdentity(request);
  return identity?.email ?? null;
}