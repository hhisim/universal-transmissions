import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

const SUPABASE_URL = "https://opixpkquyapeqdceyczs.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Decode email from Supabase JWT directly — no auth() needed
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

// Get stripe_customer_id via REST API (no supabase-js admin needed)
async function getStripeCustomerId(email: string, userToken: string): Promise<string | null> {
  // Try ut_members first — has stripe_customer_id for manual entries
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/ut_members?email=eq.${encodeURIComponent(email)}&select=stripe_customer_id&limit=1`,
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${userToken}`,
      },
    }
  );
  if (r.ok) {
    const data = await r.json();
    if (Array.isArray(data) && data[0]?.stripe_customer_id) {
      return data[0].stripe_customer_id;
    }
  }

  // Fallback: try profiles
  const r2 = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=stripe_customer_id&limit=1`,
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${userToken}`,
      },
    }
  );
  if (r2.ok) {
    const data = await r2.json();
    if (Array.isArray(data) && data[0]?.stripe_customer_id) {
      return data[0].stripe_customer_id;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Accept Supabase Bearer token from client
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const email = decodeEmailFromToken(token);

    if (!email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const stripeCustomerId = await getStripeCustomerId(email, token);
    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No billing account found. Please contact support." }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.universal-transmissions.com";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Billing portal error:", err);
    return NextResponse.json({ error: "Could not open billing portal. Please try again." }, { status: 500 });
  }
}
