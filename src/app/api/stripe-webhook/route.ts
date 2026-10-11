import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { writeMembershipRow } from "@/lib/membership-write";
import {
  resolveAuthoritativeSubscription,
  eventGovernsCurrentSubscription,
  isRevokingStatusValue,
  entitlementFromAuthority,
  readStoredLinkage,
  type AuthoritativeSubscription,
  type StoredLinkage,
} from "@/lib/stripe-subscription-authority";
import { applyLifecycleUpdate } from "@/lib/membership-lifecycle";

/**
 * Every subscription id a lifecycle event legitimately owns.
 *
 * These are CANDIDATES for locating a row — never an authority on their own. A
 * row is only addressable if it already records one of them (or the verified
 * Stripe customer), so a stale id can only ever address the row that recorded
 * it. The governing id is taken from Stripe's CURRENT state, not from the event
 * payload, which is why a superseded id cannot win here.
 */
function lifecycleSubscriptionIds(
  authoritative: Extract<AuthoritativeSubscription, { ok: true }>,
  stored: StoredLinkage | null
): Array<string | null | undefined> {
  return [
    authoritative.subscriptionId,
    ...authoritative.candidates,
    stored?.subscriptionId ?? null,
    ...(stored?.alternates ?? []),
  ];
}

/** Epoch seconds -> ISO string, or null when Stripe supplies no usable value. */
function periodEndOf(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}


// ── Telegram notification helper ────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.AKASHA_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_HOME_CHANNEL ?? "5491669332";

async function sendTelegram(html: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("AKASHA_BOT_TOKEN not set — skipping Telegram notification");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("Telegram notification failed:", err);
  }
}

