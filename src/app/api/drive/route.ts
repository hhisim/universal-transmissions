import { NextResponse } from "next/server";

const DRIVE_FOLDER_ID = "1eUgyNtZdFBykgUi8HWl1CIFLOPO79hxj";
const DRIVE_API_KEY = "AIzaSyBLcyqqNmJu5bV4sMwXBIB2rcQ2JOlCak";

export async function GET() {
  try {
    const fields = "files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,description,imageMediaMetadata)";
    const url = `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&fields=${encodeURIComponent(fields)}&key=${DRIVE_API_KEY}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "Drive API error" }, { status: res.status });
    }
    
    const images = (data.files || []).filter((f: any) => f.mimeType.startsWith("image/"));
    return NextResponse.json({ files: images });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
