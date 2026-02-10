"use client";

import { useEffect, useState } from "react";
import Header from "./Header";

type StudentContext = {
  name: string;
  class: string;
  board: string;
};

export default function ModeSelector() {
  const [student, setStudent] = useState<StudentContext | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("studymate_student");
      if (!raw) {
        window.location.href = "/";
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed?.name || !parsed?.class) {
        window.location.href = "/";
        return;
      }

      setStudent(parsed);
    } catch {
      window.location.href = "/";
    }
  }, []);

  if (!student) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #e0e7ff 100%)",
      }}
    >
      {/* Logout intentionally goes to access control */}
      <Header onLogout={() => (window.location.href = "/")} />

      <main
        style={{
          minHeight: "calc(100vh - 80px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 1400,
          margin: "0 auto",
          padding: "32px",
        }}
      >
        {/* 👋 Welcome */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 36, marginBottom: 6 }}>
            Welcome, {student.name}
          </h1>
          <p style={{ color: "#475569", fontSize: 18 }}>
            Class {student.class} · {student.board}
          </p>
        </div>

        <h2
          style={{
            textAlign: "center",
            fontSize: 32,
            marginBottom: 8,
          }}
        >
          Choose Your Learning Mode
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#475569",
            marginBottom: 40,
            fontSize: 18,
          }}
        >
          Select how you want to study today
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 36,
          }}
        >
          <ModeCard
            icon="👩‍🏫"
            title="Teacher Mode"
            desc="Learn concepts with clear CBSE-aligned explanations and examples."
            color="#2563eb"
            href="/teacher"
            cta="Start Learning →"
          />

          <ModeCard
            icon="🧪"
            title="Examiner Mode"
            desc="Practice full-length question papers in exam conditions."
            color="#16a34a"
            href="/examiner"
            cta="Start Test →"
          />

          <ModeCard
            icon="🗣️"
            title="Oral Mode"
            desc="Improve recall and confidence through spoken practice."
            color="#9333ea"
            href="/oral"
            cta="Start Speaking →"
          />

          <ModeCard
            icon="📊"
            title="Progress Dashboard"
            desc="Review performance, strengths, and areas to improve."
            color="#ea580c"
            href="/progress"
            cta="View Progress →"
          />
        </div>
      </main>
    </div>
  );
}

function ModeCard(props: {
  icon: string;
  title: string;
  desc: string;
  color: string;
  href: string;
  cta: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 22,
        padding: "32px 28px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 320,
      }}
    >
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{props.icon}</div>

        <h3 style={{ marginBottom: 14, fontSize: 24 }}>
          {props.title}
        </h3>

        <p
          style={{
            color: "#475569",
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          {props.desc}
        </p>
      </div>

      <a
        href={props.href}
        style={{
          marginTop: 28,
          padding: "14px",
          background: props.color,
          color: "#ffffff",
          borderRadius: 14,
          textDecoration: "none",
          textAlign: "center",
          fontWeight: 600,
          fontSize: 18,
        }}
      >
        {props.cta}
      </a>
    </div>
  );
}
