"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { logActivity } from "@/lib/logActivity";

type Message = { role: "user" | "assistant"; content: string };
type Lang    = "auto" | "en-IN" | "hi-IN";
type Gender  = "female" | "male";

// ── Waveform ─────────────────────────────────────────────────
function Waveform({ active, color = "#38bdf8" }: { active: boolean; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, height: 16 }}>
      {[0,1,2,3,4].map(i => (
        <span key={i} style={{
          display: "inline-block", width: 3, borderRadius: 99,
          background: active ? color : "#cbd5e1",
          height: active ? undefined : 3,
          animation: active ? `oralWave ${0.38 + (i % 3) * 0.1}s ease-in-out ${i * 0.06}s infinite alternate` : "none",
        }} />
      ))}
    </span>
  );
}

function isHindiText(text: string) {
  return (text.match(/[\u0900-\u097F]/g) || []).length > 8;
}

function ttsClean(text: string) {
  return text
    .replace(/\*\*/g, "").replace(/\*/g, "").replace(/#{1,6}\s/g, "")
    .replace(/[📋📝📎⏱✅⚠❌💪🎯📈📊🔤📚👋🎙📄⬇🗣️😊😄🤖]/g, "")
    .replace(/━+|─+/g, " ").replace(/\s+/g, " ").trim();
}

function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i, arr) => (
        <span key={i}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
            p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
          )}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

// Extract topics discussed from conversation
function extractTopicsFromMessages(msgs: Message[]): string[] {
  const topics = new Set<string>();
  const topicPatterns = [
    /(?:about|explain|learn|practice|quiz on|spelling of|dictation for)\s+([A-Za-z\u0900-\u097F][^\n.!?]{2,40})/gi,
    /(?:chapter|topic|concept)[:\s]+([A-Za-z\u0900-\u097F][^\n.!?]{2,40})/gi,
  ];
  msgs.slice(0, 20).forEach(m => {
    topicPatterns.forEach(re => {
      let match;
      re.lastIndex = 0;
      while ((match = re.exec(m.content)) !== null) {
        const t = match[1].trim().slice(0, 50);
        if (t.length > 3) topics.add(t);
      }
    });
  });
  return [...topics].slice(0, 8);
}

function extractSubjectFromMessages(msgs: Message[]): string {
  const all = msgs.map(m => m.content).join(" ");
  const subjects = ["Science", "Mathematics", "English", "Hindi", "Social Science",
    "Physics", "Chemistry", "Biology", "History", "Geography"];
  for (const s of subjects) {
    if (new RegExp(s, "i").test(all)) return s;
  }
  return "General";
}

// ── Speech synthesis hook ─────────────────────────────────────
function useSpeech(gender: Gender) {
  const cancelRef = useRef(false);

  const loadVoices = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    loadVoices();
    window?.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
    return () => window?.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
  }, [loadVoices]);

  const stop = useCallback(() => {
    cancelRef.current = true;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setTimeout(() => { cancelRef.current = false; }, 100);
  }, []);

  const speak = useCallback((rawText: string, onStart?: () => void, onEnd?: () => void, forceLang?: "en-IN" | "hi-IN") => {
    if (!("speechSynthesis" in window)) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    cancelRef.current = false;
    const text = ttsClean(rawText);
    if (!text) { onEnd?.(); return; }
    const lang = forceLang ?? (isHindiText(text) ? "hi-IN" : "en-IN");
    const u = new SpeechSynthesisUtterance(text);
    u.lang  = lang; u.rate = lang === "hi-IN" ? 0.82 : 0.9;
    u.pitch = gender === "female" ? 1.1 : 0.85; u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    if (lang === "hi-IN") {
      u.voice = voices.find(v => v.lang === "hi-IN") || voices.find(v => v.lang.startsWith("hi")) || null;
    } else {
      u.voice = gender === "female"
        ? voices.find(v => /female|woman|zira|samantha|veena|lekha/i.test(v.name)) || voices.find(v => v.lang.startsWith("en")) || null
        : voices.find(v => /male|man|david|daniel|rishi/i.test(v.name)) || voices.find(v => v.lang.startsWith("en")) || null;
    }
    u.onstart = () => { if (!cancelRef.current) onStart?.(); };
    u.onend   = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  }, [gender]);

  return { speak, stop };
}

