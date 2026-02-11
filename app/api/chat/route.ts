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
  status: "IDLE" | "IN_EXAM";
  subjectRequest?: string;
  questionPaper?: string;
  answers: string[];
  startedAt?: number;
};

/* ================= GLOBAL CONTEXT ================= */

const GLOBAL_CONTEXT = `
You are StudyMate, aligned strictly to:
- NCERT textbooks
- Official CBSE syllabus
- CBSE board exam pattern

Adapt strictly by class level.
Never go outside CBSE scope.
`;

const EXAMINER_CONTEXT = `
You are a strict CBSE Board Examiner.

Rules:
- Generate proper structured board-style question paper.
- During exam: do not talk.
- Evaluate strictly.
- Mention each question number.
- Assign marks clearly.
- Give 0 if not attempted.
- Explain why marks are deducted.
- Provide total marks.
- Provide percentage.
- Provide time taken.
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
      // Greeting / normal conversation
      if (
        !lower.includes("start") &&
        !lower.includes("test") &&
        !lower.includes("exam")
      ) {
        const friendlyReply = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          {
            role: "system",
            content:
              "You are a friendly teacher talking normally. Do not explain any academic content. Just respond naturally.",
          },
          { role: "user", content: lastUserMessage },
        ]);

        return NextResponse.json({ reply: friendlyReply });
      }

      // If student writes START but no subject given
      if (lower === "start" && !session.subjectRequest) {
        return NextResponse.json({
          reply: "Please tell me the subject and chapters for your test first.",
        });
      }

      // If subject request given
      if (lower !== "start") {
        examSessions.set(key, {
          status: "IDLE",
          subjectRequest: lastUserMessage,
          answers: [],
        });

        return NextResponse.json({
          reply: "Test noted. Type START when you are ready.",
        });
      }

      // START → Generate paper immediately
      if (lower === "start" && session.subjectRequest) {
        const paperPrompt = `
Generate a complete CBSE question paper.

Class: ${student?.class ?? "Not specified"}
Subject Request: ${session.subjectRequest}

Follow CBSE board format.
Clearly number all questions.
Mention total marks.
Mention time allowed.
`;

        const paper = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_CONTEXT },
          { role: "user", content: paperPrompt },
        ]);

        const now = Date.now();

        examSessions.set(key, {
          status: "IN_EXAM",
          subjectRequest: session.subjectRequest,
          questionPaper: paper,
          answers: [],
          startedAt: now,
        });

        return NextResponse.json({
          reply: paper,
          startTime: now,
        });
      }
    }

    /* ================= IN EXAM ================= */

    if (session.status === "IN_EXAM") {
      // SUBMIT → evaluate
      if (
        ["submit", "done", "finished"].includes(lower)
      ) {
        const endTime = Date.now();
        const timeTakenSeconds = session.startedAt
          ? Math.floor((endTime - session.startedAt) / 1000)
          : 0;

        const evaluationPrompt = `
Evaluate this CBSE answer sheet strictly.

QUESTION PAPER:
${session.questionPaper ?? ""}

STUDENT ANSWERS:
${session.answers.join("\n\n")}

Also mention:
- Total marks obtained
- Percentage
- Time taken: ${timeTakenSeconds} seconds
`;

        const result = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_CONTEXT },
          { role: "user", content: evaluationPrompt },
        ]);

        examSessions.delete(key);

        return NextResponse.json({
          reply: result,
          examEnded: true,
          timeTakenSeconds,
        });
      }

      // During exam → stay silent
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
