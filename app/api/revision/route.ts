import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topics } = body as { topics: string[] };

  const prompt = `
You are StudyMate in REVISION MODE.

Generate revision notes for CBSE Class 9 strictly from NCERT.

Rules:
• Topics to revise: ${topics.join(", ")}
• This is NOT an exam.
• Purpose is revision and clarity.
• Use ONLY CBSE / NCERT Class 9 content.
• Structure revision as:
  1. Key definitions
  2. Important points
  3. Short daily-life examples (home / sports / surroundings)
  4. Common mistakes to avoid
  5. Final 5-line quick recap
• Language must be student-friendly but board-accurate.
• Do NOT ask questions.
• Do NOT evaluate.
• Do NOT add extra chapters.
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
    revision: data.choices[0].message.content,
  });
}
