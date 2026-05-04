import { NextResponse } from "next/server";
import { readDB } from "@/app/lib/hawkeyeStore";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ activity: db.activity });
}
