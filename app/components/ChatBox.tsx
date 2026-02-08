"use client";

import { useState } from "react";
import { sendChatMessage, Mode, ChatHistoryItem } from "../lib/chat";

export default function ChatBox({ mode }: { mode: Mode }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: ChatHistoryItem = {
      role: "user",
      content: input,
    };

    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);
    setInput("");
    setLoading(true);

    const reply = await sendChatMessage(mode, input, history);

    setHistory([
      ...nextHistory,
      { role: "assistant", content: reply },
    ]);

    setLoading(false);
  }

  return (
    <div
      style={{
        height: "calc(100vh - 72px)", // header height compensation
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
      }}
    >
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
        }}
      >
        {history.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              maxWidth: "80%",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#2563eb" : "#e5e7eb",
              color: m.role === "user" ? "#ffffff" : "#0f172a",
              padding: "10px 14px",
              borderRadius: 12,
            }}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: 16,
          borderTop: "1px solid #e5e7eb",
          background: "#ffffff",
          display: "flex",
          gap: 12,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer here..."
          style={{
            flex: 1,
            padding: 12,
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid #cbd5f5",
          }}
        />

        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: "0 20px",
            fontSize: 16,
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
