import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topics, classLevel, subject, difficulty, marks } = body as {
    topics: string[];
    classLevel?: string | number;
    subject?: string;
    difficulty?: "easy" | "moderate" | "hard";
    marks?: number;
  };
  const cls = classLevel || "10";
  const totalMarks = Number.isFinite(marks) && (marks as number) > 0 ? Number(marks) : 20;

  const prompt = `
You are Shauri in PRACTICE MODE.

Generate a CBSE Class ${cls} board-style practice mini-test strictly from NCERT and syllabus scope.

Rules:
• Subject: ${subject || "General"}
• Topics: ${topics?.join(", ") || "General practice scope"}
• Difficulty target: ${difficulty || "moderate"}
• Total marks: ${totalMarks}
• Use STRICT CBSE wording and section labels.
• Include mix:
  – MCQ (with one assertion-reason OR case-based MCQ)
  – Very short answer (2 marks style)
  – Short answer (3 marks style)
• Keep competency-based framing and board authenticity.
• No future-topic contamination outside provided scope.
• Do NOT provide answers or hints.
• Output ONLY the test paper with clean sectioning and marks.
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
