"use client";
import { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../components/Header";
import {
  getMistakes,
  getWeakTopics,
  markMistakeReviewed,
  type MistakeEntry,
} from "@/lib/mistakeLog";
import { getPlannerResults } from "@/lib/plannerResults";
import { THIRTY_DAY_PLAN } from "@/lib/plannerState";

type Message = { role: "user" | "assistant"; content: string };

const SUBJECT_COLORS = ["#2563eb","#0d9488","#7c3aed","#ea580c","#4f46e5","#059669","#db2777"];
function subjectColor(subject: string, all: string[]): string {
  const idx = all.indexOf(subject);
  return SUBJECT_COLORS[Math.max(idx, 0) % SUBJECT_COLORS.length];
}

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
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div style={{
        maxWidth: "88%", padding: "10px 14px",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser ? "#2563eb" : "#fff",
        color: isUser ? "#fff" : "#0f172a",
        fontSize: 14, lineHeight: 1.7, wordBreak: "break-word",
        border: isUser ? "none" : "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}>
        {renderText(m.content)}
      </div>
    </div>
  );
}

// ─── Inner component (uses useSearchParams) ────────────────────
function RevisionInner() {
  const searchParams  = useSearchParams();
  const qSubject      = searchParams.get("subject") || "";
  const qTopic        = searchParams.get("topic")   || "";

  const [student, setStudent]         = useState<{ name: string; class: string; board: string } | null>(null);
  const [mistakes, setMistakes]       = useState<MistakeEntry[]>([]);
  const [weakTopics, setWeakTopics]   = useState<ReturnType<typeof getWeakTopics>>([]);
  const [activeSubject, setActiveSub] = useState<string>(qSubject || "all");
  const [activeTopic, setActiveTopic] = useState<string>(qTopic || "");
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [sessionMode, setMode]        = useState<"pick" | "chat">("pick");
  const bottomRef                     = useRef<HTMLDivElement>(null);
  const sendingRef                    = useRef(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      if (!s?.name) { window.location.href = "/"; return; }
      setStudent(s);
    } catch { window.location.href = "/"; }
  }, []);

  useEffect(() => {
    setMistakes(getMistakes());
    setWeakTopics(getWeakTopics());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-start if navigated from mistake log with subject+topic
  useEffect(() => {
    if (qSubject && qTopic && student) {
      startRevision(qSubject, qTopic);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student]);

  const allSubjects = useMemo(() =>
    Array.from(new Set(mistakes.map(m => m.subject))).sort(),
  [mistakes]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (m.reviewed) return false;
      if (activeSubject !== "all" && m.subject !== activeSubject) return false;
      return true;
    });
  }, [mistakes, activeSubject]);

  // Also pull planner weak topics (subjects with low scores)
  const plannerWeakSubjects = useMemo(() => {
    const results = getPlannerResults();
    const bySubject: Record<string, { score: number; total: number }> = {};
    results.forEach(r => {
      if (!bySubject[r.subject]) bySubject[r.subject] = { score: 0, total: 0 };
      bySubject[r.subject].score += r.score;
      bySubject[r.subject].total += r.total;
    });
    return Object.entries(bySubject)
      .filter(([, v]) => v.total > 0 && (v.score / v.total) < 0.6)
      .map(([subject, v]) => ({ subject, pct: Math.round(v.score / v.total * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
  }, []);

  async function startRevision(subject: string, topic: string) {
    if (!student) return;
    setActiveSub(subject);
    setActiveTopic(topic);
    setMode("chat");
    setMessages([]);
    setLoading(true);

    // Find related mistakes for this topic to give AI context
    const relatedMistakes = mistakes
      .filter(m => m.subject === subject && (m.topic === topic || topic === ""))
      .slice(0, 5);

    const mistakeContext = relatedMistakes.length > 0
      ? `\n\nStudent's recorded mistakes on this topic:\n${relatedMistakes.map(m =>
          `- ${m.qNum}: ${m.feedback}${m.correctAnswer ? ` | Correct: ${m.correctAnswer}` : ""}`
        ).join("\n")}`
      : "";

    const initPrompt = topic
      ? `Please help me revise: **${subject} — ${topic}**.\n\nStart with a clear, concise explanation of the key concepts, then give me 3 practice questions to test my understanding.${mistakeContext}`
      : `Please give me a revision overview of **${subject}** covering the most important concepts for CBSE Class ${student.class}.${mistakeContext}`;

    setMessages([{ role: "user", content: initPrompt }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "teacher",
          message: initPrompt,
          history: [],
          student: { name: student.name, class: student.class, board: student.board },
        }),
      });
      const data = await res.json();
      if (data?.reply) setMessages(p => [...p, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "⚠️ Could not load revision. Please try again." }]);
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || sendingRef.current || !student) return;
    sendingRef.current = true;
    setLoading(true);
    const userMsg = input.trim();
    setInput("");
    setMessages(p => [...p, { role: "user", content: userMsg }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "teacher",
          message: userMsg,
          history: messages.slice(-10),
          student: { name: student.name, class: student.class, board: student.board },
        }),
      });
      const data = await res.json();
      if (data?.reply) setMessages(p => [...p, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "⚠️ Network error. Try again." }]);
    }
    sendingRef.current = false;
    setLoading(false);
  }

  function handleMarkReviewed(id: string) {
    markMistakeReviewed(id);
    setMistakes(getMistakes());
    setWeakTopics(getWeakTopics());
  }

  if (!student) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <Header onLogout={() => (window.location.href = "/")} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px 0", flexWrap: "wrap" }}>
        <button onClick={() => { if (sessionMode === "chat") { setMode("pick"); setMessages([]); } else window.location.href = "/modes"; }}
          style={{ padding: "7px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
          ← {sessionMode === "chat" ? "Back to Topics" : "Modes"}
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>📖 Revision Mode</h1>
        <button onClick={() => (window.location.href = "/mistakes")}
          style={{ marginLeft: "auto", padding: "7px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#dc2626" }}>
          ❌ Mistake Log {mistakes.filter(m => !m.reviewed).length > 0 && `(${mistakes.filter(m => !m.reviewed).length})`}
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", gap: 0 }}>

        {/* ── LEFT PANEL — topic picker ── */}
        <div style={{ width: sessionMode === "chat" ? 300 : "100%", maxWidth: sessionMode === "chat" ? 300 : "none", flexShrink: 0, overflowY: "auto", padding: "16px 20px", borderRight: sessionMode === "chat" ? "1.5px solid #e2e8f0" : "none", background: "#fff", display: sessionMode === "chat" ? "block" : "flex", flexDirection: "column", gap: sessionMode === "chat" ? 0 : 24 }}>

          {/* Weak topics from mistakes */}
          {weakTopics.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🔴 Weak Topics from Exams</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {weakTopics.slice(0, 8).map((t, i) => (
                  <button key={i} onClick={() => startRevision(t.subject, t.topic)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", background: "#dc2626", color: "#fff", borderRadius: 4, flexShrink: 0 }}>{t.count}×</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topic}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{t.subject}</div>
                    </div>
                    <span style={{ color: "#dc2626", fontSize: 12 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weak subjects from progress */}
          {plannerWeakSubjects.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🟡 Low Score Subjects</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plannerWeakSubjects.map((s, i) => (
                  <button key={i} onClick={() => startRevision(s.subject, "")}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, cursor: "pointer" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{s.subject}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706" }}>{s.pct}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Planner-based topics */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>📅 From Your Study Plan</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {THIRTY_DAY_PLAN.slice(0, 10).filter(d => !d.meta.isRev && !d.meta.isMock).map(d => (
                d.topics.map((t, i) => (
                  <button key={`${d.day}-${i}`} onClick={() => startRevision(t.subject, t.topic)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>D{d.day}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.topic}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{t.subject}</div>
                    </div>
                  </button>
                ))
              ))}
            </div>
          </div>

          {/* Custom topic input */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🔍 Revise Any Topic</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && input.trim()) { startRevision("General", input.trim()); setInput(""); } }}
                placeholder="Type subject + topic…"
                style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }} />
              <button onClick={() => { if (input.trim()) { startRevision("General", input.trim()); setInput(""); } }}
                style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Go
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — chat ── */}
        {sessionMode === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Chat header */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                  {activeTopic ? `${activeSubject} — ${activeTopic}` : activeSubject}
                </span>
                {activeTopic && mistakes.some(m => m.subject === activeSubject && m.topic === activeTopic && !m.reviewed) && (
                  <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px", background: "#fef2f2", color: "#dc2626", borderRadius: 6, fontWeight: 700 }}>
                    ❌ Mistakes recorded
                  </span>
                )}
              </div>
              {activeTopic && (
                <button
                  onClick={() => {
                    const ids = mistakes.filter(m => m.subject === activeSubject && m.topic === activeTopic).map(m => m.id);
                    ids.forEach(id => handleMarkReviewed(id));
                  }}
                  style={{ padding: "5px 12px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#059669" }}>
                  ✓ Mark All Mistakes Reviewed
                </button>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              {messages.map((m, i) => <Bubble key={i} m={m} />)}
              {loading && (
                <div style={{ display: "flex", gap: 5, padding: "4px 8px" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", animation: `bounce 1s ${i * 0.2}s infinite ease-in-out` }} />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "10px 16px", borderTop: "1px solid #e2e8f0", background: "#fff", display: "flex", gap: 8, flexShrink: 0 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask a follow-up question…"
                disabled={loading}
                style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 14, outline: "none", background: loading ? "#f1f5f9" : "#fff" }}
              />
              <button onClick={sendMessage} disabled={loading}
                style={{ padding: "10px 20px", background: loading ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

// ─── Page export wrapped in Suspense for useSearchParams ──────
export default function RevisionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontSize: 16, color: "#64748b" }}>Loading revision…</div>}>
      <RevisionInner />
    </Suspense>
  );
}