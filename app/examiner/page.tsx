"use client";

import { useState } from "react";
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
      content: "Examiner Mode 📘 Ready for practice questions?",
    },
  ]);

  function handleSend(text: string) {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      {
        role: "assistant",
        content: "Answer noted. I’ll evaluate it shortly.",
      },
    ]);
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: "24px" }}>
      <h1 style={{ textAlign: "center" }}>Examiner Mode</h1>
      <ChatUI messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
