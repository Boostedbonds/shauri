import { NextRequest, NextResponse } from "next/server";
import { addKnowledge } from "@/app/lib/hawkeyeStore";

export const runtime = "nodejs"; // ✅ IMPORTANT

function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  const size = 800;

  for (let i = 0; i < cleaned.length; i += size) {
    chunks.push(cleaned.slice(i, i + size));
  }

  return chunks;
}

// ✅ SAFE dynamic loader (prevents build crash)
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  } catch (err) {
    console.error("PDF parse failed:", err);
    return "[PDF parsing failed]";
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const text = buffer.toString("utf8");
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function extractXlsxText(buffer: Buffer): Promise<string> {
  return buffer
    .toString("utf8")
    .replace(/[\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractImageText(): Promise<string> {
  return "[OCR not enabled yet]";
}

async function extractText(file: File, buffer: Buffer): Promise<string> {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.includes("pdf") || name.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  if (type.includes("word") || name.endsWith(".docx")) {
    return extractDocxText(buffer);
  }

  if (
    type.includes("text") ||
    name.endsWith(".txt") ||
    name.endsWith(".csv")
  ) {
    return buffer.toString("utf8");
  }

  if (name.endsWith(".xlsx") || type.includes("sheet")) {
    return extractXlsxText(buffer);
  }

  if (type.startsWith("image/")) {
    return extractImageText();
  }

  return buffer.toString("utf8");
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const text = await extractText(file, buffer);
    const chunks = chunkText(text);

    await addKnowledge({
      id: crypto.randomUUID(),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      text: text.slice(0, 50000),
      chunks,
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      chunks: chunks.length,
    });

  } catch (error: any) {
    console.error("[UPLOAD ERROR]:", error);

    return NextResponse.json(
      { error: error?.message || "Upload failed." },
      { status: 500 }
    );
  }
}