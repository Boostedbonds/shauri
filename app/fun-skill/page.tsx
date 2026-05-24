"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { studentKeyFromProfile } from "@/app/lib/adaptiveIdentity";
import {
  applyDailyStreak,
  ChallengeDifficulty,
  computeRoundXp,
  defaultProgress,
  mergeProgress,
  nextLevelXp,
  updateDifficulty,
} from "@/app/lib/challengeEngine";
import { getAdaptiveProfile, logAdaptiveEvents, logAdaptiveSession, upsertAdaptiveProfile } from "@/app/lib/adaptiveClient";

type Message = { role: "user" | "assistant"; content: string };
type SkillTrack = "math_battle" | "science_mystery" | "history_strategy" | "memory_master" | "logic_iq" | "map_visual";
type Student = { name: string; class: string; board: string };

const TRACKS: Array<{ id: SkillTrack; title: string; desc: string }> = [
  { id: "math_battle", title: "Math Battle Arena", desc: "Mental races, equation puzzles, speed prediction" },
  { id: "science_mystery", title: "Science Mystery Lab", desc: "Deduction missions, hypothesis elimination" },
  { id: "history_strategy", title: "History Strategy Missions", desc: "Timeline reconstruction and consequence chains" },
  { id: "memory_master", title: "Memory Master", desc: "Mnemonic systems, compression, recall chains" },
  { id: "logic_iq", title: "Logic & IQ Trainers", desc: "Classification, sequencing, elimination rounds" },
  { id: "map_visual", title: "Map & Visual Missions", desc: "Geo puzzles, label races, concept maps" },
];

