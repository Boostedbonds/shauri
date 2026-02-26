"use client";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Lang = "auto" | "en-IN" | "hi-IN";
type Gender = "female" | "male";

// ── Waveform ────────────────────────────────────────────────
function Waveform({ active, color = "#38bdf8" }: { active: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 99,
          background: active ? color : "#cbd5e1",
          height: active ? undefined : 4,
          animation: active ? `wave ${0.45 + (i % 4) * 0.1}s ease-in-out ${i * 0.05}s infinite alternate` : "none",
        }} />
      ))}
      <style>{`@keyframes wave { from { height: 3px } to { height: 18px } }`}</style>
    </div>
  );
}

// ── Detect if text contains significant Devanagari ──────────
function isHindiText(text: string): boolean {
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  return devanagari > 10;
}

// ── TTS — browser-first, API as upgrade ────────────────────
function useTTS(gender: Gender, lang: Lang) {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const voicesReady = useRef(false);

  useEffect(() => {
    function load() { window.speechSynthesis?.getVoices(); voicesReady.current = true; }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  function stopAll() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function speakBrowser(text: string, effectiveLang: Lang, onStart: () => void, onEnd: () => void) {
    if (!("speechSynthesis" in window)) { onEnd(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Use hi-IN if text is Hindi or lang is hi-IN
    const resolvedLang = effectiveLang === "hi-IN" || isHindiText(text) ? "hi-IN" : "en-IN";
    u.lang = resolvedLang;
    u.rate = resolvedLang === "hi-IN" ? 0.85 : 0.92;
    u.pitch = gender === "female" ? 1.15 : 0.82;
    u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    let pick: SpeechSynthesisVoice | undefined;
    if (resolvedLang === "hi-IN") {
      // Prefer a native Hindi voice
      pick =
        voices.find(v => v.lang === "hi-IN") ||
        voices.find(v => v.lang.startsWith("hi")) ||
        voices.find(v => /lekha|heera|hindi/i.test(v.name));
    } else {
      pick = voices.find(v =>
        gender === "female"
          ? /female|woman|zira|samantha|veena|lekha|google.*female|heera/i.test(v.name)
          : /male|man|david|daniel|rishi|google.*male/i.test(v.name)
      ) || voices.find(v => v.lang.startsWith("en"));
    }
    if (pick) u.voice = pick;
    u.onstart = onStart;
    u.onend = onEnd; u.onerror = onEnd;
    onStart();
    window.speechSynthesis.speak(u);
  }

  function speak(rawText: string, onStart: () => void, onEnd: () => void, overrideLang?: Lang) {
    stopAll();
    const text = rawText
      .replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,6}\s/g, "")
      .replace(/━+|─+/g, " ").replace(/[📋📝📎⏱✅⚠❌💪🎯📈📊🔤📚👋🎙📄⬇🗣️]/g, "")
      .replace(/\s+/g, " ").trim();
    if (!text) { onEnd(); return; }
    speakBrowser(text, overrideLang ?? lang, onStart, onEnd);
  }

  return { speak, stopAll, audioRef };
}

// ── Markdown-lite ───────────────────────────────────────────
function renderText(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    return <span key={i}>{parts}{i < arr.length - 1 && <br />}</span>;
  });
}

