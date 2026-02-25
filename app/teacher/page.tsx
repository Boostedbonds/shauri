"use client";
import { useEffect, useRef, useState } from "react";
import ChatInput from "../components/ChatInput";

type Message = { role: "user" | "assistant"; content: string };

function renderText(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

function Bubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      <div style={{
        maxWidth: "80%", padding: "12px 16px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "#38bdf8" : "#fff",
        color: isUser ? "#fff" : "#0f172a",
        fontSize: 15, lineHeight: 1.75, wordBreak: "break-word",
        boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
        border: isUser ? "none" : "1px solid #e2e8f0",
      }}>
        {renderText(m.content)}
      </div>
    </div>
  );
}

function DictionaryPanel() {
  const [query, setQuery]     = useState("");
  const [result, setResult]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode]       = useState<"dictionary" | "thesaurus">("dictionary");
  const [history, setHistory] = useState<{ word: string; result: string; mode: string }[]>([]);

  async function lookup() {
    const word = query.trim(); if (!word) return;
    setLoading(true); setResult(null);
    const prompt = mode === "dictionary"
      ? `Define "${word}": part of speech, meaning, one example sentence. Max 60 words, plain text only.`
      : `Synonyms/antonyms for "${word}". Format: SYNONYMS: w1, w2, w3 | ANTONYMS: w1, w2. Max 50 words.`;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "teacher", message: prompt, history: [], student: { name: "lookup", class: "tool" } }),
      });
      const data = await res.json();
      const text = data?.reply || "No result found.";
      setResult(text);
      setHistory(prev => [{ word, result: text, mode }, ...prev.slice(0, 9)]);
    } catch { setResult("⚠️ Could not fetch. Check connection."); }
    setLoading(false);
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fafbff" }}>
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, letterSpacing: "0.08em" }}>📖 REFERENCE</div>
        <div style={{ display: "flex", gap: 3, marginBottom: 8, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {(["dictionary", "thesaurus"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "5px 0",
              background: mode === m ? "#2563eb" : "transparent",
              color: mode === m ? "#fff" : "#64748b",
              border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>{m === "dictionary" ? "Dict" : "Thesaurus"}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && lookup()}
            placeholder="Search word…"
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#f8fafc", minWidth: 0 }} />
          <button onClick={lookup} disabled={loading} style={{
            padding: "8px 12px", background: loading ? "#94a3b8" : "#2563eb", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", flexShrink: 0,
          }}>{loading ? "…" : "Go"}</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {loading && <div style={{ color: "#64748b", fontSize: 13 }}>Looking up <em>{query}</em>…</div>}
        {result && !loading && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>{query}</div>
            <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{result}</div>
          </div>
        )}
        {!result && !loading && history.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7 }}>
            Look up any word for definitions, synonyms & antonyms.
          </div>
        )}
        {history.length > 0 && !loading && (
          <>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>RECENT</div>
            {history.map((h, i) => (
              <button key={i} onClick={() => { setQuery(h.word); setResult(h.result); setMode(h.mode as any); }} style={{
                display: "block", width: "100%", textAlign: "left", padding: "7px 10px", marginBottom: 4,
                background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
                fontSize: 12, color: "#475569", cursor: "pointer",
              }}>
                <strong>{h.word}</strong>
                <span style={{ opacity: 0.45, marginLeft: 6, fontSize: 10 }}>{h.mode}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [studentName, setStudentName] = useState("");

  const greetingFiredRef = useRef(false);
  const isSendingRef     = useRef(false);
  const sessionIdRef     = useRef(crypto.randomUUID());
  const chatBottomRef    = useRef<HTMLDivElement>(null);
  const messagesRef      = useRef<Message[]>([]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    // Load student name for display
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      if (s?.name) setStudentName(s.name);
    } catch {}

    if (greetingFiredRef.current) return;
    greetingFiredRef.current = true;
    sendToAPI("hi", undefined, undefined, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}

    // Always send full student context with every message
    const studentPayload = {
      name: student?.name || "Student",
      class: student?.class || "",
      board: student?.board || "CBSE",
      sessionId: sessionIdRef.current,
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "teacher",
          message: text,
          uploadedText: uploadedText || "",
          uploadType: uploadType || null,
          history: isGreeting ? [] : messagesRef.current.map(m => ({ role: m.role, content: m.content })),
          student: studentPayload,
        }),
      });
      const data = await res.json();
      const reply = typeof data?.reply === "string" ? data.reply : "";
      if (reply) setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .dict-panel { display: none; }
        @media (min-width: 700px) { .dict-panel { display: flex !important; flex-direction: column; } }
      `}</style>

      {/* TOP BAR */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
      }}>
        <button onClick={() => window.location.href = "/modes"} style={{
          padding: "7px 14px", background: "#f1f5f9", color: "#374151",
          borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600,
        }}>← Back</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          📚 Teacher Mode{studentName ? ` · ${studentName}` : ""}
        </span>
        <div style={{ width: 80 }} />
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* CHAT — flex column, input pinned to bottom */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 8px" }}>
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
            {isLoading && (
              <div style={{ display: "flex", gap: 5, padding: "4px 8px", marginBottom: 8 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#38bdf8",
                    animation: `bounce 1s ${i * 0.15}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input — inline, inside column, no position:fixed */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
            <ChatInput onSend={handleSend} disabled={isLoading} inline={true} />
          </div>
        </div>

        {/* DICTIONARY — hidden on mobile */}
        <div className="dict-panel" style={{
          width: 244, flexShrink: 0, borderLeft: "1.5px solid #e2e8f0",
        }}>
          <DictionaryPanel />
        </div>
      </div>
    </div>
  );
}