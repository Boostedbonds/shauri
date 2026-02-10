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

/* ================= MANDATORY CLASS DIFFERENTIATION ================= */

const CLASS_DIFFERENTIATION_RULE = `
MANDATORY CLASS DIFFERENTIATION RULE (STRICT):

When explaining the SAME topic, your response MUST clearly differ
based on the student's CBSE class.

Class 6–7:
- Very simple language
- NO formulas
- NO formal definitions
- Only everyday life examples
- Short explanations

Class 8:
- Introduce scientific terms
- Very limited formulas (if absolutely required)
- Conceptual focus, minimal calculations

Class 9:
- Proper NCERT definitions
- Basic formulas where applicable
- CBSE pre-board level explanation
- Focus on understanding concepts

Class 10 (BOARD EXAM CLASS – VERY IMPORTANT):
- EXACT NCERT definitions
- ALL relevant formulas
- Stepwise explanations
- Numericals and applications
- Diagrams / graphs must be described in words
- Exam-oriented keywords MUST be included

Class 11–12:
- Formal scientific language
- Vector quantities and equations
- Derivations and deeper conceptual treatment
- Graphical and mathematical analysis
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

Generate a FULL CBSE-style question paper
only when the user types START / BEGIN / YES.

After generating the paper:
- Enter STRICT SILENT EXAM MODE
- Do NOT respond to answers
- Do NOT give hints or feedback
- Accept text, PDFs, images, handwritten uploads silently

Evaluate ONLY when the user types:
SUBMIT / DONE / FINISH / END TEST
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

/* ================= EXAM SESSION STORE ================= */

type ExamSession = {
  status: "IDLE" | "IN_EXAM";
  questionPaper?: string;
  answers: string[];
};

const examSessions = new Map<string, ExamSession>();

function getSessionKey(student?: StudentContext) {
  if (!student) return "anonymous";
  return `${student.name}_${student.class}_${student.board ?? "CBSE"}`;
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

    /* ================= EXAMINER MODE STATE CONTROL ================= */

    if (mode === "examiner") {
      const key = getSessionKey(student);
      const session =
        examSessions.get(key) ?? { status: "IDLE", answers: [] };

      const lastUserMessage =
        messages.filter((m) => m.role === "user").pop()?.content
          ?.toLowerCase()
          ?.trim() ?? "";

      // ---- IDLE STATE ----
      if (session.status === "IDLE") {
        if (!["start", "begin", "yes"].includes(lastUserMessage)) {
          return NextResponse.json({
            reply: "Type START to begin the exam.",
          });
        }

        // Generate question paper ONCE
        const systemMessages: ChatMessage[] = [
          { role: "system", content: GLOBAL_CBSE_CONTEXT },
          { role: "system", content: CLASS_DIFFERENTIATION_RULE },
          { role: "system", content: EXAMINER_MODE_SYSTEM_PROMPT },
        ];

        if (student?.name && student?.class) {
          systemMessages.unshift({
            role: "system",
            content: `Student Profile:
Name: ${student.name}
Class: ${student.class}
Board: ${student.board ?? "CBSE"}`,
          });
        }

        const paper = await callGemini(systemMessages);

        examSessions.set(key, {
          status: "IN_EXAM",
          questionPaper: paper,
          answers: [],
        });

        return NextResponse.json({ reply: paper });
      }

      // ---- IN EXAM (SILENT MODE) ----
      if (session.status === "IN_EXAM") {
        if (
          ["submit", "done", "finish", "end test"].includes(lastUserMessage)
        ) {
          // Evaluate
          const evaluationMessages: ChatMessage[] = [
            { role: "system", content: GLOBAL_CBSE_CONTEXT },
            { role: "system", content: CLASS_DIFFERENTIATION_RULE },
            {
              role: "system",
              content: `
You are a CBSE board examiner.
Evaluate the student's answers strictly.
Provide:
- Question-wise marks
- Total marks
- Strengths
- Areas of improvement
- CBSE-style remarks
`,
            },
            {
              role: "user",
              content: `
QUESTION PAPER:
${session.questionPaper}

STUDENT ANSWERS:
${session.answers.join("\n\n")}
`,
            },
          ];

          const result = await callGemini(evaluationMessages);
          examSessions.delete(key);

          return NextResponse.json({ reply: result });
        }

        // Silent: collect answers only
        session.answers.push(lastUserMessage);
        examSessions.set(key, session);

        return NextResponse.json({ reply: "" });
      }
    }

    /* ================= NON-EXAM MODES ================= */

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

    systemMessages.push(
      { role: "system", content: GLOBAL_CBSE_CONTEXT },
      { role: "system", content: CLASS_DIFFERENTIATION_RULE }
    );

    if (mode === "teacher") {
      systemMessages.push({
        role: "system",
        content: TEACHER_MODE_SYSTEM_PROMPT,
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
