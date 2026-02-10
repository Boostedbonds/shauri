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

type ViewMode = "COUNT" | "TIME";

const SUBJECT_COLORS: Record<string, string> = {
  Maths: "#2563eb",
  Science: "#0d9488",
  English: "#7c3aed",
  "Social Science": "#ea580c",
  Hindi: "#4f46e5",
  Unknown: "#64748b",
};

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("COUNT");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("studymate_exam_attempts");
    if (stored) {
      setAttempts(JSON.parse(stored));
    }
  }, []);

  const subjectStats = useMemo(() => {
    const map: Record<string, { count: number; totalTime: number }> = {};

    attempts.forEach((a) => {
      if (!map[a.subject]) {
        map[a.subject] = { count: 0, totalTime: 0 };
      }
      map[a.subject].count += 1;
      map[a.subject].totalTime += a.timeTakenSeconds;
    });

    return Object.entries(map).map(([subject, data]) => ({
      subject,
      count: data.count,
      avgTime:
        data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
    }));
  }, [attempts]);

  function getStatus(count: number, avgTime: number) {
    if (count >= 5 && avgTime < 1800) return "Excellent";
    if (count >= 3) return "Good";
    if (count >= 1) return "Okay";
    return "Needs Improvement";
  }

  const maxValue = Math.max(
    ...subjectStats.map((s) =>
      viewMode === "COUNT" ? s.count : s.avgTime
    ),
    1
  );

  /* ---------- EXPORT / IMPORT ---------- */

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
      {/* Logout stays logout */}
      <Header onLogout={() => (window.location.href = "/")} />

      <main
        style={{
          flex: 1,
          padding: "48px 32px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {/* 🔙 Back → Mode Selector */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => (window.location.href = "/modes")}
            style={{
              padding: "10px 16px",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 12,
              border: "none",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
        </div>

        <h1 style={{ fontSize: 36, marginBottom: 8 }}>
          Progress Dashboard
        </h1>
        <p style={{ color: "#475569", fontSize: 18, marginBottom: 24 }}>
          A calm, printable view of learning progress.
        </p>

        {/* 🔘 Actions */}
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <button
            onClick={exportProgress}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              background: "#0d9488",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Export
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Import
          </button>

          <button
            onClick={downloadPDF}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              background: "#334155",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Download PDF
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) =>
              e.target.files && handleImportFile(e.target.files[0])
            }
          />
        </div>

        {/* 🔘 Toggle */}
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <button
            onClick={() => setViewMode("COUNT")}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background:
                viewMode === "COUNT" ? "#2563eb" : "#e5e7eb",
              color: viewMode === "COUNT" ? "#fff" : "#0f172a",
              cursor: "pointer",
            }}
          >
            Tests Attempted
          </button>
          <button
            onClick={() => setViewMode("TIME")}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background:
                viewMode === "TIME" ? "#2563eb" : "#e5e7eb",
              color: viewMode === "TIME" ? "#fff" : "#0f172a",
              cursor: "pointer",
            }}
          >
            Average Time
          </button>
        </div>

        {/* 📊 Graph */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            marginBottom: 32,
          }}
        >
          {subjectStats.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b" }}>
              No exams recorded yet.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
              {subjectStats.map((s) => {
                const value =
                  viewMode === "COUNT" ? s.count : s.avgTime;
                const height = (value / maxValue) * 180;

                return (
                  <div
                    key={s.subject}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        height,
                        width: 48,
                        background:
                          SUBJECT_COLORS[s.subject] ??
                          SUBJECT_COLORS.Unknown,
                        borderRadius: 12,
                      }}
                    />
                    <div style={{ fontSize: 14 }}>{s.subject}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 📌 Status */}
        {subjectStats.length > 0 && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: "28px 32px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ fontSize: 22, marginBottom: 16 }}>
              Subject Overview
            </h2>

            {subjectStats.map((s) => (
              <div
                key={s.subject}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <span>{s.subject}</span>
                <span
                  style={{
                    fontWeight: 600,
                    color:
                      SUBJECT_COLORS[s.subject] ??
                      SUBJECT_COLORS.Unknown,
                  }}
                >
                  {getStatus(s.count, s.avgTime)}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
