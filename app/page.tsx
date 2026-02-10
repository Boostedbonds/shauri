"use client";

import { useState } from "react";

const ACCESS_CODE = "0330";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (code !== ACCESS_CODE) {
      setError("Invalid access code");
      return;
    }

    if (!name.trim()) {
      setError("Please enter student name");
      return;
    }

    if (!studentClass) {
      setError("Please select class");
      return;
    }

    const studentContext = {
      name: name.trim(),
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem(
      "studymate_student",
      JSON.stringify(studentContext)
    );

    window.location.href = "/modes";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 40%, #c7d2fe 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          padding: "52px 46px 32px",
          borderRadius: 20,
          width: 460,
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 6 }}>StudyMate</h1>

        <p style={{ marginBottom: 4, color: "#475569", fontWeight: 600 }}>
          Your Learning Platform
        </p>

        <p style={{ marginBottom: 28, color: "#64748b", fontSize: 14 }}>
          Supports CBSE & NCERT curriculum.
        </p>

        <div
          style={{
            background: "#eef2ff",
            padding: 16,
            borderRadius: 12,
            marginBottom: 22,
            fontWeight: 600,
          }}
        >
          Access Control
        </div>

        <input
          type="text"
          placeholder="Student Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: 16,
            fontSize: 16,
            marginBottom: 14,
            borderRadius: 12,
            border: "1px solid #cbd5f5",
            textAlign: "center",
          }}
        />

        <select
          value={studentClass}
          onChange={(e) => setStudentClass(e.target.value)}
          style={{
            width: "100%",
            padding: 16,
            fontSize: 16,
            marginBottom: 14,
            borderRadius: 12,
            border: "1px solid #cbd5f5",
            textAlign: "center",
            background: "#ffffff",
          }}
        >
          <option value="">Select Class</option>
          {[6, 7, 8, 9, 10, 11, 12].map((cls) => (
            <option key={cls} value={cls}>
              Class {cls}
            </option>
          ))}
        </select>

        <input
          type="password"
          placeholder="Access Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            width: "100%",
            padding: 16,
            fontSize: 16,
            marginBottom: 14,
            borderRadius: 12,
            border: "1px solid #cbd5f5",
            textAlign: "center",
          }}
        />

        {error && (
          <div style={{ color: "#dc2626", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 16,
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: 12,
            border: "none",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          Enter StudyMate
        </button>

        <div
          style={{
            marginTop: 26,
            background: "#fef9c3",
            padding: 14,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          This platform requires parent authorization for student access.
        </div>

        {/* Soft legal footer – anchored to card */}
        <div
          style={{
            marginTop: 22,
            fontSize: 12,
            color: "#475569",
            lineHeight: 1.4,
          }}
        >
          © StudyMate. All rights reserved.
          <br />
          For educational use only.
        </div>
      </form>
    </div>
  );
}
