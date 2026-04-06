import { NextRequest, NextResponse } from "next/server";

const DRIVE_FOLDER_ID = "1eUgyNtZdFBykgUi8HWl1CIFLOPO79hxj";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || process.env.DRIVE_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "API key missing", files: [] }, { status: 200 });
  }

  try {
    const fields = "files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,description,imageMediaMetadata)";
    const url = `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&fields=${encodeURIComponent(fields)}&key=${key}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message || `Drive API error: ${res.status}`, files: [] }, { status: 200 });
    }

    const images = (data.files || []).filter((f: any) => f.mimeType.startsWith("image/"));
    return NextResponse.json({ files: images });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch Drive files", files: [] }, { status: 200 });
  }
}
