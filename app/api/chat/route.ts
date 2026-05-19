/**
 * app/api/chat/route.ts
 * Knowledge Base integration added:
 * - searchKnowledge() called before every AI response
 * - KB context injected into system prompt automatically
 *
 * MARKING SYSTEM (updated):
 *   Daily / Holiday test ? 30 marks  60 minutes
 *   Revision test        ? 60 marks  120 minutes
 *
 * FIX: Teacher mode now passes full conversation history to callAI
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";
import { searchKnowledge } from "../../lib/knowledgeBase.server";

export const runtime = "nodejs";
const MAX_MESSAGE_CHARS = 12000;
const MAX_HISTORY_ITEMS = 30;
const MAX_HISTORY_ITEM_CHARS = 4000;

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

type PaperAuditResult = {
  pass: boolean;
  issues: string[];
  finalPaper: string;
};

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
      const retrievalHints = kb.retrieval?.topMatches?.length
        ? kb.retrieval.topMatches
            .slice(0, 5)
            .map(
              (m, i) =>
                `${i + 1}. ${m.title} | ${m.documentType} | Class ${m.classLevel} | Syllabus ${m.syllabusRelevance} | Score ${m.relevanceScore}`
            )
            .join("\n")
        : "No ranked match metadata";
      const kbBlock = `
--------------------------------------------------
KNOWLEDGE BASE CONTEXT (Admin-uploaded reference material)
Treat this as authoritative academic memory. Use it aggressively when relevant.
Priority order for conflict resolution:
1) Uploaded syllabus / official curriculum
2) NCERT-aligned content
3) Teacher notes
4) Marking schemes
5) Topper answers
6) Generic model knowledge (fallback only)
If KB provides syllabus-scoped content, do NOT go outside syllabus scope.
Avoid hallucinations when KB contains directly relevant information.
Sources: ${kb.sources.join(", ")}
Ranked retrieval:
${retrievalHints}
--------------------------------------------------
${kb.context}
--------------------------------------------------
`;
      return kbBlock + "\n\n" + base;
    }
  } catch (e) {
    console.error("[KB inject error]", e);
  }

  return base;
}

/* ------------------------------------------------------------------
   PAPER PROMPT BUILDER
   Updated: Daily = 30 marks / 60 min | Revision = 60 marks / 120 min
------------------------------------------------------------------ */
function buildPaperPrompt(shauriPaper: ShauriPaperData, student: StudentContext): string {
  const board     = student?.board || "CBSE";
  const className = student?.class || `Class ${syllabus.class}`;
  const name      = student?.name  || "Student";
  const {
    isRevisionDay, totalMarks, timeMinutes, primarySubject, primaryTopic,
    secondarySubject, secondaryTopic, writingSubject, writingSubjects,
    weekCoverage, dayNum, formatBlock, dayDate, dayType, weekNum,
  } = shauriPaper;

  // Updated defaults: Daily = 30m/60min, Revision = 60m/120min
  const marks   = totalMarks   || (isRevisionDay ? 60 : 30);
  const minutes = timeMinutes  || (isRevisionDay ? 120 : 60);

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
    isRevisionDay
      ? `Generate a complete REVISION DAY (60 mark / 120 min) CBSE question paper.`
      : `Generate a complete STUDY DAY (30 mark / 60 min) CBSE question paper.`,
    `Sections A(MCQ) + B(VSA) + C(SA) + D(Case Study) + E(Writing+Vocab). All marks must add up correctly.`,
    isRevisionDay
      ? `MARK VERIFICATION: A(10) + B(10) + C(12) + D(10) + E(18) = 60`
      : `MARK VERIFICATION: A(5) + B(6) + C(6) + D(5) + E(8) = 30`,
    `Include day stamp at top. Only use allowed subjects. No answer key.`,
    `MANDATORY PIPELINE: Draft -> Internal Audit -> Auto-fix -> Final paper.`,
    `AUDIT CHECKS (must pass before output):`,
    `1) Topic alignment to day scope only`,
    `2) Exercise scope compliance (if exercise limits exist)`,
    `3) Difficulty alignment to day/week`,
    `4) No future-topic contamination`,
    `5) CBSE section correctness and question mix`,
    `6) Marks/time exact totals`,
    `7) Writing/vocabulary planner rules`,
    `8) Hindi in Devanagari only where applicable`,
    `Never output an un-audited paper.`,
  ].filter(Boolean).join("\n");
}

