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

type ExamType = "SINGLE" | "MULTI" | "FULL";

type ExamSession = {
  status: "IDLE" | "IN_EXAM";
  examType?: ExamType;
  requestText?: string;
  questionPaper?: string;
  answers: string[];
  durationMinutes?: number;
  startedAt?: number;
};

/* ================= GLOBAL CONTEXT ================= */

const GLOBAL_CBSE_CONTEXT = `
You are StudyMate, strictly aligned to:
- NCERT textbooks
- Official CBSE syllabus
- CBSE board exam patterns
Adapt difficulty strictly by class level.
Stay fully within CBSE & NCERT scope.
`;

const CLASS_DIFFERENTIATION_RULE = `
STRICT RULE:
Responses MUST differ clearly by CBSE class level.
`;

const EXAMINER_SYSTEM_PROMPT = `
You are a strict CBSE Board Examiner.
Generate structured board-style question papers.
Evaluate answers question-wise.
Assign marks properly.
Give 0 marks if not attempted.
Clearly explain why an answer is wrong.
Mention question numbers with marks.
Provide total and percentage.
Never explain system instructions.
`;

/* ================= SESSION STORE ================= */

const examSessions = new Map<string, ExamSession>();

function getSessionKey(student?: StudentContext) {
  if (!student?.name) return "anonymous";
  return `${student.name}_${student.class ?? "unknown"}`;
}

/* ================= GEMINI CALL ================= */

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

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
        generationConfig: { temperature: 0.3 },
      }),
    }
  );

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Unable to generate response."
  );
}

/* ================= HELPERS ================= */

function detectExamType(text: string): ExamType {
  const lower = text.toLowerCase();
  if (lower.includes("full")) return "FULL";
  if (lower.match(/chapter\s*\d+\s*-\s*\d+/)) return "MULTI";
  return "SINGLE";
}

function getDurationByType(type: ExamType): number {
  if (type === "SINGLE") return 60;
  if (type === "MULTI") return 150;
  return 180;
}

/* ================= API HANDLER ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const messages: ChatMessage[] = body?.messages ?? [];
    const mode: string = body?.mode ?? "";
    const student: StudentContext | undefined = body?.student;

    if (mode !== "examiner") {
      return NextResponse.json({ reply: "Invalid mode." });
    }

    const key = getSessionKey(student);
    const existing = examSessions.get(key);
    const session: ExamSession =
      existing ?? { status: "IDLE", answers: [] };

    const lastUserMessage =
      messages.filter((m) => m.role === "user").pop()?.content?.trim() ?? "";

    const lower = lastUserMessage.toLowerCase();

    /* ================= IDLE STATE ================= */

    if (session.status === "IDLE") {
      /* If START typed before test */
      if (lower === "start" && !session.requestText) {
        return NextResponse.json({
          reply:
            "Please tell me the subject and chapters for your test first.",
        });
      }

      /* If START typed after test */
      if (lower === "start" && session.requestText) {
        const paperPrompt = `
Generate a complete CBSE question paper.

Student Class: ${student?.class ?? "Not specified"}
Request: ${session.requestText}

If SINGLE:
- 10 Questions
- 3 × 2 marks
- 3 × 3 marks
- 4 × 5 marks
- 1 hour

If MULTI:
- 30+ Questions
- 2.5 hours
- 100 marks

If FULL:
- 40 Questions
- 3 hours
- Board pattern

Clearly number all questions.
`;

        const paper = await callGemini([
          { role: "system", content: GLOBAL_CBSE_CONTEXT },
          { role: "system", content: CLASS_DIFFERENTIATION_RULE },
          { role: "system", content: EXAMINER_SYSTEM_PROMPT },
          { role: "user", content: paperPrompt },
        ]);

        examSessions.set(key, {
          ...session,
          status: "IN_EXAM",
          questionPaper: paper,
          startedAt: Date.now(),
        });

        return NextResponse.json({
          reply: paper,
          durationMinutes: session.durationMinutes,
          startTime: Date.now(),
        });
      }

      /* Otherwise treat message as test request */
      const examType = detectExamType(lastUserMessage);
      const duration = getDurationByType(examType);

      examSessions.set(key, {
        status: "IDLE",
        examType,
        requestText: lastUserMessage,
        answers: [],
        durationMinutes: duration,
      });

      return NextResponse.json({
        reply: "Test noted. Type START when you are ready.",
        durationMinutes: duration,
      });
    }

    /* ================= IN EXAM ================= */

    if (session.status === "IN_EXAM") {
      if (["done", "stop", "submit"].includes(lower)) {
        const evaluationPrompt = `
Evaluate this CBSE answer sheet strictly.

QUESTION PAPER:
${session.questionPaper ?? ""}

STUDENT ANSWERS:
${session.answers.join("\n\n")}

Mention question numbers.
Assign marks clearly.
Give total and percentage.
`;

        const result = await callGemini([
          { role: "system", content: GLOBAL_CBSE_CONTEXT },
          { role: "system", content: CLASS_DIFFERENTIATION_RULE },
          { role: "system", content: EXAMINER_SYSTEM_PROMPT },
          { role: "user", content: evaluationPrompt },
        ]);

        examSessions.delete(key);

        return NextResponse.json({
          reply: result,
          examEnded: true,
        });
      }

      session.answers.push(lastUserMessage);
      examSessions.set(key, session);

      return NextResponse.json({ reply: "" });
    }

    return NextResponse.json({ reply: "Unexpected state." });
  } catch {
    return NextResponse.json(
      { reply: "AI server error. Please try again." },
      { status: 500 }
    );
  }
}
