/**
 * components/ManualMarksModal.tsx
 *
 * Fixed: now calls /api/verify-marks (dedicated route) instead of
 * /api/chat, which was causing "Unexpected token 'R', Request En..."
 * because large base64 PDFs exceeded the body size limit on /api/chat.
 */
"use client";
import { useRef, useState } from "react";
import { logActivity } from "@/lib/logActivity";

interface Props {
  subject:   string;
  chapter:   string;
  day:       number;
  onSaved:   (result: { marks: number; total: number; pct: number; errorTopics: string[] }) => void;
  onClose:   () => void;
}

type Step = "entry" | "upload" | "verifying" | "result";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12MB

export default function ManualMarksModal({ subject, chapter, day, onSaved, onClose }: Props) {
  const [step,        setStep]       = useState<Step>("entry");
  const [marks,       setMarks]      = useState("");
  const [total,       setTotal]      = useState("");
  const [qpFile,      setQpFile]     = useState<string | null>(null);   // base64 data URL
  const [asFile,      setAsFile]     = useState<string | null>(null);   // base64 data URL
  const [qpName,      setQpName]     = useState("");
  const [asName,      setAsName]     = useState("");
  const [aiResult,    setAiResult]   = useState<{
    confirmedMarks: number; confirmedTotal: number; pct: number;
    errorTopics: string[]; feedback: string; scoreChanged: boolean;
  } | null>(null);
  const [error, setError] = useState("");

  const qpRef = useRef<HTMLInputElement>(null);
  const asRef = useRef<HTMLInputElement>(null);

  function readFile(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload  = e => res(e.target?.result as string);
      reader.onerror = () => rej(new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  function isAllowedSize(file: File): boolean {
    return file.size <= MAX_UPLOAD_BYTES;
  }

  function sizeMb(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(2);
  }

  async function handleQP(file: File) {
    if (!isAllowedSize(file)) {
      setError(
        `Question paper is ${sizeMb(file.size)} MB. Please upload a file below ${sizeMb(
          MAX_UPLOAD_BYTES
        )} MB.`
      );
      return;
    }
    setError("");
    setQpName(file.name);
    setQpFile(await readFile(file));
  }

  async function handleAS(file: File) {
    if (!isAllowedSize(file)) {
      setError(
        `Answer sheet is ${sizeMb(file.size)} MB. Please upload a file below ${sizeMb(
          MAX_UPLOAD_BYTES
        )} MB.`
      );
      return;
    }
    setError("");
    setAsName(file.name);
    setAsFile(await readFile(file));
  }

  function canVerify() {
    return marks && total && parseInt(marks) <= parseInt(total) && qpFile && asFile;
  }

  async function verify() {
    setError("");
    setStep("verifying");
    const m = parseInt(marks);
    const t = parseInt(total);

    try {
      // ── FIX: Call dedicated /api/verify-marks instead of /api/chat ──
      // /api/chat was rejecting large base64 PDF payloads with
      // "Request Entity Too Large" → "Unexpected token 'R'" JSON parse crash.
      // /api/verify-marks is purpose-built for this and handles large files.
      const res = await fetch("/api/verify-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks:   m,
          total:   t,
          subject,
          chapter,
          day,
          qpFile,   // base64 data URL
          asFile,   // base64 data URL
        }),
      });

      // ── Safe JSON parse — shows friendly error instead of crashing ──
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        const compact = raw.replace(/\s+/g, " ").slice(0, 180);
        throw new Error(
          compact
            ? `Server returned an invalid response: ${compact}`
            : "Server returned an invalid response. Please try again."
        );
      }

      if (!res.ok) {
        throw new Error(data?.reply || "Verification failed. Please try again.");
      }

      const reply = data?.reply || "";

      // ── Parse AI response ──
      const scoreMatch    = reply.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)/i);
      const errorsMatch   = reply.match(/ERRORS:\s*(.+)/i);
      const feedbackMatch = reply.match(/FEEDBACK:\s*([\s\S]+)/i);

      const confirmedMarks = scoreMatch ? parseInt(scoreMatch[1]) : m;
      const confirmedTotal = scoreMatch ? parseInt(scoreMatch[2]) : t;
      const pct            = Math.round((confirmedMarks / confirmedTotal) * 100);
      const errorTopics    = errorsMatch
        ? errorsMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      const feedback       = feedbackMatch ? feedbackMatch[1].trim() : reply.slice(0, 400);
      const scoreChanged   = confirmedMarks !== m || confirmedTotal !== t;

      setAiResult({ confirmedMarks, confirmedTotal, pct, errorTopics, feedback, scoreChanged });
      setStep("result");

    } catch (e: any) {
      setError(e.message || "Verification failed. Please try again.");
      setStep("upload");
    }
  }

  async function saveResult() {
    if (!aiResult) return;
    await logActivity({
      mode:             "examiner",
      subject,
      chapters:         [chapter],
      topics:           [],
      timeTakenSeconds: 0,
      marks_obtained:   aiResult.confirmedMarks,
      total_marks:      aiResult.confirmedTotal,
      score_source:     "manual_verified",
      evaluation_text:  aiResult.feedback,
      error_topics:     aiResult.errorTopics,
    });
    onSaved({
      marks:       aiResult.confirmedMarks,
      total:       aiResult.confirmedTotal,
      pct:         aiResult.pct,
      errorTopics: aiResult.errorTopics,
    });
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0",
    borderRadius: 10, fontSize: 15, outline: "none", fontFamily: "inherit",
  };
  const btn: React.CSSProperties = {
    padding: "12px 20px", background: "#2563eb", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
  };
  const btnGhost: React.CSSProperties = {
    ...btn, background: "transparent", color: "#2563eb", border: "1.5px solid #2563eb",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 580, maxHeight: "92vh", overflow: "auto", padding: "28px 24px 40px" }}>
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: "#0f172a", margin: 0 }}>Submit Marks</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
              {subject} · {chapter} · Day {day}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer" }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {(["entry", "upload", "verifying", "result"] as Step[]).map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                background: (["entry", "upload", "verifying", "result"].indexOf(step) >= i)
                  ? "#2563eb" : "#e2e8f0",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* ── Step 1: Enter marks ── */}
        {step === "entry" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400e" }}>
              ⚠️ You must upload the question paper and answer sheet so the AI can verify your score. Self-reported marks without proof are not counted in your verified average.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Marks obtained</label>
                <input style={inp} type="number" min="0" value={marks} onChange={e => setMarks(e.target.value)} placeholder="e.g. 36" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Out of</label>
                <input style={inp} type="number" min="1" value={total} onChange={e => setTotal(e.target.value)} placeholder="e.g. 50" />
              </div>
            </div>
            {marks && total && parseInt(marks) > parseInt(total) && (
              <div style={{ color: "#dc2626", fontSize: 13 }}>Marks cannot exceed total.</div>
            )}
            <button
              style={{ ...btn, opacity: (!marks || !total || parseInt(marks) > parseInt(total)) ? 0.5 : 1 }}
              disabled={!marks || !total || parseInt(marks) > parseInt(total)}
              onClick={() => setStep("upload")}
            >
              Continue → Upload documents
            </button>
          </div>
        )}

        {/* ── Step 2: Upload PDFs ── */}
        {step === "upload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: 0 }}>
              Upload the <strong>question paper</strong> and your <strong>answer sheet</strong>. The AI will check your score of <strong>{marks}/{total}</strong> against the actual content.
            </p>

            {/* Question paper upload */}
            <div
              onClick={() => qpRef.current?.click()}
              style={{ border: `2px dashed ${qpFile ? "#2563eb" : "#e2e8f0"}`, borderRadius: 12, padding: 20, cursor: "pointer", background: qpFile ? "#eff6ff" : "#f8fafc", textAlign: "center" }}
            >
              {qpFile ? (
                <div style={{ fontSize: 14, color: "#2563eb", fontWeight: 600 }}>
                  ✓ {qpName} <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 12 }}>(tap to replace)</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>Question Paper</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>PDF or photo — tap to upload</div>
                </>
              )}
            </div>
            <input
              ref={qpRef} type="file" accept="image/*,application/pdf" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) handleQP(f); }}
            />

            {/* Answer sheet upload */}
            <div
              onClick={() => asRef.current?.click()}
              style={{ border: `2px dashed ${asFile ? "#059669" : "#e2e8f0"}`, borderRadius: 12, padding: 20, cursor: "pointer", background: asFile ? "#f0fdf4" : "#f8fafc", textAlign: "center" }}
            >
              {asFile ? (
                <div style={{ fontSize: 14, color: "#059669", fontWeight: 600 }}>
                  ✓ {asName} <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 12 }}>(tap to replace)</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📝</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>Your Answer Sheet</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>PDF or photo — tap to upload</div>
                </>
              )}
            </div>
            <input
              ref={asRef} type="file" accept="image/*,application/pdf" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAS(f); }}
            />

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#b91c1c", fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnGhost, flex: 0 }} onClick={() => setStep("entry")}>← Back</button>
              <button
                style={{ ...btn, flex: 1, opacity: canVerify() ? 1 : 0.5 }}
                disabled={!canVerify()}
                onClick={verify}
              >
                ⚡ Verify with AI
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Verifying ── */}
        {step === "verifying" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16, animation: "spin 1.5s linear infinite", display: "inline-block" }}>🔍</div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>AI is checking your work…</p>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Reading question paper and answer sheet against your claimed score of {marks}/{total}
            </p>
          </div>
        )}

        {/* ── Step 4: Result ── */}
        {step === "result" && aiResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Score result */}
            <div style={{
              background: aiResult.scoreChanged ? "#fef9c3" : "#f0fdf4",
              border: `1px solid ${aiResult.scoreChanged ? "#fde68a" : "#86efac"}`,
              borderRadius: 14, padding: 20, textAlign: "center",
            }}>
              <div style={{
                fontSize: 48, fontWeight: 800, lineHeight: 1,
                color: aiResult.pct >= 75 ? "#059669" : aiResult.pct >= 45 ? "#d97706" : "#dc2626",
              }}>
                {aiResult.confirmedMarks}/{aiResult.confirmedTotal}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>
                {aiResult.pct}%
              </div>
              {aiResult.scoreChanged ? (
                <div style={{ fontSize: 13, color: "#92400e", marginTop: 8, fontWeight: 600 }}>
                  ⚠️ AI corrected your score from {marks}/{total} to {aiResult.confirmedMarks}/{aiResult.confirmedTotal}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#059669", marginTop: 8, fontWeight: 600 }}>
                  ✅ Your claimed score confirmed
                </div>
              )}
            </div>

            {/* Error topics */}
            {aiResult.errorTopics.length > 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Errors found — will be added to your revision list
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {aiResult.errorTopics.map((t, i) => (
                    <span key={i} style={{ fontSize: 12, padding: "3px 10px", background: "#fff", border: "1px solid #fecaca", borderRadius: 20, color: "#b91c1c" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            {aiResult.feedback && (
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#334155", lineHeight: 1.65, borderLeft: "3px solid #2563eb" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", marginBottom: 6, textTransform: "uppercase" }}>AI Feedback</div>
                {aiResult.feedback}
              </div>
            )}

            <button style={{ ...btn, width: "100%" }} onClick={saveResult}>
              ✓ Save to Progress Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}