import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name?: string;
  class?: string;
  board?: string;
  sessionId?: string;
};

type ExamSession = {
  session_key: string;
  status: "IDLE" | "READY" | "IN_EXAM" | "FAILED";
  subject_request?: string;
  subject?: string;
  custom_instructions?: string;
  question_paper?: string;
  answer_log: string[];
  started_at?: number;
  total_marks?: number;
  syllabus_from_upload?: string;
  student_name?: string;
  student_class?: string;
  student_board?: string;
};

type ChapterEntry = { number: number; name: string };

// ─────────────────────────────────────────────────────────────
// INPUT VALIDATION
// ─────────────────────────────────────────────────────────────

const VALID_BOARDS = ["CBSE", "ICSE", "IB"];
const MIN_CLASS    = 6;
const MAX_CLASS    = 12;

function sanitiseBoard(raw: string): string {
  const upper = (raw || "").toUpperCase().trim();
  return VALID_BOARDS.includes(upper) ? upper : "CBSE";
}

function sanitiseClass(raw: string): string {
  const n = parseInt(raw);
  if (isNaN(n)) return String(syllabus.class);
  return String(Math.min(Math.max(n, MIN_CLASS), MAX_CLASS));
}

// ─────────────────────────────────────────────────────────────
// PARSE CUSTOM PAPER REQUIREMENTS FROM STUDENT COMMAND
// ─────────────────────────────────────────────────────────────

interface PaperRequirements {
  totalMarks: number | null;         // e.g. 30
  timeMinutes: number | null;        // e.g. 60
  questionTypes: string[];           // e.g. ["mcq", "short answer"]
  questionCount: number | null;      // e.g. 20
  marksEach: number | null;          // e.g. 1
  chapterFilter: string | null;      // e.g. "chapters 1-3"
  isCustom: boolean;
}

/**
 * Parse a student's free-form command into structured paper requirements.
 * Examples:
 *   "prepare 30 marks exam"          → totalMarks: 30
 *   "give me 20 MCQ questions"       → questionCount: 20, questionTypes: ["mcq"]
 *   "1 hour test"                    → timeMinutes: 60
 *   "30 min practice"                → timeMinutes: 30
 *   "10 questions of 2 marks each"   → questionCount: 10, marksEach: 2, totalMarks: 20
 *   "chapters 1-3 only"              → chapterFilter: "chapters 1-3"
 */
function parsePaperRequirements(text: string): PaperRequirements {
  const t = text.toLowerCase();

  // Total marks
  const marksMatch =
    t.match(/(\d+)\s*(?:marks?|mark)\s*(?:exam|test|paper|quiz)?/) ||
    t.match(/(?:exam|test|paper|quiz)\s*(?:of|for)?\s*(\d+)\s*marks?/);
  const totalMarks = marksMatch ? parseInt(marksMatch[1]) : null;

  // Time
  let timeMinutes: number | null = null;
  const hoursMatch   = t.match(/(\d+)\s*(?:hour|hr)s?\b/);
  const minutesMatch = t.match(/(\d+)\s*(?:minute|min)s?\b/);
  if (hoursMatch)   timeMinutes = parseInt(hoursMatch[1]) * 60;
  if (minutesMatch) timeMinutes = (timeMinutes || 0) + parseInt(minutesMatch[1]);
  if (timeMinutes === 0) timeMinutes = null;

  // Question types
  const questionTypes: string[] = [];
  if (/\b(mcq|multiple.?choice)\b/.test(t))      questionTypes.push("MCQ");
  if (/\bshort\s*answer\b/.test(t))               questionTypes.push("Short Answer");
  if (/\blong\s*answer\b/.test(t))                questionTypes.push("Long Answer");
  if (/\bfill\s*in\b/.test(t))                    questionTypes.push("Fill in the Blank");
  if (/\btrue.false\b/.test(t))                   questionTypes.push("True/False");
  if (/\bone.word\b/.test(t))                     questionTypes.push("One-Word");
  if (/\bvery\s*short\b/.test(t))                 questionTypes.push("Very Short Answer");

  // Question count
  const countMatch =
    t.match(/(\d+)\s*(?:mcq|questions?|q\.?s?|problems?|items?)/) ||
    t.match(/(?:give|prepare|make|create)\s*(\d+)/);
  const questionCount = countMatch ? parseInt(countMatch[1]) : null;

  // Marks each
  const marksEachMatch =
    t.match(/(\d+)\s*marks?\s*each/) ||
    t.match(/each\s*(?:carrying|of|worth)\s*(\d+)\s*marks?/);
  const marksEach = marksEachMatch ? parseInt(marksEachMatch[1]) : null;

  // Compute totalMarks from count × marksEach if not explicit
  let computedTotal = totalMarks;
  if (!computedTotal && questionCount && marksEach) {
    computedTotal = questionCount * marksEach;
  }

  // Chapter filter
  const chapterMatch =
    t.match(/chapters?\s*([\d,\-\s]+(?:and\s*\d+)?)/) ||
    t.match(/(?:from|only)\s*ch(?:apter)?s?\s*([\d,\-\s]+)/);
  const chapterFilter = chapterMatch ? `chapters ${chapterMatch[1].trim()}` : null;

  const isCustom =
    computedTotal !== null ||
    timeMinutes !== null ||
    questionTypes.length > 0 ||
    questionCount !== null ||
    chapterFilter !== null;

  return {
    totalMarks:    computedTotal,
    timeMinutes,
    questionTypes,
    questionCount,
    marksEach,
    chapterFilter,
    isCustom,
  };
}

/**
 * Returns true if the message contains specific paper-format instructions
 * beyond just naming a subject.
 */
function hasCustomInstructions(text: string): boolean {
  return /\b(mcq|multiple.?choice|chapter|chapters|marks?\s+each|carrying|only\s+\d|q\d|question\s+\d|\d+\s+question|\d+\s+mcq|short\s+answer|long\s+answer|fill\s+in|true.false|one.word|very\s+short|section\s+[a-z]|\d+\s*marks?|\d+\s*(?:hour|hr|minute|min))\b/i.test(text);
}

/**
 * Extract the core subject keyword from a custom instruction message.
 */
function extractSubjectFromInstruction(text: string): string {
  const subjectPatterns = [
    /\b(science|physics|chemistry|biology)\b/i,
    /\b(mathematics|maths?)\b/i,
    /\b(history)\b/i,
    /\b(geography|geo)\b/i,
    /\b(civics?|political\s*science|democratic\s*politics)\b/i,
    /\b(economics?|eco)\b/i,
    /\b(sst|social\s*science)\b/i,
    /\b(english)\b/i,
    /\b(hindi)\b/i,
  ];
  for (const pat of subjectPatterns) {
    const m = text.match(pat);
    if (m) return m[1];
  }
  return text;
}

/**
 * Format minutes into a human-readable time string.
 */
function formatTimeAllowed(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} Hour${h > 1 ? "s" : ""}`;
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} Hour${h > 1 ? "s" : ""} ${m} Minutes`;
  }
  return `${minutes} Minutes`;
}

// ─────────────────────────────────────────────────────────────
// SUPABASE SESSION HELPERS
// ─────────────────────────────────────────────────────────────

async function getSession(key: string): Promise<ExamSession | null> {
  try {
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("session_key", key)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      answer_log: Array.isArray(data.answer_log) ? data.answer_log : [],
    } as ExamSession;
  } catch {
    return null;
  }
}

async function saveSession(session: ExamSession): Promise<void> {
  try {
    await supabase.from("exam_sessions").upsert(
      { ...session, updated_at: new Date().toISOString() },
      { onConflict: "session_key" }
    );
  } catch {
    console.error("saveSession failed for key:", session.session_key);
  }
}

async function deleteSession(key: string): Promise<void> {
  try {
    await supabase.from("exam_sessions").delete().eq("session_key", key);
  } catch {
    console.error("deleteSession failed for key:", key);
  }
}

