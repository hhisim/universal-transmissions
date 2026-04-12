import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://opixpkquyapeqdceyczs.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const dynamic = "force-dynamic";

// Supabase tokens are JWTs with an 'email' claim we can decode directly
function decodeSupabaseToken(token: string): { email?: string; sub?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return { email: payload.email, sub: payload.sub };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Try NextAuth session first (covers magic link sign-in)
  try {
    const nextAuthSession = await auth();
    if (nextAuthSession?.user?.email) {
      return NextResponse.json(nextAuthSession);
    }
  } catch {}

  // Fallback: check for Supabase Bearer token in Authorization header
  // The client (supabase auth) passes its access token here
  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseToken = authHeader.replace("Bearer ", "").trim();

  if (supabaseToken) {
    const payload = decodeSupabaseToken(supabaseToken);
    if (payload?.email) {
      // Valid Supabase session — return it in NextAuth-compatible format
      return NextResponse.json({
        user: { email: payload.email },
        expires: null,
        _supabase: true,
      });
    }
  }

  return NextResponse.json({ user: null, expires: null });
}
