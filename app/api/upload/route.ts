import { NextRequest, NextResponse } from "next/server";
import { addKnowledge } from "../../../lib/db";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const text = await file.text();
  const chunkSize = 1000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  await addKnowledge({
    id: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
    text,
    chunks,
  });

  return NextResponse.json({ ok: true });
}