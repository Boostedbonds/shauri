import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Mode = "teacher" | "examiner" | "oral" | "progress";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, message } = body ?? {};

    if (!message || !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing message or GEMINI_API_KEY" },
        { status: 400 }
      );
    }

    const prompt = `
You are StudyMate in ${mode?.toUpperCase() || "TEACHER"} mode.
You help CBSE Class 9 students.
Explain clearly, step-by-step.

Student question:
${message}
`;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: "Gemini API failed", detail: errorText },
        { status: 500 }
      );
    }

    const data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response generated.";

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      { error: "Server crash", detail: String(err) },
      { status: 500 }
    );
  }
}
