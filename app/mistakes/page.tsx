"use client";
import { useEffect, useState, useMemo } from "react";
import Header from "../components/Header";
import {
  getMistakes,
  markMistakeReviewed,
  deleteMistake,
  clearAllMistakes,
  getWeakTopics,
  type MistakeEntry,
} from "@/lib/mistakeLog";

const SEVERITY_META = {
  wrong:   { label: "Wrong",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  partial: { label: "Partial", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
};

const SUBJECT_COLORS = ["#2563eb","#0d9488","#7c3aed","#ea580c","#4f46e5","#059669","#db2777"];

function subjectColor(subject: string, all: string[]): string {
  const idx = all.indexOf(subject);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

export default function MistakesPage() {
  const [mistakes, setMistakes]       = useState<MistakeEntry[]>([]);
  const [filter, setFilter]           = useState<"all" | "wrong" | "partial" | "reviewed">("all");
  const [subjectFilter, setSubFilter] = useState<string>("all");
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [search, setSearch]           = useState("");

  function reload() { setMistakes(getMistakes()); }
  useEffect(() => { reload(); }, []);

  const allSubjects = useMemo(() => Array.from(new Set(mistakes.map(m => m.subject))).sort(), [mistakes]);
  const weakTopics  = useMemo(() => getWeakTopics(), [mistakes]);

  const filtered = useMemo(() => {
    return mistakes
      .filter(m => {
        if (filter === "reviewed" && !m.reviewed) return false;
        if (filter === "wrong"    && m.severity !== "wrong") return false;
        if (filter === "partial"  && m.severity !== "partial") return false;
        if (filter === "all"      && m.reviewed) return false; // "all" = pending only
        if (subjectFilter !== "all" && m.subject !== subjectFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return m.topic.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q) || m.feedback.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [mistakes, filter, subjectFilter, search]);

  const pendingCount  = mistakes.filter(m => !m.reviewed).length;
  const reviewedCount = mistakes.filter(m => m.reviewed).length;
  const wrongCount    = mistakes.filter(m => m.severity === "wrong" && !m.reviewed).length;
  const partialCount  = mistakes.filter(m => m.severity === "partial" && !m.reviewed).length;

  function handleReview(id: string) {
    markMistakeReviewed(id);
    reload();
  }
  function handleDelete(id: string) {
    deleteMistake(id);
    reload();
  }
  function handleClearAll() {
    if (confirm("Clear ALL mistakes? This cannot be undone.")) {
      clearAllMistakes();
      reload();
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <Header onLogout={() => (window.location.href = "/")} />

      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", padding: "28px 20px 64px", width: "100%" }}>

        {/* ── Top bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <button onClick={() => (window.location.href = "/revision")}
              style={{ padding: "7px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151", marginRight: 10 }}>
              ← Revision
            </button>
            <h1 style={{ display: "inline", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>❌ Mistake Log</h1>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Auto-captured from your exam evaluations. Review and correct each one.</p>
          </div>
          {mistakes.length > 0 && (
            <button onClick={handleClearAll}
              style={{ padding: "7px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#dc2626" }}>
              🗑️ Clear All
            </button>
          )}
        </div>

        {/* ── Stat strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Pending",  value: pendingCount,  color: "#dc2626", bg: "#fef2f2" },
            { label: "Wrong",    value: wrongCount,    color: "#dc2626", bg: "#fef2f2" },
            { label: "Partial",  value: partialCount,  color: "#d97706", bg: "#fffbeb" },
            { label: "Reviewed", value: reviewedCount, color: "#059669", bg: "#f0fdf4" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Weak Topics ── */}
        {weakTopics.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0", marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>🎯 Weak Topics (needs revision)</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {weakTopics.slice(0, 12).map((t, i) => (
                <div key={i} style={{ padding: "6px 14px", borderRadius: 20, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, fontWeight: 600, color: "#dc2626" }}>
                  {t.subject} — {t.topic}
                  <span style={{ marginLeft: 6, background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>{t.count}×</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => (window.location.href = "/revision")}
              style={{ marginTop: 14, padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              📖 Go to Revision →
            </button>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
          {(["all", "wrong", "partial", "reviewed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", borderRadius: 20, border: `2px solid ${filter === f ? "#2563eb" : "#e2e8f0"}`, background: filter === f ? "#eff6ff" : "#fff", color: filter === f ? "#2563eb" : "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {f === "all" ? "Pending" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
          <select value={subjectFilter} onChange={e => setSubFilter(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid #e2e8f0", fontSize: 12, fontWeight: 600, color: "#374151", background: "#fff", outline: "none" }}>
            <option value="all">All Subjects</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topic / feedback…"
            style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid #e2e8f0", fontSize: 12, color: "#374151", background: "#fff", outline: "none", minWidth: 180 }} />
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 20, border: "1.5px dashed #cbd5e1" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{mistakes.length === 0 ? "✅" : "🔍"}</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              {mistakes.length === 0 ? "No mistakes recorded yet" : "No results for this filter"}
            </p>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              {mistakes.length === 0
                ? "Mistakes are auto-captured when you submit an exam. Take a test to see your mistake log."
                : "Try changing the filter or search term."}
            </p>
            {mistakes.length === 0 && (
              <button onClick={() => (window.location.href = "/examiner")}
                style={{ marginTop: 16, padding: "10px 22px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Start an Exam
              </button>
            )}
          </div>
        )}

        {/* ── Mistake cards ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(m => {
            const meta   = SEVERITY_META[m.severity];
            const isOpen = expanded === m.id;
            const sColor = subjectColor(m.subject, allSubjects);

            return (
              <div key={m.id} style={{ background: m.reviewed ? "#f8fafc" : "#fff", border: `1px solid ${m.reviewed ? "#e2e8f0" : meta.border}`, borderLeft: `4px solid ${m.reviewed ? "#94a3b8" : meta.color}`, borderRadius: 12, overflow: "hidden", opacity: m.reviewed ? 0.7 : 1 }}>

                {/* Card header */}
                <div
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: meta.bg, color: meta.color, flexShrink: 0 }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: sColor + "18", color: sColor, flexShrink: 0 }}>
                    {m.subject}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.qNum} — {m.topic}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{timeAgo(m.createdAt)}</span>
                  {m.marksLost > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, flexShrink: 0 }}>-{m.marksLost}m</span>
                  )}
                  {m.reviewed && <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>✓ Done</span>}
                  <span style={{ color: "#94a3b8", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${meta.border}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12, marginBottom: 12 }}>
                      {m.correctAnswer && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>✎ Correct Answer</div>
                          <div style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6 }}>{m.correctAnswer}</div>
                        </div>
                      )}
                      {m.feedback && (
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>💬 Feedback</div>
                          <div style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.6 }}>{m.feedback}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
                      Day {m.day} · Cycle {m.cycle} · {new Date(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!m.reviewed && (
                        <button onClick={() => handleReview(m.id)}
                          style={{ padding: "7px 16px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#059669" }}>
                          ✓ Mark as Understood
                        </button>
                      )}
                      <button onClick={() => (window.location.href = `/revision?subject=${encodeURIComponent(m.subject)}&topic=${encodeURIComponent(m.topic)}`)}
                        style={{ padding: "7px 16px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#2563eb" }}>
                        📖 Revise This Topic
                      </button>
                      <button onClick={() => handleDelete(m.id)}
                        style={{ padding: "7px 14px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#dc2626", marginLeft: "auto" }}>
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}