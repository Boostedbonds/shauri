"use client";

import { useEffect, useRef, useState } from "react";
import {
  sendChatMessage,
  Mode,
  ChatHistoryItem,
} from "../lib/chat";

export default function ChatBox({ mode }: { mode: Mode }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: ChatHistoryItem = {
      role: "user",
      content: input,
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const reply = await sendChatMessage(mode, input, messages);

    setMessages((m) => [
      ...m,
      { role: "assistant", content: reply },
    ]);

    setLoading(false);
  }

  return (
    <div style={{ height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#2563eb" : "#e5e7eb",
              color: m.role === "user" ? "#fff" : "#000",
              padding: "10px 14px",
              borderRadius: 12,
              maxWidth: "70%",
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && <div>Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 16, borderTop: "1px solid #ddd" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your question…"
          style={{ width: "80%", padding: 10 }}
        />
        <button onClick={handleSend} style={{ marginLeft: 8 }}>
          Send
        </button>
      </div>
    </div>
  );
}
