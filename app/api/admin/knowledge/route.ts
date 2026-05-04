import { NextResponse } from "next/server";
import { readDB } from "@/app/lib/hawkeyeStore";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ knowledge: db.knowledge.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    mimeType: d.mimeType,
    uploadedAt: d.uploadedAt,
    chunks: d.chunks.length,
  })) });
}
