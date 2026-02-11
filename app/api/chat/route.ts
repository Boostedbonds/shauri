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
Never go outside CBSE scope.
`;

/* ================= MODE PROMPTS ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.

IMPORTANT:
- Student name and class are already collected via access control.
- NEVER ask for student's class or name again.
- Use the provided class context silently for depth and explanation level.

Explain clearly using class-appropriate language.
Stay strictly within NCERT and CBSE syllabus.
After explanation, ask exactly 2 short revision questions.
Do not ask for identity details.
`;

const ORAL_PROMPT = `
You are in ORAL MODE.
Keep answers short and conversational.
`;

const PROGRESS_PROMPT = `
You are generating a concise CBSE-style academic performance summary.

STRICT RULES:
- Maximum 6 lines.
- Prefer 4–5 lines.
- No bullet points.
- No headings.
- No markdown.
- No asterisks.
- Do NOT mention mode or system instructions.
- Professional school report tone.

Write a short paragraph covering:
- Overall performance
- Weakest subject (if any)
- Trend (if available)
- One clear improvement suggestion.
`;

const EXAMINER_PROMPT = `
You are in EXAMINER MODE.

When evaluating, return STRICT JSON ONLY in this format:

{
  "marksObtained": number,
  "totalMarks": number,
  "percentage": number,
  "detailedEvaluation": "Full explanation text"
}

Do NOT return markdown.
Do NOT return extra commentary.
Return pure JSON.
`;

/* ================= SESSION STORE ================= */

const examSessions = new Map<string, ExamSession>();

function getSessionKey(student?: StudentContext) {
  if (!student?.name) return "anonymous";
  return `${student.name}_${student.class ?? "unknown"}`;
}

/* ================= SAFE JSON PARSER ================= */

function safeParseEvaluationJSON(text: string) {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);

    if (
      typeof parsed.marksObtained !== "number" ||
      typeof parsed.totalMarks !== "number" ||
      typeof parsed.percentage !== "number" ||
      typeof parsed.detailedEvaluation !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/* ================= HELPERS ================= */

function isGreeting(text: string) {
  return ["hi", "hello", "hey"].includes(text);
}

function isIdentityQuery(text: string) {
  return (
    text.includes("class") ||
    text.includes("name") ||
    text.includes("do you know")
  );
}

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
    "exam"
  ];
  return keywords.some((k) => text.includes(k));
}

/* ================= GEMINI CALL ================= */

async function callGemini(
  messages: ChatMessage[],
  temperature: number = 0.2
) {
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
        generationConfig: { temperature },
      }),
    }
  );

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Unable to generate response."
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

/* ================= FORMAT BOARD STYLE ================= */

function formatBoardStyleEvaluation(
  evaluationText: string,
  marks: number,
  total: number,
  percentage: number,
  timeTakenSeconds: number
) {
  const minutes = Math.floor(timeTakenSeconds / 60);
  const seconds = timeTakenSeconds % 60;

  return `
${evaluationText.trim()}

---------------------------------------

Total Marks: ${marks}/${total}
Percentage: ${percentage.toFixed(2)}%
Time Taken: ${minutes}m ${seconds}s
`.trim();
}

