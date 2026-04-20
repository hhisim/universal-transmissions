import { NextRequest, NextResponse } from "next/server";

const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";
const BREVO_LIST_ID = Number(process.env.BREVO_LIST_ID ?? "2");

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const name = String(body?.name ?? "").trim();
    const utm_source = String(body?.utm_source ?? "").trim();
    const utm_medium = String(body?.utm_medium ?? "").trim();
    const utm_campaign = String(body?.utm_campaign ?? "").trim();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: "Newsletter service not configured" }, { status: 500 });
    }

    const payload = {
      email,
      listIds: [BREVO_LIST_ID],
      updateEnabled: true,
      attributes: {
        ...(name ? { FIRSTNAME: name } : {}),
        ...(utm_source ? { UTM_SOURCE: utm_source } : {}),
        ...(utm_medium ? { UTM_MEDIUM: utm_medium } : {}),
        ...(utm_campaign ? { UTM_CAMPAIGN: utm_campaign } : {}),
      },
    };

    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data.code === "duplicate_parameter") {
        return NextResponse.json({ success: true, message: "Already subscribed" });
      }
      console.error("Brevo newsletter error:", response.status, data);
      throw new Error(`Brevo API error: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter signup error:", error);
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 });
  }
}
