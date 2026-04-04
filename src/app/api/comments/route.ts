import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemType = searchParams.get("item_type");
  const itemId = searchParams.get("item_id");

  if (!itemType || !itemId) {
    return NextResponse.json({ error: "Missing item_type or item_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ut_comments")
    .select("*")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { item_type, item_id, visitor_id, author_name, content } = await req.json();

  if (!item_type || !item_id || !visitor_id || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: "Comment too long (max 2000 chars)" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ut_comments")
    .insert({
      item_type,
      item_id,
      visitor_id,
      author_name: author_name?.trim() || "Anonymous",
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("id");
  const visitorId = searchParams.get("visitor_id");

  if (!commentId || !visitorId) {
    return NextResponse.json({ error: "Missing id or visitor_id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("ut_comments")
    .delete()
    .eq("id", commentId)
    .eq("visitor_id", visitorId);

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}
