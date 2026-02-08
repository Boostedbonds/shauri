"use client";

import { useState } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export default function TeacherMode() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  async function send() {
    if (!input.trim()) return;

    const userMsg: Msg = { role: "user", content: input };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "teacher",
        messages: nextMessages,
      }),
    });

    const data = await res.json();
    setMessages((m) => [
      ...m,
      { role: "assistant", content: data.reply },
    ]);
  }

  return (
    <div className="screen">
      <div className="card stack">
        <h2>Teacher Mode</h2>

        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i}>
              <b>{m.role === "user" ? "You:" : "Teacher:"}</b>
              <p>{m.content}</p>
            </div>
          ))}
        </div>

        <textarea
          placeholder="Ask a question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
        />

        <button onClick={send}>Ask</button>
      </div>
    </div>
  );
}