// ─── Main Page ────────────────────────────────────────────────
export default function OralPage() {
  const GREETING    = "Hey! 👋 I'm Shauri, your learning partner.\n\nTell me what you'd like to do:\n• Get a topic explained\n• Spelling or dictation practice\n• Spoken quiz\n\nSpeak or type — English, Hindi, or Hinglish! 😊";
  const GREETING_HI = "नमस्ते! 👋 मैं शौरी हूँ — आपका पढ़ाई का साथी।\n\nबताइए आज क्या करना है:\n• पाठ समझाना है\n• शब्द-लेखन / श्रुतलेख\n• CBSE प्रश्नोत्तरी\n\nहिंदी या अंग्रेज़ी में बोलें या लिखें! 😊";

  const [lang,     setLang]     = useState<Lang>("auto");
  const [gender,   setGender]   = useState<Gender>("female");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText,  setInputText]  = useState("");
  const [transcript, setTranscript] = useState("");
  const [listening,  setListening]  = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [elapsed,    setElapsed]    = useState(0);
  const [sessionOn,  setSessionOn]  = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  const { speak, stop } = useSpeech(gender);

  const transcriptRef  = useRef("");
  const sendingRef     = useRef(false);
  const recogRef       = useRef<any>(null);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const initRef        = useRef(false);
  const lastSpokenIdx  = useRef(-1);
  const prevLang       = useRef<Lang>("auto");
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef     = useRef<number>(0);
  const elapsedRef     = useRef(0);
  const msgsRef        = useRef<Message[]>([]);

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  const isHindi = lang === "hi-IN";
  const greet   = isHindi ? GREETING_HI : GREETING;

  // ── Session timer ─────────────────────────────────────────
  function startSession() {
    if (timerRef.current) return;
    startTsRef.current = Date.now();
    setSessionOn(true);
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startTsRef.current) / 1000);
      elapsedRef.current = s;
      setElapsed(s);
    }, 1000);
  }

  function fmtElapsed(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return [h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(" ");
  }

  // ── Save oral session ─────────────────────────────────────
  const saveSession = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const secs    = elapsedRef.current;
    if (secs < 30) return; // Don't save trivially short sessions
    const msgs    = msgsRef.current;
    const subject = extractSubjectFromMessages(msgs);
    const topics  = extractTopicsFromMessages(msgs);
    setSessionOn(false);
    setSessionSaved(true);
    await logActivity({
      mode:             "oral",
      subject,
      topics,
      timeTakenSeconds: secs,
      // No percentage for oral — no quiz scoring currently
      evaluation_text:  `Oral session: ${topics.join(", ") || "general practice"}`,
    });
  }, []);

  // Cleanup on unmount: save session
  useEffect(() => () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stop();
  }, []); // eslint-disable-line

  // ── Init ─────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const init: Message = { role: "assistant", content: greet };
    setMessages([init]);
    lastSpokenIdx.current = 0;
    setTimeout(() => speak(greet, () => setSpeaking(true), () => setSpeaking(false)), 800);
  }, []); // eslint-disable-line

  // ── Language switch ───────────────────────────────────────
  useEffect(() => {
    if (prevLang.current === lang) return;
    prevLang.current = lang;
    stop(); setSpeaking(false);
    const newGreet: Message = { role: "assistant", content: isHindi ? GREETING_HI : GREETING };
    setMessages([newGreet]);
    lastSpokenIdx.current = 0;
    setTimeout(() => speak(newGreet.content, () => setSpeaking(true), () => setSpeaking(false)), 300);
  }, [lang]); // eslint-disable-line

  // ── Auto-speak new AI messages ────────────────────────────
  useEffect(() => {
    const idx = messages.length - 1;
    const msg = messages[idx];
    if (!msg || msg.role !== "assistant") return;
    if (idx <= lastSpokenIdx.current) return;
    lastSpokenIdx.current = idx;
    const fl: "en-IN" | "hi-IN" = isHindiText(msg.content) ? "hi-IN" : isHindi ? "hi-IN" : "en-IN";
    speak(msg.content, () => setSpeaking(true), () => setSpeaking(false), fl);
  }, [messages]); // eslint-disable-line

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // ── Speech recognition ────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true; r.interimResults = true;
    r.lang = lang === "auto" ? "en-IN" : lang;
    let lastFinalIdx = -1;
    const finalisedTexts = new Set<string>();
    r.onresult = (e: any) => {
      let fin = "", int = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          const key = `${i}:${t.trim()}`;
          if (i > lastFinalIdx && !finalisedTexts.has(key)) { fin += t; lastFinalIdx = i; finalisedTexts.add(key); }
        } else { int += t; }
      }
      if (fin) { transcriptRef.current += fin; setTranscript(transcriptRef.current); }
      else if (int) setTranscript(transcriptRef.current + int);
    };
    r.onend = () => { lastFinalIdx = -1; finalisedTexts.clear(); setListening(false); };
    r.onerror = () => setListening(false);
    recogRef.current = r;
    return () => { try { r.stop(); } catch {} r.onresult = null; };
  }, [lang]);

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      alert(isIOS
        ? "Voice input is not supported on Safari/iOS.\nPlease type your message, or use Chrome on Android."
        : "Voice input requires Chrome browser.");
      return;
    }
    if (listening) {
      recogRef.current?.stop(); setListening(false);
      const t = transcriptRef.current.trim();
      if (t) { sendMessage(t); transcriptRef.current = ""; setTranscript(""); }
    } else {
      stop(); setSpeaking(false);
      transcriptRef.current = ""; setTranscript("");
      recogRef.current.lang = lang === "auto" ? "en-IN" : lang;
      try { recogRef.current.start(); setListening(true); } catch {}
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;

    // Start timer on first user message
    if (!sessionOn) startSession();

    const userMsg: Message = { role: "user", content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText(""); setLoading(true);

    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}
    const txt = updated.map(m => m.content).join(" ");
    const subjectHint = isHindi || isHindiText(txt) || /hindi|हिंदी/i.test(trimmed) ? "hindi" : undefined;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "oral", message: trimmed,
          history: updated.slice(1, -1).map(m => ({ role: m.role, content: m.content })),
          student: { name: student?.name || "Student", class: student?.class || "", board: student?.board || "CBSE" },
          subject: subjectHint, lang,
        }),
      });
      const data = await res.json();
      setMessages([...updated, { role: "assistant", content: data?.reply || "Something went wrong." }]);
    } catch {
      setMessages([...updated, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally { setLoading(false); sendingRef.current = false; }
  }

  function handleSend() {
    const t = inputText.trim() || transcriptRef.current.trim();
    if (t) { sendMessage(t); setInputText(""); transcriptRef.current = ""; setTranscript(""); }
  }

  function replayLast() {
    const last = [...messages].reverse().find(m => m.role === "assistant");
    if (last) speak(last.content, () => setSpeaking(true), () => setSpeaking(false));
  }

  const accentColor = isHindi ? "#7c3aed" : "#0ea5e9";
  const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
  const elapsedDisplay = [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(" ");

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes oralWave{from{height:3px}to{height:15px}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}60%{box-shadow:0 0 0 10px rgba(239,68,68,0)}}
        .msg{animation:fadeUp 0.22s ease both}
        textarea{font-family:inherit}
        textarea:focus{outline:none;box-shadow:0 0 0 2px ${accentColor}55}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        height: 54, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 12px",
        background: `linear-gradient(90deg, ${accentColor}, ${isHindi ? "#a855f7" : "#38bdf8"})`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)", flexShrink: 0, zIndex: 10,
      }}>
        <button onClick={() => { saveSession(); setTimeout(() => window.location.href = "/modes", 400); }}
          style={{ padding: "6px 12px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          ← Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: speaking ? "#fbbf24" : listening ? "#4ade80" : "rgba(255,255,255,0.35)", boxShadow: speaking ? "0 0 6px #fbbf24" : listening ? "0 0 6px #4ade80" : "none", transition: "all 0.3s" }} />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>🎙 {isHindi ? "हिंदी मोड" : "Oral Mode"}</span>
          {speaking && <Waveform active color="#fbbf24" />}
          {/* Session timer */}
          {sessionOn && (
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.85)", background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: 6, marginLeft: 4 }}>
              ⏱ {elapsedDisplay}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 5 }}>
          {/* End session button */}
          {sessionOn && !sessionSaved && (
            <button onClick={saveSession} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.9)", color: "#0f172a", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              ✓ Save
            </button>
          )}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.15)", borderRadius: 6, padding: 2 }}>
            {(["female","male"] as Gender[]).map(g => (
              <button key={g} onClick={() => setGender(g)} style={{ padding: "4px 8px", border: "none", borderRadius: 4, cursor: "pointer", background: gender === g ? "rgba(255,255,255,0.9)" : "transparent", color: gender === g ? "#0f172a" : "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 700 }}>{g === "female" ? "♀" : "♂"}</button>
            ))}
          </div>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.15)", borderRadius: 6, padding: 2 }}>
            {(["auto","en-IN","hi-IN"] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: "4px 7px", border: "none", borderRadius: 4, cursor: "pointer", background: lang === l ? "rgba(255,255,255,0.9)" : "transparent", color: lang === l ? "#0f172a" : "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: 700 }}>{l === "auto" ? "AUTO" : l === "en-IN" ? "EN" : "HI"}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SESSION SAVED BANNER ── */}
      {sessionSaved && (
        <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "8px 14px", fontSize: 12, color: "#15803d", fontWeight: 600, flexShrink: 0 }}>
          ✅ Session saved to Progress Dashboard · {fmtElapsed(elapsedRef.current)} of oral practice recorded
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} className="msg" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${accentColor}, ${isHindi ? "#a855f7" : "#818cf8"})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginRight: 8, alignSelf: "flex-end", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>🤖</div>
            )}
            <div
              onClick={() => m.role === "assistant" && speak(m.content, () => setSpeaking(true), () => setSpeaking(false))}
              title={m.role === "assistant" ? "Tap to replay" : undefined}
              style={{ maxWidth: "80%", padding: "11px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px", background: m.role === "user" ? accentColor : "#fff", color: m.role === "user" ? "#fff" : "#0f172a", fontSize: 15, lineHeight: isHindiText(m.content) ? 1.9 : 1.7, fontFamily: isHindiText(m.content) ? "'Noto Sans Devanagari','Mangal',sans-serif" : "inherit", border: m.role === "assistant" ? "1px solid #e2e8f0" : "none", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", wordBreak: "break-word", cursor: m.role === "assistant" ? "pointer" : "default" }}>
              <RichText text={m.content} />
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 5, paddingLeft: 46 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: accentColor, animation: `bounce 0.9s ${i*0.15}s infinite ease-in-out` }} />)}
          </div>
        )}
        <div ref={bottomRef} style={{ height: 8 }} />
      </div>

      {/* ── LIVE TRANSCRIPT ── */}
      {(listening || (transcript.trim() && !loading)) && (
        <div style={{ margin: "8px 14px 0", background: listening ? "#f0fdf4" : "#f8fafc", border: `1.5px solid ${listening ? "#86efac" : "#e2e8f0"}`, borderRadius: 12, padding: "8px 12px" }}>
          {listening && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 3, color: "#22c55e" }}>{isHindi ? "● सुन रहा है…" : "● LISTENING…"}</div>}
          <div style={{ fontSize: 14, color: listening ? "#166534" : "#64748b", lineHeight: 1.6 }}>
            {transcript || <em style={{ color: "#94a3b8" }}>{isHindi ? "बोलिए…" : "Speak now…"}</em>}
          </div>
        </div>
      )}

      {/* ── SPEAKING BANNER ── */}
      {speaking && (
        <div style={{ margin: "8px 14px 0", padding: "8px 14px", background: "#0f172a", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <Waveform active color="#fbbf24" />
          <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>{isHindi ? "बोल रहा है…" : "Speaking…"}</span>
          <button onClick={() => { stop(); setSpeaking(false); }} style={{ marginLeft: "auto", padding: "3px 10px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>■ Stop</button>
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div style={{ padding: "10px 14px", paddingBottom: "calc(10px + env(safe-area-inset-bottom))", background: "#fff", borderTop: "1px solid #e2e8f0", flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 10 }}>
        <button onClick={toggleMic} style={{ width: 52, height: 52, borderRadius: "50%", border: "none", background: listening ? "#ef4444" : accentColor, color: "#fff", fontSize: 22, cursor: "pointer", flexShrink: 0, boxShadow: listening ? "none" : `0 4px 14px ${accentColor}60`, animation: listening ? "pulse 1.4s infinite" : "none", transition: "background 0.2s" }} title={listening ? "Stop & send" : isHindi ? "बोलने के लिए दबाएं" : "Tap to speak"}>
          {listening ? "■" : "🎤"}
        </button>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            value={inputText} onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={isHindi ? "🎤 बोलें  या  ✏️ यहाँ लिखें…" : "🎤 Speak  or  ✏️ Type here…"}
            rows={1} disabled={loading}
            style={{ width: "100%", resize: "none", border: `2px solid ${accentColor}55`, borderRadius: 14, padding: "13px 52px 13px 16px", fontSize: 15, lineHeight: 1.5, background: loading ? "#f8fafc" : "#fff", color: "#0f172a", fontFamily: isHindi ? "'Noto Sans Devanagari','Mangal',sans-serif" : "inherit", minHeight: 50, maxHeight: 110, overflowY: "auto" }}
          />
          <button onClick={handleSend} disabled={loading || (!inputText.trim() && !transcript.trim())}
            style={{ position: "absolute", right: 6, bottom: 6, width: 38, height: 38, borderRadius: 10, border: "none", background: (loading || (!inputText.trim() && !transcript.trim())) ? "#e2e8f0" : accentColor, color: (loading || (!inputText.trim() && !transcript.trim())) ? "#94a3b8" : "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
            {loading ? "…" : "↑"}
          </button>
        </div>
        <button onClick={replayLast} disabled={speaking || messages.filter(m=>m.role==="assistant").length === 0}
          title="Replay last response"
          style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${accentColor}40`, background: "#fff", color: accentColor, fontSize: 17, cursor: "pointer", flexShrink: 0, opacity: speaking ? 0.4 : 1, transition: "opacity 0.2s" }}>
          ▶
        </button>
      </div>
    </div>
  );
}