import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveMembershipPlan, type MemberPlan } from "@/lib/membership-plan";

/**
 * The one place a server component or route asks "who is this, and what did they pay for?".
 *
 * UT signs members in with **Supabase** (`/login` → `signInWithPassword`). Before this
 * module, the paid pages answered that question with the NextAuth session instead, which
 * a Supabase sign-in never creates — so an Initiate member was redirected to /login forever
 * while holding a valid paid plan. The two systems are not interchangeable: NextAuth's email
 * provider cannot issue a link here (`/api/auth/signin/email` answers `error=Configuration`,
 * and the adapter's `users`/`verification_tokens` tables do not exist in the database).
 *
 * This helper reads the *same* session the sign-in page creates and then applies the shared,
 * revocation-aware plan resolver, so every reader in the application agrees.
 */

export type SessionMember = {
  email: string;
  plan: MemberPlan;
  isPaid: boolean;
};

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.UT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.UT_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  // `cookies()` throws outside a request scope (build-time evaluation, scripts). A caller
  // with no request has no session, which is what null already means — never a crash.
  let store: ReturnType<typeof cookies>;
  try {
    store = cookies();
  } catch {
    return null;
  }
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        // Server Components cannot mutate cookies; the middleware already refreshes them.
        try {
          store.set({ name, value, ...options });
        } catch {
          /* ignored: called from a Server Component */
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          store.set({ name, value: "", ...options });
        } catch {
          /* ignored: called from a Server Component */
        }
      },
    },
  });
}

async function memberFromEmail(email: string | null | undefined): Promise<SessionMember | null> {
  if (!email) return null;
  const resolved = await resolveMembershipPlan(supabaseAdmin, email);
  if (!resolved.ok) return null;
  const plan = resolved.membership.plan;
  return { email, plan, isPaid: plan === "initiate" };
}

/** Cookie session — for server components and same-origin route calls. */
export async function getSessionMember(): Promise<SessionMember | null> {
  const supabase = serverClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.email) return null;
    return await memberFromEmail(data.user.email);
  } catch {
    return null;
  }
}

/**
 * Cookie session, or an `Authorization: Bearer <access_token>` from the browser client.
 * Both resolve to the same member; an unverifiable token is anonymous, never a guess.
 */
export async function getRequestMember(request?: Request): Promise<SessionMember | null> {
  const header = request?.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];
  if (token) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user?.email) return await memberFromEmail(data.user.email);
    } catch {
      /* fall through to the cookie session */
    }
  }
  return getSessionMember();
}
