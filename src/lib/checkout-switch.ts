/**
 * THE CHECKOUT SWITCH.
 *
 * PURPOSE: stop taking new money without shipping a new build.
 *
 * The state lives in the database, not in an environment variable. A Vercel environment change
 * only affects deployments created after it, so an env-var switch could not do the one thing this
 * switch exists to do: stop checkout NOW, during an incident, on the build that is already serving.
 *
 * FAILURE POLICY — fail CLOSED. If the flag cannot be read, checkout is refused. The alternative
 * (fail open) means an incident responder cannot rely on the switch at all: the moment the read
 * degrades, the shop quietly resumes taking money while the operator believes it is stopped.
 *
 * DEFAULT — enabled. A missing row is not an error; it is a shop that has never been switched off.
 * Only an explicit `enabled = false` row stops anything, so a fresh database cannot silently
 * disable sales.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type CheckoutSwitchState = {
  /** Whether NEW checkout sessions may be created. */
  enabled: boolean;
  /** Why — recorded by whoever flipped it, shown to nobody but the operator. */
  reason: string | null;
  /** When the current state was recorded. */
  updatedAt: string | null;
  /** How the decision was reached; `db` is normal, the others are degraded paths. */
  source: "db" | "env" | "unreadable";
};

/** Long enough that a page of button clicks costs one read; short enough that a flip is felt fast. */
const CACHE_MS = 5_000;

let cached: { at: number; state: CheckoutSwitchState } | null = null;

function client(): SupabaseClient {
  const url = process.env.UT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.UT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("checkout switch: Supabase is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** The documented fallback for a deployment whose database does not yet carry the flag table. */
function fromEnv(): CheckoutSwitchState | null {
  const raw = (process.env.CHECKOUT_DISABLED ?? "").trim().toLowerCase();
  if (!raw) return null;
  return {
    enabled: !(raw === "1" || raw === "true" || raw === "yes"),
    reason: "CHECKOUT_DISABLED environment variable",
    updatedAt: null,
    source: "env",
  };
}

export async function readCheckoutSwitch(): Promise<CheckoutSwitchState> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.state;

  let state: CheckoutSwitchState;
  try {
    const { data, error } = await client()
      .from("ut_system_flags")
      .select("enabled, reason, updated_at")
      .eq("key", "checkout_enabled")
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      state = fromEnv() ?? { enabled: true, reason: null, updatedAt: null, source: "db" };
    } else {
      const row = data[0] as { enabled: boolean; reason: string | null; updated_at: string | null };
      state = {
        enabled: row.enabled !== false,
        reason: row.reason,
        updatedAt: row.updated_at,
        source: "db",
      };
    }
  } catch (err) {
    const message = String((err as { message?: string })?.message ?? err);
    const code = String((err as { code?: string })?.code ?? "");
    const tableMissing =
      code === "42P01" ||
      /relation .* does not exist/i.test(message) ||
      /could not find the table/i.test(message) ||
      /schema cache/i.test(message);

    const env = fromEnv();
    if (env) {
      state = env;
    } else if (tableMissing) {
      /* NOT YET PROVISIONED is not the same as BROKEN. A shop whose flag table has not been created
         is a shop nobody has ever closed; refusing checkout here would turn a deployment-order
         mistake into an outage. The warning is the signal, and migrations/2026-11-10-checkout-switch.sql
         is the fix. Every OTHER read failure still fails closed. */
      console.warn(
        "checkout switch: ut_system_flags is not provisioned — checkout treated as enabled (apply the migration to enable runtime control)"
      );
      state = {
        enabled: true,
        reason: "flag table not provisioned — defaulting to enabled",
        updatedAt: null,
        source: "db",
      };
    } else {
      console.error("checkout switch unreadable — refusing checkout (fail closed):", err);
      state = {
        enabled: false,
        reason: "checkout switch unreadable — failing closed",
        updatedAt: null,
        source: "unreadable",
      };
    }
  }

  cached = { at: now, state };
  return state;
}

/** Test seam: forget the cached decision so a test can observe a flip immediately. */
export function clearCheckoutSwitchCache() {
  cached = null;
}

/** The one response shape the route returns when checkout is closed. */
export function checkoutDisabledResponse(state: CheckoutSwitchState) {
  return {
    error: "Checkout is temporarily closed.",
    code: "CHECKOUT_DISABLED" as const,
    retryLater: true,
    // Deliberately does not echo `state.reason`: that string is written by an operator and may
    // contain internal detail. It belongs in logs, not in a buyer's browser.
  };
}
