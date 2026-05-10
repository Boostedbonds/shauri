/**
 * components/SubmitMarksModal.tsx
 *
 * Submit Marks modal with:
 *   Step 1 — Section-wise marks entry (Primary / Secondary / Writing / Vocab)
 *   Step 2 — Upload choice: QP + Answer Sheet  OR  Result Summary
 *   Step 3 — Upload documents (per choice)
 *   Step 4 — AI verification result with section breakdown + error log
 */

"use client";

import React, { useRef, useState } from "react";
import { put } from "@vercel/blob";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface SectionScore {
  key: string;
  label: string;
  obtained: number;
  total: number;
  status: "strong" | "good" | "needs_attention" | "weak";
}

interface ErrorEntry {
  section: string;
  qNum?: string;
  topic: string;
  issue: string;
  severity: "minor" | "moderate" | "critical";
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Day info for the header */
  subject: string;
  chapter: string;
  day: string | number;
  /** true = 60m/120min revision, false = 30m/60min daily */
  isRevision: boolean;
  /** Called after successful verification */
  onVerified?: (result: {
    totalObtained: number;
    totalMarks: number;
    sectionBreakdown: SectionScore[];
    errorLog: ErrorEntry[];
  }) => void;
}

/* ─────────────────────────────────────────────
   SECTION CONFIG
───────────────────────────────────────────── */
function getSections(isRevision: boolean) {
  return isRevision
    ? [
        { key: "A",         label: "Section A – MCQs",             total: 10,  group: "Primary"  },
        { key: "B",         label: "Section B – Very Short Answer", total: 10,  group: "Primary"  },
        { key: "C",         label: "Section C – Short Answer",      total: 12,  group: "Primary"  },
        { key: "D",         label: "Section D – Case Study",        total: 10,  group: "Secondary"},
        { key: "E-Writing", label: "Section E – Writing Task",      total: 6,   group: "Writing"  },
        { key: "E-Vocab",   label: "Section E – Vocabulary",        total: 10,  group: "Vocab"    },
      ]
    : [
        { key: "A",         label: "Section A – MCQs",             total: 5,   group: "Primary"  },
        { key: "B",         label: "Section B – Very Short Answer", total: 6,   group: "Primary"  },
        { key: "C",         label: "Section C – Short Answer",      total: 6,   group: "Primary"  },
        { key: "D",         label: "Section D – Case Study",        total: 5,   group: "Secondary"},
        { key: "E-Writing", label: "Section E – Writing Task",      total: 3,   group: "Writing"  },
        { key: "E-Vocab",   label: "Section E – Vocabulary",        total: 5,   group: "Vocab"    },
      ];
}

const PAPER_TOTAL = (isRevision: boolean) => isRevision ? 60 : 30;

const STATUS_STYLE: Record<SectionScore["status"], { bg: string; text: string; label: string }> = {
  strong:           { bg: "#dcfce7", text: "#15803d", label: "Strong ✓"          },
  good:             { bg: "#dbeafe", text: "#1d4ed8", label: "Good"               },
  needs_attention:  { bg: "#fef3c7", text: "#92400e", label: "Needs Attention ⚠"  },
  weak:             { bg: "#fee2e2", text: "#dc2626", label: "Weak — Focus Here ✗" },
};

const SEVERITY_STYLE: Record<ErrorEntry["severity"], { dot: string; label: string }> = {
  minor:    { dot: "#fbbf24", label: "Minor"    },
  moderate: { dot: "#f97316", label: "Moderate" },
  critical: { dot: "#dc2626", label: "Critical" },
};

