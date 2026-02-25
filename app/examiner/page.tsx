"use client";
import { useEffect, useRef, useState } from "react";
import ChatInput from "../components/ChatInput";
import { PDF_MARKER } from "../components/ChatUI";

type Message = { role: "user" | "assistant"; content: string };
type ExamAttempt = {
  id: string; date: string; mode: "examiner";
  subject: string; chapters: string[];
  marksObtained: number; totalMarks: number;
  scorePercent?: number; timeTakenSeconds: number;
  rawAnswerText: string;
};

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
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div style={{
        maxWidth: "85%", padding: "11px 15px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "#38bdf8" : "#fff",
        color: isUser ? "#fff" : "#0f172a",
        fontSize: 15, lineHeight: 1.7, wordBreak: "break-word",
        border: isUser ? "none" : "1px solid #e2e8f0",
        boxShadow: isUser ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        {renderText(m.content)}
      </div>
    </div>
  );
}

// ── Full-screen paper overlay (like opening a document) ─────
function PaperOverlay({ content, onClose, elapsed, subject, examActive }: {
  content: string; onClose: () => void;
  elapsed: string; subject?: string; examActive: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onClose}>
      <div
        style={{
          background: "#fff", borderRadius: 16,
          width: "100%", maxWidth: 820, maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Overlay header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              📄 {subject || "Question Paper"}
            </span>
            {examActive && (
              <span style={{
                background: "#0f172a", color: "#38bdf8",
                padding: "4px 12px", borderRadius: 6,
                fontFamily: "monospace", fontSize: 13, fontWeight: 700,
              }}>⏱ {elapsed}</span>
            )}
          </div>
          <button onClick={onClose} style={{
            padding: "6px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0",
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151",
          }}>✕ Close</button>
        </div>
        {/* Paper content — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ fontSize: 13, lineHeight: 2, color: "#0f172a", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExaminerPage() {
  const [messages, setMessages]         = useState<Message[]>([]);
  const [paperContent, setPaperContent] = useState<string>("");
  const [showPaper, setShowPaper]       = useState(false); // overlay toggle
  const [examStarted, setExamStarted]   = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading]       = useState(false);
  const [studentName, setStudentName]   = useState("");
  const [examMeta, setExamMeta]         = useState<{
    startTime?: number; examEnded?: boolean;
    marksObtained?: number; totalMarks?: number;
    percentage?: number; timeTaken?: string; subject?: string;
  }>({});

  const timerRef         = useRef<NodeJS.Timeout | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const elapsedRef       = useRef(0);
  const sessionIdRef     = useRef(crypto.randomUUID());
  const greetingFiredRef = useRef(false);
  const isSendingRef     = useRef(false);
  const chatBottomRef    = useRef<HTMLDivElement>(null);
  const messagesRef      = useRef<Message[]>([]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      if (s?.name) setStudentName(s.name);
    } catch {}

    if (greetingFiredRef.current) return;
    greetingFiredRef.current = true;
    sendToAPI("", undefined, undefined, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open paper overlay when paper is generated
  useEffect(() => {
    if (paperContent) setShowPaper(true);
  }, [paperContent]);

  function startTimer(serverStartTime: number) {
    if (timerRef.current) return;
    startTimestampRef.current = serverStartTime;
    setExamStarted(true);
    setExamMeta(prev => ({ ...prev, startTime: serverStartTime }));
    timerRef.current = setInterval(() => {
      if (startTimestampRef.current) {
        const diff = Math.floor((Date.now() - startTimestampRef.current) / 1000);
        elapsedRef.current = diff;
        setElapsedSeconds(diff);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setExamStarted(false);
  }
  useEffect(() => () => stopTimer(), []);

  function formatTime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  }
  const elapsed = formatTime(elapsedSeconds);

  function saveExamAttempt(timeTaken: number, subject: string, chapters: string[], marks: number, total: number) {
    const attempt: ExamAttempt = {
      id: crypto.randomUUID(), date: new Date().toISOString(), mode: "examiner",
      subject, chapters, marksObtained: marks, totalMarks: total,
      scorePercent: total > 0 ? Math.round((marks / total) * 100) : 0,
      timeTakenSeconds: timeTaken,
      rawAnswerText: messagesRef.current.filter(m => m.role === "user").map(m => m.content).join("\n\n"),
    };
    try {
      const arr: ExamAttempt[] = JSON.parse(localStorage.getItem("shauri_exam_attempts") || "[]");
      arr.push(attempt);
      localStorage.setItem("shauri_exam_attempts", JSON.stringify(arr));
    } catch {}
  }

  async function sendToAPI(
    text: string,
    uploadedText?: string,
    uploadType?: "syllabus" | "answer",
    isGreeting = false
  ) {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsLoading(true);

    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}

    // Always send full student context
    const studentPayload = {
      name: student?.name || "Student",
      class: student?.class || "",
      board: student?.board || "CBSE",
      sessionId: sessionIdRef.current,
    };

    const history = isGreeting ? [] : messagesRef.current
      .filter(m => !m.content.startsWith(PDF_MARKER))
      .map(m => ({
        role: m.role,
        content: m.content
          .replace(/\n\n📋 \[Syllabus uploaded\]/g, "")
          .replace(/\n\n📝 \[Answer uploaded\]/g, "")
          .trim(),
      }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "examiner",
          message: isGreeting ? "hi" : text,
          uploadedText: uploadedText || "",
          uploadType: uploadType || null,
          history,
          student: studentPayload,
        }),
      });

      const data = await res.json();
      const aiReply: string = typeof data?.reply === "string" ? data.reply : "";

      // Paper generated → split it out, start timer
      if (typeof data?.startTime === "number") {
        startTimer(data.startTime);
        const subjectMatch = aiReply.match(/Subject\s*[:\|]\s*([^\n]+)/i);
        setExamMeta(prev => ({
          ...prev,
          startTime: data.startTime,
          subject: subjectMatch ? subjectMatch[1].trim() : data?.subject || prev.subject,
        }));
        // Split paper from chat message at the divider
        const dividerIdx = aiReply.indexOf("━━━");
        const paper = dividerIdx > -1 ? aiReply.slice(0, dividerIdx).trim() : aiReply;
        const chatMsg = dividerIdx > -1 ? aiReply.slice(dividerIdx).replace(/^━+\s*/m, "").trim() : "Paper ready! Start answering in this chat.";
        setPaperContent(paper);
        setMessages(prev => [...prev, { role: "assistant", content: chatMsg }]);
        return;
      }

      // Exam ended
      if (data?.examEnded === true) {
        stopTimer();
        const timeTaken = elapsedRef.current;
        setMessages(prev => [...prev, { role: "assistant", content: aiReply + `\n\n⏱ Time taken: ${formatTime(timeTaken)}` }]);
        setExamMeta(prev => ({
          ...prev, examEnded: true,
          marksObtained: data?.marksObtained ?? 0,
          totalMarks: data?.totalMarks ?? 0,
          percentage: data?.percentage ?? 0,
          timeTaken: data?.timeTaken ?? formatTime(timeTaken),
          subject: data?.subject ?? prev.subject,
        }));
        saveExamAttempt(timeTaken, data?.subject ?? "Exam", data?.chapters ?? [], data?.marksObtained ?? 0, data?.totalMarks ?? 0);
        return;
      }

      if (aiReply) setMessages(prev => [...prev, { role: "assistant", content: aiReply }]);

    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }

  async function handleSend(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer") {
    if (!text.trim() && !uploadedText) return;
    if (isSendingRef.current) return;
    let display = text.trim();
    if (uploadedText) {
      const label = uploadType === "syllabus" ? "📋 [Syllabus uploaded]" : "📝 [Answer uploaded]";
      display = display ? `${display}\n\n${label}` : label;
    }
    setMessages(prev => [...prev, { role: "user", content: display }]);
    await sendToAPI(text, uploadedText, uploadType);
  }

  const examActive = examStarted && !examMeta.examEnded;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .exam-split { flex: 1; display: flex; overflow: hidden; }
        .exam-left { width: 50%; overflow-y: auto; background: #fff; border-right: 1.5px solid #e2e8f0; padding: 24px 28px; }
        .exam-right { width: 50%; display: flex; flex-direction: column; overflow: hidden; background: #f8fafc; }
        /* Mobile: stack vertically */
        @media (max-width: 699px) {
          .exam-left { display: none; }
          .exam-right { width: 100% !important; }
        }
      `}</style>

      {/* TOP BAR */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", background: "#fff", borderBottom: "1px solid #e2e8f0",
        flexShrink: 0, zIndex: 10,
      }}>
        <button onClick={() => window.location.href = "/modes"} style={{
          padding: "7px 14px", background: "#f1f5f9", color: "#374151",
          borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600,
        }}>← Back</button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
            📋 Examiner Mode{studentName ? ` · ${studentName}` : ""}
          </span>
          {/* Paper viewer button — visible when paper exists */}
          {paperContent && (
            <button onClick={() => setShowPaper(true)} style={{
              padding: "5px 12px", background: "#eff6ff", color: "#2563eb",
              border: "1px solid #bfdbfe", borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>📄 View Paper</button>
          )}
        </div>

        {examActive ? (
          <div style={{
            background: "#0f172a", color: "#38bdf8",
            padding: "6px 14px", borderRadius: 8,
            fontFamily: "monospace", fontSize: 14, fontWeight: 700,
          }}>⏱ {elapsed}</div>
        ) : <div style={{ width: 80 }} />}
      </div>

      {/* SPLIT BODY */}
      <div className="exam-split">

        {/* LEFT — Question paper */}
        <div className="exam-left">
          {paperContent ? (
            <>
              {examActive && (
                <div style={{
                  position: "sticky", top: 0, zIndex: 5,
                  background: "#0f172a", color: "#38bdf8",
                  padding: "7px 14px", borderRadius: 8, marginBottom: 16,
                  fontFamily: "monospace", fontSize: 12,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>⏱ {elapsed}</span>
                  {examMeta.subject && <span style={{ opacity: 0.7 }}>📚 {examMeta.subject}</span>}
                </div>
              )}
              <div style={{ fontSize: 13, lineHeight: 1.95, color: "#0f172a", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                {paperContent}
              </div>
            </>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", paddingTop: 60, lineHeight: 1.8 }}>
              Question paper will appear here.<br />
              Tell the examiner your subject, then type <strong style={{ color: "#0f172a" }}>start</strong>.
            </div>
          )}
        </div>

        {/* RIGHT — Chat panel with input pinned inside */}
        <div className="exam-right">

          {/* Chat header */}
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
            background: "#fff", fontSize: 13, fontWeight: 600, color: "#475569",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                background: examActive ? "#22c55e" : examMeta.examEnded ? "#f97316" : "#94a3b8",
                boxShadow: examActive ? "0 0 6px #22c55e" : "none",
              }} />
              {examMeta.examEnded ? "Evaluation Complete" : examActive ? "Type your answers here" : "Examiner Chat"}
            </div>
            {/* Mobile paper button */}
            {paperContent && (
              <button onClick={() => setShowPaper(true)} style={{
                padding: "4px 10px", background: "#eff6ff", color: "#2563eb",
                border: "1px solid #bfdbfe", borderRadius: 7,
                fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>📄 Paper</button>
            )}
          </div>

          {/* Score banner */}
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

          {/* Messages — scrollable area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
            {isLoading && (
              <div style={{ display: "flex", gap: 5, padding: "4px 8px", marginBottom: 6 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#38bdf8",
                    animation: `bounce 1s ${i * 0.15}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input — INSIDE the right panel, pinned to bottom */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
            <ChatInput onSend={handleSend} examStarted={examStarted} disabled={isLoading} inline={true} />
          </div>
        </div>
      </div>

      {/* PAPER OVERLAY — opens on paper generation or "View Paper" click */}
      {showPaper && paperContent && (
        <PaperOverlay
          content={paperContent}
          onClose={() => setShowPaper(false)}
          elapsed={elapsed}
          subject={examMeta.subject}
          examActive={examActive}
        />
      )}
    </div>
  );
}