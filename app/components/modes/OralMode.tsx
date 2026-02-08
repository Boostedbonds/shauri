"use client";

import { useState } from "react";
import { getActiveProfile } from "../../lib/profiles";
import { saveInsight } from "../../lib/analytics";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export default function OralMode() {
  const profile = getActiveProfile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState("");

  if (!profile) {
    return (
      <div className="screen">
        <div className="card">No child selected.</div>
      </div>
    );
  }

  async function send() {
    if (!input.trim()) return;

    const userMsg: Msg = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "oral",
        messages: next,
      }),
    });

    const data = await res.json();
    const reply = data.reply as string;

    setMessages(m => [...m, { role: "assistant", content: reply }]);

    /* ── SIMPLE UNDERSTANDING HEURISTIC ── */
    let level: "weak" | "partial" | "strong" = "partial";

    if (
      reply.toLowerCase().includes("not correct") ||
      reply.toLowerCase().includes("let me explain again")
    ) {
      level = "weak";
    } else if (
      reply.toLowerCase().includes("good") ||
      reply.toLowerCase().includes("correct")
    ) {
      level = "strong";
    }

    if (topic.trim()) {
      saveInsight({
        childId: profile.id,
        topic: topic.trim(),
        level,
        date: new Date().toLocaleString(),
      });
    }
  }

  return (
    <div className="screen">
      <div className="card stack">
        <h2>Oral Mode – {profile.name}</h2>

        <input
          placeholder="Current topic (e.g. Motion)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <div style={{ maxHeight: 250, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i}>
              <b>{m.role === "user" ? "You:" : "Teacher:"}</b>
              <p>{m.content}</p>
            </div>
          ))}
        </div>

        <input
          placeholder="Answer or ask"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
