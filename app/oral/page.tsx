"use client";

import { useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function OralPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Oral Mode 🎤 Speak or type your answer." },
  ]);

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

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "oral", // 🔒 Oral Mode enforced
        messages: updatedMessages,
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

      <h1 style={{ textAlign: "center", marginBottom: 16 }}>
        Oral Mode
      </h1>

      {/* 🔊 Voice-enabled ChatUI */}
      <ChatUI messages={messages} isOralMode />

      <ChatInput onSend={handleSend} />
    </div>
  );
}
