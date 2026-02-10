"use client";

import { useState } from "react";

const ACCESS_CODE = "0330";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
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

    const studentContext = {
      name: name.trim(),
      class: "9",
      board: "CBSE",
    };

    localStorage.setItem(
      "studymate_student",
      JSON.stringify(studentContext)
    );

    // 🔁 Redirect to Mode Selector
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
          padding: "52px 46px",
          borderRadius: 20,
          width: 460,
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 6 }}>StudyMate</h1>
        <p style={{ marginBottom: 28, color: "#475569" }}>
          CBSE Class 9 Learning Platform
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
          This platform requires parent authorization for access.
        </div>
      </form>
    </div>
  );
}
