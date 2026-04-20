import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    if (subject.length > 160) {
      return NextResponse.json({ error: "Subject is too long" }, { status: 400 });
    }

    const toEmail = process.env.CONTACT_TO_EMAIL ?? "hhisim@hotmail.com";
    const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "Universal Transmissions <noreply@universal-transmissions.com>";

    await getResend().emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject: `[UT Contact] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #e5e7eb; background: #09090b; padding: 24px;">
          <h2 style="color: #d4a847; margin-top: 0;">New Message from Universal Transmissions</h2>
          <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr style="border: 1px solid rgba(217,70,239,0.2); margin: 20px 0;" />
          <p style="white-space: pre-wrap; line-height: 1.7;">${escapeHtml(message)}</p>
        </div>
      `,
      text: `New message from Universal Transmissions

From: ${name} <${email}>
Subject: ${subject}

${message}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
