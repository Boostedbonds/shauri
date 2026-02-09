"use client";

import { useState } from "react";
import ChatUI, { ChatMessage } from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

export default function TeacherPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: data.reply,
    };

    setMessages((prev) => [...prev, aiMsg]);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">StudyMate</h1>
        <p className="text-sm text-gray-500">
          CBSE Class 9 Learning Platform
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <ChatUI messages={messages} />
      </main>

      <ChatInput onSend={sendMessage} />
    </div>
  );
}
