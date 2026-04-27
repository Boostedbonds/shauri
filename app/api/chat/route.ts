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
  const cleaned = (raw || "").replace(/^class\s*/i, "").trim();
  const n = parseInt(cleaned);
  if (isNaN(n)) return String(syllabus.class);
  return String(Math.min(Math.max(n, MIN_CLASS), MAX_CLASS));
}

// ─────────────────────────────────────────────────────────────
// STRONG RANDOMISATION HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Returns a unique seed string combining timestamp + random hex.
 * Used in prompts to bust any caching / pattern repetition.
 */
function makeSeed(): string {
  const ts  = Date.now();
  const r1  = Math.random().toString(36).slice(2, 9);
  const r2  = Math.random().toString(36).slice(2, 9);
  const r3  = Math.floor(Math.random() * 999983).toString(); // large prime-ish
  return `[SEED:${ts}-${r1}-${r2}-${r3}]`;
}

/** Fisher-Yates shuffle — mutates and returns the array */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick a random element from an array.
 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────────────
// VARIETY BANKS  — rotated per paper so question style varies
// ─────────────────────────────────────────────────────────────

const ENGLISH_VERBS = shuffle([
  "Explain", "Describe", "Analyse", "Compare", "Discuss",
  "Illustrate", "Evaluate", "Justify", "Summarise", "Interpret",
  "Examine", "Elaborate", "Critically analyse", "Comment on",
]);

const HINDI_VERBS = shuffle([
  "परिभाषित कीजिए", "उदाहरण दीजिए", "अंतर स्पष्ट कीजिए", "व्याख्या कीजिए",
  "उचित उदाहरण सहित समझाइए", "पहचान कीजिए", "रिक्त स्थान भरिए",
  "शुद्ध कीजिए", "वाक्य में प्रयोग कीजिए", "सही विकल्प चुनिए",
]);

const SCIENCE_CONTEXTS = shuffle([
  "with a labelled diagram", "using an example from daily life",
  "with the help of a chemical equation", "referencing a real-world application",
  "using the correct scientific terminology", "with a suitable experiment",
  "comparing it with a related concept", "by stating its significance",
]);

const MATH_CONTEXTS = shuffle([
  "showing all steps", "providing a proof", "using a diagram",
  "using a real-life word problem", "by stating the theorem used",
  "finding all possible cases", "using algebraic methods",
  "using the formula and substituting values",
]);

const SST_CONTEXTS = shuffle([
  "with historical evidence", "citing specific examples from the textbook",
  "with a map reference where applicable", "mentioning the key causes and effects",
  "comparing two different perspectives", "using dates and facts",
  "explaining the significance of the event/concept",
]);

// ─────────────────────────────────────────────────────────────
// PARSE CUSTOM PAPER REQUIREMENTS FROM STUDENT COMMAND
// ─────────────────────────────────────────────────────────────

interface PaperRequirements {
  totalMarks: number | null;
  timeMinutes: number | null;
  questionTypes: string[];
  questionCount: number | null;
  marksEach: number | null;
  chapterFilter: string | null;
  topicKeyword: string | null;
  isCustom: boolean;
}

function parsePaperRequirements(text: string): PaperRequirements {
  const t = text.toLowerCase();

  const marksMatch =
    t.match(/(\d+)\s*(?:marks?|mark)\s*(?:exam|test|paper|quiz)?/) ||
    t.match(/(?:exam|test|paper|quiz)\s*(?:of|for)?\s*(\d+)\s*marks?/);
  const totalMarks = marksMatch ? parseInt(marksMatch[1]) : null;

  let timeMinutes: number | null = null;
  const hoursMatch   = t.match(/(\d+)\s*(?:hour|hr)s?\b/);
  const minutesMatch = t.match(/(\d+)\s*(?:minute|min)s?\b/);
  if (hoursMatch)   timeMinutes = parseInt(hoursMatch[1]) * 60;
  if (minutesMatch) timeMinutes = (timeMinutes || 0) + parseInt(minutesMatch[1]);
  if (timeMinutes === 0) timeMinutes = null;

  const questionTypes: string[] = [];
  if (/\b(mcq|multiple.?choice)\b/.test(t))      questionTypes.push("MCQ");
  if (/\bshort\s*answer\b/.test(t))               questionTypes.push("Short Answer");
  if (/\blong\s*answer\b/.test(t))                questionTypes.push("Long Answer");
  if (/\bfill\s*in\b/.test(t))                    questionTypes.push("Fill in the Blank");
  if (/\btrue.false\b/.test(t))                   questionTypes.push("True/False");
  if (/\bone.word\b/.test(t))                     questionTypes.push("One-Word");
  if (/\bvery\s*short\b/.test(t))                 questionTypes.push("Very Short Answer");

  const countMatch =
    t.match(/(\d+)\s*(?:mcq|questions?|q\.?s?|problems?|items?)/) ||
    t.match(/(?:give|prepare|make|create)\s*(\d+)/);
  const questionCount = countMatch ? parseInt(countMatch[1]) : null;

  const marksEachMatch =
    t.match(/(\d+)\s*marks?\s*each/) ||
    t.match(/each\s*(?:carrying|of|worth)\s*(\d+)\s*marks?/);
  const marksEach = marksEachMatch ? parseInt(marksEachMatch[1]) : null;

  let computedTotal = totalMarks;
  if (!computedTotal && questionCount && marksEach) {
    computedTotal = questionCount * marksEach;
  }

  const chapterMatch =
    t.match(/chapters?\s*([\d,\-–\s]+(?:and\s*\d+)?)/) ||
    t.match(/(?:from|only|on)\s*ch(?:apter)?s?\s*([\d,\-–\s]+(?:and\s*\d+)?)/) ||
    t.match(/(?:unit|topic)s?\s*([\d,\-–\s]+(?:and\s*\d+)?)/);
  const chapterFilter = chapterMatch ? `chapters ${chapterMatch[1].trim()}` : null;

  const topicKeywordMatch = !chapterFilter
    ? text.match(/(?:on|about|for|covering|from)\s+([A-Z][a-zA-Z\s]{3,30})(?:\s|$)/)
    : null;
  const topicKeyword = topicKeywordMatch ? topicKeywordMatch[1].trim() : null;

  const isCustom =
    computedTotal !== null ||
    timeMinutes !== null ||
    questionTypes.length > 0 ||
    questionCount !== null ||
    chapterFilter !== null;

  return {
    totalMarks: computedTotal,
    timeMinutes,
    questionTypes,
    questionCount,
    marksEach,
    chapterFilter,
    topicKeyword,
    isCustom,
  };
}

