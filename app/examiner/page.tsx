"use client";

import { useEffect, useRef, useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ExaminerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Examiner Mode",
    },
  ]);

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

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  useEffect(() => {
    return () => stopTimer();
  }, []);

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
        timeTakenSeconds: elapsedSeconds, // ⏱️ recorded for evaluation
      }),
    });

    const data = await res.json();

    const aiReply =
      typeof data?.reply === "string" ? data.reply : "";

    if (aiReply) {
      setMessages([...updatedMessages, { role: "assistant", content: aiReply }]);
    } else {
      setMessages(updatedMessages);
    }
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: 24 }}>
      {/* 🔙 Back Button */}
      <div style={{ paddingLeft: 24, marginBottom: 16 }}>
        <button
          onClick={() => (window.location.href = "/")}
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

      {/* ⏱️ TIMER (Top-Right, big & visible) */}
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

      <ChatUI messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
