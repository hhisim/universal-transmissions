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

const PINTEREST_APP_ID = process.env.PINTEREST_APP_ID;
const PINTEREST_APP_SECRET = process.env.PINTEREST_APP_SECRET;
const PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;

async function getPinterestToken(): Promise<string | null> {
  if (!PINTEREST_APP_ID || !PINTEREST_APP_SECRET) return null;
  try {
    const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "pins:read boards:read",
      }).toString(),
      // Basic auth: app_id:app_secret
      auth: `${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`,
    });
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const boardSlug = searchParams.get("board");

  if (!boardSlug) {
    return NextResponse.json({ error: "board parameter required" }, { status: 400 });
  }

  // Sanitise — only allow alphanumeric/-/_/
  if (!/^[a-zA-Z0-9/_-]+$/.test(boardSlug)) {
    return NextResponse.json({ error: "Invalid board slug" }, { status: 400 });
  }

  // Try OAuth API with access token (full board, no 50-pin limit)
  if (PINTEREST_ACCESS_TOKEN) {
    try {
      const allPins: PinterestPin[] = [];
      let bookmark: string | null = null;

      do {
        const params = new URLSearchParams({ page_size: "100" });
        if (bookmark) params.set("bookmark", bookmark);

        const res = await fetch(
          `https://api.pinterest.com/v5/boards/${boardSlug}/pins?${params}`,
          {
            headers: {
              Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            next: { revalidate: 300 },
          }
        );

        if (!res.ok) break;
        const data = await res.json();
        const pins = data.items || [];
        allPins.push(
          ...pins.map((pin: Record<string, unknown>) => ({
            id: pin.id as string,
            images: {
              "236x": { width: 236, height: 0, url: "" },
              "564x": { width: 564, height: 0, url: "" },
            },
            link: (pin.link as string) || null,
            description: (pin.description as string) || "",
          }))
        );
        bookmark = data.bookmark || null;
      } while (bookmark && allPins.length < 500);

      if (allPins.length > 0) {
        return NextResponse.json({ pins: allPins });
      }
    } catch (err) {
      console.error("Pinterest OAuth API error:", err);
    }
  }

  // Fallback: public widget API (limited to ~50 pins)
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
