"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

    if (!name.trim()) {
      setError("Please enter student name");
      return;
    }

    if (!studentClass) {
      setError("Please select class");
      return;
    }

    if (code !== ACCESS_CODE) {
      setError("Invalid access code");
      return;
    }

    const studentContext = {
      name: name.trim(),
      class: studentClass,
      board: "CBSE",
    };

    localStorage.setItem("shauri_student", JSON.stringify(studentContext));

    document.cookie = `shauri_name=${encodeURIComponent(
      studentContext.name
    )}; path=/; SameSite=Lax`;

    document.cookie = `shauri_class=${encodeURIComponent(
      studentContext.class
    )}; path=/; SameSite=Lax`;

    window.location.href = "/modes";
  }

  return (
    <div className={spaceGrotesk.className}>
      {/* ================= INTRO SCREEN ================= */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background:
                "linear-gradient(to top, #000814 0%, #001d3d 60%, #0a2540 100%)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {/* Dawn glow */}
            <motion.div
              style={{
                position: "absolute",
                bottom: "42%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "900px",
                height: "500px",
                background:
                  "radial-gradient(circle at center, rgba(255,210,120,0.35), transparent 70%)",
                filter: "blur(120px)",
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 6, repeat: Infinity }}
            />

            {/* Mountain silhouette */}
            <svg
              viewBox="0 0 1440 800"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                height: "75%",
              }}
            >
              <path
                d="M0,640 C200,600 350,580 550,560 C750,540 950,570 1440,620 L1440,800 L0,800 Z"
                fill="#061a2d"
              />
              <path
                d="M0,700 C200,650 400,620 600,600 C700,580 760,550 820,600 C1000,650 1200,680 1440,710 L1440,800 L0,800 Z"
                fill="#04121f"
              />
              <path
                d="M0,730 C200,690 400,660 620,620 C680,590 710,550 720,500 C730,550 760,590 820,620 C1000,660 1200,700 1440,720 L1440,800 L0,800 Z"
                fill="#000000"
              />
            </svg>

            {/* Sunlight beam */}
            <motion.div
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "50%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "140px",
                height: "300px",
                background:
                  "linear-gradient(to top, rgba(255,215,120,0), rgba(255,215,120,0.6))",
                filter: "blur(18px)",
                borderRadius: "80px",
                cursor: "pointer",
              }}
              animate={{
                opacity: [0.6, 1, 0.6],
                scaleY: [0.9, 1.05, 0.9],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />

            {/* BEGIN THE ASCENT */}
            <motion.p
              onClick={handleEnter}
              style={{
                position: "absolute",
                bottom: "54%",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "12px",
                letterSpacing: "0.32em",
                color: "rgba(255,215,120,0.9)",
                cursor: "pointer",
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              BEGIN THE ASCENT
            </motion.p>

            {/* Intro text */}
            <div style={{ textAlign: "center", position: "relative" }}>
              <h1
                style={{
                  fontSize: "64px",
                  letterSpacing: "0.55em",
                  fontWeight: 600,
                  color: "#D4AF37",
                }}
              >
                SHAURI
              </h1>

              <p
                style={{
                  marginTop: 20,
                  letterSpacing: "0.28em",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Aligned. Adaptive. Guiding Excellence.
              </p>

              <p
                style={{
                  marginTop: 10,
                  letterSpacing: "0.22em",
                  fontSize: "12px",
                  color: "rgba(212,175,55,0.8)",
                }}
              >
                CBSE-Aligned Adaptive Learning Platform
              </p>
            </div>

            {/* Warp transition */}
            {warp && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "white",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9 }}
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
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(to bottom, #FFF3D9, #FFE4B3, #E6F2FF, #F8FAFC)",
            padding: "40px",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              letterSpacing: "0.55em",
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            SHAURI
          </h1>

          <p style={{ marginTop: 12, letterSpacing: "0.28em", fontSize: 14 }}>
            Aligned. Adaptive. Guiding Excellence.
          </p>

          <p style={{ marginTop: 8, letterSpacing: "0.22em", fontSize: 12 }}>
            CBSE-Aligned Adaptive Learning Platform
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: 30,
              display: "grid",
              gap: 16,
              width: 320,
            }}
          >
            <input
              placeholder="Student Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />

            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select Class</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <option key={c} value={`Class ${c}`}>
                  Class {c}
                </option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Access Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={inputStyle}
            />

            {error && <div style={{ color: "red" }}>{error}</div>}

            <button type="submit" style={buttonStyle}>
              STEP IN
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ccc",
};

const buttonStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 999,
  border: "1px solid #D4AF37",
  background: "white",
  letterSpacing: "0.25em",
  cursor: "pointer",
};
