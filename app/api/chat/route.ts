import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // REQUIRED

export async function POST(req: NextRequest) {
  try {
    const { message, mode } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message missing" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not found" },
        { status: 500 }
      );
    }

    const prompt = `
You are StudyMate in ${mode?.toUpperCase() || "TEACHER"} mode.
Explain clearly for a CBSE Class 9 student.

Student:
${message}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey, // ✅ CORRECT AUTH
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

    const raw = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Gemini API failed", detail: raw },
        { status: 500 }
      );
    }

    const data = JSON.parse(raw);
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response generated.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
