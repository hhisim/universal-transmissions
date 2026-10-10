import { NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getPlanLabel, isPaidPlan, normalizeMemberPlan } from "@/lib/plans";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Recipient is fixed. It is never taken from the request.
const HAKAN_EMAIL = "hhisim@hotmail.com";

export const dynamic = "force-dynamic";

// Bounded input limits.
const MAX_SUBJECT = 200;
const MAX_CONTENT = 5000;

/** Escape user text for interpolation into the HTML body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip control characters and collapse newlines so a value can never inject a
 * header break (subject) or unexpected markup structure (content).
 */
function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/**
 * Resolve the caller's identity from a verified server-side source only.
 *
 * 1. Supabase access token -> validated by Supabase against the JWT signature
 *    at /auth/v1/user. An unsigned or forged token is rejected there.
 * 2. NextAuth session -> the JWT cookie verified with NEXTAUTH_SECRET.
 *
 * A decoded-but-unverified token is never treated as an identity.
 */
async function resolveVerifiedEmail(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (bearer && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (res.ok) {
        const user = (await res.json()) as { email?: string | null };
        const email = sanitize(user?.email).toLowerCase();
        if (email) return email;
      }
      // A present-but-invalid token is not an identity; fall through to NextAuth.
    } catch {
      // Network/verification failure must not authenticate anyone.
    }
  }

  try {
    const session = await auth();
    const email = sanitize(session?.user?.email).toLowerCase();
    if (email) return email;
  } catch {
    // fail closed
  }

  return null;
}

/**
 * Look up the stored plan for a verified email. Mirrors /api/billing/session:
 * profiles.plan takes precedence, ut_members.plan is the fallback.
 *
 * Returns a discriminated result so a lookup FAILURE is never confused with an
 * ineligible member.
 */
async function lookupPlan(
  email: string
): Promise<{ ok: true; plan: string } | { ok: false; reason: "lookup_failed" }> {
  try {
    const [profiles, members] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("plan")
        .eq("email", email)
        .maybeSingle()
        .then((r) => (r.error ? { error: r.error } : { data: r.data })),
      supabaseAdmin
        .from("ut_members")
        .select("plan")
        .eq("email", email)
        .maybeSingle()
        .then((r) => (r.error ? { error: r.error } : { data: r.data })),
    ]);

    const p = "data" in profiles ? profiles.data : null;
    const m = "data" in members ? members.data : null;
    const errP = "error" in profiles ? profiles.error : null;
    const errM = "error" in members ? members.error : null;

    if (errP || errM) {
      console.error("Member message plan lookup failed:", errP ?? errM);
      return { ok: false, reason: "lookup_failed" };
    }

    const stored = p?.plan ?? m?.plan ?? null;
    if (stored === null) {
      // No membership record at all: authenticated, but not a member.
      return { ok: true, plan: "guest" };
    }

    return { ok: true, plan: normalizeMemberPlan(stored as string) };
  } catch (err) {
    console.error("Member message plan lookup error:", err);
    return { ok: false, reason: "lookup_failed" };
  }
}

export async function POST(request: Request) {
  try {
    // ── 1. Authenticate before anything else ──────────────────────────────
    const email = await resolveVerifiedEmail(request);
    if (!email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // ── 2. Membership policy: Ask Hakan is an Initiate surface ────────────
    const lookup = await lookupPlan(email);
    if (!lookup.ok) {
      // Fail closed: a membership we could not read is never an entitlement.
      return NextResponse.json(
        { error: "Could not verify membership. Please try again." },
        { status: 500 }
      );
    }
    if (!isPaidPlan(lookup.plan)) {
      return NextResponse.json(
        { error: "This message channel is available to Initiate members." },
        { status: 403 }
      );
    }

    // ── 3. Bounded input, taken only from the request body ─────────────────
    // NOTE: any client-supplied `email`, `plan` or priority claim is ignored.
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const subject = sanitize(body.subject).replace(/\n+/g, " ");
    const content = sanitize(body.content);

    if (!subject || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (subject.length > MAX_SUBJECT) {
      return NextResponse.json({ error: "Subject is too long" }, { status: 400 });
    }
    if (content.length > MAX_CONTENT) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    // ── 4. Service configuration ───────────────────────────────────────────
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const planLabel = getPlanLabel(lookup.plan);
    const safeSubject = escapeHtml(subject);
    const safeContent = escapeHtml(content);
    const safeEmail = escapeHtml(email);

    const htmlContent = `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 20px; background: #000; color: #e5e5e5; min-height: 100vh;">
        <div style="border: 1px solid rgba(217,70,239,0.3); padding: 24px; background: rgba(217,70,239,0.04);">
          <div style="font-size: 10px; letter-spacing: 0.4em; text-transform: uppercase; color: rgba(212,168,71,0.6); margin-bottom: 12px;">
            [MEMBER]
          </div>
          <div style="font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 20px;">
            ${planLabel} Member
          </div>

          <h2 style="font-size: 18px; margin: 0 0 16px; color: #fff;">${safeSubject}</h2>

          <div style="font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.7); white-space: pre-wrap;">${safeContent}</div>

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="font-size: 11px; color: rgba(255,255,255,0.3); margin: 0;">
              From: ${safeEmail}<br/>
              Plan: ${planLabel}
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px; font-size: 10px; letter-spacing: 0.3em; color: rgba(255,255,255,0.2);">
          UNIVERSAL TRANSMISSIONS — MEMBER SANCTUM
        </div>
      </div>
    `;

    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "UT Member Portal <noreply@universal-transmissions.com>",
      to: HAKAN_EMAIL,
      replyTo: email,
      subject: `[MEMBER] ${subject}`,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Message route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}