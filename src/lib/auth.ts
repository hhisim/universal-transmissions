import NextAuth from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";

// ─── Email provider via Brevo (Resend-compatible API) ───────────────────────
const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";
const BREVO_FROM_EMAIL = process.env.SMTP_FROM ?? "noreply@universal-transmissions.com";
const BREVO_FROM_NAME = process.env.SMTP_FROM_NAME ?? "UT Oracle";

async function sendBrevoEmail({ to, token }: { to: string; token: string }) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/callback/email?token=${token}&email=${encodeURIComponent(to)}`;

  const html = `
    <div style="font-family: 'Cinzel', serif; background: #0a090e; color: #ede9f6; max-width: 520px; margin: 0 auto; padding: 40px 32px; text-align: center;">
      <div style="font-size: 11px; letter-spacing: 0.3em; color: rgba(212,168,71,0.6); margin-bottom: 24px;">UNIVERSAL TRANSMISSIONS</div>
      <h1 style="font-family: 'Cinzel Decorative', serif; font-size: 24px; letter-spacing: 0.1em; color: #d946ef; margin-bottom: 16px;">Access the Oracle</h1>
      <p style="font-family: 'Cormorant Garamond', serif; font-size: 16px; color: rgba(237,233,246,0.6); line-height: 1.7; margin-bottom: 32px;">
        Click below to sign in to your Universal Transmissions Oracle account. This link expires in 15 minutes.
      </p>
      <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: rgba(217,70,239,0.08); border: 1px solid rgba(217,70,239,0.4); color: #d946ef; font-family: Cinzel, serif; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; text-decoration: none; transition: all 0.3s;">
        Sign In to Oracle
      </a>
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(217,70,239,0.1);">
        <p style="font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.1em; color: rgba(237,233,246,0.2); line-height: 1.8;">
          If you did not request this, ignore this email.<br/>
          ${verifyUrl}
        </p>
      </div>
    </div>
  `;

  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        to: [{ email: to }],
        sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
        subject: "Your Oracle Sign-In Link — Universal Transmissions",
        htmlContent: html,
        textContent: `Sign in to UT Oracle: ${verifyUrl}`,
      }),
    });
  } catch (err) {
    console.error("Brevo email send error:", err);
    // Fallback: log token to server console for dev
    console.log(`Magic link for ${to}: ${verifyUrl}`);
  }
}

// ─── Email request callback ────────────────────────────────────────────────
async function sendVerificationRequest({ identifier, token, url }: { identifier: string; token: string; url: string; providers: Provider[]; theme: unknown }) {
  await sendBrevoEmail({ to: identifier, token });
}

// ─── NextAuth config ───────────────────────────────────────────────────────
export const config = {
  providers: [
    {
      id: "email",
      name: "Email",
      type: "email",
      maxAge: 15 * 60, // 15 minutes
      sendVerificationRequest,
    },
  ],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sanctum/member/login",
    error: "/sanctum/member/login",
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token?.email) {
        session.user = session.user ?? {};
        session.user.email = token.email;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
