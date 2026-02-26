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

// Fallback lookup: find ANY session for this student by name+class.
// Used when the session_key computed at "start" time differs from the key
// used when the syllabus was uploaded (sessionId vs name_class mismatch).
async function getSessionByStudent(
  studentName: string,
  studentClass: string,
  requiredStatus?: ExamSession["status"]
): Promise<ExamSession | null> {
  if (!studentName) return null;
  try {
    // IMPORTANT: all filters must come BEFORE .order() and .limit()
    // otherwise Supabase query builder ignores them
    let query = supabase
      .from("exam_sessions")
      .select("*")
      .eq("student_name", studentName)
      .eq("student_class", studentClass);

    if (requiredStatus) {
      query = (query as any).eq("status", requiredStatus);
    }

    const { data, error } = await (query as any)
      .order("updated_at", { ascending: false })
      .limit(1);

    console.log("[getSessionByStudent]", { studentName, studentClass, requiredStatus, found: data?.length, error: error?.message });

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

      // Primary key lookup
      let session: ExamSession = (await getSession(key)) || {
        session_key:   key,
        status:        "IDLE",
        answer_log:    [],
        student_name:  name,
        student_class: cls,
        student_board: board,
      };

      // ── KEY-MISMATCH RECOVERY ──────────────────────────────
      // If the primary lookup returned IDLE (or no session), hunt for any
      // non-IDLE session for this student. Tries:
      //   1. Query by student_name + student_class (most reliable)
      //   2. Query by the name_class key directly (covers null-name uploads)
      if (session.status === "IDLE") {
        let recovered: ExamSession | null = null;

        // Attempt 1: by name (only if name is non-empty)
        if (name) {
          recovered = await getSessionByStudent(name, cls);
        }

        // Attempt 2: by the canonical name_class key (handles when name was set
        // on upload but sessionId is being used now, or vice-versa)
        if (!recovered || recovered.status === "IDLE") {
          const nameClassKey = `${name || "anon"}_${cls}`;
          if (nameClassKey !== key) {
            const byKey = await getSession(nameClassKey);
            if (byKey && byKey.status !== "IDLE") recovered = byKey;
          }
        }

        if (recovered && recovered.status !== "IDLE") {
          console.log("[KEY-MISMATCH] recovered session:", recovered.session_key, recovered.status);
          session = recovered;
        }
      }

      // ── FIX: Re-greeting a READY session — remind instead of falling through ──
      // Guard: skip if an upload is present — process the upload instead of greeting
      if (isGreeting(lower) && session.status === "READY" && !uploadedText) {
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
      // FIX: Only show greeting when there is NO upload present.
      // If uploadedText is set, fall through to the upload handler below.
      if (isGreeting(lower) && session.status === "IDLE" && !uploadedText) {
        return NextResponse.json({
          reply:
            `Hello ${greetName}! 📋 I'm your strict CBSE Examiner.\n\n` +
            `Tell me the **subject** you want to be tested on:\n` +
            `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
            `📎 **OR** upload your **syllabus as a PDF or image** and I'll generate a paper exactly based on it.\n\n` +
            `⏱️ Your timer starts the moment you type **start**.`,
        });
      }

      // ── Guard: "start" typed — resolve subject from DB, confirmedSubject, or ask ──
      //
      // BUG FIX 1: The previous version scanned chat history for a fallback subject,
      // which caused it to pick up subjects from PREVIOUS sessions still in the
      // frontend's history array (e.g. "Social Science"), then overwrite a correctly
      // saved session (e.g. an uploaded English syllabus) in Supabase.
      //
      // BUG FIX 2: When a syllabus is uploaded, the DB session is saved as READY.
      // But if the frontend sends "start" without a sessionId (or with a different
      // key), getSession returns null and the fallback session is constructed as IDLE.
      // Fix: always re-fetch from DB by BOTH possible key formats and use whichever
      // is READY, so an uploaded syllabus session is never lost.
      if (isStart(lower) && session.status === "IDLE") {
        const confirmedSubject: string = body?.confirmedSubject || "";

        // ── Fallback: find any READY session for this student in DB ──
        // Try by name first, then by name_class key directly.
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

        console.log("[isStart+IDLE] readySession found:", readySession?.session_key, readySession?.subject);

        if (readySession) {
          // Found a READY session — adopt it regardless of key format
          session.status               = "READY";
          session.subject              = readySession.subject;
          session.subject_request      = readySession.subject_request;
          session.syllabus_from_upload = readySession.syllabus_from_upload;
          session.session_key          = readySession.session_key;
          // Fall through to isStart + READY paper generation below
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

        // Determine subject type for evaluation
        const evalSubj      = (session.subject || "").toLowerCase();
        const evalIsEnglish = /english/i.test(evalSubj);
        const evalIsHindi   = /hindi/i.test(evalSubj);
        const evalIsMath    = /math/i.test(evalSubj);
        const evalIsSST     = /sst|social|history|geography|civics|economics/i.test(evalSubj);
        const evalIsScience = /science|physics|chemistry|biology/i.test(evalSubj);

        // Build subject-specific marking rules
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
Study Tip   : [one specific, actionable improvement — e.g. "Practise Assertion-Reason daily" or "Work on Letter format"]
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

      // ── IDLE: syllabus upload when message looks like a greeting ──
      // FIX: If we reach here with uploadedText set and IDLE status,
      // the greeting guard was bypassed — handle the upload now.
      if (session.status === "IDLE" && uploadedText.length > 30) {
        return handleSyllabusUpload(uploadedText, cls, board, key, name, "IDLE");
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

        const isMath    = /math/i.test(subjectName);
        const isSST     = /sst|social|history|geography|civics|economics|politics|contemporary/i.test(subjectName);
        const isEnglish = /english/i.test(subjectName);
        const isHindi   = /hindi/i.test(subjectName);
        const hasUploadedSyllabus = !!session.syllabus_from_upload;

        // ═══════════════════════════════════════════════════════════
        // SUBJECT-SPECIFIC CBSE PAPER PATTERNS (2024-25 official format)
        // ═══════════════════════════════════════════════════════════

        // ── ENGLISH Language & Literature — CBSE Class 9/10 ──────────
        // Official split: Reading 20 + Writing 20 + Grammar 20 + Literature 20 = 80
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
  • Write a paragraph OR bio-sketch OR dialogue on a given prompt
  • 100–120 words | Marks: Content 2 + Expression 2 + Accuracy 1

Q4  Notice / Message / Advertisement [5 marks]
  • Write a formal Notice OR a short Message OR an Advertisement
  • Strictly follow the standard CBSE format for whichever type
  • 50–80 words

Q5  Letter Writing [5 marks]
  • Formal letter (complaint / request / application to principal or editor)
    OR Informal letter to a friend/relative
  • 120–150 words | Marks: Format 1 + Content 2 + Expression 2

Q6  Long Composition — Article / Speech / Story [5 marks]
  • Write an article OR speech OR story on a given topic with a hint
  • 150–200 words | Marks: Content 2 + Expression 2 + Accuracy/Organisation 1

SECTION C — GRAMMAR [20 Marks]
━━━━━━━━━━━━━━━━━━
Q7  Gap Filling — Tenses / Modals / Voice [4 × 1 = 4 marks]
  • 4 blanks in a passage — fill with the correct grammatical form
  • Test: present/past/future tense, modals (can/could/should/must/will/would/may/might)

Q8  Editing — Error Correction [4 × 1 = 4 marks]
  • A passage of 8–10 lines with one error per line
  • Errors: articles, prepositions, tense, concord, word form, spelling
  • Student writes: [incorrect word] → [correct word] for each line

Q9  Omission — Missing Words [4 × 1 = 4 marks]
  • A passage with one word missing per line (shown by /)
  • Student writes the missing word for each line

Q10  Sentence Reordering [4 × 1 = 4 marks]
  • 4 sets of jumbled words — reorder into a correct, meaningful sentence

Q11  Sentence Transformation [4 × 1 = 4 marks]
  • Rewrite as directed: Active↔Passive, Direct↔Indirect, combine using given conjunction,
    degree of comparison, or split into two sentences

SECTION D — LITERATURE [20 Marks]
━━━━━━━━━━━━━━━━━━
Q12  Extract-based Questions — Prose [5 marks]
  • Extract from a prose lesson listed in the syllabus above
  • 4 MCQs × 1 mark + 1 short answer × 1 mark = 5 marks

Q13  Extract-based Questions — Poetry [5 marks]
  • Extract (1–2 stanzas) from a poem listed in the syllabus above
  • 4 MCQs × 1 mark + 1 short answer × 1 mark = 5 marks

Q14  Short Answer Questions — Prose & Poetry [6 marks]
  • 3 questions × 2 marks each = 6 marks
  • Each from a DIFFERENT text in the syllabus above
  • Answer in 30–40 words (2–3 sentences)

Q15  Long Answer — Prose / Drama [4 marks]
  • 1 question requiring a paragraph-length answer (80–100 words)
  • Theme analysis OR character sketch OR comparison between two texts
        `.trim();

        // ── HINDI — CBSE Class 9/10 ──────────────────────────────────
        // Official split: Reading 20 + Writing 20 + Grammar 20 + Literature 20 = 80
        const hindiSections = `
SECTION A — APATHIT GADYANSH / KAVYANSH (Unseen Reading) [20 Marks]
━━━━━━━━━━━━━━━━━━
Q1  Apathit Gadyansh (Unseen Prose Passage) [10 marks]
  • One unseen prose passage (300–350 words)
  • (a) 5 MCQs × 1 mark = 5 marks
  • (b) 5 short-answer questions × 1 mark = 5 marks

Q2  Apathit Kavyansh (Unseen Poem Extract) [10 marks]
  • One poem or poem extract (8–12 lines)
  • (a) 5 MCQs × 1 mark = 5 marks
  • (b) 5 short-answer questions × 1 mark = 5 marks

SECTION B — LEKHAN (Writing) [20 Marks]
━━━━━━━━━━━━━━━━━━
Q3  Patra Lekhan — औपचारिक पत्र (Formal Letter) [5 marks]
  • Write a formal letter: complaint / application / request
  • To: Principal / Editor / Authority | 120–150 words
  • Marks: Format 1 + Content 2 + Language/Expression 2

Q4  Anuched Lekhan (Paragraph Writing) [5 marks]
  • Write a paragraph on a given topic with hints
  • 80–100 words | Marks: Content 2 + Language 2 + Organisation 1

Q5  Suchna Lekhan (Notice Writing) [5 marks]
  • Write a formal notice for a school event or announcement
  • 50–60 words | Strict format: संस्था का नाम, तिथि, शीर्षक, सामग्री, हस्ताक्षर

Q6  Sandesh / Vigyapan Lekhan (Message / Advertisement) [5 marks]
  • Write a formal message OR an advertisement
  • 30–50 words | Follow standard box format

SECTION C — VYAKARAN (Grammar) [20 Marks]
━━━━━━━━━━━━━━━━━━
Q7   Shabdalankar / Arth-bhed (Figures of Speech) [4 marks] — 4 × 1 mark
Q8   Sandhi-Viched (Sandhi splitting) [4 marks] — 4 × 1 mark
Q9   Samas-Vigraha (Compound word analysis) [4 marks] — 4 × 1 mark
Q10  Muhavare / Lokoktiyan (Idioms/Proverbs — use in sentence) [4 marks] — 4 × 1 mark
Q11  Vakya Bhed (Types of sentences — simple/compound/complex) [4 marks] — 4 × 1 mark

SECTION D — PATHEN (Literature) [20 Marks]
━━━━━━━━━━━━━━━━━━
Q12  Gadyansh-adharit prashn (Prose extract questions) [5 marks]
  • Extract from a prose lesson in the syllabus above
  • 4 MCQs × 1 mark + 1 short answer × 1 mark

Q13  Kavyansh-adharit prashn (Poetry extract questions) [5 marks]
  • Extract from a poem in the syllabus above
  • 4 MCQs × 1 mark + 1 short answer × 1 mark

Q14  Laghu Uttariya Prashn (Short answer questions) [6 marks]
  • 3 questions × 2 marks = 6 marks — from different texts above

Q15  Dirgha Uttariya Prashn (Long answer question) [4 marks]
  • 1 question: character / theme / central idea — 80–100 words
        `.trim();

        // ── MATHEMATICS — CBSE Class 9/10 ────────────────────────────
        // Official: Section A(1m×20) + Section B(2m×5) + Section C(3m×6) + Section D(4m×4)
        // + Section E(4m case study ×3) = 20+10+18+16+12 = 80... but for Class 9 SA/annual:
        // Standard pattern used in schools: A(1m×20) + B(2m×5) + C(3m×6) + D(5m×6) = 80
        const mathSections = `
SECTION A — MCQ & Assertion-Reason [20 × 1 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q18   MCQs [1 mark each]
  • 4 options per question: a) b) c) d)
  • Cover ALL chapters — minimum 1 question per chapter
  • Types: direct formula, conceptual, calculation, graph/figure-based, HOTs

Q19–Q20  Assertion-Reason [1 mark each]
  • Q19 and Q20 each have:
      Assertion (A): [statement]
      Reason    (R): [statement]
  • Options:
      a) Both A and R are true and R is the correct explanation of A
      b) Both A and R are true but R is NOT the correct explanation of A
      c) A is true but R is false
      d) A is false but R is true

