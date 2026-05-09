"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

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
      // do nothing
    }
  }, []);

  return (
    <div
      className={orbitron.className}
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(to bottom, #FFF3D9 0%, #FFE4B3 45%, #E6F2FF 100%)",
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
          padding: "60px 32px 80px 32px",
        }}
      >
        {/* MAIN HEADER */}
        <h1
          style={{
            fontSize: 36,
            letterSpacing: "0.22em",
            color: "#0a2540",
            marginBottom: 18,
          }}
        >
          ABOUT SHAURI
        </h1>

        {/* INTRO TEXT */}
        <p
          style={{
            fontSize: 15,
            letterSpacing: "0.04em",
            color: "#425466",
            marginBottom: 40,
            lineHeight: 1.8,
          }}
        >
          {student ? (
            <>
              SHAURI IS SUPPORTING <b>{student.name.toUpperCase()}</b> IN CLASS{" "}
              <b>{student.class}</b> FOLLOWING THE{" "}
              <b>{student.board}</b> CURRICULUM.
            </>
          ) : (
            <>
              SHAURI IS A CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM DESIGNED FOR
              STUDENTS AND PARENTS.
            </>
          )}
        </p>

        {/* SECTION */}
        <Section
          title="WHAT IS SHAURI"
          text="Shauri is a structured CBSE-aligned adaptive learning platform built around the NCERT curriculum. It helps students build clarity, confidence, and true understanding — not memorization."
        />

        <Section
          title="WHO IS IT FOR"
          text="Shauri is designed for CBSE students and parents who value clarity, exam readiness, and meaningful academic progress without pressure, comparison, or noise."
        />

        {/* HOW */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={sectionTitle}>
            HOW SHAURI HELPS
          </h2>

          <ul style={sectionText}>
            <li>
              TEACHER MODE — Concept clarity with CBSE-aligned explanations.
            </li>

            <li>
              EXAMINER MODE — Real exam-style papers and evaluation.
            </li>

            <li>
              ORAL MODE — Improves recall, articulation, and confidence.
            </li>

            <li>
              PROGRESS DASHBOARD — Honest insights into strengths and gaps.
            </li>
          </ul>
        </section>

        <Section
          title="DATA & PRIVACY"
          text="Student data remains private and stored locally on the device. Nothing is uploaded or shared unless explicitly exported by the parent or student."
        />

        {/* FOOTER */}
        <div
          style={{
            marginTop: 60,
            fontSize: 12,
            letterSpacing: "0.08em",
            color: "#6b7c8f",
          }}
        >
          © SHAURI  
          <br />
          CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
        </div>
      </main>
    </div>
  );
}

/* SECTION COMPONENT */

function Section(props: { title: string; text: string }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={sectionTitle}>
        {props.title}
      </h2>

      <p style={sectionText}>
        {props.text}
      </p>
    </section>
  );
}

/* STYLES */

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  letterSpacing: "0.18em",
  color: "#D4AF37",
  marginBottom: 12,
};

const sectionText: React.CSSProperties = {
  fontSize: 14,
  color: "#425466",
  lineHeight: 1.8,
  letterSpacing: "0.03em",
};
