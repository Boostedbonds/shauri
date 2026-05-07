import { NextResponse } from "next/server";
import { readDB } from "../../../../lib/db";

export async function GET() {
  const db = await readDB();
  const light = db.knowledge.map(({ id, fileName, mimeType, uploadedAt, chunks }) => ({
    id, fileName, mimeType, uploadedAt, chunks: chunks.length,
  }));
  return NextResponse.json({ knowledge: light });
}