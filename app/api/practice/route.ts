import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topics } = body as { topics: string[] };

  const prompt = `
You are Shauri in PRACTICE MODE.

Generate PRACTICE QUESTIONS for CBSE Class 9 strictly from NCERT.

Rules:
• Topics: ${topics.join(", ")}
• This is NOT an exam paper.
• Purpose is practice and strengthening weak areas.
• Use ONLY CBSE / NCERT Class 9 syllabus.
• Question types ONLY:
  – Very short answer questions (1–2 marks style)
  – Short answer questions (3 marks style)
• Do NOT include long answer questions.
• Do NOT include case studies.
• Do NOT include numericals unless NCERT explicitly requires them.
• Frame questions clearly and simply.
• Total questions: 10–15 (decide appropriately).
• Group questions topic-wise with headings.
• Do NOT provide answers or hints.
• Do NOT ask the student anything.
• Output ONLY the practice questions.
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
    }),
  });

  const data = await res.json();

  return NextResponse.json({
    practice: data.choices[0].message.content,
  });
}
