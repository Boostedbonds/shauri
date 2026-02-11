"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";

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

function getBand(score: number) {
  if (score >= 86) return "Excellent";
  if (score >= 71) return "Good";
  if (score >= 51) return "Average";
  if (score >= 31) return "Weak";
  return "Needs Work";
}

function getTrend(scores: number[]) {
  if (scores.length < 2) return "—";
  const diff = scores[scores.length - 1] - scores[scores.length - 2];
  if (diff > 0) return "↑ Improving";
  if (diff < 0) return "↓ Declining";
  return "→ Stable";
}

function getOverallReadiness(bands: string[]) {
  if (bands.every((b) => b === "Good" || b === "Excellent"))
    return "On Track";
  if (bands.some((b) => b === "Needs Work" || b === "Weak"))
    return "Needs Attention";
  return "Developing";
}

const SUBJECT_COLORS = [
  "#2563eb",
  "#0d9488",
  "#7c3aed",
  "#ea580c",
  "#4f46e5",
  "#059669",
];

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("studymate_exam_attempts");
    if (stored) setAttempts(JSON.parse(stored));
  }, []);

  const subjects = useMemo(() => {
    const map: Record<string, number[]> = {};

    attempts.forEach((a) => {
      if (typeof a.scorePercent === "number") {
        map[a.subject] ??= [];
        map[a.subject].push(a.scorePercent);
      }
    });

    return Object.entries(map).map(([subject, scores], index) => {
      const latest = scores[scores.length - 1];
      return {
        subject,
        scores,
        latest,
        band: getBand(latest),
        trend: getTrend(scores),
        color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
      };
    });
  }, [attempts]);

  const snapshot = useMemo(() => {
    if (subjects.length === 0) return null;

    const priority = [...subjects].sort(
      (a, b) => a.latest - b.latest
    )[0];

    const overall = getOverallReadiness(
      subjects.map((s) => s.band)
    );

    return { overall, priority };
  }, [subjects]);

  function exportProgress() {
    const blob = new Blob([JSON.stringify(attempts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studymate-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function generatePDF() {
    const content = `
StudyMate Progress Report

${subjects
  .map(
    (s) =>
      `${s.subject}
Latest Score: ${s.latest}%
Performance Band: ${s.band}
Trend: ${s.trend}
`
  )
  .join("\n")}

Overall Readiness: ${snapshot?.overall ?? "N/A"}
Priority Focus: ${snapshot?.priority.subject ?? "N/A"}
`;

    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studymate-progress-report.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = JSON.parse(reader.result as string);
      if (Array.isArray(parsed)) {
        localStorage.setItem(
          "studymate_exam_attempts",
          JSON.stringify(parsed)
        );
        setAttempts(parsed);
        alert("Progress imported successfully.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #e0e7ff 100%)",
      }}
    >
      <Header onLogout={() => (window.location.href = "/")} />

      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "24px 32px",
          maxWidth: 1400,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <button
          onClick={() => (window.location.href = "/modes")}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: 12,
            border: "none",
          }}
        >
          ← Back
        </button>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={exportProgress}
            style={{
              padding: "10px 16px",
              background: "#0d9488",
              color: "#fff",
              borderRadius: 12,
              border: "none",
            }}
          >
            Export
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "10px 16px",
              background: "#7c3aed",
              color: "#fff",
              borderRadius: 12,
              border: "none",
            }}
          >
            Import
          </button>

          {/* ✅ Corrected PDF Button */}
          <button
            onClick={generatePDF}
            style={{
              padding: "10px 16px",
              background: "#ea580c",
              color: "#fff",
              borderRadius: 12,
              border: "none",
            }}
          >
            PDF
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) =>
          e.target.files && handleImportFile(e.target.files[0])
        }
      />

      <main
        style={{
          flex: 1,
          maxWidth: 1400,
          margin: "0 auto",
          padding: "24px 32px 64px",
          width: "100%",
        }}
      >
        <h1 style={{ fontSize: 36 }}>Progress Dashboard</h1>
      </main>
    </div>
  );
}
