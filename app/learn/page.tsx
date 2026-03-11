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
        border: isUser ? "none" : "1px solid #e2e8f0",
        boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        {renderText(m.content)}
      </div>
    </div>
  );
}

// ─── Math symbol button ───────────────────────────────────────
function MathSymBtn({ sym, onClick }: { sym: { display: string; insert: string }; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const [flash, setFlash] = useState(false);

  function handle() {
    onClick();
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
  }

  return (
    <button
      onClick={handle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`Copy: ${sym.insert}`}
      style={{
        minWidth: 38, height: 36, padding: "2px 5px",
        background: flash ? "#dcfce7" : hover ? "#eff6ff" : "#f8fafc",
        border: `1.5px solid ${flash ? "#86efac" : hover ? "#93c5fd" : "#e2e8f0"}`,
        borderRadius: 7, fontSize: 15, cursor: "pointer",
        fontFamily: "math, 'Times New Roman', serif",
        color: "#0f172a", transition: "all 0.1s",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >{sym.display}</button>
  );
}

// ─── Dictionary + Math Panel ──────────────────────────────────
function DictionaryPanel({ subject }: { subject?: string }) {
  const isMathSubject = !!(subject && /math/i.test(subject));

  const [query, setQuery]   = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoad]  = useState(false);
  const [mode, setMode]     = useState<"dictionary" | "thesaurus" | "math">(
    isMathSubject ? "math" : "dictionary"
  );
  const [history, setHist]  = useState<{ word: string; result: string; mode: string }[]>([]);
  const [mathHistory, setMathHist] = useState<{ display: string; insert: string }[]>([]);
  const [mathSearch, setMathSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    if (isMathSubject) setMode("math");
  }, [isMathSubject]);

  async function lookup() {
    const word = query.trim();
    if (!word) return;
    setLoad(true); setResult(null);
    const prompt = mode === "dictionary"
      ? `Define "${word}": part of speech, meaning, one example sentence. Max 60 words, plain text.`
      : `Synonyms/antonyms for "${word}". Format: SYNONYMS: w1, w2, w3 | ANTONYMS: w1, w2. Max 50 words.`;
    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "teacher", message: prompt, history: [], student: { name: "lookup", class: "tool" } }),
      });
      const data = await res.json();
      const text = data?.reply || "No result.";
      setResult(text);
      setHist(prev => [{ word, result: text, mode }, ...prev.slice(0, 9)]);
    } catch { setResult("⚠️ Could not fetch."); }
    setLoad(false);
  }

  const MATH_CATS = [
    { label: "Basic", icon: "±", symbols: [
      { display: "±", insert: "±" }, { display: "×", insert: "×" }, { display: "÷", insert: "÷" },
      { display: "≠", insert: "≠" }, { display: "≤", insert: "≤" }, { display: "≥", insert: "≥" },
      { display: "≈", insert: "≈" }, { display: "∞", insert: "∞" }, { display: "√", insert: "√(" },
      { display: "∛", insert: "∛(" }, { display: "x²", insert: "²" }, { display: "x³", insert: "³" },
      { display: "xⁿ", insert: "^" }, { display: "|x|", insert: "|  |" }, { display: "%", insert: "%" },
      { display: "½", insert: "½" }, { display: "¼", insert: "¼" }, { display: "¾", insert: "¾" },
    ]},
    { label: "Greek", icon: "α", symbols: [
      { display: "α", insert: "α" }, { display: "β", insert: "β" }, { display: "γ", insert: "γ" },
      { display: "Γ", insert: "Γ" }, { display: "δ", insert: "δ" }, { display: "Δ", insert: "Δ" },
      { display: "ε", insert: "ε" }, { display: "ζ", insert: "ζ" }, { display: "η", insert: "η" },
      { display: "θ", insert: "θ" }, { display: "Θ", insert: "Θ" }, { display: "λ", insert: "λ" },
      { display: "Λ", insert: "Λ" }, { display: "μ", insert: "μ" }, { display: "π", insert: "π" },
      { display: "Π", insert: "Π" }, { display: "ρ", insert: "ρ" }, { display: "σ", insert: "σ" },
      { display: "Σ", insert: "Σ" }, { display: "τ", insert: "τ" }, { display: "φ", insert: "φ" },
      { display: "Φ", insert: "Φ" }, { display: "χ", insert: "χ" }, { display: "ψ", insert: "ψ" },
      { display: "Ψ", insert: "Ψ" }, { display: "ω", insert: "ω" }, { display: "Ω", insert: "Ω" },
    ]},
    { label: "Calc", icon: "∫", symbols: [
      { display: "∫", insert: "∫" }, { display: "∬", insert: "∬" }, { display: "∮", insert: "∮" },
      { display: "∂", insert: "∂" }, { display: "d/dx", insert: "d/dx(" }, { display: "dy/dx", insert: "dy/dx" },
      { display: "lim", insert: "lim(x→" }, { display: "→", insert: "→" },
      { display: "∑", insert: "∑" }, { display: "∏", insert: "∏" }, { display: "∇", insert: "∇" },
    ]},
    { label: "Trig", icon: "sin", symbols: [
      { display: "sin", insert: "sin(" }, { display: "cos", insert: "cos(" }, { display: "tan", insert: "tan(" },
      { display: "sin⁻¹", insert: "sin⁻¹(" }, { display: "cos⁻¹", insert: "cos⁻¹(" }, { display: "tan⁻¹", insert: "tan⁻¹(" },
      { display: "sec", insert: "sec(" }, { display: "cosec", insert: "cosec(" }, { display: "cot", insert: "cot(" },
      { display: "°", insert: "°" }, { display: "rad", insert: " rad" },
    ]},
    { label: "Sets", icon: "∈", symbols: [
      { display: "∈", insert: "∈" }, { display: "∉", insert: "∉" }, { display: "⊂", insert: "⊂" },
      { display: "⊃", insert: "⊃" }, { display: "∪", insert: "∪" }, { display: "∩", insert: "∩" },
      { display: "∅", insert: "∅" }, { display: "ℝ", insert: "ℝ" }, { display: "ℤ", insert: "ℤ" },
      { display: "ℕ", insert: "ℕ" }, { display: "ℚ", insert: "ℚ" }, { display: "ℂ", insert: "ℂ" },
      { display: "∀", insert: "∀" }, { display: "∃", insert: "∃" },
      { display: "⟹", insert: "⟹" }, { display: "⟺", insert: "⟺" },
    ]},
    { label: "Sub/Sup", icon: "xₙ", symbols: [
      { display: "²", insert: "²" }, { display: "³", insert: "³" }, { display: "ⁿ", insert: "ⁿ" },
      { display: "⁻¹", insert: "⁻¹" }, { display: "₀", insert: "₀" }, { display: "₁", insert: "₁" },
      { display: "₂", insert: "₂" }, { display: "₃", insert: "₃" }, { display: "ₙ", insert: "ₙ" },
      { display: "ᵢ", insert: "ᵢ" }, { display: "×10^", insert: "×10^" },
    ]},
    { label: "Logic", icon: "∧", symbols: [
      { display: "∧", insert: "∧" }, { display: "∨", insert: "∨" }, { display: "¬", insert: "¬" },
      { display: "⊕", insert: "⊕" }, { display: "∴", insert: "∴" }, { display: "∵", insert: "∵" },
      { display: "≡", insert: "≡" }, { display: "⊢", insert: "⊢" },
    ]},
  ];

  const allSyms = MATH_CATS.flatMap(c => c.symbols);
  const filteredSyms = mathSearch.trim()
    ? allSyms.filter(s =>
        s.display.toLowerCase().includes(mathSearch.toLowerCase()) ||
        s.insert.toLowerCase().includes(mathSearch.toLowerCase())
      )
    : null;
  const currentSyms = filteredSyms
    ? filteredSyms
    : activeCategory === -1
      ? mathHistory
      : MATH_CATS[activeCategory]?.symbols || [];

  function insertSymbol(sym: { display: string; insert: string }) {
    navigator.clipboard?.writeText(sym.insert).catch(() => {});
    setMathHist(prev => [sym, ...prev.filter(s => s.insert !== sym.insert)].slice(0, 12));
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fafbff" }}>
      <div style={{ padding: "10px 10px 0", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 7, letterSpacing: "0.08em" }}>📖 REFERENCE</div>
        <div style={{ display: "flex", gap: 3, background: "#f1f5f9", borderRadius: 8, padding: 3, marginBottom: 8 }}>
          {(["dictionary", "thesaurus", "math"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "5px 2px", position: "relative",
              background: mode === m ? (m === "math" ? "#0f172a" : "#2563eb") : "transparent",
              color: mode === m ? "#fff" : "#64748b",
              border: "none", borderRadius: 5,
              fontSize: m === "math" ? 10 : 11,
              fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
            }}>
              {m === "dictionary" ? "Dict" : m === "thesaurus" ? "Thesaurus" : "Math ∑"}
              {m === "math" && isMathSubject && mode !== "math" && (
                <span style={{ position: "absolute", top: 3, right: 4, width: 5, height: 5, borderRadius: "50%", background: "#38bdf8", display: "block" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {mode === "math" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 10px 4px", flexShrink: 0 }}>
            <input value={mathSearch} onChange={e => setMathSearch(e.target.value)}
              placeholder="Search… theta, integral, pi"
              style={{ width: "100%", padding: "6px 9px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 11, outline: "none", background: "#f8fafc" }} />
          </div>
          <div style={{ display: "flex", overflowX: "auto", gap: 3, padding: "0 10px 6px", flexShrink: 0 }}>
            {mathHistory.length > 0 && (
              <button onClick={() => { setActiveCategory(-1); setMathSearch(""); }} style={{
                padding: "3px 8px", border: "none", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: activeCategory === -1 && !mathSearch ? "#0f172a" : "#f1f5f9",
                color: activeCategory === -1 && !mathSearch ? "#fff" : "#475569",
              }}>⏱ Recent</button>
            )}
            {MATH_CATS.map((c, i) => (
              <button key={i} onClick={() => { setActiveCategory(i); setMathSearch(""); }} style={{
                padding: "3px 8px", border: "none", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: activeCategory === i && !mathSearch ? "#0f172a" : "#f1f5f9",
                color: activeCategory === i && !mathSearch ? "#fff" : "#475569",
              }}>{c.icon} {c.label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 8px", display: "flex", flexWrap: "wrap", gap: 5, alignContent: "flex-start" }}>
            {currentSyms.length === 0 && <div style={{ color: "#94a3b8", fontSize: 11, padding: "8px 0" }}>No symbols found.</div>}
            {currentSyms.map((s, i) => <MathSymBtn key={i} sym={s} onClick={() => insertSymbol(s)} />)}
          </div>
          <div style={{ padding: "5px 10px 7px", fontSize: 9, color: "#94a3b8", borderTop: "1px solid #f1f5f9", background: "#fafbff", flexShrink: 0, lineHeight: 1.6, textAlign: "center" }}>
            Click symbol → copied ✓ → paste in chat with <strong>Ctrl+V</strong>
          </div>
        </div>
      )}

      {mode !== "math" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 10px 8px", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lookup()}
                placeholder="Search word…"
                style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#f8fafc", minWidth: 0 }} />
              <button onClick={lookup} disabled={loading} style={{
                padding: "8px 12px", background: loading ? "#94a3b8" : "#2563eb",
                color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", flexShrink: 0,
              }}>{loading ? "…" : "Go"}</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px" }}>
            {loading && <div style={{ color: "#64748b", fontSize: 13 }}>Looking up <em>{query}</em>…</div>}
            {result && !loading && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>{query}</div>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{result}</div>
              </div>
            )}
            {!result && !loading && history.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7 }}>Look up any word for definitions & synonyms.</div>
            )}
            {!loading && history.map((h, i) => (
              <button key={i} onClick={() => { setQuery(h.word); setResult(h.result); setMode(h.mode as any); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", marginBottom: 4, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, color: "#475569", cursor: "pointer" }}>
                <strong>{h.word}</strong>
                <span style={{ opacity: 0.45, marginLeft: 6, fontSize: 10 }}>{h.mode}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick topic chips ─────────────────────────────────────────
const QUICK_TOPICS = [
  "Explain Photosynthesis", "Newton's Laws", "Quadratic Equations",
  "French Revolution", "Parts of Speech", "Human Digestive System",
  "Periodic Table", "Democracy in India", "Trigonometry basics",
];

// ─── Main Learn Page ──────────────────────────────────────────
export default function LearnPage() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [isLoading, setLoading]   = useState(false);
  const [studentData, setData]    = useState<any>(null);
  const [currentSubject, setCurrentSubject] = useState("");
  const [showTopics, setShowTopics] = useState(true);

  const sendingRef = useRef(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const msgsRef    = useRef<Message[]>([]);

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    let student: any = null;
    try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}
    const name  = student?.name  || "";
    const board = student?.board || "CBSE";
    const cls   = student?.class ? ` Class ${student.class}` : "";
    setData(student);
    const greeting = name
      ? `Hi ${name}! 🧠 I'm Shauri, your ${board}${cls} AI tutor.\n\nAsk me anything — concepts, examples, doubts, or pick a topic below to get started!`
      : `Hi! 🧠 I'm Shauri, your ${board} AI tutor.\n\nAsk me anything — concepts, examples, or pick a topic below!`;
    setMessages([{ role: "assistant", content: greeting }]);
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (/\b(mathematics|maths?)\b/i.test(last.content)) setCurrentSubject("mathematics");
  }, [messages]);

  async function callAPI(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer") {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setLoading(true);

    let student = studentData;
    if (!student) {
      try { student = JSON.parse(localStorage.getItem("shauri_student") || "null"); } catch {}
    }

    const history = msgsRef.current.slice(1).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "teacher",
          message: text,
          uploadedText: uploadedText || "",
          uploadType: uploadType || null,
          history,
          student: {
            name:  student?.name  || "",
            class: student?.class || "",
            board: student?.board || "CBSE",
          },
        }),
      });
      const data  = await res.json();
      const reply = typeof data?.reply === "string" ? data.reply : "";
      if (reply) setMessages(p => [...p, { role: "assistant", content: reply }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }

  async function handleSend(text: string, uploadedText?: string, uploadType?: "syllabus" | "answer") {
    if (!text.trim() && !uploadedText) return;
    if (sendingRef.current) return;
    if (/\b(mathematics|maths?)\b/i.test(text)) setCurrentSubject("mathematics");
    setShowTopics(false);
    setMessages(p => [...p, { role: "user", content: text.trim() }]);
    await callAPI(text, uploadedText, uploadType);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .dict-panel{display:none}
        @media(min-width:700px){.dict-panel{display:flex!important;flex-direction:column}}
        .topic-chip{padding:7px 14px;background:#fff;border:1.5px solid #e2e8f0;border-radius:999px;font-size:12px;font-weight:600;color:#334155;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
        .topic-chip:hover{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
      `}</style>

      {/* TOP BAR */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0,
      }}>
        <button onClick={() => window.location.href = "/modes"}
          style={{ padding: "7px 14px", background: "#f1f5f9", color: "#374151", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
          ← Back
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>🧠 Learn Mode</span>
        <div style={{ width: 80 }} />
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* CHAT */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 8px" }}>
            {messages.map((m, i) => <Bubble key={i} m={m} />)}

            {/* Quick topic chips — shown only before first user message */}
            {showTopics && !isLoading && (
              <div style={{ marginTop: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Quick topics
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {QUICK_TOPICS.map(t => (
                    <button key={t} className="topic-chip" onClick={() => handleSend(t)}>{t}</button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div style={{ display: "flex", gap: 5, padding: "4px 8px", marginBottom: 8 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", animation: `bounce 1s ${i * 0.15}s infinite ease-in-out` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "10px 16px", borderTop: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
            <ChatInput onSend={handleSend} disabled={isLoading} inline={true} />
          </div>
        </div>

        {/* REFERENCE PANEL — desktop only */}
        <div className="dict-panel" style={{ width: 244, flexShrink: 0, borderLeft: "1.5px solid #e2e8f0" }}>
          <DictionaryPanel subject={currentSubject} />
        </div>
      </div>
    </div>
  );
}