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
  saveResult,
} from "@/lib/plannerResults";

type ModeView = "independent" | "guided";

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

export default function PlannerPage() {
  const [plannerState,   setPlannerState]   = useState<PlannerState | null>(null);
  const [modeView,       setModeView]       = useState<ModeView>("guided");
  const [openedDay,      setOpenedDay]      = useState<number | null>(null);
  const [resultsVersion, setResultsVersion] = useState(0);
  const [feedback,       setFeedback]       = useState("");

  // ManualMarksModal state
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
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 1800);
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

  function goToLearn(subject: string, topic: string) {
    if (!plannerState || !openedDay) return;
    const q = new URLSearchParams({
      subject, topic,
      day:   String(openedDay),
      cycle: String(plannerState.cycle),
      from:  "planner",
    });
    window.location.href = `/learn?${q.toString()}`;
  }

  function goToExam(subject: string, topic: string) {
    if (!plannerState || !openedDay) return;
    const q = new URLSearchParams({
      subject, topic,
      day:   String(openedDay),
      cycle: String(plannerState.cycle),
      from:  "planner",
    });
    window.location.href = `/examiner?${q.toString()}`;
  }

  function openMarksModal(day: number) {
    setModalDay(day);
    setShowMarksModal(true);
  }

  // Called by ManualMarksModal after AI verification + save
  function handleMarksSaved(result: {
    marks: number; total: number; pct: number; errorTopics: string[];
  }) {
    const day = modalDay ?? openedDay;
    const plan = THIRTY_DAY_PLAN.find((d) => d.day === day) || planner.currentPlan;

    saveResult({
      day,
      cycle:   plannerState!.cycle,
      subject: plan.topics[0]?.subject || currentSubject,
      topic:   plan.topics[0]?.topic   || currentTopic,
      score:   result.marks,
      total:   result.total,
      source:  "manual_verified",
    });

    setResultsVersion((v) => v + 1);
    setShowMarksModal(false);
    setModalDay(null);
    setFeedback(`✅ Result saved — ${result.pct}%${result.errorTopics.length ? ` · ${result.errorTopics.length} errors logged` : ""}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <Header onLogout={() => (window.location.href = "/")} />

      <main style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: "24px 20px 54px" }}>

        {/* ── Top nav ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            onClick={() => (window.location.href = "/modes")}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}
          >
            ← Modes
          </button>
          <div style={{ display: "flex", gap: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, padding: 4 }}>
            <button
              onClick={() => setModeView("independent")}
              style={{ padding: "6px 12px", border: "none", borderRadius: 999, cursor: "pointer", background: modeView === "independent" ? "#0f172a" : "transparent", color: modeView === "independent" ? "#fff" : "#334155", fontWeight: 600 }}
            >
              🧠 Independent
            </button>
            <button
              onClick={() => setModeView("guided")}
              style={{ padding: "6px 12px", border: "none", borderRadius: 999, cursor: "pointer", background: modeView === "guided" ? "#0f172a" : "transparent", color: modeView === "guided" ? "#fff" : "#334155", fontWeight: 600 }}
            >
              🎯 Guided
            </button>
          </div>
        </div>

        <h1 style={{ margin: 0, fontSize: 30, color: "#0f172a" }}>Study Planner</h1>
        <p style={{ marginTop: 6, color: "#64748b" }}>Parallel guidance system for consistent daily progress.</p>
        {feedback && (
          <p style={{ marginTop: 6, color: "#166534", fontSize: 13, fontWeight: 600 }}>{feedback}</p>
        )}

        {/* ── Day grid ── */}
        <section style={{ marginTop: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: 8 }}>
            {THIRTY_DAY_PLAN.map((d) => {
              const isCurrent   = plannerState.current_day === d.day;
              const isCompleted = plannerState.completed_days.includes(d.day);
              const isSkipped   = plannerState.skipped_days.includes(d.day);
              const bg          = isCurrent ? "#dbeafe" : isCompleted ? "#dcfce7" : isSkipped ? "#fef9c3" : "#ffffff";
              const border      = openedDay === d.day ? "2px solid #2563eb" : "1px solid #e2e8f0";
              return (
                <button
                  key={d.day}
                  onClick={() => setOpenedDay(d.day)}
                  style={{ height: 34, borderRadius: 8, border, background: bg, color: "#1f2937", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
                >
                  {d.day}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Today's plan ── */}
        <section style={{ marginTop: 22, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 19, color: "#0f172a" }}>Today</h2>
          <div style={{ fontWeight: 700, color: "#1d4ed8", marginBottom: 10 }}>
            Day {openedDay} (Cycle {plannerState.cycle})
          </div>
          <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: 13 }}>
            {planner.currentPlan.meta.dow} • {mapDayType(planner.currentPlan.meta.type, planner.currentPlan.meta.isRev, planner.currentPlan.meta.isMock)}
          </p>

          <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", lineHeight: 1.7 }}>
            {planner.currentPlan.topics.map((t, idx) => (
              <li key={`${t.subject}-${idx}`}>
                <span style={{ color: planner.progress.weakSubjects.includes(t.subject) ? "#b91c1c" : "#334155", fontWeight: planner.progress.weakSubjects.includes(t.subject) ? 700 : 500 }}>
                  {t.subject}
                </span>
                : {t.topic}
              </li>
            ))}
          </ul>

          {/* Subject action buttons */}
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {planner.currentPlan.topics.map((t, idx) => (
              <div
                key={`actions-${idx}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px" }}
              >
                <span style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>{t.subject}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => goToLearn(t.subject, t.topic)} style={btnPrimary}>Start Study</button>
                  <button onClick={() => goToExam(t.subject, t.topic)}  style={btnSecondary}>Take Daily Test</button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Submit Marks — now opens ManualMarksModal ── */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {hasSubmittedMarks ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>✅ Result submitted</span>
                <button
                  onClick={() => openMarksModal(openedDay)}
                  style={{ fontSize: 11, color: "#64748b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  Update
                </button>
              </div>
            ) : (
              <button
                onClick={() => openMarksModal(openedDay)}
                style={btnSubmitMarks}
              >
                📝 Submit Marks
              </button>
            )}
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              AI will verify your score against uploaded question paper & answer sheet
            </span>
          </div>

          {/* ── Day actions ── */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button
              onClick={() => {
                const next = markComplete(plannerState, openedDay);
                setPlannerState(next);
                setFeedback("Day marked complete");
              }}
              disabled={!hasSubmittedMarks}
              title={!hasSubmittedMarks ? "Submit marks first or go to Exam Mode." : ""}
              style={{ ...btnDone, opacity: hasSubmittedMarks ? 1 : 0.5, cursor: hasSubmittedMarks ? "pointer" : "not-allowed" }}
            >
              Mark Complete
            </button>
            <button
              onClick={() => {
                const next = markSkipped(plannerState, openedDay);
                setPlannerState(next);
                setFeedback("Day skipped");
              }}
              style={btnSkip}
            >
              Skip Today
            </button>
            <button
              onClick={() => {
                setPlannerState(undoLastAction(plannerState));
                setFeedback("Last action undone");
              }}
              disabled={!plannerState.last_action}
              style={{ ...btnGhost, opacity: plannerState.last_action ? 1 : 0.5, cursor: plannerState.last_action ? "pointer" : "not-allowed" }}
            >
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
                      <button
                        onClick={() => {
                          setPlannerState(reopenPendingDay(plannerState, day.day));
                          setFeedback(`Day ${day.day} reopened`);
                        }}
                        style={btnGhost}
                      >
                        Reopen
                      </button>
                      {!hasResultForDayCycle(day.day, plannerState.cycle) ? (
                        <button
                          onClick={() => openMarksModal(day.day)}
                          style={{ ...btnGhost, borderColor: "#f59e0b", color: "#92400e" }}
                        >
                          Submit Marks
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setPlannerState(markComplete(plannerState, day.day));
                            setFeedback(`Day ${day.day} completed`);
                          }}
                          style={{ ...btnGhost, borderColor: "#16a34a", color: "#166534" }}
                        >
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
                Object.entries(planner.progress.subjectAverages).map(([subject, score]) => (
                  <p key={subject} style={{ margin: "6px 0", color: planner.progress.subjectBands[subject] === "weak" ? "#b91c1c" : "#334155" }}>
                    {subject}: <strong>{score}%</strong> ({planner.progress.subjectBands[subject]})
                  </p>
                ))
              )}
            </div>
            <div>
              <p style={metaTitle}>Weak / Strong Areas</p>
              <p style={{ margin: "6px 0", color: "#334155" }}>Weak subjects (&lt;50%): {planner.progress.weakSubjects.join(", ") || "None"}</p>
              <p style={{ margin: "6px 0", color: "#334155" }}>Moderate (50–75%): {planner.progress.moderateSubjects.join(", ") || "None"}</p>
              <p style={{ margin: "6px 0", color: "#334155" }}>Strong subjects (&gt;75%): {planner.progress.strongSubjects.join(", ") || "None"}</p>
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
                <div
                  key={`${q.subject}-${q.topic}-${i}`}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.subject}</div>
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

