"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";

type StudentContext = {
  name: string;
  class: string;
  board: string;
};

export default function AboutShauri() {
  const [student, setStudent] = useState<StudentContext | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shauri_student");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.name && parsed?.class) {
          setStudent(parsed);
        }
      }
    } catch {
      // silently ignore
    }
  }, []);

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

      <main
        style={{
          flex: 1,
          maxWidth: 900,
          margin: "0 auto",
          padding: "48px 32px",
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 12 }}>
          About Shauri
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#475569",
            marginBottom: 32,
            lineHeight: 1.7,
          }}
        >
          {student ? (
            <>
              Shauri is supporting <b>{student.name}</b> in Class{" "}
              <b>{student.class}</b> following the{" "}
              <b>{student.board}</b> curriculum.
            </>
          ) : (
            <>
              Shauri is a CBSE-aligned learning platform designed for
              students and parents.
            </>
          )}
        </p>

        {/* What */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>
            What is Shauri?
          </h2>
          <p style={{ color: "#475569", lineHeight: 1.7 }}>
            Shauri is a structured learning platform built around the
            CBSE and NCERT syllabus. It helps students understand concepts
            clearly, practice real exam-style questions, and track progress
            in a meaningful way.
          </p>
        </section>

        {/* Who */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>
            Who is it for?
          </h2>
          <p style={{ color: "#475569", lineHeight: 1.7 }}>
            Shauri is designed for CBSE students and parents who want
            clarity, exam readiness, and honest progress insights — without
            pressure, comparison, or unnecessary complexity.
          </p>
        </section>

        {/* How */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>
            How does Shauri help?
          </h2>
          <ul
            style={{
              color: "#475569",
              lineHeight: 1.8,
              paddingLeft: 18,
            }}
          >
            <li>
              <b>Teacher Mode:</b> Clear, CBSE-aligned explanations and
              examples.
            </li>
            <li>
              <b>Examiner Mode:</b> Full-length question papers under exam
              conditions.
            </li>
            <li>
              <b>Oral Mode:</b> Spoken practice to improve recall and
              confidence.
            </li>
            <li>
              <b>Progress Dashboard:</b> Subject-wise strengths, weaknesses,
              and guidance on where to focus next.
            </li>
          </ul>
        </section>

        {/* Privacy */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>
            Data & Privacy
          </h2>
          <p style={{ color: "#475569", lineHeight: 1.7 }}>
            Student learning data is stored locally on the device being
            used. It is not uploaded to servers unless a parent explicitly
            chooses to export or download progress reports.
          </p>
        </section>

        {/* Footer note */}
        <div
          style={{
            marginTop: 48,
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          © Shauri. All rights reserved.
          <br />
          For educational use only.
        </div>
      </main>
    </div>
  );
}
