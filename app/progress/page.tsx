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
};

/* Calm academic palette */
const SUBJECT_COLORS = [
  "#2563eb", // blue
  "#0d9488", // teal
  "#7c3aed", // violet
  "#ea580c", // orange
  "#4f46e5", // indigo
  "#059669", // emerald
];

function getProgressPercent(count: number) {
  if (count >= 6) return 90;
  if (count >= 4) return 70;
  if (count >= 2) return 45;
  if (count >= 1) return 20;
  return 0;
}

function getStatus(percent: number) {
  if (percent >= 80) return "Excellent progress";
  if (percent >= 60) return "Good progress";
  if (percent >= 40) return "Steady start";
  if (percent > 0) return "Getting started";
  return "Not started";
}

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("studymate_exam_attempts");
    if (stored) {
      setAttempts(JSON.parse(stored));
    }
  }, []);

  /* Subjects emerge dynamically from exams */
  const subjectStats = useMemo(() => {
    const map: Record<string, number> = {};

    attempts.forEach((a) => {
      map[a.subject] = (map[a.subject] ?? 0) + 1;
    });

    return Object.entries(map).map(([subject, count], index) => {
      const percent = getProgressPercent(count);
      return {
        subject,
        percent,
        status: getStatus(percent),
        color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
      };
    });
  }, [attempts]);

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

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            "studymate_exam_attempts",
            JSON.stringify(parsed)
          );
          setAttempts(parsed);
          alert("Progress imported successfully.");
        } else {
          alert("Invalid progress file.");
        }
      } catch {
        alert("Failed to import file.");
      }
    };
    reader.readAsText(file);
  }

  function downloadPDF() {
    window.print();
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
          alignItems: "center",
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
            cursor: "pointer",
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

          <button
            onClick={downloadPDF}
            style={{
              padding: "10px 16px",
              background: "#334155",
              color: "#fff",
              borderRadius: 12,
              border: "none",
            }}
          >
            Download PDF
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

      {/* Main */}
      <main
        style={{
          flex: 1,
          maxWidth: 1400,
          margin: "0 auto",
          padding: "24px 32px 64px",
          width: "100%",
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>
          Progress Dashboard
        </h1>
        <p style={{ color: "#475569", fontSize: 18, marginBottom: 32 }}>
          Subject-wise growth based on exams attempted so far.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 48,
          }}
        >
          {/* Graph */}
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: "40px 32px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            }}
          >
            {subjectStats.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#64748b",
                  padding: 60,
                }}
              >
                Progress bars will appear automatically as exams are taken.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: 36,
                  alignItems: "flex-end",
                  height: 260,
                }}
              >
                {subjectStats.map((s) => (
                  <div
                    key={s.subject}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        height: 200,
                        width: 52,
                        background: "#e5e7eb",
                        borderRadius: 14,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          height: `${s.percent}%`,
                          width: "100%",
                          background: s.color,
                          transition: "height 0.8s ease",
                        }}
                      />
                    </div>

                    <div style={{ fontWeight: 600 }}>
                      {s.subject}
                    </div>
                    <div style={{ fontSize: 13, color: s.color }}>
                      {s.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback */}
          <div>
            <h2 style={{ fontSize: 22, marginBottom: 12 }}>
              Progress Summary
            </h2>
            <p style={{ color: "#475569", lineHeight: 1.7 }}>
              This view reflects learning growth based on exams attempted.
              Subjects appear automatically as tests are taken, helping
              students and parents clearly understand progress over time.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
