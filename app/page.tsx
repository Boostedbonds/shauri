"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [warp, setWarp] = useState(false);

  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleEnter() {
    setWarp(true);
    setTimeout(() => setEntered(true), 900);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Please enter student name");
    if (!studentClass) return setError("Please select class");
    if (code !== ACCESS_CODE) return setError("Invalid access code");

    const studentContext = {
      name: name.trim(),
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem("shauri_student", JSON.stringify(studentContext));

    document.cookie = `shauri_name=${encodeURIComponent(studentContext.name)}; path=/; SameSite=Lax`;
    document.cookie = `shauri_class=${encodeURIComponent(studentContext.class)}; path=/; SameSite=Lax`;

    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>

      {/* ================= LANDING ================= */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "linear-gradient(to top, #000814, #001d3d, #0a2540)",
              overflow: "hidden",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* SUN */}
            <div
              style={{
                position: "absolute",
                top: "20%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "520px",
                height: "520px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.95) 0%, rgba(255,160,40,0.5) 50%, transparent 80%)",
                filter: "blur(12px)",
              }}
            />

            {/* TITLE */}
            <div style={{ position: "absolute", top: "20%", width: "100%", textAlign: "center", zIndex: 5 }}>
              <h1
                style={{
                  fontSize: "84px",
                  letterSpacing: "0.5em",
                  fontWeight: 700,
                  background: "linear-gradient(to bottom, #FFD700, #D4AF37, #A67C00)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow:
                    "0 0 25px rgba(255,215,120,0.6), 0 2px 6px rgba(0,0,0,0.8)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ marginTop: 10, color: "#ffffff", letterSpacing: "0.1em" }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p style={{ color: "#FFD700", marginTop: 6 }}>
                CBSE-ALIGNED ADAPTIVE LEARNING PLATFORM
              </p>
            </div>

            {/* MOUNTAIN */}
            <svg viewBox="0 0 1440 800" style={{ position: "absolute", bottom: 0 }}>
              <path
                d="M0,730 C400,650 700,600 720,500 C740,600 1000,650 1440,720 L1440,800 L0,800 Z"
                fill="black"
              />
            </svg>

            {/* CTA */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "24%",
                left: "50%",
                transform: "translateX(-50%)",
                cursor: "pointer",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div
                style={{
                  position: "relative",
                  padding: "14px 40px",
                  borderRadius: "999px",
                  color: "#FFD700",
                  letterSpacing: "0.3em",
                  border: "1px solid rgba(255,215,0,0.6)",
                  overflow: "hidden",
                }}
              >
                {/* GOLD RUNNING LIGHT */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(120deg, transparent, rgba(255,215,0,0.7), transparent)",
                    transform: "translateX(-100%)",
                    animation: "shine 2.5s infinite",
                  }}
                />

                <span style={{ position: "relative", zIndex: 2 }}>
                  BEGIN THE ASCEND
                </span>
              </div>
            </motion.div>

            {/* ANIMATION KEYFRAMES */}
            <style>
              {`
                @keyframes shine {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}
            </style>

            {warp && (
              <motion.div
                style={{ position: "absolute", inset: 0, background: "white" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= ACCESS PAGE ================= */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            background:
              "linear-gradient(to bottom, #f5e6c8, #e8d3a3)",
          }}
        >
          {/* TITLE */}
          <h1
            style={{
              fontSize: "48px",
              letterSpacing: "0.2em",
              marginBottom: 10,
              color: "#0f172a",
              textShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            SHAURI
          </h1>

          {/* SUBTITLE */}
          <p
            style={{
              marginBottom: 30,
              color: "#444",
              fontSize: "14px",
              letterSpacing: "0.08em",
            }}
          >
            Step into your personalized learning journey
          </p>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: 16,
              width: "280px",
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Student Name"
              style={inputStyle}
            />

            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select Class</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <option key={c}>Class {c}</option>
              ))}
            </select>

            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access Code"
              style={inputStyle}
            />

            <button style={buttonStyle}>STEP IN</button>

            {error && (
              <p style={{ color: "red", fontSize: 12 }}>{error}</p>
            )}
          </form>

          {/* QUOTE */}
          <p
            style={{
              marginTop: 40,
              fontSize: "13px",
              color: "#444",
              opacity: 0.8,
            }}
          >
            Discipline today builds the confidence of tomorrow.
          </p>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const inputStyle = {
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid rgba(212,175,55,0.6)",
  background: "#ffffff",
  outline: "none",
};

const buttonStyle = {
  padding: "12px",
  borderRadius: "999px",
  border: "1px solid #D4AF37",
  background: "linear-gradient(to right, #f5e6c8, #e8d3a3)",
  cursor: "pointer",
  letterSpacing: "0.1em",
};