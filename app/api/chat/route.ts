import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";

export const runtime = "nodejs";

/* --------------------------------------------------
TYPES
-------------------------------------------------- */

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

type ShauriPaperData = {
  isRevisionDay?: boolean;
  totalMarks?: number;
  timeMinutes?: number;
  primarySubject?: string;
  primaryTopic?: string;
  secondarySubject?: string;
  secondaryTopic?: string;
  writingSubject?: string;
  writingSubjects?: string[];
  weekCoverage?: string;
  dayNum?: number;
  cycleNum?: number;
  formatBlock?: string;
};

type ExamSession = {
  session_key: string;
  status: "IDLE" | "READY" | "IN_EXAM" | "FAILED";
  subject_request?: string;
  subject?: string;
  question_paper?: string;
  answer_log: string[];
  started_at?: number;
  total_marks?: number;
  student_name?: string;
  student_class?: string;
  student_board?: string;
};

/* --------------------------------------------------
HELPERS
-------------------------------------------------- */

function isGreeting(text: string) {
  return /^(hi|hello|hey|good\s*morning|good\s*evening)/i.test(text.trim());
}

function isStart(text: string) {
  return /^start/i.test(text.trim());
}

function isSubmit(text: string) {
  return /^(submit|done|finish)/i.test(text.trim());
}

