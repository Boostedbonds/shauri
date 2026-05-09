/**
 * app/api/verify-marks/route.ts
 *
 * Accepts two modes:
 *
 * MODE A — QP + Answer Sheet (typed paper + handwritten answers)
 *   { qpUrl, asUrls[], marks, total, subject, chapter, day, sections? }
 *
 * MODE B — Result Summary only (pre-marked sheet / teacher-marked scan)
 *   { summaryUrls[], marks, total, subject, chapter, day, sections? }
 *
 * sections: optional array sent from frontend, e.g.:
 *   [
 *     { name: "Section A (MCQ)",        obtained: 4,  total: 5  },
 *     { name: "Section B (VSA)",         obtained: 5,  total: 6  },
 *     { name: "Section C (SA)",          obtained: 4,  total: 6  },
 *     { name: "Section D (Case Study)", obtained: 4,  total: 5  },
 *     { name: "Writing",                 obtained: 2,  total: 3  },
 *     { name: "Vocabulary",              obtained: 4,  total: 5  },
 *   ]
 *
 * Returns:
 *   {
 *     reply: string,          // full evaluator narrative
 *     score: string,          // "X/Y"
 *     sections: SectionResult[],
 *     errors: string[],
 *     strengths: string[],
 *     improvements: string[],
 *     feedback: string,
 *   }
 */
import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface SectionInput {
  name: string;
  obtained: number;
  total: number;
}

interface SectionResult {
  name: string;
  obtained: number;
  total: number;
  percentage: number;
  status: "strong" | "average" | "weak" | "critical";
  note?: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfModule = await import("pdf-parse");
    const pdfParse = (pdfModule as any).default || pdfModule;
    const parsed = await pdfParse(buffer);
    return parsed?.text?.slice(0, 15000) || "";
  } catch {
    return "[PDF parsing failed]";
  }
}

function classifySection(pct: number): SectionResult["status"] {
  if (pct >= 80) return "strong";
  if (pct >= 60) return "average";
  if (pct >= 40) return "weak";
  return "critical";
}

function buildSectionTable(sections: SectionInput[]): string {
  if (!sections?.length) return "";
  return (
    "\nSECTION-WISE MARKS (student-reported):\n" +
    sections
      .map(
        (s) =>
          `  ${s.name}: ${s.obtained}/${s.total} (${Math.round((s.obtained / s.total) * 100)}%)`
      )
      .join("\n") +
    "\n"
  );
}

// ─────────────────────────────────────────────────────────────
// GEMINI VISION — QP + Answer Sheet mode
// ─────────────────────────────────────────────────────────────

