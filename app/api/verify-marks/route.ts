/**
 * app/api/verify-marks/route.ts
 *
 * Dedicated route for ManualMarksModal AI verification.
 * Handles large base64 PDF/image payloads separately from /api/chat
 * to avoid "Request Entity Too Large" errors.
 *
 * Body size limit is set globally in next.config.ts:
 *   experimental: { serverActions: { bodySizeLimit: "100mb" } }
 */
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // ── Safe JSON parse — returns clean 413 instead of crashing
  // with "Unexpected token 'R', Request En..." ──
  let body: any;
  try {
    body = await req.json();
  } catch (err: any) {
    console.error("[api/verify-marks] Failed to parse body:", err);
    return NextResponse.json(
      { reply: "⚠️ Files are too large to process. Please compress your PDFs or use photos instead." },
      { status: 413 }
    );
  }

  const { marks, total, subject, chapter, day, qpFile, asFile } = body;

  if (!marks || !total || !qpFile || !asFile) {
    return NextResponse.json(
      { reply: "Missing required fields." },
      { status: 400 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { reply: "AI verification is not configured." },
      { status: 500 }
    );
  }

  // ── Extract base64 data and mime type from data URL ──
  function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
  }

  const qp = parseDataUrl(qpFile);
  const as_ = parseDataUrl(asFile);

  if (!qp || !as_) {
    return NextResponse.json(
      { reply: "Invalid file format. Please re-upload your files." },
      { status: 400 }
    );
  }

  const prompt = [
    `Subject: ${subject}. Chapter: ${chapter}. Day ${day}.`,
    `Student says they scored ${marks} out of ${total}.`,
    `I am giving you the question paper and their answer sheet.`,
    `Please:`,
    `1. Check if the claimed score of ${marks}/${total} is accurate.`,
    `2. If wrong, give the correct score.`,
    `3. List the specific topics/concepts where errors were found (max 5, comma separated).`,
    `4. Give brief feedback on what to revise.`,
    ``,
    `Reply in this EXACT format (nothing else before or after):`,
    `SCORE: X/Y`,
    `ERRORS: topic1, topic2, topic3`,
    `FEEDBACK: your feedback here`,
  ].join("\n");

  try {
    const visionRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: qp.mimeType,  data: qp.data  } },
              { inline_data: { mime_type: as_.mimeType, data: as_.data } },
            ],
          }],
        }),
      }
    );

    if (!visionRes.ok) {
      const errText = await visionRes.text();
      console.error("[api/verify-marks] Gemini error:", errText);
      return NextResponse.json(
        { reply: "AI verification failed. Please try again." },
        { status: 500 }
      );
    }

    const visionData = await visionRes.json();
    const reply = visionData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!reply) {
      return NextResponse.json(
        { reply: "AI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error("[api/verify-marks] Unexpected error:", err);
    return NextResponse.json(
      { reply: "Verification failed. Please check your connection and try again." },
      { status: 500 }
    );
  }
}