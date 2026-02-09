"use client";

import { useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi 😊 What would you like to study today?",
    },
  ]);

  function handleSend(text: string) {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      {
        role: "assistant",
        content: "Got it! Let’s break it down step by step.",
      },
    ]);
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: "24px" }}>
      <h1 style={{ textAlign: "center" }}>Teacher Mode</h1>
      <ChatUI messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
