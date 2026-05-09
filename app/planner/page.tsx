"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Header from "../components/Header";
import ManualMarksModal from "../components/ManualMarksModal";
import {
  THIRTY_DAY_PLAN,
  getActivityLogs,
  getCurrentDay,
  getPlannerState,
  handleCarryForward,
  markComplete,
  markSkipped,
  reopenPendingDay,
  undoLastAction,
  type PlannerState,
} from "@/lib/plannerState";
import {
  analyzeProgress,
  buildRevisionQueue,
  getAllResults,
  getResultsForCycle,
  hasResultForDayCycle,
  saveResultsForDay,
} from "@/lib/plannerResults";

type ModeView = "independent" | "guided";
type MonthId  = "may" | "june" | "july";

function getClassNum(cls?: string | number): number {
  if (typeof cls === "number") return cls;
  if (!cls) return 0;
  const n = parseInt(cls.replace(/\D/g, ""));
  return isNaN(n) ? 0 : n;
}

function priorityColor(priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW") {
  if (priority === "CRITICAL") return { bg: "#fee2e2", fg: "#b91c1c" };
  if (priority === "HIGH")     return { bg: "#ffedd5", fg: "#c2410c" };
  if (priority === "MEDIUM")   return { bg: "#fef9c3", fg: "#a16207" };
  return { bg: "#dcfce7", fg: "#166534" };
}

function mapDayType(type: string, isRev?: boolean, isMock?: boolean): string {
  if (isMock) return "Test";
  if (isRev || type === "rev") return "Revision";
  return "Study";
}

function getMonthForDay(day: number): MonthId {
  if (day <= 30) return "may";
  if (day <= 60) return "june";
  return "july";
}

function getDaysForMonth(month: MonthId): number[] {
  if (month === "may")  return Array.from({ length: 30 }, (_, i) => i + 1);
  if (month === "june") return Array.from({ length: 30 }, (_, i) => i + 31);
  return Array.from({ length: 30 }, (_, i) => i + 61);
}

