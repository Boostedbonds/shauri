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

    // ── Set cookies with 1-year expiry so middleware can read them ──
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    const expStr = expires.toUTCString();
    document.cookie = `shauri_name=${encodeURIComponent(studentContext.name)}; path=/; expires=${expStr}; SameSite=Lax`;
    document.cookie = `shauri_class=${encodeURIComponent(studentContext.class)}; path=/; expires=${expStr}; SameSite=Lax`;

    window.location.href = "/modes";
  }

  return (
    <div className={orbitron.className} style={{ minHeight: "100vh" }}>

      {/* LANDING */}
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
                top: "22%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "520px",
                height: "520px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,215,120,1) 0%, rgba(255,180,60,0.6) 50%, transparent 80%)",
                filter: "blur(12px)",
              }}
            />

            {/* TITLE */}
            <div style={{ position: "absolute", top: "22%", width: "100%", textAlign: "center" }}>
              <h1
                style={{
                  fontSize: "76px",
                  letterSpacing: "0.55em",
                  fontWeight: 700,
                  color: "#FFD700",
                  textShadow:
                    "0 0 20px rgba(255,215,120,0.9), 0 0 40px rgba(255,200,80,0.6), 0 2px 6px rgba(0,0,0,0.8)",
                }}
              >
                SHAURI
              </h1>

              <p style={{ marginTop: 12, color: "#ffffff", letterSpacing: "0.15em" }}>
                THE COURAGE TO MASTER THE FUTURE
              </p>

              <p
                style={{
                  color: "#FFD700",
                  fontSize: "13px",
                  letterSpacing: "0.15em",
                  marginTop: 6,
                  whiteSpace: "nowrap",
                }}
              >
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
                bottom: "220px",
                left: "50%",
                transform: "translateX(-50%)",
                cursor: "pointer",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div
                style={{
                  position: "relative",
                  padding: "14px 42px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,215,0,0.5)",
                  overflow: "hidden",
                  color: "#FFD700",
                  letterSpacing: "0.35em",
                }}
              >
                {/* running gold light */}
                <motion.div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)",
                  }}
                  animate={{ left: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                BEGIN THE ASCENT
              </div>
            </motion.div>

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

      {/* ACCESS PAGE */}
      {entered && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            background: "linear-gradient(to bottom, #e6d3a3, #d6c08d)",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              letterSpacing: "0.4em",
              fontWeight: 700,
              color: "#0f172a",
              textShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}
          >
            SHAURI
          </h1>

          <p style={{ marginTop: 10, marginBottom: 30, opacity: 0.7 }}>
            CBSE-Aligned. Adaptive. Built for your growth.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
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
          </form>

          <p style={{ marginTop: 40, opacity: 0.6 }}>
            Discipline today builds the confidence of tomorrow.
          </p>

          {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #d4af37",
  width: "260px",
  background: "#f8fafc",
};

const buttonStyle = {
  padding: "12px",
  borderRadius: "999px",
  border: "1px solid #d4af37",
  background: "transparent",
  cursor: "pointer",
};