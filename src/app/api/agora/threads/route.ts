import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = supabase
    .from("agora_threads")
    .select("id, category, title, author, role, avatar, color, time_ago, replies, content, tags")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ threads: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { category, title, author, role, avatar, color, time_ago, content, tags } = body;

  if (!category || !title || !author || !content) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("agora_threads")
    .insert({ category, title, author, role: role ?? "", avatar: avatar ?? "✦", color: color ?? "var(--ut-gold)", time_ago: time_ago ?? "just now", content, tags: tags ?? [] })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ thread: data }, { status: 201 });
}