// ─── Styles ───────────────────────────────────────────────────
const btnPrimary: CSSProperties = {
  padding: "10px 14px", borderRadius: 10, border: "none",
  cursor: "pointer", background: "#2563eb", color: "#fff", fontWeight: 600,
};
const btnSecondary: CSSProperties = { ...btnPrimary, background: "#0d9488" };
const btnDone:      CSSProperties = { ...btnPrimary, background: "#16a34a" };
const btnSkip:      CSSProperties = { ...btnPrimary, background: "#f59e0b", color: "#111827" };
const btnGhost: CSSProperties = {
  padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1",
  background: "#fff", color: "#334155", cursor: "pointer", fontWeight: 600,
};
const btnSubmitMarks: CSSProperties = {
  padding: "10px 18px", borderRadius: 10, border: "none",
  cursor: "pointer", background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 14,
};
const priorityPill: CSSProperties = {
  borderRadius: 999, padding: "3px 8px", fontSize: 10,
  fontWeight: 700, letterSpacing: "0.04em",
};
const metaTitle: CSSProperties = {
  margin: "0 0 8px", fontSize: 12, textTransform: "uppercase",
  letterSpacing: "0.08em", color: "#64748b", fontWeight: 700,
};
const muted: CSSProperties = { margin: 0, color: "#64748b" };