"use client";

import { useEffect, useRef, useState } from "react";
import ChatUI from "../components/ChatUI";
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [examStarted, setExamStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  function startTimer(serverStartTime: number) {
    if (timerRef.current) return;
    startTimestampRef.current = serverStartTime;
    setExamStarted(true);
    timerRef.current = setInterval(() => {
      if (startTimestampRef.current) {
        const diff = Math.floor(
          (Date.now() - startTimestampRef.current) / 1000
        );
        setElapsedSeconds(diff);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setExamStarted(false);
  }

  useEffect(() => {
    return () => stopTimer();
  }, []);

  function formatTime(seconds: number) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  }

  function saveExamAttempt(
    allMessages: Message[],
    timeTaken: number,
    subject: string,
    chapters: string[],
    marksObtained: number,
    totalMarks: number
  ) {
    const answerText = allMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const scorePercent =
      totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;

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
      rawAnswerText: answerText,
    };

    try {
      const existing = localStorage.getItem("shauri_exam_attempts");
      const parsed: ExamAttempt[] = existing ? JSON.parse(existing) : [];
      parsed.push(attempt);
      localStorage.setItem("shauri_exam_attempts", JSON.stringify(parsed));
    } catch {}
  }

  async function handleSend(text: string, uploadedText?: string) {
    // Allow send if there's either typed text OR an upload
    if (!text.trim() && !uploadedText) return;

    // ── Build what shows in the chat bubble for the user ──────
    // Show typed text; if there's an upload, note it clearly.
    let displayContent = text.trim();
    if (uploadedText) {
      displayContent = displayContent
        ? `${displayContent}\n\n📎 [Uploaded document attached]`
        : `📎 [Uploaded document attached]`;
    }

    const userMessage: Message = {
      role: "user",
      content: displayContent,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    let student = null;
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) student = JSON.parse(stored);
    } catch {}

    // ── Build history (everything except the message just sent) ─
    const historyToSend = updatedMessages
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    // ── FIX: send message and uploadedText as SEPARATE fields ───
    // Backend reads body.message and body.uploadedText independently.
    // Merging them into one string breaks syllabus upload detection
    // and answer sheet recording on the backend.
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "examiner",
        message: text.trim(),           // ✅ typed text only
        uploadedText: uploadedText || "", // ✅ OCR/extracted text as its own field
        history: historyToSend,
        student,
      }),
    });

    const data = await res.json();
    const aiReply: string =
      typeof data?.reply === "string" ? data.reply : "";

    // ── Timer: start when backend confirms exam has begun ───────
    if (typeof data?.startTime === "number") {
      startTimer(data.startTime);
    }

    // ── Exam ended: stop timer, save attempt ───────────────────
    if (data?.examEnded === true) {
      stopTimer();
      const usedSeconds = elapsedSeconds;
      const subject = data?.subject ?? "Exam";
      const chapters = data?.chapters ?? [];
      const marksObtained = data?.marksObtained ?? 0;
      const totalMarks = data?.totalMarks ?? 0;

      const evaluationWithTime =
        aiReply + `\n\n⏱ Time Taken: ${formatTime(usedSeconds)}`;

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: evaluationWithTime },
      ]);

      saveExamAttempt(
        updatedMessages,
        usedSeconds,
        subject,
        chapters,
        marksObtained,
        totalMarks
      );
      return;
    }

    if (aiReply) {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: aiReply },
      ]);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: 24,
        display: "flex",
        flexDirection: "column",
      }}
    >
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

      {examStarted && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 24,
            background: "#0f172a",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 12,
            fontSize: 18,
            fontWeight: 600,
            zIndex: 100,
          }}
        >
          ⏱ {formatTime(elapsedSeconds)}
        </div>
      )}

      <h1 style={{ textAlign: "center", marginBottom: 16 }}>Examiner Mode</h1>

      <div
        ref={chatContainerRef}
        style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}
      >
        <ChatUI messages={messages} />
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "#f8fafc",
          paddingBottom: 16,
        }}
      >
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}