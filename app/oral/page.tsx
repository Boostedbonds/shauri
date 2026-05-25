"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSpeechArena, type SpeechArenaState } from "@/app/lib/speechArena";
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
import {
  getAdaptiveProfile,
  logAdaptiveEvents,
  logAdaptiveSession,
  savePronunciationSample,
  upsertAdaptiveProfile,
} from "@/app/lib/adaptiveClient";

type Message = { role: "user" | "assistant"; content: string };
type OralTrack = "conversational" | "rapid_recall" | "viva" | "fluency" | "memory" | "mission";
type Student = { name: string; class: string; board: string };

const TRACKS: Array<{ id: OralTrack; title: string; hint: string }> = [
  { id: "conversational", title: "Conversational Teaching", hint: "Explain and challenge reasoning" },
  { id: "rapid_recall", title: "Rapid Recall Combat", hint: "Timed recall and combo scoring" },
  { id: "viva", title: "Viva Simulation", hint: "CBSE practical cross-questioning" },
  { id: "fluency", title: "Speaking Confidence", hint: "Narration, pacing, fluency drills" },
  { id: "memory", title: "Active Memory Training", hint: "Teach-back and compression" },
  { id: "mission", title: "Interactive Missions", hint: "Challenge briefs under pressure" },
];

function expectedTermsForTrack(track: OralTrack, classLevel: string) {
  const cls = parseInt(String(classLevel).replace(/\D/g, ""), 10) || 8;
  const baseScience = ["photosynthesis", "diffusion", "osmosis", "chlorophyll", "mitochondria", "acceleration", "refraction"];
  const advancedScience = ["electrolysis", "valency", "momentum", "ecosystem", "respiration", "thermodynamics"];
  const socialTerms = ["parliament", "federalism", "revolution", "longitude", "latitude", "monsoon"];
  const vivaTerms = cls >= 10 ? [...baseScience, ...advancedScience] : baseScience;

  if (track === "viva" || track === "rapid_recall") return vivaTerms;
  if (track === "memory" || track === "mission") return cls >= 9 ? [...socialTerms, ...baseScience] : socialTerms;
  return baseScience;
}

