import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Force Node runtime (required for pdf-parse)
 */
export const runtime = "nodejs";

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
- Follow NCERT strictly.
- Explain clearly.
- No tests or evaluation.
`;
  }

  if (mode === "examiner") {
    return `
${GLOBAL_RULE}
You are a STRICT but FAIR CBSE examiner.
- Never guess syllabus.
- Ask missing exam details ONLY ONCE.
- Generate paper ONLY after details + START/BEGIN.
- Remain silent after paper.
- Accept uploads as answer sheets.
- End exam on SUBMIT / DONE / STOP.
`;
  }

  if (mode === "oral") {
    return `
${GLOBAL_RULE}
You are in ORAL MODE.
- Conversational explanations only.
`;
  }

  if (mode === "progress") {
    return `
${GLOBAL_RULE}
You are in PROGRESS DASHBOARD MODE.
- Analytics only.
`;
  }

  return GLOBAL_RULE;
}

/**
 * REAL PDF EXTRACTION (CommonJS require — 100% safe)
 */
async function extractPdfText(base64Data: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");

    const buffer = Buffer.from(base64Data, "base64");
    const data = await pdfParse(buffer);

    if (!data?.text) return null;

    // protect LLM context
    return data.text.slice(0, 15000);
  } catch (err) {
    console.error("PDF parse failed:", err);
    return null;
  }
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

    let uploadedContent: string | null = null;

    // REAL PDF handling
    if (
      body.uploadedFile &&
      body.uploadedFile.type === "application/pdf" &&
      typeof body.uploadedFile.base64 === "string"
    ) {
      const extracted = await extractPdfText(body.uploadedFile.base64);
      uploadedContent =
        extracted ??
        `Student uploaded a PDF named "${body.uploadedFile.name}", but text extraction failed.`;
    }

    // Fallback for stub uploads
    if (!uploadedContent && typeof body.uploadedText === "string") {
      uploadedContent = body.uploadedText.trim();
    }

    const lastUserMessage =
      body.messages
        .slice()
        .reverse()
        .find((m: any) => m?.role === "user" && typeof m?.content === "string")
        ?.content ?? null;

    if (!lastUserMessage && !uploadedContent) {
      return NextResponse.json(
        { reply: "Please ask a valid academic question to continue." },
        { status: 200 }
      );
    }

    const systemPrompt = getSystemPrompt(mode);

    let finalUserInput = "";

    if (uploadedContent) {
      finalUserInput += `
[UPLOADED CONTENT]
${uploadedContent}
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
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: finalUserInput }] },
      ],
    });

    const reply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { reply: "Something went wrong. Please try again later." },
      { status: 200 }
    );
  }
}
