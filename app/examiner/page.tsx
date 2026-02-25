"use client";

import { useEffect, useRef, useState } from "react";
import ChatUI, { PDF_MARKER } from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ExamAttempt = {
  id: string;
  date: string;
  mode: "examiner";
  subject: string;
  chapters: string[];
  marksObtained: number;
  totalMarks: number;
  scorePercent?: number;
  timeTakenSeconds: number;
  rawAnswerText: string;
};

export default function ExaminerPage() {
  const [messages, setMessages]             = useState<Message[]>([]);
  const [examStarted, setExamStarted]       = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading]           = useState(false);
  const [examMeta, setExamMeta]             = useState<{
    startTime?: number;
    examEnded?: boolean;
    marksObtained?: number;
    totalMarks?: number;
    percentage?: number;
    timeTaken?: string;
    subject?: string;
  }>({});

  const timerRef          = useRef<NodeJS.Timeout | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const elapsedRef        = useRef(0);
  const sessionIdRef      = useRef<string>(crypto.randomUUID());
  const greetingFiredRef  = useRef(false);
  const isSendingRef      = useRef(false);

  // ── Fire opening greeting exactly once on mount ──────────────
  useEffect(() => {
    if (greetingFiredRef.current) return;
    greetingFiredRef.current = true;

    const storageKey = `shauri_greeted_${sessionIdRef.current}`;
    const alreadyGreeted = sessionStorage.getItem(storageKey);
    if (!alreadyGreeted) {
      sessionStorage.setItem(storageKey, "1");
      sendToAPI("", undefined, undefined, true);
    }
  }, []);

  // ── Timer ────────────────────────────────────────────────────
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

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  }

  // ── Save attempt locally ─────────────────────────────────────
  function saveExamAttempt(
    allMessages: Message[],
    timeTaken: number,
    subject: string,
    chapters: string[],
    marksObtained: number,
    totalMarks: number
  ) {
    const scorePercent = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;
    const attempt: ExamAttempt = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: "examiner",
      subject, chapters, marksObtained, totalMarks, scorePercent,
      timeTakenSeconds: timeTaken,
      rawAnswerText: allMessages.filter(m => m.role === "user").map(m => m.content).join("\n\n"),
    };
    try {
      const existing = localStorage.getItem("shauri_exam_attempts");
      const parsed: ExamAttempt[] = existing ? JSON.parse(existing) : [];
      parsed.push(attempt);
      localStorage.setItem("shauri_exam_attempts", JSON.stringify(parsed));
    } catch {}
  }

  // ── Core API caller ──────────────────────────────────────────
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
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) student = JSON.parse(stored);
    } catch {}

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "examiner",
          message: isGreeting ? "hi" : text,
          uploadedText: uploadedText || "",
          uploadType: uploadType || null,
          history: isGreeting ? [] : messages
            .filter(m => !m.content.startsWith(PDF_MARKER))
            .map(m => ({
              role: m.role,
              content: m.content
                .replace(/\n\n📋 \[Syllabus uploaded\]/g, "")
                .replace(/\n\n📝 \[Answer uploaded\]/g, "")
                .replace(/\n\n📎 \[Uploaded document attached\]/g, "")
                .trim(),
            })),
          student: { ...student, sessionId: sessionIdRef.current },
        }),
      });

      const data = await res.json();
      const aiReply: string = typeof data?.reply === "string" ? data.reply : "";

      // ── Exam started ─────────────────────────────────────────
      if (typeof data?.startTime === "number") {
        startTimer(data.startTime);
        // Extract subject from paper for examMeta
        const subjectMatch = aiReply.match(/Subject\s*[:\|]\s*(.+)/i);
        const detectedSubject = subjectMatch ? subjectMatch[1].trim() : data?.subject;
        setExamMeta(prev => ({ ...prev, startTime: data.startTime, subject: detectedSubject }));

        if (aiReply) {
          const paperOnly = aiReply
            .split("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")[0]
            .trim();
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: aiReply },
            { role: "assistant", content: `${PDF_MARKER}${paperOnly}` },
          ]);
        }
        return;
      }

      // ── Exam ended ───────────────────────────────────────────
      if (data?.examEnded === true) {
        stopTimer();
        const timeTaken = elapsedRef.current;
        const evaluationWithTime = aiReply + `\n\n⏱ Time Taken: ${formatTime(timeTaken)}`;
        setMessages(prev => [...prev, { role: "assistant", content: evaluationWithTime }]);
        setExamMeta(prev => ({
          ...prev,
          examEnded: true,
          marksObtained: data?.marksObtained ?? 0,
          totalMarks: data?.totalMarks ?? 0,
          percentage: data?.percentage ?? 0,
          timeTaken: data?.timeTaken ?? formatTime(timeTaken),
          subject: data?.subject ?? prev.subject,
        }));
        saveExamAttempt(messages, timeTaken, data?.subject ?? "Exam", data?.chapters ?? [], data?.marksObtained ?? 0, data?.totalMarks ?? 0);
        return;
      }

      // ── Normal reply ─────────────────────────────────────────
      if (aiReply) {
        setMessages(prev => [...prev, { role: "assistant", content: aiReply }]);
      }

    } catch (err) {
      console.error("[sendToAPI] fetch failed:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Network error. Please check your connection and try again." }]);
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }

  // ── handleSend ───────────────────────────────────────────────
  async function handleSend(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer") {
    if (!text.trim() && !uploadedText) return;
    if (isSendingRef.current) return;

    let displayContent = text.trim();
    if (uploadedText) {
      const label = uploadType === "syllabus" ? "📋 [Syllabus uploaded]" : "📝 [Answer uploaded]";
      displayContent = displayContent ? `${displayContent}\n\n${label}` : label;
    }

    setMessages(prev => [...prev, { role: "user", content: displayContent }]);
    await sendToAPI(text, uploadedText, uploadType);
  }

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "#f8fafc",
    }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        flexShrink: 0,
        zIndex: 20,
      }}>
        <button
          onClick={() => (window.location.href = "/modes")}
          style={{
            padding: "7px 14px",
            background: "#f1f5f9",
            color: "#374151",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back
        </button>

        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "0.05em" }}>
          📋 Examiner Mode
        </div>

        {/* Floating timer in top bar when exam active */}
        {examStarted && (
          <div style={{
            background: "#0f172a", color: "#38bdf8",
            padding: "6px 14px", borderRadius: 8,
            fontFamily: "monospace", fontSize: 14, fontWeight: 700,
          }}>
            ⏱ {formatTime(elapsedSeconds)}
          </div>
        )}

        {!examStarted && <div style={{ width: 80 }} />}
      </div>

      {/* ── Main area: split view fills remaining height ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* ChatUI takes full height for the split */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ChatUI
            messages={messages}
            mode="examiner"
            examMeta={examMeta}
          />
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div style={{
            padding: "8px 24px",
            background: "#fff",
            borderTop: "1px solid #f1f5f9",
            fontSize: 13,
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}>
            <span style={{ animation: "pulse 1.5s infinite" }}>●</span>
            <span>●</span>
            <span style={{ animation: "pulse 1.5s infinite 0.3s" }}>●</span>
          </div>
        )}

        {/* ── Input bar — sits in the right half ── */}
        <div style={{
          background: "#fff",
          borderTop: "1px solid #e2e8f0",
          padding: "10px 16px",
          // Align input to the right 50% to match the answer panel
          display: "flex",
          justifyContent: "flex-end",
          flexShrink: 0,
        }}>
          <div style={{ width: "50%" }}>
            <ChatInput
              onSend={handleSend}
              examStarted={examStarted}
              disabled={isLoading}
              inline
            />
          </div>
        </div>
      </div>
    </div>
  );
}