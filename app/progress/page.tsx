"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Header from "../components/Header";
import { supabaseClient as supabase } from "../lib/supabase-client";

type ExamAttempt = {
  id: string;
  date: string;
  mode: "examiner";
  subject: string;
  chapters: string[];
  timeTakenSeconds: number;
  rawAnswerText: string;
  scorePercent?: number;
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

export default function ProgressPage() {
  const [attempts, setAttempts]     = useState<ExamAttempt[]>([]);
  const [aiSummary, setAiSummary]   = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [syncState, setSyncState]   = useState<SyncState>("loading"); // start as loading, not idle
  const [errorMsg, setErrorMsg]     = useState("");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Fetch from Supabase OR localStorage ─────────────────────
  const fetchAttempts = useCallback(async () => {
    setSyncState("loading");
    setErrorMsg("");

    // Step 1: Load from localStorage immediately so there's something to show
    let localAttempts: ExamAttempt[] = [];
    try {
      const local = localStorage.getItem("shauri_exam_attempts");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localAttempts = parsed;
          setAttempts(parsed);
        }
      }
    } catch {}

    // Step 2: Read student info
    let name = "", cls = "";
    try {
      const stored = localStorage.getItem("shauri_student");
      if (stored) {
        const s = JSON.parse(stored);
        name = s?.name?.trim() || "";
        cls  = s?.class?.trim() || "";
      }
    } catch {}

    // Step 3: If no student info, we're offline/guest — done
    if (!name || !cls) {
      setSyncState(localAttempts.length > 0 ? "success" : "idle");
      if (localAttempts.length > 0) setLastSynced(new Date());
      return;
    }

    // Step 4: Fetch from Supabase
    try {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("student_name", name)
        .eq("class", cls)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        // Server has no records — keep local data if any
        setSyncState("success");
        setLastSynced(new Date());
        return;
      }

      // Step 5: Map — try all known column name variants for score
      const mapped: ExamAttempt[] = data.map((d: any) => {
        const rawScore =
          d.percentage    ??
          d.score_percent ??
          d.scorePercent  ??
          d.score         ??
          null;
        const scoreNum = rawScore !== null ? Number(rawScore) : undefined;

        return {
          id: d.id,
          date: d.created_at,
          mode: "examiner" as const,
          subject: d.subject || "General",
          chapters: Array.isArray(d.chapters) ? d.chapters : [],
          timeTakenSeconds: d.time_taken_seconds ?? 0,
          rawAnswerText: "",
          scorePercent: scoreNum !== undefined && !isNaN(scoreNum) ? scoreNum : undefined,
        };
      });

      // Filter out any rows where scorePercent is still undefined (no score column matched)
      const validMapped = mapped.filter(a => typeof a.scorePercent === "number");

      if (validMapped.length === 0 && localAttempts.length > 0) {
        // Supabase returned rows but none had a parseable score
        // Keep local data and warn in console
        console.warn("[Progress] Supabase rows found but no score column matched. Columns present:", Object.keys(data[0]));
        setSyncState("success");
        setLastSynced(new Date());
        return;
      }

      setAttempts(validMapped.length > 0 ? validMapped : localAttempts);
      setSyncState("success");
      setLastSynced(new Date());

    } catch (err: any) {
      console.error("[Progress] Supabase fetch error:", err);
      setErrorMsg(err?.message || "Network error. Showing local data.");
      setSyncState("error");
      // Don't wipe local attempts
    }
  }, []);

  // ── Fetch on mount ───────────────────────────────────────────
  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  // ── Derive per-subject stats ─────────────────────────────────
  const subjects: SubjectStat[] = useMemo(() => {
    const map: Record<string, number[]> = {};
    attempts.forEach((a) => {
      if (typeof a.scorePercent === "number" && !isNaN(a.scorePercent)) {
        map[a.subject] ??= [];
        map[a.subject].push(a.scorePercent);
      }
    });
    return Object.entries(map).map(([subject, scores], idx) => {
      const latest = scores[scores.length - 1];
      return {
        subject, scores, latest,
        best: Math.max(...scores),
        band: getGrade(latest),
        trend: getTrend(scores),
        color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
        gapToNext: getGapToNext(latest),
      };
    });
  }, [attempts]);

  const overallAvg = subjects.length
    ? Math.round(subjects.reduce((s, x) => s + x.latest, 0) / subjects.length)
    : null;

  const bestSubject = subjects.length
    ? subjects.reduce((a, b) => (a.latest >= b.latest ? a : b))
    : null;

  const mostImproved = subjects
    .filter((s) => s.trend.delta !== null && (s.trend.delta as number) > 0)
    .sort((a, b) => (b.trend.delta as number) - (a.trend.delta as number))[0] ?? null;

  const totalExams = attempts.length;

  // ── AI summary ───────────────────────────────────────────────
  useEffect(() => {
    if (!subjects.length || aiSummary) return;
    generateAISummary(subjects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects.length]);

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
        if (Array.isArray(parsed)) setAttempts(parsed);
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
        <button style={btnBase} onClick={() => (window.location.href = "/modes")}>← Modes</button>
        <div style={{ display: "flex", gap: 10 }}>
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
          Track your performance across all subjects
        </p>

        {/* Sync status bar */}
        <div style={{ marginBottom: 24 }}>
          {syncState === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#1d4ed8" }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>🔄</span>
              Syncing your results…
            </div>
          )}
          {syncState === "error" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#b91c1c" }}>
              <span>⚠️ {errorMsg || "Could not load from server. Showing local data."}</span>
              <button onClick={fetchAttempts} style={{ ...btnBase, background: "#dc2626", padding: "6px 14px", fontSize: 12 }}>Retry</button>
            </div>
          )}
          {syncState === "success" && lastSynced && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#15803d" }}>
              ✅ Synced at {lastSynced.toLocaleTimeString()}
            </div>
          )}
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
                ? "Check your connection and retry. Local data shown if available."
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
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    display: "flex", alignItems: "flex-end",
                    gap: subjects.length > 5 ? 10 : 20, height: "100%",
                    borderBottom: "2px solid #f1f5f9",
                  }}>
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
    </div>
  );
}