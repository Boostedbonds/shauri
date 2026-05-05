/**
 * app/api/upload-blob/route.ts
 *
 * Receives a single file from the frontend, uploads it to Vercel Blob,
 * and returns the public URL. verify-marks then uses this URL instead
 * of receiving raw file bytes (which caused FUNCTION_PAYLOAD_TOO_LARGE).
 */
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_SIZE = 12 * 1024 * 1024; // 12MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max 12 MB.` },
        { status: 413 }
      );
    }

    const blob = await put(`verify-${crypto.randomUUID()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error("[upload-blob error]:", err);
    return NextResponse.json({ error: err?.message || "Upload failed." }, { status: 500 });
  }
}