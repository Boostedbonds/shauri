"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { logActivity } from "@/lib/logActivity";

// ─── Types ────────────────────────────────────────────────────
type Message  = { role: "user" | "assistant"; content: string };
type QuizState = "none" | "pending" | "done";

// ─── Helpers ──────────────────────────────────────────────────
function renderText(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

// Extract topic name from first AI message
function extractTopic(text: string): string {
  const m = text.match(/(?:topic|chapter|concept)[:\s]+([^\n.!?]+)/i);
  return m ? m[1].trim().slice(0, 60) : text.slice(0, 60);
}

// Extract subject from conversation
function extractSubject(text: string): string {
  const subjects = ["Science", "Mathematics", "English", "Hindi", "Social Science",
    "Physics", "Chemistry", "Biology", "History", "Geography", "Economics"];
  for (const s of subjects) {
    if (new RegExp(s, "i").test(text)) return s;
  }
  return "General";
}

// Parse quiz score from AI reply like "3/5" or "Score: 4 out of 5"
function parseQuizScore(text: string): { score: number; total: number } | null {
  const m1 = text.match(/(\d+)\s*(?:out of|\/)\s*(\d+)/i);
  if (m1) return { score: parseInt(m1[1]), total: parseInt(m1[2]) };
  const m2 = text.match(/[Ss]core[:\s]+(\d+)\D+(\d+)/);
  if (m2) return { score: parseInt(m2[1]), total: parseInt(m2[2]) };
  return null;
}

// ─── Chat Bubble ──────────────────────────────────────────────
function Bubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #16a34a, #0d9488)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, marginRight: 8, alignSelf: "flex-end",
        }}>🧠</div>
      )}
      <div style={{
        maxWidth: "82%", padding: "11px 15px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        background: isUser ? "#16a34a" : "#fff",
        color: isUser ? "#fff" : "#0f172a",
        fontSize: 15, lineHeight: 1.7, wordBreak: "break-word",
        border: isUser ? "none" : "1px solid #e2e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {renderText(m.content)}
      </div>
    </div>
  );
}

// ─── Session Tracker Display ──────────────────────────────────
function SessionBar({ elapsed, subject, topic, quizState, quizScore, onEndSession }: {
  elapsed: number; subject: string; topic: string;
  quizState: QuizState; quizScore: { score: number; total: number } | null;
  onEndSession: () => void;
}) {
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const display = [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(" ");

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: "8px 14px", background: "#f0fdf4", borderBottom: "1px solid #bbf7d0",
      fontSize: 12, flexShrink: 0,
    }}>
      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "3px 10px", borderRadius: 6 }}>
        ⏱ {display}
      </span>
      {subject && <span style={{ color: "#166534", fontWeight: 600 }}>📚 {subject}</span>}
      {topic   && <span style={{ color: "#64748b" }}>· {topic.slice(0, 40)}</span>}
      {quizState === "done" && quizScore && (
        <span style={{ color: "#0d9488", fontWeight: 700, marginLeft: 4 }}>
          🎯 Quiz: {quizScore.score}/{quizScore.total} ({Math.round(quizScore.score / quizScore.total * 100)}%)
        </span>
      )}
      <button onClick={onEndSession} style={{
        marginLeft: "auto", padding: "4px 12px", background: "#15803d", color: "#fff",
        border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
      }}>
        ✓ End & Save Session
      </button>
    </div>
  );
}

// ─── Quiz Prompt Banner ───────────────────────────────────────
function QuizBanner({ onRequestQuiz, onSkip }: { onRequestQuiz: () => void; onSkip: () => void }) {
  return (
    <div style={{
      margin: "0 14px 12px", background: "#eff6ff", border: "1.5px solid #bfdbfe",
      borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center",
      gap: 12, flexWrap: "wrap", flexShrink: 0,
    }}>
      <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 600 }}>
        🎯 You've been learning for a while! Want a quick comprehension quiz to test yourself?
      </span>
      <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
        <button onClick={onRequestQuiz} style={{
          padding: "6px 14px", background: "#2563eb", color: "#fff",
          border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Yes, quiz me!</button>
        <button onClick={onSkip} style={{
          padding: "6px 12px", background: "transparent", color: "#64748b",
          border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 12, cursor: "pointer",
        }}>Skip</button>
      </div>
    </div>
  );
}

