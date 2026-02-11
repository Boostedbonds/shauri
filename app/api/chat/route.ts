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
Analyze structured student performance data.
Provide:
- Strength analysis
- Weak subject detection
- Score trend insight
- Time efficiency analysis
- Practical improvement strategy
Do NOT teach topics.
Do NOT generate questions.
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
    // Remove markdown fences
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Extract first JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) return null;

    const parsed = JSON.parse(match[0]);

    // Validate structure
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
        if (lower === "start" && session.subjectRequest) {
          const duration = calculateDurationMinutes(
            session.subjectRequest
          );

          const paperPrompt = `
Generate a complete CBSE question paper.

Class: ${student?.class ?? "Not specified"}
User Request: ${session.subjectRequest}

Follow CBSE format strictly.
Mention total marks.
Mention time allowed: ${duration} minutes.
`;

          const paper = await callGemini([
            { role: "system", content: GLOBAL_CONTEXT },
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

        if (session.subjectRequest) {
          return NextResponse.json({
            reply: "Type START to begin the test.",
          });
        }

        examSessions.set(key, {
          status: "IDLE",
          subjectRequest: lastUserMessage,
          answers: [],
        });

        return NextResponse.json({
          reply: "Test noted. Type START to begin.",
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

Time taken: ${timeTakenSeconds} seconds.
`;

          const resultText = await callGemini([
            { role: "system", content: GLOBAL_CONTEXT },
            { role: "system", content: EXAMINER_PROMPT },
            { role: "user", content: evaluationPrompt },
          ]);

          examSessions.delete(key);

          const parsed =
            safeParseEvaluationJSON(resultText) ?? {
              marksObtained: 0,
              totalMarks: 0,
              percentage: 0,
              detailedEvaluation: resultText,
            };

          return NextResponse.json({
            reply: parsed.detailedEvaluation,
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

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        ...messages,
      ]);

      return NextResponse.json({ reply });
    }

    /* ================= ORAL ================= */

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