type UploadMode = "qp_as" | "result_summary";
type Step = 1 | 2 | 3 | 4;

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function SubmitMarksModal({
  isOpen, onClose, subject, chapter, day, isRevision, onVerified,
}: ModalProps) {
  const sections   = getSections(isRevision);
  const paperTotal = PAPER_TOTAL(isRevision);

  /* step state */
  const [step, setStep] = useState<Step>(1);

  /* step 1 — section marks */
  const [sectionMarks, setSectionMarks] = useState<Record<string, string>>(
    Object.fromEntries(sections.map(s => [s.key, ""]))
  );

  /* step 2 — upload mode */
  const [uploadMode, setUploadMode] = useState<UploadMode | null>(null);

  /* step 3 — files */
  const [qpFile,       setQpFile]       = useState<File | null>(null);
  const [asFiles,      setAsFiles]      = useState<File[]>([]);
  const [resultFiles,  setResultFiles]  = useState<File[]>([]);

  /* step 4 — result */
  const [verifying,          setVerifying]          = useState(false);
  const [verifyError,        setVerifyError]        = useState("");
  const [verifyReply,        setVerifyReply]        = useState("");
  const [sectionBreakdown,   setSectionBreakdown]   = useState<SectionScore[]>([]);
  const [errorLog,           setErrorLog]           = useState<ErrorEntry[]>([]);

  const qpRef     = useRef<HTMLInputElement>(null!);
  const asRef     = useRef<HTMLInputElement>(null!);
  const resultRef = useRef<HTMLInputElement>(null!);

  if (!isOpen) return null;

  /* ── computed totals ── */
  const totalObtained = sections.reduce((sum, s) => {
    const v = parseInt(sectionMarks[s.key] || "0");
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const allFilled = sections.every(s => sectionMarks[s.key] !== "");

  /* ── group helpers ── */
  const groupColors: Record<string, string> = {
    Primary:   "#3b82f6",
    Secondary: "#8b5cf6",
    Writing:   "#ec4899",
    Vocab:     "#f59e0b",
  };

  /* ── reset ── */
  function reset() {
    setStep(1);
    setSectionMarks(Object.fromEntries(sections.map(s => [s.key, ""])));
    setUploadMode(null);
    setQpFile(null); setAsFiles([]); setResultFiles([]);
    setVerifying(false); setVerifyError("");
    setVerifyReply(""); setSectionBreakdown([]); setErrorLog([]);
  }

  function handleClose() { reset(); onClose(); }

  /* ── step 1 → 2 ── */
  function goToUploadChoice() {
    if (!allFilled) return;
    setStep(2);
  }

  /* ── step 2 → 3 ── */
  function selectMode(m: UploadMode) {
    setUploadMode(m);
    setStep(3);
  }

  /* ── step 3 → verify ── */
  async function handleVerify() {
    setVerifying(true);
    setVerifyError("");

    try {
      // Upload to Vercel Blob
      let qpUrl = "";
      let asUrls: string[] = [];
      let resultUrls: string[] = [];

      if (uploadMode === "qp_as") {
        if (!qpFile || asFiles.length === 0) {
          setVerifyError("Please upload both the question paper and answer sheet.");
          setVerifying(false);
          return;
        }
        const qpBlob = await put(qpFile.name, qpFile, { access: "public" });
        qpUrl = qpBlob.url;
        asUrls = await Promise.all(
          asFiles.map(f => put(f.name, f, { access: "public" }).then(b => b.url))
        );
      } else {
        if (resultFiles.length === 0) {
          setVerifyError("Please upload your result summary.");
          setVerifying(false);
          return;
        }
        resultUrls = await Promise.all(
          resultFiles.map(f => put(f.name, f, { access: "public" }).then(b => b.url))
        );
      }

      const res = await fetch("/api/verify-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks:      totalObtained,
          total:      paperTotal,
          subject, chapter,
          day:        String(day),
          isRevision,
          qpUrl:      qpUrl      || undefined,
          asUrls:     asUrls.length     ? asUrls     : undefined,
          resultUrls: resultUrls.length ? resultUrls : undefined,
        }),
      });

      const data = await res.json();
      setVerifyReply(data.reply || "");
      setSectionBreakdown(data.sectionBreakdown || []);
      setErrorLog(data.errorLog || []);
      setStep(4);

      if (onVerified && data.sectionBreakdown) {
        onVerified({
          totalObtained,
          totalMarks: paperTotal,
          sectionBreakdown: data.sectionBreakdown,
          errorLog: data.errorLog || [],
        });
      }
    } catch (e: any) {
      setVerifyError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  /* ─────────────────────────────────────────────
     RENDER HELPERS
  ───────────────────────────────────────────── */
  const PROGRESS_W = ["25%", "50%", "75%", "100%"][step - 1];

  function ProgressBar() {
    return (
      <div style={{ height: 4, background: "#e2e8f0", borderRadius: 4, margin: "12px 0 20px" }}>
        <div style={{
          height: "100%", borderRadius: 4, background: "#2563eb",
          width: PROGRESS_W, transition: "width 0.3s ease",
        }} />
      </div>
    );
  }

  function UploadZone({
    label, hint, files, onFiles, accept, multiple, inputRef,
  }: {
    label: string; hint: string; files: File[]; accept: string; multiple?: boolean;
    onFiles: (f: File[]) => void; inputRef: React.RefObject<HTMLInputElement>;
  }) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: files.length ? "2px solid #2563eb" : "2px dashed #cbd5e1",
          borderRadius: 12, padding: "20px 16px", textAlign: "center",
          cursor: "pointer", background: files.length ? "#eff6ff" : "#f8fafc",
          transition: "all 0.15s", marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>
          {files.length ? "✅" : label.includes("Result") ? "📊" : label.includes("Answer") ? "📝" : "📄"}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {files.length
            ? files.map(f => f.name).join(", ")
            : hint}
        </div>
        <input
          ref={inputRef} type="file" accept={accept}
          multiple={multiple} style={{ display: "none" }}
          onChange={e => {
            const picked = Array.from(e.target.files || []);
            onFiles(picked);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
      }}>
        {/* ── HEADER ── */}
        <div style={{ padding: "20px 24px 0", position: "sticky", top: 0, background: "#fff", zIndex: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#0f172a" }}>Submit Marks</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>
                {subject} · {chapter} · Day {day}
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}
            >×</button>
          </div>
          <ProgressBar />
        </div>

        <div style={{ padding: "0 24px 24px" }}>

          {/* ═══════════════════════════════════════════
              STEP 1 — Section-wise Marks Entry
          ═══════════════════════════════════════════ */}
          {step === 1 && (
            <>
              {/* Total pill */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10,
                padding: "10px 16px", marginBottom: 18,
              }}>
                <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Total Obtained</span>
                <span style={{
                  fontWeight: 800, fontSize: 18,
                  color: totalObtained > paperTotal ? "#dc2626" : "#0f172a",
                }}>
                  {totalObtained} / {paperTotal}
                </span>
              </div>

              {/* Group headers */}
              {["Primary", "Secondary", "Writing", "Vocab"].map(group => {
                const groupSecs = sections.filter(s => s.group === group);
                if (!groupSecs.length) return null;
                const groupTotal = groupSecs.reduce((a, s) => a + s.total, 0);
                const groupObtained = groupSecs.reduce((a, s) => {
                  const v = parseInt(sectionMarks[s.key] || "0");
                  return a + (isNaN(v) ? 0 : v);
                }, 0);
                return (
                  <div key={group} style={{ marginBottom: 16 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginBottom: 8,
                    }}>
                      <div style={{
                        fontWeight: 700, fontSize: 11,
                        color: groupColors[group] || "#475569",
                        textTransform: "uppercase", letterSpacing: "0.08em",
                      }}>{group}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                        {groupObtained} / {groupTotal}
                      </div>
                    </div>

                    {groupSecs.map(sec => (
                      <div key={sec.key} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px",
                        background: sectionMarks[sec.key] !== "" ? "#f0fdf4" : "#f8fafc",
                        border: `1px solid ${sectionMarks[sec.key] !== "" ? "#bbf7d0" : "#e2e8f0"}`,
                        borderRadius: 10, marginBottom: 6, gap: 12,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{sec.label}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>out of {sec.total}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="number" min={0} max={sec.total}
                            value={sectionMarks[sec.key]}
                            onChange={e => {
                              const v = e.target.value;
                              setSectionMarks(prev => ({ ...prev, [sec.key]: v }));
                            }}
                            placeholder="–"
                            style={{
                              width: 56, height: 38, textAlign: "center",
                              border: "1.5px solid #e2e8f0", borderRadius: 8,
                              fontSize: 16, fontWeight: 700, color: "#0f172a",
                              outline: "none",
                            }}
                          />
                          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>/ {sec.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div style={{
                background: "#fef9c3", border: "1px solid #fde047",
                borderRadius: 8, padding: "10px 14px", fontSize: 12,
                color: "#713f12", marginBottom: 18, lineHeight: 1.6,
              }}>
                ⚠️ Upload documents in the next step so AI can verify your score.
                Self-reported marks without proof are not counted in your verified average.
              </div>

              <button
                onClick={goToUploadChoice}
                disabled={!allFilled}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                  background: allFilled ? "#2563eb" : "#e2e8f0",
                  color: allFilled ? "#fff" : "#94a3b8",
                  fontWeight: 700, fontSize: 15, cursor: allFilled ? "pointer" : "not-allowed",
                }}
              >
                Continue → Upload Documents
              </button>
            </>
          )}

          {/* ═══════════════════════════════════════════
              STEP 2 — Upload Mode Choice
          ═══════════════════════════════════════════ */}
          {step === 2 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                How would you like to verify your score of{" "}
                <span style={{ color: "#2563eb" }}>{totalObtained}/{paperTotal}</span>?
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                Choose the documents you have available:
              </div>

              {/* Option A */}
              <div
                onClick={() => selectMode("qp_as")}
                style={{
                  border: "2px solid #e2e8f0", borderRadius: 14, padding: "18px 20px",
                  cursor: "pointer", marginBottom: 12, transition: "all 0.15s",
                  background: "#fff",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#2563eb")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 30 }}>📄</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>
                      Question Paper + Answer Sheet
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                      Upload the printed question paper (PDF) and your handwritten answer sheet
                      (images or PDF). AI will cross-check your answers question by question.
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: "#2563eb", fontWeight: 600 }}>
                      Best accuracy · Detailed per-question feedback
                    </div>
                  </div>
                </div>
              </div>

              {/* Option B */}
              <div
                onClick={() => selectMode("result_summary")}
                style={{
                  border: "2px solid #e2e8f0", borderRadius: 14, padding: "18px 20px",
                  cursor: "pointer", marginBottom: 20, transition: "all 0.15s",
                  background: "#fff",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#8b5cf6")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 30 }}>📊</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>
                      Result Summary
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                      Upload your teacher-checked / marked answer sheet, or a result card.
                      AI reads the marks written per question — no QP needed.
                      Great for tests taken outside Shauri.
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: "#8b5cf6", fontWeight: 600 }}>
                      Works with any test · Scan with Adobe Scan or Google Drive
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 10,
                  border: "1.5px solid #e2e8f0", background: "#fff",
                  color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer",
                }}
              >
                ← Back
              </button>
            </>
          )}

          {/* ═══════════════════════════════════════════
              STEP 3 — Upload Files
          ═══════════════════════════════════════════ */}
          {step === 3 && (
            <>
              {uploadMode === "qp_as" && (
                <>
                  <div style={{ fontSize: 14, color: "#475569", marginBottom: 16, lineHeight: 1.6 }}>
                    Upload the <strong>question paper</strong> and your <strong>answer sheet</strong>.
                    AI will check your score of{" "}
                    <strong style={{ color: "#2563eb" }}>{totalObtained}/{paperTotal}</strong>.
                  </div>

                  <UploadZone
                    label="Question Paper"
                    hint="PDF or photo — tap to upload"
                    files={qpFile ? [qpFile] : []}
                    accept=".pdf,image/*"
                    multiple={false}
                    onFiles={fs => setQpFile(fs[0] || null)}
                    inputRef={qpRef}
                  />

                  <UploadZone
                    label="Your Answer Sheet"
                    hint="Tap to upload — PDF or multiple photos (one per page)"
                    files={asFiles}
                    accept=".pdf,image/*"
                    multiple={true}
                    onFiles={fs => setAsFiles(fs)}
                    inputRef={asRef}
                  />
                </>
              )}

              {uploadMode === "result_summary" && (
                <>
                  <div style={{ fontSize: 14, color: "#475569", marginBottom: 16, lineHeight: 1.6 }}>
                    Upload your <strong>teacher-checked answer sheet</strong> or <strong>result card</strong>.
                    AI will read the marks written per question and analyse your performance section-wise.
                  </div>

                  <UploadZone
                    label="Result Summary"
                    hint="Scan or photo your checked answer sheet — PDF or multiple images"
                    files={resultFiles}
                    accept=".pdf,image/*"
                    multiple={true}
                    onFiles={fs => setResultFiles(fs)}
                    inputRef={resultRef}
                  />
                </>
              )}

              {/* Tip */}
              <div style={{
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 8, padding: "10px 14px", fontSize: 12,
                color: "#166534", marginBottom: 18, lineHeight: 1.6,
              }}>
                💡 <strong>For best results:</strong> Use{" "}
                <strong>Adobe Scan</strong> or <strong>Google Drive</strong> app to scan all pages
                into one PDF. Free &amp; takes 30 seconds.
              </div>

              {verifyError && (
                <div style={{
                  background: "#fef2f2", border: "1px solid #fecaca",
                  borderRadius: 8, padding: "10px 14px", fontSize: 13,
                  color: "#dc2626", marginBottom: 14,
                }}>
                  {verifyError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    flex: 1, padding: "13px 0", borderRadius: 10,
                    border: "1.5px solid #e2e8f0", background: "#fff",
                    color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleVerify}
                  disabled={verifying || (uploadMode === "qp_as" ? !qpFile || asFiles.length === 0 : resultFiles.length === 0)}
                  style={{
                    flex: 2, padding: "13px 0", borderRadius: 10, border: "none",
                    background: verifying ? "#94a3b8" : "#2563eb",
                    color: "#fff", fontWeight: 700, fontSize: 15,
                    cursor: verifying ? "not-allowed" : "pointer",
                  }}
                >
                  {verifying ? "⚡ Verifying…" : "⚡ Verify with AI"}
                </button>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════
              STEP 4 — Results
          ═══════════════════════════════════════════ */}
          {step === 4 && (
            <>
              {/* Score header */}
              <div style={{
                background: "linear-gradient(135deg,#1e293b,#0f172a)",
                borderRadius: 14, padding: "20px 20px", marginBottom: 20, color: "#fff",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  AI Verified Score
                </div>
                <div style={{ fontSize: 40, fontWeight: 900, color: "#38bdf8", marginTop: 4 }}>
                  {totalObtained}<span style={{ fontSize: 22, color: "#64748b" }}>/{paperTotal}</span>
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                  {Math.round((totalObtained / paperTotal) * 100)}%
                </div>
              </div>

              {/* Section breakdown */}
              {sectionBreakdown.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 10 }}>
                    Section-wise Breakdown
                  </div>
                  {sectionBreakdown.map(sec => {
                    const st = STATUS_STYLE[sec.status];
                    const pct = Math.round((sec.obtained / sec.total) * 100);
                    return (
                      <div key={sec.key} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px",
                        background: st.bg, borderRadius: 10, marginBottom: 6,
                        border: `1px solid ${st.text}22`,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{sec.label}</div>
                          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                            {/* bar */}
                            <div style={{ height: 4, background: "#e2e8f0", borderRadius: 4, marginTop: 4 }}>
                              <div style={{
                                height: "100%", borderRadius: 4,
                                background: st.text, width: `${pct}%`, transition: "width 0.4s",
                              }} />
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: st.text }}>
                            {sec.obtained}/{sec.total}
                          </div>
                          <div style={{
                            fontSize: 10, fontWeight: 700, color: st.text,
                            background: `${st.text}18`, borderRadius: 4, padding: "1px 6px",
                          }}>
                            {st.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Error log */}
              {errorLog.filter(e => e.severity !== undefined).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 10 }}>
                    Error Log — Focus Areas
                  </div>
                  {errorLog.map((err, i) => {
                    const sv = SEVERITY_STYLE[err.severity];
                    return (
                      <div key={i} style={{
                        display: "flex", gap: 10, padding: "10px 12px",
                        background: "#f8fafc", border: "1px solid #e2e8f0",
                        borderLeft: `4px solid ${sv.dot}`,
                        borderRadius: 10, marginBottom: 6,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                            {err.qNum && (
                              <span style={{
                                fontSize: 11, fontWeight: 700, color: "#fff",
                                background: "#475569", borderRadius: 4, padding: "1px 6px",
                              }}>{err.qNum}</span>
                            )}
                            <span style={{
                              fontSize: 11, fontWeight: 700, color: sv.dot,
                              background: `${sv.dot}20`, borderRadius: 4, padding: "1px 6px",
                            }}>{sv.label}</span>
                            {err.section !== "?" && (
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>Sec {err.section}</span>
                            )}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{err.topic}</div>
                          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{err.issue}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Feedback text */}
              {verifyReply && (
                <div style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 13,
                  color: "#334155", lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                }}>
                  {verifyReply.match(/FEEDBACK:\s*([\s\S]+?)(?:\n[A-Z_]+:|$)/i)?.[1]?.trim() || verifyReply}
                </div>
              )}

              <button
                onClick={handleClose}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                  background: "#2563eb", color: "#fff",
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                }}
              >
                Done ✓
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
