import { NextRequest, NextResponse } from "next/server";

interface PinterestPin {
  id: string;
  images: {
    "236x": { width: number; height: number; url: string };
    "564x": { width: number; height: number; url: string };
  };
  link: string | null;
  description: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const boardSlug = searchParams.get("board");

  if (!boardSlug) {
    return NextResponse.json({ error: "board parameter required" }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9/_-]+$/.test(boardSlug)) {
    return NextResponse.json({ error: "Invalid board slug" }, { status: 400 });
  }

  try {
    const url = `https://api.pinterest.com/v3/pidgets/boards/${boardSlug}/pins/`;
    const res = await fetch(url, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Pinterest API error" }, { status: 502 });
    }

    const data = await res.json();
    const pins: PinterestPin[] = data?.data?.pins ?? [];
    return NextResponse.json({ pins });
  } catch (err) {
    console.error("Pinterest proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch board" }, { status: 500 });
  }
}
