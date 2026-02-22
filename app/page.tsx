"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ACCESS_CODE = "0330";

function getDynamicLine() {
  const hour = new Date().getHours();
  if (hour < 5) return "The system is quiet… but listening.";
  if (hour < 12) return "A fresh mind learns faster.";
  if (hour < 17) return "Focus sharpens understanding.";
  if (hour < 22) return "Consistency builds mastery.";
  return "Even now, progress is possible.";
}

export default function HomePage() {
  const [entered, setEntered] = useState(false);
  const [warp, setWarp] = useState(false);

  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleEnter() {
    setWarp(true);
    setTimeout(() => setEntered(true), 800);
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

            {/* SUN (reduced blur for sharp glow) */}
            <div
              style={{
                position: "absolute",
                top: "28%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "420px",
                height: "420px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,0.95) 0%, rgba(255,180,60,0.5) 45%, transparent 75%)",
                filter: "blur(4px)", // 🔥 FIXED (was 10px)
              }}
            />

            {/* TITLE */}
            <div style={{ position: "absolute", top: "26%", width: "100%", textAlign: "center", zIndex: 5 }}>
              <h1
                style={{
                  fontSize: "72px",
                  letterSpacing: "0.5em",
                  fontWeight: 700,
                  color: "#FFD700",
                  textShadow:
                    "0 0 6px rgba(255,215,120,0.9), 0 0 20px rgba(255,200,80,0.6), 0 0 40px rgba(255,180,60,0.4)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ marginTop: 10, color: "#ffffffcc" }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p style={{ color: "#FFD700", fontSize: "14px" }}>
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

            {/* CTA (FIXED POSITION ABOVE PEAK) */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "38%", // 🔥 moved above peak
                left: "50%",
                transform: "translateX(-50%)",
                letterSpacing: "0.4em",
                color: "#FFD700",
                cursor: "pointer",
                textAlign: "center",
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              BEGIN THE ASCENT
              <div style={{ fontSize: "12px", marginTop: 8, opacity: 0.8 }}>
                {getDynamicLine()}
              </div>
            </motion.div>

            {/* SUNRISE TRANSITION (NOT WHITE FLASH) */}
            {warp && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom, #f5e6c8, #e6d3a3, #d9c48c)",
                }}
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
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(to bottom, #f5e6c8, #e6d3a3)",
          }}
        >
          <h1 style={{ marginBottom: 24, letterSpacing: "0.3em" }}>
            SHAURI
          </h1>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18, width: "320px" }}>

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
              {[6,7,8,9,10,11,12].map(c => (
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

            {error && (
              <div style={{ color: "red", fontSize: 13 }}>{error}</div>
            )}

            <button style={buttonStyle}>STEP IN</button>
          </form>

          {/* MOTIVATIONAL QUOTE */}
          <p
            style={{
              position: "absolute",
              bottom: 40,
              fontSize: 14,
              opacity: 0.7,
            }}
          >
            Discipline today builds the confidence of tomorrow.
          </p>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #d4af37",
  background: "#ffffffcc",
  fontSize: "14px",
};

const buttonStyle = {
  padding: "14px",
  borderRadius: "999px",
  border: "1px solid #d4af37",
  background: "#e6d3a3",
  fontWeight: 600,
  cursor: "pointer",
};