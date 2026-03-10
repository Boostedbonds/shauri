"use client";

import { useEffect, useState, useMemo } from "react";

// ── Types ─────────────────────────────────────────────────────
type StudentRow = {
  student_name: string;
  class: string;
  subject: string;
  percentage: number | null;
  marks_obtained: number | null;
  total_marks: number | null;
  time_taken: string | null;
  created_at: string;
  evaluation_text: string | null;
  chapters: string[] | null;
};

type StudentSummary = {
  name: string;
  cls: string;
  sessions: StudentRow[];
  lastActive: string;
  subjects: Record<string, number[]>;
  avgScore: number | null;
  totalTime: number;
  strongest: string | null;
  weakest: string | null;
  trend: "up" | "down" | "flat" | "new";
};

// ── Helpers ───────────────────────────────────────────────────
const GRADES = [
  { min: 90, label: "A1", color: "#059669" },
  { min: 75, label: "A2", color: "#0d9488" },
  { min: 60, label: "B1", color: "#2563eb" },
  { min: 45, label: "B2", color: "#7c3aed" },
  { min: 33, label: "C",  color: "#d97706" },
  { min: 0,  label: "F",  color: "#dc2626" },
];
function getGrade(s: number) { return GRADES.find(g => s >= g.min) || GRADES[GRADES.length-1]; }

function parseTime(raw: string | null): number {
  if (!raw) return 0;
  let s = 0;
  const h = raw.match(/(\d+)\s*h/i); const m = raw.match(/(\d+)\s*m/i); const sec = raw.match(/(\d+)\s*s/i);
  if (h) s += parseInt(h[1]) * 3600; if (m) s += parseInt(m[1]) * 60; if (sec) s += parseInt(sec[1]);
  return s;
}

