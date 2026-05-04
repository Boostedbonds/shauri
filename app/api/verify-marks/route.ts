/**
 * app/api/verify-marks/route.ts
 *
 * CLEAN + UPDATED VERSION
 * - Groq = primary
 * - 12MB file limit
 * - Stable parsing
 * - Clear user errors
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const runtime = "nodejs";

// ---------- CONFIG ----------
const MAX_SIZE = 12 * 1024 * 1024; // 12MB

// Basic extraction (safe fallback)
function extractText(file: File, buffer: Buffer): string {
  const mimeType = (file.type || "").toLowerCase();
  const fileName = (file.name || "").toLowerCase();

  try {
    if (mimeType.includes("pdf") || fileName.endsWith(".pdf")) {
      return buffer.toString("utf-8").slice(0, 15000);
    }

    if (mimeType.startsWith("image/")) {
      return "[Image uploaded – interpret visually]";
    }

    return buffer.toString("utf-8").slice(0, 15000);
  } catch {
    return "[Could not extract text]";
  }
}

async function callGroq(prompt: string): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) return null;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a strict CBSE board examiner." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  const groqText = await groqRes.text();
  if (!groqRes.ok) {
    console.error("[verify-marks] Groq error:", groqText.slice(0, 300));
    return null;
  }

  try {
    const data = JSON.parse(groqText);
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return groqText || null;
  }
}

async function callGemini(prompt: string): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    console.error("[verify-marks] Gemini error:", text.slice(0, 300));
    return null;
  }

  try {
    const data = JSON.parse(text);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

// ---------- MAIN API ----------

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const marks = Number(form.get("marks"));
    const total = Number(form.get("total"));
    const subject = String(form.get("subject") || "");
    const chapter = String(form.get("chapter") || "");
    const day = String(form.get("day") || "");
    const qpFile = form.get("qpFile");
    const asFile = form.get("asFile");

    if (
      !Number.isFinite(marks) ||
      !Number.isFinite(total) ||
      total <= 0 ||
      !(qpFile instanceof File) ||
      !(asFile instanceof File)
    ) {
      return NextResponse.json(
        { reply: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { reply: "Missing AI keys. Configure GROQ_API_KEY or GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    // ---------- SIZE CHECK ----------
    if (qpFile.size > MAX_SIZE || asFile.size > MAX_SIZE) {
      const qpSize = (qpFile.size / (1024 * 1024)).toFixed(2);
      const asSize = (asFile.size / (1024 * 1024)).toFixed(2);

      return NextResponse.json(
        {
          reply: `File too large.\n\nQuestion Paper: ${qpSize} MB\nAnswer Sheet: ${asSize} MB\n\nMax allowed: 12 MB each.\n\nTip: Upload images (JPG/PNG) or compress PDF.`,
        },
        { status: 413 }
      );
    }

    const qpBuffer = Buffer.from(await qpFile.arrayBuffer());
    const asBuffer = Buffer.from(await asFile.arrayBuffer());
    const qpText = extractText(qpFile, qpBuffer);
    const asText = extractText(asFile, asBuffer);

    const prompt = `
You are a strict CBSE examiner.

Subject: ${subject}
Chapter: ${chapter}
Day: ${day}

The student claims a score of ${marks}/${total}.

QUESTION PAPER:
${qpText}

STUDENT ANSWERS:
${asText}

Your tasks:
1. Check if the claimed score is correct
2. If incorrect, give correct score
3. List max 5 mistake topics
4. Give short improvement feedback

Reply EXACTLY in this format:

SCORE: X/Y
ERRORS: topic1, topic2
FEEDBACK: text
`;

    let reply = await callGroq(prompt);
    if (!reply) {
      console.log("[verify-marks] Groq unavailable, trying Gemini fallback.");
      reply = await callGemini(prompt);
    }

    if (!reply) {
      return NextResponse.json(
        { reply: "AI unavailable (Groq + Gemini). Try again shortly." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error("[verify-marks ERROR]:", err.message);

    return NextResponse.json(
      { reply: "Server error. Please try again." },
      { status: 500 }
    );
  }
}