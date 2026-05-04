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

// ---------- CONFIG ----------
const MAX_SIZE = 12 * 1024 * 1024; // 12MB

// ---------- HELPERS ----------

function parseDataUrl(dataUrl: string): { mimeType: string; data: Buffer } | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return null;

    return {
      mimeType: match[1],
      data: Buffer.from(match[2], "base64"),
    };
  } catch {
    return null;
  }
}

// Basic extraction (safe fallback)
function extractText(buffer: Buffer, mimeType: string): string {
  try {
    if (mimeType === "application/pdf") {
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

// ---------- MAIN API ----------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { marks, total, subject, chapter, day, qpFile, asFile } = body;

    if (!marks || !total || !qpFile || !asFile) {
      return NextResponse.json(
        { reply: "Missing required fields." },
        { status: 400 }
      );
    }

    const qpParsed = parseDataUrl(qpFile);
    const asParsed = parseDataUrl(asFile);

    if (!qpParsed || !asParsed) {
      return NextResponse.json(
        { reply: "Invalid file format. Please re-upload." },
        { status: 400 }
      );
    }

    // ---------- SIZE CHECK ----------
    if (qpParsed.data.length > MAX_SIZE || asParsed.data.length > MAX_SIZE) {
      const qpSize = (qpParsed.data.length / (1024 * 1024)).toFixed(2);
      const asSize = (asParsed.data.length / (1024 * 1024)).toFixed(2);

      return NextResponse.json(
        {
          reply: `File too large.\n\nQuestion Paper: ${qpSize} MB\nAnswer Sheet: ${asSize} MB\n\nMax allowed: 12 MB each.\n\nTip: Upload images (JPG/PNG) or compress PDF.`,
        },
        { status: 413 }
      );
    }

    const qpText = extractText(qpParsed.data, qpParsed.mimeType);
    const asText = extractText(asParsed.data, asParsed.mimeType);

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

    // ---------- GROQ CALL ----------

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a strict CBSE board examiner.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    const groqText = await groqRes.text();

    if (!groqRes.ok) {
      return NextResponse.json(
        { reply: `Groq error: ${groqText.slice(0, 200)}` },
        { status: 500 }
      );
    }

    let reply = "";

    try {
      const data = JSON.parse(groqText);
      reply = data?.choices?.[0]?.message?.content || "";
    } catch {
      reply = groqText;
    }

    if (!reply) {
      return NextResponse.json(
        { reply: "AI returned empty response. Try again." },
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