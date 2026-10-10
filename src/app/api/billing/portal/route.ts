import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveVerifiedIdentity } from "@/lib/verified-identity";

/**
 * POST /api/billing/portal
 *
 * Identity comes from a signature-verified credential (see
 * @/lib/verified-identity). The Stripe customer is taken ONLY from the record
 * stored against the verified address.
 *
 * This route previously decoded the JWT payload without verifying its signature
 * and then looked the customer up with the caller's own token filtered by that
 * (forgeable) address. Because the ut_members read policy admits any
 * authenticated user, a signed-in caller could select another member's
 * customer id and open a billing portal for it. Selection is now bound to the
 * verified identity, so a signed-in user can only ever reach their own record.
 *
 * Contract (unchanged for callers):
 *   unverifiable caller            -> 401 { error: "Authentication required" }
 *   no stored customer             -> 404 { error: "No billing account found..." }
 *   lookup failure / duplicates    -> 500 (fail closed; no Stripe call, and no
 *                                     replacement customer is ever created)
 *   success                        -> 200 { url }
 */

async function lookupStripeCustomerId(email: string): Promise<string | null> {
  // profiles.plan/stripe_customer_id is the Oracle-side record; ut_members holds
  // manual entries. Both are read for the VERIFIED address only.
  for (const table of ["ut_members", "profiles"] as const) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("stripe_customer_id")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      // Duplicates (PGRST116) and transport/relationship errors both land here.
      // Throwing keeps the caller from choosing an arbitrary customer.
      throw new Error(`${table} customer lookup failed: ${error.message ?? "unknown error"}`);
    }

    const id = (data as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
    if (id) return id;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate before any lookup or Stripe call.
    const identity = await resolveVerifiedIdentity(req);
    if (!identity) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let stripeCustomerId: string | null;
    try {
      stripeCustomerId = await lookupStripeCustomerId(identity.email);
    } catch (err) {
      // Fail closed. Never create a replacement customer on a failed lookup:
      // doing so would mint a new billing identity for an unresolved one.
      console.error("Billing portal customer lookup failed:", err);
      return NextResponse.json(
        { error: "Could not open billing portal. Please try again." },
        { status: 500 }
      );
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please contact support." },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.universal-transmissions.com";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Billing portal error:", err);
    return NextResponse.json(
      { error: "Could not open billing portal. Please try again." },
      { status: 500 }
    );
  }
}