function fmtTime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs/60)}m`;
  return `${Math.floor(secs/3600)}h ${Math.floor((secs%3600)/60)}m`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  if (diff < 2880) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function buildSummary(name: string, cls: string, rows: StudentRow[]): StudentSummary {
  const subjects: Record<string, number[]> = {};
  let totalTime = 0;
  rows.forEach(r => {
    totalTime += parseTime(r.time_taken);
    if (r.subject && r.percentage != null) {
      subjects[r.subject] = subjects[r.subject] || [];
      subjects[r.subject].push(r.percentage);
    }
  });

  const subjectAvgs = Object.entries(subjects).map(([s, scores]) => ({
    subject: s, avg: scores.reduce((a,b) => a+b, 0) / scores.length
  }));

  const avgScore = subjectAvgs.length
    ? Math.round(subjectAvgs.reduce((a,b) => a + b.avg, 0) / subjectAvgs.length)
    : null;

  const sorted = subjectAvgs.sort((a,b) => b.avg - a.avg);
  const strongest = sorted[0]?.subject || null;
  const weakest   = sorted[sorted.length-1]?.subject || null;

  // Trend: compare last 2 sessions with scores
  const scoredRows = rows.filter(r => r.percentage != null).sort((a,b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  let trend: StudentSummary["trend"] = "new";
  if (scoredRows.length >= 2) {
    const last = scoredRows[scoredRows.length-1].percentage!;
    const prev = scoredRows[scoredRows.length-2].percentage!;
    trend = last > prev ? "up" : last < prev ? "down" : "flat";
  } else if (scoredRows.length === 1) {
    trend = "new";
  }

  const lastActive = rows.reduce((latest, r) =>
    new Date(r.created_at) > new Date(latest) ? r.created_at : latest,
    rows[0].created_at
  );

  return { name, cls, sessions: rows, lastActive, subjects, avgScore, totalTime, strongest, weakest, trend };
}

// ── Student Detail Modal ───────────────────────────────────────
function StudentModal({ student, onClose }: { student: StudentSummary; onClose: () => void }) {
  const subjectEntries = Object.entries(student.subjects);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 680, maxHeight: "88vh", overflow: "auto",
        padding: "28px 24px 40px", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
      }}>
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg, #2563eb, #0d9488)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0,
          }}>{student.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{student.name}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Class {student.cls} · CBSE · {student.sessions.length} sessions</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Avg Score", value: student.avgScore != null ? `${student.avgScore}%` : "—", color: student.avgScore != null ? getGrade(student.avgScore).color : "#94a3b8" },
            { label: "Time Spent", value: fmtTime(student.totalTime), color: "#2563eb" },
            { label: "Sessions", value: String(student.sessions.length), color: "#7c3aed" },
          ].map(s => (
            <div key={s.label} style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Subject breakdown */}
        {subjectEntries.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Subject Breakdown</div>
            {subjectEntries.map(([subject, scores]) => {
              const avg = Math.round(scores.reduce((a,b) => a+b,0) / scores.length);
              const grade = getGrade(avg);
              return (
                <div key={subject} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", width: 120, flexShrink: 0 }}>{subject}</div>
                  <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${avg}%`, height: "100%", background: grade.color, borderRadius: 999, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: grade.color, width: 40, textAlign: "right" }}>{avg}%</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", background: grade.color + "20", color: grade.color, borderRadius: 6 }}>{grade.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Session history */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Session History</div>
          {[...student.sessions].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10).map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              background: i % 2 === 0 ? "#f8fafc" : "#fff",
              borderRadius: 10, marginBottom: 4,
            }}>
              <span style={{ fontSize: 12, color: "#64748b", width: 80, flexShrink: 0 }}>{fmtDate(s.created_at)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", flex: 1 }}>{s.subject || "—"}</span>
              {s.percentage != null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: getGrade(s.percentage).color }}>{s.percentage}%</span>
              )}
              {s.time_taken && <span style={{ fontSize: 11, color: "#94a3b8" }}>{s.time_taken}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function TeacherPage() {
  const [rows, setRows]           = useState<StudentRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [filterCls, setFilterCls] = useState("");
  const [sortBy, setSortBy]       = useState<"name"|"score"|"time"|"sessions"|"lastActive">("lastActive");
  const [selected, setSelected]   = useState<StudentSummary | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/progress?all=true");
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const raw: StudentRow[] = data.attempts ?? data.data ?? data ?? [];
      setRows(Array.isArray(raw) ? raw : []);
      setLastSynced(new Date());
    } catch (e: any) {
      setError(e.message || "Could not load data");
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  // Build per-student summaries
  const students: StudentSummary[] = useMemo(() => {
    const map: Record<string, StudentRow[]> = {};
    rows
      .filter(r => r.student_name && r.student_name !== "null" && r.class && r.class !== "null")
      .forEach(r => {
        const key = `${r.student_name}__${r.class}`;
        map[key] = map[key] || [];
        map[key].push(r);
      });
    return Object.entries(map).map(([key, rows]) => {
      const [name, cls] = key.split("__");
      return buildSummary(name, cls, rows);
    });
  }, [rows]);

  const classes = useMemo(() => {
    return [...new Set(students.map(s => s.cls))].sort((a,b) => parseInt(a) - parseInt(b));
  }, [students]);

  const filtered = useMemo(() => {
    return students
      .filter(s => {
        const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
        const matchClass  = !filterCls || s.cls === filterCls;
        return matchSearch && matchClass;
      })
      .sort((a, b) => {
        if (sortBy === "name")       return a.name.localeCompare(b.name);
        if (sortBy === "score")      return (b.avgScore ?? -1) - (a.avgScore ?? -1);
        if (sortBy === "time")       return b.totalTime - a.totalTime;
        if (sortBy === "sessions")   return b.sessions.length - a.sessions.length;
        if (sortBy === "lastActive") return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
        return 0;
      });
  }, [students, search, filterCls, sortBy]);

  // Class stats
  const classStats = useMemo(() => {
    const scored = students.filter(s => s.avgScore != null);
    const avgAll = scored.length ? Math.round(scored.reduce((a,b) => a + b.avgScore!, 0) / scored.length) : null;
    const totalTime = students.reduce((a,b) => a + b.totalTime, 0);
    const needsHelp = students.filter(s => s.avgScore != null && s.avgScore < 45);
    return { avgAll, totalTime, needsHelp };
  }, [students]);

  const trendIcon = (t: StudentSummary["trend"]) =>
    t === "up" ? "📈" : t === "down" ? "📉" : t === "flat" ? "➡️" : "🆕";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <div style={{ background: "#0f172a", padding: "0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.3em", color: "#FFD700" }}>SHAURI</span>
            <span style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Teacher Portal</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {lastSynced && <span style={{ fontSize: 11, color: "#475569" }}>Synced {fmtDate(lastSynced.toISOString())}</span>}
            <button onClick={fetchData} style={{ padding: "7px 14px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
              🔄 Refresh
            </button>
            <button onClick={() => window.location.href = "/"} style={{ padding: "7px 14px", background: "transparent", color: "#64748b", border: "1px solid #334155", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
              ← Home
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 64px" }}>

        {/* ── Title ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0 }}>Class Dashboard</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
            {students.length} student{students.length !== 1 ? "s" : ""} · {rows.length} sessions recorded
          </p>
        </div>

        {/* ── Loading / Error ── */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1d4ed8" }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>🔄</span> Loading student data…
          </div>
        )}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#b91c1c" }}>
            ⚠️ {error} — Make sure your /api/progress endpoint supports <code>?all=true</code>
          </div>
        )}

        {/* ── Summary strip ── */}
        {!loading && students.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { icon: "👥", label: "Total Students", value: String(students.length), sub: `${classes.length} class${classes.length !== 1?"es":""}`, color: "#2563eb" },
              { icon: "📊", label: "Class Average", value: classStats.avgAll != null ? `${classStats.avgAll}%` : "—", sub: classStats.avgAll != null ? getGrade(classStats.avgAll).label : "", color: classStats.avgAll != null ? getGrade(classStats.avgAll).color : "#94a3b8" },
              { icon: "⏱️", label: "Total Study Time", value: fmtTime(classStats.totalTime), sub: `${Math.round(classStats.totalTime/students.length/60)}m avg/student`, color: "#0d9488" },
              { icon: "⚠️", label: "Need Attention", value: String(classStats.needsHelp.length), sub: classStats.needsHelp.length > 0 ? classStats.needsHelp.slice(0,2).map(s=>s.name).join(", ") + (classStats.needsHelp.length > 2 ? "…" : "") : "All passing", color: classStats.needsHelp.length > 0 ? "#dc2626" : "#059669" },
            ].map(card => (
              <div key={card.label} style={{ background: "#fff", borderRadius: 14, padding: "18px 18px 14px", border: "1px solid #e2e8f0", borderTop: `3px solid ${card.color}` }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{card.icon}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.2, margin: "2px 0" }}>{card.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: card.color }}>{card.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters ── */}
        {!loading && students.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search student…"
              style={{ padding: "9px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", minWidth: 180, fontFamily: "inherit" }}
            />
            <select value={filterCls} onChange={e => setFilterCls(e.target.value)}
              style={{ padding: "9px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff" }}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              {(["lastActive","score","time","sessions","name"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)} style={{
                  padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                  background: sortBy === s ? "#2563eb" : "#fff",
                  color: sortBy === s ? "#fff" : "#64748b",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  textTransform: "capitalize",
                }}>
                  {s === "lastActive" ? "Recent" : s === "score" ? "Score" : s === "time" ? "Time" : s === "sessions" ? "Sessions" : "A–Z"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Student table ── */}
        {!loading && filtered.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 90px 80px 120px 90px 70px", gap: 0, padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Student", "Class", "Avg Score", "Sessions", "Time Spent", "Last Active", "Trend"].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
              ))}
            </div>

            {filtered.map((s, i) => {
              const grade = s.avgScore != null ? getGrade(s.avgScore) : null;
              return (
                <div key={`${s.name}-${s.cls}`}
                  onClick={() => setSelected(s)}
                  style={{
                    display: "grid", gridTemplateColumns: "2fr 80px 90px 80px 120px 90px 70px",
                    gap: 0, padding: "14px 20px",
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer", transition: "background 0.15s",
                    alignItems: "center",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa")}
                >
                  {/* Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: "linear-gradient(135deg, #2563eb, #0d9488)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0,
                    }}>{s.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.strongest ? `Strong: ${s.strongest}` : "No data"}</div>
                    </div>
                  </div>
                  {/* Class */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Class {s.cls}</div>
                  {/* Score */}
                  <div>
                    {s.avgScore != null ? (
                      <span style={{ fontSize: 14, fontWeight: 800, color: grade!.color }}>{s.avgScore}%
                        <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 5, padding: "2px 6px", background: grade!.color + "20", borderRadius: 4 }}>{grade!.label}</span>
                      </span>
                    ) : <span style={{ fontSize: 12, color: "#94a3b8" }}>No scores</span>}
                  </div>
                  {/* Sessions */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{s.sessions.length}</div>
                  {/* Time */}
                  <div style={{ fontSize: 13, color: "#334155" }}>{fmtTime(s.totalTime)}</div>
                  {/* Last active */}
                  <div style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(s.lastActive)}</div>
                  {/* Trend */}
                  <div style={{ fontSize: 16 }}>{trendIcon(s.trend)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && students.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 20, border: "1.5px dashed #cbd5e1" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👩‍🏫</div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>No student data yet</p>
            <p style={{ fontSize: 14, color: "#64748b" }}>Students need to complete at least one exam session to appear here.</p>
          </div>
        )}

      </div>

      {/* Student detail modal */}
      {selected && <StudentModal student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}