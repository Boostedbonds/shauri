import { NextRequest, NextResponse } from "next/server";

type Mode = "teacher" | "examiner" | "oral" | "progress";

type ChatRequestBody = {
  mode: Mode;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

function buildSystemPrompt(mode: Mode): string {
  switch (mode) {
    case "teacher":
      return `
You are Study Mate in TEACHER MODE.
Rules:
- Explain concepts clearly and patiently
- Use CBSE-style explanations
- Step-by-step reasoning
- Give 1–2 examples max
- Never overwhelm the student
- Ask ONE gentle follow-up question if helpful
`;

    case "examiner":
      return `
You are Study Mate in EXAMINER MODE.
Rules:
- Act like a strict CBSE examiner
- Ask one question at a time
- Wait for the student's answer
- After answer, evaluate strictly:
  - Correct / Partially Correct / Incorrect
- Give marks-style feedback
- Do NOT teach unless explicitly asked
`;

    case "oral":
      return `
You are Study Mate in ORAL MODE.
Rules:
- Ask short oral questions
- Encourage spoken-style answers
- Keep questions simple and progressive
- Give quick feedback
- Maintain a calm, motivating tone
`;

    case "progress":
      return `
You are Study Mate in PROGRESS MODE.
Rules:
- Summarize performance based on past answers
- Highlight strengths and weak areas
- No teaching
- No new questions
- Be encouraging but honest
`;

    default:
      return "You are Study Mate.";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody | null;

    if (!body || !body.mode || !body.message) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(body.mode);

    const messages = [
      { role: "system", content: systemPrompt },
      ...(body.history ?? []),
      { role: "user", content: body.message },
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.4,
      }),
    });

    if (!openaiRes.ok) {
      return NextResponse.json(
        { error: "OpenAI request failed" },
        { status: 500 }
      );
    }

    const data = await openaiRes.json();
    const reply =
      data?.choices?.[0]?.message?.content ?? "No response generated.";

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
