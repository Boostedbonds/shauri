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

/* ================= HELPERS ================= */

function looksLikeSubjectRequest(text: string) {
  const keywords = [
    "chapter",
    "history",
    "science",
    "math",
    "mathematics",
    "geography",
    "civics",
    "economics",
    "english",
    "hindi",
  ];
  return keywords.some((k) => text.includes(k));
}

function calculateDurationMinutes(request: string): number {
  const chapterMatches = request.match(/chapter\s*\d+/gi);
  const chapterCount = chapterMatches ? chapterMatches.length : 1;

  if (chapterCount >= 4) return 150;
  if (chapterCount === 3) return 120;
  if (chapterCount === 2) return 90;
  return 60;
}

function safeParseEvaluationJSON(text: string) {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
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

    const mode: string = body?.mode ?? "";
    const student: StudentContext | undefined = body?.student;

    // 🔥 IMPORTANT FIX: Support history (frontend sends history, not messages)
    const history = Array.isArray(body?.history) ? body.history : [];
    const message = body?.message ?? "";

    const fullConversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    const lower = message.toLowerCase().trim();

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {
      const key = getSessionKey(student);
      const existing = examSessions.get(key);
      const session: ExamSession =
        existing ?? { status: "IDLE", answers: [] };

      const greetingLine = `Hi ${student?.name ?? "Student"} of Class ${student?.class ?? "?"}. Please tell me the subject and chapters for your test.`;

      const isSubmit = [
        "submit",
        "done",
        "finished",
        "finish",
        "end test",
      ].includes(lower);

      /* ---------- SUBMIT (Long Exam Safe) ---------- */
      if (isSubmit) {
        let questionPaper = session.questionPaper ?? "";
        let answers = session.answers ?? [];
        let startedAt = session.startedAt ?? Date.now();

        // If memory lost, reconstruct from history
        if (!questionPaper) {
          questionPaper = fullConversation
            .filter((m) => m.role === "assistant")
            .map((m) => m.content ?? "")
            .join("\n\n");

          answers = fullConversation
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

      /* ---------- IN EXAM ---------- */
      if (session.status === "IN_EXAM") {
        session.answers.push(message ?? "");
        examSessions.set(key, session);
        return NextResponse.json({ reply: "" });
      }

      /* ---------- SUBJECT INPUT ---------- */
      if (looksLikeSubjectRequest(lower)) {
        examSessions.set(key, {
          status: "IDLE",
          subjectRequest: message,
          answers: [],
        });

        return NextResponse.json({
          reply: "Test noted. Type START to begin.",
        });
      }

      /* ---------- START ---------- */
      if (lower === "start" && session.subjectRequest) {
        const duration = calculateDurationMinutes(
          session.subjectRequest
        );

        const paperPrompt = `
Generate a NEW and UNIQUE CBSE question paper.

Class: ${student?.class ?? "Not specified"}
User Request: ${session.subjectRequest}

STRICT RULES:
- Maintain CBSE formatting
- Mention Total Marks clearly
- Mention Time Allowed: ${duration} minutes
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

      return NextResponse.json({ reply: greetingLine });
    }

    /* ================= OTHER MODES UNCHANGED ================= */

    if (mode === "progress") {
      const attempts = Array.isArray(body?.attempts)
        ? body.attempts
        : [];

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

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "AI server error. Please try again." },
      { status: 500 }
    );
  }
}
