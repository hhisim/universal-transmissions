import { NextResponse } from "next/server";

// Drive API key configured via Vercel env vars
// Key must have NO referrer restrictions on Google Cloud Console

const DRIVE_FOLDER_ID = "1eUgyNtZdFBykgUi8HWl1CIFLOPO79hxj";
const DRIVE_API_KEY=process.env.DRIVE_API_KEY || process.env.NEXT_PUBLIC_DRIVE_API_KEY || "AIzaSyCHYh-1nR1-k6c-ymz0rLFf6QaCTFxQUiw";

export async function GET() {
  if (!DRIVE_API_KEY) {
    return NextResponse.json({ error: "Drive API key not configured", files: [] }, { status: 200 });
  }

  try {
    const fields = "files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,description,imageMediaMetadata)";
    const url = `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&fields=${encodeURIComponent(fields)}&key=${DRIVE_API_KEY}`;

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
