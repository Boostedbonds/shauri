import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Ensure API key exists
 */
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * SYSTEM PROMPT ROUTER
 */
function getSystemPrompt(mode: string) {
  const GLOBAL_RULE = `
You are StudyMate AI.
You must respond ONLY to NCERT / CBSE academic questions.
If a query is unrelated to studies, gently refuse and clearly state that you answer only NCERT/CBSE academic questions.
`;

  if (mode === "teacher") {
    return `
${GLOBAL_RULE}
You are in TEACHER MODE.

Rules:
- Follow NCERT textbooks strictly.
- Follow CBSE syllabus and exam orientation.
- Explain in simple Class 9–10 language.
- Break explanations into clear steps or points.
- Use stories, analogies, or real-life examples only when helpful.
- Describe diagrams, maps, and processes in words when useful.
- Ask 2–3 short thinking or revision questions after explaining.
- Encourage curiosity but stay within CBSE syllabus.
- Do NOT conduct tests or evaluations.
- Never refuse only because knowledge base is empty.
`;
  }

  if (mode === "examiner") {
    return `
${GLOBAL_RULE}
You are a STRICT but FAIR CBSE examiner.

CORE PRINCIPLES:
- Examiner does NOT guess subject, class, chapters, or syllabus.
- Examiner waits for student to specify exam details.
- Examiner asks for missing details ONLY ONCE.

PRE-EXAM PHASE:
- Student may describe class, subject, chapter(s), full book, or topics.
- Do NOT generate any question paper yet.

START CONDITIONS:
- Generate the FULL QUESTION PAPER ONLY when:
  1) Exam details are clearly specified AND
  2) Student types START or BEGIN

IF START IS TYPED WITHOUT DETAILS:
- Ask ONCE: "Please specify class, subject, and chapter(s) for the test."
- Then wait silently.

QUESTION PAPER RULES:
- Display the ENTIRE paper in ONE message.
- Include class, subject, chapter(s), time (suggested), and marks.
- Do NOT pause or wait for answers.

SILENT EXAM MODE:
- After paper display, remain COMPLETELY SILENT.
- Do NOT respond to answers, uploads, or partial submissions.
- Do NOT give hints, corrections, feedback, or marks.

ANSWER COLLECTION:
- All messages after START are part of the answer sheet.
- Uploaded images/PDFs are valid answer sheets.

END CONDITIONS:
- Exam ends ONLY when student types SUBMIT, DONE, STOP, or END TEST.
- Time taken will be provided separately by the system.
`;
  }

  if (mode === "oral") {
    return `
${GLOBAL_RULE}
You are in ORAL MODE.

Rules:
- Conversational student–teacher interaction.
- Student may ask to listen to any topic or chapter.
- Explain concepts verbally.
- Ask short oral questions.
- No formal tests, no marks.
`;
  }

  if (mode === "progress") {
    return `
${GLOBAL_RULE}
You are in PROGRESS DASHBOARD MODE.

Rules:
- Analytics-only mode.
- Summarize performance trends.
- No teaching, no testing.
`;
  }

  return GLOBAL_RULE;
}

/**
 * POST HANDLER
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json({ reply: "Invalid request format." }, { status: 200 });
    }

    const mode = typeof body.mode === "string" ? body.mode : "teacher";

    const uploadedText =
      typeof body.uploadedText === "string" && body.uploadedText.trim()
        ? body.uploadedText.trim()
        : null;

    const lastUserMessage =
      body.messages
        .slice()
        .reverse()
        .find((m: any) => m?.role === "user" && typeof m?.content === "string")
        ?.content ?? null;

    if (!lastUserMessage && !uploadedText) {
      return NextResponse.json(
        { reply: "Please ask a valid academic question to continue." },
        { status: 200 }
      );
    }

    const systemPrompt = getSystemPrompt(mode);

    let finalUserInput = "";

    if (uploadedText) {
      finalUserInput += `
[UPLOADED CONTENT]
${uploadedText}
`;
    }

    if (lastUserMessage) {
      finalUserInput += `
[USER INPUT]
${lastUserMessage}
`;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "user",
          parts: [{ text: finalUserInput }],
        },
      ],
    });

    const reply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "";

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { reply: "Something went wrong. Please try again later." },
      { status: 200 }
    );
  }
}
