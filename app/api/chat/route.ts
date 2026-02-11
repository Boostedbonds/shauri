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

const EXAMINER_PROMPT = `
You are a strict CBSE board examiner.

Rules:
- Maintain professional board exam tone.
- If answer is fully correct → just award marks.
- If partially correct → deduct marks and give 1 short reason line.
- If incorrect → give 1 short reason line only.
- No motivational language.
- No teaching explanations.
- No emojis.
- Keep format clean and structured.

Return STRICT JSON ONLY in this format:

{
  "subject": "Clean subject name only (e.g., History, Science, Mathematics)",
  "marksObtained": number,
  "totalMarks": number,
  "percentage": number,
  "detailedEvaluation": "Formatted evaluation text"
}

Do NOT return markdown.
Return pure JSON.
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
      typeof parsed.subject !== "string" ||
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

    const lastUserMessage =
      messages.filter((m) => m.role === "user").pop()?.content?.trim() ?? "";

    const lower = lastUserMessage.toLowerCase();

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {
      const key = getSessionKey(student);
      const existing = examSessions.get(key);
      const session: ExamSession =
        existing ?? { status: "IDLE", answers: [] };

      if (session.status === "IN_EXAM") {
        if (["submit", "done", "finished"].includes(lower)) {
          const endTime = Date.now();
          const timeTakenSeconds = session.startedAt
            ? Math.floor((endTime - session.startedAt) / 1000)
            : 0;

          const evaluationPrompt = `
Evaluate strictly.

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
              subject: session.subjectRequest ?? "General",
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
            subject: parsed.subject,
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

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "AI server error. Please try again." },
      { status: 500 }
    );
  }
}
