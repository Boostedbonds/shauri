"use client";
import { useState, useRef, useCallback } from "react";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "700", "900"] });

// ── Types ────────────────────────────────────────────────────
interface BreakdownItem {
  q: number;
  detected: string;
  correct: string;
  status: "correct" | "wrong" | "unattempted";
}
interface OMRResult {
  score: number;
  total: number;
  wrong: number[];
  unattempted: number[];
  breakdown: BreakdownItem[];
  sheetInfo?: string;
}

const GOLD = "#FFD700";
const DARK = "#0a0f1e";

// ── Styles ───────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${DARK};
    color: #e8dfc0;
    font-family: 'Rajdhani', sans-serif;
    min-height: 100vh;
  }

  .omr-root {
    min-height: 100vh;
    background: linear-gradient(160deg, #050a14 0%, #0a1628 50%, #0d1f3c 100%);
    padding: 0 0 60px 0;
  }

  /* Header */
  .omr-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(255,215,0,0.12);
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255,215,0,0.03);
  }
  .omr-back {
    background: none;
    border: 1px solid rgba(255,215,0,0.25);
    color: ${GOLD};
    padding: 6px 14px;
    border-radius: 6px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    letter-spacing: 0.05em;
    transition: background 0.2s;
  }
  .omr-back:hover { background: rgba(255,215,0,0.08); }

  .omr-title-block { flex: 1; }
  .omr-title {
    font-size: clamp(18px, 5vw, 26px);
    font-weight: 900;
    letter-spacing: 0.2em;
    color: ${GOLD};
    text-shadow: 0 0 20px rgba(255,215,0,0.4);
  }
  .omr-subtitle {
    font-size: 12px;
    color: rgba(255,215,0,0.5);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-top: 2px;
  }

  .omr-body { padding: 24px 20px; max-width: 640px; margin: 0 auto; }

  /* Steps indicator */
  .steps {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 28px;
  }
  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 1;
  }
  .step-dot {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 2px solid rgba(255,215,0,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    color: rgba(255,215,0,0.4);
    transition: all 0.3s;
  }
  .step.active .step-dot {
    border-color: ${GOLD};
    background: rgba(255,215,0,0.12);
    color: ${GOLD};
    box-shadow: 0 0 12px rgba(255,215,0,0.3);
  }
  .step.done .step-dot {
    border-color: #4ade80;
    background: rgba(74,222,128,0.12);
    color: #4ade80;
  }
  .step-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    color: rgba(255,215,0,0.35);
    text-transform: uppercase;
    text-align: center;
  }
  .step.active .step-label { color: rgba(255,215,0,0.8); }
  .step-line { flex: 1; height: 1px; background: rgba(255,215,0,0.15); margin-bottom: 20px; }

  /* Upload zone */
  .upload-zone {
    border: 2px dashed rgba(255,215,0,0.25);
    border-radius: 16px;
    padding: 36px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: rgba(255,215,0,0.02);
    position: relative;
    overflow: hidden;
  }
  .upload-zone:hover, .upload-zone.drag-over {
    border-color: rgba(255,215,0,0.6);
    background: rgba(255,215,0,0.05);
  }
  .upload-zone.has-image {
    border-color: rgba(255,215,0,0.4);
    padding: 12px;
  }
  .upload-icon { font-size: 40px; margin-bottom: 12px; }
  .upload-text {
    font-size: 16px; font-weight: 600;
    color: rgba(255,215,0,0.8);
    margin-bottom: 6px;
  }
  .upload-hint {
    font-size: 12px;
    color: rgba(255,215,0,0.35);
    letter-spacing: 0.05em;
  }
  .preview-img {
    width: 100%;
    max-height: 280px;
    object-fit: contain;
    border-radius: 10px;
  }
  .preview-change {
    position: absolute;
    top: 10px; right: 10px;
    background: rgba(10,15,30,0.85);
    border: 1px solid rgba(255,215,0,0.3);
    color: ${GOLD};
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 0.05em;
  }

  /* Section label */
  .section-label {
    font-size: 11px;
    letter-spacing: 0.15em;
    color: rgba(255,215,0,0.45);
    text-transform: uppercase;
    margin-bottom: 10px;
    margin-top: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,215,0,0.12);
  }

  /* Answer key grid */
  .key-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }
  .key-cell {
    background: rgba(255,215,0,0.04);
    border: 1px solid rgba(255,215,0,0.15);
    border-radius: 8px;
    padding: 8px 6px;
    text-align: center;
  }
  .key-cell-num {
    font-size: 10px;
    color: rgba(255,215,0,0.4);
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .key-cell select {
    background: transparent;
    border: none;
    color: ${GOLD};
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 15px;
    text-align: center;
    cursor: pointer;
    width: 100%;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
  }
  .key-cell select option { background: #0a1628; color: #e8dfc0; }

  /* Settings row */
  .settings-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .setting-box {
    background: rgba(255,215,0,0.04);
    border: 1px solid rgba(255,215,0,0.15);
    border-radius: 10px;
    padding: 10px 14px;
    flex: 1;
    min-width: 120px;
  }
  .setting-label {
    font-size: 10px;
    letter-spacing: 0.1em;
    color: rgba(255,215,0,0.4);
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .setting-input {
    background: transparent;
    border: none;
    color: ${GOLD};
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 18px;
    width: 100%;
    outline: none;
  }
  .setting-input::placeholder { color: rgba(255,215,0,0.2); }
  .setting-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }
  .toggle-track {
    width: 36px; height: 20px;
    border-radius: 999px;
    background: rgba(255,215,0,0.1);
    border: 1px solid rgba(255,215,0,0.25);
    position: relative;
    transition: background 0.2s;
  }
  .toggle-track.on {
    background: rgba(255,215,0,0.2);
    border-color: ${GOLD};
  }
  .toggle-thumb {
    width: 14px; height: 14px;
    border-radius: 50%;
    background: rgba(255,215,0,0.4);
    position: absolute;
    top: 2px; left: 2px;
    transition: transform 0.2s, background 0.2s;
  }
  .toggle-track.on .toggle-thumb {
    transform: translateX(16px);
    background: ${GOLD};
  }
  .toggle-label { font-size: 14px; font-weight: 600; color: rgba(255,215,0,0.7); }

  /* CTA button */
  .scan-btn {
    width: 100%;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(255,215,0,0.5);
    background: linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.05));
    color: ${GOLD};
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    margin-top: 24px;
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
  }
  .scan-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1));
    box-shadow: 0 0 24px rgba(255,215,0,0.2);
  }
  .scan-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .scan-btn.loading::after {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,215,0,0.1), transparent);
    animation: shimmer 1.2s infinite;
  }
  @keyframes shimmer {
    to { left: 100%; }
  }

  /* Results */
  .result-card {
    background: rgba(255,215,0,0.03);
    border: 1px solid rgba(255,215,0,0.2);
    border-radius: 16px;
    overflow: hidden;
    animation: fadeIn 0.4s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

  .score-banner {
    padding: 24px;
    text-align: center;
    border-bottom: 1px solid rgba(255,215,0,0.1);
    position: relative;
    overflow: hidden;
  }
  .score-banner::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 120%, rgba(255,215,0,0.08) 0%, transparent 70%);
  }
  .score-fraction {
    font-size: clamp(40px, 12vw, 64px);
    font-weight: 900;
    letter-spacing: 0.05em;
    position: relative;
  }
  .score-fraction.excellent { color: #4ade80; text-shadow: 0 0 30px rgba(74,222,128,0.4); }
  .score-fraction.good { color: ${GOLD}; text-shadow: 0 0 30px rgba(255,215,0,0.4); }
  .score-fraction.poor { color: #f87171; text-shadow: 0 0 30px rgba(248,113,113,0.4); }
  .score-percent {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.1em;
    margin-top: 4px;
    opacity: 0.6;
  }
  .score-grade {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.15em;
    margin-top: 8px;
    border: 1px solid currentColor;
  }
  .sheet-info {
    font-size: 12px;
    color: rgba(255,215,0,0.45);
    letter-spacing: 0.05em;
    margin-top: 6px;
  }

  /* Stats row */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-bottom: 1px solid rgba(255,215,0,0.1);
  }
  .stat-cell {
    padding: 14px 10px;
    text-align: center;
    border-right: 1px solid rgba(255,215,0,0.08);
  }
  .stat-cell:last-child { border-right: none; }
  .stat-num { font-size: 24px; font-weight: 700; }
  .stat-num.green { color: #4ade80; }
  .stat-num.red { color: #f87171; }
  .stat-num.amber { color: #fbbf24; }
  .stat-lbl { font-size: 10px; letter-spacing: 0.1em; color: rgba(255,215,0,0.35); text-transform: uppercase; margin-top: 2px; }

  /* Breakdown table */
  .breakdown { padding: 16px; }
  .breakdown-title {
    font-size: 11px;
    letter-spacing: 0.15em;
    color: rgba(255,215,0,0.4);
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .bk-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
    gap: 6px;
  }
  .bk-cell {
    border-radius: 8px;
    padding: 8px 4px;
    text-align: center;
    border: 1px solid transparent;
  }
  .bk-cell.correct { background: rgba(74,222,128,0.08); border-color: rgba(74,222,128,0.2); }
  .bk-cell.wrong { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); }
  .bk-cell.unattempted { background: rgba(251,191,36,0.06); border-color: rgba(251,191,36,0.15); }
  .bk-q { font-size: 10px; color: rgba(255,215,0,0.35); letter-spacing: 0.05em; }
  .bk-ans { font-size: 15px; font-weight: 700; margin-top: 2px; }
  .bk-cell.correct .bk-ans { color: #4ade80; }
  .bk-cell.wrong .bk-ans { color: #f87171; }
  .bk-cell.unattempted .bk-ans { color: #fbbf24; }
  .bk-correct-ans { font-size: 9px; color: rgba(255,255,255,0.3); margin-top: 1px; }

  /* Wrong list */
  .wrong-list {
    padding: 12px 16px;
    border-top: 1px solid rgba(255,215,0,0.08);
    font-size: 13px;
    color: rgba(255,215,0,0.5);
    letter-spacing: 0.03em;
    line-height: 1.6;
  }

  /* Scan again */
  .scan-again {
    text-align: center;
    margin-top: 20px;
  }
  .scan-again button {
    background: none;
    border: 1px solid rgba(255,215,0,0.3);
    color: rgba(255,215,0,0.7);
    padding: 10px 24px;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.12em;
    cursor: pointer;
    transition: all 0.2s;
  }
  .scan-again button:hover {
    background: rgba(255,215,0,0.06);
    border-color: ${GOLD};
    color: ${GOLD};
  }

  /* Error */
  .error-box {
    background: rgba(248,113,113,0.08);
    border: 1px solid rgba(248,113,113,0.25);
    border-radius: 10px;
    padding: 14px 16px;
    color: #f87171;
    font-size: 14px;
    margin-top: 16px;
    letter-spacing: 0.03em;
  }

  /* Responsive */
  @media (max-width: 400px) {
    .key-grid { grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); }
    .bk-grid { grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); }
  }
`;

// ── Grade helper ─────────────────────────────────────────────
function getGrade(pct: number) {
  if (pct >= 91) return { grade: "A1", cls: "excellent" };
  if (pct >= 81) return { grade: "A2", cls: "excellent" };
  if (pct >= 71) return { grade: "B1", cls: "good" };
  if (pct >= 61) return { grade: "B2", cls: "good" };
  if (pct >= 51) return { grade: "C1", cls: "good" };
  if (pct >= 41) return { grade: "C2", cls: "poor" };
  if (pct >= 33) return { grade: "D",  cls: "poor" };
  return { grade: "E", cls: "poor" };
}

// ── Main Component ───────────────────────────────────────────
export default function OMRPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [dragOver, setDragOver]         = useState(false);
  const [numQ, setNumQ]                 = useState(30);
  const [negMarking, setNegMarking]     = useState(false);
  const [answerKey, setAnswerKey]       = useState<Record<number, string>>({});
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<OMRResult | null>(null);
  const [error, setError]               = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Image handling ─────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageDataUrl(e.target?.result as string);
      setStep(2);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Answer key helpers ────────────────────────────────────
  const setAnswer = (q: number, ans: string) => {
    setAnswerKey(prev => ({ ...prev, [q]: ans }));
  };

  const quickFill = (pattern: string) => {
    const opts = ["A", "B", "C", "D"];
    const newKey: Record<number, string> = {};
    for (let i = 1; i <= numQ; i++) {
      newKey[i] = opts[(i - 1) % 4]; // cycle A B C D
    }
    setAnswerKey(newKey);
  };

  // ── Scan ─────────────────────────────────────────────────
  const scan = async () => {
    setLoading(true);
    setError("");

    // Build answer key — fill blanks with "" (will be skipped in scoring)
    const key: Record<string, string> = {};
    for (let i = 1; i <= numQ; i++) {
      key[String(i)] = answerKey[i] || "";
    }

    try {
      const res = await fetch("/api/omr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          answerKey: key,
          totalQuestions: numQ,
          negativeMarking: negMarking,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
        setStep(3);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setImageDataUrl("");
    setResult(null);
    setError("");
    setAnswerKey({});
  };

  // ── Render ────────────────────────────────────────────────
  const answeredCount = Object.values(answerKey).filter(v => v && v !== "").length;
  const canScan = imageDataUrl && answeredCount > 0;

  const pct = result ? Math.round((result.score / result.total) * 100) : 0;
  const { grade, cls: gradeCls } = result ? getGrade(pct) : { grade: "", cls: "" };

  return (
    <>
      <style>{css}</style>
      <div className="omr-root">

        {/* Header */}
        <div className="omr-header">
          <button className="omr-back" onClick={() => window.history.back()}>← Back</button>
          <div className="omr-title-block">
            <div className={`omr-title ${orbitron.className}`}>OMR SCANNER</div>
            <div className="omr-subtitle">Instant bubble sheet evaluation</div>
          </div>
        </div>

        <div className="omr-body">

          {/* Steps */}
          <div className="steps">
            <div className={`step ${step >= 1 ? (step > 1 ? "done" : "active") : ""}`}>
              <div className="step-dot">{step > 1 ? "✓" : "1"}</div>
              <div className="step-label">Upload</div>
            </div>
            <div className="step-line" />
            <div className={`step ${step >= 2 ? (step > 2 ? "done" : "active") : ""}`}>
              <div className="step-dot">{step > 2 ? "✓" : "2"}</div>
              <div className="step-label">Answer Key</div>
            </div>
            <div className="step-line" />
            <div className={`step ${step >= 3 ? "active" : ""}`}>
              <div className="step-dot">3</div>
              <div className="step-label">Result</div>
            </div>
          </div>

          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <>
              <div
                className={`upload-zone ${dragOver ? "drag-over" : ""} ${imageDataUrl ? "has-image" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                {!imageDataUrl ? (
                  <>
                    <div className="upload-icon">📷</div>
                    <div className="upload-text">Photograph or upload OMR sheet</div>
                    <div className="upload-hint">JPG • PNG • WEBP — tap to browse or drag &amp; drop</div>
                  </>
                ) : (
                  <>
                    <img src={imageDataUrl} alt="OMR sheet" className="preview-img" />
                    <span className="preview-change">Change</span>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {imageDataUrl && (
                <button className="scan-btn" onClick={() => setStep(2)}>
                  Continue → Set Answer Key
                </button>
              )}
            </>
          )}

          {/* ── STEP 2: Answer Key ── */}
          {step === 2 && (
            <>
              {/* Preview thumbnail */}
              <div style={{ marginBottom: 16 }}>
                <img
                  src={imageDataUrl}
                  alt="OMR sheet"
                  style={{ width: "100%", maxHeight: 140, objectFit: "contain",
                    borderRadius: 10, border: "1px solid rgba(255,215,0,0.15)",
                    cursor: "pointer" }}
                  onClick={() => setStep(1)}
                />
              </div>

              {/* Settings */}
              <div className="section-label">Exam Settings</div>
              <div className="settings-row">
                <div className="setting-box">
                  <div className="setting-label">Total Questions</div>
                  <input
                    className="setting-input"
                    type="number"
                    min={1} max={100}
                    value={numQ}
                    onChange={(e) => {
                      const n = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                      setNumQ(n);
                    }}
                  />
                </div>
                <div className="setting-box">
                  <div className="setting-label">Negative Marking</div>
                  <div
                    className="setting-toggle"
                    onClick={() => setNegMarking(v => !v)}
                  >
                    <div className={`toggle-track ${negMarking ? "on" : ""}`}>
                      <div className="toggle-thumb" />
                    </div>
                    <span className="toggle-label">{negMarking ? "¼ mark" : "Off"}</span>
                  </div>
                </div>
              </div>

              {/* Quick fill hint */}
              <div className="section-label">
                Answer Key
                <span
                  style={{ fontSize: 10, color: "rgba(255,215,0,0.4)", cursor: "pointer",
                    marginLeft: 4, textTransform: "lowercase", letterSpacing: "0.05em",
                    textDecoration: "underline" }}
                  onClick={() => quickFill("cycle")}
                >
                  auto-fill sample
                </span>
              </div>
              <div className="key-grid">
                {Array.from({ length: numQ }, (_, i) => i + 1).map(q => (
                  <div className="key-cell" key={q}>
                    <div className="key-cell-num">Q{q}</div>
                    <select
                      value={answerKey[q] || ""}
                      onChange={(e) => setAnswer(q, e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,215,0,0.3)",
                letterSpacing: "0.05em" }}>
                {answeredCount} / {numQ} answers entered
              </div>

              {error && <div className="error-box">⚠ {error}</div>}

              <button
                className={`scan-btn ${loading ? "loading" : ""}`}
                onClick={scan}
                disabled={!canScan || loading}
              >
                {loading ? "🔍 Scanning OMR Sheet…" : "⚡ Evaluate Now"}
              </button>
            </>
          )}

          {/* ── STEP 3: Result ── */}
          {step === 3 && result && (
            <>
              <div className="result-card">

                {/* Score banner */}
                <div className="score-banner">
                  <div className={`score-fraction ${gradeCls}`}>
                    {result.score}<span style={{ fontSize: "0.45em", opacity: 0.5 }}>/{result.total}</span>
                  </div>
                  <div className="score-percent">{pct}%</div>
                  <span className={`score-grade ${gradeCls}`} style={{
                    color: gradeCls === "excellent" ? "#4ade80" : gradeCls === "good" ? GOLD : "#f87171"
                  }}>
                    Grade {grade}
                  </span>
                  {result.sheetInfo && (
                    <div className="sheet-info">{result.sheetInfo}</div>
                  )}
                </div>

                {/* Stats */}
                <div className="stats-row">
                  <div className="stat-cell">
                    <div className="stat-num green">{result.score}</div>
                    <div className="stat-lbl">Correct</div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-num red">{result.wrong.length}</div>
                    <div className="stat-lbl">Wrong</div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-num amber">{result.unattempted.length}</div>
                    <div className="stat-lbl">Skipped</div>
                  </div>
                </div>

                {/* Breakdown grid */}
                <div className="breakdown">
                  <div className="breakdown-title">Question Breakdown</div>
                  <div className="bk-grid">
                    {result.breakdown.map(item => (
                      <div className={`bk-cell ${item.status}`} key={item.q}>
                        <div className="bk-q">Q{item.q}</div>
                        <div className="bk-ans">{item.detected}</div>
                        {item.status === "wrong" && (
                          <div className="bk-correct-ans">✓{item.correct}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Wrong questions summary */}
                {result.wrong.length > 0 && (
                  <div className="wrong-list">
                    <strong style={{ color: "#f87171" }}>Wrong:</strong>{" "}
                    Q{result.wrong.join(", Q")}
                    {result.unattempted.length > 0 && (
                      <>
                        {"  "}
                        <strong style={{ color: "#fbbf24" }}>Skipped:</strong>{" "}
                        Q{result.unattempted.join(", Q")}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="scan-again">
                <button onClick={reset}>↩ Scan Another Sheet</button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}