async function getSessionByStudent(
  studentName: string,
  studentClass: string,
  requiredStatus?: ExamSession["status"]
): Promise<ExamSession | null> {
  if (!studentName) return null;

  async function runQuery(nameVal: string, classVal?: string): Promise<ExamSession | null> {
    try {
      let q = supabase
        .from("exam_sessions")
        .select("*")
        .eq("student_name", nameVal);

      if (classVal) {
        q = (q as any).eq("student_class", classVal);
      }
      if (requiredStatus) {
        q = (q as any).eq("status", requiredStatus);
      }

      const { data, error } = await (q as any)
        .order("updated_at", { ascending: false })
        .limit(1);

      console.log("[getSessionByStudent]", { nameVal, classVal, requiredStatus, found: data?.length, error: error?.message });

      if (error || !data || data.length === 0) return null;
      return {
        ...data[0],
        answer_log: Array.isArray(data[0].answer_log) ? data[0].answer_log : [],
      } as ExamSession;
    } catch (e) {
      console.error("[getSessionByStudent] threw:", e);
      return null;
    }
  }

  const r1 = await runQuery(studentName, studentClass);
  if (r1) return r1;

  if (studentClass) {
    const r2 = await runQuery(studentName);
    if (r2) return r2;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// SYLLABUS HELPERS
// ─────────────────────────────────────────────────────────────

function getChaptersForSubject(
  subjectRequest: string,
  studentClass: string
): { subjectName: string; chapterList: string } {
  const req      = subjectRequest.toLowerCase();
  const classNum = parseInt(studentClass) || 9;

  if (classNum === 9) {
    const s = syllabus.subjects;

    if (/science|physics|chemistry|biology/.test(req)) {
      return {
        subjectName: s.science.name,
        chapterList:
          (s.science.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n"),
      };
    }

    if (/math/.test(req)) {
      return {
        subjectName: s.mathematics.name,
        chapterList:
          (s.mathematics.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n"),
      };
    }

    if (/history/.test(req)) {
      return {
        subjectName: "Social Science – History",
        chapterList:
          (s.social_science.history.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n"),
      };
    }

    if (/geo|geography/.test(req)) {
      return {
        subjectName: "Social Science – Geography (Contemporary India I)",
        chapterList:
          (s.social_science.geography.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n"),
      };
    }

    if (/civic|politic|democracy/.test(req)) {
      return {
        subjectName: "Social Science – Civics (Democratic Politics I)",
        chapterList:
          (s.social_science.civics.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n"),
      };
    }

    if (/econ/.test(req)) {
      return {
        subjectName: "Social Science – Economics",
        chapterList:
          (s.social_science.economics.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n"),
      };
    }

    if (/sst|social/.test(req)) {
      const hist = (s.social_science.history.chapters as ChapterEntry[])
        .map((c) => `[History] Ch${c.number}: ${c.name}`)
        .join("\n");
      const geo = (s.social_science.geography.chapters as ChapterEntry[])
        .map((c) => `[Geography] Ch${c.number}: ${c.name}`)
        .join("\n");
      const civ = (s.social_science.civics.chapters as ChapterEntry[])
        .map((c) => `[Civics] Ch${c.number}: ${c.name}`)
        .join("\n");
      const eco = (s.social_science.economics.chapters as ChapterEntry[])
        .map((c) => `[Economics] Ch${c.number}: ${c.name}`)
        .join("\n");
      return {
        subjectName: "Social Science (SST)",
        chapterList:
          `HISTORY:\n${hist}\n\nGEOGRAPHY:\n${geo}\n\nCIVICS:\n${civ}\n\nECONOMICS:\n${eco}`,
      };
    }

    if (/english/.test(req)) {
      const { fiction, poetry, drama } = s.english.sections;
      return {
        subjectName: "English – Beehive",
        chapterList:
          `FICTION:\n${fiction.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `POETRY:\n${poetry.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `DRAMA:\n${drama.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`,
      };
    }

    if (/hindi/.test(req)) {
      const { prose_poetry, grammar } = s.hindi.sections;
      return {
        subjectName: "Hindi",
        chapterList:
          `PROSE & POETRY:\n${prose_poetry.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `GRAMMAR:\n${grammar.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`,
      };
    }

    return {
      subjectName: subjectRequest,
      chapterList:
        `INSTRUCTION FOR AI: Retrieve the complete official NCERT Class 9 ` +
        `${subjectRequest} chapter list from your training knowledge and use those exact ` +
        `chapters. Do NOT invent chapters.`,
    };
  }

  const subjectLabel =
    /science|physics|chemistry|biology/.test(req) ? "Science" :
    /math/.test(req)                               ? "Mathematics" :
    /history/.test(req)                            ? "Social Science – History" :
    /geo|geography/.test(req)                      ? "Social Science – Geography" :
    /civic|politic|democracy/.test(req)            ? "Social Science – Civics/Political Science" :
    /econ/.test(req)                               ? "Economics" :
    /sst|social/.test(req)                         ? "Social Science (History + Geography + Civics + Economics)" :
    /english/.test(req)                            ? "English" :
    /hindi/.test(req)                              ? "Hindi" :
    subjectRequest;

  return {
    subjectName: `${subjectLabel} – Class ${classNum}`,
    chapterList:
      `INSTRUCTION FOR AI: Local syllabus data is not stored for Class ${classNum}.\n` +
      `You MUST retrieve the complete and accurate official NCERT/CBSE Class ${classNum} ` +
      `${subjectLabel} chapter list from your training knowledge of the ncert.nic.in curriculum.\n` +
      `Use the REAL chapter names exactly as they appear in the NCERT textbooks for Class ${classNum}.\n` +
      `Do NOT invent or guess chapter names.\n` +
      `Do NOT use chapters from any other class.\n` +
      `Use only the genuine NCERT Class ${classNum} ${subjectLabel} syllabus as prescribed by CBSE.`,
  };
}

// ─────────────────────────────────────────────────────────────
// GENERAL HELPERS
// ─────────────────────────────────────────────────────────────

function getKey(student?: StudentContext): string {
  if (student?.sessionId) return student.sessionId;
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

function isGreeting(text: string) {
  return /^(hi|hello|hey)\b/i.test(text.trim());
}

function isSubmit(text: string) {
  return /^(submit|done|finish|finished)\b/i.test(text.trim());
}

function isStart(text: string) {
  return text.trim().toLowerCase() === "start";
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0)   return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function parseScore(text: string): { obtained: number; total: number } {
  const match =
    text.match(/total\s*marks\s*obtained\s*[:\|]\s*(\d+)\s*\/\s*(\d+)/i) ||
    text.match(/total[:\s]+(\d+)\s*\/\s*(\d+)/i) ||
    text.match(/(\d+)\s*\/\s*(\d+)/) ||
    text.match(/(\d+)\s+out of\s+(\d+)/i);
  if (match) {
    return { obtained: parseInt(match[1]), total: parseInt(match[2]) };
  }
  console.warn("[parseScore] Could not extract score from evaluation text.");
  return { obtained: 0, total: 0 };
}

function parseTotalMarksFromPaper(paper: string): number {
  const match = paper.match(
    /(?:maximum\s*marks?|total\s*marks?)\s*[:\-]\s*(\d+)/i
  );
  if (!match) {
    console.warn("[parseTotalMarksFromPaper] Could not extract total marks — defaulting to 80.");
    return 80;
  }
  return parseInt(match[1]);
}

function sanitiseUpload(raw: string): string {
  return raw
    .slice(0, 8000)
    .replace(/system\s*:/gi, "")
    .replace(/ignore\s+previous\s+instructions?/gi, "")
    .replace(/you\s+are\s+now/gi, "")
    .replace(/disregard\s+all/gi, "")
    .trim();
}

// ─────────────────────────────────────────────────────────────
// SYLLABUS EXTRACTION FROM UPLOAD
// ─────────────────────────────────────────────────────────────

async function parseSyllabusFromUpload(
  uploadedText: string,
  cls: string,
  board: string
): Promise<{ subjectName: string; chapterList: string; raw: string }> {
  const safe = sanitiseUpload(uploadedText);

  const extractionPrompt = `
You are a syllabus extraction assistant for CBSE Class ${cls} students.
The following text was extracted from a student's uploaded syllabus document.

Your job:
1. Identify the PRIMARY subject name. If multiple subjects appear in the document, pick the ONE that has the most content listed. Write it as a clean, short name (e.g. "English", "Mathematics", "Science", "Social Science – History", "Hindi"). DO NOT list multiple subjects as a single subject name.
2. List every chapter, topic, unit, or section for that subject exactly as it appears.
3. Format your output EXACTLY as:

SUBJECT: <single clean subject name>

CHAPTERS / TOPICS:
1. <topic or chapter name>
2. <topic or chapter name>
...

Rules:
- SUBJECT line must be ONE subject only — not a comma-separated list
- If you see "English Language and Literature" → write SUBJECT: English
- If you see "Democratic Politics" or "Contemporary India" → write SUBJECT: Social Science
- If you see "Mathematics" or "Maths" → write SUBJECT: Mathematics
- Do NOT include any commentary — output the structured list only

RAW EXTRACTED TEXT FROM UPLOAD:
──────────────────────────────────────────
${safe}
──────────────────────────────────────────
`.trim();

  const extracted = await callAI(extractionPrompt, [
    { role: "user", content: "Extract the syllabus as instructed above." },
  ]);

  const subjectMatch = extracted.match(/^SUBJECT:\s*(.+)$/im);
  const subjectName  = subjectMatch ? subjectMatch[1].trim() : "Custom Subject";

  return {
    subjectName,
    chapterList:
      `🚨 UPLOADED SYLLABUS — STRICT BOUNDARY 🚨\n` +
      `ABSOLUTE RULE: Every question on this paper must come EXCLUSIVELY from the topics listed below.\n` +
      `A topic NOT listed below does NOT exist for this exam — do NOT include it under any circumstance.\n` +
      `Do NOT use standard NCERT chapters that are absent from this list.\n` +
      `Do NOT "fill gaps" with NCERT content. If fewer topics are listed, write more questions per listed topic.\n\n` +
      extracted,
    raw: extracted,
  };
}

// ─────────────────────────────────────────────────────────────
// SYLLABUS UPLOAD HANDLER
// ─────────────────────────────────────────────────────────────

async function handleSyllabusUpload(
  uploadedText: string,
  cls: string,
  board: string,
  key: string,
  name: string,
  currentStatus: "IDLE" | "READY"
): Promise<NextResponse> {
  if (!uploadedText || uploadedText.length <= 30) {
    return NextResponse.json({
      reply:
        `⚠️ Could not extract readable text from your upload.\n\n` +
        `Please try:\n` +
        `• A clearer photo with good lighting\n` +
        `• A text-based PDF (not a scanned image)\n` +
        `• Typing the subject name directly instead`,
    });
  }

  const { subjectName, chapterList, raw } =
    await parseSyllabusFromUpload(uploadedText, cls, board);

  const updatedSession: ExamSession = {
    session_key:          key,
    status:               "READY",
    subject_request:      subjectName,
    subject:              subjectName,
    answer_log:           [],
    syllabus_from_upload: chapterList,
    student_name:         name,
    student_class:        cls,
    student_board:        board,
  };
  await saveSession(updatedSession);

  console.log("[SYLLABUS UPLOAD] Saved session:", key, "subject:", subjectName, "syllabusLength:", chapterList.length);

  const isOverride = currentStatus === "READY";
  return NextResponse.json({
    reply:
      `📄 **Syllabus ${isOverride ? "updated" : "uploaded"} successfully!**\n\n` +
      `**Subject detected:** ${subjectName}\n\n` +
      `**Topics / Chapters found:**\n${raw}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `The exam paper will be generated **strictly based on the above syllabus only**.\n\n` +
      `✅ If this looks correct, type **start** to begin your exam.\n` +
      `💡 You can also specify the format, e.g.:\n` +
      `   • "prepare 30 marks exam"\n` +
      `   • "give 20 MCQ questions"\n` +
      `   • "1 hour test with short answers"\n` +
      `✏️ If something is wrong, upload a clearer image or retype the subject name.`,
  });
}

// ─────────────────────────────────────────────────────────────
// CORE AI CALLER
// ─────────────────────────────────────────────────────────────

async function callAI(
  sysPrompt: string,
  messages: ChatMessage[],
  timeoutMs = 30_000
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "AI error: missing API key.";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sysPrompt }] },
          contents: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content || "" }],
            })),
        }),
      }
    );
    clearTimeout(timer);
    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to respond."
    );
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") {
      return "Request timed out. Please try again in a moment.";
    }
    return "AI server error. Please try again.";
  }
}

