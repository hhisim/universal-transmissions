import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

// ─── Email provider via Brevo ───────────────────────────────────────────────
const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";
const BREVO_FROM_EMAIL = process.env.SMTP_FROM ?? "noreply@universal-transmissions.com";
const BREVO_FROM_NAME = process.env.SMTP_FROM_NAME ?? "UT Oracle";

async function sendBrevoEmail({ to, token }: { to: string; token: string }) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/callback/email?token=${token}&email=${encodeURIComponent(to)}`;
  const html = `<div style="font-family:'Cinzel',serif;background:#0a090e;color:#ede9f6;max-width:520px;margin:0 auto;padding:40px 32px;text-align:center;"><h1 style="color:#d946ef;">Access the Oracle</h1><p>Click below to sign in. This link expires in 15 minutes.</p><a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:rgba(217,70,239,0.08);border:1px solid rgba(217,70,239,0.4);color:#d946ef;text-decoration:none;">Sign In to Oracle</a></div>`;
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY },
      body: JSON.stringify({
        to: [{ email: to }],
        sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
        subject: "Your Oracle Sign-In Link — Universal Transmissions",
        htmlContent: html,
        textContent: `Sign in: ${verifyUrl}`,
      }),
    });
  } catch (err) {
    console.error("Brevo email error:", err);
  }
}

// ─── Email request callback ────────────────────────────────────────────────
async function sendVerificationRequest({ identifier, token, url }: { identifier: string; token: string; url: string }) {
  await sendBrevoEmail({ to: identifier, token });
}

// ─── Adapter: lazy async init to avoid build-time crash ──────────────────
type Adapter = NonNullable<NextAuthConfig["adapter"]>;
const _adapterPromise: Promise<Adapter> = (async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return undefined as unknown as Adapter;
  const { SupabaseAdapter } = await import("@auth/supabase-adapter");
  return SupabaseAdapter({ url, secret: key }) as Adapter;
})();

// We must synchronously pass an adapter to NextAuth config.
// Use a no-op stub; the real adapter is resolved and patched in the async init below.
const stubAdapter: Adapter = new Proxy({} as Adapter, { get() { return undefined as any; } });

// After init, patch the config so routes get the real adapter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
void _adapterPromise.then((real) => { if (real) (config as any).adapter = real; });

// ─── NextAuth config ───────────────────────────────────────────────────────
export const config = {
  providers: [
    {
      id: "email",
      name: "Email",
      type: "email",
      maxAge: 15 * 60,
      sendVerificationRequest,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any,
  adapter: stubAdapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sanctum/member/login",
    error: "/sanctum/member/login",
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user?.email) token.email = user.email;
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
