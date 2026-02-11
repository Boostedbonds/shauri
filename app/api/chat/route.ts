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

Explain clearly using class-appropriate language.
Stay strictly within NCERT and CBSE syllabus.
After explanation, ask exactly 2 short revision questions.
`;

const ORAL_PROMPT = `
You are in ORAL MODE.
Keep answers short and conversational.
`;

const PROGRESS_PROMPT = `
You are generating a concise CBSE-style academic performance summary.

Maximum 6 lines.
Professional school report tone.
`;

const EXAMINER_PROMPT = `
You are in EXAMINER MODE.

Return STRICT JSON ONLY:

{
  "marksObtained": number,
  "totalMarks": number,
  "percentage": number,
  "detailedEvaluation": "Full explanation text"
}

No markdown.
No commentary.
Pure JSON only.
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
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
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

/* ================= GEMINI CALL ================= */

async function callGemini(
  messages: ChatMessage[],
  temperature: number = 0.2
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI configuration error.";

  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content ?? "" }],
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
  } catch {
    return "AI server error.";
  }
}

/* ================= FORMAT EVALUATION ================= */

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
${evaluationText?.trim() ?? ""}

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

    const messages: ChatMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];

    const mode: string = body?.mode ?? "";
    const student: StudentContext | undefined = body?.student;
    const attempts = Array.isArray(body?.attempts) ? body.attempts : [];

    const lastUserMessage =
      messages.filter((m) => m.role === "user").pop()?.content ?? "";

    const lower = lastUserMessage.toLowerCase().trim();

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {
      const key = getSessionKey(student);
      const existing = examSessions.get(key);
      const session: ExamSession =
        existing ?? { status: "IDLE", answers: [] };

      const isSubmit = [
        "submit",
        "done",
        "finished",
        "finish",
        "end test",
      ].includes(lower);

      if (isSubmit) {
        let questionPaper = session.questionPaper ?? "";
        let answers = session.answers ?? [];
        let startedAt = session.startedAt ?? Date.now();

        // Reconstruction fallback
        if (!questionPaper) {
          questionPaper = messages
            .filter((m) => m.role === "assistant")
            .map((m) => m.content ?? "")
            .join("\n\n");

          answers = messages
            .filter((m) => m.role === "user")
            .map((m) => m.content ?? "")
            .filter(
              (m) =>
                ![
                  "submit",
                  "done",
                  "finished",
                  "finish",
                  "end test",
                ].includes(m.toLowerCase().trim())
            );
        }

        if (!questionPaper || answers.length === 0) {
          return NextResponse.json({
            reply:
              "Unable to locate question paper or answers. Please resend your answers.",
          });
        }

        const endTime = Date.now();
        const timeTakenSeconds = Math.floor(
          (endTime - startedAt) / 1000
        );

        const evaluationPrompt = `
Evaluate this answer sheet.

QUESTION PAPER:
${questionPaper}

STUDENT ANSWERS:
${answers.join("\n\n")}
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
          subject: session.subjectRequest ?? "",
          chapters: [],
          marksObtained: parsed.marksObtained,
          totalMarks: parsed.totalMarks,
          percentage: parsed.percentage,
        });
      }

      if (session.status === "IN_EXAM") {
        session.answers.push(lastUserMessage ?? "");
        examSessions.set(key, session);
        return NextResponse.json({ reply: "" });
      }

      return NextResponse.json({
        reply:
          "Examiner Mode is for conducting tests. Please tell me the subject and chapters for your test.",
      });
    }

    /* ================= PROGRESS MODE ================= */

    if (mode === "progress") {
      const summaryData = attempts
        .map(
          (a: any) =>
            `Subject: ${a?.subject ?? ""}, Score: ${
              a?.scorePercent ?? 0
            }%, Time: ${a?.timeTakenSeconds ?? 0}s`
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