function buildStrictExaminerSystem(student: StudentContext): string {
  const cls = student?.class || "10";
  return [
    `You are SHAURI Strict CBSE Class ${cls} Question Paper Setter and Examiner.`,
    `You must generate board-level papers, not generic worksheets.`,
    `Follow NCERT-first and CBSE board phrasing.`,
    `Section A must include standard MCQ + assertion-reason + case-based MCQ patterns.`,
    `Section B/C must include concept+application with gradual difficulty.`,
    `Section D must be realistic case-study analysis.`,
    `Section E must follow writing/vocabulary progression and planner rules when provided.`,
    `No answer key. No explanations. Only final question paper text.`,
  ].join("\n");
}

function buildCustomPaperPrompt(
  student: StudentContext,
  subjectForMeta: string,
  source: { uploadedText?: string; subjectRequest?: string }
): string {
  const cls = student?.class || "10";
  const topicScope = source.uploadedText
    ? `Use ONLY the uploaded syllabus/scope below:\n${source.uploadedText.slice(0, 12000)}`
    : `Requested subject/topic scope: ${source.subjectRequest || subjectForMeta}`;
  return [
    `Generate a CBSE Class ${cls} board-style test paper.`,
    `Subject: ${subjectForMeta}`,
    `Total Marks: 30 | Time: 60 minutes`,
    `Sections: A(5) + B(6) + C(6) + D(5) + E(8) = 30`,
    topicScope,
    `Quality requirements:`,
    `- Non-generic board wording`,
    `- Competency framing in MCQs and case-studies`,
    `- Assertion-reason quality with valid logic`,
    `- Diverse, non-repetitive question structures`,
    `- NCERT aligned terminology and scope`,
    `Output full paper with SECTION A/B/C/D/E and clear marks labels.`,
  ].join("\n");
}

async function auditAndRepairPaper(
  student: StudentContext,
  draftPaper: string,
  generatorPrompt: string
): Promise<PaperAuditResult> {
  const auditPrompt = [
    `Audit and repair this CBSE Class ${student?.class || "10"} question paper.`,
    `You are an internal paper quality auditor. Validate and auto-fix all issues.`,
    `Checks:`,
    `1) Section correctness and required question pattern`,
    `2) Marks/time totals correctness`,
    `3) Competency/assertion-reason/case-based quality`,
    `4) Scope/planner compliance from generation prompt`,
    `5) No future-topic leakage`,
    `6) Board-level phrasing authenticity`,
    `Return EXACTLY in this format:`,
    `AUDIT_RESULT: PASS or FAIL`,
    `ISSUES:`,
    `- issue 1`,
    `- issue 2`,
    `FINAL_PAPER:`,
    `<full corrected paper text>`,
    `GENERATION_PROMPT_CONTEXT:`,
    generatorPrompt,
    `DRAFT_PAPER:`,
    draftPaper,
  ].join("\n\n");

  const response = await callAI(
    buildStrictExaminerSystem(student),
    [{ role: "user", content: auditPrompt }],
    55000
  );

  const resultMatch = response.match(/AUDIT_RESULT:\s*(PASS|FAIL)/i);
  const pass = (resultMatch?.[1] || "").toUpperCase() === "PASS";
  const finalPaper = (response.match(/FINAL_PAPER:\s*([\s\S]*)$/i)?.[1] || draftPaper).trim();
  const issuesBlock = response.match(/ISSUES:\s*([\s\S]*?)(?=FINAL_PAPER:|$)/i)?.[1] || "";
  const issues = issuesBlock
    .split("\n")
    .map((x) => x.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);

  return { pass, issues, finalPaper };
}

function extractTotalMarks(paper: string, fallback: number): number {
  const m = paper.match(/Maximum\s*Marks?\s*[:\-]\s*(\d+)/i);
  return m ? parseInt(m[1]) : fallback;
}
function extractSubjectFromPaper(paper: string): string {
  const m = paper.match(/^Subject\s*[:\|]\s*(.+)$/im);
  if (!m) return "";
  return m[1].trim().replace(/\s*[--\-]\s*Class\s*\d+.*$/i, "").trim();
}

