import { NextRequest, NextResponse } from "next/server";

/* ================= TYPES ================= */

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name?: string;
  class?: string;
  board?: string;
};

type ExamSession = {
  status: "IDLE" | "READY" | "IN_EXAM";
  subjectRequest?: string;
  questionPaper?: string;
  answers: string[];
  startedAt?: number;
};

/* ================= GLOBAL ================= */

const GLOBAL_CONTEXT = `
You are Shauri, aligned strictly to NCERT & CBSE.
Always adapt to student's class.
`;

/* ================= PROMPTS ================= */

const TEACHER_PROMPT = `
You are a REAL human CBSE teacher.

BEHAVIOR:
- Talk like a real teacher (not robotic)
- If student chats → reply briefly, then guide to study
- Teach step-by-step
- DO NOT dump full chapter

TEACHING:
- Explain ONE concept at a time
- Use simple language
- Keep 2–4 points only
- Then ask exactly 2 short questions

STYLE:
- Calm, human, mentor-like
`;

const EXAM_PAPER_PROMPT = `
Generate a FULL CBSE question paper.

Rules:
- Cover ALL chapters
- Proper sections (A, B, C)
- Mix of MCQ, short, long
- Mention total marks
- Board-level difficulty
`;

/* ================= SESSION ================= */

const examSessions = new Map<string, ExamSession>();

function getSessionKey(student?: StudentContext) {
  return `${student?.name ?? "anon"}_${student?.class ?? "0"}`;
}

/* ================= HELPERS ================= */

function isGreeting(text: string) {
  return ["hi", "hello", "hey"].includes(text);
}

function looksLikeSubject(text: string) {
  const keywords = [
    "class",
    "chapter",
    "science",
    "math",
    "history",
    "civics",
    "geo",
  ];
  return keywords.some((k) => text.includes(k));
}

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI error.";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    }
  );

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Error.";
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode: string = body?.mode ?? "";
    const student: StudentContext | undefined = body?.student;

    const history: ChatMessage[] =
      Array.isArray(body?.history) ? body.history : [];

    const message: string = body?.message ?? "";
    const lower = message.toLowerCase().trim();

    const studentName = student?.name ?? "Student";

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      // Greeting fix
      if (isGreeting(lower)) {
        return NextResponse.json({
          reply: `Hi ${studentName} 👋 Ready to learn today?`,
        });
      }

      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        {
          role: "system",
          content: `Student: ${student?.name ?? ""}, Class ${student?.class ?? ""}`,
        },
        ...history,
        { role: "user", content: message },
      ]);

      return NextResponse.json({ reply });
    }

    /* ================= EXAMINER ================= */

    if (mode === "examiner") {
      const key = getSessionKey(student);
      const existing = examSessions.get(key);
      const session: ExamSession =
        existing ?? { status: "IDLE", answers: [] };

      const isSubmit = ["submit", "done", "finish"].includes(lower);

      // Greeting should NOT trigger subject
      if (isGreeting(lower)) {
        return NextResponse.json({
          reply: `Hello ${studentName}. Please provide subject and chapters for the test.`,
        });
      }

      /* ===== SUBMIT ===== */

      if (isSubmit && session.status === "IN_EXAM") {
        const evaluationPrompt = `
Evaluate this CBSE answer sheet strictly.

QUESTION PAPER:
${session.questionPaper}

STUDENT ANSWERS:
${session.answers.join("\n\n")}

Return marks and feedback.
`;

        const result = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "user", content: evaluationPrompt },
        ]);

        examSessions.delete(key);

        return NextResponse.json({ reply: result });
      }

      /* ===== DURING EXAM ===== */

      if (session.status === "IN_EXAM") {
        session.answers.push(message);
        examSessions.set(key, session);
        return NextResponse.json({ reply: "" });
      }

      /* ===== SUBJECT INPUT ===== */

      if (looksLikeSubject(lower) && session.status === "IDLE") {
        examSessions.set(key, {
          status: "READY",
          subjectRequest: message,
          answers: [],
        });

        return NextResponse.json({
          reply: "Subject noted. Type START to begin.",
        });
      }

      /* ===== START ===== */

      if (lower === "start" && session.status === "READY") {
        const paper = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAM_PAPER_PROMPT },
          {
            role: "user",
            content: `Create paper for ${session.subjectRequest}`,
          },
        ]);

        examSessions.set(key, {
          status: "IN_EXAM",
          subjectRequest: session.subjectRequest,
          questionPaper: paper,
          answers: [],
          startedAt: Date.now(),
        });

        return NextResponse.json({ reply: paper });
      }

      return NextResponse.json({
        reply: `Please provide subject and chapters.`,
      });
    }

    /* ================= PROGRESS ================= */

    if (mode === "progress") {
      const attempts = body?.attempts ?? [];

      const summary = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        {
          role: "user",
          content: `Analyze this student performance briefly:\n${JSON.stringify(
            attempts
          )}`,
        },
      ]);

      return NextResponse.json({ reply: summary });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json({ reply: "Server error." });
  }
}