SECTION B — Very Short Answer [5 × 2 = 10 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q25  [2 marks each]
  • Short numerical or conceptual problems requiring 2–3 steps
  • Cover 5 different chapters
  • No sub-parts. Answer in 2–4 lines or steps.

SECTION C — Short Answer [6 × 3 = 18 Marks]
━━━━━━━━━━━━━━━━━━
Q26–Q31  [3 marks each]
  • Multi-step problems, short proofs, constructions with reasoning
  • Cover 6 different chapters — no chapter repetition from Section B
  • At least 1 HOT application problem

SECTION D — Long Answer [4 × 5 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q32–Q35  [5 marks each]
  • Full theorem proofs, complex multi-step problems, data analysis
  • Each from a DIFFERENT chapter
  • Q32 or Q33 must involve a Geometry theorem proof with diagram
  • Q34 or Q35 must involve Statistics or Probability

SECTION E — Case-Based / Source-Based [3 × 4 = 12 Marks]
━━━━━━━━━━━━━━━━━━
Q36  Case Study 1 [4 marks]
  • Real-life scenario with a diagram or table
  • (i) 1 mark + (ii) 1 mark + (iii) 2 marks  OR  (i) 2 marks + (ii) 2 marks

Q37  Case Study 2 [4 marks]
  • Real-life application of a different chapter
  • (i) 1 mark + (ii) 1 mark + (iii) 2 marks  OR  (i) 2 marks + (ii) 2 marks

Q38  Case Study 3 [4 marks]
  • Data interpretation / pattern recognition scenario
  • (i) 1 mark + (ii) 1 mark + (iii) 2 marks  OR  (i) 2 marks + (ii) 2 marks
        `.trim();

        // ── SCIENCE — CBSE Class 9/10 ────────────────────────────────
        // Official: Section A(1m×20) + Section B(2m×5) + Section C(3m×6) + Section D(5m×4) + Section E(4m×3) = 80
        const scienceSections = `
SECTION A — Objective [20 × 1 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q16   MCQs [1 mark each]
  • 4 options: a) b) c) d) — one correct answer only
  • Cover all 3 branches: Physics, Chemistry, Biology
  • Types: definition-based, diagram-based, numerical, conceptual

