"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatInput from "../components/ChatInput";
import { getPlannerState, THIRTY_DAY_PLAN } from "@/lib/plannerState";
import { saveResult } from "@/lib/plannerResults";
import { extractMistakesFromEval, saveMistakes } from "@/lib/mistakeLog";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_STORAGE_KEY = "shauri_chat_examiner";
const MAX_SAVED_MSGS   = 10;

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_SAVED_MSGS)));
  } catch {}
}
function clearSavedMessages() {
  try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
}

function renderText(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

function Bubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div style={{
        maxWidth: "85%", padding: "11px 15px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "#38bdf8" : "#fff",
        color: isUser ? "#fff" : "#0f172a",
        fontSize: 15, lineHeight: 1.7, wordBreak: "break-word",
        border: isUser ? "none" : "1px solid #e2e8f0",
        boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {renderText(m.content)}
      </div>
    </div>
  );
}

function ResumeBanner({ subject, elapsed, onDismiss }: {
  subject?: string; elapsed: string; onDismiss: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 8,
      background: "#fefce8", border: "1.5px solid #fde047",
      borderRadius: 10, padding: "10px 16px",
      fontSize: 13, color: "#713f12", flexShrink: 0,
    }}>
      <span>
        ⚡ <strong>Exam restored</strong>
        {subject ? ` — ${subject}` : ""}
        {" · "}Time already elapsed: <strong>{elapsed}</strong>
        {" · "}Keep writing and type <strong>submit</strong> when done!
      </span>
      <button onClick={onDismiss} style={{
        background: "#fde047", border: "none", borderRadius: 6,
        padding: "4px 12px", fontSize: 12, fontWeight: 700,
        cursor: "pointer", color: "#713f12", flexShrink: 0,
      }}>Got it ✕</button>
    </div>
  );
}

