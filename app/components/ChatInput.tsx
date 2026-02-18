"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onSend: (message: string, uploadedText?: string) => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function ChatInput({ onSend }: Props) {
  const [value, setValue] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [uploadedText, setUploadedText] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  /* -------------------- MIC SETUP -------------------- */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");

      setValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
  }, []);

  function toggleMic() {
    if (!recognitionRef.current) {
      alert("Microphone is not supported in this browser.");
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  /* -------------------- ATTACHMENT -------------------- */

  function clearAttachment() {
    setFileNames([]);
    setUploadedText(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const names = files.map((file) => file.name);
    setFileNames(names);

    const combinedText = files
      .map((file, index) => {
        if (file.type === "application/pdf") {
          return `Page ${index + 1}: PDF file "${file.name}" uploaded.`;
        } else if (file.type.startsWith("image/")) {
          return `Page ${index + 1}: Image file "${file.name}" uploaded.`;
        } else {
          return `Page ${index + 1}: File "${file.name}" uploaded.`;
        }
      })
      .join("\n");

    setUploadedText(
      `Student uploaded the following answer sheets:\n${combinedText}`
    );
  }

  /* -------------------- SEND -------------------- */

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed && !uploadedText) return;

    onSend(trimmed, uploadedText ?? undefined);

    setValue("");
    clearAttachment();
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
        {/* 📎 Attachment preview */}
        {fileNames.length > 0 && (
          <div
            style={{
              fontSize: 13,
              color: "#475569",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              paddingLeft: 6,
            }}
          >
            {fileNames.map((name, i) => (
              <div key={i}>📎 {name}</div>
            ))}
            <button
              onClick={clearAttachment}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                color: "#ef4444",
                alignSelf: "flex-start",
              }}
              title="Remove attachments"
            >
              ✕ Remove
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* ➕ Attachment */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
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
            title="Attach PDF or Images"
          >
            +
          </button>

          {/* 🎤 Mic */}
          <button
            type="button"
            onClick={toggleMic}
            title={listening ? "Stop listening" : "Start speaking"}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              background: listening ? "#dc2626" : "#e5e7eb",
              color: listening ? "#ffffff" : "#0f172a",
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {listening ? "■" : "🎤"}
          </button>

          {/* ✍️ Text input */}
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type or speak…"
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

              // ✅ FIX: allow arrow keys to scroll page when input is empty
              if (
                (e.key === "ArrowUp" || e.key === "ArrowDown") &&
                value.trim() === ""
              ) {
                e.currentTarget.blur();
                window.scrollBy({
                  top: e.key === "ArrowDown" ? 120 : -120,
                  behavior: "smooth",
                });
              }
            }}
          />

          {/* ➤ Send */}
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