async function callAIForEvaluation(
  sysPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  return callAI(sysPrompt, messages, 90_000);
}

// ─────────────────────────────────────────────────────────────
// EXAM TIME LIMIT
// ─────────────────────────────────────────────────────────────

const MAX_EXAM_MS = 3 * 60 * 60 * 1000;

function isOverTime(startedAt?: number): boolean {
  if (!startedAt) return false;
  return Date.now() - startedAt > MAX_EXAM_MS;
}

// ─────────────────────────────────────────────────────────────
// MAIN POST HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode: string            = body?.mode || "";
    const student: StudentContext = body?.student || {};

    const name      = student?.name?.trim() || "";
    const greetName = name || "there";
    const callName  = name ? `, ${name}` : "";

    const clsRaw = sanitiseClass(student?.class || "");
    const cls    = clsRaw.replace(/^class\s*/i, "").trim();
    const board  = sanitiseBoard(student?.board || "");

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
      : [];

    const message: string =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    const rawUploadedText: string = body?.uploadedText || "";
    const uploadType: "syllabus" | "answer" | undefined = body?.uploadType ?? undefined;

    const bodySubject: string = body?.subject || "";
    const bodyLang: string    = body?.lang    || "";

    let uploadedText: string = sanitiseUpload(rawUploadedText);

    if (rawUploadedText.includes("[IMAGE_BASE64]")) {
      const base64Match = rawUploadedText.match(/\[IMAGE_BASE64\]\n(data:image\/[^;]+;base64,[^\n]+)/);
      if (base64Match) {
        const base64Data = base64Match[1];
        const mediaType  = base64Data.split(";")[0].replace("data:", "");
        const base64Raw  = base64Data.split(",")[1];

        const ocrPrompt =
          uploadType === "syllabus"
            ? "Extract all text from this syllabus image exactly as written. List every chapter, topic, and unit you can see."
            : "Extract all handwritten or printed text from this exam answer image. Transcribe every word exactly as written.";

        try {
          const geminiKey = process.env.GEMINI_API_KEY;
          if (geminiKey) {
            const visionRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{
                    role: "user",
                    parts: [
                      { text: ocrPrompt },
                      { inline_data: { mime_type: mediaType, data: base64Raw } },
                    ],
                  }],
                }),
              }
            );
            const visionData = await visionRes.json();
            const extracted  = visionData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (extracted.trim()) {
              uploadedText = sanitiseUpload(extracted);
            }
          }
        } catch {
          uploadedText = "";
        }
      }
    }

    const lower = message.toLowerCase().trim();

    const conversation: ChatMessage[] = [
      ...history.slice(-14),
      { role: "user", content: message },
    ];

    // ═══════════════════════════════════════════════════════════
    // TEACHER MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "teacher") {
      if (isGreeting(lower) && history.length === 0) {
        return NextResponse.json({
          reply: `Hi ${greetName}! 👋 I'm Shauri, your ${board} teacher${cls ? ` for Class ${cls}` : ""}. What would you like to learn today?`,
        });
      }

      const contextPrimer: ChatMessage[] = name ? [
        { role: "user", content: `My name is ${name}${cls ? `, I'm in Class ${cls}` : ""}${board ? `, ${board} board` : ""}.` },
        { role: "assistant", content: `Got it! I'll call you ${name}${cls ? ` (Class ${cls})` : ""}. How can I help you today?` },
      ] : [];

      const teacherConversation: ChatMessage[] = [
        ...contextPrimer,
        ...history.slice(-12),
        { role: "user", content: message },
      ];

      const teacherConversationText = [...history, { role: "user", content: message }]
        .map((m) => m.content).join(" ");

      const isHindiTeacher =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(teacherConversationText) ||
        /hindi|हिंदी/i.test(teacherConversationText);

      const isMathTeacher =
        !isHindiTeacher && (
          /math/i.test(bodySubject) ||
          /\b(mathematics|maths?|algebra|calculus|geometry|trigonometry|statistics|probability|polynomials?|coordinate geometry|quadrilateral|heron'?s? formula|surface area|volume|number system|linear equation|circles?|triangles?|constructions?|pythagoras|mensuration)\b/i.test(teacherConversationText)
        );

      const subjectOverride = isHindiTeacher
        ? "hindi"
        : isMathTeacher
          ? "mathematics"
          : undefined;

      const reply = await callAI(
        systemPrompt("teacher", subjectOverride),
        teacherConversation
      );
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // EXAMINER MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "examiner") {
      const key = getKey(student);

      let session: ExamSession = (await getSession(key)) || {
        session_key:   key,
        status:        "IDLE",
        answer_log:    [],
        student_name:  name,
        student_class: cls,
        student_board: board,
      };

      // ── KEY-MISMATCH RECOVERY ──────────────────────────────
      if (session.status === "IDLE") {
        let recovered: ExamSession | null = null;

        if (name) {
          recovered = await getSessionByStudent(name, cls);
        }

        if (!recovered || recovered.status === "IDLE") {
          const nameClassKey = `${name || "anon"}_${cls}`;
          if (nameClassKey !== key) {
            const byKey = await getSession(nameClassKey);
            if (byKey && byKey.status !== "IDLE") recovered = byKey;
          }
        }

        if (!recovered || recovered.status === "IDLE") {
          const nameXKey = `${name || "anon"}_x`;
          if (nameXKey !== key) {
            const byKey = await getSession(nameXKey);
            if (byKey && byKey.status !== "IDLE") recovered = byKey;
          }
        }

        if ((!recovered || recovered.status === "IDLE") && !name) {
          for (const anonKey of [`anon_${cls}`, `anon_x`]) {
            if (anonKey !== key) {
              const byKey = await getSession(anonKey);
              if (byKey && byKey.status !== "IDLE") { recovered = byKey; break; }
            }
          }
        }

        if (recovered && recovered.status !== "IDLE") {
          console.log("[KEY-MISMATCH] recovered session:", recovered.session_key, recovered.status, "syllabus:", !!recovered.syllabus_from_upload);
          session = recovered;
        }
      }

      if (isGreeting(lower) && session.status === "READY" && !uploadedText) {
        return NextResponse.json({
          reply:
            `📚 Welcome back${callName}! Your subject is set to **${session.subject}**.\n\n` +
            `Type **start** when you're ready to begin your exam. ⏱️ Timer starts immediately.\n\n` +
            `💡 Want a custom format? Type something like:\n` +
            `   • "prepare 30 marks exam"\n` +
            `   • "give 20 MCQ questions"\n` +
            `   • "1 hour test"\n\n` +
            `📎 Want to use a different syllabus? Upload a PDF or image now to override.`,
        });
      }

      if (isGreeting(lower) && session.status === "IN_EXAM") {
        const elapsed = session.started_at
          ? formatDuration(Date.now() - session.started_at)
          : "—";
        return NextResponse.json({
          reply:
            `⏱️ Your **${session.subject}** exam is still in progress!\n\n` +
            `Time elapsed: **${elapsed}**\n` +
            `Answers recorded: **${session.answer_log.length}**\n\n` +
            `Your question paper has been restored on the left. Continue answering.\n` +
            `When fully done, type **submit**.`,
          resumeExam: true,
          questionPaper: session.question_paper || "",
          startTime: session.started_at,
          subject: session.subject,
        });
      }

      if (isGreeting(lower) && session.status === "FAILED") {
        return NextResponse.json({
          reply:
            `⚠️ Welcome back${callName}! Your previous evaluation hit a timeout, but your answers are all saved.\n\n` +
            `Type **submit** to retry the evaluation.`,
        });
      }

      if (isGreeting(lower) && session.status === "IDLE" && !uploadedText) {
        return NextResponse.json({
          reply:
            `Hello ${greetName}! 📋 I'm your CBSE Examiner.\n\n` +
            `Tell me the **subject** you want to be tested on:\n` +
            `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
            `📎 **OR** upload your **syllabus as a PDF or image** and I'll generate a paper exactly based on it.\n\n` +
            `💡 You can also specify the format:\n` +
            `   • "prepare 30 marks exam for Hindi"\n` +
            `   • "give 20 MCQ questions on Science"\n` +
            `   • "1 hour Maths test"\n\n` +
            `⏱️ Your timer starts the moment you type **start**.`,
        });
      }

      if (isStart(lower) && session.status === "IDLE") {
        const confirmedSubject: string = body?.confirmedSubject || "";

        let readySession: ExamSession | null = null;

        if (name) {
          readySession = await getSessionByStudent(name, cls, "READY");
        }
        if (!readySession) {
          const nameClassKey = `${name || "anon"}_${cls}`;
          if (nameClassKey !== key) {
            const byKey = await getSession(nameClassKey);
            if (byKey?.status === "READY") readySession = byKey;
          }
        }
        if (!readySession) {
          const nameXKey = `${name || "anon"}_x`;
          if (nameXKey !== key) {
            const byKey = await getSession(nameXKey);
            if (byKey?.status === "READY") readySession = byKey;
          }
        }
        if (!readySession && !name) {
          for (const anonKey of [`anon_${cls}`, `anon_x`]) {
            if (anonKey !== key) {
              const byKey = await getSession(anonKey);
              if (byKey?.status === "READY") { readySession = byKey; break; }
            }
          }
        }

        console.log("[isStart+IDLE] readySession found:", readySession?.session_key, readySession?.subject, "hasSyllabus:", !!readySession?.syllabus_from_upload);

        if (readySession) {
          session.status               = "READY";
          session.subject              = readySession.subject;
          session.subject_request      = readySession.subject_request;
          session.custom_instructions  = readySession.custom_instructions;
          session.syllabus_from_upload = readySession.syllabus_from_upload;
          session.session_key          = readySession.session_key;
        } else if (confirmedSubject) {
          const { subjectName } = getChaptersForSubject(confirmedSubject, cls);
          const recoveredSession: ExamSession = {
            session_key:     key,
            status:          "READY",
            subject_request: confirmedSubject,
            subject:         subjectName,
            answer_log:      [],
            student_name:    name,
            student_class:   cls,
            student_board:   board,
          };
          await saveSession(recoveredSession);
          session.status          = "READY";
          session.subject         = subjectName;
          session.subject_request = confirmedSubject;
        } else {
          const directLookup = await getSession(key);
          if (directLookup && directLookup.status === "READY") {
            session.status               = "READY";
            session.subject              = directLookup.subject;
            session.subject_request      = directLookup.subject_request;
            session.custom_instructions  = directLookup.custom_instructions;
            session.syllabus_from_upload = directLookup.syllabus_from_upload;
            session.session_key          = directLookup.session_key;
            console.log("[isStart+IDLE] direct key re-lookup found READY session:", directLookup.session_key);
          } else {
            return NextResponse.json({
              reply:
                `Please tell me the **subject** you want to be tested on first${callName}.\n\n` +
                `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
                `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
            });
          }
        }
      }

      if (session.status === "FAILED") {
        if (isSubmit(lower)) {
          session.status = "IN_EXAM";
        } else {
          return NextResponse.json({
            reply:
              `⚠️ Your previous evaluation hit a timeout${callName}. Your answers are all saved.\n\n` +
              `Type **submit** to try the evaluation again.`,
          });
        }
      }

      if (isSubmit(lower) && session.status === "IN_EXAM") {
        const endTime   = Date.now();
        const overtime  = isOverTime(session.started_at);
        const timeTaken = session.started_at
          ? formatDuration(endTime - session.started_at)
          : "Unknown";

        if (session.answer_log.length === 0) {
          return NextResponse.json({
            reply:
              `⚠️ No answers were recorded${callName}. ` +
              `Please type or upload your answers before submitting.`,
          });
        }

        const fullAnswerTranscript = session.answer_log
          .map((entry, i) => `[Answer Entry ${i + 1}]\n${entry}`)
          .join("\n\n────────────────────────────────\n\n");

        const totalMarks = session.total_marks || 80;

        const evalSubj      = (session.subject || "").toLowerCase();
        const evalIsEnglish = /english/i.test(evalSubj);
        const evalIsHindi   = /hindi/i.test(evalSubj);
        const evalIsMath    = /math/i.test(evalSubj);
        const evalIsSST     = /sst|social|history|geography|civics|economics/i.test(evalSubj);
        const evalIsScience = /science|physics|chemistry|biology/i.test(evalSubj);

        const subjectMarkingRules = evalIsEnglish ? `
SECTION A — READING [20 marks total]
• Unseen passage MCQs (Q1a, Q2a): 1 mark each — correct = 1, wrong = 0
• Short-answer reading questions (Q1b, Q2b): 1 mark each for relevant, on-point answer
  — Deduct 0.5 for vague/incomplete, award 0 for irrelevant

SECTION B — WRITING SKILLS [20 marks total]
• Each writing task has sub-marks for: Format / Content / Expression / Accuracy
• Q3 Notice/Paragraph/Dialogue [5 marks]: Format 1 + Content 2 + Expression 2
• Q4 Short Writing [5 marks]: Format 1 + Content 2 + Expression 2
• Q5 Letter [5 marks]: Format 1 + Content 2 + Expression 2
• Q6 Long Composition [5 marks]: Content 2 + Expression 2 + Organisation 1
• Award marks proportionally — a strong answer with wrong format loses only format marks
• Language errors: deduct from Expression marks, not Content marks

SECTION C — GRAMMAR [20 marks total]
• Every grammar question is 1 mark — fully correct = 1, wrong/missing = 0
• No partial marks for grammar answers
• Accept alternate correct grammatical forms if they are standard English
• Spelling errors in grammar answers: deduct mark only if the error changes the grammar

SECTION D — LITERATURE [20 marks total]
• Extract MCQs (Q12, Q13): 1 mark each — correct = 1, wrong = 0
• Short answer (Q14): 2 marks each
    → Full answer with textual reference = 2/2
    → Correct idea but vague/no reference = 1/2
    → Wrong or off-topic = 0/2
• Long answer (Q15): 4 marks
    → Content/argument  : 2 marks
    → Expression/clarity: 1 mark
    → Textual evidence  : 1 mark` : evalIsHindi ? `
SECTION A — APATHIT (Unseen Reading) [20 marks]
• MCQs: 1 mark each — correct = 1, wrong = 0
• Short answers: 1 mark each for relevant answer in correct Hindi

SECTION B — LEKHAN (Writing) [20 marks]
• Each writing task [5 marks]: Format 1 + Content 2 + Bhasha (Language) 2
• Deduct from Bhasha for grammatical/spelling errors, not from Content

SECTION C — VYAKARAN (Grammar) [20 marks]
• 1 mark each — fully correct = 1, wrong = 0
• Accept grammatically valid alternatives

SECTION D — PATHEN (Literature) [20 marks]
• Extract MCQs: 1 mark each
• Short answers: 2 marks each (content 1 + expression 1)
• Long answer: 4 marks (content 2 + expression 1 + sandarbh/reference 1)` : evalIsMath ? `
SECTION A — MCQ & Assertion-Reason [1 mark each]
• MCQ: Correct option = 1, wrong = 0. No negative marking.
• Assertion-Reason: Award 1 mark ONLY for the correct option (a/b/c/d). No partial.

SECTION B — Very Short Answer [2 marks each]
• Both steps correct = 2/2
• Correct method but arithmetic error = 1/2
• Wrong method = 0/2

SECTION C — Short Answer [3 marks each]
• Award step marks: setup (1) + working (1) + correct answer (1)
• Correct method with wrong final answer due to arithmetic = 2/3
• Incomplete but correct start = 1/3

SECTION D — Long Answer [5 marks each]
• Award step marks throughout: each correct step = 1 mark
• Full working must be shown — answer without steps = 0
• Theorem proofs: Statement (1) + Construction/Figure (1) + Proof steps (2) + Conclusion (1)

SECTION E — Case Study [4 marks each]
• Sub-question (i): 1 mark — correct answer only
• Sub-question (ii): 1 mark — correct answer only
• Sub-question (iii): 2 marks — method (1) + answer (1)` : evalIsSST ? `
SECTION A — Objective [1 mark each]
• MCQ: Correct = 1, Wrong = 0. No negative marking.
• Assertion-Reason: Correct option = 1, wrong = 0.
• Fill in blank: Correct term = 1. Accept close paraphrases only if factually identical.

SECTION B — Short Answer [3 marks each]
• Award 1 mark per valid NCERT-accurate point (max 3 points)
• Must be from the correct chapter — off-topic answers = 0
• Map-related answers: correct identification = full marks, partial = partial

SECTION C — Long Answer [5 marks each]
• Introduction/Context : 1 mark
• Main explanation     : 2 marks (min 3 correct NCERT points)
• Example/Evidence     : 1 mark
• Conclusion           : 1 mark

SECTION D — Source-Based [4 marks each]
• Sub (i) 1 mark: factual identification from source
• Sub (ii) 1 mark: inference or connection
• Sub (iii) 2 marks: explanation using source + own knowledge

SECTION E — Map [5 marks total]
• Each correctly identified and labelled location = 1 mark
• Marking in wrong location = 0 (no partial for map questions)` : evalIsScience ? `
SECTION A — Objective [1 mark each]
• MCQ: Correct = 1, wrong = 0. No negative marking.
• Assertion-Reason: Correct option = 1.
• Fill in blank / one-word: Correct scientific term = 1. No partial.

SECTION B — Very Short Answer [2 marks each]
• 2 correct points / steps = 2/2
• 1 correct point = 1/2
• Diagrams in this section: optional but credited if labelled correctly

SECTION C — Short Answer [3 marks each]
• 3 correct NCERT-accurate points = 3/3
• Diagram questions: correct diagram with all labels = full marks
  Missing labels = deduct 1 mark per missing key label (max deduction 2)
• Partial answers awarded proportionally

SECTION D — Long Answer [5 marks each]
• Detailed marking: Introduction (1) + Explanation/Points (2) + Diagram/Example (1) + Conclusion (1)
• Numerical questions: formula (1) + substitution (1) + calculation (2) + unit/answer (1)
• At least 1 labelled diagram where relevant — missing diagram loses its 1 mark

SECTION E — Case Study [4 marks each]
• Sub (i) 1 mark + Sub (ii) 1 mark + Sub (iii) 2 marks
• Scientific accuracy required — vague answers score 0` : `
SECTION A — Objective [1 mark each]: Correct = 1, wrong = 0. No negative marking.
SECTION B — Short Answer [2–3 marks each]: Award proportionally per correct point.
SECTION C — Long Answer [5 marks each]: Introduction(1) + Content(2) + Example(1) + Conclusion(1).
SECTION D — Long Answer [5 marks each]: Same as Section C.
SECTION E — Case Study [4 marks each]: Sub(i) 1m + Sub(ii) 1m + Sub(iii) 2m.`;

        const evaluationPrompt = `
You are an official CBSE Board Examiner evaluating a Class ${cls} student named ${name || "the student"}.
Subject: ${session.subject || "General"}
Board: ${board}
Maximum Marks: ${totalMarks}
Time Taken: ${timeTaken}${overtime ? " ⚠️ SUBMITTED AFTER 3-HOUR LIMIT" : ""}

IMPORTANT: Match the student's answers to questions by question number OR topic/context.
Evaluate EVERY question on the paper — give 0 for unattempted questions, do not skip them.
Student may have answered out of order — cross-reference carefully before marking.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT-SPECIFIC CBSE MARKING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${subjectMarkingRules}

UNIVERSAL RULES (apply to all subjects):
• No negative marking — minimum per question is always 0
• No sympathy marks for vague, wrong, or off-topic answers
• Image/PDF answers → evaluate content only, ignore handwriting quality
• Consistent marking — same quality of answer must always get the same marks
• NCERT-accurate facts required for full marks; correct concept in own words = full marks
${overtime ? "• ⚠️ Student submitted after the 3-hour limit. Note this in Examiner Remarks." : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVALUATION REPORT — OUTPUT THIS FORMAT EXACTLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 OFFICIAL CBSE EVALUATION REPORT
Student : ${name || "—"}
Class   : ${cls}
Subject : ${session.subject}
Board   : ${board}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${evalIsEnglish || evalIsHindi ? `SECTION A — READING [__ / 20]
Q[N] | [x]/[max] | ✅/⚠️/❌/— | [brief feedback if wrong or partial]
Section A Total: [X] / 20

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION B — WRITING [__ / 20]
Q[N] — [type] | Format [x]/1 | Content [x]/2 | Expression [x]/2 | Total [x]/5
Feedback: [what format elements were missing, what content was strong/weak]
Section B Total: [X] / 20

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION C — GRAMMAR [__ / 20]
Q[N] | [x]/[max] | ✅/❌ | [correct answer if wrong]
Section C Total: [X] / 20

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION D — LITERATURE [__ / 20]
Q[N] — [text/topic] | [x]/[max] | ✅/⚠️/❌/—
Feedback: [specific — what was correct, what was missing]
Section D Total: [X] / 20` : evalIsMath ? `SECTION A — MCQ & Assertion-Reason [__ / 20]
Q[N] | [x]/1 | ✅/❌/— | [correct answer if wrong]
Section A Total: [X] / 20

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION B — Very Short Answer [__ / 10]
Q[N] — [topic] | [x]/2 | Step marks: [detail]
Section B Total: [X] / 10

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION C — Short Answer [__ / 18]
Q[N] — [topic] | [x]/3 | Step marks: setup[x]/1 working[x]/1 answer[x]/1
Section C Total: [X] / 18

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION D — Long Answer [__ / 20]
Q[N] — [topic] | [x]/5 | [step-by-step mark breakdown]
Section D Total: [X] / 20

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION E — Case Study [__ / 12]
Q[N] (i)[x]/1 (ii)[x]/1 (iii)[x]/2 | Total [x]/4
Section E Total: [X] / 12` : `SECTION A — Objective [__ / 20]
Q[N] | [x]/1 | ✅/❌/— | [correct answer if wrong]
Section A Total: [X] / 20

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION B — Short Answer [__ / 10]
Q[N] — [topic] | [x]/2 | [brief feedback]
Section B Total: [X] / 10

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION C — Short Answer [__ / 18]
Q[N] — [topic] | [x]/3 | ✅/⚠️/❌/—
Feedback: [specific — what was right, what was missing]
Section C Total: [X] / 18

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION D — Long Answer [__ / 20]
Q[N] — [topic] | [x]/5
  Content/Points : [x]/3
  Diagram/Example: [x]/1
  Conclusion     : [x]/1
Feedback: [what was strong, what was missing]
Section D Total: [X] / 20

━━━━━━━━━━━━━━━━━━━━━━━━
SECTION E — Case Study [__ / 12]
Q[N] (i)[x]/1 (ii)[x]/1 (iii)[x]/2 | Total [x]/4
Feedback: [accuracy of scientific/factual reasoning]
Section E Total: [X] / 12`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 FINAL RESULT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${evalIsEnglish || evalIsHindi ? `Section A (Reading)   : [X] / 20
Section B (Writing)   : [X] / 20
Section C (Grammar)   : [X] / 20
Section D (Literature): [X] / 20` : evalIsMath ? `Section A (MCQ/AR)    : [X] / 20
Section B (VSA 2m)    : [X] / 10
Section C (SA 3m)     : [X] / 18
Section D (LA 5m)     : [X] / 20
Section E (Case Study): [X] / 12` : `Section A (Objective) : [X] / 20
Section B (VSA 2m)    : [X] / 10
Section C (SA 3m)     : [X] / 18
Section D (LA 5m)     : [X] / 20
Section E (Case Study): [X] / 12`}
─────────────────────────────────────────
Total Marks Obtained  : [X] / ${totalMarks}
Percentage            : [X.X]%
Time Taken            : ${timeTaken}${overtime ? " ⚠️ Over time limit" : ""}
─────────────────────────────────────────
CBSE Grade:
91–100% → A1  Outstanding
81–90%  → A2  Excellent
71–80%  → B1  Very Good
61–70%  → B2  Good
51–60%  → C1  Average
41–50%  → C2  Satisfactory
33–40%  → D   Pass
Below 33% → E  Needs Improvement

Your Grade: [grade + label]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 EXAMINER'S REMARKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strengths   : [specific sections/chapters where ${name || "the student"} performed well]
Weaknesses  : [specific sections/chapters to work on]
Study Tip   : [one specific, actionable improvement]
        `.trim();

        await saveSession({ ...session, status: "FAILED" });

        let evaluation: string;
        try {
          evaluation = await callAIForEvaluation(evaluationPrompt, [
            {
              role: "user",
              content:
                `QUESTION PAPER:\n${session.question_paper}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `STUDENT'S COMPLETE ANSWER TRANSCRIPT (${session.answer_log.length} entries):\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                fullAnswerTranscript,
            },
          ]);
        } catch (evalErr) {
          console.error("[evaluation] callAIForEvaluation threw:", evalErr);
          return NextResponse.json({
            reply:
              `⚠️ The evaluation timed out${callName}. Your answers are all safely saved.\n\n` +
              `Type **submit** to try again.`,
          });
        }

        const { obtained, total } = parseScore(evaluation);
        const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;

        try {
          await supabase.from("exam_attempts").insert({
            student_name:    name || null,
            class:           cls,
            subject:         session.subject || "General",
            percentage,
            marks_obtained:  obtained,
            total_marks:     total > 0 ? total : totalMarks,
            time_taken:      timeTaken,
            overtime,
            evaluation_text: evaluation,
            created_at:      new Date().toISOString(),
          });
        } catch (dbErr) {
          console.error("Failed to save exam_attempt:", dbErr);
        }

        await deleteSession(session.session_key || key);

        return NextResponse.json({
          reply:          evaluation,
          examEnded:      true,
          subject:        session.subject,
          marksObtained:  obtained,
          totalMarks:     total > 0 ? total : totalMarks,
          percentage,
          timeTaken,
          overtime,
        });
      }

      if (session.status === "IN_EXAM" && isOverTime(session.started_at)) {
        return NextResponse.json({
          reply:
            `⏰ **Time's up${callName}!** Your 3-hour exam window has closed.\n\n` +
            `Type **submit** now to get your evaluation based on answers recorded so far.\n` +
            `Any further answers added after time limit will be flagged in the evaluation.`,
          overtime: true,
        });
      }

      if (session.status === "IN_EXAM") {
        const parts: string[] = [];

        if (message.trim() && !isSubmit(lower)) {
          parts.push(message.trim());
        }

        if (uploadedText) {
          if (uploadType === "syllabus") {
            return NextResponse.json({
              reply:
                `⚠️ That looks like a **syllabus upload** but your exam is already in progress.\n\n` +
                `If you meant to upload an **answer**, please re-attach the file.\n` +
                `If you want to submit your answer sheet, re-upload it — your exam is still running.\n\n` +
                `⏱️ Timer is still running. Type **submit** when done.`,
            });
          }
          parts.push(`[UPLOADED ANSWER — IMAGE/PDF]\n${uploadedText}`);
        }

        if (parts.length > 0) {
          session.answer_log.push(parts.join("\n\n"));
          await saveSession(session);
        }

        const elapsed = session.started_at
          ? formatDuration(Date.now() - session.started_at)
          : "—";

        return NextResponse.json({
          reply:
            `✅ **Answer recorded** (Entry ${session.answer_log.length})\n` +
            `⏱️ Time elapsed: **${elapsed}**\n\n` +
            `Continue answering. You can:\n` +
            `• Type more answers directly\n` +
            `• Upload photos or PDFs of handwritten answers\n` +
            `• Answer questions in any order\n\n` +
            `When finished with all questions, type **submit**.`,
        });
      }

      if (session.status === "READY" && !isStart(lower)) {
        const isSyllabusUpload =
          uploadType === "syllabus" ||
          (!uploadType && uploadedText.length > 30);

        if (isSyllabusUpload && uploadedText.length > 30) {
          return handleSyllabusUpload(uploadedText, cls, board, key, name, "READY");
        }

        if (isSubmit(lower)) {
          return NextResponse.json({
            reply:
              `⚠️ Your exam hasn't started yet${callName} — there's nothing to submit.\n\n` +
              `Subject is set to **${session.subject}**.\n\n` +
              `Type **start** when you're ready to begin. ⏱️ Timer starts immediately.`,
          });
        }

        // ── Accept custom format commands while in READY state ──
        const reqs = parsePaperRequirements(message);
        if (reqs.isCustom) {
          session.custom_instructions = message.trim();
          await saveSession(session);
          const totalDesc = reqs.totalMarks ? `**${reqs.totalMarks} marks**` : "custom marks";
          const timeDesc  = reqs.timeMinutes ? `, ${formatTimeAllowed(reqs.timeMinutes)}` : "";
          const typeDesc  = reqs.questionTypes.length > 0 ? `, ${reqs.questionTypes.join(" + ")} questions` : "";
          return NextResponse.json({
            reply:
              `✅ Got it! Paper format updated:\n` +
              `📝 ${totalDesc}${timeDesc}${typeDesc}\n\n` +
              `Subject: **${session.subject}**\n\n` +
              `Type **start** when ready. ⏱️ Timer starts immediately.`,
          });
        }

        return NextResponse.json({
          reply:
            `📚 Subject is set to **${session.subject}**.\n\n` +
            `📎 Want to use your own syllabus instead? Upload a PDF or image now.\n` +
            `💡 Want a custom format? Try: "prepare 30 marks exam" or "give 20 MCQ questions"\n\n` +
            `Type **start** when ready to begin. ⏱️ Timer starts immediately.`,
        });
      }

      if (session.status === "IDLE" && !isGreeting(lower)) {
        const isSyllabusUpload =
          uploadType === "syllabus" ||
          (!uploadType && uploadedText.length > 30);

        if (isSyllabusUpload && uploadedText.length > 30) {
          return handleSyllabusUpload(uploadedText, cls, board, key, name, "IDLE");
        }

        const isExamCommand = /^(submit|done|finish|finished|start|answers?)\s*$/i.test(message.trim());
        if (isExamCommand) {
          return NextResponse.json({
            reply:
              `⚠️ It looks like you typed **"${message.trim()}"** — but there's no active exam session${callName}.\n\n` +
              `To get started, please tell me the **subject** you want to be tested on:\n` +
              `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
              `📎 Or **upload your syllabus** as a PDF or image for a custom paper.\n\n` +
              `Once a subject is set, type **start** to begin — the timer starts immediately.`,
          });
        }

        if (!message.trim()) {
          return NextResponse.json({
            reply:
              `Please tell me the **subject** you want to be tested on${callName}.\n` +
              `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
              `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
          });
        }

        // ── Detect if the message has custom paper instructions ──
        const messageReqs = parsePaperRequirements(message);
        const coreSubject = messageReqs.isCustom
          ? extractSubjectFromInstruction(message)
          : message;

        const { subjectName } = getChaptersForSubject(coreSubject, cls);

        const newSession: ExamSession = {
          session_key:          key,
          status:               "READY",
          subject_request:      coreSubject,
          subject:              subjectName,
          custom_instructions:  messageReqs.isCustom ? message.trim() : undefined,
          answer_log:           [],
          student_name:         name,
          student_class:        cls,
          student_board:        board,
        };
        await saveSession(newSession);

        if (messageReqs.isCustom) {
          const totalDesc = messageReqs.totalMarks ? `**${messageReqs.totalMarks} marks**` : "custom marks";
          const timeDesc  = messageReqs.timeMinutes
            ? ` · Time: **${formatTimeAllowed(messageReqs.timeMinutes)}**`
            : "";
          const typeDesc  = messageReqs.questionTypes.length > 0
            ? ` · Type: **${messageReqs.questionTypes.join(" + ")}**`
            : "";
          const chapterDesc = messageReqs.chapterFilter
            ? ` · Scope: **${messageReqs.chapterFilter}**`
            : "";

          return NextResponse.json({
            reply:
              `📚 Got it! I'll prepare a **custom paper** for:\n` +
              `**${subjectName} — Class ${cls}**\n\n` +
              `📝 **Paper format:**\n` +
              `   Marks: ${totalDesc}${timeDesc}${typeDesc}${chapterDesc}\n\n` +
              `The paper will be generated **exactly** as you described — no extra sections added.\n\n` +
              `Type **start** when you're ready to begin.\n` +
              `⏱️ Timer starts the moment you type start.`,
          });
        }

        return NextResponse.json({
          reply:
            `📚 Got it! I'll prepare a **strict CBSE Board question paper** for:\n` +
            `**${subjectName} — Class ${cls}**\n\n` +
            `Paper will strictly follow the NCERT Class ${cls} syllabus chapters.\n\n` +
            `📎 **Tip:** Want a paper based on YOUR specific syllabus?\n` +
            `Upload your syllabus as a PDF or image now, before typing start.\n\n` +
            `💡 Want a custom format? Type: "prepare 30 marks exam" or "give 20 MCQ questions"\n\n` +
            `Type **start** when you're ready to begin.\n` +
            `⏱️ Timer starts the moment you type start.`,
        });
      }

      if (session.status === "IDLE" && uploadedText.length > 30) {
        return handleSyllabusUpload(uploadedText, cls, board, key, name, "IDLE");
      }

      if (isStart(lower) && session.status === "READY") {
        let subjectName: string;
        let chapterList: string;

        console.log("[EXAM START DEBUG]", {
          sessionKey: session.session_key,
          status: session.status,
          subject: session.subject,
          hasSyllabusUpload: !!session.syllabus_from_upload,
          syllabusLength: session.syllabus_from_upload?.length || 0,
          hasCustomInstructions: !!session.custom_instructions,
        });

        if (session.syllabus_from_upload) {
          subjectName = session.subject || "Custom Subject";
          chapterList = session.syllabus_from_upload;
          console.log("[START] Using UPLOADED syllabus for:", subjectName, "| length:", chapterList.length);
        } else {
          console.log("[START] No uploaded syllabus — using NCERT default for:", session.subject_request);
          const resolved = getChaptersForSubject(
            session.subject_request || "",
            cls
          );
          subjectName = resolved.subjectName;
          chapterList = resolved.chapterList;
        }

        const isMath    = /math/i.test(subjectName);
        const isSST     = /sst|social|history|geography|civics|economics|politics|contemporary/i.test(subjectName);
        const isEnglish = /english/i.test(subjectName);
        const isHindi   = /hindi/i.test(subjectName);
        const hasUploadedSyllabus = !!session.syllabus_from_upload;
        const customInstructions  = session.custom_instructions || "";
        const hasCustomInstr      = !!customInstructions;

        // ── Parse the custom requirements precisely ──────────────
        const reqs = hasCustomInstr ? parsePaperRequirements(customInstructions) : {} as PaperRequirements;

        // Determine final marks & time
        const finalMarks    = reqs.totalMarks || 80;
        const finalMinutes  = reqs.timeMinutes || 180;
        const timeAllowed   = formatTimeAllowed(finalMinutes);
        const isStandardPaper = !hasCustomInstr && !hasUploadedSyllabus;

        // ── CUSTOM PAPER PROMPT (for any custom instructions OR uploaded syllabus + command) ──
        if (hasCustomInstr || hasUploadedSyllabus) {

          // Build question format spec from parsed requirements
          let formatSpec = "";

          if (reqs.questionTypes && reqs.questionTypes.length > 0) {
            // Specific question types requested
            const qTypes = reqs.questionTypes.join(", ");
            if (reqs.questionCount && reqs.marksEach) {
              formatSpec = `${reqs.questionCount} questions of type: ${qTypes}, each worth ${reqs.marksEach} mark(s). Total = ${finalMarks} marks.`;
            } else if (reqs.questionCount) {
              formatSpec = `${reqs.questionCount} questions of type: ${qTypes}. Distribute marks evenly to total exactly ${finalMarks} marks.`;
            } else {
              formatSpec = `Question type: ${qTypes}. Total marks: ${finalMarks}. Choose an appropriate number of questions.`;
            }
          } else if (reqs.questionCount && reqs.marksEach) {
            formatSpec = `${reqs.questionCount} questions, ${reqs.marksEach} mark(s) each. Total = ${finalMarks} marks.`;
          } else if (reqs.questionCount) {
            formatSpec = `${reqs.questionCount} questions distributed to total exactly ${finalMarks} marks.`;
          } else {
            // No specific count — let AI decide distribution but enforce total marks
            formatSpec = `Design an appropriate mix of question types that totals exactly ${finalMarks} marks.`;
            if (isMath) {
              formatSpec += ` Include a mix of MCQ, short answer, and problem-solving questions.`;
            } else if (isEnglish || isHindi) {
              formatSpec += ` Include a balanced mix of objective, short answer, and writing questions — but only from the topics listed in the syllabus above. Do NOT add unseen passages or writing tasks unless they appear in the syllabus.`;
            }
          }

          // Chapter/topic filter
          const chapterNote = reqs.chapterFilter
            ? `\nCHAPTER RESTRICTION: Only use questions from ${reqs.chapterFilter}.`
            : "";

          const customPaperPrompt = `
You are an official ${board} question paper setter for Class ${cls}.
Subject: ${subjectName}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT'S REQUEST: ${customInstructions || "Generate based on uploaded syllabus"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAPER SPECIFICATIONS — FOLLOW EXACTLY:
• Total Marks  : MUST be exactly ${finalMarks} marks — not 80, not anything else
• Time Allowed : ${timeAllowed}
• Format       : ${formatSpec}${chapterNote}

AUTHORISED TOPICS — ALL QUESTIONS MUST COME FROM THIS LIST ONLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${chapterList}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRICT RULES:
1. The paper header MUST show:
   Subject       : ${subjectName}
   Class         : ${cls}
   Board         : ${board}
   Time Allowed  : ${timeAllowed}
   Maximum Marks : ${finalMarks}

2. Every question MUST show its mark value in [brackets].
3. Marks of ALL questions MUST add up to exactly ${finalMarks} — verify this before outputting.
4. Do NOT add sections or question types not requested or not in the syllabus above.
5. Do NOT default to the standard 80-mark CBSE pattern — follow only the specifications above.
6. Output ONLY the question paper — no commentary, no preamble, no notes outside the paper.
          `.trim();

          const paper = await callAI(customPaperPrompt, [
            {
              role: "user",
              content: `Generate the paper: ${subjectName}, ${finalMarks} marks, ${timeAllowed}${reqs.chapterFilter ? `, ${reqs.chapterFilter}` : ""}.`,
            },
          ]);

          const totalMarksOnPaper = parseTotalMarksFromPaper(paper);
          const startTime         = Date.now();

          const activeSession: ExamSession = {
            session_key:          session.session_key || key,
            status:               "IN_EXAM",
            subject_request:      session.subject_request,
            subject:              subjectName,
            custom_instructions:  customInstructions || undefined,
            question_paper:       paper,
            answer_log:           [],
            started_at:           startTime,
            total_marks:          totalMarksOnPaper,
            syllabus_from_upload: session.syllabus_from_upload,
            student_name:         name,
            student_class:        cls,
            student_board:        board,
          };

          await saveSession(activeSession);

          return NextResponse.json({
            reply:
              `⏱️ **Exam started! Timer is running.**\n\n` +
              `📌 How to answer:\n` +
              `• Answer questions in **any order** you prefer\n` +
              `• Type answers directly in chat, OR\n` +
              `• Upload **photos / PDFs** of your handwritten answers\n` +
              `• You can send multiple messages — all will be collected\n` +
              `• When fully done, type **submit** (or **done** / **finish**)\n\n` +
              `Good luck${callName}! 💪 Give it your best.`,
            paper,
            startTime,
          });
        }

        // ── Standard 80-mark CBSE paper generation ──────────────
        const englishSections = `
SECTION A — READING [20 Marks]
━━━━━━━━━━━━━━━━━━
Q1  Unseen Passage — Factual / Discursive [10 marks]
  • One unseen prose passage of 350–400 words
  • (a) 5 MCQs × 1 mark = 5 marks  (b) 5 Short-answer questions × 1 mark = 5 marks

Q2  Unseen Passage — Literary / Poem extract [10 marks]
  • One poem or literary prose extract of 200–250 words
  • (a) 5 MCQs × 1 mark = 5 marks  (b) 5 Short-answer questions × 1 mark = 5 marks

SECTION B — WRITING SKILLS [20 Marks]
━━━━━━━━━━━━━━━━━━
Q3  Descriptive Paragraph / Bio-sketch / Dialogue [5 marks]
Q4  Notice / Message / Advertisement [5 marks]
Q5  Letter Writing [5 marks]
Q6  Long Composition — Article / Speech / Story [5 marks]

SECTION C — GRAMMAR [20 Marks]
━━━━━━━━━━━━━━━━━━
Q7  Gap Filling — Tenses / Modals / Voice [4 × 1 = 4 marks]
Q8  Editing — Error Correction [4 × 1 = 4 marks]
Q9  Omission — Missing Words [4 × 1 = 4 marks]
Q10 Sentence Reordering [4 × 1 = 4 marks]
Q11 Sentence Transformation [4 × 1 = 4 marks]

SECTION D — LITERATURE [20 Marks]
━━━━━━━━━━━━━━━━━━
Q12 Extract-based Questions — Prose [5 marks]
Q13 Extract-based Questions — Poetry [5 marks]
Q14 Short Answer Questions — Prose & Poetry [6 marks]
Q15 Long Answer — Prose / Drama [4 marks]
        `.trim();

        const hindiSections = `
SECTION A — APATHIT GADYANSH / KAVYANSH (Unseen Reading) [20 Marks]
━━━━━━━━━━━━━━━━━━
Q1  Apathit Gadyansh (Unseen Prose Passage) [10 marks]
Q2  Apathit Kavyansh (Unseen Poem Extract) [10 marks]

SECTION B — LEKHAN (Writing) [20 Marks]
━━━━━━━━━━━━━━━━━━
Q3  Patra Lekhan — औपचारिक पत्र (Formal Letter) [5 marks]
Q4  Anuched Lekhan (Paragraph Writing) [5 marks]
Q5  Suchna Lekhan (Notice Writing) [5 marks]
Q6  Sandesh / Vigyapan Lekhan (Message / Advertisement) [5 marks]

SECTION C — VYAKARAN (Grammar) [20 Marks]
━━━━━━━━━━━━━━━━━━
Q7  Shabdalankar / Arth-bhed [4 marks]
Q8  Sandhi-Viched [4 marks]
Q9  Samas-Vigraha [4 marks]
Q10 Muhavare / Lokoktiyan [4 marks]
Q11 Vakya Bhed [4 marks]

SECTION D — PATHEN (Literature) [20 Marks]
━━━━━━━━━━━━━━━━━━
Q12 Gadyansh-adharit prashn [5 marks]
Q13 Kavyansh-adharit prashn [5 marks]
Q14 Laghu Uttariya Prashn [6 marks]
Q15 Dirgha Uttariya Prashn [4 marks]
        `.trim();

        const mathSections = `
SECTION A — MCQ & Assertion-Reason [20 × 1 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q18   MCQs [1 mark each]
Q19–Q20  Assertion-Reason [1 mark each]

SECTION B — Very Short Answer [5 × 2 = 10 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q25  [2 marks each]

SECTION C — Short Answer [6 × 3 = 18 Marks]
━━━━━━━━━━━━━━━━━━
Q26–Q31  [3 marks each]

SECTION D — Long Answer [4 × 5 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q32–Q35  [5 marks each]

SECTION E — Case-Based / Source-Based [3 × 4 = 12 Marks]
━━━━━━━━━━━━━━━━━━
Q36  Case Study 1 [4 marks]
Q37  Case Study 2 [4 marks]
Q38  Case Study 3 [4 marks]
        `.trim();

        const scienceSections = `
SECTION A — Objective [20 × 1 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q16   MCQs [1 mark each]
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blanks / One-Word Answer [1 mark each]

SECTION B — Very Short Answer [5 × 2 = 10 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q25  [2 marks each]

SECTION C — Short Answer [6 × 3 = 18 Marks]
━━━━━━━━━━━━━━━━━━
Q26–Q31  [3 marks each]

SECTION D — Long Answer [4 × 5 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q32–Q35  [5 marks each]

SECTION E — Case-Based [3 × 4 = 12 Marks]
━━━━━━━━━━━━━━━━━━
Q36  Case Study — Biology [4 marks]
Q37  Case Study — Physics [4 marks]
Q38  Case Study — Chemistry [4 marks]
        `.trim();

        const sstSections = `
SECTION A — Objective [20 × 1 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q16   MCQs [1 mark each]
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blank / Match [1 mark each]

SECTION B — Short Answer Questions [6 × 3 = 18 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q26  [3 marks each]

SECTION C — Long Answer Questions [5 × 5 = 25 Marks]
━━━━━━━━━━━━━━━━━━
Q27–Q31  [5 marks each]

SECTION D — Source-Based [3 × 4 = 12 Marks]
━━━━━━━━━━━━━━━━━━
Q32  Source — History [4 marks]
Q33  Source — Geography or Economics [4 marks]
Q34  Source — Civics [4 marks]

SECTION E — Map-Based Questions [2 + 3 = 5 Marks]
━━━━━━━━━━━━━━━━━━
Q35  History Map [2 marks]
Q36  Geography Map [3 marks]
        `.trim();

        const standardSections = `
SECTION A — Objective Type [20 × 1 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q16   MCQs [1 mark each]
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blank [1 mark each]

SECTION B — Very Short Answer [5 × 2 = 10 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q25  [2 marks each]

SECTION C — Short Answer [6 × 3 = 18 Marks]
━━━━━━━━━━━━━━━━━━
Q26–Q31  [3 marks each]

SECTION D — Long Answer [4 × 5 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q32–Q35  [5 marks each]

SECTION E — Case-Based [3 × 4 = 12 Marks]
━━━━━━━━━━━━━━━━━━
Q36–Q38  [4 marks each]
        `.trim();

        let sectionBlocks: string;
        if (isMath) {
          sectionBlocks = mathSections;
        } else if (isEnglish) {
          sectionBlocks = englishSections;
        } else if (isHindi) {
          sectionBlocks = hindiSections;
        } else if (isSST) {
          sectionBlocks = sstSections;
        } else if (/science|physics|chemistry|biology/i.test(subjectName)) {
          sectionBlocks = scienceSections;
        } else {
          sectionBlocks = standardSections;
        }

        const uploadCoverageNote = hasUploadedSyllabus ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ABSOLUTE RESTRICTION — UPLOADED SYLLABUS IS THE ONLY SOURCE 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every single question MUST come from a topic explicitly listed in the uploaded syllabus above.
Do NOT include any chapter, unit, or concept absent from the uploaded list.
Do NOT use NCERT or CBSE default chapter lists — the uploaded list replaces them entirely.
        `.trim() : "";

        const paperPrompt = `
You are an official CBSE Board question paper setter for Class ${cls}.
Subject: ${subjectName} | Board: ${board} | Maximum Marks: 80 | Time: 3 Hours
Follow the EXACT official CBSE 2024-25 paper pattern for ${subjectName} as specified below.
Output the complete question paper ONLY — no commentary, no preamble, no notes outside the paper.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAPER HEADER (reproduce exactly):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject       : ${subjectName}
Class         : ${cls}
Board         : ${board}
Time Allowed  : 3 Hours
Maximum Marks : 80
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
General Instructions:
1. This question paper contains ${isEnglish || isHindi ? "four" : "five"} sections.
2. All questions are compulsory. Marks are indicated against each question.
3. Attempt all parts of a question together.
4. Write neat, well-structured answers.${isMath ? `
5. Show all steps clearly. Marks are awarded for method even if the final answer is wrong.
6. Use of calculator is not permitted.` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hasUploadedSyllabus
  ? `AUTHORISED TOPICS — ALL QUESTIONS MUST COME FROM THIS LIST ONLY:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${chapterList}`
  : `AUTHORISED SYLLABUS:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${chapterList}`
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${uploadCoverageNote ? uploadCoverageNote + "\n\n" : ""}${sectionBlocks}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Generate ALL sections completely — no section may be missing or short
• Total marks MUST add up to exactly 80
• Every question must show its mark value in [brackets]
• Difficulty spread: 30% easy | 50% medium | 20% HOTs
• Do NOT add any text after the last question
        `.trim();

        const paper = await callAI(paperPrompt, [
          {
            role: "user",
            content: `Generate CBSE Board paper: ${board} Class ${cls} — ${subjectName}${hasUploadedSyllabus ? " (UPLOADED SYLLABUS — use ONLY listed topics)" : ""}`,
          },
        ]);

        const totalMarksOnPaper = parseTotalMarksFromPaper(paper);
        const startTime         = Date.now();

        const activeSession: ExamSession = {
          session_key:          session.session_key || key,
          status:               "IN_EXAM",
          subject_request:      session.subject_request,
          subject:              subjectName,
          custom_instructions:  customInstructions || undefined,
          question_paper:       paper,
          answer_log:           [],
          started_at:           startTime,
          total_marks:          totalMarksOnPaper,
          syllabus_from_upload: session.syllabus_from_upload,
          student_name:         name,
          student_class:        cls,
          student_board:        board,
        };

        await saveSession(activeSession);

        return NextResponse.json({
          reply:
            `⏱️ **Exam started! Timer is running.**\n\n` +
            `📌 How to answer:\n` +
            `• Answer questions in **any order** you prefer\n` +
            `• Type answers directly in chat, OR\n` +
            `• Upload **photos / PDFs** of your handwritten answers\n` +
            `• You can send multiple messages — all will be collected\n` +
            `• When fully done, type **submit** (or **done** / **finish**)\n\n` +
            `Good luck${callName}! 💪 Give it your best.`,
          paper,
          startTime,
        });
      }

      return NextResponse.json({
        reply:
          `Please tell me the **subject** you want to be tested on${callName}.\n` +
          `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
          `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ORAL MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "oral") {
      const contextPrimer: ChatMessage[] = name ? [
        { role: "user", content: `My name is ${name}${cls ? `, I'm in Class ${cls}` : ""}${board ? `, ${board} board` : ""}.` },
        { role: "assistant", content: `Great! I'll call you ${name}. Let's get started.` },
      ] : [];
      const oralConversation: ChatMessage[] = [
        ...contextPrimer,
        ...history.slice(-12),
        { role: "user", content: message },
      ];

      const oralConversationText = [...history, { role: "user", content: message }]
        .map((m) => m.content).join(" ");

      const isHindiOral =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(oralConversationText) ||
        /hindi|हिंदी/i.test(oralConversationText);

      const reply = await callAI(
        systemPrompt("oral", isHindiOral ? "hindi" : undefined),
        oralConversation
      );
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // PRACTICE MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "practice") {
      const practiceConversationText = conversation.map((m) => m.content).join(" ");
      const isHindiPractice =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(practiceConversationText) ||
        /hindi|हिंदी/i.test(practiceConversationText);

      const isMathPractice =
        !isHindiPractice && (
          /math/i.test(bodySubject) ||
          /\b(mathematics|maths?|algebra|calculus|geometry|trigonometry|statistics|probability|polynomials?|coordinate|quadrilateral|heron|surface area|volume|number system|linear equation)\b/i.test(practiceConversationText)
        );

      const practiceOverride = isHindiPractice ? "hindi" : isMathPractice ? "mathematics" : undefined;

      const reply = await callAI(
        systemPrompt("practice", practiceOverride),
        conversation
      );
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // REVISION MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "revision") {
      const revisionConversationText = conversation.map((m) => m.content).join(" ");
      const isHindiRevision =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(revisionConversationText) ||
        /hindi|हिंदी/i.test(revisionConversationText);

      const isMathRevision =
        !isHindiRevision && (
          /math/i.test(bodySubject) ||
          /\b(mathematics|maths?|algebra|calculus|geometry|trigonometry|statistics|probability|polynomials?|coordinate|quadrilateral|heron|surface area|volume|number system|linear equation)\b/i.test(revisionConversationText)
        );

      const revisionOverride = isHindiRevision ? "hindi" : isMathRevision ? "mathematics" : undefined;

      const reply = await callAI(
        systemPrompt("revision", revisionOverride),
        conversation
      );
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // PROGRESS MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "progress") {
      const subjectStats = body?.subjectStats || null;
      const attempts     = body?.attempts     || [];

      const trimmedAttempts = Array.isArray(attempts)
        ? Object.values(
            attempts.reduce((acc: Record<string, any[]>, a: any) => {
              const subj = a?.subject || "unknown";
              if (!acc[subj]) acc[subj] = [];
              acc[subj].push(a);
              return acc;
            }, {})
          ).flatMap((group: any[]) => (group as any[]).slice(-10))
        : [];

      const dataPayload = subjectStats
        ? JSON.stringify(subjectStats,    null, 2)
        : JSON.stringify(trimmedAttempts, null, 2);

      const progressPrompt = `
You are a sharp CBSE academic advisor. Analyse the student's performance data below.

Student: ${name || "the student"}, Class ${cls}

OUTPUT RULES — follow exactly, no exceptions:
- Output EXACTLY 4 lines, each starting with its emoji prefix
- No preamble, no sign-off, no extra lines whatsoever
- Every line must name a specific subject — never say "a subject"
- Be precise and blunt — no filler phrases

LINE FORMAT (output all 4, in this exact order):
💪 Strongest:  [subject] — [score]% ([grade]) — one specific reason why
⚠️  Weakest:   [subject] — [score]% — [one specific thing to fix]
📈 Trend:      [subject showing biggest positive delta, or "No improvement data yet"]
🎯 Next target: [subject closest to next grade] — [X] more marks → [next grade label]
      `.trim();

      const reply = await callAI(progressPrompt, [
        {
          role: "user",
          content: `Performance data for ${name || "the student"}:\n${dataPayload}`,
        },
      ]);
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });

  } catch (err) {
    console.error("[route.ts] Unhandled error:", err);
    return NextResponse.json(
      { reply: "Server error. Please try again." },
      { status: 500 }
    );
  }
}