/**
 * app/api/chat/route.ts
 * Knowledge Base integration added:
 * - searchKnowledge() called before every AI response
 * - KB context injected into system prompt automatically
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";
import { searchKnowledge } from "../../lib/knowledgeBase";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string; };
type StudentContext = { name?: string; class?: string; board?: string; sessionId?: string; };
type ShauriPaperData = {
  isRevisionDay?: boolean; totalMarks?: number; timeMinutes?: number;
  primarySubject?: string; primaryTopic?: string; secondarySubject?: string;
  secondaryTopic?: string; writingSubject?: string; writingSubjects?: string[];
  weekCoverage?: string; dayNum?: number; cycleNum?: number; formatBlock?: string;
  dayDate?: string; dayType?: string; weekNum?: number;
};
type ExamSession = {
  session_key: string; status: "IDLE" | "READY" | "IN_EXAM" | "FAILED";
  subject_request?: string; subject?: string; question_paper?: string;
  answer_log: string[]; started_at?: number; total_marks?: number;
  student_name?: string; student_class?: string; student_board?: string;
};

function isGreeting(text: string) { return /^(hi|hello|hey|good\s*morning|good\s*evening)/i.test(text.trim()); }
function isStart(text: string) { return /^start/i.test(text.trim()); }
function isSubmit(text: string) { return /^(submit|done|finish)/i.test(text.trim()); }
function getKey(student?: StudentContext): string {
  if (student?.sessionId) return student.sessionId;
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}
function getSyllabusSummary() {
  const subjectNames = Object.values(syllabus.subjects).map((entry: any) => entry.name);
  return `Allowed subjects: ${subjectNames.join(", ")}`;
}

/* ------------------------------------------------------------------
   KB CONTEXT INJECTOR
   Fetches relevant knowledge base entries and prepends to system prompt
------------------------------------------------------------------ */
async function buildSystemWithKB(
  mode: string,
  subject: string | undefined,
  student: StudentContext,
  userMessage: string
): Promise<string> {
  const base = systemPrompt(mode as any, subject, {
    name: student?.name,
    classLevel: student?.class,
  });

  try {
    const kb = await searchKnowledge(userMessage, student?.class);
    if (kb.matched && kb.context) {
      const kbBlock = `
══════════════════════════════════════════════════
KNOWLEDGE BASE CONTEXT (Admin-uploaded reference material)
Use this information to enhance your answer when relevant.
Sources: ${kb.sources.join(", ")}
══════════════════════════════════════════════════
${kb.context}
══════════════════════════════════════════════════
`;
      return kbBlock + "\n\n" + base;
    }
  } catch (e) {
    console.error("[KB inject error]", e);
  }

  return base;
}

/* ------------------------------------------------------------------
   PAPER PROMPT BUILDER (unchanged from original)
------------------------------------------------------------------ */
function buildPaperPrompt(shauriPaper: ShauriPaperData, student: StudentContext): string {
  const board     = student?.board || "CBSE";
  const className = student?.class || `Class ${syllabus.class}`;
  const name      = student?.name  || "Student";
  const { isRevisionDay, totalMarks, timeMinutes, primarySubject, primaryTopic,
          secondarySubject, secondaryTopic, writingSubject, writingSubjects,
          weekCoverage, dayNum, formatBlock, dayDate, dayType, weekNum } = shauriPaper;
  const marks   = totalMarks   || (isRevisionDay ? 50 : 25);
  const minutes = timeMinutes  || (isRevisionDay ? 90 : 45);
  const allowedSubjects: string[] = [];
  if (primarySubject)   allowedSubjects.push(primarySubject);
  if (secondarySubject) allowedSubjects.push(secondarySubject);
  const allowedStr = allowedSubjects.join(" and ");

  return [
    `You are a strict CBSE examiner generating a ${board} ${className} question paper for: ${name}.`,
    `Subject(s): ${allowedStr}`,
    `Topic(s): ${primaryTopic || ""}${secondaryTopic ? " | " + secondaryTopic : ""}`,
    `Total Marks: ${marks} | Time: ${minutes} minutes`,
    `Day: ${dayNum || "?"} | ${dayDate || ""} | ${dayType || "School Day"} | Week ${weekNum || "?"}`,
    formatBlock || "",
    `Generate a complete ${isRevisionDay ? "REVISION DAY (50 mark)" : "STUDY DAY (25 mark)"} CBSE question paper.`,
    `Sections A(MCQ) + B(VSA) + C(SA) + D(Case Study) + E(Writing). All marks must add up correctly.`,
    `Include day stamp at top. Only use allowed subjects. No answer key.`,
  ].filter(Boolean).join("\n");
}

