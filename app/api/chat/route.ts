import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name?: string;
  class?: string;
  board?: string;
};

// ─────────────────────────────────────────────────────────────
// EXAM SESSION
//
// FREE-FLOW MODEL:
//   • Full paper shown at once when student types "start"
//   • Timer starts at that exact moment
//   • Every message + upload between start & submit is
//     appended to answerLog — no forced Q-by-Q flow
//   • Student types submit/done/finish → full evaluation
//
// Memory safety:
//   • answerLog lives server-side in examSessions Map
//   • Nothing depends on client-side conversation history
//   • Safe for 3–3.5 hour exams with unlimited messages
// ─────────────────────────────────────────────────────────────
type ExamSession = {
  status: "IDLE" | "READY" | "IN_EXAM";
  subjectRequest?: string;
  subject?: string;
  questionPaper?: string;
  answerLog: string[];
  startedAt?: number;
  totalMarksOnPaper?: number;
  syllabusFromUpload?: string; // ← NEW: custom syllabus extracted from student-uploaded PDF/image
};

const examSessions = new Map<string, ExamSession>();

// ─────────────────────────────────────────────────────────────
// SYLLABUS HELPERS
// Class 9  → local syllabus.ts (primary) + AI fills any gaps
// All other classes → AI fetches from NCERT training knowledge
// ─────────────────────────────────────────────────────────────

type ChapterEntry = { number: number; name: string };

