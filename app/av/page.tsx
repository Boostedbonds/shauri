"use client";

import { useEffect, useRef, useState } from "react";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "600", "700"] });

type Tab = "explain" | "summary" | "quiz";
type LessonData = {
  explain: string;
  summary: string[];
  quiz: { q: string; opts: string[]; correct: number } | null;
  related: string[];
};

function mdToJsx(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={j}>{p.slice(2, -2)}</strong>
        : p
    );
    return <span key={i}>{parts}<br /></span>;
  });
}

// ─────────────────────────────────────────────────────────────
// BEST INDIAN CBSE TEACHER CHANNELS — curated & tiered
// ─────────────────────────────────────────────────────────────

const TIER1_INDIAN = [
  "physics wallah", "pw", "alakh pandey",
  "vedantu", "vedantu math", "vedantu science", "vedantu class 9 and 10",
  "unacademy", "unacademy class 9 and 10",
  "magnet brains", "doubtnut",
  "khan sir", "khan sir patna",
  "byju's", "byjus", "byju",
  "class 9 10", "cbse class 10",
];

const TIER2_INDIAN = [
  "dronstudy", "learnohub", "meritnation", "toppr",
  "exam fear", "examfear", "aakash", "allen career",
  "motion education", "arvind academy", "ncert wallah",
  "science and fun", "infinity learn", "oswaal",
  "cbse", "ncert", "hindi medium", "success roar",
  "tiwari academy", "amrit pal singh", "science sir",
  "let's learn india", "letslearn", "green board",
  "next door engineer", "prashant kirad", "amit sengupta",
  "pmt corner", "bright tutee",
];

const TIER3_GLOBAL = [
  "khan academy", "3blue1brown", "veritasium",
  "crashcourse", "ted-ed", "organic chemistry tutor",
  "professor leonard", "bozeman science", "kurzgesagt",
];

function scoreVideo(item: any): number {
  const ch = (item.snippet.channelTitle || "").toLowerCase();
  const title = (item.snippet.title || "").toLowerCase();
  const desc = (item.snippet.description || "").toLowerCase();
  const combined = `${ch} ${title} ${desc}`;
  const cbseBonus = /cbse|ncert|class 10|class 9|board exam|10th|9th/.test(combined) ? 1 : 0;
  if (TIER1_INDIAN.some(t => combined.includes(t))) return 10 + cbseBonus;
  if (TIER2_INDIAN.some(t => combined.includes(t))) return 5 + cbseBonus;
  if (TIER3_GLOBAL.some(t => combined.includes(t))) return 2;
  return cbseBonus;
}

