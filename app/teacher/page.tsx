"use client";

import { useState } from "react";
import ChatUI from "@/components/ChatUI";
import ChatInput from "@/components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi 😊 What would you like to study today?" },
  ]);

  async function handleSend(text: string) {
    const updated = [...messages, { role: "user", content: text }];
    setMessages(updated);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: updated }),
    });

    const data = await res.json();

    setMessages([
      ...updated,
      { role: "assistant", content: data.reply },
    ]);
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: 32 }}>
      <h1 style={{ textAlign: "center" }}>Teacher Mode</h1>
      <ChatUI messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
