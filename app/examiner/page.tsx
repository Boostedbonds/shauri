"use client";
import { useEffect, useRef, useState } from "react";
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
  const expectedMarks = isRevisionDay ? "50" : "25";
  const marksMatch    = paperContent.match(/(?:Maximum\s*Marks|Total(?:\s*Marks)?)\s*[:\-]\s*(\d+)/i);
  const parsedMarks   = marksMatch ? marksMatch[1] : "";
  const totalMarks    = (parsedMarks === "25" || parsedMarks === "50") ? parsedMarks : expectedMarks;
  const timeMatch     = paperContent.match(/(?:Time\s*Allowed|Duration)\s*[:\-]\s*([^\n]+)/i);
  const timeAllowed   = timeMatch ? timeMatch[1].trim() : (isRevisionDay ? "90 Minutes" : "45 Minutes");
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
// SHAURI Daily Test format templates
// These are ONLY used as backend instructions — never shown in chat
// ─────────────────────────────────────────────────────────────

function getSharuiPaperFormat(isRevisionDay: boolean, writingSubject: string): string {
  if (isRevisionDay) {
    return [
      "SHAURI REVISION DAY TEST FORMAT (follow exactly, no deviations):",
      "Total Marks: 50 | Time Allowed: 90 minutes",
      "Maximum Marks: 50",
      "IMPORTANT: Total marks must equal exactly 50. Do NOT stop early.",
      "",
      "SECTION A – Multiple Choice Questions  [10 × 1 = 10 marks]",
      "  • Write exactly 10 MCQs, each with 4 options (A/B/C/D)",
      "  • Competency-based; spread across all week topics",
      "  • Do NOT write only MCQs — all sections A–E are mandatory",
      "",
      "SECTION B – Very Short Answer  [5 × 2 = 10 marks]",
      "  • Write exactly 5 questions",
      "  • Every question MUST include an internal choice (OR)",
      "  • Expected answer: 1–2 sentences",
      "",
      "SECTION C – Short Answer  [5 × 2 = 10 marks]",
      "  • Write exactly 5 questions",
      "  • Every question MUST include an internal choice (OR)",
      "  • Expected answer: 3–5 sentences or labelled diagram",
      "",
      "SECTION D – Case-Based Questions  [3 × 5 = 15 marks]",
      "  • Write exactly 3 case-based questions",
      "  • Each must be a real-life or competency-based scenario",
      "  • Marks breakdown must be shown per sub-part",
      "",
      `SECTION E – Writing Skills  [1 × 5 = 5 marks]  Language: ${writingSubject}`,
      `  • Write exactly 1 writing question in ${writingSubject}`,
      "  • Choose exactly ONE format: letter OR paragraph OR essay",
      "  • Do NOT mix formats",
      "  • Questions must be solvable within 90 minutes",
      "",
      "MARK VERIFICATION (mandatory before output):",
      "  A(10) + B(10) + C(10) + D(15) + E(5) = 50 ✓",
      "",
      "STRICT RULES:",
      "– Paper must be structured exactly like CBSE exam format",
      "– Each section must be clearly labeled: SECTION A, SECTION B, etc.",
      "– Marks must be shown for EVERY question and sub-question",
      "– Cover full week topics; use competency-based questions (not rote recall)",
      "– Do NOT generate only MCQs; ALL sections A–E are compulsory",
      "– Do NOT generate a full standard CBSE board paper; this is a daily test",
      "",
      "FINAL OUTPUT REQUIREMENTS:",
      "– Generate COMPLETE question paper with ALL sections A, B, C, D, E",
      "– Do NOT stop early or generate a partial paper",
      "– Each section must contain EXACT number of questions specified above",
      "– If paper is incomplete, regenerate internally before output",
    ].join("\n");
  }

  return [
    "SHAURI STUDY DAY TEST FORMAT (follow exactly, no deviations):",
    "Total Marks: 25 | Time Allowed: 45 minutes",
    "Maximum Marks: 25",
    "IMPORTANT: Total marks must equal exactly 25. Do NOT stop early.",
    "",
    "SECTION A – Multiple Choice Questions  [5 × 1 = 5 marks]",
    "  • Write exactly 5 MCQs, each with 4 options (A/B/C/D)",
    "  • At least 3 MCQs must be from PRIMARY subject/topic",
    "  • Do NOT write only MCQs — all sections A–E are mandatory",
    "",
    "SECTION B – Very Short Answer  [3 × 2 = 6 marks]",
    "  • Write exactly 3 questions",
    "  • Every question MUST include an internal choice (OR)",
    "  • Majority of questions from PRIMARY subject",
    "  • Expected answer: 1–2 sentences",
    "",
    "SECTION C – Short Answer  [2 × 3 = 6 marks]",
    "  • Write exactly 2 questions",
    "  • Every question MUST include an internal choice (OR)",
    "  • Expected answer: 3–5 sentences or labelled diagram",
    "",
    "SECTION D – Case-Based Question  [1 × 5 = 5 marks]",
    "  • Write exactly 1 case-based question",
    "  • Must be a real-life or competency-based scenario",
    "  • Marks breakdown must be shown per sub-part",
    "",
    `SECTION E – Writing Skills  [1 × 3 = 3 marks]  Language: ${writingSubject}`,
    `  • Write exactly 1 writing question in ${writingSubject}`,
    "  • Choose exactly ONE format: paragraph OR letter OR notice",
    "  • Do NOT mix formats",
    "  • Questions must be solvable within 45 minutes",
    "",
    "MARK VERIFICATION (mandatory before output):",
    "  A(5) + B(6) + C(6) + D(5) + E(3) = 25 ✓",
    "",
    "STRICT RULES:",
    "– Paper must be structured exactly like CBSE exam format",
    "– Each section must be clearly labeled: SECTION A, SECTION B, etc.",
    "– Marks must be shown for EVERY question and sub-question",
    "– Higher weight to PRIMARY subject; secondary subject included but limited",
    "– Do NOT generate only MCQs; ALL sections A–E are compulsory",
    "– Do NOT generate a full standard CBSE board paper; this is a daily test",
    "",
    "FINAL OUTPUT REQUIREMENTS:",
    "– Generate COMPLETE question paper with ALL sections A, B, C, D, E",
    "– Do NOT stop early or generate a partial paper",
    "– Each section must contain EXACT number of questions specified above",
    "– If paper is incomplete, regenerate internally before output",
  ].join("\n");
}

