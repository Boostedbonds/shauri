"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Header from "../components/Header";

// ─── Types ────────────────────────────────────────────────────
type ExamAttempt = {
  id: string;
  date: string;
  mode: "examiner";
  subject: string;
  chapters: string[];
  timeTakenSeconds: number;
  rawAnswerText: string;
  scorePercent?: number;
  percentage?: number;
  marks_obtained?: number;
  total_marks?: number;
  time_taken?: string;
  evaluation_text?: string;
  created_at?: string;
  student_name?: string;
  class?: string;
};

type SubjectStat = {
  subject: string;
  scores: number[];
  latest: number;
  best: number;
  band: { label: string; color: string };
  trend: { label: string; color: string; delta: number | null };
  color: string;
  gapToNext: { marks: number; grade: string } | null;
};

type SyncState = "idle" | "loading" | "success" | "error";

// OSM types
type OSMStatus = "idle" | "uploading" | "evaluating" | "done" | "error";
type OSMResult = {
  studentName: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  grade: string;
  breakdown: Array<{ section: string; obtained: number; max: number }>;
  remarks: string;
};

// ─── Helpers ──────────────────────────────────────────────────
const GRADES = [
  { min: 90, label: "A1", color: "#059669" },
  { min: 75, label: "A2", color: "#0d9488" },
  { min: 60, label: "B1", color: "#2563eb" },
  { min: 45, label: "B2", color: "#7c3aed" },
  { min: 33, label: "C",  color: "#d97706" },
  { min: 0,  label: "F",  color: "#dc2626" },
];

function getGrade(score: number) {
  return GRADES.find((g) => score >= g.min) || GRADES[GRADES.length - 1];
}

function getGapToNext(score: number): { marks: number; grade: string } | null {
  for (let i = 0; i < GRADES.length - 1; i++) {
    if (score < GRADES[i].min) return { marks: GRADES[i].min - score, grade: GRADES[i].label };
  }
  return null;
}

function getTrend(scores: number[]): { label: string; color: string; delta: number | null } {
  if (scores.length < 2) return { label: "First attempt", color: "#94a3b8", delta: null };
  const delta = scores[scores.length - 1] - scores[scores.length - 2];
  if (delta > 0) return { label: `+${delta}% vs last`, color: "#059669", delta };
  if (delta < 0) return { label: `${delta}% vs last`,  color: "#dc2626", delta };
  return           { label: "No change",               color: "#d97706", delta: 0 };
}

function parseTimeTaken(raw: string | number | undefined): number {
  if (typeof raw === "number") return raw;
  if (!raw) return 0;
  let secs = 0;
  const h = raw.match(/(\d+)\s*h/i);
  const m = raw.match(/(\d+)\s*m/i);
  const s = raw.match(/(\d+)\s*s/i);
  if (h) secs += parseInt(h[1]) * 3600;
  if (m) secs += parseInt(m[1]) * 60;
  if (s) secs += parseInt(s[1]);
  return secs;
}

function normaliseAttempt(raw: any): ExamAttempt {
  const scorePercent =
    typeof raw.scorePercent === "number" ? raw.scorePercent :
    typeof raw.percentage   === "number" ? raw.percentage   :
    undefined;
  return {
    id:               raw.id ?? raw.created_at ?? String(Math.random()),
    date:             raw.date ?? raw.created_at ?? new Date().toISOString(),
    mode:             "examiner",
    subject:          raw.subject ?? "Unknown",
    chapters:         Array.isArray(raw.chapters) ? raw.chapters : [],
    timeTakenSeconds: parseTimeTaken(raw.timeTakenSeconds ?? raw.time_taken),
    rawAnswerText:    raw.rawAnswerText ?? raw.evaluation_text ?? "",
    scorePercent,
    percentage:       raw.percentage,
    marks_obtained:   raw.marks_obtained,
    total_marks:      raw.total_marks,
    time_taken:       raw.time_taken,
    evaluation_text:  raw.evaluation_text,
    created_at:       raw.created_at,
    student_name:     raw.student_name,
    class:            raw.class,
  };
}

const SUBJECT_COLORS = ["#2563eb","#0d9488","#7c3aed","#ea580c","#4f46e5","#059669"];

const btnBase: React.CSSProperties = {
  padding: "10px 18px", background: "#2563eb", color: "#ffffff",
  borderRadius: 12, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  ...btnBase, background: "transparent", color: "#2563eb", border: "1.5px solid #2563eb",
};

