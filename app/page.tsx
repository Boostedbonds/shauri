"use client";

import { useState } from "react";

export default function Page() {
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [code, setCode] = useState("");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(to bottom, #d9c7a2 0%, #e6d3ad 100%)",
        fontFamily: "sans-serif",
      }}
    >
      {/* TITLE */}
      <h1
        style={{
          fontSize: "48px",
          letterSpacing: "0.35em",
          color: "#0b1a2a",
          marginBottom: "20px",
        }}
      >
        SHAURI
      </h1>

      {/* SUBTITLE */}
      <p
        style={{
          marginBottom: "30px",
          color: "#3b3b3b",
        }}
      >
        CBSE-Aligned. Adaptive. Built for your growth.
      </p>

      {/* INPUTS */}
      <input
        placeholder="Student Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />

      {/* FIXED WIDTH MATCH */}
      <select
        value={studentClass}
        onChange={(e) => setStudentClass(e.target.value)}
        style={inputStyle} // SAME STYLE → SAME WIDTH
      >
        <option value="">Select Class</option>
        <option value="6">Class 6</option>
        <option value="7">Class 7</option>
        <option value="8">Class 8</option>
        <option value="9">Class 9</option>
        <option value="10">Class 10</option>
      </select>

      <input
        placeholder="Access Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={inputStyle}
      />

      {/* CTA FIXED */}
      <button
        style={{
          marginTop: "18px",
          padding: "14px 40px",
          borderRadius: "999px",
          border: "1.5px solid #d4af37",
          background:
            "linear-gradient(90deg, #f5d76e, #d4af37)",
          color: "#0b1a2a",
          letterSpacing: "0.18em",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow:
            "0 0 12px rgba(212, 175, 55, 0.6), inset 0 0 6px rgba(255,255,255,0.3)",
        }}
      >
        INITIATE ASCENT
      </button>

      {/* QUOTE */}
      <p
        style={{
          marginTop: "40px",
          fontSize: "14px",
          color: "#4a4a4a",
        }}
      >
        Discipline today builds the confidence of tomorrow.
      </p>
    </main>
  );
}

const inputStyle = {
  width: "260px",
  margin: "8px 0",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #d4af37",
  outline: "none",
};