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

Always adapt explanation strictly by student's class.
Never ask for class if already provided.
Never go outside CBSE scope.
`;

/* ================= MODE PROMPTS ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.
Explain clearly.
Use class-appropriate language.
Ask 2 short revision questions.
`;

const ORAL_PROMPT = `
You are in ORAL MODE.
Keep answers short and conversational.
`;

const PROGRESS_PROMPT = `
You are in PROGRESS MODE.
Analyze performance and provide structured insights only.
Do not teach.
`;

const EXAMINER_PROMPT = `
You are in EXAMINER MODE.

STRICT RULES FOR PAPER GENERATION:
- Use ONLY the chapters explicitly mentioned.
- DO NOT include any extra chapters.
- If user says exclude something (like graph, map, diagram), DO NOT include it.
- Do NOT assume additional chapters.
- Do NOT add sample/example content.
- Generate structured CBSE board-style paper only.

During exam:
- Stay completely silent.

On evaluation:
- Mention each question number.
- Assign marks clearly.
- Give 0 if not attempted.
- Explain why marks were deducted.
- Suggest improvements.
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
        generationConfig: { temperature: 0.2 },
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

function looksLikeSubjectRequest(text: string) {
  const keywords = [
    "chapter",
    "history",
    "science",
    "math",
    "geography",
    "civics",
    "economics",
    "english",
    "test",
  ];

  return keywords.some((k) => text.includes(k));
}

function askingIdentity(text: string) {
  return (
    text.includes("class") ||
    text.includes("name") ||
    text.includes("board") ||
    text.includes("do you know")
  );
}

/* ================= DURATION LOGIC ================= */

function calculateDurationMinutes(request: string): number {
  const chapterMatches = request.match(/chapter\s*\d+/gi);
  const chapterCount = chapterMatches ? chapterMatches.length : 1;

  if (chapterCount >= 4) return 150;
  if (chapterCount === 3) return 120;
  if (chapterCount === 2) return 90;
  return 60;
}

/* ================= API HANDLER ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const messages: ChatMessage[] = body?.messages ?? [];
    const mode: string = body?.mode ?? "";
    const student: StudentContext | undefined = body?.student;

    const lastUserMessage =
      messages.filter((m) => m.role === "user").pop()?.content?.trim() ?? "";

    const lower = lastUserMessage.toLowerCase();

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {
      const key = getSessionKey(student);
      const existing = examSessions.get(key);
      const session: ExamSession =
        existing ?? { status: "IDLE", answers: [] };

      /* ---------- IDLE ---------- */

      if (session.status === "IDLE") {
        if (["hi", "hello", "hey", "anyone"].includes(lower)) {
          const name = student?.name ?? "Student";
          const cls = student?.class ?? "Unknown";

          return NextResponse.json({
            reply: `Hi ${name}! You are in Class ${cls}. Ready for your test? Tell me the subject and chapters.`,
          });
        }

        if (askingIdentity(lower)) {
          const name = student?.name ?? "Unknown";
          const cls = student?.class ?? "Unknown";

          return NextResponse.json({
            reply: `Yes. You are ${name}, Class ${cls}. Ready for your test? Tell me the subject and chapters.`,
          });
        }

        if (lower === "start" && !session.subjectRequest) {
          return NextResponse.json({
            reply: "Please tell me the subject and chapters for your test.",
          });
        }

        if (lower === "start" && session.subjectRequest) {
          const duration = calculateDurationMinutes(session.subjectRequest);

          const paperPrompt = `
Generate a complete CBSE question paper.

Class: ${student?.class ?? "Not specified"}
User Request: ${session.subjectRequest}

STRICTLY:
- Use ONLY chapters mentioned in user request.
- If user excluded something (graph/map/diagram), do NOT include it.
- Do NOT include additional chapters.
- Follow CBSE board format.
- Clearly number all questions.
- Mention total marks.
- Mention time allowed: ${duration} minutes.
`;

          const paper = await callGemini([
            { role: "system", content: GLOBAL_CONTEXT },
            { role: "system", content: EXAMINER_PROMPT },
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
            durationMinutes: duration,
          });
        }

        if (looksLikeSubjectRequest(lower)) {
          examSessions.set(key, {
            status: "IDLE",
            subjectRequest: lastUserMessage,
            answers: [],
          });

          return NextResponse.json({
            reply: "Test noted. Type START to begin.",
          });
        }

        return NextResponse.json({
          reply:
            "Examiner Mode is for conducting tests. Please tell me the subject and chapters when ready.",
        });
      }

      /* ---------- IN EXAM ---------- */

      if (session.status === "IN_EXAM") {
        if (["submit", "done", "finished"].includes(lower)) {
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

Provide:
- Question-wise marks
- Total marks obtained
- Percentage
- Detailed explanation for each deduction
- Improvement suggestions
- Time taken: ${timeTakenSeconds} seconds
`;

          const result = await callGemini([
            { role: "system", content: GLOBAL_CONTEXT },
            { role: "system", content: EXAMINER_PROMPT },
            { role: "user", content: evaluationPrompt },
          ]);

          examSessions.delete(key);

          return NextResponse.json({
            reply: result,
            examEnded: true,
            timeTakenSeconds,
          });
        }

        session.answers.push(lastUserMessage);
        examSessions.set(key, session);

        return NextResponse.json({ reply: "" });
      }
    }

    /* ================= OTHER MODES (UNCHANGED) ================= */

    if (mode === "teacher") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        {
          role: "system",
          content: `Student: ${student?.name ?? "Unknown"}, Class: ${student?.class ?? "Unknown"}`,
        },
        ...messages,
      ]);

      return NextResponse.json({ reply });
    }

    if (mode === "oral") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: ORAL_PROMPT },
        {
          role: "system",
          content: `Student: ${student?.name ?? "Unknown"}, Class: ${student?.class ?? "Unknown"}`,
        },
        ...messages,
      ]);

      return NextResponse.json({ reply });
    }

    if (mode === "progress") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: PROGRESS_PROMPT },
        {
          role: "system",
          content: `Student: ${student?.name ?? "Unknown"}, Class: ${student?.class ?? "Unknown"}`,
        },
        ...messages,
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "AI server error. Please try again." },
      { status: 500 }
    );
  }
}
