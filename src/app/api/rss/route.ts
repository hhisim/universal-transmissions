import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Only allow Pinterest RSS URLs
  if (!url.includes("pinterest.com") || !url.includes(".rss")) {
    return NextResponse.json({ error: "Only Pinterest RSS feeds allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSS reader)",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: 502 });
    }

    const xml = await res.text();

    // Parse RSS XML manually — extract all <item> blocks and their <img> src from description
    const items: { src: string; link: string }[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);

    for (const match of itemMatches) {
      const itemXml = match[1];
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
      const link = linkMatch ? linkMatch[1].trim() : "";

      // Extract first img src from description CDATA or plain text
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i) ||
                        itemXml.match(/<description>(.*?)<\/description>/i);
      if (descMatch) {
        const desc = descMatch[1];
        const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          const src = imgMatch[1].replace(/(\?.*?)(?="|$)/, ""); // strip tracking params
          if (src.startsWith("http")) {
            items.push({ src, link });
          }
        }
      }
    }

    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    console.error("RSS proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch RSS" }, { status: 500 });
  }
}
