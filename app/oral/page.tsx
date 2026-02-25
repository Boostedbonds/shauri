"use client";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Lang = "auto" | "en-IN" | "hi-IN";
type Gender = "female" | "male";

// ─────────────────────────────────────────────────────────────
// WAVEFORM
// ─────────────────────────────────────────────────────────────
function Waveform({ active, color = "#f97316" }: { active: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 99,
          background: active ? color : "#1e293b",
          height: active ? undefined : 5,
          animation: active
            ? `wave ${0.55 + (i % 4) * 0.12}s ease-in-out ${i * 0.04}s infinite alternate`
            : "none",
          transition: "background 0.3s",
        }} />
      ))}
      <style>{`@keyframes wave { from { height: 3px; } to { height: 22px; } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SPEAK via /api/tts — falls back to browser if API fails
// ─────────────────────────────────────────────────────────────
async function speakViaAPI(
  text: string,
  gender: Gender,
  lang: Lang,
  onStart: () => void,
  onEnd: () => void,
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
) {
  if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  const clean = text
    .replace(/\*\*/g, "").replace(/\*/g, "")
    .replace(/#{1,6}\s/g, "").replace(/━+|─+/g, "")
    .replace(/[📋📝📎⏱✅⚠❌💪🎯📈📊🔤📚👋🎙]/g, "")
    .trim();

  if (!clean) return;
  onStart();

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, gender, lang: lang === "auto" ? "en-IN" : lang }),
    });

    if (!res.ok) throw new Error(`TTS API ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; onEnd(); };
    audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; onEnd(); };
    audio.play();
  } catch (err) {
    console.warn("TTS API failed, using browser fallback:", err);
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = lang === "auto" ? "en-IN" : lang;
      u.rate = 0.93;
      u.pitch = gender === "female" ? 1.1 : 0.85;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        gender === "female"
          ? /female|woman|zira|samantha|veena|lekha|google/i.test(v.name)
          : /male|man|david|daniel|google/i.test(v.name)
      );
      if (preferred) u.voice = preferred;
      u.onend = onEnd;
      window.speechSynthesis.speak(u);
    } else {
      onEnd();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function OralPage() {
  const GREETING = "Hello! I'm Shauri, your learning partner.\n\nTell me what you'd like to do — topic explanation, dictation, spelling practice, or a spoken quiz. I understand English, Hindi, and Hinglish.";

  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [listening, setListening]   = useState(false);
  const [speaking, setSpeaking]     = useState(false);
  const [transcript, setTranscript] = useState("");
  const [inputText, setInputText]   = useState("");
  const [lang, setLang]             = useState<Lang>("auto");
  const [gender, setGender]         = useState<Gender>("female");
  const [isLoading, setIsLoading]   = useState(false);
  const [lastAI, setLastAI]         = useState(GREETING);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const spokenIndexRef = useRef(0);
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const greetingSpoken = useRef(false);

  // ── Auto-scroll ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Speak greeting once on load ──────────────────────────────
  useEffect(() => {
    if (greetingSpoken.current) return;
    greetingSpoken.current = true;
    const t = setTimeout(() => {
      speakViaAPI(GREETING, gender, lang, () => setSpeaking(true), () => setSpeaking(false), audioRef);
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-speak new AI messages ────────────────────────────────
  useEffect(() => {
    const lastIdx = messages.length - 1;
    const last = messages[lastIdx];
    if (!last || last.role !== "assistant" || lastIdx <= spokenIndexRef.current) return;
    spokenIndexRef.current = lastIdx;
    setLastAI(last.content);
    speakViaAPI(last.content, gender, lang, () => setSpeaking(true), () => setSpeaking(false), audioRef);
  }, [messages, gender, lang]);

  // ── Speech recognition setup ─────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang === "auto" ? "en-IN" : lang;
    r.onresult = (e: any) => {
      let final = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      setTranscript(prev => prev + final || interim);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
  }, [lang]);

  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Please use Chrome."); return; }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      if (transcript.trim()) { handleSend(transcript.trim()); setTranscript(""); }
    } else {
      stopAudio();
      setTranscript("");
      if (!recognitionRef.current) return;
      recognitionRef.current.lang = lang === "auto" ? "en-IN" : lang;
      recognitionRef.current.start();
      setListening(true);
    }
  }

  async function handleSend(text: string) {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText("");
    setIsLoading(true);

    let student = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}

    const history = updated.slice(1, -1).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "oral", message: text.trim(), history, student }),
      });
      const data = await res.json();
      const reply = typeof data?.reply === "string" ? data.reply : "Something went wrong.";
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleTextSend() {
    const t = inputText.trim() || transcript.trim();
    if (t) { handleSend(t); setInputText(""); setTranscript(""); }
  }

  const micColor = listening ? "#ef4444" : gender === "female" ? "#ec4899" : "#3b82f6";
  const micGlow  = listening
    ? "0 0 0 10px rgba(239,68,68,0.18), 0 0 0 20px rgba(239,68,68,0.07)"
    : gender === "female"
      ? "0 0 0 8px rgba(236,72,153,0.18), 0 4px 20px rgba(236,72,153,0.3)"
      : "0 0 0 8px rgba(59,130,246,0.18), 0 4px 20px rgba(59,130,246,0.3)";

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#080f1e", color: "#e2e8f0",
      fontFamily: "'Georgia', serif", overflow: "hidden",
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        height: 54, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 20px",
        borderBottom: "1px solid #0f1f38", flexShrink: 0,
        background: "#09101f",
      }}>
        <button onClick={() => window.location.href = "/modes"} style={{
          padding: "6px 14px", background: "transparent", color: "#64748b",
          borderRadius: 8, border: "1px solid #1e293b", fontSize: 13, cursor: "pointer",
        }}>
          ← Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: speaking ? "#f97316" : listening ? "#22c55e" : "#1e293b",
            boxShadow: speaking ? "0 0 10px #f97316" : listening ? "0 0 10px #22c55e" : "none",
            transition: "all 0.3s",
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", color: "#94a3b8" }}>
            ORAL MODE
          </span>
        </div>

        {/* Gender + Language toggles */}
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", background: "#0f1929", borderRadius: 8, padding: 3, border: "1px solid #1e293b" }}>
            {(["female", "male"] as Gender[]).map(g => (
              <button key={g} onClick={() => setGender(g)} style={{
                padding: "4px 11px", borderRadius: 6, border: "none",
                background: gender === g ? (g === "female" ? "#be185d" : "#1d4ed8") : "transparent",
                color: gender === g ? "#fff" : "#475569",
                fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
              }}>
                {g === "female" ? "♀ F" : "♂ M"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", background: "#0f1929", borderRadius: 8, padding: 3, border: "1px solid #1e293b" }}>
            {(["auto", "en-IN", "hi-IN"] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: "4px 10px", borderRadius: 6, border: "none",
                background: lang === l ? "#f97316" : "transparent",
                color: lang === l ? "#fff" : "#475569",
                fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
              }}>
                {l === "auto" ? "AUTO" : l === "en-IN" ? "EN" : "HI"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY: 40/60 split ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT — Chat history */}
        <div style={{
          width: "40%", overflowY: "auto", padding: "16px 14px",
          borderRight: "1px solid #0f1f38",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#1e3a5f", marginBottom: 2 }}>
            CONVERSATION
          </div>

          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div
                  onClick={() => {
                    if (m.role === "assistant") {
                      setLastAI(m.content);
                      speakViaAPI(m.content, gender, lang, () => setSpeaking(true), () => setSpeaking(false), audioRef);
                    }
                  }}
                  title={m.role === "assistant" ? "Click to replay" : ""}
                  style={{
                    maxWidth: "90%", padding: "9px 13px",
                    borderRadius: isUser ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    background: isUser ? "#1a3a6b" : "#0d1b33",
                    border: `1px solid ${isUser ? "#2563eb25" : "#1e293b"}`,
                    fontSize: 13, lineHeight: 1.6,
                    color: isUser ? "#93c5fd" : "#cbd5e1",
                    whiteSpace: "pre-wrap",
                    cursor: m.role === "assistant" ? "pointer" : "default",
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div style={{ display: "flex", gap: 5, paddingLeft: 8, alignItems: "center", height: 24 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#f97316",
                  animation: `bounce 1s ${i * 0.14}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* RIGHT — Preview + mic + input */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px", gap: 14, overflow: "hidden" }}>

          {/* Large AI response preview */}
          <div style={{
            flex: 1,
            background: "#09101f",
            border: `1px solid ${speaking ? "#f9731630" : "#0f1f38"}`,
            borderRadius: 16, padding: "18px 20px",
            overflowY: "auto", position: "relative",
            boxShadow: speaking ? "0 0 30px rgba(249,115,22,0.06)" : "none",
            transition: "border-color 0.4s, box-shadow 0.4s",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
              color: "#1e3a5f", marginBottom: 14,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>AI RESPONSE — VERIFY HERE</span>
              <div style={{ display: "flex", gap: 8 }}>
                {speaking ? (
                  <button onClick={stopAudio} style={{
                    padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    background: "rgba(249,115,22,0.15)", color: "#f97316",
                    border: "1px solid rgba(249,115,22,0.3)", borderRadius: 6, cursor: "pointer",
                  }}>■ Stop</button>
                ) : (
                  <button onClick={() => {
                    if (lastAI) speakViaAPI(lastAI, gender, lang, () => setSpeaking(true), () => setSpeaking(false), audioRef);
                  }} disabled={!lastAI} style={{
                    padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    background: "rgba(255,255,255,0.04)", color: "#475569",
                    border: "1px solid #1e293b", borderRadius: 6,
                    cursor: lastAI ? "pointer" : "not-allowed",
                  }}>▶ Replay</button>
                )}
              </div>
            </div>

            <div style={{
              fontSize: 17, lineHeight: 1.85,
              color: speaking ? "#fed7aa" : "#e2e8f0",
              whiteSpace: "pre-wrap", transition: "color 0.4s",
            }}>
              {lastAI || <span style={{ color: "#1e293b", fontStyle: "italic" }}>Shauri's response will appear here…</span>}
            </div>

            {speaking && (
              <div style={{ position: "absolute", bottom: 14, right: 16, display: "flex", alignItems: "center", gap: 7 }}>
                <Waveform active color="#f97316" />
                <span style={{ fontSize: 11, color: "#f97316", fontWeight: 600 }}>Speaking</span>
              </div>
            )}
          </div>

          {/* Live transcript */}
          <div style={{
            background: "#09101f",
            border: `1px solid ${listening ? "#22c55e30" : "#0f1f38"}`,
            borderRadius: 12, padding: "12px 16px",
            minHeight: 56, maxHeight: 90, overflowY: "auto",
            transition: "border-color 0.3s",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: listening ? "#22c55e" : "#1e293b", marginBottom: 5 }}>
              {listening ? "● LISTENING…" : "TRANSCRIPT"}
            </div>
            <div style={{ fontSize: 14, color: listening ? "#86efac" : "#334155", lineHeight: 1.5 }}>
              {transcript || <span style={{ fontStyle: "italic", color: "#1e293b" }}>{listening ? "Speak now…" : "Your speech appears here"}</span>}
            </div>
          </div>

          {/* Mic + text input row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>

            {/* MIC — hero button */}
            <button
              onClick={toggleMic}
              style={{
                width: 68, height: 68, borderRadius: "50%", border: "none",
                background: `radial-gradient(circle at 35% 35%, ${micColor}, ${micColor}dd)`,
                color: "white", fontSize: 26, cursor: "pointer", flexShrink: 0,
                boxShadow: micGlow,
                transition: "all 0.25s",
                animation: listening ? "micPulse 1.5s infinite" : "none",
              }}
              title={listening ? "Stop & send" : "Tap to speak"}
            >
              {listening ? "■" : "🎤"}
            </button>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Waveform active={listening} color={listening ? "#22c55e" : micColor} />
                <span style={{ fontSize: 12, fontWeight: 600, color: listening ? "#22c55e" : "#334155" }}>
                  {listening ? "Tap mic again to stop & send" : "Tap mic to speak"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSend(); } }}
                  placeholder="Or type here… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  style={{
                    flex: 1, background: "#09101f",
                    border: "1px solid #1e293b", borderRadius: 10,
                    color: "#e2e8f0", padding: "10px 14px",
                    fontSize: 14, outline: "none", resize: "none", lineHeight: 1.5,
                  }}
                />
                <button
                  onClick={handleTextSend}
                  disabled={isLoading || (!inputText.trim() && !transcript.trim())}
                  style={{
                    padding: "10px 18px", alignSelf: "stretch",
                    background: isLoading ? "#1e293b" : "#2563eb",
                    color: "#fff", border: "none", borderRadius: 10,
                    fontSize: 13, fontWeight: 700,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 10px rgba(239,68,68,0.18), 0 0 0 20px rgba(239,68,68,0.07); }
          50% { box-shadow: 0 0 0 14px rgba(239,68,68,0.22), 0 0 0 26px rgba(239,68,68,0.05); }
        }
      `}</style>
    </div>
  );
}