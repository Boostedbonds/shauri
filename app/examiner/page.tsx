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
  timeTakenSeconds: number;
  rawAnswerText: string;
};

export default function ExaminerPage() {
  // ❌ Removed duplicate "Examiner Mode" chat message
  const [messages, setMessages] = useState<Message[]>([]);

  // ⏱️ Timer state
  const [examStarted, setExamStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function startTimer() {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopTimer();
  }, []);

  function extractSubjectInfo(allMessages: Message[]) {
    const userTexts = allMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content.toLowerCase());

    const joined = userTexts.join(" ");

    let subject = "Unknown";
    if (joined.includes("math")) subject = "Maths";
    else if (joined.includes("science")) subject = "Science";
    else if (joined.includes("english")) subject = "English";
    else if (joined.includes("sst") || joined.includes("social"))
      subject = "Social Science";
    else if (joined.includes("hindi")) subject = "Hindi";

    return {
      subject,
      chapters: [],
    };
  }

  function saveExamAttempt(allMessages: Message[]) {
    const { subject, chapters } = extractSubjectInfo(allMessages);

    const answerText = allMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const attempt: ExamAttempt = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode: "examiner",
      subject,
      chapters,
      timeTakenSeconds: elapsedSeconds,
      rawAnswerText: answerText,
    };

    const existing = localStorage.getItem("studymate_exam_attempts");
    const parsed: ExamAttempt[] = existing ? JSON.parse(existing) : [];

    parsed.push(attempt);

    localStorage.setItem(
      "studymate_exam_attempts",
      JSON.stringify(parsed)
    );
  }

  async function handleSend(text: string, uploadedText?: string) {
    if (!text.trim() && !uploadedText) return;

    const normalized = text.trim().toUpperCase();

    // ▶️ START / BEGIN
    if (!examStarted && (normalized === "START" || normalized === "BEGIN")) {
      setExamStarted(true);
      startTimer();
    }

    // ⏹️ SUBMIT / DONE / STOP
    if (
      examStarted &&
      ["SUBMIT", "DONE", "STOP", "END TEST"].includes(normalized)
    ) {
      stopTimer();
      saveExamAttempt(messages);
    }

    let userContent = "";

    if (uploadedText) {
      userContent += `
[UPLOADED STUDY MATERIAL / ANSWER SHEET]
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

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "examiner",
        messages: updatedMessages,
        uploadedText: uploadedText ?? null,
        timeTakenSeconds: elapsedSeconds,
      }),
    });

    const data = await res.json();
    const aiReply = typeof data?.reply === "string" ? data.reply : "";

    if (aiReply) {
      setMessages([...updatedMessages, { role: "assistant", content: aiReply }]);
    } else {
      setMessages(updatedMessages);
    }
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: 24 }}>
      {/* 🔙 Back → Mode Selector (NOT logout) */}
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

      {/* ⏱️ TIMER */}
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
          ⏱ {elapsedSeconds}s
        </div>
      )}

      {/* ✅ Single heading only */}
      <h1 style={{ textAlign: "center", marginBottom: 16 }}>
        Examiner Mode
      </h1>

      <ChatUI messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
