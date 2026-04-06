import { NextRequest, NextResponse } from "next/server";

// Pinterest v5 API response types
interface PinterestPin {
  id: string;
  description: string;
  link: string | null;
  media: {
    type: string;
    images: {
      "150x150": { width: number; height: number; url: string };
      "400x300": { width: number; height: number; url: string };
      "600x": { width: number; height: number; url: string };
      "1200x": { width: number; height: number; url: string };
    };
  };
}

// Map board slugs to numeric Pinterest board IDs
const BOARD_ID_MAP: Record<string, string> = {
  "hakanhisim/frequencies": "381398730882362924",
  "hakanhisim/geometrika": "381398730882260141",
  "hakanhisim/inspired-esoterica": "381398730882159621",
  "hakanhisim/radiolaria": "381398730882489223",
  "hakanhisim/codex": "381398730882412855",
  "hakanhisim/astronomy": "381398730882254658",
};

async function getPinterestToken(): Promise<string | null> {
  const clientId = process.env.PINTEREST_APP_ID;
  const secret = process.env.PINTEREST_APP_SECRET;
  if (!clientId || !secret) return null;

  try {
    const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials&scope=pins:read,boards:read",
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

  // Sanitise
  if (!/^[a-zA-Z0-9/_-]+$/.test(boardSlug)) {
    return NextResponse.json({ error: "Invalid board slug" }, { status: 400 });
  }

  // Get board ID from slug
  const boardId = BOARD_ID_MAP[boardSlug];
  if (!boardId) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Get access token
  const accessToken =
    process.env.PINTEREST_ACCESS_TOKEN || (await getPinterestToken());

  if (!accessToken) {
    return NextResponse.json({ error: "Pinterest not configured" }, { status: 500 });
  }

  try {
    const allPins: PinterestPin[] = [];
    let bookmark: string | null = null;

    // Paginate through all pins (up to 500)
    do {
      const params = new URLSearchParams({ page_size: "100" });
      if (bookmark) params.set("bookmark", bookmark);

      const res = await fetch(
        `https://api.pinterest.com/v5/boards/${boardId}/pins?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          next: { revalidate: 300 },
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("Pinterest API error:", err);
        break;
      }

      const data = await res.json();
      const items = data.items || [];
      allPins.push(...items);
      bookmark = data.bookmark || null;
    } while (bookmark && allPins.length < 500);

    // Normalise to the shape PinterestGrid expects
    const normalised = allPins.map((pin) => ({
      id: pin.id,
      images: {
        "236x": {
          width: 236,
          height: 0,
          url: pin.media?.images?.["150x150"]?.url || "",
        },
        "564x": {
          width: 564,
          height: 0,
          url: pin.media?.images?.["600x"]?.url || "",
        },
      },
      link: pin.link || null,
      description: pin.description || "",
    }));

    return NextResponse.json({ pins: normalised });
  } catch (err) {
    console.error("Pinterest error:", err);
    return NextResponse.json({ error: "Failed to fetch board" }, { status: 500 });
  }
}
