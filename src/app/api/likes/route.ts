import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemType = searchParams.get("item_type");
  const itemId = searchParams.get("item_id");
  const visitorId = searchParams.get("visitor_id");

  if (!itemType || !itemId) {
    return NextResponse.json({ error: "Missing item_type or item_id" }, { status: 400 });
  }

  // Get total like count — use direct count query (view may not be in PostgREST schema cache)
  const { count: likeCount } = await supabaseAdmin
    .from("ut_likes")
    .select("*", { count: "exact", head: true })
    .eq("item_type", itemType)
    .eq("item_id", itemId);

  // Check if this visitor has liked
  let userLiked = false;
  if (visitorId) {
    const { data: likeData } = await supabaseAdmin
      .from("ut_likes")
      .select("id")
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .eq("visitor_id", visitorId)
      .single();
    userLiked = !!likeData;
  }

  return NextResponse.json({ likeCount, userLiked });
}

export async function POST(req: NextRequest) {
  const { item_type, item_id, visitor_id } = await req.json();

  if (!item_type || !item_id || !visitor_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Check if already liked
  const { data: existing } = await supabaseAdmin
    .from("ut_likes")
    .select("id")
    .eq("item_type", item_type)
    .eq("item_id", item_id)
    .eq("visitor_id", visitor_id)
    .single();

  if (existing) {
    // Unlike
    await supabaseAdmin
      .from("ut_likes")
      .delete()
      .eq("item_type", item_type)
      .eq("item_id", item_id)
      .eq("visitor_id", visitor_id);
    return NextResponse.json({ action: "unliked" });
  } else {
    // Like
    await supabaseAdmin
      .from("ut_likes")
      .insert({ item_type, item_id, visitor_id });
    return NextResponse.json({ action: "liked" });
  }
}
