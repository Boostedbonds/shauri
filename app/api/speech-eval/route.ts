import { NextRequest, NextResponse } from "next/server";
import { evaluatePhonemePronunciation } from "@/app/lib/phonemeEval";

async function blobToBase64(blob: Blob) {
  const arr = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  arr.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const transcript = String(form.get("transcript") || "").trim();
    const expectedTermsRaw = String(form.get("expectedTerms") || "[]");
    const durationMs = Number(form.get("durationMs") || 0);
    const pauses = Number(form.get("pauses") || 0);
    const subject = String(form.get("subject") || "General");

    const expectedTerms = (() => {
      try { return JSON.parse(expectedTermsRaw); } catch { return []; }
    })();

    const audio = form.get("audio") as File | null;
    let audioMeta: Record<string, unknown> = {};

    if (audio && audio.size > 0) {
      audioMeta = {
        hasAudio: true,
        mimeType: audio.type,
        size: audio.size,
      };
      if (audio.size <= 1024 * 1024 * 2) {
        const b64 = await blobToBase64(audio);
        audioMeta.samplePreview = b64.slice(0, 120);
      }
    }

    const evalResult = evaluatePhonemePronunciation({
      transcript,
      expectedTerms: Array.isArray(expectedTerms) ? expectedTerms : [],
      durationMs: Number.isFinite(durationMs) ? durationMs : 0,
      pauses: Number.isFinite(pauses) ? pauses : 0,
      subject,
    });

    return NextResponse.json({
      ok: true,
      evaluation: evalResult,
      metadata: {
        subject,
        transcriptLength: transcript.length,
        ...audioMeta,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Speech evaluation failed" }, { status: 500 });
  }
}
