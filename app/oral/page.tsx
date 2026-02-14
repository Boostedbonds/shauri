"use client";

import { useEffect, useRef, useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function OralPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I’m your CBSE learning partner 🎤 You can speak or type your answers. Let’s begin.",
    },
  ]);

  // 🔽 Auto-scroll anchor
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 🔁 Scroll to bottom on message update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

    // 🔹 Read student context
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
        mode: "oral",
        messages: updatedMessages,
        student, // ✅ PASS STUDENT CONTEXT
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
      {/* 🔙 Back */}
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
        Oral Mode
      </h1>

      {/* 💬 Chat area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: 96,
        }}
      >
        <ChatUI messages={messages} isOralMode />
        <div ref={bottomRef} />
      </div>

      {/* ⌨️ Input */}
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