function formatCurrency(amount: number | null | undefined, currency: string = "usd"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

// UT Supabase — the webhook writes to UT's database, not VOA's
function getUtSupabaseAdmin(): SupabaseClient {
  const url = process.env.UT_SUPABASE_URL;
  const key = process.env.UT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("UT_SUPABASE_URL or UT_SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key);
}
const utSupabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getUtSupabaseAdmin();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // Batch 14d: a membership write that failed must not be acknowledged as
  // success. Failures are collected here and the handler answers non-2xx so
  // Stripe retries the delivery, instead of logging and returning 200.
  const membershipFailures: string[] = [];
  // Optional writes (Oracle profile mirrors) are reported but must NOT fail the
  // delivery: under option 3 Stripe cannot supply a verified userId, so they can
  // never be made permanently satisfiable and endless retries would be harmful.
  const membershipWarnings: string[] = [];

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    // ── One-time product payments (existing) ──────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Check if this is a subscription (has subscription_data or mode === 'subscription')
      if (session.mode === "subscription") {
        // Handled by subscription.updated — skip duplicate processing
        break;
      }

      // One-time product payment
      console.log(`✅ Product payment succeeded for session: ${session.id}`);
      const shippingDetails = (session as any).shipping_details as {
        name?: string;
        address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string };
      } | null | undefined;

      const isDigital = session.line_items?.data[0]?.price?.product
        ? typeof session.line_items.data[0].price.product === "string"
          ? ["codex-digital", "chakra-4k", "chakra-8k"].some(id =>
              session.line_items!.data[0].price!.product!.toString().includes(id) ||
              session.line_items!.data[0].description?.toLowerCase().includes("pdf") ||
              session.line_items!.data[0].description?.toLowerCase().includes("loop pack")
            )
          : !!((session.line_items!.data[0].price!.product as Stripe.Product | null)?.description)
        : false;

      let orderNote = "";
      try {
        const { error } = await utSupabaseAdmin
          .from("ut_orders")
          .update({
            status: isDigital ? "fulfilled" : "paid",
            stripe_payment_intent_id: session.payment_intent as string,
            customer_email: session.customer_email || "",
            customer_name: session.customer_details?.name || null,
            shipping_name: shippingDetails?.name || null,
            shipping_address_line1: shippingDetails?.address?.line1 || null,
            shipping_address_line2: shippingDetails?.address?.line2 || null,
            shipping_city: shippingDetails?.address?.city || null,
            shipping_state: shippingDetails?.address?.state || null,
            shipping_postal_code: shippingDetails?.address?.postal_code || null,
            shipping_country: shippingDetails?.address?.country || null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", session.id);

        if (error) console.error("Failed to update order status:", error);
        else {
          console.log(`Order updated to: ${isDigital ? "fulfilled" : "paid"}`);
          orderNote = "✅ Order updated in UT DB";
        }
      } catch (err) {
        console.error("Supabase update failed:", err);
      }

      // ── Telegram notification ────────────────────────────────────────────
      const amount = session.amount_total;
      const productName = session.line_items?.data[0]?.description ?? "Order";
      const customerName = session.customer_details?.name ?? session.customer_email ?? "Unknown";
      const customerEmail = session.customer_email ?? "—";
      const ts = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });

      await sendTelegram(
        `<b>🛒 NEW SALE — ${formatCurrency(amount, session.currency ?? "usd")}</b>\n` +
        `Customer: ${customerName}\n` +
        `Email: ${customerEmail}\n` +
        `Product: ${productName}\n` +
        `Time: ${ts}\n` +
        `${orderNote}`
      );
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const ts = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
      console.log(`❌ Payment failed: ${intent.id}`);
      await sendTelegram(
        `<b>⚠️ PAYMENT FAILED</b>\n` +
        `Payment Intent: ${intent.id}\n` +
        `Amount: ${formatCurrency(intent.amount, intent.currency)}\n` +
        `Time: ${ts}`
      );
      break;
    }

    // ── Subscription events ───────────────────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const email = subscription.metadata?.email;

      console.log(`Subscription ${event.type}: ${subscription.id} for customer ${customerId}`);

      // Determine plan and status
      let plan: 'guest' | 'free' | 'initiate' = 'free';
      // widened from Stripe's `Status` union: the reconciled authority
      // supplies a plain string
      let subscriptionStatus: string = subscription.status;

      if (subscription.status === "active" || subscription.status === "trialing") {
        plan = "initiate";
      } else if (subscription.status === "past_due") {
        subscriptionStatus = "past_due";
        plan = "initiate"; // keep plan but mark status
      } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
        plan = "free";
        subscriptionStatus = "canceled";
      }

      // AUTHORITY: ask Stripe what the customer's CURRENT subscription is.
      //
      // The event payload is a snapshot taken when the event was created, so a
      // delayed delivery carries stale state — an old `active` snapshot would
      // otherwise resurrect a cancelled subscription. Recency comes from
      // Stripe's own state, NEVER from delivery order or event.created.
      // Capture the stored linkage BEFORE asking Stripe, so the write can be
      // conditioned on the state this decision was actually made from.
      const lifecycleLinkage = await readStoredLinkage(utSupabaseAdmin, {
        email,
        customerId,
      });
      if (!lifecycleLinkage.ok) {
        // A linkage READ failure is not absence: refuse to change entitlement.
        membershipFailures.push(`linkage:${lifecycleLinkage.reason}`);
        console.error("Could not read stored linkage:", lifecycleLinkage.detail);
        break;
      }
      const lifecycleStored = lifecycleLinkage.linkage;
      const lifecycleAuthority = await resolveAuthoritativeSubscription(
        getStripe(),
        customerId,
        lifecycleStored
      );
      if (!lifecycleAuthority.ok) {
        // Never acknowledge a required membership update we could not determine.
        membershipFailures.push(`reconcile:${lifecycleAuthority.reason}`);
        console.error("Could not reconcile the current subscription:", lifecycleAuthority.detail);
        break;
      }
      if (!eventGovernsCurrentSubscription(lifecycleAuthority, subscription.id)) {
        membershipWarnings.push(`stale-lifecycle:${subscription.id}`);
        console.log(`Ignoring a stale lifecycle snapshot for superseded ${subscription.id}`);
        break;
      }
      // Derive plan AND status from the SAME validated state, so a historical
      // payload field can never leak into the update.
      const lifecycleEntitlement = entitlementFromAuthority(lifecycleAuthority);
      if (!lifecycleEntitlement) {
        membershipFailures.push("reconcile:ambiguous_status");
        console.error("Ambiguous authoritative status; refusing to change entitlement");
        break;
      }
      plan = lifecycleEntitlement.plan;
      subscriptionStatus = lifecycleEntitlement.status;

      const periodEnd = periodEndOf((subscription as any).current_period_end);

      // ── Update the membership rows THIS VERIFIED CUSTOMER OWNS ────────────
      //
      // Reported rather than disguised as an affected-row success: a table with
      // no row carrying the verified linkage has nothing to update.
      //
      // Previously both statements were set-based: `ut_members` filtered on
      // `stripe_customer_id` and `profiles` on the event's `metadata.email`, the
      // latter skipped entirely when the payload carried no address. A
      // profiles-only member therefore had the ut_members statement match ZERO
      // rows, the profiles statement never run at all, and the delivery
      // acknowledged 200 — a cancellation left them paid.
      const lifecycleAuthorityInput = {
        customerId,
        subscriptionIds: lifecycleSubscriptionIds(lifecycleAuthority, lifecycleStored),
      };
      // The GOVERNING subscription from Stripe's CURRENT state. On a revocation
      // there is none, so the stored linkage is cleared rather than left stale.
      const governedSubscriptionId = lifecycleAuthority.subscriptionId;

      const memberFields: Record<string, unknown> = {
        plan,
        subscription_status: subscriptionStatus,
        stripe_subscription_id: governedSubscriptionId,
        current_period_end: periodEnd,
        stripe_customer_id: customerId,
      };
      const lifecycleMemberWrite = await applyLifecycleUpdate(
        utSupabaseAdmin,
        "ut_members",
        lifecycleAuthorityInput,
        memberFields
      );
      let memberNote = "";
      if (!lifecycleMemberWrite.ok) {
        membershipFailures.push(`ut_members:${lifecycleMemberWrite.reason}`);
        console.error("Failed to update ut_members subscription:", lifecycleMemberWrite.detail);
      } else if (!lifecycleMemberWrite.linked) {
        console.log("ut_members: no row carries the verified Stripe linkage; nothing to update");
      } else {
        console.log(
          `ut_members updated: plan=${plan}, status=${subscriptionStatus}, rows=${lifecycleMemberWrite.updated}`
        );
        memberNote = "✅ Member record updated";
      }

      // profiles (Oracle members). Also written through the VERIFIED linkage,
      // never through the event's address: the event's `metadata.email` is not
      // an authority, so it no longer selects the row it lands on.
      //
      // `profiles.user_id` is the row's PRIMARY KEY and is used only as that
      // key — it is never presented as, or substituted for, an authenticated
      // identity, and it is never fabricated. `subscription_status` is
      // deliberately NOT written on this table: the shared reader ignores it for
      // entitlement, and a value written there could never be cleared.
      const profileFields: Record<string, unknown> = {
        plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: governedSubscriptionId,
      };
      const lifecycleProfileWrite = await applyLifecycleUpdate(
        utSupabaseAdmin,
        "profiles",
        lifecycleAuthorityInput,
        profileFields
      );
      if (!lifecycleProfileWrite.ok) {
        // REQUIRED, not optional. The shared reader ranks `profiles.plan`, so a
        // failed mirror leaves access PAID while the update looks done.
        membershipFailures.push(`profiles:${lifecycleProfileWrite.reason}`);
        console.error("Failed to update Oracle profile subscription:", lifecycleProfileWrite.detail);
      } else if (!lifecycleProfileWrite.linked) {
        console.log("profiles: no row carries the verified Stripe linkage; nothing to update");
      } else {
        console.log(`profiles updated: plan=${plan}, rows=${lifecycleProfileWrite.updated}`);
      }

      // ── Telegram notification ────────────────────────────────────────────
      const isNew = event.type === "customer.subscription.created";
      const ts = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
      await sendTelegram(
        `<b>${isNew ? "✨ NEW MEMBERSHIP" : "🔄 MEMBERSHIP UPDATE"}</b>\n` +
        `Email: ${email ?? "—"}\n` +
        `Plan: ${plan}\n` +
        `Status: ${subscriptionStatus}\n` +
        `Customer ID: ${customerId}\n` +
        `Time: ${ts}\n` +
        `${memberNote}`
      );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log(`Subscription deleted: ${subscription.id} for customer ${customerId}`);

      // RECONCILE BEFORE CHANGING ANYTHING. Deletion was the only lifecycle path
      // that never asked Stripe, so a delayed `deleted` for an OLD subscription
      // removed access governed by a still-live newer one — including for a
      // profiles-only member, whose plan was rewritten to free without a single
      // Stripe query.
      const deleteEmail = subscription.metadata?.email ?? "";
      const deleteLinkage = await readStoredLinkage(utSupabaseAdmin, {
        email: deleteEmail,
        customerId,
      });
      if (!deleteLinkage.ok) {
        membershipFailures.push(`linkage:${deleteLinkage.reason}`);
        console.error("Could not read stored linkage on deletion:", deleteLinkage.detail);
        break;
      }
      const deleteAuthority = await resolveAuthoritativeSubscription(
        getStripe(),
        customerId,
        deleteLinkage.linkage
      );
      if (!deleteAuthority.ok) {
        membershipFailures.push(`reconcile:${deleteAuthority.reason}`);
        console.error("Could not reconcile on deletion:", deleteAuthority.detail);
        break;
      }
      if (
        deleteAuthority.found &&
        deleteAuthority.subscriptionId &&
        deleteAuthority.subscriptionId !== subscription.id
      ) {
        // The deleted subscription is not the governing one: this is a stale
        // event and must not downgrade either table.
        membershipWarnings.push(`stale-deletion:${subscription.id}`);
        console.log(
          `Ignoring deletion of superseded ${subscription.id}; ${deleteAuthority.subscriptionId} still governs`
        );
        break;
      }

      // ── Revoke the rows that carry THIS subscription's verified linkage ────
      //
      // Only the CURRENT subscription may revoke. A late `subscription.deleted`
      // belonging to a superseded subscription must not revoke an active
      // membership. Ordering comes from trusted STORED linkage, not from the
      // event timestamp or delivery order; rows with no linkage recorded
      // (legacy) keep the previous behaviour.
      //
      // The eligibility rule is the previous `.or(eq(id), is(null))` filter made
      // explicit: a row recording a DIFFERENT subscription is superseded and is
      // left untouched. Every eligible row is written by its real primary key
      // and the affected-row count is CHECKED, so a row that is in scope but not
      // written fails the delivery instead of passing silently.
      const deleteAuthorityInput = {
        customerId,
        subscriptionIds: lifecycleSubscriptionIds(deleteAuthority, deleteLinkage.linkage),
      };
      const ownsDeletedSubscription = (row: Record<string, unknown>): boolean => {
        const recorded = row.stripe_subscription_id;
        return recorded === null || recorded === undefined || recorded === "" || recorded === subscription.id;
      };

      const memberRevoke = await applyLifecycleUpdate(
        utSupabaseAdmin,
        "ut_members",
        deleteAuthorityInput,
        {
          plan: "guest",
          subscription_status: "canceled",
          stripe_subscription_id: null,
          current_period_end: null,
        },
        { isEligible: ownsDeletedSubscription }
      );
      if (!memberRevoke.ok) {
        membershipFailures.push(`cancel-ut_members:${memberRevoke.reason}`);
        console.error("Failed to cancel ut_members subscription:", memberRevoke.detail);
      } else if (!memberRevoke.linked) {
        console.log("ut_members: no row carries the verified Stripe linkage; nothing to revoke");
      } else {
        console.log(`ut_members reverted to guest (rows=${memberRevoke.updated})`);
      }

      // Revert profiles (Oracle).
      //
      // `profiles` has NO `id` column — its primary key is `user_id` — so the
      // previous `.select("id")` and `.eq("id", profile.id)` could never match a
      // deployed row, and both errors were discarded. The row is addressed by
      // `user_id`, taken from the row the VERIFIED Stripe linkage resolved.
      //
      // REQUIRED, not optional. The shared reader ranks `profiles.plan`, so a
      // failed mirror leaves access PAID while the revocation looks done.
      // Reproduced: a profiles-only member kept `initiate` and the delivery was
      // acknowledged 200. Failing here makes Stripe retry.
      const profileRevoke = await applyLifecycleUpdate(
        utSupabaseAdmin,
        "profiles",
        deleteAuthorityInput,
        { plan: "free" },
        { isEligible: ownsDeletedSubscription }
      );
      if (!profileRevoke.ok) {
        membershipFailures.push(`cancel-profiles:${profileRevoke.reason}`);
        console.error("Failed to revert Oracle profile:", profileRevoke.detail);
      } else if (!profileRevoke.linked) {
        console.log("profiles: no row carries the verified Stripe linkage; nothing to revert");
      } else {
        console.log(`profiles reverted to free (rows=${profileRevoke.updated})`);
      }

      // ── Telegram notification ──────────────────────────────────────────────
      const ts = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false });
      await sendTelegram(
        `<b>❌ MEMBERSHIP CANCELLED</b>\n` +
        `Customer ID: ${customerId}\n` +
        `Time: ${ts}`
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      console.log(`Invoice payment failed for customer ${customerId}: ${invoice.id}`);

      // AUTHORITY: dunning may only be applied when Stripe's CURRENT state for
      // this customer is genuinely past_due. A delayed payment_failed used to
      // rewrite `unpaid` / `incomplete_expired` (both revocations) to `past_due`,
      // which restored entitlement.
      const pastDueLinkage = await readStoredLinkage(utSupabaseAdmin, {
        email: (invoice as any).customer_email,
        customerId,
      });
      if (!pastDueLinkage.ok) {
        membershipFailures.push(`linkage:${pastDueLinkage.reason}`);
        console.error("Could not read stored linkage:", pastDueLinkage.detail);
        break;
      }
      const pastDueAuthority = await resolveAuthoritativeSubscription(
        getStripe(),
        customerId,
        pastDueLinkage.linkage
      );
      if (!pastDueAuthority.ok) {
        membershipFailures.push(`reconcile:${pastDueAuthority.reason}`);
        console.error("Could not reconcile the current subscription:", pastDueAuthority.detail);
        break;
      }
      if (pastDueAuthority.status !== "past_due") {
        membershipWarnings.push(`payment_failed-ignored:${pastDueAuthority.status ?? "none"}`);
        console.log("Ignoring a stale payment failure; current status is not past_due");
        break;
      }

      const pastDueWrite = await applyLifecycleUpdate(
        utSupabaseAdmin,
        "ut_members",
        {
          customerId,
          subscriptionIds: lifecycleSubscriptionIds(pastDueAuthority, pastDueLinkage.linkage),
        },
        { subscription_status: "past_due" },
        // Dunning must not overwrite a recorded cancellation. `past_due` is not
        // a revoking state, so writing it over `canceled` would DESTROY the
        // revocation record and could let a stale invoice resurrect access.
        { isEligible: (row) => row.subscription_status !== "canceled" }
      );
      if (!pastDueWrite.ok) {
        membershipFailures.push(`past_due:${pastDueWrite.reason}`);
        console.error("Failed to mark past_due:", pastDueWrite.detail);
      } else if (!pastDueWrite.linked) {
        console.log("ut_members: no row carries the verified Stripe linkage; nothing to mark past_due");
      } else {
        console.log(
          `Member marked as past_due (cancelled records left intact, rows=${pastDueWrite.updated})`
        );
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceAny = invoice as any;
      if (invoiceAny.subscription && invoice.customer_email) {
        const customerId = invoice.customer as string;
        const subscriptionId = invoiceAny.subscription as string;
        const customerEmail = invoice.customer_email;

        // AUTHORITY: an older invoice must not replace the current subscription
        // id, and must not resurrect a revoked membership.
        const invoiceLinkage = await readStoredLinkage(utSupabaseAdmin, {
          email: customerEmail,
          customerId,
        });
        if (!invoiceLinkage.ok) {
          membershipFailures.push(`linkage:${invoiceLinkage.reason}`);
          console.error("Could not read stored linkage:", invoiceLinkage.detail);
          break;
        }
        const invoiceAuthority = await resolveAuthoritativeSubscription(
          getStripe(),
          customerId,
          invoiceLinkage.linkage
        );
        if (!invoiceAuthority.ok) {
          membershipFailures.push(`reconcile:${invoiceAuthority.reason}`);
          console.error("Could not reconcile the current subscription:", invoiceAuthority.detail);
          break;
        }
        // Absence is authoritative: with no current subscription there is
        // nothing to entitle, and an old invoice must not install its id.
        const invoiceEntitlement = entitlementFromAuthority(invoiceAuthority);
        if (!invoiceEntitlement) {
          membershipFailures.push("reconcile:ambiguous_status");
          console.error("Ambiguous authoritative status on an invoice; refusing to act");
          break;
        }
        if (invoiceEntitlement.basis !== "active" && invoiceEntitlement.basis !== "past_due") {
          membershipWarnings.push(`invoice-ignored:${invoiceEntitlement.basis}`);
          console.log("Ignoring an invoice whose subscription is not current and paid");
          break;
        }
        const currentSubscriptionId = invoiceAuthority.subscriptionId;

        try {
          // Neither table has a unique index on email, so the previous
          // `upsert(..., { onConflict: "email" })` was rejected with 42P10 and
          // the error was swallowed. Both writes now go through the shared
          // helper and report their outcome. The price-to-plan mapping for
          // subscription events is deliberately untouched.
          const memberWrite = await writeMembershipRow(
            utSupabaseAdmin,
            "ut_members",
            customerEmail,
            {
              // Deliberately does NOT set subscription_status.
              //
              // Subscription lifecycle events (customer.subscription.*) are the
              // authority for status; an invoice event must not resurrect a
              // membership. Setting status='active' here meant a stale
              // payment-succeeded arriving after a cancellation would clear the
              // cancellation — and the schema carries no ordering signal to
              // distinguish that from a genuine reactivation, so the safe move
              // is to let the invoice event own only billing artefacts.
              stripe_customer_id: customerId,
              // Only the AUTHORITATIVE current subscription may be recorded; an
              // older invoice's id must not overwrite the stored linkage.
              stripe_subscription_id: currentSubscriptionId,
              plan: "initiate",
            },
            { protectPaidPlan: false }
          );
          if (!memberWrite.ok) {
            membershipFailures.push(`invoice-ut_members:${memberWrite.reason}`);
            console.error(
              "invoice.payment_succeeded: ut_members write failed:",
              memberWrite.reason,
              memberWrite.detail
            );
          }

          // profiles is keyed by user_id, which a Stripe event does not carry.
          // An existing row is updated; a missing one cannot be created here and
          // that is reported rather than hidden.
          const profileWrite = await writeMembershipRow(
            utSupabaseAdmin,
            "profiles",
            customerEmail,
            { stripe_customer_id: customerId, plan: "initiate" },
            { protectPaidPlan: false }
          );
          if (!profileWrite.ok) {
            // OPTIONAL mirror. The helper requires a verified userId for a
            // profiles INSERT, which a Stripe event does not carry (and which
            // must not be fabricated), so this can legitimately be refused.
            // Recorded as a warning; it never fails the delivery.
            membershipWarnings.push(`invoice-profiles:${profileWrite.reason}`);
            console.error(
              "invoice.payment_succeeded: profiles mirror skipped:",
              profileWrite.reason,
              profileWrite.detail
            );
          }
        } catch (err) {
          // A THROWN error here means the required ut_members write did not
          // happen either, so it must fail the delivery rather than answer 200.
          membershipFailures.push("invoice-ut_members:threw");
          console.error("Failed to upsert member on invoice.payment_succeeded:", err);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // A required membership change that did not succeed must not be acknowledged
  // as success: answer non-2xx so Stripe retries the delivery. Nothing is
  // queued or stored locally — the retry IS the durable mechanism.
  if (membershipFailures.length > 0) {
    console.error("Stripe webhook: membership writes failed:", membershipFailures.join("; "));
    return NextResponse.json(
      { received: true, membershipFailures, retry: true },
      { status: 500 }
    );
  }

  if (membershipWarnings.length > 0) {
    // Reported for observability, but ack'd: these are optional mirrors.
    console.warn("Stripe webhook: optional membership mirrors skipped:", membershipWarnings.join("; "));
    return NextResponse.json({ received: true, membershipWarnings });
  }

  return NextResponse.json({ received: true });
}