Q17–Q18  Assertion-Reason [1 mark each]
  • Same format as Maths Assertion-Reason above (options a/b/c/d)
  • One from Life Science, one from Physical Science

Q19–Q20  Fill in the Blanks / Match the Following / One-Word Answer [1 mark each]
  • Q19: Fill in the blank with the correct scientific term
  • Q20: One-word or one-line answer

SECTION B — Very Short Answer [5 × 2 = 10 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q25  [2 marks each]
  • Answer in 2–3 sentences or show 2–3 working steps
  • Cover at least 2 questions from Biology, 2 from Physics/Chemistry, 1 any
  • No diagrams required (but can be added for clarity)

SECTION C — Short Answer [6 × 3 = 18 Marks]
━━━━━━━━━━━━━━━━━━
Q26–Q31  [3 marks each]
  • Answer in 4–5 sentences OR with a labelled diagram (where applicable)
  • Must include at least:
      → 2 Biology questions (cell / tissue / diversity / natural resources)
      → 2 Physics questions (motion / force / sound / gravitation / work-energy)
      → 2 Chemistry questions (matter / atoms / molecules / structure of atom)

SECTION D — Long Answer [4 × 5 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q32–Q35  [5 marks each]
  • Full detailed answer — 7–8 sentences minimum
  • At least 1 must require a LABELLED DIAGRAM (e.g. animal cell, neuron, ear, eye)
  • At least 1 must involve numerical calculation (e.g. speed/velocity/force/pressure)
  • Cover all 3 branches across Q32–Q35

SECTION E — Case-Based / Source-Based [3 × 4 = 12 Marks]
━━━━━━━━━━━━━━━━━━
Q36  Case Study — Biology [4 marks]
  • A short paragraph or diagram about a biological process
  • (i) 1 mark + (ii) 1 mark + (iii) 2 marks

Q37  Case Study — Physics [4 marks]
  • A real-life scenario involving a Physics concept with data
  • (i) 1 mark + (ii) 1 mark + (iii) 2 marks

Q38  Case Study — Chemistry [4 marks]
  • A scenario involving a chemical concept or experiment
  • (i) 1 mark + (ii) 1 mark + (iii) 2 marks
        `.trim();

        // ── SOCIAL SCIENCE — CBSE Class 9/10 ─────────────────────────
        // Official: Section A MCQ(1m×20) + Section B SAQ(3m×4) + Section C LAQ(5m×5) + Section D Source(4m×3) + Section E Map(5m×2) = 80... 
        // Adjusted: A(1m×20) + B(3m×6) + C(5m×5) + D Source(4m×3) + E Map(2m+3m) = 80
        const sstSections = `
SECTION A — Objective [20 × 1 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q16   MCQs [1 mark each]
  • Spread evenly: 4 from History, 4 from Geography, 4 from Civics, 4 from Economics
  • Types: date/event recall, term identification, conceptual, map-based identification

Q17–Q18  Assertion-Reason [1 mark each]
  • One from History/Civics, one from Geography/Economics
  • Options a/b/c/d same as standard Assertion-Reason format

Q19–Q20  Fill in the Blank / Match [1 mark each]

SECTION B — Short Answer Questions [6 × 3 = 18 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q26  [3 marks each]
  • Minimum 1 question from each: History, Geography, Civics, Economics
  • Answer in 4–6 lines (80–100 words)
  • No maps required in this section

SECTION C — Long Answer Questions [5 × 5 = 25 Marks]
━━━━━━━━━━━━━━━━━━
Q27–Q31  [5 marks each]
  • Minimum 1 question from each sub-subject (History / Geography / Civics / Economics)
  • Answer in 8–10 lines (150–200 words)
  • At least 1 must involve cause-and-effect analysis
  • At least 1 must compare two concepts/events/regions

SECTION D — Source-Based / Case-Based [3 × 4 = 12 Marks]
━━━━━━━━━━━━━━━━━━
Q32  Source — History [4 marks]
  • An extract from an NCERT textbook passage or document
  • 3 sub-questions: (i) 1 mark + (ii) 1 mark + (iii) 2 marks

Q33  Source — Geography or Economics [4 marks]
  • A data table, map extract, or passage
  • 3 sub-questions: (i) 1 mark + (ii) 1 mark + (iii) 2 marks

Q34  Source — Civics [4 marks]
  • A passage about a democratic concept or case
  • 3 sub-questions: (i) 1 mark + (ii) 1 mark + (iii) 2 marks

SECTION E — Map-Based Questions [2 + 3 = 5 Marks]
━━━━━━━━━━━━━━━━━━
Q35  History Map [2 marks]
  • Identify and label 2 places/events on an outline map of India or World
  • (Each correct labelling = 1 mark)

Q36  Geography Map [3 marks]
  • Mark and label 3 features on an outline map of India
  • Features from: rivers, mountains, states, natural vegetation, soil types, crops, industries
  • (Each correct labelling = 1 mark)
        `.trim();

        // ── STANDARD (other subjects) ────────────────────────────────
        const standardSections = `
SECTION A — Objective Type [20 × 1 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q1–Q16   MCQs [1 mark each] — 4 options each
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blank / One-word answer [1 mark each]

SECTION B — Very Short Answer [5 × 2 = 10 Marks]
━━━━━━━━━━━━━━━━━━
Q21–Q25  [2 marks each] — 2–3 sentence answers

SECTION C — Short Answer [6 × 3 = 18 Marks]
━━━━━━━━━━━━━━━━━━
Q26–Q31  [3 marks each] — 4–5 sentence answers, spread across chapters

SECTION D — Long Answer [4 × 5 = 20 Marks]
━━━━━━━━━━━━━━━━━━
Q32–Q35  [5 marks each] — detailed answers, each from a different chapter

SECTION E — Case-Based [3 × 4 = 12 Marks]
━━━━━━━━━━━━━━━━━━
Q36–Q38  [4 marks each] — real-life scenario with 3 sub-questions
        `.trim();

        // Pick the correct section structure
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

        // For uploaded syllabuses, build an explicit coverage enforcement block
        const uploadCoverageNote = hasUploadedSyllabus ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CRITICAL — UPLOADED SYLLABUS COVERAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The syllabus above was uploaded by the student and may cover specific topics only.
Generate questions ONLY from the topics listed — but still follow the section structure below.
Map every uploaded topic to its correct section (Reading/Writing/Grammar/Literature for English, etc.).
Do NOT skip any section. Do NOT generate only from one part of the syllabus.
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
1. This question paper contains ${isEnglish || isHindi ? "four" : "five"} sections — Section A, B, C, D${isEnglish || isHindi ? "" : ", and E"}.
2. All questions are compulsory. Marks are indicated against each question.
3. Attempt all parts of a question together.
4. Write neat, well-structured answers.${isEnglish ? `
5. For Section B — follow the prescribed format for each writing type.
6. For Section C — write complete, grammatically correct sentences.` : ""}${isMath ? `
5. Show all steps clearly. Marks are awarded for method even if the final answer is wrong.
6. Use of calculator is not permitted.` : ""}${!isEnglish && !isHindi && !isMath ? `
5. Draw neat, labelled diagrams wherever asked. Diagrams carry marks.
6. For map questions — use a pencil and label clearly.` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTHORISED SYLLABUS — Questions from ONLY these topics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${chapterList}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${uploadCoverageNote ? uploadCoverageNote + "\n\n" : ""}${sectionBlocks}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY RULES — NON-NEGOTIABLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Generate ALL sections completely — no section may be missing or short
• Total marks MUST add up to exactly 80
• Every chapter/topic in the syllabus must appear in at least one question
• No chapter appears more than 3 times across the entire paper
• Difficulty spread: 30% easy | 50% medium | 20% HOTs
• Questions must be original CBSE board-quality — not copied from textbooks
• Every question must show its mark value in [brackets]
• Do NOT add any text after the last question — paper ends at the last question
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
          session_key:          session.session_key || key,
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
            `⏱️ **Exam started! Timer is running.**\n\n` +
            `📌 How to answer:\n` +
            `• Answer questions in **any order** you prefer\n` +
            `• Type answers directly in chat, OR\n` +
            `• Upload **photos / PDFs** of your handwritten answers\n` +
            `• You can send multiple messages — all will be collected\n` +
            `• When fully done, type **submit** (or **done** / **finish**)\n\n` +
            `Good luck${callName}! 💪 Give it your best.`,
          paper,        // ← paper sent separately, never mixed into reply
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