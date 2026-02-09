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
    {
      role: "assistant",
      content: "Oral Mode 🎤 Speak or type your answer.",
    },
  ]);

  function handleSend(text: string) {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      {
        role: "assistant",
        content: "Good explanation. Let’s refine it further.",
      },
    ]);
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: "24px" }}>
      <h1 style={{ textAlign: "center" }}>Oral Mode</h1>
      <ChatUI messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
