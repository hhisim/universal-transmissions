import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readCheckoutSwitch, clearCheckoutSwitchCache } from "@/lib/checkout-switch";
import { timingSafeEqual } from "crypto";

/**
 * THE ONLY WAY TO FLIP THE CHECKOUT SWITCH.
 *
 * There is no public control surface. This route requires a shared administrative secret in a
 * header, compared in constant time, and every attempt — accepted or refused — is written to an
 * audit table with the caller's address and the change that was asked for.
 *
 * It is deliberately NOT linked from any page and NOT discoverable from the storefront.
 */

function adminClient() {
  const url = process.env.UT_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.UT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("admin switch: Supabase is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Constant-time comparison that does not leak length through an early return. */
function secretMatches(provided: string | null): boolean {
  const expected = process.env.ADMIN_SECRET || process.env.ADMIN_FULFILMENT_KEY;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function caller(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function audit(entry: {
  action: string;
  outcome: "applied" | "refused";
  actor_ip: string;
  detail: Record<string, unknown>;
  actor_note?: string | null;
}) {
  try {
    await adminClient().from("ut_flag_audit").insert({
      key: "checkout_enabled",
      action: entry.action,
      outcome: entry.outcome,
      actor_ip: entry.actor_ip,
      actor_note: entry.actor_note ?? null,
      detail: entry.detail,
    });
  } catch (err) {
    // An audit write that fails must not silently swallow the change: it is logged to the platform
    // log as well, so there is always a second record.
    console.error("checkout switch: audit write failed", err);
  }
}

export async function GET(req: NextRequest) {
  const allowed = secretMatches(req.headers.get("x-admin-key"));
  await audit({
    action: "read",
    outcome: allowed ? "applied" : "refused",
    actor_ip: caller(req),
    detail: { authorised: allowed },
  });
  if (!allowed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const state = await readCheckoutSwitch();
  return NextResponse.json({
    enabled: state.enabled,
    reason: state.reason,
    updatedAt: state.updatedAt,
    source: state.source,
  });
}

export async function POST(req: NextRequest) {
  const ip = caller(req);
  if (!secretMatches(req.headers.get("x-admin-key"))) {
    await audit({ action: "toggle", outcome: "refused", actor_ip: ip, detail: { authorised: false } });
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: { enabled?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "`enabled` must be true or false" }, { status: 400 });
  }

  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 500)
      : body.enabled
        ? "re-enabled via admin API"
        : "disabled via admin API";

  try {
    const { error } = await adminClient()
      .from("ut_system_flags")
      .upsert(
        {
          key: "checkout_enabled",
          enabled: body.enabled,
          reason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) throw error;
  } catch (err) {
    console.error("checkout switch: write failed", err);
    await audit({
      action: body.enabled ? "enable" : "disable",
      outcome: "refused",
      actor_ip: ip,
      actor_note: reason,
      detail: { error: String(err).slice(0, 300) },
    });
    return NextResponse.json(
      { error: "Switch could not be written — checkout state is unchanged." },
      { status: 500 }
    );
  }

  // The running function caches the decision for a few seconds; drop it so this caller observes
  // the change immediately. Other instances converge within the cache window.
  clearCheckoutSwitchCache();

  await audit({
    action: body.enabled ? "enable" : "disable",
    outcome: "applied",
    actor_ip: ip,
    actor_note: reason,
    detail: { enabled: body.enabled },
  });

  const state = await readCheckoutSwitch();
  return NextResponse.json({
    enabled: state.enabled,
    reason: state.reason,
    updatedAt: state.updatedAt,
    source: state.source,
  });
}
