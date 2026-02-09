"use client";

import { useEffect, useRef, useState } from "react";
import { sendChatMessage, Mode, ChatHistoryItem } from "../lib/chat";
import { startSpeechRecognition } from "../lib/speech";

export default function ChatBox({ mode }: { mode: Mode }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      textareaRef.current.scrollHeight + "px";
  }, [input]);

  async function handleSend() {
    if (loading) return;

    let content = input.trim();

    if (uploadedFile) {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json()) as { text?: string } | null;
        content = data?.text?.trim() || content;
      } catch {}
      setUploadedFile(null);
    }

    if (!content) return;

    const userMsg: ChatHistoryItem = {
      role: "user",
      content,
    };

    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);
    setInput("");
    setLoading(true);

    const reply = await sendChatMessage(mode, content, history);

    setHistory([...nextHistory, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleMic() {
    startSpeechRecognition(
      (text) => {
        setInput((prev) => (prev ? prev + " " + text : text));
      },
      () => {}
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadedFile(file);
  }

  return (
    <div
      style={{
        height: "calc(100vh - 72px)",
        display: "flex",
        flexDirection: "column",
        background: "#f1f5f9",
      }}
    >
      {/* CHAT */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {history.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: "78%",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#2563eb" : "#e5e7eb",
              color: m.role === "user" ? "#ffffff" : "#0f172a",
              padding: "14px 18px",
              borderRadius: 16,
              fontSize: 18,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "#e5e7eb",
              padding: "12px 16px",
              borderRadius: 14,
              fontSize: 16,
            }}
          >
            StudyMate is thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* COMPOSER */}
      <div
        style={{
          padding: "20px",
          background: "#ffffff",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 820,
            border: "1px solid #cbd5f5",
            borderRadius: 18,
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              title="Upload file"
              onClick={() => fileInputRef.current?.click()}
              style={{
                fontSize: 20,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              📎
            </button>

            <button
              type="button"
              title="Use microphone"
              onClick={handleMic}
              style={{
                fontSize: 20,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              🎤
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your answer here… (Shift + Enter for new line)"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              fontSize: 18,
              lineHeight: 1.6,
              maxHeight: 400,
            }}
          />

          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 12,
              padding: "10px 18px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
