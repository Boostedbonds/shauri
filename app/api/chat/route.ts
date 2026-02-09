import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Mode = "teacher" | "examiner" | "oral" | "progress";

type ChatRequestBody = {
  mode?: Mode;
  message?: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

function buildSystemPrompt(mode: Mode): string {
  switch (mode) {
    case "teacher":
      return "You are StudyMate in TEACHER mode. Explain clearly, step by step, CBSE style.";
    case "examiner":
      return "You are StudyMate in EXAMINER mode. Ask one question at a time. Evaluate strictly.";
    case "oral":
      return "You are StudyMate in ORAL mode. Ask short oral questions and give quick feedback.";
    case "progress":
      return "You are StudyMate in PROGRESS mode. Summarize performance only.";
    default:
      return "You are StudyMate.";
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY missing" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as ChatRequestBody | null;

    if (!body?.mode || !body?.message?.trim()) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const messages = [
      { role: "system", content: buildSystemPrompt(body.mode) },
      ...(body.history ?? []),
      { role: "user", content: body.message },
    ];

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages,
          temperature: 0.4,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ??
      "No response generated.";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
