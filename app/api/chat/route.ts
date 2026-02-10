import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name: string;
  class: string;
  board: string;
};

/* ================= GLOBAL CBSE / NCERT CONTEXT ================= */

const GLOBAL_CBSE_CONTEXT = `
You are StudyMate, a CBSE-based AI learning platform.

Primary authority:
- NCERT textbooks
- CBSE official syllabus and exam patterns

Uploaded PDFs or images (if provided):
- Use them as priority reference
- Never refuse or limit answers because something was not uploaded

Always adapt explanations, difficulty, and language
based on the student's class.

Stay strictly within CBSE & NCERT scope.
`;

/* ================= MODE PROMPTS ================= */

const TEACHER_MODE_SYSTEM_PROMPT = `
You are StudyMate in TEACHER MODE.
Teach according to the student's CBSE class syllabus.
Use simple, age-appropriate language.
Use examples, stories, and step-by-step explanations.
Ask 2–3 short revision questions.
Do NOT conduct tests or exams.
`;

const EXAMINER_MODE_SYSTEM_PROMPT = `
You are StudyMate in EXAMINER MODE acting as a CBSE board examiner.
Generate papers strictly from the student's CBSE class syllabus.

On START / YES / BEGIN:
Generate the FULL question paper in ONE message.

After that:
Enter SILENT EXAM MODE.
Evaluate ONLY after SUBMIT / DONE / END TEST.
`;

const ORAL_MODE_SYSTEM_PROMPT = `
You are StudyMate in ORAL MODE.
Teach verbally and conversationally.
Keep explanations short and age-appropriate.
`;

const PROGRESS_MODE_SYSTEM_PROMPT = `
You are StudyMate in PROGRESS DASHBOARD MODE.
Always identify the student by name and class.
Summarize subject-wise and chapter-wise progress.
Do NOT teach or generate questions.
`;

/* ================= GEMINI CALL ================= */

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    "No response generated."
  );
}

/* ================= API HANDLER ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode, student } = body as {
      messages: ChatMessage[];
      mode: string;
      student?: StudentContext;
    };

    const systemMessages: ChatMessage[] = [];

    if (student?.name && student?.class) {
      systemMessages.push({
        role: "system",
        content: `Student Profile:
Name: ${student.name}
Class: ${student.class}
Board: ${student.board ?? "CBSE"}`,
      });
    }

    systemMessages.push({
      role: "system",
      content: GLOBAL_CBSE_CONTEXT,
    });

    if (mode === "teacher") {
      systemMessages.push({
        role: "system",
        content: TEACHER_MODE_SYSTEM_PROMPT,
      });
    }

    if (mode === "examiner") {
      systemMessages.push({
        role: "system",
        content: EXAMINER_MODE_SYSTEM_PROMPT,
      });
    }

    if (mode === "oral") {
      systemMessages.push({
        role: "system",
        content: ORAL_MODE_SYSTEM_PROMPT,
      });
    }

    if (mode === "progress") {
      systemMessages.push({
        role: "system",
        content: PROGRESS_MODE_SYSTEM_PROMPT,
      });
    }

    const finalMessages = [...systemMessages, ...messages];

    const reply = await callGemini(finalMessages);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { reply: "AI server error. Please try again." },
      { status: 500 }
    );
  }
}
