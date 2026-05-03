/**
 * app/api/verify-marks/route.ts
 *
 * Dedicated route for ManualMarksModal AI verification.
 *
 * TWO-STEP PIPELINE (matches the rest of the codebase):
 *   Step 1 — Gemini Vision: OCR both files (question paper + answer sheet)
 *             into plain text. Gemini handles images and PDFs natively.
 *   Step 2 — Groq (llama-3.3-70b): Evaluate the extracted text and
 *             verify/correct the claimed score. Groq is used for all
 *             reasoning in this codebase.
 *
 * Body size limit is set globally in next.config.ts:
 *   experimental: { serverActions: { bodySizeLimit: "100mb" } }
 */
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────
// STEP 1 — Gemini Vision OCR
// Extracts text from an image or PDF base64 data URL.
// For PDFs, uses the Gemini Files API (required for PDFs).
// For images, uses inline_data directly.
// ─────────────────────────────────────────────────────────────

async function uploadPdfToGemini(
  base64Data: string,
  mimeType: string,
  geminiKey: string
): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");

  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(buffer.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: "shauri-upload" } }),
    }
  );

  const uploadUrl = initRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Failed to initiate Gemini file upload");

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(buffer.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
      "Content-Type": mimeType,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Gemini PDF upload failed: ${errText}`);
  }

  const data = await uploadRes.json();
  const uri  = data?.file?.uri;
  if (!uri) throw new Error("No URI returned from Gemini file upload");
  return uri;
}

async function extractTextWithGemini(
  base64Data: string,
  mimeType: string,
  label: string,
  geminiKey: string
): Promise<string> {
  const ocrPrompt = `Extract ALL text from this ${label} exactly as written. Include every question, answer, number, and marking. Do not summarize — transcribe everything verbatim.`;

  let filePart: object;
  if (mimeType === "application/pdf") {
    const fileUri = await uploadPdfToGemini(base64Data, mimeType, geminiKey);
    filePart = { file_data: { mime_type: mimeType, file_uri: fileUri } };
  } else {
    filePart = { inline_data: { mime_type: mimeType, data: base64Data } };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: ocrPrompt }, filePart],
        }],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini OCR failed for ${label}: ${errText}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || `[Could not extract text from ${label}]`;
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — Groq Evaluation
// Takes extracted text from both files and verifies the score.
// Uses llama-3.3-70b-versatile — same model as the rest of the app.
// ─────────────────────────────────────────────────────────────

async function evaluateWithGroq(
  questionPaperText: string,
  answerSheetText: string,
  marks: number,
  total: number,
  subject: string,
  chapter: string,
  day: number,
  groqKey: string
): Promise<string> {
  const systemPrompt = `You are a strict CBSE examiner verifying a student's self-reported exam score.
You will be given the question paper text and the student's answer sheet text.
Your job is to check if the claimed score is accurate, identify errors, and give feedback.
Always reply in the EXACT format requested — nothing before or after.`;

  const userPrompt = [
    `Subject: ${subject}. Chapter: ${chapter}. Day ${day}.`,
    `Student claims: ${marks} out of ${total}.`,
    ``,
    `=== QUESTION PAPER ===`,
    questionPaperText.slice(0, 4000),
    ``,
    `=== STUDENT'S ANSWER SHEET ===`,
    answerSheetText.slice(0, 4000),
    ``,
    `Instructions:`,
    `1. Check if the claimed score of ${marks}/${total} is accurate based on the answers given.`,
    `2. If wrong, give the correct score.`,
    `3. List specific topics/concepts where errors were found (max 5, comma separated).`,
    `4. Give brief, actionable feedback on what to revise.`,
    ``,
    `Reply in this EXACT format (nothing else before or after):`,
    `SCORE: X/Y`,
    `ERRORS: topic1, topic2, topic3`,
    `FEEDBACK: your feedback here`,
  ].join("\n");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
      temperature: 0.2,
      max_tokens:  500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq evaluation failed: ${errText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

// ─────────────────────────────────────────────────────────────
// MAIN POST HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Safe JSON parse ──
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
    return NextResponse.json({ reply: "Missing required fields." }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey   = process.env.GROQ_API_KEY;

  if (!geminiKey) {
    return NextResponse.json({ reply: "Gemini API key not configured." }, { status: 500 });
  }
  if (!groqKey) {
    return NextResponse.json({ reply: "Groq API key not configured." }, { status: 500 });
  }

  // ── Parse data URLs ──
  function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
  }

  const qp  = parseDataUrl(qpFile);
  const as_ = parseDataUrl(asFile);

  if (!qp || !as_) {
    return NextResponse.json(
      { reply: "Invalid file format. Please re-upload your files." },
      { status: 400 }
    );
  }

  try {
    console.log("[verify-marks] Step 1: Extracting text with Gemini Vision...");

    // Step 1 — OCR both files in parallel with Gemini
    const [questionPaperText, answerSheetText] = await Promise.all([
      extractTextWithGemini(qp.data,  qp.mimeType,  "question paper", geminiKey),
      extractTextWithGemini(as_.data, as_.mimeType, "answer sheet",   geminiKey),
    ]);

    console.log("[verify-marks] Step 1 complete. QP chars:", questionPaperText.length, "AS chars:", answerSheetText.length);
    console.log("[verify-marks] Step 2: Evaluating with Groq...");

    // Step 2 — Evaluate with Groq
    const reply = await evaluateWithGroq(
      questionPaperText,
      answerSheetText,
      parseInt(String(marks)),
      parseInt(String(total)),
      subject,
      chapter,
      day,
      groqKey
    );

    console.log("[verify-marks] Step 2 complete. Reply:", reply.slice(0, 200));

    if (!reply) {
      return NextResponse.json(
        { reply: "AI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error("[api/verify-marks] Error:", err);
    return NextResponse.json(
      { reply: `Verification failed: ${err.message || "Please try again."}` },
      { status: 500 }
    );
  }
}