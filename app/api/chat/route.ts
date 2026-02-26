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

// Mirrors the `exam_sessions` table in Supabase:
// CREATE TABLE exam_sessions (
//   session_key   TEXT PRIMARY KEY,
//   status        TEXT NOT NULL DEFAULT 'IDLE',
//   subject_request TEXT,
//   subject       TEXT,
//   question_paper TEXT,
//   answer_log    JSONB NOT NULL DEFAULT '[]',
//   started_at    BIGINT,
//   total_marks   INT,
//   syllabus_from_upload TEXT,
//   student_name  TEXT,
//   student_class TEXT,
//   student_board TEXT,
//   updated_at    TIMESTAMPTZ DEFAULT NOW()
// );
type ExamSession = {
  session_key: string;
  status: "IDLE" | "READY" | "IN_EXAM" | "FAILED";
  subject_request?: string;
  subject?: string;
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
            .join("\n") +
          `\n\nNOTE FOR AI: If any chapter relevant to this subject is missing ` +
          `from the list above, retrieve it from the official NCERT Class 9 ` +
          `Science syllabus (ncert.nic.in) and include it.`,
      };
    }

    if (/math/.test(req)) {
      return {
        subjectName: s.mathematics.name,
        chapterList:
          (s.mathematics.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n") +
          `\n\nNOTE FOR AI: If any chapter relevant to this subject is missing ` +
          `from the list above, retrieve it from the official NCERT Class 9 ` +
          `Mathematics syllabus (ncert.nic.in) and include it.`,
      };
    }

    if (/history/.test(req)) {
      return {
        subjectName: "Social Science – History",
        chapterList:
          (s.social_science.history.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n") +
          `\n\nNOTE FOR AI: If any chapter relevant to Class 9 History is missing ` +
          `above, retrieve it from the official NCERT Class 9 ` +
          `"India and the Contemporary World – I" syllabus and include it.`,
      };
    }

    if (/geo|geography/.test(req)) {
      return {
        subjectName: "Social Science – Geography (Contemporary India I)",
        chapterList:
          (s.social_science.geography.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n") +
          `\n\nNOTE FOR AI: If any chapter relevant to Class 9 Geography is missing ` +
          `above, retrieve it from the official NCERT Class 9 ` +
          `"Contemporary India – I" syllabus and include it.`,
      };
    }

    if (/civic|politic|democracy/.test(req)) {
      return {
        subjectName: "Social Science – Civics (Democratic Politics I)",
        chapterList:
          (s.social_science.civics.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n") +
          `\n\nNOTE FOR AI: If any chapter relevant to Class 9 Civics is missing ` +
          `above, retrieve it from the official NCERT Class 9 ` +
          `"Democratic Politics – I" syllabus and include it.`,
      };
    }

    if (/econ/.test(req)) {
      return {
        subjectName: "Social Science – Economics",
        chapterList:
          (s.social_science.economics.chapters as ChapterEntry[])
            .map((c) => `Chapter ${c.number}: ${c.name}`)
            .join("\n") +
          `\n\nNOTE FOR AI: If any chapter relevant to Class 9 Economics is missing ` +
          `above, retrieve it from the official NCERT Class 9 Economics syllabus and include it.`,
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
          `HISTORY:\n${hist}\n\nGEOGRAPHY:\n${geo}\n\nCIVICS:\n${civ}\n\nECONOMICS:\n${eco}` +
          `\n\nNOTE FOR AI: If any chapter from any SST sub-subject is missing above, ` +
          `retrieve it from the official NCERT Class 9 SST syllabus (ncert.nic.in) and include it.`,
      };
    }

    if (/english/.test(req)) {
      const { fiction, poetry, drama } = s.english.sections;
      return {
        subjectName: "English – Beehive",
        chapterList:
          `FICTION:\n${fiction.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `POETRY:\n${poetry.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `DRAMA:\n${drama.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}` +
          `\n\nNOTE FOR AI: If any lesson/poem/drama from Class 9 English Beehive or ` +
          `Moments (supplementary reader) is missing above, retrieve it from the ` +
          `official NCERT syllabus and include it.`,
      };
    }

    if (/hindi/.test(req)) {
      const { prose_poetry, grammar } = s.hindi.sections;
      return {
        subjectName: "Hindi",
        chapterList:
          `PROSE & POETRY:\n${prose_poetry.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `GRAMMAR:\n${grammar.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}` +
          `\n\nNOTE FOR AI: If any lesson or grammar topic from Class 9 Hindi ` +
          `(Sanchayan/Sparsh) is missing above, retrieve it from the official ` +
          `NCERT syllabus and include it.`,
      };
    }

    return {
      subjectName: subjectRequest,
      chapterList:
        `INSTRUCTION FOR AI: Retrieve the complete official NCERT Class 9 ` +
        `${subjectRequest} chapter list from ncert.nic.in and use those exact ` +
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
You are a syllabus extraction assistant.
The following text was extracted from a student's uploaded syllabus document (PDF or image).
Your job is to extract EXACTLY what is listed in the document — do NOT add, invent, or remove any topics.

Instructions:
1. Identify the subject name (e.g., "Mathematics", "Science – Physics", "English", etc.)
2. List every chapter, topic, unit, or section exactly as it appears in the document.
3. Format the output as:

SUBJECT: <exact subject name>

CHAPTERS / TOPICS:
1. <topic or chapter name>
2. <topic or chapter name>
...

If the document lists sub-topics under chapters, include them indented under their chapter.
If multiple subjects are present, list them all with their own sections.
Do NOT include any commentary or explanation — output the structured list only.

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
      `SOURCE: Student-uploaded syllabus document\n` +
      `IMPORTANT FOR AI: Generate the exam paper ONLY from the topics listed below.\n` +
      `Do NOT add NCERT chapters not present in this list.\n` +
      `Do NOT skip any topic listed here — every topic must appear at least once.\n\n` +
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

  const isOverride = currentStatus === "READY";
  return NextResponse.json({
    reply:
      `📄 **Syllabus ${isOverride ? "updated" : "uploaded"} successfully!**\n\n` +
      `**Subject detected:** ${subjectName}\n\n` +
      `**Topics / Chapters found:**\n${raw}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `The exam paper will be generated **strictly based on the above syllabus only**.\n\n` +
      `✅ If this looks correct, type **start** to begin your exam.\n` +
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

    const cls   = sanitiseClass(student?.class || "");
    const board = sanitiseBoard(student?.board || "");

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
      : [];

    const message: string =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    const rawUploadedText: string = body?.uploadedText || "";
    const uploadType: "syllabus" | "answer" | undefined = body?.uploadType ?? undefined;

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
      // Prepend student context as a user→assistant exchange so AI always knows who it's talking to
      const contextPrimer: ChatMessage[] = name ? [
        { role: "user", content: `My name is ${name}${cls ? `, I'm in Class ${cls}` : ""}${board ? `, ${board} board` : ""}.` },
        { role: "assistant", content: `Got it! I'll call you ${name}${cls ? ` (Class ${cls})` : ""}. How can I help you today?` },
      ] : [];
      const teacherConversation: ChatMessage[] = [
        ...contextPrimer,
        ...history.slice(-12),
        { role: "user", content: message },
      ];
      const reply = await callAI(systemPrompt("teacher"), teacherConversation);
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // EXAMINER MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "examiner") {
      const key = getKey(student);

      const session: ExamSession = (await getSession(key)) || {
        session_key:   key,
        status:        "IDLE",
        answer_log:    [],
        student_name:  name,
        student_class: cls,
        student_board: board,
      };

      // ── FIX: Re-greeting a READY session — remind instead of falling through ──
      if (isGreeting(lower) && session.status === "READY") {
        return NextResponse.json({
          reply:
            `📚 Welcome back${callName}! Your subject is set to **${session.subject}**.\n\n` +
            `Type **start** when you're ready to begin your exam. ⏱️ Timer starts immediately.\n\n` +
            `📎 Want to use a different syllabus? Upload a PDF or image now to override.`,
        });
      }

      // ── Re-greeting during an active exam — restore full UI state ──
      if (isGreeting(lower) && session.status === "IN_EXAM") {
        const elapsed = session.started_at
          ? formatDuration(Date.now() - session.started_at)
          : "—";
        // Return paper + startTime so frontend can restore paper panel and timer
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

      // ── FIX: Re-greeting a FAILED session ──
      if (isGreeting(lower) && session.status === "FAILED") {
        return NextResponse.json({
          reply:
            `⚠️ Welcome back${callName}! Your previous evaluation hit a timeout, but your answers are all saved.\n\n` +
            `Type **submit** to retry the evaluation.`,
        });
      }

      // ── Greeting: fresh IDLE session ──────────────────────
      if (isGreeting(lower) && session.status === "IDLE") {
        return NextResponse.json({
          reply:
            `Hello ${greetName}! 📋 I'm your strict CBSE Examiner.\n\n` +
            `Tell me the **subject** you want to be tested on:\n` +
            `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
            `📎 **OR** upload your **syllabus as a PDF or image** and I'll generate a paper exactly based on it.\n\n` +
            `⏱️ Your timer starts the moment you type **start**.`,
        });
      }

      // ── Guard: "start" typed — check history for subject if Supabase is stale ──
      if (isStart(lower) && session.status === "IDLE") {
        // Race condition fix: Supabase write from previous message may not have committed yet.
        // Try frontend's confirmed subject first, then history scan
        const confirmedSubject: string = body?.confirmedSubject || "";

        const subjectFromHistory = confirmedSubject || history
          .filter(m => m.role === "user")
          .map(m => m.content.trim())
          .filter(t => t.length > 1 && !isGreeting(t) && !isStart(t) && !isSubmit(t))
          .pop();

        if (subjectFromHistory) {
          const { subjectName } = getChaptersForSubject(subjectFromHistory, cls);
          const recoveredSession: ExamSession = {
            session_key:     key,
            status:          "READY",
            subject_request: subjectFromHistory,
            subject:         subjectName,
            answer_log:      [],
            student_name:    name,
            student_class:   cls,
            student_board:   board,
          };
          await saveSession(recoveredSession);
          session.status          = "READY";
          session.subject         = subjectName;
          session.subject_request = subjectFromHistory;
          // Fall through to isStart + READY paper generation below
        } else {
          return NextResponse.json({
            reply:
              `Please tell me the **subject** you want to be tested on first${callName}.\n\n` +
              `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
              `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
          });
        }
      }

      // ── Recovery: FAILED session ───────────────────────────
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

      // ── SUBMIT → full evaluation ───────────────────────────
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

        const evaluationPrompt = `
You are an official CBSE Board Examiner evaluating a Class ${cls} student named ${name || "the student"}.
Subject: ${session.subject || "General"}
Board: ${board}
Maximum Marks on Paper: ${totalMarks}
Time Taken by Student: ${timeTaken}${overtime ? " ⚠️ SUBMITTED AFTER 3-HOUR LIMIT" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFICIAL CBSE MARKING SCHEME — FOLLOW EXACTLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The student answered freely — match answers to questions by question number or topic context.
Evaluate EVERY single question on the paper — attempted or not.

SECTION A — Objective [1 mark each]:
• MCQ           : Correct option = 1 mark. Wrong = 0. No partial. No negative.
• Fill in Blank : Correct/acceptable NCERT term = 1 mark. Wrong = 0.
• True / False  : Correct = 1 mark. Wrong = 0. No negative marking.
• Be strict — no partial credit anywhere in Section A.

SECTION B — Short Answer [3 marks each]:
• Award in steps of 1 mark per valid NCERT-accurate key point (maximum 3).
• Correct concept but missing example → 2/3.
• Paraphrased definition with correct meaning → full marks.
• Wrong or NCERT-inaccurate definition → 0 marks for that part.
• Vague or incomplete → proportional marks with clear reason stated.
• Must state exactly: "Awarded X/3 because [specific reason]".

SECTION C — Long Answer [5 marks each]:
• Fixed marks breakup per answer:
    Introduction / context    : 1 mark
    Main explanation / facts  : 2 marks
    Example / evidence        : 1 mark
    Conclusion / significance : 1 mark
• Missing any component → deduct that component's marks, state which part was missing.
• Correct points in imperfect structure → still award marks for correct content.
• HOTs / Application → award marks for quality of reasoning even if exact NCERT
  wording not used, provided the concept is correct.
• Diagram/map questions → full marks if student clearly describes what to draw
  with correct labels and key features named.

GENERAL RULES (all sections):
• No negative marking — minimum 0 per question.
• No sympathy marks for vague, wrong, or off-topic answers.
• Uploaded image/PDF answers → evaluate content only, ignore handwriting.
• Cross-reference carefully — student may have answered out of order.
• Be consistent — same quality of answer always gets same marks.
• All factual claims must be accurate for the subject and class level to receive marks.
${overtime ? `\n• ⚠️ NOTE: Student submitted after the 3-hour time limit. Mention this clearly in Examiner's Remarks.` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVALUATION REPORT FORMAT — FOLLOW THIS EXACTLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 OFFICIAL CBSE EVALUATION REPORT
Student : ${name || "—"}
Class   : ${cls}
Subject : ${session.subject}
Board   : ${board}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION A — Objective Type [__ / 20]
(One line per question)
Q[N] | [x]/1 | ✅ / ❌ / — | [feedback only if wrong or not attempted]

Section A Total: [X] / 20

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION B — Short Answer [__ / 30]

Q[N] — [chapter/topic] | [x]/3
[✅ Correct | ⚠️ Partial | ❌ Wrong | — Not Attempted]
Feedback: [specific — what was right, what was missing, correct answer if wrong]

Section B Total: [X] / 30

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION C — Long Answer [__ / 30]

Q[N] — [chapter/topic] | [x]/5
  Introduction    : [x]/1
  Explanation     : [x]/2
  Example/Evidence: [x]/1
  Conclusion      : [x]/1
Feedback: [what was strong, what was missing, how to improve]

Section C Total: [X] / 30

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 FINAL RESULT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section A             : [X] / 20
Section B             : [X] / 30
Section C             : [X] / 30
─────────────────────────────────────────
Total Marks Obtained  : [X] / ${totalMarks}
Percentage            : [X.X]%
Time Taken            : ${timeTaken}${overtime ? " ⚠️ Over time limit" : ""}
Questions Attempted   : [X] of 36
─────────────────────────────────────────
CBSE Grade:
90–100% → A1  Outstanding
75–89%  → A2  Excellent
60–74%  → B1  Good
45–59%  → B2  Average
33–44%  → C   Pass
Below 33% → F  Fail

Your Grade: [grade + label]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 EXAMINER'S REMARKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Strengths   : [specific chapters where ${name || "the student"} scored well]
Weaknesses  : [specific chapters to focus on]
Study Tip   : [one actionable improvement tip based on the syllabus used]
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

        await deleteSession(key);

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

      // ── Auto-expire: 3h elapsed ────────────────────────────
      if (session.status === "IN_EXAM" && isOverTime(session.started_at)) {
        return NextResponse.json({
          reply:
            `⏰ **Time's up${callName}!** Your 3-hour exam window has closed.\n\n` +
            `Type **submit** now to get your evaluation based on answers recorded so far.\n` +
            `Any further answers added after time limit will be flagged in the evaluation.`,
          overtime: true,
        });
      }

      // ── IN EXAM: silently collect every message/upload ─────
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

      // ── READY: syllabus upload override ───────────────────
      if (session.status === "READY" && !isStart(lower)) {
        const isSyllabusUpload =
          uploadType === "syllabus" ||
          (!uploadType && uploadedText.length > 30);

        if (isSyllabusUpload && uploadedText.length > 30) {
          return handleSyllabusUpload(uploadedText, cls, board, key, name, "READY");
        }

        return NextResponse.json({
          reply:
            `📚 Subject is set to **${session.subject}**.\n\n` +
            `📎 Want to use your own syllabus instead? Upload a PDF or image now.\n\n` +
            `Type **start** when ready to begin. ⏱️ Timer starts immediately.`,
        });
      }

      // ── IDLE: syllabus upload OR subject text ──────────────
      if (session.status === "IDLE" && !isGreeting(lower)) {
        const isSyllabusUpload =
          uploadType === "syllabus" ||
          (!uploadType && uploadedText.length > 30);

        if (isSyllabusUpload && uploadedText.length > 30) {
          return handleSyllabusUpload(uploadedText, cls, board, key, name, "IDLE");
        }

        if (!message.trim()) {
          return NextResponse.json({
            reply:
              `Please tell me the **subject** you want to be tested on${callName}.\n` +
              `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
              `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
          });
        }

        const { subjectName } = getChaptersForSubject(message, cls);
        const newSession: ExamSession = {
          session_key:   key,
          status:        "READY",
          subject_request: message,
          subject:       subjectName,
          answer_log:    [],
          student_name:  name,
          student_class: cls,
          student_board: board,
        };
        await saveSession(newSession);

        return NextResponse.json({
          reply:
            `📚 Got it! I'll prepare a **strict CBSE Board question paper** for:\n` +
            `**${subjectName} — Class ${cls}**\n\n` +
            `Paper will strictly follow the NCERT Class ${cls} syllabus chapters.\n\n` +
            `📎 **Tip:** Want a paper based on YOUR specific syllabus?\n` +
            `Upload your syllabus as a PDF or image now, before typing start.\n\n` +
            `Type **start** when you're ready to begin.\n` +
            `⏱️ Timer starts the moment you type start.`,
        });
      }

      // ── START: generate full paper ─────────────────────────
      if (isStart(lower) && session.status === "READY") {
        let subjectName: string;
        let chapterList: string;

        if (session.syllabus_from_upload) {
          subjectName = session.subject || "Custom Subject";
          chapterList = session.syllabus_from_upload;
        } else {
          const resolved = getChaptersForSubject(
            session.subject_request || "",
            cls
          );
          subjectName = resolved.subjectName;
          chapterList = resolved.chapterList;
        }

        const isMath = /math/i.test(session.subject_request || "");
        const isSST  = /sst|social/i.test(session.subject_request || "");

        const mathSections = `
SECTION A — Multiple Choice Questions [20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q20  MCQs [1 mark each]
  • 4 options per MCQ: a) b) c) d)
  • Cover all chapters — at least 1 question per chapter
  • Mix: conceptual, calculation-based, graph/figure based
  • Include HOTs: application, pattern recognition, reasoning

SECTION B — Short Answer / Problems [30 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q30  [3 marks each]
  • Numerical problems, proofs, constructions description, definitions
  • Cover at least 8 different chapters
  • Show full working expected — partial marks for correct method even if answer wrong
  • At least 2 HOTs / application problems

SECTION C — Long Answer / Problems [30 Marks]
━━━━━━━━━━━━━━━━━━
Q31–Q36  [5 marks each]
  • Multi-step problems, theorem proofs, data analysis
  • Cover different chapters — no repetition
  • At least 1 statistics/probability question
  • At least 1 geometry proof (with diagram description)
  • Full working + reasoning expected
        `.trim();

        const standardSections = `
SECTION A — Objective Type [20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q10  Multiple Choice Questions [1 mark each]
  • 4 options per MCQ: a) b) c) d)
  • Cover at least 8 different chapters from the list above
  • Mix: 40% knowledge recall, 40% conceptual, 20% application/HOTs

Q11–Q15  Fill in the Blanks [1 mark each]
  • Test key terms, dates, names, scientific names, or definitions
  • One blank per sentence only

Q16–Q20  True / False [1 mark each]
  • Clear, unambiguous statements — no trick questions
  • Include common student misconceptions from these chapters

SECTION B — Short Answer Questions [30 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q30  [3 marks each]
  • Each question tests ONE concept from one chapter
  • Spread across at least 8 different chapters from the list above
  • Include these types (mix throughout):
      → Define and explain with example
      → Compare and contrast two concepts
      → State cause and effect
      → Explain significance or importance
  • At least 2 HOTs (analysis/application level)
  • Expected: 3–5 sentences OR 3 clearly labelled key points

SECTION C — Long Answer Questions [30 Marks]
━━━━━━━━━━━━━━━━━━
Q31–Q36  [5 marks each]
  • Each question from a DIFFERENT chapter — no repetition
  • Every answer must require all four components:
      Introduction/context → Main explanation → Example/evidence → Conclusion
  • Must include:
      → At least 1 diagram or map-based question
        (student describes what to draw with correct labels)
      → At least 1 case study or real-world application question
      → At least 1 compare/contrast of two major concepts
        ${isSST  ? "→ At least 1 map-pointing question (rivers/mountains/states/places)" : ""}
        ${!isMath && !isSST ? "→ At least 1 question requiring a labelled diagram" : ""}
        `.trim();

        const paperPrompt = `
You are an official CBSE Board question paper setter for Class ${cls}.
Generate a COMPLETE, FULL-LENGTH question paper STRICTLY based on the syllabus/chapters listed below.
Output the paper ONLY. No commentary outside the paper itself.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAPER HEADER (include exactly):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject       : ${subjectName}
Class         : ${cls}
Board         : ${board}
Time Allowed  : 3 Hours
Maximum Marks : 80
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
General Instructions:
1. All questions are compulsory.
2. Marks for each question are shown in [ ].
3. Write well-structured answers.
4. For diagrams/maps — describe clearly what you would draw with correct labels.
5. Use standard language for all definitions.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTHORISED SYLLABUS FOR THIS PAPER (questions must come from ONLY these):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${chapterList}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isMath ? mathSections : standardSections}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY QUALITY & BALANCE RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Distribute questions EVENLY — every topic/chapter must appear at least once
• No single chapter should contribute more than 3 questions total
• Difficulty balance across full paper: 30% easy | 50% medium | 20% hard (HOTs)
• ALL questions strictly from the syllabus listed above — nothing outside
• Questions must be original, board-exam quality — not copied from sample papers
• Number ALL questions continuously Q1 through Q36
• Each question must clearly show: [1 mark] / [3 marks] / [5 marks]
• Do NOT repeat topics or question types within the same section
• For SST: spread questions proportionally across History, Geography, Civics, Economics
        `.trim();

        const paper = await callAI(paperPrompt, [
          {
            role: "user",
            content: `Generate CBSE Board paper: ${board} Class ${cls} — ${subjectName}`,
          },
        ]);

        const totalMarksOnPaper = parseTotalMarksFromPaper(paper);
        const startTime         = Date.now();

        const activeSession: ExamSession = {
          session_key:          key,
          status:               "IN_EXAM",
          subject_request:      session.subject_request,
          subject:              subjectName,
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
            paper +
            `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⏱️  EXAM STARTED — Timer is now running!\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📌 How to answer:\n` +
            `• Answer questions in **any order** you prefer\n` +
            `• Type answers directly in chat, OR\n` +
            `• Upload **photos / PDFs** of your handwritten answers\n` +
            `• You can send multiple messages — all will be collected\n` +
            `• When fully done, type **submit** (or **done** / **finish**)\n\n` +
            `Good luck${callName}! 💪 Give it your best.`,
          startTime,
        });
      }

      // Fallback for examiner
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
      const reply = await callAI(systemPrompt("oral"), oralConversation);
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // PRACTICE MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "practice") {
      const reply = await callAI(systemPrompt("practice"), conversation);
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // REVISION MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "revision") {
      const reply = await callAI(systemPrompt("revision"), conversation);
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
- Be precise and blunt — no filler phrases like "keep it up" or "great job"

LINE FORMAT (output all 4, in this exact order):
💪 Strongest:  [subject] — [score]% ([grade]) — one specific reason why
⚠️  Weakest:   [subject] — [score]% — [one specific thing to fix, e.g. "revise Chapter 3 definitions"]
📈 Trend:      [subject showing biggest positive delta, or "No improvement data yet" if all first attempts]
🎯 Next target: [subject closest to next grade] — [X] more marks → [next grade label]

If only one subject exists, adapt gracefully but still output all 4 lines.
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