function getKey(student?: StudentContext): string {
  if (student?.sessionId) return student.sessionId;
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

function getSyllabusSummary() {
  const subjectNames = Object.values(syllabus.subjects).map((entry: any) => entry.name);
  return `Allowed subjects: ${subjectNames.join(", ")}`;
}

/* --------------------------------------------------
BUILD PAPER GENERATION PROMPT FROM shauriPaper DATA
-------------------------------------------------- */

function buildPaperPrompt(
  shauriPaper: ShauriPaperData,
  student: StudentContext
): string {
  const board      = student?.board || "CBSE";
  const className  = student?.class || `Class ${syllabus.class}`;
  const name       = student?.name  || "Student";

  const {
    isRevisionDay,
    totalMarks,
    timeMinutes,
    primarySubject,
    primaryTopic,
    secondarySubject,
    secondaryTopic,
    writingSubject,
    writingSubjects,
    weekCoverage,
    dayNum,
    formatBlock,
  } = shauriPaper;

  const subjectLine = secondarySubject
    ? `${primarySubject} + ${secondarySubject}`
    : primarySubject || "General";

  const topicLine = secondaryTopic
    ? `Primary: ${primaryTopic} | Secondary: ${secondaryTopic}`
    : primaryTopic || "General";

  const writingLine = writingSubjects && writingSubjects.length > 1
    ? `Writing sections required for: ${writingSubjects.join(" AND ")}`
    : `Writing section language: ${writingSubject || "English"}`;

  const revisionCoverage = isRevisionDay && weekCoverage
    ? `\n\nREVISION COVERAGE (topics that must be tested):\n${weekCoverage}`
    : "";

  const dayLine = dayNum ? `\nStudy Plan Day: ${dayNum}` : "";

  return [
    `Generate a ${board} ${className} question paper for student: ${name}.`,
    ``,
    `PAPER DETAILS:`,
    `  Subject(s): ${subjectLine}`,
    `  Topic(s): ${topicLine}`,
    `  ${writingLine}`,
    `  Total Marks: ${totalMarks || (isRevisionDay ? 50 : 25)}`,
    `  Time: ${timeMinutes || (isRevisionDay ? 90 : 45)} minutes`,
    `  Type: ${isRevisionDay ? "REVISION DAY TEST" : "DAILY STUDY TEST"}`,
    dayLine,
    revisionCoverage,
    ``,
    `MANDATORY FORMAT — follow every rule below EXACTLY:`,
    ``,
    formatBlock || "",
    ``,
    `OUTPUT RULES:`,
    `  - Start with a header block:`,
    `      Subject: ${subjectLine} — ${className}`,
    `      Board: ${board}`,
    `      Class: ${className}`,
    `      Time Allowed: ${timeMinutes || (isRevisionDay ? 90 : 45)} Minutes`,
    `      Maximum Marks: ${totalMarks || (isRevisionDay ? 50 : 25)}`,
    `  - Then output ALL sections A through E completely`,
    `  - Number every question as Q1, Q2, Q3 ... sequentially`,
    `  - Show marks in [brackets] after every question`,
    `  - Do NOT include answer key or model answers`,
    `  - Do NOT truncate or summarise — output the FULL paper`,
    `  - Use only ${board} syllabus content appropriate for ${className}`,
  ].filter(Boolean).join("\n");
}

/* --------------------------------------------------
EXTRACT MARKS TOTAL FROM PAPER TEXT
-------------------------------------------------- */

function extractTotalMarks(paper: string, fallback: number): number {
  const m = paper.match(/Maximum\s*Marks?\s*[:\-]\s*(\d+)/i);
  if (m) return parseInt(m[1]);
  return fallback;
}

/* --------------------------------------------------
EXTRACT SUBJECT FROM PAPER TEXT
-------------------------------------------------- */

function extractSubjectFromPaper(paper: string): string {
  const m = paper.match(/^Subject\s*[:\|]\s*(.+)$/im);
  if (!m) return "";
  return m[1]
    .trim()
    .replace(/\s*[–—\-]\s*Class\s*\d+.*$/i, "")
    .trim();
}

/* --------------------------------------------------
🔥 CORE AI CALLER WITH FALLBACK
-------------------------------------------------- */

async function callAI(
  sysPrompt: string,
  messages: ChatMessage[],
  timeoutMs = 55000
): Promise<string> {
  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!groqKey && !geminiKey) return "⚠️ Missing AI keys (GROQ_API_KEY/GEMINI_API_KEY).";

  async function tryGroq(model: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [{ role: "system", content: sysPrompt }, ...messages],
        }),
      });
      clearTimeout(timer);
      if (!res.ok) { console.error(`❌ ${model} failed:`, await res.text()); return null; }
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    } catch (err) {
      clearTimeout(timer);
      console.error(`❌ ${model} error:`, err);
      return null;
    }
  }

  // PRIMARY
  let result = groqKey ? await tryGroq("llama-3.3-70b-versatile") : null;

  // FALLBACK model
  if (!result && groqKey) {
    console.log("🔁 Groq fallback: llama3-8b-8192");
    result = await tryGroq("llama3-8b-8192");
  }

  // PROVIDER FALLBACK — Gemini
  if (!result && geminiKey) {
    console.log("🔁 Gemini fallback triggered");
    try {
      const transcript = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");
      const geminiPrompt = `${sysPrompt}\n\n${transcript}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        result = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      } else {
        console.error("❌ Gemini fallback failed:", (await res.text()).slice(0, 250));
      }
    } catch (e) {
      console.error("❌ Gemini fallback error:", e);
    }
  }

  return result || "⚠️ AI unavailable. Try again.";
}

/* --------------------------------------------------
POST HANDLER
-------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode                              = body?.mode     || "teacher";
    const student: StudentContext           = body?.student  || {};
    const message: string                  = (body?.message  || "").trim();
    const shauriPaper: ShauriPaperData | null = body?.shauriPaper || null;
    const history: ChatMessage[]           = Array.isArray(body?.history) ? body.history : [];
    const uploadedText: string             = body?.uploadedText || "";
    const uploadType: string               = body?.uploadType  || "";
    const confirmedSubject: string         = body?.confirmedSubject || "";

    if (!message) {
      return NextResponse.json({ reply: "Please type something." });
    }

    /* --------------------------------------------------
    TEACHER MODE
    -------------------------------------------------- */
    if (mode === "teacher") {
      if (isGreeting(message)) {
        return NextResponse.json({
          reply: `Hi ${student?.name || ""}! I'm Shauri — your AI tutor.`,
        });
      }

      const reply = await callAI(
        systemPrompt("teacher", undefined, {
          name: student?.name,
          classLevel: student?.class,
        }),
        [{ role: "user", content: message }]
      );

      return NextResponse.json({ reply });
    }

    /* --------------------------------------------------
    EXAMINER MODE
    -------------------------------------------------- */
    if (mode === "examiner") {
      const key = getKey(student);

      const { data: existing } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("session_key", key)
        .maybeSingle();

      let session: ExamSession = existing
        ? { ...existing, answer_log: Array.isArray(existing.answer_log) ? existing.answer_log : [] }
        : {
            session_key:   key,
            status:        "IDLE",
            answer_log:    [],
            student_name:  student?.name,
            student_class: student?.class,
            student_board: student?.board,
          };

      /* ── START ── */
      if (isStart(message)) {
        const board     = student?.board || "CBSE";
        const className = student?.class || `Class ${syllabus.class}`;

        let paperPromptContent: string;
        let subjectForMeta: string;
        let isRevisionDay = false;
        let totalMarks    = 25;

        // ── Path A: shauriPaper provided (from planner auto-trigger) ──
        if (shauriPaper && shauriPaper.formatBlock) {
          paperPromptContent = buildPaperPrompt(shauriPaper, student);
          subjectForMeta     = shauriPaper.primarySubject || "General";
          isRevisionDay      = shauriPaper.isRevisionDay  || false;
          totalMarks         = shauriPaper.totalMarks     || (isRevisionDay ? 50 : 25);

        // ── Path B: confirmedSubject from previous chat turn ──
        } else if (confirmedSubject) {
          subjectForMeta     = confirmedSubject;
          paperPromptContent = `Generate a ${board} ${className} test paper for: ${confirmedSubject}.\n\nUse only this syllabus context: ${getSyllabusSummary()}\n\nTotal Marks: 25 | Time: 45 minutes`;

        // ── Path C: uploaded syllabus ──
        } else if (uploadedText && uploadType === "syllabus") {
          subjectForMeta     = "Uploaded Syllabus";
          paperPromptContent = `Generate a ${board} ${className} test paper based on this uploaded syllabus:\n\n${uploadedText}\n\nTotal Marks: 25 | Time: 45 minutes`;

        // ── Path D: plain "start [subject]" ──
        } else {
          const subjectRequest = message.replace(/^start\s*/i, "").trim();
          subjectForMeta       = subjectRequest || "General";
          paperPromptContent   = `Generate a ${board} ${className} test paper${
            subjectRequest ? ` for ${subjectRequest}` : ""
          }.\nUse only this syllabus context: ${getSyllabusSummary()}\n\nTotal Marks: 25 | Time: 45 minutes`;
        }

        const paper = await callAI(
          systemPrompt("examiner", undefined, {
            name:       student?.name,
            classLevel: student?.class,
          }),
          [{ role: "user", content: paperPromptContent }],
          55000
        );

        // ── Check AI didn't return an error string ──
        if (paper.startsWith("⚠️")) {
          return NextResponse.json({ reply: paper });
        }

        const resolvedMarks   = extractTotalMarks(paper, totalMarks);
        const resolvedSubject = extractSubjectFromPaper(paper) || subjectForMeta;
        const startTime       = Date.now();   // ← THE CRITICAL FIX

        session = {
          ...session,
          status:         "IN_EXAM",
          question_paper: paper,
          answer_log:     [],
          subject:        resolvedSubject,
          subject_request: subjectForMeta,
          started_at:     startTime,
          total_marks:    resolvedMarks,
          student_name:   student?.name  || session.student_name,
          student_class:  student?.class || session.student_class,
          student_board:  student?.board || session.student_board,
        };

        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });

        // ── Return shape the frontend expects ──
        return NextResponse.json({
          startTime,                          // ← number, required by frontend
          paper,                              // ← the generated question paper
          subject:      resolvedSubject,
          isRevisionDay,
          reply: "✅ Paper ready! It's displayed on the right. Write your answers and type **submit** when done.",
        });
      }

      /* ── SUBMIT ── */
      if (isSubmit(message)) {
        if (session.status !== "IN_EXAM" || !session.question_paper) {
          return NextResponse.json({ reply: "No active exam found. Type START to begin." });
        }

        if (session.answer_log.length === 0) {
          return NextResponse.json({
            reply: "No answers received yet. Send your answers first, then type **submit**.",
          });
        }

        const evalPrompt = [
          `Evaluate this ${session.student_board || "CBSE"} exam for student: ${session.student_name || "Student"}.`,
          ``,
          `Question Paper:`,
          session.question_paper,
          ``,
          `Student's Answers:`,
          session.answer_log.join("\n"),
          ``,
          `Provide:`,
          `1. Marks obtained for each question with brief justification`,
          `2. Total marks obtained out of ${session.total_marks || 25}`,
          `3. Percentage score`,
          `4. 2-3 key strengths`,
          `5. 2-3 areas to improve`,
          ``,
          `End with a line: "Marks Obtained: X/${session.total_marks || 25}"`,
          `And a line: "Percentage: Y%"`,
        ].join("\n");

        const evalResult = await callAI(
          systemPrompt("examiner", undefined, {
            name:       student?.name,
            classLevel: student?.class,
          }),
          [{ role: "user", content: evalPrompt }]
        );

        // Parse marks from eval
        const marksMatch = evalResult.match(/Marks\s+Obtained\s*[:\-]\s*(\d+)\s*\/\s*(\d+)/i);
        const pctMatch   = evalResult.match(/Percentage\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%/i);

        const marksObtained = marksMatch ? parseInt(marksMatch[1]) : 0;
        const totalMarks2   = marksMatch ? parseInt(marksMatch[2]) : (session.total_marks || 25);
        const percentage    = pctMatch
          ? parseFloat(pctMatch[1])
          : totalMarks2 > 0 ? Math.round((marksObtained / totalMarks2) * 100) : 0;

        const timeTaken = session.started_at
          ? (() => {
              const s = Math.floor((Date.now() - session.started_at) / 1000);
              return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
            })()
          : "—";

        session = { ...session, status: "READY" };
        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });

        return NextResponse.json({
          examEnded:     true,
          reply:         evalResult,
          marksObtained,
          totalMarks:    totalMarks2,
          percentage,
          timeTaken,
          subject:       session.subject || session.subject_request || "General",
        });
      }

      /* ── ANSWER LOGGING (during exam) ── */
      if (session.status === "IN_EXAM") {
        session = {
          ...session,
          answer_log: [...session.answer_log, `${message}`],
        };
        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });

        return NextResponse.json({
          reply: "✅ Answer saved. Send your next answer, or type **submit** when finished.",
        });
      }

      /* ── SUBJECT SELECTION (before start) ── */
      if (session.status === "IDLE" || session.status === "READY") {
        // Handle uploaded syllabus acknowledgement
        if (uploadedText && uploadType === "syllabus") {
          return NextResponse.json({
            reply: `📋 Syllabus uploaded successfully!\n\n**Subject detected:** ${message || "Custom Syllabus"}\n\nType **start** whenever you're ready and I'll generate a paper based on your syllabus.`,
          });
        }

        // Subject confirmation chat
        const subjectMsg = confirmedSubject || message;
        const confirmReply = await callAI(
          systemPrompt("examiner", undefined, {
            name:       student?.name,
            classLevel: student?.class,
          }),
          [
            ...history,
            {
              role: "user",
              content: `The student wants to be tested on: ${subjectMsg}. Confirm the subject and tell them to type START when ready. ${getSyllabusSummary()}`,
            },
          ]
        );

        return NextResponse.json({ reply: confirmReply });
      }

      return NextResponse.json({ reply: "Type **start** to begin your exam." });
    }

    return NextResponse.json({ reply: "Invalid mode." });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    return NextResponse.json({ reply: "Server error. Try again." });
  }
}