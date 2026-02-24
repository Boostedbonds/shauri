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
  const [messages, setMessages]         = useState<Message[]>([]);
  const [examStarted, setExamStarted]   = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading]       = useState(false);

  const timerRef            = useRef<NodeJS.Timeout | null>(null);
  const startTimestampRef   = useRef<number | null>(null);
  const chatContainerRef    = useRef<HTMLDivElement | null>(null);
  const elapsedRef          = useRef(0); // stable ref for saveExamAttempt

  // ── Auto-scroll ──────────────────────────────────────────────
  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // ── FIX 1: Fire opening greeting on mount ───────────────────
  useEffect(() => {
    sendToAPI("", undefined, undefined, true); // isGreeting = true
  }, []);

  // ── Timer ────────────────────────────────────────────────────
  function startTimer(serverStartTime: number) {
    if (timerRef.current) return;
    startTimestampRef.current = serverStartTime;
    setExamStarted(true);
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
    const scorePercent = totalMarks > 0
      ? Math.round((marksObtained / totalMarks) * 100) : 0;

    const attempt: ExamAttempt = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: "examiner",
      subject,
      chapters,
      marksObtained,
      totalMarks,
      scorePercent,
      timeTakenSeconds: timeTaken,
      rawAnswerText: allMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n"),
    };

    try {
      const existing = localStorage.getItem("shauri_exam_attempts");
      const parsed: ExamAttempt[] = existing ? JSON.parse(existing) : [];
      parsed.push(attempt);
      localStorage.setItem("shauri_exam_attempts", JSON.stringify(parsed));
    } catch {}
  }

  // downloadPaperAsPDF removed — PDFDownloadCard inside ChatUI
  // handles the download on user click, avoiding browser auto-download blocks.

  // ── Core API caller ──────────────────────────────────────────
  async function sendToAPI(
    text: string,
    uploadedText?: string,
    uploadType?: "syllabus" | "answer",
    isGreeting = false
  ) {
    setIsLoading(true);

    let student: any = null;
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) student = JSON.parse(stored);
    } catch {}

    // ── FIX 2: history uses raw content, NOT the display label ──
    // We keep two parallel arrays:
    //   messages       → displayed in UI (may have 📎 label)
    //   apiMessages    → what we send to server (always real text)
    // For the greeting, history is empty.

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "examiner",
        message: isGreeting ? "hi" : text,
        uploadedText: uploadedText || "",
        uploadType: uploadType || null,
        history: isGreeting ? [] : messages
          // exclude PDF download card messages from history sent to server
          // and strip display-only upload labels
          .filter((m) => !m.content.startsWith(PDF_MARKER))
          .map((m) => ({
            role: m.role,
            content: m.content
              .replace(/\n\n📋 \[Syllabus uploaded\]/g, "")
              .replace(/\n\n📝 \[Answer uploaded\]/g, "")
              .replace(/\n\n📎 \[Uploaded document attached\]/g, "")
              .trim(),
          })),
        student,
      }),
    });

    const data = await res.json();
    const aiReply: string = typeof data?.reply === "string" ? data.reply : "";

    setIsLoading(false);

    // ── Exam started → kick off timer + inject PDF download card ─
    if (typeof data?.startTime === "number") {
      startTimer(data.startTime);
      // Push the paper content as a special PDF_MARKER message.
      // ChatUI renders it as a clickable download card — no auto-download,
      // no browser blocking, user always in control.
      if (aiReply) {
        const paperOnly = aiReply
          .split("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")[0]
          .trim();
        // Push full paper bubble first, then the download card
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: aiReply },
          { role: "assistant", content: `${PDF_MARKER}${paperOnly}` },
        ]);
        setIsLoading(false);
        return; // messages already set — skip the generic push below
      }
    }

    // ── Exam ended ───────────────────────────────────────────────
    if (data?.examEnded === true) {
      stopTimer();
      const timeTaken = elapsedRef.current;
      const evaluationWithTime = aiReply + `\n\n⏱ Time Taken: ${formatTime(timeTaken)}`;

      setMessages((prev) => [...prev, { role: "assistant", content: evaluationWithTime }]);

      saveExamAttempt(
        messages,
        timeTaken,
        data?.subject ?? "Exam",
        data?.chapters ?? [],
        data?.marksObtained ?? 0,
        data?.totalMarks ?? 0
      );
      return;
    }

    if (aiReply) {
      // ── If exam just started, push paper + a download button message ──
      if (typeof data?.startTime === "number") {
        const paperOnly = aiReply
          .split("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")[0]
          .trim();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: aiReply },
          // ChatUI detects this prefix and renders a download button
          { role: "assistant", content: `__DOWNLOAD_PDF__::${paperOnly}` },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: aiReply }]);
      }
    }
  }

  // ── handleSend — called by ChatInput ────────────────────────
  async function handleSend(
    text: string,
    uploadedText?: string,
    uploadType?: "syllabus" | "answer"
  ) {
    if (!text.trim() && !uploadedText) return;

    // ── FIX 2: display label is separate from what we send to API ──
    // UI shows a friendly label; API always gets the real text/uploadedText
    let displayContent = text.trim();
    if (uploadedText) {
      const label = uploadType === "syllabus"
        ? "📋 [Syllabus uploaded]"
        : "📝 [Answer uploaded]";
      displayContent = displayContent
        ? `${displayContent}\n\n${label}`
        : label;
    }

    const userMessage: Message = { role: "user", content: displayContent };
    setMessages((prev) => [...prev, userMessage]);

    await sendToAPI(text, uploadedText, uploadType);
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: 24, display: "flex", flexDirection: "column" }}>

      {/* ── Back button ── */}
      <div style={{ paddingLeft: 24, marginBottom: 16 }}>
        <button
          onClick={() => (window.location.href = "/modes")}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: 12,
            border: "none",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>

      {/* ── Live timer ── */}
      {examStarted && (
        <div style={{
          position: "fixed",
          top: 16, right: 24,
          background: "#0f172a",
          color: "#ffffff",
          padding: "10px 18px",
          borderRadius: 12,
          fontSize: 18,
          fontWeight: 600,
          zIndex: 100,
        }}>
          ⏱ {formatTime(elapsedSeconds)}
        </div>
      )}

      <h1 style={{ textAlign: "center", marginBottom: 16 }}>Examiner Mode</h1>

      {/* ── Chat area ── */}
      <div ref={chatContainerRef} style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}>
        <ChatUI messages={messages} />

        {/* Loading indicator */}
        {isLoading && (
          <div style={{
            display: "flex", justifyContent: "flex-start",
            padding: "0 24px 12px",
          }}>
            <div style={{
              background: "#f1f5f9",
              borderRadius: 16,
              padding: "12px 18px",
              fontSize: 14,
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ animation: "pulse 1.5s infinite" }}>●</span>
              <span>●</span>
              <span style={{ animation: "pulse 1.5s infinite 0.3s" }}>●</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div style={{ position: "sticky", bottom: 0, background: "#f8fafc", paddingBottom: 16 }}>
        <ChatInput
          onSend={handleSend}
          examStarted={examStarted}
        />
      </div>
    </div>
  );
}