function Sparkline({ scores, color }: { scores: number[]; color: string }) {
  if (scores.length < 2) return null;
  const W = 80, H = 32, PAD = 3;
  const minS = Math.min(...scores, 0);
  const maxS = Math.max(...scores, 100);
  const range = maxS - minS || 1;
  const pts = scores.map((s, i) => {
    const x = PAD + (i / (scores.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((s - minS) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      {pts.length > 0 && (() => {
        const last = pts[pts.length - 1].split(",");
        return <circle cx={last[0]} cy={last[1]} r={3} fill={color} />;
      })()}
    </svg>
  );
}

function StatCard({ icon, label, value, sub, subColor, accent }: {
  icon: string; label: string; value: string;
  sub: string; subColor: string; accent: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "20px 20px 18px",
      border: "1px solid #e2e8f0", borderTop: `3px solid ${accent}`,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ fontSize: 22, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.2, wordBreak: "break-word" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 600, color: subColor }}>{sub}</div>}
    </div>
  );
}

function loadLocalAttempts(): ExamAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("shauri_exam_attempts");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normaliseAttempt);
    }
  } catch {}
  return [];
}

// ─── OSM Modal ────────────────────────────────────────────────
function OSMModal({ onClose }: { onClose: () => void }) {
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject]         = useState("Science");
  const [cls, setCls]                 = useState("9");
  const [imageUrl, setImageUrl]       = useState("");
  const [status, setStatus]           = useState<OSMStatus>("idle");
  const [result, setResult]           = useState<OSMResult | null>(null);
  const [error, setError]             = useState("");
  const [userType, setUserType]       = useState<"teacher" | "student">("student");
  const fileRef = useRef<HTMLInputElement>(null);

  // Pre-fill student info
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      if (s?.name) setStudentName(s.name);
      if (s?.class) setCls(String(s.class).replace(/\D/g, "") || "9");
    } catch {}
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setStatus("uploading");
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
      setStatus("idle");
    };
    reader.readAsDataURL(file);
  };

  const evaluate = async () => {
    if (!imageUrl) return;
    setStatus("evaluating");
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "examiner",
          message: "Please evaluate this answer sheet.",
          uploadType: "answer",
          // route.ts reads uploadedText with [IMAGE_BASE64] prefix format
          uploadedText: `[IMAGE_BASE64]\n${imageUrl}`,
          subject: subject,
          student: {
            name: studentName || "Student",
            class: cls,
            board: "CBSE",
          },
          history: [],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Parse result from reply
      const reply = data.reply || "";
      const pctMatch = reply.match(/(\d+(?:\.\d+)?)\s*%/);
      const pct = pctMatch ? parseFloat(pctMatch[1]) : 0;
      const gradeInfo = getGrade(pct);

      setResult({
        studentName: studentName || "Student",
        subject,
        score: pct,
        total: 100,
        percentage: pct,
        grade: gradeInfo.label,
        breakdown: [],
        remarks: reply.slice(0, 300),
      });
      setStatus("done");
    } catch (e: any) {
      setError(e.message || "Evaluation failed. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 640, maxHeight: "90vh",
        overflow: "auto", padding: "28px 24px 40px",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 20px" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>📄 OSM Evaluator</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
              On-Screen Marking — AI evaluates scanned answer sheets
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>

        {/* User type toggle */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {(["student", "teacher"] as const).map(t => (
            <button key={t} onClick={() => setUserType(t)} style={{
              flex: 1, padding: "8px", border: "none", borderRadius: 8, cursor: "pointer",
              background: userType === t ? "#fff" : "transparent",
              fontWeight: userType === t ? 700 : 500,
              color: userType === t ? "#0f172a" : "#64748b",
              fontSize: 13,
              boxShadow: userType === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}>
              {t === "student" ? "👤 Student" : "👩‍🏫 Teacher"}
            </button>
          ))}
        </div>

        {status !== "done" && (
          <>
            {/* Form fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                  {userType === "teacher" ? "Student Name" : "Your Name"}
                </label>
                <input
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Class</label>
                <select value={cls} onChange={e => setCls(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", background: "#fff" }}>
                  {[6,7,8,9,10,11,12].map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", background: "#fff" }}>
                {["Science","Mathematics","English","Hindi","Social Science","History","Geography","Economics","Physics","Chemistry","Biology"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Upload zone */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${imageUrl ? "#2563eb" : "#e2e8f0"}`,
                borderRadius: 14, padding: imageUrl ? 8 : 28,
                textAlign: "center", cursor: "pointer", marginBottom: 16,
                background: imageUrl ? "#eff6ff" : "#f8fafc",
                transition: "all 0.2s",
              }}
            >
              {imageUrl ? (
                <div style={{ position: "relative" }}>
                  <img src={imageUrl} alt="Answer sheet" style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8 }} />
                  <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, padding: "3px 8px", borderRadius: 6 }}>Tap to change</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    {userType === "teacher" ? "Upload scanned answer sheet" : "Photograph your answer sheet"}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Tap to take photo or browse — JPG, PNG</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#b91c1c", fontSize: 13, marginBottom: 14 }}>
                ⚠ {error}
              </div>
            )}

            <button
              onClick={evaluate}
              disabled={!imageUrl || status === "evaluating"}
              style={{
                ...btnBase, width: "100%", padding: "14px",
                fontSize: 15, letterSpacing: "0.05em",
                opacity: (!imageUrl || status === "evaluating") ? 0.5 : 1,
                position: "relative", overflow: "hidden",
              }}
            >
              {status === "evaluating" ? "🔍 AI is evaluating…" : "⚡ Evaluate Answer Sheet"}
            </button>

            <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 10 }}>
              Powered by Gemini AI · CBSE 2026 marking scheme · OSM-aligned
            </p>
          </>
        )}

        {/* Result */}
        {status === "done" && result && (
          <div>
            {/* Score banner */}
            <div style={{
              background: `linear-gradient(135deg, ${getGrade(result.percentage).color}15, ${getGrade(result.percentage).color}05)`,
              border: `1px solid ${getGrade(result.percentage).color}40`,
              borderRadius: 16, padding: "24px", textAlign: "center", marginBottom: 16,
            }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: getGrade(result.percentage).color, lineHeight: 1 }}>
                {result.percentage}%
              </div>
              <div style={{ fontSize: 14, color: "#64748b", margin: "4px 0 8px" }}>
                {result.studentName} · Class {cls} · {result.subject}
              </div>
              <span style={{
                display: "inline-block", padding: "4px 16px", borderRadius: 999,
                background: getGrade(result.percentage).color,
                color: "#fff", fontSize: 13, fontWeight: 700,
              }}>
                Grade {result.grade}
              </span>
            </div>

            {/* AI remarks */}
            {result.remarks && (
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", marginBottom: 16, fontSize: 13, color: "#334155", lineHeight: 1.65, borderLeft: "3px solid #2563eb" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>AI Remarks</div>
                {result.remarks}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnGhost, flex: 1 }} onClick={() => { setStatus("idle"); setResult(null); setImageUrl(""); }}>
                ↩ Evaluate Another
              </button>
              <button style={{ ...btnBase, flex: 1 }} onClick={onClose}>
                Done ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tools Section ────────────────────────────────────────────
function ToolsSection({ onOpenOSM }: { onOpenOSM: () => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
        Evaluation Tools
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* OSM Card */}
        <div
          onClick={onOpenOSM}
          style={{
            background: "#fff", borderRadius: 16, padding: "20px",
            border: "1px solid #e2e8f0", borderTop: "3px solid #2563eb",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>OSM Evaluator</div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 12 }}>
            On-Screen Marking — AI reads scanned answer sheets and assigns marks. CBSE 2026 aligned.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "#eff6ff", color: "#2563eb", borderRadius: 6 }}>Teacher</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "#f0fdf4", color: "#059669", borderRadius: 6 }}>Student</span>
            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>Open →</span>
          </div>
        </div>

        {/* OMR Card */}
        <div
          onClick={() => window.location.href = "/omr"}
          style={{
            background: "#fff", borderRadius: 16, padding: "20px",
            border: "1px solid #e2e8f0", borderTop: "3px solid #7c3aed",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚫</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>OMR Scanner</div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 12 }}>
            Photograph any MCQ bubble sheet — AI reads filled circles and scores instantly. No machine needed.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "#faf5ff", color: "#7c3aed", borderRadius: 6 }}>MCQ Sheets</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", background: "#faf5ff", color: "#7c3aed", borderRadius: 6 }}>JEE / NEET</span>
            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>Open →</span>
          </div>
        </div>

      </div>

      {/* CBSE 2026 notice */}
      <div style={{
        marginTop: 12, background: "#fffbeb", border: "1px solid #fde68a",
        borderRadius: 10, padding: "10px 14px",
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
        <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
          <strong>CBSE 2026 Update:</strong> Shauri now generates 50% competency-based questions per the new board format. Exam papers align with On-Screen Marking (OSM) evaluation standards.
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function ProgressPage() {
  const [attempts, setAttempts]     = useState<ExamAttempt[]>([]);
  const [aiSummary, setAiSummary]   = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [syncState, setSyncState]   = useState<SyncState>("loading");
  const [errorMsg, setErrorMsg]     = useState("");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [showOSM, setShowOSM]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAttempts = useCallback(async () => {
    setSyncState("loading");
    setErrorMsg("");
    const local = loadLocalAttempts();
    if (local.length > 0) setAttempts(local);
    let name = "", cls = "";
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      name = s?.name?.trim() || "";
      cls  = s?.class?.trim() || "";
    } catch {}
    if (!name && !cls) {
      setSyncState(local.length > 0 ? "success" : "idle");
      if (local.length > 0) setLastSynced(new Date());
      return;
    }
    try {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (cls)  params.set("class", cls);
      const res = await fetch(`/api/progress?${params.toString()}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const rawRemote: any[] = data.attempts ?? data.data ?? data ?? [];
      const remote: ExamAttempt[] = Array.isArray(rawRemote) ? rawRemote.map(normaliseAttempt) : [];
      if (remote.length > 0) {
        const remoteIds = new Set(remote.map((a) => a.id));
        const localOnly = local.filter((a) => !remoteIds.has(a.id));
        const merged = [...remote, ...localOnly].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setAttempts(merged);
      } else if (local.length > 0) {
        setAttempts(local);
      }
      setSyncState("success");
      setLastSynced(new Date());
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not sync. Showing local data.");
      setSyncState("error");
    }
  }, []);

  useEffect(() => { fetchAttempts(); }, [fetchAttempts]);

  const subjects: SubjectStat[] = useMemo(() => {
    const map: Record<string, number[]> = {};
    attempts.forEach((a) => {
      const score =
        typeof a.scorePercent === "number" ? a.scorePercent :
        typeof a.percentage   === "number" ? a.percentage   : NaN;
      if (!isNaN(score)) { map[a.subject] ??= []; map[a.subject].push(score); }
    });
    return Object.entries(map).map(([subject, scores], idx) => {
      const latest = scores[scores.length - 1];
      return {
        subject, scores, latest, best: Math.max(...scores),
        band: getGrade(latest), trend: getTrend(scores),
        color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
        gapToNext: getGapToNext(latest),
      };
    });
  }, [attempts]);

  const overallAvg   = subjects.length ? Math.round(subjects.reduce((s, x) => s + x.latest, 0) / subjects.length) : null;
  const bestSubject  = subjects.length ? subjects.reduce((a, b) => (a.latest >= b.latest ? a : b)) : null;
  const mostImproved = subjects.filter((s) => s.trend.delta !== null && (s.trend.delta as number) > 0).sort((a, b) => (b.trend.delta as number) - (a.trend.delta as number))[0] ?? null;
  const totalExams   = attempts.length;

  useEffect(() => {
    if (!subjects.length || aiSummary) return;
    generateAISummary(subjects);
  }, [subjects.length]); // eslint-disable-line

  async function generateAISummary(data: SubjectStat[]) {
    setAiLoading(true);
    try {
      const payload = data.map((s) => ({
        subject: s.subject, latestScore: s.latest, allScores: s.scores,
        grade: s.band.label, trend: s.trend.label, trendDelta: s.trend.delta,
        gapToNext: s.gapToNext, attempts: s.scores.length,
      }));
      const res    = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "progress", subjectStats: payload }),
      });
      const result = await res.json();
      if (typeof result?.reply === "string") setAiSummary(result.reply);
    } catch {}
    setAiLoading(false);
  }

  function exportProgress() {
    const blob = new Blob([JSON.stringify(attempts, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "Shauri-progress.json"; a.click();
    URL.revokeObjectURL(url);
  }

  function generateReport() {
    const lines = [
      "SHAURI PROGRESS REPORT", "======================", "",
      ...subjects.map((s) =>
        `Subject: ${s.subject}\nLatest: ${s.latest}%  Best: ${s.best}%  Grade: ${s.band.label}\nTrend: ${s.trend.label}\n`
      ),
      "AI Academic Insight:", aiSummary || "No AI summary available yet.",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "Shauri-progress-report.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) setAttempts(parsed.map(normaliseAttempt));
      } catch { alert("Invalid file format."); }
    };
    reader.readAsText(file);
  }

  const CHART_H = 220;
  const passY   = CHART_H - (33 / 100) * CHART_H;
  const distY   = CHART_H - (75 / 100) * CHART_H;
  const isLoading = syncState === "loading";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Header onLogout={() => (window.location.href = "/")} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0", flexWrap: "wrap", gap: 10 }}>
        <button style={btnBase} onClick={() => (window.location.href = "/modes")}>← Modes</button>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btnGhost} onClick={fetchAttempts}>🔄 Refresh</button>
          <button style={btnGhost} onClick={exportProgress}>Export</button>
          <button style={btnGhost} onClick={() => fileInputRef.current?.click()}>Import</button>
          <button style={btnBase}  onClick={generateReport}>Download Report</button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="application/json" hidden
        onChange={(e) => e.target.files && handleImportFile(e.target.files[0])} />

      <main style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px", width: "100%" }}>

        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
          Progress Dashboard
        </h1>
        <p style={{ textAlign: "center", color: "#64748b", marginBottom: 20, fontSize: 15 }}>
          Track performance · Evaluate sheets · Scan OMR
        </p>

        {/* Sync status */}
        <div style={{ marginBottom: 24 }}>
          {syncState === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#1d4ed8" }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>🔄</span>
              Syncing your results…
            </div>
          )}
          {syncState === "error" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#b91c1c" }}>
              <span>⚠️ {errorMsg || "Could not sync. Showing local data."}</span>
              <button onClick={fetchAttempts} style={{ ...btnBase, background: "#dc2626", padding: "6px 14px", fontSize: 12 }}>Retry</button>
            </div>
          )}
          {syncState === "success" && lastSynced && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#15803d" }}>
              ✅ Synced at {lastSynced.toLocaleTimeString()}
              {attempts.length > 0 && <span style={{ color: "#64748b", marginLeft: 8 }}>· {attempts.length} exam{attempts.length !== 1 ? "s" : ""} found</span>}
            </div>
          )}
        </div>

        {/* ── TOOLS SECTION — always visible ── */}
        <div style={{ marginBottom: 28 }}>
          <ToolsSection onOpenOSM={() => setShowOSM(true)} />
        </div>

        {/* Loading skeleton */}
        {isLoading && subjects.length === 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 110, borderRadius: 16, background: "#e2e8f0", opacity: 0.6 }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && subjects.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 20, border: "1.5px dashed #cbd5e1" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              {syncState === "error" ? "Could not load results" : "No exam data yet"}
            </p>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
              {syncState === "error"
                ? "Check your connection and retry."
                : attempts.length > 0
                  ? `${attempts.length} exam record${attempts.length !== 1 ? "s" : ""} found but score data is missing.`
                  : "Complete an exam in Examiner Mode to see your progress here."}
            </p>
            {syncState === "error"
              ? <button style={btnBase} onClick={fetchAttempts}>Retry Sync</button>
              : <button style={btnBase} onClick={() => (window.location.href = "/modes")}>Go to Examiner Mode</button>
            }
          </div>
        )}

        {/* Dashboard */}
        {subjects.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Stat strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              <StatCard icon="📊" label="Overall Average"
                value={overallAvg !== null ? `${overallAvg}%` : "—"}
                sub={overallAvg !== null ? getGrade(overallAvg).label : ""}
                subColor={overallAvg !== null ? getGrade(overallAvg).color : "#94a3b8"}
                accent="#2563eb" />
              <StatCard icon="🏆" label="Best Subject"
                value={bestSubject?.subject ?? "—"}
                sub={bestSubject ? `${bestSubject.latest}%` : ""}
                subColor="#059669" accent="#059669" />
              <StatCard icon="📈" label="Most Improved"
                value={mostImproved?.subject ?? "—"}
                sub={mostImproved ? `+${mostImproved.trend.delta}% this attempt` : "Need 2+ attempts"}
                subColor="#0d9488" accent="#0d9488" />
              <StatCard icon="📝" label="Exams Taken"
                value={String(totalExams)}
                sub={totalExams === 1 ? "1 exam completed" : `${totalExams} exams completed`}
                subColor="#7c3aed" accent="#7c3aed" />
            </div>

            {/* Bar chart + AI insight */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
              <div style={{ background: "#fff", borderRadius: 20, padding: "28px 32px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Subject Performance</h2>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 24, height: 2, borderTop: "2px dashed #f59e0b" }} />
                      <span style={{ fontSize: 11, color: "#64748b" }}>Pass 33%</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 24, height: 2, borderTop: "2px dashed #2563eb" }} />
                      <span style={{ fontSize: 11, color: "#64748b" }}>Distinction 75%</span>
                    </div>
                  </div>
                </div>
                <div style={{ position: "relative", height: CHART_H }}>
                  <div style={{ position: "absolute", left: 0, right: 0, top: passY, borderTop: "2px dashed #f59e0b", zIndex: 2 }}>
                    <span style={{ position: "absolute", right: 0, top: -16, fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>33%</span>
                  </div>
                  <div style={{ position: "absolute", left: 0, right: 0, top: distY, borderTop: "2px dashed #2563eb", zIndex: 2 }}>
                    <span style={{ position: "absolute", right: 0, top: -16, fontSize: 10, color: "#2563eb", fontWeight: 600 }}>75%</span>
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "flex-end", gap: subjects.length > 5 ? 10 : 20, height: "100%", borderBottom: "2px solid #f1f5f9" }}>
                    {subjects.map((s) => {
                      const barH = Math.max((s.latest / 100) * CHART_H, 6);
                      return (
                        <div key={s.subject} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.latest}%</span>
                          <div style={{ height: barH, width: "100%", maxWidth: 52, background: s.color, borderRadius: "8px 8px 0 0", opacity: 0.88 }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: subjects.length > 5 ? 10 : 20, marginTop: 10, borderTop: "2px solid #f1f5f9", paddingTop: 10 }}>
                  {subjects.map((s) => (
                    <div key={s.subject} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#334155", textAlign: "center", wordBreak: "break-word" }}>
                        {s.subject.length > 9 ? s.subject.slice(0, 8) + "…" : s.subject}
                      </span>
                      <span style={{ fontSize: 10, color: s.band.color, fontWeight: 700 }}>{s.band.label}</span>
                      <span style={{ fontSize: 10, color: s.trend.color }}>{s.trend.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight */}
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>AI Academic Insight</h2>
                </div>
                {aiLoading ? (
                  <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>Analysing your performance…</p>
                ) : aiSummary ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {aiSummary.split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} style={{
                        fontSize: 13, lineHeight: 1.65, color: "#334155",
                        padding: "8px 12px", background: "#f8fafc", borderRadius: 10,
                        borderLeft: `3px solid ${
                          line.startsWith("💪") ? "#059669" :
                          line.startsWith("⚠️") ? "#dc2626" :
                          line.startsWith("📈") ? "#0d9488" : "#2563eb"
                        }`,
                      }}>
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                    Analysis will appear after tests are evaluated.
                  </p>
                )}
              </div>
            </div>

            {/* Subject cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {subjects.map((s) => (
                <div key={s.subject} style={{
                  background: "#fff", borderRadius: 16, padding: "20px 20px 16px",
                  border: "1px solid #e2e8f0", borderTop: `3px solid ${s.color}`,
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", wordBreak: "break-word", flex: 1 }}>{s.subject}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: s.band.color, color: "#fff", borderRadius: 6, flexShrink: 0, lineHeight: "18px" }}>{s.band.label}</span>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.latest}%</div>
                  {s.scores.length >= 2 && (
                    <div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Score history</div>
                      <Sparkline scores={s.scores} color={s.color} />
                    </div>
                  )}
                  <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50, background: s.trend.color + "18", color: s.trend.color, alignSelf: "flex-start" }}>
                    {s.trend.label}
                  </span>
                  {s.gapToNext ? (
                    <div style={{ fontSize: 11, color: "#64748b", padding: "6px 10px", background: "#f8fafc", borderRadius: 8, lineHeight: 1.5 }}>
                      🎯 <strong>{s.gapToNext.marks} more marks</strong> → {s.gapToNext.grade}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>✅ Top grade achieved!</div>
                  )}
                  {s.scores.length > 1 && (
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>Best: {s.best}% · {s.scores.length} attempts</div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}
      </main>

      {/* OSM Modal */}
      {showOSM && <OSMModal onClose={() => setShowOSM(false)} />}
    </div>
  );
}