function printCBSEPaper({ paperContent, subject, studentName, studentClass, isRevisionDay }: {
  paperContent: string; subject?: string; studentName?: string; studentClass?: string; isRevisionDay?: boolean;
}) {
  // Updated: Daily = 30 marks / 60 min | Revision = 60 marks / 120 min
  const expectedMarks = isRevisionDay ? "60" : "30";
  const marksMatch    = paperContent.match(/(?:Maximum\s*Marks|Total(?:\s*Marks)?)\s*[:\-]\s*(\d+)/i);
  const parsedMarks   = marksMatch ? marksMatch[1] : "";
  const totalMarks    = (parsedMarks === "30" || parsedMarks === "60") ? parsedMarks : expectedMarks;
  const timeMatch     = paperContent.match(/(?:Time\s*Allowed|Duration)\s*[:\-]\s*([^\n]+)/i);
  const timeAllowed   = timeMatch ? timeMatch[1].trim() : (isRevisionDay ? "120 Minutes" : "60 Minutes");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const formattedBody = paperContent.split("\n").map(line => {
    const escaped = esc(line);
    const bolded  = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    if (/^SECTION\s+[A-Z]/i.test(line.trim())) return `<div class="section-header">${bolded}</div>`;
    if (!line.trim()) return `<div class="spacer"></div>`;
    return `<div class="line">${bolded}</div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(subject || "Question Paper")} – SHAURI Daily Test</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Times New Roman",Times,serif;font-size:13pt;color:#000;background:#fff}
    .page{width:210mm;min-height:297mm;margin:0 auto;padding:18mm 20mm 20mm}
    .cbse-header{text-align:center;border-bottom:3px double #000;padding-bottom:10px;margin-bottom:10px}
    .cbse-header .board{font-size:11pt;letter-spacing:2px;text-transform:uppercase}
    .cbse-header .title{font-size:17pt;font-weight:bold;margin:4px 0 2px;text-transform:uppercase}
    .cbse-header .subject-line{font-size:13pt;font-weight:bold}
    .meta-row{display:flex;justify-content:space-between;font-size:12pt;margin:8px 0 4px;font-weight:bold}
    .student-fields{display:flex;gap:40px;margin:10px 0 6px;font-size:12pt}
    .student-fields .field{flex:1;border-bottom:1px solid #000;padding-bottom:2px}
    .student-fields .field span{font-weight:bold}
    .instructions{border:1.5px solid #000;padding:8px 12px;margin:10px 0 14px;font-size:11pt;line-height:1.55}
    .instructions .instr-title{font-weight:bold;font-size:12pt;margin-bottom:4px;text-transform:uppercase;text-decoration:underline}
    .instructions ol{padding-left:18px}
    .instructions li{margin-bottom:3px}
    .paper-body{line-height:1.85}
    .section-header{font-size:13pt;font-weight:bold;text-transform:uppercase;margin:16px 0 6px;border-bottom:1px solid #000;padding-bottom:2px}
    .line{margin-bottom:1px}
    .spacer{height:8px}
    .answer-space{margin-top:20px;border-top:2px solid #000;padding-top:10px}
    .footer{text-align:center;margin-top:18px;font-size:10pt;color:#444;border-top:1px solid #ccc;padding-top:6px}
    @media print{body{padding:0}.page{width:100%;padding:15mm 18mm 18mm}.no-print{display:none!important}@page{size:A4;margin:0}}
  </style>
</head>
<body>
<div class="no-print" style="position:fixed;top:0;left:0;right:0;z-index:999;background:#1e293b;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 20px;font-family:Arial,sans-serif;font-size:14px">
  <span>📄 SHAURI Daily Test — ready to print or save as PDF</span>
  <div style="display:flex;gap:10px">
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print / Save as PDF</button>
    <button onclick="window.close()" style="background:#475569;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer">✕ Close</button>
  </div>
</div>
<div class="no-print" style="height:52px"></div>
<div class="page">
  <div class="cbse-header">
    <div class="board">SHAURI Daily Test · CBSE-Aligned</div>
    <div class="title">Daily Practice Test</div>
    <div class="subject-line">${esc(subject || "Subject")}</div>
  </div>
  <div class="meta-row">
    <span>Time Allowed: ${esc(timeAllowed)}</span>
    <span>Maximum Marks: ${esc(totalMarks)}</span>
  </div>
  <div class="student-fields">
    <div class="field"><span>Name: </span>${esc(studentName || "________________________________")}</div>
    <div class="field"><span>Class &amp; Section: </span>${esc(studentClass || "__________")}</div>
    <div class="field"><span>Roll No.: </span>____________</div>
  </div>
  <div class="instructions">
    <div class="instr-title">General Instructions</div>
    <ol>
      <li>This is a SHAURI compressed daily test paper. Read all instructions carefully.</li>
      <li>All questions are compulsory unless an internal choice (OR) is provided.</li>
      <li>Do not write anything on the question paper except your name, class, and roll number.</li>
      <li>Write answers neatly in your notebook or answer booklet.</li>
      <li>For MCQs, write only the letter of the correct option (A/B/C/D).</li>
      <li>Marks for each question are indicated against it.</li>
      <li>Diagrams must be labelled clearly wherever applicable.</li>
    </ol>
  </div>
  <div class="paper-body">${formattedBody}</div>
  <div class="answer-space">
    <div style="font-weight:bold;font-size:12pt;margin-bottom:8px;text-transform:uppercase">For Examiner's Use Only</div>
    <div style="display:flex;gap:20px;font-size:11pt">
      <div>Marks Obtained: ____________</div>
      <div>Out of: ${esc(totalMarks)}</div>
      <div>Examiner's Signature: ____________________</div>
    </div>
  </div>
  <div class="footer">Generated by Shauri · CBSE-Aligned Daily Test · ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url; a.download = `${subject || "Daily-Test"}-SHAURI.html`; a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function createNewSessionId(): string {
  if (typeof window === "undefined") return "";
  const sid = crypto.randomUUID();
  localStorage.setItem("shauri_exam_sid", sid);
  return sid;
}

// ─────────────────────────────────────────────────────────────
// DAY STAMP HELPERS
// Base date: Day 1 = 1 May 2026 (Friday)
// ─────────────────────────────────────────────────────────────

const PLANNER_BASE_DATE = new Date("2026-05-01"); // Day 1
const SHORT_DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getDayDate(dayNum: number): string {
  const d = new Date(PLANNER_BASE_DATE);
  d.setDate(PLANNER_BASE_DATE.getDate() + (dayNum - 1));
  return `${SHORT_DAYS[d.getDay()]} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function getWeekNum(dayNum: number): number {
  return Math.ceil(dayNum / 7);
}

function getDayType(dayNum: number, isRevision: boolean): string {
  if (isRevision) return "Revision Day";
  const d = new Date(PLANNER_BASE_DATE);
  d.setDate(PLANNER_BASE_DATE.getDate() + (dayNum - 1));
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return "Holiday";
  return "School Day";
}

// ─────────────────────────────────────────────────────────────
// WRITING SUBJECT MAP
// ─────────────────────────────────────────────────────────────

const WRITING_SUBJECT_MAP: Record<number, "English" | "Hindi"> = {
  1:  "English",
  4:  "Hindi",
  6:  "English",
  8:  "Hindi",
  12: "English",
  13: "Hindi",
  15: "English",
  19: "Hindi",
  20: "English",
  22: "Hindi",
  25: "English",
  27: "Hindi",
  29: "English",
};

const REVISION_WRITING_SUBJECTS: Record<number, ("English" | "Hindi")[]> = {
  3:  ["English"],
  10: ["Hindi", "English"],
  17: ["English", "Hindi"],
  24: ["Hindi", "English"],
};

function getWritingSubject(day: number): "English" | "Hindi" {
  if (REVISION_WRITING_SUBJECTS[day]) {
    return REVISION_WRITING_SUBJECTS[day][0];
  }
  return WRITING_SUBJECT_MAP[day] ?? "English";
}

function getWritingSubjectsForRevision(day: number): ("English" | "Hindi")[] {
  return REVISION_WRITING_SUBJECTS[day] ?? [getWritingSubject(day)];
}

// ─────────────────────────────────────────────────────────────
// REVISION COVERAGE MAP
// ─────────────────────────────────────────────────────────────

const REVISION_COVERAGE_MAP: Record<number, { from: number; to: number }> = {
  3:  { from: 1,  to: 2  },
  10: { from: 4,  to: 9  },
  17: { from: 11, to: 16 },
  24: { from: 18, to: 23 },
};

function isRevisionDayNum(dayNum: number): boolean {
  return dayNum === 3 || dayNum === 10 || dayNum === 17 || dayNum === 24;
}

// ─────────────────────────────────────────────────────────────
// SHAURI PAPER FORMAT
// Updated marking system:
//   Daily / Holiday → 30 marks · 60 minutes
//     A(5×1=5) + B(3×2=6) + C(2×3=6) + D(1×5=5) + E(Writing 3m + Vocab 5×1=5m = 8m) = 30
//   Revision        → 60 marks · 120 minutes
//     A(10×1=10) + B(5×2=10) + C(4×3=12) + D(2×5=10) + E(Writing 6m + Vocab 10×1=10m = 18m) = 60 (wait — 10+10+12+10+18 = 60 ✓)
// ─────────────────────────────────────────────────────────────

function getSharuiPaperFormat(
  isRevisionDay: boolean,
  writingSubject: string,
  writingSubjects?: ("English" | "Hindi")[]
): string {

  const hasMultipleLanguages = writingSubjects && writingSubjects.length > 1;

  // ── SECTION E: REVISION DAY ──────────────────────────────
  function buildSectionE_Revision(): string {
    if (hasMultipleLanguages && writingSubjects) {
      return [
        `SECTION E – Writing Task + Vocabulary  [18 marks total]`,
        ``,
        `┌─ Writing Task ─────────────────────────────── 6 marks ─┐`,
        `│  BOTH languages required on every Revision Day:         │`,
        `│  (a) ${writingSubjects[0]} writing task — 3 marks                  │`,
        `│      Most advanced ${writingSubjects[0]} format introduced so far   │`,
        `│      Word limit: 120–150 words                          │`,
        `│      Marking: Format-1 | Content-1 | Language-1 = 3    │`,
        `│  (b) ${writingSubjects[1]} writing task — 3 marks                  │`,
        `│      Most advanced ${writingSubjects[1]} format introduced so far   │`,
        `│      Word limit: 120–150 words                          │`,
        `│      Marking: Format-1 | Content-1 | Language-1 = 3    │`,
        `│  (odd/even language rule suspended on Revision Days)    │`,
        `└─────────────────────────────────────────────────────────┘`,
        ``,
        `┌─ Vocabulary Test ──────────────────────────── 10 marks ─┐`,
        `│  Words tested: ALL vocab words from the revision window  │`,
        `│  List the 10 words at the top of this sub-section       │`,
        `│  Format: mix of ALL 4 question types —                  │`,
        `│    • Write the meaning   • Write a synonym              │`,
        `│    • Write an antonym    • Use the word in a sentence   │`,
        `│  10 questions × 1 mark each = 10 marks                  │`,
        `└─────────────────────────────────────────────────────────┘`,
        ``,
        `  Writing (6) + Vocab (10) = 18 marks ✓`,
      ].join("\n");
    }
    // single language revision (rare)
    return [
      `SECTION E – Writing Task + Vocabulary  [18 marks total]`,
      ``,
      `┌─ Writing Task ─────────────────────────────── 6 marks ─┐`,
      `│  (a) Hindi writing task   — 3 marks (full Devanagari)   │`,
      `│  (b) English writing task — 3 marks                     │`,
      `│  Use most advanced format introduced so far per subject  │`,
      `└─────────────────────────────────────────────────────────┘`,
      ``,
      `┌─ Vocabulary Test ──────────────────────────── 10 marks ─┐`,
      `│  10 words from the full revision window × 1 mark each   │`,
      `│  List words at top. Mix all 4 question types.           │`,
      `└─────────────────────────────────────────────────────────┘`,
      ``,
      `  Writing (6) + Vocab (10) = 18 marks ✓`,
    ].join("\n");
  }

  // ── SECTION E: DAILY / HOLIDAY DAY ──────────────────────
  function buildSectionE_StudyDay(): string {
    const langNote = writingSubject === "Hindi"
      ? `Hindi writing task — FULL Devanagari script only`
      : `English writing task`;
    return [
      `SECTION E – Writing Task + Vocabulary  [8 marks total]`,
      ``,
      `┌─ Writing Task ──────────────────────────────── 3 marks ─┐`,
      `│  ${langNote}                     │`,
      `│  Format: use FIRST format introduced in planner by today │`,
      `│    Hindi priority: अनुच्छेद → अनौपचारिक पत्र → औपचारिक पत्र → निबंध│`,
      `│    English: paragraph/description → letter (only if taught)│`,
      `│  Word limit: 60–80 words (state this in the question)    │`,
      `│  NEVER use letter/patra if not yet introduced in planner │`,
      `│  Marking: Format-1 | Content-1 | Language-1 = 3         │`,
      `└─────────────────────────────────────────────────────────┘`,
      ``,
      `┌─ Vocabulary Test ───────────────────────────── 5 marks ─┐`,
      `│  Words tested: the 5 vocab words from Day X–1            │`,
      `│  List the 5 words at the top of this sub-section         │`,
      `│  Format: mix of at least 2 question types —              │`,
      `│    • Write the meaning   • Write a synonym               │`,
      `│    • Write an antonym    • Use the word in a sentence    │`,
      `│  5 questions × 1 mark each = 5 marks                    │`,
      `└─────────────────────────────────────────────────────────┘`,
      ``,
      `  Writing (3) + Vocab (5) = 8 marks ✓`,
    ].join("\n");
  }

  // ════════════════════════════════════════════════════════════
  // REVISION DAY FORMAT  — 60 marks · 120 minutes
  // ════════════════════════════════════════════════════════════
  if (isRevisionDay) {
    return [
      `SHAURI REVISION DAY TEST FORMAT (follow exactly — no deviations)`,
      `Time: 120 minutes  |  Maximum Marks: 60`,
      `IMPORTANT: All section marks MUST total exactly 60.`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `SECTION A — Multiple Choice Questions        10 × 1 = 10 marks`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  Write exactly 10 MCQs distributed as follows:`,
      `  Q1–Q6  : Standard MCQs — 4 options (A/B/C/D) [1 mark each]`,
      `           Spread evenly across all subjects in revision window`,
      `           No subject gets more than 2 of Q1–Q6`,
      `           All 4 options must have DIFFERENT values`,
      `  Q7–Q8  : Case-based MCQs [1 mark each]`,
      `           ONE shared passage (4–6 lines), then Q7 and Q8 from it`,
      `           Label: "Questions 7 and 8 are based on the following passage:"`,
      `           Passage must be a rich Indian real-life scenario`,
      `  Q9–Q10 : Assertion–Reason MCQs [1 mark each]`,
      `           Both A and R must be factually correct statements`,
      `           Options MUST be EXACTLY:`,
      `           (A) Both A and R true; R is the correct explanation of A`,
      `           (B) Both A and R true; R is NOT the correct explanation of A`,
      `           (C) A is true, R is false`,
      `           (D) A is false, R is true`,
      `  RULE: Q7–Q8 MUST be case-based; Q9–Q10 MUST be AR — no plain MCQs there`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `SECTION B — Very Short Answer                 5 × 2 = 10 marks`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  Exactly 5 questions [2 marks each]`,
      `  EVERY question MUST include an internal choice (OR)`,
      `  OR must be within the SAME subject — never cross-subject`,
      `  Cover all subjects in the revision window proportionally`,
      `  All Maths questions must be fully self-contained (all values given)`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `SECTION C — Short Answer                      4 × 3 = 12 marks`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  Exactly 4 questions [3 marks each]`,
      `  EVERY question MUST include an internal choice (OR)`,
      `  OR must be within the SAME subject — never cross-subject`,
      `  Application-based; stepwise answers required`,
      `  Cover all subjects in the revision window`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `SECTION D — Case Study                        2 × 5 = 10 marks`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  Exactly 2 case study questions [5 marks each]`,
      `  Each must have a rich real-life Indian passage (5–6 lines)`,
      `  Each case study must have 3–4 sub-questions`,
      `  Sub-question marks MUST add to exactly 5`,
      `  Draw one case from Sci/Maths and one from SST/Languages`,
      ``,
      buildSectionE_Revision(),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `MARK VERIFICATION (check before generating):`,
      `  A(10) + B(10) + C(12) + D(10) + E(18) = 60 ✓`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `STRICT RULES:`,
      `– Every section clearly labelled: SECTION A, B, C, D, E`,
      `– Marks in [brackets] for EVERY question and sub-question`,
      `– Section A: exactly 6 standard + 2 case-based (Q7–Q8) + 2 AR (Q9–Q10)`,
      `– Section C: exactly 4 × 3 = 12 marks`,
      `– Section D: exactly 2 × 5 = 10 marks`,
      `– ORs in B and C: SAME subject only — never cross-subject`,
      `– ALL sections A–E must be fully generated — do NOT stop early`,
      `– This is a 60-mark revision test, NOT an 80-mark board paper`,
    ].join("\n");
  }

  // ════════════════════════════════════════════════════════════
  // DAILY / HOLIDAY FORMAT  — 30 marks · 60 minutes
  // ════════════════════════════════════════════════════════════
  return [
    `SHAURI DAILY TEST FORMAT (follow exactly — no deviations)`,
    `Time: 60 minutes  |  Maximum Marks: 30`,
    `IMPORTANT: All section marks MUST total exactly 30.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `SECTION A — Multiple Choice Questions         5 × 1 = 5 marks`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  Write exactly 5 MCQs distributed as follows:`,
    `  Q1–Q3 : Standard MCQs — 4 options (A/B/C/D) from PRIMARY topic [1 mark each]`,
    `           All 4 options must have DIFFERENT values — no duplicate options`,
    `  Q4    : Case-based MCQ [1 mark]`,
    `           2–3 line real-life Indian scenario requiring the PRIMARY concept`,
    `           ✅ GOOD: school groups → requires HCF`,
    `           ❌ BAD: 48÷4 → simple division, not HCF`,
    `  Q5    : Assertion–Reason MCQ [1 mark]`,
    `           Both A and R must be factually correct statements`,
    `           Options MUST be EXACTLY:`,
    `           (A) Both A and R true; R is the correct explanation of A`,
    `           (B) Both A and R true; R is NOT the correct explanation of A`,
    `           (C) A is true, R is false`,
    `           (D) A is false, R is true`,
    `  RULE: Q4 MUST be case-based; Q5 MUST be AR — never all 5 plain MCQs`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `SECTION B — Very Short Answer                 3 × 2 = 6 marks`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  Exactly 3 questions [2 marks each]`,
    `  EVERY question MUST include an internal choice (OR)`,
    `  At least 2 questions from PRIMARY subject/topic`,
    `  At most 1 question from secondary subject/topic`,
    `  OR must be within the SAME subject — never cross-subject`,
    `  All Maths questions must be fully self-contained (all values given)`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `SECTION C — Short Answer                      2 × 3 = 6 marks`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  Exactly 2 questions [3 marks each]`,
    `  EVERY question MUST include an internal choice (OR)`,
    `  Both questions from PRIMARY subject/topic`,
    `  OR must be within the SAME subject — never cross-subject`,
    `  Application-based; stepwise answers required`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `SECTION D — Case Study                        1 × 5 = 5 marks`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  Exactly 1 case study question`,
    `  3–5 line rich Indian narrative scenario on PRIMARY topic`,
    `  Must have exactly 4 sub-questions: (i)1 + (ii)2 + (iii)1 + (iv)1 = 5 marks`,
    `  Sub-question (ii) uses exactly TWO numbers if HCF/LCM topic`,
    `  Scenario must be relatable (beads, ropes, groups, tiles) — not abstract`,
    ``,
    buildSectionE_StudyDay(),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `MARK VERIFICATION (check before generating):`,
    `  A(5) + B(6) + C(6) + D(5) + E(8) = 30 ✓`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `STRICT RULES:`,
    `– Every section clearly labelled: SECTION A, B, C, D, E`,
    `– Marks in [brackets] for EVERY question and sub-question`,
    `– Section A: exactly 3 standard MCQs + 1 case-based (Q4) + 1 AR (Q5)`,
    `– ORs in B and C: SAME subject only — never cross-subject`,
    `– ALL sections A–E must be fully generated — do NOT stop early`,
    `– This is a 30-mark daily test, NOT an 80-mark board paper`,
  ].join("\n");
}

function extractSubjectFromPaper(paper: string): string {
  const match = paper.match(/^Subject\s*[:\|]\s*(.+)$/im);
  if (!match) return "";
  return match[1]
    .trim()
    .replace(/\s*[–—\-]\s*Class\s*\d+.*$/i, "")
    .replace(/^[a-z]{2,6}:\s*/i, "")
    .trim();
}

function extractUploadedSubject(reply: string): string {
  const match =
    reply.match(/\*\*Subject detected:\*\*\s*([^\n]+)/i) ||
    reply.match(/Subject detected:\s*([^\n]+)/i);
  return match ? match[1].trim() : "";
}

function extractConfirmedSubject(reply: string): string {
  const searchIn = reply.split(/📝\s*\*{0,2}Paper format/i)[0];

  const forNewlineBold = searchIn.match(
    /\b(?:paper|test|exam)\b[^:\n]{0,40}?\bfor\s*:\s*\n\s*\*{1,2}([^*\n—\u2014]+)/i
  );
  if (forNewlineBold) {
    const extracted = forNewlineBold[1].trim().replace(/\*+/g, "").replace(/[—\u2014].*$/, "").trim();
    if (extracted.length > 1) return extracted;
  }

  const forInlineBold = searchIn.match(
    /\b(?:paper|test|exam)\b[^:\n]{0,40}?\bfor\s*:\s*\*{1,2}([^*\n—\u2014]+)/i
  );
  if (forInlineBold) {
    const extracted = forInlineBold[1].trim().replace(/\*+/g, "").replace(/[—\u2014].*$/, "").trim();
    if (extracted.length > 1) return extracted;
  }

  const gotItPattern = searchIn.match(
    /Got it[^.!]{0,60}?\bfor\s*:\s*\n\s*\*{1,2}([^*\n—\u2014]+)/i
  );
  if (gotItPattern) {
    const extracted = gotItPattern[1].trim().replace(/\*+/g, "").replace(/[—\u2014].*$/, "").trim();
    if (extracted.length > 1) return extracted;
  }

  const setMatch = searchIn.match(/[Ss]ubject\s+is\s+set\s+to\s+\*{1,2}([^\n*]+)/i);
  if (setMatch) return setMatch[1].trim().replace(/\*+/g, "").trim();

  return "";
}

// ─────────────────────────────────────────────────────────────
// PAPER RENDERER
// ─────────────────────────────────────────────────────────────

function PaperRenderer({ content }: { content: string }) {
  const lines = content.split("\n");

  const headerLines: string[] = [];
  const bodyLines:   string[] = [];
  let headerDone = false;

  for (const line of lines) {
    if (!headerDone) {
      if (/^(subject|class|board|time|maximum marks?)\s*[:\|]/i.test(line.trim())) {
        headerLines.push(line.trim());
        continue;
      }
      if (headerLines.length > 0) headerDone = true;
    }
    bodyLines.push(line);
  }

  const headerPairs = headerLines.map(l => {
    const idx = l.indexOf(":");
    return idx > -1 ? { key: l.slice(0, idx).trim(), val: l.slice(idx + 1).trim() } : null;
  }).filter(Boolean) as { key: string; val: string }[];

  const maxMarksPair = headerPairs.find(p => /maximum marks?/i.test(p.key));
  const timePair     = headerPairs.find(p => /time/i.test(p.key));
  const subjectPair  = headerPairs.find(p => /subject/i.test(p.key));
  const classPair    = headerPairs.find(p => /^class$/i.test(p.key));
  const boardPair    = headerPairs.find(p => /board/i.test(p.key));

  const dayStampMatch = content.match(/Day\s+(\d+)\s*[·•]\s*([^·•\n]+)[·•]\s*([^·•\n]+)[·•]\s*(Week\s*\d+)/i);
  const dayStampLine  = dayStampMatch ? dayStampMatch[0].trim() : "";

  type Block =
    | { type: "section"; text: string; sub?: string }
    | { type: "instruction-block"; lines: string[] }
    | { type: "question"; num: string; text: string; marks: string; options: string[]; subparts: string[] }
    | { type: "general-instructions"; lines: string[] }
    | { type: "daystamp"; text: string }
    | { type: "blank" }
    | { type: "text"; text: string };

  const blocks: Block[] = [];
  let i = 0;
  const body = bodyLines.filter(l => l.trim() !== "" || blocks.length > 0);

  while (i < body.length) {
    const raw  = body[i];
    const line = raw.trim();

    if (!line) { blocks.push({ type: "blank" }); i++; continue; }

    if (/^Day\s+\d+\s*[·•]/i.test(line) || /Strictly aligned to Day/i.test(line)) {
      blocks.push({ type: "daystamp", text: line });
      i++; continue;
    }

    if (/^SECTION\s+[A-E]\b/i.test(line)) {
      const dashIdx = line.search(/[–—-]/);
      const text = dashIdx > -1 ? line.slice(0, dashIdx).trim() : line;
      const sub  = dashIdx > -1 ? line.slice(dashIdx + 1).trim() : "";
      let subLine = sub;
      if (!subLine && i + 1 < body.length) {
        const next = body[i + 1].trim();
        if (/^\d+\s*(Question|Mark|×)/i.test(next) || /\[.*mark/i.test(next) || /\d+\s*[×x]\s*\d+/i.test(next)) {
          subLine = next;
          i++;
        }
      }
      blocks.push({ type: "section", text: text.toUpperCase(), sub: subLine });
      i++; continue;
    }

    if (/^general instructions?/i.test(line)) {
      const instrLines: string[] = [];
      i++;
      while (i < body.length && body[i].trim() !== "") {
        instrLines.push(body[i].trim());
        i++;
      }
      blocks.push({ type: "general-instructions", lines: instrLines });
      continue;
    }

    if (/^(all questions?|answer in|note:|application.based|only |show all|write your)/i.test(line)) {
      const instrLines = [line];
      i++;
      while (i < body.length && body[i].trim() && !/^[QqSs]\d+|^SECTION|^\d+\./.test(body[i].trim())) {
        instrLines.push(body[i].trim());
        i++;
      }
      blocks.push({ type: "instruction-block", lines: instrLines });
      continue;
    }

    const qMatch = line.match(/^(Q\.?\s*(\d+)|(\d+)\.)\s+(.+)/i);
    if (qMatch) {
      const num     = qMatch[2] || qMatch[3];
      const rest    = qMatch[4];
      const marksM  = rest.match(/\[(\d+)\s*marks?\]\.?$/i);
      const marks   = marksM ? marksM[1] : "";
      const text    = marksM ? rest.slice(0, rest.lastIndexOf(marksM[0])).trim() : rest.trim();
      const options: string[] = [];
      const subparts: string[] = [];
      i++;
      while (i < body.length) {
        const opt = body[i].trim();
        if (!opt) break;
        if (/^(Q\.?\s*\d+|\d+\.)\s/i.test(opt)) break;
        if (/^SECTION\s+[A-E]/i.test(opt)) break;
        if (/^[A-D][.)]\s/.test(opt) || /^\([a-d]\)\s/i.test(opt)) {
          options.push(opt); i++; continue;
        }
        if (/^\([ivxlIVXL]+\)\s|^\(i{1,3}v?\)\s/i.test(opt) || /^\([a-e]\)\s/.test(opt)) {
          subparts.push(opt); i++; continue;
        }
        if (options.length === 0 && subparts.length === 0) {
          subparts.push(opt); i++; continue;
        }
        break;
      }
      blocks.push({ type: "question", num, text, marks, options, subparts });
      continue;
    }

    blocks.push({ type: "text", text: line });
    i++;
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#0f172a" }}>
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderRadius: 12, padding: "20px 24px", marginBottom: 20, color: "#fff" }}>
        <div style={{ textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>
            {boardPair?.val || "CBSE"} · Class {classPair?.val || "—"}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.04em", color: "#f1f5f9" }}>
            DAILY PRACTICE TEST
          </div>
          {subjectPair && (
            <div style={{ fontSize: 13, color: "#38bdf8", marginTop: 4, fontWeight: 600 }}>{subjectPair.val}</div>
          )}
          {dayStampLine && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, fontStyle: "italic" }}>{dayStampLine}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20 }}>
            {timePair && (
              <div>
                <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Time Allowed</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{timePair.val}</div>
              </div>
            )}
          </div>
          {maxMarksPair && (
            <div style={{ background: "#38bdf8", color: "#0f172a", borderRadius: 8, padding: "6px 16px", fontWeight: 800, fontSize: 16 }}>
              {maxMarksPair.val} Marks
            </div>
          )}
        </div>
      </div>

      {blocks.map((block, idx) => {
        if (block.type === "blank") return <div key={idx} style={{ height: 8 }} />;

        if (block.type === "daystamp") return (
          <div key={idx} style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6,
            padding: "6px 12px", marginBottom: 10, fontSize: 11,
            color: "#15803d", fontWeight: 600, letterSpacing: "0.02em",
          }}>
            📅 {block.text}
          </div>
        );

        if (block.type === "general-instructions") return (
          <div key={idx} style={{ border: "1px solid #e2e8f0", borderLeft: "3px solid #2563eb", borderRadius: 8, padding: "10px 14px", marginBottom: 16, background: "#f8fafc" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>General Instructions</div>
            {block.lines.map((l, j) => (
              <div key={j} style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>{l}</div>
            ))}
          </div>
        );

        if (block.type === "instruction-block") return (
          <div key={idx} style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 12px", marginBottom: 10 }}>
            {block.lines.map((l, j) => (
              <div key={j} style={{ fontSize: 11, color: "#92400e", fontStyle: "italic", lineHeight: 1.6 }}>{l}</div>
            ))}
          </div>
        );

        if (block.type === "section") return (
          <div key={idx} style={{ margin: "20px 0 12px" }}>
            <div style={{ background: "#1e293b", borderRadius: "8px 8px 0 0", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#fff", letterSpacing: "0.08em" }}>{block.text}</span>
              {block.sub && (
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{block.sub}</span>
              )}
            </div>
            {block.sub && (
              <div style={{ background: "#f1f5f9", borderRadius: "0 0 6px 6px", padding: "5px 16px" }}>
                <span style={{ fontSize: 11, color: "#475569" }}>{block.sub}</span>
              </div>
            )}
          </div>
        );

        if (block.type === "question") {
          const hasOptions  = block.options.length > 0;
          const hasSubparts = block.subparts.length > 0;
          const marksNum    = block.marks ? parseInt(block.marks) : 0;
          const marksBg     = marksNum >= 5 ? "#fef2f2" : marksNum >= 3 ? "#fffbeb" : marksNum >= 2 ? "#f0fdf4" : "#eff6ff";
          const marksColor  = marksNum >= 5 ? "#dc2626" : marksNum >= 3 ? "#d97706" : marksNum >= 2 ? "#059669" : "#2563eb";

          return (
            <div key={idx} style={{ marginBottom: 14, borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "#fff" }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", flexShrink: 0, minWidth: 28 }}>Q{block.num}.</span>
                <span style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.75, flex: 1 }}>{block.text}</span>
                {block.marks && (
                  <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: marksBg, color: marksColor, border: `1px solid ${marksColor}30`, whiteSpace: "nowrap" }}>
                    [{block.marks} mark{marksNum !== 1 ? "s" : ""}]
                  </span>
                )}
              </div>

              {hasSubparts && !hasOptions && (
                <div style={{ padding: "0 14px 10px 42px", background: "#fff" }}>
                  {block.subparts.map((sp, j) => (
                    <div key={j} style={{ fontSize: 12, color: "#334155", lineHeight: 1.7, marginBottom: 2 }}>{sp}</div>
                  ))}
                </div>
              )}

              {hasOptions && (
                <div style={{ background: "#f8fafc", borderTop: "1px solid #f1f5f9", padding: "8px 14px 10px 42px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                  {block.options.map((opt, j) => (
                    <div key={j} style={{ fontSize: 12, color: "#334155", lineHeight: 1.65, display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <span style={{ fontWeight: 700, color: "#475569", flexShrink: 0 }}>{opt.slice(0, 2)}</span>
                      <span>{opt.slice(2).trim()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        if (block.type === "text") return (
          <div key={idx} style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, marginBottom: 4, paddingLeft: 4 }}>{block.text}</div>
        );

        return null;
      })}

      <div style={{ marginTop: 24, borderTop: "2px solid #e2e8f0", paddingTop: 12, textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.08em" }}>✦ END OF PAPER ✦</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// INNER COMPONENT
// ─────────────────────────────────────────────────────────────
function ExaminerContent() {
  const searchParams = useSearchParams();

  function buildGreeting(name: string): string {
    const n = name ? `Hello ${name}!` : "Hello!";
    return `${n} 📋 I'm your strict CBSE Examiner.\n\nTell me the **subject** you want to be tested on:\nScience | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n📎 **OR** upload your **syllabus as a PDF or image** and I'll generate a paper exactly based on it.\n\n⏱️ Your timer starts the moment you type **start**.`;
  }

  const [messages, setMessages]             = useState<Message[]>([]);
  const [paperContent, setPaper]            = useState("");
  const [examStarted, setStarted]           = useState(false);
  const [elapsedSec, setElapsed]            = useState(0);
  const [isLoading, setLoading]             = useState(false);
  const [showResumeBanner, setResumeBanner] = useState(false);
  const [examMeta, setMeta]                 = useState<{
    examEnded?: boolean; marksObtained?: number; totalMarks?: number;
    percentage?: number; timeTaken?: string; subject?: string; isRevisionDay?: boolean;
    dayStamp?: string;
  }>({});
  const [studentName,  setStudentName]  = useState("");
  const [studentClass, setStudentClass] = useState("");

  const confirmedSubjectRef  = useRef<string>("");
  const uploadedSubjectRef   = useRef<string>("");
  const isRevisionDayRef     = useRef<boolean>(false);

  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef       = useRef<number | null>(null);
  const elapsedRef       = useRef(0);
  const sendingRef       = useRef(false);
  const bottomRef        = useRef<HTMLDivElement>(null);
  const msgsRef          = useRef<Message[]>([]);
  const sessionIdRef     = useRef<string>("");
  const autoTriggeredRef = useRef(false);
  const shauriPaperRef   = useRef<object | null>(null);

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => () => stopTimer(), []);

  useEffect(() => {
    if (messages.length === 0) return;
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    clearSavedMessages();
    localStorage.removeItem("shauri_exam_sid");
    sessionIdRef.current = createNewSessionId();

    let name = "", cls = "";
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      name = s?.name || "";
      cls  = s?.class || "";
      setStudentName(name);
      setStudentClass(cls);
    } catch {}

    setMessages([{ role: "assistant", content: buildGreeting(name) }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTimer(ts: number) {
    if (timerRef.current) return;
    startTsRef.current = ts;
    const initialElapsed = Math.floor((Date.now() - ts) / 1000);
    elapsedRef.current = initialElapsed;
    setElapsed(initialElapsed);
    setStarted(true);
    timerRef.current = setInterval(() => {
      if (!startTsRef.current) return;
      const s = Math.floor((Date.now() - startTsRef.current) / 1000);
      elapsedRef.current = s;
      setElapsed(s);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setStarted(false);
  }

  function fmt(s: number) {
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
  }

  async function callAPI(
    text: string,
    uploadedText?: string,
    uploadType?: "syllabus" | "answer",
    shauriPaperData?: object | null
  ) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setLoading(true);

    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}

    const history = msgsRef.current
      .slice(1)
      .map(m => ({
        role: m.role,
        content: m.content
          .replace(/\n\n📋 \[Syllabus uploaded\]/g, "")
          .replace(/\n\n📝 \[Answer uploaded\]/g, "")
          .trim(),
      }));

    const resolvedSubject = confirmedSubjectRef.current || uploadedSubjectRef.current || "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode:             "examiner",
          message:          shauriPaperData ? "start" : text,
          uploadedText:     uploadedText || "",
          uploadType:       uploadType || "",
          history,
          confirmedSubject: resolvedSubject || undefined,
          shauriPaper:      shauriPaperData || undefined,
          student: {
            name:      student?.name  || "",
            class:     student?.class || "",
            board:     student?.board || "CBSE",
            sessionId: sessionIdRef.current,
          },
        }),
      });

      const data = await res.json();
      const reply: string = data?.reply ?? "";

      if (data?.resumeExam === true) {
        const ts = typeof data.startTime === "number"
          ? data.startTime
          : typeof data.startTime === "string"
            ? parseInt(data.startTime)
            : null;
        if (ts && !isNaN(ts)) startTimer(ts);
        setMeta(p => ({ ...p, subject: data.subject || p.subject }));
        if (data.questionPaper) setPaper(data.questionPaper);
        if (reply) setMessages(p => [...p, { role: "assistant", content: reply }]);
        setResumeBanner(true);
        return;
      }

      if (typeof data?.startTime === "number" && data?.paper) {
        startTimer(data.startTime);
        const paper = data.paper;

        const paperSubject =
          data?.subject ||
          confirmedSubjectRef.current ||
          uploadedSubjectRef.current ||
          extractSubjectFromPaper(paper);

        setMeta(p => ({
          ...p,
          subject:      paperSubject || p.subject,
          isRevisionDay: data?.isRevisionDay ?? isRevisionDayRef.current ?? p.isRevisionDay,
          dayStamp:     data?.dayStamp ?? p.dayStamp,
        }));
        setPaper(paper);
        confirmedSubjectRef.current = "";
        uploadedSubjectRef.current  = "";
        shauriPaperRef.current      = null;
        setMessages(p => [...p, {
          role: "assistant",
          content: reply || "✅ Paper ready! Displayed on the right. Write answers and type **submit** when done.",
        }]);
        return;
      }

      if (data?.examEnded === true) {
        stopTimer();
        const taken = elapsedRef.current;
        const marks = data?.marksObtained ?? 0;
        const total = data?.totalMarks ?? 0;
        const subjectForResult = data?.subject || examMeta.subject || "General";
        setMessages(p => [...p, {
          role: "assistant",
          content: reply + (reply.includes("Time taken") ? "" : `\n\n⏱ Time taken: ${fmt(taken)}`),
        }]);
        setMeta(p => ({
          ...p,
          examEnded:     true,
          marksObtained: marks,
          totalMarks:    total,
          percentage:    data?.percentage    ?? 0,
          timeTaken:     data?.timeTaken     ?? fmt(taken),
          subject:       data?.subject       ?? p.subject,
        }));
        try {
          const pState = getPlannerState();
          const dayFromQuery   = Number(searchParams.get("day")   || "");
          const cycleFromQuery = Number(searchParams.get("cycle") || "");
          const finalDay   = Number.isFinite(dayFromQuery)   && dayFromQuery   > 0 ? dayFromQuery   : pState.current_day;
          const finalCycle = Number.isFinite(cycleFromQuery) && cycleFromQuery > 0 ? cycleFromQuery : pState.cycle;
          const plannerDay = THIRTY_DAY_PLAN.find((d) => d.day === finalDay);
          const primary    = plannerDay?.topics?.[0];
          const secondary  = plannerDay?.topics?.[1];
          if (total > 0) {
            saveResult({
              day: finalDay, cycle: finalCycle, subject: subjectForResult,
              topic: (searchParams.get("topic") || "").trim() || "General",
              score: marks, total, source: "exam",
            });
            if (primary?.subject) {
              saveResult({
                day: finalDay, cycle: finalCycle, subject: primary.subject,
                topic: primary.topic || "General", score: marks, total, source: "exam",
              });
            }
            if (secondary?.subject) {
              saveResult({
                day: finalDay, cycle: finalCycle, subject: secondary.subject,
                topic: secondary.topic || "General", score: marks, total, source: "exam",
              });
            }
          }
        } catch {}

        try {
          if (data?.evalJson && typeof data.evalJson === "object") {
            const pState = getPlannerState();
            const dayFromQuery2   = Number(searchParams.get("day")   || "");
            const cycleFromQuery2 = Number(searchParams.get("cycle") || "");
            const mDay   = Number.isFinite(dayFromQuery2)   && dayFromQuery2   > 0 ? dayFromQuery2   : pState.current_day;
            const mCycle = Number.isFinite(cycleFromQuery2) && cycleFromQuery2 > 0 ? cycleFromQuery2 : pState.cycle;
            const extracted = extractMistakesFromEval(data.evalJson, mDay, mCycle);
            if (extracted.length > 0) saveMistakes(extracted);
          }
        } catch {}

        localStorage.removeItem("shauri_exam_sid");
        clearSavedMessages();
        confirmedSubjectRef.current = "";
        uploadedSubjectRef.current  = "";
        return;
      }

      if (reply) {
        const isUploadConfirmation =
          reply.includes("Syllabus") && reply.includes("uploaded successfully");

        if (!isUploadConfirmation) {
          const looksLikeSubjectConfirmation =
            /(?:I'll prepare|preparing|strict CBSE|custom paper|paper for)/i.test(reply);
          if (looksLikeSubjectConfirmation) {
            const extracted = extractConfirmedSubject(reply);
            if (extracted) confirmedSubjectRef.current = extracted;
          }
        } else {
          const detected = extractUploadedSubject(reply);
          if (detected) uploadedSubjectRef.current = detected;
        }

        setMessages(p => [...p, { role: "assistant", content: reply }]);
      }

    } catch (err) {
      console.error("[callAPI] error:", err);
      setMessages(p => [...p, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }

  async function handleSend(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer") {
    if (!text.trim() && !uploadedText) return;
    if (sendingRef.current) return;

    let display = text.trim();
    if (uploadedText) {
      const lbl = uploadType === "syllabus" ? "📋 [Syllabus uploaded]" : "📝 [Answer uploaded]";
      display = display ? `${display}\n\n${lbl}` : lbl;
    }

    setMessages(p => [...p, { role: "user", content: display }]);
    await callAPI(text, uploadedText, uploadType);
  }

  // ─────────────────────────────────────────────────────────
  // MAIN useEffect — builds shauriPaperData
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    const subject = (searchParams.get("subject") || "").trim();
    const topic   = (searchParams.get("topic")   || "").trim();
    const day     = (searchParams.get("day")     || "").trim();
    const cycle   = (searchParams.get("cycle")   || "").trim();
    const from    = (searchParams.get("from")    || "").trim();
    if (!subject && !topic && !day) return;
    autoTriggeredRef.current = true;

    const dayNum   = Number(day   || "");
    const cycleNum = Number(cycle || "");

    const plannerDay = THIRTY_DAY_PLAN.find((d) => d.day === dayNum);
    const primary    = plannerDay?.topics?.[0];
    const secondary  = plannerDay?.topics?.[1];

    const isRevisionDay = isRevisionDayNum(dayNum) ||
      Boolean(plannerDay?.meta?.isRev || plannerDay?.meta?.type === "rev");
    isRevisionDayRef.current = isRevisionDay;

    const writingSubject  = getWritingSubject(dayNum);
    const writingSubjects = isRevisionDay
      ? getWritingSubjectsForRevision(dayNum)
      : [writingSubject];

    const coverageRange = isRevisionDay ? REVISION_COVERAGE_MAP[dayNum] : undefined;
    const coverageDays  = coverageRange
      ? THIRTY_DAY_PLAN.filter(d => d.day >= coverageRange.from && d.day <= coverageRange.to)
      : [];

    const weekCoverage = isRevisionDay && coverageDays.length > 0
      ? coverageDays
          .flatMap(d => d.topics.map(t => `Day ${d.day} (${t.subject}): ${t.topic}`))
          .join("\n")
      : undefined;

    const formatBlock = getSharuiPaperFormat(isRevisionDay, writingSubject, writingSubjects);

    const dayDate  = Number.isFinite(dayNum) && dayNum > 0 ? getDayDate(dayNum)               : "";
    const dayType  = Number.isFinite(dayNum) && dayNum > 0 ? getDayType(dayNum, isRevisionDay) : "School Day";
    const weekNum  = Number.isFinite(dayNum) && dayNum > 0 ? getWeekNum(dayNum)                : 1;
    const dayStamp = dayNum > 0
      ? `Day ${dayNum}  ·  ${dayDate}  ·  ${dayType}  ·  Week ${weekNum}`
      : "";

    const displaySubject = isRevisionDay
      ? `Week ${weekNum} Revision`
      : primary
        ? `${primary.subject}${secondary ? ` + ${secondary.subject}` : ""}`
        : (subject || "General");

    // Updated totals: Daily = 30m/60min, Revision = 60m/120min
    const shauriPaperData = {
      isRevisionDay,
      totalMarks:       isRevisionDay ? 60 : 30,
      timeMinutes:      isRevisionDay ? 120 : 60,
      primarySubject:   primary?.subject   || subject || "General",
      primaryTopic:     primary?.topic     || topic   || "General",
      secondarySubject: secondary?.subject || "",
      secondaryTopic:   secondary?.topic   || "",
      writingSubject,
      writingSubjects,
      weekCoverage:     isRevisionDay ? weekCoverage : undefined,
      dayNum,
      cycleNum,
      formatBlock,
      dayDate,
      dayType,
      weekNum,
    };

    shauriPaperRef.current = shauriPaperData;

    setMeta(p => ({
      ...p,
      subject:      displaySubject,
      isRevisionDay,
      dayStamp,
    }));

    const cleanUserMessage = from === "planner" && plannerDay
      ? `Starting Day ${dayNum} ${isRevisionDay ? "Revision" : "Study"} test — ${displaySubject}`
      : `Starting test — ${displaySubject}`;

    setTimeout(() => {
      if (!sendingRef.current) {
        setMessages(p => [...p, { role: "user", content: cleanUserMessage }]);
        callAPI("start", undefined, undefined, shauriPaperData);
      }
    }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elapsed    = fmt(elapsedSec);
  const examActive = examStarted && !examMeta.examEnded;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .ex-split{flex:1;display:flex;overflow:hidden}
        .ex-chat{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#f8fafc}
        .ex-paper{width:50%;overflow-y:auto;background:#fff;border-left:1.5px solid #e2e8f0;padding:24px 28px}
        @media(max-width:768px){.ex-paper{display:none!important}.ex-chat{width:100%!important;flex:1!important}}
        .print-btn:hover{background:#1d4ed8!important}
      `}</style>

      {/* TOP BAR */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
      }}>
        <button
          onClick={() => {
            const fromPlanner = searchParams.get("from") === "planner";
            window.location.href = fromPlanner ? "/planner" : "/modes";
          }}
          style={{ padding: "7px 14px", background: "#f1f5f9", color: "#374151", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
        >
          ← Back
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>📋 Examiner Mode</span>
          {examMeta.dayStamp && (
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 500 }}>{examMeta.dayStamp}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 80, justifyContent: "flex-end" }}>
          {paperContent && (
            <button
              className="print-btn"
              onClick={() => printCBSEPaper({ paperContent, subject: examMeta.subject, studentName, studentClass, isRevisionDay: examMeta.isRevisionDay })}
              style={{
                padding: "7px 14px", background: "#2563eb", color: "#fff",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                transition: "background 0.15s",
              }}
            >
              🖨️ Print Paper
            </button>
          )}
          {examActive && (
            <div style={{
              background: "#0f172a", color: "#38bdf8",
              padding: "6px 14px", borderRadius: 8,
              fontFamily: "monospace", fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
              ⏱ {elapsed}
            </div>
          )}
        </div>
      </div>

      {/* SPLIT */}
      <div className="ex-split">
        {/* LEFT — chat */}
        <div className="ex-chat">
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
            background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", display: "inline-block", flexShrink: 0,
                background: examActive ? "#22c55e" : examMeta.examEnded ? "#f97316" : "#94a3b8",
                boxShadow: examActive ? "0 0 6px #22c55e" : "none",
              }} />
              {examMeta.examEnded ? "Evaluation Complete" : examActive ? "Type your answers here" : "Examiner Chat"}
            </div>
            {paperContent && (
              <button
                className="print-btn"
                onClick={() => printCBSEPaper({ paperContent, subject: examMeta.subject, studentName, studentClass, isRevisionDay: examMeta.isRevisionDay })}
                style={{
                  padding: "4px 10px", background: "#2563eb", color: "#fff",
                  border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}
              >
                🖨️ Print
              </button>
            )}
          </div>

          {showResumeBanner && (
            <div style={{ padding: "10px 14px", flexShrink: 0 }}>
              <ResumeBanner subject={examMeta.subject} elapsed={elapsed} onDismiss={() => setResumeBanner(false)} />
            </div>
          )}

          {examMeta.examEnded && (
            <div style={{
              background: "#f0fdf4", borderBottom: "1px solid #bbf7d0",
              padding: "10px 16px", fontSize: 13, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            }}>
              <span>
                <strong style={{ color: "#15803d" }}>✅ Submitted</strong>
                {" · "}{examMeta.marksObtained}/{examMeta.totalMarks} ({examMeta.percentage}%)
                {" · "}{examMeta.timeTaken}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => (window.location.href = "/mistakes")}
                  style={{ padding: "4px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#dc2626" }}>
                  ❌ View Mistakes
                </button>
                <button onClick={() => (window.location.href = "/revision")}
                  style={{ padding: "4px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#2563eb" }}>
                  📖 Revise Weak Topics
                </button>
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
            {isLoading && (
              <div style={{ display: "flex", gap: 5, padding: "4px 8px", marginBottom: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#38bdf8",
                    animation: `bounce 1s ${i * 0.2}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
            <ChatInput onSend={handleSend} examStarted={examStarted} disabled={isLoading} inline={true} />
          </div>
        </div>

        {/* RIGHT — paper panel */}
        <div className="ex-paper">
          {paperContent ? (
            <>
              <div style={{
                position: "sticky", top: 0, zIndex: 5,
                background: "#fff", borderBottom: "1px solid #e2e8f0",
                padding: "10px 0 12px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 20,
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {examActive && (
                    <div style={{
                      background: "#0f172a", color: "#38bdf8",
                      padding: "5px 12px", borderRadius: 7,
                      fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                    }}>
                      ⏱ {elapsed}
                    </div>
                  )}
                  {examMeta.subject && (
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                      📚 {examMeta.subject}
                    </span>
                  )}
                  {examMeta.dayStamp && (
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>📅 {examMeta.dayStamp}</span>
                  )}
                </div>
                <button
                  className="print-btn"
                  onClick={() => printCBSEPaper({ paperContent, subject: examMeta.subject, studentName, studentClass, isRevisionDay: examMeta.isRevisionDay })}
                  style={{
                    padding: "7px 16px", background: "#2563eb", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    transition: "background 0.15s",
                  }}
                >
                  🖨️ Print / Save PDF
                </button>
              </div>

              <PaperRenderer content={paperContent} />
            </>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", paddingTop: 60, lineHeight: 1.9 }}>
              Question paper will appear here.<br />
              Tell the examiner your subject, then type <strong style={{ color: "#0f172a" }}>start</strong>.<br /><br />
              <span style={{ fontSize: 12 }}>You can then 🖨️ print it and write answers in your notebook.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExaminerPage() {
  return (
    <Suspense fallback={
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Loading Examiner...</div>
        </div>
      </div>
    }>
      <ExaminerContent />
    </Suspense>
  );
}