import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { message, mode } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const prompt = `You are StudyMate in ${mode || "teacher"} mode.
CBSE Class 9 level.
Student question:
${message}`;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Gemini API failed", detail: text },
        { status: 500 }
      );
    }

    const data = JSON.parse(text);
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response generated.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server crashed", detail: String(err) },
      { status: 500 }
    );
  }
}
