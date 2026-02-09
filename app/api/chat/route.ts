import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // 🔥 REQUIRED FOR GEMINI

type Mode = "teacher" | "examiner" | "oral" | "progress";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, message } = body ?? {};

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !message) {
      return NextResponse.json(
        { error: "Missing message or GEMINI_API_KEY" },
        { status: 400 }
      );
    }

    const prompt = `
You are StudyMate in ${mode?.toUpperCase() || "TEACHER"} mode.
You teach CBSE Class 9 students clearly.

Student message:
${message}
`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
  } catch (err) {
    return NextResponse.json(
      { error: "Server exception" },
      { status: 500 }
    );
  }
}