/* ------------------------------------------------------------------
   CORE AI CALLER WITH FALLBACK (Groq ? Gemini)
------------------------------------------------------------------ */
async function callAI(sysPrompt: string, messages: ChatMessage[], timeoutMs = 55000): Promise<string> {
  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!groqKey && !geminiKey) return "?? Missing AI keys.";

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

  return result || "?? AI unavailable. Try again.";
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
    const history: ChatMessage[]              = Array.isArray(body?.history)
      ? body.history
          .filter((h: ChatMessage) => h?.content && typeof h.content === "string")
          .slice(-MAX_HISTORY_ITEMS)
          .map((h: ChatMessage) => ({ ...h, content: h.content.slice(0, MAX_HISTORY_ITEM_CHARS) }))
      : [];
    const uploadedText: string               = body?.uploadedText || "";
    const uploadType: string                 = body?.uploadType  || "";
    const confirmedSubject: string           = body?.confirmedSubject || "";

    if (!message) return NextResponse.json({ reply: "Please type something." });
    if (message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({ reply: "Message too long. Please shorten and retry." }, { status: 400 });
    }

    /* -- TEACHER MODE ------------------------------------------- */
    if (mode === "teacher") {
      // Always call AI - never short-circuit with a hardcoded greeting.
      // The AI system prompt handles warm greetings naturally.
      const sysWithKB = await buildSystemWithKB("teacher", undefined, student, message);
      const reply = await callAI(sysWithKB, [
        ...history,
        { role: "user", content: message },
      ]);
      return NextResponse.json({ reply });
    }

    /* -- EXAMINER MODE ------------------------------------------ */
    if (mode === "examiner") {
      const key = getKey(student);
      const { data: existing } = await supabase.from("exam_sessions").select("*").eq("session_key", key).maybeSingle();
      let session: ExamSession = existing
        ? { ...existing, answer_log: Array.isArray(existing.answer_log) ? existing.answer_log : [] }
        : { session_key: key, status: "IDLE", answer_log: [], student_name: student?.name, student_class: student?.class, student_board: student?.board };

      /* -- START -- */
      if (isStart(message)) {
        let paperPromptContent: string;
        let subjectForMeta: string;
        let isRevisionDay = false;
        // Updated defaults: Daily = 30m, Revision = 60m
        let totalMarks    = 30;

        if (shauriPaper?.formatBlock) {
          paperPromptContent = buildPaperPrompt(shauriPaper, student);
          subjectForMeta     = shauriPaper.primarySubject || "General";
          isRevisionDay      = shauriPaper.isRevisionDay  || false;
          totalMarks         = shauriPaper.totalMarks     || (isRevisionDay ? 60 : 30);
        } else if (confirmedSubject) {
          subjectForMeta     = confirmedSubject;
          paperPromptContent = buildCustomPaperPrompt(student, subjectForMeta, { subjectRequest: confirmedSubject });
          totalMarks = 30;
        } else if (uploadedText && uploadType === "syllabus") {
          subjectForMeta     = "Uploaded Syllabus";
          paperPromptContent = buildCustomPaperPrompt(student, subjectForMeta, { uploadedText });
          totalMarks = 30;
        } else {
          const subjectRequest = message.replace(/^start\s*/i, "").trim();
          subjectForMeta       = subjectRequest || "General";
          paperPromptContent = buildCustomPaperPrompt(student, subjectForMeta, { subjectRequest });
          totalMarks = 30;
        }

        const examSysBase = await buildSystemWithKB("examiner", subjectForMeta, student, paperPromptContent);
        const examSys = `${buildStrictExaminerSystem(student)}\n\n${examSysBase}`;

        const draftPaper = await callAI(examSys, [{ role: "user", content: paperPromptContent }], 55000);
        if (draftPaper.startsWith("??")) return NextResponse.json({ reply: draftPaper });

        const audit = await auditAndRepairPaper(student, draftPaper, paperPromptContent);
        const paper = audit.finalPaper || draftPaper;

        const resolvedMarks   = extractTotalMarks(paper, totalMarks);
        const resolvedSubject = extractSubjectFromPaper(paper) || subjectForMeta;

        session = {
          ...session, status: "IN_EXAM", question_paper: paper, answer_log: [],
          subject: resolvedSubject, subject_request: subjectForMeta,
          started_at: Date.now(), total_marks: resolvedMarks,
          student_name: student?.name || session.student_name,
          student_class: student?.class || session.student_class,
          student_board: student?.board || session.student_board,
        };

        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });
        return NextResponse.json({
          startTime: session.started_at, paper, subject: resolvedSubject, isRevisionDay,
          reply: audit.pass
            ? "? Paper ready! Internal CBSE audit passed. Write your answers and type **submit** when done."
            : "? Paper ready! Internal audit auto-fixed scope/quality issues before publishing.",
        });
      }

      /* -- SUBMIT -- */
      if (isSubmit(message)) {
        if (session.status !== "IN_EXAM" || !session.question_paper)
          return NextResponse.json({ reply: "No active exam. Type START to begin." });
        if (!session.answer_log.length)
          return NextResponse.json({ reply: "No answers received yet. Send answers first, then type **submit**." });

        const evalPrompt = [
          `Evaluate this CBSE exam for: ${session.student_name || "Student"}.`,
          `Question Paper:\n${session.question_paper}`,
          `Student Answers:\n${session.answer_log.join("\n")}`,
          `Mark every question. Give total out of ${session.total_marks || 30}.`,
          `Use strict CBSE marking-scheme behavior:`,
          `- Award method marks where steps are correct`,
          `- Penalize missing units/final statements where required`,
          `- Mention answer structure, presentation, vocabulary/terminology quality`,
          `- Flag conceptual gaps and recurring mistakes`,
          `- Keep judgement strict and board-realistic (not lenient generic feedback)`,
          `End with exactly:\n"Marks Obtained: X/${session.total_marks || 30}"\n"Percentage: Y%"`,
        ].join("\n\n");

        const evalSys = await buildSystemWithKB("examiner", session.subject, student, evalPrompt);
        const evalResult = await callAI(evalSys, [{ role: "user", content: evalPrompt }]);

        const marksMatch    = evalResult.match(/Marks\s+Obtained\s*[:\-]\s*(\d+)\s*\/\s*(\d+)/i);
        const pctMatch      = evalResult.match(/Percentage\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%/i);
        const marksObtained = marksMatch ? parseInt(marksMatch[1]) : 0;
        const totalMarks2   = marksMatch ? parseInt(marksMatch[2]) : (session.total_marks || 30);
        const percentage    = pctMatch ? parseFloat(pctMatch[1]) : (totalMarks2 > 0 ? Math.round((marksObtained / totalMarks2) * 100) : 0);
        const timeTaken     = session.started_at
          ? (() => {
              const s = Math.floor((Date.now() - session.started_at) / 1000);
              return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
            })()
          : "-";

        await supabase.from("exam_sessions").upsert({ ...session, status: "READY" }, { onConflict: "session_key" });
        return NextResponse.json({
          examEnded: true, reply: evalResult, marksObtained,
          totalMarks: totalMarks2, percentage, timeTaken,
          subject: session.subject || session.subject_request || "General",
        });
      }

      /* -- ANSWER LOGGING -- */
      if (session.status === "IN_EXAM") {
        session = { ...session, answer_log: [...session.answer_log, message] };
        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });
        return NextResponse.json({ reply: "? Answer saved. Send next answer or type **submit**." });
      }

      /* -- IDLE/READY: subject selection -- */
      const subjectMsg   = confirmedSubject || message;
      const confirmSys   = await buildSystemWithKB("examiner", undefined, student, subjectMsg);
      const confirmReply = await callAI(confirmSys, [
        ...history,
        {
          role: "user",
          content: `Student wants to be tested on: ${subjectMsg}. Confirm and tell them to type START. ${getSyllabusSummary()}`,
        },
      ]);
      return NextResponse.json({ reply: confirmReply });
    }

    return NextResponse.json({ reply: "Invalid mode." });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    return NextResponse.json({ reply: "Server error. Try again." });
  }
}
