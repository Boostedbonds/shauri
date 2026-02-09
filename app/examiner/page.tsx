"use client";

import React, { useState } from "react";
import ChatUI, { ChatMessage } from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

export default function ExaminerPage() {
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
      body: JSON.stringify({
        message: text,
        mode: "examiner",
      }),
    });

    const data = await res.json();

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: data?.reply ?? "No response",
    };

    setMessages((prev) => [...prev, aiMsg]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-32">
      <header className="px-6 py-4 border-b bg-white">
        <h1 className="text-2xl font-semibold">StudyMate — Examiner</h1>
        <p className="text-sm text-gray-500">
          Answer evaluation & exam-style responses
        </p>
      </header>

      <main className="flex-1 overflow-y-auto py-8">
        <ChatUI messages={messages} />
      </main>

      <ChatInput onSend={sendMessage} />
    </div>
  );
}
