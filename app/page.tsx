"use client";

import { useState } from "react";

export default function Page() {
  const [entered, setEntered] = useState(false);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "sans-serif" }}>
      {!entered ? <Landing onEnter={() => setEntered(true)} /> : <Access />}
    </div>
  );
}

/* ================= LANDING ================= */

function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div
      style={{
        height: "100vh",
        background: "#0b2a4a",
        position: "relative",
        overflow: "hidden",
        color: "white",
        textAlign: "center",
      }}
    >
      {/* SUN */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, #e6c27a, #caa24f, transparent)",
          filter: "blur(20px)",
        }}
      />

      {/* TITLE */}
      <h1
        style={{
          marginTop: 120,
          fontSize: "64px",
          letterSpacing: "18px",
          color: "#FFD700",
          textShadow: "0 0 20px rgba(255,215,0,0.8)",
        }}
      >
        SHAURI
      </h1>

      <p style={{ opacity: 0.8 }}>
        THE COURAGE TO MASTER THE FUTURE
      </p>
      <p style={{ color: "#FFD700" }}>
        CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
      </p>

      {/* MOUNTAIN */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          height: "40%",
          background: "black",
          clipPath: "polygon(0% 100%, 50% 40%, 100% 100%)",
          zIndex: 1,
        }}
      />

      {/* CTA */}
      <button
        onClick={onEnter}
        style={{
          position: "absolute",
          bottom: "26%",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 40px",
          borderRadius: "30px",
          border: "1px solid #FFD700",
          color: "#FFD700",
          background: "transparent",
          fontSize: "14px",
          letterSpacing: "4px",
          cursor: "pointer",
          zIndex: 3,
          boxShadow: "0 0 15px rgba(255,215,0,0.6)",
        }}
      >
        BEGIN THE ASCENT
      </button>
    </div>
  );
}

/* ================= ACCESS ================= */

function Access() {
  return (
    <div
      style={{
        height: "100vh",
        background: "#e8d3a8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1
        style={{
          fontSize: "40px",
          letterSpacing: "10px",
          marginBottom: "20px",
          color: "#0b2a4a",
        }}
      >
        SHAURI
      </h1>

      <p style={{ marginBottom: "30px", opacity: 0.7 }}>
        CBSE-Aligned. Adaptive. Built for your growth.
      </p>

      <div style={{ width: "280px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <input placeholder="Student Name" style={inputStyle} />
        <select style={inputStyle}>
          <option>Select Class</option>
        </select>
        <input placeholder="Access Code" style={inputStyle} />

        <button
          style={{
            marginTop: "10px",
            padding: "12px",
            borderRadius: "25px",
            border: "none",
            background: "#d4af37",
            color: "black",
            letterSpacing: "2px",
            cursor: "pointer",
          }}
        >
          INITIATE ASCENT
        </button>
      </div>

      <p style={{ marginTop: "40px", opacity: 0.6 }}>
        Discipline today builds the confidence of tomorrow.
      </p>
    </div>
  );
}

/* ================= STYLES ================= */

const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
};