export default function AVPage() {
  const [student, setStudent] = useState<{ name: string; class: string; board: string } | null>(null);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("explain");
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoChannel, setVideoChannel] = useState("");
  const [qaInput, setQaInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [followups, setFollowups] = useState<{ q: string; a: string }[]>([]);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
  const [videoError, setVideoError] = useState(false);
  const aiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shauri_student");
      if (!raw) { window.location.href = "/"; return; }
      const parsed = JSON.parse(raw);
      if (!parsed?.name) { window.location.href = "/"; return; }
      setStudent(parsed);
    } catch { window.location.href = "/"; }
  }, []);

  if (!student) return null;

  async function startLesson(t?: string) {
    const topicToUse = (t || topic).trim();
    if (!topicToUse) return;
    if (t) setTopic(t);

    setLoading(true);
    setLesson(null);
    setVideoId(null);
    setVideoTitle("");
    setVideoChannel("");
    setVideoError(false);
    setTab("explain");
    setFollowups([]);
    setChatHistory([]);
    setQuizAnswered(null);

    await Promise.all([
      fetchVideo(topicToUse),
      fetchGroq(topicToUse),
    ]);

    setLoading(false);
  }

  async function fetchGroq(t: string) {
    const system = `You are an enthusiastic, clear teacher for ${student?.board || "CBSE"} Class ${student?.class || ""} students. Teach the topic clearly.

Respond in this EXACT format:

EXPLANATION:
[3-4 paragraphs with real-world examples. Use **bold** for key terms.]

KEY_TAKEAWAYS:
["point 1","point 2","point 3","point 4"]

QUIZ:
{"q":"a question about ${t}","opts":["Option A","Option B","Option C","Option D"],"correct":0}

RELATED:
["related topic 1","related topic 2","related topic 3","related topic 4"]

KEY_TAKEAWAYS and RELATED must be valid JSON arrays. QUIZ must be valid JSON object. correct = 0-based index of the right answer.`;

    try {
      const res = await fetch("/api/av", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system,
          messages: [{ role: "user", content: `Teach me: ${t}` }],
        }),
      });
      const data = await res.json();
      if (data.error) { console.error(data.error); return; }
      const text: string = data.text || "";
      setChatHistory([
        { role: "user", content: `Teach me: ${t}` },
        { role: "assistant", content: text },
      ]);
      parseLesson(text);
    } catch (e) {
      console.error(e);
    }
  }

  function parseLesson(text: string) {
    let explain = "", summary: string[] = [], quiz = null, related: string[] = [];
    const em = text.match(/EXPLANATION:\s*([\s\S]*?)(?=KEY_TAKEAWAYS:|$)/);
    if (em) explain = em[1].trim();
    const km = text.match(/KEY_TAKEAWAYS:\s*(\[[\s\S]*?\])/);
    if (km) { try { summary = JSON.parse(km[1]); } catch {} }
    const qm = text.match(/QUIZ:\s*(\{[\s\S]*?\})/);
    if (qm) { try { quiz = JSON.parse(qm[1]); } catch {} }
    const rm = text.match(/RELATED:\s*(\[[\s\S]*?\])/);
    if (rm) { try { related = JSON.parse(rm[1]); } catch {} }
    setLesson({ explain, summary, quiz, related });
  }

  // ─── YouTube search via server-side API route (key stays secret) ───
  async function fetchVideo(t: string) {
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, studentClass: student?.class }),
      });
      const data = await res.json();
      if (data.error || !data.videoId) {
        setVideoError(true);
        return;
      }
      setVideoId(data.videoId);
      setVideoTitle(data.title);
      setVideoChannel(data.channel);
    } catch (e) {
      console.error("fetchVideo error:", e);
      setVideoError(true);
    }
  }

  async function askQuestion() {
    const q = qaInput.trim();
    if (!q || qaLoading) return;
    setQaInput("");
    setQaLoading(true);
    const newHistory = [...chatHistory, { role: "user", content: q }];
    setChatHistory(newHistory);
    try {
      const res = await fetch("/api/av", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are a helpful teacher for ${student?.board} Class ${student?.class} students. The student is learning: "${topic}". Answer clearly and briefly. Use **bold** for key terms.`,
          messages: newHistory,
        }),
      });
      const data = await res.json();
      const answer = data.text || "Sorry, could not get a response.";
      setChatHistory([...newHistory, { role: "assistant", content: answer }]);
      setFollowups(prev => [...prev, { q, a: answer }]);
    } catch {
      setFollowups(prev => [...prev, { q, a: "⚠️ Network error. Please try again." }]);
    } finally {
      setQaLoading(false);
      setTimeout(() => aiRef.current?.scrollTo({ top: aiRef.current.scrollHeight, behavior: "smooth" }), 100);
    }
  }

  const GOLD = "#D4AF37";
  const BG = "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 45%, #E6F2FF 100%)";

  const chips = [
    "Photosynthesis", "Pythagorean theorem", "French Revolution",
    "How DNA works", "Newton laws of motion", "Quadratic equations",
    "Water cycle", "World War 2 causes",
  ];

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>
      <style>{`
        * { box-sizing: border-box; }
        .av-tab { padding: 8px 14px; font-size: 11px; letter-spacing: 0.1em; font-weight: 600; cursor: pointer; border: none; background: none; font-family: inherit; color: #8a9bb0; border-bottom: 2px solid transparent; transition: all 0.12s; }
        .av-tab.active { color: #D4AF37; border-bottom-color: #D4AF37; }
        .av-chip { font-size: 11px; padding: 5px 13px; border-radius: 20px; border: 1px solid rgba(212,175,55,0.4); background: rgba(255,255,255,0.6); color: #5c6f82; cursor: pointer; letter-spacing: 0.06em; transition: all 0.12s; font-family: inherit; }
        .av-chip:hover { border-color: #D4AF37; color: #0a2540; background: rgba(212,175,55,0.12); }
        .av-qopt { font-size: 12px; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(212,175,55,0.35); background: rgba(255,255,255,0.6); cursor: pointer; text-align: left; font-family: inherit; letter-spacing: 0.04em; color: #0a2540; transition: all 0.12s; width: 100%; margin-bottom: 6px; }
        .av-qopt:hover:not(:disabled) { border-color: #D4AF37; background: rgba(212,175,55,0.12); }
        .av-qopt.correct { background: #e1f5ee; border-color: #1D9E75; color: #085041; }
        .av-qopt.wrong { background: #fcebeb; border-color: #f09595; color: #4a1b0c; }
        .av-related { font-size: 11px; padding: 7px 12px; border-radius: 8px; border: 1px solid rgba(212,175,55,0.3); background: rgba(255,255,255,0.5); cursor: pointer; color: #5c6f82; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-family: inherit; letter-spacing: 0.06em; transition: all 0.12s; width: 100%; }
        .av-related:hover { border-color: #D4AF37; color: #0a2540; background: rgba(212,175,55,0.1); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "linear-gradient(90deg, #0a2540, #1a3a5c)", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", flexShrink: 0 }}>
        <button onClick={() => window.location.href = "/modes"}
          style={{ padding: "6px 14px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em", fontFamily: "inherit" }}>
          ← BACK
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🎬</span>
          <span style={{ color: GOLD, fontWeight: 700, fontSize: 13, letterSpacing: "0.18em" }}>AUDIO-VISUAL MODE</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>
          {student.name.toUpperCase()} · CLASS {student.class}
        </div>
      </div>

      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", padding: "28px 20px", width: "100%" }}>

        {/* SEARCH */}
        <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", borderRadius: 16, border: "1px solid rgba(212,175,55,0.3)", padding: "20px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "#5c6f82", marginBottom: 10 }}>WHAT DO YOU WANT TO LEARN TODAY?</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && startLesson()}
              placeholder="e.g. Photosynthesis, Pythagorean theorem, French Revolution..."
              style={{ flex: 1, padding: "11px 16px", fontFamily: "inherit", fontSize: 14, borderRadius: 10, border: "1px solid rgba(212,175,55,0.4)", background: "rgba(255,255,255,0.8)", color: "#0a2540", outline: "none", letterSpacing: "0.04em" }}
            />
            <button onClick={() => startLesson()} disabled={loading || !topic.trim()}
              style={{ padding: "11px 24px", background: loading ? "#9FE1CB" : "#1D9E75", color: "white", border: "none", borderRadius: 10, fontFamily: "inherit", fontWeight: 600, fontSize: 12, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.12em", whiteSpace: "nowrap" }}>
              {loading ? "LOADING..." : "▶ START LESSON"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chips.map(c => (
              <button key={c} className="av-chip" onClick={() => startLesson(c)}>{c}</button>
            ))}
          </div>
        </div>

        {/* CLASSROOM */}
        {(lesson || loading) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

            {/* VIDEO PANEL */}
            <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", borderRadius: 16, border: "1px solid rgba(212,175,55,0.3)", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(212,175,55,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#8a9bb0", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E24B4A", display: "inline-block" }} />
                  BEST TEACHER VIDEO
                </div>
                {videoChannel && (
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, border: "1px solid #F09595", background: "#FCEBEB", color: "#A32D2D" }}>
                    {videoChannel}
                  </span>
                )}
              </div>

              {loading && !videoId ? (
                <div style={{ aspectRatio: "16/9", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 28 }}>🔍</div>
                  <div style={{ fontSize: 12, color: "#555" }}>Finding best Indian teacher video...</div>
                </div>
              ) : videoId ? (
                <>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                  <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(212,175,55,0.2)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0a2540", lineHeight: 1.4, letterSpacing: "0.02em" }}>{videoTitle}</div>
                    <div style={{ fontSize: 11, color: "#8a9bb0", marginTop: 3, letterSpacing: "0.06em" }}>{videoChannel}</div>
                  </div>
                </>
              ) : (
                <div style={{ aspectRatio: "16/9", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 28 }}>📺</div>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    {videoError ? "Could not load video. Check YouTube API key or quota." : "No video found for this topic."}
                  </div>
                </div>
              )}
            </div>

            {/* AI TEACHER PANEL */}
            <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", borderRadius: 16, border: "1px solid rgba(212,175,55,0.3)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(212,175,55,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#8a9bb0", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} />
                  AI TEACHER
                </div>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#FAECE7", color: "#7A2E0C", border: "1px solid #F0997B" }}>⚡ GROQ · LLAMA3</span>
              </div>

              {/* TABS */}
              <div style={{ display: "flex", borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
                {(["explain", "summary", "quiz"] as Tab[]).map(t => (
                  <button key={t} className={`av-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                    {t === "explain" ? "EXPLANATION" : t === "summary" ? "KEY POINTS" : "QUIZ"}
                  </button>
                ))}
              </div>

              {/* CONTENT */}
              <div ref={aiRef} style={{ padding: 16, minHeight: 260, maxHeight: 400, overflowY: "auto", fontSize: 13, lineHeight: 1.8, color: "#0a2540" }}>
                {loading && !lesson ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8a9bb0", fontSize: 12, padding: "8px 0" }}>
                    <span>⚡ Groq is preparing your lesson...</span>
                  </div>
                ) : !lesson ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "#aaa", textAlign: "center", gap: 8 }}>
                    <div style={{ fontSize: 28 }}>🏫</div>
                    <div style={{ fontSize: 12, letterSpacing: "0.08em" }}>YOUR AI TEACHER IS READY</div>
                  </div>
                ) : tab === "explain" ? (
                  <div>
                    <div style={{ letterSpacing: "0.02em" }}>{mdToJsx(lesson.explain)}</div>
                    {followups.map((f, i) => (
                      <div key={i} style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(212,175,55,0.2)" }}>
                        <div style={{ fontSize: 11, color: "#8a9bb0", marginBottom: 5, letterSpacing: "0.08em", fontWeight: 600 }}>YOU ASKED:</div>
                        <div style={{ fontSize: 12, color: "#0a2540", marginBottom: 8 }}>{f.q}</div>
                        <div style={{ letterSpacing: "0.02em" }}>{mdToJsx(f.a)}</div>
                      </div>
                    ))}
                    {qaLoading && (
                      <div style={{ marginTop: 12, fontSize: 12, color: "#8a9bb0", letterSpacing: "0.06em" }}>⚡ THINKING...</div>
                    )}
                  </div>
                ) : tab === "summary" ? (
                  <div>
                    {lesson.summary.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                        <span style={{ color: GOLD, fontSize: 14, marginTop: 1 }}>✦</span>
                        <span style={{ fontSize: 12, letterSpacing: "0.04em" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                ) : lesson.quiz ? (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, letterSpacing: "0.04em" }}>{lesson.quiz.q}</div>
                    {lesson.quiz.opts.map((o, i) => (
                      <button key={i}
                        className={`av-qopt ${quizAnswered !== null ? (i === lesson.quiz!.correct ? "correct" : i === quizAnswered && quizAnswered !== lesson.quiz!.correct ? "wrong" : "") : ""}`}
                        disabled={quizAnswered !== null}
                        onClick={() => setQuizAnswered(i)}>
                        {String.fromCharCode(65 + i)}. {o}
                      </button>
                    ))}
                    {quizAnswered !== null && (
                      <div style={{ marginTop: 10, fontSize: 12, letterSpacing: "0.06em", color: quizAnswered === lesson.quiz.correct ? "#085041" : "#4A1B0C", fontWeight: 600 }}>
                        {quizAnswered === lesson.quiz.correct ? "✅ CORRECT! WELL DONE." : `❌ NOT QUITE. THE ANSWER IS: ${lesson.quiz.opts[lesson.quiz.correct]}`}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Q&A */}
              <div style={{ padding: 12, borderTop: "1px solid rgba(212,175,55,0.2)", display: "flex", gap: 8 }}>
                <input
                  id="qa-input"
                  name="qa-input"
                  value={qaInput}
                  onChange={e => setQaInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && askQuestion()}
                  placeholder="Ask a follow-up question..."
                  style={{ flex: 1, padding: "8px 12px", fontFamily: "inherit", fontSize: 12, borderRadius: 8, border: "1px solid rgba(212,175,55,0.35)", background: "rgba(255,255,255,0.7)", color: "#0a2540", outline: "none", letterSpacing: "0.04em" }}
                />
                <button onClick={askQuestion} disabled={qaLoading || !qaInput.trim()}
                  style={{ padding: "8px 14px", background: qaLoading || !qaInput.trim() ? "#e2e8f0" : "#1D9E75", color: qaLoading || !qaInput.trim() ? "#94a3b8" : "white", border: "none", borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer", letterSpacing: "0.08em", fontWeight: 600 }}>
                  ASK ↗
                </button>
              </div>
            </div>

            {/* BOTTOM ROW */}
            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

              {/* KEY TAKEAWAYS */}
              <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", borderRadius: 14, border: "1px solid rgba(212,175,55,0.3)", padding: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8a9bb0", fontWeight: 600, marginBottom: 10 }}>✦ KEY TAKEAWAYS</div>
                {!lesson ? <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", padding: "12px 0" }}>Loads with lesson</div> :
                  lesson.summary.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 7, fontSize: 11, color: "#0a2540", marginBottom: 7, lineHeight: 1.5, letterSpacing: "0.02em" }}>
                      <span style={{ color: GOLD, flexShrink: 0 }}>✦</span><span>{s}</span>
                    </div>
                  ))
                }
              </div>

              {/* QUICK QUIZ */}
              <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", borderRadius: 14, border: "1px solid rgba(212,175,55,0.3)", padding: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8a9bb0", fontWeight: 600, marginBottom: 10 }}>? QUICK QUIZ</div>
                {!lesson?.quiz ? <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", padding: "12px 0" }}>Loads with lesson</div> : (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: "0.03em", color: "#0a2540" }}>{lesson.quiz.q}</div>
                    {lesson.quiz.opts.map((o, i) => (
                      <button key={i}
                        className={`av-qopt ${quizAnswered !== null ? (i === lesson.quiz!.correct ? "correct" : i === quizAnswered && quizAnswered !== lesson.quiz!.correct ? "wrong" : "") : ""}`}
                        disabled={quizAnswered !== null}
                        onClick={() => setQuizAnswered(i)}>
                        {String.fromCharCode(65 + i)}. {o}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* RELATED TOPICS */}
              <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", borderRadius: 14, border: "1px solid rgba(212,175,55,0.3)", padding: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8a9bb0", fontWeight: 600, marginBottom: 10 }}>→ RELATED TOPICS</div>
                {!lesson?.related?.length ? <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", padding: "12px 0" }}>Loads with lesson</div> :
                  lesson.related.map((t, i) => (
                    <button key={i} className="av-related" onClick={() => startLesson(t)}>
                      <span style={{ color: GOLD }}>→</span>{t}
                    </button>
                  ))
                }
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}