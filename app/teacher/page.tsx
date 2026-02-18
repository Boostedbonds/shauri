"use client";

import { useEffect, useRef, useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I’m here to help you learn clearly and confidently. What topic would you like to study today?",
    },
  ]);

  // 🔽 Scroll container ref (FIXED)
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // 🔁 Scroll to bottom whenever messages update (CLEAN FIX)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  async function handleSend(text: string, uploadedText?: string) {
    if (!text.trim() && !uploadedText) return;

    let userContent = "";

    if (uploadedText) {
      userContent += `
[UPLOADED STUDY MATERIAL / ANSWER SHEET]
${uploadedText}
`;
    }

    if (text.trim()) {
      userContent += text.trim();
    }

    const userMessage: Message = {
      role: "user",
      content: userContent.trim(),
    };

    const updatedMessages: Message[] = [...messages, userMessage];
    setMessages(updatedMessages);

    let student = null;
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) {
        student = JSON.parse(stored);
      }
    } catch {
      student = null;
    }

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "teacher",
        messages: updatedMessages,
        student,
        uploadedText: uploadedText ?? null,
      }),
    });

    const data = await res.json();

    const aiMessage: Message = {
      role: "assistant",
      content:
        typeof data?.reply === "string"
          ? data.reply
          : "Something went wrong. Please try again.",
    };

    setMessages([...updatedMessages, aiMessage]);
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
      {/* 🔙 Back to Mode Selector */}
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
          ← Modes
        </button>
      </div>

      <h1 style={{ textAlign: "center", marginBottom: 16 }}>
        Teacher Mode
      </h1>

      {/* 💬 Chat area */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: 96,
        }}
      >
        <ChatUI messages={messages} />
      </div>

      {/* ⌨️ Input fixed at bottom */}
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