// ── Main page ───────────────────────────────────────────────
export default function OralPage() {
  const GREETING_EN = "Hello! I'm Shauri, your learning partner.\n\nTell me what topic you'd like — explanation, dictation, spelling practice, or a spoken quiz. I understand English, Hindi, and Hinglish.";
  const GREETING_HI = "नमस्ते! मैं शौरी हूँ — आपका हिंदी शिक्षक।\n\nबताइए आप क्या सीखना चाहते हैं:\n• कोई पाठ या कहानी (जैसे: दुःख का अधिकार)\n• कोई कविता या काव्यांश\n• व्याकरण (संधि, समास, अलंकार, मुहावरे)\n• CBSE प्रश्नोत्तरी\n\nहिंदी में बोलें या लिखें — मैं समझूँगा! 😊";

  const [lang, setLang]             = useState<Lang>("auto");
  const [gender, setGender]         = useState<Gender>("female");

  const greeting = lang === "hi-IN" ? GREETING_HI : GREETING_EN;

  const [messages, setMessages]     = useState<Message[]>([{ role: "assistant", content: greeting }]);
  const [listening, setListening]   = useState(false);
  const [speaking, setSpeaking]     = useState(false);
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");
  const [inputText, setInputText]   = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const sendingRef = useRef(false);
  const [studentName, setStudentName] = useState("");

  const { speak, stopAll } = useTTS(gender, lang);
  const recognitionRef  = useRef<any>(null);
  const shauriEndRef    = useRef<HTMLDivElement>(null);
  const studentEndRef   = useRef<HTMLDivElement>(null);
  const spokenRef       = useRef(0);
  const greetingSpoken  = useRef(false);
  const prevLangRef     = useRef<Lang>("auto");

  const shauriMessages  = messages.filter(m => m.role === "assistant");
  const studentMessages = messages.filter(m => m.role === "user");

  useEffect(() => { shauriEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [shauriMessages.length]);
  useEffect(() => { studentEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [studentMessages.length]);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      if (s?.name) setStudentName(s.name);
    } catch {}
  }, []);

  // Speak greeting once on mount
  useEffect(() => {
    if (greetingSpoken.current) return;
    greetingSpoken.current = true;
    setTimeout(() => speak(greeting, () => setSpeaking(true), () => setSpeaking(false)), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user switches language → reset chat with new greeting
  useEffect(() => {
    if (prevLangRef.current === lang) return;
    prevLangRef.current = lang;
    stopAll();
    setSpeaking(false);
    const newGreeting = lang === "hi-IN" ? GREETING_HI : GREETING_EN;
    setMessages([{ role: "assistant", content: newGreeting }]);
    spokenRef.current = 0;
    setTimeout(() => speak(newGreeting, () => setSpeaking(true), () => setSpeaking(false)), 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Auto-speak new AI messages — auto-detect Hindi in response
  useEffect(() => {
    const lastIdx = messages.length - 1;
    const last = messages[lastIdx];
    if (!last || last.role !== "assistant" || lastIdx <= spokenRef.current) return;
    spokenRef.current = lastIdx;
    // If response is Hindi text, force hi-IN TTS regardless of lang setting
    const ttsLang: Lang = isHindiText(last.content) ? "hi-IN" : lang;
    speak(last.content, () => setSpeaking(true), () => setSpeaking(false), ttsLang);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Speech recognition — rebuild on lang change
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true; r.interimResults = true;
    r.lang = lang === "auto" ? "en-IN" : lang;
    r.onresult = (e: any) => {
      let finalText = "", interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interimText += t;
      }
      if (finalText) {
        const next = transcriptRef.current + finalText;
        transcriptRef.current = next;
        setTranscript(next);
      } else if (interimText) {
        setTranscript(transcriptRef.current + interimText);
      }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    return () => { try { r.stop(); } catch {} r.onresult = null; r.onend = null; };
  }, [lang]);

  useEffect(() => () => stopAll(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not available. Use Chrome on Android."); return; }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      const t = transcriptRef.current.trim();
      if (t && !isLoading) {
        handleSend(t);
        transcriptRef.current = "";
        setTranscript("");
      }
    } else {
      stopAll(); setSpeaking(false);
      transcriptRef.current = "";
      setTranscript("");
      recognitionRef.current.lang = lang === "auto" ? "en-IN" : lang;
      try { recognitionRef.current.start(); setListening(true); }
      catch { /* already started */ }
    }
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: Message = { role: "user", content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText(""); setIsLoading(true);

    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}

    const studentPayload = {
      name:  student?.name  || "Student",
      class: student?.class || "",
      board: student?.board || "CBSE",
    };

    const history = updated.slice(1, -1).map(m => ({ role: m.role, content: m.content }));

    // ── KEY FIX: pass lang + subject hint so backend enforces Hindi ──
    // Determine subject hint:
    //   1. If lang is explicitly hi-IN → subject = "hindi"
    //   2. If any message in the conversation contains Devanagari → subject = "hindi"
    //   3. If the student's message mentions "hindi" → subject = "hindi"
    const conversationText = updated.map(m => m.content).join(" ");
    const subjectHint =
      lang === "hi-IN" ||
      isHindiText(conversationText) ||
      /hindi|हिंदी/i.test(trimmed)
        ? "hindi"
        : undefined;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode:    "oral",
          message: trimmed,
          history,
          student: studentPayload,
          // ↓ NEW — tells the backend which language/subject mode to use
          subject: subjectHint,
          lang,
        }),
      });
      const data = await res.json();
      const reply = typeof data?.reply === "string" ? data.reply : "Something went wrong.";
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
    }
  }

  function handleTextSend() {
    if (sendingRef.current) return;
    const t = inputText.trim() || transcriptRef.current.trim();
    if (t) {
      handleSend(t);
      setInputText("");
      transcriptRef.current = "";
      setTranscript("");
    }
  }

  const micBg = listening ? "#ef4444" : gender === "female" ? "#db2777" : "#2563eb";

  // Label for HI button — show active indicator when Hindi is active
  const isHindiMode = lang === "hi-IN";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes micPulse {
          0%,100% { box-shadow: 0 0 0 0px rgba(239,68,68,0), 0 0 0 8px rgba(239,68,68,0.15); }
          50%      { box-shadow: 0 0 0 8px rgba(239,68,68,0.2), 0 0 0 18px rgba(239,68,68,0.05); }
        }
        .oral-body { flex: 1; display: flex; overflow: hidden; }
        .oral-shauri { width: 48%; border-right: 1.5px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
        .oral-student { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: ${isHindiMode ? "#fdf4ff" : "#f0f9ff"}; }
        @media (max-width: 699px) {
          .oral-shauri { width: 100%; border-right: none; border-bottom: 1.5px solid #e2e8f0; height: 45%; flex-shrink: 0; }
          .oral-body { flex-direction: column; }
          .oral-student { height: auto; flex: 1; }
        }
      `}</style>

      {/* TOP BAR */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px",
        background: isHindiMode ? "#fdf4ff" : "#fff",
        borderBottom: `1px solid ${isHindiMode ? "#e9d5ff" : "#e2e8f0"}`,
        flexShrink: 0,
      }}>
        <button onClick={() => window.location.href = "/modes"} style={{
          padding: "7px 12px", background: "#f1f5f9", color: "#374151",
          borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600,
        }}>← Back</button>

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: speaking ? "#f97316" : listening ? "#22c55e" : "#cbd5e1",
            boxShadow: speaking ? "0 0 7px #f97316" : listening ? "0 0 7px #22c55e" : "none",
            transition: "all 0.3s",
          }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
            {isHindiMode ? "🎙 हिंदी मोड" : "🎙 Oral Mode"}
          </span>
          {isHindiMode && (
            <span style={{
              fontSize: 10, fontWeight: 700, background: "#a855f7", color: "#fff",
              borderRadius: 5, padding: "2px 7px", letterSpacing: "0.05em",
            }}>हिंदी</span>
          )}
        </div>

        {/* Voice controls */}
        <div style={{ display: "flex", gap: 5 }}>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 7, padding: 2, border: "1px solid #e2e8f0" }}>
            {(["female", "male"] as Gender[]).map(g => (
              <button key={g} onClick={() => setGender(g)} style={{
                padding: "4px 9px", borderRadius: 5, border: "none",
                background: gender === g ? (g === "female" ? "#be185d" : "#1d4ed8") : "transparent",
                color: gender === g ? "#fff" : "#64748b",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>{g === "female" ? "♀ F" : "♂ M"}</button>
            ))}
          </div>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 7, padding: 2, border: "1px solid #e2e8f0" }}>
            {(["auto", "en-IN", "hi-IN"] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: "4px 8px", borderRadius: 5, border: "none",
                background: lang === l
                  ? (l === "hi-IN" ? "#a855f7" : "#38bdf8")
                  : "transparent",
                color: lang === l ? "#fff" : "#64748b",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>
                {l === "auto" ? "AUTO" : l === "en-IN" ? "EN" : "हिंदी"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SPLIT BODY */}
      <div className="oral-body">

        {/* LEFT — SHAURI's messages */}
        <div className="oral-shauri">
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc", flexShrink: 0,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, #38bdf8, #818cf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, flexShrink: 0,
            }}>🤖</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>SHAURI</div>
              {speaking && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <Waveform active color="#f97316" />
                  <span style={{ fontSize: 10, color: "#f97316", fontWeight: 600 }}>
                    {isHindiMode ? "बोल रहा है…" : "speaking…"}
                  </span>
                </div>
              )}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {speaking ? (
                <button onClick={() => { stopAll(); setSpeaking(false); }} style={{
                  padding: "3px 10px", background: "#fff7ed", color: "#f97316",
                  border: "1px solid #fed7aa", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>■ {isHindiMode ? "रोकें" : "Stop"}</button>
              ) : (
                shauriMessages.length > 0 && (
                  <button onClick={() => {
                    const last = shauriMessages[shauriMessages.length - 1];
                    if (last) speak(last.content, () => setSpeaking(true), () => setSpeaking(false));
                  }} style={{
                    padding: "3px 10px", background: "#f8fafc", color: "#64748b",
                    border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>▶ {isHindiMode ? "दोबारा सुनें" : "Replay"}</button>
                )
              )}
            </div>
          </div>

          {/* SHAURI messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {shauriMessages.map((m, i) => (
              <div key={i}
                onClick={() => speak(m.content, () => setSpeaking(true), () => setSpeaking(false))}
                title="Click to replay"
                style={{
                  background: "#f1f5f9", borderRadius: "4px 16px 16px 16px",
                  padding: "12px 14px", fontSize: 15, lineHeight: 1.75,
                  color: "#0f172a", wordBreak: "break-word",
                  cursor: "pointer", border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  // Hindi text gets slightly larger line-height for Devanagari readability
                  ...(isHindiText(m.content) ? { lineHeight: 2, fontSize: 16 } : {}),
                }}
              >
                {renderText(m.content)}
              </div>
            ))}
            {isLoading && (
              <div style={{ display: "flex", gap: 5, padding: "4px 0" }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#38bdf8",
                    animation: `bounce 1s ${i * 0.15}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
            )}
            <div ref={shauriEndRef} />
          </div>
        </div>

        {/* RIGHT — Student messages + mic + input */}
        <div className="oral-student">
          <div style={{
            padding: "10px 16px",
            borderBottom: `1px solid ${isHindiMode ? "#e9d5ff" : "#bae6fd"}`,
            background: isHindiMode ? "#f3e8ff" : "#e0f2fe",
            flexShrink: 0,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: isHindiMode
                ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                : "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, flexShrink: 0,
            }}>👤</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: isHindiMode ? "#581c87" : "#0c4a6e" }}>
              {studentName || "YOU"}
            </div>
            {isHindiMode && (
              <div style={{ fontSize: 11, color: "#7c3aed", marginLeft: 4 }}>
                हिंदी में बोलें या लिखें 🎤
              </div>
            )}
          </div>

          {/* Student messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {studentMessages.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", textAlign: "center", paddingTop: 20 }}>
                {isHindiMode ? "आपके संदेश यहाँ दिखेंगे…" : "Your messages appear here…"}
              </div>
            )}
            {studentMessages.map((m, i) => (
              <div key={i} style={{
                background: isHindiMode ? "#a855f7" : "#38bdf8",
                borderRadius: "16px 4px 16px 16px",
                padding: "11px 14px", fontSize: 15, lineHeight: 1.7,
                color: "#fff", wordBreak: "break-word", alignSelf: "flex-end",
                maxWidth: "90%",
                ...(isHindiText(m.content) ? { lineHeight: 2, fontSize: 16 } : {}),
              }}>
                {renderText(m.content)}
              </div>
            ))}
            <div ref={studentEndRef} />
          </div>

          {/* Live transcript */}
          {(listening || transcript) && (
            <div style={{
              margin: "0 12px 8px",
              background: listening ? "#f0fdf4" : "#fff",
              border: `1.5px solid ${listening ? "#86efac" : "#e2e8f0"}`,
              borderRadius: 10, padding: "8px 12px",
              transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: listening ? "#22c55e" : "#94a3b8", marginBottom: 3, letterSpacing: "0.08em" }}>
                {listening
                  ? (isHindiMode ? "● सुन रहा है…" : "● LISTENING…")
                  : (isHindiMode ? "लिखा हुआ" : "TRANSCRIPT")}
              </div>
              <div style={{ fontSize: 14, color: listening ? "#166534" : "#64748b", lineHeight: 1.6 }}>
                {transcript || <span style={{ fontStyle: "italic" }}>{isHindiMode ? "बोलिए…" : "Speak now…"}</span>}
              </div>
            </div>
          )}

          {/* Mic + text input bar */}
          <div style={{
            padding: "10px 12px",
            borderTop: `1px solid ${isHindiMode ? "#e9d5ff" : "#bae6fd"}`,
            background: "#fff", flexShrink: 0,
            display: "flex", alignItems: "flex-end", gap: 10,
          }}>
            <button onClick={toggleMic} style={{
              width: 52, height: 52, borderRadius: "50%", border: "none",
              background: listening ? "#ef4444" : isHindiMode ? "#a855f7" : micBg,
              color: "#fff", fontSize: 22,
              cursor: "pointer", flexShrink: 0,
              boxShadow: listening
                ? "0 0 0 4px rgba(239,68,68,0.25)"
                : `0 4px 12px ${isHindiMode ? "#a855f750" : micBg + "50"}`,
              animation: listening ? "micPulse 1.5s infinite" : "none",
              transition: "background 0.2s, box-shadow 0.2s",
            }} title={listening ? "Stop & send" : isHindiMode ? "बोलने के लिए दबाएं" : "Tap to speak"}>
              {listening ? "■" : "🎤"}
            </button>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {listening && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Waveform active color="#22c55e" />
                  <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>
                    {isHindiMode ? "■ दबाएं और भेजें" : "Tap ■ to stop & send"}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", gap: 7 }}>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSend(); } }}
                  placeholder={isHindiMode ? "यहाँ लिखें… (Enter भेजें)" : "Or type here… (Enter to send)"}
                  rows={2}
                  disabled={isLoading}
                  style={{
                    flex: 1, resize: "none",
                    border: `1.5px solid ${isHindiMode ? "#d8b4fe" : "#e2e8f0"}`,
                    borderRadius: 10, padding: "8px 12px", fontSize: 15,
                    outline: "none", background: isLoading ? "#f1f5f9" : "#fff",
                    color: "#0f172a", lineHeight: 1.6,
                    fontFamily: isHindiMode ? "'Noto Sans Devanagari', 'Mangal', sans-serif" : "inherit",
                  }}
                />
                <button
                  onClick={handleTextSend}
                  disabled={isLoading || (!inputText.trim() && !transcript.trim())}
                  style={{
                    padding: "8px 18px", alignSelf: "stretch",
                    background: (isLoading || (!inputText.trim() && !transcript.trim()))
                      ? "#e2e8f0"
                      : (isHindiMode ? "#a855f7" : "#38bdf8"),
                    color: (isLoading || (!inputText.trim() && !transcript.trim())) ? "#94a3b8" : "#fff",
                    border: "none", borderRadius: 10,
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >{isLoading ? "…" : (isHindiMode ? "भेजें" : "Send")}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}