export default function FunSkillPage() {
  const [student, setStudent] = useState<Student>({ name: "Student", class: "10", board: "CBSE" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [track, setTrack] = useState<SkillTrack>("math_battle");
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>(2);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboPeak, setComboPeak] = useState(0);
  const [responses, setResponses] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [responseMs, setResponseMs] = useState<number[]>([]);
  const [lastPromptAt, setLastPromptAt] = useState(Date.now());
  const [progress, setProgress] = useState(defaultProgress());
  const [sessionStart] = useState(Date.now());

  const bottomRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<any[]>([]);
  const studentKey = useMemo(() => studentKeyFromProfile(student), [student]);

  useEffect(() => {
    const raw = localStorage.getItem("shauri_student");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.name) setStudent({ name: parsed.name, class: parsed.class || "10", board: parsed.board || "CBSE" });
      } catch {}
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const remote = await getAdaptiveProfile(studentKey, "funskill");
      if (!alive || !remote?.profile) return;
      setProgress((prev) => ({
        ...prev,
        xp: Number(remote.profile.xp || prev.xp),
        level: Number(remote.profile.level || prev.level),
        currentStreak: Number(remote.profile.current_streak || prev.currentStreak),
        bestStreak: Number(remote.profile.best_streak || prev.bestStreak),
        confidence: Number(remote.profile.confidence_score || prev.confidence),
        mastery: Number(remote.profile.mastery_score || prev.mastery),
        speakingRank: remote.profile.speaking_rank || prev.speakingRank,
        unlocks: Array.isArray(remote.profile.unlocked_skills) ? remote.profile.unlocked_skills : prev.unlocks,
      }));
    })();
    return () => {
      alive = false;
    };
  }, [studentKey]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: "Welcome to Fun/Skill Arena. Pick a track and I will run adaptive challenge loops with mastery progression." }]);
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const id = setInterval(async () => {
      if (!eventsRef.current.length) return;
      const batch = [...eventsRef.current];
      eventsRef.current = [];
      try {
        await logAdaptiveEvents(batch);
      } catch {
        eventsRef.current.unshift(...batch.slice(0, 50));
      }
    }, 6000);
    return () => clearInterval(id);
  }, []);

  async function syncProfile(nextProgress: typeof progress) {
    await upsertAdaptiveProfile({
      studentKey,
      studentName: student.name,
      classLevel: student.class,
      board: student.board,
      mode: "funskill",
      xp: nextProgress.xp,
      level: nextProgress.level,
      currentStreak: nextProgress.currentStreak,
      bestStreak: nextProgress.bestStreak,
      confidenceScore: nextProgress.confidence,
      masteryScore: nextProgress.mastery,
      speakingRank: nextProgress.speakingRank,
      unlockedSkills: nextProgress.unlocks,
      weakAreas: [],
      strengths: [],
      preferences: { preferredTrack: track },
    });
  }

  async function send(textRaw: string) {
    const text = textRaw.trim();
    if (!text || loading) return;

    const elapsed = Date.now() - lastPromptAt;
    const updated = [...messages, { role: "user" as const, content: text }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setResponses((v) => v + 1);
    setResponseMs((arr) => [...arr.slice(-30), elapsed]);

    const quality = /because|pattern|formula|strategy|therefore|eliminate|evidence|sequence|map/i.test(text);
    const nextCombo = quality ? combo + 1 : 0;
    if (quality) setCorrect((v) => v + 1);
    setCombo(nextCombo);
    setComboPeak((v) => Math.max(v, nextCombo));

    const xpGain = computeRoundXp({
      track: track === "math_battle" ? "puzzle" : track === "memory_master" ? "memory" : "brain_training",
      difficulty,
      correct: quality,
      responseMs: elapsed,
      streak: nextCombo,
      confidenceDelta: quality ? 4 : 0,
    });

    const nextProgress = mergeProgress(applyDailyStreak(progress), {
      xpGain,
      confidenceGain: quality ? 2 : -1,
      masteryGain: quality ? 2 : 0,
      unlock: xpGain >= 28 ? "Elite Chain" : undefined,
    });
    setProgress(nextProgress);

    eventsRef.current.push({
      studentKey,
      mode: "funskill",
      eventType: "challenge_response",
      track,
      difficulty,
      confidence: nextProgress.confidence,
      payload: { elapsed, xpGain, quality, combo: nextCombo },
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "funskill",
          message: [
            `Track: ${track}`,
            `Class level: ${student.class}`,
            `Difficulty: ${difficulty}/5`,
            `Confidence: ${nextProgress.confidence}`,
            `Combo: ${nextCombo}`,
            "Instruction: generate one educationally meaningful challenge, include timer, scoring logic, and adaptive follow-up.",
            `Student response: ${text}`,
          ].join("\n"),
          history: updated.slice(-14),
          student,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data?.reply || "Challenge received. Push your next move." }]);
      setLastPromptAt(Date.now());
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection drop. Continue with your next attempt and we keep the streak alive." }]);
    } finally {
      const accuracy = (correct + (quality ? 1 : 0)) / Math.max(1, responses + 1);
      const avgMs = [...responseMs, elapsed].reduce((a, b) => a + b, 0) / Math.max(1, responseMs.length + 1);
      setDifficulty(updateDifficulty(difficulty, { accuracy, avgResponseMs: avgMs, confidence: nextProgress.confidence, streak: nextCombo }));
      setLoading(false);
      void syncProfile(nextProgress);
    }
  }

  async function endSession() {
    const durationSeconds = Math.max(1, Math.floor((Date.now() - sessionStart) / 1000));
    const accuracy = correct / Math.max(1, responses);
    const avgResponseMs = responseMs.length ? Math.round(responseMs.reduce((a, b) => a + b, 0) / responseMs.length) : 0;

    await Promise.allSettled([
      logAdaptiveSession({
        studentKey,
        mode: "funskill",
        track,
        difficulty,
        startedAt: new Date(sessionStart).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds,
        xpGained: progress.xp,
        comboPeak,
        accuracy,
        avgResponseMs,
        confidenceDelta: progress.confidence - 50,
        performance: { responses, correct },
      }),
      syncProfile(progress),
      eventsRef.current.length ? logAdaptiveEvents(eventsRef.current.splice(0, eventsRef.current.length)) : Promise.resolve(),
    ]);

    window.location.href = "/modes";
  }

  const levelProgress = useMemo(() => {
    const prev = Math.max(0, nextLevelXp(progress.level - 1));
    const next = nextLevelXp(progress.level);
    return Math.round(((Math.min(next, progress.xp) - prev) / Math.max(1, next - prev)) * 100);
  }, [progress.level, progress.xp]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(150deg, #0f172a 0%, #111827 38%, #020617 100%)", color: "#e2e8f0", fontFamily: "Orbitron, Segoe UI, sans-serif", padding: 18 }}>
      <style>{`
        .arena { display:grid; grid-template-columns: 360px 1fr; gap:14px; }
        .card { border: 1px solid rgba(59,130,246,0.32); border-radius: 16px; background: linear-gradient(170deg, rgba(17,24,39,0.9), rgba(2,6,23,0.9)); }
        .btn { border:1px solid rgba(129,140,248,.5); border-radius:10px; background:linear-gradient(135deg, rgba(59,130,246,.25), rgba(99,102,241,.28)); color:#e2e8f0; padding:9px 10px; cursor:pointer; font-family:inherit; }
        .track { width:100%; text-align:left; border:1px solid rgba(148,163,184,.2); border-radius:12px; background:rgba(15,23,42,.65); color:#e2e8f0; padding:10px; cursor:pointer; }
        .track.active { border-color:#a78bfa; box-shadow:0 0 0 1px #a78bfa inset; }
        .bubble { border-radius:12px; padding:11px 13px; line-height:1.6; max-width:85%; }
        @media (max-width: 980px){ .arena { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#93c5fd", letterSpacing: "0.18em" }}>SHAURI FUN/SKILL MODE</div>
          <h1 style={{ margin: "4px 0", fontSize: "clamp(20px,4vw,34px)", letterSpacing: "0.08em" }}>Elite Adaptive Learning Arena</h1>
          <div style={{ color: "#c4b5fd", fontSize: 13 }}>{student.name} • Class {student.class} • Dynamic tier {difficulty}/5</div>
        </div>
        <button onClick={endSession} className="btn">Back to Modes</button>
      </div>

      <div className="arena">
        <aside className="card" style={{ padding: 14 }}>
          <MetricGrid progress={progress} combo={combo} />
          <div style={{ height: 8, borderRadius: 99, background: "rgba(148,163,184,0.2)", overflow: "hidden", marginBottom: 8 }}>
            <div style={{ width: `${levelProgress}%`, height: "100%", background: "linear-gradient(90deg,#60a5fa,#818cf8,#a78bfa)" }} />
          </div>
          <div style={{ fontSize: 11, color: "#c4b5fd", marginBottom: 14 }}>Rank {progress.speakingRank} • Next at {nextLevelXp(progress.level)} XP</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TRACKS.map((t) => (
              <button key={t.id} onClick={() => setTrack(t.id)} className={`track ${track === t.id ? "active" : ""}`}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: "#cbd5e1" }}>{t.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="btn" onClick={() => void send(`Start ${track} challenge for class ${student.class}.`)}>Start Round</button>
            <button className="btn" onClick={() => void send("Escalate one difficulty level and reduce hints.")}>Level Up</button>
            <button className="btn" onClick={() => void send("Give weak-area challenge using past mistakes pattern.")}>Weak Area</button>
            <button className="btn" onClick={() => void send("Run beat-the-clock elimination round in 45 seconds.")}>Clock Rush</button>
          </div>
        </aside>

        <section className="card" style={{ display: "flex", flexDirection: "column", minHeight: 580 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(148,163,184,.2)", fontSize: 13, color: "#c4b5fd" }}>
            Track: {TRACKS.find((t) => t.id === track)?.title} • Adaptive challenge orchestration active
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: m.role === "assistant" ? "flex-start" : "flex-end" }}>
                <div className="bubble" style={{ background: m.role === "assistant" ? "rgba(17,24,39,.9)" : "linear-gradient(135deg,#2563eb,#7c3aed)", border: m.role === "assistant" ? "1px solid rgba(99,102,241,.45)" : "none" }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div style={{ color: "#c4b5fd", fontSize: 13 }}>Building your next intelligent challenge...</div>}
            <div ref={bottomRef} />
          </div>

          <div style={{ borderTop: "1px solid rgba(148,163,184,.2)", padding: 12, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Type your solution, strategy, or ask for next challenge..."
              style={{ flex: 1, borderRadius: 10, border: "1px solid rgba(148,163,184,.4)", background: "rgba(2,6,23,.65)", color: "#e2e8f0", padding: "11px 12px", fontFamily: "inherit" }}
            />
            <button className="btn" style={{ minWidth: 110 }} onClick={() => void send(input)}>Submit</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricGrid({ progress, combo }: { progress: ReturnType<typeof defaultProgress>; combo: number }) {
  const list = [
    ["Level", String(progress.level)],
    ["XP", String(progress.xp)],
    ["Combo", `x${combo}`],
    ["Mastery", `${Math.round(progress.mastery)}%`],
  ] as const;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 10 }}>
      {list.map(([label, value]) => (
        <div key={label} style={{ border: "1px solid rgba(148,163,184,.2)", borderRadius: 10, padding: "8px 10px", background: "rgba(15,23,42,.56)" }}>
          <div style={{ fontSize: 10, color: "#93c5fd", letterSpacing: ".14em" }}>{label}</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
