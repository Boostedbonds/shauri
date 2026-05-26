"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { logActivity } from "@/lib/logActivity";
import ThemeToggle from "./ThemeToggle";

// ─── Types ────────────────────────────────────────────────────
type Message   = { role: "user" | "assistant"; content: string };
type QuizState = "none" | "pending" | "done";
type ActivityMode = "teacher";

export interface LearnChatPageProps {
  mode:         "teacher";
  accentColor?: string;
  greeting?:    string;
  title?:       string;
  icon?:        string;
}

// ─── Helpers ──────────────────────────────────────────────────
function renderText(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

function extractTopic(text: string): string {
  const m = text.match(/(?:topic|chapter|concept)[:\s]+([^\n.!?]+)/i);
  return m ? m[1].trim().slice(0, 60) : text.slice(0, 60);
}

function extractSubject(text: string): string {
  const subjects = ["Science", "Mathematics", "English", "Hindi", "Social Science",
    "Physics", "Chemistry", "Biology", "History", "Geography", "Economics"];
  for (const s of subjects) {
    if (new RegExp(s, "i").test(text)) return s;
  }
  return "General";
}

function parseQuizScore(text: string): { score: number; total: number } | null {
  const m1 = text.match(/(\d+)\s*(?:out of|\/)\s*(\d+)/i);
  if (m1) return { score: parseInt(m1[1]), total: parseInt(m1[2]) };
  const m2 = text.match(/[Ss]core[:\s]+(\d+)\D+(\d+)/);
  if (m2) return { score: parseInt(m2[1]), total: parseInt(m2[2]) };
  return null;
}

// ─── Sub-components ───────────────────────────────────────────

/** AI / User message bubble — SHAURI branded */
function Bubble({ m, accent }: { m: Message; accent: string }) {
  const isUser = m.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 14,
      alignItems: "flex-end",
      gap: 10,
    }}>
      {/* AI avatar */}
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #0a2540, #1a5080)",
          border: "1.5px solid rgba(212,175,55,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, flexShrink: 0,
        }}>🧠</div>
      )}

        /* Bubble */
      <div style={{
        maxWidth: "78%",
        padding: "13px 18px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
        background: isUser
          ? `linear-gradient(135deg, ${accent}, #0a2540)`
          : "var(--s-bubble-ai-bg)",
        color: isUser ? "var(--s-bubble-user-text)" : "var(--s-bubble-ai-text)",
        fontSize: 14,
        lineHeight: 1.8,
        wordBreak: "break-word",
        border: isUser ? "none" : "1px solid var(--s-bubble-ai-border)",
        boxShadow: isUser
          ? "0 4px 16px rgba(10,37,64,0.18)"
          : "0 2px 10px rgba(10,37,64,0.05)",
        backdropFilter: isUser ? "none" : "blur(8px)",
        letterSpacing: "0.02em",
        transition: "background 0.35s ease, color 0.35s ease, border-color 0.35s ease",
      }}>
        {renderText(m.content)}
      </div>
    </div>
  );
}

/** Live session status bar */
function SessionBar({ elapsed, subject, topic, quizState, quizScore, accent, onEndSession }: {
  elapsed: number; subject: string; topic: string; accent: string;
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
      padding: "8px 18px",
      background: "var(--s-session-bg)",
      borderBottom: "1px solid var(--s-session-border)",
      fontSize: 11, flexShrink: 0,
      fontFamily: "'Orbitron', sans-serif",
      letterSpacing: "0.08em",
      transition: "background 0.35s ease, border-color 0.35s ease",
    }}>
      <span style={{
        fontWeight: 700, color: "#1a7a4a",
        background: "rgba(26,122,74,0.10)",
        padding: "3px 10px", borderRadius: 6, fontFamily: "monospace",
      }}>
        ⏱ {display}
      </span>
      {subject && (
        <span style={{ color: "#0a2540", fontWeight: 600 }}>
          📚 {subject}
        </span>
      )}
      {topic && (
        <span style={{ color: "var(--shauri-text-secondary, #5c6f82)" }}>
          · {topic.slice(0, 36)}
        </span>
      )}
      {quizState === "done" && quizScore && (
        <span style={{ color: "#c6a85a", fontWeight: 700, marginLeft: 4 }}>
          🎯 QUIZ: {quizScore.score}/{quizScore.total} ({Math.round(quizScore.score / quizScore.total * 100)}%)
        </span>
      )}
      <button onClick={onEndSession} style={{
        marginLeft: "auto",
        padding: "5px 14px",
        background: "#1a7a4a",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontFamily: "'Orbitron', sans-serif",
      }}>
        ✓ End & Save
      </button>
    </div>
  );
}

