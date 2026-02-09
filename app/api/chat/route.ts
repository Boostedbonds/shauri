import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Mode = "teacher" | "examiner" | "oral" | "progress";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, message } = body ?? {};

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const prompt = `
You are StudyMate in ${(mode as Mode)?.toUpperCase() || "TEACHER"} mode.
Teach clearly to a CBSE Class 9 student.

Student:
${message}
`;

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const raw = await geminiRes.text();

    if (!geminiRes.ok) {
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
  } catch (err) {
    return NextResponse.json(
      { error: "Server crashed", detail: String(err) },
      { status: 500 }
    );
  }
}
