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
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
        {history.map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <b>{m.role === "user" ? "You" : "Study Mate"}:</b>{" "}
            {m.content}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, padding: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type here…"
          style={{ flex: 1 }}
        />
        <button onClick={handleSend} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
