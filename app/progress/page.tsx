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

type StudentContext = {
  name: string;
  class: string;
  board: string;
};

/* ---------- SUBJECTS PER CLASS (Phase-1 Static Scaffold) ---------- */
const CLASS_SUBJECTS: Record<string, string[]> = {
  "6": ["Maths", "Science", "English"],
  "7": ["Maths", "Science", "English"],
  "8": ["Maths", "Science", "English"],
  "9": ["Maths", "Science", "English", "Social Science"],
  "10": ["Maths", "Science", "English", "Social Science"],
  "11": ["Maths", "Physics", "Chemistry"],
  "12": ["Maths", "Physics", "Chemistry"],
};

const SUBJECT_COLORS: Record<string, string> = {
  Maths: "#2563eb",
  Science: "#0d9488",
  English: "#7c3aed",
  "Social Science": "#ea580c",
  Physics: "#0284c7",
  Chemistry: "#9333ea",
  Unknown: "#64748b",
};

/* ---------- STATUS ---------- */
function getStatus(percent: number) {
  if (percent >= 80) return "Excellent";
  if (percent >= 60) return "Good";
  if (percent >= 40) return "Okay";
  if (percent > 0) return "Needs Work";
  return "Not started";
}

export default function ProgressPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [student, setStudent] = useState<StudentContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const rawStudent = localStorage.getItem("studymate_student");
    if (rawStudent) setStudent(JSON.parse(rawStudent));

    const stored = localStorage.getItem("studymate_exam_attempts");
    if (stored) setAttempts(JSON.parse(stored));
  }, []);

  /* ---------- BUILD SUBJECT PROGRESS ---------- */
  const subjectStats = useMemo(() => {
    if (!student) return [];

    const subjects =
      CLASS_SUBJECTS[student.class] ?? [];

    const chapterMap: Record<string, Set<string>> = {};
    subjects.forEach((s) => (chapterMap[s] = new Set()));

    attempts.forEach((a) => {
      if (chapterMap[a.subject]) {
        a.chapters.forEach((c) => chapterMap[a.subject].add(c));
      }
    });

    return subjects.map((subject) => {
      const covered = chapterMap[subject]?.size ?? 0;
      const percent = Math.min(100, covered * 10); // phase-1 linear growth
      return {
        subject,
        percent,
        status: getStatus(percent),
      };
    });
  }, [attempts, student]);

  /* ---------- FEEDBACK TEXT ---------- */
  const feedbackText = useMemo(() => {
    if (subjectStats.every((s) => s.percent === 0)) {
      return "No exams have been taken yet. Once the student begins attempting tests, subject-wise progress will start appearing here.";
    }

    const strong = subjectStats.filter((s) => s.percent >= 60).map((s) => s.subject);
    const weak = subjectStats.filter((s) => s.percent < 40).map((s) => s.subject);

    return `The student has begun building syllabus coverage${
      strong.length ? ` in ${strong.join(", ")}` : ""
    }. ${
      weak.length
        ? `${weak.join(", ")} ${
            weak.length > 1 ? "are" : "is"
          } still at an early stage and will benefit from regular testing.`
        : "Overall progress is moving in a balanced direction."
    }`;
  }, [subjectStats]);

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
          localStorage.setItem("studymate_exam_attempts", JSON.stringify(parsed));
          setAttempts(parsed);
          alert("Progress imported successfully.");
        } else alert("Invalid file.");
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
        background:
          "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #e0e7ff 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header onLogout={() => (window.location.href = "/")} />

      {/* 🔧 Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "16px 32px",
        }}
      >
        <button
          onClick={() => (window.location.href = "/modes")}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#ffffff",
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
            style={{ background: "#0d9488", color: "#fff", borderRadius: 12, padding: "10px 18px", border: "none" }}
          >
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ background: "#7c3aed", color: "#fff", borderRadius: 12, padding: "10px 18px", border: "none" }}
          >
            Import
          </button>
          <button
            onClick={downloadPDF}
            style={{ background: "#334155", color: "#fff", borderRadius: 12, padding: "10px 18px", border: "none" }}
          >
            Download PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files && handleImportFile(e.target.files[0])}
          />
        </div>
      </div>

      {/* 📊 CONTENT */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Progress Dashboard</h1>
        <p style={{ color: "#475569", fontSize: 18, marginBottom: 32 }}>
          Subject-wise syllabus progress (Examiner Mode only)
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr",
            gap: 40,
            alignItems: "center",
          }}
        >
          {/* GRAPH */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: "40px 32px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", gap: 32, alignItems: "flex-end", height: 260 }}>
              {subjectStats.map((s) => (
                <div key={s.subject} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      height: 200,
                      background: "#e5e7eb",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "flex-end",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: `${Math.max(s.percent, 3)}%`,
                        width: "100%",
                        background: SUBJECT_COLORS[s.subject] ?? SUBJECT_COLORS.Unknown,
                        transition: "height 0.8s ease",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 10, fontWeight: 600 }}>{s.subject}</div>
                  <div style={{ fontSize: 13, color: "#475569" }}>{s.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* FEEDBACK */}
          <div>
            <h2 style={{ fontSize: 22, marginBottom: 12 }}>Progress Summary</h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#334155" }}>
              {feedbackText}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