/** Quiz nudge banner — SHAURI-styled */
function QuizBanner({ onRequestQuiz, onSkip }: { onRequestQuiz: () => void; onSkip: () => void }) {
  return (
    <div style={{
      margin: "0 16px 12px",
      background: "rgba(212,175,55,0.08)",
      border: "1px solid rgba(212,175,55,0.35)",
      borderRadius: 12,
      padding: "13px 18px",
      display: "flex", alignItems: "center",
      gap: 14, flexWrap: "wrap",
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 12,
        color: "#0a2540",
        fontWeight: 600,
        fontFamily: "'Orbitron', sans-serif",
        letterSpacing: "0.04em",
      }}>
        🎯 You've been deep in a session. Quick comprehension quiz to lock it in?
      </span>
      <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
        <button onClick={onRequestQuiz} style={{
          padding: "7px 16px",
          background: "#d4af37", color: "#0a2540",
          border: "none", borderRadius: 8,
          fontSize: 11, fontWeight: 700,
          cursor: "pointer",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}>Quiz Me</button>
        <button onClick={onSkip} style={{
          padding: "7px 12px",
          background: "transparent", color: "#5c6f82",
          border: "1px solid rgba(10,37,64,0.15)",
          borderRadius: 8, fontSize: 11,
          cursor: "pointer",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>Skip</button>
      </div>
    </div>
  );
}

/** Session saved confirmation */
function SavedBanner({ subject, elapsed, quizScore }: {
  subject: string; elapsed: string; quizScore: { score: number; total: number } | null;
}) {
  return (
    <div style={{
      margin: "10px 16px",
      background: "rgba(26,122,74,0.07)",
      border: "1px solid rgba(26,122,74,0.30)",
      borderRadius: 12,
      padding: "14px 18px",
    }}>
      <p style={{
        fontSize: 12, fontWeight: 700, color: "#1a7a4a",
        marginBottom: 4,
        fontFamily: "'Orbitron', sans-serif",
        letterSpacing: "0.10em",
        textTransform: "uppercase",
      }}>
        ✅ Session Saved to Progress Dashboard
      </p>
      <p style={{ fontSize: 12, color: "#166534", letterSpacing: "0.03em" }}>
        📚 {subject} · ⏱ {elapsed}
        {quizScore
          ? ` · 🎯 Quiz: ${quizScore.score}/${quizScore.total} (${Math.round(quizScore.score / quizScore.total * 100)}%)`
          : ""}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function LearnChatPage({
  mode,
  accentColor = "#1a7a4a",
  greeting = "Hi! 👋 I'm SHAURI — your adaptive learning mentor. What concept are we mastering today?",
  title = "LEARN MODE",
  icon = "🧠",
}: LearnChatPageProps) {

  const [messages,        setMessages]        = useState<Message[]>([]);
  const [inputText,       setInputText]       = useState("");
  const [loading,         setLoading]         = useState(false);
  const [subject,         setSubject]         = useState("");
  const [topic,           setTopic]           = useState("");
  const [elapsed,         setElapsed]         = useState(0);
  const [sessionOn,       setSessionOn]       = useState(false);
  const [quizState,       setQuizState]       = useState<QuizState>("none");
  const [quizScore,       setQuizScore]       = useState<{ score: number; total: number } | null>(null);
  const [showQuizBanner,  setShowQuizBanner]  = useState(false);
  const [sessionSaved,    setSessionSaved]    = useState(false);
  const [savedElapsed,    setSavedElapsed]    = useState("");

  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef       = useRef<number>(0);
  const elapsedRef       = useRef(0);
  const sendingRef       = useRef(false);
  const bottomRef        = useRef<HTMLDivElement>(null);
  const msgsRef          = useRef<Message[]>([]);
  const topicsRef        = useRef<string[]>([]);
  const quizShownRef     = useRef(false);
  const autoTriggeredRef = useRef(false);

  // ── Boot greeting ──────────────────────────────────────────
  useEffect(() => {
    msgsRef.current = [{ role: "assistant", content: greeting }];
    setMessages([{ role: "assistant", content: greeting }]);
  }, [greeting]);

  // ── Scroll to bottom ───────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Session timer ──────────────────────────────────────────
  function startSession() {
    if (sessionOn) return;
    setSessionOn(true);
    startTsRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startTsRef.current) / 1000);
      elapsedRef.current = s;
      setElapsed(s);
      if (!quizShownRef.current && s >= 600 && msgsRef.current.length >= 4) {
        quizShownRef.current = true;
        setShowQuizBanner(true);
      }
    }, 1000);
  }

  // ── Save session ───────────────────────────────────────────
  const saveSession = useCallback(async (score?: { score: number; total: number }) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const secs = elapsedRef.current;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const elapsed = [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(" ");
    setSavedElapsed(elapsed);
    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}
    try {
      await logActivity({
        mode: "learn",
        subject: subject || "General",
        topics: topicsRef.current.length ? topicsRef.current : [topic || "Unknown"],
        timeTakenSeconds: secs,
        score_source: "none",
        marks_obtained: (score || quizScore)?.score ?? undefined,
        total_marks:    (score || quizScore)?.total  ?? undefined,
      });
      setSessionSaved(true);
    } catch { /* best-effort */ }
  }, [subject, topic, quizScore]);

  // ── Auto-start from planner deep-link ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoSubject = (params.get("subject") || "").trim();
    const autoTopic   = (params.get("topic")   || "").trim();
    const day         = (params.get("day")      || "").trim();
    if (!autoSubject && !autoTopic && !day) return;
    autoTriggeredRef.current = true;
    const parts: string[] = [];
    if (autoSubject) parts.push(`Subject: ${autoSubject}`);
    if (autoTopic)   parts.push(`Topic: ${autoTopic}`);
    if (day)         parts.push(`(Planner Day ${day})`);
    const prompt = [`Start CBSE Learn Mode session.`, parts.join(" | "), `Explain clearly with examples.`, `Then offer a quiz.`].join("\n");
    setTimeout(() => { if (!sendingRef.current) sendMessage(prompt, true); }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Quiz request ───────────────────────────────────────────
  async function requestQuiz() {
    setShowQuizBanner(false);
    setQuizState("pending");
    const quizPrompt = `Please give me a short 5-question comprehension quiz on what we just covered in ${subject || "this topic"}. After I answer, score me out of 5 and say "Score: X out of 5".`;
    await sendMessage(quizPrompt, true);
  }

  // ── Core send ──────────────────────────────────────────────
  async function sendMessage(text: string, isInternal = false) {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: Message = { role: "user", content: trimmed };
    const updated = [...msgsRef.current, userMsg];
    msgsRef.current = updated;
    setMessages(updated);
    setInputText("");
    setLoading(true);

    if (!sessionOn && !isInternal) startSession();

    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          message: trimmed,
          history: updated.slice(1, -1).map(m => ({ role: m.role, content: m.content })),
          student: { name: student?.name || "Student", class: student?.class || "", board: student?.board || "CBSE" },
        }),
      });
      const data  = await res.json();
      const reply = data?.reply || "Something went wrong.";

      if (!subject) {
        const detected = extractSubject(trimmed + " " + reply);
        if (detected !== "General") setSubject(detected);
      }
      if (!topic && updated.length <= 4) {
        const detected = extractTopic(reply);
        setTopic(detected);
        if (!topicsRef.current.includes(detected)) topicsRef.current = [...topicsRef.current, detected];
      }
      if (updated.length > 4) {
        const newTopic = extractTopic(reply);
        if (newTopic && !topicsRef.current.includes(newTopic) && topicsRef.current.length < 10) {
          topicsRef.current = [...topicsRef.current, newTopic];
        }
      }

      if (quizState === "pending") {
        const parsed = parseQuizScore(reply);
        if (parsed) {
          setQuizScore(parsed);
          setQuizState("done");
          await saveSession(parsed);
        }
      }

      const final = [...updated, { role: "assistant" as const, content: reply }];
      msgsRef.current = final;
      setMessages(final);
    } catch {
      const errFinal = [...updated, { role: "assistant" as const, content: "⚠️ Network error. Please try again." }];
      msgsRef.current = errFinal;
      setMessages(errFinal);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }

  function handleSend() {
    const t = inputText.trim();
    if (t) sendMessage(t);
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--s-bg-base)",
      backgroundAttachment: "fixed",
      fontFamily: "'Orbitron', 'Segoe UI', system-ui, sans-serif",
      overflow: "hidden",
      transition: "background 0.35s ease",
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes bounce {
          0%,100% { transform: translateY(0);    opacity: 0.5; }
          50%      { transform: translateY(-5px); opacity: 1;   }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        .lrn-msg { animation: fadeUp 0.22s ease both; }

        /* Textarea resets */
        .shauri-textarea {
          flex: 1;
          resize: none;
          border: 1.5px solid var(--s-border);
          border-radius: 14px;
          padding: 13px 16px;
          font-size: 14px;
          line-height: 1.6;
          background: var(--s-bg-input);
          color: var(--s-text-primary);
          font-family: 'Orbitron', sans-serif;
          letter-spacing: 0.02em;
          min-height: 50px;
          max-height: 110px;
          overflow-y: auto;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s,
                      background 0.35s ease, color 0.35s ease;
        }
        .shauri-textarea:focus {
          border-color: var(--s-gold);
          box-shadow: 0 0 0 3px var(--s-input-focus-ring);
          background: var(--s-bg-input-focus);
        }
        .shauri-textarea::placeholder {
          color: var(--s-text-muted);
          font-weight: 400;
        }
        .shauri-textarea:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* Send button */
        .shauri-send-btn {
          width: 46px; height: 46px;
          border-radius: 12px;
          border: none;
          font-size: 18px;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s, transform 0.12s;
          display: flex; align-items: center; justify-content: center;
        }
        .shauri-send-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .shauri-send-btn:active:not(:disabled) { transform: scale(0.95); }

        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.4); border-radius: 99px; }
      `}</style>

      {/* ── MODE TOPBAR — thin strip, same language as AV Mode ── */}
      <div style={{
        height:       52,
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        padding:      "0 16px",
        background:   "var(--s-topbar-bg)",
        borderBottom: "1px solid var(--s-topbar-border)",
        flexShrink:   0,
        transition:   "background 0.35s ease, border-color 0.35s ease",
      }}>
        {/* Back */}
        <button
          onClick={() => { saveSession(); setTimeout(() => window.location.href = "/modes", 300); }}
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            6,
            padding:        "6px 14px",
            background:     "rgba(255,255,255,0.06)",
            color:          "var(--s-topbar-text)",
            border:         "1px solid var(--s-topbar-border)",
            borderRadius:   8,
            fontSize:       11,
            fontWeight:     600,
            letterSpacing:  "0.12em",
            textTransform:  "uppercase",
            cursor:         "pointer",
            fontFamily:     "'Orbitron', sans-serif",
            transition:     "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
        >
          ← BACK
        </button>

        {/* Mode title */}
        <div style={{
          display:       "flex",
          alignItems:    "center",
          gap:           8,
          fontFamily:    "'Orbitron', sans-serif",
          fontSize:      12,
          fontWeight:    700,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color:         "var(--s-gold)",
          transition:    "color 0.35s ease",
        }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          {title}
        </div>

        {/* Right: theme toggle */}
        <ThemeToggle variant="topbar" />
      </div>

      {/* ── SESSION BAR ── */}
      {sessionOn && (
        <SessionBar
          elapsed={elapsed}
          subject={subject}
          topic={topic}
          accent={accentColor}
          quizState={quizState}
          quizScore={quizScore}
          onEndSession={() => saveSession()}
        />
      )}

      {/* ── MESSAGES AREA ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 16px 0",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}>
        {messages.map((m, i) => (
          <div key={i} className="lrn-msg">
            <Bubble m={m} accent={accentColor} />
          </div>
        ))}

        {/* Loading indicator — gold dots */}
        {loading && (
          <div style={{ display: "flex", gap: 6, paddingLeft: 46, paddingBottom: 10, alignItems: "center" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8,
                borderRadius: "50%",
                background: "#d4af37",
                animation: `bounce 0.9s ${i * 0.15}s infinite ease-in-out`,
              }} />
            ))}
          </div>
        )}

        <div ref={bottomRef} style={{ height: 12 }} />
      </div>

      {/* ── QUIZ BANNER ── */}
      {showQuizBanner && quizState === "none" && (
        <QuizBanner onRequestQuiz={requestQuiz} onSkip={() => setShowQuizBanner(false)} />
      )}

      {/* ── SESSION SAVED ── */}
      {sessionSaved && (
        <SavedBanner subject={subject} elapsed={savedElapsed} quizScore={quizScore} />
      )}

      {/* ── INPUT BAR — semantic tokens, responds to theme ── */}
      <div style={{
        padding: "12px 16px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        background:   "var(--s-input-bar-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop:    "1px solid var(--s-input-bar-border)",
        flexShrink:   0,
        display:      "flex",
        gap:          10,
        alignItems:   "flex-end",
        transition:   "background 0.35s ease, border-color 0.35s ease",
      }}>
        <textarea
          className="shauri-textarea"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="Ask anything — topic, concept, doubt, chapter…"
          rows={1}
          disabled={loading}
        />

        <button
          className="shauri-send-btn"
          onClick={handleSend}
          disabled={loading || !inputText.trim()}
          style={{
            background: (loading || !inputText.trim())
              ? "rgba(148,163,184,0.35)"
              : accentColor,
            color: (loading || !inputText.trim())
              ? "rgba(148,163,184,0.7)"
              : "#fff",
          }}
        >
          {loading ? "…" : "↑"}
        </button>
      </div>
    </div>
  );
}