/* ================= API HANDLER ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = body?.messages ?? [];
    const mode: string = body?.mode ?? "";
    const student: StudentContext | undefined = body?.student;
    const attempts = body?.attempts ?? [];

    const lastUserMessage =
      messages.filter((m) => m.role === "user").pop()?.content?.trim() ?? "";

    const lower = lastUserMessage.toLowerCase();

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {
      const key = getSessionKey(student);
      const existing = examSessions.get(key);
      const session: ExamSession =
        existing ?? { status: "IDLE", answers: [] };

      if (session.status === "IDLE") {

        if (isGreeting(lower)) {
          return NextResponse.json({
            reply: `Hello ${student?.name ?? "Student"}! Tell me the subject and chapters for your test.`,
          });
        }

        if (isIdentityQuery(lower)) {
          return NextResponse.json({
            reply: `You are ${student?.name ?? "Student"}, Class ${student?.class ?? "Unknown"}. Tell me the subject and chapters for your test.`,
          });
        }

        if (lower === "start" && !session.subjectRequest) {
          return NextResponse.json({
            reply: "Please tell me the subject and chapters before starting the test.",
          });
        }

        if (lower === "start" && session.subjectRequest) {
          const duration = calculateDurationMinutes(
            session.subjectRequest
          );

          const paperPrompt = `
Generate a NEW and UNIQUE CBSE question paper.

Class: ${student?.class ?? "Not specified"}
User Request: ${session.subjectRequest}

STRICT RULES:

1) If SINGLE chapter requested:
- Total Questions: 10
- Section A: 3 questions × 1 mark each
- Section B: 3 questions × 3 marks each
- Section C: 4 questions × 5 marks each
- Total Marks = 32

2) If MULTIPLE chapters requested (2–4 chapters):
- Maximum 20 questions total
- Distribute questions almost equally across chapters
- Mix 1, 3, and 5 mark questions
- Total marks between 40–60 depending on scope

3) If FULL BOOK or entire syllabus requested:
- Follow STRICT CBSE Board Pattern
- Include internal choices
- Include case-based questions

GENERAL RULES:
- Cover all mentioned chapters proportionally
- Do NOT exceed 20 questions unless full syllabus
- Maintain CBSE formatting structure
- Clearly mention Total Marks
- Clearly mention Time Allowed: ${duration} minutes
`;

          const paper = await callGemini(
            [
              { role: "system", content: GLOBAL_CONTEXT },
              { role: "user", content: paperPrompt },
            ],
            0.7
          );

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
            "Examiner Mode is for conducting tests. Please tell me the subject and chapters for your test.",
        });
      }

      if (session.status === "IN_EXAM") {
        if (["submit", "done", "finished"].includes(lower)) {
          const endTime = Date.now();
          const timeTakenSeconds = session.startedAt
            ? Math.floor((endTime - session.startedAt) / 1000)
            : 0;

          const evaluationPrompt = `
Evaluate this answer sheet.

QUESTION PAPER:
${session.questionPaper ?? ""}

STUDENT ANSWERS:
${session.answers.join("\n\n")}
`;

          const resultText = await callGemini(
            [
              { role: "system", content: GLOBAL_CONTEXT },
              { role: "system", content: EXAMINER_PROMPT },
              { role: "user", content: evaluationPrompt },
            ],
            0.2
          );

          examSessions.delete(key);

          const parsed =
            safeParseEvaluationJSON(resultText) ?? {
              marksObtained: 0,
              totalMarks: 0,
              percentage: 0,
              detailedEvaluation: resultText,
            };

          const formatted = formatBoardStyleEvaluation(
            parsed.detailedEvaluation,
            parsed.marksObtained,
            parsed.totalMarks,
            parsed.percentage,
            timeTakenSeconds
          );

          return NextResponse.json({
            reply: formatted,
            examEnded: true,
            timeTakenSeconds,
            subject: session.subjectRequest,
            chapters: [],
            marksObtained: parsed.marksObtained,
            totalMarks: parsed.totalMarks,
            percentage: parsed.percentage,
          });
        }

        session.answers.push(lastUserMessage);
        examSessions.set(key, session);

        return NextResponse.json({ reply: "" });
      }
    }

    /* ================= PROGRESS MODE ================= */

    if (mode === "progress") {
      const summaryData = attempts
        .map(
          (a: any) =>
            `Subject: ${a.subject}, Score: ${a.scorePercent}%, Time: ${a.timeTakenSeconds}s`
        )
        .join("\n");

      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: PROGRESS_PROMPT },
        {
          role: "user",
          content: `Analyze this student performance data:\n${summaryData}`,
        },
      ]);

      return NextResponse.json({ reply });
    }

    /* ================= TEACHER MODE ================= */

    if (mode === "teacher") {
      const teacherContext = `
Student Name: ${student?.name ?? "Student"}
Class: ${student?.class ?? "Not specified"}
Board: CBSE
`;

      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        { role: "system", content: teacherContext },
        ...messages,
      ]);

      return NextResponse.json({ reply });
    }

    /* ================= ORAL MODE ================= */

    if (mode === "oral") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: ORAL_PROMPT },
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
