import { NextRequest, NextResponse } from "next/server";
import { normalizeMemberPlan } from "@/lib/plans";

const SUPABASE_URL = "https://opixpkquyapeqdceyczs.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function decodeEmailFromToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return payload.email ?? null;
  } catch {
    return null;
  }
}

async function queryUtMembers(email: string, userToken: string) {
  // Use the user's own token — ut_members RLS allows authenticated reads
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ut_members?email=eq.${encodeURIComponent(email)}&select=plan,subscription_status,current_period_end`, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${userToken}`,
    },
  });
  if (!r.ok) return null;
  const data = await r.json();
  return Array.isArray(data) ? data[0] ?? null : null;
}

async function queryProfiles(email: string) {
  // Requires service role key — only works if SUPABASE_SERVICE_ROLE_KEY is set
  if (!SUPABASE_SERVICE_KEY) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=plan,stripe_customer_id`, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!r.ok) return null;
  const data = await r.json();
  return Array.isArray(data) ? data[0] ?? null : null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ authenticated: false, plan: "guest" });
  }

  const email = decodeEmailFromToken(token);
  if (!email) {
    return NextResponse.json({ authenticated: false, plan: "guest" });
  }

  try {
    const [profile, member] = await Promise.all([
      queryProfiles(email),
      queryUtMembers(email, token),
    ]);

    return NextResponse.json({
      authenticated: true,
      email,
      plan: normalizeMemberPlan(profile?.plan ?? member?.plan ?? "guest"),
      stripeCustomerId: profile?.stripe_customer_id ?? null,
      subscription_status: member?.subscription_status ?? "inactive",
      current_period_end: member?.current_period_end ?? null,
    });
  } catch (err) {
    console.error("Session endpoint error:", err);
    return NextResponse.json({ authenticated: false, plan: "guest" }, { status: 200 });
  }
}
