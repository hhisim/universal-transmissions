import { NextResponse } from "next/server";
export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  const hasKey = !!key;
  const keyPrefix = key ? key.slice(0, 12) + "..." : "MISSING";
  
  // Try a simple Stripe API call using native fetch
  let stripeOk = false;
  let stripeError = "";
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Basic ${Buffer.from(key + ":").toString("base64")}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    stripeOk = res.ok;
    stripeError = res.ok ? "OK" : JSON.stringify(data).slice(0, 100);
  } catch (e: any) {
    stripeError = e.message || String(e);
  }
  
  return NextResponse.json({ hasKey, keyPrefix, stripeOk, stripeError, url: "vercel" });
}