function hasCustomInstructions(text: string): boolean {
  return /\b(mcq|multiple.?choice|chapter|chapters|marks?\s+each|carrying|only\s+\d|q\d|question\s+\d|\d+\s+question|\d+\s+mcq|short\s+answer|long\s+answer|fill\s+in|true.false|one.word|very\s+short|section\s+[a-z]|\d+\s*marks?|\d+\s*(?:hour|hr|minute|min))\b/i.test(text);
}

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
      if (classVal) q = (q as any).eq("student_class", classVal);
      if (requiredStatus) q = (q as any).eq("status", requiredStatus);
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
        chapterList: (s.science.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/math/.test(req)) {
      return {
        subjectName: s.mathematics.name,
        chapterList: (s.mathematics.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/history/.test(req)) {
      return {
        subjectName: "Social Science – History",
        chapterList: (s.social_science.history.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/geo|geography/.test(req)) {
      return {
        subjectName: "Social Science – Geography (Contemporary India I)",
        chapterList: (s.social_science.geography.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/civic|politic|democracy/.test(req)) {
      return {
        subjectName: "Social Science – Civics (Democratic Politics I)",
        chapterList: (s.social_science.civics.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/econ/.test(req)) {
      return {
        subjectName: "Social Science – Economics",
        chapterList: (s.social_science.economics.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/sst|social/.test(req)) {
      const hist = (s.social_science.history.chapters as ChapterEntry[])
        .map((c) => `[History] Ch${c.number}: ${c.name}`).join("\n");
      const geo = (s.social_science.geography.chapters as ChapterEntry[])
        .map((c) => `[Geography] Ch${c.number}: ${c.name}`).join("\n");
      const civ = (s.social_science.civics.chapters as ChapterEntry[])
        .map((c) => `[Civics] Ch${c.number}: ${c.name}`).join("\n");
      const eco = (s.social_science.economics.chapters as ChapterEntry[])
        .map((c) => `[Economics] Ch${c.number}: ${c.name}`).join("\n");
      return {
        subjectName: "Social Science (SST)",
        chapterList: `HISTORY:\n${hist}\n\nGEOGRAPHY:\n${geo}\n\nCIVICS:\n${civ}\n\nECONOMICS:\n${eco}`,
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
        `${subjectRequest} chapter list from your training knowledge and use those exact chapters. Do NOT invent chapters.`,
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

function getKey(student?: StudentContext, sanitisedClass?: string): string {
  if (student?.sessionId) return student.sessionId;
  const rawCls = sanitisedClass || sanitiseClass(student?.class || "");
  const cls = rawCls.replace(/^class\s*/i, "").trim() || "x";
  return `${student?.name?.trim() || "anon"}_${cls}`;
}

function isGreeting(text: string) {
  return /^(hi|hello|hey|good\s*morning|good\s*evening|good\s*afternoon|good\s*night|gm\b|howdy|namaste|hola)\b/i.test(text.trim());
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
  try {
    const jsonMatch = text.match(/\{[\s\S]*"totalObtained"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.totalObtained !== undefined && parsed.totalMarks !== undefined) {
        return { obtained: Number(parsed.totalObtained), total: Number(parsed.totalMarks) };
      }
    }
  } catch {}
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

// ─────────────────────────────────────────────────────────────
// BUILD RICH HTML EVALUATION REPORT
// ─────────────────────────────────────────────────────────────
function buildEvalHtml(evalJson: Record<string, unknown>, fallbackText: string): string {
  try {
    const {
      studentName, cls, subject, board, timeTaken, overtime,
      totalObtained, totalMarks, percentage, grade, gradeLabel,
      sections, strengths, weaknesses, studyTip,
    } = evalJson as {
      studentName: string; cls: string; subject: string; board: string;
      timeTaken: string; overtime: boolean;
      totalObtained: number; totalMarks: number; percentage: number;
      grade: string; gradeLabel: string;
      sections: Array<{
        name: string; obtained: number; maxMarks: number;
        questions: Array<{ qNum: string; topic: string; obtained: number; maxMarks: number; status: string; feedback: string; correctAnswer?: string }>;
      }>;
      strengths: string; weaknesses: string; studyTip: string;
    };

    const gradeColor = percentage >= 91 ? "#1a7a4a" : percentage >= 71 ? "#1F4E79" : percentage >= 51 ? "#7d5a00" : percentage >= 33 ? "#a84300" : "#c0392b";
    const gradeBg    = percentage >= 91 ? "#e8f5e9" : percentage >= 71 ? "#EBF3FB" : percentage >= 51 ? "#fff9c4" : percentage >= 33 ? "#fdebd7" : "#fdecea";

    const sectionHtml = (sections || []).map(sec => {
      const secPct = sec.maxMarks > 0 ? Math.round((sec.obtained / sec.maxMarks) * 100) : 0;
      const secColor = sec.obtained === sec.maxMarks ? "#27AE60" : sec.obtained >= sec.maxMarks * 0.6 ? "#E67E22" : "#E74C3C";
      const qRows = (sec.questions || []).map(q => {
        const statusIcon = q.status === "correct" ? "✓" : q.status === "partial" ? "~" : q.status === "unattempted" ? "—" : "✗";
        const rowBg = q.status === "correct" ? "#f0fff0" : q.status === "partial" ? "#fffde7" : q.status === "unattempted" ? "#f5f5f5" : "#fff0f0";
        const statusColor = q.status === "correct" ? "#27AE60" : q.status === "partial" ? "#E67E22" : q.status === "unattempted" ? "#888" : "#E74C3C";
        const wrongNote = (q.correctAnswer && q.status !== "correct")
          ? `<div style="font-size:12px;color:#1A5276;margin-top:4px;"><b>✎ Correct:</b> ${q.correctAnswer}</div>` : "";
        const feedbackNote = q.feedback
          ? `<div style="font-size:12px;color:#5D4037;margin-top:2px;">${q.feedback}</div>` : "";
        return `
          <tr style="background:${rowBg};">
            <td style="padding:7px 10px;font-weight:600;color:#333;border:1px solid #ddd;white-space:nowrap;">${q.qNum}</td>
            <td style="padding:7px 10px;color:#333;border:1px solid #ddd;">${q.topic || "—"}${feedbackNote}${wrongNote}</td>
            <td style="padding:7px 10px;text-align:center;font-weight:700;color:${statusColor};border:1px solid #ddd;white-space:nowrap;">${statusIcon} ${q.obtained}/${q.maxMarks}</td>
          </tr>`;
      }).join("");
      return `
        <div style="margin-bottom:24px;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.10);">
          <div style="background:#2C3E50;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#fff;font-weight:700;font-size:15px;">${sec.name}</span>
            <span style="background:${secColor};color:#fff;padding:3px 12px;border-radius:20px;font-weight:700;font-size:14px;">${sec.obtained} / ${sec.maxMarks} &nbsp;(${secPct}%)</span>
          </div>
          <table style="width:100%;border-collapse:collapse;background:#fff;">
            <thead>
              <tr style="background:#D6E4F7;">
                <th style="padding:7px 10px;text-align:left;border:1px solid #ddd;font-size:13px;color:#1F4E79;">Q#</th>
                <th style="padding:7px 10px;text-align:left;border:1px solid #ddd;font-size:13px;color:#1F4E79;">Topic / Feedback</th>
                <th style="padding:7px 10px;text-align:center;border:1px solid #ddd;font-size:13px;color:#1F4E79;">Score</th>
              </tr>
            </thead>
            <tbody>${qRows}</tbody>
          </table>
        </div>`;
    }).join("");

    const summaryRows = (sections || []).map(sec => {
      const bg = sec.obtained === sec.maxMarks ? "#E8F5E9" : sec.obtained >= sec.maxMarks * 0.6 ? "#FFF9C4" : "#FDECEA";
      return `<tr style="background:${bg};">
        <td style="padding:8px 12px;border:1px solid #ddd;">${sec.name}</td>
        <td style="padding:8px 12px;text-align:center;font-weight:700;border:1px solid #ddd;">${sec.obtained} / ${sec.maxMarks}</td>
        <td style="padding:8px 12px;text-align:center;border:1px solid #ddd;">${sec.maxMarks > 0 ? Math.round(sec.obtained/sec.maxMarks*100) : 0}%</td>
      </tr>`;
    }).join("");

    return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:860px;margin:0 auto;">
  <div style="background:#1F4E79;padding:20px 24px;border-radius:10px 10px 0 0;">
    <div style="color:#fff;font-size:22px;font-weight:700;">📋 CBSE Evaluation Report</div>
    <div style="color:#BDD7EE;font-size:14px;margin-top:4px;">${subject} &nbsp;|&nbsp; Class ${cls} &nbsp;|&nbsp; ${board}</div>
  </div>
  <div style="background:#EBF3FB;padding:12px 24px;display:flex;flex-wrap:wrap;gap:20px;border:1px solid #c8ddf0;border-top:none;">
    <span style="font-size:13px;color:#333;"><b>Student:</b> ${studentName || "—"}</span>
    <span style="font-size:13px;color:#333;"><b>Time Taken:</b> ${timeTaken}${overtime ? " ⚠️ Over limit" : ""}</span>
    <span style="font-size:13px;color:#333;"><b>Max Marks:</b> ${totalMarks}</span>
  </div>
  <div style="background:${gradeBg};border:2px solid ${gradeColor};border-radius:0 0 10px 10px;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
    <div>
      <div style="font-size:36px;font-weight:800;color:${gradeColor};">${totalObtained} <span style="font-size:20px;color:#555;">/ ${totalMarks}</span></div>
      <div style="font-size:15px;color:#555;margin-top:2px;">Marks Obtained &nbsp;•&nbsp; ${percentage}%</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:48px;font-weight:800;color:${gradeColor};">${grade}</div>
      <div style="font-size:14px;color:#555;">${gradeLabel}</div>
    </div>
  </div>
  <div style="font-size:17px;font-weight:700;color:#1F4E79;border-bottom:3px solid #1F4E79;padding-bottom:6px;margin-bottom:16px;">📊 Section-wise Breakdown</div>
  ${sectionHtml}
  <div style="font-size:17px;font-weight:700;color:#1F4E79;border-bottom:3px solid #1F4E79;padding-bottom:6px;margin-bottom:16px;margin-top:8px;">📈 Summary</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.08);border-radius:6px;overflow:hidden;">
    <thead>
      <tr style="background:#1F4E79;">
        <th style="padding:9px 12px;text-align:left;color:#fff;border:1px solid #ddd;">Section</th>
        <th style="padding:9px 12px;text-align:center;color:#fff;border:1px solid #ddd;">Marks</th>
        <th style="padding:9px 12px;text-align:center;color:#fff;border:1px solid #ddd;">%</th>
      </tr>
    </thead>
    <tbody>${summaryRows}
      <tr style="background:#D6E4F7;font-weight:700;">
        <td style="padding:9px 12px;border:1px solid #ddd;">TOTAL</td>
        <td style="padding:9px 12px;text-align:center;border:1px solid #ddd;">${totalObtained} / ${totalMarks}</td>
        <td style="padding:9px 12px;text-align:center;border:1px solid #ddd;">${percentage}%</td>
      </tr>
    </tbody>
  </table>
  <div style="font-size:17px;font-weight:700;color:#1F4E79;border-bottom:3px solid #1F4E79;padding-bottom:6px;margin-bottom:16px;">💬 Examiner's Remarks</div>
  <div style="background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.08);padding:16px 20px;margin-bottom:8px;">
    <div style="margin-bottom:10px;"><span style="color:#27AE60;font-weight:700;">✦ Strengths:</span> <span style="color:#333;">${strengths || "—"}</span></div>
    <div style="margin-bottom:10px;"><span style="color:#E74C3C;font-weight:700;">✦ Weaknesses:</span> <span style="color:#333;">${weaknesses || "—"}</span></div>
    <div><span style="color:#1F4E79;font-weight:700;">✦ Study Tip:</span> <span style="color:#333;">${studyTip || "—"}</span></div>
  </div>
  <div style="text-align:center;padding:16px 0;color:#1F4E79;font-weight:700;font-size:15px;">✦ End of Evaluation Report ✦</div>
</div>`;
  } catch (e) {
    return `<pre style="font-family:monospace;white-space:pre-wrap;">${fallbackText}</pre>`;
  }
}

function parseTotalMarksFromPaper(paper: string): number {
  const match = paper.match(/(?:maximum\s*marks?|total\s*marks?)\s*[:\-]\s*(\d+)/i);
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
  currentStatus: "IDLE" | "READY",
  customInstructions?: string
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

  const reqs = customInstructions ? parsePaperRequirements(customInstructions) : null;

  const updatedSession: ExamSession = {
    session_key:          key,
    status:               "READY",
    subject_request:      subjectName,
    subject:              subjectName,
    answer_log:           [],
    syllabus_from_upload: chapterList,
    custom_instructions:  (reqs?.isCustom && customInstructions) ? customInstructions : undefined,
    student_name:         name,
    student_class:        cls,
    student_board:        board,
  };
  await saveSession(updatedSession);

  console.log("[SYLLABUS UPLOAD] Saved session:", key, "subject:", subjectName,
    "syllabusLength:", chapterList.length,
    "customInstructions:", updatedSession.custom_instructions || "none");

  const isOverride = currentStatus === "READY";

  let formatConfirmation = "";
  if (reqs?.isCustom) {
    const parts: string[] = [];
    if (reqs.totalMarks)           parts.push(`**${reqs.totalMarks} marks**`);
    if (reqs.timeMinutes)          parts.push(`${formatTimeAllowed(reqs.timeMinutes)}`);
    if (reqs.questionTypes.length) parts.push(reqs.questionTypes.join(" + "));
    if (reqs.questionCount)        parts.push(`${reqs.questionCount} questions`);
    if (reqs.chapterFilter)        parts.push(reqs.chapterFilter);
    if (parts.length > 0) {
      formatConfirmation =
        `\n✅ **Format detected:** ${parts.join(" · ")}\n` +
        `The paper will be generated with these exact specifications.\n`;
    }
  }

  return NextResponse.json({
    reply:
      `📄 **Syllabus ${isOverride ? "updated" : "uploaded"} successfully!**\n\n` +
      `**Subject detected:** ${subjectName}\n\n` +
      `**Topics / Chapters found:**\n${raw}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `The exam paper will be generated **strictly based on the above syllabus only**.\n` +
      formatConfirmation + `\n` +
      `✅ If this looks correct, type **start** to begin your exam.\n` +
      (reqs?.isCustom ? `` :
        `💡 You can also specify the format, e.g.:\n` +
        `   • "prepare 30 marks exam"\n` +
        `   • "give 20 MCQ questions"\n` +
        `   • "1 hour test with short answers"\n`) +
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
  const key = process.env.GROQ_API_KEY;
  if (!key) return "AI error: missing GROQ_API_KEY.";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: sysPrompt },
            ...messages
              .filter((m) => m.role !== "system")
              .map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content || "",
              })),
          ],
          // Temperature slightly raised for more variation
          temperature: 0.9,
          top_p: 0.95,
        }),
      }
    );
    clearTimeout(timer);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "Unable to respond.";
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

    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];

    const message: string =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    const rawUploadedText: string = body?.uploadedText || "";
    const uploadType: "syllabus" | "answer" | undefined = body?.uploadType ?? undefined;

    const bodySubject: string = body?.subject || "";
    const bodyLang: string    = body?.lang    || "";

    let uploadedText: string = sanitiseUpload(rawUploadedText);

    // ── VISION/OCR ──────────────────────────────────────────────
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
          reply: `Hey ${greetName}! 😊 I'm Shauri — think of me as your friendly ${board} teacher${cls ? ` for Class ${cls}` : ""}.\n\nI'm here to help you understand anything — concepts, doubts, revision, examples, you name it! What's on your mind today?`,
        });
      }

      const teacherConversationText = [...history, { role: "user", content: message }]
        .map((m) => m.content).join(" ");

      const OFF_TOPIC_PATTERNS =
        /\b(how are you|how r u|what'?s up|whatsup|wazzup|sup\b|i love you|tell me a joke|sing a song|let'?s dance|what'?s your name|who are you|are you alive|are you human|can we chat|can we talk|let'?s talk|wanna be friends|best friend|boyfriend|girlfriend|favourite (color|food|movie)|hobbies|fav\b|haha|hehe|tell me something funny|roast me|truth or dare)\b/i;

      const lastUserMsgs = history.filter(m => m.role === "user").slice(-3);
      const offTopicCount = lastUserMsgs.filter(m => OFF_TOPIC_PATTERNS.test(m.content)).length;
      const currentIsOffTopic = OFF_TOPIC_PATTERNS.test(message);
      const totalOffTopic = offTopicCount + (currentIsOffTopic ? 1 : 0);

      if (currentIsOffTopic && totalOffTopic === 1) {
        const msgL = message.toLowerCase();
        let warmReply: string;
        if (/how are you|how r u/.test(msgL)) {
          warmReply = `Doing great, thanks for asking, ${greetName}! 😄 Ready to help you with your studies. What subject are we tackling today?`;
        } else {
          warmReply = `Appreciate you chatting, ${greetName}! 😊 I'm best when helping you learn — ask me anything from your syllabus and I'll make it super clear. What's your first question?`;
        }
        return NextResponse.json({ reply: warmReply });
      }

      if (currentIsOffTopic && totalOffTopic >= 2) {
        return NextResponse.json({
          reply: `I totally get it — sometimes you just want to chat! 😄 But I'm most useful as your study buddy, ${greetName}. Let's make the most of our time together — pick a subject and throw your toughest question at me! 💪`,
        });
      }

      const contextPrimer: ChatMessage[] = name ? [
        { role: "user", content: `My name is ${name}${cls ? `, I'm in Class ${cls}` : ""}${board ? `, ${board} board` : ""}.` },
        { role: "assistant", content: `Hey ${name}! Great to have you here. What are we studying today?` },
      ] : [];

      const teacherConversation: ChatMessage[] = [
        ...contextPrimer,
        ...history.slice(-12),
        { role: "user", content: message },
      ];

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

      const subjectOverride = isHindiTeacher ? "hindi" : isMathTeacher ? "mathematics" : undefined;

      const teacherSystemPrompt = name
        ? systemPrompt("teacher", subjectOverride) +
          `\n\nSTUDENT IDENTITY: The student's name is ${name}${cls ? `, Class ${cls}` : ""}${board ? `, ${board}` : ""}. Always address them as ${name} — NEVER as "Student" or "there".` +
          `\n\nRESPONSE RULES: Be concise and natural — like a real classroom teacher, not a chatbot. For greetings or small talk, reply in 1-2 sentences max. Only give longer explanations when the student asks about a concept or topic. Never bullet-point conversational replies. Be warm, direct, encouraging.`
        : systemPrompt("teacher", subjectOverride);

      const reply = await callAI(teacherSystemPrompt, teacherConversation);
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // EXAMINER MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "examiner") {
      const key = getKey(student, clsRaw);

      let session: ExamSession = (await getSession(key)) || {
        session_key:   key,
        status:        "IDLE",
        answer_log:    [],
        student_name:  name,
        student_class: cls,
        student_board: board,
      };

      if (session.status === "IDLE") {
        let recovered: ExamSession | null = null;
        if (name) recovered = await getSessionByStudent(name, cls, "IN_EXAM");
        if (!recovered && name) recovered = await getSessionByStudent(name, cls, "READY");
        if (!recovered && name) recovered = await getSessionByStudent(name, cls);
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
        const elapsed = session.started_at ? formatDuration(Date.now() - session.started_at) : "—";
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
        if (name) readySession = await getSessionByStudent(name, cls, "READY");
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
        if (!readySession) {
          const directCheck = await getSession(key);
          if (directCheck?.status === "READY") readySession = directCheck;
        }
        if (!readySession && name) {
          for (const altKey of [`${name}_`, `${name.toLowerCase()}_`, `${name}_x`, `${name.toLowerCase()}_x`]) {
            if (altKey !== key) {
              const byKey = await getSession(altKey);
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
        const timeTaken = session.started_at ? formatDuration(endTime - session.started_at) : "Unknown";

        if (session.answer_log.length === 0) {
          return NextResponse.json({
            reply: `⚠️ No answers were recorded${callName}. Please type or upload your answers before submitting.`,
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
SECTION D — Long Answer [5 marks each]
• Detailed marking: Introduction (1) + Explanation/Points (2) + Diagram/Example (1) + Conclusion (1)
• Numerical questions: formula (1) + substitution (1) + calculation (2) + unit/answer (1)
SECTION E — Case Study [4 marks each]
• Sub (i) 1 mark + Sub (ii) 1 mark + Sub (iii) 2 marks
• Scientific accuracy required — vague answers score 0` : `
SECTION A — Objective [1 mark each]: Correct = 1, wrong = 0. No negative marking.
SECTION B — Short Answer [2–3 marks each]: Award proportionally per correct point.
SECTION C — Long Answer [5 marks each]: Introduction(1) + Content(2) + Example(1) + Conclusion(1).
SECTION D — Long Answer [5 marks each]: Same as Section C.
SECTION E — Case Study [4 marks each]: Sub(i) 1m + Sub(ii) 1m + Sub(iii) 2m.`;

        const evaluationPrompt = `
You are an official CBSE Board Examiner for Class ${cls}.
Subject: ${session.subject || "General"} | Board: ${board} | Maximum Marks: ${totalMarks}
${evalIsMath ? "MATH FORMATTING: Use LaTeX notation for all equations. Wrap inline math in $...$ and display math in $$...$$." : ""}
Time Taken: ${timeTaken}${overtime ? " ⚠️ SUBMITTED AFTER 3-HOUR LIMIT" : ""}

MARKING RULES:
${subjectMarkingRules}

UNIVERSAL RULES:
• No negative marking — minimum per question is always 0
• Match answers to questions by number OR topic — student may have answered out of order
• Evaluate EVERY question — unattempted = 0, do NOT skip
• Image/PDF answers → evaluate content only, ignore handwriting
• NCERT-accurate facts = full marks; correct concept in own words = full marks
${overtime ? "• Student submitted after the 3-hour limit — note in remarks." : ""}

OUTPUT FORMAT — respond ONLY with a single valid JSON object, no markdown, no explanation:
{
  "studentName": "${name || "Student"}",
  "cls": "${cls}",
  "subject": "${session.subject || "General"}",
  "board": "${board}",
  "timeTaken": "${timeTaken}",
  "overtime": ${overtime},
  "totalMarks": ${totalMarks},
  "totalObtained": <number>,
  "percentage": <number 0-100>,
  "grade": "<A1|A2|B1|B2|C1|C2|D|E>",
  "gradeLabel": "<Outstanding|Excellent|Very Good|Good|Average|Satisfactory|Pass|Needs Improvement>",
  "sections": [
    {
      "name": "<Section name>",
      "maxMarks": <number>,
      "obtained": <number>,
      "questions": [
        {
          "qNum": "<e.g. Q1>",
          "topic": "<brief topic>",
          "maxMarks": <number>,
          "obtained": <number>,
          "status": "<correct|partial|wrong|unattempted>",
          "feedback": "<one sentence>",
          "correctAnswer": "<correct answer if wrong/partial, else empty>"
        }
      ]
    }
  ],
  "strengths": "<specific sections/topics where student did well>",
  "weaknesses": "<specific sections/topics to improve>",
  "studyTip": "<one concrete, actionable improvement suggestion>"
}

Grade scale: 91-100% = A1 Outstanding | 81-90% = A2 Excellent | 71-80% = B1 Very Good | 61-70% = B2 Good | 51-60% = C1 Average | 41-50% = C2 Satisfactory | 33-40% = D Pass | <33% = E Needs Improvement
        `.trim();

        await saveSession({ ...session, status: "FAILED" });

        let evalRaw: string;
        try {
          evalRaw = await callAIForEvaluation(evaluationPrompt, [
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
            reply: `⚠️ The evaluation timed out${callName}. Your answers are all safely saved.\n\nType **submit** to try again.`,
          });
        }

        let evalJson: Record<string, unknown> = {};
        let evaluationHtml = "";
        try {
          const jsonMatch = evalRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) evalJson = JSON.parse(jsonMatch[0]);
          evaluationHtml = buildEvalHtml(evalJson, evalRaw);
        } catch (parseErr) {
          console.warn("[evaluation] JSON parse failed, using plain text fallback", parseErr);
          evaluationHtml = `<pre style="font-family:monospace;white-space:pre-wrap;padding:16px;">${evalRaw}</pre>`;
        }

        const { obtained, total } = parseScore(evalRaw);
        const obtained2  = (evalJson.totalObtained as number) || obtained;
        const total2     = (evalJson.totalMarks    as number) || (total > 0 ? total : totalMarks);
        const percentage = total2 > 0 ? Math.round((obtained2 / total2) * 100) : 0;

        const gradeLabel = (evalJson.gradeLabel as string) || "";
        const grade      = (evalJson.grade      as string) || "";
        const plainSummary =
          `✅ **Evaluation complete${callName}!**\n\n` +
          `📊 **${obtained2} / ${total2}** &nbsp;(${percentage}%) &nbsp;— Grade **${grade}** ${gradeLabel}\n\n` +
          `⏱️ Time taken: ${timeTaken}${overtime ? " ⚠️ Over limit" : ""}\n\n` +
          `_Detailed report below_ 👇`;

        try {
          await supabase.from("exam_attempts").insert({
            student_name:    name || null,
            class:           cls,
            subject:         session.subject || "General",
            percentage,
            marks_obtained:  obtained2,
            total_marks:     total2,
            time_taken:      timeTaken,
            overtime,
            evaluation_text: evalRaw,
            created_at:      new Date().toISOString(),
          });
        } catch (dbErr) {
          console.error("Failed to save exam_attempt:", dbErr);
        }

        await deleteSession(session.session_key || key);

        return NextResponse.json({
          reply:           plainSummary,
          evaluationHtml,
          examEnded:       true,
          subject:         session.subject,
          marksObtained:   obtained2,
          totalMarks:      total2,
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
        if (message.trim() && !isSubmit(lower)) parts.push(message.trim());
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
        const elapsed = session.started_at ? formatDuration(Date.now() - session.started_at) : "—";
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
        const isSyllabusUpload = uploadType === "syllabus" || (!uploadType && uploadedText.length > 30);
        if (isSyllabusUpload && uploadedText.length > 30) {
          return handleSyllabusUpload(uploadedText, cls, board, key, name, "READY", message.trim() || undefined);
        }
        if (isSubmit(lower)) {
          return NextResponse.json({
            reply:
              `⚠️ Your exam hasn't started yet${callName} — there's nothing to submit.\n\n` +
              `Subject is set to **${session.subject}**.\n\n` +
              `Type **start** when you're ready to begin. ⏱️ Timer starts immediately.`,
          });
        }
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
        const looksLikeAnswer =
          message.trim().length > 40 ||
          /^\d+[.)]/m.test(message.trim()) ||
          /[।\.]{2,}/.test(message) ||
          /\b(answer|ans|q\d|question|ques)\b/i.test(message) ||
          message.trim().split(/\s+/).length >= 3 ||
          /^[A-Z][a-z]/.test(message.trim());

        if (looksLikeAnswer) {
          let activeSession: ExamSession | null = null;
          if (name) activeSession = await getSessionByStudent(name, cls, "IN_EXAM");
          if (!activeSession && name) activeSession = await getSessionByStudent(name, cls);
          if (activeSession && activeSession.status === "IN_EXAM") {
            session = activeSession;
            console.log("[IDLE-GUARD] Recovered IN_EXAM session for answer:", activeSession.session_key);
            if (message.trim()) {
              const answerParts: string[] = [message.trim()];
              if (uploadedText) answerParts.push(`[UPLOADED ANSWER]\n${uploadedText}`);
              activeSession.answer_log.push(answerParts.join("\n\n"));
              await saveSession(activeSession);
              const elapsed = activeSession.started_at ? formatDuration(Date.now() - activeSession.started_at) : "—";
              return NextResponse.json({
                reply:
                  `✅ **Answer recorded** (Entry ${activeSession.answer_log.length})\n` +
                  `⏱️ Time elapsed: **${elapsed}**\n\n` +
                  `Continue answering, or type **submit** when done.`,
              });
            }
          }
        }

        const isSyllabusUpload = uploadType === "syllabus" || (!uploadType && uploadedText.length > 30);
        if (isSyllabusUpload && uploadedText.length > 30) {
          return handleSyllabusUpload(uploadedText, cls, board, key, name, "IDLE", message.trim() || undefined);
        }

        const isExamCommand = /^(submit|done|finish|finished|start|answers?)\s*$/i.test(message.trim());
        if (isExamCommand) {
          let rescuedSession: ExamSession | null = null;
          if (name) rescuedSession = await getSessionByStudent(name, "", "IN_EXAM");
          if (!rescuedSession && name) rescuedSession = await getSessionByStudent(name, "", "READY");
          if (rescuedSession && rescuedSession.status !== "IDLE") {
            session = rescuedSession;
            console.log("[EXAM-CMD RESCUE] recovered by name-only:", rescuedSession.session_key, rescuedSession.status);
          } else {
            return NextResponse.json({
              reply:
                `⚠️ It looks like you typed **"${message.trim()}"** — but there's no active exam session${callName}.\n\n` +
                `To get started, please tell me the **subject** you want to be tested on:\n` +
                `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
                `📎 Or **upload your syllabus** as a PDF or image for a custom paper.\n\n` +
                `Once a subject is set, type **start** to begin — the timer starts immediately.`,
            });
          }
        }

        if (!message.trim()) {
          return NextResponse.json({
            reply:
              `Please tell me the **subject** you want to be tested on${callName}.\n` +
              `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
              `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
          });
        }

        const messageReqs = parsePaperRequirements(message);
        const coreSubject = messageReqs.isCustom ? extractSubjectFromInstruction(message) : message;
        const { subjectName } = getChaptersForSubject(coreSubject, cls);

        const newSession: ExamSession = {
          session_key:         key,
          status:              "READY",
          subject_request:     coreSubject,
          subject:             subjectName,
          custom_instructions: messageReqs.isCustom ? message.trim() : undefined,
          answer_log:          [],
          student_name:        name,
          student_class:       cls,
          student_board:       board,
        };
        await saveSession(newSession);

        if (messageReqs.isCustom) {
          const totalDesc   = messageReqs.totalMarks ? `**${messageReqs.totalMarks} marks**` : "custom marks";
          const timeDesc    = messageReqs.timeMinutes ? ` · Time: **${formatTimeAllowed(messageReqs.timeMinutes)}**` : "";
          const typeDesc    = messageReqs.questionTypes.length > 0 ? ` · Type: **${messageReqs.questionTypes.join(" + ")}**` : "";
          const chapterDesc = messageReqs.chapterFilter ? ` · Scope: **${messageReqs.chapterFilter}**` : "";
          return NextResponse.json({
            reply:
              `📚 Got it! I'll prepare a **custom paper** for:\n` +
              `**${subjectName.replace(/\s*[–-]\s*Class\s*\d+$/i, "")} — Class ${cls}**\n\n` +
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
            `**${subjectName.replace(/\s*[–-]\s*Class\s*\d+$/i, "")} — Class ${cls}**\n\n` +
            `Paper will strictly follow the NCERT Class ${cls} syllabus chapters.\n\n` +
            `📎 **Tip:** Want a paper based on YOUR specific syllabus?\n` +
            `Upload your syllabus as a PDF or image now, before typing start.\n\n` +
            `💡 Want a custom format? Type: "prepare 30 marks exam" or "give 20 MCQ questions"\n\n` +
            `Type **start** when you're ready to begin.\n` +
            `⏱️ Timer starts the moment you type start.`,
        });
      }

      if (session.status === "IDLE" && uploadedText.length > 30) {
        return handleSyllabusUpload(uploadedText, cls, board, key, name, "IDLE", message.trim() || undefined);
      }

      if (isStart(lower) && session.status === "READY") {
        let subjectName: string;
        let chapterList: string;

        let recoveredInstructions = session.custom_instructions || "";
        if (!recoveredInstructions) {
          const recentUserMsgs = history.filter((m) => m.role === "user").slice(-8).map((m) => m.content);
          for (const msg of recentUserMsgs) {
            const r = parsePaperRequirements(msg);
            if (r.isCustom) {
              recoveredInstructions = msg;
              console.log("[START] Recovered custom_instructions from history:", msg);
              break;
            }
          }
        }

        console.log("[EXAM START DEBUG]", {
          sessionKey: session.session_key,
          status: session.status,
          subject: session.subject,
          hasSyllabusUpload: !!session.syllabus_from_upload,
          syllabusLength: session.syllabus_from_upload?.length || 0,
          customInstructionsFromDB: session.custom_instructions || "none",
          customInstructionsResolved: recoveredInstructions || "none",
        });

        if (session.syllabus_from_upload) {
          subjectName = session.subject || "Custom Subject";
          chapterList = session.syllabus_from_upload;
          console.log("[START] Using UPLOADED syllabus for:", subjectName, "| length:", chapterList.length);
        } else {
          console.log("[START] No uploaded syllabus — using NCERT default for:", session.subject_request);
          const resolved = getChaptersForSubject(session.subject_request || "", cls);
          subjectName = resolved.subjectName;
          chapterList = resolved.chapterList;
        }

        const isMath    = /math/i.test(subjectName);
        const isSST     = /sst|social|history|geography|civics|economics|politics|contemporary/i.test(subjectName);
        const isEnglish = /english/i.test(subjectName);
        const isHindi   = /hindi/i.test(subjectName);
        const isScience = /science|physics|chemistry|biology/i.test(subjectName);
        const hasUploadedSyllabus = !!session.syllabus_from_upload;
        const customInstructions  = recoveredInstructions;
        const hasCustomInstr      = !!customInstructions;

        const reqs = hasCustomInstr ? parsePaperRequirements(customInstructions) : {} as PaperRequirements;

        const defaultMarks   = hasUploadedSyllabus ? 30 : 80;
        const defaultMinutes = hasUploadedSyllabus ? 60 : 180;
        const finalMarks    = reqs.totalMarks  || defaultMarks;
        const finalMinutes  = reqs.timeMinutes || defaultMinutes;
        const timeAllowed   = formatTimeAllowed(finalMinutes);

        // ── UNIQUE SEED for this paper generation ─────────────────
        const paperSeed = makeSeed();

        if (hasCustomInstr || hasUploadedSyllabus) {
          let formatSpec = "";
          if (reqs.questionTypes && reqs.questionTypes.length > 0) {
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
            if (hasUploadedSyllabus) {
              formatSpec = `Design a simple numbered question paper using ONLY the topics listed in the authorised syllabus above. `;
              formatSpec += `Use a mix of: 1-mark objective questions (MCQ or fill-in-the-blank), 2-mark short-answer questions, and optionally 3-mark questions. `;
              formatSpec += `Total must be exactly ${finalMarks} marks. Do NOT create CBSE-style sections (A/B/C/D). Just number the questions 1, 2, 3...`;
            } else {
              formatSpec = `Design an appropriate mix of question types that totals exactly ${finalMarks} marks.`;
              if (isMath) formatSpec += ` Include a mix of MCQ, short answer, and problem-solving questions.`;
            }
          }

          const cleanTopicList = chapterList
            .replace(/.*UPLOADED SYLLABUS.*\n/g, "")
            .replace(/.*ABSOLUTE RULE.*\n/g, "")
            .replace(/.*A topic NOT listed.*\n/g, "")
            .replace(/.*Do NOT use standard.*\n/g, "")
            .replace(/.*Do NOT "fill gaps".*\n/g, "")
            .trim();

          const allTopicLines = cleanTopicList
            .split("\n")
            .map(l => l.replace(/^\d+\.\s*/, "").trim())
            .filter(l => l.length > 2 && !/^(SUBJECT|CHAPTERS|TOPICS|Board|Class)/i.test(l));

          let topicLines = allTopicLines;
          if (!hasUploadedSyllabus && reqs.chapterFilter) {
            const chapterNums: number[] = [];
            const rangeMatch = reqs.chapterFilter.match(/(\d+)\s*[-–to]+\s*(\d+)/i);
            if (rangeMatch) {
              const from = parseInt(rangeMatch[1]);
              const to   = parseInt(rangeMatch[2]);
              for (let n = from; n <= to; n++) chapterNums.push(n);
            }
            const singleMatches = reqs.chapterFilter.matchAll(/(\b|ch\.?\s*)(\d+)/gi);
            for (const m of singleMatches) chapterNums.push(parseInt(m[2]));
            if (chapterNums.length > 0) {
              const filtered = chapterNums
                .filter(n => n > 0 && n <= allTopicLines.length)
                .map(n => allTopicLines[n - 1])
                .filter(Boolean);
              if (filtered.length > 0) {
                topicLines = filtered;
                console.log("[CHAPTER FILTER] Narrowed to:", topicLines);
              }
            }
            if (topicLines === allTopicLines && reqs.chapterFilter) {
              const filterLower = reqs.chapterFilter.toLowerCase();
              const keywordFiltered = allTopicLines.filter(t =>
                t.toLowerCase().split(/\s+/).some(word => word.length > 3 && filterLower.includes(word))
              );
              if (keywordFiltered.length > 0) {
                topicLines = keywordFiltered;
                console.log("[KEYWORD FILTER] Narrowed to:", topicLines);
              }
            }
          }

          if (topicLines === allTopicLines && reqs.topicKeyword) {
            const kw = reqs.topicKeyword.toLowerCase();
            const kwFiltered = allTopicLines.filter(t =>
              t.toLowerCase().includes(kw) || kw.includes(t.toLowerCase().split(" ")[0])
            );
            if (kwFiltered.length > 0) {
              topicLines = kwFiltered;
              console.log("[KEYWORD TOPIC FILTER] Narrowed to:", topicLines);
            }
          }

          if (topicLines.length === 0) topicLines = allTopicLines;

          // Strong shuffle with Fisher-Yates
          topicLines = shuffle([...topicLines]);

          const marksPerQ = reqs.marksEach || (reqs.questionCount
            ? Math.round(finalMarks / reqs.questionCount)
            : finalMarks <= 20 ? 2 : finalMarks <= 40 ? 2 : 3);

          const targetQCount = reqs.questionCount ||
            Math.min(Math.ceil(finalMarks / marksPerQ), topicLines.length * 2 || 15);

          const questionPlan: Array<{ qNum: number; topic: string; marks: number }> = [];
          let marksAssigned = 0;
          for (let i = 0; i < targetQCount; i++) {
            const topic = topicLines[i % topicLines.length] || topicLines[0] || subjectName;
            const isLast = i === targetQCount - 1;
            const m = isLast ? finalMarks - marksAssigned : marksPerQ;
            if (m <= 0) break;
            questionPlan.push({ qNum: i + 1, topic, marks: m });
            marksAssigned += m;
          }

          // Subject-appropriate verb/style banks shuffled per paper
          const verbBank = isHindi ? shuffle([...HINDI_VERBS])
            : isEnglish ? shuffle([...ENGLISH_VERBS])
            : isMath ? shuffle([...MATH_CONTEXTS])
            : isSST ? shuffle([...SST_CONTEXTS])
            : isScience ? shuffle([...SCIENCE_CONTEXTS])
            : shuffle([...ENGLISH_VERBS]);

          // Difficulty rotation: easy → medium → hard → medium → easy…
          const difficultyRota = ["easy", "medium", "medium", "hard", "medium", "easy"];

          const questionTexts: string[] = [];
          for (const slot of questionPlan) {
            const verbStyle  = verbBank[slot.qNum % verbBank.length];
            const difficulty = difficultyRota[slot.qNum % difficultyRota.length];

            // Pick a random angle/context to force different question stems
            const angles = [
              `Ask about a definition or concept`,
              `Ask for an example or application`,
              `Ask to compare or contrast two things`,
              `Ask to explain cause-and-effect`,
              `Ask a fill-in-the-blank or one-word type`,
              `Ask a short analytical question`,
              `Ask for a real-life connection`,
              `Ask about a process or sequence of steps`,
            ];
            const angle = pick(angles);

            const singleQPrompt = isHindi
              ? `You are a Hindi grammar examiner. ${paperSeed}
Topic: "${slot.topic}" | Marks: ${slot.marks} | Difficulty: ${difficulty}
Angle: ${angle}
Style: ${verbStyle}

Write EXACTLY ONE unique Hindi grammar question.
RULES:
- Test ONLY the grammar concept "${slot.topic}"
- Do NOT repeat question patterns used previously
- Do NOT include any prose passage, poem, letter writing, or essay
- Output ONLY the question text in Hindi. No numbering, no marks label.`
              : `You are a ${subjectName} examiner (Class ${cls} CBSE). ${paperSeed}
Topic: "${slot.topic}" | Marks: ${slot.marks} | Difficulty: ${difficulty}
Approach: ${angle}
Style hint: "${verbStyle}"
${reqs.chapterFilter ? `Chapter scope: ${reqs.chapterFilter}` : ""}

Write EXACTLY ONE fresh, unique question on "${slot.topic}".
RULES:
- Do NOT repeat the same question stem used in any previous question
- Do NOT add topics outside "${slot.topic}"
- Vary the question type — use the Approach and Style hint as inspiration
- Output ONLY the question text. No numbering, no marks label, no explanation.`;

            const qText = await callAI(singleQPrompt, [
              { role: "user", content: `Write one ${slot.marks}-mark ${difficulty} question on "${slot.topic}".` }
            ]);
            const cleanQ = qText.trim().replace(/^(Q\.?\d+\.?\s*|\d+\.\s*)/i, "").trim();
            questionTexts.push(cleanQ);
          }

          const paperHeader = `Subject       : ${subjectName}
Class         : ${cls}
Board         : ${board}
Time Allowed  : ${timeAllowed}
Maximum Marks : ${finalMarks}`;

          const generalInstructions = `General Instructions:
1. All questions are compulsory.
2. Marks are indicated against each question.`;

          const questionBody = questionPlan
            .map((slot, i) => `${slot.qNum}. ${questionTexts[i] || "(Question unavailable)"} [${slot.marks} marks]`)
            .join("\n\n");

          const paper = `${paperHeader}\n\n${generalInstructions}\n\n${questionBody}`;
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
⚠️ CBSE 2026 FORMAT: 50% competency-based.
SECTION A — READING [20 Marks]
Q1  Unseen Passage — Factual / Discursive [10 marks]
  • (a) 5 MCQs × 1 mark = 5 marks  (b) 5 Short-answer questions × 1 mark = 5 marks
Q2  Unseen Passage — Literary / Poem extract [10 marks]
  • (a) 5 MCQs × 1 mark = 5 marks  (b) 5 Short-answer questions × 1 mark = 5 marks
SECTION B — WRITING SKILLS [20 Marks]
Q3  Descriptive Paragraph / Bio-sketch / Dialogue [5 marks]
Q4  Notice / Message / Advertisement [5 marks]
Q5  Letter Writing [5 marks]
Q6  Long Composition — Article / Speech / Story [5 marks]
SECTION C — GRAMMAR [20 Marks]
Q7  Gap Filling — Tenses / Modals / Voice [4 × 1 = 4 marks]
Q8  Editing — Error Correction [4 × 1 = 4 marks]
Q9  Omission — Missing Words [4 × 1 = 4 marks]
Q10 Sentence Reordering [4 × 1 = 4 marks]
Q11 Sentence Transformation [4 × 1 = 4 marks]
SECTION D — LITERATURE [20 Marks]
Q12 Extract-based Questions — Prose [5 marks]
Q13 Extract-based Questions — Poetry [5 marks]
Q14 Short Answer Questions — Prose & Poetry [6 marks]
Q15 Long Answer — Prose / Drama [4 marks]`.trim();

        const hindiSections = `
SECTION A — APATHIT GADYANSH / KAVYANSH [20 Marks]
Q1  Apathit Gadyansh (Unseen Prose Passage) [10 marks]
Q2  Apathit Kavyansh (Unseen Poem Extract) [10 marks]
SECTION B — LEKHAN (Writing) [20 Marks]
Q3  Patra Lekhan — औपचारिक पत्र [5 marks]
Q4  Anuched Lekhan [5 marks]
Q5  Suchna Lekhan [5 marks]
Q6  Sandesh / Vigyapan Lekhan [5 marks]
SECTION C — VYAKARAN (Grammar) [20 Marks]
Q7  Shabdalankar / Arth-bhed [4 marks]
Q8  Sandhi-Viched [4 marks]
Q9  Samas-Vigraha [4 marks]
Q10 Muhavare / Lokoktiyan [4 marks]
Q11 Vakya Bhed [4 marks]
SECTION D — PATHEN (Literature) [20 Marks]
Q12 Gadyansh-adharit prashn [5 marks]
Q13 Kavyansh-adharit prashn [5 marks]
Q14 Laghu Uttariya Prashn [6 marks]
Q15 Dirgha Uttariya Prashn [4 marks]`.trim();

        const mathSections = `
SECTION A — MCQ & Assertion-Reason [20 × 1 = 20 Marks]
Q1–Q18   MCQs [1 mark each]
Q19–Q20  Assertion-Reason [1 mark each]
SECTION B — Very Short Answer [5 × 2 = 10 Marks]
Q21–Q25  [2 marks each]
SECTION C — Short Answer [6 × 3 = 18 Marks]
Q26–Q31  [3 marks each]
SECTION D — Long Answer [4 × 5 = 20 Marks]
Q32–Q35  [5 marks each]
SECTION E — Case-Based / Competency [3 × 4 = 12 Marks]
Q36  Case Study 1 [4 marks: (i)1m + (ii)1m + (iii)2m]
Q37  Case Study 2 [4 marks]
Q38  Case Study 3 [4 marks]`.trim();

        const scienceSections = `
⚠️ CBSE 2026 FORMAT: 50% competency-based.
SECTION A — Objective [20 × 1 = 20 Marks]
Q1–Q10   MCQs [1 mark each]
Q11–Q16  Competency-based MCQs [1 mark each]
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blanks [1 mark each]
SECTION B — Very Short Answer [5 × 2 = 10 Marks]
Q21–Q25  [2 marks each]
SECTION C — Short Answer [6 × 3 = 18 Marks]
Q26–Q31  [3 marks each]
SECTION D — Long Answer [4 × 5 = 20 Marks]
Q32–Q35  [5 marks each]
SECTION E — Case-Based [3 × 4 = 12 Marks]
Q36  Case Study — Biology [4 marks]
Q37  Case Study — Physics [4 marks]
Q38  Case Study — Chemistry [4 marks]`.trim();

        const sstSections = `
SECTION A — Objective [20 × 1 = 20 Marks]
Q1–Q16   MCQs [1 mark each]
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blank / Match [1 mark each]
SECTION B — Short Answer Questions [6 × 3 = 18 Marks]
Q21–Q26  [3 marks each]
SECTION C — Long Answer Questions [5 × 5 = 25 Marks]
Q27–Q31  [5 marks each]
SECTION D — Source-Based [3 × 4 = 12 Marks]
Q32  Source — History [4 marks]
Q33  Source — Geography or Economics [4 marks]
Q34  Source — Civics [4 marks]
SECTION E — Map-Based Questions [2 + 3 = 5 Marks]
Q35  History Map [2 marks]
Q36  Geography Map [3 marks]`.trim();

        const standardSections = `
SECTION A — Objective Type [20 × 1 = 20 Marks]
Q1–Q16   MCQs [1 mark each]
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blank [1 mark each]
SECTION B — Very Short Answer [5 × 2 = 10 Marks]
Q21–Q25  [2 marks each]
SECTION C — Short Answer [6 × 3 = 18 Marks]
Q26–Q31  [3 marks each]
SECTION D — Long Answer [4 × 5 = 20 Marks]
Q32–Q35  [5 marks each]
SECTION E — Case-Based [3 × 4 = 12 Marks]
Q36–Q38  [4 marks each]`.trim();

        const sectionBlocks = isMath ? mathSections
          : isEnglish ? englishSections
          : isHindi   ? hindiSections
          : isSST     ? sstSections
          : isScience ? scienceSections
          : standardSections;

        const uploadCoverageNote = hasUploadedSyllabus ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ABSOLUTE RESTRICTION — UPLOADED SYLLABUS IS THE ONLY SOURCE 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every single question MUST come from a topic explicitly listed in the uploaded syllabus above.
Do NOT include any chapter, unit, or concept absent from the uploaded list.
Do NOT use NCERT or CBSE default chapter lists — the uploaded list replaces them entirely.`.trim() : "";

        // ── Pick random difficulty distribution and question verb styles ──
        const difficultyDistrib = pick([
          "30% easy | 50% medium | 20% HOTs",
          "20% easy | 55% medium | 25% HOTs",
          "25% easy | 45% medium | 30% HOTs",
          "35% easy | 40% medium | 25% HOTs",
        ]);

        // Pick shuffled verb set for this paper's question stems
        const paperVerbSet = isHindi
          ? shuffle([...HINDI_VERBS]).slice(0, 6).join(", ")
          : isMath
          ? shuffle([...MATH_CONTEXTS]).slice(0, 5).join(" | ")
          : isSST
          ? shuffle([...SST_CONTEXTS]).slice(0, 5).join(" | ")
          : isScience
          ? shuffle([...SCIENCE_CONTEXTS]).slice(0, 5).join(" | ")
          : shuffle([...ENGLISH_VERBS]).slice(0, 6).join(", ");

        const paperPrompt = `
You are an official CBSE Board question paper setter for Class ${cls}.
${paperSeed}
Subject: ${subjectName} | Board: ${board} | Maximum Marks: 80 | Time: 3 Hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNIQUENESS MANDATE — READ CAREFULLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This paper MUST be completely different from any previously generated paper.
The seed above is unique — use it as your creative anchor.

VARIATION REQUIREMENTS:
1. MCQs: Use fresh answer options and NEW scenarios/values — never reuse the same stem
2. Short answers: Rotate the question verb. Preferred verbs for this paper: ${paperVerbSet}
3. Long answers: Choose DIFFERENT events, concepts, or examples than a typical paper
4. Case studies: Use a NOVEL real-world scenario — NOT a textbook example
5. Passages (English): Write a FRESH unseen passage on a topic not typically used (e.g., urban farming, space tourism, community science)
6. Numbers (Math): ALL numerical values, coordinates, dimensions must be freshly chosen
7. Difficulty: ${difficultyDistrib}

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
FINAL QUALITY CHECKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Generate ALL sections completely — no section may be missing or short
• Total marks MUST add up to exactly 80
• Every question must show its mark value in [brackets]
• No two questions should test the exact same concept in the same way
• Do NOT add any text after the last question
        `.trim();

        const paper = await callAI(paperPrompt, [
          {
            role: "user",
            content: `Generate a FRESH UNIQUE CBSE Board paper: ${board} Class ${cls} — ${subjectName}${hasUploadedSyllabus ? " (UPLOADED SYLLABUS — use ONLY listed topics)" : ""}. Paper seed: ${paperSeed}`,
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
      const oralConversationText = [...history, { role: "user", content: message }].map((m) => m.content).join(" ");
      const isHindiOral =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(oralConversationText) ||
        /hindi|हिंदी/i.test(oralConversationText);
      const oralSystemPrompt = name
        ? systemPrompt("oral", isHindiOral ? "hindi" : undefined) + `\n\nSTUDENT IDENTITY: The student's name is ${name}${cls ? `, Class ${cls}` : ""}. Always use their name — never call them "Student".`
        : systemPrompt("oral", isHindiOral ? "hindi" : undefined);
      const reply = await callAI(oralSystemPrompt, oralConversation);
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
      const reply = await callAI(systemPrompt("practice", practiceOverride), conversation);
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
      const reply = await callAI(systemPrompt("revision", revisionOverride), conversation);
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
      const dataPayload = subjectStats ? JSON.stringify(subjectStats, null, 2) : JSON.stringify(trimmedAttempts, null, 2);
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
        { role: "user", content: `Performance data for ${name || "the student"}:\n${dataPayload}` },
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