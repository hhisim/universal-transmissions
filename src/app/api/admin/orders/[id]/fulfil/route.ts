import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/[id]/fulfil — the studio records that a digital edition was actually sent.
 *
 * Digital editions are delivered BY HAND from the studio's own master, so nothing in the payment flow
 * can honestly claim an order is fulfilled: only a human who has sent the file can say that. This
 * route is that statement, and it is the only way a digital order reaches `fulfilled`.
 *
 * Rules:
 *   · authorised by a studio secret in a HEADER, never in the URL (URLs are logged everywhere)
 *   · a buyer's session is never enough — this route does not read cookies or bearer tokens at all
 *   · idempotent: fulfilling an already-fulfilled order changes nothing and says so
 *   · only a paid order may be fulfilled; unpaid or refunded orders are refused
 *   · an audit line is appended to the order, so who/when survives even if status is later changed
 */

const STUDIO_ACTOR = "studio-manual-fulfilment";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const expected = process.env.ADMIN_FULFILMENT_KEY;
  if (!expected) {
    /* Fail closed: without a configured secret nobody can mark anything delivered. */
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const presented = req.headers.get("x-ut-admin-key") ?? "";
  if (!presented || !safeEqual(presented, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = ctx?.params?.id;
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let note = "";
  try {
    const body = await req.json().catch(() => ({}));
    note = typeof body?.note === "string" ? body.note.slice(0, 400) : "";
  } catch {
    note = "";
  }

  const { data: order, error } = await supabaseAdmin
    .from("ut_orders")
    .select("id, status, is_digital, product_title, customer_email, notes")
    .eq("id", id)
    .maybeSingle();

  /* `maybeSingle()` reports "no rows" as an error — that is a missing order, not a broken database,
     and answering 500 would hide the difference from whoever is reading the studio log. */
  const noRows = (error as { code?: string } | null)?.code === "PGRST116";
  if (error && !noRows) {
    console.error("fulfil: order lookup failed", error);
    return NextResponse.json({ error: "Could not read order" }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!order.is_digital) {
    return NextResponse.json({ error: "Not a digital edition" }, { status: 409 });
  }

  if (order.status === "fulfilled") {
    /* Idempotent by design: a repeated confirmation is the same fact stated twice, not a second
       delivery, and must not rewrite the timestamp. */
    return NextResponse.json({ ok: true, alreadyFulfilled: true, status: "fulfilled" });
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      { error: `Order is "${order.status}", not paid — nothing should be delivered` },
      { status: 409 }
    );
  }

  const at = new Date().toISOString();
  const audit = `${at} · ${STUDIO_ACTOR} · digital edition delivered manually${note ? ` · ${note}` : ""}`;
  const notes = [order.notes, audit].filter(Boolean).join("\n");

  const { data: updated, error: writeError } = await supabaseAdmin
    .from("ut_orders")
    .update({ status: "fulfilled", notes, updated_at: at })
    .eq("id", id)
    /* Conditional on the state we read: if another request fulfilled it between our read and write,
       this matches zero rows instead of overwriting their timestamp. */
    .eq("status", "paid")
    .select("id, status");

  if (writeError) {
    console.error("fulfil: write failed", writeError);
    return NextResponse.json({ error: "Could not record fulfilment" }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ ok: true, alreadyFulfilled: true, status: "fulfilled" });
  }

  return NextResponse.json({ ok: true, alreadyFulfilled: false, status: "fulfilled", fulfilledAt: at });
}
