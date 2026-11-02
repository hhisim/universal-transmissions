import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getRequestMember } from "@/lib/member-session";
import { assetFor, DIGITAL_BUCKET, DOWNLOAD_TTL_SECONDS } from "@/lib/digital-delivery";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[id]/download
 *
 * Hands the buyer their digital edition, and is the ONLY place an order becomes `fulfilled`.
 *
 * Order of checks matters: identity, then ownership, then payment, then the asset. Nothing is
 * granted on the strength of an order id alone, and a missing asset is reported honestly rather
 * than being papered over with a fulfilled status.
 */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const member = await getRequestMember(req);
    if (!member?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const id = ctx?.params?.id;
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: order, error } = await supabaseAdmin
      .from("ut_orders")
      .select("id, customer_email, status, is_digital, product_id, product_title")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("download: order lookup failed", error);
      return NextResponse.json({ error: "Could not read order" }, { status: 500 });
    }
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

    /* Ownership is decided by the verified session address, never by anything the caller supplied. */
    const owner = String(order.customer_email ?? "").trim().toLowerCase();
    if (!owner || owner !== member.email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.status !== "paid" && order.status !== "fulfilled") {
      return NextResponse.json({ error: "This order is not paid" }, { status: 409 });
    }
    if (!order.is_digital) {
      return NextResponse.json({ error: "This order is not a digital edition" }, { status: 409 });
    }

    const asset = assetFor(order.product_id);
    if (!asset) {
      /* Honest failure. The order stays `paid`, no access is implied, and the studio learns about it
         rather than the customer discovering an empty shelf. */
      console.error(
        `download: no asset configured for product "${order.product_id}" (order ${order.id}) — delivery unavailable`
      );
      return NextResponse.json(
        { error: "This edition is not yet available for download. The studio has been notified." },
        { status: 409 }
      );
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(DIGITAL_BUCKET)
      .createSignedUrl(asset.path, DOWNLOAD_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      console.error("download: could not sign url", signError);
      return NextResponse.json({ error: "Could not prepare your download" }, { status: 502 });
    }

    /* Fulfilment is recorded only now — after access was actually granted. A failure above leaves the
       order `paid`, which is the truthful state. */
    if (order.status !== "fulfilled") {
      const { error: markError } = await supabaseAdmin
        .from("ut_orders")
        .update({ status: "fulfilled", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "paid");
      if (markError) console.error("download: could not mark fulfilled", markError);
    }

    return NextResponse.json({
      url: signed.signedUrl,
      filename: asset.filename,
      expiresIn: DOWNLOAD_TTL_SECONDS,
    });
  } catch (err) {
    console.error("download: unhandled", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
