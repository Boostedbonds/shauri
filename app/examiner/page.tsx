"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import ChatInput from "../components/ChatInput";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_STORAGE_KEY = "shauri_chat_examiner";
const MAX_SAVED_MSGS   = 10;

// ─── Persist helpers ─────────────────────────────────────────
function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_SAVED_MSGS)));
  } catch {}
}

function clearSavedMessages() {
  try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
}

// ─── Render markdown-lite ────────────────────────────────────
function renderText(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

// ─── Chat bubble ─────────────────────────────────────────────
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

// ─── Resume Banner ────────────────────────────────────────────
function ResumeBanner({ subject, elapsed, onDismiss }: {
  subject?: string;
  elapsed: string;
  onDismiss: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 8,
      background: "#fefce8", border: "1.5px solid #fde047",
      borderRadius: 10, padding: "10px 16px",
      fontSize: 13, color: "#713f12",
      flexShrink: 0,
    }}>
      <span>
        ⚡ <strong>Exam restored</strong>
        {subject ? ` — ${subject}` : ""}
        {" · "}Time already elapsed: <strong>{elapsed}</strong>
        {" · "}Your question paper is on the right. Keep writing!
      </span>
      <button
        onClick={onDismiss}
        style={{
          background: "#fde047", border: "none", borderRadius: 6,
          padding: "4px 12px", fontSize: 12, fontWeight: 700,
          cursor: "pointer", color: "#713f12", flexShrink: 0,
        }}
      >
        Got it ✕
      </button>
    </div>
  );
}

