"use client";
import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages: Message[];
  isOralMode?: boolean;
  language?: "en-IN" | "hi-IN";
  mode?: "teacher" | "examiner" | "oral" | "practice" | "revision" | "progress";
  examMeta?: {
    startTime?: number;
    examEnded?: boolean;
    marksObtained?: number;
    totalMarks?: number;
    percentage?: number;
    timeTaken?: string;
    subject?: string;
  };
};

export const PDF_MARKER = "__DOWNLOAD_PDF__::";

const UPLOAD_MARKERS = [
  "[UPLOADED STUDY MATERIAL / ANSWER SHEET]",
  "[UPLOADED ANSWER — IMAGE/PDF]",
];

function splitUploadedContent(content: string) {
  if (!content) return { uploaded: null, text: "" };

  for (const marker of UPLOAD_MARKERS) {
    if (content.includes(marker)) {
      const [text, uploaded = ""] = content.split(marker);
      return { uploaded: uploaded.trim() || null, text: text.trim() };
    }
  }
  return { uploaded: null, text: content };
}

/* ================= PDF ================= */
function PDFDownloadCard({ paperContent, subject }: { paperContent: string; subject?: string }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    try {
      setDownloading(true);
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: paperContent ?? "" }),
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = subject
        ? `${subject.replace(/\s+/g, "-")}-question-paper.pdf`
        : "paper.pdf";

      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("PDF download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button onClick={handleDownload} disabled={downloading}>
      {downloading ? "Generating..." : "Download PDF"}
    </button>
  );
}

/* ================= TIMER ================= */
function useElapsed(startTime?: number) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startTime) return;

    const tick = () => {
      const s = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      setElapsed(`${m}m ${sec}s`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}

/* ================= EXAMINER VIEW ================= */
function ExaminerSplitView({
  messages,
  examMeta,
  elapsed,
}: {
  messages: Message[];
  examMeta?: Props["examMeta"];
  elapsed: string;
}) {
  const paperMessage = messages?.find(
    (m) =>
      m?.role === "assistant" &&
      m?.content &&
      (m.content.includes("SECTION A") || m.content.includes("Maximum Marks"))
  );

  const chatMessages =
    messages?.filter((m) => m !== paperMessage && !m?.content?.startsWith(PDF_MARKER)) || [];

  const examActive = Boolean(examMeta?.startTime && !examMeta?.examEnded);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: "50%", padding: 20 }}>
        {examActive && <div>⏱ {elapsed}</div>}
        <pre>{paperMessage?.content || "Waiting for paper..."}</pre>
      </div>

      <div style={{ width: "50%", padding: 20 }}>
        {chatMessages.map((m, i) => (
          <div key={i}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= MAIN ================= */
export default function ChatUI({
  messages = [],
  isOralMode = false,
  language = "en-IN",
  mode = "teacher",
  examMeta,
}: Props) {
  const lastSpokenIndexRef = useRef<number>(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const elapsed = useElapsed(examMeta?.startTime);

  /* Voice */
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      setSelectedVoice(voices.find((v) => v.lang === language) ?? null);
    };

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, [language]);

  /* TTS */
  useEffect(() => {
    if (!isOralMode || mode === "examiner") return;

    const lastIndex = messages.length - 1;
    const msg = messages[lastIndex];

    if (!msg || msg.role !== "assistant") return;
    if (lastIndex === lastSpokenIndexRef.current) return;

    const utterance = new SpeechSynthesisUtterance(msg.content || "");
    utterance.lang = language;

    if (selectedVoice) utterance.voice = selectedVoice;

    window.speechSynthesis.speak(utterance);
    lastSpokenIndexRef.current = lastIndex;

    return () => window.speechSynthesis.cancel();
  }, [messages, isOralMode, mode, language, selectedVoice]);

  /* Scroll */
  useEffect(() => {
    if (mode === "examiner") return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mode]);

  /* Examiner */
  if (mode === "examiner") {
    return (
      <ExaminerSplitView
        messages={messages}
        examMeta={examMeta}
        elapsed={elapsed}
      />
    );
  }

  /* Default */
  return (
    <div>
      {messages.map((m, i) => (
        <div key={i}>
          <b>{m.role}:</b> {m.content}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}