function getChaptersForSubject(
  subjectRequest: string,
  studentClass: string
): { subjectName: string; chapterList: string } {
  const req = subjectRequest.toLowerCase();
  const classNum = parseInt(studentClass) || 9;

  // ── Class 9: local syllabus.ts first, AI fills any gaps ───
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
          `FICTION:\n${fiction.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `POETRY:\n${poetry.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `DRAMA:\n${drama.map((t, i) => `${i + 1}. ${t}`).join("\n")}` +
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
          `PROSE & POETRY:\n${prose_poetry.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `GRAMMAR:\n${grammar.map((t, i) => `${i + 1}. ${t}`).join("\n")}` +
          `\n\nNOTE FOR AI: If any lesson or grammar topic from Class 9 Hindi ` +
          `(Sanchayan/Sparsh) is missing above, retrieve it from the official ` +
          `NCERT syllabus and include it.`,
      };
    }

    // Class 9 subject not matched locally — AI fetches entirely
    return {
      subjectName: subjectRequest,
      chapterList:
        `INSTRUCTION FOR AI: Retrieve the complete official NCERT Class 9 ` +
        `${subjectRequest} chapter list from ncert.nic.in and use those exact ` +
        `chapters. Do NOT invent chapters.`,
    };
  }

  // ── Classes 6–8, 10–12: AI fetches entirely from NCERT ────
  const subjectLabel =
    /science|physics|chemistry|biology/.test(req) ? "Science" :
    /math/.test(req) ? "Mathematics" :
    /history/.test(req) ? "Social Science – History" :
    /geo|geography/.test(req) ? "Social Science – Geography" :
    /civic|politic|democracy/.test(req) ? "Social Science – Civics/Political Science" :
    /econ/.test(req) ? "Economics" :
    /sst|social/.test(req) ? "Social Science (History + Geography + Civics + Economics)" :
    /english/.test(req) ? "English" :
    /hindi/.test(req) ? "Hindi" :
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

function getKey(student?: StudentContext) {
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

function looksLikeSubject(text: string) {
  return /math|science|history|geo|civics|english|hindi|chapter|physics|chemistry|biology|sst|social|econ/i.test(
    text
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
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
  return { obtained: 0, total: 0 };
}

function parseTotalMarksFromPaper(paper: string): number {
  const match = paper.match(
    /(?:maximum\s*marks?|total\s*marks?)\s*[:\-]\s*(\d+)/i
  );
  return match ? parseInt(match[1]) : 80;
}

// ─────────────────────────────────────────────────────────────
// NEW HELPER: Extract and parse syllabus from uploaded text
// Called when a student uploads a syllabus PDF/image in IDLE state
// Returns { subjectName, chapterList } shaped the same as
// getChaptersForSubject() so downstream paper-generation is identical.
// ─────────────────────────────────────────────────────────────
async function parseSyllabusFromUpload(
  uploadedText: string,
  cls: string,
  board: string
): Promise<{ subjectName: string; chapterList: string; raw: string }> {
  // Ask AI to extract a clean, structured syllabus from the raw OCR/extracted text.
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
${uploadedText}
──────────────────────────────────────────
`.trim();

  const extracted = await callAI(extractionPrompt, [
    { role: "user", content: uploadedText },
  ]);

  // Parse subject name from AI output
  const subjectMatch = extracted.match(/^SUBJECT:\s*(.+)$/im);
  const subjectName = subjectMatch
    ? subjectMatch[1].trim()
    : "Custom Subject";

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
// CORE AI CALLER
// ─────────────────────────────────────────────────────────────
async function callAI(
  sysPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "AI error: missing API key.";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to respond."
    );
  } catch {
    return "AI server error.";
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN POST HANDLER
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode: string = body?.mode || "";
    const student: StudentContext = body?.student || {};
    const name = student?.name || "Student";
    const cls = student?.class || String(syllabus.class);
    const board = student?.board || "CBSE";

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
      : [];

    const message: string =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    // OCR/extracted text from any image or PDF uploaded by student
    const uploadedText: string = body?.uploadedText || "";

    const lower = message.toLowerCase().trim();
    const key = getKey(student);

    // Conversation context for teacher/oral/practice/revision
    const conversation: ChatMessage[] = [
      ...history.slice(-14),
      { role: "user", content: message },
    ];

    // ═══════════════════════════════════════════════════════════
    // TEACHER MODE
    // Full adaptive teaching — prompt loaded from prompts.ts
    // ═══════════════════════════════════════════════════════════
    if (mode === "teacher") {
      if (isGreeting(lower) && history.length === 0) {
        return NextResponse.json({
          reply: `Hi ${name}! 👋 I'm Shauri, your ${board} teacher. What would you like to learn today?`,
        });
      }
      const reply = await callAI(systemPrompt("teacher"), conversation);
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // EXAMINER MODE
    //
    // FLOW:
    //   IDLE    → student specifies subject OR uploads syllabus PDF/image
    //             • Upload detected → AI extracts syllabus, confirms to student,
    //               moves to READY with syllabusFromUpload stored
    //             • Text subject → moves to READY as before
    //   READY   → student types "start" → full paper shown, timer begins
    //             • If syllabusFromUpload present → paper based on that
    //             • Else → paper based on NCERT chapters (getChaptersForSubject)
    //   IN_EXAM → every message/upload appended to answerLog silently
    //   SUBMIT  → all collected answers evaluated together in one shot
    // ═══════════════════════════════════════════════════════════
    if (mode === "examiner") {
      const session: ExamSession = examSessions.get(key) || {
        status: "IDLE",
        answerLog: [],
      };

      // ── Greeting ────────────────────────────────────────────
      if (isGreeting(lower) && session.status === "IDLE") {
        return NextResponse.json({
          reply:
            `Hello ${name}! 📋 I'm your strict CBSE Examiner.\n\n` +
            `Tell me the **subject** you want to be tested on:\n` +
            `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
            `📎 **OR** upload your **syllabus as a PDF or image** and I'll generate a paper exactly based on it.\n\n` +
            `⏱️ Your timer starts the moment you type **start**.`,
        });
      }

      // ── SUBMIT → full evaluation ─────────────────────────────
      if (isSubmit(lower) && session.status === "IN_EXAM") {
        const endTime = Date.now();
        const timeTaken = session.startedAt
          ? formatDuration(endTime - session.startedAt)
          : "Unknown";

        if (session.answerLog.length === 0) {
          return NextResponse.json({
            reply:
              `⚠️ No answers were recorded, ${name}. ` +
              `Please type or upload your answers before submitting.`,
          });
        }

        const fullAnswerTranscript = session.answerLog
          .map((entry, i) => `[Answer Entry ${i + 1}]\n${entry}`)
          .join("\n\n────────────────────────────────\n\n");

        const totalMarks = session.totalMarksOnPaper || 80;

        const evaluationPrompt = `
You are an official CBSE Board Examiner evaluating a Class ${cls} student named ${name}.
Subject: ${session.subject || "General"}
Board: ${board}
Maximum Marks on Paper: ${totalMarks}
Time Taken by Student: ${timeTaken}

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVALUATION REPORT FORMAT — FOLLOW THIS EXACTLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 OFFICIAL CBSE EVALUATION REPORT
Student : ${name}
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
Time Taken            : ${timeTaken}
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
Strengths   : [specific chapters where ${name} scored well]
Weaknesses  : [specific chapters to focus on]
Study Tip   : [one actionable improvement tip based on the syllabus used]
        `.trim();

        const evaluation = await callAI(evaluationPrompt, [
          {
            role: "user",
            content:
              `QUESTION PAPER:\n${session.questionPaper}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `STUDENT'S COMPLETE ANSWER TRANSCRIPT (${session.answerLog.length} entries):\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              fullAnswerTranscript,
          },
        ]);

        const { obtained, total } = parseScore(evaluation);
        const percentage =
          total > 0 ? Math.round((obtained / total) * 100) : 0;

        // Save to Supabase — silent fail so evaluation always returns
        try {
          await supabase.from("exam_attempts").insert({
            student_name: name,
            class: cls,
            subject: session.subject || "General",
            percentage,
            marks_obtained: obtained,
            total_marks: total,
            time_taken: timeTaken,
            created_at: new Date().toISOString(),
          });
        } catch {
          // Silent
        }

        examSessions.delete(key);

        return NextResponse.json({
          reply: evaluation,
          examEnded: true,
          subject: session.subject,
          marksObtained: obtained,
          totalMarks: total,
          percentage,
          timeTaken,
        });
      }

      // ── IN EXAM: silently collect every message/upload ───────
      if (session.status === "IN_EXAM") {
        const parts: string[] = [];

        if (message && message.trim() && !isSubmit(lower)) {
          parts.push(message.trim());
        }
        if (uploadedText && uploadedText.trim()) {
          parts.push(
            `[UPLOADED ANSWER — IMAGE/PDF]\n${uploadedText.trim()}`
          );
        }

        if (parts.length > 0) {
          session.answerLog.push(parts.join("\n\n"));
          examSessions.set(key, session);
        }

        const elapsed = session.startedAt
          ? formatDuration(Date.now() - session.startedAt)
          : "—";

        return NextResponse.json({
          reply:
            `✅ **Answer recorded** (Entry ${session.answerLog.length})\n` +
            `⏱️ Time elapsed: **${elapsed}**\n\n` +
            `Continue answering. You can:\n` +
            `• Type more answers directly\n` +
            `• Upload photos or PDFs of handwritten answers\n` +
            `• Answer questions in any order\n\n` +
            `When finished with all questions, type **submit**.`,
        });
      }

      // ════════════════════════════════════════════════════════
      // ── IDLE: check for syllabus upload FIRST, then text ───
      // ════════════════════════════════════════════════════════
      if (session.status === "IDLE" && !isGreeting(lower)) {

        // ── CASE 1: Student uploaded a syllabus PDF/image ─────
        // Detected when uploadedText is present and it doesn't
        // look like an answer (i.e. exam hasn't started yet).
        if (uploadedText && uploadedText.trim().length > 30) {
          // Extract and structure the syllabus from the upload
          const { subjectName, chapterList, raw } =
            await parseSyllabusFromUpload(uploadedText, cls, board);

          examSessions.set(key, {
            status: "READY",
            subjectRequest: subjectName,
            subject: subjectName,
            answerLog: [],
            syllabusFromUpload: chapterList, // ← store custom syllabus
          });

          return NextResponse.json({
            reply:
              `📄 **Syllabus uploaded and read successfully!**\n\n` +
              `I've extracted the following from your document:\n\n` +
              `**Subject detected:** ${subjectName}\n\n` +
              `**Topics / Chapters found:**\n${raw}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `The exam paper will be generated **strictly based on the above syllabus only**.\n\n` +
              `✅ If this looks correct, type **start** to begin your exam.\n` +
              `✏️ If something is wrong, upload a clearer image or retype the subject name.`,
          });
        }

        // ── CASE 2: Student typed a subject name ──────────────
        const { subjectName } = getChaptersForSubject(message, cls);
        examSessions.set(key, {
          status: "READY",
          subjectRequest: message,
          subject: subjectName,
          answerLog: [],
          // syllabusFromUpload intentionally absent → use NCERT
        });
        return NextResponse.json({
          reply:
            `📚 Got it! I'll prepare a **strict CBSE Board question paper** for:\n` +
            `**${subjectName} — Class ${cls}**\n\n` +
            `Paper will strictly follow the NCERT Class ${cls} syllabus chapters.\n\n` +
            `📎 **Tip:** If you'd like a paper based on YOUR specific syllabus instead,\n` +
            `upload your syllabus as a PDF or image before typing start.\n\n` +
            `Type **start** when you're ready to begin.\n` +
            `⏱️ Timer starts the moment you type start.`,
        });
      }

      // ── START: generate full paper ───────────────────────────
      if (isStart(lower) && session.status === "READY") {

        // ── Decide chapter source: custom upload OR NCERT ──────
        let subjectName: string;
        let chapterList: string;

        if (session.syllabusFromUpload) {
          // Use the syllabus the student uploaded
          subjectName = session.subject || "Custom Subject";
          chapterList = session.syllabusFromUpload;
        } else {
          // Fall back to NCERT syllabus lookup
          const resolved = getChaptersForSubject(
            session.subjectRequest || "",
            cls
          );
          subjectName = resolved.subjectName;
          chapterList = resolved.chapterList;
        }

        const isMath = /math/i.test(session.subjectRequest || "");
        const isSST = /sst|social/i.test(session.subjectRequest || "");

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
        ${isSST ? "→ At least 1 map-pointing question (rivers/mountains/states/places)" : ""}
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
        const startTime = Date.now();

        examSessions.set(key, {
          status: "IN_EXAM",
          subjectRequest: session.subjectRequest,
          subject: subjectName,
          questionPaper: paper,
          answerLog: [],
          startedAt: startTime,
          totalMarksOnPaper,
          syllabusFromUpload: session.syllabusFromUpload, // carry forward for reference
        });

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
            `Good luck, ${name}! 💪 Give it your best.`,
          startTime,
        });
      }

      // Fallback
      return NextResponse.json({
        reply:
          `Please tell me the **subject** you want to be tested on, ${name}.\n` +
          `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
          `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ORAL MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "oral") {
      const reply = await callAI(systemPrompt("oral"), conversation);
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
      const attempts = body?.attempts || [];
      const progressPrompt = `
You are an academic advisor analyzing a CBSE student's performance.
Student: ${name}, Class ${cls}

RULES:
- Max 6 lines
- Mention specific subjects by name
- Clear strengths with subject names
- Clear weaknesses with subject names
- One concrete improvement suggestion
- Be encouraging and motivating
- Include percentage trends if multiple attempts visible
      `.trim();

      const reply = await callAI(progressPrompt, [
        {
          role: "user",
          content: `Here are ${name}'s exam attempts:\n${JSON.stringify(
            attempts,
            null,
            2
          )}`,
        },
      ]);
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "Server error. Try again." },
      { status: 500 }
    );
  }
}