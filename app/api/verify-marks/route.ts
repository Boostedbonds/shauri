/**
 * app/api/verify-marks/route.ts
 *
 * THREE upload modes:
 *   MODE A — QP + Answer Sheet  (typed PDF + handwritten images/PDF)
 *   MODE B — Result Summary     (scanned teacher-checked sheet with marks written on it)
 *
 * Section mark schema:
 *   Daily   (30m): A=5  B=6  C=6  D=5  E-Writing=3  E-Vocab=5  → 30
 *   Revision(60m): A=10 B=10 C=12 D=10 E-Writing=6  E-Vocab=10 → 60
 *
 * Returns: { reply, sectionBreakdown, errorLog }
 */

import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
export interface SectionScore {
  key: string;         // "A" | "B" | "C" | "D" | "E-Writing" | "E-Vocab"
  label: string;       // "Section A – MCQs"
  obtained: number;
  total: number;
  status: "strong" | "good" | "needs_attention" | "weak";
}

export interface ErrorEntry {
  section: string;     // "A" | "B" | "C" | "D" | "E-Writing" | "E-Vocab"
  qNum?: string;       // "Q3", "Q7(ii)"
  topic: string;       // CBSE concept
  issue: string;       // what the student did wrong
  severity: "minor" | "moderate" | "critical";
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function scoreStatus(obtained: number, total: number): SectionScore["status"] {
  if (total === 0) return "good";
  const pct = obtained / total;
  if (pct >= 0.85) return "strong";
  if (pct >= 0.65) return "good";
  if (pct >= 0.40) return "needs_attention";
  return "weak";
}

function sectionConfig(isRevision: boolean) {
  return isRevision
    ? {
        A: { label: "Section A – MCQs", total: 10 },
        B: { label: "Section B – Very Short Answer", total: 10 },
        C: { label: "Section C – Short Answer", total: 12 },
        D: { label: "Section D – Case Study", total: 10 },
        "E-Writing": { label: "Section E – Writing Task", total: 6 },
        "E-Vocab":   { label: "Section E – Vocabulary", total: 10 },
      }
    : {
        A: { label: "Section A – MCQs", total: 5 },
        B: { label: "Section B – Very Short Answer", total: 6 },
        C: { label: "Section C – Short Answer", total: 6 },
        D: { label: "Section D – Case Study", total: 5 },
        "E-Writing": { label: "Section E – Writing Task", total: 3 },
        "E-Vocab":   { label: "Section E – Vocabulary", total: 5 },
      };
}

function sectionTotalsLine(isRevision: boolean) {
  return isRevision
    ? "A=10, B=10, C=12, D=10, E-Writing=6, E-Vocab=10  →  Total=60"
    : "A=5,  B=6,  C=6,  D=5,  E-Writing=3, E-Vocab=5   →  Total=30";
}

/* ─────────────────────────────────────────────
   PDF TEXT EXTRACTION
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   PARSE AI RESPONSE → structured data
───────────────────────────────────────────── */
function parseAIResponse(
  raw: string,
  total: number,
  isRevision: boolean
): { sectionBreakdown: SectionScore[]; errorLog: ErrorEntry[] } {
  const cfg = sectionConfig(isRevision);
  const sectionBreakdown: SectionScore[] = [];

  // Match lines like: SECTION_A: 4/5  or  SECTION_E-Writing: 2/3
  const secRegex = /SECTION[_\s-]?(A|B|C|D|E[\s_-]?Writing|E[\s_-]?Vocab)\s*:\s*(\d+)(?:\/\d+)?/gi;
  const found: Record<string, number> = {};
  let m: RegExpExecArray | null;
  while ((m = secRegex.exec(raw)) !== null) {
    const rawKey = m[1].replace(/[\s_-]/g, "");
    const key =
      rawKey === "EWriting" ? "E-Writing" :
      rawKey === "EVocab"   ? "E-Vocab"   : rawKey;
    found[key] = parseInt(m[2]);
  }

  for (const [key, { label, total: secTotal }] of Object.entries(cfg)) {
    const obtained = found[key] ?? -1;
    if (obtained >= 0) {
      sectionBreakdown.push({
        key, label,
        obtained: Math.min(obtained, secTotal),
        total: secTotal,
        status: scoreStatus(obtained, secTotal),
      });
    }
  }

  // ── Error log ─────────────────────────────────────────────────
  const errorLog: ErrorEntry[] = [];

  function detectSection(text: string): string {
    if (/[Ee][\s-]?[Vv]ocab/i.test(text))   return "E-Vocab";
    if (/[Ee][\s-]?[Ww]rit/i.test(text))     return "E-Writing";
    if (/[Ss]ection\s*[Dd]|case\s*study/i.test(text)) return "D";
    if (/[Ss]ection\s*[Cc]|short\s*ans/i.test(text))  return "C";
    if (/[Ss]ection\s*[Bb]|very\s*short/i.test(text)) return "B";
    if (/[Ss]ection\s*[Aa]|\bmcq\b/i.test(text))      return "A";
    return "?";
  }

  function detectSeverity(text: string): ErrorEntry["severity"] {
    const loss = text.match(/-\s*(\d+)\s*mark/i);
    if (!loss) return "minor";
    const n = parseInt(loss[1]);
    if (n >= 3) return "critical";
    if (n >= 2) return "moderate";
    return "minor";
  }

  // ERRORS: csv
  const errorsBlock = raw.match(/ERRORS:\s*([^\n]+)/i)?.[1] || "";
  errorsBlock.split(",").forEach(e => {
    const topic = e.trim().replace(/\.$/, "");
    if (topic && topic.toLowerCase() !== "none") {
      errorLog.push({ section: "?", topic, issue: `Weak concept: ${topic}`, severity: "moderate" });
    }
  });

  // DEDUCTIONS: line-by-line
  const deductionBlock = raw.match(/DEDUCTIONS:([\s\S]*?)(?:\n[A-Z_]+:|$)/)?.[1] || "";
  deductionBlock.split("\n").forEach(line => {
    const clean = line.trim();
    if (!clean || /^none$/i.test(clean) || clean.startsWith("(")) return;
    const qNum = clean.match(/^(Q[\d.]+[a-z]?(?:\([ivxIVX]+\))?)/i)?.[1];
    const section = detectSection(clean);
    const topic = clean.match(/[Tt]opic:\s*([^.\n]+)/)?.[1]?.trim()
      || clean.match(/\bfor\s+([A-Za-z '\/]+?)(?:\.|,|-\d|$)/i)?.[1]?.trim()
      || "General";
    errorLog.push({ section, qNum, topic, issue: clean, severity: detectSeverity(clean) });
  });

  return { sectionBreakdown, errorLog };
}

/* ─────────────────────────────────────────────
   GEMINI — MODE A: QP + Answer Sheet
───────────────────────────────────────────── */
async function callGeminiQPAS(
  qpText: string,
  asPages: { buffer: Buffer; mimeType: string }[],
  claimedMarks: number,
  total: number,
  subject: string,
  chapter: string,
  day: string,
  isRevision: boolean
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return null;

  const cfg = sectionConfig(isRevision);
  const sectionLines = Object.entries(cfg)
    .map(([k, v]) => `SECTION_${k}: X/${v.total}`)
    .join("\n");

  const asParts = asPages.map(({ buffer, mimeType }) => ({
    inlineData: {
      mimeType: mimeType.startsWith("image/") ? mimeType : "application/pdf",
      data: buffer.toString("base64"),
    },
  }));

  const prompt = `You are a strict CBSE board examiner checking a student's handwritten answer sheet.

Subject: ${subject} | Chapter/Topic: ${chapter} | Day: ${day}
Student's claimed total: ${claimedMarks}/${total}
Section totals: ${sectionTotalsLine(isRevision)}
Answer sheet pages attached: ${asPages.length}

QUESTION PAPER TEXT:
${qpText}

Read ALL answer sheet pages before scoring.

Reply in EXACTLY this format — no extra text:

SCORE: X/${total}

${sectionLines}

DEDUCTIONS:
Q2: Student wrote (A), correct is (B). Section A. -1 mark. Topic: Euclid's Division Lemma.
Q11: Definition incomplete — missing key clause. Section B. -2 marks. Topic: HCF.
(write "None" if no deductions)

ERRORS: topic1, topic2, topic3

FEEDBACK: 2–3 sentences of specific improvement advice based on actual mistakes only.

RULES:
- Never hallucinate errors. If unsure, skip that question.
- State Section label for every deduction.
- For MCQs: compare student's choice vs correct answer explicitly.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...asParts, { text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  if (!res.ok) {
    console.error("[verify] Gemini QP+AS error:", (await res.text()).slice(0, 300));
    return null;
  }
  try {
    const d = await res.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch { return null; }
}

/* ─────────────────────────────────────────────
   GEMINI — MODE B: Result Summary
   Teacher-checked sheet with marks written on it.
───────────────────────────────────────────── */
async function callGeminiResultSummary(
  pages: { buffer: Buffer; mimeType: string }[],
  total: number,
  subject: string,
  chapter: string,
  day: string,
  isRevision: boolean
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return null;

  const cfg = sectionConfig(isRevision);
  const sectionLines = Object.entries(cfg)
    .map(([k, v]) => `SECTION_${k}: X/${v.total}`)
    .join("\n");

  const parts = pages.map(({ buffer, mimeType }) => ({
    inlineData: {
      mimeType: mimeType.startsWith("image/") ? mimeType : "application/pdf",
      data: buffer.toString("base64"),
    },
  }));

  const prompt = `You are a CBSE board examiner reading a student's already-marked result summary.

Subject: ${subject} | Chapter/Topic: ${chapter} | Day: ${day}
Total marks for this paper: ${total}
Section totals: ${sectionTotalsLine(isRevision)}
Pages provided: ${pages.length}

This is a RESULT SUMMARY — the teacher has already written marks on it.
Look for: circled answers, red-pen corrections, marks written as "2/3", ticks (✓) and crosses (✗), totals per section.

Reply in EXACTLY this format — no extra text:

SCORE: X/${total}

${sectionLines}

DEDUCTIONS:
Q2: Marked wrong by teacher. Section A. -1 mark. Topic: Euclid's Division Lemma.
Q7(ii): Partial — teacher wrote 1/3. Section C. -2 marks. Topic: Irrational number proof.
(write "None" if no deductions visible)

ERRORS: topic1, topic2, topic3

FEEDBACK: 2–3 sentences of specific improvement advice.

STRENGTHS: SectionA, SectionD
(sections where student scored ≥ 80%)

IMPROVEMENT_NEEDED: SectionC, SectionE-Writing
(sections where student scored < 60%)

RULES:
- Only report deductions explicitly marked by the teacher.
- If a section score is not visible, write "Not visible" for that line.
- Never invent marks — only read what is shown.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...parts, { text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  if (!res.ok) {
    console.error("[verify] Gemini Result Summary error:", (await res.text()).slice(0, 300));
    return null;
  }
  try {
    const d = await res.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch { return null; }
}

/* ─────────────────────────────────────────────
   GROQ FALLBACK — text only
───────────────────────────────────────────── */
async function callGroqFallback(
  qpText: string,
  docText: string,
  claimedMarks: number,
  total: number,
  subject: string,
  chapter: string,
  day: string,
  isRevision: boolean,
  mode: "qp_as" | "result_summary"
): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) return null;

  const cfg = sectionConfig(isRevision);
  const sectionLines = Object.entries(cfg)
    .map(([k, v]) => `SECTION_${k}: X/${v.total}`)
    .join("\n");

  const modeNote = mode === "result_summary"
    ? "The text below is from a RESULT SUMMARY — a teacher-checked paper with marks written on it. Extract per-question marks from the text."
    : "The text below is OCR-extracted from a handwritten answer sheet and may be incomplete. Only deduct marks where 100% certain.";

  const prompt = `You are a strict CBSE board examiner.
Subject: ${subject} | Chapter: ${chapter} | Day: ${day}
Claimed: ${claimedMarks}/${total} | Sections: ${sectionTotalsLine(isRevision)}

${modeNote}

${qpText ? `QUESTION PAPER:\n${qpText}\n\n` : ""}STUDENT DOCUMENT:\n${docText}

Reply EXACTLY in this format:

SCORE: X/${total}

${sectionLines}

DEDUCTIONS:
(list or "None — could not verify")

ERRORS: topic1, topic2
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
        { role: "system", content: "You are a strict CBSE examiner. Never hallucinate mark deductions." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    console.error("[verify] Groq error:", (await res.text()).slice(0, 300));
    return null;
  }
  try {
    const d = await res.json();
    return d?.choices?.[0]?.message?.content || null;
  } catch { return null; }
}

/* ─────────────────────────────────────────────
   MAIN POST HANDLER
───────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const uploadedBlobs: string[] = [];

  try {
    const body = await req.json();
    const {
      marks,        // number: student's claimed total (optional for result_summary mode)
      total,        // number: paper total marks
      subject,
      chapter,
      day,
      isRevision,   // boolean
      qpUrl,        // string  — MODE A
      asUrls,       // string[] — MODE A answer sheet pages
      resultUrls,   // string[] — MODE B result summary pages
    } = body;

    const isRevisionDay = Boolean(isRevision);
    const hasResultSummary = Array.isArray(resultUrls) && resultUrls.length > 0;
    const asUrlList: string[] = Array.isArray(asUrls) ? asUrls : asUrls ? [asUrls] : [];
    const mode: "qp_as" | "result_summary" = hasResultSummary ? "result_summary" : "qp_as";

    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ reply: "Missing or invalid total marks." }, { status: 400 });
    }
    if (mode === "qp_as" && (!qpUrl || asUrlList.length === 0)) {
      return NextResponse.json({ reply: "Upload both question paper and answer sheet." }, { status: 400 });
    }
    if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ reply: "Missing AI keys." }, { status: 500 });
    }

    if (mode === "qp_as") uploadedBlobs.push(qpUrl, ...asUrlList);
    else uploadedBlobs.push(...resultUrls);

    let rawReply: string | null = null;

    /* ── MODE A: QP + Answer Sheet ── */
    if (mode === "qp_as") {
      const qpRes = await fetch(qpUrl);
      if (!qpRes.ok) throw new Error("Failed to fetch question paper.");
      const qpText = await extractPdfText(Buffer.from(await qpRes.arrayBuffer()));

      const asPages: { buffer: Buffer; mimeType: string }[] = [];
      for (const url of asUrlList) {
        const r = await fetch(url);
        if (!r.ok) throw new Error("Failed to fetch answer sheet page.");
        asPages.push({
          buffer: Buffer.from(await r.arrayBuffer()),
          mimeType: r.headers.get("content-type") || "image/jpeg",
        });
      }

      rawReply = await callGeminiQPAS(
        qpText, asPages, marks ?? 0, total, subject, chapter, day, isRevisionDay
      );

      if (!rawReply) {
        let asText = "[Could not extract text from handwritten sheet]";
        try {
          const pdfModule = await import("pdf-parse");
          const pp = (pdfModule as any).default || pdfModule;
          asText = (await pp(asPages[0].buffer))?.text?.slice(0, 15000) || asText;
        } catch {}
        rawReply = await callGroqFallback(
          qpText, asText, marks ?? 0, total, subject, chapter, day, isRevisionDay, "qp_as"
        );
      }
    }

    /* ── MODE B: Result Summary ── */
    if (mode === "result_summary") {
      const pages: { buffer: Buffer; mimeType: string }[] = [];
      for (const url of resultUrls) {
        const r = await fetch(url);
        if (!r.ok) throw new Error("Failed to fetch result summary.");
        pages.push({
          buffer: Buffer.from(await r.arrayBuffer()),
          mimeType: r.headers.get("content-type") || "image/jpeg",
        });
      }

      rawReply = await callGeminiResultSummary(
        pages, total, subject, chapter, day, isRevisionDay
      );

      if (!rawReply) {
        let resText = "[Could not extract text]";
        try {
          const pdfModule = await import("pdf-parse");
          const pp = (pdfModule as any).default || pdfModule;
          resText = (await pp(pages[0].buffer))?.text?.slice(0, 15000) || resText;
        } catch {}
        rawReply = await callGroqFallback(
          "", resText, marks ?? 0, total, subject, chapter, day, isRevisionDay, "result_summary"
        );
      }
    }

    if (!rawReply) {
      return NextResponse.json(
        { reply: "AI unavailable (Gemini + Groq both failed). Try again shortly." },
        { status: 500 }
      );
    }

    const { sectionBreakdown, errorLog } = parseAIResponse(rawReply, total, isRevisionDay);

    return NextResponse.json({ reply: rawReply, sectionBreakdown, errorLog });

  } catch (err: any) {
    console.error("[verify-marks ERROR]:", err.message);
    return NextResponse.json({ reply: "Server error. Please try again." }, { status: 500 });

  } finally {
    if (uploadedBlobs.length > 0) {
      await Promise.all(uploadedBlobs.map(url => del(url))).catch(e =>
        console.warn("[verify-marks] Blob cleanup failed:", e)
      );
    }
  }
}