// ─── Session Saved Banner ─────────────────────────────────────
function SavedBanner({ subject, elapsed, quizScore }: {
  subject: string; elapsed: string; quizScore: { score: number; total: number } | null;
}) {
  return (
    <div style={{
      margin: "12px 14px", background: "#f0fdf4", border: "1.5px solid #86efac",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#15803d", marginBottom: 4 }}>
        ✅ Session saved to your Progress Dashboard!
      </p>
      <p style={{ fontSize: 13, color: "#166534" }}>
        📚 {subject} · ⏱ {elapsed}
        {quizScore ? ` · 🎯 Quiz score: ${quizScore.score}/${quizScore.total} (${Math.round(quizScore.score / quizScore.total * 100)}%)` : ""}
      </p>
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
        Your teacher and dashboard can now see this session. Keep going!
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function LearnPage() {
  const GREETING = "Hey! 🧠 I'm your CBSE Learn Mode tutor.\n\nTell me:\n• Which **subject** you're studying (Science, Maths, English, Hindi, SST…)\n• Which **chapter or topic** you want to understand\n\nI'll explain it clearly with examples, diagrams in text, and check your understanding with a quick quiz!";

  const [messages,   setMessages]   = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [inputText,  setInputText]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [subject,    setSubject]    = useState("");
  const [topic,      setTopic]      = useState("");
  const [elapsed,    setElapsed]    = useState(0);
  const [sessionOn,  setSessionOn]  = useState(false);
  const [quizState,  setQuizState]  = useState<QuizState>("none");
  const [quizScore,  setQuizScore]  = useState<{ score: number; total: number } | null>(null);
  const [showQuizBanner, setShowQuizBanner] = useState(false);
  const [sessionSaved,   setSessionSaved]   = useState(false);
  const [savedElapsed,   setSavedElapsed]   = useState("");

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef<number>(0);
  const elapsedRef = useRef(0);
  const sendingRef = useRef(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const msgsRef    = useRef<Message[]>([]);
  const topicsRef  = useRef<string[]>([]);
  // Quiz banner shown once after 8 minutes of study
  const quizShownRef = useRef(false);

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startSession() {
    if (timerRef.current) return;
    startTsRef.current = Date.now();
    setSessionOn(true);
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startTsRef.current) / 1000);
      elapsedRef.current = s;
      setElapsed(s);
      // Suggest quiz after 8 minutes of learning, once
      if (s >= 480 && !quizShownRef.current && quizState === "none") {
        quizShownRef.current = true;
        setShowQuizBanner(true);
      }
    }, 1000);
  }

  function fmtElapsed(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(" ");
  }

  // ── Save session to Supabase + localStorage ───────────────
  const saveSession = useCallback(async (finalScore?: { score: number; total: number }) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const secs    = elapsedRef.current;
    const elapsed = fmtElapsed(secs);
    const qs      = finalScore || quizScore;
    const pct     = qs ? Math.round((qs.score / qs.total) * 100) : undefined;

    setSavedElapsed(elapsed);
    setSessionOn(false);
    setSessionSaved(true);

    await logActivity({
      mode:             "learn",
      subject:          subject || "General",
      chapters:         topicsRef.current.length ? [topicsRef.current[0]] : [],
      topics:           topicsRef.current,
      timeTakenSeconds: secs,
      percentage:       pct,
      marks_obtained:   qs?.score,
      total_marks:      qs?.total,
      evaluation_text:  `Learn session: ${topicsRef.current.join(", ")}`,
    });
  }, [subject, quizScore]);

  // ── Request quiz from AI ──────────────────────────────────
  async function requestQuiz() {
    setShowQuizBanner(false);
    setQuizState("pending");
    const quizPrompt = `Please give me a short 5-question comprehension quiz on what we just covered in ${subject || "this topic"}. After I answer, score me out of 5 and say "Score: X out of 5".`;
    await sendMessage(quizPrompt, true);
  }

  // ── Send message ──────────────────────────────────────────
  async function sendMessage(text: string, isInternal = false) {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: Message = { role: "user", content: trimmed };
    const updated = isInternal
      ? [...msgsRef.current, userMsg]
      : [...messages, userMsg];

    if (!isInternal) setMessages(updated);
    else setMessages(updated);

    setInputText("");
    setLoading(true);

    // Start session timer on first real user message
    if (!sessionOn && !isInternal) startSession();

    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode:    "learn",
          message: trimmed,
          history: updated.slice(1, -1).map(m => ({ role: m.role, content: m.content })),
          student: { name: student?.name || "Student", class: student?.class || "", board: student?.board || "CBSE" },
        }),
      });
      const data  = await res.json();
      const reply = data?.reply || "Something went wrong.";

      // Extract subject + topic from early messages
      if (!subject) {
        const detectedSubject = extractSubject(trimmed + " " + reply);
        if (detectedSubject !== "General") setSubject(detectedSubject);
      }
      if (!topic && updated.length <= 4) {
        const detectedTopic = extractTopic(reply);
        setTopic(detectedTopic);
        if (!topicsRef.current.includes(detectedTopic)) {
          topicsRef.current = [...topicsRef.current, detectedTopic];
        }
      }
      // Track new topics mentioned in conversation
      if (updated.length > 4) {
        const newTopic = extractTopic(reply);
        if (newTopic && !topicsRef.current.includes(newTopic) && topicsRef.current.length < 10) {
          topicsRef.current = [...topicsRef.current, newTopic];
        }
      }

      // Check if reply contains quiz score
      if (quizState === "pending") {
        const parsed = parseQuizScore(reply);
        if (parsed) {
          setQuizScore(parsed);
          setQuizState("done");
          // Auto-save with quiz score
          await saveSession(parsed);
        }
      }

      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  function handleSend() {
    const t = inputText.trim();
    if (t) sendMessage(t);
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .lrn-msg{animation:fadeUp 0.22s ease both}
        textarea:focus{outline:none;box-shadow:0 0 0 2px #16a34a55}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
      }}>
        <button onClick={() => { saveSession(); setTimeout(() => window.location.href = "/modes", 300); }}
          style={{ padding: "7px 14px", background: "#f1f5f9", color: "#374151", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
          ← Back
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>🧠 Learn Mode</span>
        <div style={{ width: 70 }} />
      </div>

      {/* ── SESSION BAR (shows when session is active) ── */}
      {sessionOn && (
        <SessionBar
          elapsed={elapsed} subject={subject} topic={topic}
          quizState={quizState} quizScore={quizScore}
          onEndSession={() => saveSession()}
        />
      )}

      {/* ── MESSAGES ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0", display: "flex", flexDirection: "column", gap: 2 }}>
        {messages.map((m, i) => (
          <div key={i} className="lrn-msg">
            <Bubble m={m} />
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 5, paddingLeft: 46, paddingBottom: 6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", animation: `bounce 0.9s ${i*0.15}s infinite ease-in-out` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* ── QUIZ BANNER ── */}
      {showQuizBanner && quizState === "none" && (
        <QuizBanner onRequestQuiz={requestQuiz} onSkip={() => setShowQuizBanner(false)} />
      )}

      {/* ── SESSION SAVED BANNER ── */}
      {sessionSaved && (
        <SavedBanner subject={subject} elapsed={savedElapsed} quizScore={quizScore} />
      )}

      {/* ── INPUT BAR ── */}
      <div style={{
        padding: "10px 14px", paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
        background: "#fff", borderTop: "1px solid #e2e8f0", flexShrink: 0,
        display: "flex", gap: 10, alignItems: "flex-end",
      }}>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask anything — topic, concept, doubt, chapter…"
          rows={1}
          disabled={loading}
          style={{
            flex: 1, resize: "none", border: "2px solid #16a34a55", borderRadius: 14,
            padding: "13px 50px 13px 16px", fontSize: 15, lineHeight: 1.5,
            background: loading ? "#f8fafc" : "#fff", color: "#0f172a",
            fontFamily: "inherit", minHeight: 50, maxHeight: 110, overflowY: "auto",
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !inputText.trim()}
          style={{
            width: 44, height: 44, borderRadius: 12, border: "none",
            background: (loading || !inputText.trim()) ? "#e2e8f0" : "#16a34a",
            color: (loading || !inputText.trim()) ? "#94a3b8" : "#fff",
            fontSize: 18, cursor: "pointer", flexShrink: 0, transition: "background 0.15s",
          }}
        >{loading ? "…" : "↑"}</button>
      </div>
    </div>
  );
}