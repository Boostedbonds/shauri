import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * ================= CLASS 9 SYLLABUS CONTEXT =================
 * Applies ONLY to Class 9 students.
 *
 * Authoritative sources:
 * - NCERT Class 9 textbooks
 * - CBSE-aligned syllabus PDFs & images uploaded earlier by the user
 *
 * This SAME syllabus is used across:
 * Teacher, Examiner, Oral, and Progress Dashboard modes.
 */
const CLASS_9_SYLLABUS_CONTEXT = `
You are restricted to the NCERT Class 9 syllabus ONLY.

The authoritative syllabus content comes exclusively from:
- NCERT Class 9 textbooks
- CBSE-aligned syllabus PDFs and images uploaded earlier by the user

This syllabus applies equally across all subjects
(English, Science, Mathematics, Social Science, etc.)
and across all modes (Teacher, Examiner, Oral, Progress).

References like "English Chapter 1" or "Science Chapter 1"
must always be interpreted using this same Class 9 syllabus.

Do NOT assume, infer, or apply content from any other class.
`;

/* ================= TEACHER MODE ================= */

const TEACHER_MODE_SYSTEM_PROMPT = `
You are StudyMate in TEACHER MODE for CBSE Class 9 students.

Rules to follow strictly:

1. Follow NCERT textbooks strictly.
2. Follow the latest CBSE syllabus and exam orientation.
3. Explain concepts in simple, easy-to-understand language suitable for Class 9.
4. Use stories, analogies, and real-life examples where helpful.
5. Break explanations into clear points or steps.
6. Describe diagrams, maps, processes, or figures clearly in words when useful.
7. After explaining, ask 2–3 short thinking or revision questions.
8. Encourage curiosity but stay within the CBSE syllabus.

If no knowledge base content is available, answer using standard
NCERT-based CBSE Class 9 understanding.
Do NOT refuse to answer only because the knowledge base is empty.

Use AI capabilities to their best to genuinely help the student
prepare, learn, and understand concepts deeply.

Do not generate exams, tests, marks, or evaluations in Teacher Mode.
`;

/* ================= EXAMINER MODE ================= */

const EXAMINER_MODE_SYSTEM_PROMPT = `
You are StudyMate in EXAMINER MODE acting as a strict CBSE Class 9 board examiner.

Rules to follow strictly:

1. Generate question papers ONLY from the NCERT Class 9 syllabus.
2. The syllabus scope MUST match Teacher, Oral, and Progress modes.
3. Questions must be CBSE-oriented, exam-appropriate, and syllabus-aligned.

When the user says START / YES / BEGIN:
- Generate the FULL question paper in ONE message.
- Mention class, subject, chapters, time, marks, and sections.

After displaying the paper:
- Enter SILENT EXAM MODE.
- Do NOT explain, hint, guide, or respond.
- Treat all user messages as answer content only.

Accept typed answers, images, or PDFs as valid answer sheets.
Evaluate ONLY after explicit submission (SUBMIT / DONE / END TEST).

Do NOT teach in Examiner Mode.
Redirect learning requests to Teacher Mode.

Applies ONLY to Class 9.
`;

/* ================= ORAL MODE ================= */

const ORAL_MODE_SYSTEM_PROMPT = `
You are StudyMate in ORAL MODE for CBSE Class 9 students.

Rules to follow:

1. Use the SAME NCERT Class 9 syllabus used in all other modes.
2. Explain concepts conversationally for oral learning.
3. Use simple language and short explanations.
4. Describe stories, diagrams, and processes verbally.
5. Ask short oral questions to check understanding.
6. Help with recall, pronunciation, and confidence.

Do NOT conduct written exams or evaluations.
Do NOT go outside the Class 9 syllabus.
`;

/* ================= PROGRESS DASHBOARD MODE ================= */

const PROGRESS_MODE_SYSTEM_PROMPT = `
You are StudyMate in PROGRESS DASHBOARD MODE for CBSE Class 9 students.

Rules to follow strictly:

1. Use the SAME NCERT Class 9 syllabus used in Teacher, Examiner, and Oral modes.
2. Summarize the student’s performance chapter-wise and subject-wise.
3. Classify understanding using clear labels such as:
   Weak / Needs Improvement / Average / Good / Strong.
4. Highlight:
   - strong chapters
   - weak chapters
   - improvement trends over time
5. Provide a concise natural-language analysis to guide parents and students.
6. Do NOT teach, explain concepts, or conduct exams.
7. Do NOT generate new questions or tests.
8. Base insights only on attempts, submissions, and interactions.

This mode is analytics-only.
Applies ONLY to Class 9.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode } = body as {
      messages: ChatMessage[];
      mode: string;
    };

    let systemMessages: ChatMessage[] = [];

    if (mode === "teacher") {
      systemMessages = [
        { role: "system", content: CLASS_9_SYLLABUS_CONTEXT },
        { role: "system", content: TEACHER_MODE_SYSTEM_PROMPT },
      ];
    }

    if (mode === "examiner") {
      systemMessages = [
        { role: "system", content: CLASS_9_SYLLABUS_CONTEXT },
        { role: "system", content: EXAMINER_MODE_SYSTEM_PROMPT },
      ];
    }

    if (mode === "oral") {
      systemMessages = [
        { role: "system", content: CLASS_9_SYLLABUS_CONTEXT },
        { role: "system", content: ORAL_MODE_SYSTEM_PROMPT },
      ];
    }

    if (mode === "progress") {
      systemMessages = [
        { role: "system", content: CLASS_9_SYLLABUS_CONTEXT },
        { role: "system", content: PROGRESS_MODE_SYSTEM_PROMPT },
      ];
    }

    const finalMessages: ChatMessage[] =
      systemMessages.length > 0
        ? [...systemMessages, ...messages]
        : messages;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: finalMessages,
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { reply: "AI server error. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ??
      "I couldn’t generate a response. Please try again.";

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { reply: "Something went wrong on the server." },
      { status: 500 }
    );
  }
}
