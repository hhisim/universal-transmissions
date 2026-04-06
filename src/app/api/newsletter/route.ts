import { NextRequest, NextResponse } from "next/server";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID ?? "2";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    if (!BREVO_API_KEY) {
      return NextResponse.json({ error: "Newsletter service not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        listIds: [parseInt(BREVO_LIST_ID, 10)],
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      // Already subscribed is not an error
      if (data.code === "duplicate_parameter") {
        return NextResponse.json({ success: true, message: "Already subscribed" });
      }
      throw new Error(`Brevo API error: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter signup error:", error);
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 });
  }
}
