"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onSend: (message: string, uploadedText?: string, uploadType?: "syllabus" | "answer") => void;
  examStarted?: boolean;
  disabled?: boolean;
  inline?: boolean; // ← when true, renders inline (no fixed positioning) for split layout
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

// ─────────────────────────────────────────────────────────────
// PDF TEXT EXTRACTION
// ─────────────────────────────────────────────────────────────
async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(" "));
    }
    const fullText = pages.join("\n\n").trim();
    return fullText.length > 20 ? fullText : "";
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────
// IMAGE → BASE64
// ─────────────────────────────────────────────────────────────
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processFile(file: File): Promise<{ text: string; isImage: boolean }> {
  if (file.type === "application/pdf") {
    const text = await extractPdfText(file);
    return { text, isImage: false };
  }
  if (file.type.startsWith("image/")) {
    const base64 = await imageToBase64(file);
    return { text: `[IMAGE_BASE64]\n${base64}`, isImage: true };
  }
  return { text: "", isImage: false };
}

export default function ChatInput({
  onSend,
  examStarted = false,
  disabled = false,
  inline = false,
}: Props) {
  const [value, setValue]               = useState("");
  const [fileNames, setFileNames]       = useState<string[]>([]);
  const [uploadedText, setUploadedText] = useState<string | null>(null);
  const [uploadType, setUploadType]     = useState<"syllabus" | "answer">("syllabus");
  const [processing, setProcessing]     = useState(false);
  const [listening, setListening]       = useState(false);

  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const textareaRef    = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const isBlocked = disabled || processing;

  /* ── Mic setup ── */
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join(" ");
      setValue(prev => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  function toggleMic() {
    if (!recognitionRef.current) { alert("Microphone not supported."); return; }
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else { recognitionRef.current.start(); setListening(true); }
  }

  function clearAttachment() {
    setFileNames([]);
    setUploadedText(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setProcessing(true);
    setFileNames(files.map(f => f.name));
    const type: "syllabus" | "answer" = examStarted ? "answer" : "syllabus";
    setUploadType(type);
    const results = await Promise.all(files.map(processFile));
    const combined = results.map((r, i) => {
      if (!r.text) {
        const fileType = files[i].type.startsWith("image/") ? "IMAGE" : "PDF";
        return `[UNREADABLE_${fileType}]\nFile: ${files[i].name}\nNote: Text could not be extracted.`;
      }
      return r.text;
    }).join("\n\n---\n\n");
    setUploadedText(combined);
    setProcessing(false);
  }

  function handleSend() {
    if (isBlocked) return;
    const trimmed = value.trim();
    if (!trimmed && !uploadedText) return;
    onSend(trimmed, uploadedText ?? undefined, uploadedText ? uploadType : undefined);
    setValue("");
    clearAttachment();
    textareaRef.current?.blur();
  }

  const uploadLabel = uploadType === "syllabus" ? "📋 Syllabus upload" : "📝 Answer upload";

  // ── Inline styles (used in split layout) ──
  const containerStyle: React.CSSProperties = inline
    ? {
        width: "100%",
        background: "white",
        borderRadius: 14,
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #e2e8f0",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        opacity: disabled ? 0.6 : 1,
        transition: "opacity 0.2s",
      }
    : {
        position: "fixed",
        bottom: 24,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 50,
      };

  const innerStyle: React.CSSProperties = inline
    ? { display: "flex", flexDirection: "column", gap: 6 }
    : {
        width: "100%",
        maxWidth: 720,
        background: "white",
        borderRadius: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        opacity: disabled ? 0.6 : 1,
        transition: "opacity 0.2s",
      };

  const inputContent = (
    <>
      {processing && (
        <div style={{ fontSize: 13, color: "#2563eb", paddingLeft: 6 }}>⏳ Extracting content from file…</div>
      )}
      {disabled && !processing && (
        <div style={{ fontSize: 13, color: "#64748b", paddingLeft: 6 }}>⏳ Waiting for response…</div>
      )}
      {fileNames.length > 0 && !processing && (
        <div style={{ fontSize: 13, color: "#475569", display: "flex", flexDirection: "column", gap: 4, paddingLeft: 6 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: uploadType === "syllabus" ? "#eff6ff" : "#f0fdf4",
            color: uploadType === "syllabus" ? "#2563eb" : "#059669",
            fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 50,
            alignSelf: "flex-start", marginBottom: 2,
          }}>
            {uploadLabel}
          </div>
          {fileNames.map((name, i) => <div key={i}>📎 {name}</div>)}
          {uploadedText?.includes("[UNREADABLE_") && (
            <div style={{ fontSize: 12, color: "#ea580c", marginTop: 2 }}>
              ⚠️ Could not extract text from this file.
            </div>
          )}
          <button
            onClick={clearAttachment}
            disabled={isBlocked}
            style={{ border: "none", background: "transparent", cursor: isBlocked ? "not-allowed" : "pointer", fontSize: 14, color: "#ef4444", alignSelf: "flex-start", padding: 0 }}
          >
            ✕ Remove
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileChange}
          style={{ display: "none" }}
          disabled={isBlocked}
        />
        <button
          type="button"
          onClick={() => !isBlocked && fileInputRef.current?.click()}
          disabled={isBlocked}
          style={{
            width: 38, height: 38, borderRadius: 9,
            background: isBlocked ? "#f1f5f9" : "#e2e8f0",
            border: "none", fontSize: 20,
            cursor: isBlocked ? "not-allowed" : "pointer", flexShrink: 0,
          }}
          title={examStarted ? "Upload answer (PDF or image)" : "Upload syllabus (PDF or image)"}
        >
          +
        </button>

        <button
          type="button"
          onClick={toggleMic}
          disabled={isBlocked}
          style={{
            width: 38, height: 38, borderRadius: "50%", border: "none",
            background: listening ? "#dc2626" : "#e5e7eb",
            color: listening ? "#ffffff" : "#0f172a",
            fontSize: 16, cursor: isBlocked ? "not-allowed" : "pointer", flexShrink: 0,
          }}
        >
          {listening ? "■" : "🎤"}
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={disabled ? "Waiting…" : "Type or speak…"}
          rows={1}
          disabled={isBlocked}
          style={{
            flex: 1, resize: "none", border: "none", outline: "none",
            fontSize: 15, lineHeight: "1.5", padding: "10px 12px",
            borderRadius: 10, background: isBlocked ? "#f1f5f9" : "#f8fafc",
            minHeight: 42, cursor: isBlocked ? "not-allowed" : "text",
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />

        <button
          onClick={handleSend}
          disabled={isBlocked}
          style={{
            background: isBlocked ? "#94a3b8" : "#38bdf8",
            color: "white", border: "none", borderRadius: 10,
            padding: "9px 16px", fontSize: 14, fontWeight: 700,
            cursor: isBlocked ? "not-allowed" : "pointer",
            flexShrink: 0, transition: "background 0.2s",
          }}
        >
          Send
        </button>
      </div>
    </>
  );

  if (inline) {
    return <div style={containerStyle}>{inputContent}</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>{inputContent}</div>
    </div>
  );
}