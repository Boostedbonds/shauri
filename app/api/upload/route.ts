import { NextRequest, NextResponse } from "next/server";
import { addKnowledge } from "@/app/lib/hawkeyeStore";

export const runtime = "nodejs"; // REQUIRED for pdf-parse
export const maxDuration = 30;

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12MB

/* -----------------------------
TEXT CHUNKING
----------------------------- */
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

/* -----------------------------
SAFE PDF PARSER (NO BUILD CRASH)
----------------------------- */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfModule = await import("pdf-parse");

    // Handle both default and named export cases.
    const pdfParse = (pdfModule as any).default || pdfModule;
    const parsed = await pdfParse(buffer);
    return parsed?.text || "";
  } catch (err) {
    console.error("PDF parse failed:", err);
    return "[PDF parsing failed]";
  }
}

/* -----------------------------
DOCX (basic fallback)
----------------------------- */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const text = buffer.toString("utf8");
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "[DOCX parsing failed]";
  }
}

/* -----------------------------
XLSX (basic fallback)
----------------------------- */
async function extractXlsxText(buffer: Buffer): Promise<string> {
  try {
    return buffer
      .toString("utf8")
      .replace(/[\x00-\x1F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "[XLSX parsing failed]";
  }
}

/* -----------------------------
IMAGE (placeholder)
----------------------------- */
async function extractImageText(): Promise<string> {
  return "[OCR not enabled yet]";
}

/* -----------------------------
MAIN TEXT ROUTER
----------------------------- */
async function extractText(file: File, buffer: Buffer): Promise<string> {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (type.includes("pdf") || name.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  if (type.includes("word") || name.endsWith(".docx")) {
    return extractDocxText(buffer);
  }

  if (type.includes("text") || name.endsWith(".txt") || name.endsWith(".csv")) {
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

/* -----------------------------
API HANDLER
----------------------------- */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { error: `File too large (${sizeMb} MB). Max allowed is 12 MB.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(file, buffer);

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: "File has no readable content." }, { status: 400 });
    }

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
    return NextResponse.json({ error: error?.message || "Upload failed." }, { status: 500 });
  }
}
