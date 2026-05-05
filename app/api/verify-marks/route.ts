/**
 * app/api/verify-marks/route.ts
 *
 * Accepts { qpUrl, asUrls[] } — asUrls is an array to support
 * multi-page handwritten answer sheets (one image per page).
 *
 * Strategy:
 * - QP (typed PDF)   → pdf-parse extracts text
 * - AS (images/PDF)  → sent as base64 to Gemini Vision (reads handwriting)
 * - Fallback         → Groq text-only if Gemini unavailable
 */
import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

/* -----------------------------
   EXTRACT TEXT FROM TYPED PDF
----------------------------- */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfModule = await import("pdf-parse");
    const pdfParse = (pdfModule as any).default || pdfModule;
    const parsed = await pdfParse(buffer);
    return parsed?.text?.slice(0, 15000) || "";
  } catch {
    return "[PDF parsing failed]";
  }
}

/* -----------------------------
   GEMINI VISION (primary)
   Sends QP text + all AS pages as base64 vision parts
----------------------------- */
async function callGeminiVision(
  qpText: string,
  asPages: { buffer: Buffer; mimeType: string }[],
  marks: number,
  total: number,
  subject: string,
  chapter: string,
  day: string
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return null;

  // Build one part per answer sheet page
  const asParts = asPages.map(({ buffer, mimeType }) => ({
    inlineData: {
      mimeType: mimeType.startsWith("image/") ? mimeType : "application/pdf",
      data: buffer.toString("base64"),
    },
  }));

  const promptText = `You are a strict CBSE board examiner checking a student's handwritten answer sheet.

Subject: ${subject}
Chapter/Topic: ${chapter}
Day: ${day}
Student's claimed score: ${marks}/${total}
Total answer sheet pages provided: ${asPages.length}

QUESTION PAPER TEXT:
${qpText}

The handwritten answer sheet pages are attached above (${asPages.length} page${asPages.length > 1 ? "s" : ""}). Read ALL pages carefully before scoring.

STRICT RULES:
- Read EVERY page of the answer sheet before scoring.
- For MCQs: each is worth exactly 1 mark. Compare student's option to the correct answer in the QP.
- For short/long answers: check content accuracy against the QP.
- Only deduct marks for answers that are genuinely wrong or incomplete.
- Do NOT hallucinate errors. If an answer is correct, say so.
- Be precise: state the question number, what the student wrote, what was correct, and exact marks affected.
- If you cannot read a page clearly, say so — do not guess.

Reply EXACTLY in this format (no extra text before or after):

SCORE: X/Y
DEDUCTIONS:
Q2: Student wrote (A), correct answer is (B). -1 mark (wrong option)
Q11: Definition incomplete — missing "without leaving a remainder". -1 mark
(write "None" if score is confirmed correct)
ERRORS: topic1, topic2
FEEDBACK: 2-3 sentences of specific advice based on actual mistakes only.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              ...asParts,          // all answer sheet pages as vision
              { text: promptText }, // QP text + instructions
            ],
          },
        ],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    console.error("[verify-marks] Gemini Vision error:", text.slice(0, 400));
    return null;
  }
  try {
    const data = JSON.parse(text);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

/* -----------------------------
   GROQ FALLBACK (text-only)
   Used only if Gemini is unavailable
----------------------------- */
async function callGroqFallback(
  qpText: string,
  asText: string,
  marks: number,
  total: number,
  subject: string,
  chapter: string,
  day: string
): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) return null;

  const prompt = `You are a strict CBSE board examiner.

Subject: ${subject} | Chapter: ${chapter} | Day: ${day}
Student claims: ${marks}/${total}

IMPORTANT: The answer sheet text below is OCR-extracted from a handwritten scan and is likely incomplete or garbled. 
Only mark deductions where you are 100% certain the answer is wrong.
Do NOT hallucinate deductions. If unsure, confirm the student's score.

QUESTION PAPER:
${qpText}

STUDENT ANSWERS (OCR — may be incomplete):
${asText}

Reply EXACTLY in this format:

SCORE: X/Y
DEDUCTIONS:
(list specific deductions, or write "None — handwriting could not be read clearly enough to verify")
ERRORS: topic1, topic2
FEEDBACK: text`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a strict CBSE examiner. Never hallucinate mark deductions." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[verify-marks] Groq error:", text.slice(0, 300));
    return null;
  }
  try {
    const data = JSON.parse(text);
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

/* -----------------------------
   MAIN API HANDLER
----------------------------- */
export async function POST(req: NextRequest) {
  const uploadedBlobs: string[] = [];

  try {
    const body = await req.json();
    const { marks, total, subject, chapter, day, qpUrl, asUrls } = body;

    // asUrls can be a single string (legacy) or array
    const asUrlList: string[] = Array.isArray(asUrls)
      ? asUrls
      : asUrls
      ? [asUrls]
      : body.asUrl
      ? [body.asUrl]
      : [];

    if (
      !Number.isFinite(marks) || !Number.isFinite(total) ||
      total <= 0 || !qpUrl || asUrlList.length === 0
    ) {
      return NextResponse.json({ reply: "Missing required fields." }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { reply: "Missing AI keys. Configure GROQ_API_KEY or GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    uploadedBlobs.push(qpUrl, ...asUrlList);

    // ── Fetch QP ──
    const qpRes = await fetch(qpUrl);
    if (!qpRes.ok) throw new Error("Failed to fetch question paper from Blob.");
    const qpBuffer = Buffer.from(await qpRes.arrayBuffer());
    const qpText = await extractPdfText(qpBuffer);

    // ── Fetch all AS pages ──
    const asPages: { buffer: Buffer; mimeType: string }[] = [];
    for (const url of asUrlList) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Failed to fetch answer sheet page from Blob.`);
      const contentType = r.headers.get("content-type") || "image/jpeg";
      const buffer = Buffer.from(await r.arrayBuffer());
      asPages.push({ buffer, mimeType: contentType });
    }

    // ── Try Gemini Vision (reads handwriting) ──
    let reply = await callGeminiVision(
      qpText, asPages, marks, total, subject, chapter, day
    );

    // ── Fallback to Groq text-only ──
    if (!reply) {
      console.log("[verify-marks] Gemini Vision failed, falling back to Groq.");
      const pdfModule = await import("pdf-parse");
      const pdfParse = (pdfModule as any).default || pdfModule;
      let asText = "[Could not extract text from handwritten answer sheet]";
      // Try to extract text from first page only as best effort
      try {
        const parsed = await pdfParse(asPages[0].buffer);
        asText = parsed?.text?.slice(0, 15000) || asText;
      } catch {}
      reply = await callGroqFallback(qpText, asText, marks, total, subject, chapter, day);
    }

    if (!reply) {
      return NextResponse.json(
        { reply: "AI unavailable (Gemini + Groq both failed). Try again shortly." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error("[verify-marks ERROR]:", err.message);
    return NextResponse.json({ reply: "Server error. Please try again." }, { status: 500 });

  } finally {
    if (uploadedBlobs.length > 0) {
      await Promise.all(uploadedBlobs.map((url) => del(url))).catch((e) =>
        console.warn("[verify-marks] Blob cleanup failed:", e)
      );
    }
  }
}