export default function OralPage() {
  const [student, setStudent] = useState<Student>({ name: "Student", class: "10", board: "CBSE" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [track, setTrack] = useState<OralTrack>("conversational");
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>(2);
  const [input, setInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const [loading, setLoading] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboPeak, setComboPeak] = useState(0);
  const [responses, setResponses] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [responseMs, setResponseMs] = useState<number[]>([]);
  const [progress, setProgress] = useState(defaultProgress());
  const [speechState, setSpeechState] = useState<SpeechArenaState>("idle");
  const [speechError, setSpeechError] = useState("");
  const [pronunciationInsight, setPronunciationInsight] = useState("No speech sample scored yet.");
  const [speechFeedback, setSpeechFeedback] = useState("Feedback appears after your first speaking sample.");
  const [sessionStart] = useState(Date.now());
  const [lastPromptAt, setLastPromptAt] = useState(Date.now());
  const [voiceLang, setVoiceLang] = useState<"en-IN" | "hi-IN">("en-IN");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const eventsRef = useRef<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<ReturnType<typeof createSpeechArena> | null>(null);

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
      const remote = await getAdaptiveProfile(studentKey, "oral");
      if (!alive) return;
      if (remote?.profile) {
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
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentKey]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Welcome to Oral Arena. Choose a track, then answer with voice or text. I will adapt challenge depth, confidence pressure, and viva follow-ups in real time.",
        },
      ]);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, interimText]);

  useEffect(() => {
    speechRef.current = createSpeechArena({
      lang: "en-IN",
      silenceMs: 2600,
      onInterim: (text) => setInterimText(text),
      onFinal: async (text, durationMs, pauses, audioBlob) => {
        setSpeechState("idle");
        setInterimText("");
        if (!text.trim()) return;

        const speechForm = new FormData();
        speechForm.append("transcript", text);
        const expectedTerms = expectedTermsForTrack(track, student.class);
        speechForm.append("expectedTerms", JSON.stringify(expectedTerms));
        speechForm.append("durationMs", String(durationMs));
        speechForm.append("pauses", String(pauses));
        speechForm.append("subject", track);
        if (audioBlob && audioBlob.size > 0) {
          speechForm.append("audio", audioBlob, "oral-sample.webm");
        }

        let analysis = {
          pronunciationScore: 68,
          fluencyScore: 70,
          clarityScore: 69,
          pacingWpm: 120,
          hesitationCount: pauses,
          detectedTerms: [] as string[],
          feedback: ["Keep your pace steady and emphasize key terms."],
        };

        try {
          const evalRes = await fetch("/api/speech-eval", { method: "POST", body: speechForm });
          const evalData = await evalRes.json();
          if (evalData?.evaluation) analysis = evalData.evaluation;
        } catch {}

        setPronunciationInsight(
          `Pronunciation ${analysis.pronunciationScore}/100 | Fluency ${analysis.fluencyScore}/100 | Clarity ${analysis.clarityScore}/100 | ${analysis.pacingWpm} WPM`
        );
        setSpeechFeedback(Array.isArray((analysis as any).feedback) ? (analysis as any).feedback.join(" ") : "Good progress. Keep practicing.");

        eventsRef.current.push({
          studentKey,
          mode: "oral",
          eventType: "speech_sample",
          track,
          difficulty,
          confidence: progress.confidence,
          payload: {
            durationMs,
            pauses,
            transcriptLength: text.length,
            pronunciationScore: analysis.pronunciationScore,
            fluencyScore: analysis.fluencyScore,
          },
        });

        await savePronunciationSample({
          studentKey,
          topic: track,
          transcript: text,
          expectedTerms: expectedTermsForTrack(track, student.class),
          detectedTerms: analysis.detectedTerms,
          pronunciationScore: analysis.pronunciationScore,
          fluencyScore: analysis.fluencyScore,
          clarityScore: analysis.clarityScore,
          pacingWpm: analysis.pacingWpm,
          hesitationCount: analysis.hesitationCount,
          feedback: Array.isArray((analysis as any).feedback) ? (analysis as any).feedback.join(" ") : String((analysis as any).feedback || ""),
        });

        await send(text);
      },
      onError: (msg) => {
        setSpeechState("error");
        setSpeechError(msg);
      },
    });
  }, [difficulty, progress.confidence, studentKey, track]);

  // Preload browser voices (Chrome lazy-loads them)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      setAvailableVoices(all);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

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
      mode: "oral",
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

  function speakReply(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = voiceLang === "hi-IN" ? 0.88 : 0.92;
    utterance.pitch = 1.05;

    // Pick best matching voice for selected lang + gender
    const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();
    const langVoices = voices.filter((v) => v.lang === voiceLang || v.lang.startsWith(voiceLang.split("-")[0]));
    const femaleKeywords = ["female", "woman", "girl", "zira", "heera", "kanya", "veena", "lekha", "priya"];
    const maleKeywords = ["male", "man", "boy", "ravi", "hemant", "david", "james"];
    const genderKeywords = voiceGender === "female" ? femaleKeywords : maleKeywords;
    const oppositeKeywords = voiceGender === "female" ? maleKeywords : femaleKeywords;

    let picked: SpeechSynthesisVoice | undefined =
      langVoices.find((v) => genderKeywords.some((k) => v.name.toLowerCase().includes(k))) ||
      langVoices.find((v) => !oppositeKeywords.some((k) => v.name.toLowerCase().includes(k))) ||
      langVoices[0] ||
      voices[0];

    if (picked) utterance.voice = picked;

    // Stop mic while AI is speaking to avoid feedback loop
    utterance.onstart = () => speechRef.current?.stop();

    window.speechSynthesis.speak(utterance);
  }

  async function send(textRaw: string) {
    const text = textRaw.trim();
    if (!text || loading) return;

    const elapsed = Date.now() - lastPromptAt;
    const updatedMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(updatedMessages);
    setLoading(true);
    setInput("");
    setResponses((v) => v + 1);
    setResponseMs((arr) => [...arr.slice(-30), elapsed]);

    const answerQuality = /because|therefore|process|step|reason|evidence|formula|conclusion|depends on/i.test(text);
    const confidenceDelta = /not sure|guess|maybe|don't know|dont know/i.test(text) ? -4 : 3;

    const nextCombo = answerQuality ? combo + 1 : 0;
    setCombo(nextCombo);
    setComboPeak((v) => Math.max(v, nextCombo));
    if (answerQuality) setCorrect((v) => v + 1);

    const xpGain = computeRoundXp({
      track,
      difficulty,
      correct: answerQuality,
      responseMs: elapsed,
      streak: nextCombo,
      confidenceDelta: Math.max(0, confidenceDelta),
    });

    const merged = mergeProgress(applyDailyStreak(progress), {
      xpGain,
      confidenceGain: confidenceDelta,
      masteryGain: answerQuality ? 2 : 0,
      unlock: xpGain >= 28 ? "Viva Pressure Chain" : undefined,
    });
    setProgress(merged);

    eventsRef.current.push({
      studentKey,
      mode: "oral",
      eventType: "challenge_response",
      track,
      difficulty,
      confidence: merged.confidence,
      payload: { answerQuality, elapsed, xpGain, combo: nextCombo },
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "oral",
          message: [
            `Track: ${track}`,
            `Difficulty: ${difficulty}/5`,
            `Confidence meter: ${merged.confidence}/100`,
            `Combo streak: ${nextCombo}`,
            `Instruction: Teach interactively, ask one follow-up recall or why/how challenge, then adapt difficulty.` ,
            `Student response: ${text}`,
          ].join("\n"),
          history: updatedMessages.slice(-14),
          student,
        }),
      });
      const data = await res.json();
      const reply = data?.reply || "Let's continue with your next challenge.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      speakReply(reply);
      setLastPromptAt(Date.now());
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network interruption. Continue with your next answer and I will adapt." }]);
    } finally {
      const accuracy = (correct + (answerQuality ? 1 : 0)) / Math.max(1, responses + 1);
      const avgMs = [...responseMs, elapsed].reduce((a, b) => a + b, 0) / Math.max(1, responseMs.length + 1);
      setDifficulty(updateDifficulty(difficulty, { accuracy, avgResponseMs: avgMs, confidence: merged.confidence, streak: nextCombo }));
      setLoading(false);
      void syncProfile(merged);
    }
  }

  async function startMic() {
    if (!speechRef.current?.supported) {
      setSpeechError("Speech recognition is not supported in this browser.");
      return;
    }
    const ok = await speechRef.current.start();
    setSpeechState(ok ? "listening" : "error");
  }

  function stopMic() {
    speechRef.current?.stop();
    setSpeechState("processing");
  }

  async function finishSession() {
    const durationSeconds = Math.max(1, Math.floor((Date.now() - sessionStart) / 1000));
    const accuracy = correct / Math.max(1, responses);
    const avgResponseMs = responseMs.length ? Math.round(responseMs.reduce((a, b) => a + b, 0) / responseMs.length) : 0;

    await Promise.allSettled([
      logAdaptiveSession({
        studentKey,
        mode: "oral",
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
        performance: { responses, correct, pronunciationInsight },
      }),
      syncProfile(progress),
      eventsRef.current.length ? logAdaptiveEvents(eventsRef.current.splice(0, eventsRef.current.length)) : Promise.resolve(),
    ]);

    window.location.href = "/modes";
  }

  const progressPct = useMemo(() => {
    const prev = Math.max(0, nextLevelXp(progress.level - 1));
    const next = nextLevelXp(progress.level);
    return Math.round(((Math.min(next, progress.xp) - prev) / Math.max(1, next - prev)) * 100);
  }, [progress.level, progress.xp]);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 20% 0%, #10243d, #060c16 55%, #05070f)", color: "#dbeafe", padding: 18, fontFamily: "Orbitron, Segoe UI, sans-serif" }}>
      <style>{`
        .layout { display:grid; grid-template-columns: 360px 1fr; gap:14px; }
        .panel { border:1px solid rgba(56,189,248,.35); border-radius:16px; background:linear-gradient(170deg, rgba(15,23,42,.88), rgba(2,6,23,.9)); }
        .track { width:100%; text-align:left; border:1px solid rgba(148,163,184,.22); border-radius:12px; background:rgba(15,23,42,.66); color:#dbeafe; padding:9px 10px; cursor:pointer; }
        .track.active { border-color:#22d3ee; box-shadow:0 0 0 1px #22d3ee inset; }
        .btn { border:1px solid rgba(34,211,238,.55); border-radius:10px; background:linear-gradient(135deg, rgba(34,211,238,.28), rgba(99,102,241,.3)); color:#e0f2fe; padding:9px 10px; cursor:pointer; font-family:inherit; }
        .bubble { border-radius:12px; padding:11px 13px; max-width:86%; line-height:1.6; }
        @media (max-width: 980px){ .layout { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#7dd3fc", letterSpacing: "0.18em" }}>SHAURI ORAL ARENA</div>
          <h1 style={{ margin: "4px 0", fontSize: "clamp(20px,4vw,34px)", letterSpacing: "0.08em" }}>Adaptive Speaking Intelligence</h1>
          <div style={{ color: "#93c5fd", fontSize: 13 }}>{student.name} • Class {student.class} • {student.board}</div>
        </div>
        <button className="btn" onClick={finishSession}>Back to Modes</button>
      </div>

      <div className="layout">
        <aside className="panel" style={{ padding: 14 }}>
          <MetricGrid progress={progress} />
          <div style={{ height: 8, borderRadius: 99, background: "rgba(148,163,184,.2)", overflow: "hidden", margin: "8px 0 6px" }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg,#22d3ee,#38bdf8,#818cf8)" }} />
          </div>
          <div style={{ fontSize: 11, color: "#93c5fd", marginBottom: 10 }}>Rank {progress.speakingRank} • Difficulty {difficulty}/5 • Combo x{combo}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TRACKS.map((t) => (
              <button key={t.id} className={`track ${track === t.id ? "active" : ""}`} onClick={() => setTrack(t.id)}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: "#93c5fd" }}>{t.hint}</div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="btn" onClick={() => void send("Run 30-second rapid recall round now.")}>30s Recall</button>
            <button className="btn" onClick={() => void send("Start viva cross-questioning on my weak area.")}>Viva Drill</button>
            <button className="btn" onClick={() => void send("Give memory chain challenge with analogy.")}>Memory Chain</button>
            <button className="btn" onClick={() => void send("Give explain-in-own-words mission in 25 seconds.")}>Mission</button>
          </div>

          {/* Voice Settings */}
          <div style={{ marginTop: 14, borderTop: "1px solid rgba(148,163,184,.18)", paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: "#7dd3fc", letterSpacing: "0.14em", marginBottom: 8 }}>VOICE SETTINGS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button
                className="btn"
                onClick={() => setVoiceLang("en-IN")}
                style={{ fontSize: 12, padding: "7px 6px", opacity: voiceLang === "en-IN" ? 1 : 0.45, border: voiceLang === "en-IN" ? "1px solid #22d3ee" : "1px solid rgba(34,211,238,.3)" }}
              >
                🇬🇧 English
              </button>
              <button
                className="btn"
                onClick={() => setVoiceLang("hi-IN")}
                style={{ fontSize: 12, padding: "7px 6px", opacity: voiceLang === "hi-IN" ? 1 : 0.45, border: voiceLang === "hi-IN" ? "1px solid #22d3ee" : "1px solid rgba(34,211,238,.3)" }}
              >
                🇮🇳 Hindi
              </button>
              <button
                className="btn"
                onClick={() => setVoiceGender("female")}
                style={{ fontSize: 12, padding: "7px 6px", opacity: voiceGender === "female" ? 1 : 0.45, border: voiceGender === "female" ? "1px solid #f0abfc" : "1px solid rgba(240,171,252,.3)" }}
              >
                ♀ Female
              </button>
              <button
                className="btn"
                onClick={() => setVoiceGender("male")}
                style={{ fontSize: 12, padding: "7px 6px", opacity: voiceGender === "male" ? 1 : 0.45, border: voiceGender === "male" ? "1px solid #7dd3fc" : "1px solid rgba(125,211,252,.3)" }}
              >
                ♂ Male
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>
              Active: {voiceLang === "en-IN" ? "English" : "Hindi"} • {voiceGender === "female" ? "Female" : "Male"}
              {availableVoices.filter(v => v.lang === voiceLang).length === 0 && (
                <span style={{ color: "#fbbf24" }}> — install {voiceLang} voice in OS settings for best results</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: speechState === "error" ? "#fca5a5" : "#93c5fd" }}>
            Mic State: {speechState}
          </div>
          {speechError && <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 4 }}>{speechError}</div>}
          <div style={{ marginTop: 8, fontSize: 11, color: "#93c5fd" }}>{pronunciationInsight}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: "#cbd5e1", lineHeight: 1.5 }}>{speechFeedback}</div>
        </aside>

        <section className="panel" style={{ display: "flex", flexDirection: "column", minHeight: 590 }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(148,163,184,.2)", fontSize: 13, color: "#cbd5e1" }}>
            Live Track: {TRACKS.find((t) => t.id === track)?.title} • Oral confidence and viva adaptation active
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: m.role === "assistant" ? "flex-start" : "flex-end" }}>
                <div className="bubble" style={{ background: m.role === "assistant" ? "rgba(15,23,42,.92)" : "linear-gradient(135deg,#0284c7,#4f46e5)", border: m.role === "assistant" ? "1px solid rgba(56,189,248,.35)" : "none" }}>
                  {m.content}
                </div>
              </div>
            ))}
            {interimText && <div style={{ fontSize: 12, color: "#67e8f9" }}>Live Transcript: {interimText}</div>}
            {loading && <div style={{ fontSize: 13, color: "#93c5fd" }}>Shauri is generating your next challenge...</div>}
            <div ref={scrollRef} />
          </div>

          <div style={{ borderTop: "1px solid rgba(148,163,184,.2)", padding: 12, display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => { if (speechState === "listening") stopMic(); else void startMic(); }}>
              {speechState === "listening" ? "Stop Mic" : "Start Mic"}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Type answer or use mic for oral response..."
              style={{ flex: 1, borderRadius: 10, border: "1px solid rgba(148,163,184,.4)", background: "rgba(2,6,23,.65)", color: "#dbeafe", padding: "11px 12px", fontFamily: "inherit" }}
            />
            <button className="btn" onClick={() => void send(input)} disabled={loading}>Send</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricGrid({ progress }: { progress: ReturnType<typeof defaultProgress> }) {
  const list = [
    ["Level", String(progress.level)],
    ["XP", String(progress.xp)],
    ["Streak", `${progress.currentStreak}d`],
    ["Confidence", `${Math.round(progress.confidence)}%`],
  ] as const;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {list.map(([label, value]) => (
        <div key={label} style={{ border: "1px solid rgba(148,163,184,.22)", borderRadius: 10, padding: "8px 10px", background: "rgba(15,23,42,.55)" }}>
          <div style={{ fontSize: 10, color: "#7dd3fc", letterSpacing: "0.14em" }}>{label}</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}