async function callGeminiQP_AS(
  qpText: string,
  asPages: { buffer: Buffer; mimeType: string }[],
  marks: number,
  total: number,
  subject: string,
  chapter: string,
  day: string,
  sections: SectionInput[]
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return null;

  const asParts = asPages.map(({ buffer, mimeType }) => ({
    inlineData: {
      mimeType: mimeType.startsWith("image/") ? mimeType : "application/pdf",
      data: buffer.toString("base64"),
    },
  }));

  const sectionTable = buildSectionTable(sections);

  const promptText = `You are a strict CBSE board examiner checking a student's handwritten answer sheet.

Subject: ${subject}
Chapter/Topic: ${chapter}
Day: ${day}
Student's claimed total score: ${marks}/${total}
${sectionTable}
Answer sheet pages: ${asPages.length}

QUESTION PAPER TEXT:
${qpText}

The handwritten answer sheet pages are attached (${asPages.length} page${asPages.length > 1 ? "s" : ""}). Read ALL pages before scoring.

STRICT RULES:
- Read every page of the answer sheet.
- For MCQs: 1 mark each. Compare student's option to correct answer.
- For short/long answers: check accuracy against the QP.
- Only deduct marks for genuinely wrong/incomplete answers.
- Do NOT hallucinate errors. If correct, confirm it.
- State question number, what student wrote, what was correct, marks affected.
- If you cannot read a page clearly, say so — do not guess.
- Analyse performance per section (MCQ / VSA / SA / Case Study / Writing / Vocab).
- Identify strong topics, weak topics, and specific improvement areas.

Reply EXACTLY in this format (no extra text before or after):

SCORE: X/Y
SECTION_ANALYSIS:
Section A (MCQ): X/Y — [strong/average/weak/critical] — [one-line note]
Section B (VSA): X/Y — [strong/average/weak/critical] — [one-line note]
Section C (SA): X/Y — [strong/average/weak/critical] — [one-line note]
Section D (Case Study): X/Y — [strong/average/weak/critical] — [one-line note]
Writing: X/Y — [strong/average/weak/critical] — [one-line note]
Vocabulary: X/Y — [strong/average/weak/critical] — [one-line note]
DEDUCTIONS:
Q2: Student wrote (A), correct is (B). -1 mark
Q11: Definition incomplete — missing key phrase. -1 mark
(write "None" if score is confirmed correct)
STRENGTHS: topic1, topic2
ERRORS: topic1, topic2
NEEDS_IMPROVEMENT: topic1, topic2
FEEDBACK: 3-4 sentences of specific, actionable advice based on actual mistakes only.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [...asParts, { text: promptText }],
          },
        ],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    console.error("[verify-marks] Gemini QP+AS error:", text.slice(0, 400));
    return null;
  }
  try {
    const data = JSON.parse(text);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// GEMINI VISION — Result Summary mode
// Teacher-marked / pre-scored sheet sent as image(s)
// ─────────────────────────────────────────────────────────────

async function callGeminiSummary(
  summaryPages: { buffer: Buffer; mimeType: string }[],
  marks: number,
  total: number,
  subject: string,
  chapter: string,
  day: string,
  sections: SectionInput[]
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return null;

  const summaryParts = summaryPages.map(({ buffer, mimeType }) => ({
    inlineData: {
      mimeType: mimeType.startsWith("image/") ? mimeType : "application/pdf",
      data: buffer.toString("base64"),
    },
  }));

  const sectionTable = buildSectionTable(sections);

  const promptText = `You are a strict CBSE board examiner analysing a student's result summary / marked answer sheet.

Subject: ${subject}
Chapter/Topic: ${chapter}
Day: ${day}
Student's total score: ${marks}/${total}
${sectionTable}
The result summary image(s) are attached (${summaryPages.length} page${summaryPages.length > 1 ? "s" : ""}).
This may be a teacher-marked paper, a result card, or a pre-scored answer sheet.

YOUR TASK:
1. Read every mark written on the document carefully.
2. Extract per-question marks if visible.
3. Extract per-section totals if visible.
4. Identify which questions/topics the student lost marks on.
5. Identify strong areas (scored well), weak areas (lost marks), and topics needing improvement.
6. Give actionable feedback based only on what you can see.

STRICT RULES:
- Do NOT hallucinate errors. Only report what is visible.
- If a section is not visible, mark it as "Not visible in summary".
- Be specific: Q3 wrong → state topic of Q3 from the subject.

Reply EXACTLY in this format:

SCORE: X/Y
SECTION_ANALYSIS:
Section A (MCQ): X/Y — [strong/average/weak/critical] — [one-line note]
Section B (VSA): X/Y — [strong/average/weak/critical] — [one-line note]
Section C (SA): X/Y — [strong/average/weak/critical] — [one-line note]
Section D (Case Study): X/Y — [strong/average/weak/critical] — [one-line note]
Writing: X/Y — [strong/average/weak/critical] — [one-line note]
Vocabulary: X/Y — [strong/average/weak/critical] — [one-line note]
DEDUCTIONS:
Q2: Lost 1 mark — wrong option selected
Q11: Lost 1 mark — definition incomplete
(write "None visible" if no deductions readable)
STRENGTHS: topic1, topic2
ERRORS: topic1, topic2
NEEDS_IMPROVEMENT: topic1, topic2
FEEDBACK: 3-4 sentences of specific, actionable advice based on the result summary.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [...summaryParts, { text: promptText }],
          },
        ],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    console.error("[verify-marks] Gemini Summary error:", text.slice(0, 400));
    return null;
  }
  try {
    const data = JSON.parse(text);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// GROQ FALLBACK — text only
// ─────────────────────────────────────────────────────────────

async function callGroqFallback(
  qpText: string,
  asText: string,
  marks: number,
  total: number,
  subject: string,
  chapter: string,
  day: string,
  sections: SectionInput[],
  mode: "qp_as" | "summary"
): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) return null;

  const sectionTable = buildSectionTable(sections);

  const modeNote =
    mode === "summary"
      ? "The text below is extracted from a result summary / pre-marked sheet."
      : "The answer sheet text below is OCR-extracted from a handwritten scan and may be incomplete.";

  const prompt = `You are a strict CBSE board examiner.

Subject: ${subject} | Chapter: ${chapter} | Day: ${day}
Student claims: ${marks}/${total}
${sectionTable}
${modeNote}
Only mark deductions where you are 100% certain. Do NOT hallucinate.

QUESTION PAPER / CONTEXT:
${qpText}

STUDENT ANSWERS / RESULT SUMMARY (OCR — may be incomplete):
${asText}

Reply EXACTLY in this format:

SCORE: X/Y
SECTION_ANALYSIS:
Section A (MCQ): X/Y — [strong/average/weak/critical] — [note]
Section B (VSA): X/Y — [strong/average/weak/critical] — [note]
Section C (SA): X/Y — [strong/average/weak/critical] — [note]
Section D (Case Study): X/Y — [strong/average/weak/critical] — [note]
Writing: X/Y — [strong/average/weak/critical] — [note]
Vocabulary: X/Y — [strong/average/weak/critical] — [note]
DEDUCTIONS:
(list or write "None — could not read clearly enough to verify")
STRENGTHS: topic1, topic2
ERRORS: topic1, topic2
NEEDS_IMPROVEMENT: topic1, topic2
FEEDBACK: text`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a strict CBSE examiner. Never hallucinate mark deductions.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[verify-marks] Groq error:", text.slice(0, 300));
    return null;
  }
  try {
    const data = JSON.parse(text);
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// PARSE AI RESPONSE → structured data
// ─────────────────────────────────────────────────────────────

function parseAIResponse(
  raw: string,
  sectionsInput: SectionInput[]
): {
  score: string;
  sections: SectionResult[];
  deductions: string[];
  strengths: string[];
  errors: string[];
  improvements: string[];
  feedback: string;
} {
  const get = (key: string) => {
    const re = new RegExp(`${key}:\\s*([^\\n]+)`, "i");
    return raw.match(re)?.[1]?.trim() || "";
  };

  const getBlock = (key: string, nextKey: string) => {
    const re = new RegExp(`${key}:[\\s\\S]*?(?=${nextKey}:|$)`, "i");
    const block = raw.match(re)?.[0] || "";
    return block
      .replace(new RegExp(`^${key}:`, "i"), "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && l !== "None" && l !== "None visible");
  };

  const score = get("SCORE");

  // Parse SECTION_ANALYSIS block
  const sectionBlock = raw.match(/SECTION_ANALYSIS:([\s\S]*?)(?=DEDUCTIONS:|STRENGTHS:|ERRORS:|$)/i)?.[1] || "";
  const sectionLines = sectionBlock.split("\n").map((l) => l.trim()).filter(Boolean);

  const sections: SectionResult[] = [];

  // First try to build from AI-parsed lines
  for (const line of sectionLines) {
    // e.g. "Section A (MCQ): 4/5 — strong — Good recall of concepts"
    const m = line.match(/^(.+?):\s*(\d+)\/(\d+)\s*[—–-]\s*(strong|average|weak|critical)\s*[—–-]?\s*(.*)/i);
    if (m) {
      const obtained = parseInt(m[2]);
      const total    = parseInt(m[3]);
      const pct      = total > 0 ? Math.round((obtained / total) * 100) : 0;
      sections.push({
        name:       m[1].trim(),
        obtained,
        total,
        percentage: pct,
        status:     m[4].toLowerCase() as SectionResult["status"],
        note:       m[5].trim() || undefined,
      });
    }
  }

  // If AI didn't give section breakdown but frontend sent sections[], use those
  if (sections.length === 0 && sectionsInput?.length) {
    for (const s of sectionsInput) {
      const pct = s.total > 0 ? Math.round((s.obtained / s.total) * 100) : 0;
      sections.push({
        name:       s.name,
        obtained:   s.obtained,
        total:      s.total,
        percentage: pct,
        status:     classifySection(pct),
      });
    }
  }

  const deductionLines = getBlock("DEDUCTIONS", "STRENGTHS");
  const strengthsRaw   = get("STRENGTHS");
  const errorsRaw      = get("ERRORS");
  const improvRaw      = get("NEEDS_IMPROVEMENT");
  const feedback       = get("FEEDBACK");

  const splitComma = (s: string) =>
    s ? s.split(",").map((x) => x.trim()).filter(Boolean) : [];

  return {
    score,
    sections,
    deductions:   deductionLines,
    strengths:    splitComma(strengthsRaw),
    errors:       splitComma(errorsRaw),
    improvements: splitComma(improvRaw),
    feedback,
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const uploadedBlobs: string[] = [];

  try {
    const body = await req.json();
    const {
      marks,
      total,
      subject,
      chapter,
      day,
      sections,          // SectionInput[] | undefined
      // QP + AS mode
      qpUrl,
      asUrls,
      asUrl,             // legacy single
      // Result Summary mode
      summaryUrls,
      summaryUrl,        // legacy single
    } = body;

    if (!Number.isFinite(marks) || !Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ reply: "Missing or invalid marks/total." }, { status: 400 });
    }
    if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { reply: "Missing AI keys. Configure GROQ_API_KEY or GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const sectionsInput: SectionInput[] = Array.isArray(sections) ? sections : [];

    // Determine mode
    const summaryUrlList: string[] = Array.isArray(summaryUrls)
      ? summaryUrls
      : summaryUrl
      ? [summaryUrl]
      : [];

    const asUrlList: string[] = Array.isArray(asUrls)
      ? asUrls
      : asUrl
      ? [asUrl]
      : body.asUrl
      ? [body.asUrl]
      : [];

    const isSummaryMode = summaryUrlList.length > 0;
    const isQPASMode    = !!qpUrl && asUrlList.length > 0;

    if (!isSummaryMode && !isQPASMode) {
      return NextResponse.json(
        { reply: "Provide either (qpUrl + asUrls) or summaryUrls." },
        { status: 400 }
      );
    }

    let rawReply: string | null = null;

    // ── MODE B: Result Summary ──────────────────────────────
    if (isSummaryMode) {
      uploadedBlobs.push(...summaryUrlList);

      const summaryPages: { buffer: Buffer; mimeType: string }[] = [];
      for (const url of summaryUrlList) {
        const r = await fetch(url);
        if (!r.ok) throw new Error("Failed to fetch summary page from Blob.");
        const contentType = r.headers.get("content-type") || "image/jpeg";
        summaryPages.push({
          buffer: Buffer.from(await r.arrayBuffer()),
          mimeType: contentType,
        });
      }

      rawReply = await callGeminiSummary(
        summaryPages, marks, total, subject, chapter, day, sectionsInput
      );

      // Groq fallback for summary (best-effort text extraction from first page)
      if (!rawReply) {
        console.log("[verify-marks] Gemini Summary failed, falling back to Groq.");
        let summaryText = "[Could not extract text from result summary]";
        try {
          const pdfModule = await import("pdf-parse");
          const pdfParse  = (pdfModule as any).default || pdfModule;
          const parsed    = await pdfParse(summaryPages[0].buffer);
          summaryText     = parsed?.text?.slice(0, 15000) || summaryText;
        } catch {}
        rawReply = await callGroqFallback(
          "", summaryText, marks, total, subject, chapter, day, sectionsInput, "summary"
        );
      }
    }

    // ── MODE A: QP + Answer Sheet ───────────────────────────
    else {
      uploadedBlobs.push(qpUrl, ...asUrlList);

      const qpRes = await fetch(qpUrl);
      if (!qpRes.ok) throw new Error("Failed to fetch question paper from Blob.");
      const qpBuffer = Buffer.from(await qpRes.arrayBuffer());
      const qpText   = await extractPdfText(qpBuffer);

      const asPages: { buffer: Buffer; mimeType: string }[] = [];
      for (const url of asUrlList) {
        const r = await fetch(url);
        if (!r.ok) throw new Error("Failed to fetch answer sheet page from Blob.");
        const contentType = r.headers.get("content-type") || "image/jpeg";
        asPages.push({
          buffer: Buffer.from(await r.arrayBuffer()),
          mimeType: contentType,
        });
      }

      rawReply = await callGeminiQP_AS(
        qpText, asPages, marks, total, subject, chapter, day, sectionsInput
      );

      if (!rawReply) {
        console.log("[verify-marks] Gemini QP+AS failed, falling back to Groq.");
        let asText = "[Could not extract text from handwritten answer sheet]";
        try {
          const pdfModule = await import("pdf-parse");
          const pdfParse  = (pdfModule as any).default || pdfModule;
          const parsed    = await pdfParse(asPages[0].buffer);
          asText          = parsed?.text?.slice(0, 15000) || asText;
        } catch {}
        rawReply = await callGroqFallback(
          qpText, asText, marks, total, subject, chapter, day, sectionsInput, "qp_as"
        );
      }
    }

    if (!rawReply) {
      return NextResponse.json(
        { reply: "AI unavailable (Gemini + Groq both failed). Try again shortly." },
        { status: 500 }
      );
    }

    // Parse into structured response
    const parsed = parseAIResponse(rawReply, sectionsInput);

    return NextResponse.json({
      reply:        rawReply,          // full raw text (for display / logging)
      score:        parsed.score,
      sections:     parsed.sections,
      deductions:   parsed.deductions,
      strengths:    parsed.strengths,
      errors:       parsed.errors,
      improvements: parsed.improvements,
      feedback:     parsed.feedback,
      mode:         isSummaryMode ? "summary" : "qp_as",
    });

  } catch (err: any) {
    console.error("[verify-marks ERROR]:", err.message);
    return NextResponse.json({ reply: "Server error. Please try again." }, { status: 500 });

  } finally {
    if (uploadedBlobs.length > 0) {
      await Promise.all(uploadedBlobs.map((url) => del(url))).catch((e) =>
        console.warn("[verify-marks] Blob cleanup failed:", e)
      );
    }
  }
}