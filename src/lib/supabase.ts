import { createClient, SupabaseClient } from "@supabase/supabase-js";

let reported = false;

/**
 * The admin client. It is only ever imported by route handlers and server libraries, so the
 * service-role key never enters a client bundle.
 *
 * When configuration is missing this throws — the membership resolvers then refuse, and every
 * paid gate fails closed rather than guessing at an entitlement. The diagnostic says WHICH
 * variable is missing and is written once per process to the server log; it is never returned
 * to a caller, and it never contains a value.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    if (!reported) {
      reported = true;
      console.error(
        `[membership] admin database client unavailable: ${missing.join(", ")} not set in this environment. ` +
          `Memberships cannot be resolved, so paid gates will refuse access (fail closed). ` +
          `Set the variable in the Vercel project's Production and Preview scopes.`
      );
    }
    throw new Error(`Supabase admin client misconfigured: missing ${missing.join(", ")}`);
  }

  return createClient(url as string, key as string);
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, _receiver) {
    const client = getSupabaseAdmin();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});
