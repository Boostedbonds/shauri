"use client";

import { useRef, useState } from "react";

type Props = {
  onSend: (message: string, uploadedText?: string) => void;
};

export default function ChatInput({ onSend }: Props) {
  const [value, setValue] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedText, setUploadedText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed && !uploadedText) return;

    onSend(trimmed, uploadedText ?? undefined);

    setValue("");
    clearAttachment();
  }

  function clearAttachment() {
    setFileName(null);
    setUploadedText(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // 🔒 STUB extraction (safe)
    if (file.type === "application/pdf") {
      setUploadedText(
        `Student uploaded a PDF file named "${file.name}". Treat this as provided study material or answer sheet.`
      );
    } else if (file.type.startsWith("image/")) {
      setUploadedText(
        `Student uploaded an image file named "${file.name}". Treat this as provided study material or answer sheet.`
      );
    } else {
      setUploadedText(
        `Student uploaded a file named "${file.name}". Treat this as provided content.`
      );
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "white",
          borderRadius: 18,
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {fileName && (
          <div
            style={{
              fontSize: 13,
              color: "#475569",
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingLeft: 6,
            }}
          >
            📎 {fileName}
            <button
              onClick={clearAttachment}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                color: "#ef4444",
              }}
              title="Remove attachment"
            >
              ✕
            </button>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* ➕ Attachment button (LEFT like ChatGPT) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#e2e8f0",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Attach PDF or Image"
          >
            +
          </button>

          {/* Text input */}
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask StudyMate anything…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              fontSize: 16,
              lineHeight: "1.5",
              padding: "12px 14px",
              borderRadius: 12,
              background: "#f8fafc",
              minHeight: 44,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            style={{
              background: "#38bdf8",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "10px 18px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