// ─── CBSE Print ──────────────────────────────────────────────
function printCBSEPaper({
  paperContent, subject, studentName, studentClass,
}: {
  paperContent: string; subject?: string;
  studentName?: string; studentClass?: string;
}) {
  const marksMatch  = paperContent.match(/(?:Maximum\s*Marks|Total(?:\s*Marks)?)\s*[:\-]\s*(\d+)/i);
  const timeMatch   = paperContent.match(/(?:Time\s*Allowed|Duration)\s*[:\-]\s*([^\n]+)/i);
  const totalMarks  = marksMatch ? marksMatch[1] : "80";
  const timeAllowed = timeMatch  ? timeMatch[1].trim() : "3 Hours";

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
  <title>${esc(subject || "Question Paper")} – CBSE</title>
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
    @media print{
      body{padding:0}.page{width:100%;padding:15mm 18mm 18mm}
      .no-print{display:none!important}
      @page{size:A4;margin:0}
    }
  </style>
</head>
<body>
<div class="no-print" style="position:fixed;top:0;left:0;right:0;z-index:999;background:#1e293b;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 20px;font-family:Arial,sans-serif;font-size:14px">
  <span>📄 CBSE Question Paper — ready to print or save as PDF</span>
  <div style="display:flex;gap:10px">
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Print / Save as PDF</button>
    <button onclick="window.close()" style="background:#475569;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer">✕ Close</button>
  </div>
</div>
<div class="no-print" style="height:52px"></div>
<div class="page">
  <div class="cbse-header">
    <div class="board">Central Board of Secondary Education</div>
    <div class="title">Annual Examination</div>
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
      <li>This question paper contains printed pages. Read all instructions carefully.</li>
      <li>All questions are compulsory unless stated otherwise.</li>
      <li>Do not write anything on the question paper except your name, class, and roll number.</li>
      <li>Write your answers neatly in the answer booklet provided.</li>
      <li>Draw diagrams wherever necessary and label them clearly.</li>
      <li>In case of MCQs, write only the letter of the correct option (A/B/C/D).</li>
      <li>Marks for each question are indicated against it.</li>
      <li>Calculators and electronic devices are not permitted.</li>
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
  <div class="footer">Generated by Shauri · CBSE Pattern · ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url; a.download = `${subject || "Question-Paper"}-CBSE.html`; a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ─── Session ID ───────────────────────────────────────────────
function createNewSessionId(): string {
  if (typeof window === "undefined") return "";
  const sid = crypto.randomUUID();
  localStorage.setItem("shauri_exam_sid", sid);
  return sid;
}

function extractConfirmedSubject(reply: string): string {
  const uploadMatch = reply.match(/\*?\*?Subject detected[:\*\s]+\*?\*?([^\n*]+)/i);
  if (uploadMatch) return uploadMatch[1].trim();
  const paperMatch = reply.match(/question paper for[:\s]*\n?\*?\*?([^\n*]+)/i)
    || reply.match(/for:\s*\n\*?\*?([^\n*]+)/i);
  if (paperMatch) return paperMatch[1].trim();
  const setMatch = reply.match(/[Ss]ubject is set to\s+\*?\*?([^\n*]+)/i);
  if (setMatch) return setMatch[1].trim();
  return "";
}

// ─── Main page ────────────────────────────────────────────────
export default function ExaminerPage() {
  function buildGreeting(name: string): string {
    const n = name ? `Hello ${name}!` : "Hello!";
    return `${n} 📋 I'm your strict CBSE Examiner.\n\nTell me the **subject** you want to be tested on:\nScience | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n📎 **OR** upload your **syllabus as a PDF or image** and I'll generate a paper exactly based on it.\n\n⏱️ Your timer starts the moment you type **start**.`;
  }

  const [messages, setMessages]       = useState<Message[]>([]);
  const [paperContent, setPaper]      = useState("");
  const [examStarted, setStarted]     = useState(false);
  const [elapsedSec, setElapsed]      = useState(0);
  const [isLoading, setLoading]       = useState(false);
  const [showResumeBanner, setResumeBanner] = useState(false);
  const [examMeta, setMeta]           = useState<{
    examEnded?: boolean; marksObtained?: number; totalMarks?: number;
    percentage?: number; timeTaken?: string; subject?: string;
  }>({});
  const [studentName,  setStudentName]  = useState("");
  const [studentClass, setStudentClass] = useState("");

  const confirmedSubjectRef = useRef<string>("");
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef  = useRef<number | null>(null);
  const elapsedRef  = useRef(0);
  const sendingRef  = useRef(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const msgsRef     = useRef<Message[]>([]);
  const sessionIdRef = useRef<string>("");

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => () => stopTimer(), []);

  useEffect(() => {
    if (messages.length === 0) return;
    saveMessages(messages);
  }, [messages]);

  // ── On mount: always start fresh ─────────────────────────────
  useEffect(() => {
    // Clear all previous exam state so we always get a clean screen
    clearSavedMessages();
    localStorage.removeItem("shauri_exam_sid");

    // Create a fresh session ID
    sessionIdRef.current = createNewSessionId();

    let name = "", cls = "";
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      name = s?.name || "";
      cls  = s?.class || "";
      setStudentName(name);
      setStudentClass(cls);
    } catch {}

    // Always show fresh greeting
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

  async function callAPI(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer") {
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

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "examiner",
          message: text,
          uploadedText: uploadedText || "",
          uploadType: uploadType || null,
          history,
          confirmedSubject: confirmedSubjectRef.current || undefined,
          student: {
            name: student?.name || "",
            class: student?.class || "",
            board: student?.board || "CBSE",
            sessionId: sessionIdRef.current,
          },
        }),
      });

      const data = await res.json();
      const reply: string = data?.reply ?? "";

      if (data?.resumeExam === true && typeof data.startTime === "number") {
        startTimer(data.startTime);
        setMeta(p => ({ ...p, subject: data.subject || p.subject }));
        if (data.questionPaper) setPaper(data.questionPaper);
        if (reply) setMessages(p => [...p, { role: "assistant", content: reply }]);
        setResumeBanner(true);
        return;
      }

      if (typeof data?.startTime === "number") {
        startTimer(data.startTime);
        const paper = data?.paper || reply;
        const subj  = paper.match(/Subject\s*[:\|]\s*([^\n]+)/i);
        setMeta(p => ({ ...p, subject: subj ? subj[1].trim() : data?.subject || p.subject }));
        setPaper(paper);
        confirmedSubjectRef.current = "";
        setMessages(p => [...p, {
          role: "assistant",
          content: reply || "✅ Paper ready! It's displayed on the right panel.\n\nWrite your answers in your notebook and type them here when done. Type **submit** to finish.",
        }]);
        return;
      }

      if (data?.examEnded === true) {
        stopTimer();
        const taken = elapsedRef.current;
        setMessages(p => [...p, {
          role: "assistant",
          content: reply + `\n\n⏱ Time taken: ${fmt(taken)}`,
        }]);
        setMeta(p => ({
          ...p, examEnded: true,
          marksObtained: data?.marksObtained ?? 0,
          totalMarks:    data?.totalMarks    ?? 0,
          percentage:    data?.percentage    ?? 0,
          timeTaken:     data?.timeTaken     ?? fmt(taken),
          subject:       data?.subject       ?? p.subject,
        }));
        localStorage.removeItem("shauri_exam_sid");
        clearSavedMessages();
        confirmedSubjectRef.current = "";
        return;
      }

      if (reply) {
        const extracted = extractConfirmedSubject(reply);
        if (extracted) confirmedSubjectRef.current = extracted;
        setMessages(p => [...p, { role: "assistant", content: reply }]);
      }

    } catch {
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
        @media(max-width:699px){.ex-paper{display:none}.ex-chat{width:100%!important}}
        .print-btn:hover{background:#1d4ed8!important}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
      }}>
        <button
          onClick={() => window.location.href = "/modes"}
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
              onClick={() => printCBSEPaper({ paperContent, subject: examMeta.subject, studentName, studentClass })}
              style={{
                padding: "7px 14px", background: "#2563eb", color: "#fff",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                transition: "background 0.15s",
              }}
              title="Open printable CBSE question paper"
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

      {/* ── SPLIT ── */}
      <div className="ex-split">

        {/* LEFT — chat */}
        <div className="ex-chat">

          {/* Sub-header */}
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
                onClick={() => printCBSEPaper({ paperContent, subject: examMeta.subject, studentName, studentClass })}
                style={{
                  padding: "4px 10px", background: "#2563eb", color: "#fff",
                  border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  display: "none",
                }}
                id="mobile-print-btn"
              >
                🖨️ Print
              </button>
            )}
          </div>

          {/* Resume banner */}
          {showResumeBanner && (
            <div style={{ padding: "10px 14px", flexShrink: 0 }}>
              <ResumeBanner
                subject={examMeta.subject}
                elapsed={elapsed}
                onDismiss={() => setResumeBanner(false)}
              />
            </div>
          )}

          {/* Exam ended strip */}
          {examMeta.examEnded && (
            <div style={{
              background: "#f0fdf4", borderBottom: "1px solid #bbf7d0",
              padding: "10px 16px", fontSize: 13, flexShrink: 0,
            }}>
              <strong style={{ color: "#15803d" }}>✅ Submitted</strong>
              {" · "}{examMeta.marksObtained}/{examMeta.totalMarks} ({examMeta.percentage}%)
              {" · "}{examMeta.timeTaken}
            </div>
          )}

          {/* Messages */}
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
                marginBottom: 16,
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
                  onClick={() => printCBSEPaper({ paperContent, subject: examMeta.subject, studentName, studentClass })}
                  style={{
                    padding: "7px 16px", background: "#2563eb", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    transition: "background 0.15s",
                  }}
                  title="Print question paper or save as PDF"
                >
                  🖨️ Print / Save PDF
                </button>
              </div>

              <pre style={{
                fontSize: 13, lineHeight: 1.95, color: "#0f172a",
                fontFamily: "monospace", whiteSpace: "pre-wrap",
                margin: 0, wordBreak: "break-word",
              }}>
                {paperContent}
              </pre>
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

      <style>{`
        @media(max-width:699px){
          #mobile-print-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}