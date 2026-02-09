import { NextRequest, NextResponse } from "next/server";

type Mode = "teacher" | "examiner" | "oral" | "progress";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, message } = body ?? {};

    if (!message || !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing input or API key" },
        { status: 400 }
      );
    }

    const prompt = `
You are StudyMate in ${mode?.toUpperCase() || "TEACHER"} mode.
Respond clearly for a CBSE Class 9 student.

Student message:
${message}
`;

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: "Gemini API failed", detail: err },
        { status: 500 }
      );
    }

    const data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response generated.";

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: "Server crash" },
      { status: 500 }
    );
  }
}
