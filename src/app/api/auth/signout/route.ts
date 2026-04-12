import { signOut } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  await signOut({ redirectTo: "/login" });
  return NextResponse.json({ ok: true });
}
