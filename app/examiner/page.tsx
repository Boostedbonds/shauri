"use client";
import { useEffect, useRef, useState } from "react";
import ChatInput from "../components/ChatInput";

type Message = { role: "user" | "assistant"; content: string };

// ─── Render markdown-lite ────────────────────────────────────
function renderText(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

// ─── Chat bubble ────────────────────────────────────────────
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

// ─── Paper overlay ──────────────────────────────────────────
function PaperOverlay({ content, onClose, elapsed, subject, examActive }: {
  content: string; onClose: () => void;
  elapsed: string; subject?: string; examActive: boolean;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 840, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>📄 {subject || "Question Paper"}</span>
            {examActive && <span style={{ background: "#0f172a", color: "#38bdf8", padding: "4px 12px", borderRadius: 6, fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>⏱ {elapsed}</span>}
          </div>
          <button onClick={onClose} style={{ padding: "6px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>✕ Close</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <pre style={{ fontSize: 13, lineHeight: 2, color: "#0f172a", fontFamily: "monospace", whiteSpace: "pre-wrap", margin: 0, wordBreak: "break-word" }}>{content}</pre>
        </div>
      </div>
    </div>
  );
}

// ─── Session ID: stable across refresh ──────────────────────
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("shauri_exam_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("shauri_exam_sid", sid);
  }
  return sid;
}

// ─── Main page ───────────────────────────────────────────────
export default function ExaminerPage() {
  // Build greeting with student name
  function buildGreeting(name: string): string {
    const n = name ? `Hello ${name}!` : "Hello!";
    return `${n} 📋 I'm your strict CBSE Examiner.\n\nTell me the **subject** you want to be tested on:\nScience | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n📎 **OR** upload your **syllabus as a PDF or image** and I'll generate a paper exactly based on it.\n\n⏱️ Your timer starts the moment you type **start**.`;
  }

  const [messages, setMessages]   = useState<Message[]>([]);  // populated after mount with name
  const [paperContent, setPaper]  = useState("");
  const [showPaper, setShowPaper] = useState(false);
  const [examStarted, setStarted] = useState(false);
  const [elapsedSec, setElapsed]  = useState(0);
  const [isLoading, setLoading]   = useState(false);
  const [examMeta, setMeta]       = useState<{
    examEnded?: boolean; marksObtained?: number; totalMarks?: number;
    percentage?: number; timeTaken?: string; subject?: string;
  }>({});
  const [studentName, setStudentName] = useState("");
  // Track last confirmed subject locally — survives Supabase write latency
  const confirmedSubjectRef = useRef<string>("");

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const sendingRef = useRef(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const msgsRef    = useRef<Message[]>([]);

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (paperContent) setShowPaper(true); }, [paperContent]);
  useEffect(() => () => stopTimer(), []);

  // On mount: load student name, show greeting from state (NO API call)
  useEffect(() => {
    let name = "";
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      name = s?.name || "";
      setStudentName(name);
    } catch {}
    // Show greeting immediately from local state — no API, no double-fire possible
    setMessages([{ role: "assistant", content: buildGreeting(name) }]);
  }, []);

  function startTimer(ts: number) {
    if (timerRef.current) return;
    startTsRef.current = ts;
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

  // ─── Call API — only when student sends a message ───────────
  async function callAPI(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer") {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setLoading(true);

    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}

    // History = all messages EXCEPT the initial local greeting (index 0)
    const history = msgsRef.current
      .slice(1) // skip the local greeting
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
          // Include locally cached subject for race condition recovery
          confirmedSubject: confirmedSubjectRef.current || undefined,
          student: {
            name: student?.name || "",
            class: student?.class || "",
            board: student?.board || "CBSE",
            sessionId: getOrCreateSessionId(),
          },
        }),
      });

      const data = await res.json();
      const reply: string = data?.reply ?? "";

      // Exam resumed after page refresh
      if (data?.resumeExam === true && typeof data.startTime === "number") {
        startTimer(data.startTime);
        setMeta(p => ({ ...p, subject: data.subject || p.subject }));
        if (data.questionPaper) setPaper(data.questionPaper);
        if (reply) setMessages(p => [...p, { role: "assistant", content: reply }]);
        return;
      }

      // Paper generated — exam starts
      if (typeof data?.startTime === "number") {
        startTimer(data.startTime);
        const divIdx = reply.indexOf("━━━");
        const paper  = (divIdx > -1 ? reply.slice(0, divIdx) : reply).trim();
        const rest   = divIdx > -1 ? reply.slice(divIdx).replace(/^━+\s*/m, "").trim() : "";
        const subj   = paper.match(/Subject\s*[:\|]\s*([^\n]+)/i);
        setMeta(p => ({ ...p, subject: subj ? subj[1].trim() : data?.subject || p.subject }));
        setPaper(paper);
        setMessages(p => [...p, {
          role: "assistant",
          content: rest || "✅ Paper ready! Tap **📄 View Paper** above to read it.\n\nType your answers here in any order. When done with all questions, type **submit**.",
        }]);
        return;
      }

      // Exam ended — evaluation
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
          totalMarks: data?.totalMarks ?? 0,
          percentage: data?.percentage ?? 0,
          timeTaken: data?.timeTaken ?? fmt(taken),
          subject: data?.subject ?? p.subject,
        }));
        localStorage.removeItem("shauri_exam_sid");
        return;
      }

      if (reply) {
        // When API confirms subject (says "type start"), cache it locally
        // This survives Supabase write latency race condition
        if (/type\s+\*?\*?start\*?\*?/i.test(reply)) {
          const m = reply.match(/question paper for[:\s]*\n?\*?\*?([^\n*]+)/i)
            || reply.match(/for:\s*\n\*?\*?([^\n*]+)/i);
          if (m) confirmedSubjectRef.current = m[1].trim();
        }
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
        .ex-left{width:50%;overflow-y:auto;background:#fff;border-right:1.5px solid #e2e8f0;padding:24px 28px}
        .ex-right{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#f8fafc}
        @media(max-width:699px){.ex-left{display:none}.ex-right{width:100%!important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <button onClick={() => window.location.href = "/modes"} style={{ padding: "7px 14px", background: "#f1f5f9", color: "#374151", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            📋 Examiner Mode{studentName ? ` · ${studentName}` : ""}
          </span>
          {paperContent && (
            <button onClick={() => setShowPaper(true)} style={{ padding: "5px 12px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>📄 View Paper</button>
          )}
        </div>
        {examActive
          ? <div style={{ background: "#0f172a", color: "#38bdf8", padding: "6px 14px", borderRadius: 8, fontFamily: "monospace", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>⏱ {elapsed}</div>
          : <div style={{ width: 80 }} />}
      </div>

      {/* SPLIT */}
      <div className="ex-split">

        {/* LEFT — paper */}
        <div className="ex-left">
          {paperContent ? (
            <>
              {examActive && (
                <div style={{ position: "sticky", top: 0, zIndex: 5, background: "#0f172a", color: "#38bdf8", padding: "7px 14px", borderRadius: 8, marginBottom: 16, fontFamily: "monospace", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>⏱ {elapsed}</span>
                  {examMeta.subject && <span style={{ opacity: 0.7, fontSize: 11 }}>📚 {examMeta.subject}</span>}
                </div>
              )}
              <pre style={{ fontSize: 13, lineHeight: 1.95, color: "#0f172a", fontFamily: "monospace", whiteSpace: "pre-wrap", margin: 0, wordBreak: "break-word" }}>{paperContent}</pre>
            </>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", paddingTop: 60, lineHeight: 1.9 }}>
              Question paper will appear here.<br />
              Tell the examiner your subject, then type <strong style={{ color: "#0f172a" }}>start</strong>.
            </div>
          )}
        </div>

        {/* RIGHT — chat */}
        <div className="ex-right">
          {/* header */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", flexShrink: 0, background: examActive ? "#22c55e" : examMeta.examEnded ? "#f97316" : "#94a3b8", boxShadow: examActive ? "0 0 6px #22c55e" : "none" }} />
              {examMeta.examEnded ? "Evaluation Complete" : examActive ? "Type your answers here" : "Examiner Chat"}
            </div>
            {paperContent && (
              <button onClick={() => setShowPaper(true)} style={{ padding: "4px 10px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>📄 Paper</button>
            )}
          </div>

          {/* score */}
          {examMeta.examEnded && (
            <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "10px 16px", fontSize: 13, flexShrink: 0 }}>
              <strong style={{ color: "#15803d" }}>✅ Submitted</strong>
              {" · "}{examMeta.marksObtained}/{examMeta.totalMarks} ({examMeta.percentage}%)
              {" · "}{examMeta.timeTaken}
            </div>
          )}

          {/* messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
            {isLoading && (
              <div style={{ display: "flex", gap: 5, padding: "4px 8px", marginBottom: 6 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", animation: `bounce 1s ${i * 0.15}s infinite ease-in-out` }} />)}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
            <ChatInput onSend={handleSend} examStarted={examStarted} disabled={isLoading} inline={true} />
          </div>
        </div>
      </div>

      {showPaper && paperContent && (
        <PaperOverlay content={paperContent} onClose={() => setShowPaper(false)} elapsed={elapsed} subject={examMeta.subject} examActive={examActive} />
      )}
    </div>
  );
}