"use client";

import { useEffect, useRef, useState } from "react";
import ChatUI from "../components/ChatUI";
import ChatInput from "../components/ChatInput";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading]   = useState(false);

  const greetingFiredRef = useRef(false);
  const isSendingRef     = useRef(false);
  const sessionIdRef     = useRef<string>(crypto.randomUUID());

  // ── Opening greeting ─────────────────────────────────────────
  useEffect(() => {
    if (greetingFiredRef.current) return;
    greetingFiredRef.current = true;
    sendToAPI("hi", undefined, undefined, true);
  }, []);

  // ── Core API caller ──────────────────────────────────────────
  async function sendToAPI(
    text: string,
    uploadedText?: string,
    uploadType?: "syllabus" | "answer",
    isGreeting = false
  ) {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsLoading(true);

    let student: any = null;
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) student = JSON.parse(stored);
    } catch {}

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "teacher",
          message: text,
          uploadedText: uploadedText || "",
          uploadType: uploadType || null,
          history: isGreeting ? [] : messages.map(m => ({ role: m.role, content: m.content })),
          student: { ...student, sessionId: sessionIdRef.current },
        }),
      });

      const data = await res.json();
      const aiReply: string = typeof data?.reply === "string" ? data.reply : "";
      if (aiReply) {
        setMessages(prev => [...prev, { role: "assistant", content: aiReply }]);
      }
    } catch (err) {
      console.error("[Teacher sendToAPI] fetch failed:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
    }
  }

  async function handleSend(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer") {
    if (!text.trim() && !uploadedText) return;
    if (isSendingRef.current) return;

    setMessages(prev => [...prev, { role: "user", content: text.trim() }]);
    await sendToAPI(text, uploadedText, uploadType);
  }

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "#f8fafc",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        flexShrink: 0,
        zIndex: 20,
      }}>
        <button
          onClick={() => (window.location.href = "/modes")}
          style={{
            padding: "7px 14px", background: "#f1f5f9",
            color: "#374151", borderRadius: 8, border: "1px solid #e2e8f0",
            fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}
        >
          ← Back
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", letterSpacing: "0.05em" }}>
          📚 Teacher Mode
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* ── Main: ChatUI fills remaining height ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ChatUI
            messages={messages}
            mode="teacher"
          />
        </div>

        {/* Loading dots */}
        {isLoading && (
          <div style={{
            padding: "8px 32px", background: "#fff",
            borderTop: "1px solid #f1f5f9", fontSize: 13, color: "#64748b",
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          }}>
            <span>●</span><span>●</span><span>●</span>
          </div>
        )}

        {/* ── Input — fixed to bottom-left 80% (chat area only) ── */}
        <div style={{
          background: "#fff", borderTop: "1px solid #e2e8f0",
          padding: "10px 16px", display: "flex",
          justifyContent: "flex-start", flexShrink: 0,
        }}>
          {/* 78% width to align with chat area, leaving room for dictionary panel */}
          <div style={{ width: "78%" }}>
            <ChatInput
              onSend={handleSend}
              disabled={isLoading}
              inline
            />
          </div>
        </div>
      </div>
    </div>
  );
}