function extractTotalMarks(paper: string, fallback: number): number {
  const m = paper.match(/Maximum\s*Marks?\s*[:\-]\s*(\d+)/i);
  return m ? parseInt(m[1]) : fallback;
}
function extractSubjectFromPaper(paper: string): string {
  const m = paper.match(/^Subject\s*[:\|]\s*(.+)$/im);
  if (!m) return "";
  return m[1].trim().replace(/\s*[–—\-]\s*Class\s*\d+.*$/i, "").trim();
}

/* ------------------------------------------------------------------
   CORE AI CALLER WITH FALLBACK (Groq → Gemini)
------------------------------------------------------------------ */
async function callAI(sysPrompt: string, messages: ChatMessage[], timeoutMs = 55000): Promise<string> {
  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!groqKey && !geminiKey) return "⚠️ Missing AI keys.";

  async function tryGroq(model: string): Promise<string | null> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        signal: ctrl.signal,
        body: JSON.stringify({
          model, max_tokens: 4096,
          messages: [{ role: "system", content: sysPrompt }, ...messages],
        }),
      });
      clearTimeout(t);
      if (!res.ok) { console.error(`Groq ${model} failed:`, await res.text()); return null; }
      const d = await res.json();
      return d?.choices?.[0]?.message?.content || null;
    } catch (e) { clearTimeout(t); console.error(`Groq ${model} error:`, e); return null; }
  }

  let result = groqKey ? await tryGroq("llama-3.3-70b-versatile") : null;
  if (!result && groqKey) result = await tryGroq("llama3-8b-8192");

  if (!result && geminiKey) {
    try {
      const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${sysPrompt}\n\n${transcript}` }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
          }),
        }
      );
      if (res.ok) {
        const d = await res.json();
        result = d?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
    } catch (e) { console.error("Gemini fallback error:", e); }
  }

  return result || "⚠️ AI unavailable. Try again.";
}

/* ------------------------------------------------------------------
   POST HANDLER
------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode                                 = body?.mode     || "teacher";
    const student: StudentContext              = body?.student  || {};
    const message: string                     = (body?.message  || "").trim();
    const shauriPaper: ShauriPaperData | null  = body?.shauriPaper || null;
    const history: ChatMessage[]              = Array.isArray(body?.history) ? body.history : [];
    const uploadedText: string               = body?.uploadedText || "";
    const uploadType: string                 = body?.uploadType  || "";
    const confirmedSubject: string           = body?.confirmedSubject || "";

    if (!message) return NextResponse.json({ reply: "Please type something." });

    /* ── TEACHER MODE ─────────────────────────────────────────── */
    if (mode === "teacher") {
      if (isGreeting(message)) {
        return NextResponse.json({ reply: `Hi ${student?.name || ""}! I am Shauri — your AI tutor. What shall we study today?` });
      }
      // Build system prompt WITH KB context injected
      const sysWithKB = await buildSystemWithKB("teacher", undefined, student, message);
      const reply = await callAI(sysWithKB, [{ role: "user", content: message }]);
      return NextResponse.json({ reply });
    }

    /* ── EXAMINER MODE ────────────────────────────────────────── */
    if (mode === "examiner") {
      const key = getKey(student);
      const { data: existing } = await supabase.from("exam_sessions").select("*").eq("session_key", key).maybeSingle();
      let session: ExamSession = existing
        ? { ...existing, answer_log: Array.isArray(existing.answer_log) ? existing.answer_log : [] }
        : { session_key: key, status: "IDLE", answer_log: [], student_name: student?.name, student_class: student?.class, student_board: student?.board };

      /* ── START ── */
      if (isStart(message)) {
        let paperPromptContent: string;
        let subjectForMeta: string;
        let isRevisionDay = false;
        let totalMarks    = 25;

        if (shauriPaper?.formatBlock) {
          paperPromptContent = buildPaperPrompt(shauriPaper, student);
          subjectForMeta     = shauriPaper.primarySubject || "General";
          isRevisionDay      = shauriPaper.isRevisionDay  || false;
          totalMarks         = shauriPaper.totalMarks     || (isRevisionDay ? 50 : 25);
        } else if (confirmedSubject) {
          subjectForMeta     = confirmedSubject;
          paperPromptContent = `Generate a CBSE Class ${student?.class || "10"} test paper for: ${confirmedSubject}.\n${getSyllabusSummary()}\nTotal Marks: 25 | Time: 45 minutes`;
        } else if (uploadedText && uploadType === "syllabus") {
          subjectForMeta     = "Uploaded Syllabus";
          paperPromptContent = `Generate a CBSE Class ${student?.class || "10"} test paper based on:\n${uploadedText}\nTotal Marks: 25 | Time: 45 minutes`;
        } else {
          const subjectRequest = message.replace(/^start\s*/i, "").trim();
          subjectForMeta       = subjectRequest || "General";
          paperPromptContent   = `Generate a CBSE Class ${student?.class || "10"} test paper${subjectRequest ? ` for ${subjectRequest}` : ""}.\n${getSyllabusSummary()}\nTotal Marks: 25 | Time: 45 minutes`;
        }

        // Inject KB context into examiner system prompt too
        const examSys = await buildSystemWithKB("examiner", subjectForMeta, student, paperPromptContent);
        const paper = await callAI(examSys, [{ role: "user", content: paperPromptContent }], 55000);
        if (paper.startsWith("⚠️")) return NextResponse.json({ reply: paper });

        const resolvedMarks   = extractTotalMarks(paper, totalMarks);
        const resolvedSubject = extractSubjectFromPaper(paper) || subjectForMeta;

        session = { ...session, status: "IN_EXAM", question_paper: paper, answer_log: [],
          subject: resolvedSubject, subject_request: subjectForMeta,
          started_at: Date.now(), total_marks: resolvedMarks,
          student_name: student?.name || session.student_name,
          student_class: student?.class || session.student_class,
          student_board: student?.board || session.student_board };

        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });
        return NextResponse.json({ startTime: session.started_at, paper, subject: resolvedSubject, isRevisionDay,
          reply: "✅ Paper ready! Write your answers and type **submit** when done." });
      }

      /* ── SUBMIT ── */
      if (isSubmit(message)) {
        if (session.status !== "IN_EXAM" || !session.question_paper)
          return NextResponse.json({ reply: "No active exam. Type START to begin." });
        if (!session.answer_log.length)
          return NextResponse.json({ reply: "No answers received yet. Send answers first, then type **submit**." });

        const evalPrompt = [
          `Evaluate this CBSE exam for: ${session.student_name || "Student"}.`,
          `Question Paper:\n${session.question_paper}`,
          `Student Answers:\n${session.answer_log.join("\n")}`,
          `Mark every question. Give total out of ${session.total_marks || 25}.`,
          `End with exactly:\n"Marks Obtained: X/${session.total_marks || 25}"\n"Percentage: Y%"`,
        ].join("\n\n");

        const evalSys = await buildSystemWithKB("examiner", session.subject, student, evalPrompt);
        const evalResult = await callAI(evalSys, [{ role: "user", content: evalPrompt }]);

        const marksMatch    = evalResult.match(/Marks\s+Obtained\s*[:\-]\s*(\d+)\s*\/\s*(\d+)/i);
        const pctMatch      = evalResult.match(/Percentage\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%/i);
        const marksObtained = marksMatch ? parseInt(marksMatch[1]) : 0;
        const totalMarks2   = marksMatch ? parseInt(marksMatch[2]) : (session.total_marks || 25);
        const percentage    = pctMatch ? parseFloat(pctMatch[1]) : (totalMarks2 > 0 ? Math.round((marksObtained / totalMarks2) * 100) : 0);
        const timeTaken     = session.started_at
          ? (() => { const s = Math.floor((Date.now() - session.started_at) / 1000);
              return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`; })()
          : "—";

        await supabase.from("exam_sessions").upsert({ ...session, status: "READY" }, { onConflict: "session_key" });
        return NextResponse.json({ examEnded: true, reply: evalResult, marksObtained,
          totalMarks: totalMarks2, percentage, timeTaken,
          subject: session.subject || session.subject_request || "General" });
      }

      /* ── ANSWER LOGGING ── */
      if (session.status === "IN_EXAM") {
        session = { ...session, answer_log: [...session.answer_log, message] };
        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });
        return NextResponse.json({ reply: "✅ Answer saved. Send next answer or type **submit**." });
      }

      /* ── IDLE/READY: subject selection ── */
      const subjectMsg   = confirmedSubject || message;
      const confirmSys   = await buildSystemWithKB("examiner", undefined, student, subjectMsg);
      const confirmReply = await callAI(confirmSys, [
        ...history,
        { role: "user", content: `Student wants to be tested on: ${subjectMsg}. Confirm and tell them to type START. ${getSyllabusSummary()}` },
      ]);
      return NextResponse.json({ reply: confirmReply });
    }

    return NextResponse.json({ reply: "Invalid mode." });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    return NextResponse.json({ reply: "Server error. Try again." });
  }
}