export default function PlannerPage() {
  const [plannerState,   setPlannerState]   = useState<PlannerState | null>(null);
  const [modeView,       setModeView]       = useState<ModeView>("guided");
  const [openedDay,      setOpenedDay]      = useState<number | null>(null);
  const [activeMonth,    setActiveMonth]    = useState<MonthId>("may");
  const [resultsVersion, setResultsVersion] = useState(0);
  const [feedback,       setFeedback]       = useState("");
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [modalDay,       setModalDay]       = useState<number | null>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
      if (!s || getClassNum(s.classLevel ?? s.class) !== 10) {
        window.location.href = "/modes";
        return;
      }
    } catch {
      window.location.href = "/modes";
      return;
    }
    const state = getCurrentDay(getPlannerState(), getActivityLogs());
    setPlannerState(state);
    setOpenedDay(state.current_day);
    setActiveMonth(getMonthForDay(state.current_day));
  }, []);

  useEffect(() => {
    if (!openedDay) return;
    setActiveMonth(getMonthForDay(openedDay));
  }, [openedDay]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const planner = useMemo(() => {
    if (!plannerState || !openedDay) return null;
    const currentPlan   = THIRTY_DAY_PLAN.find((d) => d.day === openedDay) || THIRTY_DAY_PLAN[0];
    const pendingDays   = handleCarryForward(plannerState);
    const pendingPlans  = pendingDays
      .map((d) => THIRTY_DAY_PLAN.find((p) => p.day === d))
      .filter((p): p is (typeof THIRTY_DAY_PLAN)[number] => Boolean(p));
    const cycleResults  = getResultsForCycle(plannerState.cycle);
    const progress      = analyzeProgress(cycleResults);
    const revisionQueue = buildRevisionQueue(cycleResults);
    return { currentPlan, pendingPlans, progress, revisionQueue, allResultsCount: getAllResults().length };
  }, [plannerState, openedDay, resultsVersion]);

  if (!plannerState || !planner || !openedDay) return null;

  const hasSubmittedMarks = hasResultForDayCycle(openedDay, plannerState.cycle);
  const currentSubject    = planner.currentPlan.topics[0]?.subject || "General";
  const currentTopic      = planner.currentPlan.topics[0]?.topic   || "General";
  const visibleDays       = getDaysForMonth(activeMonth);

  function goToLearn(subject: string, topic: string) {
    if (!plannerState || !openedDay) return;
    const q = new URLSearchParams({ subject, topic, day: String(openedDay), cycle: String(plannerState.cycle), from: "planner" });
    window.location.href = `/teacher?${q.toString()}`;
  }

  function goToExam(subject: string, topic: string) {
    if (!plannerState || !openedDay) return;
    const q = new URLSearchParams({ subject, topic, day: String(openedDay), cycle: String(plannerState.cycle), from: "planner" });
    window.location.href = `/examiner?${q.toString()}`;
  }

  function openMarksModal(day: number) {
    setModalDay(day);
    setShowMarksModal(true);
  }

  /* ── Save result for ALL subjects in the day's plan ── */
  function handleMarksSaved(result: {
    marks: number;
    total: number;
    pct: number;
    errorTopics: string[];
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    errorLog: string[];
    categoryPerformance: Array<{
      category: string;
      obtained: number;
      total: number;
      percentage: number;
      weaknessSeverity: string;
      notes?: string;
    }>;
  }) {
    if (!planner) return; // ← FIXED: null guard added

    const day  = modalDay ?? openedDay ?? 1;
    const plan = THIRTY_DAY_PLAN.find((d) => d.day === day) || planner.currentPlan;

    // Distribute marks equally across all subjects in the test
    const topics     = plan.topics;
    const perSubject = topics.length > 0 ? Math.round(result.total / topics.length) : result.total;
    const perScore   = topics.length > 0 ? Math.round(result.marks / topics.length) : result.marks;

    saveResultsForDay(
      topics.map((t) => ({
        day,
        cycle:   plannerState!.cycle,
        subject: t.subject,
        topic:   t.topic,
        score:   perScore,
        total:   perSubject,
        source:  "manual_verified" as const,
        diagnostics: {
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          improvementPriorities: result.improvements,
          errorLog: result.errorLog,
          errorTopics: result.errorTopics,
          categoryPerformance: result.categoryPerformance.map((c) => ({
            ...c,
            weaknessSeverity: (c.weaknessSeverity as "low" | "medium" | "high" | "critical"),
          })),
        },
      }))
    );

    setResultsVersion((v) => v + 1);
    setShowMarksModal(false);
    setModalDay(null);
    setFeedback(`✅ Result saved — ${result.pct}%${result.errorLog.length ? ` · ${result.errorLog.length} errors logged` : ""}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#06080f", color: "#dde4f0", display: "flex", flexDirection: "column" }}>
      <Header onLogout={() => (window.location.href = "/")} />

      <main style={{ width: "100%", maxWidth: 1240, margin: "0 auto", padding: "24px 20px 54px" }}>

        {/* ── Top nav ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <button onClick={() => (window.location.href = "/modes")}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}>
            ← Modes
          </button>
          <div style={{ display: "flex", gap: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, padding: 4 }}>
            {(["independent", "guided"] as ModeView[]).map((m) => (
              <button key={m} onClick={() => setModeView(m)}
                style={{ padding: "6px 12px", border: "none", borderRadius: 999, cursor: "pointer", background: modeView === m ? "#0f172a" : "transparent", color: modeView === m ? "#fff" : "#334155", fontWeight: 600 }}>
                {m === "independent" ? "🧠 Independent" : "🎯 Guided"}
              </button>
            ))}
          </div>
        </div>

        <h1 style={{ margin: 0, fontSize: 30, color: "#f5c842", letterSpacing: 1 }}>CBSE Class X — 90-Day Planner</h1>
        <p style={{ marginTop: 6, color: "#7f8ba3" }}>NCERT full syllabus • Foundation, Building, Mastery</p>
        {feedback && (
          <p style={{ marginTop: 6, color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, display: "inline-block" }}>
            {feedback}
          </p>
        )}

        {/* ── Month tabs + day cards ── */}
        <section style={{ marginTop: 16, background: "#0c0f1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {([
              { id: "may"  as MonthId, label: "MAY",  sub: "Days 1-30",  col: "#4dc9ff", icon: "🌸" },
              { id: "june" as MonthId, label: "JUNE", sub: "Days 31-60", col: "#57e89f", icon: "⚡" },
              { id: "july" as MonthId, label: "JULY", sub: "Days 61-90", col: "#ff8c4b", icon: "🏆" },
            ]).map((m) => (
              <button key={m.id} onClick={() => setActiveMonth(m.id)}
                style={{
                  padding: "12px 10px", border: "none",
                  borderBottom: activeMonth === m.id ? `2px solid ${m.col}` : "2px solid transparent",
                  background:   activeMonth === m.id ? "rgba(255,255,255,0.03)" : "transparent",
                  color:        activeMonth === m.id ? m.col : "#7f8ba3",
                  cursor: "pointer", fontWeight: 700,
                }}>
                <div style={{ fontSize: 18 }}>{m.icon}</div>
                <div style={{ fontSize: 16, letterSpacing: 1 }}>{m.label}</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>{m.sub}</div>
              </button>
            ))}
          </div>

          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
            {visibleDays.map((dayNum) => {
              const d = THIRTY_DAY_PLAN.find((x) => x.day === dayNum);
              if (!d) return null;
              const isCurrent   = plannerState.current_day === d.day;
              const isCompleted = plannerState.completed_days.includes(d.day);
              const isSkipped   = plannerState.skipped_days.includes(d.day);
              const isSelected  = openedDay === d.day;
              const topCol = d.meta.isMock ? "#ff6060" : d.meta.isRev || d.meta.type === "rev" ? "#f5c842" : "#4dc9ff";

              return (
                <button key={d.day} onClick={() => setOpenedDay(d.day)}
                  style={{
                    borderTop:    `3px solid ${topCol}`,
                    borderRight:  isSelected ? `1px solid ${topCol}` : "1px solid rgba(255,255,255,0.08)",
                    borderBottom: isSelected ? `1px solid ${topCol}` : "1px solid rgba(255,255,255,0.08)",
                    borderLeft:   isSelected ? `1px solid ${topCol}` : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    background: isCompleted
                      ? "rgba(87,232,159,0.25)"
                      : isCurrent
                      ? "rgba(77,201,255,0.14)"
                      : isSkipped
                      ? "rgba(245,200,66,0.14)"
                      : "#111526",
                    color: "#dde4f0",
                    cursor: "pointer",
                    padding: "8px 6px",
                    textAlign: "left",
                    position: "relative",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{d.day}</span>
                    <span style={{ fontSize: 9, color: "#8ea0bd" }}>{d.meta.dow.slice(0, 3)}</span>
                  </div>
                  <div style={{ marginTop: 5, fontSize: 9, color: "#8ea0bd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {mapDayType(d.meta.type, d.meta.isRev, d.meta.isMock)}
                  </div>
                  {isCompleted && (
                    <div style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: "#57e89f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#06080f", fontWeight: 800 }}>
                      ✓
                    </div>
                  )}
                  {isCurrent && !isCompleted && (
                    <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: "#4dc9ff" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ padding: "8px 12px 12px", display: "flex", gap: 16, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {[
              { col: "rgba(87,232,159,0.25)", label: "✓ Completed", border: "#57e89f" },
              { col: "rgba(77,201,255,0.14)",  label: "Today",       border: "#4dc9ff" },
              { col: "rgba(245,200,66,0.14)",  label: "Skipped",     border: "#f5c842" },
              { col: "#111526",                label: "Upcoming",    border: "rgba(255,255,255,0.08)" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8ea0bd" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.col, border: `1px solid ${l.border}` }} />
                {l.label}
              </div>
            ))}
          </div>
        </section>

        {/* ── Today's plan ── */}
        <section style={{ marginTop: 22, background: "#0c0f1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 19, color: "#dde4f0" }}>Today</h2>
          <div style={{ fontWeight: 700, color: "#4dc9ff", marginBottom: 10, fontSize: 15 }}>
            Day {openedDay} (Cycle {plannerState.cycle})
          </div>
          <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: 13 }}>
            {planner.currentPlan.meta.dow} • {mapDayType(planner.currentPlan.meta.type, planner.currentPlan.meta.isRev, planner.currentPlan.meta.isMock)}
          </p>

          <ul style={{ margin: 0, paddingLeft: 18, color: "#8ea0bd", lineHeight: 1.7 }}>
            {planner.currentPlan.topics.map((t, idx) => (
              <li key={`${t.subject}-${idx}`}>
                <span style={{ color: planner.progress.weakSubjects.includes(t.subject) ? "#f87171" : "#dde4f0", fontWeight: planner.progress.weakSubjects.includes(t.subject) ? 700 : 500 }}>
                  {t.subject}
                </span>
                : <span style={{ color: "#8ea0bd" }}>{t.topic}</span>
              </li>
            ))}
          </ul>

          {/* Subject action buttons */}
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {planner.currentPlan.topics.map((t, idx) => (
              <div key={`actions-${idx}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px" }}>
                <span style={{ fontSize: 12, color: "#dde4f0", fontWeight: 600 }}>{t.subject}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => goToLearn(t.subject, t.topic)} style={btnPrimary}>Start Study</button>
                  <button onClick={() => goToExam(t.subject, t.topic)}  style={btnSecondary}>Take Daily Test</button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Submit Marks ── */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {hasSubmittedMarks ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(87,232,159,0.12)", border: "1px solid rgba(87,232,159,0.4)", borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: "#57e89f", fontWeight: 700 }}>✅ Result submitted</span>
                <button onClick={() => openMarksModal(openedDay)}
                  style={{ fontSize: 11, color: "#8ea0bd", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Update
                </button>
              </div>
            ) : (
              <button onClick={() => openMarksModal(openedDay)} style={btnSubmitMarks}>
                📝 Submit Marks
              </button>
            )}
            <span style={{ fontSize: 12, color: "#5a6880" }}>
              AI will verify from question paper + answer sheet or evaluated result summary
            </span>
          </div>

          {/* ── Day actions ── */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button
              onClick={() => {
                const next = markComplete(plannerState, openedDay);
                setPlannerState(next);
                setOpenedDay(next.current_day);
                setFeedback(`✅ Day ${openedDay} complete! Now on Day ${next.current_day}`);
              }}
              disabled={!hasSubmittedMarks}
              title={!hasSubmittedMarks ? "Submit marks first." : ""}
              style={{ ...btnDone, opacity: hasSubmittedMarks ? 1 : 0.5, cursor: hasSubmittedMarks ? "pointer" : "not-allowed" }}>
              ✓ Mark Complete
            </button>
            <button
              onClick={() => {
                const next = markSkipped(plannerState, openedDay);
                setPlannerState(next);
                setOpenedDay(next.current_day);
                setFeedback(`⏭ Day ${openedDay} skipped. Now on Day ${next.current_day}`);
              }}
              style={btnSkip}>
              Skip Today
            </button>
            <button
              onClick={() => {
                const prev = undoLastAction(plannerState);
                setPlannerState(prev);
                setOpenedDay(prev.current_day);
                setFeedback("↩ Last action undone");
              }}
              disabled={!plannerState.last_action}
              style={{ ...btnGhost, opacity: plannerState.last_action ? 1 : 0.5, cursor: plannerState.last_action ? "pointer" : "not-allowed" }}>
              Undo
            </button>
          </div>
        </section>

        {/* ── Pending days ── */}
        {planner.pendingPlans.length > 0 && (
          <section style={{ marginTop: 18, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 19, color: "#0f172a" }}>Pending</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {planner.pendingPlans.map((day) => (
                <div key={day.day} style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, color: "#b45309" }}>Day {day.day}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setPlannerState(reopenPendingDay(plannerState, day.day)); setFeedback(`Day ${day.day} reopened`); }} style={btnGhost}>
                        Reopen
                      </button>
                      {!hasResultForDayCycle(day.day, plannerState.cycle) ? (
                        <button onClick={() => openMarksModal(day.day)} style={{ ...btnGhost, borderColor: "#f59e0b", color: "#92400e" }}>
                          Submit Marks
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const next = markComplete(plannerState, day.day);
                            setPlannerState(next);
                            setOpenedDay(next.current_day);
                            setFeedback(`Day ${day.day} completed`);
                          }}
                          style={{ ...btnGhost, borderColor: "#16a34a", color: "#166534" }}>
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 12 }}>
                    {day.meta.dow} • {mapDayType(day.meta.type, day.meta.isRev, day.meta.isMock)}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#334155" }}>
                    {day.topics.map((t, i) => (
                      <li key={`${t.subject}-${i}`}>{t.subject}: {t.topic}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Progress Summary ── */}
        <section style={{ marginTop: 18, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 19, color: "#0f172a" }}>Progress Summary</h2>
          <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: 12 }}>Results tracked: {planner.allResultsCount}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <p style={metaTitle}>Subject Performance</p>
              {Object.keys(planner.progress.subjectAverages).length === 0 ? (
                <p style={muted}>No scored activity yet.</p>
              ) : (
                Object.entries(planner.progress.subjectAverages).map(([subject, score]) => {
                  const band = planner.progress.subjectBands[subject];
                  const color = band === "weak" ? "#b91c1c" : band === "strong" ? "#059669" : "#d97706";
                  return (
                    <div key={subject} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
                      <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, color, fontWeight: 700, minWidth: 80 }}>{subject}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}%</span>
                    </div>
                  );
                })
              )}
            </div>
            <div>
              <p style={metaTitle}>Weak / Strong Areas</p>
              <p style={{ margin: "6px 0", color: "#334155" }}>Weak (&lt;50%): <span style={{ color: "#b91c1c", fontWeight: 700 }}>{planner.progress.weakSubjects.join(", ") || "None"}</span></p>
              <p style={{ margin: "6px 0", color: "#334155" }}>Moderate (50–75%): <span style={{ color: "#d97706", fontWeight: 700 }}>{planner.progress.moderateSubjects.join(", ") || "None"}</span></p>
              <p style={{ margin: "6px 0", color: "#334155" }}>Strong (&gt;75%): <span style={{ color: "#059669", fontWeight: 700 }}>{planner.progress.strongSubjects.join(", ") || "None"}</span></p>
            </div>
          </div>
        </section>

        {/* ── Smart Focus ── */}
        <section style={{ marginTop: 18, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 19, color: "#0f172a" }}>Smart Focus</h2>
          {planner.revisionQueue.length === 0 ? (
            <p style={muted}>No topic-level results yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {planner.revisionQueue.map((q, i) => (
                <div key={`${q.subject}-${q.topic}-${i}`}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{q.subject}</div>
                    <div style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.topic}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{q.average}%</span>
                    <span style={{ ...priorityPill, background: priorityColor(q.priority).bg, color: priorityColor(q.priority).fg }}>{q.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {planner.currentPlan.meta.isRev && planner.revisionQueue.length > 0 && (
            <p style={{ margin: "10px 0 0", color: "#7c2d12", fontSize: 13, fontWeight: 600 }}>
              Revision Day Priority: {planner.revisionQueue.map((q) => `${q.subject} (${q.priority})`).join(" • ")}
            </p>
          )}
        </section>

        {/* ── Suggestions ── */}
        <section style={{ marginTop: 18, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 19, color: "#0f172a" }}>Suggestions</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", lineHeight: 1.7 }}>
            {planner.progress.suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </section>
      </main>

      {/* ── ManualMarksModal ── */}
      {showMarksModal && plannerState && (
        <ManualMarksModal
          subject={
            modalDay
              ? (THIRTY_DAY_PLAN.find(d => d.day === modalDay)?.topics[0]?.subject || currentSubject)
              : currentSubject
          }
          chapter={
            modalDay
              ? (THIRTY_DAY_PLAN.find(d => d.day === modalDay)?.topics[0]?.topic || currentTopic)
              : currentTopic
          }
          day={modalDay ?? openedDay}
          onSaved={handleMarksSaved}
          onClose={() => { setShowMarksModal(false); setModalDay(null); }}
        />
      )}
    </div>
  );
}

const btnPrimary:     CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "#2563eb", color: "#fff", fontWeight: 600 };
const btnSecondary:   CSSProperties = { ...btnPrimary, background: "#0d9488" };
const btnDone:        CSSProperties = { ...btnPrimary, background: "#16a34a" };
const btnSkip:        CSSProperties = { ...btnPrimary, background: "#f59e0b", color: "#111827" };
const btnGhost:       CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", cursor: "pointer", fontWeight: 600 };
const btnSubmitMarks: CSSProperties = { padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 14 };
const priorityPill:   CSSProperties = { borderRadius: 999, padding: "3px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" };
const metaTitle:      CSSProperties = { margin: "0 0 8px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", fontWeight: 700 };
const muted:          CSSProperties = { margin: 0, color: "#64748b" };
