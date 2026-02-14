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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================= STOPWATCH ================= */

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

  /* ================= SAVE ATTEMPT ================= */

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
      totalMarks > 0
        ? Math.round((marksObtained / totalMarks) * 100)
        : 0;

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
      const parsed: ExamAttempt[] = existing
        ? JSON.parse(existing)
        : [];
      parsed.push(attempt);
      localStorage.setItem(
        "shauri_exam_attempts",
        JSON.stringify(parsed)
      );
    } catch {}
  }

  /* ================= HANDLE SEND ================= */

  async function handleSend(text: string, uploadedText?: string) {
    if (!text.trim() && !uploadedText) return;

    let userContent = "";

    if (uploadedText) {
      userContent += `
[UPLOADED ANSWER SHEET]
${uploadedText}
`;
    }

    userContent += text.trim();

    const userMessage: Message = {
      role: "user",
      content: userContent.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    let student = null;
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) student = JSON.parse(stored);
    } catch {}

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "examiner",
        messages: updatedMessages,
        student,
      }),
    });

    const data = await res.json();
    const aiReply: string =
      typeof data?.reply === "string" ? data.reply : "";

    /* ✅ START TIMER FROM SERVER TIME */
    if (typeof data?.startTime === "number") {
      startTimer(data.startTime);
    }

    /* ✅ STOP TIMER ON SUBMIT */
    if (data?.examEnded === true) {
      stopTimer();

      const usedSeconds = elapsedSeconds;

      const subject = data?.subject ?? "Exam";
      const chapters = data?.chapters ?? [];
      const marksObtained = data?.marksObtained ?? 0;
      const totalMarks = data?.totalMarks ?? 0;

      const evaluationWithTime =
        aiReply +
        `\n\n⏱ Time Taken: ${formatTime(usedSeconds)}`;

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

  /* ================= UI ================= */

  return (
    <div style={{ minHeight: "100vh", paddingTop: 24, display: "flex", flexDirection: "column" }}>
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

      <h1 style={{ textAlign: "center", marginBottom: 16 }}>
        Examiner Mode
      </h1>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}>
        <ChatUI messages={messages} />
        <div ref={bottomRef} />
      </div>

      <div style={{ position: "sticky", bottom: 0, background: "#f8fafc", paddingBottom: 16 }}>
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}