function getWritingSubject(day: number): "English" | "Hindi" {
  return day % 2 === 0 ? "English" : "Hindi";
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
// PAPER RENDERER — converts raw paper text into styled CBSE layout
// ─────────────────────────────────────────────────────────────

function PaperRenderer({ content }: { content: string }) {
  const lines = content.split("\n");

  // Parse header block (Subject / Class / Board / Time / Marks lines)
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

  // Render header key-value pairs
  const headerPairs = headerLines.map(l => {
    const idx = l.indexOf(":");
    return idx > -1 ? { key: l.slice(0, idx).trim(), val: l.slice(idx + 1).trim() } : null;
  }).filter(Boolean) as { key: string; val: string }[];

  // Find max marks for the badge
  const maxMarksPair = headerPairs.find(p => /maximum marks?/i.test(p.key));
  const timePair     = headerPairs.find(p => /time/i.test(p.key));
  const subjectPair  = headerPairs.find(p => /subject/i.test(p.key));
  const classPair    = headerPairs.find(p => /^class$/i.test(p.key));
  const boardPair    = headerPairs.find(p => /board/i.test(p.key));

  type Block =
    | { type: "section"; text: string; sub?: string }
    | { type: "instruction-block"; lines: string[] }
    | { type: "question"; num: string; text: string; marks: string; options: string[]; subparts: string[] }
    | { type: "general-instructions"; lines: string[] }
    | { type: "blank" }
    | { type: "text"; text: string };

  const blocks: Block[] = [];
  let i = 0;
  const body = bodyLines.filter(l => l.trim() !== "" || blocks.length > 0);

  while (i < body.length) {
    const raw  = body[i];
    const line = raw.trim();

    // Blank
    if (!line) { blocks.push({ type: "blank" }); i++; continue; }

    // SECTION header — "SECTION A" or "SECTION A — ..."
    if (/^SECTION\s+[A-E]\b/i.test(line)) {
      const dashIdx = line.search(/[–—-]/);
      const text = dashIdx > -1 ? line.slice(0, dashIdx).trim() : line;
      const sub  = dashIdx > -1 ? line.slice(dashIdx + 1).trim() : "";
      // look ahead for sub-description line (marks summary)
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

    // General Instructions block
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

    // Instruction / note line (italic) — starts with "All questions", "Answer in", "Application-based", etc.
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

    // Question line — "Q1." or "1." or "Q1 " at start
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
      // Collect options (A/B/C/D) and sub-parts (i/ii/iii or (a)(b)(c))
      while (i < body.length) {
        const opt = body[i].trim();
        if (!opt) break;
        if (/^(Q\.?\s*\d+|\d+\.)\s/i.test(opt)) break;
        if (/^SECTION\s+[A-E]/i.test(opt)) break;
        if (/^[A-D][.)]\s/.test(opt) || /^\([a-d]\)\s/i.test(opt)) {
          options.push(opt);
          i++; continue;
        }
        if (/^\([ivxlIVXL]+\)\s|^\(i{1,3}v?\)\s/i.test(opt) || /^\([a-e]\)\s/.test(opt)) {
          subparts.push(opt);
          i++; continue;
        }
        // continuation of question text
        if (options.length === 0 && subparts.length === 0) {
          // append to text — handled as subpart
          subparts.push(opt);
          i++; continue;
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

      {/* ── Paper Header ── */}
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

      {/* ── Blocks ── */}
      {blocks.map((block, idx) => {
        if (block.type === "blank") return <div key={idx} style={{ height: 8 }} />;

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
              {/* Question header row */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "#fff" }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#1e293b", flexShrink: 0, minWidth: 28 }}>Q{block.num}.</span>
                <span style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.75, flex: 1 }}>{block.text}</span>
                {block.marks && (
                  <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: marksBg, color: marksColor, border: `1px solid ${marksColor}30`, whiteSpace: "nowrap" }}>
                    [{block.marks} mark{marksNum !== 1 ? "s" : ""}]
                  </span>
                )}
              </div>

              {/* Sub-parts (before options) */}
              {hasSubparts && !hasOptions && (
                <div style={{ padding: "0 14px 10px 42px", background: "#fff" }}>
                  {block.subparts.map((sp, j) => (
                    <div key={j} style={{ fontSize: 12, color: "#334155", lineHeight: 1.7, marginBottom: 2 }}>{sp}</div>
                  ))}
                </div>
              )}

              {/* MCQ options */}
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

      {/* Footer */}
      <div style={{ marginTop: 24, borderTop: "2px solid #e2e8f0", paddingTop: 12, textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.08em" }}>✦ END OF PAPER ✦</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function ExaminerPage() {
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

  // Store shauriPaper data separately — never put in chat message
  const shauriPaperRef = useRef<object | null>(null);

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

  // ── Core API caller — shauriPaper is passed as structured data, never as text ──
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
          // For SHAURI auto-trigger, send clean "start" — format data goes in shauriPaper
          message:          shauriPaperData ? "start" : text,
          uploadedText:     uploadedText || "",
          uploadType:       uploadType || "",
          history,
          confirmedSubject: resolvedSubject || undefined,
          // Structured SHAURI paper data — parsed by backend, never shown in UI
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

      // ── resumeExam ──
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

      // ── Exam started ──
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
          subject: paperSubject || p.subject,
          isRevisionDay: data?.isRevisionDay ?? isRevisionDayRef.current ?? p.isRevisionDay,
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

      // ── Exam ended ──
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
          const dayFromQuery = Number(searchParams.get("day") || "");
          const cycleFromQuery = Number(searchParams.get("cycle") || "");
          const finalDay = Number.isFinite(dayFromQuery) && dayFromQuery > 0 ? dayFromQuery : pState.current_day;
          const finalCycle = Number.isFinite(cycleFromQuery) && cycleFromQuery > 0 ? cycleFromQuery : pState.cycle;
          const plannerDay = THIRTY_DAY_PLAN.find((d) => d.day === finalDay);
          const primary = plannerDay?.topics?.[0];
          const secondary = plannerDay?.topics?.[1];
          if (total > 0) {
            saveResult({
              day: finalDay,
              cycle: finalCycle,
              subject: subjectForResult,
              topic: (searchParams.get("topic") || "").trim() || "General",
              score: marks,
              total,
              source: "exam",
            });
            if (primary?.subject) {
              saveResult({
                day: finalDay,
                cycle: finalCycle,
                subject: primary.subject,
                topic: primary.topic || "General",
                score: marks,
                total,
                source: "exam",
              });
            }
            if (secondary?.subject) {
              saveResult({
                day: finalDay,
                cycle: finalCycle,
                subject: secondary.subject,
                topic: secondary.topic || "General",
                score: marks,
                total,
                source: "exam",
              });
            }
          }
        } catch {}

        // ── Auto-save mistakes from evaluation JSON ──
        try {
          if (data?.evalJson && typeof data.evalJson === "object") {
            const pState = getPlannerState();
            const dayFromQuery2  = Number(searchParams.get("day") || "");
            const cycleFromQuery2 = Number(searchParams.get("cycle") || "");
            const mDay   = Number.isFinite(dayFromQuery2)  && dayFromQuery2  > 0 ? dayFromQuery2  : pState.current_day;
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

      // ── Regular reply ──
      if (reply) {
        const isUploadConfirmation =
          reply.includes("Syllabus") && reply.includes("uploaded successfully");

        if (!isUploadConfirmation) {
          const looksLikeSubjectConfirmation =
            /(?:I'll prepare|preparing|strict CBSE|custom paper|paper for)/i.test(reply);

          if (looksLikeSubjectConfirmation) {
            const extracted = extractConfirmedSubject(reply);
            if (extracted) {
              confirmedSubjectRef.current = extracted;
              console.log("[ExaminerPage] confirmedSubject:", extracted);
            }
          }
        } else {
          const detected = extractUploadedSubject(reply);
          if (detected) {
            uploadedSubjectRef.current = detected;
            console.log("[ExaminerPage] uploadedSubject:", detected);
          }
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

  // ── Auto-trigger: planner → examiner ──────────────────────────
  // KEY FIX: format block and subject data go into shauriPaper object (backend only)
  // The chat only shows a clean "Starting your daily test..." message
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

    const plannerDay     = THIRTY_DAY_PLAN.find((d) => d.day === dayNum);
    const primary        = plannerDay?.topics?.[0];
    const secondary      = plannerDay?.topics?.[1];
    const writingSubject = getWritingSubject(dayNum || 1);
    const isRevisionDay  = Boolean(
      plannerDay?.meta?.isRev || plannerDay?.meta?.type === "rev"
    );
    isRevisionDayRef.current = isRevisionDay;

    const weekStart = dayNum > 0 ? Math.floor((dayNum - 1) / 7) * 7 + 1 : 1;
    const weekEnd   = Math.min(weekStart + 6, THIRTY_DAY_PLAN.length);
    const weekDays  = THIRTY_DAY_PLAN.filter(
      (d) => d.day >= weekStart && d.day <= weekEnd
    );
    const weekCoverage = weekDays
      .flatMap((d) => d.topics.map((t) => `Day ${d.day}: ${t.subject} – ${t.topic}`))
      .join(" | ");

    // Build format block string (backend instruction only — never shown in chat)
    const formatBlock = getSharuiPaperFormat(isRevisionDay, writingSubject);

    // Determine display subject label for UI
    const displaySubject = isRevisionDay
      ? `Week ${Math.ceil(dayNum / 7)} Revision`
      : primary
        ? `${primary.subject}${secondary ? ` + ${secondary.subject}` : ""}`
        : (subject || "General");

    // Build the structured shauriPaper object (sent to backend, not shown in chat)
    const shauriPaperData = {
      isRevisionDay,
      totalMarks:      isRevisionDay ? 50 : 25,
      timeMinutes:     isRevisionDay ? 90 : 45,
      primarySubject:  primary?.subject  || subject || "General",
      primaryTopic:    primary?.topic    || topic   || "General",
      secondarySubject: secondary?.subject || "",
      secondaryTopic:   secondary?.topic   || "",
      writingSubject,
      weekCoverage:    isRevisionDay ? weekCoverage : undefined,
      dayNum,
      cycleNum,
      formatBlock,     // Backend uses this for paper generation instructions
    };

    shauriPaperRef.current = shauriPaperData;

    // Store for exam meta display
    setMeta(p => ({
      ...p,
      subject: displaySubject,
      isRevisionDay,
    }));

    // Clean user-visible message — no format block, no marks/sections detail
    const cleanUserMessage = from === "planner" && plannerDay
      ? `Starting Day ${dayNum} ${isRevisionDay ? "Revision" : "Study"} test — ${displaySubject}`
      : `Starting test — ${displaySubject}`;

    // Show clean message in chat, then trigger API with structured data
    setTimeout(() => {
      if (!sendingRef.current) {
        // Add clean user message to chat
        setMessages(p => [...p, { role: "user", content: cleanUserMessage }]);
        // Call API with shauriPaper data (message will be "start" internally)
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

        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          📋 Examiner Mode
        </span>

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
              {/* Sticky toolbar */}
              <div style={{
                position: "sticky", top: 0, zIndex: 5,
                background: "#fff", borderBottom: "1px solid #e2e8f0",
                padding: "10px 0 12px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 20,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

              {/* Styled paper renderer */}
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