/**
 * components/ManualMarksModal.tsx
 *
 * Answer sheet now supports:
 * - Multiple JPG/PNG images (multi-page handwritten sheets)
 * - Single PDF
 * All pages sent to Gemini Vision as separate base64 parts.
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
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12MB per file
const MAX_AS_FILES = 10; // max answer sheet pages

export default function ManualMarksModal({ subject, chapter, day, onSaved, onClose }: Props) {
  const [step,        setStep]       = useState<Step>("entry");
  const [marks,       setMarks]      = useState("");
  const [total,       setTotal]      = useState("");
  const [qpFile,      setQpFile]     = useState<File | null>(null);
  const [qpName,      setQpName]     = useState("");
  const [asFiles,     setAsFiles]    = useState<File[]>([]); // multiple pages
  const [verifyStep,  setVerifyStep] = useState("");
  const [aiResult,    setAiResult]   = useState<{
    confirmedMarks: number; confirmedTotal: number; pct: number;
    errorTopics: string[]; feedback: string; deductions: string[]; scoreChanged: boolean;
  } | null>(null);
  const [error, setError] = useState("");

  const qpRef = useRef<HTMLInputElement>(null);
  const asRef = useRef<HTMLInputElement>(null);

  // ── Image compression ──
  async function maybeCompressImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) return file;
    const bitmap = await createImageBitmap(file);
    const maxW = 1800;
    const scale = bitmap.width > maxW ? maxW / bitmap.width : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    if (!blob) return file;
    const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
      type: "image/jpeg", lastModified: Date.now(),
    });
    return compressed.size < file.size ? compressed : file;
  }

  function sizeMb(bytes: number) { return (bytes / (1024 * 1024)).toFixed(2); }

  // ── QP handler (single PDF or image) ──
  async function handleQP(file: File) {
    const processed = await maybeCompressImage(file);
    if (processed.size > MAX_UPLOAD_BYTES) {
      setError(`Question paper is ${sizeMb(processed.size)} MB. Max 12 MB.`); return;
    }
    setError(""); setQpName(processed.name); setQpFile(processed);
  }

  // ── AS handler (multiple images OR single PDF) ──
  async function handleAS(newFiles: FileList) {
    const incoming = Array.from(newFiles);

    // If any PDF in selection, treat as single-file mode
    const hasPdf = incoming.some(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (hasPdf) {
      if (incoming.length > 1) {
        setError("Please upload only one PDF at a time for the answer sheet."); return;
      }
      const file = incoming[0];
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`Answer sheet PDF is ${sizeMb(file.size)} MB. Max 12 MB.`); return;
      }
      setError(""); setAsFiles([file]); return;
    }

    // Images — allow multiple, compress each
    const combined = [...asFiles, ...incoming].slice(0, MAX_AS_FILES);
    const processed: File[] = [];
    for (const f of combined) {
      const p = await maybeCompressImage(f);
      if (p.size > MAX_UPLOAD_BYTES) {
        setError(`"${f.name}" is too large (${sizeMb(p.size)} MB). Max 12 MB per image.`); return;
      }
      processed.push(p);
    }
    setError(""); setAsFiles(processed);
  }

  function removeAsFile(idx: number) {
    setAsFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function canVerify() {
    return marks && total && parseInt(marks) <= parseInt(total) && qpFile && asFiles.length > 0;
  }

  // ── Upload single file to Blob ──
  async function uploadToBlob(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload-blob", { method: "POST", body: form });
    const raw = await res.text();
    let data: any;
    try { data = JSON.parse(raw); } catch {
      throw new Error("Upload failed: invalid server response.");
    }
    if (!res.ok || !data?.url) throw new Error(data?.error || "File upload failed.");
    return data.url as string;
  }

  async function verify() {
    setError(""); setStep("verifying");
    const m = parseInt(marks);
    const t = parseInt(total);

    try {
      // Upload QP
      setVerifyStep("Uploading question paper…");
      const qpUrl = await uploadToBlob(qpFile!);

      // Upload all answer sheet pages
      const asUrls: string[] = [];
      for (let i = 0; i < asFiles.length; i++) {
        setVerifyStep(`Uploading answer sheet page ${i + 1} of ${asFiles.length}…`);
        asUrls.push(await uploadToBlob(asFiles[i]));
      }

      // Call verify-marks with array of AS URLs
      setVerifyStep("AI is reading your answer sheet…");
      const res = await fetch("/api/verify-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks: m, total: t,
          subject, chapter, day: String(day),
          qpUrl,
          asUrls, // array — supports multi-page
        }),
      });

      const raw = await res.text();
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch {
        const compact = raw.replace(/\s+/g, " ").slice(0, 180);
        throw new Error(compact || "Server returned an invalid response.");
      }
      if (!res.ok) throw new Error(data?.reply || "Verification failed.");

      const reply = data?.reply || "";

      // Parse AI response
      const scoreMatch      = reply.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)/i);
      const deductionsMatch = reply.match(/DEDUCTIONS:\s*([\s\S]+?)(?=ERRORS:|FEEDBACK:|$)/i);
      const errorsMatch     = reply.match(/ERRORS:\s*(.+)/i);
      const feedbackMatch   = reply.match(/FEEDBACK:\s*([\s\S]+)/i);

      const confirmedMarks = scoreMatch ? parseInt(scoreMatch[1]) : m;
      const confirmedTotal = scoreMatch ? parseInt(scoreMatch[2]) : t;
      const pct            = Math.round((confirmedMarks / confirmedTotal) * 100);
      const deductions: string[] = deductionsMatch
        ? deductionsMatch[1].split("\n").map((l: string) => l.trim())
            .filter((l: string) => l && l.toLowerCase() !== "none" && l.length > 2)
        : [];
      const errorTopics = errorsMatch
        ? errorsMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
      const feedback     = feedbackMatch ? feedbackMatch[1].trim() : reply.slice(0, 400);
      const scoreChanged = confirmedMarks !== m || confirmedTotal !== t;

      setAiResult({ confirmedMarks, confirmedTotal, pct, errorTopics, feedback, deductions, scoreChanged });
      setStep("result");

    } catch (e: any) {
      setError(e.message || "Verification failed. Please try again.");
      setStep("upload");
    }
  }

  async function saveResult() {
    if (!aiResult) return;
    await logActivity({
      mode: "examiner", subject, chapters: [chapter], topics: [],
      timeTakenSeconds: 0,
      marks_obtained: aiResult.confirmedMarks,
      total_marks: aiResult.confirmedTotal,
      score_source: "manual_verified",
      evaluation_text: aiResult.feedback,
      error_topics: aiResult.errorTopics,
    });
    onSaved({ marks: aiResult.confirmedMarks, total: aiResult.confirmedTotal, pct: aiResult.pct, errorTopics: aiResult.errorTopics });
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

  const isPdf = asFiles.length === 1 && (asFiles[0].type === "application/pdf" || asFiles[0].name.endsWith(".pdf"));

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
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>{subject} · {chapter} · Day {day}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer" }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {(["entry", "upload", "verifying", "result"] as Step[]).map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: (["entry","upload","verifying","result"].indexOf(step) >= i) ? "#2563eb" : "#e2e8f0",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* ── Step 1: Enter marks ── */}
        {step === "entry" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400e" }}>
              ⚠️ Upload the question paper and answer sheet so AI can verify your score. Self-reported marks without proof are not counted in your verified average.
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

        {/* ── Step 2: Upload ── */}
        {step === "upload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: 0 }}>
              Upload the <strong>question paper</strong> and your <strong>answer sheet</strong>. AI will check your score of <strong>{marks}/{total}</strong>.
            </p>

            {/* Question paper — single PDF/image */}
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
            <input ref={qpRef} type="file" accept="image/*,application/pdf" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) handleQP(f); }} />

            {/* Answer sheet — multi-image OR single PDF */}
            <div>
              <div
                onClick={() => asRef.current?.click()}
                style={{ border: `2px dashed ${asFiles.length > 0 ? "#059669" : "#e2e8f0"}`, borderRadius: 12, padding: 20, cursor: "pointer", background: asFiles.length > 0 ? "#f0fdf4" : "#f8fafc", textAlign: "center" }}
              >
                {asFiles.length === 0 ? (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📝</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>Your Answer Sheet</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                      Tap to upload — PDF <strong>or</strong> multiple photos (one per page)
                    </div>
                  </>
                ) : isPdf ? (
                  <div style={{ fontSize: 14, color: "#059669", fontWeight: 600 }}>
                    ✓ {asFiles[0].name} <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 12 }}>(tap to replace)</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>
                    ✓ {asFiles.length} page{asFiles.length > 1 ? "s" : ""} uploaded
                    <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 12 }}> (tap to add more)</span>
                  </div>
                )}
              </div>
              <input
                ref={asRef} type="file"
                accept="image/*,application/pdf"
                multiple hidden
                onChange={e => { if (e.target.files?.length) handleAS(e.target.files); e.target.value = ""; }}
              />

              {/* Page thumbnails for multi-image */}
              {asFiles.length > 0 && !isPdf && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {asFiles.map((f, i) => (
                    <div key={i} style={{ position: "relative", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
                      📄 Page {i + 1}
                      <button
                        onClick={() => removeAsFile(i)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, lineHeight: 1, padding: 0 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Scanner app hint */}
              <div style={{ marginTop: 10, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#0369a1" }}>
                💡 <strong>For best results:</strong> Use <strong>Adobe Scan</strong> or <strong>Google Drive</strong> app to scan all pages into one PDF. Free &amp; takes 30 seconds.
              </div>
            </div>

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
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
              {verifyStep || "AI is checking your work…"}
            </p>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Reading answer sheet against your claimed score of {marks}/{total}
            </p>
          </div>
        )}

        {/* ── Step 4: Result ── */}
        {step === "result" && aiResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: aiResult.scoreChanged ? "#fef9c3" : "#f0fdf4",
              border: `1px solid ${aiResult.scoreChanged ? "#fde68a" : "#86efac"}`,
              borderRadius: 14, padding: 20, textAlign: "center",
            }}>
              <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, color: aiResult.pct >= 75 ? "#059669" : aiResult.pct >= 45 ? "#d97706" : "#dc2626" }}>
                {aiResult.confirmedMarks}/{aiResult.confirmedTotal}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>{aiResult.pct}%</div>
              {aiResult.scoreChanged ? (
                <div style={{ fontSize: 13, color: "#92400e", marginTop: 8, fontWeight: 600 }}>
                  ⚠️ AI corrected your score from {marks}/{total} to {aiResult.confirmedMarks}/{aiResult.confirmedTotal}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#059669", marginTop: 8, fontWeight: 600 }}>✅ Your claimed score confirmed</div>
              )}
            </div>

            {/* Deductions */}
            {aiResult.scoreChanged && aiResult.deductions.length > 0 && (
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  📋 Why your score was changed
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {aiResult.deductions.map((line, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#431407", background: "#fff", border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 12px", lineHeight: 1.6 }}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error topics */}
            {aiResult.errorTopics.length > 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Errors found — will be added to your revision list
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {aiResult.errorTopics.map((t, i) => (
                    <span key={i} style={{ fontSize: 12, padding: "3px 10px", background: "#fff", border: "1px solid #fecaca", borderRadius: 20, color: "#b91c1c" }}>{t}</span>
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